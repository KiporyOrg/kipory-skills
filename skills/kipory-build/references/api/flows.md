<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 93bee81e1768 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Flows

A flow is a named group of steps with its own typed signature. The flow write carries no diagnostics; ask `GET /v1/flows/{id}/health` or read with `expand=health`. Preview bills the payer and applies its writes unless `apply` is false.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flows`](#get-v1-flows) |  |
| `POST` | [`/v1/flows`](#post-v1-flows) |  |
| `GET` | [`/v1/flows/{id}`](#get-v1-flows-id) |  |
| `PATCH` | [`/v1/flows/{id}`](#patch-v1-flows-id) |  |
| `DELETE` | [`/v1/flows/{id}`](#delete-v1-flows-id) |  |
| `GET` | [`/v1/flows/{id}/coverage`](#get-v1-flows-id-coverage) |  |
| `GET` | [`/v1/flows/{id}/export`](#get-v1-flows-id-export) |  |
| `GET` | [`/v1/flows/{id}/health`](#get-v1-flows-id-health) |  |
| `POST` | [`/v1/flows/{id}/preview`](#post-v1-flows-id-preview) |  |
| `POST` | [`/v1/flows/{id}/preview/stream`](#post-v1-flows-id-preview-stream) |  |

### `GET /v1/flows`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Node id of the project whose flows to list. Pass exactly one of this or `scope=system`. |
| `scope` | `"system"` | no | Pass `system` to list platform-owned flows instead of a project's. Mutually exclusive with `project`. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: health. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flows` | `object[]` | yes | The flows in scope, unpaginated. |

### `POST /v1/flows`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Node id of the project that will own the flow. Pass exactly one of this or `scope: "system"`. |
| `scope` | `"system"` | no | Pass `system` to create a platform-owned flow with no owning project. Mutually exclusive with `project`. |
| `name` | `string` | yes | Display name. |
| `slug` | `string` | yes | Kebab-case identifier, lower-cased for you. Permanent once created — pick it deliberately. |
| `description` | `string \| null` | no | Optional prose about what the flow is for. Whitespace is trimmed before the length limit applies. |
| `inputTypeNames` | `object[]` | yes | The flow's inputs, as registered type names. |
| `outputTypeNames` | `object[]` | yes | The flow's outputs, as registered type names. |
| `outputBinding` | `object` | no | Which skill output feeds each flow output. Usually omitted at creation — the flow has no skills yet, so only the shape is checked; wire it up once the skills exist. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"PROJECT" \| "SYSTEM"` | yes | `PROJECT` for a flow a project owns, `SYSTEM` for a platform-owned one. A `SYSTEM` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `name` | `string` | yes | Display name, editable at any time. |
| `slug` | `string` | yes | Kebab-case identifier, fixed when the flow is created. It cannot be changed afterwards — rename through `name`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputSlots` | `unknown` | no | The flow's resolved input signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — you author it as `inputTypeNames` and the server resolves it. |
| `outputSlots` | `unknown` | no | The flow's resolved output signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — authored as `outputTypeNames`. |
| `outputBinding` | `unknown` | no | Which skill output feeds each output slot, as resolved, or null when no binding was ever authored (null is UNDECLARED, `{}` is authored-empty). Read-only here; author it through `outputBinding` on create or patch. |
| `skillCount` | `integer` | yes | How many skills the flow currently contains. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |

### `GET /v1/flows/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"PROJECT" \| "SYSTEM"` | yes | `PROJECT` for a flow a project owns, `SYSTEM` for a platform-owned one. A `SYSTEM` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `name` | `string` | yes | Display name, editable at any time. |
| `slug` | `string` | yes | Kebab-case identifier, fixed when the flow is created. It cannot be changed afterwards — rename through `name`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputSlots` | `unknown` | no | The flow's resolved input signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — you author it as `inputTypeNames` and the server resolves it. |
| `outputSlots` | `unknown` | no | The flow's resolved output signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — authored as `outputTypeNames`. |
| `outputBinding` | `unknown` | no | Which skill output feeds each output slot, as resolved, or null when no binding was ever authored (null is UNDECLARED, `{}` is authored-empty). Read-only here; author it through `outputBinding` on create or patch. |
| `skillCount` | `integer` | yes | How many skills the flow currently contains. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |

### `PATCH /v1/flows/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | New display name. Omit to leave it alone. |
| `description` | `string \| null` | no | Three distinct states: omit to leave the description alone, pass null (or an empty string) to clear it, pass text to replace it. |
| `inputTypeNames` | `object[]` | no | Replacement input signature. Omit to leave it alone. Changing it re-validates every skill in the flow. |
| `outputTypeNames` | `object[]` | no | Replacement output signature. Omit to leave it alone. Changing it re-validates the whole flow. |
| `outputBinding` | `object` | no | Rewire which skill output feeds each flow output. Can be sent on its own once the skills exist, or together with both type arrays to replace the whole signature at once. Either way the graph is re-validated in full before anything is saved. |
| `adoptSnapshots` | `boolean` | no | Opt in to re-publishing the request and response contract of any live endpoint this flow serves. Off by default, because that changes what a running route promises its callers — an explicit decision, not a side effect of editing a flow. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"PROJECT" \| "SYSTEM"` | yes | `PROJECT` for a flow a project owns, `SYSTEM` for a platform-owned one. A `SYSTEM` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `name` | `string` | yes | Display name, editable at any time. |
| `slug` | `string` | yes | Kebab-case identifier, fixed when the flow is created. It cannot be changed afterwards — rename through `name`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputSlots` | `unknown` | no | The flow's resolved input signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — you author it as `inputTypeNames` and the server resolves it. |
| `outputSlots` | `unknown` | no | The flow's resolved output signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — authored as `outputTypeNames`. |
| `outputBinding` | `unknown` | no | Which skill output feeds each output slot, as resolved, or null when no binding was ever authored (null is UNDECLARED, `{}` is authored-empty). Read-only here; author it through `outputBinding` on create or patch. |
| `skillCount` | `integer` | yes | How many skills the flow currently contains. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |

### `DELETE /v1/flows/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedSkillCount` | `integer` | yes | How many skills went with the flow. Deleting a flow deletes everything inside it. |

### `GET /v1/flows/{id}/coverage`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `attemptLimit` | `integer` | no | Cap on how many recent attempts to read. The response echoes it and sets `truncated`, so a bounded read can never be mistaken for a complete one. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `evidence` | `"execution-only" \| "execution-and-slots"` | yes | How much this report could measure. `execution-and-slots` means what each skill emitted was captured too, so the `vacuity` axis is meaningful; `execution-only` means only whether skills ran. |
| `vacuity` | `object \| null` | yes | Whether skills actually emitted anything when they ran. **Null means nobody captured that — an absence of evidence, not a clean bill of health.** |
| `coldUnclassifiable` | `boolean` | yes | True when some skill never ran and the evidence cannot say whether that is expected. Worth looking at; not a failure. |
| `rootFlowId` | `string` | yes | The flow this report is rooted at. |
| `attemptCount` | `integer` | yes | How many runs were examined. |
| `traceCount` | `integer` | yes | How many of those runs carried captured output. Compare against `attemptCount` to see how thin the sample behind `vacuity` is. |
| `flowIds` | `string[]` | yes | Every flow covered, including ones the root flow invokes. |
| `skills` | `object[]` | yes | Per-skill results on the did-it-run axis. |
| `coldUnconditionalCount` | `integer` | yes | How many skills never ran despite having no condition — the ones worth investigating. |
| `coldGatedCount` | `integer` | yes | How many skills never ran but have a condition, so being cold is expected. |
| `unknownSkillIds` | `string[]` | yes | Skills seen in the run history that are no longer in the flow — usually the trace of an edit. |
| `verdict` | `"measured" \| "not-measured"` | yes | Whether this report measured anything at all. `not-measured` is not a pass — see `reason`. |
| `reason` | `"no-attempts" \| "vacuous-skills"` | yes | Why the verdict is `not-measured`, or null when it is `measured`. |
| `recordTypes` | `string[]` | yes | Record types the covered flows touch. |
| `graphChangedAt` | `string \| null` | yes | When the flow last changed. Runs from before this are excluded, because they exercised a different graph. |
| `truncated` | `boolean` | yes | True when the read hit `attemptLimit` and covers only the most recent attempts. A truncated report is a sample, so read its counts as such. |
| `attemptLimit` | `integer` | yes | The cap that was applied, echoed back. |

