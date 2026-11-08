# From a change request to a safe sequence

This file is the one home of each sequence. Each rehearsal route is in `rehearsals.md`, and what a
refusal or a cascade carries is in `refusals-and-cascades.md`. `SKILL.md` gives the short form of each.

## Start by classifying the change

| The request                                                   | Class       | What it needs                                                                            |
| ------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| add a field, a table, a flow, an endpoint                     | additive    | dependency order, nothing else                                                           |
| add a **required** field to a table with records              | narrowing   | widen → backfill → patch fixed inputs → narrow, four moves                               |
| change the actions of a flow that processes a table's records | re-run      | the edit saves; stored records keep what the old actions wrote until each is reprocessed |
| rename an action's output slot                                | cascade     | rehearse, then one document carrying the action, its readers and the flow binding        |
| rename a field or a table                                     | rename      | ADMIN; the records move with the new name, and callers of the old one break              |
| change what is searchable                                     | reindex     | rehearse; a `reembed` bills per record                                                   |
| remove anything                                               | subtractive | rehearse, expect a refusal naming dependents                                             |
| retire a term records carry                                   | merge       | merge it into the term that survives, or archive it                                      |
| rename or change a flow's own input or output slots           | contract    | `409` until `adoptSnapshots: true` re-publishes the endpoints in front of it             |

Misclassifying is the usual failure. "Add a field" and "add a required field" look identical in a
request and are a create and a migration respectively. "Edit an action" and "edit an action of the flow
that already processed ten thousand records" look identical too.

## The sequences

### Additive

Dependency order, outside-in:

```
type → flow → table → endpoint → schedule
```

Each names one before it (a table names its processing flow in `flowId`), so the reverse
order is a save refused for naming something absent. The one loop — a flow that reads a table's
type, and the table that names the flow — is broken by creating the table without `flowId` and
binding it afterwards: `PATCH /v1/tables/{id} { flowId, version }`. A project document orders
all of it for you.

### Narrowing under live records

Removing a field is refused once the table has records, and a field made required at once
invalidates every record that lacks it. So it is four changes, never one, in this order:

```
1  add the field as optional            → existing records stay valid
2  backfill it                          → the loop below
3  patch every schedule's and trigger's fixed inputs that feed the type
4  make it required                     → now nothing is invalidated
```

**Two routes edit a type.** `PATCH /v1/types/{id}` (or the type under `types` in a
document) edits it alone. `PATCH /v1/tables/{id}` with `definition` edits it together with a
table of that type, in one save. Both judge every row that uses the type.

**A published contract freezes the type.** While a flow that reads the type is frozen into a
published contract — an endpoint in front of it, or a table whose processing flow (`flowId`)
it is — the edit answers `409 TYPE_RESHAPES_BOUND_SNAPSHOTS`, its message naming those
holders (`details` only counts them by kind), unless it carries `adoptSnapshots: true`.

- The type PATCH and a document take that flag.
- The table PATCH does not — it is an unrecognised key there, whatever the 409's message
  says. So a type behind an endpoint or a processing flow is edited, and rehearsed, through the
  type PATCH or a document, with the flag on the type:
  `"types": { "Contact": { "definition": { … }, "adoptSnapshots": true } }`.
- Schedules and triggers freeze nothing, so the 409 neither names nor waits for them.

**Rehearse steps 1 and 4 before sending them.**

- Through the table: the table PATCH with `validateOnly: true` and the drafted `definition`
  (or the proposed `dataTypeId`) answers `derived.contract`, the field vocabulary it would give the
  table. Behind a published contract, the document plan is the rehearsal.
