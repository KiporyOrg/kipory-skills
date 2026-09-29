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
  stale one. A step in a flow is optimistic-locked on its own `capturedVersion` and answers **409**
  with one of three kinds — `stale-version`, `concurrent-consumer-write` or `unique-collision`. The
  first two are re-read-and-retry, or resubmit with `overwriteConcurrentEdit`, which skips the
  pre-check **and nothing else**: it never clears a `unique-collision`, and it never relaxes
  validation. Read the resource's own contract before assuming either shape.

  <!-- field-ok: version — the optimistic-concurrency token, named on several design resources -->

## Rehearse first

| Route                                            | Answers                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/bootstrap?project={nodeId}`             | what the project holds, before you touch any of it — then `GET /v1/record-types/{id}` for each type's `hasRecords` / `recordCount`                    |
| `GET /v1/projects/{nodeId}/deletion-preview`     | what deleting the whole project would take with it                                                                                                    |
| `DELETE /v1/facets/{id}` + `validateOnly`        | whether a facet delete would be allowed, and what it reaches                                                                                          |
| `DELETE /v1/record-types/{id}` + `validateOnly`  | whether a record-type delete would be allowed — the verdict only; a document plan lists what it would cascade into                                    |
| `GET /v1/flows/{id}?expand=dependents`           | everything that blocks a flow delete, with `deleteRefusal` — `DELETE /v1/flows/{id}` itself has NO rehearsal flag (below)                             |
| `GET /v1/record-types/{id}/contract-preview`     | the field vocabulary under a **proposed** shape entry (`dataEntryId`) and/or flow binding (`flowId`, or `none`)                                       |
| `POST /v1/record-types/{id}/contract-preview`    | the same under a **drafted** `definition` of the shape the type points at — EDITOR                                                                    |
| `PATCH /v1/schema-entries/{id}` + `validateOnly` | what a shape edit would do; a 409 (not a verdict) when it re-shapes a bound snapshot without `adoptSnapshots: true`                                   |
| `PATCH /v1/record-types/{id}` + `validateOnly`   | what a `uses`, binding or key change derives to — declarations, reindex, restamp                                                                      |
| `GET /v1/skills/rename-preview`                  | every step whose wiring a slot rename would rewrite                                                                                                   |
| `POST /v1/skills/validate-draft`                 | whether an unsaved step is valid — it executes nothing                                                                                                |
| `GET /v1/flows/{id}/health`                      | whether the flow is whole after the edit                                                                                                              |
| `GET /v1/flow-checkpoints/{id}/restore-preview`  | what restoring would change back                                                                                                                      |
| `GET /v1/eval-suites/{id}/readiness`             | whether the suite can still judge the thing you changed                                                                                               |
| `POST /v1/projects/{nodeId}/document/plan`       | everything a whole document would create, change and remove — with every refusal, every cascade, and what it does to stored records — without writing |

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
  kind's path — save them first (`GET /v1/projects/{nodeId}/relations?link=<kind>`) if they matter.
- **Cascades before the fact.** A removal that takes other rows along — the relation kinds that
  pair a deleted record type, the types of a deleted event category — is in `changes` as a
  `delete` with `because: "cascade"` and a `DOCUMENT_DELETE_CASCADED` warning. Read the plan's
  delete list before applying; it is the true list, not only yours.
- **Nothing partial.** A refused apply answers `422` with the plan and has written nothing — not
  the rows before the refused one either. A document that changes nothing answers `applied: true`
  and moves no version.

A cascade is reported whether or not your document names the row: delete a record type inside a
full export that still states the relation kind pairing it, and that kind is in `changes` on its
own path as a `delete` with `because: "cascade"`, not as `unchanged`. A delete row holds `delete`
and optionally `id`, nothing else — turning an exported row into a delete by adding `delete: true`
is refused `Unrecognized key(s)`, so replace the whole row. A plan's `changes` are not the apply's
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

**Changing a shape under live records** is neither. The shape is its schema entry, edited on
`PATCH /v1/schema-entries/{id}` — `PATCH /v1/record-types/{id}` carries no definition. While a flow
that reads the shape is frozen into a published contract — an endpoint in front of it, or a record
type whose processing flow (`flowId`) it is — that PATCH answers `409
SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`, naming those holders, unless it carries `adoptSnapshots:
true`. Schedules and triggers freeze nothing, so they are neither named nor checked: their stored
`inputs` are not re-validated against the new shape (see step 3) — and even a schedule write that
re-sends its `inputs` checks only that every input slot has a key and none is blank, never the
values against the shape, so its `validateOnly` answers `ok: true` over inputs that will fail. Removing a field is refused once
the type has records. It is three steps, in this order:

1. **Rehearse.** `POST /v1/record-types/{id}/contract-preview` with the drafted `definition` for
   the vocabulary it would give the type; the schema-entry PATCH with `validateOnly: true` (and
   `adoptSnapshots: true`) for whether the edit is allowed; and a document plan for what it does
   to stored data. ⚠️ Only the plan counts records: its `records-invalid` names how many would no
   longer fit, while the PATCH verdict answers `ok: true` over the same records.
2. **Widen, never narrow, in the first write.** Add the new field as optional. Existing records stay
   valid, and nothing has to be backfilled before the change lands.
3. **Backfill, then narrow.** Populate the field on existing records (`references/change-order.md`
   has the loop), and only then make it required. Then re-read every schedule and trigger whose
   flow reads the shape and add the field to their fixed `inputs` — nothing else will tell you, and
   the next fire fails.

Narrowing first is what turns a change into an outage: every record that lacks the field becomes
invalid at once, and there is no partial state to recover from.

## What refuses, and what cascades instead

Some destructive changes are refused outright:

- **A record type with records cannot be deleted.** The refusal names the count. Delete the records
  first, or leave the type alone. ⚠️ Its `code` is the generic `CONFLICT` on the `validateOnly`
  verdict, the plan and the real 409 alike; the rule name (`RECORD_TYPE_PINNED_BY_RECORDS: …`) heads
  the `message` of the real 409 only — the verdict and the plan say just `"<type>" has N existing
