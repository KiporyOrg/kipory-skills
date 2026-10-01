<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Events

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> the `event.emit` handler config → live `GET /v1/handlers`. This pack carries judgment.

## What it is

A per-project registry of signals a flow can raise, so other parts of the system can react.

One resource: the **event type** — one specific event, addressed `categoryKey/key`. The
`categoryKey` is the **namespace** it lives in: the first half of its address, the channel segment
it is published on, and the group it is shown under. A namespace is not a row you create — it
exists while one event type carries it. Each type has a default scope, an optional payload shape,
whether it is kept in the event log (`durable`), and a lifecycle status.

A flow raises one with an `event.emit` node. Consumers either watch the run's live stream or
subscribe on the bus, depending on scope.

## When you need it — and when you don't

- **Against a flow's output.** A flow's declared output is the _answer_ a caller waits for. An
  event is an out-of-band signal, during or after the run. Use events for progress and fan-out —
  never to return the primary result. A caller who has to reassemble the answer from events is a
  caller you have made a mess for.
- **Against a schedule.** Emit an event when the trigger is _something happening_. Use a
  schedule (capability pack `schedules` — `GET /v1/capability-packs/schedules`) when the trigger is the clock.
- **To run another flow.** An event is the decoupled way: the emitting flow raises it and a
  trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`) runs the reacting flow, with neither naming the other. That needs the type
  to be **durable** and not `run`-scoped, because a trigger reads the project's event log rather
  than the bus — and **`active`**: a draft, deprecated or retired type is refused too. Every event
  type you read carries `listenable`, the platform's answer to all three at once and the same test
  a trigger write applies, so offer what it says rather than re-deriving the rule from `durable`,
  scope and status. A `flow.invoke` step is the coupled way, and the right one when the second flow
  is really a step of the first.

### Scope decides the transport, so choose it by who needs to hear it

- **`run`** rides the live stream of the run that raised it. This is progress UX: it exists while
  someone is watching and is gone afterwards. ⭐ It is also the **only** scope that is live _during_
  the run.
- **`record`, `user`, `project`** go to the bus, and are consumed by a subscription action on an
  endpoint. ⚠️ These are **transactional**: staged with the run's other effects and published only
  once it commits — so they arrive after the run, and a run that fails publishes none of them.

Pick by who needs to hear it and when. A progress marker nobody is streaming is wasted; a fact
other flows must react to is useless on a connection that already closed.

## The sequence

```
POST /v1/event-types        create the event, in its namespace — nothing to create first
  … then add an event.emit node to a flow …
