<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Tables

A table holds one kind of the project's records — its shape, owner scope, vocabularies, natural key and processing flow. Owner scope and data-shape reference freeze once the first record exists; the name (key) can be renamed with its records (ADMIN).

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/tables`](#get-v1-tables) |  |
| `POST` | [`/v1/tables`](#post-v1-tables) |  |
| `GET` | [`/v1/tables/{id}`](#get-v1-tables-id) |  |
| `PATCH` | [`/v1/tables/{id}`](#patch-v1-tables-id) |  |
| `DELETE` | [`/v1/tables/{id}`](#delete-v1-tables-id) |  |
| `GET` | [`/v1/tables/{id}/queries`](#get-v1-tables-id-queries) |  |
| `POST` | [`/v1/tables/{id}/queries`](#post-v1-tables-id-queries) |  |
| `GET` | [`/v1/tables/{id}/queries/{key}`](#get-v1-tables-id-queries-key) |  |
| `PATCH` | [`/v1/tables/{id}/queries/{key}`](#patch-v1-tables-id-queries-key) |  |
| `DELETE` | [`/v1/tables/{id}/queries/{key}`](#delete-v1-tables-id-queries-key) |  |
| `POST` | [`/v1/tables/{id}/queries/{key}/preview`](#post-v1-tables-id-queries-key-preview) |  |
| `GET` | [`/v1/tables/{id}/selections`](#get-v1-tables-id-selections) |  |
| `POST` | [`/v1/tables/{id}/selections`](#post-v1-tables-id-selections) |  |
| `GET` | [`/v1/tables/{id}/selections/{key}`](#get-v1-tables-id-selections-key) |  |
| `PATCH` | [`/v1/tables/{id}/selections/{key}`](#patch-v1-tables-id-selections-key) |  |
| `DELETE` | [`/v1/tables/{id}/selections/{key}`](#delete-v1-tables-id-selections-key) |  |

### `GET /v1/tables`

List a project's tables, live and by id, with any `expand` sections that are cheap per row. The per-table scans (`embedding`, `vectorProgress`, `diagnostics`, `processingGaps`, `shape`) are refused here — ask `GET /v1/tables/{id}`. `GET /v1/bootstrap` carries every table in one snapshot with the rest of the project's configuration, and `GET /v1/projects/{nodeId}/document` carries them by key, in the form a document write takes back.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose tables to list. |
| `key` | `string` | no | Return only the table with this exact key. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: flowLabels, outputDefinition, contract, vocabularies, uses, restamp, migration. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `tables` | `object[]` | yes | Tables in the project, with any requested expansions. |

Each item of `tables`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Table id — the address for every table verb. |
| `dataTypeId` | `string` | yes | Type this table takes its data shape from. A reference — other tables, events and relations may use the same type, and renaming it does not break this reference. |
| `dataTypeKey` | `string` | yes | Current key of that type, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The table's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the type this table references. Edited with `definition` on `PATCH /v1/tables/{id}` or on the type itself: the same type either way, for everything that uses it. |
| `description` | `string \| null` | yes | This table's own description, separate from the type's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this table. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `owner` | `"user" \| "project"` | yes | Who owns records of this table. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user. |
| `sharing` | `boolean` | yes | Whether records can be shared with people and teams (`record.grant`). Always false on a `project` table. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What the table's fields are FOR, grouped by use — the one authored statement this table carries. `key` goes to the natural-key index, `filter` to indexed columns, `search` to the vector index, `stream` to the stream store, and `vocabularies` to the term vocabulary. A link is not stated here: it is stated on its relation (`from: <table>.<field>`). `searchable`, `relations`, `queryable`, `naturalKey` and the vocabulary links below are DERIVED and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: how the table is indexed for search (the profile, the chunking, what travels with each part), or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `owner`. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: links this table produces, or null when no field carries `link` and the table declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this table may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record; a refusal names the records that fail. |
| `computed` | `object \| null` | yes | Fields Kipory keeps from related records or the record itself, or null when none. Kept a few seconds after a change; a record shows `computing` meanwhile. |
| `computedFields` | `object \| null` | yes | DERIVED from `computed`, read-only: each computed field's kind and the type of its values. |
| `reprocessOn` | `object[] \| null` | yes | When related records join, leave or change, this table's processing flow runs again for the record. Null when never. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this table. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `shape` | `object \| null` | no | Present when `expand=shape` was requested: the table's processed shape and its records counted by the shape they hold. Null when the table binds no flow, or binds one the project does not hold. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the table binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces now: the table's processed fields. Present when `expand=outputDefinition` was requested; null when the table binds no flow. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `vocabularies` | `object[]` | no | The vocabularies this table surfaces, in order. Present when `expand=vocabularies` was requested; an empty array means the table surfaces none, which is not the same as the project having none. |
| `references` | `object` | no | Present when `expand=references` was requested: what the daily reference sweep found in this table's reference fields. |
| `referencedBy` | `object[]` | no | Present when `expand=references` was requested: every reference in the project that can name this table's records, and what deleting one does to the records holding it. Empty when nothing can name them. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, relation or vocabulary position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this table's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/tables/{id}`; an empty array means every declaration still holds. The `records` findings (records missing a required field) are left out when reading the records did not finish in time. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this table without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/tables/{id}`; always empty for a table that binds no processing flow. |
| `processing` | `object` | no | How many of this table's records wait for processing and how many are being processed now. Records are processed on the platform's shared worker slots, so how many run at once rises and falls with the load on them; a run's `queued` says what each one waited for. Present when `expand=processing` was requested on `GET /v1/tables/{id}`. |
| `computedState` | `object` | no | How the table's computed fields are kept. Present when `expand=computedState` was requested on `GET /v1/tables/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

### `POST /v1/tables`

