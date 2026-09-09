<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8f1c60e82a35 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Project config

Namespaced runtime tunables a flow reads, typed by a bound shape. The write is an upsert on (project, namespace); a stale `version` is refused.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/project-config`](#get-v1-project-config) |  |
| `POST` | [`/v1/project-config`](#post-v1-project-config) |  |
| `DELETE` | [`/v1/project-config/{id}`](#delete-v1-project-config-id) |  |

### `GET /v1/project-config`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose config to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `namespaces` | `object[]` | yes | Every configured namespace for the project, one entry each. |

### `POST /v1/project-config`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the owning project. |
| `namespace` | `string` | yes | Namespace to set. Together with the project this is the natural key — the write is an idempotent upsert, not a create. |
| `data` | `object` | yes | Explicit overrides, replacing whatever was stored. Serialized size is capped at 32768 bytes: this map is seeded into every flow run, so anything larger is content and belongs in a record. |
| `schemaEntryId` | `string` | no | Schema entry to type this namespace by. Required when creating the namespace; on update, omit to keep the current binding or pass a different id to re-bind. |
| `version` | `integer` | no | The version you last read. Required when the namespace already exists — a stale value is refused with 409. Ignored on create. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `namespace` | `string` | yes | The namespace these settings belong to, e.g. `ranking`. |
| `schemaEntryId` | `string` | yes | Schema entry that types this namespace and supplies each field's default. A soft reference: if the entry is deleted, reads keep working and the next write is refused with 422 naming it. |
| `data` | `object` | yes | Your explicit overrides ONLY. A key's absence means “use the default”, so this is usually much smaller than `effective`. |
| `effective` | `object` | yes | Defaults overlaid with `data` — what flows actually read. Computed per request and never stored, so editing a default in the schema entry takes effect here immediately. Overlay is per top-level field: an override replaces the whole field rather than merging into it. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/project-config/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The config namespace's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
