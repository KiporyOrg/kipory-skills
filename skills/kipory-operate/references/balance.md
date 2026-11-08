# The balance, the 402 codes and the ceilings — what stops a call

Read this when a call came back 402, or to know how much is left and what will stop the project spending: the wallet, member wallets, each 402 code with its remedy, and the two spend ceilings.

## The balance

`GET /v1/credits/balance` answers on the project's own host — the `baseUrl` that `GET /v1/grant` hands a key — and is a plain 404 on the api host. Its route group is `usage`, which a project may switch off. The read stays available while the wallet is refusing calls, deliberately.

| Field                                      | Reads                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creditsRemaining`                         | what is left. A negative number beside `status: active` is ordinary: the wallet is spending its headroom                                                                                                                                                                                                                                                                        |
| `softCapCredits`                           | how far below zero the balance may go before calls are refused                                                                                                                                                                                                                                                                                                                  |
| `status`                                   | `active`; `over-soft-cap` (at or past the floor — added credit reopens it); `suspended` (the account is stopped for a reason other than balance — credit does not reopen it; only the deployment's operator lifts it)                                                                                                                                                           |
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

**Design-time work** is flow previews (inline and queued), `POST /v1/actions/preview` and eval runs. A reprocess, a record's processing and a schedule or trigger run are not design-time work, and the design-time ceiling never refuses them — with one exception: a record handed to its processing flow by an `record.enqueue-process` action of a preview or an eval run is charged as design-time work, counts toward the ceiling, and is refused by it when a worker takes the job.

Which can reach which caller:

- **A key's product calls** meet one gate, the wallet.
- **A key's design-time calls** meet the wallet and the design-time ceiling. The balance does not show that ceiling; read `designSpend` on project settings.
- **A signed-in end user** meets the wallet and their own ceiling — or, with member wallets on, their member wallet instead.

What a refusing wallet stops, beyond the 402 on a call:

- **Reads still answer.** A GET is not refused up front, so an over-cap project degrades to read-only; a GET whose flow reaches a paid action (a model call, a search, an outside call) is asked at that action and answers `BALANCE_BELOW_SOFT_CAP` before it runs.
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
