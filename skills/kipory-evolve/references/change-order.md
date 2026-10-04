# From a change request to a safe sequence

This file is the one home of each rehearsal route, each sequence, and what a refusal or a cascade
carries. `SKILL.md` gives the short form of each and how to roll back.

## Every rehearsal

There is no single dry-run flag; each write has its own. `validateOnly` goes in the query string on
a `DELETE` and in the body on a `PATCH` or `POST`.

| Route                                                                                                                                                                     | Answers                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/bootstrap?project={nodeId}`                                                                                                                                      | what the project holds, before you touch any of it — then `GET /v1/record-types/{id}` for each type's `hasRecords` / `recordCount`                                                              |
| `GET /v1/projects/{nodeId}/connections`                                                                                                                                   | what starts each element, what it writes, reads, tags, calls and announces, and what points at it — computed from the configuration, so current after every write                               |
| `DELETE /v1/projects/{nodeId}` + `validateOnly`                                                                                                                           | what retiring the whole project would take with it                                                                                                                                              |
| `DELETE /v1/facets/{id}` + `validateOnly`                                                                                                                                 | whether a facet delete would be allowed, and what it reaches                                                                                                                                    |
| `DELETE /v1/record-types/{id}` + `validateOnly`                                                                                                                           | whether a record-type delete would be allowed, and `derived.dependents`: the records that refuse it, the relation kinds and joins it would change                                               |
| `DELETE /v1/relation-kinds/{id}` + `validateOnly`                                                                                                                         | the edges the delete would take, as `edges-deleted` under `consequences`                                                                                                                        |
| `PATCH /v1/relation-kinds/{id}` + `validateOnly`                                                                                                                          | whether a link edit would stand — the link rules over every declaration of the kind                                                                                                             |
| `DELETE /v1/relation-kind-pairings/{id}` + `validateOnly`                                                                                                                 | whether removing one pair would be refused — live links on it, the kind's last pair, a declaration it would break                                                                               |
| `DELETE /v1/flows/{id}` + `validateOnly`                                                                                                                                  | whether a flow delete would be refused, and `derived.dependents`: everything that holds the flow — endpoints, schedules, triggers, record types, resolvers, callers                             |
| `DELETE /v1/api-endpoints/{id}` + `validateOnly`                                                                                                                          | the verdict on removing an endpoint — nothing refuses it, and its path stops answering at once                                                                                                  |
| `DELETE /v1/schedules/{id}` + `validateOnly`                                                                                                                              | the verdict on removing a schedule and its run history — to stop it but keep it, disable it                                                                                                     |
| `DELETE /v1/steps/{id}` + `validateOnly`                                                                                                                                  | whether later steps read its output — the dependents and the slots they read                                                                                                                    |
| `DELETE /v1/terms/{id}` + `validateOnly`                                                                                                                                  | whether assignments, children or aliases refuse it                                                                                                                                              |
| `DELETE /v1/triggers/{id}`, `/v1/schema-entries/{id}`, `/v1/eval-suites/{id}`, `/v1/event-types/{id}`, `/v1/embedding-profiles/{id}`, `/v1/sources/{id}` + `validateOnly` | the delete's own verdict                                                                                                                                                                        |
| `PATCH /v1/schema-entries/{id}` + `validateOnly`                                                                                                                          | what a shape edit would do: the verdict, `records-invalid` under `consequences`, and what it would break under `leavesBehind`                                                                   |
| `PATCH /v1/record-types/{id}` + `validateOnly`                                                                                                                            | what a `uses`, shape (`dataEntryId`, own `definition`), binding or key change derives to — `derived.contract`, `derived.naturalKey`, reindex, restamp                                           |
| `PATCH /v1/steps/{id}` + `validateOnly`                                                                                                                                   | a slot rename's `derived.rename`, the patched config's `derived.draft`, and — with `enabled: false` — `derived.switchOff`: the steps that would stop with it                                    |
| `PATCH /v1/flows/{id}` + `validateOnly`                                                                                                                                   | whether a signature or `outputBinding` change would be refused — `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` without `adoptSnapshots` — and what it would break around the flow, under `leavesBehind` |
| `POST /v1/steps` + `validateOnly`                                                                                                                                         | whether an unsaved step is valid — it executes nothing                                                                                                                                          |
| `GET /v1/flows/{id}/health`                                                                                                                                               | whether the flow is whole after the edit                                                                                                                                                        |
| `POST /v1/flow-checkpoints/{id}/restore` + `validateOnly`                                                                                                                 | what restoring would change back — the restore rehearsed: its own refusals, and `derived.restore` with both step lists and the signature changes                                                |
| `GET /v1/eval-suites/{id}/readiness`                                                                                                                                      | whether the suite can still judge the thing you changed                                                                                                                                         |
| `POST /v1/projects/{nodeId}/document/plan`                                                                                                                                | everything a whole document would create, change and remove — with every refusal, every cascade, and what it does to stored records — without writing                                           |

A `PATCH` or `POST` of any other design row — an endpoint, schedule, trigger, facet, term, source
or embedding profile — takes `validateOnly: true` in its body the same way; its reference lists
the flag.

Every delete of a design row takes `?validateOnly=true`, and its reference lists the flag. The
deletes with no dry run are of data, vault and settings rows: a record, a file, an edge, a secret,
a managed email address, a task-model binding or routing override, the app domain and the profile
schema.

## Start by classifying the change

| The request                                                | Class       | What it needs                                                                          |
| ---------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| add a field, a type, a flow, an endpoint                   | additive    | dependency order, nothing else                                                         |
| add a **required** field to a type with records            | narrowing   | widen → backfill → patch fixed inputs → narrow, four steps                             |
| change the steps of a flow that processes a type's records | re-run      | the edit saves; stored records keep what the old steps wrote until each is reprocessed |
| rename a step's output slot                                | cascade     | rehearse, then one document carrying the step, its readers and the flow binding        |
| rename a field or a type                                   | pinned      | refused once the type has records                                                      |
| change what is searchable                                  | reindex     | rehearse; a `reembed` bills per record                                                 |
| remove anything                                            | subtractive | rehearse, expect a refusal naming dependents                                           |
| retire a term records carry                                | merge       | merge it into the term that survives, or archive it                                    |
| rename or change a flow's own input or output slots        | contract    | `409` until `adoptSnapshots: true` re-publishes the endpoints in front of it           |

Misclassifying is the usual failure. "Add a field" and "add a required field" look identical in a
request and are a create and a migration respectively. "Edit a step" and "edit a step of the flow
that already processed ten thousand records" look identical too.

## The sequences

### Additive

Dependency order, outside-in:

```
schema entry → flow → record type → endpoint → schedule
```

Each names one before it (a record type names its processing flow in `flowId`), so the reverse
order is a save refused for naming something absent. The one loop — a flow that reads a type's
shape, and the type that names the flow — is broken by creating the type without `flowId` and
binding it afterwards: `PATCH /v1/record-types/{id} { flowId, version }`. A project document orders
all of it for you.

### Narrowing under live records

Removing a field is refused once the type has records, and a field made required at once
invalidates every record that lacks it. So it is four steps, never one, in this order:

```
1  add the field as optional            → existing records stay valid
2  backfill it                          → the loop below
3  patch every schedule's and trigger's fixed inputs that feed the shape
4  make it required                     → now nothing is invalidated
```

**Where the shape is edited depends on who owns it.**

| The shape is                                                                                                                                                       | Edit it with                                                                         | The other route refuses it |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------- |
| owned by the type — stated inline as `records.<key>.shape` in the document that made it (a type made with `POST /v1/record-types` always points at a shared entry) | `PATCH /v1/record-types/{id}` with `definition`, or the inline `shape` in a document | `SCHEMA_ENTRY_OWNED`       |
| a shared schema entry — one the type points at with `dataEntryId`                                                                                                  | `PATCH /v1/schema-entries/{id}`, or under `schema` in a document                     | `RECORD_TYPE_SHAPE_SHARED` |

**A published contract freezes the shape.** While a flow that reads the shape is frozen into a
published contract — an endpoint in front of it, or a record type whose processing flow (`flowId`)
it is — the edit answers `409 SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`, its message naming those
holders (`details` only counts them by kind), unless it carries `adoptSnapshots: true`.

- The schema-entry PATCH and a document take that flag.
- The record-type PATCH does not — it is an unrecognised key there, whatever the 409's message
  says. So an owned shape behind an endpoint or a processing flow is edited, and rehearsed, through
  a document, with the flag inside the inline shape:
  `"records": { "contact": { "shape": { "definition": { … }, "adoptSnapshots": true } } }`.
- Schedules and triggers freeze nothing, so the 409 neither names nor waits for them.

**Rehearse steps 1 and 4 before sending them.**

- A shape the type owns: the record-type PATCH with `validateOnly: true` and the drafted
  `definition` (or the proposed `dataEntryId`) answers `derived.contract`, the vocabulary it would
  give the type. Behind a published contract, the document plan is the rehearsal.
- A shared entry: the schema-entry PATCH with `validateOnly: true` (and `adoptSnapshots: true`)
  answers whether the edit is allowed and what it does to stored data.
- Either way the answer carries `records-invalid` under `consequences`, and the flows, schedules
  and triggers the edit would break — the PATCH lists them under `leavesBehind`, the plan among its
  findings, each with `introduced`.

Step 3 is the fix for what the rehearsal of step 4 names: a schedule's or trigger's stored `inputs`
that would no longer fit its slot's type is `SCHEDULE_INPUT_MISTYPED` / `TRIGGER_INPUT_MISTYPED`,
an error the narrowing introduces, so the rehearsal answers `ok: false` until step 3 is done. The
PATCH itself does not refuse on them; a schedule or trigger write that sends such a value is
refused with the same code.

### The backfill

One change set of up to 500 records a call:

```
GET  /v1/records?project=<node>&recordType=<type>&limit=100   ids and versions — every row carries `version`
POST /v1/records/bulk   { project, items: [ { id, version, merge: { <the new field>: … } }, … ] }
```

- `merge` sets only the keys it names (`null` removes one), so no record has to be read whole first.
- Every item is judged before anything is written; one refused item refuses the bulk, and
  `details.issues[].path` names it (`items.<n>`, with the item's own code — a stale `version` is
  `RECORD_VERSION_STALE`: re-read that row and resend).
- `validateOnly: true` rehearses it.
- A bulk re-indexes but never re-runs the processing flow.

A flow can do the same write for up to 100 records a run: `entity.list` over the type (`limit` up
to 100, filtered to the rows still to change) → `flow.fan-out` over the records' ids (an
`inputPaths` projection plucking `id` from `records`; `maxItems` defaults to 20, at most 100) →
`entity.update`. Past 100, run it again and the filter picks up the rest (`kipory-data`).

### Editing the processing flow of a type that holds records

A step added, removed or re-configured in a type's processing flow saves like any step edit —
unless it changes the flow's input or output slots, which is the contract class below. What the
edit does not do is touch a stored record:

- **Records processed from now on run the new steps.** That includes a record created after the
  edit and one queued again by `entity.enqueue-process`.
- **Records already processed keep what the old steps wrote** — their fields, their terms, their
  vectors. Nothing re-runs them: `GET /v1/record-types/{id}` (`recordCount`) is the number the
  edit left behind.
- **To bring one forward, reprocess it**: `POST /v1/records/{id}/reprocess`. It clears what the
  earlier run derived and runs the flow as it is now. It is charged like the record's first
  processing — nothing is answered from a cache and every model call is billed again — so reprocess
  one record, read its result and its spend, then decide how many of the rest are worth it.
  `kipory-data` owns the route, its modes and what it sweeps.
- **A retry after the edit is not refused.** Every re-run of a record runs all of the flow's steps
  again, on the flow as it is now; nothing is carried over from the attempt before the edit.

So the sequence is: take a checkpoint, run the flow's eval suite once for a baseline, make the
edit, preview it on one input with `apply: false` (`kipory-build`), reprocess one stored record and
read it back, then reprocess the rest or leave them — and say in your report which you chose,
because a project whose old and new records were written by different steps looks inconsistent to
whoever reads it next.

### Subtractive

Reverse dependency order, inside-out: delete the leaf, then what it hung from. Rehearse a flow
delete with `DELETE /v1/flows/{id}?validateOnly=true` — it deletes nothing and answers the delete's
own verdict and `derived.dependents`, everything that holds the flow — or with a document plan.

```
delete the endpoint → delete the schedules and triggers → unbind the type (flowId: null) or delete it
  → re-point resolvers and invoking flows → delete the flow