Create a table that takes its data shape from an existing type. With `validateOnly: true` it answers whether the create would be refused, writing nothing. A table together with a new type, several tables at once, or a table together with the flow that processes it is one call to `POST /v1/projects/{nodeId}/document` (check it first with its `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the table. |
| `key` | `string` | yes | The table's key. A letter followed by letters and digits, like `Observation`, up to 64 characters. |
| `dataTypeId` | `string` | yes | Existing type in the same project that defines the table's data shape. A shape is always a type that already exists; a project document creates the type and the table in one apply. |
| `description` | `string \| null` | no | This table's own description, separate from the type's. |
| `flowId` | `string \| null` | no | Processing flow to bind. Supply one to have records processed on creation; omit or null to store them as submitted. |
| `owner` | `"user" \| "project"` | yes | Who owns records of this table: `user` for one person's own records, `project` for the project's shared content pool. Required — it is immutable once the table has records. |
| `uses` | `object` | no | What the table's fields are for, grouped by use (`key`, `filter`, `search`, `stream`, `vocabularies`, `join`). Omit for a table whose fields are stored with the record and read whole. A link is stated on its relation, not here. Every projection — `searchable`, `queryable`, `relations`, the natural key, the vocabulary links — is derived and cannot be sent directly. |
| `computed` | `object` | no | Fields Kipory keeps from related records (`rollup`, `lookup`) or the record itself (`formula`). Omit for none. |
| `reprocessOn` | `object[]` | no | Run the table's processing flow again for a record when its related records join, leave or change. Omit for never. |
| `sharing` | `boolean` | no | `true` lets each record be shared with people and teams (`record.grant`); they then read it as its owner does. A `user` table only. Omit for off. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `contractChanges` | `object[]` | no | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `permissions` | `object` | no | What the caller's role lets the write do. |
| `renames` | `object[]` | no | Present when the checked patch renames (a new `key`, `renameFields`, or a flow's `renameInputs` / `renameOutputs`): what the write would move, the expression candidates and how each is resolved, and every external caller it would break. Absent when it renames nothing. |
| `derived` | `object` | no | What the write WOULD compute and set in motion. Nothing here has happened. `staleVersion`, `writes`, `resolved` and `effects` are present whenever the patch got far enough to plan, and absent on a refusal its planner raised; the other members say when they appear. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "links-removed" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected" \| "recompute" \| "reference-policy" \| "shape-behind" \| "field-values-hidden"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `links-removed`: a dropped or re-pointed producer leaves stored links no declaration stands behind, and the link backfill removes them; `rows` counts the records whose processing (`reprocessOn` on a leave) read those links. Their computed values are recomputed, but their processing is not run again: reprocess one on purpose with `POST /v1/records/{id}/reprocess`. `records-invalid`: stored records that already did not fit their type before this change and still do not fit the changed one; nothing changes them, a write that replaces one must make it fit, and a merge is judged only on the fields it writes. A change that would make a fitting record unfit is refused (`TYPE_UNSAFE_FOR_TABLE`), never listed here. `reembed`: the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow or an API read leaves those fields out of those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. `recompute`: Kipory computes the table's computed fields for its stored records, in the background and at no charge. `reference-policy`: the change moves what deleting a record does to the stored records naming it — a stated `onTargetDelete`, or the default it falls back to when the field becomes required, becomes the table's key or the reference becomes `scope: lifecycle`; `rows` counts the records naming such a record directly today, and the message says what the delete did and now does, and the most one record has. Records a `delete` takes in turn by their own rules are not counted. It also appears when a reference stops saying `unresolved: allow`, so a write naming a record that does not exist is refused; `rows` is what the last reference sweep counted as naming no record. `shape-behind`: the change moves a table's processed fields, so its records processed before it hold the older shape until each is processed again; `rows` counts them exactly. They stay readable. Bring them all to the current shape with `POST /v1/record-reprocesses` (`scope: "not-current"`), or one with `POST /v1/records/{id}/reprocess`. `field-values-hidden`: the change removes or retypes a processed field, so a record's stored value for it is no longer answered: every value of a removed field, and of a retyped one each value whose JSON kind (text, number, boolean, list, object) the new type no longer allows. A retype that keeps the kind (a length limit, a set of allowed texts) hides nothing and states no such consequence: those values are answered as stored until the record is processed again. `rows` counts the records holding a value that is hidden; the message names the field. The values stay stored and are answered again if the change is undone before the record is processed again. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary" \| "query" \| "selection" \| "flow-input" \| "flow-output"` | yes | What is renamed. `flow-input` / `flow-output`: an input or an output of the flow at `path`, through `renameInputs` / `renameOutputs`. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type; for a flow's input or output, its old name. |
| `to` | `string` | yes | The new key; for a field, its new path; for a flow's input or output, its new name. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Table id — the address for every table verb. |
| `dataTypeId` | `string` | yes | Type this table takes its data shape from. A reference — other tables, events and relations may use the same type, and renaming it does not break this reference. |
| `dataTypeKey` | `string` | yes | Current key of that type, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The table's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the type this table references. Edited with `definition` on `PATCH /v1/tables/{id}` or on the type itself: the same type either way, for everything that uses it. |
| `description` | `string \| null` | yes | This table's own description, separate from the type's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this table. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `owner` | `"user" \| "project"` | yes | Who owns records of this table. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user. |
| `sharing` | `boolean` | yes | Whether records can be shared with people and teams (`record.grant`). Always false on a `project` table. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What the table's fields are FOR, grouped by use — the one authored statement this table carries. `key` goes to the natural-key index, `filter` to indexed columns, `search` to the vector index, `stream` to the stream store, and `vocabularies` to the term vocabulary. A link is not stated here: it is stated on its relation (`from: <table>.<field>`). `searchable`, `relations`, `queryable`, `naturalKey` and the vocabulary links below are DERIVED and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: how the table is indexed for search (the profile, the chunking, what travels with each part), or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `owner`. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: links this table produces, or null when no field carries `link` and the table declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this table may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record; a refusal names the records that fail. |
| `computed` | `object \| null` | yes | Fields Kipory keeps from related records or the record itself, or null when none. Kept a few seconds after a change; a record shows `computing` meanwhile. |
| `computedFields` | `object \| null` | yes | DERIVED from `computed`, read-only: each computed field's kind and the type of its values. |
| `reprocessOn` | `object[] \| null` | yes | When related records join, leave or change, this table's processing flow runs again for the record. Null when never. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this table. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `shape` | `object \| null` | no | Present when `expand=shape` was requested: the table's processed shape and its records counted by the shape they hold. Null when the table binds no flow, or binds one the project does not hold. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the table binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces now: the table's processed fields. Present when `expand=outputDefinition` was requested; null when the table binds no flow. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `vocabularies` | `object[]` | no | The vocabularies this table surfaces, in order. Present when `expand=vocabularies` was requested; an empty array means the table surfaces none, which is not the same as the project having none. |
| `references` | `object` | no | Present when `expand=references` was requested: what the daily reference sweep found in this table's reference fields. |
| `referencedBy` | `object[]` | no | Present when `expand=references` was requested: every reference in the project that can name this table's records, and what deleting one does to the records holding it. Empty when nothing can name them. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, relation or vocabulary position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this table's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/tables/{id}`; an empty array means every declaration still holds. The `records` findings (records missing a required field) are left out when reading the records did not finish in time. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this table without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/tables/{id}`; always empty for a table that binds no processing flow. |
| `processing` | `object` | no | How many of this table's records wait for processing and how many are being processed now. Records are processed on the platform's shared worker slots, so how many run at once rises and falls with the load on them; a run's `queued` says what each one waited for. Present when `expand=processing` was requested on `GET /v1/tables/{id}`. |
| `computedState` | `object` | no | How the table's computed fields are kept. Present when `expand=computedState` was requested on `GET /v1/tables/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |
| `warnings` | `object[]` | no | Present when the write removed something a use the platform only guessed may still read (`REMOVED_MAY_BE_USED`): each names the user and where. The write went through; check each by hand. |
| `renames` | `object[]` | no | Present when a PATCH changed `key`: the table renamed, the configuration references rewritten, the expression candidates and how each was resolved, and every external caller the rename breaks (`exposures`). Absent on an edit that renames nothing. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |

Each item of `contentFields`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Field name, as a projection would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `source` | `"submission" \| "processed" \| "computed"` | yes | Where the field comes from. `submission` — a property of the record's own data. `processed` — an output the bound flow produces. `computed` — a value Kipory keeps (the table's `computed`). |

