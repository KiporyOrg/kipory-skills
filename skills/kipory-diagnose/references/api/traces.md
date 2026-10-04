<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Flow traces

What a run received, produced, and held in each output slot. Sampled per project, dropped on a TTL, and the list carries no payloads. `recent-records` names the records a flow ran on lately, from its traces and its run log together.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flows/{id}/recent-records`](#get-v1-flows-id-recent-records) |  |
| `GET` | [`/v1/flows/{id}/traces`](#get-v1-flows-id-traces) |  |
| `GET` | [`/v1/flows/{id}/traces/{traceId}`](#get-v1-flows-id-traces-traceid) |  |

### `GET /v1/flows/{id}/recent-records`

The records this flow ran on lately, named, newest first — what a preview's record picker offers before anything is typed. A capped sample, not a page. Run the flow on one with `POST /v1/flows/{id}/preview` (`input: {kind: "record", recordId}`); search every record of the project with `POST /v1/projects/{nodeId}/records/query`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many records to return, most recently run first, up to 50. A CAP, not a page: there is no cursor, and records deleted since their run are dropped, so fewer may come back. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `records` | `object[]` | yes | Distinct records, most recently run first. Empty for a flow no record has run through lately — and for a PLATFORM flow, whose runs belong to the projects that bind it rather than to any one project a reader of this flow could be shown. |

Each item of `records`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `recordId` | `string` | yes | The record's id. |
| `recordType` | `string` | yes | The record's own type — which, for a flow bound to several types, says which binding the run came through. |
| `identity` | `object` | yes | What to call the record — its natural key, or a fragment of its content when it has none. The same identity every records surface draws. |
| `lastRanAt` | `string` | yes | When this flow last ran on the record — its latest trace or run opener, whichever is newer. ⚠️ A floor, not a fact about every run: traces are sampled and expire, and the run log is scanned over a bounded recent window. |

### `GET /v1/flows/{id}/traces`

A flow's traces — the VALUES half of its runs: inputs, outputs and per-step outputs, sampled in production and kept 7 days — newest first, walked on `after`/`before`; filter by `source` and `recordId`. Each carries the `runId` of its run. Every run, with no values, is `GET /v1/runs?project=`; one run's trace by run id is `GET /v1/runs/{runId}/trace`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | Rows per page, newest first, up to 100. Walk older pages with `after`. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |
| `source` | `"production" \| "eval" \| "manual"` | no | Narrow to one origin. `production` is usually what a diagnosis wants — the other two are runs someone provoked on purpose. |
| `recordId` | `string` | no | Narrow to runs that processed one particular record. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `traces` | `object[]` | yes | The flow's runs, newest first by `createdAt`, then id, WITHOUT their payloads — read one trace to get those. ⚠️ An absent run is not evidence it did not happen: traces expire, and writing them is sampled. |
| `sampling` | `object` | yes | How much of this project's traffic is traced at all. ⚠️ WITHOUT THIS THE LIST IS UNINTERPRETABLE — 'three traces' means one thing at a rate of 1 and something very different at 0.05. Null means the deployment default is in force, which is NOT zero. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, and no `page` jump is offered — walk with `after` / `before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

Each item of `traces`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trace's id. |
| `subject` | `string` | yes | What kind of thing the flow was invoked for: `request` when it ran with an input bag (an endpoint or a search), `record` when it ran to process one record. Those are the only two values. |
| `source` | `string` | yes | Where the run came from: `production` is real traffic, while `eval` and `manual` are runs someone deliberately provoked. |
| `tag` | `string \| null` | yes | A label attached to the run, or null. |
| `platformFlowRun` | `boolean` | yes | True when the flow that ran is a platform flow, run by one of this project's eval suites: the trace is filed under this project, which ran it, but the flow is not one of the project's own. |
| `flowId` | `string \| null` | yes | The flow that ran. |
| `recordId` | `string \| null` | yes | The record being processed, when `subject` is `record`. Null otherwise. |
| `runId` | `string \| null` | yes | The run that wrote this trace — its steps, change set and spend answer under `/v1/runs/{runId}`. Null for a trace written without one. |
| `durationMs` | `integer \| null` | yes | How long the run took, in milliseconds. ⚠️ NULL MEANS UNTIMED, not instant — an old row, or a run that crashed before it got going. Render the difference. |
| `createdAt` | `string` | yes | When the run happened. |
| `expiresAt` | `string` | yes | When this trace will be deleted. Reading it after this point returns 404 by design, not because the reference is broken. |

### `GET /v1/flows/{id}/traces/{traceId}`

One trace of this flow in full, with its `runId`. The same trace by its run is `GET /v1/runs/{runId}/trace`; the run's execution record (steps, no values) is `GET /v1/runs/{runId}/steps`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow that produced the trace. Traces are read UNDER their flow, never by id alone. |
| `traceId` | `string` | yes | The trace to read. A 404 here is expected once it has expired. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trace's id. |
| `subject` | `string` | yes | What kind of thing the flow was invoked for: `request` when it ran with an input bag (an endpoint or a search), `record` when it ran to process one record. Those are the only two values. |
| `source` | `string` | yes | Where the run came from: `production` is real traffic, while `eval` and `manual` are runs someone deliberately provoked. |
| `tag` | `string \| null` | yes | A label attached to the run, or null. |
| `platformFlowRun` | `boolean` | yes | True when the flow that ran is a platform flow, run by one of this project's eval suites: the trace is filed under this project, which ran it, but the flow is not one of the project's own. |
| `flowId` | `string \| null` | yes | The flow that ran. |
| `recordId` | `string \| null` | yes | The record being processed, when `subject` is `record`. Null otherwise. |
| `runId` | `string \| null` | yes | The run that wrote this trace — its steps, change set and spend answer under `/v1/runs/{runId}`. Null for a trace written without one. |
| `inputs` | `unknown` | no | What the run received. |
| `output` | `unknown` | no | What the run produced. There is no status field on a trace — a failure shows up HERE and in `slotOutputs`, not as a verdict. |
| `slotOutputs` | `object` | yes | What the run wrote, keyed by OUTPUT SLOT — one level, not nested by step. The payload that matters for a diagnosis: it separates a slot that was written from one that was not. Truncated when it was written. A step whose output slot is empty contributes no key. |
| `stepOutputs` | `object \| null` | yes | What each STEP wrote, for the writes a slot name cannot name. Null when the writer recorded no steps. |
| `durationMs` | `integer \| null` | yes | How long the run took, in milliseconds. ⚠️ NULL MEANS UNTIMED, not instant — an old row, or a run that crashed before it got going. Render the difference. |
| `createdAt` | `string` | yes | When the run happened. |
| `expiresAt` | `string` | yes | When this trace will be deleted. Reading it after this point returns 404 by design, not because the reference is broken. |
