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

Each occurrence in `runs` carries its `outcome` — `fired`, `skipped`, `blocked` — its own `status` (`succeeded`, `partial`, `failed`, `running`, `skipped`, `blocked`: count this one), its `invocation` with `id`, `status` (`pending`, `processing`, `ready`, `failed`, `deleting`), `statusError` (a short, deliberately generic message), `failure` — how the run failed and whose failure it was: `class`, `owner`, `retryable`, and the action (`actionKey`, `functionKey`, `phase`, `code`) when one action is to blame — `waiting` while the platform is about to start the run again, and `creditCost` where null is not zero. "When a run fails" below has the classes. **The invocation's `id` is the run id**: take it to `GET /v1/runs/{runId}/timeline` for the ordered, never-sampled timeline (`kipory-diagnose`).

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
POST /v1/platform-events/test              { project, type, subject: { kind, key } } — record one example event and fire the triggers on it
```

An **unattended run** is a schedule's occurrence, a trigger's fire, an asynchronous endpoint call or a record's processing: nobody is waiting on the answer. `references/packs/triggers.md` ("Being told when a run fails") and `references/packs/schedules.md` ("health, and being paused") have the detail; `references/api/failures.md` the fields.

**Being told**

- **A failed run cannot report itself.** It keeps nothing it wrote, and an `event.emit` it reached is never recorded, so no action of a flow can announce that flow's own failure. The platform records the failure for it, as an event in the project's `platform` category.
- **Eight `platform` event types, and they are the platform's.** `run.failed`, `run.failures`, `run.partial`, `health.failing`, `health.recovered`, `health.quiet`, `health.pause-warned`, `health.paused`. Every project has them; you cannot add to the category, change it or emit into it, and a project document neither creates nor prunes them.
- **The failure trigger is an ordinary trigger on one of them, bound to an ordinary flow**: `POST /v1/triggers` with `categoryKey: "platform"`, `eventKey: "run.failed"` and a flow that posts to your chat (`url.send`), mails someone (`email.send`) or writes a record. The flow reads `event.data`: the run (`id`, `kind`, `flowKey`, `attempts`), its `subject` (`{ kind, key }`, `kind` one of `schedule`, `trigger`, `endpoint`, `table`), `closing.failure` (class, owner, the action, a `code` and the platform's sentence for it) and the subject's `health`. Ids, keys, codes and counts only — never an input or a slot's value; read those from the run.
- **Listen to `run.failures` as well.** Only the first final failure of a subject is a `run.failed`. Later ones are folded into `run.failures` summaries — the first a minute later, then at doubling intervals up to an hour — each with a `count`, a count per class and `failedRunsPath`, the failed-runs list filtered to exactly what it counted. Five thousand records failing in ten minutes are five events.
- **Nothing is recorded** for an attempt the platform is about to start again, a run a person cancelled, a preview, or a synchronous call, whose caller already has the answer.
- **A failure trigger's flow is never handed its own failure.** A run started by a platform event, and everything that run starts, causes no platform event when it fails. A broken failure flow fails once per event and stops; its trigger reads `failing`, and the alerts read marks it `failureTrigger: true`. Such a trigger defaults to `overlapPolicy: "allow"`, is never paused, and runs in a slot of its own.
- **Prove the failure trigger before something fails.** `POST /v1/platform-events/test` records one event of the type, with example `data` carrying `test: true`, for a subject the project has. Every enabled trigger on the type fires, and the flows they start are ordinary, charged runs. The answer says how many triggers listen: zero means nothing ran.
- ⚠️ **Nothing is mailed.** The platform sends no mail about a failing, quiet, warned, paused or recovered schedule, trigger, table or endpoint. A project that wires no trigger on a `platform` event is told nothing, and nothing of its is ever paused. It learns only what it asks for: `health` on each schedule, trigger, table and endpoint read, the alerts read, the failed-runs list, and `lastRunStatus`. A document plan of a project that runs schedules or triggers with no enabled trigger on `platform/run.failed` says so as `DOCUMENT_NO_FAILURE_LISTENER` — information, blocking nothing.

**Health, and being paused**

- **Every schedule and trigger read carries `health`**, one word in `state`: `healthy`, `failing` (with `failingSince` and `countedFailures`), `quiet` (a schedule whose occurrence should have run and has not, for five intervals and at least an hour), `warned` (it will be paused at `pauseAt`) or `paused`. A table and an endpoint carry `healthy` or `failing` and are never paused; an endpoint counts its asynchronous calls only.
- **Only the subject's own failures count** — class `logic`, `definition` or `vendor`. A run the platform failed, a spend cap or a cancelled run never moves `health`. One run that succeeds ends the failing spell.
- **The pause rule.** A schedule is due to be paused when it has been failing for the longer of 48 hours and five of its own intervals, with at least five counted failures — or when at least 95% of at least 20 runs in seven days failed. For a trigger the time is 48 hours. The platform then records `health.pause-warned`, and pauses it 24 hours later if it is still failing.
- ⚠️ **Pausing needs a listener.** In a project with no enabled trigger on `platform` / `health.pause-warned`, nothing is ever paused and each row reads `health.pauseArmed: false`. A row that must never be paused states `failurePolicy: "keep-running"` on create or PATCH (the default is `"pause"`).
- **Paused is a state of its own, beside `enabled`.** The read shows `pausedAt` and `pauseReason` (`failing` or `mostly-failing`). Nothing fires, and no occurrence or decision is recorded; a paused trigger's events are not replayed when it resumes. `enabled: true` does not clear it, and neither does a project document — only `POST /v1/schedules/{id}/resume` or `POST /v1/triggers/{id}/resume`. `GET /v1/bootstrap` leaves `health`, `pausedAt` and `pauseReason` out: read the row, or the alerts read.

**Whose failure it is**

- **A failed run's closing record names a `class` and an `owner`** — `failure` on a schedule's or trigger's run, `closing.failure` on `GET /v1/runs` and each row of the failed-runs list.

  `logic`: your flow's own expression, input or data rule refused. `definition`: the flow cannot be run as it is stored. `limit`: a spend cap, the paying account's standing or an allowance. `vendor`: a site or service the flow called. `platform-busy`, `platform-interrupted`, `platform-fault`: the platform's own — no worker was free, the worker stopped, or the platform itself failed. `cancelled`: it was stopped on purpose.

  `owner` says who has to act: `customer` (you), `vendor`, `platform` (nothing in your flow needs changing) or `caller`. `retryable` says whether running it again, unchanged, could end differently.

- **Waiting for a worker is not a failure.** A queued action's time limit counts the time its job runs, not the wait for a free worker. Only a job no worker takes for five minutes fails its action — class `platform-busy`, no compute charged — and that is one of the failures the platform runs again.
- **The platform runs its own failures again.** When an attempt of an unattended run closes `platform-busy`, `platform-interrupted` or `platform-fault`, the run is not failed: it keeps its run id, its `status` goes back to `pending`, and `waiting { reason, attempt, notBefore }` says why and when the next attempt may start. At most three attempts; only the third such failure is the run's. A failure of your flow, of a vendor or of a limit is never run again, and neither is a synchronous call.
- ⚠️ **What a run started again repeats, and charges.** It runs its actions again from the start. Nothing the failed attempt staged was saved, so no record is written twice. An action's compute is charged once per run however often it is repeated; a model or vendor call that is really made again is charged again, and one a cache answers is not. The worst case is three attempts: a paid call can be charged three times. `repeatedByPlatform` on `GET /v1/runs/{runId}/spend` says how much of a run's cost came from this (`references/spend.md`).
- **A run started again runs the flow it first started with.** A flow edit saved between two attempts is not taken by a run already under way — neither in its own flow nor in a sub-flow that flow calls by a fixed reference; the next run takes it. Not held back: a sub-flow chosen at run time and first reached on a later attempt, types, model bindings, vocabularies and secrets — a later attempt reads those as they are then.
- **A deployment of the platform lets runs finish.** A worker that is being replaced takes no new run and lets the ones it holds finish, for up to five minutes. A run still going after that is interrupted (`platform-interrupted`) and started again as above. ⚠️ Meanwhile no record's processing and no asynchronous run — an endpoint call, a schedule's occurrence, a trigger's fire — is picked up for up to six minutes: they wait in the queue and are not failed.

**`partial`, and the list**

- **A run that carried on past a failure closes `partial`**, a third result beside `succeeded` and `failed`: an action set to `"onFailure": "continue"`, a sub-flow call set to it, or a fan-out branch within the fan-out's tolerance failed (`kipory-build`'s `references/patterns.md`). Its changes are applied and its invocation reads finished; `closing.verdict` is `partial` and `closing.absorbed { actions, calls, branches }` counts what it carried on past. A schedule's or trigger's `status` and `lastRunStatus` read `partial`, and the project is told in `platform/run.partial` summaries.
- **`GET /v1/failed-runs?project={nodeId}` is the list a summary points at**: unattended runs whose latest close is `failed` or `partial`, newest first. Filter by `subjectKind` with `subjectKey`, by `class`, by `verdict`, and by when the run closed (`from`, and `to`, which is exclusive); walk `after=<nextCursor>`. A run the platform is about to start again is not on it, nor is a cancelled one. It keeps a run for a limited time, and a `partial` occurrence old enough to have left it reads `succeeded`.

## Events

```
POST /v1/event-types             { project, categoryKey, key, label, defaultScope, payloadDataTypeId?, durable? }
GET  /v1/event-types?project={nodeId}[&categoryKey=]
```

`categoryKey` is the event's namespace — the first half of its `categoryKey/key` address. There is nothing to create first: a new one opens the namespace. A reserved platform name is a 422; a source provider's namespace (`telegram`) is a 409 — its source writes those types. `durable` omitted is `false`.

Every type write — `POST`, `PATCH { version, … }`, `DELETE` — takes `validateOnly` (in the body; `?validateOnly=true` on a DELETE) and answers a 200 verdict instead of writing: a taken key, a refused namespace, a seeded row's delete and the scope/payload rules come back as findings.

A type's `defaultScope` is `run`, `record`, `user` or `project`: a signal scoped to one run and one on the bus are different things — pick by who needs to hear it. The payload shape is optional; omit it and the event is a marker. When you give one, `payloadDataTypeId` must be a type of this project — a builtin such as the `string` type a flow's slot hands back is refused as unknown; wrap a scalar in an object shape. A flow emits with an `event.emit` action; a client subscribes through an `events.subscribe` endpoint (`kipory-expose`) or watches the project-wide `GET /v1/activity/stream`, whose `changed` frames name only which domain moved — never an event, id or payload — so it is a cue to re-read, not a feed; another flow reacts through a trigger, which needs the type to be `durable`.

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
GET /v1/ai-calls?project={nodeId}                 every model call, filterable; GET /v1/ai-calls/rollup?project= by hour or day; GET /v1/ai-calls/{id}?payload=prompt for one
GET /v1/organizations/{nodeId}/quota              today's use of each shared vendor allowance — the ORGANISATION's id, and a key granted at the organisation
GET /v1/credits/balance                            the wallet — on the PROJECT's host only
```

