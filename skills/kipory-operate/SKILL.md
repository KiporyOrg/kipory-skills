---
name: kipory-operate
description: Run a Kipory project unattended — schedules that fire a flow on a cron, triggers that run a flow whenever a matching event is recorded, the event registry a flow emits into and clients subscribe to, namespaced runtime config that tunes a flow without an edit, and the spend reads that say what it all cost and what will stop it. Use once a flow works and should run on a clock, react to something that happened, report progress, or be adjustable without redeployment; when the user asks what a project spent; or when a call came back 402. Not for diagnosing a single bad run (that is diagnose) and not for the credentials a flow needs (that is secrets).
license: MIT
---

# Operate a project

Five capabilities that only matter once something works, and one fact most people get wrong about money: **the credit balance is a project-host read.** `GET /v1/credits/balance` answers on the product's own host and is a plain 404 on the api host, where everything else in this skill lives. What you spent, per run and per project, is on the api host.

## Before the first call

- Fetch the pack for the capability you touch: `references/packs/schedules.md`, `triggers.md`, `events.md`, `project-config.md`, `credits.md`.
- `GET /v1/bootstrap?project={nodeId}&sections=surfaces,events,project` returns every schedule, every trigger, every event category and type, the route enablement and the config namespaces in one call.
- Writes here are EDITOR; deletes, and the project settings that hold the spend ceiling, are ADMIN.

## Schedules

```
POST   /v1/schedules                       { project, key, flowId, inputs, cronPattern, tz, startsAt?, endsAt?, maxRuns?, overlapPolicy? }
GET    /v1/schedules?project={nodeId}&expand=lastRun,drift,flowLabel
PATCH  /v1/schedules/{id}                   { version, … } — inputs REPLACE; key is immutable and not a body field
POST   /v1/schedules/{id}/disable           { version }
POST   /v1/schedules/{id}/enable            { version } — recomputes the next run from now
GET    /v1/schedules/{id}/runs?limit=50     the occurrences, what each did, and the run id it produced
```

Inputs are keyed by input slot; `overlapPolicy` is `skip` or `allow`. A write checks only that every input slot has a key and none is blank — never the values against the input's shape, so a `validateOnly` answers `ok: true` over inputs the flow will fail on. Spending `maxRuns` (or passing `endsAt`) disables the schedule by itself without moving its `version`; a disabled schedule shows `nextRunAt: null`. The next-run time you are handed is computed by the same code the tick uses, so it is a claim you can hold the platform to. Enable recomputes from now: a schedule disabled across its window does not fire a backlog.

Each occurrence in `runs` carries its `outcome` — `fired`, `skipped`, `blocked` — its `invocation` with `id`, `status` and a `failure` naming the step and phase that broke, and `creditCost` where null is not zero. **The invocation's `id` is the run id**: take it to `GET /v1/runs/{runId}/steps` for the ordered, never-sampled step log (`kipory-diagnose`).

## Triggers

```
POST /v1/triggers                          { project, key, category, event, flowId, inputs, filter?, overlapPolicy?, name? }
GET  /v1/triggers?project={nodeId}&expand=lastRun,drift,flowLabel
PATCH /v1/triggers/{id}                    { version, … } — inputs REPLACE; key is immutable and not a body field
POST /v1/triggers/{id}/disable             { version }
POST /v1/triggers/{id}/enable              { version } — reacts from now; nothing is caught up
GET  /v1/triggers/{id}/runs?limit=50       every decision — fired, filtered, skipped, blocked — with its reason and run id
POST /v1/triggers/{id}/replay              { eventId } — re-run one decision as a new attempt
GET  /v1/triggers/{id}/sample              the newest logged event the trigger would accept, shaped as the `event` slot
GET  /v1/project-events?project={nodeId}   the durable event log itself, newest first, 30 days
```

A trigger fires a flow every time a matching event is **recorded** in the project's event log. Only a **durable**, non-`run`-scoped event type is logged, and a trigger listens only to an **active** type, so the write refuses a selector on a draft, retired, run-scoped or non-durable type and names the thing to change. The flow receives the envelope in a reserved `event` slot and `{ triggerId, key, triggerRunId, replay }` in a reserved `trigger` slot — neither belongs in `inputs`; everything else the flow declares does. Declare both slots with the builtin `object` type and read the payload as `event.data.<field>`. A `filter` is a step condition over two slots, `event` (the envelope) and `data` (its payload); an event it rejects is recorded as `filtered`, never dropped.

## Events

```
POST /v1/event-categories        { project, categoryKey, label, durableDefault? }
POST /v1/event-types             { category, eventKey, label, defaultScope, payloadEntryId?, durable? }   ← scoped by the CATEGORY's row id
GET  /v1/event-types?category={categoryId}
```

A type's `defaultScope` is `run`, `record`, `user` or `project`: a signal scoped to one run and one on the bus are different things — pick by who needs to hear it. The payload shape is optional; omit it and the event is a marker. When you give one, `payloadEntryId` must be a schema entry of this project — a builtin such as the `string` entry a flow's slot hands back is refused as unknown; wrap a scalar in an object shape. A flow emits with an `event.emit` step; a client subscribes through an `events.subscribe` endpoint (`kipory-expose`) or watches the project-wide `GET /v1/activity/stream`, whose `changed` frames name only which domain moved — never an event, id or payload — so it is a cue to re-read, not a feed; another flow reacts through a trigger, which needs the type to be `durable`.

## Project config

```
GET    /v1/project-config?project={nodeId}       every row carries the overrides AND the effective values
POST   /v1/project-config                        upsert on (project, namespace): schemaEntryId on create, version when it exists
DELETE /v1/project-config/{id}
```

Reach for this instead of editing a flow whenever the thing being changed is a threshold, a cadence or a weight. The `namespace` binds a schema entry whose field defaults are overlaid, per top-level field, with your `data` (at most 32 KiB); `effective` is computed on every read, never stored, so editing a default in the entry takes effect at once. The entry reference is soft: deleting it leaves reads working and refuses the next write.

## Spend

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn that it 401s an API key, never prescribed -->

```
GET /v1/runs/{runId}/spend                        every charge one run made, by step, model calls included — api host
GET /v1/projects/{nodeId}/usage?window=7d          credits and events over a window, by kind and step
GET /v1/projects/{nodeId}/ai-calls                the model-call ledger, filterable; /rollup by hour or day; /{callId}?payload=prompt for one
GET /v1/organizations/{nodeId}/quota              the organisation's resource ceilings and what is used
GET /v1/credits/balance                            the wallet — on the PROJECT's host only
```

**The per-step fee is compute time, in whole seconds rounded up.** Every step that runs bills one
handler charge priced per second of its duration, with a one-second minimum — at a rate of 10 credits a second, the same step
costs 10 in one run and 20 in the next when it took 0.9 s and then 1.2 s. The rate is the
deployment's; you cannot read it. A model step's
duration includes its wait in the ingest worker's queue, so a busy worker raises the fee, not the
model's cost. Predict a range, and reconcile against `GET /v1/runs/{runId}/spend` rather than a
fixed number.

A machine caller has no ledger of its own: `GET /v1/credits/events` scopes to a person and answers 401 to a key from inside the handler. Account for key-driven spend per run, or per project through `usage`.

Every amount is **credits, and one credit is one micro-USD** — `x-credits-charged: 5139` is about half a US cent. The reads count different things, so they disagree by design; pick the one that answers your question:

| Question                                      | Read                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| what one product call cost                    | its `x-credits-charged` response header — end-user (request) charges only, model calls included; a design-plane call's own work is not in it                                                                                                                                                                                                               |
| what one scheduled occurrence cost            | `creditCost` on `GET /v1/schedules/{id}/runs` — every charge the occurrence made, model calls included                                                                                                                                                                                                                                                     |
| which step of a run spent                     | `GET /v1/runs/{runId}/spend` — every charge one run made, broken down by step: design-time and zero-credit platform rows included, and a model call made on the ingest worker (`text.generate` and the other ingest-phase steps) carries the run like any other                                                                                            |
| what the model calls were, and what each cost | `GET /v1/projects/{nodeId}/ai-calls` and its `/rollup` — the ledger's DEFAULT view hides design-time origins (previews, tests, evals): read `excludedOrigins`, or send `origins=all`. Eval-run model calls are logged `origin: test`, the same as flow test runs, so the ledger cannot split the two — an eval run's own `credits` is the per-suite number |
| what the project spent over a window          | `GET /v1/projects/{nodeId}/usage` — every charging actor (end users, design time, held data), so it is the largest number and includes previews, test and eval runs                                                                                                                                                                                        |

## What will bite you

