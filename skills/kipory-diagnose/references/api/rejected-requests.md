<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Rejected requests

Every request the project's own endpoints turned away with a 4xx — validation, credential, role, no route, credits, rate limit — newest first, with the code and message the caller saw and which kind of credential came with it. A refused request starts no run, so this is the only place it shows. Kept 30 days; never a body or a secret.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/rejected-requests`](#get-v1-rejected-requests) |  |

### `GET /v1/rejected-requests`

Every request the project's own endpoints turned away with a 4xx, newest first, walked on `after`/`before` — code, message, the reason's first issues and which kind of credential came with it; filter by `class` and `endpointKey`. Kept 30 days. A refused request starts no run, so it is in neither `GET /v1/runs` nor `GET /v1/ai-calls`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose rejected requests to read. Required. |
| `class` | `"auth" \| "validation" \| "not-found" \| "limit" \| "other"` | no | Only one family of refusal: `auth` (401, 403), `validation` (400, 413, 415, 422), `not-found` (404, 405), `limit` (402, 429), or `other` (every other 4xx). |
| `endpointKey` | `string` | no | Only requests that matched this configured endpoint, by key. A refusal answered before any endpoint matched (a bad credential, a path nothing serves) has no endpoint and never matches. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. Follow `nextCursor` as `after` for older rows; the log keeps a row for `retentionDays` days. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `requests` | `object[]` | yes | Newest first by `occurredAt`, then id. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, so no page count is given and no `page` jump is offered. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |
| `retentionDays` | `integer` | yes | How many days a rejected request is kept. An older one has been removed and is not returned, however far you walk. |

Each item of `requests`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The row's id. |
| `occurredAt` | `string` | yes | When the refusal was answered, as an ISO-8601 instant. |
| `method` | `string` | yes | The HTTP method the caller sent. |
| `path` | `string` | yes | The matched endpoint's path template (`/v1/invites/{token}/accept`) when an endpoint matched; otherwise the request path without its query string, with every value of 4 or more characters the request carried replaced by `[value]`. Capped at 512 characters. |
| `endpointKey` | `string \| null` | yes | The key of the configured endpoint the path matched; null when the refusal came before a match or nothing matched. |
| `status` | `integer` | yes | The status answered, 400–499. |
| `code` | `string` | yes | The error envelope's `code` the caller received, e.g. `VALIDATION_FAILED`. |
| `message` | `string` | yes | The error envelope's `message` the caller received, with every value of 4 or more characters the request carried replaced by `[value]`, capped at 300 characters. |
| `issues` | `object[]` | yes | The first five of the envelope's `details.issues` — the reason behind a constant `message` such as `Request validation failed`. Empty when the refusal carried none. |
| `issueCount` | `integer` | yes | How many issues the envelope carried in all; `issues` keeps at most the first five. |
| `requestId` | `string` | yes | The `requestId` in the envelope the caller received, to match a caller's report to this row. |
| `credential` | `"api-key" \| "session" \| "none"` | yes | Which kind of credential came with the request — never the credential itself. `RejectedRequestCredential` through `toKebab` (API-32). |
| `keyPrefix` | `string \| null` | yes | For an API key, the display prefix the key list shows (`kip_` and 8 characters); null otherwise. |
| `gate` | `"wallet" \| "public-spend-cap"` | yes | Only for a public endpoint (`auth: "none"`) refused for money with `PUBLIC_ENDPOINT_UNAVAILABLE`: which gate refused. `wallet` — the project's wallet is past its floor (below zero less its overdraft), or suspended; credit reopens the first, only the operator lifts the second. `public-spend-cap` — public calls have spent the project's public spend cap for the UTC day, or the cap is not set; raise `publicSpendCapCredits` in project settings or wait for 00:00 UTC. The caller is answered the same body for both, so this row is the only place the reason is kept. Null for every other refusal — and null on a `PUBLIC_ENDPOINT_UNAVAILABLE` row that money did not cause: the project is suspended, or the endpoint's flow reaches a step that needs a signed-in user. |
