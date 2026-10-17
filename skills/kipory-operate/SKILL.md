---
name: kipory-operate
description: Run a Kipory project unattended — schedules that fire a flow on a cron, triggers that run a flow whenever a matching event is recorded, the event registry a flow emits into and clients subscribe to, namespaced runtime config that tunes a flow without an edit, and the spend reads that say what it all cost and what will stop it, and how the project is told when an unattended run fails. Use once a flow works and should run on a clock, react to something that happened, report progress, or be adjustable without redeployment; when the user wants to be alerted to failed runs, or asks why a schedule or trigger was paused; when the user asks about billing — what a project spent, what a run, a preview or a model costs in credits, or the balance and budget left; or when a call came back 402. Not for diagnosing a single bad run (kipory-diagnose), not for the credentials a flow needs (kipory-secrets), and not for creating the Telegram source a trigger listens to (kipory-channels).
license: MIT
---

# Operate a project

Five capabilities that only matter once something works, and one fact most people get wrong about money: **the credit balance is a project-host read.** `GET /v1/credits/balance` answers on the project's own host — the `baseUrl` that `GET /v1/grant` hands a key — and is a plain 404 on the api host, where everything else in this skill lives. What you spent, per run and per project, is on the api host.

## Before the first call

- Fetch the pack for the capability you touch: `references/packs/schedules.md`, `triggers.md`, `events.md`, `project-config.md`, `credits.md`. For anything about cost, read `references/spend.md`.
- `GET /v1/bootstrap?project={nodeId}&sections=surfaces,events,project` returns every schedule, every trigger, every event type (each with its namespace), the route enablement and the config namespaces in one call.
- Writes here are EDITOR; deletes, and the project settings that hold the spend ceiling, are ADMIN.

## Schedules

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire field a caller sends -->
<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->

```
POST   /v1/schedules                       { project, key, flowId, inputs, cronPattern, tz, startsAt?, endsAt?, maxRuns?, overlapPolicy? }
GET    /v1/schedules?project={nodeId}&expand=lastRun,drift,flowLabel
PATCH  /v1/schedules/{id}                   { version, … } — inputs REPLACE; key is immutable and not a body field
PATCH  /v1/schedules/{id}                   { version, enabled } — switch it off, or on (recomputes the next run from now)
DELETE /v1/schedules/{id}[?validateOnly=true]
GET    /v1/schedules/{id}/runs?limit=50     the occurrences, what each did, and the run id it produced (cursor-paged)
POST   /v1/schedules/{id}/resume            resume a schedule the platform paused — no body, no `version`
```

