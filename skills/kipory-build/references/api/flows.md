<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

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
| `GET` | [`/v1/flows/{id}/health`](#get-v1-flows-id-health) |  |
| `POST` | [`/v1/flows/{id}/preview`](#post-v1-flows-id-preview) |  |
| `POST` | [`/v1/flows/{id}/preview-runs`](#post-v1-flows-id-preview-runs) |  |
| `POST` | [`/v1/flows/{id}/preview/stream`](#post-v1-flows-id-preview-stream) |  |
| `GET` | [`/v1/flows/{id}/scope`](#get-v1-flows-id-scope) |  |

### `GET /v1/flows`

List one project's flows (`?project=<nodeId>`), or the platform's own with `?scope=system` (staff only). Each row carries its `version`, the lock `PATCH /v1/flows/{id}` requires. `expand=health` folds each flow's validity into the row — the full report is `GET /v1/flows/{id}/health`. The same rows, with every other design section, come in one read from `GET /v1/bootstrap`; the project's whole configuration, steps included, is `GET /v1/projects/{nodeId}/document`.

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

Create a flow — its key, label and typed signature (`inputTypeNames`, `outputTypeNames`); its steps are added after, with `POST /v1/steps`. `scope: "system"` creates a platform flow (staff only) instead of one in `project`. With `validateOnly: true` it answers whether the create would be refused and the slot names the signature would be stored with, writing nothing. Several flows at once, with their steps: the `flows` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`). Stored checks on a flow are eval cases, in the `evals` section of the same document.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Node id of the project that will own the flow. Pass exactly one of this or `scope: "system"`. |
| `scope` | `"system"` | no | Pass `system` to create a platform-owned flow with no owning project. Mutually exclusive with `project`. |
| `label` | `string` | yes | Display text. |
| `key` | `string` | yes | The flow's key, permanent once created — pick it deliberately. Uppercase is refused, not folded. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 100 characters. |
| `description` | `string \| null` | no | Optional prose about what the flow is for. Whitespace is trimmed before the length limit applies. |
| `inputTypeNames` | `object[]` | yes | The flow's inputs, as registered type names. |
| `outputTypeNames` | `object[]` | yes | The flow's outputs, as registered type names. |
| `outputBinding` | `object` | no | Which skill output feeds each flow output. Usually omitted at creation — the flow has no skills yet, so only the shape is checked; wire it up once the skills exist. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports. ⚠️ THEY DO NOT DECIDE `ok`: `ok` is whether THIS ROW would save, and a row saves while what it leaves is broken (a step saves while its flow is half-wired). Absent when the dry run did not rehearse — a create, or a draft its planner refused. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the body was coherent enough to resolve every type name, which is not the same as `ok` — a draft with a warning still resolves. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputSlots` | `unknown` | no | The flow's resolved input signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — you author it as `inputTypeNames` and the server resolves it. |
| `outputSlots` | `unknown` | no | The flow's resolved output signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — authored as `outputTypeNames`. |
| `outputBinding` | `unknown` | no | Which skill output feeds each output slot, as resolved, or null when no binding was ever authored (null is UNDECLARED, `{}` is authored-empty). Read-only here; author it through `outputBinding` on create or patch. |
| `skillCount` | `integer` | yes | How many skills the flow currently contains. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or binding bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each skill's time limit as a run applies it, keyed by skill id, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The same answer `GET /v1/steps?flowId=` puts on each list entry as `effectiveTimeLimit`, without the rows: the deployment's task limits and generation default move it without bumping `structureVersion`, which is why the bootstrap's flows section does not carry it. Null for a skill whose handler is not registered. |

### `GET /v1/flows/{id}`

Read one flow — its signature, binding, step count and `version` (the lock `PATCH /v1/flows/{id}` requires). Its steps are `GET /v1/steps?flowId=`; `expand=timeLimits` adds each step's effective time limit. What still holds the flow, and would refuse its delete, is `DELETE /v1/flows/{id}?validateOnly=true` (`derived.dependents`). For a project's flow, every flow at once is `GET /v1/bootstrap`, and the flow as configuration you can restate, with its steps, is `GET /v1/projects/{nodeId}/document`, whose `evals` section holds its eval cases. A platform flow (`scope: "system"`) belongs to no project and is in neither: its steps are `GET /v1/steps?flowId=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: timeLimits. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputSlots` | `unknown` | no | The flow's resolved input signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — you author it as `inputTypeNames` and the server resolves it. |
| `outputSlots` | `unknown` | no | The flow's resolved output signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — authored as `outputTypeNames`. |
| `outputBinding` | `unknown` | no | Which skill output feeds each output slot, as resolved, or null when no binding was ever authored (null is UNDECLARED, `{}` is authored-empty). Read-only here; author it through `outputBinding` on create or patch. |
| `skillCount` | `integer` | yes | How many skills the flow currently contains. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or binding bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each skill's time limit as a run applies it, keyed by skill id, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The same answer `GET /v1/steps?flowId=` puts on each list entry as `effectiveTimeLimit`, without the rows: the deployment's task limits and generation default move it without bumping `structureVersion`, which is why the bootstrap's flows section does not carry it. Null for a skill whose handler is not registered. |

### `PATCH /v1/flows/{id}`

Change a flow's label, description, signature (`inputTypeNames` or `outputTypeNames`, either side alone) or output binding; its key is permanent. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. A signature change another row froze a copy of is refused unless `adoptSnapshots: true`. With `validateOnly: true` it answers whether the patch would be refused and rehearses it — what it would leave behind in this flow and the flows that call it — writing nothing; that is a dry run of a WRITE, where `POST /v1/flows/{id}/preview` RUNS the flow. Several flows at once, with their steps: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New display text. Omit to leave it alone. |
| `description` | `string \| null` | no | Three distinct states: omit to leave the description alone, pass null (or an empty string) to clear it, pass text to replace it. |
| `inputTypeNames` | `object[]` | no | Replacement input signature. Omit to leave it alone — it may be sent without `outputTypeNames`, and the outputs then stay as stored. Changing it re-validates every step in the flow. |
| `outputTypeNames` | `object[]` | no | Replacement output signature. Omit to leave it alone — it may be sent without `inputTypeNames`, and the inputs then stay as stored. Changing it re-validates the whole flow. |
| `outputBinding` | `object` | no | Rewire which step output feeds each flow output. Can be sent on its own once the steps exist, or together with `outputTypeNames` (and `inputTypeNames`, if they change too) to rewrite the signature at once. Without it, a signature change carries the stored binding, pruned to the outputs that remain. Either way the graph is re-validated in full before anything is saved. |
| `adoptSnapshots` | `boolean` | no | Opt in to re-publishing the request and response contract of any live endpoint this flow serves. Off by default, because that changes what a running route promises its callers — an explicit decision, not a side effect of editing a flow. |
| `version` | `integer` | yes | The flow's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the flow changed since — another patch, a checkpoint restore, or a project document apply — so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored flow and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputSlots` | `unknown` | no | The flow's resolved input signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — you author it as `inputTypeNames` and the server resolves it. |
| `outputSlots` | `unknown` | no | The flow's resolved output signature, or null when none was ever declared (null is UNDECLARED, `[]` is declared-empty). Read-only and opaque — authored as `outputTypeNames`. |
| `outputBinding` | `unknown` | no | Which skill output feeds each output slot, as resolved, or null when no binding was ever authored (null is UNDECLARED, `{}` is authored-empty). Read-only here; author it through `outputBinding` on create or patch. |
| `skillCount` | `integer` | yes | How many skills the flow currently contains. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or binding bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each skill's time limit as a run applies it, keyed by skill id, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The same answer `GET /v1/steps?flowId=` puts on each list entry as `effectiveTimeLimit`, without the rows: the deployment's task limits and generation default move it without bumping `structureVersion`, which is why the bootstrap's flows section does not carry it. Null for a skill whose handler is not registered. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports. ⚠️ THEY DO NOT DECIDE `ok`: `ok` is whether THIS ROW would save, and a row saves while what it leaves is broken (a step saves while its flow is half-wired). Absent when the dry run did not rehearse — a create, or a draft its planner refused. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the body was coherent enough to resolve every type name, which is not the same as `ok` — a draft with a warning still resolves. |

### `DELETE /v1/flows/{id}`

Delete a flow and every step in it (`deletedSkillCount` says how many); its checkpoints go with it; eval suites over it stay, and their runs fail until they name another flow. Refused (409 `FLOW_HAS_DEPENDENTS`) while anything holds it — an endpoint, schedule, trigger, record type, facet resolver, platform job, or another flow that calls it. With `?validateOnly=true` it answers whether the delete would be refused, and `derived.dependents` counts what holds the flow, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedSkillCount` | `integer` | yes | How many skills went with the flow. Deleting a flow deletes everything inside it. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the delete would find, from the reads it decides on. Nothing here has happened. |

### `GET /v1/flows/{id}/coverage`

Which steps in this flow (and the flows it invokes) actually ran, across the record-processing attempts since the graph last changed — read from the traces production already writes, no test needed. An aggregate over a SAMPLE of at most `attemptLimit` recent attempts (default 500), with `truncated` when more exist: a report, not a log, so it takes no cursor, and a larger `attemptLimit` widens the sample. It measures execution, not correctness: whether each step's output is right is what an eval suite over the flow judges (`POST /v1/eval-suites/{id}/run`; `wait: true` answers in the same call). The attempts' traces: `GET /v1/flows/{id}/traces`; is the graph itself sound: `GET /v1/flows/{id}/health`.

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
| `recordTypeKeys` | `string[]` | yes | Keys of the record types the covered flows touch. |
| `graphChangedAt` | `string \| null` | yes | When the flow last changed. Runs from before this are excluded, because they exercised a different graph. |
| `truncated` | `boolean` | yes | True when the read hit `attemptLimit` and covers only the most recent attempts. A truncated report is a sample, so read its counts as such. |
| `attemptLimit` | `integer` | yes | The cap that was applied, echoed back. |

### `GET /v1/flows/{id}/health`

The full validation report for the flow as saved: every diagnostic, what it is about (step, edge or flow) and whose it is. A report, not a gate — a flow with errors still runs, and gets them wrong. The one-line summary rides each row of `GET /v1/flows?expand=health`. What a change WOULD leave behind is the change's own dry run (`validateOnly: true` on `PATCH /v1/flows/{id}` or a step write), which rehearses it and reports the findings it introduces; what actually ran is `GET /v1/flows/{id}/coverage`.

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
| `danglingReads` | `object[]` | yes | Every input a skill reads that nothing in the flow supplies — one entry per skill and slot, the same findings `diagnostics` reports as `INPUT_STREAM_DANGLING_SLOT`. Such a skill never runs, and neither does anything after it. Empty when every read is supplied. |

### `POST /v1/flows/{id}/preview`

Run the flow now, in a sandbox, and answer what happened: every step's transcript, its failures, and the declared outputs. Seed it from `input` slot values or an existing record; run the saved steps or a draft `graph` you send. It bills the project for its model calls and applies the writes its steps make unless you pass `apply: false` (then the change set is recorded and discarded) — a preview EXECUTES the flow, where `validateOnly: true` on a write judges the write without running anything. The same run reported as it happens: `POST /v1/flows/{id}/preview/stream`; queued, with a run log: `POST /v1/flows/{id}/preview-runs`. Stored cases with assertions: an eval suite over the flow (`GET /v1/eval-suites?project=<nodeId>&flowId=`), run with `POST /v1/eval-suites/{id}/run`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved skills, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `project` | `string` | no | Resolve project-scoped context — relation kinds, project config, facets, the caller's profile — against this project (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. Required for a platform flow, which belongs to no project: it runs as this one with the platform's vendor keys, the platform pays, and no trace is written. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true, matching what a preview has always done. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowOutput` | `object` | yes | The flow's declared output slots, exactly as the run produced them. A slot the run did not produce stays absent; nothing is filled in, here or live. |
| `missingRequiredOutput` | `string \| null` | yes | First required output slot the run failed to produce, or null. Non-null means a live invocation of this run would be refused (422 `FLOW_OUTPUT_MISSING`) and write nothing — so this preview discarded its writes too, even with `apply`. |
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

### `POST /v1/flows/{id}/preview-runs`

Queue the same sandboxed run as `POST /v1/flows/{id}/preview` and answer 202 with its run id; the worker runs the SAVED steps (a draft `graph` is refused) and writes a step log, read like any run at `GET /v1/runs/{runId}` and its `/steps`. The id is 404 there until the worker starts. A preview EXECUTES the flow; to judge a write without running anything, send it with `validateOnly: true`. The answer in the response instead: `POST /v1/flows/{id}/preview`, or as it happens: `/preview/stream`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved skills, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `project` | `string` | no | Resolve project-scoped context — relation kinds, project config, facets, the caller's profile — against this project (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. Required for a platform flow, which belongs to no project: it runs as this one with the platform's vendor keys, the platform pays, and no trace is written. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true, matching what a preview has always done. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The queued run's id. It appears at GET /v1/runs/{runId} — and on /steps, /steps/stream, /spend, /change-set, /flow-snapshots and /trace — once the worker writes its opening frame; until then those routes answer 404. Poll the run, then follow its step stream. |

### `POST /v1/flows/{id}/preview/stream`

The same sandboxed run as `POST /v1/flows/{id}/preview` — same body, same authorization, same spend — reported as server-sent events while it happens: each step as it starts and ends, then the outcome. A preview EXECUTES the flow; to judge a write without running anything, send it with `validateOnly: true`. Queued instead, with a run log you can read later: `POST /v1/flows/{id}/preview-runs`.

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
| `project` | `string` | no | Resolve project-scoped context — relation kinds, project config, facets, the caller's profile — against this project (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. Required for a platform flow, which belongs to no project: it runs as this one with the platform's vendor keys, the platform pays, and no trace is written. |
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
| `skillKey` | `string` | yes | Key of that skill. |
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

### `GET /v1/flows/{id}/scope`

Every slot a step of this flow may read, typed: for a saved step with `?stepId=` (what it can wait on without closing a cycle), for a step being added without. What an editor's input picker offers. A draft step's own inputs and their types come from its write's dry run (`validateOnly: true` on `POST /v1/steps` or `PATCH /v1/steps/{id}`, `derived.draft`); the candidates for one input with their verdicts are `GET /v1/steps/input-options`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepId` | `string` | no | Unique id of a saved step (skill) in that flow — the one whose scope is read. Omit it for a step being added: nothing can wait on one yet, so every slot the flow's steps write is in its scope. ⚠️ A saved step that already reads the slot the new step will write is not left out — naming its output closes a cycle, which the create reports as a warning rather than refuses. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow asked about. |
| `stepId` | `string \| null` | yes | The saved step whose scope this is, or null for a step being added — one nothing can wait on yet, so every slot the flow's steps write is in its scope. |
| `slots` | `object[]` | yes | Every slot the step may read: the flow's inputs, the platform's own slots, and every slot written by a step that does not wait on this one — directly or through others, by an input or by a condition. A saved step's own outputs are never listed. Sorted by name. |
