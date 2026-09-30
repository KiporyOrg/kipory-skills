<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

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

List one eval suite's cases (`?suiteId=`), enabled or not, each with the `version` its PATCH takes. An eval case is scored and runs asynchronously as part of its suite (`POST /v1/eval-suites/{id}/run`); a flow test case (`GET /v1/flow-test-cases?flowId=`) is pass/fail and runs synchronously and free (`POST /v1/flows/{id}/test`). The same cases, as authored, ride `GET /v1/bootstrap` and each suite's `cases` in the `evals` section of `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suiteId` | `string` | yes | Id of the suite whose cases to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `cases` | `object[]` | yes | Every case in the suite, enabled or not. |

### `POST /v1/eval-cases`

Add a case to an eval suite: the inputs its run hands the suite's flow, what a correct result looks like (`expected`) for scorers that compare, and free deterministic `assertions`. Scored, and run asynchronously with its suite by `POST /v1/eval-suites/{id}/run`. Refused (422) without inputs or with an unsafe assertion, and (409) when the key is used in the suite. With `validateOnly: true` it answers whether the create would be refused, writing nothing. For a pass/fail check run synchronously and free by `POST /v1/flows/{id}/test`, add a flow test case (`POST /v1/flow-test-cases`) instead. Several at once: a suite's `cases` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suiteId` | `string` | yes | Id of the suite to add this case to. |
| `key` | `string` | yes | The case's key, which you choose. Run-to-run comparison matches on it, so keeping it stable preserves the case's history. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `description` | `string \| null` | no | Why this case exists. Never read by a scorer. |
| `inputs` | `object \| null` | no | Input values for the suite's flow, keyed by slot name. Required: a case without inputs is refused. |
| `expected` | `unknown` | no | What a correct result looks like, for scorers that compare. |
| `assertions` | `object[]` | no | Deterministic checks over the output. May be empty — a case graded only by the suite's scorer flows is valid, and so is one graded only by assertions. |
| `labels` | `string[]` | no | Tags for selecting a subset of cases. |
| `enabled` | `boolean` | no | Whether this case runs. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Case id — the address for every case verb. |
| `suiteId` | `string` | yes | Id of the suite this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose. This is what a run-to-run comparison matches on, so keeping it stable is what preserves a case's history across edits and recreation. |
| `description` | `string \| null` | yes | Why this case exists, in your words. Never read by a scorer — it is provenance, not part of what is graded. |
| `inputs` | `object \| null` | yes | Input values for the suite's flow, keyed by slot name — what this case runs the flow with. |
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

Read one eval case. Every case of its suite: `GET /v1/eval-cases?suiteId=`; its results across runs: `GET /v1/eval-runs/{id}` of each run.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Case id — the address for every case verb. |
| `suiteId` | `string` | yes | Id of the suite this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose. This is what a run-to-run comparison matches on, so keeping it stable is what preserves a case's history across edits and recreation. |
| `description` | `string \| null` | yes | Why this case exists, in your words. Never read by a scorer — it is provenance, not part of what is graded. |
| `inputs` | `object \| null` | yes | Input values for the suite's flow, keyed by slot name — what this case runs the flow with. |
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

Change an eval case — its inputs, expected result, assertions, labels, or whether it runs. Changing its `key` detaches it from its own history, since runs compare cases by key. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | The case's new key. Changing it detaches the case from its own history, since comparison matches on this value. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `description` | `string \| null` | no | Why this case exists. Never read by a scorer. |
| `inputs` | `object \| null` | no | Input values for the suite's flow, keyed by slot name. Cannot be cleared: a case without inputs is refused. |
| `expected` | `unknown` | no | What a correct result looks like. |
| `assertions` | `object[]` | no | Deterministic checks. Replaces the existing list. |
| `labels` | `string[]` | no | Tags. Replaces the existing list. |
| `enabled` | `boolean` | no | Whether this case runs. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Case id — the address for every case verb. |
| `suiteId` | `string` | yes | Id of the suite this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose. This is what a run-to-run comparison matches on, so keeping it stable is what preserves a case's history across edits and recreation. |
| `description` | `string \| null` | yes | Why this case exists, in your words. Never read by a scorer — it is provenance, not part of what is graded. |
| `inputs` | `object \| null` | yes | Input values for the suite's flow, keyed by slot name — what this case runs the flow with. |
| `expected` | `unknown` | no | What a correct result looks like, for scorers that compare. |
| `assertions` | `object[]` | yes | Deterministic checks over the run's output. Free and repeatable, unlike the suite's scorer flows. |
| `labels` | `string[]` | yes | Tags for selecting a subset of cases. |
| `enabled` | `boolean` | yes | Whether this case runs. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH. |
| `createdById` | `string \| null` | yes | Who created the case. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `DELETE /v1/eval-cases/{id}`

Delete an eval case. The runs that measured it keep its results, and its scores survive detached; its suite's next run measures one case fewer. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `GET /v1/eval-runs/{id}`

One eval run in full — its status, trigger, provenance, per-case results with every score, and the run's aggregates. A suite's runs are `GET /v1/eval-suites/{id}/runs`; one case's trace is `GET /v1/eval-runs/{id}/traces/{traceId}`.

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

The trace of one case in an eval run, with its `runId`. The run's per-case scores are `GET /v1/eval-runs/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Run id. |
| `traceId` | `string` | yes | Trace to fetch from within that run. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trace's id. |
| `subject` | `string` | yes | What kind of thing the flow was invoked for: `request` when it ran with an input bag (an endpoint or a search), `record` when it ran to process one record. Those are the only two values. |
| `source` | `string` | yes | Where the run came from: `production` is real traffic, while `eval` and `manual` are runs someone deliberately provoked. |
| `tag` | `string \| null` | yes | A label attached to the run, or null. |
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

### `GET /v1/eval-suites`

List one project's eval suites (`?project=<nodeId>`), each with its configuration, the `version` its PATCH takes, its newest run (`lastRun`) and whether a run is in flight. An eval suite scores a flow over a set of eval cases, asynchronously and billed; the pass/fail, free check of one flow is its flow test cases (`GET /v1/flow-test-cases?flowId=`). The same suites, as authored, ride `GET /v1/bootstrap` (by id) and the `evals` section of `GET /v1/projects/{nodeId}/document` (by key). Every suite's recent scores at once: `GET /v1/eval-suites/trend?project=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose suites to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suites` | `object[]` | yes | Every eval suite in the project. |

### `POST /v1/eval-suites`

Create an eval suite: a flow under test (`flowId`), the scorer flows that grade each case, and how a run treats a coverage shortfall (`coverageMode`). Its cases are added with `POST /v1/eval-cases`; it is run with `POST /v1/eval-suites/{id}/run`. Refused (422) when the flow or a scorer is not this project's (or the platform's), and (409) when the key is taken. With `validateOnly: true` it answers whether the create would be refused, writing nothing. Several suites with their cases at once: the `evals` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`). For a free pass/fail check of one flow, use flow test cases (`POST /v1/flow-test-cases`) instead.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the suite. |
| `key` | `string` | yes | The suite's key, which you choose — unique in the project and what a link to the suite and the project document name it by. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `label` | `string` | yes | Display label for the suite. |
| `description` | `string \| null` | no | Free-text note about what this suite measures. |
| `flowId` | `string` | yes | Id of the flow under test. It must exist in this project or be a platform flow. |
| `scorerFlowIds` | `string[]` | no | Flows that grade each case. These are billed model calls; a case's own assertions are free. |
| `runAsUserId` | `string \| null` | no | End user whose data the flow sees while running. |
| `coverageMode` | `"strict" \| "report-only"` | no | How a coverage shortfall is treated. `strict` fails the run. `report-only` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | no | Whether a configuration change triggers this suite. |
| `repeats` | `integer` | no | How many times each case runs, 1 to 10. Every repeat is a real run that spends, which is why the ceiling is refused here rather than part-way through the run. |
| `latencyIsolated` | `boolean` | no | Run cases one at a time, for latency measurement. |
| `subjectUncached` | `boolean` | no | Run the flow with the ingest cache out of the path. |
| `perSkillLatency` | `boolean` | no | Also record latency per skill, not just per run. |
| `bracketed` | `boolean` | no | Run the baseline configuration alongside the live one. Doubles spend. |
| `regressionCategoryKey` | `string \| null` | no | Key of the category of the event emitted when a run regresses. |
| `regressionEventKey` | `string \| null` | no | Key of that event type. It must already exist. |
| `enabled` | `boolean` | no | Whether the suite can run. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Suite id — the address for every suite verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The suite's key, which you choose — unique in the project and what a link to the suite and the project document name it by. |
| `label` | `string` | yes | Display label of the suite. |
| `description` | `string \| null` | yes | Free-text note about what this suite measures. |
| `flowId` | `string` | yes | Id of the flow under test; every case runs it with its own inputs. If it names a flow that no longer exists, a run refuses rather than measuring nothing and reporting success. |
| `scorerFlowIds` | `string[]` | yes | Flows that grade each case's output. These are billed model calls, unlike a case's own assertions, which are free and deterministic. |
| `runAsUserId` | `string \| null` | yes | End user whose data the flow sees while running. Null runs as a sentinel that owns no records. |
| `coverageMode` | `"strict" \| "report-only"` | yes | How a coverage shortfall is treated. `strict` fails the run. `report-only` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | yes | Whether a configuration change triggers this suite automatically. Separate from `enabled`: a suite with paid scorers can stay runnable while firing only by hand. |
| `repeats` | `integer` | yes | How many times each case runs. Repeats sample the flow only — grading still happens once, so scorer spend does not multiply. A single sample is not a latency measurement. |
| `latencyIsolated` | `boolean` | yes | Run cases one at a time. A case timed alongside siblings is slower for reasons unrelated to the flow, so set this when measuring latency. It costs the run its parallelism against the time budget. |
| `subjectUncached` | `boolean` | yes | Run the flow with the ingest cache out of the path. True for a performance suite — served from cache, a repeat is a replay rather than a sample. False for a quality suite, where an uncached run is itself unstable enough to move results between identical runs. Defaults to true, because a suite reporting replayed numbers still says `success`. |
| `perSkillLatency` | `boolean` | yes | Also record a latency score per skill that executed, not just for the run as a whole. Opt-in: the number of rows scales with the flow's skill count times cases times repeats. |
| `bracketed` | `boolean` | yes | Run the baseline's configuration alongside the live one, interleaved, so drift in the environment affects both and cancels out of the comparison. Doubles the suite's spend. Withheld rather than quietly degraded when there is no baseline to compare against; the run reports why in `bracketRefusal`. |
| `regressionCategoryKey` | `string \| null` | yes | Key of the category of the project event emitted when a run comes out worse than its baseline. Null emits nothing. The event type must already exist in your project. |
| `regressionEventKey` | `string \| null` | yes | Key of that event type. Null emits nothing. |
| `enabled` | `boolean` | yes | Whether this suite can run at all. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH to be told about a concurrent edit instead of overwriting one. |
| `caseCount` | `integer` | yes | How many cases the suite holds, so a list view can show it. |
| `lastRun` | `object \| null` | yes | How this suite's most recent run came out, so a list can say whether the suite can be believed. Null when it has never run — which is not a zero and not a failure. |
| `runInFlight` | `boolean \| null` | yes | Whether a run of this suite is already queued, executing, or holding the suite's run lock — exactly when `POST /v1/eval-suites/{id}/run` refuses with a 409. True from the moment a run is accepted, before its run row exists, and while a run row is still honoured after its worker died. Null when the queue could not be read and no lock is held, which says nothing either way. |
| `createdById` | `string \| null` | yes | Who created the suite. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/eval-suites/{id}`

Read one eval suite: its configuration, the `version` its PATCH takes, its newest run (`lastRun`) and whether a run is in flight. Its cases: `GET /v1/eval-cases?suiteId=`; its runs: `GET /v1/eval-suites/{id}/runs`; its scores over time: `GET /v1/eval-suites/{id}/trend`; what its configuration will measure before a run: `GET /v1/eval-suites/{id}/readiness`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Suite id — the address for every suite verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The suite's key, which you choose — unique in the project and what a link to the suite and the project document name it by. |
| `label` | `string` | yes | Display label of the suite. |
| `description` | `string \| null` | yes | Free-text note about what this suite measures. |
| `flowId` | `string` | yes | Id of the flow under test; every case runs it with its own inputs. If it names a flow that no longer exists, a run refuses rather than measuring nothing and reporting success. |
| `scorerFlowIds` | `string[]` | yes | Flows that grade each case's output. These are billed model calls, unlike a case's own assertions, which are free and deterministic. |
| `runAsUserId` | `string \| null` | yes | End user whose data the flow sees while running. Null runs as a sentinel that owns no records. |
| `coverageMode` | `"strict" \| "report-only"` | yes | How a coverage shortfall is treated. `strict` fails the run. `report-only` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | yes | Whether a configuration change triggers this suite automatically. Separate from `enabled`: a suite with paid scorers can stay runnable while firing only by hand. |
| `repeats` | `integer` | yes | How many times each case runs. Repeats sample the flow only — grading still happens once, so scorer spend does not multiply. A single sample is not a latency measurement. |
| `latencyIsolated` | `boolean` | yes | Run cases one at a time. A case timed alongside siblings is slower for reasons unrelated to the flow, so set this when measuring latency. It costs the run its parallelism against the time budget. |
| `subjectUncached` | `boolean` | yes | Run the flow with the ingest cache out of the path. True for a performance suite — served from cache, a repeat is a replay rather than a sample. False for a quality suite, where an uncached run is itself unstable enough to move results between identical runs. Defaults to true, because a suite reporting replayed numbers still says `success`. |
| `perSkillLatency` | `boolean` | yes | Also record a latency score per skill that executed, not just for the run as a whole. Opt-in: the number of rows scales with the flow's skill count times cases times repeats. |
| `bracketed` | `boolean` | yes | Run the baseline's configuration alongside the live one, interleaved, so drift in the environment affects both and cancels out of the comparison. Doubles the suite's spend. Withheld rather than quietly degraded when there is no baseline to compare against; the run reports why in `bracketRefusal`. |
| `regressionCategoryKey` | `string \| null` | yes | Key of the category of the project event emitted when a run comes out worse than its baseline. Null emits nothing. The event type must already exist in your project. |
| `regressionEventKey` | `string \| null` | yes | Key of that event type. Null emits nothing. |
| `enabled` | `boolean` | yes | Whether this suite can run at all. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH to be told about a concurrent edit instead of overwriting one. |
| `caseCount` | `integer` | yes | How many cases the suite holds, so a list view can show it. |
| `lastRun` | `object \| null` | yes | How this suite's most recent run came out, so a list can say whether the suite can be believed. Null when it has never run — which is not a zero and not a failure. |
| `runInFlight` | `boolean \| null` | yes | Whether a run of this suite is already queued, executing, or holding the suite's run lock — exactly when `POST /v1/eval-suites/{id}/run` refuses with a 409. True from the moment a run is accepted, before its run row exists, and while a run row is still honoured after its worker died. Null when the queue could not be read and no lock is held, which says nothing either way. |
| `createdById` | `string \| null` | yes | Who created the suite. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/eval-suites/{id}`

Change an eval suite's configuration — its flow, scorers, `coverageMode`, repeats, regression event, key or label. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. Refused (422) when the flow or a scorer is not this project's, and (409) when a new key is taken. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | The suite's new key. A link or document naming the old key stops resolving. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `label` | `string` | no | New display label. |
| `description` | `string \| null` | no | New free-text note. |
| `flowId` | `string` | no | Id of the new flow under test. It must exist in this project or be a platform flow. |
| `scorerFlowIds` | `string[]` | no | Flows that grade each case. Replaces the existing list. |
| `runAsUserId` | `string \| null` | no | End user whose data the flow sees while running. |
| `coverageMode` | `"strict" \| "report-only"` | no | How a coverage shortfall is treated. `strict` fails the run. `report-only` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | no | Whether a configuration change triggers this suite. |
| `repeats` | `integer` | no | How many times each case runs, 1 to 10. |
| `latencyIsolated` | `boolean` | no | Run cases one at a time, for latency measurement. |
| `subjectUncached` | `boolean` | no | Run the flow with the ingest cache out of the path. |
| `perSkillLatency` | `boolean` | no | Also record latency per skill, not just per run. |
| `bracketed` | `boolean` | no | Run the baseline configuration alongside the live one. |
| `regressionCategoryKey` | `string \| null` | no | Key of the category of the event emitted when a run regresses. |
| `regressionEventKey` | `string \| null` | no | Key of that event type. |
| `enabled` | `boolean` | no | Whether the suite can run. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Suite id — the address for every suite verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The suite's key, which you choose — unique in the project and what a link to the suite and the project document name it by. |
| `label` | `string` | yes | Display label of the suite. |
| `description` | `string \| null` | yes | Free-text note about what this suite measures. |
| `flowId` | `string` | yes | Id of the flow under test; every case runs it with its own inputs. If it names a flow that no longer exists, a run refuses rather than measuring nothing and reporting success. |
| `scorerFlowIds` | `string[]` | yes | Flows that grade each case's output. These are billed model calls, unlike a case's own assertions, which are free and deterministic. |
| `runAsUserId` | `string \| null` | yes | End user whose data the flow sees while running. Null runs as a sentinel that owns no records. |
| `coverageMode` | `"strict" \| "report-only"` | yes | How a coverage shortfall is treated. `strict` fails the run. `report-only` records it and lets the run succeed. |
| `runOnConfigChange` | `boolean` | yes | Whether a configuration change triggers this suite automatically. Separate from `enabled`: a suite with paid scorers can stay runnable while firing only by hand. |
| `repeats` | `integer` | yes | How many times each case runs. Repeats sample the flow only — grading still happens once, so scorer spend does not multiply. A single sample is not a latency measurement. |
| `latencyIsolated` | `boolean` | yes | Run cases one at a time. A case timed alongside siblings is slower for reasons unrelated to the flow, so set this when measuring latency. It costs the run its parallelism against the time budget. |
| `subjectUncached` | `boolean` | yes | Run the flow with the ingest cache out of the path. True for a performance suite — served from cache, a repeat is a replay rather than a sample. False for a quality suite, where an uncached run is itself unstable enough to move results between identical runs. Defaults to true, because a suite reporting replayed numbers still says `success`. |
| `perSkillLatency` | `boolean` | yes | Also record a latency score per skill that executed, not just for the run as a whole. Opt-in: the number of rows scales with the flow's skill count times cases times repeats. |
| `bracketed` | `boolean` | yes | Run the baseline's configuration alongside the live one, interleaved, so drift in the environment affects both and cancels out of the comparison. Doubles the suite's spend. Withheld rather than quietly degraded when there is no baseline to compare against; the run reports why in `bracketRefusal`. |
| `regressionCategoryKey` | `string \| null` | yes | Key of the category of the project event emitted when a run comes out worse than its baseline. Null emits nothing. The event type must already exist in your project. |
| `regressionEventKey` | `string \| null` | yes | Key of that event type. Null emits nothing. |
| `enabled` | `boolean` | yes | Whether this suite can run at all. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a PATCH to be told about a concurrent edit instead of overwriting one. |
| `caseCount` | `integer` | yes | How many cases the suite holds, so a list view can show it. |
| `lastRun` | `object \| null` | yes | How this suite's most recent run came out, so a list can say whether the suite can be believed. Null when it has never run — which is not a zero and not a failure. |
| `runInFlight` | `boolean \| null` | yes | Whether a run of this suite is already queued, executing, or holding the suite's run lock — exactly when `POST /v1/eval-suites/{id}/run` refuses with a 409. True from the moment a run is accepted, before its run row exists, and while a run row is still honoured after its worker died. Null when the queue could not be read and no lock is held, which says nothing either way. |
| `createdById` | `string \| null` | yes | Who created the suite. |
| `createdByEmail` | `string \| null` | yes | Email of the creator, when known. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `DELETE /v1/eval-suites/{id}`

Delete an eval suite with its cases and runs. The scores its runs produced survive, detached from the suite. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing. One case alone: `DELETE /v1/eval-cases/{id}`. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `GET /v1/eval-suites/{id}/readiness`

What a suite's configuration says a run will reach, before a credit is spent: the record types its flow's graph names and who owns their rows (`ownerScope`), so a suite that would read an empty per-user corpus can be fixed first. Derived from configuration, never from a run. Whether a run would start, and its warnings: `POST /v1/eval-suites/{id}/run` with `validateOnly: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suiteId` | `string` | yes | The suite this readiness report describes. |
| `subjectFlowId` | `string` | yes | The flow the suite names — the root of the walk. |
| `scope` | `object \| null` | yes | What the subject's graph touches, or NULL when it could not be walked — never null to mean 'walked and found nothing'. Exactly one of this and `unavailableReason` is set. |
| `unavailableReason` | `string \| null` | yes | Why there is no report, in a sentence for the operator: the suite names a flow the project's library does not hold. Null when `scope` is present. |

### `POST /v1/eval-suites/{id}/run`

Start a run of an eval suite: every enabled case (or `caseKeys`) through the suite's flow, graded by its assertions and scorer flows. Asynchronous and billed — it answers 202 with the queued run; follow it at `GET /v1/eval-runs/{id}`, and list past runs with `GET /v1/eval-suites/{id}/runs`. One run per suite at a time (409). With `validateOnly: true` it answers, spending and queuing nothing, whether the run would start and what it would and would not measure (VIEWER may ask). For a synchronous, free pass/fail check of one flow, use `POST /v1/flows/{id}/test` with its flow test cases instead.

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
| `validateOnly` | `boolean` | no | Check this run request and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/run/dry-run`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the run WOULD do. Present whenever the run would be accepted; absent when the platform refused to start it. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suiteId` | `string` | yes | The suite whose run was accepted. |
| `queued` | `true` | yes | Always true. The run is on the queue and has not started; re-read the suite's runs to see it once the worker picks it up. |
| `diagnostics` | `object[]` | yes | What this run will and will not have measured — the same findings `validateOnly: true` answers with, on the request that actually queued it. ⛔ EVERY ONE IS A WARNING BY CONSTRUCTION: anything that stops a run is a 422 and you are not reading this. Carried here so a caller who did not ask first is told anyway, which is what stops these from being rules only the dry run runs. |

### `GET /v1/eval-suites/{id}/runs`

One eval suite's runs, newest first, walked on `after`/`before` — status, what triggered each, counts and regression verdict. One run in full, with its per-case scores and aggregates, is `GET /v1/eval-runs/{id}`; the chart-sized window of recent measurements is `GET /v1/eval-suites/{id}/trend`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The eval suite's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | Rows per page, newest first. 1 to 100. Walk older pages with `after`. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Runs, newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, and no `page` jump is offered — walk with `after` / `before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