record(s)…`. Gate on the status (409, or a verdict with `ok: false`), not on the code or the
  message.
- **Reserved and seeded record types cannot be deleted**, whatever they hold.
- **A flow something still references cannot be deleted** — the refusal names what references it.
- **A step whose output later steps read cannot be deleted** — the refusal counts the dependents and
  names the slots they read.
- **A term assigned to records cannot be deleted** (`TERM_DELETE_HAS_ASSIGNMENTS`) — archive it
  instead (`PATCH /v1/terms/{id}` with `status: archived`). Nor can a term that is the parent of
  others or the canonical of aliases. `POST /v1/terms/{id}/merge` is not a way round it: it only
  sets the source's `aliasOfId` to the target, moves no assignment, and leaves the source as
  undeletable as it was. It refuses a merge into the term itself, a target in another facet, an
  archived target, a target that is already an alias, a source that other terms alias, and a
  source and target under different parents.
- **A facet delete needs `confirm=true`**, and `assignedTerms=delete|archive` once any of its
  terms is assigned; without them it is a 409. Ask it with `validateOnly=true` first.
- **Built-in event categories and types cannot be deleted.**
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
  `PATCH /v1/skills/{id}` with `confirmedOutputSlotRenames: [{ flowId, oldSlotName, newSlotName }]`
  rewrites every sibling step that reads the old name, in the same transaction; without it the
  readers are left dangling. The flow's `outputBinding` is NOT rewritten and `rename-preview` does
  not list it: the save lands with `OUTPUT_BINDING_DANGLING_SLOT` (a warning under `validateOnly`,
  an error in the write's `outstandingIssues`). The endpoint in front does **not** reliably fail: a
  required output left unproduced is filled with its type's empty value, so the caller gets
  `200 {"id": ""}` — and the run's writes still commit. Check health, never the status code. On a
  live endpoint, do the rename as **one document apply** that carries both the step's new
  `outputSlot` and the flow's re-pointed `outputBinding`: one transaction, no window where the
  endpoint answers empty. Row by row it is two writes — the confirmed skill PATCH, then
  `PATCH /v1/flows/{id}` with the new `fromSlot` — then health. A record type is different: once
  it has records, a rename is refused outright.

The pattern is worth internalising: a refusal protects you, a cascade informs you, and the second
one is the one that costs money while you are not looking.

## Rolling back

**Flows have checkpoints; nothing else does.** Take one before a risky edit — `POST /v1/flow-checkpoints`
with the flow and a name — and restore through `POST /v1/flow-checkpoints/{id}/restore` after
reading `GET /v1/flow-checkpoints/{id}/restore-preview`. A restore keeps each step's id by key (a
step deleted since comes back with a new one) and moves a changed step's version forward, so re-read the steps
before your next step edit. `kipory-build` owns the detail.

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
  re-asserting it restores it. Save them (`GET /v1/projects/{nodeId}/relations?link=<kind>`)
  before any change that deletes a kind, and count the edges again after the rollback.

For everything else, the undo is a forward change you author yourself, and some things have no undo
at all:

- **Deleted records are gone.** No checkpoint covers the records plane.
- **Re-embedding cannot be un-run.** It can only be run again, and it is billed each time.
- **A secret's old value is unrecoverable** — nothing reads one back (`kipory-secrets`).
- **A term merge cannot be taken back through the API** — the alias it sets stays.

## What will bite you

- **Ask `contract-preview` about the edit, not the stored type.** The plain GET answers for what
  is stored; an agent holding an edited-but-unsaved shape must send it — the drafted `definition`
  on the POST, or the proposed `dataEntryId`/`flowId` on the GET — or it derives declarations
  against a vocabulary it is about to replace.
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
  — holds a snapshot answers `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS`, even under `validateOnly`.
  `PATCH /v1/flows/{id}` with `adoptSnapshots: true` lands it and re-publishes those contracts in
  the same transaction: every client of that endpoint sees the new response keys at once. Treat it
  as an API change to the product's callers, not an internal edit (`kipory-expose`). A change to
  `outputBinding` alone is not a signature change.
- **Never send `validateOnly` to a delete whose route reference does not list it.** The current
  platform refuses the flag on such a delete — query or body — with a `422`; an older deployment
  ignored a body flag and deleted. A delete route either names its rehearsal or has none.
- **A flow signature PATCH carries both arrays.** `PATCH /v1/flows/{id}` with only
  `outputTypeNames` (or only `inputTypeNames`) is a `422` — send `inputTypeNames` and
  `outputTypeNames` together, the unchanged one as it stands.
- **A `502` from a sync endpoint does not mean nothing was written.** Its flow ran; an
  `entity.create` before the failure may have committed its record (and a 200 carrying an empty
  output is the same story, see the slot rename above). A client that retries on a 5xx
  writes twice unless the write is idempotent — send an `Idempotency-Key`, or give the type a
  natural key.
- **Health does not check what a write step writes against the type it names.** Switching an
  `entity.create` step's `recordType` to a type whose shape the incoming slot does not match saves
  and reads healthy; it fails when it runs. Preview it with `apply: false` after such an edit.
- **Evals and test cases pin the old behaviour.** After a deliberate change they will fail, and that
  failure is correct. Re-baseline them on purpose (`kipory-prove`) rather than deleting the ones
  that went red — a suite deleted because it was inconvenient is the one that would have caught the
  next change.
- **Deleting a project is previewable and then final.** Read `deletion-preview` first; there is no
  checkpoint for it.

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
