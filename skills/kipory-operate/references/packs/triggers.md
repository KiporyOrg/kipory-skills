<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Triggers

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

The event-driven sibling of a schedule (capability pack `schedules` — `GET /v1/capability-packs/schedules`). A trigger binds one flow, a fixed set of
inputs and a **selector** — an event's namespace (`categoryKey`) and key from the project's own
registry (capability pack `events` — `GET /v1/capability-packs/events`) — and runs the flow every time a matching event is **recorded**: with the
event's envelope in a reserved input slot named `event`, and a little delivery context in a second
reserved slot named `trigger`. An optional **filter**, the same condition grammar a flow action uses,
narrows which events count.

The fire is attributed to the **project**, not to a person, and billed to the project's payer —
exactly as a schedule's is. Every decision the trigger takes about an event — fired, filtered,
skipped, blocked — is written down in its runs, and any decision can be replayed.

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire field a caller sends -->

**A fire has no end user.** `userInfo` is absent from the run. An action that reads only provider
slots still runs, with no user behind it — so a per-user table refuses there, a project-wide
one reads normally, and a `user`-scoped emit is dropped. An action that reads `userInfo` beside
another slot waits on that other slot. Carry the person you mean as data in the event's payload,
and preview the flow with `"principal": "no-end-user"`, which is the run a fire makes.

## What "recorded" means, and why it is the word that matters

An event reaches a trigger only if it was written to the project's **event log**, and that happens
only for a **durable** event type: one whose `durable` flag is
true, and whose scope is `record`, `user` or `project`. A `run`-scoped event rides the live stream
of the run that raised it and is never logged, so nothing can trigger on it. An ephemeral type is
published to whoever is streaming at that instant and forgotten.

So the sequence, from the emitting flow's side, is: the run commits, the emission is written to the
log, then it is published. A run that fails after its `event.emit` node records nothing and fires
nothing. That is the same transactional rule the events pack states for bus-scoped events; the
log is what makes it survive the instant.

⚠️ **A trigger does not catch up.** Enabling a trigger, or creating one, reacts to events recorded
from then on. Earlier events are in the log — `GET /v1/project-events` — and any one this trigger
has already decided can be replayed, but a trigger never sees an event it was not there for.

## When you need it — and when you don't

- **Against a schedule:** a schedule fires when the clock says so; a trigger fires when something
  happened. "Every ten minutes" is a schedule. "Whenever a post is created" is a trigger. Polling
  on a schedule for what an event would tell you is the most common way to spend money on nothing.
- **Against calling the second flow from the first:** a `flow.invoke` action couples the two flows —
  the emitter names the reactor. A trigger decouples them: the emitting flow raises `post/created`
  and knows nothing about who reacts; three triggers can react to one event, each with its own
  filter and flow, each failing independently.
- **Against an endpoint's `events.subscribe`:** that streams events to a connected client. A
  trigger runs a flow on the platform whether or not anyone is connected.

## The sequence

```
POST /v1/event-types                     make (or check) the type durable, not run-scoped
POST /v1/triggers                        bind selector + filter + flow + inputs
GET  /v1/triggers/{id}/runs?limit=N      every decision, newest first, with the run it started
                                         (cursor-paged: pass after=<nextCursor> until it is null)
GET  /v1/triggers/{id}/sample            the newest event it would accept — feed it to a preview
POST /v1/triggers/{id}/replay            run one decision again, as a new attempt
PATCH /v1/triggers/{id}                  { enabled: false, version } stops it; { enabled: true, version } starts it, from now
GET  /v1/project-events?project=…        the log itself, newest first, cursor-paged (narrow with
                                         categoryKey[, eventKey], or sourceId for one source's rows)
```

Scoped by `project`. Create takes a **key** (the same charset and immutability as a schedule's or
an endpoint's — see schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`)), the `categoryKey` and `eventKey`
of the event type it listens to, an optional `filter`, the flow (`flowId`), and the inputs keyed by
input slot; optionally a display `label` and an
`overlapPolicy` of `skip` or `allow` — ⚠️ omitting the policy means the source provider's
`overlapDefault` for a trigger on a source (capability pack `sources` — `GET /v1/capability-packs/sources`) (`allow` for Telegram), and `skip` for a
trigger on your own events.

## A trigger on a source

A trigger may point at a source (capability pack `sources` — `GET /v1/capability-packs/sources`) — a Telegram channel the platform watches, and
later a webhook, a Postgres table or an Apify actor — by sending `sourceId` on create. Then the
selector must be the provider's own vocabulary (`telegram` / `message` for Telegram; the source
seeded it into the registry), and the trigger hears **that source's events and no other's**. The
match is structural: the dispatcher compares the trigger's source with the event's, so you never
write "channel is @x" as a filter clause, and a source renamed or re-pointed never leaves a stale
clause behind. `sourceId` is permanent; a trigger on another source is a new trigger. A trigger
without a source listens to every event of its type, whoever wrote it — which is what a trigger on
your own flows' events is.