### `GET /v1/flows/{id}/export`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `exportedAt` | `string` | yes | When this export was taken, ISO-8601. Provenance only. |
| `flow` | `object` | yes | The flow itself. Carried because the steps alone do not describe it, and restored by a different call than the steps are. |
| `skills` | `object[]` | yes | Every step, in declaration order — the same order `replace` re-creates them in, so two exports of an unchanged flow are byte-identical apart from `exportedAt`. Pass this array straight to `POST /v1/skills/replace`. |

### `GET /v1/flows/{id}/health`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this report is about. |
| `diagnostics` | `object[]` | yes | Every diagnostic, errors and warnings together. An empty array means the flow is healthy — it is a real answer, not a missing one. |
| `counts` | `object` | yes | Summary counts, so a caller need not tally the list itself. |
| `blockingActivation` | `object[]` | yes | The subset of `diagnostics` that actually prevents activation. Deliberately repeated rather than left to be derived — it is the exact list the refusal reads, so two callers cannot disagree about what blocks activation. |
| `isActivatable` | `boolean` | yes | True when nothing blocks activation right now. |

### `POST /v1/flows/{id}/preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved skills, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `projectId` | `string` | no | Resolve project-scoped context — relation kinds, project config, facets, the caller's profile — against this project instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true, matching what a preview has always done. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowOutput` | `object` | yes | The flow's declared output slots, projected exactly as a live invocation would return them. A slot the run did not produce stays absent rather than being filled in, so what you see here is what a caller would get. |
| `missingRequiredOutput` | `string \| null` | yes | First required output slot the run failed to produce, or null. Non-null means a live invocation of this flow would fail. |
| `transcript` | `object[]` | yes | What each skill did, in execution order. |
| `errors` | `object[]` | yes | Failures, one entry per skill and branch that errored. |
| `warnings` | `unknown[]` | yes | Non-fatal problems the engine noticed. The run still completed. |
| `fanOutCaps` | `object[]` | yes | Every fan-out whose element list was truncated, and by which limit. Empty when nothing was dropped — check this before reading a branch count as the whole population. |
| `branches` | `unknown[]` | yes | Full per-branch results — inputs, outputs, usage and failures — for deep inspection. |
| `runState` | `object` | yes | The shared run state as it stood when the run ended. |
| `ingestSpend` | `object` | no | Paid third-party ingest spend for this run. Absent when no ingest handler ran, which is different from having spent zero. |
| `previewSessionId` | `string` | yes | Identifies this run. Every model call and ingest job it produced is tagged with it, so it is the key for looking the run up afterwards. |
| `traceId` | `string \| null` | yes | The persisted trace for this run, or null when none was written — either because none was requested, or because it was requested and skipped. If you asked for one and get null, `traceSkipped` says why; treat the run as having left no evidence rather than as having produced an empty one. |
| `traceSkipped` | `object` | yes | Why `traceId` is null despite a trace being requested. Null both when a trace was written and when none was asked for. |
| `totalTokensIn` | `number` | yes | Input tokens across every model call in this run. |
| `totalTokensOut` | `number` | yes | Output tokens across every model call in this run. |
| `latencyMs` | `number` | yes | How long the whole call took, end to end, including preparation. |
| `pipelineMs` | `number` | yes | How long the flow itself took. Compare this rather than `latencyMs` when measuring a flow across runs — `latencyMs` also spans platform preparation, so it moves when something outside the flow gets slower. `0` when the run failed before reaching the flow. |
| `timings` | `object` | yes | Full breakdown of where the run's wall clock went. |

