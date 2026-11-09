---
name: kipory-operate
description: Run a Kipory project unattended — schedules that fire a flow on a cron, triggers that run a flow whenever a matching event is recorded, the event registry a flow emits into and clients subscribe to, namespaced runtime config that tunes a flow without an edit, and the spend reads that say what it all cost and what will stop it, and how the project is told when an unattended run fails. Use once a flow works and should run on a clock, react to something that happened, report progress, or be adjustable without redeployment; when the user wants to be alerted to failed runs, or asks why a schedule or trigger was paused; when the user asks about billing — what a project spent, what a run, a preview or a model costs in credits, or the balance and budget left; or when a call came back 402. Not for diagnosing a single bad run (kipory-diagnose), not for the credentials a flow needs (kipory-secrets), and not for creating the Telegram source a trigger listens to (kipory-channels).
license: MIT
---

# Operate a project

Five capabilities that only matter once something works, and one fact most people get wrong about money: **the credit balance is a project-host read.** `GET /v1/credits/balance` answers on the project's own host — the `baseUrl` that `GET /v1/grant` hands a key — and is a plain 404 on the api host, where everything else in this skill lives. What you spent, per run and per project, is on the api host.

## Before the first call

- Fetch the pack for the capability you touch: `references/packs/schedules.md`, `triggers.md`, `events.md`, `project-config.md`, `credits.md`. For anything about cost, start at `references/spend-reads.md`; it points to `references/spend.md` and `references/balance.md`.
- `GET /v1/bootstrap?project={nodeId}&sections=surfaces,events,project` returns every schedule, every trigger, every event type (each with its namespace), the route enablement and the config namespaces in one call.
- Writes here are EDITOR; deletes, and the project settings that hold the spend ceiling, are ADMIN.

## Schedules

<!-- field-ok: userInfo — a run-ambient value the engine provides, not a wire field a caller sends -->
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

