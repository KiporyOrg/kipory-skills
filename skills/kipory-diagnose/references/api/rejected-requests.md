<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Rejected requests

Every request the project's own endpoints turned away with a 4xx — validation, credential, role, no route, credits, rate limit — newest first, with the code and message the caller saw and which kind of credential came with it. A refused request starts no run, so this is the only place it shows. Kept 30 days; never a body or a secret.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

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
