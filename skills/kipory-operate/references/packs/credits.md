<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 423f5af968c4 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Credits and spend

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

The two reads that answer "what am I spending, and am I about to be cut off": a balance and a
ledger. One credit is one micro-USD, and every amount on this surface is an integer count of them.

This is the whole of the billing surface a customer can read. The platform's price list is not part
of it — pricing is a global catalog with one active row for the entire installation, so it is an
operator surface and an API key is refused there. What you can see is your own consumption, which
is the question you actually have.

## Two gates exist, only one of them is `status` — and only one of them binds a key

This is the mistake worth pre-empting, because a client that renders only the obvious field is
wrong precisely when a customer most needs it to be right.

- **The wallet** — `creditsRemaining` against `softCapCredits`, summarised by `status`. This is how
  far the payer may dip below zero before requests are refused.
- **The per-user ceiling** — `perUserSpendCap` with `perUserSpendConsumed` against it. It is not a
  second balance; it caps how much of that wallet **one person** may consume.

⛔ **Which of the two binds you depends on what you are holding, and this is the distinction to get
right before building anything here.** The per-user ceiling measures a _person_, and an API key is a
machine principal with no person behind it — so **the ceiling does not bind key-authenticated
traffic at all**. For an API key there is exactly one gate that can refuse a call, and it is the
wallet, which `status` summarises. For an end-user session token both gates apply.

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

## The window is given to you, not derived

`perUserSpendConsumed` covers `perUserSpendCapPeriod`, and `perUserSpendWindowStart` is the
inclusive lower bound the figure was **actually summed from**.

Do not recompute that boundary from the period. It is reported rather than derived so the number a
customer reads and the number the gate enforces can never describe different windows, and
recomputing is exactly how a client ends up showing a window the server did not use.

`perUserSpendWindowStart` is `null` exactly when the period is lifetime, so the pair is never
self-contradictory. The distinction carries the meaning: "8 of 10 used" is an ordinary month, or a
wall about to be hit, and only the window says which.

## Reading your balance still works when you are over cap

Both routes are deliberately exempt from the admission gate that refuses ordinary calls once a
payer is over its cap.

That exemption is the point. The one call a suspended or over-cap customer needs is the one telling
them so — gating it would lock them out of the explanation and the prompt to top up. So a `402`
elsewhere and a `200` here is the expected pairing, not a contradiction.

<!-- key-unreachable-ok: GET /v1/credits/events — this pack documents WHY a key is refused there and routes machine callers elsewhere; it is never prescribed to a key holder -->

## Whose ledger you get

The events read is **your own** consumption, not the tenant's. The ledger scopes to a _user_, so
where there is no acting user there is no ledger to return and the route answers `401` rather than
an empty page.

⛔ **That is not an edge case — it is what an API key always gets.** A key has no person behind it,
so `GET /v1/credits/events` answers `401` to every key-authenticated caller, always. The route
serves end-user session tokens only. ⚠️ The refusal comes from inside the handler rather than from
the route's declared shape, so nothing about the endpoint's signature warns you. To account for
key-driven spend, read `GET /v1/runs/{runId}/spend` for a run, or a schedule occurrence's own cost
figure.

A tenant-wide "all my users" view is a different, node-scoped surface — do not expect to reach it
by paging this one. It answers a question about one caller, however broad that caller's grant is.

Events carry the charge you incurred and never the platform's own vendor cost: you see what you
were charged, not what it cost us to serve you.

Filtering is by event type, request id, and a time range.

## The ledger walks in both directions and refuses to number itself

Paging is keyset, through opaque cursors you echo back rather than construct. The response hands
back `nextCursor` and `prevCursor`; pass one back as `after` to go older or `before` to go newer.
Both are `null` at their respective ends, and `null` is the only honest way to learn you are at the
top — a full page is not evidence of anything. Sending both at once is a `400`: they name opposite
directions from one row, so a request carrying both has not said which it wants. A malformed cursor
is refused rather than quietly serving the first page again, which is the failure that makes a
paging client silently loop.

⚠️ **`paging` is always `null` on this route, and there is no `?page=`.** Every other list on the
platform reports where the page sits — `{size, index, count, total}` — and this one declines,
because counting your pages means a `COUNT` over your entire ledger. It is the highest-volume table
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

| Holding                 | `GET /v1/credits/balance`                                         | `GET /v1/credits/events`   |
| ----------------------- | ----------------------------------------------------------------- | -------------------------- |
| A project **API key**   | 200 — wallet fields real; ceiling fields `null`, no person to cap | ⛔ `401`, always           |
| An end-user **session** | 200 — wallet and that person's ceiling both real                  | 200 — that person's ledger |

So "what did this project spend" is not a question the ledger answers for a machine caller. Be
deliberate about which credential the question is being asked with.

## The calls

| To                                                  | Call                         |
| --------------------------------------------------- | ---------------------------- |
| See the wallet, the ceiling and the window          | `GET /v1/credits/balance`    |
| Page one person's charge ledger (session bearers)   | `GET /v1/credits/events`     |
| Attribute a machine-driven charge to what caused it | `GET /v1/runs/{runId}/spend` |

## Mistakes already made

- **Rendering `status` alone** for a session caller and calling it a billing view. There it is one
  of two gates, and the other refuses with an identical-looking failure.
- **Assuming the reverse for a key** — expecting a per-user ceiling to bind machine traffic, or
  reading its `null` as "the project configured none". It binds people only.
- **Sending an API key at `GET /v1/credits/events`** and reading the `401` as a broken credential.
  The key is fine; the route needs a person.
- **Recomputing the window** from the period instead of reading the boundary that was returned.
- **Reading `perUserSpendCap` with a falsy check**, which erases a zero ceiling into "unlimited".
- **Expecting the tenant's ledger.** This is one caller's own; breadth of grant does not widen it.
- **Looking for prices here.** What things cost is an operator surface; what you spent is this one.

## Related

- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — the caps and ceilings the platform enforces regardless of balance.
- Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`) — where a project's own tunables live.
- Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`) — bring your own vendor key and the vendor bills you instead, which is the
  other half of controlling spend.
