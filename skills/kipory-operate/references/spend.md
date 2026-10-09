# Spend — what is charged, where it is read, and what stops a call

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn that it 401s an API key, never prescribed -->

The one full statement of billing for a project. Every amount is **credits, and one credit is one micro-USD**: `x-credits-charged: 5139` is about half a US cent.

## What an action is charged

An action that runs is charged for its compute, and for whatever it called or wrote. `GET /v1/runs/{runId}/spend` lists the charges per action under `byAction[].charges` — one entry per `kind`, and per `direction` on a model call — and they sum to the action's `credits`.

| `kind`                             | What it pays for                              | `units`                                                      |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `function-run`                     | the action's compute time                     | whole seconds billed                                         |
| `llm-call`                         | a model call, one entry per `direction`       | tokens (`in`, `out`, `cached`, `cache-write`)                |
| `embedding`                        | an embedding call                             | tokens                                                       |
| `transcription` · `rerank`         | audio transcription · a rerank call           | the unit the charge is priced in                             |
| `vendor-fetch`                     | a paid fetch the action made through a vendor | the unit the charge is priced in                             |
| `storage-upload` · `vector-upsert` | a file or a vector written                    | the unit the charge is priced in                             |
| `storage-delete`                   | a file removed                                | the unit the charge is priced in                             |
| `storage-held` · `vector-held`     | the daily charge for files and vectors kept   | not a run's charge — read it on `usage` with `scope=holding` |

So an action that cost 46 reads as 10 for one second of compute and 36 for the model.

### Compute

- **Per second the action ran, in whole seconds rounded up, one second at least** — except an action that failed on a platform fault, which is charged nothing (below). At 10 credits a second the same action costs 10 in one run and 20 in the next when it took 0.9 s and then 1.2 s.
- **The rate is the deployment's and no route lists it.** <!-- absent: GET /v1/nodes/{nodeId}/compute-rate --> Read it off any `function-run` charge: `credits ÷ units`.
- **A run with no model call is not free.** Each action that runs bills its second.
- **Waiting is not billed.** An action that runs as a queued job — a model action, a fetch, `term.upsert` and the other ingest-phase actions — is charged for the time its job ran, summed over its tries. The model or vendor call itself is charged once across the function's own tries, and once per try when the action sets `tries`. The wait for a free worker, for a rate-limit allowance and between tries is not charged. A busy worker makes such an action slower, not dearer, and its `durationMs` on `GET /v1/runs/{runId}/timeline` can be many seconds longer than the seconds it was charged.
- **An action that runs other actions inside itself is charged for its own work only.** A `vocabulary.resolve` action that runs a vocabulary's resolver flow is not charged for the time spent in that flow: the resolver flow's actions are each charged as their own actions. They are entries of their own in `byAction`, under the resolver flow's action names — names your flow never wrote.
- **An action that only routes or runs other actions makes no compute charge of its own.** `flow.invoke`, `flow.fan-out`, `flow.loop`, `flow.loop-end`, `flow.merge` and `flow.dispatch` are not billed a second; the actions they run are charged as usual.

### Models and vendors