- **Inputs** are keyed by input slot; `overlapPolicy` is `skip` or `allow`.
- **A write checks its inputs**, in `validateOnly` too: every input slot has a key, none is blank, and each value is of its slot's type (`SCHEDULE_INPUT_MISTYPED` / `TRIGGER_INPUT_MISTYPED`).
- **A flow change can strand a schedule.** A document plan, or the flow or type PATCH with `validateOnly` (`leavesBehind`), names the schedules and triggers a narrowing change would leave unable to fire; the PATCH itself still saves.
- **A spent schedule disables itself.** Spending `maxRuns` (or passing `endsAt`) disables the schedule without moving its `version`; a disabled schedule shows `nextRunAt: null`.
- **The next-run time is a claim you can hold the platform to**: it is computed by the same code the tick uses.
- **Switching `enabled` on recomputes from now** — refused (422) when the bounds are spent — so a schedule disabled across its window does not fire a backlog.
- On a retired project a PATCH of `{enabled: false, version}` alone is still accepted.
- **A fire has no end user.** `userInfo` is absent, so a per-user table refuses and an action reading `userInfo` beside a real slot waits for that slot. Preview with `principal: "no-end-user"` to see the run a fire makes (`kipory-build`'s `references/checking.md`). A trigger's fire is the same.

Each occurrence in `runs` carries its `outcome` — `fired`, `skipped`, `blocked` — its own `status` (`succeeded`, `partial`, `failed`, `running`, `skipped`, `blocked`: count this one), its `invocation` with `id`, `status` (`pending`, `processing`, `ready`, `failed`, `deleting`), `statusError` (a short message: the failed action's key and code, never the action's own words), `failure` — how the run failed and whose failure it was: `class`, `owner`, `retryable`, and the action (`actionKey`, `functionKey`, `phase`, `code`) when one action is to blame — `waiting` while the platform is about to start the run again, and `creditCost` where null is not zero. `references/when-a-run-fails.md` has the classes. **The invocation's `id` is the run id**: take it to `GET /v1/runs/{runId}/timeline` for the ordered, never-sampled timeline (`kipory-diagnose`).

## Triggers

```
POST /v1/triggers                          { project, key, categoryKey, eventKey, flowId, inputs, sourceId? | newSource?, filter?, overlapPolicy?, label? }
GET  /v1/triggers?project={nodeId}&expand=lastRun,drift,flowLabel
PATCH /v1/triggers/{id}                    { version, … } — inputs REPLACE; key is immutable and not a body field
PATCH /v1/triggers/{id}                    { version, enabled } — switch it off, or on (reacts from now; nothing is caught up)
DELETE /v1/triggers/{id}[?validateOnly=true]
GET  /v1/triggers/{id}/runs?limit=50       every decision — fired, filtered, skipped, blocked — with its reason and run id (cursor-paged)
POST /v1/triggers/{id}/resume              resume a trigger the platform paused — no body, no `version`
POST /v1/triggers/{id}/replay              { eventId } — re-run one decision as a new attempt
GET  /v1/triggers/{id}/sample              the newest logged event the trigger would accept, in the log's shape (`project`, not `projectId`)
GET  /v1/project-events?project={nodeId}   the durable event log itself, newest first, 30 days, cursor-paged; &sourceId= for one source's rows
```

A trigger fires a flow every time a matching event is **recorded** in the project's event log.

- **What it can listen to.** Only a **durable**, non-`run`-scoped event type is logged, and a trigger listens only to an **active** type, so the write refuses a selector on a draft, retired, run-scoped or non-durable type and names the thing to change.
- **A trigger on a source's events names the source.** `sourceId` binds the trigger to one source (a Telegram channel), and `categoryKey` / `eventKey` must then be that provider's; `newSource` creates the source in the same write. Send one or neither, never both (422); neither means an event the project's own flows emit. `kipory-channels` owns the source.
- **What the flow receives.** The envelope arrives in a reserved `event` slot — its `projectId`, `source` and a project-scoped `subject` carry the project's one id, the same one `projectInfo.projectId` holds and every route takes — and `{ triggerId, key, triggerRunId, replay }` in a reserved `trigger` slot. Neither belongs in `inputs`; everything else the flow declares does. Declare both slots with the builtin `object` type and read the payload as `event.data.<field>`.
- **A `filter` is an action condition over two slots**, `event` (the envelope) and `data` (its payload); an event it rejects is recorded as `filtered`, never dropped.

## When a run fails

```
GET  /v1/failed-runs?project={nodeId}      the runs whose latest close is `failed` or `partial`, newest first (cursor-paged)
GET  /v1/projects/{nodeId}/alerts          every schedule, trigger, table or endpoint that is failing, quiet, about to be paused or paused
POST /v1/platform-events/test              { project, type, subject?: { kind, key } } — record one example event and fire the triggers on it
```

An **unattended run** is a schedule's occurrence, a trigger's fire, an asynchronous endpoint call or a record's processing: nobody is waiting on the answer. `references/packs/triggers.md` ("Being told when a run fails") and `references/packs/schedules.md` ("health, and being paused") have the detail; `references/api/failures.md` the fields.

Each of these is explained in [references/when-a-run-fails.md](references/when-a-run-fails.md). Read the entry before you rely on the thing it names:

**Being told**

- A failed run cannot report itself.
- Fifteen `platform` event types, and they are the platform's.
- The failure trigger is an ordinary trigger on one of those `platform` events, bound to an ordinary flow
- Listen to `run.failures` as well.
- Nothing is recorded for an attempt about to run again, a cancelled run, a preview or a synchronous call
- A failure trigger's flow is never handed its own failure.
- Prove the failure trigger before something fails.
- ⚠️ Nothing is mailed.

**Health, and being paused**

- Every schedule and trigger read carries `health`
- Only the subject's own failures count
- The pause rule.
- ⚠️ Pausing needs a listener.
- Paused is a state of its own, beside `enabled`.

**Whose failure it is**

- A failed run's closing record names a `class` and an `owner`
- Waiting for a worker is not a failure.
- The platform runs its own failures again.
- ⚠️ What a run started again repeats, and charges.
- A run started again runs the flow it first started with.
- A deployment of the platform lets runs finish.

**`partial`, and the list**

- A run that carried on past a failure closes `partial`
- `GET /v1/failed-runs?project={nodeId}` is the list a summary points at

## Events

```
POST /v1/event-types             { project, categoryKey, key, label, defaultScope, payloadDataTypeId?, durable? }
GET  /v1/event-types?project={nodeId}[&categoryKey=]
```

`categoryKey` is the event's namespace — the first half of its `categoryKey/key` address. There is nothing to create first: a new one opens the namespace. A reserved platform name is a 422; a source provider's namespace (`telegram`) is a 409 — its source writes those types. `durable` omitted is `false`.

Every type write — `POST`, `PATCH { version, … }`, `DELETE` — takes `validateOnly` (in the body; `?validateOnly=true` on a DELETE) and answers a 200 verdict instead of writing: a taken key, a refused namespace, a seeded row's delete and the scope/payload rules come back as findings.

A type's `defaultScope` is `run`, `record`, `user` or `project`: a signal scoped to one run and one on the bus are different things — pick by who needs to hear it. The payload type is optional; omit it and the event is a marker. When you give one, `payloadDataTypeId` must be a type of this project — a builtin such as the `string` type a flow's slot hands back is refused as unknown; wrap a scalar in an object type. A flow emits with an `event.emit` action; a client subscribes through an `events.subscribe` endpoint (`kipory-expose`) or watches the project-wide `GET /v1/activity/stream`, whose `changed` frames name only which domain moved — never an event, id or payload — so it is a cue to re-read, not a feed; another flow reacts through a trigger, which needs the type to be `durable`.

## Project config

```
GET    /v1/project-config?project={nodeId}       every row carries the overrides AND the effective values
POST   /v1/project-config                        upsert on (project, namespace): dataTypeId on create, version when it exists; `data` is the WHOLE override map; validateOnly: true checks it
DELETE /v1/project-config/{id}[?validateOnly=true]
```

Reach for this instead of editing a flow whenever the thing being changed is a threshold, a cadence or a weight. The `namespace` binds a type whose field defaults are overlaid, per top-level field, with your `data` (at most 32 KiB); `effective` is computed on every read, never stored, so editing a default in the type takes effect at once. The type reference is soft: deleting it leaves reads working and refuses the next write.

**`data` is the whole override map.** A POST replaces every override stored in the namespace with the `data` it carries: sending only the key you changed deletes every other override and answers 200. Read the row, merge locally, send the full map.

## Spend

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn that it 401s an API key, never prescribed -->

```
GET /v1/runs/{runId}/spend                        every charge one run made, by action, model calls included — api host
GET /v1/eval-runs/{id}/spend                      the same for an eval run: subject and scorer actions alike
GET /v1/nodes/{nodeId}/model-prices               what each model costs, in credits, at the project's id
GET /v1/projects/{nodeId}/settings                the two spend ceilings, and `designSpend` consumed in the current window
GET /v1/projects/{nodeId}/usage?window=7d          credits and events over a window, by kind and action
GET /v1/projects/{nodeId}/usage?window=7d&flows=1  the same per flow, with what failed runs spent (`failedRuns`, `failedCredits`)
GET /v1/ai-calls?project={nodeId}                 every model call, filterable; GET /v1/ai-calls/rollup?project= by hour or day; GET /v1/ai-calls/{id}?payload=prompt for one
GET /v1/organizations/{nodeId}/quota              today's use of each shared vendor allowance — the ORGANISATION's id, and a key granted at the organisation
GET /v1/projects/{nodeId}/limits                  every limit the project meets: the number in force, the default, and how much is used where counted
GET /v1/credits/balance                            the wallet — on the PROJECT's host only
```

A call or a run refused at a limit names it: `details.limitKey` on the error, `limitKey` on the run's `closing` failure. Look the key up in `GET /v1/projects/{nodeId}/limits`. Only Kipory changes a limit's number; to ask for more, name the key.

`references/spend.md` is the full statement: what an action is charged, what a cache hit, a preview, an eval run and a reprocess cost, model prices, the balance's fields, member wallets and the 402 codes. The short version:

- **Every amount is credits, and one credit is one micro-USD.** `x-credits-charged: 5139` is about half a US cent.
- **Compute is charged for the time an action ran, to the millisecond.** There is no minimum: an action that ran a few milliseconds costs a fraction of a credit, and a fraction under one credit is charged as nothing.
- **Waiting is not billed.** A queued action — a model action, a fetch — is charged for the time its job ran, not for the wait for a worker or a rate-limit allowance, so its `durationMs` on `/timeline` can be far longer than the time it was charged.
- **The compute rate is the deployment's and no route lists it.** <!-- absent: GET /v1/nodes/{nodeId}/compute-rate --> Read it off a `function-run` charge on `/spend` of a second or more: `credits ÷ units` is credits per millisecond, so `× 1000` is per second.
- **Model prices are a read**: `GET /v1/nodes/{nodeId}/model-prices`, at the project's id, quotes each model in credits per million tokens, minute or search (`kipory-build`'s `references/models.md` for choosing one).
- **A cache hit is cheaper, not always free.** An action answered from the action-result cache — which only some functions keep, and previews, eval runs and a reprocess never read — is charged nothing; one answered from a function's input-keyed cache pays the compute of its lookup and no model or vendor charge.
- **Previews, eval runs and reprocesses cost what a live run costs.** Flow previews, `POST /v1/actions/preview` and eval runs are design-time work, bounded by the design-time ceiling; a reprocess is not. The one record processing the ceiling does bound is a record handed over by an `record.enqueue-process` action of a preview or an eval run.

