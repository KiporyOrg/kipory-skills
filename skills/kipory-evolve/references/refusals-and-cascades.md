# Refusals and cascades

<!-- field-ok: ownerId — a row's owner, not a request field -->

Read this when a change to a live project is refused, or before one that may take other rows along: what refuses, what cascades instead, and what each carries.

## What refuses, and what cascades instead

Some destructive changes are refused outright:

- deleting a table that holds records, or re-pointing its type or owner scope
  (`TABLE_PINNED_BY_RECORDS`), or removing a field from its type that records hold.
  One exception: a project table whose records name their owner in a text field becomes
  person-owned with `ownerScope: "user"` plus `ownerField: "<field>"`. Every record becomes the
  person its field names, the field leaves the type, and a key stays unique across the project.
  Send `validateOnly: true` first. It is refused, with nothing changed, when a record names nobody
  active (`TABLE_OWNER_FIELD_UNUSABLE`, with the count and record ids) or when the type is shared,
  records hold files, or something still reads the field (`TABLE_OWNER_CONVERSION_BLOCKED`). In a
  document, state the type without the field and move its readers to `ownerId` in the same plan.
  An undo or rewind cannot hand those records back (`RESTORE_CROSSES_OWNER_CONVERSION`);
- deleting a flow something still references, or removing a step whose value a later step still reads (unless the same batch changes those readers);
- deleting a term that is assigned, is a parent, or is the canonical of aliases;
- deleting a vocabulary while another vocabulary nests under it, or without an `assignedTerms`
  choice once records carry its terms;
- deleting a built-in event type, or a relation's last pairing.

Others do not refuse. They cascade, and the response tells you what else moved:

- deleting a table takes relations and voids other tables' joins;
- renaming a table moves its records and rewrites every reference to its key, and needs ADMIN;
- renaming a relation moves its links (each keeps its id) and rewrites every reference to its key,
  and needs ADMIN;
- changing a table's `search` uses queues a reindex or a billed re-embed, and its `filter` uses a
  rewrite of every record's filter columns;
- editing a processing flow re-runs nothing.

⭐ **Every design delete reads the same.** `DELETE /v1/<kind>/{id}?validateOnly=true` answers whether
the delete would be refused and what it would take along, writing nothing; the delete itself is
refused (409) only over what still depends on the row. There is no `confirm` flag on any of them —
the dry run is the look before the leap, and an unknown query parameter, `confirm` included, is a 422. A project's own retirement and an organization's destruction are the exceptions: they take the
name typed back (`confirmSlug`, `confirmName`).

What each refusal carries, the way round where one exists, and what each cascade reports are in
"Reading a refusal" and "Reading a cascade", below.

The pattern is worth internalising: a refusal protects you, a cascade informs you, and the second
one is the one that costs money while you are not looking.

## Reading a refusal

A refusal names what blocked it. That name is the next thing to deal with, and it is usually not the
thing you were trying to change.

| The refusal says                         | Deal with                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the table has N existing records         | the records, in `kipory-data` — or leave the table alone. The rule is `TABLE_PINNED_BY_RECORDS` (`details.reason`)                                                                                                                                                              |
| a field removed on a table with records  | nothing lifts it: rename the field instead, or add the new one beside it (`change-order.md`, "A rename")                                                                                                                                                                        |
| a related row still references this flow | whatever references it — an endpoint, a schedule (even disabled), a trigger, a table, a resolver, an invoking flow                                                                                                                                                              |
| a later step still reads this step       | re-point or remove those readers in the same batch, then remove it                                                                                                                                                                                                              |
| assignments still exist on this term     | merge it into the term that should survive (`POST /v1/terms/{id}/merge`) — every assignment moves and a delete then accepts the alias — or archive it to keep it on the records that have it                                                                                    |
| a vocabulary delete answers 409          | if another vocabulary nests under it, delete that vocabulary first — no flag lifts that, and a vocabulary's parent cannot be changed. Otherwise send `assignedTerms=delete` or `assignedTerms=archive` once any of its terms is assigned. Ask it with `validateOnly=true` first |
| the event type is built in               | nothing; a built-in event type cannot be deleted                                                                                                                                                                                                                                |
| this is the last pairing                 | a relation cannot have none; delete the relation instead                                                                                                                                                                                                                        |

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

## A change to a table's processed fields

A flow-backed table's processed fields are its flow's outputs as they are now. Nobody saves the
table again after a flow change, and no record fails because the flow changed. A write that changes
those fields (the flow's `outputs`, a type they use, a document, a checkpoint restore) is judged:

- **A safe change saves and is reported** in `contractChanges`: a new output, an optional field.
- **A break** (an output removed or retyped) needs an admin's `acceptBreaks` naming the table.
- **The table's row carries `consequences`**, in the plan, the answer and the refusal alike:
  `restamp`, `reindex`, `reembed`, `stream-migration`, `shape-behind` (the records not on the new
  shape) and `field-values-hidden` (the records holding a value a read no longer answers: every value of a removed
  field, and for a retyped field the values of a kind the new type does not allow).
- **A retype a filter can still take saves**, with a `restamp`.
- **A field a declaration still names cannot go.** Removing it, or retyping it out of that
  declaration's reach, is a validation error with the declaration's own code
  (`TABLE_QUERYABLE_INVALID` for a list filter, `TABLE_SEARCHABLE_INVALID` for a removed search
  field, `TABLE_RELATIONS_INVALID` for a relation, `TABLE_USES_INVALID` for a stream use and for a
  search field retyped to something that is not text), whatever
  `acceptBreaks` holds. Remove or change the declaration first, or in the same document.

After it saves:

- **A removed field's stored values are not answered**, at once. They stay stored until the record
  is next processed, and come back if the output is restored before then. A retyped field's old
  values of a kind it no longer declares are hidden the same way.
- **Each record keeps the shape it was stored under.** A record carries `shapeStamp`;
  `GET /v1/tables/{id}?expand=shape` answers
  `shape: {identifier, records: {current, older, unstamped}}`. `unstamped` is a record with
  processed values and no stamp: processed before stamps existed, put back by an undo or a rewind
  to such values, or patched by a flow's `record.update` while not on the current shape (the patch
  clears the stamp; an undo restores the stamp of the values it restores).
- **Only a reprocess brings a record to the current shape**: `POST /v1/record-reprocesses`
  (`scope: "not-current"`) runs every such record of a table, a few at a time; ask it with
  `validateOnly: true` first for the count and an estimate of the cost, read its progress at
  `GET /v1/record-reprocesses/{id}`, stop it with `PATCH`. One record: `POST /v1/records/{id}/reprocess`.
  Each record is charged like a first processing (`kipory-data`).
- **A run checks what it stores.** A processed value that does not fit its field's declared type
  fails that record, stores nothing of that run, and the error names the field
  (`PROCESSED_VALUE_MISMATCH`; the flow's `return` usually fails first, `OUTPUT_TYPE_MISMATCH`).
  A `record.update` that patches a processed field is checked the same way.

Keep the response. It is the only record of what a change reached.
