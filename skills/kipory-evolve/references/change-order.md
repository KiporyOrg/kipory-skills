# From a change request to a safe sequence

## Start by classifying the change

| The request                                     | Class       | What it needs                                                                |
| ----------------------------------------------- | ----------- | ---------------------------------------------------------------------------- |
| add a field, a type, a flow, an endpoint        | additive    | dependency order, nothing else                                               |
| add a **required** field to a type with records | narrowing   | widen → backfill → narrow, three writes                                      |
| rename a slot                                   | cascade     | rehearse, then one document carrying the step and the flow binding           |
| rename a field or a type                        | pinned      | refused once the type has records                                            |
| change what is searchable                       | reindex     | rehearse; a `reembed` bills per record                                       |
| remove anything                                 | subtractive | rehearse, expect a refusal naming dependents                                 |
| change a flow's input or output slots           | contract    | `409` until `adoptSnapshots: true` re-publishes the endpoints in front of it |

Misclassifying is the usual failure. "Add a field" and "add a required field" look identical in a
request and are a create and a migration respectively.

## The sequences

**Additive.** Dependency order, outside-in:

```
schema entry → flow → record type → endpoint → schedule
```

Each names one before it (a record type names its processing flow in `flowId`), so the reverse
order is a save refused for naming something absent.

**Narrowing under live records.** Three writes, never one:

```
1  add the field as optional            → existing records stay valid
2  backfill it                          → the loop below
3  make it required                     → now nothing is invalidated
4  patch every schedule's and trigger's fixed inputs that feed the shape
```

The shape is edited on `PATCH /v1/schema-entries/{id}`, with `adoptSnapshots: true` while an
endpoint, or a record type through its processing flow, holds a snapshot of a flow that reads it
(without it: `409`, naming them). Check step 3 with a document plan and read `records-invalid` —
that is the only rehearsal that counts stored records; the schema-entry PATCH with `validateOnly:
true` answers `ok: true` over records that would no longer fit. Step 4 is yours alone: no plan,
apply or health check re-reads a schedule's or trigger's stored `inputs` against the new shape.

**The backfill, record by record** (a handful to a few hundred records):

```
GET   /v1/projects/{nodeId}/records?type=<type>&limit=…     page on, passing `nextCursor` back as `after`
GET   /v1/projects/{nodeId}/records/{id}                    the current data (under `record.submitted`) and the `version`
PATCH /v1/projects/{nodeId}/records/{id}                    { data: <the WHOLE data, plus the new field>, expectedVersion: <version> }
```

`data` replaces, it does not merge, and a stale `expectedVersion` is `RECORD_VERSION_STALE` —
re-read and retry that one record. A patch re-indexes but never re-runs the processing flow. A flow
does the same write for up to 100 records a run: `entity.list` over the type (`limit` up to 100,
filtered to the rows still to change) → `flow.fan-out` over the records' ids (an `inputPaths`
projection plucking `id` from `records`; `maxItems` defaults to 20, at most 100) → `entity.update`.
Past 100, run it again and the filter picks up the rest (`kipory-data`).

**Subtractive.** Reverse dependency order, inside-out. ⛔ `DELETE /v1/flows/{id}` has no rehearsal
flag — do not send it a `validateOnly`, in the query or in a body. The current platform refuses
both forms with a `422` on every delete whose reference does not list the flag, but an older
deployment ignored a body flag and **deleted** (`200 {"deleted": true}`) — so never send
`validateOnly` to a delete whose route reference does not name it. Rehearse a flow delete with
`GET /v1/flows/{id}?expand=dependents` (its `deleteRefusal`) or a document plan:

```
delete the endpoint → delete the schedules and triggers → unbind the type (flowId: null) or delete it → delete the flow
```

A disabled schedule still blocks the flow delete: delete it or re-point it
(`PATCH /v1/schedules/{id} { flowId, version }`). So do a type bound to the flow, a facet resolver and
another flow's `flow.invoke` — the refusal (`409 FLOW_HAS_DEPENDENTS`) names each kind. Rehearse each one that has a rehearsal. A delete that
is refused has told you the order was wrong.