Each item of `reprocessOn`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relation` | `string` | yes | The relation whose links reach the related records. |
| `direction` | `"incoming" \| "outgoing" \| "either"` | no | Which end of the relation this table is. Needed only when the relation pairs the table with itself; `either` is the one value for a symmetric relation. |
| `peerTable` | `string` | no | The related table. Needed only when the relation pairs this table with more than one. |
| `on` | `"join" \| "leave" \| "change"[]` | yes | `join`: a related record links in; `leave`: one unlinks; `change`: one changes a field in `fields`. |
| `fields` | `string[]` | no | The related records' fields whose change queues the run. Required with `change`. |
| `debounceSeconds` | `integer` | no | The run starts once no further change has come for this many seconds. Default 30. |

Each item of `contract`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `family` | `"submission" \| "processed" \| "system" \| "computed"` | yes | Where a referenced field comes from. `submission` — the record's own submitted data. `processed` — an output of the flow bound to its type. `system` — a platform-maintained field. `computed` — a value Kipory keeps from related records or the record itself (the table's `computed`). |
| `name` | `string` | yes | Field name, as a declaration would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `payloadType` | `"keyword" \| "integer" \| "float" \| "bool" \| "datetime" \| null` | yes | Index type this field would get if made searchable, derived from its schema. Null means it cannot be filtered on at all — see `refusal`. |
| `array` | `boolean` | yes | Whether the field is a list of `payloadType` rather than one value. |
| `refusal` | `"UNTYPED" \| "NESTED_OBJECT" \| "NESTED_ARRAY" \| "AMBIGUOUS_UNION" \| "NULL_ONLY" \| "UNSUPPORTED_TYPE" \| null` | yes | Why the field cannot be filtered on. Non-null exactly when `payloadType` is null. |
| `contentRefusal` | `"NESTED_OBJECT" \| "NESTED_ARRAY" \| "NULL_ONLY" \| null` | yes | Why this field can never be the source of a searchable content slot, or null when it can. Non-null means no value the schema admits could render as text; a declaration that uses it as one is refused. |
| `identityRefusal` | `"LIST" \| "NOT_TEXT" \| null` | yes | Why this field's schema rules it out as the natural key, or null when it might be one: `LIST` (the field holds a list) or `NOT_TEXT` (every value it admits is a number, a boolean, an object or null). A natural key is taken only from a string value, never coerced. Null is not a promise: a `key` on a field whose `family` is not `submission` is refused `USES_KEY_NOT_SUBMITTED` whatever this says, and declaring the key still checks every existing record. |
| `relationSource` | `object` | yes | What a relation declaration may do with this field. Both halves null means the field cannot source a link at all, and declaring one against it would be rejected. |

Each item of `vocabularies`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `vocabulary` | `string` | yes | The vocabulary's key, unique within the project. |
| `label` | `string` | yes | The vocabulary's human-readable name. |
| `cardinality` | `"one" \| "many"` | yes | Whether a record may carry one term in this vocabulary, or several. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this vocabulary has never seen: dropped, minted as a live term, or minted as a candidate awaiting activation. |
| `matching` | `"exact" \| "semantic"` | yes | How this vocabulary finds a term you already have: the slugified value only, or a meaning-based search of its own terms. |
| `sortOrder` | `integer` | yes | Position in the table's vocabulary order, 0-based and contiguous. This is the field order clients render and the API emits. |

Each item of `referencedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `table` | `string` | yes | The table holding the reference. |
| `field` | `string` | yes | The field holding it. |
| `element` | `string \| null` | yes | When the field is a list of objects: the property of each element holding the reference. |
| `relation` | `string` | yes | The relation its links carry. |
| `reference` | `object` | yes | What this reference does, each part with whether it is the default. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declaration` | `"uses" \| "searchable" \| "queryable" \| "relations" \| "records"` | yes | Which declaration the issue is in. `uses` is the table's field uses statement: when it is refused, only `uses` issues are reported; when it is accepted, the `searchable`, `queryable` and `relations` it implies are checked too. Problems with the natural key arrive as `uses` issues. `records` is the table's stored records breaking its type: a field the type marks required that some records have no value for, or references naming no record. |
| `code` | `string` | yes | The issue's code. For `uses` it is the code a save of the statement reports in its `TABLE_USES_INVALID` issues, for example `USES_FIELD_UNKNOWN`, or `USES_KEY_NOT_SUBMITTED` for a `key` on a field that is not part of the submitted data. For `searchable`, `queryable` and `relations` it is the code that declaration's check reports, for example `QUERYABLE_FIELD_UNKNOWN`. For `records` it is `RECORDS_MISSING_REQUIRED_FIELD`, or `REFERENCES_UNRESOLVED` for stored references the last reference sweep found naming no record. |
| `path` | `string` | yes | Where in the declaration the issue is, e.g. `fields[2].source`. Empty for the natural key, which is one value. |
| `message` | `string` | yes | The platform's own sentence for the issue. For `uses` it is followed by the remedy the save gives. |
| `field` | `object \| null` | yes | The contract field the issue is about, as the declaration names it — which may be a field the contract no longer has. Null when the issue is not about one field. |
| `count` | `integer` | no | For `records`: how many of the table's stored records have no value for `field`. Absent for a declaration's issue. |

Each item of `processingGaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"RECORD_CREATED_NOT_QUEUED"` | yes | Always `RECORD_CREATED_NOT_QUEUED`: the flow creates records of this table and has no step that queues them for processing. |
| `message` | `string` | yes | The platform's own sentence, with the way forward. |
| `flow` | `object` | yes | The flow that creates the records. |
| `stepKey` | `string` | yes | The key of the flow's step that creates them. |

Each item of `warnings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary" \| "query" \| "selection" \| "flow-input" \| "flow-output"` | yes | What is renamed. `flow-input` / `flow-output`: an input or an output of the flow at `path`, through `renameInputs` / `renameOutputs`. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type; for a flow's input or output, its old name. |
| `to` | `string` | yes | The new key; for a field, its new path; for a flow's input or output, its new name. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

### `GET /v1/tables/{id}`

Read one table by id, with any `expand` sections — the derived contract, the processed shape with its record counts (`expand=shape`), embedding cost inputs, diagnostics and the rest. What a delete would refuse over is the DELETE's own dry run (`?validateOnly=true`). `GET /v1/bootstrap` carries every table in one snapshot; `GET /v1/projects/{nodeId}/document` carries them by key.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: flowLabels, outputDefinition, contract, shape, vocabularies, uses, restamp, migration, embedding, vectorProgress, diagnostics, processingGaps, processing, computedState, references. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Table id — the address for every table verb. |
| `dataTypeId` | `string` | yes | Type this table takes its data shape from. A reference — other tables, events and relations may use the same type, and renaming it does not break this reference. |
| `dataTypeKey` | `string` | yes | Current key of that type, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The table's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the type this table references. Edited with `definition` on `PATCH /v1/tables/{id}` or on the type itself: the same type either way, for everything that uses it. |
| `description` | `string \| null` | yes | This table's own description, separate from the type's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this table. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `owner` | `"user" \| "project"` | yes | Who owns records of this table. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user. |
| `sharing` | `boolean` | yes | Whether records can be shared with people and teams (`record.grant`). Always false on a `project` table. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What the table's fields are FOR, grouped by use — the one authored statement this table carries. `key` goes to the natural-key index, `filter` to indexed columns, `search` to the vector index, `stream` to the stream store, and `vocabularies` to the term vocabulary. A link is not stated here: it is stated on its relation (`from: <table>.<field>`). `searchable`, `relations`, `queryable`, `naturalKey` and the vocabulary links below are DERIVED and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: how the table is indexed for search (the profile, the chunking, what travels with each part), or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `owner`. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: links this table produces, or null when no field carries `link` and the table declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this table may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record; a refusal names the records that fail. |
| `computed` | `object \| null` | yes | Fields Kipory keeps from related records or the record itself, or null when none. Kept a few seconds after a change; a record shows `computing` meanwhile. |
| `computedFields` | `object \| null` | yes | DERIVED from `computed`, read-only: each computed field's kind and the type of its values. |
| `reprocessOn` | `object[] \| null` | yes | When related records join, leave or change, this table's processing flow runs again for the record. Null when never. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this table. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `shape` | `object \| null` | no | Present when `expand=shape` was requested: the table's processed shape and its records counted by the shape they hold. Null when the table binds no flow, or binds one the project does not hold. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the table binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces now: the table's processed fields. Present when `expand=outputDefinition` was requested; null when the table binds no flow. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `vocabularies` | `object[]` | no | The vocabularies this table surfaces, in order. Present when `expand=vocabularies` was requested; an empty array means the table surfaces none, which is not the same as the project having none. |
| `references` | `object` | no | Present when `expand=references` was requested: what the daily reference sweep found in this table's reference fields. |
| `referencedBy` | `object[]` | no | Present when `expand=references` was requested: every reference in the project that can name this table's records, and what deleting one does to the records holding it. Empty when nothing can name them. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, relation or vocabulary position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this table's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/tables/{id}`; an empty array means every declaration still holds. The `records` findings (records missing a required field) are left out when reading the records did not finish in time. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this table without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/tables/{id}`; always empty for a table that binds no processing flow. |
| `processing` | `object` | no | How many of this table's records wait for processing and how many are being processed now. Records are processed on the platform's shared worker slots, so how many run at once rises and falls with the load on them; a run's `queued` says what each one waited for. Present when `expand=processing` was requested on `GET /v1/tables/{id}`. |
| `computedState` | `object` | no | How the table's computed fields are kept. Present when `expand=computedState` was requested on `GET /v1/tables/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