- **The balance read 404s on the api host.** Group `usage` is served on the project's host only, and a project may switch that group off. On the project host a key reads the payer's wallet with `perUserSpendCap` null — there is no person to cap — so for a key exactly one gate can 402 it: `creditsRemaining` against `softCapCredits`, reported as `status`. The read stays available while over cap, deliberately.
- **Three 402 codes, three remedies.** `BALANCE_BELOW_SOFT_CAP` means top up; `USER_SPEND_CAP_EXCEEDED` means a person hit their own ceiling on a healthy wallet; `DESIGN_SPEND_CAP_EXCEEDED` means the project's design-time work (previews, eval runs and other spend you start from the api host) reached its own ceiling, `designSpendCapCredits` on project settings. The end-user gate skips GET, so an over-cap project degrades to read-only.
- **Both ceilings live on project settings and are ADMIN**: `PATCH /v1/projects/{nodeId}/settings` with `perUserSpendCapCredits` or `designSpendCapCredits`, where `null` means no ceiling and `0` means block everything — opposites, and a falsy check turns one into the other. That PATCH has no `version` lock.
- **A run from before 2026-09-28 reads short on `/spend`.** Charges made on a worker — model calls, paid fetches — carried no run until then, so an older run shows only its in-process fees. Its occurrence's `creditCost` is complete; use that for older runs.
- **A schedule's `key` never changes** and is not on the patch body — sending it is a 422. Rename through `name`; a blank string is a 422, `null` clears.
- **`runs` is a cap, not a page.** `limit` goes to 200, there is no cursor, and `truncated` is the only word you get about what was cut.
- **Choose `overlapPolicy` deliberately.** `allow` on a flow slower than its interval runs copies of itself concurrently. On a trigger, omitting it means `skip` for your own events — and `skip` records the second of two events that arrive together as `skipped`, running nothing for it. Use `allow` for a trigger whose every event must be acted on (a notification, a per-record write); keep `skip` for a flow that re-syncs state, where one run covers them all.
- **A trigger never catches up.** Enabling one, or creating one, reacts to events recorded from then on; earlier events are in `GET /v1/project-events` and only a decision the trigger already took can be replayed. There is no backfill, on purpose.
- **A trigger's `skip` overlap looks at its 20 most recent fires, not only the last.** Any of their runs still `PENDING` or `PROCESSING` — or a fire under five minutes old whose run is not linked yet — holds the next event back as `skipped`. A run stuck in `PROCESSING` skips every later event of that type until it terminates (skipped events are not fires, so it never ages out of those 20); the ledger shows the rows. `allow` on a flow that emits its own trigger type runs until the platform's chain-depth cap blocks it, and the ledger says `blocked` with why.
- **A trigger's filter reads a payload field as `{ "op": "slotEquals", "slot": "data", "path": "source", "value": "telegram" }`.** `path` walks: `author.profile.id` descends into objects (a key that itself contains a dot still matches, longest key first) and `items[0].kind` reads a list item, as in a step condition. A path that reads nothing reads as absent — `slotEquals` on it is false, with no error — so a misspelled path records every event as `filtered`.
- **Event types are scoped by their category's row id, not by the project** — the one addressing surprise in this resource, and it fails looking like a missing project. Fetch categories first.
- **Seeded categories and types cannot be deleted (409) but can be patched.** A platform-installed event's label, scope and payload binding are all changeable, and nothing stops you.
- **A type's `status` does not gate emitting.** A retired type still fires; removing the emit step is the way to stop it. An event type carries two version numbers: `payloadVersion` for its shape and `version` for the lock.
- **Config `version` is required when the namespace exists and ignored on create.** A stale one is a 409; re-read and reconcile. An override replaces the whole top-level field, never merges into it.
- **`usage` defaults to seven days and excludes system charges**, which are zero by construction. `ai-calls` has no `total` and no page jump; walk its cursors.
- **Test and eval runs start no trigger of their own — a processing handoff still does.** An `event.emit` during `POST /v1/flows/{id}/test` or an eval run is checked and dropped: it is never recorded in `GET /v1/project-events` and starts nothing. But an `entity.enqueue-process` step hands the record to its processing flow, which runs live once the case applies, and that flow's events publish and start every matching trigger like any live run's (`kipory-prove`).
- **Prices are not here.** What things cost is a platform-operator surface a key cannot read. What you spent is this one.

## References

| File                                                                                           | What it answers                                                                             |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `references/packs/schedules.md`                                                                | time-triggered runs and their history                                                       |
| `references/packs/triggers.md`                                                                 | event-triggered runs, the log they read, and the ledger of every decision                   |
| `references/packs/events.md`                                                                   | the registry, emitting, the difference between a run signal and a bus signal                |
| `references/packs/project-config.md`                                                           | tunables typed by a bound shape                                                             |
| `references/packs/credits.md`                                                                  | the balance, the ledger, and the second gate a client that renders only `status` never sees |
| `references/api/schedules.md` · `triggers.md` · `events.md` · `project-config.md` · `spend.md` | every route's fields                                                                        |

## Then

`kipory-diagnose` when something running unattended does the wrong thing: the schedule's history names the failing step and hands you the run id; the step log gives the sequence; the trace gives the values. `kipory-expose` for the subscription endpoint that delivers events to a client.
