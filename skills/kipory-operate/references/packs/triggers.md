<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Triggers

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

The event-driven sibling of a schedule (capability pack `schedules` — `GET /v1/capability-packs/schedules`). A trigger binds one flow, a fixed set of
inputs and a **selector** — an event category and event from the project's own
registry (capability pack `events` — `GET /v1/capability-packs/events`) — and runs the flow every time a matching event is **recorded**: with the
event's envelope in a reserved input slot named `event`, and a little delivery context in a second
reserved slot named `trigger`. An optional **filter**, the same condition grammar a flow step uses,
narrows which events count.

The fire is attributed to the **project**, not to a person, and billed to the project's payer —
exactly as a schedule's is. Every decision the trigger takes about an event — fired, filtered,
skipped, blocked — is written down in its runs, and any decision can be replayed.

## What "recorded" means, and why it is the word that matters

An event reaches a trigger only if it was written to the project's **event log**, and that happens
only for a **durable** event type: one whose `durable` flag (or its category's `durableDefault`) is
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
- **Against calling the second flow from the first:** a `flow.invoke` step couples the two flows —
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
GET  /v1/triggers/{id}/sample            the newest event it would accept — feed it to a preview
POST /v1/triggers/{id}/replay            run one decision again, as a new attempt
POST /v1/triggers/{id}/disable           stop it
POST /v1/triggers/{id}/enable            start it, from now
GET  /v1/project-events?project=…        the log itself, newest first
```

Scoped by `project`. Create takes a **key** (the same charset and immutability as a schedule's or
an endpoint's — see schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`)), the `category` and `event`, an
optional `filter`, the flow, and the inputs keyed by input slot; optionally a display `name` and an
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
`provider`, `config`, and optionally `key` and `name`, the body a source create takes — instead of
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

Everything else the flow declares must be in `inputs`, fixed in advance — a trigger, like a
schedule, has no caller to fill gaps. Coverage is checked at save: a missing slot is a 422 naming
it, and so is a **blank** one — an empty string, `null` or an empty list — under its own code,
`FLOW_INPUT_BLANK`. Both carry one issue per slot whose `field` is that slot's place in the body
(`inputs.<slot>`), so a form can mark the box. ⚠️ Coverage is
**presence, not type** — the same omission schedules carry, for the same reason.

Shaping belongs in the flow. There is no template language on the trigger; the first step of the
bound flow is where the payload under the `event` slot becomes whatever the rest of the flow wants,
which keeps that shaping previewable and testable with the flow's own test cases.

## The filter

A `filter` is a step condition evaluated over **two slots**: `event` (the envelope's own fields)
and `data` (its payload). A payload field is addressed as
`{ "op": "slotEquals", "slot": "data", "path": "source", "value": "telegram" }`; an envelope
field as `{ "slot": "event", "path": "category", … }`. The three combinators — all-of, any-of and
not — compose as they do in a step condition.

⚠️ A `path` is **one key** of the slot's object, not a dotted walk. That is why the payload is its
own slot rather than reached through `event`.

A filter may nest at most **16** levels — each `not`, all-of and any-of is one level, and a lone
leaf is none. A deeper one is refused at the write with a 422 on `filter` that says how deep it is
and what the bound is; flatten it (an all-of inside an all-of is one all-of). The bound is the
same one every step condition meets.

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
  to change. Enabling re-asks the same question, so a trigger whose type was retired in the
  meantime is refused rather than enabled and quietly ignored.
- **Every declared input slot the two reserved slots do not cover must have a value** — present,
  and not blank (`""`, `null` or `[]`; 422 `FLOW_INPUT_BLANK`, one issue per slot). A trigger stored
  with a blank before this rule still fires; the next write that sends its inputs (or moves its
  flow) must fill it.
- **A filter nested deeper than 16 levels**, or one that is not a condition at all, is a 422 on
  `filter`.
- **`sourceId` and `newSource` together** — a trigger listens to one source.
- **Updating, enabling and disabling all require the version you last read.**
- **A replay of an event this trigger never decided** is a 422. The ledger row is what you are
  re-running; there is no backfill through the back door. A replay is also refused while the
  trigger is **disabled** (disable means stop, and a replay is a fire), when the event no longer
  matches the trigger's **current selector**, and when that selector no longer resolves to an
  active, durable, non-run type — the same question enable asks.
- **Deleting a flow a trigger binds** is refused, counting the triggers it would strand, by the
  same guard that protects a flow a schedule binds.

### Ask before you write: `validateOnly`

Send `validateOnly: true` on the create or the patch and the platform answers a **verdict** at 200
instead of writing: whether the write would be taken (`ok`), what it found (`diagnostics`) and
whether every rule ran (`complete`). Read `severity`, never `code`: `error` will not save,
`warning` blocks nothing, and `info` notes something the platform left alone.

⛔ **A key already taken used to be reachable only by attempting the write** — a caught database
violation, with no way to ask first. It is decided before anything is written now, and both paths
meet the same answer. The selector and binding rules above were already decided before the write
and are unchanged; what moved is that you can now hear all of them without making one.

⚠️ **A stale `version` is NOT reported here.** The optimistic lock is about when the write lands,
not about whether your draft is coherent — the save answers 409 for it and the verdict says nothing,
because `ok` answers only the second question.

⚠️ **There is no `derived`.** A trigger's stored row is the body you sent — the platform resolves
no slot, binds no stage and mints no key of its own — so there is nothing to report back that you
did not already have.

## What the platform guarantees

- **Exactly one decision per event per trigger.** The ledger row is inserted before the fire, under
  a unique key on the trigger, the event and the attempt number, so a redelivered dispatch cannot
  fire twice.
- **Nothing is lost between the emit and the run.** The row is written before the bus publish; the
  dispatch job retries three times with backoff, and if it is lost or exhausted a per-minute sweep
  re-enqueues every event still undispatched. An event is stamped dispatched only once every
  matching trigger has its ledger row — a trigger that could not be decided keeps the event
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
  recent fire still `PENDING` or `PROCESSING` holds the next event back, not only the newest.
- **The payload cap applies to every emit**, not only to what the log stores: an `event.emit`
  whose payload exceeds 256 KiB fails the step, whatever the type's scope or durability.

## Reading what happened

`GET /v1/triggers/{id}/runs` is the debugging surface. Each row carries the `eventId`, the
`attempt` (0 live, higher on replays), the `outcome`, a plain-words `reason` for anything that did
not fire, and — for a fire — the invocation with its live `status` and, on a step failure, a
`failure` naming the skill and phase. `replayOf` points a replayed row at the decision it re-ran.

The log itself, `GET /v1/project-events`, is where you find an `eventId` to replay. Its `source`
column says who wrote the row: `run` for a flow's own emission, or the provider for a source's —
`telegram` today, the other three once they have writers. `schedule` is reserved for the emit
action on the roadmap and has no writer yet. Both tables are kept for **30 days**.

## Testing a flow against a real event

`GET /v1/triggers/{id}/sample` returns the newest logged event the trigger's selector and filter
would accept, shaped exactly as the `event` slot receives it — or `null`, said plainly, when none
of the newest 500 events of the type qualifies. Hand it to `POST /v1/flows/{id}/preview` as the
`event` input, with a hand-written `trigger` object, and the preview runs the flow as a fire would.