### `POST /v1/flows/{id}/preview/stream`

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `preview-started`, `skill-started`, `skill-ended`, `skill-not-reached`, `preview-complete`, `preview-error`, `error`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved skills, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `projectId` | `string` | no | Resolve project-scoped context — relation kinds, project config, facets, the caller's profile — against this project instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true, matching what a preview has always done. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"preview-started"` | yes | The run is about to execute. |
| `previewSessionId` | `string` | yes | Identifies this run, delivered up front so a run that later times out or crashes can still be looked up. Every model call and ingest job it produces carries it. |
| `flowId` | `string` | yes | Flow being previewed. |
| `fanOutBranchCap` | `integer \| null` | yes | Branch ceiling in force for this run, or null if uncapped. |
| `ts` | `string` | yes | When the run started. |
| `skillId` | `string` | yes | Skill this frame is about. |
| `skillName` | `string` | yes | Label of that skill. |
| `branchId` | `string \| null` | yes | Branch the skill ran in, or null when it is not inside a fan-out. |
| `branchPath` | `unknown[]` | no | Position within nested fan-outs, outermost first. |
| `outcome` | `"applied" \| "skipped" \| "failed" \| "no-op"` | yes | `applied` — ran and wrote its output. `skipped` — its condition was not satisfied, or it is disabled. `failed` — it ran and errored. `no-op` — it ran and had nothing to do. |
| `durationMs` | `number` | yes | Wall-clock time this skill took. |
| `slotBag` | `object` | no | Slot values visible at this point in the run. |
| `runState` | `object` | no | Shared run state as of this frame. |
| `skipReason` | `unknown` | no | Why the skill was skipped, when `outcome` is `skipped`. |
| `error` | `string` | no | Failure message, when `outcome` is `failed`. |
| `nestedFailures` | `unknown[]` | no | Failures from branches nested under this skill. |
| `reason` | `"empty-fanout"` | no | Present when the skill did nothing because a fan-out above it produced no branches. |
| `cacheHit` | `true` | no | A cache answered this skill and its handler never ran. Present only when true. Without it a replayed run reads as a fast flow rather than as one that had already run. |
| `mergeInputs` | `unknown[]` | no | Per-source-branch inputs. Merge nodes only. |
| `fanOut` | `object` | no | Fan-out nodes only, on the `applied` path. Arrives before the branch frames it describes, so it is the denominator for what follows and names any truncation rather than leaving a short count looking complete. |
| `parentSkillId` | `string` | yes | The fan-out node whose empty result stranded this skill. |
| `branches` | `unknown[]` | yes | Full per-branch results, as on the non-streaming response. |
| `flowOutput` | `object` | no | The flow's declared output slots, as a live invocation would return them. |
| `outputValidation` | `object` | no | Whether the run produced everything the flow declares. |
| `totals` | `object` | yes | Token usage for the whole run. |
| `ingestSpend` | `object` | no | Paid third-party ingest spend. Absent when no ingest handler ran. |
| `fanOutCaps` | `object[]` | yes | Every fan-out whose element list was truncated. Empty when nothing was dropped. |
| `timings` | `object` | yes | Full breakdown of where the run's wall clock went. |
| `phase` | `string` | yes | Where it went wrong — admission, validation, loading record files, or the run itself — so the failure can be attributed. |
| `diagnostics` | `unknown[]` | no | Per-problem detail for a draft graph that failed validation. These are the same diagnostics saving that graph would return. |