**Watching a channel the project does not watch yet** is one write, not two: send `newSource` —
`provider`, `config`, and optionally `key` and `label`, the body a source create takes — instead of
`sourceId`. The source and the trigger are created in one transaction, so a trigger the platform
refuses (a blank input, a filter, a taken key) leaves no source behind, and a `validateOnly: true`
create judges both halves — the source exactly as `POST /v1/sources` would, then the trigger against
it — and keeps neither. A channel the project already watches is refused as the source create
refuses it; point `sourceId` at that source instead. Sending both `sourceId` and `newSource` is a 422.

Every recorded event says who wrote it: `source` on the log is `run` for a flow's own emission,
or the provider (`telegram`, `webhook`, `postgres`, `apify`) for a source's.

## The two reserved slots

The bound flow declares its input slots as any flow does. Two of them the trigger fills itself, so
they may not appear in `inputs` — the write refuses either by name with a 422:

- **`event`** — the envelope, exactly as the log holds it: the category and event keys, the
  scope and subject, the time, the payload the emitting flow supplied (under `data`), the
  schema version, the causation id, and the rest of the CloudEvents-shaped fields.
- **`trigger`** — `{ triggerId, key, triggerRunId, replay }`. `replay` is `true` on a replayed
  decision and `false` on a live one, which is the one branch a flow usually wants.

Declare both slots on the flow with the builtin `object` type — the envelope is the platform's, not
a shape of your project, and the save does not check what you typed them as. Read the payload in
the first action as `event.data.<field>`.

Everything else the flow declares must be in `inputs`, fixed in advance — a trigger, like a
schedule, has no caller to fill gaps. Coverage is checked at save: a missing slot is a 422 naming
it, and so is a **blank** one — an empty string, `null` or an empty list — under its own code,
`FLOW_INPUT_BLANK`. Both carry one issue per slot whose `field` is that slot's place in the body
(`inputs.<slot>`), so a form can mark the box. A value its slot's type refuses is refused too, as
`TRIGGER_INPUT_MISTYPED`, one issue per slot; the reserved `event` and `trigger` slots are filled
per event and never judged.

Shaping belongs in the flow. There is no template language on the trigger; the first action of the
bound flow is where the payload under the `event` slot becomes whatever the rest of the flow wants,
which keeps that shaping previewable and testable with the flow's own eval suite.

## The filter

A `filter` is an action condition evaluated over **two slots**: `event` (the envelope's own fields)
and `data` (its payload). A payload field is addressed as
`{ "op": "slotEquals", "slot": "data", "path": "source", "value": "telegram" }`; an envelope
field as `{ "slot": "event", "path": "category", … }`. The three combinators — all-of, any-of and
not — compose as they do in an action condition.

A `path` walks the slot the way an action condition's does: `author.profile.id` descends into objects
(a key that itself contains a dot still matches, longest key first) and `items[0].kind` reads one
item of a list. ⚠️ A path that reads nothing reads as absent — `slotEquals` on it is false, with
no error — so a misspelled one records every event as `filtered` rather than failing.

A filter may nest at most **16** levels — each `not`, all-of and any-of is one level, and a lone
leaf is none. A deeper one is refused at the write with a 422 on `filter` that says how deep it is
and what the bound is; flatten it (an all-of inside an all-of is one all-of). The bound is the
same one every action condition meets.

An event the filter rejects is recorded as **`filtered`** in the runs with the reason, never
silently dropped; a filter that fails to evaluate is recorded the same way with the evaluator's
message. A filter cannot stall the other triggers on the same event.

⚠️ **A stored filter the platform can no longer read matches nothing.** Every event is recorded
as `filtered` ("filter is not a valid condition"), the sample offers none, and the read returns
the filter as stored — never `null`, which would mean "react to every event". Write a valid one
to bring the trigger back. A project-document apply that leaves the filter unchanged does not
re-judge it, so the rest of the trigger can still be edited.

## What the platform refuses

- **A selector that could never fire** — an event type that does not exist in this project, is
  not `active`, is `run`-scoped, or is not durable — is refused at the write, naming the one thing
  to change. Switching `enabled` on re-asks the same question, so a trigger whose type was retired
  in the meantime is refused rather than enabled and quietly ignored.
- **Every declared input slot the two reserved slots do not cover must have a value** — present,
  and not blank (`""`, `null` or `[]`; 422 `FLOW_INPUT_BLANK`, one issue per slot).
- **A filter nested deeper than 16 levels**, or one that is not a condition at all, is a 422 on
  `filter`.
- **`sourceId` and `newSource` together** — a trigger listens to one source.
- **Every PATCH — switching `enabled` included — requires the version you last read.**
- **A replay of an event this trigger never decided** is a 422. The decision row is what you are
  re-running; there is no backfill through the back door. A replay is also refused while the
  trigger is **disabled** (disable means stop, and a replay is a fire) or **paused** (resume it
  first), when the event no longer
  matches the trigger's **current selector**, and when that selector no longer resolves to an
  active, durable, non-run type — the same question switching `enabled` on asks.
- **Deleting a flow a trigger binds** is refused, counting the triggers it would strand, by the
  same guard that protects a flow a schedule binds.

### Ask before you write: `validateOnly`

Send `validateOnly: true` on the create or the patch and the platform answers a **verdict** at 200
instead of writing: whether the write would be taken (`ok`), what it found (`diagnostics`) and
whether every rule ran (`complete`). Read `severity`, never `code`: `error` will not save,
`warning` blocks nothing, and `info` notes something the platform left alone.

⭐ **Every refusal above is decided before anything is written**, a key already taken included, so
you can hear all of them without making the write.

⚠️ **A stale `version` is NOT reported here.** The optimistic lock is about when the write lands,
not about whether your draft is coherent — the save answers 409 for it and the verdict says nothing,
because `ok` answers only the second question.

⚠️ **There is no `derived`.** A trigger's stored row is the body you sent — the platform resolves
no slot, binds no stage and mints no key of its own — so there is nothing to report back that you
did not already have.

A delete asks the same way: `DELETE /v1/triggers/{id}?validateOnly=true` answers whether it would go
through, writing nothing. Nothing refuses a trigger's delete, so the verdict is `ok` for any trigger
the id addresses. The flag is the delete's only query parameter; anything else in the query is
refused.

## What the platform guarantees

- **Exactly one decision per event per trigger.** The decision row is inserted before the fire, under
  a unique key on the trigger, the event and the attempt number, so a redelivered dispatch cannot
  fire twice.
- **Nothing is lost between the emit and the run.** The row is written before the bus publish; the
  dispatch job retries three times with backoff, and if it is lost or exhausted a per-minute sweep
  re-enqueues every event still undispatched. An event is stamped dispatched only once every
  matching trigger has its decision row — a trigger that could not be decided keeps the event
  undispatched for the next pass rather than losing it.
- **One trigger's refusal does not touch another's.** Fan-out is per trigger, each decided and
  fired independently; a payer refusal on the project blocks them all with the reason on each row.
- **A chain stops.** An event emitted by a run a trigger started carries a depth; past the
  platform's cap (eight links) every trigger on it is recorded as `blocked`, so a flow that emits
  its own trigger type does not loop.
- **No retries of a refused fire.** A fire refused after its claim — a suspended payer, a transient
  fault, a retired event type, a bound flow that is gone — is recorded as `blocked` with the reason,
  and the trigger's `lastError` says the same. Replay it by hand when the cause is gone.
- **`skip` judges "still running" generously.** A fire whose invocation link is not yet written —
  the window between the claim and the accept — counts as in flight for five minutes, and any
  recent fire still `pending` or `processing` holds the next event back, not only the newest.
- ⚠️ **So `skip` drops the second of a burst.** Two events recorded 60 ms apart — two tickets
  arriving together, or one run that emits twice — fire the first and record the second as
  `skipped` ("previous run still in flight"); nothing runs for it unless you replay it. `skip` is
  right when a run works over current STATE and one run covers every event (re-sync, re-index).
  Choose `allow` when every event must be acted on — a notification, a per-record write — and make
  the flow safe to run concurrently.
- **The payload cap applies to every emit**, not only to what the log stores: an `event.emit`
  whose payload exceeds 256 KiB fails the action, whatever the type's scope or durability.

## Reading what happened

`GET /v1/triggers/{id}/runs` is the debugging surface. Each row carries the `eventId`, the
`attempt` (0 live, higher on replays), the `outcome`, a plain-words `reason` for anything that did
not fire, and — for a fire — the invocation with its live `status` and, once it has failed, a
`failure`: the run's closing record, with its `class` (`logic`, `vendor`, `platform-fault`, …), its
`owner` (who has to act), whether it is `retryable`, the `attempt` that closed it, the action that
failed (`actionKey`, `phase`) when one did — otherwise the `cause` that closed it and, for changes refused
when they were saved, the `refusedWrite` — and a `reason` when it is one a caller may read (a mail refusal,
`recipient-not-an-address` among them — the mail action was given a recipient that is no email address —
`more-than-one-recipient` — it was given a list of recipients —
`project-mail-cap-reached`, `project-push-cap-reached`). Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) lists the classes. While the platform is
about to start a run again after one of its own failures, the invocation is `pending` and carries
`waiting` — a `reason`, the `attempt` number and `notBefore` — instead; schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) says what that
means. `replayOf` points a replayed row at the decision it re-ran.