```

A flow delete is refused (`409 FLOW_HAS_DEPENDENTS`) while anything names it:

- an endpoint, or a trigger;
- a schedule, **disabled ones too** — delete it or re-point it with
  `PATCH /v1/schedules/{id} { flowId, version }`;
- a record type bound to it (`flowId`);
- a facet resolver;
- another flow's `flow.invoke`.

The refusal counts each kind, and `GET /v1/projects/{nodeId}/connections` names the rows. Every
delete in this sequence has a dry run (`?validateOnly=true`); ask each before sending it. A delete
that is refused has told you the order was wrong.

A flow delete takes its checkpoints and its `<flowKey>-contract` eval suite (cases and runs) with
it: export the project first if you may want the flow back. Other suites over the flow stay and
fail until you re-point them.

⛔ Never send `validateOnly` in a JSON body to a delete, and never to a delete whose route reference
does not list it: such a delete has no rehearsal, and a deployment older than these files may
ignore the flag and **delete** (`200 {"deleted": true}`).

### A rename

Rehearse, then commit. Three different things are called a rename:

**A step's output slot, on a live endpoint — one document apply.** State the step's new
`outputSlot`, every reader rewritten to the new name, and the flow's re-pointed `outputBinding`:
one transaction, and the endpoint never answers from a dangling binding. A document writes each
step as stated and cascades nothing, so the readers to restate (each one's prompt, config or
`inputStreams`) are the ones the step PATCH's `validateOnly` lists in `derived.rename`.

**The same rename, row by row:**

```
PATCH /v1/steps/{id}             the new outputSlot + validateOnly — derived.rename names every step it would rewrite
PATCH /v1/steps/{id}             the new outputSlot + confirmedOutputSlotRenames — one transaction
PATCH /v1/flows/{id}              { outputBinding, version } — give every output bound to the old name its new `fromSlot`
GET   /v1/flows/{id}/health       whether the flow is still whole
```

- `confirmedOutputSlotRenames` is `[{ flowId, oldSlotName, newSlotName }]`. With it, every sibling
  step that reads the old name is rewritten in the same transaction. Without it the rename lands
  and every reader is left on a slot that no longer exists.
- The flow's `outputBinding` is never rewritten, and `derived.rename` does not list it. The save
  lands with `OUTPUT_BINDING_DANGLING_SLOT` as an error in its `outstandingIssues`.
- The `validateOnly` rehearsal says so beforehand by answering `ok: false`: an error the edit
  introduces — this one, or `INPUT_STREAM_DANGLING_SLOT` for a reader left on the old name — is in
  `diagnostics` and in `leavesBehind` with `introduced: true`. That verdict is the expected one
  when the binding is re-pointed in the following write.
- Skip the third call and the endpoint in front answers `422 FLOW_OUTPUT_MISSING`
  (`details.missing` names the output) and writes nothing — a required output nothing produces is
  refused, never filled. Health names the dangling binding before a call does.

**A flow's own input or output slot** is its signature, not a step rename:
`409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` until `PATCH /v1/flows/{id}` carries
`adoptSnapshots: true`, and then every client of the endpoint sees the new key at once. That PATCH
may send `outputTypeNames` alone; the inputs stay as stored (and the same the other way round).

**A record type's key and fields** are not renamed this way: once it has records, both are refused.
The way round is additive: add the new field, backfill it from the old one, move every reader to
it, and leave the old field in the shape. For a type, create the new type and move the records
with a flow.

### Retiring a term records carry

A term's key never changes, and a term assigned to records cannot be deleted
(`TERM_DELETE_HAS_ASSIGNMENTS`). Nor can a term that is the parent of others or the canonical of
aliases. Two ways forward:

- **Two terms mean the same — merge.** `POST /v1/terms/{id}/merge { targetTermId, version }`, on
  the term you do not want. Every assignment moves onto the target in the same write, and the
  source stays as an alias (`aliasOfId`) carrying none, so its text still resolves — to the target.
  A delete then accepts the alias; keep it while any record's source value or any caller's filter
  still spells its key. A merge has no undo.
- **A term that should not be used any more — archive.** `PATCH /v1/terms/{id}` with
  `status: archived` and the term's `version`. It stays on the records that carry it, and nothing
  new is assigned to it.

A merge refuses: a merge into the term itself, a target in another facet, an archived target, a
target that is already an alias, a source that other terms alias, and a source and target under
different parents.

Candidates a supervised facet coined are the same rows with `status: candidate`: admit one with
`status: active`, merge its twins into it, archive the rest.

### Removing through a document

A document plan is the rehearsal for a removal that spans rows, and for a delete with no
rehearsal of its own. What to know before writing one:

- **A delete row holds `delete` and optionally `id`, nothing else.** Turning an exported row into a
  delete by adding `delete: true` is refused `DOCUMENT_DELETE_WITH_FIELDS` on that row, and the
  plan stops at that finding with nothing else judged — replace the whole row.
- **A cascade is reported whether or not your document names the row.** Delete a record type
  inside a full export that still states the relation kind pairing it, and that kind is in
  `changes` on its own path as a `delete` with `because: "cascade"`, not as `unchanged`.
- **A plan's `changes` are not the apply's write order**, and the ids a plan shows for creates are
  from its rolled-back attempt; the apply mints its own.
- **The record-type pins still hold.** A type with records, or one a step's configuration names,
  refuses a rename (a change of its `key`), a re-pointed shape and an ownership change exactly as
  its own PATCH does, and the finding lands on the row's path in your document.

## Reading a refusal

A refusal names what blocked it. That name is the next thing to deal with, and it is usually not the
thing you were trying to change.

| The refusal says                                     | Deal with                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| the type has N existing records                      | the records, in `kipory-data` — or leave the type alone. The rule is `RECORD_TYPE_PINNED_BY_RECORDS` (`details.reason`)                                                                                                                                                              |
| a rename, or a field removed, on a type with records | nothing lifts it: add the new field or type beside the old one ("A rename", above)                                                                                                                                                                                                   |
| the type is reserved or seeded                       | nothing; it is not yours to delete, whatever it holds                                                                                                                                                                                                                                |
| a related row still references this flow             | whatever references it — an endpoint, a schedule (even disabled), a trigger, a record type, a resolver, an invoking flow                                                                                                                                                             |
| N dependents read these slots                        | re-wire those steps first, then delete                                                                                                                                                                                                                                               |
| assignments still exist on this term                 | merge it into the term that should survive (`POST /v1/terms/{id}/merge`) — every assignment moves and a delete then accepts the alias — or archive it to keep it on the records that have it                                                                                         |
| a facet delete answers 409                           | if another facet nests under it, delete that facet first — no flag lifts that, and a facet's parent cannot be changed. Otherwise send `confirm=true`, and `assignedTerms=delete` or `assignedTerms=archive` once any of its terms is assigned. Ask it with `validateOnly=true` first |
| the event type is built in                           | nothing; a built-in event type cannot be deleted                                                                                                                                                                                                                                     |
| this is the last pairing                             | a relation kind cannot have none; delete the kind instead                                                                                                                                                                                                                            |

- **A refusal that names a rule names it the same way everywhere.** `RECORD_TYPE_PINNED_BY_RECORDS`
  is the finding's `code` on the `validateOnly` verdict and in a plan, and `details.reason` on the
  real 409, whose `code` stays `CONFLICT`. The refusal names the record count.
- **A flow delete's refusal counts what references the flow, by kind** — `details` on the 409,
  `derived.dependents.kinds` on the dry run — without naming the rows;
  `GET /v1/projects/{nodeId}/connections` names them.
- **A step delete's refusal** counts the dependents and names the slots they read.
- **A term** is refused while it is assigned to records (`TERM_DELETE_HAS_ASSIGNMENTS`), is the
  parent of others, or is the canonical of aliases — "Retiring a term records carry", above.
- **A document never writes a built-in event type**: a type in a source provider's namespace
  (`telegram/…`) plans as `derived`.

## Reading a cascade

A cascade succeeded. The response says what else moved, and nothing will say it again.

| The response carries    | Means                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `deletedRelationKinds`  | links that applied only to the pair you removed are gone                                        |
| `because: "cascade"`    | a document plan's row a delete takes along — named or not                                       |
| a deleted relation kind | every edge of the kind is gone — a plan's `edges-deleted` says how many                         |
| `invalidatedJoins`      | other types' join declarations are now void — go and fix them                                   |
| `restamp` (plan)        | every record's filter columns are being rewritten; nothing is embedded and no credits are spent |
| `reindex` (plan)        | an index reconcile is queued; it may redo nothing, or rewrite payloads only                     |
| `reembed` (plan)        | every record of the type is being embedded again; it is billed                                  |

What starts each one:

- **Deleting a record type** reports `deletedRelationKinds` and `invalidatedJoins`. You asked to
  remove one thing and something else changed.
- **Changing what a type indexes for search** — the `search` uses in its `uses`, from which
  `searchable` is derived — queues a reindex, and when what the search indexes moved, a re-embed
  of every stored record, which bills. A plan's `consequences` tell the two apart.
- **Changing a type's `filter` uses** queues the restamp. Filters answer from the previous
  declaration until it finishes — `GET /v1/record-types/{id}?expand=restamp` says whether it has.
- **A slot rename cascades only when you confirm it, and never into the flow's outputs** —
  "A rename", above.
- **Editing a processing flow re-runs nothing.** Stored records keep what the old steps wrote
  until each is reprocessed.

Keep the response. It is the only record of what a change reached.

## Before you start, and after you finish

**Before.** Take a checkpoint if a flow is involved — it is the only rollback the platform offers.
Export the document (`GET /v1/projects/{nodeId}/document`) and keep it — and, if a relation kind
may go, its edges (`GET /v1/relations?project=<node>&link=<kind>`), which no export carries.
Re-applied later, that export is the rollback: a type it re-creates takes back the inline shape its
delete left behind, and a schedule or trigger it re-creates keeps the `enabled` it recorded.
Read `GET /v1/bootstrap` so you know what the project holds, then `GET /v1/record-types/{id}` for
each type you touch — its `hasRecords` and `recordCount` (the bootstrap rows omit them) say which
changes are migrations — and note the `structureVersion` you are starting from. (`GET
/v1/projects/{nodeId}/usage` is spend, not inventory.)

**After.** Re-read `GET /v1/bootstrap` and confirm the digest moved. Run the flow's health check.
Re-run the eval suites (`kipory-prove`) and treat new failures as a question, not a
verdict: some are the change working as intended and need re-baselining, some are the change
breaking something you did not mean to touch. Deciding which is the whole job, and nothing can
decide it for you.
