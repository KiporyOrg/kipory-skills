# From a change request to a safe sequence

## Start by classifying the change

| The request                                     | Class       | What it needs                                            |
| ----------------------------------------------- | ----------- | -------------------------------------------------------- |
| add a field, a type, a flow, an endpoint        | additive    | dependency order, nothing else                           |
| add a **required** field to a type with records | narrowing   | widen → backfill → narrow, three writes                  |
| rename a field, a type, a slot                  | cascade     | rehearse, then one transaction                           |
| change what is searchable                       | re-embed    | rehearse, then a bill proportional to the record count   |
| remove anything                                 | subtractive | rehearse, expect a refusal naming dependents             |
| change a flow's output shape                    | contract    | the endpoints in front of it do not follow automatically |

Misclassifying is the usual failure. "Add a field" and "add a required field" look identical in a
request and are a create and a migration respectively.

## The sequences

**Additive.** Dependency order, outside-in:

```
schema entry → record type → flow → endpoint → schedule
```

Each names the one before it, so the reverse order is a save refused for naming something absent.

**Narrowing under live records.** Three writes, never one:

```
1  add the field as optional            → existing records stay valid
2  backfill it                          → a flow over the type
3  make it required                     → now nothing is invalidated
```

Check step 3 with `POST /v1/record-types/{id}/write-preview` before committing to it.

**Subtractive.** Reverse dependency order, inside-out:

```
detach the endpoint → retire the schedule → delete the flow → delete the type
```

Rehearse each one that has a rehearsal. A delete that is refused has told you the order was wrong.

**A rename.** Rehearse, then commit:

```
GET /v1/skills/rename-preview     every step whose wiring would be rewritten
… the rename …                    one transaction, all or nothing
GET /v1/flows/{id}/health         whether the flow is still whole
```

## Reading a refusal

A refusal names what blocked it. That name is the next thing to deal with, and it is usually not the
thing you were trying to change.

| The refusal says                         | Deal with                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| the type has N existing records          | the records, in `kipory-data` — or leave the type alone                                         |
| the type is reserved or seeded           | nothing; it is not yours to delete                                                              |
| a related row still references this flow | whatever references it — an endpoint, a schedule, a record type                                 |
| N dependents read these slots            | re-wire those steps first, then delete                                                          |
| assignments still exist on this term     | alias it onto a canonical term with `POST /v1/terms/{id}/merge` — same parent, non-alias target |
| this is the last pairing                 | a relation kind cannot have none; delete the kind instead                                       |

## Reading a cascade

A cascade succeeded. The response says what else moved, and nothing will say it again.

| The response carries   | Means                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `deletedRelationKinds` | links that applied only to the pair you removed are gone       |
| `invalidatedJoins`     | other types' join declarations are now void — go and fix them  |
| a queued rewrite       | every record of the type is being rewritten; it is billed      |
| a re-embed             | every record of the type is being embedded again; it is billed |

Keep the response. It is the only record of what a change reached.

## Before you start, and after you finish

**Before.** Take a checkpoint if a flow is involved — it is the only rollback the platform offers.
Read `GET /v1/projects/{nodeId}/usage` so you know what the project holds. Note the
`structureVersion` you are starting from.

**After.** Re-read `GET /v1/bootstrap` and confirm the digest moved. Run the flow's health check.
Re-run the test cases and eval suites (`kipory-prove`) and treat new failures as a question, not a
verdict: some are the change working as intended and need re-baselining, some are the change
breaking something you did not mean to touch. Deciding which is the whole job, and nothing can
decide it for you.
