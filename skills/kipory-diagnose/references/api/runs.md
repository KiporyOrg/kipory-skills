<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 87ba7606f60b · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Runs

One id space for every run — an endpoint invocation, a record-processing attempt, a bare request. The step log is never sampled; the change set is what the run wrote.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/activity/stream`](#get-v1-activity-stream) |  |
| `GET` | [`/v1/runs`](#get-v1-runs) |  |
| `GET` | [`/v1/runs/{runId}`](#get-v1-runs-runid) |  |
| `GET` | [`/v1/runs/{runId}/change-set`](#get-v1-runs-runid-change-set) |  |
| `GET` | [`/v1/runs/{runId}/flow-snapshots`](#get-v1-runs-runid-flow-snapshots) |  |
| `GET` | [`/v1/runs/{runId}/steps`](#get-v1-runs-runid-steps) |  |
| `GET` | [`/v1/runs/{runId}/steps/stream`](#get-v1-runs-runid-steps-stream) |  |

### `GET /v1/activity/stream`

Server-Sent Events. Emits `open` with the project's current activity counter, `changed` when that counter advances, and `close` with a reason before closing. Frames name which page-questions moved — `eval-runs`, `flow-runs`, `schedule-runs`, `endpoint-calls`, `record-ingestion` — and carry no run, suite or record ids. Answer a frame by re-reading whatever you are showing.

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `open`, `changed`, `close`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the same value `GET /v1/bootstrap` returns as `project.id`. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"open"` | yes | Always `open` — the first frame on every connection. ⚠️ ACT ON IT, not only on `changed`: runs start and finish while you are disconnected, and every deploy closes every connection. |
| `project` | `string` | yes | The project's NODE id — what you passed as `?project=`. Not the project's own id, which is a different value. |
| `version` | `string` | yes | The activity counter as it stands right now. Compare it with the one you hold to decide whether anything happened while you were away. |
| `sections` | `string[]` | yes | Which page-questions moved — `eval-runs`, `flow-runs`, `schedule-runs`, `endpoint-calls`, `record-ingestion`. Refetch only what you are showing. Treat an unrecognised word as a signal to refetch nothing rather than as an error: a newer deployment may name domains this client predates. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter — that is the only default safe in both directions, since it neither abandons a live subject nor hammers a dead one. |

### `GET /v1/runs`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project NODE whose runs to list (`OrgNode.id`). |
| `after` | `string` | no | Read the page of OLDER runs — pass the `nextCursor` you were given. An unparseable cursor is treated as absent and returns the first page, rather than as a bound of zero. |
| `before` | `string` | no | Read the page of NEWER runs — pass the `prevCursor` you were given. ⛔ NOT VALID WITH `after`: the two name opposite ways from one row, so a request carrying both is a client bug and is answered 422 rather than resolved by precedence — a page picked silently would look plausible and hide the fault. |
| `limit` | `integer` | no | Rows per page. Defaults to 50, capped at 100. |
| `window` | `"24h" \| "7d" \| "30d"` | no | Narrow to runs STARTED in this window. ⭐ THE SAME VOCABULARY the calls, ingestion and usage surfaces take, so a drill-through from one of them carries its window across without a translation table and a reader who narrowed there is never silently re-widened here. ⚠️ IT FILTERS, IT DOES NOT ORDER: the page is still a keyset on `seq`, and a bound on `at` does not change which column the cursor walks. Ranges on the OPENER's `at` — when the run started — which is what a reader means by a run being 'in' a window. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | The page, NEWEST FIRST by `seq`. ⛔ Ordered by insertion, not by start time — see `startedAt`. |
| `paging` | `"null"` | yes | Always `null`: this route declines a page COUNT over an unbounded run history and pages by cursor alone. Not a missing field — the route's answer (API-12). |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page of OLDER runs. `null` means this was the last page. Independent of anything a row says about itself. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page of NEWER runs. `null` on page one. ⛔ MEASURED, NEVER INFERRED FROM THE REQUEST. It was once taken from `after !== undefined` — 'a caller that passed a cursor came from somewhere' — which is true of a caller who walked here and false of every other way of arriving, and is the reasoning `/files` shipped and withdrew after it drew the newer control inert on every jumped page. It is an existence probe now, in both directions. |

### `GET /v1/runs/{runId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run to describe. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `run` | `object` | yes | The run, in the listing's own row shape, built from its EARLIEST opening frame. ⚠️ `seq` is still its paging cursor in the listing, and is published here so a caller can open the listing at this run rather than at the top. |
| `attempts` | `integer` | yes | How many times this run was attempted — a COUNT, never an attempt NUMBER. ⛔ A retried run writes one opening frame PER ATTEMPT, so the listing draws it as several rows and every one of them addresses THIS route. Publishing one attempt's number would contradict whichever row the caller clicked; `run.attempt` is the earliest frame's and is 1 on every retried run, which is why it cannot answer this on its own. |

### `GET /v1/runs/{runId}/change-set`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose recorded changes to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run this set belongs to. Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. |
| `state` | `"captured" \| "applied" \| "rejected" \| "discarded"` | yes | What became of the run's staged changes. `captured` — the writes went straight to Postgres and the set recorded them (the pass-through mode production runs today); `applied` — the set was applied whole, inside one transaction; `rejected` — a precondition failed or the transaction was refused, and NOTHING was written; `discarded` — the run failed, so the set was dropped unapplied. |
| `effects` | `object[]` | yes | Every change the run staged, in `seq` order. |
| `bound` | `object` | yes | The run's effect cap and its usage. Exceeding the cap rejects the whole set rather than truncating it — a truncated change set is a partial commit wearing a different hat. |
| `rejection` | `object` | no | Present only when the change set was rejected. |
| `createdAt` | `string` | yes | When the set was resolved. |

### `GET /v1/runs/{runId}/flow-snapshots`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose executed flow bodies to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these snapshots belong to. The same heterogeneous id space `GET /v1/runs/{runId}/steps` and `/change-set` take — a record attempt id, a flow run's request id, or an endpoint invocation id. |
| `snapshots` | `object[]` | yes | One entry per flow the run reached and stored, ordered by `flowId`. ⚠️ May be SHORTER than the run's `flowVersions` map, and the gap is meaningful: a system flow contributes a digest and no body, and a snapshot reaped past its window leaves the same shape. `missing` reports the difference rather than leaving it to be inferred. |
| `missing` | `string[]` | yes | Flow ids the run's log names that this response carries no body for — a platform-owned flow, or one whose snapshot was reaped. ⛔ NOT an error and NOT an empty graph: a reader that silently drew only `snapshots` would report a run as having executed fewer flows than it did. |

### `GET /v1/runs/{runId}/steps`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose step timeline to read. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page LATER in the run than this step — pass back the `nextCursor` you were given. An unparseable cursor is treated as absent and returns the first page, rather than as a bound of zero. |
| `before` | `string` | no | The page EARLIER in the run than this step — pass back the `prevCursor` you were given. Refused together with `after`. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an OFFSET, so it is the weaker motion — but a run's log is append-only and a finished run's never changes at all, which makes the drift a live run's tail and nothing else. Past the last page it CLAMPS. Refused together with a cursor. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these steps belong to. Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. The same id space `GET /v1/runs/{runId}/change-set` takes. |
| `steps` | `object[]` | yes | The run's timeline, in `seq` order. |
| `truncated` | `boolean` | yes | True when the RUN exceeded the per-run step cap, so events exist that were never recorded at all — the timeline is INCOMPLETE rather than short. ⛔ NOT a paging flag: it answers for the whole run and reads the same on every page. Whether more pages exist is `nextCursor`, and the two are independent — a complete timeline can span ten pages, and a truncated one can fit inside half of one. |
| `paging` | `object` | yes | Where this page sits in the recorded log: its size, its 1-based index, how many pages there are and how many steps were recorded. ⛔ `total` counts RECORDED steps — a run that outran the writer's cap has more that were never written, which is what `truncated` says. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page LATER in the run. NULL means this was the last page. The value is a `seq`, which is unique and monotonic, so a resume needs no tiebreaker and can neither skip nor repeat a row. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page EARLIER in the run. NULL means this is the first page — measured against the log, so it is still right on a page reached by a `page` jump, where nothing about the request says where the reader came from. |

### `GET /v1/runs/{runId}/steps/stream`

Server-Sent Events. Emits `steps` with whatever the caller missed (empty when it is already current, which is also how it learns the run exists), then `steps` again as rows are appended, then `close` with a reason. `close { terminal }` means the run finished or was aborted. Resume with `?after=<the last frame's through>`.

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `steps`, `close`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose step timeline to follow. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The position the caller already holds — a `seq` from the paged endpoint or from a previous frame's `through`. Rows at or before it are not re-sent. ⭐ OMITTED MEANS FROM THE START of the recorded log, which is what a client with nothing on screen wants; a page that has already rendered a timeline should always send it, or it pays for the whole backlog a second time. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these steps belong to. Heterogeneous by construction — an endpoint invocation id, a record-processing attempt id or a flow run's request id — exactly the id space `GET /v1/runs/{runId}/steps` takes. |
| `steps` | `object[]` | yes | Rows appended since the position the client asked from, in `seq` order. ⛔ MAY BE EMPTY, and an empty batch is not a defect: it is how a caller that is already current is told so at connect time, which is also what tells it the run exists at all. |
| `through` | `string` | yes | The `seq` of the last row in this frame, or the client's own position when the frame is empty. Pass it back as `after` on a reconnect. ⚠️ A STRING because `seq` is a 64-bit sequence and JSON numbers lose precision above 2^53 — the same reason the paged endpoint stringifies it. Compare as a BigInt, never as a string: `"9" > "10"` holds for the first nine rows of every run and is wrong ever after. |
| `truncated` | `boolean` | yes | True once the RUN has outrun the writer's per-run cap, so events occurred that were never recorded at all. ⛔ It does NOT end the stream and it is not a paging flag — the run continues and still finishes. Read it as: this timeline is INCOMPLETE rather than short. |
| `type` | `"close"` | yes | Always `close`. The server is ending the stream deliberately — this is an orderly goodbye, not a fault. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter — that is the only default safe in both directions, since it neither abandons a live subject nor hammers a dead one. |
