<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Record types

A record type is a kind of record the project holds — its shape, owner scope, facets, natural key and processing flow. Name, owner scope and data-shape reference freeze once the first record exists.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/record-types`](#get-v1-record-types) |  |
| `POST` | [`/v1/record-types`](#post-v1-record-types) |  |
| `GET` | [`/v1/record-types/{id}`](#get-v1-record-types-id) |  |
| `PATCH` | [`/v1/record-types/{id}`](#patch-v1-record-types-id) |  |
| `DELETE` | [`/v1/record-types/{id}`](#delete-v1-record-types-id) |  |

### `GET /v1/record-types`

List a project's record types, live and by id, with any `expand` sections that are cheap per row. The per-type scans (`embedding`, `vectorProgress`, `diagnostics`, `processingGaps`) are refused here — ask `GET /v1/record-types/{id}`. `GET /v1/bootstrap` carries every type in one snapshot with the rest of the project's configuration, and `GET /v1/projects/{nodeId}/document` carries them by key, in the form a document write takes back.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose record types to list. |
| `key` | `string` | no | Return only the type with this exact key. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabels, outputDefinition, contract, facets, uses, restamp, migration. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `recordTypes` | `object[]` | yes | Record types in the project, with any requested expansions. |

Each item of `recordTypes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryKey` | `string` | yes | Current key of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The record type's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the entry this type references. A shape the type owns is edited with `definition` on `PATCH /v1/record-types/{id}`; a shared one on its schema entry. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"user" \| "project"` | yes | Who owns records of this type. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `stream` to the stream store; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: what is indexed for search, or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `ownerScope`, so the two cannot disagree. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: edges this type produces, or null when no field carries `link` and the type declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this type may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record, so it is the one use whose refusal names rows rather than the declaration. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this type. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `drift` | `"ok" \| "drift" \| "flow-missing" \| "uncaptured" \| "not-flow-backed"` | no | Present when `expand=drift` was requested. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

### `POST /v1/record-types`