Each item of `contentFields`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Field name, as a projection would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `source` | `"submission" \| "processed" \| "computed"` | yes | Where the field comes from. `submission` — a property of the record's own data. `processed` — an output the bound flow produces. `computed` — a value Kipory keeps (the table's `computed`). |

Each item of `reprocessOn`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relation` | `string` | yes | The relation whose links reach the related records. |
| `direction` | `"incoming" \| "outgoing" \| "either"` | no | Which end of the relation this table is. Needed only when the relation pairs the table with itself; `either` is the one value for a symmetric relation. |
| `peerTable` | `string` | no | The related table. Needed only when the relation pairs this table with more than one. |
| `on` | `"join" \| "leave" \| "change"[]` | yes | `join`: a related record links in; `leave`: one unlinks; `change`: one changes a field in `fields`. |
| `fields` | `string[]` | no | The related records' fields whose change queues the run. Required with `change`. |
| `debounceSeconds` | `integer` | no | The run starts once no further change has come for this many seconds. Default 30. |

Each item of `contract`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `family` | `"submission" \| "processed" \| "system" \| "computed"` | yes | Where a referenced field comes from. `submission` — the record's own submitted data. `processed` — an output of the flow bound to its type. `system` — a platform-maintained field. `computed` — a value Kipory keeps from related records or the record itself (the table's `computed`). |
| `name` | `string` | yes | Field name, as a declaration would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `payloadType` | `"keyword" \| "integer" \| "float" \| "bool" \| "datetime" \| null` | yes | Index type this field would get if made searchable, derived from its schema. Null means it cannot be filtered on at all — see `refusal`. |
| `array` | `boolean` | yes | Whether the field is a list of `payloadType` rather than one value. |
| `refusal` | `"UNTYPED" \| "NESTED_OBJECT" \| "NESTED_ARRAY" \| "AMBIGUOUS_UNION" \| "NULL_ONLY" \| "UNSUPPORTED_TYPE" \| null` | yes | Why the field cannot be filtered on. Non-null exactly when `payloadType` is null. |
| `contentRefusal` | `"NESTED_OBJECT" \| "NESTED_ARRAY" \| "NULL_ONLY" \| null` | yes | Why this field can never be the source of a searchable content slot, or null when it can. Non-null means no value the schema admits could render as text; a declaration that uses it as one is refused. |
| `identityRefusal` | `"LIST" \| "NOT_TEXT" \| null` | yes | Why this field's schema rules it out as the natural key, or null when it might be one: `LIST` (the field holds a list) or `NOT_TEXT` (every value it admits is a number, a boolean, an object or null). A natural key is taken only from a string value, never coerced. Null is not a promise: a `key` on a field whose `family` is not `submission` is refused `USES_KEY_NOT_SUBMITTED` whatever this says, and declaring the key still checks every existing record. |
| `relationSource` | `object` | yes | What a relation declaration may do with this field. Both halves null means the field cannot source a link at all, and declaring one against it would be rejected. |

Each item of `vocabularies`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `vocabulary` | `string` | yes | The vocabulary's key, unique within the project. |
| `label` | `string` | yes | The vocabulary's human-readable name. |
| `cardinality` | `"one" \| "many"` | yes | Whether a record may carry one term in this vocabulary, or several. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this vocabulary has never seen: dropped, minted as a live term, or minted as a candidate awaiting activation. |
| `matching` | `"exact" \| "semantic"` | yes | How this vocabulary finds a term you already have: the slugified value only, or a meaning-based search of its own terms. |
| `sortOrder` | `integer` | yes | Position in the table's vocabulary order, 0-based and contiguous. This is the field order clients render and the API emits. |

Each item of `referencedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `table` | `string` | yes | The table holding the reference. |
| `field` | `string` | yes | The field holding it. |
| `element` | `string \| null` | yes | When the field is a list of objects: the property of each element holding the reference. |
| `relation` | `string` | yes | The relation its links carry. |
| `reference` | `object` | yes | What this reference does, each part with whether it is the default. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declaration` | `"uses" \| "searchable" \| "queryable" \| "relations" \| "records"` | yes | Which declaration the issue is in. `uses` is the table's field uses statement: when it is refused, only `uses` issues are reported; when it is accepted, the `searchable`, `queryable` and `relations` it implies are checked too. Problems with the natural key arrive as `uses` issues. `records` is the table's stored records breaking its type: a field the type marks required that some records have no value for, or references naming no record. |
| `code` | `string` | yes | The issue's code. For `uses` it is the code a save of the statement reports in its `TABLE_USES_INVALID` issues, for example `USES_FIELD_UNKNOWN`, or `USES_KEY_NOT_SUBMITTED` for a `key` on a field that is not part of the submitted data. For `searchable`, `queryable` and `relations` it is the code that declaration's check reports, for example `QUERYABLE_FIELD_UNKNOWN`. For `records` it is `RECORDS_MISSING_REQUIRED_FIELD`, or `REFERENCES_UNRESOLVED` for stored references the last reference sweep found naming no record. |
| `path` | `string` | yes | Where in the declaration the issue is, e.g. `fields[2].source`. Empty for the natural key, which is one value. |
| `message` | `string` | yes | The platform's own sentence for the issue. For `uses` it is followed by the remedy the save gives. |
| `field` | `object \| null` | yes | The contract field the issue is about, as the declaration names it — which may be a field the contract no longer has. Null when the issue is not about one field. |
| `count` | `integer` | no | For `records`: how many of the table's stored records have no value for `field`. Absent for a declaration's issue. |

Each item of `processingGaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"RECORD_CREATED_NOT_QUEUED"` | yes | Always `RECORD_CREATED_NOT_QUEUED`: the flow creates records of this table and has no step that queues them for processing. |
| `message` | `string` | yes | The platform's own sentence, with the way forward. |
| `flow` | `object` | yes | The flow that creates the records. |
| `stepKey` | `string` | yes | The key of the flow's step that creates them. |

### `PATCH /v1/tables/{id}`

Update one table: its key, description, shape (`dataTypeId` to point at another type, or `definition` to rewrite that type's shape), flow, owner scope or `uses`. With `validateOnly: true` it writes nothing and answers the save's own verdict, plus what the save would compute: the columns and projections it writes, whether it reindexes, restamps or re-embeds, the contract a shape or flow move leaves (`derived.contract`), the verification of a natural key `uses` declares (`derived.naturalKey`), and what each keyword of a sent `definition` would do (`derived.keywordVerdicts`). `definition` rewrites the type for every table, event and relation that uses it; the same edit is `PATCH /v1/types/{id}`. A save that changes what the table's processing gives (a re-pointed or restated `flowId`, a `definition` its flow reads) or what an endpoint's callers meet answers each change in `contractChanges`; one that breaks them is refused (409) until `acceptBreaks` names each broken table or endpoint, and only an admin of the project may accept (403 otherwise). A new `key` is a rename: its records keep their ids and move with every reference to the old key, it needs ADMIN, and the answer (and a `validateOnly` verdict) lists what moved, the expressions to change or keep (`keepExpressions`) and what breaks (`renames[]`). Several rows at once go through `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | The table's new key. Its records keep their ids and move with it, and every reference to the old key is rewritten in the same transaction; external callers using the old key break (see `renames[].exposures`). Requires ADMIN. A letter followed by letters and digits, like `Observation`, up to 64 characters. |
| `keepExpressions` | `string[]` | no | Steps, eval assertions or computed formulas whose expression and template candidates this rename leaves AS WRITTEN. Every candidate not kept here must be changed in the same write (or, on a type's field rename, rewritten through `rewriteExpressions`), or the write is refused `RENAME_CANDIDATE_UNRESOLVED`. Each name must hold at least one candidate, else the plan warns `RENAME_KEEP_UNUSED`. |
| `dataTypeId` | `string` | no | Point the table at a different type. Refused once the table has records. Omit to keep the current one. |
| `definition` | `object` | no | Replace the table's shape — the JSON Schema of the type this table points at — wholesale, with the rules `PATCH /v1/types/{id}` meets: field names, an object schema, keywords something reads, a removed field no stored record still holds, every other row that uses the type, the bound flow's binding, and the contract check: a change that breaks the callers of an endpoint or table is saved only when an admin names it in `acceptBreaks`. Saved with the table in one transaction, and the type is named in `touched`. Refused 422 together with `dataTypeId`. |
| `description` | `string \| null` | no | This table's own description, separate from the type's. |
| `flowId` | `string \| null` | no | Omit to keep the current binding, supply an id to re-bind, or send null to remove the flow entirely. |
| `owner` | `"user" \| "project"` | no | Change who owns records of this table. Refused once the table has records, except a project table becoming person-owned with `ownerField`. Omit to keep. |
| `ownerField` | `string` | no | With `owner: "user"` on a project table: the text field whose value is each record's owner, a person of the project by user id. Every record becomes that person's, the field leaves the type and the records, and a key stays unique across the project unless `uses` says `scope: "owner"`. Refused (nothing changed) when a record names nobody active (422 `TABLE_OWNER_FIELD_UNUSABLE`), the type is shared, records hold files, or something outside the change reads the field (409 `TABLE_OWNER_CONVERSION_BLOCKED`). Request-only. |
| `uses` | `object` | no | Replace the table's whole `uses` statement. Omit to keep the current one. Sent whole, never merged; the order of `filter` means nothing. The links its relations state are kept. Every projection is re-derived in the same transaction. |
| `computed` | `object \| null` | no | Replace the table's computed fields, whole. Omit to keep them; null to remove them all (their values go too). |
| `reprocessOn` | `object[] \| null` | no | Replace when the table's processing runs again because related records changed. Omit to keep; null for never. |
| `sharing` | `boolean` | no | Turn sharing records with people and teams on or off. A `user` table only. Omit to keep. |
| `renameComputed` | `object` | no | Rename computed fields: old name → new name. Send `computed` with the field under its new name; its kept values and every computed field of another table reading it move with it, without a recompute. |
| `version` | `integer` | yes | The version you last read. REQUIRED; a stale one is refused 409. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `acceptBreaks` | `object` | no | Accept that this write breaks the callers of the endpoints, tables and tools named here, by key. Needed for every row of `contractChanges` that is `breaking`; only an admin of the project may send it for one. A name whose contract this write does not break is answered in `acceptBreaksNotNeeded`, and a name the project does not have is refused. A statement about this write only, never stored. |
| `validateOnly` | `boolean` | no | Check this patch against the stored table and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `id`, `dataTypeId`, `dataTypeKey`, `project`, `key`, `description`, `flowId`, `owner`, `sharing`, `dataFields`, `contentFields`, `uses`, `searchable`, `relations`, `queryable`, `naturalKey`, `computed`, `computedFields`, `reprocessOn`, `hasRecords`, `recordCount`, `version`, `createdAt`, `updatedAt`, `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Table id — the address for every table verb. |
| `dataTypeId` | `string` | yes | Type this table takes its data shape from. A reference — other tables, events and relations may use the same type, and renaming it does not break this reference. |
| `dataTypeKey` | `string` | yes | Current key of that type, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The table's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the type this table references. Edited with `definition` on `PATCH /v1/tables/{id}` or on the type itself: the same type either way, for everything that uses it. |
| `description` | `string \| null` | yes | This table's own description, separate from the type's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this table. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `owner` | `"user" \| "project"` | yes | Who owns records of this table. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user. |
| `sharing` | `boolean` | yes | Whether records can be shared with people and teams (`record.grant`). Always false on a `project` table. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What the table's fields are FOR, grouped by use — the one authored statement this table carries. `key` goes to the natural-key index, `filter` to indexed columns, `search` to the vector index, `stream` to the stream store, and `vocabularies` to the term vocabulary. A link is not stated here: it is stated on its relation (`from: <table>.<field>`). `searchable`, `relations`, `queryable`, `naturalKey` and the vocabulary links below are DERIVED and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: how the table is indexed for search (the profile, the chunking, what travels with each part), or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `owner`. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: links this table produces, or null when no field carries `link` and the table declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this table may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record; a refusal names the records that fail. |
| `computed` | `object \| null` | yes | Fields Kipory keeps from related records or the record itself, or null when none. Kept a few seconds after a change; a record shows `computing` meanwhile. |
| `computedFields` | `object \| null` | yes | DERIVED from `computed`, read-only: each computed field's kind and the type of its values. |
| `reprocessOn` | `object[] \| null` | yes | When related records join, leave or change, this table's processing flow runs again for the record. Null when never. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this table. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `shape` | `object \| null` | no | Present when `expand=shape` was requested: the table's processed shape and its records counted by the shape they hold. Null when the table binds no flow, or binds one the project does not hold. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the table binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces now: the table's processed fields. Present when `expand=outputDefinition` was requested; null when the table binds no flow. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `vocabularies` | `object[]` | no | The vocabularies this table surfaces, in order. Present when `expand=vocabularies` was requested; an empty array means the table surfaces none, which is not the same as the project having none. |
| `references` | `object` | no | Present when `expand=references` was requested: what the daily reference sweep found in this table's reference fields. |
| `referencedBy` | `object[]` | no | Present when `expand=references` was requested: every reference in the project that can name this table's records, and what deleting one does to the records holding it. Empty when nothing can name them. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, relation or vocabulary position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this table's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/tables/{id}`; an empty array means every declaration still holds. The `records` findings (records missing a required field) are left out when reading the records did not finish in time. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this table without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/tables/{id}`; always empty for a table that binds no processing flow. |
| `processing` | `object` | no | How many of this table's records wait for processing and how many are being processed now. Records are processed on the platform's shared worker slots, so how many run at once rises and falls with the load on them; a run's `queued` says what each one waited for. Present when `expand=processing` was requested on `GET /v1/tables/{id}`. |
| `computedState` | `object` | no | How the table's computed fields are kept. Present when `expand=computedState` was requested on `GET /v1/tables/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |
| `warnings` | `object[]` | no | Present when the write removed something a use the platform only guessed may still read (`REMOVED_MAY_BE_USED`): each names the user and where. The write went through; check each by hand. |
| `renames` | `object[]` | no | Present when a PATCH changed `key`: the table renamed, the configuration references rewritten, the expression candidates and how each was resolved, and every external caller the rename breaks (`exposures`). Absent on an edit that renames nothing. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |

Each item of `contentFields`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Field name, as a projection would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `source` | `"submission" \| "processed" \| "computed"` | yes | Where the field comes from. `submission` — a property of the record's own data. `processed` — an output the bound flow produces. `computed` — a value Kipory keeps (the table's `computed`). |

