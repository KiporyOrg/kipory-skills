<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: a22b93e6cbba · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Skills (flow steps)

In the API a skill is one step of a flow: a handler key, its config, what it reads and the slot it writes. Skill writes return 2xx with `outstandingIssues`; only a skill-level error refuses a save.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/skills`](#get-v1-skills) |  |
| `POST` | [`/v1/skills`](#post-v1-skills) |  |
| `GET` | [`/v1/skills/{id}`](#get-v1-skills-id) |  |
| `PATCH` | [`/v1/skills/{id}`](#patch-v1-skills-id) |  |
| `DELETE` | [`/v1/skills/{id}`](#delete-v1-skills-id) |  |
| `POST` | [`/v1/skills/{id}/duplicate`](#post-v1-skills-id-duplicate) |  |
| `POST` | [`/v1/skills/batch`](#post-v1-skills-batch) |  |
| `POST` | [`/v1/skills/preview`](#post-v1-skills-preview) |  |
| `GET` | [`/v1/skills/rename-preview`](#get-v1-skills-rename-preview) |  |
| `POST` | [`/v1/skills/replace`](#post-v1-skills-replace) |  |
| `POST` | [`/v1/skills/validate-draft`](#post-v1-skills-validate-draft) |  |

### `GET /v1/skills`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | Flow whose skills to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skills` | `object[]` | yes | Skills in the flow, enabled or not. |

### `POST /v1/skills`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | Flow this skill will belong to. |
| `name` | `string` | yes | Slug-case name, e.g. `summarize` or `common.summarize`. Lowercase letters, digits and hyphens; dots optionally group segments. |
| `description` | `string \| null` | no | Free-text note about what this skill does. Not executed. |
| `handlerKey` | `string` | yes | Which system handler runs this skill (see `GET /v1/handlers`). It determines what `handlerConfig` may contain. |
| `handlerConfig` | `unknown` | no | Handler-specific settings, shaped by `handlerKey`. |
| `condition` | `unknown` | no | Guard evaluated before the skill runs. Unsatisfied means skipped, not failed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier skills that feed this one, in order. This is the reference list `inputSchemas`, `inputPaths` and `inputProjectionNames` align to — all of them must be the same length as this, or the write is refused. |
| `outputSlot` | `string` | yes | Slot this skill writes its result to. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed handlers, with inputs interpolated. |
| `systemPrompt` | `string \| null` | no | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak"` | yes | Task this skill bills and resolves its model under. One of the writable pipeline tasks. |
| `outputSchema` | `object` | no | Schema the skill's output must conform to. Omit or send null for no constraint. |
| `inputSchemas` | `object[]` | yes | Expected shape of each input, POSITIONALLY ALIGNED with `inputStreams` and required to be the same length. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `enabled` | `boolean` | no | Whether the skill executes. Defaults to enabled. |
| `modelId` | `string \| null` | no | AiModel id this skill's AI call runs on. Omit (or send null) to inherit the model bound to this skill's taskKey at /platform/models — the project's AiTaskConfig row for that task, else the system default. Set an explicit id only to pin this skill to one model; it must name a row in the AiModel catalog. |
| `timeoutMs` | `integer \| null` | no | Per-skill time limit in milliseconds, up to 120000. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skill` | `object` | yes | The skill as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |

### `GET /v1/skills/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Skill id — the address for every skill verb. |
| `flow` | `string` | yes | Flow this skill belongs to. |
| `name` | `string` | yes | Dotted slug naming the skill, e.g. `common.summarize`. Other skills and the flow's wiring refer to it by this name. |
| `description` | `string \| null` | yes | Free-text note about what this skill does. Not executed. |
| `handlerKey` | `string` | yes | Which system handler runs this skill (see `GET /v1/handlers`). It determines what `handlerConfig` may contain. |
| `handlerConfig` | `unknown` | no | Handler-specific settings. The accepted shape is defined by `handlerKey`. |
| `condition` | `unknown` | no | Guard evaluated before the skill runs. When it is not satisfied the skill is skipped rather than executed. |
| `inputStreams` | `string[]` | yes | Output slots of earlier skills that feed this one. These edges order the flow — a skill runs once its inputs are available. |
| `outputSlot` | `string` | yes | Slot this skill writes its result to. Downstream skills name it in their `inputStreams`. |
| `promptTemplate` | `string` | yes | Prompt body for model-backed handlers, with inputs interpolated. Ignored by handlers that do not call a model. |
| `systemPrompt` | `string \| null` | yes | System-role instruction sent alongside `promptTemplate`. |
| `taskKey` | `string` | yes | Task this skill bills and resolves its model under, so a project can point a whole class of skills at one model. |
| `outputSchema` | `unknown` | no | Expected shape of this skill's output. A result that does not conform fails rather than being written to the slot. |
| `inputSchemas` | `unknown` | no | Expected shapes of this skill's inputs, checked before it runs. |
| `inputPaths` | `unknown` | no | Per-input path expressions selecting a leaf out of a composite input, so a skill can consume one field of an upstream slot rather than the whole value. |
| `inputProjectionNames` | `unknown` | no | Names the projected inputs are exposed under inside the prompt, when they should differ from the source slot names. |
| `enabled` | `boolean` | yes | Whether this skill executes. A disabled skill stays in the flow and is reported as skipped. |
| `modelId` | `string \| null` | yes | Model this skill is pinned to, or null to use the one its `taskKey` resolves to. |
| `timeoutMs` | `integer \| null` | yes | Per-skill time limit. The run's own limit still applies and is the shorter of the two. |
| `version` | `integer` | yes | Optimistic-lock version. Send it back on a write to be refused on a concurrent edit rather than overwriting one. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/skills/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `capturedVersion` | `integer` | yes | The `version` you last read. Required — the write is refused if the skill has changed since, so an edit cannot silently overwrite one made in another tab. |
| `overwriteConcurrentEdit` | `boolean` | no | Skip the optimistic-lock pre-check, and NOTHING ELSE. A stale `capturedVersion` is accepted rather than refused with a 409, so a concurrent edit is overwritten — that is the whole of what this does. It has no effect on validation: blocking errors are refused either way, warnings never blocked a save in the first place, and a `unique-collision` 409 will NOT clear (the index is still there). |
| `name` | `string` | no | New slug-case name, dotted or not. |
| `description` | `string \| null` | no | Free-text note about what this skill does. |
| `handlerKey` | `string` | no | Change which system handler runs this skill. |
| `handlerConfig` | `unknown` | no | Handler-specific settings, shaped by `handlerKey`. |
| `condition` | `unknown` | no | Guard evaluated before the skill runs. |
| `inputStreams` | `string[]` | no | Replacement input list. If you send this together with `inputSchemas`, the two must be the same length. |
| `outputSlot` | `string` | no | New output slot. Renaming one is what `renames` cascades to referencing siblings. |
| `promptTemplate` | `string` | no | New prompt body. |
| `systemPrompt` | `string \| null` | no | New system-role instruction. |
| `taskKey` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak"` | no | Change the task this skill bills and resolves its model under. |
| `outputSchema` | `object` | no | Schema the skill's output must conform to. |
| `inputSchemas` | `object[]` | no | Expected shape of each input, aligned with `inputStreams` and the same length as it. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `enabled` | `boolean` | no | Whether the skill executes. |
| `modelId` | `string \| null` | no | AiModel id this skill's AI call runs on. Omit (or send null) to inherit the model bound to this skill's taskKey at /platform/models — the project's AiTaskConfig row for that task, else the system default. Set an explicit id only to pin this skill to one model; it must name a row in the AiModel catalog. |
| `timeoutMs` | `integer \| null` | no | Per-skill time limit in milliseconds, up to 120000. |
| `confirmedOutputSlotRenames` | `object[]` | no | Confirm output-slot renames and cascade them. Every sibling skill referencing an old name is rewritten to the new one in the same transaction. A skill may rename several slots at once, so this is a list. Omit it and a rename leaves referencing siblings pointing at a slot that no longer exists. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skill` | `object` | yes | The skill as saved. |
| `outstandingIssues` | `object[]` | yes | Non-blocking warnings that rode along with the save. Empty when there were none. |
| `rewrite` | `object` | no | Present only when the write carried a confirmed output-slot rename that cascaded to referencing siblings — the blast radius of a rename, reported rather than left to be discovered. |

### `DELETE /v1/skills/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The step's id, as returned when it was created or listed. Steps are addressed globally, not under their flow. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedSkillName` | `string` | yes | Name of the skill that was removed. |

### `POST /v1/skills/{id}/duplicate`

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

### `POST /v1/skills/batch`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | Flow every item in this batch belongs to. |
| `creates` | `object[]` | no | Skills to add. |
| `updates` | `object[]` | no | Skills to change. Each carries its own `capturedVersion`, so one stale item refuses the whole batch. |
| `deletes` | `object[]` | no | Skills to remove. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `created` | `object[]` | yes | Skills that were added. |
| `updated` | `object[]` | yes | Skills that were changed. |
| `deletedIds` | `string[]` | yes | Ids of the skills removed. |
| `outstandingIssues` | `object[]` | yes | Warnings about the resulting graph. The batch applied — anything blocking would have rolled the whole transaction back instead. |

### `POST /v1/skills/preview`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this step is being authored into. It decides who may run the preview, which project's models are available, and who is billed for it. |
| `handlerKey` | `string` | yes | Which step type to simulate. ⚠️ It decides whether a MODEL IS ACTUALLY CALLED — `text.generate` calls one and bills for it, while the others just interpolate. It also decides whether `{{#slot}}` sections iterate, so a mismatch here renders arrays differently than the real run will. |
| `taskKey` | `string` | yes | Which task preset supplies the model, when one is called. |
| `promptTemplate` | `string` | yes | The prompt to interpolate. |
| `systemPrompt` | `string \| null` | no | A system prompt, interpolated against the same values. Only read by step types that accept one — supplying it elsewhere is ignored rather than an error. |
| `slotValues` | `object` | no | The values to interpolate, keyed by slot name. Deliberately unvalidated here — supply whatever the step's inputs would be. |
| `modelIdOverride` | `string \| null` | no | Try a specific model instead of the task preset's. Null or omitted uses the preset. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The prompt after interpolation — exactly what the model would receive. |
| `response` | `string \| null` | yes | What the model said, when one was called. For a step type that does not call a model this is the interpolated prompt instead. |
| `tokensIn` | `number \| null` | yes | Tokens sent. NULL MEANS NO MODEL WAS CALLED, which is a different thing from a call that used zero. |
| `tokensOut` | `number \| null` | yes | Tokens returned. Null when no model was called. |
| `latencyMs` | `number` | yes | How long the preview took, in milliseconds. |

### `GET /v1/skills/rename-preview`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow the slot lives in. Flow-addressed rather than step-addressed because the step doing the renaming may not be saved yet. |
| `oldSlotName` | `string` | yes | The slot name as it stands. |
| `newSlotName` | `string` | yes | What you propose to call it. |
| `excludeSkillId` | `string` | no | The step doing the renaming. Its own output is not counted as a collision — omit it and a step renaming its own slot collides with itself. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `legal` | `boolean` | yes | Whether the write would accept this rename. Equivalent to `refusals` being empty; carried as its own field so a caller need not treat an empty array as a verdict. |
| `refusals` | `object[]` | yes | Every reason the rename would be refused. Empty means the write would accept it. |
| `skillsAffected` | `integer` | yes | How many steps reference the old slot. ⚠️ NOT necessarily the `rewrite.rewrittenCount` the write reports back: that figure also counts steps whose declared input types the write re-derived, which is a separate cascade this read does not model. This number is the steps whose slot NAMES would be rewritten, and the write uses the same scan to find them. |
| `sitesAffected` | `integer` | yes | How many individual references across those steps — a step naming the slot in two places counts twice. |
| `reports` | `object[]` | yes | Per step, every place the old slot is named. Steps with no reference are omitted, so an empty array means nothing reads it. |

### `POST /v1/skills/replace`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | Flow whose skills are being replaced. |
| `skills` | `object[]` | yes | The complete new set of skills for the flow. ⚠️ This REPLACES the graph — any existing skill not present here is removed. Send an edit as a batch instead if you only mean to change part of it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skills` | `object[]` | yes | The flow's skills after the replace. |
| `replacedCount` | `integer` | yes | How many existing skills the replace removed. |
| `outstandingIssues` | `object[]` | yes | Warnings about the new graph. Blocking problems refuse instead. |

### `POST /v1/skills/validate-draft`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this step is being authored into. The authorization anchor, and the reason no step id is needed — the step may not exist yet. |
| `handlerKey` | `string` | yes | Which handler the draft has selected. An unrecognised key is a 422, not an empty result: a client asking about a handler this deployment does not have is a client working from a stale catalog. |
| `handlerConfig` | `unknown` | no | The draft's handler configuration, exactly as the editor holds it — raw, not schema-parsed. Slot-bearing fields are operator-typed strings, so the raw and parsed forms name the same slots. OMITTING it is legal and means the same as `{}`: the draft is validated as an unconfigured step, so a handler that requires configuration answers with INVALID_HANDLER_CONFIG rather than refusing the request. |
| `inputStreams` | `string[]` | no | The draft's currently wired input slots, IN ROW ORDER — the list the two fields below are positionally aligned with. Send it whenever the step has wiring; absent is treated as none wired. |
| `inputPaths` | `object \| null[] \| null` | no | Per-input path expressions, POSITIONALLY ALIGNED with `inputStreams` — entry N selects a leaf out of input N. Null at a position takes that input whole. Send null for the whole field to take every input whole. |
| `inputProjectionNames` | `string \| null[] \| null` | no | Names each input is exposed under inside the prompt, POSITIONALLY ALIGNED with `inputStreams`. Null at a position uses the source slot's own name. |
| `outputSchema` | `unknown` | no | The `SchemaRef` the draft step DECLARES it writes. Optional, and omitting it costs exactly one check: without it the route cannot say whether the expression's result could ever satisfy the declaration, so it stays silent about that. Every other diagnostic is unaffected. Typed `unknown` for the reason every SchemaRef on this plane is — the shape is the type system's, and re-declaring it here would be a second copy to keep in step. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `diagnostics` | `object[]` | yes | Everything wrong with this draft's configuration. An EMPTY LIST means the configuration is well-formed — it does NOT mean the step will save, because graph-level rules (dangling slots, cycles) are not asked here. See `GET /v1/flows/{id}/health` for those. |
| `derivedInputStreams` | `string[] \| null` | yes | The input slots this configuration NAMES, sorted — the same list the save pins onto the step, PROVIDED you sent the wiring columns below for a step that has them. NULL IS NOT AN EMPTY LIST, and it has THREE causes, told apart by `derivedFrom` plus `diagnostics`: the inputs come from the step row (`row`); the handler derives them from a prompt template, which this route does not yet answer for (`template`); or a check failed, so any list would have been read off a config that did not parse (`handler-config` WITH a non-empty `diagnostics`). An empty ARRAY means the config was read and names no slots. |
| `derivedFrom` | `"row" \| "handler-config" \| "template"` | yes | How to READ `derivedInputStreams` above — nothing more. `handler-config` means this route CAN derive from the config; the list is then the authoritative set that config names — but it is still null when `diagnostics` is non-empty, because a config that did not parse names nothing knowable. ⛔ SO `handler-config` IS NOT A NON-NULL GUARANTEE: check `diagnostics` first, or check the list for null. `row` and `template` always mean null, and say which reason. ⚠️ THIS IS NOT THE FIELD THAT DECIDES WHETHER TO SHOW AN INPUT PICKER. That is `editor.inputStreams` on the handler catalog, and the two answer DIFFERENT questions: this one reports which source this route could derive from (a handler's `freeFormInput` bag), that one reports whether the step row is where the operator wires inputs. They disagree for 7 of 69 handlers — `flow.merge` and `flow.invoke` hide the picker while deriving nothing here; `entity.count` shows it while naming slots in config. Branch the UI on the catalog field. |
