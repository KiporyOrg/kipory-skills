<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Skills (flow steps)

In the API a skill is one step of a flow: a handler key, its config, what it reads and the slot it writes. Skill writes return 2xx with `outstandingIssues`; only a skill-level error refuses a save.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/steps`](#get-v1-steps) |  |
| `POST` | [`/v1/steps`](#post-v1-steps) |  |
| `GET` | [`/v1/steps/{id}`](#get-v1-steps-id) |  |
| `PATCH` | [`/v1/steps/{id}`](#patch-v1-steps-id) |  |
| `DELETE` | [`/v1/steps/{id}`](#delete-v1-steps-id) |  |
| `POST` | [`/v1/steps/{id}/duplicate`](#post-v1-steps-id-duplicate) |  |
| `POST` | [`/v1/steps/batch`](#post-v1-steps-batch) |  |
| `GET` | [`/v1/steps/condition-operators`](#get-v1-steps-condition-operators) |  |
| `GET` | [`/v1/steps/input-options`](#get-v1-steps-input-options) |  |
| `POST` | [`/v1/steps/interpolate`](#post-v1-steps-interpolate) |  |
| `POST` | [`/v1/steps/preview`](#post-v1-steps-preview) |  |

### `GET /v1/steps`

The steps of one flow (`?flowId=`), each with what the graph adds to the row: the slots it produces, its time limit, whether a delete would be refused. One step: `GET /v1/steps/{id}`. A whole project's configuration, every flow's steps included: `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow whose skills to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skills` | `object[]` | yes | Skills in the flow, enabled or not. |

### `POST /v1/steps`

Create one step in a flow. Leave out what the platform works out: the inputs a handler names in its settings or prompt, each input's type (from what feeds it), and fields the handler does not read — `promptTemplate`, `taskKey`, and `outputSlot` for a handler that writes no named result. With `validateOnly: true` it answers the save's verdict and what the configuration names (`derived.draft`), writing nothing. Several steps at once: `POST /v1/steps/batch`. A whole project in one planned call: `POST /v1/projects/{nodeId}/document`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow this skill will belong to. |
| `key` | `string` | yes | The skill's key, e.g. `summarize` or `common.summarize`; dots optionally group segments. Lowercase words joined by dashes, optionally grouped with dots, like `extract.species`, up to 64 characters. |
| `description` | `string \| null` | no | Free-text note about what this skill does. Not executed. |
| `handlerKey` | `string` | yes | Which system handler runs this skill (see `GET /v1/handlers`). It determines what `handlerConfig` may contain. |
| `handlerConfig` | `unknown` | no | Handler-specific settings, shaped by `handlerKey`. |
| `condition` | `unknown` | no | Guard evaluated before the skill runs. Unsatisfied means skipped, not failed. |
| `inputStreams` | `string[]` | no | Slots this step reads — earlier steps' outputs, flow inputs, or the platform's own slots — in order. `inputSchemas`, `inputPaths` and `inputProjectionNames` align to it. Omit it (or send `[]`) for a handler whose inputs are named in its config or prompt (`value.transform`, `text.generate`, `entity.list`, …): the platform fills the list it reads. A list you send is checked, not replaced. |
| `outputSlot` | `string` | no | Slot this step writes its result to. Required by a handler that writes a result; omit it for one that writes none or derives it from its config (`event.emit`, `vector.upsert`, `flow.merge`, `flow.invoke`, `flow.loop-end`, `flow.dispatch`). |
| `promptTemplate` | `string \| null` | no | Prompt body, with inputs interpolated. Only a handler that reads a prompt (`text.generate`, `text.interpolate`) needs it; omit it (or send null) for every other handler. |
| `systemPrompt` | `string \| null` | no | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak"` | no | Task this step bills and resolves its model under. One of the writable pipeline tasks. Omit it and the step starts on `extraction` — change it with a PATCH. It decides the model only for a handler whose model follows its task, but every step still bills under it, and a handler whose catalog entry says `run.timeLimitFromTask` takes this task's time limit when the step sets no `timeoutMs`. |
| `outputSchema` | `object` | no | Schema the skill's output must conform to. Omit or send null for no constraint. |
| `inputSchemas` | `object[]` | no | The type of each input, POSITIONALLY ALIGNED with the `inputStreams` you send. Omit it (or send `[]`) and the platform types each input from what feeds it — the earlier step's output, the flow input, the platform slot — through its path. Send it only to state a type on purpose; a stated type is kept and checked. A non-empty list must be the same length as `inputStreams`. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `enabled` | `boolean` | no | Whether the skill executes. Defaults to enabled. |
| `modelId` | `string \| null` | no | AiModel id this skill's AI call runs on. Omit (or send null) to inherit the model bound to this skill's taskKey at /platform/models — the project's AiTaskConfig row for that task, else the system default. Set an explicit id only to pin this skill to one model; it must name a row in the AiModel catalog. |
| `timeoutMs` | `integer \| null` | no | Per-skill time limit in milliseconds, up to 120000. |
| `tries` | `integer \| null` | no | How many times the step is tried in all, the first try included, 1–5. Null uses the handler's own number, which a step's number replaces rather than adds to. Only fetch and file steps take it; a step that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | no | The fixed wait between tries, in milliseconds, up to 60000. Null uses the handler's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | no | What this step's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; steps that do not depend on this one still run. `continue` — the run carries on without this step's output and reports the failure as a warning. Offered only on steps that write nothing. Defaults to `fail-run`. |
| `reuseResultsForMinutes` | `integer \| null` | no | How long a result this step saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the handler's own period; 0 always runs fresh and saves nothing. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate-draft`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the create WOULD have computed. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skill` | `object` | yes | The skill as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |

### `GET /v1/steps/{id}`

One step by id. Every step of its flow, with the graph's facts about each: `GET /v1/steps?flowId=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Skill id — the address for every skill verb. |
| `flowId` | `string` | yes | Id of the flow this skill belongs to. |
| `key` | `string` | yes | The skill's key, e.g. `common.summarize`. Other skills and the flow's wiring refer to it by this key. |
| `description` | `string \| null` | yes | Free-text note about what this skill does. Not executed. |
| `handlerKey` | `string` | yes | Which system handler runs this skill (see `GET /v1/handlers`). It determines what `handlerConfig` may contain. |
| `handlerConfig` | `unknown` | no | Handler-specific settings. The accepted shape is defined by `handlerKey`. |
| `condition` | `unknown` | no | Guard evaluated before the skill runs. When it is not satisfied the skill is skipped rather than executed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier skills that feed this one. These edges order the flow — a skill runs once its inputs are available. |
| `outputSlot` | `string` | yes | Slot this skill writes its result to. Downstream skills name it in their `inputStreams`. |
| `producedSlots` | `object` | yes | The slots this skill writes, read off its handler and its config the way the platform's validator and runner read them. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed handlers, with inputs interpolated. Ignored by handlers that do not call a model. |
| `systemPrompt` | `string \| null` | yes | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `string` | yes | Task this skill bills and resolves its model under, so a project can point a whole class of skills at one model. |
| `outputSchema` | `unknown` | no | Expected shape of this skill's output. A result that does not conform fails rather than being written to the slot. |
| `inputSchemas` | `unknown` | no | Expected shapes of this skill's inputs, checked before it runs. |
| `inputPaths` | `unknown` | no | Per-input path expressions selecting a leaf out of a composite input, so a skill can consume one field of an upstream slot rather than the whole value. |
| `inputProjectionNames` | `unknown` | no | Names the projected inputs are exposed under inside the prompt, when they should differ from the source slot names. |
| `enabled` | `boolean` | yes | Whether this skill executes. A disabled skill stays in the flow and is reported as skipped. |
| `modelId` | `string \| null` | yes | Model this skill is pinned to, or null to use the one its `taskKey` resolves to. |
| `tries` | `integer \| null` | yes | How many times the step is tried in all, the first try included, 1–5. Null uses the handler's own number, which a step's number replaces rather than adds to. Only fetch and file steps take it; a step that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | yes | The fixed wait between tries, in milliseconds, up to 60000. Null uses the handler's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | yes | What this step's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; steps that do not depend on this one still run. `continue` — the run carries on without this step's output and reports the failure as a warning. Offered only on steps that write nothing. |
| `reuseResultsForMinutes` | `integer \| null` | yes | How long a result this step saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the handler's own period; 0 always runs fresh and saves nothing. |
| `timeoutMs` | `integer \| null` | yes | Per-skill time limit in milliseconds, or null for none of its own. What it bounds depends on the handler: each AI call for an AI generation step; the wait on the queued job for a fetch or file step, covering every try; and how long the run waits for a step that runs in the flow itself, whose work may still finish. Control steps ignore it. A synchronous endpoint stops waiting at its own limit regardless. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a write to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/steps/{id}`

Change one step; `version` is the one you last read, and a moved row answers 409. Omit `inputStreams` when you change a handler's settings or prompt and the inputs it names are derived again. With `validateOnly: true` it answers the save's verdict, what the patched configuration names (`derived.draft`) and — when `outputSlot` changes — which steps read the old slot (`derived.rename`), and — with `enabled: false` — which other steps would stop running with it (`derived.switchOff`), writing nothing; confirm the rename with `confirmedOutputSlotRenames`. Several steps at once: `POST /v1/steps/batch`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — the write is refused if the skill has changed since, so an edit cannot silently overwrite one made in another tab. |
| `overwriteConcurrentEdit` | `boolean` | no | Skip the optimistic-lock pre-check, and NOTHING ELSE. A stale `version` is accepted rather than refused with a 409, so a concurrent edit is overwritten — that is the whole of what this does. It has no effect on validation: blocking errors are refused either way, warnings never blocked a save in the first place, and a `unique-collision` 409 will NOT clear (the index is still there). |
| `key` | `string` | no | The skill's new key, dotted or not; omit to keep it. Lowercase words joined by dashes, optionally grouped with dots, like `extract.species`, up to 64 characters. |
| `description` | `string \| null` | no | Free-text note about what this skill does. |
| `handlerKey` | `string` | no | Change which system handler runs this skill. |
| `handlerConfig` | `unknown` | no | Handler-specific settings, shaped by `handlerKey`. |
| `condition` | `unknown` | no | Guard evaluated before the skill runs. |
| `inputStreams` | `string[]` | no | Replacement input list. An input that stays keeps its type and a new one is typed from what feeds it, unless you send `inputSchemas` beside it (one type per input). Omit it when you change a step whose settings or prompt name its inputs: they are derived again. |
| `outputSlot` | `string` | no | New output slot. Renaming one is what `renames` cascades to referencing siblings. |
| `promptTemplate` | `string` | no | New prompt body. |
| `systemPrompt` | `string \| null` | no | New system-role instruction. |
| `taskKey` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak"` | no | Change the task this skill bills and resolves its model under. |
| `outputSchema` | `object` | no | Schema the skill's output must conform to. |
| `inputSchemas` | `object[]` | no | The type of each input, aligned with the `inputStreams` you send (or the step's inputs, when you send none). Omit it (or send `[]`) and each input keeps its type, a new one typed from what feeds it. A non-empty list must be one type per input. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `enabled` | `boolean` | no | Whether the skill executes. |
| `modelId` | `string \| null` | no | AiModel id this skill's AI call runs on. Omit (or send null) to inherit the model bound to this skill's taskKey at /platform/models — the project's AiTaskConfig row for that task, else the system default. Set an explicit id only to pin this skill to one model; it must name a row in the AiModel catalog. |
| `timeoutMs` | `integer \| null` | no | Per-skill time limit in milliseconds, up to 120000. |
| `tries` | `integer \| null` | no | How many times the step is tried in all, the first try included, 1–5. Null uses the handler's own number, which a step's number replaces rather than adds to. Only fetch and file steps take it; a step that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | no | The fixed wait between tries, in milliseconds, up to 60000. Null uses the handler's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | no | What this step's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; steps that do not depend on this one still run. `continue` — the run carries on without this step's output and reports the failure as a warning. Offered only on steps that write nothing. |
| `reuseResultsForMinutes` | `integer \| null` | no | How long a result this step saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the handler's own period; 0 always runs fresh and saves nothing. |
| `confirmedOutputSlotRenames` | `object[]` | no | Confirm output-slot renames and cascade them. Every sibling skill referencing an old name is rewritten to the new one in the same transaction. A skill may rename several slots at once, so this is a list. Omit it and a rename leaves referencing siblings pointing at a slot that no longer exists. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate-draft`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skill` | `object` | yes | The skill as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write WOULD have computed. |

### `DELETE /v1/steps/{id}`

Delete one step. Refused (409) while another step reads a slot it writes — the list publishes that refusal per step as `deleteRefusal`. With `?validateOnly=true` it answers whether it would be, writing nothing. Several at once: the `deletes` of `POST /v1/steps/batch`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/deletion-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedSkillKey` | `string` | yes | Key of the skill that was removed. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |

### `POST /v1/steps/{id}/duplicate`

Copy a step into its own flow, under a key and an output slot nothing else in the flow uses. To copy a step into another flow, create it there with `POST /v1/steps`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skill` | `object` | yes | The skill as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |

### `POST /v1/steps/batch`

Create, change and delete several steps of ONE flow in one transaction, validated as the graph they leave; a blocking error rolls all of it back. A step's input types may come from another step of the same body. One step: `POST /v1/steps` or `PATCH /v1/steps/{id}`. Several flows, or other kinds of configuration with them: the project document (`POST /v1/projects/{nodeId}/document`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow every item in this batch belongs to. |
| `creates` | `object[]` | no | Skills to add. |
| `updates` | `object[]` | no | Steps to change. Each carries its own `version`, so one stale item refuses the whole batch. |
| `deletes` | `object[]` | no | Skills to remove. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `created` | `object[]` | yes | Skills that were added. |
| `updated` | `object[]` | yes | Skills that were changed. |
| `deletedIds` | `string[]` | yes | Ids of the skills removed. |
| `outstandingIssues` | `object[]` | yes | Warnings about the resulting graph. The batch applied — anything blocking would have rolled the whole transaction back instead. |

### `GET /v1/steps/condition-operators`

Which condition operator can test which kind of value — the table a step's `condition` is checked against at save and evaluated by at run time. The same for every caller of a deployment.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `operators` | `object[]` | yes | Every condition leaf operator this deployment evaluates. |

### `GET /v1/steps/input-options`

Every slot a step could read in a flow, each checked against what its handler takes, with the type and path a save would store for it. Works before the step is saved. The step's whole scope, every slot typed: `GET /v1/flows/{id}/scope`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow the step belongs to. Flow-addressed because the step may not be saved yet. |
| `handlerKey` | `string` | yes | The handler the step runs. Its declared inputs are what every slot is checked against. An unregistered key is a 422. |
| `stepId` | `string` | no | The step being edited, when it is saved. Its own output is never offered, and a slot that waits on it is reported as closing a circle. Omit it for a step that does not exist yet. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `picker` | `"row" \| "config" \| "prompt"` | yes | Where this step's inputs are chosen. `row` — picked for the step itself. `config` — the step's settings name them. `prompt` — the prompt's placeholders name the step's TEXT inputs. `bounds` and `candidates` are filled for `row`, and for a `prompt` step whose `attaches` is set — never for `config`, whose settings are where its slots are named. |
| `attaches` | `"files"` | yes | What this step attaches beside the inputs named in its prompt, or null for nothing. `files` — a file-shaped input is built into what the model is sent without any placeholder naming it, so `bounds` describes what may be attached, `candidates` judges every slot against it, and `count` is null: any number, none required. |
| `count` | `integer \| null` | yes | How many inputs the step takes, or null for any number. |
| `bounds` | `object[]` | yes | What each input must hold. With a `count`, one entry per position, in order. Without one, a single entry every position shares. |
| `stepScopedTo` | `object \| null` | yes | The fan-out or loop the step runs inside, as it is saved. Null when it runs outside both, or is not saved yet. |
| `candidates` | `object[]` | yes | Every slot the step could read: earlier steps' outputs, then the flow's inputs, then the platform's. |

### `POST /v1/steps/interpolate`

Render one step's prompt against slot values you type, with no model call — free, at EDITOR. The same render calling the model: `POST /v1/steps/preview`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this step is being authored into. It decides who may render the prompt; nothing here is billed, so it names no payer. |
| `handlerKey` | `string` | yes | Which step type to render as. ⚠️ No model is called whatever this says — it decides only whether `{{#slot}}` sections iterate, so the text that comes back is exactly what that step type would have produced. |
| `promptTemplate` | `string` | yes | The prompt to interpolate. |
| `systemPrompt` | `string \| null` | no | A system prompt, interpolated against the same values. Only read by step types that accept one — supplying it elsewhere is ignored rather than an error. |
| `slotValues` | `object` | no | The values to interpolate, keyed by slot name. Deliberately unvalidated here — supply whatever the step's inputs would be. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The prompt after interpolation — exactly what the model would receive. |
| `latencyMs` | `number` | yes | How long the render took, in milliseconds. |

### `POST /v1/steps/preview`

Run ONE step's prompt against slot values you type — for `text.generate` it calls the model, which is billed (ADMIN). The free render with no model call: `POST /v1/steps/interpolate`. A whole flow against real inputs: `POST /v1/flows/{id}/preview`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this step is being authored into. It decides who may run the preview, which project's models are available, and who is billed for it. |
| `project` | `string` | no | The node id of the project a step of a platform flow previews as — required there, since a platform flow belongs to no project, and the platform pays for the call. Refused for a step of a project's own flow. Requires EDITOR on it. |
| `handlerKey` | `string` | yes | Which step type to simulate. ⚠️ It decides whether a MODEL IS ACTUALLY CALLED — `text.generate` calls one and bills for it, while the others just interpolate. It also decides whether `{{#slot}}` sections iterate, so a mismatch here renders arrays differently than the real run will. |
| `taskKey` | `string` | no | Which task preset supplies the model, when one is called. Omit it and the preview uses `extraction` — the task a step created without one starts on. |
| `promptTemplate` | `string` | yes | The prompt to interpolate. |
| `systemPrompt` | `string \| null` | no | A system prompt, interpolated against the same values. Only read by step types that accept one — supplying it elsewhere is ignored rather than an error. |
| `slotValues` | `object` | no | The values to interpolate, keyed by slot name. Deliberately unvalidated here — supply whatever the step's inputs would be. |
| `attachments` | `object` | no | Files to attach beside the prompt, keyed by the slot the step reads them from. Each value is the ids of files this project holds, in the order that slot's wires are in — never storage keys. |
| `modelIdOverride` | `string \| null` | no | Try a specific model instead of the task preset's. Null or omitted uses the preset. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The prompt after interpolation — exactly what the model would receive. |
| `response` | `string \| null` | yes | What the model said, when one was called. For a step type that does not call a model this is the interpolated prompt instead, because that text IS its answer. |
| `tokensIn` | `number \| null` | yes | Tokens sent. NULL MEANS NO MODEL WAS CALLED, which is a different thing from a call that used zero. |
| `tokensOut` | `number \| null` | yes | Tokens returned. Null when no model was called. |
| `latencyMs` | `number` | yes | How long the preview took, in milliseconds. |
