<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Rejected requests

Every request the project's own endpoints turned away with a 4xx — validation, credential, role, no route, credits, rate limit — newest first, with the code and message the caller saw and which kind of credential came with it. A refused request starts no run, so this is the only place it shows. Kept 30 days; never a body or a secret.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/rejected-requests`](#get-v1-rejected-requests) |  |

### `GET /v1/rejected-requests`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose rejected requests to read. Required. |
| `class` | `"auth" \| "validation" \| "not-found" \| "limit" \| "other"` | no | Only one family of refusal: `auth` (401, 403), `validation` (400, 413, 415, 422), `not-found` (404, 405), `limit` (402, 429), or `other` (every other 4xx). |
| `endpoint` | `string` | no | Only requests that matched this configured endpoint, by name. A refusal answered before any endpoint matched (a bad credential, a path nothing serves) has no endpoint and never matches. |
| `limit` | `integer` | no | How many of the most recent rejected requests to return, newest first. Defaults to 50. A cap, not a page — the log is reaped after 30 days. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `requests` | `object[]` | yes | Newest first. |
| `truncated` | `boolean` | yes | True when more rejected requests exist within retention than the limit. |