`references/spend.md` is the full statement: what an action is charged, what a cache hit, a preview, an eval run and a reprocess cost, model prices, the balance's fields, member wallets and the 402 codes. The short version:

- **Every amount is credits, and one credit is one micro-USD.** `x-credits-charged: 5139` is about half a US cent.
- **Compute is charged per second an action ran**, in whole seconds rounded up, one second at least. A run with no model call is still not free.
- **Waiting is not billed.** A queued action — a model action, a fetch — is charged for the time its job ran, not for the wait for a worker or a rate-limit allowance, so its `durationMs` on `/timeline` can be far longer than the seconds it was charged.
- **The compute rate is the deployment's and no route lists it.** <!-- absent: GET /v1/nodes/{nodeId}/compute-rate --> Read it off any `function-run` charge on `/spend`: `credits ÷ units`.
- **Model prices are a read**: `GET /v1/nodes/{nodeId}/model-prices`, at the project's id, quotes each model in credits per million tokens, minute or search (`kipory-build`'s `references/models.md` for choosing one).
- **A cache hit is cheaper, not always free.** An action answered from the action-result cache — which only some functions keep, and previews, eval runs and a reprocess never read — is charged nothing; one answered from a function's input-keyed cache pays its one-second compute fee and no model or vendor charge.
- **Previews, eval runs and reprocesses cost what a live run costs.** Flow previews, `POST /v1/actions/preview`, eval runs and `POST /v1/vector-collections/{name}/search` are design-time work, bounded by the design-time ceiling; a reprocess is not. The one record processing the ceiling does bound is a record handed over by an `record.enqueue-process` action of a preview or an eval run.

