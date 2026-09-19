<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: aae5177f21e5 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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
| `POST` | [`/v1/record-types/{id}/natural-key-preview`](#post-v1-record-types-id-natural-key-preview) |  |
| `POST` | [`/v1/record-types/{id}/write-preview`](#post-v1-record-types-id-write-preview) |  |

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
| `dataEntryId` | `string` | yes | Existing schema entry in the same project that defines the type's data shape. Shapes are authored on the registry — a definition cannot be supplied inline here. |
| `description` | `string \| null` | no | This type's own description, separate from the entry's. |
| `flowId` | `string \| null` | no | Processing flow to bind. Supply one to have records processed on creation; omit or null to store them as submitted. |
| `ownerScope` | `"USER" \| "PROJECT"` | yes | Who owns records of this type: USER for one person's own records, PROJECT for the project's shared content pool. Required — it is immutable once the type has records, so there is no safe default. |
| `uses` | `object` | no | What each field is for. Omit for a type whose fields are stored with the record and read whole. Every projection — `searchable`, `queryable`, `relations`, the natural key, the facet links — is derived from this and cannot be sent directly. |

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
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `file` to object storage; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
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
| `dependents` | `object` | no | What deleting this type is refused over, and what the delete removes with it. Present when `expand=dependents` was requested on `GET /v1/record-types/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

### `GET /v1/record-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabels, outputDefinition, contract, facets, uses, restamp, migration, embedding, vectorProgress, diagnostics, dependents. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

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
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `file` to object storage; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
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
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

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
| `uses` | `object` | yes | What each field is FOR — the one authored statement this type carries. Every use routes the field to a store: `filter` to an indexed column, `search` to the vector index, `link` to the edge store, `key` to the natural-key index, `file` to object storage; the type-level `facets` list routes to the term vocabulary. `searchable`, `relations`, `queryable`, `naturalKey` and the facet links below are DERIVED from it and read-only. |
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
| `dependents` | `object` | no | What deleting this type is refused over, and what the delete removes with it. Present when `expand=dependents` was requested on `GET /v1/record-types/{id}`. |
| `migration` | `object` | no | Present when `expand=migration` was requested. |

### `DELETE /v1/record-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `name` | `string` | yes | Name of the record type that was removed. |
| `invalidatedJoins` | `string[]` | yes | Other record types whose join declarations this delete voided, because they named the type you removed. You asked to remove one type and a declaration on a different one changed as a result, so it is reported rather than left to be discovered. |
| `deletedRelationKinds` | `string[]` | yes | Relation kinds removed with this type, because it was the only record-type pair they applied to. A link that applies to no pair connects nothing and cannot be traversed, so it goes rather than being left behind — and every link it had made goes with it. Same reason as the field above: you asked to remove one type and something else changed, so it is reported. |

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

### `POST /v1/record-types/{id}/write-preview`

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
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `accepted` | `boolean` | yes | Whether the platform would take this write. False carries the refusal below; it is an ANSWER rather than an error, which is why this route returns 200 for it. |
| `refusal` | `object \| null` | yes | Why the write would be refused. Null when it would be taken. |
| `staleVersion` | `boolean` | yes | Whether the `version` you sent is already behind the stored one — the save would answer 409. ⚠️ Reported separately from `refusal` because everything else about the plan is still true: this tells you to re-read and reconcile, not that the patch is wrong. |
| `writes` | `string[]` | yes | The record-type columns this save would write, sorted. `version` is excluded — every save bumps it. An EMPTY list on an accepted write means the request changes nothing, which is the silent outcome this route exists to surface. |
| `resolved` | `object` | yes | What would land in each declaration column, with the platform's own resolutions applied. Null where the type would declare nothing. |
| `effects` | `object` | yes | What the save sets in motion AFTER it commits. Neither has a symptom at the call site, which is why they are here. |