**A rename.** Rehearse, then commit. On a live endpoint prefer ONE document apply that states both
the step's new `outputSlot` and the flow's re-pointed `outputBinding` — one transaction, and the
endpoint never answers from a dangling binding. Row by row it is:

```
GET   /v1/skills/rename-preview   every step whose wiring would be rewritten
PATCH /v1/skills/{id}             the new outputSlot + confirmedOutputSlotRenames — one transaction
PATCH /v1/flows/{id}              { outputBinding } — re-point every output bound to the old slot name
GET   /v1/flows/{id}/health       whether the flow is still whole
```

Without `confirmedOutputSlotRenames` the rename lands and every reader is left on a slot that no
longer exists. With it, sibling steps follow — but the flow's `outputBinding` does not, and the
preview does not list it: skip the third call and the endpoint in front answers `200` with the
output's empty value (`{"id": ""}`) — a required output nothing produces is filled, not refused —
after the run's writes have already committed. Health names it; the status code does not. Renaming a FLOW's own output slot is a
signature change: `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` until the PATCH carries
`adoptSnapshots: true`, and then every client of the endpoint sees the new key. That PATCH needs
BOTH `inputTypeNames` and `outputTypeNames`; one alone is a `422`. A record type's key and fields are not renamed this way: once it has records, both
are refused.

## Reading a refusal

A refusal names what blocked it. That name is the next thing to deal with, and it is usually not the
thing you were trying to change.

| The refusal says                         | Deal with                                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| the type has N existing records          | the records, in `kipory-data` — or leave the type alone. The `code` is `CONFLICT`; gate on the status, not the message   |
| the type is reserved or seeded           | nothing; it is not yours to delete                                                                                       |
| a related row still references this flow | whatever references it — an endpoint, a schedule (even disabled), a trigger, a record type, a resolver, an invoking flow |
| N dependents read these slots            | re-wire those steps first, then delete                                                                                   |
| assignments still exist on this term     | archive it (`PATCH /v1/terms/{id}`, `status: archived`) — a merge moves no assignment and does not make it deletable     |
| this is the last pairing                 | a relation kind cannot have none; delete the kind instead                                                                |

## Reading a cascade

A cascade succeeded. The response says what else moved, and nothing will say it again.

| The response carries    | Means                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| `deletedRelationKinds`  | links that applied only to the pair you removed are gone                |
| `because: "cascade"`    | a document plan's row a delete takes along — named or not               |
| a deleted relation kind | every edge of the kind is gone — a plan's `edges-deleted` says how many |
| `invalidatedJoins`      | other types' join declarations are now void — go and fix them           |
| a queued rewrite        | every record of the type is being rewritten; it is billed               |
| `reindex` (plan)        | an index reconcile is queued; it may redo nothing                       |
| `reembed` (plan)        | every record of the type is being embedded again; it is billed          |

Keep the response. It is the only record of what a change reached.

## Before you start, and after you finish

**Before.** Take a checkpoint if a flow is involved — it is the only rollback the platform offers.
Export the document (`GET /v1/projects/{nodeId}/document`) and keep it — and, if a relation kind
may go, its edges (`GET /v1/projects/{nodeId}/relations?link=<kind>`), which no export carries.
Re-applied later, that export is the rollback: a type it re-creates takes back the inline shape its
delete left behind, and a schedule or trigger it re-creates keeps the `enabled` it recorded.
Read `GET /v1/bootstrap` so you know what the project holds, then `GET /v1/record-types/{id}` for
each type you touch — its `hasRecords` and `recordCount` (the bootstrap rows omit them) say which
changes are migrations — and note the `structureVersion` you are starting from. (`GET
/v1/projects/{nodeId}/usage` is spend, not inventory.)

**After.** Re-read `GET /v1/bootstrap` and confirm the digest moved. Run the flow's health check.
Re-run the test cases and eval suites (`kipory-prove`) and treat new failures as a question, not a
verdict: some are the change working as intended and need re-baselining, some are the change
breaking something you did not mean to touch. Deciding which is the whole job, and nothing can
decide it for you.
