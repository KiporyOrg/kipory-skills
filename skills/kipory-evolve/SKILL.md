---
name: kipory-evolve
description: Change a Kipory project that is already live — rename or re-shape a record type that holds records, remove a flow, facet, term or relation kind something else depends on, rehearse a many-row change as one planned document, and roll an edit back when it goes wrong. Use whenever the project is not empty: before any delete, before changing a type's shape or its `uses` (what it indexes for search), when a delete is refused and the message names dependents, when an edit has to be undone, or when a change has to be rehearsed before it is committed.
license: MIT
---

# Change a project that is already live

Authoring into an empty project and changing a live one are different disciplines. In an empty
project every write is a create and nothing can break. In a live one, records already exist, flows
already reference each other, endpoints already serve clients, and a configuration digest is
already cached by everything that read it.

**The fact most people get wrong: the platform rehearses almost every dangerous change for you, and
each rehearsal has a different name.** There is no single dry-run flag. There are more than a dozen
routes with as many names, and an agent that does not know they exist discovers a cascade by causing it. There is
one rehearsal that covers a whole change at once — a planned **document** — and it is the one to
reach for when the change touches more than a handful of rows.

## Before the first call

- **Read the current state and keep the digest.** `GET /v1/bootstrap` returns every section plus a
  `structureVersion`. Every change here moves it; that is how a client knows its cached copy is
  stale.
- **Know whether the thing you are changing has data.** A record type carries `hasRecords` and
  `recordCount` on its own read, `GET /v1/record-types/{id}` — not on the bootstrap's record-type
  rows, which omit both. They are the difference between an edit and a migration.
  `GET /v1/projects/{nodeId}/usage` is not this read — it answers what the project SPENT, not what
  it holds.
- **Concurrency control is per-resource, and you have to know which kind you are facing.** Record
  types, facets and their neighbours require the `version` you last read on a patch and refuse a
  stale one. A step in a flow is optimistic-locked the same way and answers **409**
  with one of three kinds — `stale-version`, `concurrent-consumer-write` or `unique-collision`. The
  first two are re-read-and-retry, or resubmit with `overwriteConcurrentEdit`, which skips the
  pre-check **and nothing else**: it never clears a `unique-collision`, and it never relaxes
  validation. Read the resource's own contract before assuming either shape.

  <!-- field-ok: version — the optimistic-concurrency token, named on several design resources -->

## Rehearse first

