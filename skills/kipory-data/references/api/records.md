<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Records and relations

The project's own data: listing and searching records, writing and correcting one by hand, re-running or ending it, stating how it is filed, reading and stating a record's links one hop at a time, watching a record's processing as it happens, and previewing a view as one member reads it.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/links`](#get-v1-links) |  |
| `GET` | [`/v1/records`](#get-v1-records) |  |
| `POST` | [`/v1/records`](#post-v1-records) |  |
| `GET` | [`/v1/records/{id}`](#get-v1-records-id) |  |
| `PATCH` | [`/v1/records/{id}`](#patch-v1-records-id) |  |
| `DELETE` | [`/v1/records/{id}`](#delete-v1-records-id) |  |
| `GET` | [`/v1/records/{id}/links/{relationKey}`](#get-v1-records-id-links-relationkey) |  |
| `POST` | [`/v1/records/{id}/links/{relationKey}`](#post-v1-records-id-links-relationkey) |  |
| `DELETE` | [`/v1/records/{id}/links/{relationKey}/{peerRecordId}`](#delete-v1-records-id-links-relationkey-peerrecordid) |  |
| `GET` | [`/v1/records/{id}/processing-stream`](#get-v1-records-id-processing-stream) | SSE |
| `POST` | [`/v1/records/{id}/reprocess`](#post-v1-records-id-reprocess) |  |
| `GET` | [`/v1/records/{id}/stream/{field}`](#get-v1-records-id-stream-field) |  |
| `PUT` | [`/v1/records/{id}/vocabularies/{vocabularyKey}`](#put-v1-records-id-vocabularies-vocabularykey) |  |
| `POST` | [`/v1/records/bulk`](#post-v1-records-bulk) |  |
| `POST` | [`/v1/records/query`](#post-v1-records-query) |  |
| `POST` | [`/v1/views/{key}/preview`](#post-v1-views-key-preview) |  |

### `GET /v1/links`

A project's links as rows — every link between two of its records, narrowed by relation, producer, record, endpoint table and time, and cursor-paged; `link=` opens one link with its siblings. For one record's links of one relation, with filters on stamped link properties and counts, use `GET /v1/records/{id}/links/{relationKey}`; to state or retract a curated link, `POST` / `DELETE` on that same path.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the id `POST /v1/projects` answers and every `/v1/projects/{nodeId}` path takes. |
| `relation` | `string` | no | Narrow to these relation keys — the `key` of a relation, not its id. Comma-separated; an unknown member narrows to nothing rather than being ignored. |
| `producer` | `string` | no | Narrow to these producers — a `field:<type>.<field>` path, or a curated actor's key. Comma-separated; an unknown member narrows to nothing rather than being ignored. |
| `validity` | `"live" \| "retracted" \| "all"` | no | Which links to include; `live` by default. ⚠️ Only a CURATED relation can have retracted links — a field producer rewrites by deleting, so `retracted` over a field-only corpus is empty. |
| `record` | `string` | no | Anchor the result on one record: only links with this record at either end. `direction` needs it. |
| `direction` | `"outgoing" \| "incoming" \| "either"` | no | Which way the links point RELATIVE TO `record`. Refused without it. IGNORED for a symmetric relation. |
| `tableKey` | `string` | no | Narrow to links with a record of this table at EITHER end. A table the project does not declare narrows to nothing. |
| `q` | `string` | no | Narrow to links where either end's natural key CONTAINS this, ignoring case, or either end's id IS it. Taken literally — `%` and `_` match themselves. ⚠️ Not matched against a record's content: an end drawn with `labelKind: preview` is found by its id, never by that guessed line. |
| `sort` | `"valid-from" \| "relation"` | no | The ordering. `valid-from` is when each link came to be, with the link id as the tiebreak. `relation` groups the links by relation, the relations in the order their names read, each relation's links newest first. The response echoes it. |
| `order` | `"asc" \| "desc"` | no | Which way `sort` runs. Under `relation` it turns the relations round and leaves each relation's links newest first. |
| `link` | `string` | no | Open this link beside the result, by its id; it comes back as `detail`. |
| `limit` | `integer` | no | Rows per page. |
| `where` | `string \| string[]` | no | Narrow to links whose STAMPED filter column matches. Each value is `<property>:<op>:<value>` — `tag:eq:childhood`, `since:gte:2019-01-01`, `tag:in:a,b` — and the parameter is REPEATED to AND several clauses. `op` is one of eq, ne, in, lt, lte, gt, gte. `property` must be one of the relation's declared link filters (a table's link use names them in `element.filters`); any other name is 422 `LINK_FILTER_UNDECLARED`. The value is typed by the filter's column: a date filter takes an ISO instant, a number filter a number, a boolean `true`/`false`; a value that cannot be typed is 422. `ne` matches a link that CARRIES the property with another value — a link without it is unstamped and is not returned. Retracted links are out unless the read's history switch is on. While a declaration change is restamping the relation, clauses resolve against the map the rows are stamped for. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `links` | `object[]` | yes | The page, in the ordering `sort` and `order` name. |
| `sort` | `"valid-from" \| "relation"` | yes | The ordering this page was read in — the `sort` sent, or the default. |
| `order` | `"asc" \| "desc"` | yes | Which way `sort` ran — the `order` sent, or the default. |
| `elsewhere` | `object[]` | yes | Relations this sweep cannot answer for. See the member's own note. |
| `relations` | `object[]` | yes | The project's relations: every relation the project has, including the join-backed ones this sweep excludes. |
| `paging` | `object \| null` | yes | Null when this route declined to count — see `declinedCountReason`. |
| `declinedCountReason` | `"corpus-too-large" \| null` | yes | Why `paging` is null, when it is. `corpus-too-large`: narrowing brings the total back. |
| `detail` | `object \| null` | yes | The link `?link=` named. ⚠️ NULL IS TWO STATES AND THE CLIENT ALREADY KNOWS WHICH: none was named, or the id names no link of this project. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` — with the same `sort` and `order` — for the next page along the ordering, or null at the end. A cursor replayed under another ordering is refused (400). |
| `prevCursor` | `string \| null` | yes | Pass back as `before` — with the same `sort` and `order` — for the previous page, or null at the start. |

Each item of `links`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The link's own id — what `?link=` names. |
| `relationKey` | `string` | yes | The relation's KEY. |
| `directed` | `boolean` | yes | ⛔ THE RELATION'S, never derived from which column an endpoint landed in. `false` means the relation has no direction at all, not that it points the other way, so a surface must draw a third thing rather than an arrow. |
| `source` | `object` | yes | The end the link is stored FROM. ⚠️ Meaningful only where `directed` is true; on a symmetric relation it is whichever end sorted first. |
| `target` | `object` | yes | The end the link is stored TO, under the same caveat as `source`. |
| `origin` | `"field" \| "join-record" \| "curated"` | yes | How this link came to exist. Denormalized from the relation, and never `join-record` on a row of this table — see `elsewhere`. |
| `producerKey` | `string` | yes | WHICH producer wrote it. Identity is `(link, source, target, producerKey)`, so two producers asserting the same pair are two links and neither supersedes the other. |
| `properties` | `unknown` | no | The stored bags, each without the properties that have no value. ⛔ NOT ONE OBJECT: an ORDERED list with one bag per naming of the target — a record naming the same target twice makes ONE link carrying two — and the order is part of the value. Absent when no naming carried properties. |
| `validFrom` | `string` | yes | When the link came to be. What the list is ordered by. |
| `validTo` | `string \| null` | yes | When it was retracted, or null while it stands. |
| `createdAt` | `string` | yes | When it was FIRST written — not `validFrom` on a curated link that was retracted and asserted again, which moves `validFrom` and leaves this. |
| `createdBy` | `string \| null` | yes | The asserting actor — `user:<id>`, `key:<id>`, `system:<slug>`, `flow:<label>` for a flow's own assertion, or a bare email on a link curated before actors were prefixed — or null for a derived link. |
| `createdByPerson` | `object \| null` | yes | The person a `user:<id>` `createdBy` names, as their account reads now. Null for every other actor form, for a derived link, for a person whose account is gone, and whenever the caller is an API key. |
| `anchorDirection` | `"outgoing" \| "incoming" \| null` | yes | Which way this link points relative to `?record=`. ⛔ THE TWO NULLS ARE ONE ANSWER: null when there is no anchor OR the relation is symmetric — either way, no direction to draw. |
| `matchedBy` | `string \| null` | yes | Which producer's row satisfied your `where` clauses — its `producerKey`. A symmetric pair asserted by two producers with different property values is two rows, and a clause returns the one that matched; this says which. Null when no `where` was sent. |

Each item of `elsewhere`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relationKey` | `string` | yes | The relation whose links this sweep cannot answer for. |
| `joinTable` | `string \| null` | yes | The table that IS the link, or null when no declaration names one. |

Each item of `relations`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The relation's stable key — what `?relation=` takes. |
| `producer` | `"field" \| "join-record" \| "curated"` | yes | How this relation's links come to exist — spelled as `/v1/relations` spells it. ⚠️ `join-record` means this sweep holds NONE of them, and the matching `elsewhere` entry says where they are instead. |
| `direction` | `"directed" \| "symmetric"` | yes | `symmetric` means the relation has no direction at all, so every row of this relation answers `anchorDirection: null` and `direction` does not filter it. |
| `propertiesDataTypeId` | `string \| null` | yes | The type every link of this relation validates against, or null when it declares no properties. |

### `GET /v1/records`

One page of a project's records of one table (`tableKey`), with that table's declared columns — filtered by declared fields (`field=name:op:value`, ops `eq` `gt` `gte` `lt` `lte`), terms, owner, status and time, and ordered and paged by cursor. `id=` resolves named records instead, `key=` finds one by its natural key, and `mode=semantic` ranks by meaning. `fields=` adds the named fields' values to every row's `values`, columns or not, so many records' fields are one read. For a question the address cannot spell (links, streams, `in`), use `POST /v1/records/query`; for one record whole, `GET /v1/records/{id}`; for the project's links as rows, `GET /v1/links`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the id `POST /v1/projects` answers and every `/v1/projects/{nodeId}` path takes. |
| `tableKey` | `string` | no | The table this query is ABOUT. Omitted, the route chooses the table holding the most records and says so (`chosenByDefault`). To ask across EVERY table, send `subject=any`. The same name the create, query and bulk bodies use. |
| `subject` | `"any"` | no | Send `any` to ask across every table. Refused BESIDE `tableKey`, which names two subjects for one query. A tableless query drops the declared columns and declared conditions and is ordered by ARRIVAL, which the response says. |
| `mode` | `"exact" \| "semantic"` | no | `semantic` ranks by resemblance instead of matching literally, and is refused for a type that declares no meaning index. It returns a BOUNDED, UNPAGED ranking: no cursors, no page numbers. |
| `q` | `string` | no | With `mode=exact`, matched against the natural key and the type's declared TEXT fields, case-insensitively. ⛔ It is NOT matched against the record's submitted content. With `mode=semantic`, the phrase to resemble. |
| `field` | `string \| string[]` | no | A condition on a declared field, as `name:operator:value`. Repeat for more than one; they are combined with AND. Split on the FIRST TWO colons — the value is everything after the second, so a timestamp keeps its own. Operators by field family: text, reference and boolean take `eq`; number takes `eq`, `gt`, `gte`, `lt`, `lte`; date takes `gt`, `gte`, `lt`, `lte` — the words `POST /v1/records/query` and link filters use. Refused, by name, when the field is not declared queryable, when the operator does not belong to its family, or when it has no resolved storage behind it. |
| `term` | `string \| string[]` | no | A vocabulary condition, as `vocabulary:key`. Repeat for more than one. |
| `owner` | `string` | no | Narrow to the records ONE end-user owns, by their user id. Omitted, the list reads across every owner in the project. ⚠️ Records owned by the PROJECT rather than a person are excluded when this is set: they have no owner to match. |
| `status` | `"pending" \| "processing" \| "ready" \| "failed"` | no | Narrow to one processing state. |
| `createdAfter` | `string` | no | Inclusive lower bound on when the record arrived, regardless of how the result is ordered. |
| `createdBefore` | `string` | no | Inclusive upper bound on when the record arrived. |
| `sort` | `string` | no | OMIT IT TO TAKE THE MODE'S OWN ORDERING, which the response's `sort` names: `createdAt` within one type, `id` under `subject=any`, `closeness` under `mode=semantic`. A SENT word must be one the mode accepts. Within one type: `createdAt`, `updatedAt`, or `declared:<name>`. Under `subject=any`: `id`, and ONLY `id`. Under `mode=semantic`: `closeness`, and ONLY `closeness`. ⛔ A SENT WORD THE MODE DOES NOT ACCEPT IS REFUSED, NEVER REINTERPRETED. ⚠️ `id` is refused within one type and `createdAt` is refused under a sweep — the accepted sets do not overlap. ⚠️ A declared sort is accepted ONLY for a field whose family is `date`. Any other family is a refusal naming the field, not a silent fallback. |
| `order` | `"asc" \| "desc"` | no | Which way the `sort` runs. Refused as `asc` on a ranking. |
| `limit` | `integer` | no | Rows per page. Ignored by a meaning-based result, which is bounded by the ranking rather than by a page size. |
| `after` | `string` | no | The page after this row — pass back the `nextCursor` you were given. |
| `before` | `string` | no | The page before this row. Refused together with `after`: they name opposite directions from one row. |
| `page` | `integer` | no | Jump to this page, 1-based, resolved as an OFFSET and therefore approximate while records are arriving. Refused (422) when this route declines to count — a phrase search is never counted, and an unnarrowed corpus past the threshold is not. Walk with `after`/`before` instead, which needs no total. |
| `id` | `string \| string[]` | no | Name records by id — repeat for more than one, up to 100. The answer is the named records that exist in this project, of any type (or of `tableKey`, when one is sent), in the standard row shape; an id that names nothing here is simply absent, never an error, so a caller holding ids that may have been deleted resolves the survivors in one read. ⛔ It is a LOOKUP, not a query: refused beside `q`, `mode=semantic`, `sort`, `after`, `before`, `page`, `key` and every narrowing (`field`, `term`, `owner`, `status`, `createdAfter`, `createdBefore`). The rows come back ordered by id, never paged: `paging` and both cursors are null. |
| `key` | `string` | no | The record of `tableKey` whose NATURAL KEY is exactly this — equality, case and all. Needs `tableKey`: a natural key is unique only within one. At most one record for a project-owned type; for a person-owned type one per owner, so send `owner` as well to get the one. Use `q` to find a record by PART of a name; this is for a key the caller already holds (a pasted URL, an external id). Surrounding whitespace is trimmed, as it is from the stored key. Refused beside `id` and `mode=semantic`. |
| `fields` | `string \| string[]` | no | Fields whose values each row carries in `values`, by name — repeat for more than one, up to 32. A name is one top-level field the table declares, submitted or produced by its flow, whether or not it is a column; a dotted path is not read, and a stream field is refused (its events are not on a row). Needs `tableKey`, so never beside `subject=any`; works beside every other parameter, `id` included. Values come whole, never cut short; a field the record holds no value for is left out. A name the table does not declare is 422 `RECORD_PROJECTION_UNKNOWN_FIELD`, with the table's fields in the message. Omitted, rows carry no `values`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `contract` | `object \| null` | yes | Null on a typeless query — there is no one declaration to state. |
| `columns` | `object[]` | yes | The type's DECLARED columns, in declaration order. Empty on a typeless query. |
| `records` | `object[]` | yes | The page, in `ordering`. |
| `sort` | `string \| null` | yes | The `sort` this page was read with: the word sent, or the mode's own when none was. The column behind `ordering`. Null only when the project holds no record of any type, so nothing was ordered. |
| `ordering` | `"newest-first" \| "oldest-first" \| "arrival" \| "closeness"` | yes | What the rows are actually in. ⚠️ `arrival` is the typeless view's order. `closeness` is a ranking and cannot be walked. |
| `paging` | `object \| null` | yes | Null when this route DECLINED to count — an unnarrowed corpus over the count threshold, a literal `q` search, any meaning-based result, or records named by `id`. Null is a statement, not an omission. |
| `declinedCountReason` | `"corpus-too-large" \| "ranking-has-no-position" \| "search-not-counted" \| "named-not-counted" \| null` | yes | Why `paging` is null, when it is. ⛔ THEY ARE NOT THE SAME ABSENCE. `corpus-too-large` is a number this route could compute and declined to — narrowing brings it back. `ranking-has-no-position` is a number that does not exist. `search-not-counted` is a literal `q` search: the page and whether more exist are answered, the total never is — a filter, not a phrase, is what brings a total back. `named-not-counted` is a read by `id`, whose size is the caller's own list. A client drawing them the same way would offer to retry the ones that cannot be retried. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |
| `bounded` | `false \| object` | yes | Whether this page is every record that matches, or a ranking of at most `bound`. `false` on an exact-match list, which pages. On a meaning-based result: `semantic-only` when nothing narrowed it, `pushdown-cap` when the exact narrowings exceeded the pushdown cap and the ranking had to run first, `top-k` when every matching record was scored exactly but more matched than `topK` or than `limit`. Under a ranking there is nothing further down: narrow instead. |
| `explanation` | `object \| null` | yes | How a meaning-based result was produced — one row per clause that ran (the shorthand narrowings become exact legs, the phrase the semantic one), with the store, the index and the freshness of each, and what was pushed into the vector index. Null on an exact-match list. |

Each item of `columns`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The declared field's own name. |
| `label` | `string` | yes | What to write in the column heading. |
| `family` | `"text" \| "number" \| "date" \| "boolean" \| "reference" \| "term"` | yes | How to render the values under it. |
| `sortable` | `boolean` | yes | True only for the `date` family. |
| `source` | `"submission" \| "processed" \| "computed"` | yes | Which part of the type's contract the field comes from: submitted, a flow's output, or computed by Kipory. |
| `ref` | `object` | no | Present only when the type declares BOTH the field and what it points at. With only the field, the column draws plainly and promises no destination. |

Each item of `records`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id, and the open address. |
| `identity` | `object` | yes | What to CALL this row — its declared natural key where the type has one, a fragment of its own content where it does not, and its id where neither is readable. Carries which of the three it was. |
| `preview` | `string \| null` | yes | Null when the identity IS the record's own content. |
| `tableKey` | `string` | yes | This row's own type. Present on every row, including a single-type page. |
| `status` | `"pending" \| "processing" \| "ready" \| "failed" \| "deleting"` | yes | Where the record is in processing. |
| `statusError` | `string \| null` | yes | What went wrong, for a failed record. Null otherwise. |
| `failure` | `object \| null` | yes | How the record's latest processing failed and whose failure it was: its class, owner, whether processing it again could help, and the action that failed when one did. Null unless the record is `failed`, and for a failure from before this was recorded. |
| `processing` | `object` | yes | The record's processing history in two numbers, for deciding whether to send a failed record back with `record.enqueue-process`. |
| `owner` | `object` | yes | Whether this record belongs to the project or to one person. |
| `fields` | `object[]` | yes | One entry per column, in the same order. |
| `values` | `object` | no | The values of the fields named with `fields=`, keyed by name in the order asked; a field the record holds no value for is left out. Absent when no field was named. |
| `terms` | `object[]` | yes | Vocabulary the record is filed under, CAPPED on the wire. Compare `termCount` to learn whether this is all of them. |
| `termCount` | `integer` | yes | How many terms the record actually carries. ⛔ NOT `terms.length` once the cap bites. |
| `fileCount` | `integer` | yes | How many files are attached. Counted, never listed, per row. |
| `indexState` | `"current" \| "stale" \| "never"` | yes | Whether this record can be found by meaning right now. |
| `indexedAt` | `string \| null` | yes | When it was last indexed. Null means it never has been. |
| `createdAt` | `string` | yes | When the record arrived. |
| `updatedAt` | `string` | yes | When it last changed. |
| `version` | `integer` | yes | Its optimistic-concurrency token, for a later write. |
| `computing` | `boolean` | yes | True while a change to a related record is not yet in this record's computed values; they settle within seconds. Always false for a table with no computed fields. |

### `POST /v1/records`

Write one record by hand into a project, judged by its type's declared shape exactly as a flow's write is. An identical resend converges on the record already there (`outcome: "existed"`). When another record already holds the natural key, the default refuses 409; `onKeyTaken: "update"` replaces that record's `data` instead (an upsert, `outcome: "updated"`). To write or upsert many records in one change set, use `POST /v1/records/bulk`; to change one that exists, `PATCH /v1/records/{id}`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the id `POST /v1/projects` answers and every `/v1/projects/{nodeId}` path takes. |
| `tableKey` | `string` | yes | The table to write, as the project declares it. Must be a table this project defines. |
| `data` | `object` | yes | The submission — the record's `data`, judged against the shape the table's own type declares. What becomes of a key the type does not declare is therefore the TYPE's answer, not this route's: a strict type refuses it, an open one carries it through, and one that says nothing drops it silently. |
| `userId` | `string \| null` | no | Who owns the record. REQUIRED for a person-owned (`user`) type and refused for a project-owned (`project`, pool) one. Must be an active end user of this project. |
| `requestId` | `string` | no | Idempotency for a person-owned (`user`) write: two sends carrying one id converge on one record instead of two. A pool record needs none — an identical payload converges on one record. Omitted, every send is a new record. |
| `onKeyTaken` | `"refuse" \| "update"` | no | What to do when another record of this type already holds the natural key `data` carries. `refuse` (default): 409 `RECORD_NATURAL_KEY_TAKEN`. `update`: replace that record's `data` whole — an upsert; the record keeps its id, is re-indexed and does NOT re-run its flow (like `PATCH /v1/records/{id}`). A person-owned type matches within the owner named by `userId`. Refused 422 `RECORD_NATURAL_KEY_NOT_DECLARED` for a type that declares no natural key, and 409 `RECORD_ID_TAKEN` when no record holds the key but this `data`'s id belongs to a record since edited to carry another one. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id, derived rather than minted. |
| `tableKey` | `string` | yes | The type written, echoed from the request. |
| `ownerScope` | `"user" \| "project"` | yes | Whose the row is, as the TYPE declares it — never as the request asked. |
| `userId` | `string \| null` | yes | The owner, or null for a pool record. |
| `status` | `"pending" \| "processing" \| "ready" \| "failed" \| "deleting"` | yes | The record's status as it stands. With `outcome: "created"` that is where the type starts a record: one that binds a processing flow is born pending and handed to the queue; one that binds none is ready the moment it is written and is never enqueued. With `outcome: "existed"` it is the CURRENT status of the record this request converged onto, which may be anywhere in its lifecycle. |
| `outcome` | `"created" \| "existed" \| "updated"` | yes | `existed` means the derived id was already present — a converging resend, reported as the success it is; nothing was overwritten. `updated` answers only `onKeyTaken: "update"`: another record held the natural key, and its `data` was replaced by this one's — `id` is that record's. |
| `queued` | `boolean` | yes | Whether processing was handed off. False for a flow-less type (there is nothing to run), false for a converging resend onto a record that is already past pending, and false for an upsert that updated (an update re-indexes, it does not re-run). |

### `GET /v1/records/{id}`

One record, whole: its `data`, what its flow derived, its terms, files and links, its index state and its `version` (the lock a `PATCH` sends back), with its table's contract. To read many records, `GET /v1/records`; to walk one relation from it with filters and paging, `GET /v1/records/{id}/links/{relationKey}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id. Derived from its content at creation, not minted — and NOT re-derived by an edit, so an edited record keeps the id its original content produced. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the record belongs to — its node id, the value `project` takes on `GET /v1/records`. `/v1/records/{id}` names no project, so a client that opened the id under one checks it here. |
| `record` | `object` | yes | The record itself — its identity, its declared fields in the type's own order, its terms, its files and where it stands in the index. |
| `contract` | `object \| null` | yes | What the record's TYPE declares, which the record cannot say about itself. Null when the type is gone from under the record. |
| `pendingRun` | `"queued" \| "unqueued" \| "unreadable" \| null` | yes | For a `pending` record whose type binds a processing flow, whether a run is coming: `queued` when a processing job is waiting or running for it; `unqueued` when none is, so nothing will process it until someone asks (`POST .../reprocess` accepts it); `unreadable` when the queue could not be read. Null for any other record. |

### `PATCH /v1/records/{id}`

Correct one record: send its `version` and either `data` (the document whole — keys left out are removed) or `merge` (only the keys that change; `null` removes one). The result is judged by the type's shape and natural key. The record keeps its id and is re-indexed; its flow does not re-run (`POST /v1/records/{id}/reprocess` does). To change many records in one change set — a backfill — use `POST /v1/records/bulk`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id. Derived from its content at creation, not minted — and NOT re-derived by an edit, so an edited record keeps the id its original content produced. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The record's `version` as you read it (every list row and detail carries it). The write is refused 409 `RECORD_VERSION_STALE` if the record has moved since — including by a run that finished. |
| `data` | `object` | no | The record's `data`, WHOLE — what the record should now say. Keys you leave out are removed. Send this or `merge`, not both. |
| `merge` | `object` | no | Only the top-level keys that change: each one present replaces the current value, and `null` removes the key. Keys you leave out keep their values. Send this or `data`, not both. |
| `requestId` | `string` | no | Correlates this write with the log line it produced. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record, unchanged — a patch never re-mints it. |
| `tableKey` | `string` | yes | Its type, echoed. |
| `version` | `integer \| null` | yes | The row's version AFTER this write, measured by re-reading it; the next patch's `version`. Null when it could not be read — re-open the record before saving again rather than reusing the version you sent. |
| `status` | `"pending" \| "processing" \| "ready" \| "failed" \| "deleting"` | yes | Its processing state, which this write did not change: a patch re-indexes but never re-runs. `derived` therefore still describes the content as it was, until something re-runs the flow. |
| `reindexed` | `boolean` | yes | Whether a vector projection was enqueued. False for a type nothing indexes; true does not mean the points are written yet. |

### `DELETE /v1/records/{id}`

Delete one record and everything derived from it (terms, links, files it produced, vector points). Answers `deleted: true` with `outcome`: `removed` when it is gone, `draining` when a flow was running over it — it is marked `deleting` and removed at the run's next step boundary. Irreversible; ADMIN.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id. Derived from its content at creation, not minted — and NOT re-derived by an edit, so an edited record keeps the id its original content produced. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record this answers about, echoed. |
| `deleted` | `true` | yes | Always true: the record is gone, or is going (`outcome`). |
| `outcome` | `"removed" \| "draining"` | yes | `removed` — the row and everything derived from it are gone. `draining` — a flow was running over it, so it is marked `deleting` and is removed at the run's next action boundary. |

### `GET /v1/records/{id}/links/{relationKey}`

One record's links of one relation, one hop: which way each points, who produced it, its properties, and when it held — filtered by stamped link properties (`where`, ops eq ne in lt lte gt gte), optionally counted by one (`count`), ordered by a declared property or the stable key, and paged on `after`. For every link of the project as rows, use `GET /v1/links?project=`; to state or retract a curated link, `POST` or `DELETE` on this path.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record whose links to read. |
| `relationKey` | `string` | yes | The relation's KEY, not its id — relations are addressed by the stable key you chose when creating the relation. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `direction` | `"outgoing" \| "incoming" \| "either"` | no | Which way the links point, relative to this record. IGNORED for a symmetric relation. |
| `limit` | `integer` | no | How many links to return, 50 by default and at most 500, per page — walk further with `after`. |
| `includeExpired` | `boolean` | no | Include links that have since been retracted. Off by default. |
| `orderBy` | `string` | no | Order by one of the relation's declared link properties. IGNORED when the relation declares none — read `orderedBy` on the response to see which ordering actually ran. |
| `orderDirection` | `"asc" \| "desc"` | no | Which way to sort. Only meaningful alongside `orderBy`. |
| `where` | `string \| string[]` | no | Narrow to links whose STAMPED filter column matches. Each value is `<property>:<op>:<value>` — `tag:eq:childhood`, `since:gte:2019-01-01`, `tag:in:a,b` — and the parameter is REPEATED to AND several clauses. `op` is one of eq, ne, in, lt, lte, gt, gte. `property` must be one of the relation's declared link filters (a table's link use names them in `element.filters`); any other name is 422 `LINK_FILTER_UNDECLARED`. The value is typed by the filter's column: a date filter takes an ISO instant, a number filter a number, a boolean `true`/`false`; a value that cannot be typed is 422. `ne` matches a link that CARRIES the property with another value — a link without it is unstamped and is not returned. Retracted links are out unless the read's history switch is on. While a declaration change is restamping the relation, clauses resolve against the map the rows are stamped for. |
| `count` | `string` | no | Group this record's links of the relation by ONE declared link filter and answer `counts: { value → n }` over the same links `where` and the history switch select and independent of `limit`. An undeclared name is 422 `LINK_FILTER_UNDECLARED`. Links that lack the property are not counted under any key. |
| `after` | `string` | no | The page after the one that answered this `nextCursor` — pass it back unchanged, with the same direction, ordering and filters. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relationKey` | `string` | yes | The key of the relation these links belong to. |
| `links` | `object[]` | yes | The record's links under that relation. |
| `truncated` | `boolean` | yes | True when more links exist than this page holds. Usually `nextCursor` walks to them; under `orderBy` a read stops at a scan ceiling, and `truncated` with a null `nextCursor` says the ceiling cut it — order by the stable key to walk everything. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the next page; null on the last reachable page. |
| `prevCursor` | `string \| null` | yes | Always null: a traversal walks forward only. To go back, read again from the first page (no `after`). |
| `paging` | `null` | yes | Always null: a traversal is never counted — `count=` groups links by a property instead, and `truncated` says whether more exist. |
| `orderedBy` | `object` | yes | Which ordering ACTUALLY ran, so an ignored `orderBy` is visible. |
| `counts` | `object \| null` | yes | `{ value → n }` for the `count` filter, or null when none was asked. Keys are the stamped values as strings — an instant as ISO, a number or boolean as its text. Counted over every link in scope, never just the page. Holds at most 500 values, the largest counts first; `countsTruncated` says when there were more. Links without the property are in no group. |
| `countsTruncated` | `boolean` | yes | True when `counts` holds only the 500 largest groups because the links carried more distinct values. False when every value is present, or when no `count` was asked. |

Each item of `links`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `peerRecordId` | `string` | yes | The record at the far end of this link. |
| `direction` | `"outgoing" \| "incoming"` | yes | Which way this link points, relative to the record you asked about. |
| `origin` | `"field" \| "join-record" \| "curated"` | yes | Which kind of producer made this link — `field`, `curated` or `join-record`, spelled as the relation's own `producer` is. The relation's own producer says how links of it COULD come to exist; this says how this one did. |
| `producerKey` | `string` | yes | Who or what is responsible for this link — `curated:user:<id>`, `curated:flow:<label>`, `field:<Type>.<field>`, or a join type's key. A curated link can only be retracted by the actor that asserted it. |
| `properties` | `unknown` | no | The link's own properties, or null when the relation declares none. |
| `validFrom` | `string` | yes | When this link was asserted. |
| `validTo` | `string \| null` | yes | When it was retracted, or null while it still holds. Only ever non-null when you asked for expired links. |
| `matchedBy` | `string \| null` | yes | Which producer's row satisfied your `where` clauses — its `producerKey`. A symmetric pair asserted by two producers with different property values is two rows, and a clause returns the one that matched; this says which. Null when no `where` was sent. |

### `POST /v1/records/{id}/links/{relationKey}`

State a curated link of this relation from this record to `targetRecordId`, with the relation's declared properties. EDITOR on BOTH records, and a far end the caller cannot read is refused exactly like one that does not exist. Only a `curated` relation accepts a hand-stated link — links of `field` and `join-record` relations are produced from record data. To read one record's links, `GET` on this path; for every link of the project, `GET /v1/links?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record the link is being asserted FROM. |
| `relationKey` | `string` | yes | The relation's KEY, not its id — relations are addressed by the stable key you chose when creating the relation. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `targetRecordId` | `string` | yes | The record at the other end of the link being asserted. |
| `properties` | `object` | no | The link's properties, matching what the relation declares. Sending any at all is refused outright when the relation declares none. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `linkId` | `string` | yes | The link that now stands. |
| `outcome` | `"asserted" \| "unchanged"` | yes | `asserted` — a new link, or a retracted one stated again. `unchanged` — it already stood, so nothing moved and its start time was deliberately left alone. |
| `revived` | `boolean` | yes | True when this brought back a link that had been retracted. It gets a NEW validity window rather than reopening the old one. |

### `DELETE /v1/records/{id}/links/{relationKey}/{peerRecordId}`

Retract the curated link this caller stated between the two records: it EXPIRES (its author and assertion time survive, readable with `includeExpired`) rather than being erased. Only the actor who asserted a link can retract it. To state one, `POST /v1/records/{id}/links/{relationKey}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record the link is being asserted FROM. |
| `relationKey` | `string` | yes | The relation's KEY, not its id — relations are addressed by the stable key you chose when creating the relation. |
| `peerRecordId` | `string` | yes | The record at the OTHER end of the link to retract. Retracting removes one link, not every link of this relation on the record. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The link that was retracted. |
| `deleted` | `true` | yes | Always `true`: the link no longer holds. See `retracted` for what that means here. |
| `retracted` | `true` | yes | Always `true`. The link is EXPIRED, not deleted — who asserted it and when both survive, and it can be read again with `includeExpired`. |

### `GET /v1/records/{id}/processing-stream`

Watch one record's processing live, as Server-Sent Events: a `snapshot` of where it stood when you connected, a `status` frame per transition (`pending`, `processing` with the action now starting, `ready`, `failed` with why), then `done`. A failed run is a `status` frame followed by a clean `done` — read the status, not the close. To read the record's result afterwards, `GET /v1/records/{id}`.

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `snapshot`, `status`, `error`, `close`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id, as returned when it was created or listed. |

**Response `200`** (first frame shape, when declared)

One of 4 shapes:

Shape 1, with `recordId`, `status`, `statusError`, `statusUpdatedAt`, `at`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `recordId` | `string` | yes | The record being watched. |
| `status` | `"pending" \| "processing" \| "ready" \| "failed" \| "deleting"` | yes | Where the record stood WHEN YOU CONNECTED — the starting point, not a live tick. |
| `statusError` | `string \| null` | yes | Why it failed, when it has. Null in every other state. |
| `statusUpdatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `at` | `integer` | yes | When the server emitted this frame, in unix milliseconds. For correlating logs, not for ordering. |

Shape 2, with `status`, `at`, `requestId`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `status` | `"pending" \| "processing" \| "ready" \| "failed" \| "deleting"` | yes | The record's new state. ⚠️ A record FAILING is one of these frames followed by `done` — the STREAM completed fine, so do not read a clean close as a successful run. |
| `actionId` | `string` | no | Id of the action now starting. Present only while processing is under way. |
| `error` | `string` | no | Why it failed. Present only on the failing frame. |
| `at` | `integer` | yes | When the publisher emitted this frame, in unix milliseconds. For correlating logs. |
| `requestId` | `string` | yes | The request that started this processing run, for correlation. |

Shape 3, with `code`, `message`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"CLIENT_TOO_SLOW" \| "INTERNAL"` | yes | A TRANSPORT fault, not a record failure — the connection broke. `CLIENT_TOO_SLOW` means you were not reading fast enough. Reconnect and take the snapshot again. |
| `message` | `string` | yes | What went wrong, in prose. |

Shape 4, with `type`, `reason`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"close"` | yes | Always `close`. The server is ending the stream deliberately — this is an orderly goodbye, not a fault. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter. |

### `POST /v1/records/{id}/reprocess`

Re-run the record's processing flow from a clean slate: its derived output, generated files, vocabularies and vector points are produced again. It removes the record's term assignments before the run, and a failed run does not bring them back. Its processed fields and generated files are replaced only when the run succeeds, and the record is indexed again then; a failed run keeps them. A successful run removes each generated file the record held before it that the run did not attach again and its processed fields do not name, even when it made no new one. Answers 202 once a worker has been asked; the record reads `pending` until it runs. The run is charged like the record's first processing, with nothing reused from the cache, and so is every run it queues. An edit (`PATCH`) never re-runs the flow — this is the gesture that does.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id. Derived from its content at creation, not minted — and NOT re-derived by an edit, so an edited record keeps the id its original content produced. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record a run was queued for, echoed. |
| `status` | `"pending"` | yes | Where the record now sits, waiting for the worker to claim it. |
| `mode` | `"full"` | yes | An explicit re-run is always a CLEAN SLATE — prior output, generated files, vocabularies and vector points are swept and regenerated, and the action cache is bypassed. ⚠️ Vocabularies included: a filing set by hand is swept with the rest, and the resolver decides again. ⚠️ Charged like the record's first processing, every model call included. An edit runs no flow at all, so it is not a cheaper version of this. |

### `GET /v1/records/{id}/stream/{field}`

One record's events on one `stream` field (a field its type declares with a `stream` use), newest first, within a window bounded by the field's retention, paged on `after`. A stream's events are rows appended by a flow's `record.append` action — no route writes them. The record's own `data` never holds a stream field; read it with `GET /v1/records/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record whose stream to read. |
| `field` | `string` | yes | The stream field — a field of the record's type that carries a `stream` use. Any other field is 422 `STREAM_FIELD_UNDECLARED`. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `from` | `string` | no | Oldest instant to include (ISO 8601). Omitted, the window opens at the field's retention cutoff (`now − retainDays`), or at the beginning of time for an unbounded stream — `bounded` on the response says which. A `from` older than the retention cutoff is 422 `STREAM_WINDOW_BEYOND_RETENTION`: those events may already be gone. |
| `to` | `string` | no | Newest instant to include (ISO 8601). Omitted, now — an event dated in the future is not returned until its time comes. |
| `where` | `string \| string[]` | no | Narrow to events whose STAMPED filter column matches. Each value is `<property>:<op>:<value>` — `action:eq:opened`, `score:gte:3`, `action:in:a,b` — and the parameter is REPEATED to AND several clauses. `op` is one of eq, ne, in, lt, lte, gt, gte. `property` must be one of the field's declared stream filters (the stream use names them in `filters`); any other name is 422 `STREAM_FILTER_UNDECLARED`. The value is typed by the filter's column: a date filter takes an ISO instant, a number filter a number, a boolean `true`/`false`; a value that cannot be typed is 422 under the same code. `ne` matches an event that CARRIES the property with another value — an event without it is unstamped and is not returned. While a declaration change is restamping the field, clauses resolve against the map the rows are stamped for. |
| `latest` | `"0" \| "1" \| "true" \| "false"` | no | `1` to return only the NEWEST event within the window (at most one), with `nextCursor: null`. `limit`, `after` and `before` are ignored. |
| `limit` | `integer` | no | Page size, 50 by default and at most 200. Events come newest first; follow `nextCursor` for older ones. |
| `after` | `string` | no | The page of OLDER events past this row — pass back the `nextCursor` you were given, an opaque keyset over `(at, eventId)`. A cursor this read did not issue is 400. Refused together with `before`. |
| `before` | `string` | no | The page of NEWER events before this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `events` | `object[]` | yes | The record's events on this field, newest first. |
| `bounded` | `object` | yes | The time bound the read ran under. Only this says whether older events exist that were not in reach. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the next page of OLDER events; null when this page was the last within the bound. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page of NEWER events; null on the newest page. |
| `paging` | `null` | yes | Always null: a stream is never counted. `bounded` states the window, and the walk is exact. |

Each item of `events`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The event's own time (ISO 8601) — what the stream is ordered and windowed by, never the time it was appended. |
| `eventId` | `string` | yes | The event's identity within the record: caller-supplied at append, or a hash of `(recordId, at, payload)`. Unique with `at`. |
| `payload` | `object` | yes | The event object as appended, its `at` property included. |

### `PUT /v1/records/{id}/vocabularies/{vocabularyKey}`

Set the terms one record is filed under on one vocabulary, replacing what it carried there (an empty list clears it). A hand filing is swept by the next `reprocess`, which lets the resolver decide again. To file many records, run a flow; to manage the vocabulary itself, `POST /v1/vocabularies/{id}/terms`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id. Derived from its content at creation, not minted — and NOT re-derived by an edit, so an edited record keeps the id its original content produced. |
| `vocabularyKey` | `string` | yes | The vocabulary whose assignment on this record is being replaced. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `termIds` | `string[]` | yes | Every term this record should carry on this vocabulary, replacing what it carries now. Duplicates collapse. Empty CLEARS the vocabulary — a real instruction, not a no-op. A `one`-cardinality vocabulary accepts at most one id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record that was filed. |
| `terms` | `object[]` | yes | Every term the record carries now, across every vocabulary. |

Each item of `terms`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `vocabularyKey` | `string` | yes | Key of the vocabulary the term belongs to. |
| `key` | `string` | yes | The term's CANONICAL key — alias-resolved ONE hop, so a record filed under a merged-away term shows its merge target and agrees with what a filter on it would match. |
| `label` | `string` | yes | The term's own display name. |
| `status` | `"active" \| "candidate" \| "archived"` | yes | Where the term stands in its vocabulary. `candidate` is a term a `mint: candidate` vocabulary coined for this record and no one has admitted yet; only that vocabulary's own proposals reuse it. `archived` is a retired term the record still carries. Like `key`, it is the merge target's when the term was merged away. |

### `POST /v1/records/bulk`

Write up to 500 records of one project in one change set: updates by id (`{id, version, data | merge}` — a backfill is one `merge` per record) and creates (`{tableKey, data}`, with `onKeyTaken: "update"` to upsert by natural key — an import is one item per row). Every item is judged by the rules of `PATCH /v1/records/{id}` or `POST /v1/records` first; if any is refused, nothing is written and the 422 names each refused item (`details.issues[].path` = `items.<n>`). A record that moves between that judgement and the write answers 409 `RECORD_VERSION_STALE` with the same `details.issues`, nothing written: re-read those items and resend. `validateOnly: true` answers that verdict and what each item would do, writing nothing. Updates re-index and never re-run a flow; creates enqueue their table's flow. For one record, use the single routes.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the id `POST /v1/projects` answers and every `/v1/projects/{nodeId}` path takes. |
| `validateOnly` | `boolean` | no | Judge every item and write nothing: the answer is the verdict, with what each item would do. |
| `items` | `object[]` | yes | 1 to 500 writes, applied together or not at all. A record may appear once. A larger batch is several bulks. |

**Response `200`**

One of 2 shapes:

Shape 1, with `items`, `created`, `updated`, `unchanged`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `items` | `object[]` | yes | One entry per item, in the order sent. |
| `created` | `integer` | yes | How many records were created — counted over writes, so an upsert row a later row repeated the key of is not counted twice. |
| `updated` | `integer` | yes | How many records were changed. |
| `unchanged` | `integer` | yes | How many writes changed nothing (`existed` or `unchanged`). |

Each item of `items`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `index` | `integer` | yes | The item's position in `items`. |
| `id` | `string` | yes | The record written or converged on. |
| `outcome` | `"created" \| "existed" \| "updated" \| "unchanged"` | yes | `created` — a new record. `existed` — an identical create converged on the record already there. `updated` — an update, or an upsert that found its key, changed the record's `data`. `unchanged` — the edit left `data` as it was, so nothing was written. |
| `version` | `integer \| null` | yes | The record's `version` after the bulk — the next edit's lock. Null when it could not be re-read. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD do. Present when every item was judged, which is not the same as `ok`. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `POST /v1/records/query`

Ask a project's records one question: a conjunction of clauses — `field` (`eq` `lt` `lte` `gt` `gte` `in`), `term`, `link` (with link filters, a count and one hop of peer clauses), `stream`, and at most one `semantic` — in the grammar a flow's `record.query` action authors, run by the same executor. `tableKeys` in place of `tableKey` ranks several tables on one search model in one answer, each score naming its record's table; this route reads as every user, so a table that keeps each user's records apart refuses the whole query. `fields` names the columns each row carries; empty means all of them. Leave `clauses` out to list the table's records, newest first. `linked` brings each record's linked records with it, each in this same row shape — the option a flow's `record.query` takes; a `linked` refusal is 422 `VALIDATION_FAILED` with its rule in `details.reason`. Writes nothing. For a page with the table's declared columns and a filter the address can spell, `GET /v1/records` is the simpler read.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the id `POST /v1/projects` answers and every `/v1/projects/{nodeId}` path takes. |
| `tableKey` | `string` | no | The table the question is asked of; exactly one of `tableKey` and `tableKeys` is given. Every clause is validated against this table's `uses`: a field needs `filter`, a vocabulary `vocabularies`, a relation `link`, a stream field `stream`, and a semantic clause a `search` use somewhere on the table. |
| `tableKeys` | `string[]` | no | Several tables to rank in one answer, 2 to 8, in place of `tableKey`. They must use one search model (`QUERY_TABLES_MODEL_MISMATCH`), every clause must be answerable by each (`QUERY_CLAUSE_UNROUTED` names the table that cannot), and the query must hold a `semantic` clause (`QUERY_TABLES_NEED_SEMANTIC`). The answer is ordered by meaning, has no cursor, and each entry of `scores` names its record's table. This route reads as every user, so a table that keeps each user's records apart refuses the whole query. |
| `clauses` | `object[]` | no | Every returned record satisfies ALL of these — a conjunction, never an OR. Left out, the answer is the table's records, newest first, paged by `after` / `before` (an empty list is refused). Kinds: `field` (a slot column) `{ kind, field, op, value }` with `op` one of eq/lt/lte/gt/gte/in, `in` taking a list; `term` (a vocabulary assignment) `{ kind, vocabularyKey, slug }`, `slug` being the term's key; `link` (a relation) `{ kind, relation, direction?, where?, count?, peer? }` — `direction` outgoing/incoming/either, `where` stamped link filters `{ property, op, value }`, `count` `{ op, n }`, and `peer` one hop of `field`/`term` clauses, and at most one `semantic`, on the far record; `stream` (event rows) `{ kind, field, window?, where?, count? }` — exists/none/count inside a window; and at most one `semantic` `{ kind, field?, text, topK?, minScore?, passage? }` (a phrase ranked by meaning; `minScore` leaves out records scoring below it, `passage` asks for the text of each record's best-matching part). A clause the type's `uses` did not route is 422 `QUERY_CLAUSE_UNROUTED`, with the remedy in the message. |
| `limit` | `integer` | no | How many records come back at most. For an exact-only query this is the page size; with a semantic clause the clause's own `topK` bounds the ranking and this caps what is returned of it. |
| `order` | `object` | no | How the answer is ordered. Omitted: closest first when the query has a `semantic` clause of its own, newest created first otherwise. `field` orders by one of the type's own date fields carrying a `filter` use, and an exact-only query pages by it; beside a `semantic` clause it re-orders the ranking, which stays bounded. A cursor belongs to the order that minted it. |
| `fields` | `string[]` | no | Which of the table's columns each row's `fields` list carries, by name. Empty or omitted: every column. The entries keep the table's declared order, and the rest of the row, `scores` and a `passage` are unchanged. A name that is not a column of the table is 422 `RECORD_PROJECTION_UNKNOWN_FIELD`, with the columns in the message. With `tableKeys`, a name any of the tables has as a column; each row carries the named columns its own table has. |
| `linked` | `object` | no | The records each answered record is linked to, brought with it under `linked.<name>` — the option a flow's `record.query` takes. Per linked read: `relation`, `direction` (`outgoing` default, `incoming`), `table` when the relation reaches several, `fields` (the fields each linked record carries in `values`; absent or empty is all of them, `["id"]` none), and for a linked read that brings a list `limit` (required), `sortField`, `order` and `onMore`; one more level under `linked`. Linked records are read across every owner, as the answer's own records are, and carry no vocabulary terms (`include.vocabularies` is refused). Each refusal below is 422 `VALIDATION_FAILED` with its rule in `details.reason`: an linked read the project's relations cannot answer (a `LINKED_*` rule, before anything is read); a list longer than its `limit`, `RECORD_LINKED_HAS_MORE`, unless `onMore: "stop"`, which keeps the first `limit` and marks the record in `linkedMore`; more linked records than one read may bring, `RECORD_LINKED_TOO_MANY`. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `records` | `object[]` | yes | The records satisfying every clause — in keyset order (newest first) for an exact-only query, in closeness order when a semantic clause ran. The list route's row shape, without `values`, carrying `linked` when the query names it. On a query of several tables (`tableKeys`) each row carries its own table's fields, and `scores` names the table of the row at each position. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |
| `paging` | `null` | yes | Always null: a query is never counted. An exact-only answer is walked by `after` / `before`; a ranking has no position to count from. |
| `bounded` | `false \| object` | yes | `false`: every record satisfying every clause is in reach. Otherwise the answer is a ranking of at most `bound` records — because the semantic clause ran alone (`semantic-only`); because the exact intersection exceeded the pushdown cap and the semantic clause had to run first (`pushdown-cap`); or because every satisfying record WAS scored exactly but more than `topK` — or than the request's `limit` — satisfied, so only the closest `bound` are returned (`top-k`); or because a link's far end was matched by meaning, so only records linked to the closest `bound` peers are in reach (`peer-top-k`). Under any reason, `bound` is the request's `limit` when that is the smaller number. Never omitted. |
| `explanation` | `object` | yes | How the answer was produced: one row per clause that ran, in the order it ran, and what was pushed into the vector store. STATED on every response. |
| `emptiedBy` | `integer` | no | Present when an exact clause's leg emptied the intersection: its index in `clauses`. No later leg ran and the vector index was not touched, so `records` is empty by that clause's doing and not by the ranking's. A `semantic` clause's index is named when its `minScore` removed every record it ranked. |
| `scores` | `object[]` | no | Present when the query's own `semantic` clause ranked: one entry per returned record, in the order of the records. Absent on a query with no `semantic` clause of its own. |

Each item of `records`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id, and the open address. |
| `identity` | `object` | yes | What to CALL this row — its declared natural key where the type has one, a fragment of its own content where it does not, and its id where neither is readable. Carries which of the three it was. |
| `preview` | `string \| null` | yes | Null when the identity IS the record's own content. |
| `tableKey` | `string` | yes | This row's own type. Present on every row, including a single-type page. |
| `status` | `"pending" \| "processing" \| "ready" \| "failed" \| "deleting"` | yes | Where the record is in processing. |
| `statusError` | `string \| null` | yes | What went wrong, for a failed record. Null otherwise. |
| `failure` | `object \| null` | yes | How the record's latest processing failed and whose failure it was: its class, owner, whether processing it again could help, and the action that failed when one did. Null unless the record is `failed`, and for a failure from before this was recorded. |
| `processing` | `object` | yes | The record's processing history in two numbers, for deciding whether to send a failed record back with `record.enqueue-process`. |
| `owner` | `object` | yes | Whether this record belongs to the project or to one person. |
| `fields` | `object[]` | yes | One entry per column, in the same order. |
| `terms` | `object[]` | yes | Vocabulary the record is filed under, CAPPED on the wire. Compare `termCount` to learn whether this is all of them. |
| `termCount` | `integer` | yes | How many terms the record actually carries. ⛔ NOT `terms.length` once the cap bites. |
| `fileCount` | `integer` | yes | How many files are attached. Counted, never listed, per row. |
| `indexState` | `"current" \| "stale" \| "never"` | yes | Whether this record can be found by meaning right now. |
| `indexedAt` | `string \| null` | yes | When it was last indexed. Null means it never has been. |
| `createdAt` | `string` | yes | When the record arrived. |
| `updatedAt` | `string` | yes | When it last changed. |
| `version` | `integer` | yes | Its optimistic-concurrency token, for a later write. |
| `computing` | `boolean` | yes | True while a change to a related record is not yet in this record's computed values; they settle within seconds. Always false for a table with no computed fields. |
| `linked` | `object` | no | The records this record is linked to, one key per linked read of the query's `linked`: a record (absent when there is none) for a linked read that brings one, a list (empty when none) for a linked read that brings several. Each is a record of its own table in this same shape, its `values` holding the fields the linked read names. Present only when the query names `linked`. |
| `linkedMore` | `object` | no | The `linked` lists cut at their `limit` under `onMore: "stop"`, by linked read name. Absent when none was cut. |

Each item of `scores`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id — one of `records`. |
| `tableKey` | `string` | no | Present on every entry of a query that named several tables (`tableKeys`): the table the record at this position belongs to. Rows of different tables carry different fields; this tells them apart. |
| `score` | `number` | yes | How close the record's closest part is to the query: a cosine similarity, on the same scale for every table. Higher is closer; a poor match can be negative. |
| `passage` | `object` | no | The record's best-matching part, when the clause asked (`passage: true`) and the record is indexed in more than one part. |
| `passageStale` | `true` | no | Present in place of `passage` when the record changed after it was last indexed, so the part that was scored can no longer be quoted. |

### `POST /v1/views/{key}/preview`

Read one page of a view as a chosen member of the project (`asUserId`), or as the project for a view that reads no person's records, with its params, a cursor and a limit. Answers the page, the JSON Schema of one item, every table the read reaches and the clauses it ran with params and its base merged in. Writes, charges and runs nothing. A view endpoint answers the same page to a caller; `record.view` reads it in a flow. Reads the applied view: to try an edit, plan the document first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The view's key in the project document. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project whose view to read — its node id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `asUserId` | `string` | no | The person to read as; a project view needs none. |
| `params` | `object` | no | A value for each param, by name. |
| `after` | `string` | no | A `nextCursor` from an earlier preview, for the page after it. |
| `before` | `string` | no | A `prevCursor` from an earlier preview, for the page before it. |
| `limit` | `integer` | no | Rows in the page; the view's page size when absent. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `items` | `object[]` | yes | The page's rows, each in the view's item shape. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |
| `paging` | `null` | yes | Always null: a view's page is never counted; walk it by `after` / `before`. |
| `itemSchema` | `object` | yes | The JSON Schema of one row. |
| `tables` | `string[]` | yes | Every table the read reaches: its own, its sets', its base's and linked ones. |
| `clauses` | `object[]` | yes | The clauses the read ran, with params and the base merged in: its literal clauses, then each set it compared with. |

Each item of `clauses`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"field"` | yes | A condition on a field the type routes with `filter`. |
| `field` | `string` | no | A field of the table with a `filter` use, or `id` (with `eq`, `in` or `not-in`). |
| `op` | `"eq" \| "lt" \| "lte" \| "gt" \| "gte" \| "in" \| "not-in"` | no | Each operator takes one value; `in` and `not-in` take a list. `not-in` keeps records with no value in the field. |
| `value` | `string \| number \| boolean \| string \| number \| boolean[]` | no | One value, or a list for `in` and `not-in`; dates as ISO 8601. |
| `vocabularyKey` | `string` | no | A vocabulary the table lists in `uses.vocabularies`. |
| `slug` | `string` | no | The term, by slug. An alias resolves to its canonical term, one hop, as every term read does. |
| `relation` | `string` | no | A relation a `link` use declares, from or to this table. |
| `direction` | `"outgoing" \| "incoming" \| "either"` | no | Which end the record is on; default `outgoing`. |
| `where` | `object[]` | no | Clauses on the relation's declared link filters (`link.element.filters`), ANDed. |
| `count` | `object` | no | How many matching links to require; default at least one. |
| `peer` | `object[]` | no | Clauses on the linked record, one hop away. |
| `window` | `object` | no | The time window on the event's own `at`. Omitted or open-ended: bounded to the stream's retention, and the explanation says so. |
| `text` | `string` | no | The phrase to resemble. Exactly one of a phrase and a record (`likeRecordId`) is given. |
| `likeRecordId` | `string` | no | A record to resemble instead of a phrase; it is left out. |
| `likeTableKey` | `string` | no | The table of the record to resemble, if not the queried one. |
| `topK` | `integer` | no | How many to rank when this clause is the only one, or when it runs first above the pushdown cap. Default 50. |
| `minScore` | `number` | no | Leave out records scoring below this, from −1 to 1. |
| `passage` | `boolean` | no | `true` also returns the text of each record's best-matching part. |
| `set` | `object` | no | The values of one field across another view's rows, read in the same statement. Empty values are left out of the set. |