**The spend read says what each action was charged for.** Every entry of `byAction` names its action in `actionName` and `actionId` and carries `charges`, one per kind, that sum to the action's `credits` (`references/spend.md` lists the kinds).

The reads count different things, so they disagree by design. `references/spend.md` has the table of which read answers which question; the two to remember are that `x-credits-charged` holds only what was charged by the time the response was sent — so not an asynchronous call's run, which is read on `/spend` with the 202's `id` — and that `GET /v1/ai-calls` hides previews and evals unless you send `origins=all`.

A machine caller has no statement of its own: `GET /v1/credits/events` scopes to a person and answers 401 to a key. Account for key-driven spend per run, or per project through `usage`.

## What will bite you

- **The balance read 404s on the api host.** Group `usage` is served on the project's host only, and a project may switch that group off. A key reads the wallet with `perUserSpendCap` null — there is no person to cap. The read stays available while the wallet refuses calls, deliberately.
- **The wallet may not be the project's.** `payer` on the balance names the node that holds it; `payer.own: false` means the project draws on a node above it and shares that balance. A negative `creditsRemaining` under `status: active` is spent headroom, not an error. `wallet: "member"` is a signed-in member's own wallet where the project turned `memberWallets` on; a key always reads `node`.
- **Five 402 codes, five remedies.** <!-- count: api-402-codes --> `BALANCE_BELOW_SOFT_CAP`, `USER_SPEND_CAP_EXCEEDED`, `DESIGN_SPEND_CAP_EXCEEDED`, `MEMBER_WALLET_EMPTY`, and `PUBLIC_ENDPOINT_UNAVAILABLE` — what a public endpoint answers, with no `details`, when the wallet or the project's public spend cap refuses it. Branch on `code`; `references/spend.md` has what refused, the `details` each carries and the remedy. No call adds credits: for the first, tell the human which wallet (`payer.name`, `payer.nodeId`) needs credit from the deployment's operator.
- **A refusing wallet stops more than the call.** Reads still answer, a queued job is refused when a worker takes it, a schedule or trigger fire is recorded `blocked`, and a run in flight has its remaining actions skipped (`references/spend.md`).
- **Both ceilings live on project settings and are ADMIN.** `null` means no ceiling and `0` means block everything — opposites (`references/spend.md`).
- **`credits: 0` on `/spend` is a price only when `uncharged` is 0.** Otherwise the platform paid for that work, and the same action has a price in a charged run (`references/spend.md`).
- **A reprocess is charged** like the record's first processing, as is every run it queues through `record.enqueue-process` (`references/spend.md`; `kipory-data` owns the reprocess itself).
- **An empty `/spend` is not a zero.** A run that spent nothing, one that failed before its first billable operation and one too old to be tied to its charges all answer an empty `byAction` (`references/spend.md`).
- **A schedule's `key` never changes** and is not on the patch body — sending it is a 422. Rename through `label`; a blank string is a 422, `null` clears.
- **`runs` is one page, newest first.** `limit` goes to 200; walk older occurrences or decisions with `after=<nextCursor>` until `nextCursor` is `null`. A full page says nothing about whether more exist — only the cursor does.
- **Choose `overlapPolicy` deliberately.** `allow` on a flow slower than its interval runs copies of itself concurrently. On a trigger, omitting it means `skip` for your own events — and `skip` records the second of two events that arrive together as `skipped`, running nothing for it. Use `allow` for a trigger whose every event must be acted on (a notification, a per-record write); keep `skip` for a flow that re-syncs state, where one run covers them all.
- **A paused schedule or trigger is not a disabled one.** `enabled: true` beside `pausedAt` fires nothing; resume it ("When a run fails").
- **A trigger never catches up.** Enabling one, or creating one, reacts to events recorded from then on; earlier events are in `GET /v1/project-events` and only a decision the trigger already took can be replayed. There is no backfill, on purpose.
- **A trigger's `skip` overlap looks at its 20 most recent fires, not only the last.** Any of their runs still `pending` or `processing` — or a fire under five minutes old whose run is not linked yet — holds the next event back as `skipped`. A run stuck in `processing` skips every later event of that type until it terminates (skipped events are not fires, so it never ages out of those 20); the decision log shows the rows. `allow` on a flow that emits its own trigger type runs until the platform's chain-depth cap blocks it, and the decision log says `blocked` with why.
- **A trigger's filter reads a payload field as `{ "op": "slotEquals", "slot": "data", "path": "source", "value": "telegram" }`.** `path` walks: `author.profile.id` descends into objects (a key that itself contains a dot still matches, longest key first) and `items[0].kind` reads a list item, as in an action condition. A path that reads nothing reads as absent — `slotEquals` on it is false, with no error — so a misspelled path records every event as `filtered`.
- **Seeded event types cannot be deleted (409) but can be patched.** A platform-installed event's label, scope and payload binding are all changeable, and nothing stops you.
- **A type's `status` does not gate emitting.** A retired type still fires; removing the emit action is the way to stop it. An event type carries two version numbers: `payloadVersion` for its shape and `version` for the lock.
- **Config `version` is required when the namespace exists and ignored on create.** A stale one is a 409; re-read and reconcile. Two replacements, at two levels: the POST's `data` replaces the namespace's whole override map, and inside it an override replaces its whole top-level field, never merging into the default.
- **`usage` defaults to seven days and excludes platform-paid work**; `window=custom` takes `from` and `to` as RFC 3339 instants, `to` exclusive (`references/spend.md`).
- **Previews and eval runs start no trigger of their own — a processing handoff still does.** An `event.emit` during a preview or an eval run is checked and dropped: it is never recorded in `GET /v1/project-events` and starts nothing. To test the trigger half, feed `GET /v1/triggers/{id}/sample` to a preview of the triggered flow. But an `record.enqueue-process` action hands the record to its processing flow, which runs live once the write applies, and that flow's events publish and start every matching trigger like any live run's (`kipory-prove`).
- **Model prices and vendor prices are reads; the compute rate and the held-storage rates are not.** `GET /v1/nodes/{nodeId}/model-prices` and `GET /v1/nodes/{nodeId}/vendor-prices` quote in credits before anything is spent; measure the other two from the charges on `/spend` (`references/spend.md`).

