<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Pushes

Every push the project's flows sent, newest first, as counts: how many people and devices it reached, and per device whether it was sent, removed as dead, skipped for a missing or refused push key, or held back by a limit. Kept 30 days; never a title, body or device token.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/pushes`](#get-v1-pushes) |  |

### `GET /v1/pushes`

Every push the project's flows sent, newest first, walked on `after`/`before` — how many people and devices each reached and what happened to each device: sent, removed as dead, skipped for a missing or refused key, or held back by a limit. Kept 30 days; never a title, body or device token. The run that sent one is `GET /v1/runs/{runId}`; a person's own devices are `GET /v1/devices` on the project's host.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose pushes to read. Required. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. Follow `nextCursor` as `after` for older rows; the log keeps a row for `retentionDays` days. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `pushes` | `object[]` | yes | Newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, so no page count is given and no `page` jump is offered. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |
| `retentionDays` | `integer` | yes | How many days a push is kept. An older one has been removed and is not returned, however far you walk. |

Each item of `pushes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The push's id, the same one the action's run log names. |
| `createdAt` | `string` | yes | When the action sent the push, as an ISO-8601 instant. |
| `runId` | `string` | yes | The run whose action sent it. |
| `actionId` | `string` | yes | The action that sent it. |
| `peopleAddressed` | `integer` | yes | People the push went to: active people of the project. |
| `peopleSkipped` | `integer` | yes | People the action named who are not active people of the project. Counted, never named. |
| `devicesAddressed` | `integer` | yes | Devices registered to those people when the push went out. |
| `outcomes` | `object` | yes | What happened to each device, counted. A push still being delivered has devices in none of these yet. |
