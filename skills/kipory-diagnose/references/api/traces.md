<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 87ba7606f60b · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Flow traces

What a run received, produced, and held in each output slot. Sampled per project, dropped on a TTL, and the list carries no payloads.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flows/{id}/traces`](#get-v1-flows-id-traces) |  |
| `GET` | [`/v1/flows/{id}/traces/{traceId}`](#get-v1-flows-id-traces-traceid) |  |

### `GET /v1/flows/{id}/traces`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many traces to return, newest first, up to 100. |
| `source` | `"production" \| "eval" \| "manual"` | no | Narrow to one origin. `production` is usually what a diagnosis wants — the other two are runs someone provoked on purpose. |
| `recordId` | `string` | no | Narrow to runs that processed one particular record. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `truncated` | `boolean` | yes | True when older traces exist beyond this window. A window that came back FULL is not evidence of anything, so this is stated rather than left to be counted. ⛔ Independent of `sampling`, which answers a different absence: how many runs wrote a trace at all. |
| `traces` | `object[]` | yes | The flow's recent runs, newest first, WITHOUT their payloads — read one trace to get those. ⚠️ An absent run is not evidence it did not happen: traces expire, and writing them is sampled. |
| `sampling` | `object` | yes | How much of this project's traffic is traced at all. ⚠️ WITHOUT THIS THE LIST IS UNINTERPRETABLE — 'three traces' means one thing at a rate of 1 and something very different at 0.05. Null means the deployment default is in force, which is NOT zero. |

### `GET /v1/flows/{id}/traces/{traceId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow that produced the trace. Traces are read UNDER their flow, never by id alone. |
| `traceId` | `string` | yes | The trace to read. A 404 here is expected once it has expired. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trace's id. |
| `subject` | `string` | yes | What kind of thing the flow was invoked for: `request` when it ran with an input bag (an endpoint, a search, a chat), `record` when it ran to process one record. Those are the only two values. |
| `source` | `string` | yes | Where the run came from: `production` is real traffic, while `eval` and `manual` are runs someone deliberately provoked. |
| `tag` | `string \| null` | yes | A label attached to the run, or null. |
| `flowId` | `string \| null` | yes | The flow that ran. |
| `recordId` | `string \| null` | yes | The record being processed, when `subject` is `record`. Null otherwise. |
| `inputs` | `unknown` | no | What the run received. |
| `output` | `unknown` | no | What the run produced. There is no status field on a trace — a failure shows up HERE and in `slotOutputs`, not as a verdict. |
| `slotOutputs` | `object` | yes | What the run wrote, keyed by OUTPUT SLOT — one level, not nested by step. The payload that matters for a diagnosis: it separates a slot that was written from one that was not. Truncated when it was written. A step whose output slot is empty contributes no key. |
| `stepOutputs` | `object \| null` | yes | What each STEP wrote, for the writes a slot name cannot name. Null when the writer recorded no steps. |
| `durationMs` | `integer \| null` | yes | How long the run took, in milliseconds. ⚠️ NULL MEANS UNTIMED, not instant — an old row, or a run that crashed before it got going. Render the difference. |
| `createdAt` | `string` | yes | When the run happened. |
| `expiresAt` | `string` | yes | When this trace will be deleted. Reading it after this point returns 404 by design, not because the reference is broken. |
