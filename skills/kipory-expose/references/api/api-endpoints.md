<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: f70ac5c86d2c · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Dynamic endpoints

A project's own `/v1/*` routes, served on the project's host and backed by a flow. Read with `expand=shadowed` to learn whether a coded route wins over yours; `invokeUrl` is computed and may be null on a deployment with no derivable public host.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/api-endpoints`](#get-v1-api-endpoints) |  |
| `POST` | [`/v1/api-endpoints`](#post-v1-api-endpoints) |  |
| `GET` | [`/v1/api-endpoints/{id}`](#get-v1-api-endpoints-id) |  |
| `PATCH` | [`/v1/api-endpoints/{id}`](#patch-v1-api-endpoints-id) |  |
| `DELETE` | [`/v1/api-endpoints/{id}`](#delete-v1-api-endpoints-id) |  |

### `GET /v1/api-endpoints`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose endpoints to list. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, shadowed. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `apiEndpoints` | `object[]` | yes | Every readable endpoint in the project. Elements here are always fully valid — anything that failed to parse is in `unreadable` instead, so you never have to null-check a config. |
| `unreadable` | `object[]` | yes | Endpoints whose stored configuration no longer parses. Empty in the healthy case. They are listed rather than dropped so a broken row is visible and fixable instead of silently missing. |

### `POST /v1/api-endpoints`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the endpoint. |
| `endpoint` | `string` | yes | Your identifier for this endpoint within the project. Permanent — PATCH will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `contractConfig` | `object` | yes | The request contract of a dynamic endpoint: method + path template + declared parameters. Unknown keys are rejected (422). |
| `actionConfig` | `object` | yes | The executable action to bind, discriminated on `kind`: flow.invoke (run a flow, buffered output), flow.stream (run a flow, SSE), or events.subscribe (stream registry events, SSE). A flow-backed action names its flow by id only — the save reads the flow's slug and snapshots its signature authoritatively, so neither is accepted here. Unknown keys are rejected (422). |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `endpoint` | `string` | yes | Your identifier for this endpoint within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null when the deployment has no derivable public host (local dev). |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, slug and name. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |

### `GET /v1/api-endpoints/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, shadowed. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `endpoint` | `string` | yes | Your identifier for this endpoint within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null when the deployment has no derivable public host (local dev). |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, slug and name. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |

### `PATCH /v1/api-endpoints/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. REQUIRED here, unlike most design resources where it is optional: both configs are replaced wholesale, so a blind write would silently discard a concurrent edit. A mismatch is refused with 409. |
| `contractConfig` | `object` | yes | The request contract of a dynamic endpoint: method + path template + declared parameters. Unknown keys are rejected (422). |
| `actionConfig` | `object` | yes | The executable action to bind, discriminated on `kind`: flow.invoke (run a flow, buffered output), flow.stream (run a flow, SSE), or events.subscribe (stream registry events, SSE). A flow-backed action names its flow by id only — the save reads the flow's slug and snapshots its signature authoritatively, so neither is accepted here. Unknown keys are rejected (422). |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `endpoint` | `string` | yes | Your identifier for this endpoint within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null when the deployment has no derivable public host (local dev). |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, slug and name. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |

### `DELETE /v1/api-endpoints/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `endpoint` | `string` | yes | The deleted endpoint's key, echoed so a log line names what went. The key is free again immediately — a new endpoint may reuse it. |