- Through the type: the type PATCH with `validateOnly: true` (and `adoptSnapshots: true`)
  answers whether the edit is allowed and what it does to stored data. It is the same type
  either way, and an edit reaches every table, event and relation that uses it.
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
GET  /v1/records?project=<node>&tableKey=<type>&limit=100   ids and versions — every row carries `version`
POST /v1/records/bulk   { project, items: [ { id, version, merge: { <the new field>: … } }, … ] }
```

- `merge` sets only the keys it names (`null` removes one), so no record has to be read whole first.
- Every item is judged before anything is written; one refused item refuses the bulk, and
  `details.issues[].path` names it (`items.<n>`, with the item's own code — a stale `version` is
  `RECORD_VERSION_STALE`: re-read that row and resend).
- `validateOnly: true` rehearses it.
- A bulk re-indexes but never re-runs the processing flow.

A flow can do the same write for up to 100 records a run: `record.list` over the table (`limit` up
to 100, filtered to the rows still to change) → `flow.fan-out` over the records' ids (an
`inputPaths` projection plucking `id` from `records`; `maxItems` defaults to 20, at most 100) →
`record.update`. Past 100, run it again and the filter picks up the rest (`kipory-data`).

### Editing the processing flow of a table that holds records

An action added, removed or re-configured in a table's processing flow saves like any action edit —
unless it changes the flow's input or output slots, which is the contract class below. What the
edit does not do is touch a stored record:

- **Records processed from now on run the new actions.** That includes a record created after the
  edit and one queued again by `record.enqueue-process`.
- **Records already processed keep what the old actions wrote** — their fields, their terms, their
  vectors. Nothing re-runs them: `GET /v1/tables/{id}` (`recordCount`) is the number the
  edit left behind.
- **To bring one forward, reprocess it**: `POST /v1/records/{id}/reprocess`. It clears what the
  earlier run derived and runs the flow as it is now. It is charged like the record's first
  processing — nothing is answered from a cache and every model call is billed again — so reprocess
  one record, read its result and its spend, then decide how many of the rest are worth it.
  `kipory-data` owns the route, its modes and what it sweeps.
- **A retry after the edit is not refused.** Every re-run of a record runs all of the flow's actions
  again, on the flow as it is now; nothing is carried over from the attempt before the edit.

So the sequence is: take a checkpoint, run the flow's eval suite once for a baseline, make the
edit, preview it on one input with `apply: false` (`kipory-build`), reprocess one stored record and
read it back, then reprocess the rest or leave them — and say in your report which you chose,
because a project whose old and new records were written by different actions looks inconsistent to
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
- a table bound to it (`flowId`);
- a vocabulary resolver;
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

**An action's output slot, on a live endpoint — one document apply.** State the action's new
`outputSlot`, every reader rewritten to the new name, and the flow's re-pointed `outputBinding`:
one transaction, and the endpoint never answers from a dangling binding. A document writes each
action as stated and cascades nothing, so the readers to restate (each one's prompt, config or
`inputStreams`) are the ones the action PATCH's `validateOnly` lists in `derived.rename`.

**The same rename, row by row:**

```
PATCH /v1/actions/{id}             the new outputSlot + validateOnly — derived.rename names every action it would rewrite
PATCH /v1/actions/{id}             the new outputSlot + confirmedOutputSlotRenames — one transaction
PATCH /v1/flows/{id}              { outputBinding, version } — give every output bound to the old name its new `fromSlot`
GET   /v1/flows/{id}/health       whether the flow is still whole
```

- `confirmedOutputSlotRenames` is `[{ flowId, oldSlotName, newSlotName }]`. With it, every sibling
  action that reads the old name is rewritten in the same transaction. Without it the rename lands
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

**A flow's own input or output slot** is its signature, not an action rename:
`409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` until `PATCH /v1/flows/{id}` carries
`adoptSnapshots: true`, and then every client of the endpoint sees the new key at once. That PATCH
may send `outputTypeNames` alone; the inputs stay as stored (and the same the other way round).

**A table's key and fields** rename with their records: a table's new `key` (its PATCH, or its
row stated by `id` under the new key in a document) or a type's `renameFields`. Both need ADMIN.
The plan's `renames[]` lists the references rewritten, the expressions you settle (change each in
the same document or name its action in `keepExpressions`) and the exposures: a caller still using
the old name gets no alias. The inverse rename is the undo (the `tables-and-types` pack).

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

A merge refuses: a merge into the term itself, a target in another vocabulary, an archived target, a
target that is already an alias, a source that other terms alias, and a source and target under
different parents.

Candidates a supervised vocabulary coined are the same rows with `status: candidate`: admit one with
`status: active`, merge its twins into it, archive the rest.

### Removing through a document

A document plan is the rehearsal for a removal that spans rows, and for a delete with no
rehearsal of its own. What to know before writing one:

- **A delete row holds `delete` and optionally `id`, nothing else.** Turning an exported row into a
  delete by adding `delete: true` is refused `DOCUMENT_DELETE_WITH_FIELDS` on that row, and the
  plan stops at that finding with nothing else judged — replace the whole row.
- **A cascade is reported whether or not your document names the row.** Delete a table
  inside a full export that still states the relation pairing it, and that relation is in
  `changes` on its own path as a `delete` with `because: "cascade"`, not as `unchanged`.
- **A plan's `changes` are not the apply's write order**, and the ids a plan shows for creates are
  from its rolled-back attempt; the apply mints its own.
- **The table pins still hold.** A table with records refuses a re-pointed type and an
  ownership change exactly as its own PATCH does, and the finding lands on the row's path in your
  document. A change of its `key` is a rename: its records move with it.

One apply can do each of these, so a cleanup needs no second document and no hand-made `DELETE`:

- **Drop or rename a config key.** Remove the key from the `*Config` type and state that
  namespace's `values` without it, in the same document. The type is judged against the values the
  document writes, not the stored ones; leave the namespace out and the stored value still refuses
  the type with `TYPE_UNSAFE_FOR_PROJECT_CONFIG`.
- **Retire a config namespace with its type.** `project.config.<namespace>: { delete: true }` beside
  `types.<Type>: { delete: true }`. The namespace's delete row states nothing else; its flows then
  read nothing under that namespace.
- **Delete a flow together with the flows that call it.** Every caller the document also deletes
  goes first, whatever order the document lists them in. A caller that stays refuses the called
  flow's row with `FLOW_HAS_DEPENDENTS`, naming the caller by its key.

## Before you start, and after you finish

**Before.** Take a checkpoint if a flow is involved — it is the only rollback the platform offers.
Export the document (`GET /v1/projects/{nodeId}/document`) and keep it — and, if a relation
may go, its links (`GET /v1/links?project=<node>&relation=<key>`), which no export carries.
Re-applied later, that export is the rollback: a schedule or trigger it re-creates keeps the `enabled` it recorded.
Read `GET /v1/bootstrap` so you know what the project holds, then `GET /v1/tables/{id}` for
each table you touch — its `hasRecords` and `recordCount` (the bootstrap rows omit them) say which
changes are migrations — and note the `structureVersion` you are starting from. (`GET
/v1/projects/{nodeId}/usage` is spend, not inventory.)

**After.** Re-read `GET /v1/bootstrap` and confirm the digest moved. Run the flow's health check.
Re-run the eval suites (`kipory-prove`) and treat new failures as a question, not a
verdict: some are the change working as intended and need re-baselining, some are the change
breaking something you did not mean to touch. Deciding which is the whole job, and nothing can
decide it for you.