The log itself, `GET /v1/project-events`, is where you find an `eventId` to replay. Its `source`
column says who wrote the row: `run` for a flow's own emission, or the provider for a source's —
`telegram` today; `sourceId=` narrows it to one source. Both tables are
kept for **30 days**, and both are cursor-paged: walk `after=<nextCursor>` until it is `null`.
Each logged `event` names its project `project`, the node id every `?project=` takes; the flow's
`event` slot carries the same envelope with the same node id under the name `projectId`.

## Being told when a run fails: a trigger on a platform event

Every project has the event category `platform`, with nine types the platform records itself.
You cannot add to it, change it or emit into it; `GET /v1/event-types` lists them, and a project
document neither creates nor prunes them. **A failure trigger is an ordinary trigger on one of
them, bound to an ordinary flow** — one that posts to your chat, opens a ticket, writes a record.

| Event                 | Recorded when                                                                 | `data` is              |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| `run.failed`          | An unattended run failed for good — the first of an episode for its subject   | `PlatformRunFailed`    |
| `run.failures`        | More runs of that subject failed: one summary per window                      | `PlatformRunFailures`  |
| `run.partial`         | Runs of a subject finished having tolerated a failure: one summary per window | `PlatformRunPartial`   |
| `health.failing`      | A subject's runs began failing for a reason that is its own                   | `PlatformHealthChange` |
| `health.recovered`    | A failing subject ran clean again                                             | `PlatformHealthChange` |
| `health.quiet`        | A schedule that should have run has not                                       | `PlatformHealthChange` |
| `health.pause-warned` | A failing schedule or trigger will be paused in 24 hours                      | `PlatformHealthChange` |
| `health.paused`       | It was paused                                                                 | `PlatformHealthChange` |
| `mail.failed`         | A message a run sent was refused, failed for good, or was returned            | `PlatformMailFailed`   |

An unattended run is a schedule's occurrence, a trigger's fire, an asynchronous endpoint call, or
a record's processing. Its **subject** is what it ran for — `{ kind, key }` with `kind` one of
`schedule`, `trigger`, `endpoint`, `table`.

**What `run.failed` carries.** The run (`id`, `kind`, `flowKey`, when it started and closed,
`attempts`), the `subject`, `closing.failure` — its `class`, its `owner`, the action and function
that failed, a `code`, and the sentence the platform writes for that code — the subject's `health`,
and `depth`. Ids, keys, codes and counts only: never the run's inputs, a slot's value, or what a
vendor answered. Read those from the run itself with the caller's key.

**Not every failure is an event of its own.** The first final failure of a subject is told at
once and opens an episode. Later ones are folded into `run.failures` summaries: the first a
minute later, then at doubling intervals up to an hour. A summary carries the `count`, a count per
class, the commonest code, the first and last run ids, and `failedRunsPath` — the address of the
runs themselves, already filtered to exactly the ones the summary counted: by when each failure was
reported, leaving out runs a platform event started. Five thousand records failing in ten minutes
are five events, not five thousand runs of the flow that hears them.

