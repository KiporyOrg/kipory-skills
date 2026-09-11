<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8a31334ff890 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Event categories and types

The project's declared event registry. Types are scoped by their category's id, not by the project; seeded rows refuse delete and accept patch.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/event-categories`](#get-v1-event-categories) |  |
| `POST` | [`/v1/event-categories`](#post-v1-event-categories) |  |
| `GET` | [`/v1/event-categories/{id}`](#get-v1-event-categories-id) |  |
| `PATCH` | [`/v1/event-categories/{id}`](#patch-v1-event-categories-id) |  |
| `DELETE` | [`/v1/event-categories/{id}`](#delete-v1-event-categories-id) |  |
| `GET` | [`/v1/event-types`](#get-v1-event-types) |  |
| `POST` | [`/v1/event-types`](#post-v1-event-types) |  |
| `GET` | [`/v1/event-types/{id}`](#get-v1-event-types-id) |  |
| `PATCH` | [`/v1/event-types/{id}`](#patch-v1-event-types-id) |  |
| `DELETE` | [`/v1/event-types/{id}`](#delete-v1-event-types-id) |  |

### `GET /v1/event-categories`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose event categories to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventCategories` | `object[]` | yes | The project's event categories, unpaginated. |

### `POST /v1/event-categories`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the category. |
| `categoryKey` | `string` | yes | Stable key for the category, unique within the project. Permanent once created. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | no | Whether event types in this category are stored by default. An individual type can still override it. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the category. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | Stable key for the category, unique within the project. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | yes | Whether event types in this category are stored by default. An individual type can override it. |
| `origin` | `"seed" \| "operator"` | yes | Whether this category was authored in the project or installed by the platform. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the category in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/event-categories/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event category's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the category. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | Stable key for the category, unique within the project. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | yes | Whether event types in this category are stored by default. An individual type can override it. |
| `origin` | `"seed" \| "operator"` | yes | Whether this category was authored in the project or installed by the platform. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the category in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/event-categories/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event category's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New name. Omit to leave it alone. |
| `durableDefault` | `boolean` | no | Change the storage default. Types that set `durable` explicitly are unaffected. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the category. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | Stable key for the category, unique within the project. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | yes | Whether event types in this category are stored by default. An individual type can override it. |
| `origin` | `"seed" \| "operator"` | yes | Whether this category was authored in the project or installed by the platform. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the category in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/event-categories/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event category's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedCounts` | `object` | yes | What the deletion took with it — deleting a category deletes every type inside it. |

### `GET /v1/event-types`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `category` | `string` | yes | The event category whose types to list, by its ROW ID rather than its key. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventTypes` | `object[]` | yes | The event types in scope, unpaginated. |

### `POST /v1/event-types`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `category` | `string` | yes | Id of the category this type belongs to. |
| `eventKey` | `string` | yes | Stable key for the event, unique within its category. Permanent once created. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | no | Schema entry describing the payload events carry. Omit or pass null for an event with no payload. |
| `durable` | `boolean \| null` | no | Whether events of this type are stored. Omit to follow the category's default rather than overriding it. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `category` | `string` | yes | Id of the category this type belongs to. |
| `project` | `string` | yes | Node id of the owning project. |
| `eventKey` | `string` | yes | Stable key for the event, unique within its category. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean \| null` | yes | Whether events of this type are stored. Null means it follows the category's `durableDefault` rather than overriding it. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within the category, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/event-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `category` | `string` | yes | Id of the category this type belongs to. |
| `project` | `string` | yes | Node id of the owning project. |
| `eventKey` | `string` | yes | Stable key for the event, unique within its category. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean \| null` | yes | Whether events of this type are stored. Null means it follows the category's `durableDefault` rather than overriding it. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within the category, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/event-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New name. Omit to leave it alone. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | no | Change who events of this type are about. Events already recorded keep the scope they were emitted with. |
| `payloadEntryId` | `string \| null` | no | Point at a different payload schema, or null for no payload. |
| `durable` | `boolean \| null` | no | Change whether events are stored; pass null to go back to following the category default. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | no | Retire the type or bring it back. ⚠️ This is MANAGEMENT METADATA and does not gate emitting: the emit path drops `status`, so a retired type still fires exactly like an active one. Retiring says 'stop authoring against this'; removing the `event.emit` node is how you stop it firing. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `category` | `string` | yes | Id of the category this type belongs to. |
| `project` | `string` | yes | Node id of the owning project. |
| `eventKey` | `string` | yes | Stable key for the event, unique within its category. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean \| null` | yes | Whether events of this type are stored. Null means it follows the category's `durableDefault` rather than overriding it. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within the category, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/event-types/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
