<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 93e75142d106 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Schema entries

Reusable typed shapes a record type or a flow output refers to. Builtin and library shapes are synthesized on read and have no rows; the seed call materialises the flow-provider entries and is idempotent.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/schema-entries`](#get-v1-schema-entries) |  |
| `POST` | [`/v1/schema-entries`](#post-v1-schema-entries) |  |
| `GET` | [`/v1/schema-entries/{id}`](#get-v1-schema-entries-id) |  |
| `PATCH` | [`/v1/schema-entries/{id}`](#patch-v1-schema-entries-id) |  |
| `DELETE` | [`/v1/schema-entries/{id}`](#delete-v1-schema-entries-id) |  |
| `POST` | [`/v1/schema-entries/seed`](#post-v1-schema-entries-seed) |  |

### `GET /v1/schema-entries`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to read. |
| `provenance` | `string` | no | Comma-separated tiers to include, e.g. `operator,library`. Omit for all. |
| `name` | `string` | no | Exact name to look up. Matches exactly, not as a search, so it returns at most one entry. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: graph. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The types in scope, across every tier unless you filtered by `provenance`. |
| `graph` | `object` | no | The project's type-relation graph. Present only with `expand=graph`, because building it costs the whole graph. |

### `POST /v1/schema-entries`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the type. |
| `name` | `string` | yes | A name for the type. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `definition` | `object` | yes | The type, as a JSON Schema document with an object at the top. Checked against the project's other types when you save, so a reference to something that does not exist is refused. |
| `description` | `string \| null` | no | An optional note about what this type is for. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/schema-entries/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/schema-entries/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | Rename the type. References resolve by id, so nothing breaks — but the name is this type's ADDRESS in the app, so the charset rule applies to a rename exactly as it does to a create. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `definition` | `object` | no | REPLACES the definition wholesale rather than merging into it. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |
| `adoptSnapshots` | `boolean` | no | Permission to re-snapshot everything this edit re-shapes. Endpoints, schedules and record types FREEZE the types they bind, so editing this one leaves their stored copy behind; such an edit is refused with 409 (listing them) unless you set this. ⚠️ Not a formality — adopting re-publishes an endpoint's request and response contract to whoever already calls that route. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/schema-entries/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `name` | `string` | yes | The deleted type's name, echoed back. |

### `POST /v1/schema-entries/seed`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to materialise and then read. |
| `expand` | `"graph"[]` | no | Extra response sections to include, e.g. `["graph"]`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The types in scope, across every tier unless you filtered by `provenance`. |
| `graph` | `object` | no | The project's type-relation graph. Present only with `expand=graph`, because building it costs the whole graph. |
