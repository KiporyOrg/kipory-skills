<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Dynamic endpoints

A project's own `/v1/*` routes, served on the project's host and backed by a flow. Read with `expand=shadowed` to learn whether a coded route wins over yours; `invokeUrl` is computed and may be null on a deployment with no derivable public host.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/api-endpoints`](#get-v1-api-endpoints) |  |
| `POST` | [`/v1/api-endpoints`](#post-v1-api-endpoints) |  |
| `GET` | [`/v1/api-endpoints/{id}`](#get-v1-api-endpoints-id) |  |
| `PATCH` | [`/v1/api-endpoints/{id}`](#patch-v1-api-endpoints-id) |  |
| `DELETE` | [`/v1/api-endpoints/{id}`](#delete-v1-api-endpoints-id) |  |

### `GET /v1/api-endpoints`

List one project's endpoints (`?project=<nodeId>`) — the routes your product serves, each binding a method and path to a flow (`flow.invoke`, `flow.stream`) or to an event subscription — each with the `version` its PATCH takes. A stored row that no longer parses is listed in `unreadable` rather than failing the read. `expand=drift` flags an endpoint whose bound flow's signature moved since it was saved, `expand=flowLabel` names the bound flow, `expand=shadowed` the platform route that has grown over its path. The same rows, as authored, ride `GET /v1/bootstrap` (`surfaces.apiEndpoints`) and the `surfaces.endpoints` section of `GET /v1/projects/{nodeId}/document`. The flows they bind: `GET /v1/flows?project=`.

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

Each item of `apiEndpoints`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host — an api served on a bare `localhost`, for one; a local api with a named host such as `api.<name>.localhost` has one. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's handlers — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a synchronous flow.invoke waits for its run before answering 504, in ms — `syncTimeoutMs` clamped to the ceiling, else the platform default. Null for an async invoke, a stream or a subscription, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |

Each item of `unreadable`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for patch and delete. |
| `key` | `string` | yes | The endpoint's key, so you can recognise it. |
| `contractIssues` | `object[]` | yes | What is wrong with the request contract, one entry per failed field. Empty when that half is fine and the problem is only in the action. |
| `actionIssues` | `object[]` | yes | What is wrong with the action, one entry per failed field. Empty when that half is fine. Both are never empty at once — an endpoint listed here failed at least one. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back when you write the fix. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/api-endpoints`

Create one endpoint: a method and path under the project's host, bound to a flow of this project (`flow.invoke`, or `flow.stream` for a live answer) or to an event subscription. The bound flow's signature is snapshotted, so a later change to the flow shows as drift on the endpoint rather than as a silent break; the flow itself is authored at `/v1/flows`. With `validateOnly: true` it answers whether the create would be refused, who could call the draft and where it would sit in the match order (`derived`), writing nothing. Several endpoints at once, beside the flows they bind: the `surfaces.endpoints` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the endpoint. |
| `key` | `string` | yes | The endpoint's key within the project. Permanent — PATCH will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `contractConfig` | `object` | yes | The request contract of a dynamic endpoint: method + path template + declared parameters. Unknown keys are rejected (422). |
| `actionConfig` | `object` | yes | The executable action to bind, discriminated on `kind`: flow.invoke (run a flow, buffered output), flow.stream (run a flow, SSE), or events.subscribe (stream registry events, SSE). A flow-backed action names its flow by id only — the save reads the flow's key and snapshots its signature authoritatively, so neither is accepted here. Unknown keys are rejected (422). |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed, derived from the draft by the same functions a read derives them from for a stored row. Present whenever the body was coherent enough to compute them, which is not the same as `ok`. ⚠️ BOTH ARE SNAPSHOTS: `resolutionRank` is a position among the project's OTHER endpoints and a sibling saved first moves it, and `access` is re-derived inside the write's own transaction from the bound flow as it stands then. |

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
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host — an api served on a bare `localhost`, for one; a local api with a named host such as `api.<name>.localhost` has one. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's handlers — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a synchronous flow.invoke waits for its run before answering 504, in ms — `syncTimeoutMs` clamped to the ceiling, else the platform default. Null for an async invoke, a stream or a subscription, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |

Each item of `partiallyShadowedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `string` | yes | The platform route's method — always equal to your endpoint's, since a shadow is a same-method collision. |
| `path` | `string` | yes | The platform route's path template. It may LOOK different from yours and still collide: matching ignores parameter names, so `/v1/keys/{apiKeyId}` collides with `/v1/keys/{id}`. |
| `group` | `string` | yes | Which part of the platform took the path. |

### `GET /v1/api-endpoints/{id}`

Read one endpoint. `expand` takes the list's keys (`drift`, `flowLabel`, `shadowed`). Every endpoint at once: `GET /v1/api-endpoints?project=`.

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
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host — an api served on a bare `localhost`, for one; a local api with a named host such as `api.<name>.localhost` has one. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's handlers — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a synchronous flow.invoke waits for its run before answering 504, in ms — `syncTimeoutMs` clamped to the ceiling, else the platform default. Null for an async invoke, a stream or a subscription, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |

Each item of `partiallyShadowedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `string` | yes | The platform route's method — always equal to your endpoint's, since a shadow is a same-method collision. |
| `path` | `string` | yes | The platform route's path template. It may LOOK different from yours and still collide: matching ignores parameter names, so `/v1/keys/{apiKeyId}` collides with `/v1/keys/{id}`. |
| `group` | `string` | yes | Which part of the platform took the path. |

### `PATCH /v1/api-endpoints/{id}`

Change one endpoint: its contract (method, path, parameters) and its action, both replaced whole; the key is permanent. Saving re-snapshots the bound flow's signature, which is how drift is cleared. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused and what it would publish (`derived`), writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. REQUIRED here, unlike most design resources where it is optional: both configs are replaced wholesale, so a blind write would silently discard a concurrent edit. A mismatch is refused with 409. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `contractConfig` | `object` | yes | The request contract of a dynamic endpoint: method + path template + declared parameters. Unknown keys are rejected (422). |
| `actionConfig` | `object` | yes | The executable action to bind, discriminated on `kind`: flow.invoke (run a flow, buffered output), flow.stream (run a flow, SSE), or events.subscribe (stream registry events, SSE). A flow-backed action names its flow by id only — the save reads the flow's key and snapshots its signature authoritatively, so neither is accepted here. Unknown keys are rejected (422). |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `contractConfig` | `object` | yes | What the endpoint ACCEPTS: method, path template, declared parameters. |
| `actionConfig` | `object` | yes | What the endpoint DOES when called — which flow it runs, how its inputs are bound, and whether it answers synchronously or streams. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host — an api served on a bare `localhost`, for one; a local api with a named host such as `api.<name>.localhost` has one. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's handlers — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a synchronous flow.invoke waits for its run before answering 504, in ms — `syncTimeoutMs` clamped to the ceiling, else the platform default. Null for an async invoke, a stream or a subscription, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `signatureDrift` | `boolean \| null` | no | `expand=drift` — whether the bound flow's signature has changed since this endpoint snapshotted it, which means the published request or response contract no longer matches the flow. Null for a non-flow-backed action. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the action is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `signatureDrift`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed, derived from the draft by the same functions a read derives them from for a stored row. Present whenever the body was coherent enough to compute them, which is not the same as `ok`. ⚠️ BOTH ARE SNAPSHOTS: `resolutionRank` is a position among the project's OTHER endpoints and a sibling saved first moves it, and `access` is re-derived inside the write's own transaction from the bound flow as it stands then. |

Each item of `partiallyShadowedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `string` | yes | The platform route's method — always equal to your endpoint's, since a shadow is a same-method collision. |
| `path` | `string` | yes | The platform route's path template. It may LOOK different from yours and still collide: matching ignores parameter names, so `/v1/keys/{apiKeyId}` collides with `/v1/keys/{id}`. |
| `group` | `string` | yes | Which part of the platform took the path. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `DELETE /v1/api-endpoints/{id}`

Delete one endpoint; its path stops answering on the next request and its key is free at once. Nothing refuses it — an endpoint is a leaf, and the flow it binds stays. With `?validateOnly=true` it answers the verdict, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `key` | `string` | yes | The deleted endpoint's key, echoed so a log line names what went. The key is free again immediately — a new endpoint may reuse it. |
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
