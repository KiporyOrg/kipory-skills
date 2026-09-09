<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: a22b93e6cbba · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Eval suites, cases and runs

Cases × a subject × scorers, graded and kept so runs compare. The run call is ADMIN, answers 202 with no run id, and is refused with 409 while one is in flight.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/eval-cases`](#get-v1-eval-cases) |  |
| `POST` | [`/v1/eval-cases`](#post-v1-eval-cases) |  |
| `GET` | [`/v1/eval-cases/{id}`](#get-v1-eval-cases-id) |  |
| `PATCH` | [`/v1/eval-cases/{id}`](#patch-v1-eval-cases-id) |  |
| `DELETE` | [`/v1/eval-cases/{id}`](#delete-v1-eval-cases-id) |  |
| `GET` | [`/v1/eval-runs/{id}`](#get-v1-eval-runs-id) |  |
| `GET` | [`/v1/eval-runs/{id}/traces/{traceId}`](#get-v1-eval-runs-id-traces-traceid) |  |
| `GET` | [`/v1/eval-suites`](#get-v1-eval-suites) |  |
| `POST` | [`/v1/eval-suites`](#post-v1-eval-suites) |  |
| `GET` | [`/v1/eval-suites/{id}`](#get-v1-eval-suites-id) |  |
| `PATCH` | [`/v1/eval-suites/{id}`](#patch-v1-eval-suites-id) |  |
| `DELETE` | [`/v1/eval-suites/{id}`](#delete-v1-eval-suites-id) |  |
| `GET` | [`/v1/eval-suites/{id}/readiness`](#get-v1-eval-suites-id-readiness) |  |
| `POST` | [`/v1/eval-suites/{id}/run`](#post-v1-eval-suites-id-run) |  |
| `GET` | [`/v1/eval-suites/{id}/runs`](#get-v1-eval-suites-id-runs) |  |
| `GET` | [`/v1/eval-suites/{id}/trend`](#get-v1-eval-suites-id-trend) |  |
| `GET` | [`/v1/eval-suites/trend`](#get-v1-eval-suites-trend) |  |

### `GET /v1/eval-cases`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suite` | `string` | yes | Suite whose cases to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `cases` | `object[]` | yes | Every case in the suite, enabled or not. |

### `POST /v1/eval-cases`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suite` | `string` | yes | Suite to add this case to. |
| `key` | `string` | yes | Stable identifier you choose. Run-to-run comparison matches on it, so keeping it stable preserves the case's history. |
| `description` | `string \| null` | no | Why this case exists. Never read by a scorer. |
| `inputs` | `object \| null` | no | Input values keyed by slot name. Use for a `FLOW_INPUTS` suite. |
| `recordId` | `string \| null` | no | Record to run against. Use for a `DATASET_RECORDS` suite. |
| `expected` | `unknown` | no | What a correct result looks like, for scorers that compare. |
| `assertions` | `object[]` | no | Deterministic checks over the output. May be empty — a case graded only by the suite's scorer flows is valid, and so is one graded only by assertions. |
| `labels` | `string[]` | no | Tags for selecting a subset of cases. |
| `enabled` | `boolean` | no | Whether this case runs. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Case id — the address for every case verb. |
| `suite` | `string` | yes | Suite this case belongs to. |
| `key` | `string` | yes | Stable identifier you choose. This is what a run-to-run comparison matches on, so keeping it stable is what preserves a case's history across edits and recreation. |
| `description` | `string \| null` | yes | Why this case exists, in your words. Never read by a scorer — it is provenance, not part of what is graded. |
| `inputs` | `object \| null` | yes | Input values for the flow, keyed by slot name. Used when the suite's `subjectKind` is `FLOW_INPUTS`. |
| `recordId` | `string \| null` | yes | Record this case runs against. Used when the suite's `subjectKind` is `DATASET_RECORDS`. |
| `expected` | `unknown` | no | What a correct result looks like, for scorers that compare. |
| `assertions` | `object[]` | yes | Deterministic checks over the run's output. Free and repeatable, unlike the suite's scorer flows. |
| `labels` | `string[]` | yes | Tags for selecting a subset of cases. |
| `enabled` | `boolean` | yes | Whether this case runs. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH. |
| `createdById` | `string \| null` | yes | Who created the case. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/eval-cases/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Case id — the address for every case verb. |
| `suite` | `string` | yes | Suite this case belongs to. |
| `key` | `string` | yes | Stable identifier you choose. This is what a run-to-run comparison matches on, so keeping it stable is what preserves a case's history across edits and recreation. |
| `description` | `string \| null` | yes | Why this case exists, in your words. Never read by a scorer — it is provenance, not part of what is graded. |
| `inputs` | `object \| null` | yes | Input values for the flow, keyed by slot name. Used when the suite's `subjectKind` is `FLOW_INPUTS`. |
| `recordId` | `string \| null` | yes | Record this case runs against. Used when the suite's `subjectKind` is `DATASET_RECORDS`. |
| `expected` | `unknown` | no | What a correct result looks like, for scorers that compare. |
| `assertions` | `object[]` | yes | Deterministic checks over the run's output. Free and repeatable, unlike the suite's scorer flows. |
| `labels` | `string[]` | yes | Tags for selecting a subset of cases. |
| `enabled` | `boolean` | yes | Whether this case runs. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH. |
| `createdById` | `string \| null` | yes | Who created the case. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/eval-cases/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | New stable identifier. Changing it detaches the case from its own history, since comparison matches on this value. |
| `description` | `string \| null` | no | Why this case exists. Never read by a scorer. |
| `inputs` | `object \| null` | no | Input values keyed by slot name. |
| `recordId` | `string \| null` | no | Record to run against. |
| `expected` | `unknown` | no | What a correct result looks like. |
| `assertions` | `object[]` | no | Deterministic checks. Replaces the existing list. |
| `labels` | `string[]` | no | Tags. Replaces the existing list. |
| `enabled` | `boolean` | no | Whether this case runs. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Case id — the address for every case verb. |
| `suite` | `string` | yes | Suite this case belongs to. |
| `key` | `string` | yes | Stable identifier you choose. This is what a run-to-run comparison matches on, so keeping it stable is what preserves a case's history across edits and recreation. |
| `description` | `string \| null` | yes | Why this case exists, in your words. Never read by a scorer — it is provenance, not part of what is graded. |
| `inputs` | `object \| null` | yes | Input values for the flow, keyed by slot name. Used when the suite's `subjectKind` is `FLOW_INPUTS`. |
| `recordId` | `string \| null` | yes | Record this case runs against. Used when the suite's `subjectKind` is `DATASET_RECORDS`. |
| `expected` | `unknown` | no | What a correct result looks like, for scorers that compare. |
| `assertions` | `object[]` | yes | Deterministic checks over the run's output. Free and repeatable, unlike the suite's scorer flows. |
| `labels` | `string[]` | yes | Tags for selecting a subset of cases. |
| `enabled` | `boolean` | yes | Whether this case runs. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH. |
| `createdById` | `string \| null` | yes | Who created the case. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/eval-cases/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `GET /v1/eval-runs/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `run` | `object` | yes | The run's own record. |
| `results` | `object[]` | yes | What happened to each case. |
| `aggregates` | `object` | yes | This run's own numbers, pooled and per label. Always present — unlike a delta, there is no second run to be incomparable with. |
| `delta` | `object \| null` | yes | Comparison against the previous run of this suite. Null when there is no previous run. |

### `GET /v1/eval-runs/{id}/traces/{traceId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Run id. |
| `traceId` | `string` | yes | Trace to fetch from within that run. |

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

### `GET /v1/eval-suites`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose suites to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suites` | `object[]` | yes | Every eval suite in the project. |

### `POST /v1/eval-suites`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the suite. |
| `name` | `string` | yes | Display name for the suite. |
| `description` | `string \| null` | no | Free-text note about what this suite measures. |
| `subjectKind` | `"FLOW_INPUTS" \| "DATASET_RECORDS"` | yes | What the suite measures. `FLOW_INPUTS` runs a flow against inputs each case supplies. `DATASET_RECORDS` runs it against existing records in a dataset, which also selects the flow. |
| `flow` | `string \| null` | no | Flow under test. Required when `subjectKind` is `FLOW_INPUTS`, and refused otherwise. |
| `dataset` | `string \| null` | no | Dataset supplying records. Required when `subjectKind` is `DATASET_RECORDS`, and refused otherwise. |
| `scorerFlowIds` | `string[]` | no | Flows that grade each case. These are billed model calls; a case's own assertions are free. |
| `runAsUserId` | `string \| null` | no | End user whose data the flow sees while running. |
| `coverageMode` | `"STRICT" \| "REPORT_ONLY"` | no | How a coverage shortfall is treated. `STRICT` fails the run. `REPORT_ONLY` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | no | Whether a configuration change triggers this suite. |
| `repeats` | `integer` | no | How many times each case runs, 1 to 10. Every repeat is a real run that spends, which is why the ceiling is refused here rather than part-way through the run. |
| `latencyIsolated` | `boolean` | no | Run cases one at a time, for latency measurement. |
| `subjectUncached` | `boolean` | no | Run the flow with the ingest cache out of the path. |
| `perSkillLatency` | `boolean` | no | Also record latency per skill, not just per run. |
| `bracketed` | `boolean` | no | Run the baseline configuration alongside the live one. Doubles spend. |
| `regressionEventCategory` | `string \| null` | no | Category of the event emitted when a run regresses. |
| `regressionEventKey` | `string \| null` | no | Key of that event type. It must already exist. |
| `enabled` | `boolean` | no | Whether the suite can run. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Suite id — the address for every suite verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | Display name of the suite. |
| `description` | `string \| null` | yes | Free-text note about what this suite measures. |
| `subjectKind` | `"FLOW_INPUTS" \| "DATASET_RECORDS"` | yes | What the suite measures. `FLOW_INPUTS` runs a flow against inputs each case supplies. `DATASET_RECORDS` runs it against existing records in a dataset, which also selects the flow. |
| `flow` | `string \| null` | yes | Flow under test. Set when `subjectKind` is `FLOW_INPUTS`. If it names a flow that no longer exists, a run refuses rather than measuring nothing and reporting success. |
| `dataset` | `string \| null` | yes | Dataset supplying the records. Set when `subjectKind` is `DATASET_RECORDS`; the dataset also determines which flow runs. |
| `scorerFlowIds` | `string[]` | yes | Flows that grade each case's output. These are billed model calls, unlike a case's own assertions, which are free and deterministic. |
| `runAsUserId` | `string \| null` | yes | End user whose data the flow sees while running. Null runs as a sentinel that owns no records. |
| `coverageMode` | `"STRICT" \| "REPORT_ONLY"` | yes | How a coverage shortfall is treated. `STRICT` fails the run. `REPORT_ONLY` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | yes | Whether a configuration change triggers this suite automatically. Separate from `enabled`: a suite with paid scorers can stay runnable while firing only by hand. |
| `repeats` | `integer` | yes | How many times each case runs. Repeats sample the flow only — grading still happens once, so scorer spend does not multiply. A single sample is not a latency measurement. |
| `latencyIsolated` | `boolean` | yes | Run cases one at a time. A case timed alongside siblings is slower for reasons unrelated to the flow, so set this when measuring latency. It costs the run its parallelism against the time budget. |
| `subjectUncached` | `boolean` | yes | Run the flow with the ingest cache out of the path. True for a performance suite — served from cache, a repeat is a replay rather than a sample. False for a quality suite, where an uncached run is itself unstable enough to move results between identical runs. Defaults to true, because a suite reporting replayed numbers still says SUCCESS. |
| `perSkillLatency` | `boolean` | yes | Also record a latency score per skill that executed, not just for the run as a whole. Opt-in: the number of rows scales with the flow's skill count times cases times repeats. |
| `bracketed` | `boolean` | yes | Run the baseline's configuration alongside the live one, interleaved, so drift in the environment affects both and cancels out of the comparison. Doubles the suite's spend. Withheld rather than quietly degraded when there is no baseline to compare against; the run reports why in `bracketRefusal`. |
| `regressionEventCategory` | `string \| null` | yes | Category of the project event emitted when a run comes out worse than its baseline. Null emits nothing. The event type must already exist in your project. |
| `regressionEventKey` | `string \| null` | yes | Key of that event type. Null emits nothing. |
| `enabled` | `boolean` | yes | Whether this suite can run at all. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH to be told about a concurrent edit instead of overwriting one. |
| `caseCount` | `integer` | yes | How many cases the suite holds, so a list view can show it. |
| `lastRun` | `object \| null` | yes | How this suite's most recent run came out, so a list can say whether the suite can be believed. Null when it has never run — which is not a zero and not a failure. |
| `createdById` | `string \| null` | yes | Who created the suite. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/eval-suites/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Suite id — the address for every suite verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | Display name of the suite. |
| `description` | `string \| null` | yes | Free-text note about what this suite measures. |
| `subjectKind` | `"FLOW_INPUTS" \| "DATASET_RECORDS"` | yes | What the suite measures. `FLOW_INPUTS` runs a flow against inputs each case supplies. `DATASET_RECORDS` runs it against existing records in a dataset, which also selects the flow. |
| `flow` | `string \| null` | yes | Flow under test. Set when `subjectKind` is `FLOW_INPUTS`. If it names a flow that no longer exists, a run refuses rather than measuring nothing and reporting success. |
| `dataset` | `string \| null` | yes | Dataset supplying the records. Set when `subjectKind` is `DATASET_RECORDS`; the dataset also determines which flow runs. |
| `scorerFlowIds` | `string[]` | yes | Flows that grade each case's output. These are billed model calls, unlike a case's own assertions, which are free and deterministic. |
| `runAsUserId` | `string \| null` | yes | End user whose data the flow sees while running. Null runs as a sentinel that owns no records. |
| `coverageMode` | `"STRICT" \| "REPORT_ONLY"` | yes | How a coverage shortfall is treated. `STRICT` fails the run. `REPORT_ONLY` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | yes | Whether a configuration change triggers this suite automatically. Separate from `enabled`: a suite with paid scorers can stay runnable while firing only by hand. |
| `repeats` | `integer` | yes | How many times each case runs. Repeats sample the flow only — grading still happens once, so scorer spend does not multiply. A single sample is not a latency measurement. |
| `latencyIsolated` | `boolean` | yes | Run cases one at a time. A case timed alongside siblings is slower for reasons unrelated to the flow, so set this when measuring latency. It costs the run its parallelism against the time budget. |
| `subjectUncached` | `boolean` | yes | Run the flow with the ingest cache out of the path. True for a performance suite — served from cache, a repeat is a replay rather than a sample. False for a quality suite, where an uncached run is itself unstable enough to move results between identical runs. Defaults to true, because a suite reporting replayed numbers still says SUCCESS. |
| `perSkillLatency` | `boolean` | yes | Also record a latency score per skill that executed, not just for the run as a whole. Opt-in: the number of rows scales with the flow's skill count times cases times repeats. |
| `bracketed` | `boolean` | yes | Run the baseline's configuration alongside the live one, interleaved, so drift in the environment affects both and cancels out of the comparison. Doubles the suite's spend. Withheld rather than quietly degraded when there is no baseline to compare against; the run reports why in `bracketRefusal`. |
| `regressionEventCategory` | `string \| null` | yes | Category of the project event emitted when a run comes out worse than its baseline. Null emits nothing. The event type must already exist in your project. |
| `regressionEventKey` | `string \| null` | yes | Key of that event type. Null emits nothing. |
| `enabled` | `boolean` | yes | Whether this suite can run at all. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH to be told about a concurrent edit instead of overwriting one. |
| `caseCount` | `integer` | yes | How many cases the suite holds, so a list view can show it. |
| `lastRun` | `object \| null` | yes | How this suite's most recent run came out, so a list can say whether the suite can be believed. Null when it has never run — which is not a zero and not a failure. |
| `createdById` | `string \| null` | yes | Who created the suite. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/eval-suites/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | New display name. |
| `description` | `string \| null` | no | New free-text note. |
| `subjectKind` | `"FLOW_INPUTS" \| "DATASET_RECORDS"` | no | What the suite measures. `FLOW_INPUTS` runs a flow against inputs each case supplies. `DATASET_RECORDS` runs it against existing records in a dataset, which also selects the flow. |
| `flow` | `string \| null` | no | Flow under test. Must be set when `subjectKind` is `FLOW_INPUTS`, and absent otherwise. |
| `dataset` | `string \| null` | no | Dataset supplying records. Must be set when `subjectKind` is `DATASET_RECORDS`, and absent otherwise. |
| `scorerFlowIds` | `string[]` | no | Flows that grade each case. Replaces the existing list. |
| `runAsUserId` | `string \| null` | no | End user whose data the flow sees while running. |
| `coverageMode` | `"STRICT" \| "REPORT_ONLY"` | no | How a coverage shortfall is treated. `STRICT` fails the run. `REPORT_ONLY` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | no | Whether a configuration change triggers this suite. |
| `repeats` | `integer` | no | How many times each case runs, 1 to 10. |
| `latencyIsolated` | `boolean` | no | Run cases one at a time, for latency measurement. |
| `subjectUncached` | `boolean` | no | Run the flow with the ingest cache out of the path. |
| `perSkillLatency` | `boolean` | no | Also record latency per skill, not just per run. |
| `bracketed` | `boolean` | no | Run the baseline configuration alongside the live one. |
| `regressionEventCategory` | `string \| null` | no | Category of the event emitted when a run regresses. |
| `regressionEventKey` | `string \| null` | no | Key of that event type. |
| `enabled` | `boolean` | no | Whether the suite can run. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Suite id — the address for every suite verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | Display name of the suite. |
| `description` | `string \| null` | yes | Free-text note about what this suite measures. |
| `subjectKind` | `"FLOW_INPUTS" \| "DATASET_RECORDS"` | yes | What the suite measures. `FLOW_INPUTS` runs a flow against inputs each case supplies. `DATASET_RECORDS` runs it against existing records in a dataset, which also selects the flow. |
| `flow` | `string \| null` | yes | Flow under test. Set when `subjectKind` is `FLOW_INPUTS`. If it names a flow that no longer exists, a run refuses rather than measuring nothing and reporting success. |
| `dataset` | `string \| null` | yes | Dataset supplying the records. Set when `subjectKind` is `DATASET_RECORDS`; the dataset also determines which flow runs. |
| `scorerFlowIds` | `string[]` | yes | Flows that grade each case's output. These are billed model calls, unlike a case's own assertions, which are free and deterministic. |
| `runAsUserId` | `string \| null` | yes | End user whose data the flow sees while running. Null runs as a sentinel that owns no records. |
| `coverageMode` | `"STRICT" \| "REPORT_ONLY"` | yes | How a coverage shortfall is treated. `STRICT` fails the run. `REPORT_ONLY` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | yes | Whether a configuration change triggers this suite automatically. Separate from `enabled`: a suite with paid scorers can stay runnable while firing only by hand. |
| `repeats` | `integer` | yes | How many times each case runs. Repeats sample the flow only — grading still happens once, so scorer spend does not multiply. A single sample is not a latency measurement. |
| `latencyIsolated` | `boolean` | yes | Run cases one at a time. A case timed alongside siblings is slower for reasons unrelated to the flow, so set this when measuring latency. It costs the run its parallelism against the time budget. |
| `subjectUncached` | `boolean` | yes | Run the flow with the ingest cache out of the path. True for a performance suite — served from cache, a repeat is a replay rather than a sample. False for a quality suite, where an uncached run is itself unstable enough to move results between identical runs. Defaults to true, because a suite reporting replayed numbers still says SUCCESS. |
| `perSkillLatency` | `boolean` | yes | Also record a latency score per skill that executed, not just for the run as a whole. Opt-in: the number of rows scales with the flow's skill count times cases times repeats. |
| `bracketed` | `boolean` | yes | Run the baseline's configuration alongside the live one, interleaved, so drift in the environment affects both and cancels out of the comparison. Doubles the suite's spend. Withheld rather than quietly degraded when there is no baseline to compare against; the run reports why in `bracketRefusal`. |
| `regressionEventCategory` | `string \| null` | yes | Category of the project event emitted when a run comes out worse than its baseline. Null emits nothing. The event type must already exist in your project. |
| `regressionEventKey` | `string \| null` | yes | Key of that event type. Null emits nothing. |
| `enabled` | `boolean` | yes | Whether this suite can run at all. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH to be told about a concurrent edit instead of overwriting one. |
| `caseCount` | `integer` | yes | How many cases the suite holds, so a list view can show it. |
| `lastRun` | `object \| null` | yes | How this suite's most recent run came out, so a list can say whether the suite can be believed. Null when it has never run — which is not a zero and not a failure. |
| `createdById` | `string \| null` | yes | Who created the suite. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/eval-suites/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `GET /v1/eval-suites/{id}/readiness`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suiteId` | `string` | yes | The suite this readiness report describes. |
| `subjectFlowId` | `string \| null` | yes | The flow whose graph was walked, or null when the suite names none. |
| `scope` | `object \| null` | yes | What the subject's graph touches, or NULL when it could not be walked — never null to mean 'walked and found nothing'. Exactly one of this and `unavailableReason` is set. |
| `unavailableReason` | `string \| null` | yes | Why there is no report, in a sentence for the operator: the suite measures a dataset, names no flow, or names a flow the project's library does not hold. Null when `scope` is present. |

### `POST /v1/eval-suites/{id}/run`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `caseKeys` | `string[]` | no | Run exactly these cases, by their `key`. Omit to run every enabled case in the suite. |
| `includeDisabled` | `boolean` | no | Also run cases marked disabled. |
| `note` | `string` | no | Free-text note recorded on the run, for saying what you were testing. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suiteId` | `string` | yes | The suite whose run was accepted. |
| `queued` | `true` | yes | Always true. The run is on the queue and has not started; re-read the suite's runs to see it once the worker picks it up. |

### `GET /v1/eval-suites/{id}/runs`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many runs to return, newest first. 1 to 100. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Runs, newest first. |
| `truncated` | `boolean` | yes | True when older runs exist beyond this window. STATED rather than left to be inferred: a window that came back FULL is not evidence of anything, and `limit` is a CEILING with no cursor behind it — there is no way to ask for what was cut. |

### `GET /v1/eval-suites/{id}/trend`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many points to return. At least 2 — one point is no trend. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `points` | `object[]` | yes | Points oldest first, so the series reads left to right. Check each point's `comparableWithPrevious` before connecting it to the last. |
| `truncated` | `boolean` | yes | True when runs exist OLDER than the first point here — the series is a window, not the suite's whole history. Distinguishes a genuinely new suite from one whose earlier runs fell outside `limit`. |

### `GET /v1/eval-suites/trend`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose suites to read. |
| `limit` | `integer` | no | How many points per suite. At least 2 — one point is no trend — and at most 20, because this window is taken for EVERY suite in the project rather than for one. The per-suite `/:id/trend` is where a longer history is asked for. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suites` | `object[]` | yes | Every suite in the project, including ones that have never run. A suite absent from this list was not read, and no client should have to guess which of the two it is looking at. |
