<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Actions

An action is one part of a flow: a function key, its config, what it reads and the slot it writes. Action writes return 2xx with `outstandingIssues`; only an action-level error refuses a save.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/actions`](#get-v1-actions) |  |
| `POST` | [`/v1/actions`](#post-v1-actions) |  |
| `GET` | [`/v1/actions/{id}`](#get-v1-actions-id) |  |
| `PATCH` | [`/v1/actions/{id}`](#patch-v1-actions-id) |  |
| `DELETE` | [`/v1/actions/{id}`](#delete-v1-actions-id) |  |
| `POST` | [`/v1/actions/{id}/duplicate`](#post-v1-actions-id-duplicate) |  |
| `POST` | [`/v1/actions/batch`](#post-v1-actions-batch) |  |
| `GET` | [`/v1/actions/condition-operators`](#get-v1-actions-condition-operators) |  |
| `GET` | [`/v1/actions/input-options`](#get-v1-actions-input-options) |  |
| `POST` | [`/v1/actions/interpolate`](#post-v1-actions-interpolate) |  |
| `POST` | [`/v1/actions/preview`](#post-v1-actions-preview) |  |

### `GET /v1/actions`

The actions of one flow (`?flowId=`), each with what the graph adds to the row: the slots it produces, its time limit, whether a delete would be refused. One action: `GET /v1/actions/{id}`. A whole project's configuration, every flow's actions included: `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow whose actions to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `actions` | `object[]` | yes | Actions in the flow, enabled or not. |