- **Model prices are a read.** `GET /v1/nodes/{nodeId}/model-prices` (the project's id is a node id) lists every enabled model once per `operation` it bills, with `credits` for one `unit` (`million-tokens`, `minute` or `search`), and rates each model 1–3 in `tiers` against the others of its kind. `credits: null` means no single figure describes that price; it never means free. Binding a different model is `kipory-build`'s `references/models.md`.
- **The usual saving is a model action that should have been a decision.** A `text.generate` or `vocabulary.resolve` action answering a yes/no or a closed pick costs many times what `text.decide` charges for the same answer (`kipory-build`'s `references/models.md`, section 1).
- **Vendor prices are a read too.** `GET /v1/nodes/{nodeId}/vendor-prices` lists every paid fetch as a `provider` and an `operation`, with `credits` for one `unit` (`call` or `item`). A source function's page (`kipory-build`'s `references/functions/`) has a **Charged as** line naming the rows an action on it is charged under, per vendor where the action's `provider` chooses one, and what one item is. `GET /v1/functions/{key}` carries the same facts as `charges` (and `providers.options[].charges` per vendor), for a script that joins them to the price rows. Where the item is one of the vendor's own credits, the line and `charges.vendorCredits` say how many a request takes, which options raise it and how many requests an action makes: a read whose request takes several credits costs that many times the row's `credits`, and a paged list pays the per-request figure once per page. The vendor reports the real count on each response and the charge follows it. Read these before choosing a vendor, a `maxItems` or a polling period.
- **A `vendor-fetch` charge is `credits` × the units billed, per request or job at the vendor.** A read that pages makes one charge per page; a search the vendor runs as one job makes one. `includedUnits` are free on each before `credits` applies; `minimumUnits` are billed on each however few came back, an empty answer included. So a row with either is not a flat per-item price: a function charged a flat call plus the items beyond its included units costs the same for a handful of posts as for the whole allowance, and one charged per item with a floor pays the floor again for every page, the empty ones too. An action with `fallback` on that another vendor answers is charged that vendor's rows.
- **`credits: null` is never free by itself.** Beside `billing: "quota-free"` the operation is not charged. Beside `billing: "metered"` no price is set for it on this deployment, so none can be quoted; do not plan on it being free. `credits: 0` is a price of zero somebody set.
- **The list is the platform's price on the platform's key.** A vendor key the project stores moves that bill to the vendor and the action makes no `vendor-fetch` charge (`kipory-secrets`). A cached answer makes none either (below).
- **A keyed request makes no vendor charge.** A `url.fetch`, `url.fetch-as-file` or `url.send` action is charged its compute like any action; the service it calls bills the holder of the key the action names. The delivery of a `url.send` request after the run, and its retries, are not charged.

### A cache hit

A run that repeats an input can cost far less than the first. Two caches answer an action, they cost differently, and not every kind of run reads both:

| The action was answered from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | It is charged                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| the action-result cache (same action, same version, same inputs). Read by endpoint, schedule and trigger runs, and by a record's processing only when an `record.enqueue-process` action queued it with `mode: "from-cache"`. Not read by previews, eval runs, a record's first processing or `POST /v1/records/{id}/reprocess`. Only actions whose function keeps one are answered from it: `text.generate`, `text.embed`, `audio.transcribe`, the file and image readers and `location.resolve`. A fetch or a `text.decide` action is answered only by the cache below | nothing — the action makes no charge at all                     |
| a function's input-keyed cache (a fetched page, a model answer to one prompt), kept for the time the function's page states. Read by every kind of run except an eval run of a suite with `subjectUncached: true` (the default), which looks nothing up and still stores its result                                                                                                                                                                                                                                                                                      | its compute fee, one second at least; no model or vendor charge |

Predict a range, and reconcile against `/spend` rather than a fixed number.

### `uncharged`

Each action, and the run, carries `uncharged`: how many of its `events` the platform paid for and charged to nobody.

- `credits: 0, events: 6, uncharged: 6` is work nobody was charged for. The same action in a charged run has a price, so do not budget from it.
- `credits: 0` with `uncharged: 0` is a real zero.
- An action that failed on a platform fault — `detail.phase: "platform-fault"` in the timeline, one of the platform's own vendor or model accounts refusing the call — is one of these: its compute is waived, so it reads `credits: 0` with its event counted in `uncharged`. Any other failed action is charged its compute as usual.
- `GET /v1/eval-runs/{id}/spend` carries the same field.

## What each kind of run costs, and where to read it

| Work                                                  | Charged as                                                                                                                                                                                                                                                     | Read it at                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A synchronous product call                            | end-user work, to the wallet the caller draws on                                                                                                                                                                                                               | `x-credits-charged` on the response; `GET /v1/runs/{runId}/spend` by action                                    |
| An asynchronous product call                          | the same charge, made after the 202                                                                                                                                                                                                                            | `/spend` with the 202's `id`. The 202's own `x-credits-charged` was sent before the run and does not hold it   |
| A schedule occurrence, a trigger's fire               | like any live run of the flow                                                                                                                                                                                                                                  | `creditCost` on `GET /v1/schedules/{id}/runs`; `/spend` with the occurrence's `invocation.id`                  |
| A record's first processing                           | charged, model calls, embeddings and vector writes included                                                                                                                                                                                                    | `/spend` on the processing run (`kipory-diagnose` finds its id)                                                |
| A reprocess (`POST /v1/records/{id}/reprocess`)       | like the first processing: the action-result cache is not read. A function's input-keyed cache still is, so a page fetched or a prompt answered inside its window is charged compute only. Every run it queues through `record.enqueue-process` is charged too | `/spend` on the run. It settles to the project's wallet unless the record's own owner asked for it             |
| A queued preview (`POST /v1/flows/{id}/preview-runs`) | design-time work, the same price as a live run, whether or not `apply` is `false`                                                                                                                                                                              | `/spend` with the `runId` the 202 answered                                                                     |
| An inline preview (`POST /v1/flows/{id}/preview`)     | the same design-time charge                                                                                                                                                                                                                                    | it leaves no run to read: `GET /v1/projects/{nodeId}/usage/events?scope=design`                                |
| An eval run                                           | design-time work: every subject run, plus every scorer call                                                                                                                                                                                                    | `GET /v1/eval-runs/{id}/spend` by action, subject and scorers alike; `run.credits` on the run (`kipory-prove`) |
| Files and vectors the project keeps                   | a daily holding charge                                                                                                                                                                                                                                         | `GET /v1/projects/{nodeId}/usage?scope=holding`                                                                |

Reprocessing 100 records after a flow edit costs what the edited flow costs on each — about what ingesting them did when the edit added no paid action, and less where earlier actions are answered from a function's cache. Read one run's `/spend` first.

To price a flow before it runs live, queue one preview with `apply: false` and read its `/spend`. A cold worker makes that first run slower, not dearer.

## The reads, and why they disagree

The reads count different things, so they disagree by design. Pick the one that answers the question.

| Question                                        | Read                                                                               | What it counts                                                                                                                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| what one product call cost                      | its `x-credits-charged` response header                                            | the end-user charges made by the time the response was sent, model calls included — so not an asynchronous call's run. Present on a refused call (`409`, `422`, `502`) too, since what ran before the refusal is billed |
| what one scheduled occurrence cost              | `creditCost` on `GET /v1/schedules/{id}/runs`                                      | every charge the occurrence made; `null` is unknown, not zero                                                                                                                                                           |
| which action of a run spent                     | `GET /v1/runs/{runId}/spend`                                                       | every charge the run made, by action, design-time and platform-paid rows included; a model call made on a worker carries the run like any other                                                                         |
| what an eval run cost                           | `GET /v1/eval-runs/{id}/spend`                                                     | one entry per action of the subject flow and of each scorer flow, across every case                                                                                                                                     |
| what the model calls were                       | `GET /v1/ai-calls?project={nodeId}` and `GET /v1/ai-calls/rollup?project={nodeId}` | one row per model call — see the caveats below                                                                                                                                                                          |
| what the project spent over a window            | `GET /v1/projects/{nodeId}/usage`                                                  | every charging actor, so it is the largest number                                                                                                                                                                       |
| what every project under the organisation spent | `GET /v1/organizations/{nodeId}/usage` (ADMIN at the organisation)                 | the same breakdown one level up, with the paying wallet's state and the ceiling nearest to refusing work                                                                                                                |
| what moved the paying wallet                    | `GET /v1/organizations/{nodeId}/ledger` (ADMIN at the organisation)                | every credit movement — usage debits, grants, adjustments — newest first; a 404 for a node with no wallet of its own                                                                                                    |
| how much is left                                | `GET /v1/credits/balance`, on the project's host                                   | the wallet the caller draws on                                                                                                                                                                                          |

**The two organisation reads take the organisation's id**, not the project's: `payer.nodeId` on the balance when `payer.kind` is `organization`. A key reaches only the node it was granted at and what is below it, so a key granted at a project answers 403 on both. They need a key granted at the organisation, `admin`.

**`/spend`.** `byAction` entries are keyed by `actionName` (the action's name as it was when it ran) and `actionId`; the entry with `actionId: null` is spend the run made outside any action, and dropping it stops the entries summing to `credits`. An empty `byAction` has more than one cause the read cannot tell apart: the run spent nothing, it failed before its first billable operation, or it is too old for its charges to be tied to a run — for a scheduled run of that age, the occurrence's `creditCost` is complete.

**The AI-call list.**

- Its default view hides design-time origins (previews, tests, evals). Read `excludedOrigins`, or send `origins=all`.
- Eval-run model calls are logged `origin: test`.
- The default view counts `origin: element-describer` rows: the platform describing your configuration, paid by the platform, 0 credits to you. Leave them out with `origins` when you count your own calls.
- It has no `total` and no page jump; walk its cursors.

**`usage`.**

- It defaults to seven days. `window=custom` takes `from` and `to` as RFC 3339 instants, `to` exclusive.
- `scope` chooses whose work is counted: `all` (the default) is `users` + `public` + `design` + `holding`, the four that charge. `public` is calls to public endpoints. `design` is previews and eval runs. `system` is platform-paid work, outside `all`, and read on `events` — its credits are zero by construction.
- Breakdowns name their kind in lowercase kebab (`llm-call`, `function-run`, …).
- `by=key` names a key only on the product calls that key made. A key's previews and eval runs are design-time charges, and schedule and trigger runs have no caller, so all of those land under `key: null`.

**A machine caller has no statement of its own.** `GET /v1/credits/events` scopes to a person and answers 401 to a key. Account for key-driven spend per run, or per project through `usage`.

## The balance

`GET /v1/credits/balance` answers on the project's own host — the `baseUrl` that `GET /v1/grant` hands a key — and is a plain 404 on the api host. Its route group is `usage`, which a project may switch off. The read stays available while the wallet is refusing calls, deliberately.

| Field                                      | Reads                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creditsRemaining`                         | what is left. A negative number beside `status: active` is ordinary: the wallet is spending its headroom                                                                                                                                                                                                                                                                        |
| `softCapCredits`                           | how far below zero the balance may go before calls are refused                                                                                                                                                                                                                                                                                                                  |
| `status`                                   | `active`; `over-soft-cap` (past the floor — added credit reopens it); `suspended` (the account is stopped for a reason other than balance — credit does not reopen it; only the deployment's operator lifts it)                                                                                                                                                                 |
| `payer`                                    | the node that holds the wallet: `nodeId`, `name`, `kind`, `own`. `own: false` means the project has no wallet and draws on a node above it, shared with everything that settles there — which is why a new project can open with a balance that is not zero                                                                                                                     |
| `wallet`                                   | `node` for the wallet the project settles to; `member` for a signed-in member's own wallet. A key always reads `node`                                                                                                                                                                                                                                                           |
| `perUserSpendCap` · `perUserSpendConsumed` | one person's ceiling and what they used of it. `perUserSpendCap` is `null` on every key read — a key has no person to cap — so a key cannot learn the configured ceiling here. Read it as `perUserSpendCapCredits` on project settings, or as `caps` on `GET /v1/projects/{nodeId}/usage`, which gives both ceilings with what was consumed and names the person nearest theirs |
| `nextGrantAt`                              | when a member wallet's next periodic grant is due; `null` when `wallet` is `node`                                                                                                                                                                                                                                                                                               |

### Member wallets

A project can give each member — an end user who has joined it — a wallet of their own with `memberWallets` on `PATCH /v1/projects/{nodeId}/settings` (ADMIN).

- A member's wallet is funded only by transfers out of the wallet the project is paid from: `memberJoinGrantCredits` once, `memberPeriodicGrantCredits` every `memberGrantPeriod`, and `POST /v1/projects/{nodeId}/members/{userId}/credits` by hand (ADMIN). Its body is `{ amountCredits, reason, idempotencyKey? }`: a positive whole number, why (required, written on both ledger entries), and a key that makes a repeat resolve to the first grant. It answers `{ balanceCredits }`; 409 while member wallets are off, or when the key is repeated with a different amount or reason, and `422 PAYING_WALLET_CANNOT_COVER` when the paying wallet cannot cover it.
- It has no headroom: at zero the member's billable calls answer `402 MEMBER_WALLET_EMPTY`, and the project's wallet is not charged in their place.
- While it is on, the per-user ceiling is applied to nobody.
- A key never spends a member wallet. Key traffic is charged to the project's wallet, whatever user a record it writes names.
- A member who joined before wallets were turned on gets no joining grant. Set a periodic grant, or grant each one by hand, before switching it on.
- The reads: `GET /v1/projects/{nodeId}/members` pages the project's end users with their standing, their spend and what they hold; `GET /v1/projects/{nodeId}/members/{userId}/ledger` (ADMIN) is one member's balance and its history, and still answers for a member who left.

`packs/credits.md` has the grant rules, the expiry of unused periodic credits, and the per-member reads.

## The 402 codes

A 402 is not a flow problem. Branch on the error `code`; the remedies do not substitute for one another.

| `code`                      | What refused                                                                                                                                                   | `details`                                                                                                            | Remedy                                                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BALANCE_BELOW_SOFT_CAP`    | the wallet. Also answered for a suspended wallet: `details.reason` is `balance_below_soft_cap` or `payer_suspended`, and `status` on the balance says the same | `{ reason, balance, softCap }`; absent on the "no active billing account" refusal of a project that no longer exists | `over-soft-cap`: credits are added by the deployment's operator, not by a call — tell the human which wallet (`payer.name`, `payer.nodeId` on the balance) needs credit. `suspended`: credit does nothing; only the operator lifts it |
| `USER_SPEND_CAP_EXCEEDED`   | one signed-in person reached their own ceiling on a healthy wallet                                                                                             | `{ reason, consumed, cap, period, windowStart }`                                                                     | raise `perUserSpendCapCredits`, or wait for `perUserSpendCapPeriod` to roll (`lifetime`, the default, never does)                                                                                                                     |
| `DESIGN_SPEND_CAP_EXCEEDED` | the project's design-time work reached `designSpendCapCredits`                                                                                                 | `{ reason, consumed, cap, period, windowStart }`                                                                     | raise the ceiling, or wait for `designSpendCapPeriod` to roll (`day` by default). `GET /v1/projects/{nodeId}/settings` answers `designSpend.consumed` and `windowStart`                                                               |
| `MEMBER_WALLET_EMPTY`       | a signed-in member's own wallet in this project is at zero                                                                                                     | `{ reason, balance, nextGrantAt }`                                                                                   | credit to the project's wallet does nothing: wait for `details.nextGrantAt`, or grant with `POST /v1/projects/{nodeId}/members/{userId}/credits`                                                                                      |

A fifth code is answered only by a **public endpoint** — one saved `auth: "none"`, called with no credential — and it is the one a caller cannot branch further on:

- `PUBLIC_ENDPOINT_UNAVAILABLE` carries **no `details`**. Either the wallet refused, or public calls have spent the project's `publicSpendCapCredits` for the UTC day (or the cap is not set). The caller is nobody the project knows, so the body is the same for both. Which it was is on the project's own log: `GET /v1/rejected-requests?project={nodeId}` has the row with `gate: "wallet"` or `gate: "public-spend-cap"`. A row with this code and no `gate` was not refused for money: the project is suspended, or the endpoint's flow reaches an action that needs a signed-in user, which a public call never has. The remedy follows the gate: credit for the wallet; for the cap, raise `publicSpendCapCredits` on `PATCH /v1/projects/{nodeId}/settings` or wait for 00:00 UTC. Today's public spend is `publicSpend.consumed` on the settings read, and the usage scope `public`.

Amounts inside `details` are decimal strings, not numbers — unlike the integers on every read.

**Design-time work** is flow previews (inline and queued), `POST /v1/actions/preview`, eval runs and `POST /v1/vector-collections/{name}/search`. A reprocess, a record's processing and a schedule or trigger run are not design-time work, and the design-time ceiling never refuses them — with one exception: a record handed to its processing flow by an `record.enqueue-process` action of a preview or an eval run is charged as design-time work, counts toward the ceiling, and is refused by it when a worker takes the job.

Which can reach which caller:

- **A key's product calls** meet one gate, the wallet.
- **A key's design-time calls** meet the wallet and the design-time ceiling. The balance does not show that ceiling; read `designSpend` on project settings.
- **A signed-in end user** meets the wallet and their own ceiling — or, with member wallets on, their member wallet instead.

What a refusing wallet stops, beyond the 402 on a call:

- **Reads still answer.** The gate skips GET, so an over-cap project degrades to read-only.
- **A write is refused at the request.** Every non-GET call made with a key granted at the project answers the 402 before anything is queued — `POST /v1/records` and `POST /v1/records/{id}/reprocess` included.
- **A queued job is refused when a worker takes it** — an async endpoint run, a record's processing, a reprocess that was queued before the wallet closed — and is not retried. The record or invocation stays `pending` (a record reads `pendingRun: unqueued`) until the platform marks it failed. After the wallet is reopened, `POST /v1/records/{id}/reprocess`, or call the endpoint again.
- **A schedule occurrence or a trigger's fire is not started.** The occurrence, or the trigger's decision, is recorded `blocked` with the reason (`GET /v1/schedules/{id}/runs`, `GET /v1/triggers/{id}/runs`). Nothing catches it up afterwards; replay a trigger's decision with `POST /v1/triggers/{id}/replay`.
- **A run in flight stops spending.** The wallet is asked again at each action boundary once the run has billed something; when it refuses, every remaining action is skipped and the run ends short. `kipory-diagnose` reads that run.
- **The design-time ceiling is not re-asked at action boundaries.** A preview or eval run that crosses it part-way keeps running its in-process actions; each queued action (a model action, a fetch) is refused when a worker takes its job and fails, without a retry.

## The ceilings

Both live on project settings and are ADMIN: `PATCH /v1/projects/{nodeId}/settings`. That PATCH has no `version` lock.

| Setting                                            | Bounds                                         | Notes                                                                                             |
| -------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `perUserSpendCapCredits` · `perUserSpendCapPeriod` | what one signed-in person may spend per period | period is `lifetime` (default), `day`, `week` or `month`; `lifetime` never clears                 |
| `designSpendCapCredits` · `designSpendCapPeriod`   | design-time spend per period                   | period defaults to `day`; consumption is `designSpend` on the settings read                       |
| `spendCapWarnPercent`                              | —                                              | warns the project's operators when design-time spend passes this share of the design-time ceiling |

On both ceilings `null` means no ceiling and `0` means block everything. They are opposites, and a falsy check turns one into the other.

Some vendors are drawn from a daily allowance shared across the organisation. `GET /v1/organizations/{nodeId}/quota` answers today's use of each pool, by project, with the allowance and when it resets. `{nodeId}` is the organisation's id, and it needs a key granted at the organisation; a project's key answers 403.