Create a record type that takes its data shape from an existing schema entry. With `validateOnly: true` it answers whether the create would be refused, writing nothing. A type with a shape of its OWN, several types at once, or a type together with the flow that processes it is one call to `POST /v1/projects/{nodeId}/document` (check it first with its `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the type. |
| `key` | `string` | yes | The record type's key. A letter followed by letters and digits, like `Observation`, up to 64 characters. |
| `dataEntryId` | `string` | yes | Existing schema entry in the same project that defines the type's data shape. On this route a shape is always an entry that already exists. To declare a type together with a shape of its OWN, state it inline in a project document (`records.<name>.shape`); an entry another record type owns is refused here with SCHEMA_ENTRY_OWNED. |
| `description` | `string \| null` | no | This type's own description, separate from the entry's. |
| `flowId` | `string \| null` | no | Processing flow to bind. Supply one to have records processed on creation; omit or null to store them as submitted. |
| `ownerScope` | `"user" \| "project"` | yes | Who owns records of this type: `user` for one person's own records, `project` for the project's shared content pool. Required — it is immutable once the type has records, so there is no safe default. |
| `uses` | `object` | no | What each field is for. Omit for a type whose fields are stored with the record and read whole. Every projection — `searchable`, `queryable`, `relations`, the natural key, the facet links — is derived from this and cannot be sent directly. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/write-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write WOULD compute and set in motion. Nothing here has happened. `staleVersion`, `writes`, `resolved` and `effects` are present whenever the patch got far enough to plan, and absent on a refusal its planner raised; the other members say when they appear. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "edge-restamp" \| "edges-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `edge-restamp`: stored edges are re-stamped. `edges-deleted`: deleting a relation kind deletes every stored edge of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this type's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryKey` | `string` | yes | Current key of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The record type's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the entry this type references. A shape the type owns is edited with `definition` on `PATCH /v1/record-types/{id}`; a shared one on its schema entry. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"user" \| "project"` | yes | Who owns records of this type. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `stream` to the stream store; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: what is indexed for search, or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `ownerScope`, so the two cannot disagree. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: edges this type produces, or null when no field carries `link` and the type declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this type may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record, so it is the one use whose refusal names rows rather than the declaration. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this type. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `drift` | `"ok" \| "drift" \| "flow-missing" \| "uncaptured" \| "not-flow-backed"` | no | Present when `expand=drift` was requested. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `contentFields`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Field name, as a projection would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `source` | `"submission" \| "processed"` | yes | Where the field comes from. `submission` — a property of the record's own data. `processed` — an output the bound flow produces. |

Each item of `contract`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `family` | `"submission" \| "processed" \| "system"` | yes | Where a referenced field comes from. `submission` — the record's own submitted data. `processed` — an output of the flow bound to its type. `system` — a platform-maintained field. |
| `name` | `string` | yes | Field name, as a declaration would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `payloadType` | `"keyword" \| "integer" \| "float" \| "bool" \| "datetime"` | yes | Index type this field would get if made searchable, derived from its schema. Null means it cannot be filtered on at all — see `refusal`. |
| `array` | `boolean` | yes | Whether the field is a list of `payloadType` rather than one value. |
| `refusal` | `"UNTYPED" \| "NESTED_OBJECT" \| "NESTED_ARRAY" \| "AMBIGUOUS_UNION" \| "NULL_ONLY" \| "UNSUPPORTED_TYPE"` | yes | Why the field cannot be filtered on. Non-null exactly when `payloadType` is null, so an editor can grey the option out and say why instead of offering it and failing the save. |
| `contentRefusal` | `"NESTED_OBJECT" \| "NESTED_ARRAY" \| "NULL_ONLY"` | yes | Why this field can never be the source of a searchable content slot, or null when it can. Non-null means no value the schema admits could render as text, so every record would project empty and be skipped — the declaration is refused rather than accepted into silence. |
| `identityRefusal` | `"LIST" \| "NOT_TEXT"` | yes | Why this field's schema rules it out as the natural key, or null when it might be one. A natural key is stamped only from a string value and is never coerced, so `LIST` (the field holds a list) and `NOT_TEXT` (every value it admits is a number, a boolean, an object or null) mean every record would fail to supply it. Null is not a promise: the key is stamped from the data a record is submitted with, so a `key` on a field whose `family` is not `submission` is refused `USES_KEY_NOT_SUBMITTED` whatever this says, and declaring the key still checks every existing record. |
| `relationSource` | `object` | yes | What a relation declaration may do with this field. Both halves null means the field cannot source an edge at all, and declaring one against it would be rejected. |

Each item of `facets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facetKey` | `string` | yes | The facet's key, unique within the project. |
| `label` | `string` | yes | The facet's human-readable name. |
| `cardinality` | `"one" \| "many"` | yes | Whether a record may carry one term on this facet, or several. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this facet has never seen: dropped, minted as a live term, or minted as a candidate awaiting activation. |
| `matching` | `"exact" \| "semantic"` | yes | How this facet finds a term you already have: the slugified value only, or a meaning-based search of its own terms. |
| `sortOrder` | `integer` | yes | Position in the type's facet order, 0-based and contiguous. This is the field order clients render and the API emits. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declaration` | `"uses" \| "searchable" \| "queryable" \| "relations"` | yes | Which declaration the issue is in. `uses` is the record type's field uses statement, derived as a save derives it: a statement the derivation refuses is reported only as `uses` issues, and one it accepts has the `searchable`, `queryable` and `relations` projections it derives checked. Problems with the natural key arrive as `uses` issues, because the key is derived from the statement. |
| `code` | `string` | yes | The issue's code. For `uses` it is the code a save of the statement reports in its `RECORD_TYPE_USES_INVALID` issues, for example `USES_FIELD_UNKNOWN`, or `USES_KEY_NOT_SUBMITTED` for a `key` on a field that is not part of the submitted data. For `searchable`, `queryable` and `relations` it is the code that declaration's check reports, for example `QUERYABLE_FIELD_UNKNOWN`. |
| `path` | `string` | yes | Where in the declaration the issue is, e.g. `fields[2].source`. Empty for the natural key, which is one value. |
| `message` | `string` | yes | The platform's own sentence for the issue. For `uses` it is followed by the remedy the save gives. |
| `field` | `object \| null` | yes | The contract field the issue is about, as the declaration names it — which may be a field the contract no longer has. Null when the issue is not about one field. |

Each item of `processingGaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"RECORD_CREATED_NOT_QUEUED"` | yes | Always `RECORD_CREATED_NOT_QUEUED`: the flow creates records of this type and has no step that queues them for processing. |
| `message` | `string` | yes | The platform's own sentence, with the way forward. |
| `flow` | `object` | yes | The flow that creates the records. |
| `skillKey` | `string` | yes | The key of the flow's step that creates them. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `record-types`, `schema-entries`, `relation-kinds`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `GET /v1/record-types/{id}`

Read one record type by id, with any `expand` sections — the derived contract, drift, embedding cost inputs, diagnostics and the rest. What a delete would refuse over is the DELETE's own dry run (`?validateOnly=true`). `GET /v1/bootstrap` carries every type in one snapshot; `GET /v1/projects/{nodeId}/document` carries them by key.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabels, outputDefinition, contract, facets, uses, restamp, migration, embedding, vectorProgress, diagnostics, processingGaps. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryKey` | `string` | yes | Current key of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The record type's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the entry this type references. A shape the type owns is edited with `definition` on `PATCH /v1/record-types/{id}`; a shared one on its schema entry. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"user" \| "project"` | yes | Who owns records of this type. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `stream` to the stream store; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: what is indexed for search, or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `ownerScope`, so the two cannot disagree. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: edges this type produces, or null when no field carries `link` and the type declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this type may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record, so it is the one use whose refusal names rows rather than the declaration. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this type. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `drift` | `"ok" \| "drift" \| "flow-missing" \| "uncaptured" \| "not-flow-backed"` | no | Present when `expand=drift` was requested. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

Each item of `contentFields`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Field name, as a projection would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `source` | `"submission" \| "processed"` | yes | Where the field comes from. `submission` — a property of the record's own data. `processed` — an output the bound flow produces. |

Each item of `contract`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `family` | `"submission" \| "processed" \| "system"` | yes | Where a referenced field comes from. `submission` — the record's own submitted data. `processed` — an output of the flow bound to its type. `system` — a platform-maintained field. |
| `name` | `string` | yes | Field name, as a declaration would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `payloadType` | `"keyword" \| "integer" \| "float" \| "bool" \| "datetime"` | yes | Index type this field would get if made searchable, derived from its schema. Null means it cannot be filtered on at all — see `refusal`. |
| `array` | `boolean` | yes | Whether the field is a list of `payloadType` rather than one value. |
| `refusal` | `"UNTYPED" \| "NESTED_OBJECT" \| "NESTED_ARRAY" \| "AMBIGUOUS_UNION" \| "NULL_ONLY" \| "UNSUPPORTED_TYPE"` | yes | Why the field cannot be filtered on. Non-null exactly when `payloadType` is null, so an editor can grey the option out and say why instead of offering it and failing the save. |
| `contentRefusal` | `"NESTED_OBJECT" \| "NESTED_ARRAY" \| "NULL_ONLY"` | yes | Why this field can never be the source of a searchable content slot, or null when it can. Non-null means no value the schema admits could render as text, so every record would project empty and be skipped — the declaration is refused rather than accepted into silence. |
| `identityRefusal` | `"LIST" \| "NOT_TEXT"` | yes | Why this field's schema rules it out as the natural key, or null when it might be one. A natural key is stamped only from a string value and is never coerced, so `LIST` (the field holds a list) and `NOT_TEXT` (every value it admits is a number, a boolean, an object or null) mean every record would fail to supply it. Null is not a promise: the key is stamped from the data a record is submitted with, so a `key` on a field whose `family` is not `submission` is refused `USES_KEY_NOT_SUBMITTED` whatever this says, and declaring the key still checks every existing record. |
| `relationSource` | `object` | yes | What a relation declaration may do with this field. Both halves null means the field cannot source an edge at all, and declaring one against it would be rejected. |

Each item of `facets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facetKey` | `string` | yes | The facet's key, unique within the project. |
| `label` | `string` | yes | The facet's human-readable name. |
| `cardinality` | `"one" \| "many"` | yes | Whether a record may carry one term on this facet, or several. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this facet has never seen: dropped, minted as a live term, or minted as a candidate awaiting activation. |
| `matching` | `"exact" \| "semantic"` | yes | How this facet finds a term you already have: the slugified value only, or a meaning-based search of its own terms. |
| `sortOrder` | `integer` | yes | Position in the type's facet order, 0-based and contiguous. This is the field order clients render and the API emits. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declaration` | `"uses" \| "searchable" \| "queryable" \| "relations"` | yes | Which declaration the issue is in. `uses` is the record type's field uses statement, derived as a save derives it: a statement the derivation refuses is reported only as `uses` issues, and one it accepts has the `searchable`, `queryable` and `relations` projections it derives checked. Problems with the natural key arrive as `uses` issues, because the key is derived from the statement. |
| `code` | `string` | yes | The issue's code. For `uses` it is the code a save of the statement reports in its `RECORD_TYPE_USES_INVALID` issues, for example `USES_FIELD_UNKNOWN`, or `USES_KEY_NOT_SUBMITTED` for a `key` on a field that is not part of the submitted data. For `searchable`, `queryable` and `relations` it is the code that declaration's check reports, for example `QUERYABLE_FIELD_UNKNOWN`. |
| `path` | `string` | yes | Where in the declaration the issue is, e.g. `fields[2].source`. Empty for the natural key, which is one value. |
| `message` | `string` | yes | The platform's own sentence for the issue. For `uses` it is followed by the remedy the save gives. |
| `field` | `object \| null` | yes | The contract field the issue is about, as the declaration names it — which may be a field the contract no longer has. Null when the issue is not about one field. |

Each item of `processingGaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"RECORD_CREATED_NOT_QUEUED"` | yes | Always `RECORD_CREATED_NOT_QUEUED`: the flow creates records of this type and has no step that queues them for processing. |
| `message` | `string` | yes | The platform's own sentence, with the way forward. |
| `flow` | `object` | yes | The flow that creates the records. |
| `skillKey` | `string` | yes | The key of the flow's step that creates them. |

### `PATCH /v1/record-types/{id}`

Update one record type: its key, description, shape (`dataEntryId` to point at another entry, or `definition` to rewrite the shape the type owns), flow, owner scope or `uses`. With `validateOnly: true` it writes nothing and answers the save's own verdict, plus what the save would compute: the columns and projections it writes, whether it reindexes, restamps or re-embeds, the contract a shape or flow move leaves (`derived.contract`), the verification of a natural key `uses` declares (`derived.naturalKey`), and what each keyword of a sent `definition` would do (`derived.keywordVerdicts`). A shared shape is edited with `PATCH /v1/schema-entries/{id}`; several rows at once go through `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | The record type's new key. Refused once the type has records, or while a flow step names it. A letter followed by letters and digits, like `Observation`, up to 64 characters. |
| `dataEntryId` | `string` | no | Point the type at a different schema entry. Refused once the type has records. Omit to keep the current one. |
| `definition` | `object` | no | Replace the type's OWN shape — the JSON Schema of the entry this type owns (its inline `shape` in a project document) — wholesale, with the rules a document's inline shape meets: field names, an object schema, keywords something reads, a removed field no stored record still holds, the bound flow's binding, and every captured signature it re-shapes (refused 409 `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`; restate the shape in a project document with `adoptSnapshots` for that). Saved with the type in one transaction, and the entry is named in `touched`. Refused 422 for a type whose shape is a shared entry (edit it with `PATCH /v1/schema-entries/{id}`), and together with `dataEntryId`. |
| `description` | `string \| null` | no | This type's own description, separate from the entry's. |
| `flowId` | `string \| null` | no | Omit to keep the current binding, supply an id to re-bind, or send null to remove the flow entirely. |
| `ownerScope` | `"user" \| "project"` | no | Change who owns records of this type. Refused once the type has records. Omit to keep. |
| `uses` | `object` | no | Replace the type's whole `uses` statement. Omit to keep the current one. Sent WHOLE, never merged: the order of `filter` fields is the slot order, and a merge cannot express a reorder. Every projection is re-derived from it in the same transaction. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored type and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/write-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryKey` | `string` | yes | Current key of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The record type's key. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data — the shape of the entry this type references. A shape the type owns is edited with `definition` on `PATCH /v1/record-types/{id}`; a shared one on its schema entry. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"user" \| "project"` | yes | Who owns records of this type. `user` — each record belongs to one end user, who sees only their own. `project` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
| `dataFields` | `string[]` | yes | Top-level property names declared in `definition`. |
| `contentFields` | `object[]` | yes | Every field a read or list may project, submitted and processed together. Base fields like `id` and `createdAt` are not listed — they always emit and are not selectable. |
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `stream` to the stream store; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
| `searchable` | `object \| null` | yes | DERIVED from `uses`, read-only: what is indexed for search, or null when no field carries `search`. Whether records are isolated per user is NOT declared here — it follows `ownerScope`, so the two cannot disagree. |
| `relations` | `object \| null` | yes | DERIVED from `uses`, read-only: edges this type produces, or null when no field carries `link` and the type declares no join. |
| `queryable` | `object \| null` | yes | DERIVED from `uses`, read-only: fields records of this type may be filtered on, in slot order, or null when no field carries `filter`. One list serving both stores — a field listed here is filterable in the record store and in the vector index alike. |
| `naturalKey` | `string \| null` | yes | DERIVED from `uses`, read-only: the field carrying `key`, or null. Declaring it verifies and stamps every existing record, so it is the one use whose refusal names rows rather than the declaration. |
| `hasRecords` | `boolean` | yes | Whether any records exist. Renames and field removals are refused once this is true. |
| `recordCount` | `integer` | yes | How many records exist under this type. |
| `version` | `integer` | yes | Optimistic-lock version, bumped on every write. Send it back on a PATCH to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `drift` | `"ok" \| "drift" \| "flow-missing" \| "uncaptured" \| "not-flow-backed"` | no | Present when `expand=drift` was requested. |
| `flowLabel` | `string \| null` | no | Label of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write WOULD compute and set in motion. Nothing here has happened. `staleVersion`, `writes`, `resolved` and `effects` are present whenever the patch got far enough to plan, and absent on a refusal its planner raised; the other members say when they appear. |

Each item of `contentFields`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Field name, as a projection would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `source` | `"submission" \| "processed"` | yes | Where the field comes from. `submission` — a property of the record's own data. `processed` — an output the bound flow produces. |

Each item of `contract`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `family` | `"submission" \| "processed" \| "system"` | yes | Where a referenced field comes from. `submission` — the record's own submitted data. `processed` — an output of the flow bound to its type. `system` — a platform-maintained field. |
| `name` | `string` | yes | Field name, as a declaration would reference it. |
| `label` | `string` | yes | Display label — the schema's title when it has one, else the name. |
| `payloadType` | `"keyword" \| "integer" \| "float" \| "bool" \| "datetime"` | yes | Index type this field would get if made searchable, derived from its schema. Null means it cannot be filtered on at all — see `refusal`. |
| `array` | `boolean` | yes | Whether the field is a list of `payloadType` rather than one value. |
| `refusal` | `"UNTYPED" \| "NESTED_OBJECT" \| "NESTED_ARRAY" \| "AMBIGUOUS_UNION" \| "NULL_ONLY" \| "UNSUPPORTED_TYPE"` | yes | Why the field cannot be filtered on. Non-null exactly when `payloadType` is null, so an editor can grey the option out and say why instead of offering it and failing the save. |
| `contentRefusal` | `"NESTED_OBJECT" \| "NESTED_ARRAY" \| "NULL_ONLY"` | yes | Why this field can never be the source of a searchable content slot, or null when it can. Non-null means no value the schema admits could render as text, so every record would project empty and be skipped — the declaration is refused rather than accepted into silence. |
| `identityRefusal` | `"LIST" \| "NOT_TEXT"` | yes | Why this field's schema rules it out as the natural key, or null when it might be one. A natural key is stamped only from a string value and is never coerced, so `LIST` (the field holds a list) and `NOT_TEXT` (every value it admits is a number, a boolean, an object or null) mean every record would fail to supply it. Null is not a promise: the key is stamped from the data a record is submitted with, so a `key` on a field whose `family` is not `submission` is refused `USES_KEY_NOT_SUBMITTED` whatever this says, and declaring the key still checks every existing record. |
| `relationSource` | `object` | yes | What a relation declaration may do with this field. Both halves null means the field cannot source an edge at all, and declaring one against it would be rejected. |

Each item of `facets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facetKey` | `string` | yes | The facet's key, unique within the project. |
| `label` | `string` | yes | The facet's human-readable name. |
| `cardinality` | `"one" \| "many"` | yes | Whether a record may carry one term on this facet, or several. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this facet has never seen: dropped, minted as a live term, or minted as a candidate awaiting activation. |
| `matching` | `"exact" \| "semantic"` | yes | How this facet finds a term you already have: the slugified value only, or a meaning-based search of its own terms. |
| `sortOrder` | `integer` | yes | Position in the type's facet order, 0-based and contiguous. This is the field order clients render and the API emits. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declaration` | `"uses" \| "searchable" \| "queryable" \| "relations"` | yes | Which declaration the issue is in. `uses` is the record type's field uses statement, derived as a save derives it: a statement the derivation refuses is reported only as `uses` issues, and one it accepts has the `searchable`, `queryable` and `relations` projections it derives checked. Problems with the natural key arrive as `uses` issues, because the key is derived from the statement. |
| `code` | `string` | yes | The issue's code. For `uses` it is the code a save of the statement reports in its `RECORD_TYPE_USES_INVALID` issues, for example `USES_FIELD_UNKNOWN`, or `USES_KEY_NOT_SUBMITTED` for a `key` on a field that is not part of the submitted data. For `searchable`, `queryable` and `relations` it is the code that declaration's check reports, for example `QUERYABLE_FIELD_UNKNOWN`. |
| `path` | `string` | yes | Where in the declaration the issue is, e.g. `fields[2].source`. Empty for the natural key, which is one value. |
| `message` | `string` | yes | The platform's own sentence for the issue. For `uses` it is followed by the remedy the save gives. |
| `field` | `object \| null` | yes | The contract field the issue is about, as the declaration names it — which may be a field the contract no longer has. Null when the issue is not about one field. |

Each item of `processingGaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `"RECORD_CREATED_NOT_QUEUED"` | yes | Always `RECORD_CREATED_NOT_QUEUED`: the flow creates records of this type and has no step that queues them for processing. |
| `message` | `string` | yes | The platform's own sentence, with the way forward. |
| `flow` | `object` | yes | The flow that creates the records. |
| `skillKey` | `string` | yes | The key of the flow's step that creates them. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `record-types`, `schema-entries`, `relation-kinds`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "edge-restamp" \| "edges-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `edge-restamp`: stored edges are re-stamped. `edges-deleted`: deleting a relation kind deletes every stored edge of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this type's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

### `DELETE /v1/record-types/{id}`

Delete one record type. Refused (409) while records of it exist, and for a seeded or reserved type. Relation kinds paired only with it go with it, and other types' `joins` it voids are cleared — both reported. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing, with `derived.dependents`: the records that refuse it and the relation kinds and joins it would take along. The type's own shape outlives it as a shared schema entry. Several rows at once: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `key` | `string` | yes | Key of the record type that was removed. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `invalidatedJoins` | `string[]` | yes | Other record types whose join declarations this delete voided, because they named the type you removed. You asked to remove one type and a declaration on a different one changed as a result, so it is reported rather than left to be discovered. |
| `deletedRelationKinds` | `string[]` | yes | Relation kinds removed with this type, because it was the only record-type pair they applied to. A link that applies to no pair connects nothing and cannot be traversed, so it goes rather than being left behind — and every link it had made goes with it. Same reason as the field above: you asked to remove one type and something else changed, so it is reported. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the delete would find, from the reads it decides on. Nothing here has happened. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `record-types`, `schema-entries`, `relation-kinds`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "edge-restamp" \| "edges-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `edge-restamp`: stored edges are re-stamped. `edges-deleted`: deleting a relation kind deletes every stored edge of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this type's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |
