<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Record types

A record type is a kind of record the project holds — its shape, owner scope, facets, natural key and processing flow. Name, owner scope and data-shape reference freeze once the first record exists.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/record-types`](#get-v1-record-types) |  |
| `POST` | [`/v1/record-types`](#post-v1-record-types) |  |
| `GET` | [`/v1/record-types/{id}`](#get-v1-record-types-id) |  |
| `PATCH` | [`/v1/record-types/{id}`](#patch-v1-record-types-id) |  |
| `DELETE` | [`/v1/record-types/{id}`](#delete-v1-record-types-id) |  |
| `GET` | [`/v1/record-types/{id}/contract-preview`](#get-v1-record-types-id-contract-preview) |  |
| `POST` | [`/v1/record-types/{id}/contract-preview`](#post-v1-record-types-id-contract-preview) |  |
| `POST` | [`/v1/record-types/{id}/natural-key-preview`](#post-v1-record-types-id-natural-key-preview) |  |

### `GET /v1/record-types`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose record types to list. |
| `name` | `string` | no | Return only the type with this exact name. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabels, outputDefinition, contract, facets, uses, restamp, migration. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `recordTypes` | `object[]` | yes | Record types in the project, with any requested expansions. |

### `POST /v1/record-types`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the type. |
| `name` | `string` | yes | Name for the record type. |
| `dataEntryId` | `string` | yes | Existing schema entry in the same project that defines the type's data shape. On this route a shape is always an entry that already exists. To declare a type together with a shape of its OWN, state it inline in a project document (`records.<name>.shape`); an entry another record type owns is refused here with SCHEMA_ENTRY_OWNED. |
| `description` | `string \| null` | no | This type's own description, separate from the entry's. |
| `flowId` | `string \| null` | no | Processing flow to bind. Supply one to have records processed on creation; omit or null to store them as submitted. |
| `ownerScope` | `"USER" \| "PROJECT"` | yes | Who owns records of this type: USER for one person's own records, PROJECT for the project's shared content pool. Required — it is immutable once the type has records, so there is no safe default. |
| `uses` | `object` | no | What each field is for. Omit for a type whose fields are stored with the record and read whole. Every projection — `searchable`, `queryable`, `relations`, the natural key, the facet links — is derived from this and cannot be sent directly. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/write-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD compute and set in motion. Nothing here has happened. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryName` | `string` | yes | Current name of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | Name of the record type. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data. Read-only here — edit it on the schema entry this type references. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"USER" \| "PROJECT"` | yes | Who owns records of this type. `USER` — each record belongs to one end user, who sees only their own. `PROJECT` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
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
| `flowLabel` | `string \| null` | no | Name of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `dependents` | `object` | no | What deleting this type is refused over, and what the delete removes with it. Present when `expand=dependents` was requested on `GET /v1/record-types/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

