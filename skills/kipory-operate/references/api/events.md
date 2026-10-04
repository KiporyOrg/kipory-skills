<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Event types

The project's declared event registry. Each type carries its namespace (`categoryKey`); a new namespace needs nothing created first. Seeded rows refuse delete and accept patch.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/event-types`](#get-v1-event-types) |  |
| `POST` | [`/v1/event-types`](#post-v1-event-types) |  |
| `GET` | [`/v1/event-types/{id}`](#get-v1-event-types-id) |  |
| `PATCH` | [`/v1/event-types/{id}`](#patch-v1-event-types-id) |  |
| `DELETE` | [`/v1/event-types/{id}`](#delete-v1-event-types-id) |  |

### `GET /v1/event-types`

List one project's event types (`?project=<nodeId>`, optionally only one namespace with `categoryKey`), each with the `version` its PATCH takes and whether a trigger can listen to it (`listenable`: an active, durable type that is not run-scoped). The whole registry, as authored, rides `GET /v1/bootstrap` and the `events` section of `GET /v1/projects/{nodeId}/document`. Its recorded events: `GET /v1/project-events?project=`; the triggers that select a type by `categoryKey`/`eventKey`: `GET /v1/triggers?project=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose event types to list. |
| `categoryKey` | `string` | no | Only the types in this namespace. Omit for every type in the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventTypes` | `object[]` | yes | The event types in scope, unpaginated. |

Each item of `eventTypes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | The namespace this event lives in: the first half of its `categoryKey/key` address, and the channel and group it is published and shown under. |
| `key` | `string` | yes | The event type's key, unique within its namespace. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean` | yes | Whether events of this type are stored in the project's event log, where a trigger can react to them. False: published live and forgotten. Never true for a run-scoped type. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within its namespace, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/event-types`

Create an event type in a project: the namespace it lives in (`categoryKey` — a new one needs nothing created first), what a flow's `event.emit` step raises, who it is about by default (`defaultScope`), its payload shape (`payloadEntryId`, a schema entry) and whether its events are stored in the event log (`durable`, default false). A trigger can select it once it is stored and not run-scoped. Its namespace and key are permanent. A reserved platform channel name is refused (422), and so is a source provider's namespace (409 — only that provider's source writes there). With `validateOnly: true` it answers whether the create would be refused, writing nothing. Several at once: the `events` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the event type. |
| `categoryKey` | `string` | yes | The namespace the event lives in — the first half of its `categoryKey/key` address. A new key opens a new namespace; nothing has to be created first. Permanent once created. Refused when it is a reserved platform channel name, or the namespace of a source provider (only that provider's source writes there). Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `key` | `string` | yes | The event type's key, unique within its namespace. Permanent once created. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | no | Schema entry describing the payload events carry. Omit or pass null for an event with no payload. |
| `durable` | `boolean` | no | Whether events of this type are stored in the event log, where a trigger can react to them. Omit for false (published live only). Refused as true on a run-scoped type. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | The namespace this event lives in: the first half of its `categoryKey/key` address, and the channel and group it is published and shown under. |
| `key` | `string` | yes | The event type's key, unique within its namespace. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean` | yes | Whether events of this type are stored in the project's event log, where a trigger can react to them. False: published live and forgotten. Never true for a run-scoped type. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within its namespace, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/event-types/{id}`

Read one event type. Every type of its project: `GET /v1/event-types?project=` (one namespace: add `categoryKey`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The event type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | The namespace this event lives in: the first half of its `categoryKey/key` address, and the channel and group it is published and shown under. |
| `key` | `string` | yes | The event type's key, unique within its namespace. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean` | yes | Whether events of this type are stored in the project's event log, where a trigger can react to them. False: published live and forgotten. Never true for a run-scoped type. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within its namespace, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/event-types/{id}`

Change an event type — name, default scope, payload shape, storage, status; its namespace (`categoryKey`) and key are permanent. Re-pointing the payload bumps `payloadVersion`. A run-scoped type cannot be durable (422). Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

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
| `durable` | `boolean` | no | Change whether events are stored in the event log. Refused as true on a run-scoped type. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | no | Retire the type or bring it back. ⚠️ This is MANAGEMENT METADATA and does not gate emitting: the emit path drops `status`, so a retired type still fires exactly like an active one. Retiring says 'stop authoring against this'; removing the `event.emit` node is how you stop it firing. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the event type. |
| `project` | `string` | yes | Node id of the owning project. |
| `categoryKey` | `string` | yes | The namespace this event lives in: the first half of its `categoryKey/key` address, and the channel and group it is published and shown under. |
| `key` | `string` | yes | The event type's key, unique within its namespace. |
| `label` | `string` | yes | Human-readable name. |
| `defaultScope` | `"run" \| "record" \| "user" \| "project"` | yes | Who an event of this type is about by default — one run, one record, one user, or the project. |
| `payloadEntryId` | `string \| null` | yes | Schema entry describing the payload an event of this type carries, or null when it carries none. |
| `payloadVersion` | `integer` | yes | Which version of that payload shape this type currently declares. Unrelated to `version` below, which is the concurrency guard. |
| `durable` | `boolean` | yes | Whether events of this type are stored in the project's event log, where a trigger can react to them. False: published live and forgotten. Never true for a run-scoped type. |
| `status` | `"draft" \| "active" \| "deprecated" \| "retired"` | yes | Whether this type is in use or retired. |
| `listenable` | `boolean` | yes | COMPUTED, read-only. Whether a trigger can listen to this type: it is `active`, it is not run-scoped, and it is durable. The same test a trigger create, update, enable or replay applies — a type reading false here is refused there with a 422 that names which of the three failed. |
| `origin` | `"seed" \| "operator"` | yes | Whether this type was authored in the project or installed by the platform. |
| `sortOrder` | `integer` | yes | Position within its namespace, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the type in the meantime. Not the same as `payloadVersion`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

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

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
