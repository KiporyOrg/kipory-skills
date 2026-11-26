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
| `GET` | [`/v1/api-endpoints/{id}/contract-history`](#get-v1-api-endpoints-id-contract-history) |  |

### `GET /v1/api-endpoints`

List one project's endpoints (`?project=<nodeId>`) — the routes your product serves, each binding a method and path to a flow (`flow`, or `stream` for a live answer) or to an event subscription (`subscribe`) — each with the `version` its PATCH takes and, in `access`, whether it is public (callable with no credential) and which model or vendor steps its flow reaches. A stored row that no longer parses is listed in `unreadable` rather than failing the read. `expand=contract` adds the contract its callers meet now (what they send and read back, from the flow as it is now), `expand=flowLabel` names the bound flow, `expand=shadowed` the platform route that has grown over its path. The same rows, as authored, ride `GET /v1/bootstrap` (`endpoints.apiEndpoints`) and the `endpoints` section of `GET /v1/projects/{nodeId}/document`. The flows they bind: `GET /v1/flows?project=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose endpoints to list. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: contract, flowLabel, shadowed. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `apiEndpoints` | `object[]` | yes | Every readable endpoint in the project. Elements here are always fully valid — anything that failed to parse is in `unreadable` instead, so you never have to null-check a config. |
| `unreadable` | `object[]` | yes | Endpoints whose stored configuration no longer parses. Empty in the healthy case. |

Each item of `apiEndpoints`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `GET` | `string` | no | The path this endpoint answers GET on. Exactly one method is written, holding the path: `GET: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `POST` | `string` | no | The path this endpoint answers POST on. Exactly one method is written, holding the path: `POST: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `PATCH` | `string` | no | The path this endpoint answers PATCH on. Exactly one method is written, holding the path: `PATCH: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `DELETE` | `string` | no | The path this endpoint answers DELETE on. Exactly one method is written, holding the path: `DELETE: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `params` | `object` | no | Declared request parameters, keyed by name. A path parameter appears as `{name}` in the path the method holds; a query parameter stands alone. A parameter states only where it is carried (`{ in: query }`): its `type` is always `string`, and its `required` is worked out when left out. Each `{part}` of the path it leaves out is declared for it; left out whole, it is the path's own parts. |
| `status` | `integer` | no | The success status: 200 (the default), 201, 202, 204 or 206. With 204 the answer has no body, whatever the flow outputs. |
| `auth` | `"required" \| "none"` | no | Who may call the endpoint. `required` (the default): a key or a session. `none`: anyone, with no credential — the endpoint is PUBLIC. A public endpoint reads no credential at all: a key or a cookie sent with the call is ignored, the run has no user, and the `Idempotency-Key` header is ignored. Each call is paid from the project's wallet, up to the project's public spend cap when one is set. Only a `flow` endpoint without `async` can be public. Switching to `required` takes effect on the next request; switching to `none` within 30 seconds. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many requests per minute the endpoint accepts from all callers together (1–600). Omitted, the endpoint takes 60 and stores nothing. Set, it also lets one network address make up to that many calls a minute to this endpoint (at most 120), above the project's per-address allowance, and hold more of the project's public calls running at once in the same proportion. The next request over it answers 429 RATE_LIMITED with `details.scope: "endpoint"`. Refused on an endpoint that is not public. |
| `responseBody` | `string` | no | The name of ONE output of the flow to send as the whole response body. Left out, the body is an object of every output keyed by its name; set to `result`, the body is that output's value alone. Only a `flow` endpoint without `async` takes it, and the name must be a required output of the flow. |
| `responseType` | `"text/csv" \| "text/tab-separated-values" \| "text/plain" \| "text/markdown"` | no | Answer the `responseBody` output as text of this type instead of JSON: `text/csv`, `text/tab-separated-values`, `text/plain` or `text/markdown`. The answer is the output's text as is, sent `<type>; charset=utf-8`; a refusal is still the JSON error. Needs `responseBody` naming a required text output, on a `flow` endpoint without `async`, `redirect` or `statusOutput`. |
| `answer` | `object` | no | Answer the flow's output in one of the project's selections: `{select: <table>.<key>}` for one record (after a write, or a read by id), `{select, list: true}` for a page of records, answered `{items, nextCursor}`. Each record answers its `id` and the selection's properties, `null` where it has no value. Only a `flow` endpoint without `async` that is no query endpoint takes it; the output is the `responseBody` one, or the flow's only output. |
| `redirect` | `object` | no | Answer with a redirect instead of a body: the status, and `Location` set to the named output. Only a `flow` endpoint without `async` takes it. |
| `statusOutput` | `string` | no | The name of a required number output whose value is the success status for this call: 200, 201, 202, 204 or 206. Overrides `status`. Only a `flow` endpoint without `async` takes it. |
| `headers` | `object` | no | Response headers, each set from a flow output: header name → output name. An output with no value sends no header. Only a `flow` endpoint without `async` takes them. |
| `flow` | `string` | no | Id of the flow to run and answer the outputs of. Exactly one of `flow`, `stream` and `subscribe`. |
| `stream` | `string` | no | Id of the flow to stream as Server-Sent Events. Exactly one of `flow`, `stream` and `subscribe`. |
| `subscribe` | `object` | no | Hold a Server-Sent Events connection open and deliver the project's events as they happen; nothing runs. Exactly one of `flow`, `stream` and `subscribe`. |
| `inputs` | `object` | no | Per input binding, keyed by the flow's declared input name. LEFT OUT, every input of the flow is bound by its name, except one it marks `internal` (never bound by an endpoint): an input named like a `{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE (its query parameter is declared for it, required when the input is) and `body` on a POST or PATCH. An input the query or the path cannot carry (an object or a list) is left unbound there. The endpoint then stays bound by name (`inputsByName`): an input its flow gains later is bound too, and a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT`. STATED, it is taken exactly as written — an input it does not list is not bound, `{}` binds none — and every required non-provider input must be bound. A read always returns the whole map. |
| `inputsByName` | `true` | no | `true` when this endpoint's `inputs` are worked out by name rather than written: every input of the flow is bound by its name (except one it marks `internal`), and bound again whenever the flow's inputs change. Set by a write that leaves `inputs` out; a write that states `inputs` removes it. State it without `inputs` to turn an endpoint with written bindings into one bound by name. |
| `paramsAsWritten` | `object` | no | Set by the save. On an endpoint bound by name, its `params` as its write stated them, before anything was worked out: a parameter's `type` and `required` left out stay worked out, and the query parameters declared for its bindings are not among them. The contract's `params` are worked out from these again whenever the endpoint is bound again. A write may send a read back as it came, this beside `inputsByName`: it is then saved from these, and the `inputs` and `params` it also sends must be what binding by name works out from them — change neither, or send neither. |
| `async` | `true` | no | With `flow`: answer 202 and a run handle at once instead of waiting for the run. Left out, the caller waits. |
| `timeoutMs` | `integer` | no | With `flow`: how long the caller waits for the run, in ms (1000–120000). |
| `delta` | `string` | no | With `stream`: the output sent as it grows, in `delta` frames. Left out, the stream sends stage and result frames only. |
| `retry` | `object` | no | With `stream`: run the flow again when its output says to retry. Left out, it runs once. |
| `events` | `string[]` | no | With `stream`: the event types the flow emits that reach the caller, each as an `event` frame. Left out, none. |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's functions — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a `flow` endpoint without `async` waits for its run before answering 504, in ms — `timeoutMs` clamped to the ceiling, else the platform default. Null for an `async` endpoint, a `stream` or a `subscribe`, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `contract` | `object \| null` | no | `expand=contract` — the contract callers meet now: what they send and what they read back, built from the flow as it is now, with its identifier. Null for an endpoint that runs no flow, and for one whose flow cannot be resolved (deleted, or not this project's): then what callers meet is not known. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the target is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `contract`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |

Each item of `unreadable`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Endpoint id — the address for patch and delete. |
| `key` | `string` | yes | The endpoint's key, so you can recognise it. |
| `issues` | `object[]` | yes | What is wrong with the stored endpoint, one entry per failed setting, each at its place in the endpoint as you write it (`status`, `inputs.name`). |
| `version` | `integer` | yes | Optimistic-lock version; pass it back when you write the fix. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/api-endpoints`

Create one endpoint: a method and path under the project's host, bound to a flow of this project (`flow: <flow id>`, or `stream: <flow id>` for a live answer) or to an event subscription (`subscribe`). The endpoint serves the flow as it is now: a later change to the flow reaches its callers on their next request, judged first by the write that makes it (a break needs that write's `acceptBreaks`); the flow itself is authored at `/v1/flows`. `auth: "none"` makes it PUBLIC — callable with no key and no session, paid from the project's wallet up to its public spend cap when one is set (`publicSpendCapCredits`, `PATCH /v1/projects/{nodeId}/settings`); it is accepted only for a `flow` endpoint without `async` whose flow declares no `userInfo` input (a step inside it that reads the calling user is not caught at save and fails when called), else 422 with the issue code `PUBLIC_ENDPOINT_KIND_UNSUPPORTED` or `PUBLIC_ENDPOINT_NEEDS_USER`. With `validateOnly: true` it answers whether the create would be refused, who could call the draft and where it would sit in the match order (`derived`), and for a public draft the warnings `PUBLIC_ENDPOINT_SPENDS`, `PUBLIC_ENDPOINT_WRITES`, `PUBLIC_ENDPOINT_NAMES_PERSON`, `PUBLIC_ENDPOINT_READS_PEOPLE` and `PUBLIC_ENDPOINT_ACTS_FOR_PROJECT`, writing nothing. Several endpoints at once, beside the flows they bind: the `endpoints` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `GET` | `string` | no | The path this endpoint answers GET on. Exactly one method is written, holding the path: `GET: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `POST` | `string` | no | The path this endpoint answers POST on. Exactly one method is written, holding the path: `POST: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `PATCH` | `string` | no | The path this endpoint answers PATCH on. Exactly one method is written, holding the path: `PATCH: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `DELETE` | `string` | no | The path this endpoint answers DELETE on. Exactly one method is written, holding the path: `DELETE: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `params` | `object` | no | Declared request parameters, keyed by name. A path parameter appears as `{name}` in the path the method holds; a query parameter stands alone. A parameter states only where it is carried (`{ in: query }`): its `type` is always `string`, and its `required` is worked out when left out. Each `{part}` of the path it leaves out is declared for it; left out whole, it is the path's own parts. |
| `status` | `integer` | no | The success status: 200 (the default), 201, 202, 204 or 206. With 204 the answer has no body, whatever the flow outputs. |
| `auth` | `"required" \| "none"` | no | Who may call the endpoint. `required` (the default): a key or a session. `none`: anyone, with no credential — the endpoint is PUBLIC. A public endpoint reads no credential at all: a key or a cookie sent with the call is ignored, the run has no user, and the `Idempotency-Key` header is ignored. Each call is paid from the project's wallet, up to the project's public spend cap when one is set. Only a `flow` endpoint without `async` can be public. Switching to `required` takes effect on the next request; switching to `none` within 30 seconds. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many requests per minute the endpoint accepts from all callers together (1–600). Omitted, the endpoint takes 60 and stores nothing. Set, it also lets one network address make up to that many calls a minute to this endpoint (at most 120), above the project's per-address allowance, and hold more of the project's public calls running at once in the same proportion. The next request over it answers 429 RATE_LIMITED with `details.scope: "endpoint"`. Refused on an endpoint that is not public. |
| `responseBody` | `string` | no | The name of ONE output of the flow to send as the whole response body. Left out, the body is an object of every output keyed by its name; set to `result`, the body is that output's value alone. Only a `flow` endpoint without `async` takes it, and the name must be a required output of the flow. |
| `responseType` | `"text/csv" \| "text/tab-separated-values" \| "text/plain" \| "text/markdown"` | no | Answer the `responseBody` output as text of this type instead of JSON: `text/csv`, `text/tab-separated-values`, `text/plain` or `text/markdown`. The answer is the output's text as is, sent `<type>; charset=utf-8`; a refusal is still the JSON error. Needs `responseBody` naming a required text output, on a `flow` endpoint without `async`, `redirect` or `statusOutput`. |
| `answer` | `object` | no | Answer the flow's output in one of the project's selections: `{select: <table>.<key>}` for one record (after a write, or a read by id), `{select, list: true}` for a page of records, answered `{items, nextCursor}`. Each record answers its `id` and the selection's properties, `null` where it has no value. Only a `flow` endpoint without `async` that is no query endpoint takes it; the output is the `responseBody` one, or the flow's only output. |
| `redirect` | `object` | no | Answer with a redirect instead of a body: the status, and `Location` set to the named output. Only a `flow` endpoint without `async` takes it. |
| `statusOutput` | `string` | no | The name of a required number output whose value is the success status for this call: 200, 201, 202, 204 or 206. Overrides `status`. Only a `flow` endpoint without `async` takes it. |
| `headers` | `object` | no | Response headers, each set from a flow output: header name → output name. An output with no value sends no header. Only a `flow` endpoint without `async` takes them. |
| `flow` | `string` | no | Id of the flow to run and answer the outputs of. Exactly one of `flow`, `stream` and `subscribe`. |
| `stream` | `string` | no | Id of the flow to stream as Server-Sent Events. Exactly one of `flow`, `stream` and `subscribe`. |
| `subscribe` | `object` | no | Hold a Server-Sent Events connection open and deliver the project's events as they happen; nothing runs. Exactly one of `flow`, `stream` and `subscribe`. |
| `inputs` | `object` | no | Per input binding, keyed by the flow's declared input name. LEFT OUT, every input of the flow is bound by its name, except one it marks `internal` (never bound by an endpoint): an input named like a `{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE (its query parameter is declared for it, required when the input is) and `body` on a POST or PATCH. An input the query or the path cannot carry (an object or a list) is left unbound there. The endpoint then stays bound by name (`inputsByName`): an input its flow gains later is bound too, and a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT`. STATED, it is taken exactly as written — an input it does not list is not bound, `{}` binds none — and every required non-provider input must be bound. A read always returns the whole map. |
| `inputsByName` | `true` | no | `true` when this endpoint's `inputs` are worked out by name rather than written: every input of the flow is bound by its name (except one it marks `internal`), and bound again whenever the flow's inputs change. Set by a write that leaves `inputs` out; a write that states `inputs` removes it. State it without `inputs` to turn an endpoint with written bindings into one bound by name. |
| `paramsAsWritten` | `object` | no | Set by the save. On an endpoint bound by name, its `params` as its write stated them, before anything was worked out: a parameter's `type` and `required` left out stay worked out, and the query parameters declared for its bindings are not among them. The contract's `params` are worked out from these again whenever the endpoint is bound again. A write may send a read back as it came, this beside `inputsByName`: it is then saved from these, and the `inputs` and `params` it also sends must be what binding by name works out from them — change neither, or send neither. |
| `async` | `true` | no | With `flow`: answer 202 and a run handle at once instead of waiting for the run. Left out, the caller waits. |
| `timeoutMs` | `integer` | no | With `flow`: how long the caller waits for the run, in ms (1000–120000). |
| `delta` | `string` | no | With `stream`: the output sent as it grows, in `delta` frames. Left out, the stream sends stage and result frames only. |
| `retry` | `object` | no | With `stream`: run the flow again when its output says to retry. Left out, it runs once. |
| `events` | `string[]` | no | With `stream`: the event types the flow emits that reach the caller, each as an `event` frame. Left out, none. |
| `project` | `string` | yes | Node id of the project that will own the endpoint. |
| `key` | `string` | yes | The endpoint's key within the project. Permanent — PATCH will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `contractChanges` | `object[]` | no | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `permissions` | `object` | no | What the caller's role lets the write do. |
| `derived` | `object` | no | What the write WOULD have computed, derived from the draft by the same functions a read derives them from for a stored row. Present whenever the body was coherent enough to compute them, which is not the same as `ok`. ⚠️ BOTH ARE SNAPSHOTS: `resolutionRank` is a position among the project's OTHER endpoints and a sibling saved first moves it, and `access` is re-derived inside the write's own transaction from the bound flow as it stands then. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `GET` | `string` | no | The path this endpoint answers GET on. Exactly one method is written, holding the path: `GET: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `POST` | `string` | no | The path this endpoint answers POST on. Exactly one method is written, holding the path: `POST: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `PATCH` | `string` | no | The path this endpoint answers PATCH on. Exactly one method is written, holding the path: `PATCH: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `DELETE` | `string` | no | The path this endpoint answers DELETE on. Exactly one method is written, holding the path: `DELETE: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `params` | `object` | no | Declared request parameters, keyed by name. A path parameter appears as `{name}` in the path the method holds; a query parameter stands alone. A parameter states only where it is carried (`{ in: query }`): its `type` is always `string`, and its `required` is worked out when left out. Each `{part}` of the path it leaves out is declared for it; left out whole, it is the path's own parts. |
| `status` | `integer` | no | The success status: 200 (the default), 201, 202, 204 or 206. With 204 the answer has no body, whatever the flow outputs. |
| `auth` | `"required" \| "none"` | no | Who may call the endpoint. `required` (the default): a key or a session. `none`: anyone, with no credential — the endpoint is PUBLIC. A public endpoint reads no credential at all: a key or a cookie sent with the call is ignored, the run has no user, and the `Idempotency-Key` header is ignored. Each call is paid from the project's wallet, up to the project's public spend cap when one is set. Only a `flow` endpoint without `async` can be public. Switching to `required` takes effect on the next request; switching to `none` within 30 seconds. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many requests per minute the endpoint accepts from all callers together (1–600). Omitted, the endpoint takes 60 and stores nothing. Set, it also lets one network address make up to that many calls a minute to this endpoint (at most 120), above the project's per-address allowance, and hold more of the project's public calls running at once in the same proportion. The next request over it answers 429 RATE_LIMITED with `details.scope: "endpoint"`. Refused on an endpoint that is not public. |
| `responseBody` | `string` | no | The name of ONE output of the flow to send as the whole response body. Left out, the body is an object of every output keyed by its name; set to `result`, the body is that output's value alone. Only a `flow` endpoint without `async` takes it, and the name must be a required output of the flow. |
| `responseType` | `"text/csv" \| "text/tab-separated-values" \| "text/plain" \| "text/markdown"` | no | Answer the `responseBody` output as text of this type instead of JSON: `text/csv`, `text/tab-separated-values`, `text/plain` or `text/markdown`. The answer is the output's text as is, sent `<type>; charset=utf-8`; a refusal is still the JSON error. Needs `responseBody` naming a required text output, on a `flow` endpoint without `async`, `redirect` or `statusOutput`. |
| `answer` | `object` | no | Answer the flow's output in one of the project's selections: `{select: <table>.<key>}` for one record (after a write, or a read by id), `{select, list: true}` for a page of records, answered `{items, nextCursor}`. Each record answers its `id` and the selection's properties, `null` where it has no value. Only a `flow` endpoint without `async` that is no query endpoint takes it; the output is the `responseBody` one, or the flow's only output. |
| `redirect` | `object` | no | Answer with a redirect instead of a body: the status, and `Location` set to the named output. Only a `flow` endpoint without `async` takes it. |
| `statusOutput` | `string` | no | The name of a required number output whose value is the success status for this call: 200, 201, 202, 204 or 206. Overrides `status`. Only a `flow` endpoint without `async` takes it. |
| `headers` | `object` | no | Response headers, each set from a flow output: header name → output name. An output with no value sends no header. Only a `flow` endpoint without `async` takes them. |
| `flow` | `string` | no | Id of the flow to run and answer the outputs of. Exactly one of `flow`, `stream` and `subscribe`. |
| `stream` | `string` | no | Id of the flow to stream as Server-Sent Events. Exactly one of `flow`, `stream` and `subscribe`. |
| `subscribe` | `object` | no | Hold a Server-Sent Events connection open and deliver the project's events as they happen; nothing runs. Exactly one of `flow`, `stream` and `subscribe`. |
| `inputs` | `object` | no | Per input binding, keyed by the flow's declared input name. LEFT OUT, every input of the flow is bound by its name, except one it marks `internal` (never bound by an endpoint): an input named like a `{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE (its query parameter is declared for it, required when the input is) and `body` on a POST or PATCH. An input the query or the path cannot carry (an object or a list) is left unbound there. The endpoint then stays bound by name (`inputsByName`): an input its flow gains later is bound too, and a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT`. STATED, it is taken exactly as written — an input it does not list is not bound, `{}` binds none — and every required non-provider input must be bound. A read always returns the whole map. |
| `inputsByName` | `true` | no | `true` when this endpoint's `inputs` are worked out by name rather than written: every input of the flow is bound by its name (except one it marks `internal`), and bound again whenever the flow's inputs change. Set by a write that leaves `inputs` out; a write that states `inputs` removes it. State it without `inputs` to turn an endpoint with written bindings into one bound by name. |
| `paramsAsWritten` | `object` | no | Set by the save. On an endpoint bound by name, its `params` as its write stated them, before anything was worked out: a parameter's `type` and `required` left out stay worked out, and the query parameters declared for its bindings are not among them. The contract's `params` are worked out from these again whenever the endpoint is bound again. A write may send a read back as it came, this beside `inputsByName`: it is then saved from these, and the `inputs` and `params` it also sends must be what binding by name works out from them — change neither, or send neither. |
| `async` | `true` | no | With `flow`: answer 202 and a run handle at once instead of waiting for the run. Left out, the caller waits. |
| `timeoutMs` | `integer` | no | With `flow`: how long the caller waits for the run, in ms (1000–120000). |
| `delta` | `string` | no | With `stream`: the output sent as it grows, in `delta` frames. Left out, the stream sends stage and result frames only. |
| `retry` | `object` | no | With `stream`: run the flow again when its output says to retry. Left out, it runs once. |
| `events` | `string[]` | no | With `stream`: the event types the flow emits that reach the caller, each as an `event` frame. Left out, none. |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's functions — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a `flow` endpoint without `async` waits for its run before answering 504, in ms — `timeoutMs` clamped to the ceiling, else the platform default. Null for an `async` endpoint, a `stream` or a `subscribe`, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `contract` | `object \| null` | no | `expand=contract` — the contract callers meet now: what they send and what they read back, built from the flow as it is now, with its identifier. Null for an endpoint that runs no flow, and for one whose flow cannot be resolved (deleted, or not this project's): then what callers meet is not known. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the target is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `contract`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |

Each item of `partiallyShadowedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `string` | yes | The platform route's method — always equal to your endpoint's. |
| `path` | `string` | yes | The platform route's path template. It may LOOK different from yours and still collide: matching ignores parameter names, so `/v1/keys/{apiKeyId}` collides with `/v1/keys/{id}`. |
| `group` | `string` | yes | Which part of the platform took the path. |

### `GET /v1/api-endpoints/{id}`

Read one endpoint. `expand` takes the list's keys (`contract`, `flowLabel`, `shadowed`). Every endpoint at once: `GET /v1/api-endpoints?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: contract, flowLabel, shadowed. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `GET` | `string` | no | The path this endpoint answers GET on. Exactly one method is written, holding the path: `GET: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `POST` | `string` | no | The path this endpoint answers POST on. Exactly one method is written, holding the path: `POST: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `PATCH` | `string` | no | The path this endpoint answers PATCH on. Exactly one method is written, holding the path: `PATCH: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `DELETE` | `string` | no | The path this endpoint answers DELETE on. Exactly one method is written, holding the path: `DELETE: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `params` | `object` | no | Declared request parameters, keyed by name. A path parameter appears as `{name}` in the path the method holds; a query parameter stands alone. A parameter states only where it is carried (`{ in: query }`): its `type` is always `string`, and its `required` is worked out when left out. Each `{part}` of the path it leaves out is declared for it; left out whole, it is the path's own parts. |
| `status` | `integer` | no | The success status: 200 (the default), 201, 202, 204 or 206. With 204 the answer has no body, whatever the flow outputs. |
| `auth` | `"required" \| "none"` | no | Who may call the endpoint. `required` (the default): a key or a session. `none`: anyone, with no credential — the endpoint is PUBLIC. A public endpoint reads no credential at all: a key or a cookie sent with the call is ignored, the run has no user, and the `Idempotency-Key` header is ignored. Each call is paid from the project's wallet, up to the project's public spend cap when one is set. Only a `flow` endpoint without `async` can be public. Switching to `required` takes effect on the next request; switching to `none` within 30 seconds. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many requests per minute the endpoint accepts from all callers together (1–600). Omitted, the endpoint takes 60 and stores nothing. Set, it also lets one network address make up to that many calls a minute to this endpoint (at most 120), above the project's per-address allowance, and hold more of the project's public calls running at once in the same proportion. The next request over it answers 429 RATE_LIMITED with `details.scope: "endpoint"`. Refused on an endpoint that is not public. |
| `responseBody` | `string` | no | The name of ONE output of the flow to send as the whole response body. Left out, the body is an object of every output keyed by its name; set to `result`, the body is that output's value alone. Only a `flow` endpoint without `async` takes it, and the name must be a required output of the flow. |
| `responseType` | `"text/csv" \| "text/tab-separated-values" \| "text/plain" \| "text/markdown"` | no | Answer the `responseBody` output as text of this type instead of JSON: `text/csv`, `text/tab-separated-values`, `text/plain` or `text/markdown`. The answer is the output's text as is, sent `<type>; charset=utf-8`; a refusal is still the JSON error. Needs `responseBody` naming a required text output, on a `flow` endpoint without `async`, `redirect` or `statusOutput`. |
| `answer` | `object` | no | Answer the flow's output in one of the project's selections: `{select: <table>.<key>}` for one record (after a write, or a read by id), `{select, list: true}` for a page of records, answered `{items, nextCursor}`. Each record answers its `id` and the selection's properties, `null` where it has no value. Only a `flow` endpoint without `async` that is no query endpoint takes it; the output is the `responseBody` one, or the flow's only output. |
| `redirect` | `object` | no | Answer with a redirect instead of a body: the status, and `Location` set to the named output. Only a `flow` endpoint without `async` takes it. |
| `statusOutput` | `string` | no | The name of a required number output whose value is the success status for this call: 200, 201, 202, 204 or 206. Overrides `status`. Only a `flow` endpoint without `async` takes it. |
| `headers` | `object` | no | Response headers, each set from a flow output: header name → output name. An output with no value sends no header. Only a `flow` endpoint without `async` takes them. |
| `flow` | `string` | no | Id of the flow to run and answer the outputs of. Exactly one of `flow`, `stream` and `subscribe`. |
| `stream` | `string` | no | Id of the flow to stream as Server-Sent Events. Exactly one of `flow`, `stream` and `subscribe`. |
| `subscribe` | `object` | no | Hold a Server-Sent Events connection open and deliver the project's events as they happen; nothing runs. Exactly one of `flow`, `stream` and `subscribe`. |
| `inputs` | `object` | no | Per input binding, keyed by the flow's declared input name. LEFT OUT, every input of the flow is bound by its name, except one it marks `internal` (never bound by an endpoint): an input named like a `{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE (its query parameter is declared for it, required when the input is) and `body` on a POST or PATCH. An input the query or the path cannot carry (an object or a list) is left unbound there. The endpoint then stays bound by name (`inputsByName`): an input its flow gains later is bound too, and a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT`. STATED, it is taken exactly as written — an input it does not list is not bound, `{}` binds none — and every required non-provider input must be bound. A read always returns the whole map. |
| `inputsByName` | `true` | no | `true` when this endpoint's `inputs` are worked out by name rather than written: every input of the flow is bound by its name (except one it marks `internal`), and bound again whenever the flow's inputs change. Set by a write that leaves `inputs` out; a write that states `inputs` removes it. State it without `inputs` to turn an endpoint with written bindings into one bound by name. |
| `paramsAsWritten` | `object` | no | Set by the save. On an endpoint bound by name, its `params` as its write stated them, before anything was worked out: a parameter's `type` and `required` left out stay worked out, and the query parameters declared for its bindings are not among them. The contract's `params` are worked out from these again whenever the endpoint is bound again. A write may send a read back as it came, this beside `inputsByName`: it is then saved from these, and the `inputs` and `params` it also sends must be what binding by name works out from them — change neither, or send neither. |
| `async` | `true` | no | With `flow`: answer 202 and a run handle at once instead of waiting for the run. Left out, the caller waits. |
| `timeoutMs` | `integer` | no | With `flow`: how long the caller waits for the run, in ms (1000–120000). |
| `delta` | `string` | no | With `stream`: the output sent as it grows, in `delta` frames. Left out, the stream sends stage and result frames only. |
| `retry` | `object` | no | With `stream`: run the flow again when its output says to retry. Left out, it runs once. |
| `events` | `string[]` | no | With `stream`: the event types the flow emits that reach the caller, each as an `event` frame. Left out, none. |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's functions — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a `flow` endpoint without `async` waits for its run before answering 504, in ms — `timeoutMs` clamped to the ceiling, else the platform default. Null for an `async` endpoint, a `stream` or a `subscribe`, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `contract` | `object \| null` | no | `expand=contract` — the contract callers meet now: what they send and what they read back, built from the flow as it is now, with its identifier. Null for an endpoint that runs no flow, and for one whose flow cannot be resolved (deleted, or not this project's): then what callers meet is not known. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the target is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `contract`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |

Each item of `partiallyShadowedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `string` | yes | The platform route's method — always equal to your endpoint's. |
| `path` | `string` | yes | The platform route's path template. It may LOOK different from yours and still collide: matching ignores parameter names, so `/v1/keys/{apiKeyId}` collides with `/v1/keys/{id}`. |
| `group` | `string` | yes | Which part of the platform took the path. |

### `PATCH /v1/api-endpoints/{id}`

Change one endpoint: its settings — method and path, parameters, target and the rest — replaced whole; the key is permanent. Setting `auth` to `"none"` makes it public under the rules `POST /v1/api-endpoints` states; setting it back to `"required"` takes effect on the next request. A save that changes what the endpoint's callers send or read — a parameter, a setting such as `headers` or `responseBody`, or another flow — answers each change in `contractChanges`; one that breaks them is refused (409) until `acceptBreaks` names the endpoint, and only an admin of the project may accept (403 otherwise). Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, what it would publish (`derived`) and what it changes for callers (`contractChanges`), writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `GET` | `string` | no | The path this endpoint answers GET on. Exactly one method is written, holding the path: `GET: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `POST` | `string` | no | The path this endpoint answers POST on. Exactly one method is written, holding the path: `POST: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `PATCH` | `string` | no | The path this endpoint answers PATCH on. Exactly one method is written, holding the path: `PATCH: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `DELETE` | `string` | no | The path this endpoint answers DELETE on. Exactly one method is written, holding the path: `DELETE: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `params` | `object` | no | Declared request parameters, keyed by name. A path parameter appears as `{name}` in the path the method holds; a query parameter stands alone. A parameter states only where it is carried (`{ in: query }`): its `type` is always `string`, and its `required` is worked out when left out. Each `{part}` of the path it leaves out is declared for it; left out whole, it is the path's own parts. |
| `status` | `integer` | no | The success status: 200 (the default), 201, 202, 204 or 206. With 204 the answer has no body, whatever the flow outputs. |
| `auth` | `"required" \| "none"` | no | Who may call the endpoint. `required` (the default): a key or a session. `none`: anyone, with no credential — the endpoint is PUBLIC. A public endpoint reads no credential at all: a key or a cookie sent with the call is ignored, the run has no user, and the `Idempotency-Key` header is ignored. Each call is paid from the project's wallet, up to the project's public spend cap when one is set. Only a `flow` endpoint without `async` can be public. Switching to `required` takes effect on the next request; switching to `none` within 30 seconds. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many requests per minute the endpoint accepts from all callers together (1–600). Omitted, the endpoint takes 60 and stores nothing. Set, it also lets one network address make up to that many calls a minute to this endpoint (at most 120), above the project's per-address allowance, and hold more of the project's public calls running at once in the same proportion. The next request over it answers 429 RATE_LIMITED with `details.scope: "endpoint"`. Refused on an endpoint that is not public. |
| `responseBody` | `string` | no | The name of ONE output of the flow to send as the whole response body. Left out, the body is an object of every output keyed by its name; set to `result`, the body is that output's value alone. Only a `flow` endpoint without `async` takes it, and the name must be a required output of the flow. |
| `responseType` | `"text/csv" \| "text/tab-separated-values" \| "text/plain" \| "text/markdown"` | no | Answer the `responseBody` output as text of this type instead of JSON: `text/csv`, `text/tab-separated-values`, `text/plain` or `text/markdown`. The answer is the output's text as is, sent `<type>; charset=utf-8`; a refusal is still the JSON error. Needs `responseBody` naming a required text output, on a `flow` endpoint without `async`, `redirect` or `statusOutput`. |
| `answer` | `object` | no | Answer the flow's output in one of the project's selections: `{select: <table>.<key>}` for one record (after a write, or a read by id), `{select, list: true}` for a page of records, answered `{items, nextCursor}`. Each record answers its `id` and the selection's properties, `null` where it has no value. Only a `flow` endpoint without `async` that is no query endpoint takes it; the output is the `responseBody` one, or the flow's only output. |
| `redirect` | `object` | no | Answer with a redirect instead of a body: the status, and `Location` set to the named output. Only a `flow` endpoint without `async` takes it. |
| `statusOutput` | `string` | no | The name of a required number output whose value is the success status for this call: 200, 201, 202, 204 or 206. Overrides `status`. Only a `flow` endpoint without `async` takes it. |
| `headers` | `object` | no | Response headers, each set from a flow output: header name → output name. An output with no value sends no header. Only a `flow` endpoint without `async` takes them. |
| `flow` | `string` | no | Id of the flow to run and answer the outputs of. Exactly one of `flow`, `stream` and `subscribe`. |
| `stream` | `string` | no | Id of the flow to stream as Server-Sent Events. Exactly one of `flow`, `stream` and `subscribe`. |
| `subscribe` | `object` | no | Hold a Server-Sent Events connection open and deliver the project's events as they happen; nothing runs. Exactly one of `flow`, `stream` and `subscribe`. |
| `inputs` | `object` | no | Per input binding, keyed by the flow's declared input name. LEFT OUT, every input of the flow is bound by its name, except one it marks `internal` (never bound by an endpoint): an input named like a `{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE (its query parameter is declared for it, required when the input is) and `body` on a POST or PATCH. An input the query or the path cannot carry (an object or a list) is left unbound there. The endpoint then stays bound by name (`inputsByName`): an input its flow gains later is bound too, and a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT`. STATED, it is taken exactly as written — an input it does not list is not bound, `{}` binds none — and every required non-provider input must be bound. A read always returns the whole map. |
| `inputsByName` | `true` | no | `true` when this endpoint's `inputs` are worked out by name rather than written: every input of the flow is bound by its name (except one it marks `internal`), and bound again whenever the flow's inputs change. Set by a write that leaves `inputs` out; a write that states `inputs` removes it. State it without `inputs` to turn an endpoint with written bindings into one bound by name. |
| `paramsAsWritten` | `object` | no | Set by the save. On an endpoint bound by name, its `params` as its write stated them, before anything was worked out: a parameter's `type` and `required` left out stay worked out, and the query parameters declared for its bindings are not among them. The contract's `params` are worked out from these again whenever the endpoint is bound again. A write may send a read back as it came, this beside `inputsByName`: it is then saved from these, and the `inputs` and `params` it also sends must be what binding by name works out from them — change neither, or send neither. |
| `async` | `true` | no | With `flow`: answer 202 and a run handle at once instead of waiting for the run. Left out, the caller waits. |
| `timeoutMs` | `integer` | no | With `flow`: how long the caller waits for the run, in ms (1000–120000). |
| `delta` | `string` | no | With `stream`: the output sent as it grows, in `delta` frames. Left out, the stream sends stage and result frames only. |
| `retry` | `object` | no | With `stream`: run the flow again when its output says to retry. Left out, it runs once. |
| `events` | `string[]` | no | With `stream`: the event types the flow emits that reach the caller, each as an `event` frame. Left out, none. |
| `version` | `integer` | yes | The `version` you last read. REQUIRED here: the endpoint's settings are replaced whole, so a blind write would silently discard a concurrent edit. A mismatch is refused with 409. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `acceptBreaks` | `object` | no | Accept that this write breaks the callers of the endpoints, tables and tools, and the written pages, named here, by key. Needed for every row of `contractChanges` that is `breaking`; only an admin of the project may send it for one. A name whose contract this write does not break is answered in `acceptBreaksNotNeeded`, and a name the project does not have is refused. A statement about this write only, never stored. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `id`, `project`, `key`, `invokeUrl`, `access`, `resolutionRank`, `syncWaitMs`, `version`, `createdAt`, `updatedAt`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `GET` | `string` | no | The path this endpoint answers GET on. Exactly one method is written, holding the path: `GET: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `POST` | `string` | no | The path this endpoint answers POST on. Exactly one method is written, holding the path: `POST: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `PATCH` | `string` | no | The path this endpoint answers PATCH on. Exactly one method is written, holding the path: `PATCH: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `DELETE` | `string` | no | The path this endpoint answers DELETE on. Exactly one method is written, holding the path: `DELETE: /v1/…`. Route template under the reserved /v1 namespace. Each /-separated segment is a literal ([A-Za-z0-9._~-]+) or exactly one {param} ({ + identifier + }): `/v1/analyze`, `/v1/records/{id}`. No adjacent params in one segment, no empty segments, no trailing slash. Every {param} must be declared in `params` as a required path parameter. The first segment after /v1/ may not start with the reserved `_` prefix. |
| `params` | `object` | no | Declared request parameters, keyed by name. A path parameter appears as `{name}` in the path the method holds; a query parameter stands alone. A parameter states only where it is carried (`{ in: query }`): its `type` is always `string`, and its `required` is worked out when left out. Each `{part}` of the path it leaves out is declared for it; left out whole, it is the path's own parts. |
| `status` | `integer` | no | The success status: 200 (the default), 201, 202, 204 or 206. With 204 the answer has no body, whatever the flow outputs. |
| `auth` | `"required" \| "none"` | no | Who may call the endpoint. `required` (the default): a key or a session. `none`: anyone, with no credential — the endpoint is PUBLIC. A public endpoint reads no credential at all: a key or a cookie sent with the call is ignored, the run has no user, and the `Idempotency-Key` header is ignored. Each call is paid from the project's wallet, up to the project's public spend cap when one is set. Only a `flow` endpoint without `async` can be public. Switching to `required` takes effect on the next request; switching to `none` within 30 seconds. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many requests per minute the endpoint accepts from all callers together (1–600). Omitted, the endpoint takes 60 and stores nothing. Set, it also lets one network address make up to that many calls a minute to this endpoint (at most 120), above the project's per-address allowance, and hold more of the project's public calls running at once in the same proportion. The next request over it answers 429 RATE_LIMITED with `details.scope: "endpoint"`. Refused on an endpoint that is not public. |
| `responseBody` | `string` | no | The name of ONE output of the flow to send as the whole response body. Left out, the body is an object of every output keyed by its name; set to `result`, the body is that output's value alone. Only a `flow` endpoint without `async` takes it, and the name must be a required output of the flow. |
| `responseType` | `"text/csv" \| "text/tab-separated-values" \| "text/plain" \| "text/markdown"` | no | Answer the `responseBody` output as text of this type instead of JSON: `text/csv`, `text/tab-separated-values`, `text/plain` or `text/markdown`. The answer is the output's text as is, sent `<type>; charset=utf-8`; a refusal is still the JSON error. Needs `responseBody` naming a required text output, on a `flow` endpoint without `async`, `redirect` or `statusOutput`. |
| `answer` | `object` | no | Answer the flow's output in one of the project's selections: `{select: <table>.<key>}` for one record (after a write, or a read by id), `{select, list: true}` for a page of records, answered `{items, nextCursor}`. Each record answers its `id` and the selection's properties, `null` where it has no value. Only a `flow` endpoint without `async` that is no query endpoint takes it; the output is the `responseBody` one, or the flow's only output. |
| `redirect` | `object` | no | Answer with a redirect instead of a body: the status, and `Location` set to the named output. Only a `flow` endpoint without `async` takes it. |
| `statusOutput` | `string` | no | The name of a required number output whose value is the success status for this call: 200, 201, 202, 204 or 206. Overrides `status`. Only a `flow` endpoint without `async` takes it. |
| `headers` | `object` | no | Response headers, each set from a flow output: header name → output name. An output with no value sends no header. Only a `flow` endpoint without `async` takes them. |
| `flow` | `string` | no | Id of the flow to run and answer the outputs of. Exactly one of `flow`, `stream` and `subscribe`. |
| `stream` | `string` | no | Id of the flow to stream as Server-Sent Events. Exactly one of `flow`, `stream` and `subscribe`. |
| `subscribe` | `object` | no | Hold a Server-Sent Events connection open and deliver the project's events as they happen; nothing runs. Exactly one of `flow`, `stream` and `subscribe`. |
| `inputs` | `object` | no | Per input binding, keyed by the flow's declared input name. LEFT OUT, every input of the flow is bound by its name, except one it marks `internal` (never bound by an endpoint): an input named like a `{part}` of the path reads `path.<name>`; any other reads `query.<name>` on a GET or DELETE (its query parameter is declared for it, required when the input is) and `body` on a POST or PATCH. An input the query or the path cannot carry (an object or a list) is left unbound there. The endpoint then stays bound by name (`inputsByName`): an input its flow gains later is bound too, and a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT`. STATED, it is taken exactly as written — an input it does not list is not bound, `{}` binds none — and every required non-provider input must be bound. A read always returns the whole map. |
| `inputsByName` | `true` | no | `true` when this endpoint's `inputs` are worked out by name rather than written: every input of the flow is bound by its name (except one it marks `internal`), and bound again whenever the flow's inputs change. Set by a write that leaves `inputs` out; a write that states `inputs` removes it. State it without `inputs` to turn an endpoint with written bindings into one bound by name. |
| `paramsAsWritten` | `object` | no | Set by the save. On an endpoint bound by name, its `params` as its write stated them, before anything was worked out: a parameter's `type` and `required` left out stay worked out, and the query parameters declared for its bindings are not among them. The contract's `params` are worked out from these again whenever the endpoint is bound again. A write may send a read back as it came, this beside `inputsByName`: it is then saved from these, and the `inputs` and `params` it also sends must be what binding by name works out from them — change neither, or send neither. |
| `async` | `true` | no | With `flow`: answer 202 and a run handle at once instead of waiting for the run. Left out, the caller waits. |
| `timeoutMs` | `integer` | no | With `flow`: how long the caller waits for the run, in ms (1000–120000). |
| `delta` | `string` | no | With `stream`: the output sent as it grows, in `delta` frames. Left out, the stream sends stage and result frames only. |
| `retry` | `object` | no | With `stream`: run the flow again when its output says to retry. Left out, it runs once. |
| `events` | `string[]` | no | With `stream`: the event types the flow emits that reach the caller, each as an `event` frame. Left out, none. |
| `health` | `object` | no | How its recent runs went — failing, quiet, about to be paused, paused, or healthy. Present on a read (`GET`); absent on the answer to a write. Running state, not configuration: it never moves `version`. |
| `id` | `string` | yes | Endpoint id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The endpoint's key within the project. Immutable. |
| `invokeUrl` | `string \| null` | yes | COMPUTED, read-only. Absolute URL the endpoint is served at — the project's dynamic plane (https://{subdomain}.<env-host>{path}), NOT this design API's host. Path templates keep their {param} placeholders. null only when the deployment has no derivable public host. |
| `access` | `object` | yes | COMPUTED, read-only. Who may call the endpoint, derived on every read from its method and its bound flow's functions — the same decision the dispatcher makes on every call. Never stored, never writable. |
| `resolutionRank` | `integer \| null` | yes | COMPUTED, read-only. Where this endpoint sits in the order a request is matched against the project's endpoints: fewer path parameters first, then more literal characters, then the endpoint key compared character by character. The first endpoint whose method and path template match a request serves it. Compare ranks only between endpoints of the SAME method — a request is only ever matched against its own method, so across methods the numbers carry no precedence. Null when the endpoint's stored configuration does not parse, which the dispatcher never serves. A rank does not promise the endpoint is reachable: a built-in Kipory route with the same method and path is matched before any project endpoint. |
| `syncWaitMs` | `integer \| null` | yes | COMPUTED, read-only. How long a `flow` endpoint without `async` waits for its run before answering 504, in ms — `timeoutMs` clamped to the ceiling, else the platform default. Null for an `async` endpoint, a `stream` or a `subscribe`, which have no such wait. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `contract` | `object \| null` | no | `expand=contract` — the contract callers meet now: what they send and what they read back, built from the flow as it is now, with its identifier. Null for an endpoint that runs no flow, and for one whose flow cannot be resolved (deleted, or not this project's): then what callers meet is not known. Absent unless asked for. |
| `flowLabel` | `object \| null` | no | `expand=flowLabel` — the bound flow's current id, key and label. Null when the target is not flow-backed or the flow cannot be resolved. Absent unless asked for. |
| `shadowedBy` | `object \| null` | no | `expand=shadowed` — the platform route that has grown over this endpoint's method and path shape, which means YOUR ENDPOINT IS NOT BEING SERVED: the platform route wins the match and the request never reaches you. Re-path the endpoint to fix it. Unlike `contract`, null here is a real answer and never means undetermined — nothing shadows this endpoint. Absent unless asked for. |
| `partiallyShadowedBy` | `object[]` | no | `expand=shadowed` — platform routes that take ONE value of a parameter in your path, so your endpoint never receives that value. Empty when none does. Absent unless asked for. A path whose first segment is a parameter is the usual case: it saves, and platform routes under that parameter take their values first. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `brokenPages` | `string[]` | no | The written pages of the project's `ui` section that are broken in the state this write leaves: each still uses an endpoint, input or field the project no longer has, and visitors see it as unavailable until a later write makes it whole. A write that newly breaks one is refused until `acceptBreaks.pages` names it. Absent when the project has no written page. |

Each item of `partiallyShadowedBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `string` | yes | The platform route's method — always equal to your endpoint's. |
| `path` | `string` | yes | The platform route's path template. It may LOOK different from yours and still collide: matching ignores parameter names, so `/v1/keys/{apiKeyId}` collides with `/v1/keys/{id}`. |
| `group` | `string` | yes | Which part of the platform took the path. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Shape 2, with `ok`, `diagnostics`, `complete`, `permissions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `permissions` | `object` | yes | What the caller's role lets the write do. |
| `derived` | `object` | no | What the write WOULD have computed, derived from the draft by the same functions a read derives them from for a stored row. Present whenever the body was coherent enough to compute them, which is not the same as `ok`. ⚠️ BOTH ARE SNAPSHOTS: `resolutionRank` is a position among the project's OTHER endpoints and a sibling saved first moves it, and `access` is re-derived inside the write's own transaction from the bound flow as it stands then. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `brokenPages` | `string[]` | no | The written pages of the project's `ui` section that are broken in the state this write leaves: each still uses an endpoint, input or field the project no longer has, and visitors see it as unavailable until a later write makes it whole. A write that newly breaks one is refused until `acceptBreaks.pages` names it. Absent when the project has no written page. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

### `DELETE /v1/api-endpoints/{id}`

Delete one endpoint; its path stops answering on the next request and its key is free at once; the flow it binds stays. A written page of the project's `ui` section that reads or calls it breaks: the delete answers that page in `contractChanges` and is refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until the optional body's `acceptBreaks.pages` names it. With `?validateOnly=true` it answers the verdict and what it would break (`contractChanges`, `permissions`), writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `acceptBreaks` | `object` | no | Accept that this write breaks the callers of the endpoints, tables and tools, and the written pages, named here, by key. Needed for every row of `contractChanges` that is `breaking`; only an admin of the project may send it for one. A name whose contract this write does not break is answered in `acceptBreaksNotNeeded`, and a name the project does not have is refused. A statement about this write only, never stored. |

**Response `200`**

One of 2 shapes:

Shape 1, with `deleted`, `id`, `key`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `key` | `string` | yes | The deleted endpoint's key. The key is free again immediately — a new endpoint may reuse it. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `brokenPages` | `string[]` | no | The written pages of the project's `ui` section that are broken in the state this write leaves: each still uses an endpoint, input or field the project no longer has, and visitors see it as unavailable until a later write makes it whole. A write that newly breaks one is refused until `acceptBreaks.pages` names it. Absent when the project has no written page. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Shape 2, with `ok`, `diagnostics`, `complete`, `permissions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `brokenPages` | `string[]` | no | The written pages of the project's `ui` section that are broken in the state this write leaves: each still uses an endpoint, input or field the project no longer has, and visitors see it as unavailable until a later write makes it whole. A write that newly breaks one is refused until `acceptBreaks.pages` names it. Absent when the project has no written page. |
| `permissions` | `object` | yes | What the caller's role lets the write do. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

### `GET /v1/api-endpoints/{id}/contract-history`

Read one endpoint's contract history, newest first: an entry for each saved change that gave its callers a different contract (`write`, with the verdict, each change, who made it and who accepted a break), each saved change that took it off its flow (`unbound`, likewise), each platform release that changed it (`release`), and the entry it started with (`created`, `bound` or `first`, carrying that whole contract). A label edit adds no entry of its own, but every committed write that reaches an endpoint, a label edit included, first records what was left unrecorded: an endpoint whose history is empty gains its `first`, and one whose live contract has moved past its last entry (a release before its walk, a database restore) gains a `release` with that difference. So a label edit adds nothing only when the last entry is the live contract. A rename of a vocabulary or relation its contract names adds a `write` with verdict `safe` and `changes: []`: no caller meets the moved key, but the contract the history holds now names it. Walk older entries with `after` and newer ones with `before`. The contract callers meet now: `GET /v1/api-endpoints/{id}?expand=contract`. The changes a write is about to make, before saving it: the write with `validateOnly: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The endpoint's id, as returned by create or list. Not the `endpoint` key you chose — that names the endpoint, this addresses it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | Read the entries older than this one — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | Read the entries newer than this one — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many entries per page, up to 100. Defaults to 20. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The entries, newest first. |
| `paging` | `null` | yes | Always null here: the history is read by cursor, with no page jump. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the older entries. Null when there are none. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the newer entries. Null on the newest page. |

Each item of `entries`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `string` | yes | The entry's place in the history; pass it as `after` to read the entries before it. |
| `kind` | `"created" \| "bound" \| "first" \| "write" \| "unbound" \| "release" \| "ability"` | yes | `created`: the endpoint was created with a flow. `bound`: a write gave it a flow. `first`: the contract it had when its history began, recorded by the first write or release that reached it, a label edit included. `write`: a saved change gave callers a different contract (for an endpoint that answers a query, an edit of the query, a selection, a table, a type, a relation, a relation's ends or the flow's steps included); with verdict `safe` and `changes: []`, a rename moved a vocabulary or relation key the contract names, which no caller meets. `unbound`: a saved change took it off its flow, so it takes and answers nothing of one. `release`: a platform release changed it. `ability`: a platform function changed a type the contract holds, and the platform judged and recorded it as it judges a release. |
| `at` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `actor` | `object \| null` | yes | Who made the change: the person or API key whose write it was on `created`, `bound`, `write` and `unbound`; the platform on `first`, `release` and `ability`. Null when none was recorded. |
| `structureVersion` | `string \| null` | yes | The project version the change was saved at. Null on `first`, `release` and `ability`. |
| `release` | `string \| null` | yes | The platform release that changed the contract, on `release`; null otherwise. |
| `verdict` | `"safe" \| "breaking" \| null` | yes | `breaking` when a caller written against the contract before can fail against this one; `safe` when every such caller keeps working. Null on `created`, `bound` and `first`. |
| `changes` | `object[] \| null` | yes | What changed for this endpoint's callers, each change exactly as the write that made it answered it in `contractChanges`; on `release`, as the platform judged it. `[]` on a rename's `write`. Null where `verdict` is. |
| `acceptedBy` | `string \| null` | yes | Who accepted a breaking change: the actor who named the endpoint in `acceptBreaks`, or the platform's ruling for a release or a platform function's type change. Null otherwise. |
| `contractId` | `string` | yes | Names the contract: two endpoints, or one endpoint at two moments, have the same identifier exactly when every caller meets the same contract. A wording change of a label leaves it as it was. |
| `contract` | `object` | no | The whole contract the entry started, on `created`, `bound` and `first`. For the contract callers meet now, read the endpoint with `expand=contract`. |