### `GET /v1/record-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabels, outputDefinition, contract, facets, uses, restamp, migration, embedding, vectorProgress, diagnostics, dependents, processingGaps. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryName` | `string` | yes | Current name of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | Name of the record type. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data. Read-only here — edit it on the schema entry this type references. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"USER" \| "PROJECT"` | yes | Who owns records of this type. `USER` — each record belongs to one end user, who sees only their own. `PROJECT` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
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
| `flowLabel` | `string \| null` | no | Name of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `dependents` | `object` | no | What deleting this type is refused over, and what the delete removes with it. Present when `expand=dependents` was requested on `GET /v1/record-types/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

### `PATCH /v1/record-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | New name. Refused once the type has records. |
| `dataEntryId` | `string` | no | Point the type at a different schema entry. Refused once the type has records. Omit to keep the current one. |
| `description` | `string \| null` | no | This type's own description, separate from the entry's. |
| `flowId` | `string \| null` | no | Omit to keep the current binding, supply an id to re-bind, or send null to remove the flow entirely. |
| `ownerScope` | `"USER" \| "PROJECT"` | no | Change who owns records of this type. Refused once the type has records. Omit to keep. |
| `uses` | `object` | no | Replace the type's whole `uses` statement. Omit to keep the current one. Sent WHOLE, never merged: the order of `filter` fields is the slot order, and a merge cannot express a reorder. Every projection is re-derived from it in the same transaction. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored type and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/write-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Record type id — the address for every type verb. |
| `dataEntryId` | `string` | yes | Schema entry this type takes its data shape from. A reference, not ownership — the entry is edited on its own surface and renaming it does not break this link. |
| `dataEntryName` | `string` | yes | Current name of that schema entry, for display. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | Name of the record type. |
| `definition` | `unknown` | no | JSON Schema for a record's own submitted data. Read-only here — edit it on the schema entry this type references. |
| `description` | `string \| null` | yes | This type's own description, separate from the schema entry's. |
| `flowId` | `string \| null` | yes | Processing flow bound to this type. Non-null means records are created pending and processed by this flow; null means they are stored as submitted. |
| `origin` | `"seed" \| "operator"` | yes | `seed` — created by the platform when the project was set up. `operator` — created by you. |
| `ownerScope` | `"USER" \| "PROJECT"` | yes | Who owns records of this type. `USER` — each record belongs to one end user, who sees only their own. `PROJECT` — records form a shared pool every user of the project can see. This also decides whether search results are isolated per user, so the two can never disagree. |
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
| `flowLabel` | `string \| null` | no | Name of the bound flow. Present when `expand=flowLabels` was requested; null when the type binds no flow, or binds one outside this project. |
| `outputDefinition` | `unknown` | no | JSON Schema of what the bound flow produces, derived from its captured snapshot. Present when `expand=outputDefinition` was requested; null when the type binds no flow or no snapshot was captured. |
| `contract` | `object[]` | no | Fields a searchable or relations declaration may reference, each with its derived index type. Present when `expand=contract` was requested. |
| `facets` | `object[]` | no | The facets this type surfaces, in order. Present when `expand=facets` was requested; an empty array means the type surfaces none, which is not the same as the project having none. |
| `usesRouting` | `object` | no | Present when `expand=uses` was requested: per field, where each declared use was routed — the store, and the column, slot, payload key, edge kind or facet position it resolved to — plus which use kinds this deployment can read at all. |
| `restamp` | `object` | no | Present when `expand=restamp` was requested. |
| `embedding` | `object` | no | Present when `expand=embedding` was requested. |
| `vectorProgress` | `object` | no | Present when `expand=vectorProgress` was requested. |
| `diagnostics` | `object[]` | no | Stored declarations this type's current contract no longer supports, found by running the checks a save runs against what is stored now. Present when `expand=diagnostics` was requested on `GET /v1/record-types/{id}`; an empty array means every declaration still holds. |
| `processingGaps` | `object[]` | no | The flows of this project that create records of this type without queuing them for processing, so the records wait PENDING with no run coming. Present when `expand=processingGaps` was requested on `GET /v1/record-types/{id}`; always empty for a type that binds no processing flow. |
| `dependents` | `object` | no | What deleting this type is refused over, and what the delete removes with it. Present when `expand=dependents` was requested on `GET /v1/record-types/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD compute and set in motion. Nothing here has happened. |

### `DELETE /v1/record-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/delete-preflight`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `name` | `string` | yes | Name of the record type that was removed. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `invalidatedJoins` | `string[]` | yes | Other record types whose join declarations this delete voided, because they named the type you removed. You asked to remove one type and a declaration on a different one changed as a result, so it is reported rather than left to be discovered. |
| `deletedRelationKinds` | `string[]` | yes | Relation kinds removed with this type, because it was the only record-type pair they applied to. A link that applies to no pair connects nothing and cannot be traversed, so it goes rather than being left behind — and every link it had made goes with it. Same reason as the field above: you asked to remove one type and something else changed, so it is reported. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `GET /v1/record-types/{id}/contract-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `dataEntryId` | `string` | no | Propose re-pointing the data shape at this operator entry. Omit to keep the stored one. Validated by the same resolver the PATCH uses, so an entry this refuses is one the save would refuse too. |
| `flow` | `string` | no | Propose a binding: a flow id to bind, the literal `none` to unbind, or omit to keep the stored binding. ⚠️ A proposed flow is resolved against its LIVE signature — which is what a re-bind captures — never against the snapshot this descriptor already stores. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `contract` | `object[]` | yes | The field vocabulary the proposed descriptor would have — the same shape `expand=contract` returns for the stored one. |
| `definition` | `unknown` | no | The PROPOSED shape's JSON Schema. ⚠️ Carried because a consumer that draws the contract needs each field's own declared type, which the contract section deliberately does not hold — it carries the derived INDEX type. Without it a preview would redraw the grid and lose a column the stored read can fill. |
| `outputDefinition` | `unknown` | no | What the PROPOSED binding would produce, synthesized from the signature this preview resolved. Null when the proposal is flow-less — the same meaning `expand=outputDefinition` gives it. |
| `declarations` | `object` | yes | One verdict per declaration this type actually holds; null where it declares nothing, which is a different answer from surviving. |

### `POST /v1/record-types/{id}/contract-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `definition` | `object` | yes | The drafted JSON Schema of the shape this type already points at. Gated by the rules a save of it meets — field names, an object schema, and the stored flow's binding when `flow` is omitted — each a 422. Judged against the binding as stored: a save that re-shapes a frozen signature is refused until re-sent with `adoptSnapshots`, and a removal with stored records is refused; the document plan answers both. The `declarations` verdicts are the STORED declarations under this draft — a save restating `uses` is judged by those instead. |
| `flow` | `string` | no | Propose a binding: a flow id to bind, the literal `none` to unbind, or omit to keep the stored binding. ⚠️ A proposed flow is resolved against its LIVE signature — which is what a re-bind captures — never against the snapshot this descriptor already stores. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `contract` | `object[]` | yes | The field vocabulary the proposed descriptor would have — the same shape `expand=contract` returns for the stored one. |
| `definition` | `unknown` | no | The PROPOSED shape's JSON Schema. ⚠️ Carried because a consumer that draws the contract needs each field's own declared type, which the contract section deliberately does not hold — it carries the derived INDEX type. Without it a preview would redraw the grid and lose a column the stored read can fill. |
| `outputDefinition` | `unknown` | no | What the PROPOSED binding would produce, synthesized from the signature this preview resolved. Null when the proposal is flow-less — the same meaning `expand=outputDefinition` gives it. |
| `declarations` | `object` | yes | One verdict per declaration this type actually holds; null where it declares nothing, which is a different answer from surviving. |

### `POST /v1/record-types/{id}/natural-key-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fields` | `string[]` | yes | Fields to measure against the existing records. Repeats are answered once. Bounded because each one is verified over every record the type has. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `declared` | `string \| null` | yes | The field declared today, or null when the type declares none. |
| `examined` | `integer` | yes | Records every candidate below was measured against. |
| `candidates` | `object[]` | yes | One verdict per field asked about, in the order asked. |
