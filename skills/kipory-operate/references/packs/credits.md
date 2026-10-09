<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Credits and spend

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

The two reads that answer "what am I spending, and am I about to be cut off": a balance and a
statement of charges. One credit is one micro-USD, and every amount on this surface is an integer count of them.

These two reads are your own consumption. Prices are read elsewhere: `GET
/v1/nodes/{nodeId}/model-prices` (at the project's id) quotes each model in credits per million
tokens, minute or search, and `GET /v1/nodes/{nodeId}/vendor-prices` quotes each paid fetch — a
scrape, a search, a profile read — in credits per call or per item, with what one item is (`countedAs`: a post returned, a place
read, a page of search results), the units a charge includes and the fewest it bills. The per-second compute rate and the held-storage rates are not listed
anywhere a key can read: derive the compute rate from any `function-run` charge on
`GET /v1/runs/{runId}/spend` (`credits ÷ units`).

## Two gates exist, only one of them is `status` — and only one of them binds a key

This is the mistake worth pre-empting, because a client that renders only the obvious field is
wrong precisely when a customer most needs it to be right.

- **The wallet** — `creditsRemaining` against `softCapCredits`, summarised by `status`. This is how
  far the payer may dip below zero before requests are refused: `softCapCredits` is headroom below
  zero, so a NEGATIVE `creditsRemaining` beside `status: "active"` is ordinary — the payer is
  spending the headroom. Requests are refused with `402 BALANCE_BELOW_SOFT_CAP` (`status` reads
  `over-soft-cap`) only once the balance passes that floor. ⚠️ `status` has a third value,
  `suspended`: the account is stopped for a reason other than balance. It is refused with the same
  code — the `reason` inside `details` reads `payer_suspended` instead of `balance_below_soft_cap` — and
  added credit does not reopen it: only the deployment's operator lifts it.
- **The per-user ceiling** — `perUserSpendCap` with `perUserSpendConsumed` against it. It is not a
  second balance; it caps how much of that wallet **one person** may consume.

⛔ **Which of the two binds you depends on what you are holding, and this is the distinction to get
right before building anything here.** The per-user ceiling measures a _person_, and an API key is a
machine principal with no person behind it — so **the ceiling does not bind key-authenticated
traffic at all**. For an API key's **product calls** there is exactly one gate that can refuse a
call, and it is the wallet, which `status` summarises. For an end-user session token both gates
apply.

⚠️ **A key's design-time calls meet a different second gate.** Flow previews,
`POST /v1/actions/preview`, eval runs and `POST /v1/vector-collections/{name}/search` are bounded
by the project's design-time ceiling (`402 DESIGN_SPEND_CAP_EXCEEDED`), which the balance does not
show: read `designSpend` on `GET /v1/projects/{nodeId}/settings` for what the current window has
consumed, and `designSpendCapCredits` and `designSpendCapPeriod` beside it for the ceiling. A
record that an `record.enqueue-process` action of a preview or an eval run hands to its processing
flow counts toward the same ceiling.

⚠️ **The wallet may not be the project's.** A project without a wallet of its own draws on the
nearest wallet above it, so a new project can open with a balance that is not zero, shared with
everything else that settles there. `payer` on the balance names the node holding the wallet, and
its `own` field is `false` when that is not this project.

**Where both apply, both must pass.** A session caller can read `status: "active"` on a perfectly
healthy wallet and still be refused, because the ceiling is what stopped them. A dashboard showing
only the wallet reports that everything is fine right up to a refusal it cannot explain.

`perUserSpendCap` is `null` when the project sets no ceiling, and that is a different answer from
`0`, which blocks everything. Treat the two apart; collapsing them with a falsy check turns "no
spending allowed" into "unlimited". ⚠️ And on a key-authenticated read it is `null` for a third
reason — _there is no person to cap_ — so a key holder cannot learn the project's configured
ceiling from this field at all, and should not infer one is absent.

`perUserSpendConsumed` is always present — `0` for a first-time caller, and still reported when the
cap is `null` — so "no cap configured" is never confused with "no data".

## A project can give each member their own wallet

A project has one more setting on `PATCH /v1/projects/{nodeId}/settings`: `memberWallets`. With it
on, each **member** — an end user who has joined the project, the people
`GET /v1/projects/{nodeId}/members` lists — holds a wallet **in that project**, and `GET /v1/credits/balance`
called by a member's session answers that wallet: `wallet` reads `member`, where every other
caller reads `node`.

- **The credits are the project's, moved.** A member's wallet is funded only by transfers out of
  the wallet the project is paid from: `memberJoinGrantCredits` once when a member joins,
  `memberPeriodicGrantCredits` every `memberGrantPeriod` (`day`, `week` or `month`), and whatever
  an ADMIN grants one member with `POST /v1/projects/{nodeId}/members/{userId}/credits`. A grant
  the paying wallet cannot cover is refused with `422 PAYING_WALLET_CANNOT_COVER`; an automatic
  one is skipped and made on a later day. ⚠️ A member who joined before wallets were turned on
  gets no joining grant: set a periodic grant, or grant each one by hand, before switching it
  on — otherwise their next billable call is a `402`.
- **Zero refuses, and nothing else pays.** A member's wallet has no headroom below zero. At zero
  or below their billable calls answer `402 MEMBER_WALLET_EMPTY`, with `balance` and
  `nextGrantAt` in `details`. The project's wallet is not charged in their place.
- **The per-user ceiling is replaced, not added.** While the project has member wallets on the
  ceiling is applied to nobody, and `perUserSpendCap` reads `null`: the wallet is a member's
  bound. The stored ceiling applies again if the project
  turns member wallets off.
- **Unused periodic credits go back.** When a period ends, what a member did not use of that
  period's grant returns to the paying wallet before the next grant is made. Credits from the
  joining grant or from an ADMIN's grant stay. When a member leaves, or the project turns member
  wallets off, the whole balance returns.
- ⚠️ **A key is never a member.** A request made with an API key is charged to the project's
  wallet, whatever user a record it writes names, so `wallet` reads `node` for every key. Only a signed-in
  member's own session spends a member wallet.

`nextGrantAt` is when the next periodic grant is due, and `null` when the project makes none or
when `wallet` is `node`. Read it; do not compute it from the period.

To see what each member holds, read `wallet` on each row of `GET /v1/projects/{nodeId}/members`;
`grantMissed` there says an active member has not had this period's grant yet. One member's history — each
grant, expiry, return and charge — is `GET /v1/projects/{nodeId}/members/{userId}/ledger`.

## The window is given to you, not derived

`perUserSpendConsumed` covers `perUserSpendCapPeriod` — `lifetime`, `day`, `week` or `month`,
lowercase like every value on the wire — and `perUserSpendWindowStart` is the inclusive lower bound
the figure was **actually summed from**.

Do not recompute that boundary from the period. It is reported rather than derived so the number a
customer reads and the number the gate enforces can never describe different windows, and
recomputing is exactly how a client ends up showing a window the server did not use.

`perUserSpendWindowStart` is `null` exactly when the period is `lifetime`, so the pair is never
self-contradictory. The distinction carries the meaning: "8 of 10 used" is an ordinary month, or a
wall about to be hit, and only the window says which.

## Reading your balance still works when you are over cap

Both routes are deliberately exempt from the admission gate that refuses ordinary calls once a
payer is over its cap.

That exemption is the point. The one call a suspended or over-cap customer needs is the one telling
them so — gating it would lock them out of the explanation. So a `402` elsewhere and a `200` here
is the expected pairing, not a contradiction.

No call adds credits. When the wallet refuses, tell the human which wallet needs credit —
the `name` and `nodeId` of `payer` on the balance — from the deployment's operator.

<!-- key-unreachable-ok: GET /v1/credits/events — this pack documents WHY a key is refused there and routes machine callers elsewhere; it is never prescribed to a key holder -->

## Whose charges you get

The events read is **your own** consumption, not the tenant's. The statement scopes to a _user_, so
where there is no acting user there is no statement to return and the route answers `401` rather than
an empty page.

⛔ **That is not an edge case — it is what an API key always gets.** A key has no person behind it,
so `GET /v1/credits/events` answers `401` to every key-authenticated caller, always. The route
serves end-user session tokens only. ⚠️ The refusal comes from inside the function rather than from
the route's declared shape, so nothing about the endpoint's signature warns you. To account for
key-driven spend, read `GET /v1/runs/{runId}/spend` for a run, or a schedule occurrence's own cost
figure.

A tenant-wide "all my users" view is a different, node-scoped surface — do not expect to reach it
by paging this one. It answers a question about one caller, however broad that caller's grant is.

Events carry the charge you incurred and never the platform's own vendor cost: you see what you
were charged, not what it cost us to serve you.

Filtering is by event type (a lowercase kebab word — `llm-call`, `embedding`, `function-run`, …),
request id, and a time range: `from` is an inclusive instant, `to` an exclusive one.

## The statement walks in both directions and refuses to number itself

Paging is keyset, through opaque cursors you echo back rather than construct. The response hands
back `nextCursor` and `prevCursor`; pass one back as `after` to go older or `before` to go newer.
Both are `null` at their respective ends, and `null` is the only honest way to learn you are at the
top — a full page is not evidence of anything. Sending both at once is a `400`: they name opposite
directions from one row, so a request carrying both has not said which it wants. A malformed cursor
is refused rather than quietly serving the first page again, which is the failure that makes a
paging client silently loop.

⚠️ **`paging` is always `null` on this route, and there is no `?page=`.** Every other list on the
platform reports where the page sits — `{size, index, count, total}` — and this one declines,
because counting your pages means a `COUNT` over every charge you have incurred. It is the highest-volume table
we keep, one row per billable operation, append-only, and unbounded per caller; `from`/`to` are
optional, so the ordinary request has no time bound to shrink it. Read `null` as **"walk this one by
cursor"**, never as "not measured yet". A page jump goes with it: jumping has to clamp to the last
page, clamping needs the count, and a route that will not pay for the count cannot clamp.

⭐ **`prevCursor` is real anyway.** Whether a newer page exists is answered by an index lookup rather
than a count, so declining the count costs you nothing you would have used. Walk with the cursors and
you can go both ways through every charge you have ever incurred.

## Both routes need a bearer

These are external-consumer routes. A signed-in browser session does not reach them at all — the
credit system applies to `/v1` consumers, and a cookie-authenticated request is answered `401`
however privileged the human behind it is.

Two bearer shapes qualify, and they do **not** reach the same amount of this surface:

| Holding                 | `GET /v1/credits/balance`                                         | `GET /v1/credits/events`    |
| ----------------------- | ----------------------------------------------------------------- | --------------------------- |
| A project **API key**   | 200 — wallet fields real; ceiling fields `null`, no person to cap | ⛔ `401`, always            |
| An end-user **session** | 200 — wallet and that person's ceiling both real                  | 200 — that person's charges |

So "what did this project spend" is not a question the statement answers for a machine caller. Be
deliberate about which credential the question is being asked with.

## The calls

| To                                                  | Call                                                   |
| --------------------------------------------------- | ------------------------------------------------------ |
| See the wallet, the ceiling and the window          | `GET /v1/credits/balance`                              |
| Turn member wallets on, and set the grants          | `PATCH /v1/projects/{nodeId}/settings`                 |
| Give one member credits                             | `POST /v1/projects/{nodeId}/members/{userId}/credits`  |
| Read one member's wallet history                    | `GET /v1/projects/{nodeId}/members/{userId}/ledger`    |
| Page one person's charges (session bearers)         | `GET /v1/credits/events`                               |
| Attribute a machine-driven charge to what caused it | `GET /v1/runs/{runId}/spend`                           |
| Total one schedule occurrence's billed charges      | the occurrence's `creditCost` on the schedule's `runs` |

`/runs/{runId}/spend` holds every charge the run made, by action — a model call an action makes on a
worker included. Each action's `charges` says what it was charged for, by kind (`function-run` is the
compute fee, `llm-call` the model), and its `uncharged` counts the operations the platform paid
for: ⚠️ `credits: 0` is a price only when `uncharged` is 0. `GET /v1/eval-runs/{id}/spend` answers
the same for an eval run.

How compute is billed — per second run, waiting not billed, what a cache hit, a preview, an eval
run and a reprocess cost — is stated once, in the `kipory-operate` skill's `references/spend.md`.

## Mistakes already made

- **Rendering `status` alone** for a session caller and calling it a billing view. There it is one
  of two gates, and the other refuses with an identical-looking failure.
- **Assuming the reverse for a key** — expecting a per-user ceiling to bind machine traffic, or
  reading its `null` as "the project configured none". It binds people only.
- **Sending an API key at `GET /v1/credits/events`** and reading the `401` as a broken credential.
  The key is fine; the route needs a person.
- **Recomputing the window** from the period instead of reading the boundary that was returned.
- **Asking for credit on a suspended wallet.** `402 BALANCE_BELOW_SOFT_CAP` with
  `status: "suspended"` is a stopped account, not a low balance; only the deployment's operator
  lifts it.
- **Treating `402 MEMBER_WALLET_EMPTY` like the wallet refusal.** Credit to the project's wallet
  does not help: the remedy is the member's next grant, or one an ADMIN gives them.
- **Expecting a key to spend a member's wallet.** It never does; the project pays for key traffic.
- **Reading `perUserSpendCap` with a falsy check**, which erases a zero ceiling into "unlimited".
- **Expecting the tenant's charges.** This is one caller's own; breadth of grant does not widen it.
- **Looking for the compute rate here.** Model prices are `GET /v1/nodes/{nodeId}/model-prices`
  and vendor prices `GET /v1/nodes/{nodeId}/vendor-prices`; the per-second rate is read off a
  `function-run` charge.
- **Paying for a vendor call to learn its price.** Two vendors of one function can differ several
  times over for the same read; `vendor-prices` says so before the first call. A row with
  `includedUnits` or `minimumUnits` is not a flat per-item price: work the charge out per vendor
  call.

## Related

- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — what the platform cannot do at all.
- Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`) — where a project's own tunables live.
- Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`) — bring your own vendor key and the vendor bills you instead, which is the
  other half of controlling spend.