Each item of `actions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Action id — the address for every action verb. |
| `flowId` | `string` | yes | Id of the flow this action belongs to. |
| `key` | `string` | yes | The action's key, e.g. `common.summarize`. Other actions and the flow's wiring refer to it by this key. |
| `description` | `string \| null` | yes | Free-text note about what this action does. Not executed. |
| `functionKey` | `string` | yes | Which function runs this action (see `GET /v1/functions`). It determines what `functionConfig` may contain. |
| `functionConfig` | `unknown` | no | Function-specific settings. The accepted shape is defined by `functionKey`. |
| `condition` | `unknown` | no | Guard evaluated before the action runs. When it is not satisfied the action is skipped rather than executed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier actions that feed this one. These edges order the flow — an action runs once its inputs are available. |
| `outputSlot` | `string` | yes | Slot this action writes its result to. Downstream actions name it in their `inputStreams`. |
| `producedSlots` | `object` | yes | The slots this action writes, read off its function and its config the way the platform's validator and runner read them. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed functions, with inputs interpolated. Ignored by functions that do not call a model. |
| `systemPrompt` | `string \| null` | yes | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `string` | yes | Task this action bills and resolves its model under, so a project can point a whole class of actions at one model. |
| `outputSchema` | `unknown` | no | Expected shape of this action's output. A result that does not conform fails rather than being written to the slot. |
| `inputSchemas` | `unknown` | no | Expected shapes of this action's inputs, checked before it runs. |
| `inputPaths` | `unknown` | no | Per-input path expressions selecting a leaf out of a composite input, so an action can consume one field of an upstream slot rather than the whole value. |
| `inputProjectionNames` | `unknown` | no | Names the projected inputs are exposed under inside the prompt, when they should differ from the source slot names. |
| `enabled` | `boolean` | yes | Whether this action executes. A disabled action stays in the flow and is reported as skipped. |
| `modelId` | `string \| null` | yes | Model this action is pinned to, or null to use the one its `taskKey` resolves to. |
| `tries` | `integer \| null` | yes | How many times the action is tried in all, the first try included, 1–5. Null uses the function's own number, which an action's number replaces rather than adds to. Only fetch and file actions take it; an action that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | yes | The fixed wait between tries, in milliseconds, up to 60000. Null uses the function's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | yes | What this action's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; actions that do not depend on this one still run. `continue` — the run carries on without this action's output and reports the failure as a warning. Offered only on actions that write nothing. |
| `failureSlot` | `string \| null` | yes | Slot the platform writes this action's failure to, as a `ActionFailure` (`phase`, `code`, `message`, `retryable`), when the action failed and the run carried on (`onFailure: continue`) or its function softened a failure. Absent on a run where the action succeeded, was skipped or found nothing, so a reader takes it as an optional input or gates on it being present. Refused on an action that can never write it. Null when the action names none. |
| `reuseResultsForMinutes` | `integer \| null` | yes | How long a result this action saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the function's own period; 0 always runs fresh and saves nothing. |
| `timeoutMs` | `integer \| null` | yes | Per-action time limit in milliseconds, or null for none of its own. What it bounds depends on the function: each AI call for an AI generation action; the wait on the queued job for a fetch or file action, covering every try; and how long the run waits for an action that runs in the flow itself, whose work may still finish. Control actions ignore it. A synchronous endpoint stops waiting at its own limit regardless. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a write to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `level` | `integer \| null` | yes | How many producer-to-consumer steps stand between this action and the flow's own inputs: 0 for an action that reads only what the caller or the platform supplies, one more than its latest producer otherwise. A condition's slots count as reads, and a slot nothing writes counts as supplied, as the runner treats it. Actions on one level have no edge between them. Null for every action of a flow whose actions wait on each other in a circle, which the platform refuses to run. |
| `canFire` | `boolean` | yes | False when the flow's wiring alone keeps this action from ever running: its condition cannot hold, none of its inputs can arrive, an input it reads a field of never arrives and the action cannot go without it, or it sits inside a fan-out that can never run — because the slots involved are never written by anything that can itself run. True is not a promise — a condition over a value that may arrive, or a list that may be empty, can still skip it on a given run. Every action is judged as though enabled. |
| `blockedBy` | `string \| null` | yes | When `canFire` is false, the slot whose absence decides it — the first slot the condition names that never arrives, the first input that never does, the input whose field it reads that never arrives, or, for an action inside a fan-out that can never run, the slot that stops the fan-out. Null when `canFire` is true. |
| `deleteRefusal` | `object \| null` | yes | Why `DELETE /v1/actions/{id}` would refuse this action right now, in the delete's own words — or null when no other action in the flow reads what it writes. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. An action saved between this read and the delete still refuses it. |
| `effectiveTimeLimit` | `object \| null` | yes | What this action's time limit comes to on a run and which layer decided it — the precedence the engine applies, with the deployment's current limits. Null when the action's function is not registered, so nothing can say how it runs. |

### `POST /v1/actions`

Create one action in a flow. Leave out what the platform works out: the inputs a function names in its settings or prompt, each input's type (from what feeds it), and fields the function does not read — `promptTemplate`, `taskKey`, and `outputSlot` for a function that writes no named result. With `validateOnly: true` it answers the save's verdict and what the configuration names (`derived.draft`), writing nothing. Several actions at once: `POST /v1/actions/batch`. A whole project in one planned call: `POST /v1/projects/{nodeId}/document`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow this action will belong to. |
| `key` | `string` | yes | The action's key, e.g. `summarize` or `common.summarize`; dots optionally group segments. Lowercase words joined by dashes, optionally grouped with dots, like `extract.species`, up to 64 characters. |
| `description` | `string \| null` | no | Free-text note about what this action does. Not executed. |
| `functionKey` | `string` | yes | Which function runs this action (see `GET /v1/functions`). It determines what `functionConfig` may contain. |
| `functionConfig` | `unknown` | no | Function-specific settings, shaped by `functionKey`. |
| `condition` | `unknown` | no | Guard evaluated before the action runs. Unsatisfied means skipped, not failed. |
| `inputStreams` | `string[]` | no | Slots this action reads — earlier actions' outputs, flow inputs, or the platform's own slots — in order. `inputSchemas`, `inputPaths` and `inputProjectionNames` align to it. Omit it (or send `[]`) for a function whose inputs are named in its config or prompt (`value.transform`, `text.generate`, `record.list`, …): the platform fills the list it reads. A list you send is checked, not replaced. |
| `outputSlot` | `string` | no | Slot this action writes its result to. Required by a function that writes a result; omit it for one that writes none or derives it from its config (`event.emit`, `vector.upsert`, `flow.merge`, `flow.invoke`, `flow.loop-end`, `flow.dispatch`). |
| `promptTemplate` | `string \| null` | no | Prompt body, with inputs interpolated. Only a function that reads a prompt (`text.generate`, `text.interpolate`) needs it; omit it (or send null) for every other function. |
| `systemPrompt` | `string \| null` | no | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak"` | no | Task this action bills and resolves its model under. One of the writable pipeline tasks. Omit it and the action starts on `extraction` — change it with a PATCH. It decides the model only for a function whose model follows its task, but every action still bills under it, and a function whose catalog entry says `run.timeLimitFromTask` takes this task's time limit when the action sets no `timeoutMs`. |
| `outputSchema` | `object` | no | Schema the action's output must conform to. Omit it or send null and a new action takes the type its function emits (`record.create` → `RecordCreate`); a function that emits none of its own, such as `text.generate`, is left with no constraint. |
| `inputSchemas` | `object[]` | no | The type of each input, POSITIONALLY ALIGNED with the `inputStreams` you send. Omit it (or send `[]`) and the platform types each input from what feeds it — the earlier action's output, the flow input, the platform slot — through its path. Send it only to state a type on purpose; a stated type is kept and checked. A non-empty list must be the same length as `inputStreams`. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `enabled` | `boolean` | no | Whether the action executes. Defaults to enabled. |
| `modelId` | `string \| null` | no | AiModel id this action's AI call runs on. Omit (or send null) to inherit the model bound to this action's taskKey at /platform/models — the project's AiTaskConfig row for that task, else the system default. Set an explicit id only to pin this action to one model; it must name a row in the AiModel catalog. |
| `timeoutMs` | `integer \| null` | no | Per-action time limit in milliseconds, up to 120000. |
| `tries` | `integer \| null` | no | How many times the action is tried in all, the first try included, 1–5. Null uses the function's own number, which an action's number replaces rather than adds to. Only fetch and file actions take it; an action that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | no | The fixed wait between tries, in milliseconds, up to 60000. Null uses the function's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | no | What this action's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; actions that do not depend on this one still run. `continue` — the run carries on without this action's output and reports the failure as a warning. Offered only on actions that write nothing. Defaults to `fail-run`. |
| `failureSlot` | `string \| null` | no | Slot the platform writes this action's failure to, as a `ActionFailure` (`phase`, `code`, `message`, `retryable`), when the action failed and the run carried on (`onFailure: continue`) or its function softened a failure. Absent on a run where the action succeeded, was skipped or found nothing, so a reader takes it as an optional input or gates on it being present. Refused on an action that can never write it. Omit it, or send null, to name none. |
| `reuseResultsForMinutes` | `integer \| null` | no | How long a result this action saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the function's own period; 0 always runs fresh and saves nothing. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate-draft`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the create WOULD have computed. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `action` | `object` | yes | The action as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |

Each item of `outstandingIssues`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable code identifying the kind of problem. |
| `message` | `string` | yes | What is wrong, in prose. |
| `severity` | `"error" \| "warning"` | yes | `error` blocks the save — there is NO override, and no field on this body grants one; `warning` does not block and is reported so it is not discovered later. |

### `GET /v1/actions/{id}`

One action by id. Every action of its flow, with the graph's facts about each: `GET /v1/actions?flowId=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The action's id, as returned when it was created or listed. Actions are addressed globally, not under their flow. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Action id — the address for every action verb. |
| `flowId` | `string` | yes | Id of the flow this action belongs to. |
| `key` | `string` | yes | The action's key, e.g. `common.summarize`. Other actions and the flow's wiring refer to it by this key. |
| `description` | `string \| null` | yes | Free-text note about what this action does. Not executed. |
| `functionKey` | `string` | yes | Which function runs this action (see `GET /v1/functions`). It determines what `functionConfig` may contain. |
| `functionConfig` | `unknown` | no | Function-specific settings. The accepted shape is defined by `functionKey`. |
| `condition` | `unknown` | no | Guard evaluated before the action runs. When it is not satisfied the action is skipped rather than executed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier actions that feed this one. These edges order the flow — an action runs once its inputs are available. |
| `outputSlot` | `string` | yes | Slot this action writes its result to. Downstream actions name it in their `inputStreams`. |
| `producedSlots` | `object` | yes | The slots this action writes, read off its function and its config the way the platform's validator and runner read them. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed functions, with inputs interpolated. Ignored by functions that do not call a model. |
| `systemPrompt` | `string \| null` | yes | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `string` | yes | Task this action bills and resolves its model under, so a project can point a whole class of actions at one model. |
| `outputSchema` | `unknown` | no | Expected shape of this action's output. A result that does not conform fails rather than being written to the slot. |
| `inputSchemas` | `unknown` | no | Expected shapes of this action's inputs, checked before it runs. |
| `inputPaths` | `unknown` | no | Per-input path expressions selecting a leaf out of a composite input, so an action can consume one field of an upstream slot rather than the whole value. |
| `inputProjectionNames` | `unknown` | no | Names the projected inputs are exposed under inside the prompt, when they should differ from the source slot names. |
| `enabled` | `boolean` | yes | Whether this action executes. A disabled action stays in the flow and is reported as skipped. |
| `modelId` | `string \| null` | yes | Model this action is pinned to, or null to use the one its `taskKey` resolves to. |
| `tries` | `integer \| null` | yes | How many times the action is tried in all, the first try included, 1–5. Null uses the function's own number, which an action's number replaces rather than adds to. Only fetch and file actions take it; an action that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | yes | The fixed wait between tries, in milliseconds, up to 60000. Null uses the function's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | yes | What this action's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; actions that do not depend on this one still run. `continue` — the run carries on without this action's output and reports the failure as a warning. Offered only on actions that write nothing. |
| `failureSlot` | `string \| null` | yes | Slot the platform writes this action's failure to, as a `ActionFailure` (`phase`, `code`, `message`, `retryable`), when the action failed and the run carried on (`onFailure: continue`) or its function softened a failure. Absent on a run where the action succeeded, was skipped or found nothing, so a reader takes it as an optional input or gates on it being present. Refused on an action that can never write it. Null when the action names none. |
| `reuseResultsForMinutes` | `integer \| null` | yes | How long a result this action saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the function's own period; 0 always runs fresh and saves nothing. |
| `timeoutMs` | `integer \| null` | yes | Per-action time limit in milliseconds, or null for none of its own. What it bounds depends on the function: each AI call for an AI generation action; the wait on the queued job for a fetch or file action, covering every try; and how long the run waits for an action that runs in the flow itself, whose work may still finish. Control actions ignore it. A synchronous endpoint stops waiting at its own limit regardless. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a write to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/actions/{id}`

Change one action; `version` is the one you last read, and a moved row answers 409. Omit `inputStreams` when you change a function's settings or prompt and the inputs it names are derived again. With `validateOnly: true` it answers the save's verdict, what the patched configuration names (`derived.draft`) and — when `outputSlot` changes — which actions read the old slot (`derived.rename`), and — with `enabled: false` — which other actions would stop running with it (`derived.switchOff`), writing nothing; confirm the rename with `confirmedOutputSlotRenames`. Several actions at once: `POST /v1/actions/batch`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The action's id, as returned when it was created or listed. Actions are addressed globally, not under their flow. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — the write is refused if the action has changed since, so an edit cannot silently overwrite one made in another tab. |
| `overwriteConcurrentEdit` | `boolean` | no | Skip the optimistic-lock pre-check, and NOTHING ELSE. A stale `version` is accepted rather than refused with a 409, so a concurrent edit is overwritten — that is the whole of what this does. It has no effect on validation: blocking errors are refused either way, warnings never blocked a save in the first place, and a `unique-collision` 409 will NOT clear (the index is still there). |
| `key` | `string` | no | The action's new key, dotted or not; omit to keep it. Lowercase words joined by dashes, optionally grouped with dots, like `extract.species`, up to 64 characters. |
| `description` | `string \| null` | no | Free-text note about what this action does. |
| `functionKey` | `string` | no | Change which function runs this action. |
| `functionConfig` | `unknown` | no | Function-specific settings, shaped by `functionKey`. |
| `condition` | `unknown` | no | Guard evaluated before the action runs. |
| `inputStreams` | `string[]` | no | Replacement input list. An input that stays keeps its type and a new one is typed from what feeds it, unless you send `inputSchemas` beside it (one type per input). Omit it when you change an action whose settings or prompt name its inputs: they are derived again. |
| `outputSlot` | `string` | no | New output slot. Renaming one is what `renames` cascades to referencing siblings. |
| `promptTemplate` | `string` | no | New prompt body. |
| `systemPrompt` | `string \| null` | no | New system-role instruction. |
| `taskKey` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak"` | no | Change the task this action bills and resolves its model under. |
| `outputSchema` | `object` | no | Schema the action's output must conform to. |
| `inputSchemas` | `object[]` | no | The type of each input, aligned with the `inputStreams` you send (or the action's inputs, when you send none). Omit it (or send `[]`) and each input keeps its type, a new one typed from what feeds it. A non-empty list must be one type per input. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `enabled` | `boolean` | no | Whether the action executes. |
| `modelId` | `string \| null` | no | AiModel id this action's AI call runs on. Omit (or send null) to inherit the model bound to this action's taskKey at /platform/models — the project's AiTaskConfig row for that task, else the system default. Set an explicit id only to pin this action to one model; it must name a row in the AiModel catalog. |
| `timeoutMs` | `integer \| null` | no | Per-action time limit in milliseconds, up to 120000. |
| `tries` | `integer \| null` | no | How many times the action is tried in all, the first try included, 1–5. Null uses the function's own number, which an action's number replaces rather than adds to. Only fetch and file actions take it; an action that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | no | The fixed wait between tries, in milliseconds, up to 60000. Null uses the function's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | no | What this action's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; actions that do not depend on this one still run. `continue` — the run carries on without this action's output and reports the failure as a warning. Offered only on actions that write nothing. |
| `failureSlot` | `string \| null` | no | Slot the platform writes this action's failure to, as a `ActionFailure` (`phase`, `code`, `message`, `retryable`), when the action failed and the run carried on (`onFailure: continue`) or its function softened a failure. Absent on a run where the action succeeded, was skipped or found nothing, so a reader takes it as an optional input or gates on it being present. Refused on an action that can never write it. Null clears it; omit it to leave it as it is. Renaming one is what `confirmedOutputSlotRenames` cascades to its readers. |
| `reuseResultsForMinutes` | `integer \| null` | no | How long a result this action saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the function's own period; 0 always runs fresh and saves nothing. |
| `confirmedOutputSlotRenames` | `object[]` | no | Confirm output-slot renames and cascade them. Every sibling action referencing an old name is rewritten to the new one in the same transaction. An action may rename several slots at once, so this is a list. Omit it and a rename leaves referencing siblings pointing at a slot that no longer exists. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate-draft`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `action` | `object` | yes | The action as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write WOULD have computed. |

Each item of `outstandingIssues`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable code identifying the kind of problem. |
| `message` | `string` | yes | What is wrong, in prose. |
| `severity` | `"error" \| "warning"` | yes | `error` blocks the save — there is NO override, and no field on this body grants one; `warning` does not block and is reported so it is not discovered later. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

### `DELETE /v1/actions/{id}`

Delete one action. Refused (409) while another action reads a slot it writes — the list publishes that refusal per action as `deleteRefusal`. With `?validateOnly=true` it answers whether it would be, writing nothing. Several at once: the `deletes` of `POST /v1/actions/batch`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The action's id, as returned when it was created or listed. Actions are addressed globally, not under their flow. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/deletion-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedActionKey` | `string` | yes | Key of the action that was removed. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

### `POST /v1/actions/{id}/duplicate`

Copy an action into its own flow, under a key and an output slot nothing else in the flow uses. To copy an action into another flow, create it there with `POST /v1/actions`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The action's id, as returned when it was created or listed. Actions are addressed globally, not under their flow. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `action` | `object` | yes | The action as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |

Each item of `outstandingIssues`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable code identifying the kind of problem. |
| `message` | `string` | yes | What is wrong, in prose. |
| `severity` | `"error" \| "warning"` | yes | `error` blocks the save — there is NO override, and no field on this body grants one; `warning` does not block and is reported so it is not discovered later. |

### `POST /v1/actions/batch`

Create, change and delete several actions of ONE flow in one transaction, validated as the graph they leave; a blocking error rolls all of it back. An action's input types may come from another action of the same body. One action: `POST /v1/actions` or `PATCH /v1/actions/{id}`. Several flows, or other kinds of configuration with them: the project document (`POST /v1/projects/{nodeId}/document`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow every item in this batch belongs to. |
| `creates` | `object[]` | no | Actions to add. |
| `updates` | `object[]` | no | Actions to change. Each carries its own `version`, so one stale item refuses the whole batch. |
| `deletes` | `object[]` | no | Actions to remove. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `created` | `object[]` | yes | Actions that were added. |
| `updated` | `object[]` | yes | Actions that were changed. |
| `deletedIds` | `string[]` | yes | Ids of the actions removed. |
| `outstandingIssues` | `object[]` | yes | Warnings about the resulting graph. The batch applied — anything blocking would have rolled the whole transaction back instead. |

Each item of `created`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Action id — the address for every action verb. |
| `flowId` | `string` | yes | Id of the flow this action belongs to. |
| `key` | `string` | yes | The action's key, e.g. `common.summarize`. Other actions and the flow's wiring refer to it by this key. |
| `description` | `string \| null` | yes | Free-text note about what this action does. Not executed. |
| `functionKey` | `string` | yes | Which function runs this action (see `GET /v1/functions`). It determines what `functionConfig` may contain. |
| `functionConfig` | `unknown` | no | Function-specific settings. The accepted shape is defined by `functionKey`. |
| `condition` | `unknown` | no | Guard evaluated before the action runs. When it is not satisfied the action is skipped rather than executed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier actions that feed this one. These edges order the flow — an action runs once its inputs are available. |
| `outputSlot` | `string` | yes | Slot this action writes its result to. Downstream actions name it in their `inputStreams`. |
| `producedSlots` | `object` | yes | The slots this action writes, read off its function and its config the way the platform's validator and runner read them. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed functions, with inputs interpolated. Ignored by functions that do not call a model. |
| `systemPrompt` | `string \| null` | yes | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `string` | yes | Task this action bills and resolves its model under, so a project can point a whole class of actions at one model. |
| `outputSchema` | `unknown` | no | Expected shape of this action's output. A result that does not conform fails rather than being written to the slot. |
| `inputSchemas` | `unknown` | no | Expected shapes of this action's inputs, checked before it runs. |
| `inputPaths` | `unknown` | no | Per-input path expressions selecting a leaf out of a composite input, so an action can consume one field of an upstream slot rather than the whole value. |
| `inputProjectionNames` | `unknown` | no | Names the projected inputs are exposed under inside the prompt, when they should differ from the source slot names. |
| `enabled` | `boolean` | yes | Whether this action executes. A disabled action stays in the flow and is reported as skipped. |
| `modelId` | `string \| null` | yes | Model this action is pinned to, or null to use the one its `taskKey` resolves to. |
| `tries` | `integer \| null` | yes | How many times the action is tried in all, the first try included, 1–5. Null uses the function's own number, which an action's number replaces rather than adds to. Only fetch and file actions take it; an action that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | yes | The fixed wait between tries, in milliseconds, up to 60000. Null uses the function's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | yes | What this action's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; actions that do not depend on this one still run. `continue` — the run carries on without this action's output and reports the failure as a warning. Offered only on actions that write nothing. |
| `failureSlot` | `string \| null` | yes | Slot the platform writes this action's failure to, as a `ActionFailure` (`phase`, `code`, `message`, `retryable`), when the action failed and the run carried on (`onFailure: continue`) or its function softened a failure. Absent on a run where the action succeeded, was skipped or found nothing, so a reader takes it as an optional input or gates on it being present. Refused on an action that can never write it. Null when the action names none. |
| `reuseResultsForMinutes` | `integer \| null` | yes | How long a result this action saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the function's own period; 0 always runs fresh and saves nothing. |
| `timeoutMs` | `integer \| null` | yes | Per-action time limit in milliseconds, or null for none of its own. What it bounds depends on the function: each AI call for an AI generation action; the wait on the queued job for a fetch or file action, covering every try; and how long the run waits for an action that runs in the flow itself, whose work may still finish. Control actions ignore it. A synchronous endpoint stops waiting at its own limit regardless. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a write to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

Each item of `updated`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Action id — the address for every action verb. |
| `flowId` | `string` | yes | Id of the flow this action belongs to. |
| `key` | `string` | yes | The action's key, e.g. `common.summarize`. Other actions and the flow's wiring refer to it by this key. |
| `description` | `string \| null` | yes | Free-text note about what this action does. Not executed. |
| `functionKey` | `string` | yes | Which function runs this action (see `GET /v1/functions`). It determines what `functionConfig` may contain. |
| `functionConfig` | `unknown` | no | Function-specific settings. The accepted shape is defined by `functionKey`. |
| `condition` | `unknown` | no | Guard evaluated before the action runs. When it is not satisfied the action is skipped rather than executed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier actions that feed this one. These edges order the flow — an action runs once its inputs are available. |
| `outputSlot` | `string` | yes | Slot this action writes its result to. Downstream actions name it in their `inputStreams`. |
| `producedSlots` | `object` | yes | The slots this action writes, read off its function and its config the way the platform's validator and runner read them. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed functions, with inputs interpolated. Ignored by functions that do not call a model. |
| `systemPrompt` | `string \| null` | yes | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `string` | yes | Task this action bills and resolves its model under, so a project can point a whole class of actions at one model. |
| `outputSchema` | `unknown` | no | Expected shape of this action's output. A result that does not conform fails rather than being written to the slot. |
| `inputSchemas` | `unknown` | no | Expected shapes of this action's inputs, checked before it runs. |
| `inputPaths` | `unknown` | no | Per-input path expressions selecting a leaf out of a composite input, so an action can consume one field of an upstream slot rather than the whole value. |
| `inputProjectionNames` | `unknown` | no | Names the projected inputs are exposed under inside the prompt, when they should differ from the source slot names. |
| `enabled` | `boolean` | yes | Whether this action executes. A disabled action stays in the flow and is reported as skipped. |
| `modelId` | `string \| null` | yes | Model this action is pinned to, or null to use the one its `taskKey` resolves to. |
| `tries` | `integer \| null` | yes | How many times the action is tried in all, the first try included, 1–5. Null uses the function's own number, which an action's number replaces rather than adds to. Only fetch and file actions take it; an action that runs in the flow itself is tried once. |
| `tryDelayMs` | `integer \| null` | yes | The fixed wait between tries, in milliseconds, up to 60000. Null uses the function's own backoff. |
| `onFailure` | `"fail-run" \| "continue"` | yes | What this action's failure does to the run. `fail-run` — the run fails and keeps nothing it wrote; actions that do not depend on this one still run. `continue` — the run carries on without this action's output and reports the failure as a warning. Offered only on actions that write nothing. |
| `failureSlot` | `string \| null` | yes | Slot the platform writes this action's failure to, as a `ActionFailure` (`phase`, `code`, `message`, `retryable`), when the action failed and the run carried on (`onFailure: continue`) or its function softened a failure. Absent on a run where the action succeeded, was skipped or found nothing, so a reader takes it as an optional input or gates on it being present. Refused on an action that can never write it. Null when the action names none. |
| `reuseResultsForMinutes` | `integer \| null` | yes | How long a result this action saved stays good enough to reuse, in minutes, up to 86400 (sixty days). Null uses the function's own period; 0 always runs fresh and saves nothing. |
| `timeoutMs` | `integer \| null` | yes | Per-action time limit in milliseconds, or null for none of its own. What it bounds depends on the function: each AI call for an AI generation action; the wait on the queued job for a fetch or file action, covering every try; and how long the run waits for an action that runs in the flow itself, whose work may still finish. Control actions ignore it. A synchronous endpoint stops waiting at its own limit regardless. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a write to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

Each item of `outstandingIssues`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable code identifying the kind of problem. |
| `message` | `string` | yes | What is wrong, in prose. |
| `severity` | `"error" \| "warning"` | yes | `error` blocks the save — there is NO override, and no field on this body grants one; `warning` does not block and is reported so it is not discovered later. |

### `GET /v1/actions/condition-operators`

Which condition operator can test which kind of value — the table an action's `condition` is checked against at save and evaluated by at run time. The same for every caller of a deployment.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `operators` | `object[]` | yes | Every condition leaf operator this deployment evaluates. |

Each item of `operators`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `op` | `string` | yes | The operator, as a condition leaf's `op` spells it. Treat the list as open: a newer deployment may add one. |
| `wholeSlot` | `object` | yes | Its verdict when the leaf tests a WHOLE slot (no `path`). An operator the condition schema accepts only with a `path` is listed here too; the save refuses it without one first. |
| `field` | `object` | yes | Its verdict when the leaf tests a field inside the slot (a `path`). |

### `GET /v1/actions/input-options`

Every slot an action could read in a flow, each checked against what its function takes, with the type and path a save would store for it. Works before the action is saved. The action's whole scope, every slot typed: `GET /v1/flows/{id}/scope`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow the action belongs to. Flow-addressed because the action may not be saved yet. |
| `functionKey` | `string` | yes | The function the action runs. Its declared inputs are what every slot is checked against. An unregistered key is a 422. |
| `actionId` | `string` | no | The action being edited, when it is saved. Its own output is never offered, and a slot that waits on it is reported as closing a circle. Omit it for an action that does not exist yet. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `picker` | `"row" \| "config" \| "prompt"` | yes | Where this action's inputs are chosen. `row` — picked for the action itself. `config` — the action's settings name them. `prompt` — the prompt's placeholders name the action's TEXT inputs. `bounds` and `candidates` are filled for `row`, and for a `prompt` or `config` action whose `attaches` is set — otherwise never for `config`, whose settings are where its slots are named. |
| `attaches` | `"files" \| "positional"` | yes | What this action takes beside the inputs named in its prompt or its settings, or null for nothing. `files` — a file-shaped input is built into what the model is sent without any placeholder naming it, so `bounds` describes what may be attached, `candidates` judges every slot against it, and `count` is null: any number, none required. `positional` — the action reads its first `count` inputs by position, and they are chosen for the action itself: `bounds` has one entry per position, `candidates` judges every slot against them, and the chosen slots lead the action's `inputStreams`, ahead of the ones its settings name. |
| `count` | `integer \| null` | yes | How many inputs the action takes, or null for any number. For `attaches: positional`, how many are chosen for the action itself. |
| `bounds` | `object[]` | yes | What each input must hold. With a `count`, one entry per position, in order. Without one, a single entry every position shares. |
| `actionScopedTo` | `object \| null` | yes | The fan-out or loop the action runs inside, as it is saved. Null when it runs outside both, or is not saved yet. |
| `candidates` | `object[]` | yes | Every slot the action could read: earlier actions' outputs, then the flow's inputs, then the platform's. |

Each item of `bounds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `rule` | `"contract" \| "file" \| "list" \| "none" \| "unresolved"` | yes | `contract` — the function declares the shape. `list` — a fan-out's one input, a list of any item type; `words` says what else it must be. `file` — something the action ATTACHES (see `attaches`): a slot holding a file or a list of files, or a field inside one that does. `none` — the function declares nothing. `unresolved` — it declares a shape that could not be read, so no slot was checked against it. |
| `wants` | `object` | yes | The declared shape, for a `contract`; otherwise null. |
| `words` | `string \| null` | yes | What the input must hold, in words, when no declared shape says it — `a list that is always there` for a fan-out. Null otherwise. |

Each item of `candidates`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `slot` | `string` | yes | The slot's name. Store it as this position's `inputStreams` entry. |
| `source` | `object` | yes | Where the value comes from: an earlier action, the flow's own inputs, or the platform. |
| `shape` | `object` | yes | What the slot holds, or null when nothing declares it. |
| `suggested` | `boolean` | yes | The function suggests a slot of this name. |
| `scopedTo` | `object \| null` | yes | The fan-out or loop this slot exists inside — it has a value only within that action's branch or body. Null outside both. |
| `unreachable` | `object \| null` | yes | Why wiring this slot would leave the flow broken, whatever its shape — it would make actions wait for each other in a circle, or mix a fan-out's or loop's values with values from outside it. The save does not refuse such wiring: it keeps it and reports it as an outstanding issue, and the flow's health reports an error until it is resolved; the flow still runs, wrongly. Null when nothing stands in the way. Judged as if the slot were the action's only input — beside the ones its settings already name, for `attaches: positional`. |
| `verdicts` | `object[]` | yes | Whether the slot fits each entry of `bounds`, in the same order. For an `unreachable` slot only the slot itself is judged: the fields inside it are not walked, so `reach-in` never appears there. |

### `POST /v1/actions/interpolate`

Render one action's prompt against slot values you type, with no model call — free, at EDITOR. The same render calling the model: `POST /v1/actions/preview`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this action is being authored into. It decides who may render the prompt; nothing here is billed, so it names no payer. |
| `functionKey` | `string` | yes | Which action type to render as. ⚠️ No model is called whatever this says — it decides only whether `{{#slot}}` sections iterate, so the text that comes back is exactly what that action type would have produced. |
| `promptTemplate` | `string` | yes | The prompt to interpolate. |
| `systemPrompt` | `string \| null` | no | A system prompt, interpolated against the same values. Only read by action types that accept one — supplying it elsewhere is ignored rather than an error. |
| `slotValues` | `object` | no | The values to interpolate, keyed by slot name. Deliberately unvalidated here — supply whatever the action's inputs would be. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The prompt after interpolation — exactly what the model would receive. |
| `latencyMs` | `number` | yes | How long the render took, in milliseconds. |

### `POST /v1/actions/preview`

Run ONE action's prompt against slot values you type — for `text.generate` it calls the model, which is billed (ADMIN). The free render with no model call: `POST /v1/actions/interpolate`. A whole flow against real inputs: `POST /v1/flows/{id}/preview`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this action is being authored into. It decides who may run the preview, which project's models are available, and who is billed for it. |
| `project` | `string` | no | The node id of the project an action of a platform flow previews as — required there, since a platform flow belongs to no project, and the platform pays for the call. Refused for an action of a project's own flow. Requires EDITOR on it. |
| `functionKey` | `string` | yes | Which action type to simulate. ⚠️ It decides whether a MODEL IS ACTUALLY CALLED — `text.generate` calls one and bills for it, while the others just interpolate. It also decides whether `{{#slot}}` sections iterate, so a mismatch here renders arrays differently than the real run will. |
| `taskKey` | `string` | no | Which task preset supplies the model, when one is called. Omit it and the preview uses `extraction` — the task an action created without one starts on. |
| `promptTemplate` | `string` | yes | The prompt to interpolate. |
| `systemPrompt` | `string \| null` | no | A system prompt, interpolated against the same values. Only read by action types that accept one — supplying it elsewhere is ignored rather than an error. |
| `slotValues` | `object` | no | The values to interpolate, keyed by slot name. Deliberately unvalidated here — supply whatever the action's inputs would be. |
| `attachments` | `object` | no | Files to attach beside the prompt, keyed by the slot the action reads them from. Each value is the ids of files this project holds, in the order that slot's wires are in — never storage keys. |
| `modelIdOverride` | `string \| null` | no | Try a specific model instead of the task preset's. Null or omitted uses the preset. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The prompt after interpolation — exactly what the model would receive. |
| `response` | `string \| null` | yes | What the model said, when one was called. For an action type that does not call a model this is the interpolated prompt instead, because that text IS its answer. |
| `tokensIn` | `number \| null` | yes | Tokens sent. NULL MEANS NO MODEL WAS CALLED, which is a different thing from a call that used zero. |
| `tokensOut` | `number \| null` | yes | Tokens returned. Null when no model was called. |
| `latencyMs` | `number` | yes | How long the preview took, in milliseconds. |
