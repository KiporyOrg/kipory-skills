<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

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

List one project's event categories (`?project=<nodeId>`), each with the `version` its PATCH takes and its storage default. A category groups event types; its types: `GET /v1/event-types?categoryId=`. The same registry, as authored, rides `GET /v1/bootstrap` and the `events` section of `GET /v1/projects/{nodeId}/document`. The events a project has recorded: `GET /v1/project-events?project=`; what runs on them: `GET /v1/triggers?project=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose event categories to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventCategories` | `object[]` | yes | The project's event categories, unpaginated. |

### `POST /v1/event-categories`

Create an event category — the group an event type belongs to, and the storage default its types inherit (`durableDefault`). Its key is permanent. With `validateOnly: true` it answers whether the create would be refused (a taken or reserved key), writing nothing. Several at once, with their types: the `events` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the category. |
| `key` | `string` | yes | The category's key, unique within the project. Permanent once created. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | no | Whether event types in this category are stored by default. An individual type can still override it. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the category. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The category's key, unique within the project. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | yes | Whether event types in this category are stored by default. An individual type can override it. |
| `origin` | `"seed" \| "operator"` | yes | Whether this category was authored in the project or installed by the platform. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the category in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/event-categories/{id}`

Read one event category. Every category at once: `GET /v1/event-categories?project=`; its types: `GET /v1/event-types?categoryId=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event category's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the category. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The category's key, unique within the project. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | yes | Whether event types in this category are stored by default. An individual type can override it. |
| `origin` | `"seed" \| "operator"` | yes | Whether this category was authored in the project or installed by the platform. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the category in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/event-categories/{id}`

Change an event category's name or storage default (`durableDefault`); its key is permanent. Types that set `durable` themselves are unaffected. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event category's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New name. Omit to leave it alone. |
| `durableDefault` | `boolean` | no | Change the storage default. Types that set `durable` explicitly are unaffected. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the category. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The category's key, unique within the project. |
| `label` | `string` | yes | Human-readable name. |
| `durableDefault` | `boolean` | yes | Whether event types in this category are stored by default. An individual type can override it. |
| `origin` | `"seed" \| "operator"` | yes | Whether this category was authored in the project or installed by the platform. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the category in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `DELETE /v1/event-categories/{id}`

Delete an event category and every event type in it (`deletedCounts.eventTypes` says how many went). Refused (409) for a built-in category. A trigger that selects one of its types is not deleted with it. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event category's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedCounts` | `object` | yes | What the deletion took with it — deleting a category deletes every type inside it. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `GET /v1/event-types`

List one event category's types (`?categoryId=<category id>`), each with the `version` its PATCH takes and whether a trigger can listen to it (`listenable`: an active, durable type that is not run-scoped). The whole registry, as authored, rides `GET /v1/bootstrap` and the `events` section of `GET /v1/projects/{nodeId}/document`. Its recorded events: `GET /v1/project-events?project=`; the triggers that select a type by `categoryKey`/`eventKey`: `GET /v1/triggers?project=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `categoryId` | `string` | yes | The event category whose types to list, by its ROW ID rather than its key. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventTypes` | `object[]` | yes | The event types in scope, unpaginated. |

### `POST /v1/event-types`

Create an event type in a category: what a flow's `event.emit` step raises, who it is about by default (`defaultScope`), its payload shape (`payloadEntryId`, a schema entry) and whether its events are stored (`durable`, else the category's default). A trigger can select it once it is stored and not run-scoped. Its key is permanent. With `validateOnly: true` it answers whether the create would be refused, writing nothing. Several at once, with their categories: the `events` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `categoryId` | `string` | yes | Id of the category this type belongs to. |
| `key` | `string` | yes | The event type's key, unique within its category. Permanent once created. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | no | Schema entry describing the payload events carry. Omit or pass null for an event with no payload. |
| `durable` | `boolean \| null` | no | Whether events of this type are stored. Omit to follow the category's default rather than overriding it. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `categoryId` | `string` | yes | Id of the category this type belongs to. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The event type's key, unique within its category. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean \| null` | yes | Whether events of this type are stored. Null means it follows the category's `durableDefault` rather than overriding it. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable once the category's `durableDefault` is applied. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within the category, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/event-types/{id}`

Read one event type. Every type of its category: `GET /v1/event-types?categoryId=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `categoryId` | `string` | yes | Id of the category this type belongs to. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The event type's key, unique within its category. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean \| null` | yes | Whether events of this type are stored. Null means it follows the category's `durableDefault` rather than overriding it. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable once the category's `durableDefault` is applied. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within the category, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/event-types/{id}`

Change an event type — name, default scope, payload shape, storage, status; its category and key are permanent. Re-pointing the payload bumps `payloadVersion`. A run-scoped type cannot be durable (422). Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

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
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `categoryId` | `string` | yes | Id of the category this type belongs to. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The event type's key, unique within its category. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean \| null` | yes | Whether events of this type are stored. Null means it follows the category's `durableDefault` rather than overriding it. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable once the category's `durableDefault` is applied. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within the category, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `DELETE /v1/event-types/{id}`

Delete an event type. Refused (409) for a built-in type. Events already recorded stay in `GET /v1/project-events`, and a trigger that selects it is not deleted with it. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