## References

| File                                                                                           | What it answers                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/packs/schedules.md`                                                                | time-triggered runs and their history                                                                                                                                                                                                                                                                             |
| `references/packs/triggers.md`                                                                 | event-triggered runs, the log they read, and the record of every decision                                                                                                                                                                                                                                         |
| `references/packs/events.md`                                                                   | the registry, emitting, the difference between a run signal and a bus signal                                                                                                                                                                                                                                      |
| `references/packs/project-config.md`                                                           | tunables typed by a bound shape                                                                                                                                                                                                                                                                                   |
| `references/spend.md`                                                                          | billing in full: compute, cache hits, previews, evals, reprocess, prices, which read answers which question, the 402 codes                                                                                                                                                                                        |
| `references/packs/credits.md`                                                                  | the balance, member wallets, the per-person statement, and the gate `status` does not show                                                                                                                                                                                                                        |
| `references/api/failures.md`                                                                   | the failed-runs list, the test event and the alerts read                                                                                                                                                                                                                                                          |
| `references/api/schedules.md` · `triggers.md` · `events.md` · `project-config.md` · `spend.md` | every route's fields. Project settings are in `kipory-connect`'s `references/api/projects.md`, the member routes in `kipory-expose`'s `references/api/end-users.md`, model prices in `kipory-build`'s `references/api/functions-and-models.md`, an eval run's spend in `kipory-prove`'s `references/api/evals.md` |

## Then

`kipory-diagnose` when something running unattended does the wrong thing: the schedule's history names the failing action and hands you the run id; the timeline gives the sequence; the trace gives the values. `kipory-expose` for the subscription endpoint that delivers events to a client. `kipory-channels` for the source a trigger listens to. `kipory-secrets` when a vendor's bill should move to the project's own key. `kipory-prove` to pin a scheduled flow's behaviour before it runs unattended. `kipory-evolve` before changing a flow a schedule or trigger already fires.