| Route                                                     | Answers                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/bootstrap?project={nodeId}`                      | what the project holds, before you touch any of it — then `GET /v1/record-types/{id}` for each type's `hasRecords` / `recordCount`                                  |
| `GET /v1/projects/{nodeId}/connections`                   | what starts each element, what it writes, reads, tags, calls and announces, and what points at it — computed from the configuration, so current after every write   |
| `DELETE /v1/projects/{nodeId}` + `validateOnly`           | what retiring the whole project would take with it                                                                                                                  |
| `DELETE /v1/facets/{id}` + `validateOnly`                 | whether a facet delete would be allowed, and what it reaches                                                                                                        |
| `DELETE /v1/record-types/{id}` + `validateOnly`           | whether a record-type delete would be allowed, and `derived.dependents`: the records that refuse it, the relation kinds and joins it would change                   |
| `DELETE /v1/relation-kinds/{id}` + `validateOnly`         | the edges the delete would take, as `edges-deleted` under `consequences`                                                                                            |
| `PATCH /v1/relation-kinds/{id}` + `validateOnly`          | whether a link edit would stand — the link rules over every declaration of the kind                                                                                 |
| `DELETE /v1/relation-kind-pairings/{id}` + `validateOnly` | whether removing one pair would be refused — live links on it, the kind's last pair, a declaration it would break                                                   |
| `DELETE /v1/flows/{id}` + `validateOnly`                  | whether a flow delete would be refused, and `derived.dependents`: everything that holds the flow — endpoints, schedules, triggers, record types, resolvers, callers |
| `DELETE /v1/api-endpoints/{id}` + `validateOnly`          | the verdict on removing an endpoint — nothing refuses it, and its path stops answering at once                                                                      |
| `DELETE /v1/schedules/{id}` + `validateOnly`              | the verdict on removing a schedule and its run history — to stop it but keep it, disable it                                                                         |
| `PATCH /v1/schema-entries/{id}` + `validateOnly`          | what a shape edit would do: the verdict, `records-invalid` under `consequences`, and what it would break under `leavesBehind`                                       |
| `PATCH /v1/record-types/{id}` + `validateOnly`            | what a `uses`, shape (`dataEntryId`, own `definition`), binding or key change derives to — `derived.contract`, `derived.naturalKey`, reindex, restamp               |
| `PATCH /v1/steps/{id}` + `validateOnly`                   | a slot rename's `derived.rename`, the patched config's `derived.draft`, and — with `enabled: false` — `derived.switchOff`: the steps that would stop with it        |
| `POST /v1/steps` + `validateOnly`                         | whether an unsaved step is valid — it executes nothing                                                                                                              |
| `GET /v1/flows/{id}/health`                               | whether the flow is whole after the edit                                                                                                                            |
| `POST /v1/flow-checkpoints/{id}/restore` + `validateOnly` | what restoring would change back — the restore rehearsed: its own refusals, and `derived.restore` with both step lists and the signature changes                    |
| `GET /v1/eval-suites/{id}/readiness`                      | whether the suite can still judge the thing you changed                                                                                                             |
| `POST /v1/projects/{nodeId}/document/plan`                | everything a whole document would create, change and remove — with every refusal, every cascade, and what it does to stored records — without writing               |

⚠️ **`POST /v1/flows/{id}/preview` is not one of these.** It runs the flow for real and **applies
its writes** unless you pass `apply: false`, it bills the payer, and it needs ADMIN. It is a test
run, not a rehearsal. `kipory-build` covers it.

## Change many things at once: the document

Export the project (`GET /v1/projects/{nodeId}/document`), edit the file, plan it (the body is the
document itself), apply it as `{ version, document }` with the version the export or the plan
answered — the project's current one. The plan is the apply rolled back, so it answers the same refusals a
row-by-row change would meet, in one read, and three things a row write never tells you:

- **`consequences`** — how many stored records the change re-stamps or re-indexes, and
  `records-invalid`: the records that would no longer fit a shape you changed, found by reach
  (a shape another shape references is checked through every type that reaches it). A
  consequence is never a refusal; the platform tells you and lets you. Deleting a relation kind
  deletes every stored edge of that kind, and the plan counts them as `edges-deleted` on the
  kind's path — save them first (`GET /v1/relations?project=<node>&link=<kind>`) if they matter.
- **Cascades before the fact.** A removal that takes other rows along — the relation kinds that
  pair a deleted record type, the terms of a deleted facet — is in `changes` as a
  `delete` with `because: "cascade"` and a `DOCUMENT_DELETE_CASCADED` warning. Read the plan's
  delete list before applying; it is the true list, not only yours. A record-type delete also names
  its reach on its own path — the relation kinds and joins it would take — even when the plan
  refuses the delete.
- **Nothing partial.** A refused apply answers `422` with the plan and has written nothing — not
  the rows before the refused one either. A document that changes nothing answers `applied: true`
  and moves no version.

A cascade is reported whether or not your document names the row: delete a record type inside a
full export that still states the relation kind pairing it, and that kind is in `changes` on its
own path as a `delete` with `because: "cascade"`, not as `unchanged`. A delete row holds `delete`
and optionally `id`, nothing else — turning an exported row into a delete by adding `delete: true`
is refused `DOCUMENT_DELETE_WITH_FIELDS` on that row, and the plan stops at that finding with
nothing else judged, so replace the whole row. A plan's `changes` are not the apply's
write order, and the ids a plan shows for creates are from its rolled-back attempt; the apply mints
its own. A flow row whose only change is its `outputBinding` has been reported `unchanged` beside an
`update` on its step row, while the apply did change the binding — read the apply's returned
`document`, not the row kind, to confirm a binding moved.

Removal is explicit (`delete: true`, or `prune: true` on a map) and needs ADMIN; absence never
deletes. The record-type pins still hold inside a document: a type with records, or one a step's
configuration names, refuses a rename (a change of its `key`),
a re-pointed shape and an ownership change exactly as its own PATCH does, and the finding lands
on the row's path in your document. `kipory-build` has the loop; the pack it points to has the
rest.

## The order of operations

Work outside-in when adding, inside-out when removing.

**Adding** — the dependency has to exist before the thing that names it: schema entry → flow →
record type (it names its processing flow in `flowId`) → endpoint → schedule. Anything else is a
save refused for naming something absent — or bind the type's flow later with a PATCH.

**Removing** — reverse it. A flow delete is refused (`409 FLOW_HAS_DEPENDENTS`) while anything
names it: an endpoint, a schedule — **disabled ones too; delete it or re-point it with
`PATCH /v1/schedules/{id} { flowId, version }`** — a trigger, a record type bound to it (`flowId`), a facet
resolver, or another flow's `flow.invoke`. So: unbind the record type (`flowId: null`) or delete it,
delete the endpoints and triggers, delete or re-point the schedules, re-point resolvers and
invoking flows, then delete the flow.
Delete the leaf, then what it hung from.

**Changing a shape under live records** is neither. Where the shape is edited depends on who owns
it:

- **A shape the type owns** — stated inline when the type was made, as a document's
  `records.<key>.shape` does — is edited on the type: `PATCH /v1/record-types/{id}` with
  `definition`, or the same inline `shape` in a document. `PATCH /v1/schema-entries/{id}` refuses it
  `SCHEMA_ENTRY_OWNED`.
- **A shared schema entry** — one the type points at with `dataEntryId` — is edited on
  `PATCH /v1/schema-entries/{id}`, or under `schema` in a document. The record-type PATCH refuses a
  `definition` for it `RECORD_TYPE_SHAPE_SHARED`.

While a flow that reads the shape is frozen into a published contract — an endpoint in front of it,
or a record type whose processing flow (`flowId`) it is — the edit answers `409
SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`, its message naming those holders (`details` only counts
them by kind), unless it carries `adoptSnapshots: true`. The schema-entry PATCH and a document take
that flag; **the record-type PATCH does not** — it is an unrecognised key there, whatever the 409's
message says. So an owned shape behind an endpoint or a processing flow is edited, and rehearsed,
through a document, with the flag inside the inline shape:
`"records": { "contact": { "shape": { "definition": { … }, "adoptSnapshots": true } } }`.
Schedules and triggers freeze nothing, so the 409 neither names nor waits for them. The
edit's `validateOnly` rehearsal judges their stored `inputs` against the new shape (see step 3): a
value its slot's type now refuses is `SCHEDULE_INPUT_MISTYPED` / `TRIGGER_INPUT_MISTYPED` in
`leavesBehind`. The PATCH itself does not refuse on them; a schedule or trigger write that sends
such a value is refused with the same code. Removing a field is refused once
the type has records. It is three steps, in this order:

1. **Rehearse.** The record-type PATCH with `validateOnly: true` and the drafted `definition` (a
   shape the type owns) or the proposed `dataEntryId` answers `derived.contract`, the vocabulary it
   would give the type; for a shared entry, the schema-entry PATCH with `validateOnly: true` (and
   `adoptSnapshots: true`) for whether the edit is allowed and what it does to stored data — it
   rehearses the edit and answers `records-invalid` under `consequences`, and the flows, schedules
   and triggers it would break under `leavesBehind`, as a document plan does. For an owned shape
   behind a published contract the document plan is that rehearsal.
2. **Widen, never narrow, in the first write.** Add the new field as optional. Existing records stay
   valid, and nothing has to be backfilled before the change lands.
3. **Backfill, patch the fixed inputs, then narrow.** Populate the field on existing records
   (`references/change-order.md` has the loop), add it to the `inputs` of every schedule and
   trigger that feeds the shape, and only then make it required. The narrowing write's rehearsal
   (or plan) names each one still left unable to fire (`SCHEDULE_INPUT_MISTYPED` /
   `TRIGGER_INPUT_MISTYPED`) and answers `ok: false` while any remains.

Narrowing first is what turns a change into an outage: every record that lacks the field becomes
invalid at once, and there is no partial state to recover from.

## What refuses, and what cascades instead

Some destructive changes are refused outright:

- **A record type with records cannot be deleted.** The refusal names the count. Delete the records
  first, or leave the type alone. The rule is `RECORD_TYPE_PINNED_BY_RECORDS` everywhere: the
  finding's `code` on the `validateOnly` verdict and in a plan, and `details.reason` on the real
  409 (whose `code` stays `CONFLICT`). Any refusal that names a rule does the same.
- **Reserved and seeded record types cannot be deleted**, whatever they hold.
- **A flow something still references cannot be deleted** — the refusal counts what references it, by kind (`details` on the 409, `derived.dependents.kinds` on the dry run), without naming the rows; `GET /v1/projects/{nodeId}/connections` names them.
- **A step whose output later steps read cannot be deleted** — the refusal counts the dependents and
  names the slots they read.
- **A seeded vocabulary is repaired, not rewritten.** A term's key never changes. Two terms that mean the same: merge the one you do not want into the other (below) — its records move and it stays as an alias, so the old word still resolves. A term that should not exist: archive it, and nothing new is assigned to it. Candidates a supervised facet coined are the same rows with `status: candidate`: admit one with `status: active`, merge its twins into it, archive the rest. A merge has no undo.
- **A term assigned to records cannot be deleted** (`TERM_DELETE_HAS_ASSIGNMENTS`) — archive it
  instead (`PATCH /v1/terms/{id}` with `status: archived` and the term's `version`). Nor can a term that is the parent of
  others or the canonical of aliases. `POST /v1/terms/{id}/merge` is the way to retire a term
  records carry: it moves every assignment onto the target in the same write and leaves the source
  an alias (`aliasOfId`) carrying none, which a delete then accepts. It refuses a merge into the term itself, a target in another facet, an
  archived target, a target that is already an alias, a source that other terms alias, and a
  source and target under different parents.
- **A facet delete needs `confirm=true`**, and `assignedTerms=delete|archive` once any of its
  terms is assigned; without them it is a 409. Ask it with `validateOnly=true` first.
- **Built-in event types cannot be deleted**, and a document never writes one: a type in a source provider's namespace (`telegram/…`) plans as `derived`.
- **A relation kind cannot be left with no pairings**, so the last one cannot be deleted.

Others do not refuse. They cascade, and the response tells you what else moved:

- **Deleting a record type** reports `deletedRelationKinds` — links that applied only to that pair —
  and `invalidatedJoins`, the other types whose join declarations this voided. You asked to remove
  one thing and something else changed.
- **Changing what a type indexes for search** — the `search` uses in its `uses`, from which
  `searchable` is derived — queues a reindex, and when what the search indexes moved, a re-embed
  of every stored record, which bills. A plan's `consequences` tell the two apart: `reindex`
  (may redo nothing, or rewrite payloads only) versus `reembed`.
- **Saving the facet list queues a rewrite of every existing record of the type.**
- **A slot rename cascades only when you confirm it — and never into the flow's outputs.**
  `PATCH /v1/steps/{id}` with `confirmedOutputSlotRenames: [{ flowId, oldSlotName, newSlotName }]`
  rewrites every sibling step that reads the old name, in the same transaction; without it the
  readers are left dangling. The flow's `outputBinding` is NOT rewritten and `derived.rename` does
  not list it: the save lands with `OUTPUT_BINDING_DANGLING_SLOT` as an error in its
  `outstandingIssues`. The `validateOnly` rehearsal says so beforehand by answering `ok: false`: an
  error the edit introduces — this one, or `INPUT_STREAM_DANGLING_SLOT` for a reader left on the old
  name — is in `diagnostics` and in `leavesBehind` with `introduced: true`. That verdict is the
  expected one when the binding is re-pointed in a following write. The endpoint in front then refuses every call:
  a required output left unproduced answers `422 FLOW_OUTPUT_MISSING`, and the run's writes are
  discarded. Health names the dangling binding before any call does. On a
  live endpoint, do the rename as **one document apply** that carries the step's new
  `outputSlot`, every reader rewritten to the new name and the flow's re-pointed `outputBinding`:
  one transaction, no window where the endpoint is refused. A document does not cascade a rename —
  it writes each step as stated — so take the readers from the step PATCH's `validateOnly`
  `derived.rename` and restate each one (its prompt, config or `inputStreams`). Row by row it is two writes — the confirmed skill PATCH, then
  `PATCH /v1/flows/{id}` with the new `fromSlot` — then health. A record type is different: once
  it has records, a rename is refused outright.

The pattern is worth internalising: a refusal protects you, a cascade informs you, and the second
one is the one that costs money while you are not looking.

## Rolling back

**Flows have checkpoints; nothing else does.** Take one before a risky edit — `POST /v1/flow-checkpoints`
with the flow and a `label` — and restore through `POST /v1/flow-checkpoints/{id}/restore` after
asking it the same with `validateOnly: true` (both take the flow's `version`). A restore keeps each step's id by key (a
step deleted since comes back with a new one) and moves a changed step's version forward, so re-read the steps
before your next step edit. A capture or a restore also makes each eval suite's next run on that flow
incomparable with the one before (`delta.suppressedReason`): run the suite once after the capture,
before the edit, so the edit has a baseline (`kipory-prove`). `kipory-build` owns the detail. A flow's checkpoints are deleted with
the flow, so a deleted flow comes back only from an export.

**An export is the nearest thing to a checkpoint of the whole configuration.** Keep the document
you exported before a change. Planning it and applying it — with the project's CURRENT `version`
(export again, or take it from the plan), not the old export's, which answers `409` — puts its rows back — a row deleted
since returns as a new row with a new id, and a row added since stays unless the document says
`prune` — under the same refusals as any other apply. It covers configuration only: no records,
no vectors, no secret values. A deleted record type's inline shape outlives it as a shared schema
entry, and the rollback's inline shape takes that entry back by the `id` it carries, so the type
returns owning the same shape — keep the `id` on the inline shape. A schedule's or trigger's `enabled` travels: one the rollback re-creates comes back in the
state the export recorded. What it does not restore as you left them:

- **A field added since the export cannot be rolled back off a type with records.** Re-applying the
  older shape removes the field, and a shape edit that removes a declared field from a type
  holding any record — whether or not a record holds that field — is refused
  `SCHEMA_ENTRY_UNSAFE_FOR_RECORD_TYPE`, skipping the rows that depend on it. Keep the new field in
  the rollback document's shape.
- **Edges are data, not configuration.** A relation kind the change deleted comes back EMPTY:
  every edge asserted by hand (`POST /v1/records/{id}/relations/{kind}`) is gone for good, and only
  re-asserting it restores it. Save them (`GET /v1/relations?project=<node>&link=<kind>`)
  before any change that deletes a kind, and count the edges again after the rollback.

For everything else, the undo is a forward change you author yourself, and some things have no undo
at all:

- **Deleted records are gone.** No checkpoint covers the records plane.
- **Re-embedding cannot be un-run.** It can only be run again, and it is billed each time.
- **A secret's old value is unrecoverable** — nothing reads one back (`kipory-secrets`).
- **A term merge cannot be taken back through the API** — the alias it sets stays.

## What will bite you

- **Ask the PATCH's dry run about the edit, not the stored type.** `expand=contract` answers for
  what is stored; an agent holding an edited-but-unsaved shape must send it — the drafted
  `definition`, or the proposed `dataEntryId`/`flowId`, with `validateOnly: true` — or it derives
  declarations against a vocabulary it is about to replace. Send the `uses` the save would send
  too: the dry run re-derives them against the proposed contract.
- **A refused delete is the good outcome.** The dangerous ones are the changes that succeed and
  quietly invalidate something — a join declaration, a cached digest, an endpoint whose flow no
  longer returns the shape it promised.
- **A stale token is refused, not merged.** Re-read and re-apply rather than retrying the same body,
  and reach for `overwriteConcurrentEdit` only when you actually mean to discard whatever the other
  writer did — it is an override, not a retry.
- **`structureVersion` moves on every one of these**, so every client caching against it must
  re-read. If you built something that caches configuration, this is the signal it was waiting for.
- **A flow's signature is frozen by what publishes it.** Changing its input or output slots (a
  rename, a new required input, a type) while an endpoint — or a record type processing through it
  — holds a snapshot answers `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` (under `validateOnly`, an
  `ok: false` verdict with that code).
  `PATCH /v1/flows/{id}` with `adoptSnapshots: true` lands it and re-publishes those contracts in
  the same transaction: every client of that endpoint sees the new response keys at once. Treat it
  as an API change to the product's callers, not an internal edit (`kipory-expose`). A change to
  `outputBinding` alone is not a signature change.
- **Never send `validateOnly` to a delete whose route reference does not list it.** The current
  platform refuses the flag on such a delete — query or body — with a `422`; an older deployment
  ignored a body flag and deleted. A delete route either names its rehearsal or has none.
- **A flow PATCH carries the flow's `version`.** `PATCH /v1/flows/{id}` without it is a `422`, and
  a stale one a `409 VERSION_CONFLICT` — a checkpoint restore and a document apply move it too (a
  restore names the flow's new `version` in its `touched`), so re-read the flow after either. A signature PATCH may state one side alone; the other is kept.
- **A `502` from a sync endpoint wrote nothing; a `200` with an empty output did.** A failed step
  discards every write the run staged, so a retry on a 5xx does not write twice (it is charged
  again). A `200` applied its writes even when its output came back empty (see the slot rename
  above), and a client that retries it writes twice unless the write is idempotent — send an
  `Idempotency-Key`, or give the type a natural key.
- **An `entity.create` pointed at the wrong type is caught only when a declared field misfits.**
  Switching its `recordType` saves. Health and a document plan warn `ENTITY_CREATE_DATA_MISMATCH`,
  and the run fails the step naming each field — the check `POST /v1/records` makes — when the
  incoming slot lacks a field the type requires or carries one under a different type. Fields the
  type's shape does not declare are not a misfit unless the shape sets
  `"additionalProperties": false`: the warning stays silent, the step does not fail, and the run
  writes a record of the wrong type. Close the shape if that matters, and preview with `apply: false` after
  such an edit, reading the `recordType` it reports.
- **A schedule PATCH's dry run does not check `version`.** `validateOnly: true` answers `ok: true`
  on a stale one, and the same body sent for real answers `409 VERSION_CONFLICT`. Re-read the
  schedule's `version` after a document apply or any other write that touched it.
- **Eval suites pin the old behaviour.** After a deliberate change their contracts will break, and
  that failure is correct. Re-baseline them on purpose (`kipory-prove`) rather than deleting the ones
  that went red — a suite deleted because it was inconvenient is the one that would have caught the
  next change.
- **Deleting a project is rehearsable and then final.** Ask `DELETE /v1/projects/{nodeId}?validateOnly=true`
  first; a retire can be restored until `purgeAfter`, but there is no checkpoint for it.

## References

| File                         | What it answers                                                      |
| ---------------------------- | -------------------------------------------------------------------- |
| `references/change-order.md` | a change request → the order to work in, the rehearsal, what refuses |

## Then

`kipory-model` for the record type, facet, term or relation kind itself, and for what each delete
reports. `kipory-build` for checkpoints, flow health and the step-level dependents report.
`kipory-expose` when the change reaches an endpoint's contract. `kipory-prove` to re-baseline what a
deliberate change made red. `kipory-data` for the backfill, and for deleting records before a type
can go. `kipory-diagnose` when the change landed and something downstream started answering wrongly.