Each item of `reprocessOn`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relation` | `string` | yes | The relation whose links reach the related records. |
| `direction` | `"incoming" \| "outgoing" \| "either"` | no | Which end of the relation this table is. Needed only when the relation pairs the table with itself; `either` is the one value for a symmetric relation. |
| `peerTable` | `string` | no | The related table. Needed only when the relation pairs this table with more than one. |
| `on` | `"join" \| "leave" \| "change"[]` | yes | `join`: a related record links in; `leave`: one unlinks; `change`: one changes a field in `fields`. |
| `fields` | `string[]` | no | The related records' fields whose change queues the run. Required with `change`. |
| `debounceSeconds` | `integer` | no | The run starts once no further change has come for this many seconds. Default 30. |

Each item of `contract`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `family` | `"submission" \| "processed" \| "system" \| "computed"` | yes | Where a referenced field comes from. `submission` — the record's own submitted data. `processed` — an output of the flow bound to its type. `system` — a platform-maintained field. `computed` — a value Kipory keeps from related records or the record itself (the table's `computed`). |
| `name` | `string` | yes | Field name, as a declaration would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `payloadType` | `"keyword" \| "integer" \| "float" \| "bool" \| "datetime" \| null` | yes | Index type this field would get if made searchable, derived from its schema. Null means it cannot be filtered on at all — see `refusal`. |
| `array` | `boolean` | yes | Whether the field is a list of `payloadType` rather than one value. |
| `refusal` | `"UNTYPED" \| "NESTED_OBJECT" \| "NESTED_ARRAY" \| "AMBIGUOUS_UNION" \| "NULL_ONLY" \| "UNSUPPORTED_TYPE" \| null` | yes | Why the field cannot be filtered on. Non-null exactly when `payloadType` is null. |
| `contentRefusal` | `"NESTED_OBJECT" \| "NESTED_ARRAY" \| "NULL_ONLY" \| null` | yes | Why this field can never be the source of a searchable content slot, or null when it can. Non-null means no value the schema admits could render as text; a declaration that uses it as one is refused. |
| `identityRefusal` | `"LIST" \| "NOT_TEXT" \| null` | yes | Why this field's schema rules it out as the natural key, or null when it might be one: `LIST` (the field holds a list) or `NOT_TEXT` (every value it admits is a number, a boolean, an object or null). A natural key is taken only from a string value, never coerced. Null is not a promise: a `key` on a field whose `family` is not `submission` is refused `USES_KEY_NOT_SUBMITTED` whatever this says, and declaring the key still checks every existing record. |
| `relationSource` | `object` | yes | What a relation declaration may do with this field. Both halves null means the field cannot source a link at all, and declaring one against it would be rejected. |

Each item of `vocabularies`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `vocabulary` | `string` | yes | The vocabulary's key, unique within the project. |
| `label` | `string` | yes | The vocabulary's human-readable name. |
| `cardinality` | `"one" \| "many"` | yes | Whether a record may carry one term in this vocabulary, or several. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this vocabulary has never seen: dropped, minted as a live term, or minted as a candidate awaiting activation. |
| `matching` | `"exact" \| "semantic"` | yes | How this vocabulary finds a term you already have: the slugified value only, or a meaning-based search of its own terms. |
| `sortOrder` | `integer` | yes | Position in the table's vocabulary order, 0-based and contiguous. This is the field order clients render and the API emits. |

Each item of `referencedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `table` | `string` | yes | The table holding the reference. |
| `field` | `string` | yes | The field holding it. |
| `element` | `string \| null` | yes | When the field is a list of objects: the property of each element holding the reference. |
| `relation` | `string` | yes | The relation its links carry. |
| `reference` | `object` | yes | What this reference does, each part with whether it is the default. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declaration` | `"uses" \| "searchable" \| "queryable" \| "relations" \| "records"` | yes | Which declaration the issue is in. `uses` is the table's field uses statement: when it is refused, only `uses` issues are reported; when it is accepted, the `searchable`, `queryable` and `relations` it implies are checked too. Problems with the natural key arrive as `uses` issues. `records` is the table's stored records breaking its type: a field the type marks required that some records have no value for, or references naming no record. |
| `code` | `string` | yes | The issue's code. For `uses` it is the code a save of the statement reports in its `TABLE_USES_INVALID` issues, for example `USES_FIELD_UNKNOWN`, or `USES_KEY_NOT_SUBMITTED` for a `key` on a field that is not part of the submitted data. For `searchable`, `queryable` and `relations` it is the code that declaration's check reports, for example `QUERYABLE_FIELD_UNKNOWN`. For `records` it is `RECORDS_MISSING_REQUIRED_FIELD`, or `REFERENCES_UNRESOLVED` for stored references the last reference sweep found naming no record. |
| `path` | `string` | yes | Where in the declaration the issue is, e.g. `fields[2].source`. Empty for the natural key, which is one value. |
| `message` | `string` | yes | The platform's own sentence for the issue. For `uses` it is followed by the remedy the save gives. |
| `field` | `object \| null` | yes | The contract field the issue is about, as the declaration names it — which may be a field the contract no longer has. Null when the issue is not about one field. |
| `count` | `integer` | no | For `records`: how many of the table's stored records have no value for `field`. Absent for a declaration's issue. |

Each item of `processingGaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"RECORD_CREATED_NOT_QUEUED"` | yes | Always `RECORD_CREATED_NOT_QUEUED`: the flow creates records of this table and has no step that queues them for processing. |
| `message` | `string` | yes | The platform's own sentence, with the way forward. |
| `flow` | `object` | yes | The flow that creates the records. |
| `stepKey` | `string` | yes | The key of the flow's step that creates them. |

Each item of `warnings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary" \| "query" \| "selection" \| "flow-input" \| "flow-output"` | yes | What is renamed. `flow-input` / `flow-output`: an input or an output of the flow at `path`, through `renameInputs` / `renameOutputs`. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type; for a flow's input or output, its old name. |
| `to` | `string` | yes | The new key; for a field, its new path; for a flow's input or output, its new name. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Shape 2, with `ok`, `diagnostics`, `complete`, `permissions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `permissions` | `object` | yes | What the caller's role lets the write do. |
| `renames` | `object[]` | no | Present when the checked patch renames (a new `key`, `renameFields`, or a flow's `renameInputs` / `renameOutputs`): what the write would move, the expression candidates and how each is resolved, and every external caller it would break. Absent when it renames nothing. |
| `derived` | `object` | no | What the write WOULD compute and set in motion. Nothing here has happened. `staleVersion`, `writes`, `resolved` and `effects` are present whenever the patch got far enough to plan, and absent on a refusal its planner raised; the other members say when they appear. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "links-removed" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected" \| "recompute" \| "reference-policy" \| "shape-behind" \| "field-values-hidden"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `links-removed`: a dropped or re-pointed producer leaves stored links no declaration stands behind, and the link backfill removes them; `rows` counts the records whose processing (`reprocessOn` on a leave) read those links. Their computed values are recomputed, but their processing is not run again: reprocess one on purpose with `POST /v1/records/{id}/reprocess`. `records-invalid`: stored records that already did not fit their type before this change and still do not fit the changed one; nothing changes them, a write that replaces one must make it fit, and a merge is judged only on the fields it writes. A change that would make a fitting record unfit is refused (`TYPE_UNSAFE_FOR_TABLE`), never listed here. `reembed`: the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow or an API read leaves those fields out of those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. `recompute`: Kipory computes the table's computed fields for its stored records, in the background and at no charge. `reference-policy`: the change moves what deleting a record does to the stored records naming it — a stated `onTargetDelete`, or the default it falls back to when the field becomes required, becomes the table's key or the reference becomes `scope: lifecycle`; `rows` counts the records naming such a record directly today, and the message says what the delete did and now does, and the most one record has. Records a `delete` takes in turn by their own rules are not counted. It also appears when a reference stops saying `unresolved: allow`, so a write naming a record that does not exist is refused; `rows` is what the last reference sweep counted as naming no record. `shape-behind`: the change moves a table's processed fields, so its records processed before it hold the older shape until each is processed again; `rows` counts them exactly. They stay readable. Bring them all to the current shape with `POST /v1/record-reprocesses` (`scope: "not-current"`), or one with `POST /v1/records/{id}/reprocess`. `field-values-hidden`: the change removes or retypes a processed field, so a record's stored value for it is no longer answered: every value of a removed field, and of a retyped one each value whose JSON kind (text, number, boolean, list, object) the new type no longer allows. A retype that keeps the kind (a length limit, a set of allowed texts) hides nothing and states no such consequence: those values are answered as stored until the record is processed again. `rows` counts the records holding a value that is hidden; the message names the field. The values stay stored and are answered again if the change is undone before the record is processed again. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary" \| "query" \| "selection" \| "flow-input" \| "flow-output"` | yes | What is renamed. `flow-input` / `flow-output`: an input or an output of the flow at `path`, through `renameInputs` / `renameOutputs`. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type; for a flow's input or output, its old name. |
| `to` | `string` | yes | The new key; for a field, its new path; for a flow's input or output, its new name. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |

### `DELETE /v1/tables/{id}`

Delete one table. Refused (409) while records of it exist. Relations paired only with it go with it, and other tables' `joins` it voids are cleared — both reported. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing, with `derived.dependents`: the records that refuse it and the relations and joins it would take along. The type it took its shape from stays. Several rows at once: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `deleted`, `id`, `key`, `touched`, `invalidatedJoins`, `deletedRelations`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `key` | `string` | yes | Key of the table that was removed. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `invalidatedJoins` | `string[]` | yes | Other tables whose join declarations this delete voided, because they named the table you removed. |
| `deletedRelations` | `string[]` | yes | Relations removed with this table, because it was the only table pair they applied to — and every link it had made goes with it. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `contractChanges` | `object[]` | no | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `permissions` | `object` | no | What the caller's role lets the write do. |
| `derived` | `object` | no | What the delete would find, from the reads it decides on. Nothing here has happened. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "links-removed" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected" \| "recompute" \| "reference-policy" \| "shape-behind" \| "field-values-hidden"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `links-removed`: a dropped or re-pointed producer leaves stored links no declaration stands behind, and the link backfill removes them; `rows` counts the records whose processing (`reprocessOn` on a leave) read those links. Their computed values are recomputed, but their processing is not run again: reprocess one on purpose with `POST /v1/records/{id}/reprocess`. `records-invalid`: stored records that already did not fit their type before this change and still do not fit the changed one; nothing changes them, a write that replaces one must make it fit, and a merge is judged only on the fields it writes. A change that would make a fitting record unfit is refused (`TYPE_UNSAFE_FOR_TABLE`), never listed here. `reembed`: the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow or an API read leaves those fields out of those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. `recompute`: Kipory computes the table's computed fields for its stored records, in the background and at no charge. `reference-policy`: the change moves what deleting a record does to the stored records naming it — a stated `onTargetDelete`, or the default it falls back to when the field becomes required, becomes the table's key or the reference becomes `scope: lifecycle`; `rows` counts the records naming such a record directly today, and the message says what the delete did and now does, and the most one record has. Records a `delete` takes in turn by their own rules are not counted. It also appears when a reference stops saying `unresolved: allow`, so a write naming a record that does not exist is refused; `rows` is what the last reference sweep counted as naming no record. `shape-behind`: the change moves a table's processed fields, so its records processed before it hold the older shape until each is processed again; `rows` counts them exactly. They stay readable. Bring them all to the current shape with `POST /v1/record-reprocesses` (`scope: "not-current"`), or one with `POST /v1/records/{id}/reprocess`. `field-values-hidden`: the change removes or retypes a processed field, so a record's stored value for it is no longer answered: every value of a removed field, and of a retyped one each value whose JSON kind (text, number, boolean, list, object) the new type no longer allows. A retype that keeps the kind (a length limit, a set of allowed texts) hides nothing and states no such consequence: those values are answered as stored until the record is processed again. `rows` counts the records holding a value that is hidden; the message names the field. The values stay stored and are answered again if the change is undone before the record is processed again. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

### `GET /v1/tables/{id}/queries`

List a table's queries, by key, each as the document writes it. `GET /v1/projects/{nodeId}/document` carries every table's queries on its row.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `queries` | `object[]` | yes | The table's queries, by key. |

Each item of `queries`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The query's id. |
| `table` | `string` | yes | The key of the table the query lives under. |
| `key` | `string` | yes | The query's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the query; a PATCH states it. |
| `definition` | `object` | yes | The query, as the document writes it. |

### `POST /v1/tables/{id}/queries`

Create a query under a table, judged as a document plan judges it: refused 422 naming each finding, 409 when the key is taken. `POST /v1/projects/{nodeId}/document` writes many at once, with the tables they read, and its `/plan` checks them first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The query's key in its table. |
| `definition` | `object` | yes | A read declared once under its table and read by name. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The query's id. |
| `table` | `string` | yes | The key of the table the query lives under. |
| `key` | `string` | yes | The query's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the query; a PATCH states it. |
| `definition` | `object` | yes | The query, as the document writes it. |

### `GET /v1/tables/{id}/queries/{key}`

Read one query of a table. `GET /v1/tables/{id}/queries` lists them all.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The query's id. |
| `table` | `string` | yes | The key of the table the query lives under. |
| `key` | `string` | yes | The query's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the query; a PATCH states it. |
| `definition` | `object` | yes | The query, as the document writes it. |

### `PATCH /v1/tables/{id}/queries/{key}`

Change a query: its whole `definition`, a new `key`, or both, at the `version` read (409 when it moved). Every endpoint answering from the query is listed in `contractChanges`: a property added is safe, one removed or retyped breaks its callers and is refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until `acceptBreaks` names the endpoint. `POST /v1/projects/{nodeId}/document` writes many at once, with the tables they read, and its `/plan` checks them first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The version the change is made against: the row's `version` as read. A stale one is refused 409. |
| `key` | `string` | no | A new key for the query: refused while a step, query, selection or endpoint names it; a project document renames it and moves them all. |
| `definition` | `object` | no | The query's whole definition, replacing the one it holds. |
| `acceptBreaks` | `object` | no | The endpoints whose callers this edit may break. An edit that changes what an endpoint answers from the query (a property removed or retyped) is listed in `contractChanges` and refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until this names the endpoint; only an admin of the project may accept (403 `CONTRACT_BREAK_FORBIDDEN` otherwise). A name the project does not have is 422. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The query's id. |
| `table` | `string` | yes | The key of the table the query lives under. |
| `key` | `string` | yes | The query's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the query; a PATCH states it. |
| `definition` | `object` | yes | The query, as the document writes it. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `DELETE /v1/tables/{id}/queries/{key}`

Delete a query. Refused (422, `REMOVED_STILL_USED`) while a step, a query, a selection or an endpoint still names it. Deleting the table deletes its queries with it. `POST /v1/projects/{nodeId}/document` writes many at once, with the tables they read, and its `/plan` checks them first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The removed row's id. |
| `deleted` | `true` | yes | Always true: the row is gone. |

### `POST /v1/tables/{id}/queries/{key}/preview`

Read one page of a query as a chosen member of the project (`asUserId`), or as the project for a query that reads no person's records, with its params, a cursor and a limit. Answers the page, the JSON Schema of one item, every table the read reaches and the clauses it ran with params and its base merged in. Writes, charges and runs nothing. A query endpoint answers the same page to a caller; `record.query` with `query: <table>.<key>` reads it in a flow. Reads the saved query: write it first to preview a new or edited one.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `asUserId` | `string` | no | The person to read as; a project query needs none. |
| `params` | `object` | no | A value for each param, by name. |
| `after` | `string` | no | A `nextCursor` from an earlier preview, for the page after it. |
| `before` | `string` | no | A `prevCursor` from an earlier preview, for the page before it. |
| `limit` | `integer` | no | Rows in the page; the query's page size when absent. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `items` | `object[]` | yes | The page's rows, each in the query's item shape. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |
| `paging` | `null` | yes | Always null: a query's page is never counted; walk it by `after` / `before`. |
| `itemSchema` | `object` | yes | The JSON Schema of one row. |
| `tables` | `string[]` | yes | Every table the read reaches: its own, its sets', its base's and linked ones. |
| `clauses` | `object[]` | yes | The clauses the read ran, with params and the base merged in: its literal clauses, then each set it compared with. |

Each item of `clauses`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"field"` | yes | A condition on a field the type routes with `filter`. |
| `field` | `string` | no | A field of the table with a `filter` use, or `id` (with `eq`, `in` or `not-in`). |
| `op` | `"eq" \| "lt" \| "lte" \| "gt" \| "gte" \| "in" \| "not-in" \| "contains"` | no | Each operator takes one value; `in` and `not-in` take a list. `not-in` keeps records with no value in the field. `contains` matches text anywhere in a text field, ignoring case: at least 3 characters with a word in them, not signs alone (a search-speed limit). |
| `value` | `string \| number \| boolean \| string \| number \| boolean[]` | no | One value, or a list for `in` and `not-in`; dates as ISO 8601. |
| `vocabulary` | `string` | no | A vocabulary the table lists in `uses.vocabularies`. |
| `slug` | `string` | no | The term, by slug. An alias resolves to its canonical term, one hop, as every term read does. |
| `relation` | `string` | no | A relation a `link` use declares, from or to this table. |
| `direction` | `"outgoing" \| "incoming" \| "either"` | no | Which end the record is on; default `outgoing`. |
| `where` | `object[]` | no | Clauses on the relation's declared link filters (`link.element.filters`), ANDed. |
| `count` | `object` | no | How many matching links to require; default at least one. |
| `peer` | `object[]` | no | Clauses on the linked record, one hop away. |
| `window` | `object` | no | The time window on the event's own `at`. Omitted or open-ended: bounded to the stream's retention, and the explanation says so. |
| `text` | `string` | no | The phrase to resemble. Exactly one of a phrase and a record (`likeRecordId`) is given. |
| `likeRecordId` | `string` | no | A record to resemble instead of a phrase; it is left out. |
| `likeTable` | `string` | no | The table of the record to resemble, if not the queried one. |
| `topK` | `integer` | no | How many to rank when this clause is the only one, or when it runs first above the pushdown cap. Default 50. |
| `minScore` | `number` | no | Leave out records scoring below this, from −1 to 1. |
| `passage` | `boolean` | no | `true` also returns the text of each record's best-matching part. |
| `of` | `object[]` | no | 2 to 8 field, term, link or stream clauses. |
| `set` | `object` | no | The values of one field across another query's rows, read in the same statement. Empty values are left out of the set. |

### `GET /v1/tables/{id}/selections`

List a table's selections, by key, each as the document writes it. `GET /v1/projects/{nodeId}/document` carries every table's selections on its row.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `selections` | `object[]` | yes | The table's selections, by key. |

Each item of `selections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The selection's id. |
| `table` | `string` | yes | The key of the table the selection lives under. |
| `key` | `string` | yes | The selection's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the selection; a PATCH states it. |
| `definition` | `object` | yes | The selection, as the document writes it. |

### `POST /v1/tables/{id}/selections`

Create a selection under a table, judged as a document plan judges it: refused 422 naming each finding, 409 when the key is taken. `POST /v1/projects/{nodeId}/document` writes many at once, with the tables they read, and its `/plan` checks them first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The selection's key in its table. |
| `definition` | `object` | yes | The answer a query's rows take: properties mapped to this table's fields, plus linked selections. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The selection's id. |
| `table` | `string` | yes | The key of the table the selection lives under. |
| `key` | `string` | yes | The selection's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the selection; a PATCH states it. |
| `definition` | `object` | yes | The selection, as the document writes it. |

### `GET /v1/tables/{id}/selections/{key}`

Read one selection of a table. `GET /v1/tables/{id}/selections` lists them all.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The selection's id. |
| `table` | `string` | yes | The key of the table the selection lives under. |
| `key` | `string` | yes | The selection's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the selection; a PATCH states it. |
| `definition` | `object` | yes | The selection, as the document writes it. |

### `PATCH /v1/tables/{id}/selections/{key}`

Change a selection: its whole `definition`, a new `key`, or both, at the `version` read (409 when it moved). Every endpoint answering from the selection is listed in `contractChanges`: a property added is safe, one removed or retyped breaks its callers and is refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until `acceptBreaks` names the endpoint. `POST /v1/projects/{nodeId}/document` writes many at once, with the tables they read, and its `/plan` checks them first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The version the change is made against: the row's `version` as read. A stale one is refused 409. |
| `key` | `string` | no | A new key for the selection: refused while a step, query, selection or endpoint names it; a project document renames it and moves them all. |
| `definition` | `object` | no | The selection's whole definition, replacing the one it holds. |
| `acceptBreaks` | `object` | no | The endpoints whose callers this edit may break. An edit that changes what an endpoint answers from the selection (a property removed or retyped) is listed in `contractChanges` and refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until this names the endpoint; only an admin of the project may accept (403 `CONTRACT_BREAK_FORBIDDEN` otherwise). A name the project does not have is 422. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The selection's id. |
| `table` | `string` | yes | The key of the table the selection lives under. |
| `key` | `string` | yes | The selection's key in its table; `<table>.<key>` names it from elsewhere. |
| `version` | `integer` | yes | Moves on every save of the selection; a PATCH states it. |
| `definition` | `object` | yes | The selection, as the document writes it. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool"` | yes | Whether `key` names an endpoint, a table or a tool. |
| `key` | `string` | yes | The endpoint's, table's or tool's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `DELETE /v1/tables/{id}/selections/{key}`

Delete a selection. Refused (422, `REMOVED_STILL_USED`) while a step, a query, a selection or an endpoint still names it. Deleting the table deletes its selections with it. `POST /v1/projects/{nodeId}/document` writes many at once, with the tables they read, and its `/plan` checks them first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The table the rows live under: its key, or its id. |
| `key` | `string` | yes | The row's key in its table. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project the table belongs to — its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The removed row's id. |
| `deleted` | `true` | yes | Always true: the row is gone. |