```

A type takes `project`, its namespace `categoryKey`, its own `key`, a `label`, a default scope of
`run`, `record`, `user` or `project`, optionally a payload shape — omit it and the event is a
payload-less marker — and `durable` (omit it for `false`: published live and not kept). Both keys
are lower-case kebab (`order-placed`), because each becomes a segment of the event's
`category/event` address on the bus; both are permanent. A `categoryKey` no type uses yet simply
opens that namespace. List a project's types with `GET /v1/event-types?project=<nodeId>`, one
namespace's with `&categoryKey=`.

## Raising one from a flow

The `event.emit` node names the namespace (`category`) and the event, both static registry keys, plus optionally
the one slot whose value becomes the payload.

Four things to get right:

- **Scope is not in the node config.** It comes from the event _type_. You choose scope when you
  author the type, once, rather than at every emit site — so it cannot disagree with itself.
- **The payload must match the type, in both directions.** A payload-less type refuses an emit
  that carries one; a type with a payload shape rejects an emit whose payload does not validate
  against it — which usually means a missing payload, though a shape whose fields are all optional
  will accept an emit with none. The payload is
  validated against that shape before anything is transported, on every path.
- **The emit is never served from a cache, and that is not yours to get wrong.** Caching is a
  property each handler declares, not a setting on your node, and `event.emit` does not opt in — a
  cache hit would swallow the side effect silently. There is no flag here for you to set either
  way; if you went looking for one, that is why you did not find it.
- **The scope key is derived by the server**, from the run, record, user or project as
  appropriate. It is never taken from config, so an emit cannot address someone else's scope.

An unknown category or event at emit time **fails closed**, with `EVENT_TYPE_UNKNOWN`. A scope
with no transport wired warns and drops — it never silently reroutes somewhere it might be seen.

⛔ **There is an EARLIER warn-and-drop, and it is the one a schedule hits.** The scope key is derived
by the server, and it is `null` when the identity the scope needs is simply not there: a `user`
scope in a run with no acting user, or a `record` scope in a run with no record. A **scheduled** run
fires as the project with nobody behind it, so a `user`-scoped emit inside a scheduled flow drops
every time, with only a log line. Emit at `project` or `run` scope from a scheduled flow, or carry
the user you mean as data.

## What the platform refuses

- **Reserved namespaces**, as a security fence: the fence covers every channel prefix the
  platform builds by hand — around ten of them, spanning sessions and revocation, projects and
  records, bootstrap, activity and the run-step stream. Do not work from a list; the 422 names
  the key it rejected. This is what stops an authored key forging a control-plane channel.
- **A source provider's namespace is its source's alone.** `telegram` (and each provider's own
  namespace) is where that provider's source (capability pack `sources` — `GET /v1/capability-packs/sources`) writes its events; an event type you
  create there is refused with **409**. Add the source and it creates its types itself.
- **Keys must be kebab-case**, for both the namespace and the event.
- **Identity is immutable.** A type's namespace and key cannot be changed after creation — they
  _are_ the identity. Only the attributes around them can move.
- **Seeded types cannot be deleted.**
- **A run-scoped type cannot be durable** — a run event rides the run's own stream and is never
  logged; `durable: true` on one is a 422.
- **The version on update is REQUIRED.** It used to be optional, and omitting it meant
  last-writer-wins: two people editing one type through the same screen both read "saved" and one
  of the edits was gone.
  <br>⚠️ **"Required" applies where the write ACCEPTS one.** Request bodies are closed, so a
  `version` sent to a write that takes none is a **422**, not a courtesy — an unknown key is
  refused rather than dropped. Read the body's own fields, not the row's.
- ⭐ **Every write answers a dry run.** `POST` and `PATCH` of a type take `validateOnly: true`, and
  its `DELETE` takes `?validateOnly=true`: each runs the write's own rules, writes nothing, and
  answers **200** with a verdict `{ok, diagnostics, complete}` — a taken key, a reserved or
  provider-owned namespace, a durable run-scoped type, a payload shape the project does not hold,
  a seeded row's delete each come back as a finding. It cannot see a stale `version` (the write's
  lock).

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
facet's (which also carries `confirm` and `assignedTerms`); anything else in the query is refused.

## What will bite you

- ⛔ **A durable event is delivered AT LEAST ONCE, so make every trigger's flow idempotent.** A
  durable emission is written to the project's event log before it is published, and a
  trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`) runs from that log; a lost dispatch is re-enqueued by a periodic sweep, so a
  duplicate is the **designed** outcome rather than a fault. The bus itself is at-most-once to
  whoever is connected: a streaming subscriber that was not listening misses the event.
- ⚠️ **A bus event from a run that FAILS is never published at all.** Because the emit is
  transactional, the change set is discarded on failure and the event goes with it. So a bus event
  is not a progress signal for a run in flight: only `scope: "run"` is live during execution. The
  per-type `durable` flag is read on that path — a durable emission is written to the project's
  event log before the publish, and that row is what a trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`) consumes. It changes
  nothing for a streaming subscriber: the bus is still at-most-once to whoever is connected.
- ⚠️ **A preview or an eval run never publishes a bus event.** Its `event.emit` resolves
  and the payload is checked, then the event is dropped: no event-log row, no publish, no trigger.
  So a preview or an eval case cannot prove the emit → trigger half of a chain; the trigger → flow
  half previews with the event from `GET /v1/triggers/{id}/sample` (triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`)). A
  withheld event does not appear in a dry run's change set either.
- **The payload version moves on its own.** It increments both when you re-point a type at a
  different shape _and_ when someone edits that shape in place — which bumps every type bound to
  it. It is not the optimistic-lock version, and it counts per event type, so two types sharing a
  shape can sit at different versions.
- ⚠️ **A type's lifecycle status does not gate emitting.** A `retired` type emits exactly like an
  active one — the status is management metadata, read by the operator surface and dropped before
  the emit path sees it. Retiring a type is how you say "stop authoring against this"; it is not
  how you stop it firing. Remove the `event.emit` node for that.

## Related

- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — the subscription action that
  consumes bus-scoped events.
- Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`) — running a flow because a durable event was recorded.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — where the emit node lives.
- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — authoring a payload shape.