**The spend read says what each action was charged for.** Every entry of `byAction` names its action in `actionName` and `actionId` and carries `charges`, one per kind, that sum to the action's `credits` (`references/spend.md` lists the kinds).

The reads count different things, so they disagree by design. `references/spend.md` has the table of which read answers which question; the two to remember are that `x-credits-charged` holds only what was charged by the time the response was sent — so not an asynchronous call's run, which is read on `/spend` with the 202's `id` — and that `GET /v1/ai-calls` hides previews, evals and the platform's own describing calls unless you send `origins=all`.

A machine caller has no statement of its own: `GET /v1/credits/events` scopes to a person and answers 401 to a key. Account for key-driven spend per run, or per project through `usage`.

## What will bite you

Each of these is a trap with its explanation and remedy in [references/pitfalls.md](references/pitfalls.md). Read the entry before you build on the thing it names:

- Working around a problem in silence.
- The balance read 404s on the api host.
- The wallet may not be the project's.
- Five 402 codes, five remedies. <!-- count: api-402-codes -->
- A refusing wallet stops more than the call.
- Both ceilings live on project settings and are ADMIN.
- `credits: 0` on `/spend` is a price only when `uncharged` is 0.
- A reprocess is charged
- An empty `/spend` is not a zero.
- A schedule's `key` never changes
- `runs` is one page, newest first.
- Choose `overlapPolicy` deliberately.
- A schedule's run keeps the flows it started with.
- A paused schedule or trigger is not a disabled one.
- A trigger never catches up.
- A trigger's `skip` overlap looks at its 20 most recent fires, not only the last.
- A trigger's filter reads a payload field as `{ "op": "slotEquals", "slot": "data", "path": "source", "value": "telegram" }`.
- Seeded event types cannot be deleted (409) but can be patched.
- A type's `status` does not gate emitting.
- Config `version` is required when the namespace exists and ignored on create.
- `usage` defaults to seven days and excludes platform-paid work
- Previews and eval runs start no trigger of their own — a processing handoff still does.
- Model prices and vendor prices are reads; the compute rate and the held-storage rates are not.