- **Inputs** are keyed by the flow's input names; `overlapPolicy` is `skip` or `allow`.
- **A write checks its inputs**, in `validateOnly` too: every required input of the flow has a value, none is blank, and each value is of its input's type (`SCHEDULE_INPUT_MISTYPED` / `TRIGGER_INPUT_MISTYPED`).
- **A flow change can strand a schedule.** A document plan, or the flow or type PATCH with `validateOnly` (`leavesBehind`), names the schedules and triggers a narrowing change would leave unable to fire; the PATCH itself still saves.
- **There is no "run this schedule now" route.** <!-- absent: POST /v1/schedules/{id}/run --> To run a scheduled flow by hand, preview its flow with apply: `node <kipory-connect>/scripts/kipory.mjs preview <flow> --apply` (add `--as <user>` only for a person's flow; a schedule acts for nobody). It keeps the writes (without `--apply` it keeps none) but sends nothing: `email.send` and `url.send` answer `PREVIEWED_NOT_SENT`. A flow that sends runs for real only from its schedule or an endpoint over it. A preview runs at most 5 elements of each `each` and says when it capped one, so a larger list is written only in part: add `--fan-out-cap uncapped` (or a number up to 1000) to run them all.
- **A spent schedule disables itself.** Spending `maxRuns` (or passing `endsAt`) disables the schedule without moving its `version`; a disabled schedule shows `nextRunAt: null`.
- **The next-run time is a claim you can hold the platform to**: it is computed by the same code the tick uses.
- **Switching `enabled` on recomputes from now** — refused (422) when the bounds are spent — so a schedule disabled across its window does not fire a backlog.
- On a retired project a PATCH of `{enabled: false, version}` alone is still accepted.
- **A fire has no end user.** `userInfo` is absent, so a per-user table refuses, and a step that requires `userInfo` is refused at save until it is guarded — an `if` testing `{has: userInfo}`, or the read made `optional` or given a `default`. Preview with `input.principal: "no-end-user"` to see the run a fire makes (`kipory-build`'s `references/checking.md`). A trigger's fire is the same.

Each occurrence in `runs` carries its `outcome` — `fired`, `skipped`, `blocked` — its own `status` (`succeeded`, `partial`, `failed`, `running`, `skipped`, `blocked`: count this one), its `invocation` with `id`, `status` (`pending`, `processing`, `ready`, `failed`, `deleting`), `statusError` (a short message: the failed step's key and code, never the step's own words), `failure` — how the run failed and whose failure it was: `class`, `owner`, `retryable`, and the step (`stepKey`, `functionKey`, `phase`, `code`) when one step is to blame — `waiting` while the platform is about to start the run again, and `creditCost` where null is not zero. `references/when-a-run-fails.md` has the classes. **The invocation's `id` is the run id**: take it to `GET /v1/runs/{runId}/timeline` for the ordered, never-sampled timeline (`kipory-diagnose`).

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
- **What the flow receives.** The envelope arrives in a reserved `event` input — its `projectId`, `source` and a project-scoped `subject` carry the project's one id, the same one `projectInfo.projectId` holds and every route takes — and `{ triggerId, key, triggerRunId, replay }` in a reserved `trigger` input. Neither belongs in `inputs`; everything else the flow declares does. Declare both with the builtin `object` type and read the payload as `event.data.<field>`.
- **A `filter` is a condition over two values**, `event` (the envelope) and `data` (its payload); an event it rejects is recorded as `filtered`, never dropped.

## When a run fails

**Being told of a failure, health and pausing** — the failed-runs, alerts and test-event routes, whose failure it is, and `partial` runs: `references/when-a-run-fails.md`.

## Events

```
POST /v1/event-types             { project, categoryKey, key, label, defaultScope, payloadDataTypeId?, durable? }
GET  /v1/event-types?project={nodeId}[&categoryKey=]
```

`categoryKey` is the event's namespace — the first half of its `categoryKey/key` address. There is nothing to create first: a new one opens the namespace. A reserved platform name is a 422; a source provider's namespace (`telegram`) is a 409 — its source writes those types. `durable` omitted is `false`.

Every type write — `POST`, `PATCH { version, … }`, `DELETE` — takes `validateOnly` (in the body; `?validateOnly=true` on a DELETE) and answers a 200 verdict instead of writing: a taken key, a refused namespace, a seeded row's delete and the scope/payload rules come back as findings.

A type's `defaultScope` is `run`, `record`, `user` or `project`: a signal scoped to one run and one on the bus are different things — pick by who needs to hear it. The payload type is optional; omit it and the event is a bare signal. When you give one, `payloadDataTypeId` must be a type of this project — a builtin such as the `string` type a flow's slot hands back is refused as unknown; wrap a scalar in an object type. A flow emits with an `event.emit` step; a client subscribes through an `events.subscribe` endpoint (`kipory-expose`) or watches the project-wide `GET /v1/activity/stream`, whose `changed` frames name only which domain moved — never an event, id or payload — so it is a cue to re-read, not a feed; another flow reacts through a trigger, which needs the type to be `durable`.

## Project config

```
GET    /v1/project-config?project={nodeId}       every row carries the overrides AND the effective values
POST   /v1/project-config                        upsert on (project, namespace): dataTypeId on create, version when it exists; `data` is the WHOLE override map; validateOnly: true checks it
DELETE /v1/project-config/{id}[?validateOnly=true]
```

Reach for this instead of editing a flow whenever the thing being changed is a threshold, a cadence or a weight. The `namespace` binds a type whose field defaults are overlaid, per top-level field, with your `data` (at most 32 KiB); `effective` is computed on every read, never stored, so editing a default in the type takes effect at once. The type reference is soft: deleting it leaves reads working and refuses the next write.

**`data` is the whole override map.** A POST replaces every override stored in the namespace with the `data` it carries: sending only the key you changed deletes every other override and answers 200. Read the row, merge locally, send the full map.

## Spend

**Spend** — the spend routes, the short version of billing, and which read answers which question: `references/spend-reads.md`; what each step and run is charged: `references/spend.md`; the balance, the 402 codes and the ceilings: `references/balance.md`.

## What will bite you

**The traps of operating a project** — each with what happens and what to do, from the balance read that 404s on the api host to the trigger that never catches up: `references/pitfalls.md`.

## References

| File                                                                                           | What it answers                                                                                      |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `references/packs/schedules.md`                                                                | time-triggered runs and their history                                                                |
| `references/packs/triggers.md`                                                                 | event-triggered runs, the log they read, and the record of every decision                            |
| `references/packs/events.md`                                                                   | the registry, emitting, the difference between a run signal and a bus signal                         |
| `references/packs/project-config.md`                                                           | tunables typed by a bound type                                                                       |
| `references/spend.md`                                                                          | what a step and each kind of run is charged: compute, cache hits, previews, evals, reprocess, prices |
| `references/spend-reads.md`                                                                    | the spend routes, billing in short, which read answers which question                                |
| `references/balance.md`                                                                        | the balance, member wallets, the 402 codes and the ceilings                                          |
| `references/packs/credits.md`                                                                  | the balance, member wallets, the per-person statement, and the gate `status` does not show           |
| `references/api/failures.md`                                                                   | the failed-runs list, the test event and the alerts read                                             |
| `references/api/schedules.md` · `triggers.md` · `events.md` · `project-config.md` · `spend.md` | every route's fields                                                                                 |
| `references/when-a-run-fails.md`                                                               | being told of a failure, health and pausing, whose failure it is, `partial` runs                     |
| `references/pitfalls.md`                                                                       | each trap of operating a project, with what happens and what to do                                   |

Project settings are in `kipory-connect`'s `references/api/projects.md`, the member routes in `kipory-expose`'s `references/api/end-users.md`, model prices in `kipory-build`'s `references/api/functions-and-models.md`, an eval run's spend in `kipory-prove`'s `references/api/evals.md`.

## Then

`kipory-diagnose` when something running unattended does the wrong thing: the schedule's history names the failing step and hands you the run id; the timeline gives the sequence; the trace gives the values. `kipory-expose` for the subscription endpoint that delivers events to a client. `kipory-channels` for the source a trigger listens to. `kipory-secrets` when a vendor's bill should move to the project's own key. `kipory-prove` to pin a scheduled flow's behaviour before it runs unattended. `kipory-evolve` before changing a flow a schedule or trigger already fires.
