<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Requests a run sent

What each request a run's `url.send` steps sent did, from the instant the run commits, and what a preview would have sent (`previewed`). A run succeeds when it stages its request; delivery happens afterwards and never changes how the run closed, so this is where a request that was retried, refused or never sent shows. Each record lists every try, the request as it left (once tried, every header, a `sign` signature included, a stored credential as `«secret»`; the whole body by id) and the receiver's last answer (to 1 MB). Kept with the run's history; editors only.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/outbound-requests`](#get-v1-outbound-requests) |  |
| `GET` | [`/v1/outbound-requests/{id}`](#get-v1-outbound-requests-id) |  |

### `GET /v1/outbound-requests`

List the requests one project's runs sent with `url.send` (`?project=<nodeId>`), newest first by when the run committed, and those its previews would have sent (`previewed`). Each row says where the request stands, every try with its time, duration and status, the request as it left (every header, a `sign` signature included, and the body's first 4,096 characters) and the receiver's last answer (its status and the first 4,096 characters of its body; `GET /v1/outbound-requests/{id}` has both whole, to 1 MB) — enough to check a send without building a receiver. A request is listed from the instant its run commits, as `queued`; a run that failed left none. Filter by `run` (whose `GET /v1/runs/{runId}` `requests` counts these rows), `flowId`, `stepKey` and `status`. Read one at `GET /v1/outbound-requests/{id}`. Walk with `after`. Needs an editor of the project.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose requests to list. Required. |
| `run` | `string` | no | Only the requests this run sent: a run id, or a preview's `previewSessionId`. |
| `flowId` | `string` | no | Only the requests sent by a step of this flow: a flow id. |
| `stepKey` | `string` | no | Only the requests sent by the step with this key. |
| `status` | `"previewed" \| "queued" \| "retrying" \| "sent" \| "refused" \| "failed"` | no | Only requests in this status. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 100. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `requests` | `object[]` | yes | Requests, newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: no page count is given. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `requests`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The request's id; its `Idempotency-Key` too, unless the step named a key (or `sign.format: standard` minted one, its `webhook-id`). Read it at `GET /v1/outbound-requests/{id}`. |
| `runId` | `string` | yes | The run that sent it, or the preview's `previewSessionId` for a `previewed` request. |
| `attempt` | `integer` | yes | Which attempt of that run committed the request, from 1. |
| `flowId` | `string \| null` | yes | The flow that holds the sending step, by its id; with `stepKey` it names one step. Null when the run did not record it. |
| `stepKey` | `string` | yes | The key of the step that sent it. |
| `method` | `string` | yes | The request's method: POST, PUT, PATCH or DELETE. |
| `url` | `string` | yes | The address it was sent to, the step's query included (dropped when the person the run acted as is erased); a stored credential placed in the query is added at send and not shown. |
| `status` | `"previewed" \| "queued" \| "retrying" \| "sent" \| "refused" \| "failed"` | yes | Where the request stands. `previewed`: a preview's record of what a live run would have sent; never sent. `queued`: its run committed and it has not been tried yet. `retrying`: a try got a 5xx, a 429 or no answer, and another follows at `nextTryAt`. `sent`: the receiver answered 2xx. `refused`: the receiver answered what no retry changes (a 3xx or a 4xx other than 429). `failed`: not sent, because every try failed or it could not be sent at all (`reason`). Every status but `queued` and `retrying` is final. |
| `reason` | `string \| null` | yes | Why it was not sent, when `failed`: `tries-spent` (every try got a 5xx, a 429 or no answer), `api-key-missing` (its stored credential is gone), `ssrf-blocked` (the address is private, local or blocked), `secret-host-mismatch` (its stored credential does not list the host) `invalid-input` (its stored credential sits in a header the platform sets) or `not-enqueued` (it never reached the delivery queue). Null otherwise. |
| `attempts` | `integer` | yes | Tries made so far. 0 while `queued` and for a `previewed` request. |
| `tries` | `object[]` | yes | Each try, oldest first; the latest 8 when there were more. |
| `nextTryAt` | `string \| null` | yes | When the next try is due, RFC 3339. Null unless `retrying`. |
| `request` | `object` | yes | The request as it left. |
| `response` | `object \| null` | yes | The last answer the receiver gave. Null before any answer. |
| `contentErased` | `boolean` | yes | True once the request's headers, body and answer text were cleared because the person the run acted as was erased; status, tries and times stay. |
| `createdAt` | `string` | yes | When the run that sent it committed, RFC 3339. |
| `lastTryAt` | `string \| null` | yes | When it was last tried, RFC 3339. Null before the first try. |
| `sentAt` | `string \| null` | yes | When the receiver answered 2xx, RFC 3339. Null unless `sent`. |

### `GET /v1/outbound-requests/{id}`

One request a run sent with `url.send`, or a preview would have sent, by its id: where it stands, every try, the request as it left and the receiver's last answer. Its headers, body and answer text are kept as long as its run's history, unless the person the run acted as was erased (`contentErased`). List a project's or a run's requests at `GET /v1/outbound-requests`. 404 for an id you cannot see. Needs an editor of the project.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The request to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `request` | `object` | yes | The request's record. |