## References

| File                                                                                           | What it answers                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/packs/schedules.md`                                                                | time-triggered runs and their history                                                                                                                                                                                                                                                                             |
| `references/packs/triggers.md`                                                                 | event-triggered runs, the log they read, and the record of every decision                                                                                                                                                                                                                                         |
| `references/packs/events.md`                                                                   | the registry, emitting, the difference between a run signal and a bus signal                                                                                                                                                                                                                                      |
| `references/packs/project-config.md`                                                           | tunables typed by a bound type                                                                                                                                                                                                                                                                                    |
| `references/spend.md`                                                                          | billing in full: compute, cache hits, previews, evals, reprocess, prices, which read answers which question, the 402 codes                                                                                                                                                                                        |
| `references/packs/credits.md`                                                                  | the balance, member wallets, the per-person statement, and the gate `status` does not show                                                                                                                                                                                                                        |
| `references/api/failures.md`                                                                   | the failed-runs list, the test event and the alerts read                                                                                                                                                                                                                                                          |
| `references/api/schedules.md` · `triggers.md` · `events.md` · `project-config.md` · `spend.md` | every route's fields. Project settings are in `kipory-connect`'s `references/api/projects.md`, the member routes in `kipory-expose`'s `references/api/end-users.md`, model prices in `kipory-build`'s `references/api/functions-and-models.md`, an eval run's spend in `kipory-prove`'s `references/api/evals.md` |
| `references/when-a-run-fails.md`                                                               | being told of a failure, health and pausing, whose failure it is, `partial` runs                                                                                                                                                                                                                                  |
| `references/pitfalls.md`                                                                       | each trap of operating a project, with what happens and what to do                                                                                                                                                                                                                                                |

## Then

`kipory-diagnose` when something running unattended does the wrong thing: the schedule's history names the failing action and hands you the run id; the timeline gives the sequence; the trace gives the values. `kipory-expose` for the subscription endpoint that delivers events to a client. `kipory-channels` for the source a trigger listens to. `kipory-secrets` when a vendor's bill should move to the project's own key. `kipory-prove` to pin a scheduled flow's behaviour before it runs unattended. `kipory-evolve` before changing a flow a schedule or trigger already fires.