**What `mail.failed` carries.** One event per message, the first time it rests on `refused` (the
platform will not send it), `failed` (every try failed, or it never reached the delivery queue) or
`bounced` (the recipient's server returned it; only on a deployment that reads its returned mail): `messageId` — the id the `email.send` action
answered — the `runId` and `actionId` that sent it, the `recipient`, the `status`, a `reason`, the
`fault` (`platform`, `sender` or `recipient`: whose failure it is), the sentence the platform writes
for the reason, the relay's `replyCode` or the returned notice's `bounceStatus` when there is one,
`at`, and `messagePath` — the address of the message's record. The recipient's address is the one
part of a message an event holds: never the subject, the body or the reply-to. A try that will be
repeated and a message the relay accepted record nothing; read those from
`GET /v1/mail-messages?project=<nodeId>`. It is about a message, not a subject: it moves no health,
changes nothing about the run that sent the message, and a message sent by a flow that a platform
event started records no event when it fails — read that one from its record.

**Nothing is recorded** for an attempt the platform is about to start again, for a run a person
cancelled, for a preview, or for a synchronous call — whose caller already has the answer.

**A failure trigger's flow cannot be handed its own failure.** A run started by a platform event carries that
fact on to everything it starts — a flow it triggers, a record it queues — and none of those runs
causes a platform event when it fails. A broken failure flow fails once per event, and stops there.
Its failures still count: it reads `failing`, and `GET /v1/projects/{nodeId}/alerts` marks it
`failureTrigger: true`. They are never told — no `health.failing` or `health.recovered` comes of
them — and never bring a schedule or trigger closer to a pause.

A trigger on a platform event defaults to `overlapPolicy: "allow"` — skipping a `run.failed`
because its flow was still busy would lose the report — is never paused by the platform, and
runs in a slot of its own, so a project whose runs fill its concurrency cap can still be told.

### Prove the failure trigger before something fails

`POST /v1/platform-events/test` with `{ project, type, subject: { kind, key } }` records one
event of that type for a subject the project has. Its `data` is an example with `test: true`;
every enabled trigger on the type fires as on a real one, and the flows they start are ordinary,
charged runs. Recording it costs nothing, moves no health and lists no failed run. The answer
says how many triggers listen — zero means nothing ran. For `mail.failed` the `subject` is still
required and is not used: any subject of a valid kind is accepted.

### Asking instead of being told

- `GET /v1/failed-runs?project=<nodeId>` — the runs whose latest close is `failed` or `partial`,
  newest first, filterable by subject (`subjectKind` with `subjectKey`), by failure `class`, by `verdict`, and by
  when the run closed (`from` up to `to`, which is exclusive). Cursor-paged on `after`. Each row's `closing` carries
  the `failure` of a failed run and, for a `partial` one, `absorbed` — how many failures it
  carried on past.
- `GET /v1/projects/{nodeId}/alerts` — every schedule, trigger, table or endpoint that is
  failing, quiet, about to be paused or paused, read live.
- A plan (`POST /v1/projects/{nodeId}/document/plan`) of a project that runs schedules or
  triggers and has no enabled trigger on `platform/run.failed` says so, as
  `DOCUMENT_NO_FAILURE_LISTENER`. It is information and blocks nothing.

### A trigger's own health, and being paused

A trigger read carries `health`, `pausedAt`, `pauseReason` and `failurePolicy`, exactly as a
schedule's does — schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) has the states and the pause rule; for a trigger the
time is 48 hours, since it has no interval. While a trigger is paused no event is decided for it
and nothing is recorded for those events; they are not replayed when it resumes.
`POST /v1/triggers/{id}/resume` resumes it.

With `expand=lastRun` a trigger also carries `lastRunStatus`: `running`, `succeeded`, `partial`,
`failed`, `skipped`, `blocked` or `filtered` for the newest event that reached it, `null` when
none has. `partial` is a run that finished having carried on past a failure it was set to
tolerate; like a schedule's, it reads `succeeded` once the run has left the project's list of
failed and partial runs.

## Testing a flow against a real event

`GET /v1/triggers/{id}/sample` returns the newest logged event the trigger's selector and filter
would accept, in the log's shape — or `null`, said plainly, when none of the newest 500 events of
the type qualifies. Hand it to `POST /v1/flows/{id}/preview` as the `event` input, with a
hand-written `trigger` object. The log's shape names the project's node id `project`, where a
fire's `event` slot names the same node id `projectId`; `source` and a project-scoped `subject`
carry it in both. A flow that reads `event.projectId` finds it absent in a preview fed the sample,
so give it the node id by hand if the flow reads it.