### `GET /v1/eval-suites/{id}/trend`

One suite's scores over its recent runs, oldest first, each point saying whether it is comparable with its neighbours — a BOUNDED window of at most `limit` points (default 20, at most 100) and `truncated` when older ones exist. A chart, not a log: it takes no cursor. The runs themselves, with their status and cost, walked on `after`: `GET /v1/eval-suites/{id}/runs`; one run's case results: `GET /v1/eval-runs/{id}`; every suite's series at once: `GET /v1/eval-suites/trend?project=`.

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
| `numericSeries` | `object[]` | yes | Every pooled numeric series measured in at least one point, in the order first met reading the points oldest first, each with the producer its values share across the whole window. Empty when no point carries a numeric aggregate. |
| `emptyReason` | `"never-run" \| "categorical-only" \| "nothing-measured"` | yes | Why `numericSeries` is empty, or null when it is not. `never-run` — no settled run in the window; `categorical-only` — the runs measured verdicts and no number, which is a suite working as authored; `nothing-measured` — the runs produced no score of either kind, which is a coverage failure to look into. |
| `truncated` | `boolean` | yes | True when runs exist OLDER than the first point here — the series is a window, not the suite's whole history. Distinguishes a genuinely new suite from one whose earlier runs fell outside `limit`. |

### `GET /v1/eval-suites/trend`

Every suite's recent scores in one answer, for a project overview (`?project=<nodeId>`), oldest first — a BOUNDED window: at most `limit` points per suite (default 8, at most 20), with `truncated` per suite when older runs exist. It is a chart, not a log, so it takes no cursor. One suite's longer series: `GET /v1/eval-suites/{id}/trend`; one suite's runs themselves, newest first and walked on `after`: `GET /v1/eval-suites/{id}/runs`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose suites to read. |
| `limit` | `integer` | no | How many points per suite. At least 2 — one point is no trend — and at most 20, because this window is taken for EVERY suite in the project rather than for one. The per-suite `/:id/trend` is where a longer history is asked for. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `suites` | `object[]` | yes | Every suite in the project, including ones that have never run. A suite absent from this list was not read, and no client should have to guess which of the two it is looking at. |
