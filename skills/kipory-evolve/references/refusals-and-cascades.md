# Refusals and cascades

Read this when a change to a live project is refused, or before one that may take other rows along: what refuses, what cascades instead, and what each carries.

## What refuses, and what cascades instead

Some destructive changes are refused outright:

- deleting a table that holds records, or re-pointing its type or owner scope
  (`TABLE_PINNED_BY_RECORDS`), or removing a field from its type that records hold; deleting a
  seeded table, whatever it holds;
- deleting a flow something still references, or removing a step whose value a later step still reads (unless the same batch changes those readers);
- deleting a term that is assigned, is a parent, or is the canonical of aliases;
- deleting a vocabulary without `confirm=true`, or while another vocabulary nests under it;
- deleting a built-in event type, or a relation's last pairing.

Others do not refuse. They cascade, and the response tells you what else moved:

- deleting a table takes relations and voids other tables' joins;
- renaming a table moves its records and rewrites every reference to its key, and needs ADMIN;
- renaming a relation moves its links (each keeps its id) and rewrites every reference to its key,
  and needs ADMIN;
- changing a table's `search` uses queues a reindex or a billed re-embed, and its `filter` uses a
  rewrite of every record's filter columns;
- editing a processing flow re-runs nothing.

What each refusal carries, the way round where one exists, and what each cascade reports are in
"Reading a refusal" and "Reading a cascade", below.

The pattern is worth internalising: a refusal protects you, a cascade informs you, and the second
one is the one that costs money while you are not looking.

## Reading a refusal

A refusal names what blocked it. That name is the next thing to deal with, and it is usually not the
thing you were trying to change.

| The refusal says                         | Deal with                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the table has N existing records         | the records, in `kipory-data` — or leave the table alone. The rule is `TABLE_PINNED_BY_RECORDS` (`details.reason`)                                                                                                                                                                                  |
| a field removed on a table with records  | nothing lifts it: rename the field instead, or add the new one beside it (`change-order.md`, "A rename")                                                                                                                                                                                            |
| the table is seeded                      | nothing; it is not yours to delete, whatever it holds                                                                                                                                                                                                                                               |
| a related row still references this flow | whatever references it — an endpoint, a schedule (even disabled), a trigger, a table, a resolver, an invoking flow                                                                                                                                                                                  |
| a later step still reads this step       | re-point or remove those readers in the same batch, then remove it                                                                                                                                                                                                                                  |
| assignments still exist on this term     | merge it into the term that should survive (`POST /v1/terms/{id}/merge`) — every assignment moves and a delete then accepts the alias — or archive it to keep it on the records that have it                                                                                                        |
| a vocabulary delete answers 409          | if another vocabulary nests under it, delete that vocabulary first — no flag lifts that, and a vocabulary's parent cannot be changed. Otherwise send `confirm=true`, and `assignedTerms=delete` or `assignedTerms=archive` once any of its terms is assigned. Ask it with `validateOnly=true` first |
| the event type is built in               | nothing; a built-in event type cannot be deleted                                                                                                                                                                                                                                                    |
| this is the last pairing                 | a relation cannot have none; delete the relation instead                                                                                                                                                                                                                                            |

- **A refusal that names a rule names it the same way everywhere.** `TABLE_PINNED_BY_RECORDS`
  is the finding's `code` on the `validateOnly` verdict and in a plan, and `details.reason` on the
  real 409, whose `code` stays `CONFLICT`. The refusal names the record count.
- **A flow delete's refusal counts what references the flow, by kind** — `details` on the 409,
  `derived.dependents.kinds` on the dry run — without naming the rows;
  `GET /v1/projects/{nodeId}/connections` names them.
- **A step removal's refusal** names the edit by its index; `GET /v1/flows/{id}?include=reads` names the readers.
- **A term** is refused while it is assigned to records (`TERM_DELETE_HAS_ASSIGNMENTS`), is the
  parent of others, or is the canonical of aliases — `change-order.md`, "Retiring a term records carry".
- **A document never writes a built-in event type**: a type in a source provider's namespace
  (`telegram/…`) plans as `derived`.

## Reading a cascade

A cascade succeeded. The response says what else moved, and nothing will say it again.

| The response carries | Means                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `deletedRelations`   | relations that applied only to the pair you removed are gone                                     |
| `because: "cascade"` | a document plan's row a delete takes along — named or not                                        |
| a deleted relation   | every link of the relation is gone — a plan's `links-deleted` says how many                      |
| `links-removed`      | a dropped or re-pointed link field's links go; records whose processing read them are not re-run |
| `invalidatedJoins`   | other tables' join declarations are now void — go and fix them                                   |
| `restamp` (plan)     | every record's filter columns are being rewritten; nothing is embedded and no credits are spent  |
| `reindex` (plan)     | an index reconcile is queued; it may redo nothing, or rewrite payloads only                      |
| `reembed` (plan)     | every record of the table is being embedded again; it is billed                                  |

What starts each one:

- **Deleting a table** reports `deletedRelations` and `invalidatedJoins`. You asked to
  remove one thing and something else changed.
- **Changing what a table indexes for search** — the `search` uses in its `uses`, from which
  `searchable` is derived — queues a reindex, and when what the search indexes moved, a re-embed
  of every stored record, which bills. A plan's `consequences` tell the two apart.
- **Changing a table's `filter` uses** queues the restamp. Filters answer from the previous
  declaration until it finishes — `GET /v1/tables/{id}?expand=restamp` says whether it has.
- **Editing a processing flow re-runs nothing.** Stored records keep what the old steps wrote
  until each is reprocessed.

Keep the response. It is the only record of what a change reached.
