<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Function catalog and model reads

The catalog of what an action can run, each function's worked example, the task→model bindings a node sets and a project resolves, and what each model costs at that node. Confirm every function key here, never from memory.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/ai-models`](#get-v1-ai-models) |  |
| `GET` | [`/v1/functions`](#get-v1-functions) |  |
| `GET` | [`/v1/functions/{key}`](#get-v1-functions-key) |  |
| `POST` | [`/v1/functions/missed-searches`](#post-v1-functions-missed-searches) |  |
| `GET` | [`/v1/nodes/{nodeId}/model-prices`](#get-v1-nodes-nodeid-model-prices) |  |
| `GET` | [`/v1/nodes/{nodeId}/routing`](#get-v1-nodes-nodeid-routing) |  |
| `PUT` | [`/v1/nodes/{nodeId}/routing/{modelId}`](#put-v1-nodes-nodeid-routing-modelid) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/routing/{modelId}`](#delete-v1-nodes-nodeid-routing-modelid) |  |
| `GET` | [`/v1/nodes/{nodeId}/task-models`](#get-v1-nodes-nodeid-task-models) |  |
| `PUT` | [`/v1/nodes/{nodeId}/task-models/{task}`](#put-v1-nodes-nodeid-task-models-task) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/task-models/{task}`](#delete-v1-nodes-nodeid-task-models-task) |  |
| `GET` | [`/v1/nodes/{nodeId}/vendor-prices`](#get-v1-nodes-nodeid-vendor-prices) |  |

### `GET /v1/ai-models`

The AI models this deployment supports and what each can do, optionally narrowed by `type`; the ids are the ones an action or embedding profile accepts. Which provider account a model's calls go to at a node is `GET /v1/nodes/{nodeId}/routing`; which model a task uses there is `GET /v1/nodes/{nodeId}/task-models`. Any signed-in caller.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"chat" \| "embedding" \| "transcription" \| "rerank" \| "decision"` | no | Narrow to one capability class. Omit for the whole catalog. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `models` | `object[]` | yes | Every model this deployment supports, ordered by `modelId`. Models an operator has disabled are absent, not listed as unavailable. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The id to write into an action's `modelId` or an embedding profile's `modelId`, spelled `creator/model` — e.g. `anthropic/claude-opus-4-6`. Those writes validate against this same catalog, so an id from this response is one they will accept. It is NOT the id a vendor takes on its own API; the platform translates when it dispatches. |
| `creator` | `string` | yes | Who made the model — `openai`, `anthropic`, `meta`. Not necessarily an account this deployment holds: a model reached through a gateway has a creator the platform has no relationship with. |
| `displayName` | `string` | yes | Human label for a picker, e.g. “GPT-4o mini”. |
| `description` | `string \| null` | yes | When to reach for this model, when the catalog row says. Null when no guidance has been written. |
| `offers` | `object[]` | yes | Where this deployment can obtain the model. A model served by its creator and by a gateway lists both; the platform chooses, and the choice does not change what the model is or what you write. What you pay is `GET /v1/nodes/{nodeId}/model-prices`. |
| `type` | `"chat" \| "embedding" \| "transcription" \| "rerank" \| "decision"` | yes | Capability class. Determines which actions can run on the model, and whether the embedding fields below are populated. |
| `contextWindow` | `integer \| null` | yes | Total token budget the model accepts (prompt + completion). Null when the vendor declares none in tokens — audio models are priced per minute and have no token budget. |
| `maxOutputTokens` | `integer \| null` | yes | Maximum completion tokens. Null when undeclared, and always null on embedding and rerank models, which produce no completion. |
| `knowledgeCutoff` | `string \| null` | yes | Training-data cutoff as `YYYY-MM`; null when the vendor has not declared one. |
| `releasedAt` | `string \| null` | yes | The vendor's release date as `YYYY-MM-DD`; null when unknown. |
| `inputModalities` | `string[]` | yes | Accepted input modalities, e.g. `[“text”, “image”]`. |
| `outputModalities` | `string[]` | yes | Produced output modalities, e.g. `[“text”]`. |
| `supportsVision` | `boolean` | yes | Accepts image inputs — `image` is among `inputModalities`. An action wired to a file input slot needs this. |
| `supportsVideo` | `boolean` | yes | Accepts video file inputs — `video` is among `inputModalities`. |
| `supportsJson` | `boolean` | yes | Supports structured output — required to give a generation action an output schema. |
| `supportsFunctionCalling` | `boolean` | yes | Supports provider-side tool/function calling. |
| `supportsTemperature` | `boolean` | yes | The model accepts a `temperature`. FALSE means the platform REMOVES any temperature set on an action before the call — the model is not asked for one and no error is raised. |
| `canReason` | `boolean` | yes | The model can spend hidden reasoning tokens before it answers. The `reasoning` task may only bind to a model where this is true. |
| `reasoningEfforts` | `string[]` | yes | The effort levels the vendor accepts for that reasoning, in the vendor's own words (`low`, `medium`, `high`, …). `none` is listed when reasoning can be switched off, and only then may an action ask for `none`. Empty when the model has no dial, including models that reason at a fixed depth. |
| `reasoningEffortHonoured` | `boolean` | yes | A `reasoningEffort` set on an action or a task binding is SENT to this model. FALSE means a level is not sent and the model runs at `defaultReasoningEffort` whatever is set, and `none` is refused — choose another model if the effort matters. |
| `defaultReasoningEffort` | `string \| null` | yes | What the model runs at when NO effort is sent — an action and its binding that leave `reasoningEffort` out get this, and its reasoning is billed as output tokens. In the vendor's words; `none` for a model that does not reason unless asked. `null` when the platform does not know it. |
| `embeddingDimensions` | `integer \| null` | yes | Output dimension count. Non-null exactly on embedding models. |
| `embeddingDistance` | `"Cosine" \| "Dot" \| "Euclid" \| null` | yes | Distance metric the embedding space was trained for. An embedding profile derives its collection geometry from this and `embeddingDimensions`, so null means the row is not yet complete enough to bind a profile to. |
| `status` | `string` | yes | `active`, or `deprecated` when the vendor has announced a retirement. A model this deployment has decided to stop serving is absent from the catalog rather than labelled here. |
| `deprecatedAt` | `string \| null` | yes | The retirement date the vendor published, as `YYYY-MM-DD` — possibly in the future. Non-null means: still runnable and still referenced by existing actions, but going away — migrate off it. A model that is no longer usable at all is absent from this catalog rather than dated here. Null when the vendor has announced nothing. |
| `successorModelId` | `string \| null` | yes | What to migrate to, once somebody has named one — an id from this same catalog. Null when no successor has been chosen, which is the usual state even for a deprecated model. |

### `GET /v1/functions`

Every function this deployment runs — what each reads, emits and accepts as config — with a `version` hash to cache on. Pass `?project=` to have each function's declared types resolved against that project's type registry (VIEWER on the project), which is what an action editor needs when picking a function; without it the catalog is the same for every caller. One function with its worked example is `GET /v1/functions/{key}`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Resolve each function's declared types against this project's type registry — its id, as `POST /v1/projects` answered it. Omit for the deployment's catalog alone. Requires VIEWER on the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the catalog — a stable cache key. Two deployments serving the same functions hash identically, and any change (a new function, a config field, a copy edit) changes it. |
| `hashes` | `object` | yes | One content hash per function key, over what `GET /v1/functions/{key}` answers. A function's hash moves only when that function changes, so a cached copy of one function can be checked without re-reading the rest. |
| `functions` | `object[]` | yes | Every function this deployment registers, sorted by key. With `?project=`, each also carries `inputContract`, `variadicInputContract`, `staticOutputSchema`, `contractUnresolved`, `configDefaults`, `configDefaultsValid` and `freeFormInput`, resolved against that project's types; without it those are absent. |
| `groups` | `object[]` | yes | Every picker group, IN DISPLAY ORDER, with the one sentence that says what it is for. Order is meaningful: it runs roughly from what a flow produces toward what it is plumbed with. |
| `valueKinds` | `object[]` | yes | The whole closed list of value kinds, each with its words, its parent and the type it sits on. Every kind named anywhere in this response is one of these. |
| `expressionFunctions` | `object[]` | yes | Every function the platform adds to JSONata, callable in any expression a flow holds and in a table's computed-field formulas. Besides these, every JSONata 2.2 function works except the ones in `forbiddenExpressionFunctions`. |
| `forbiddenExpressionFunctions` | `object[]` | yes | JSONata functions an expression may not call: a save naming one is refused. |
| `askAi` | `object` | yes | The function for free instructions, named by the platform. |

Each item of `functions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The function's key — the value an action's `functionKey` stores to select it. |
| `title` | `string` | yes | Its display name. |
| `description` | `string` | yes | What it does. |
| `detailedDescription` | `string` | yes | What the one sentence in `description` left out: caveats, cost, failure and ordering. A short paragraph, drawn apart from `description`. |
| `icon` | `string` | yes | A name for the glyph that stands for this function, authored beside it on its own descriptor. An OPEN vocabulary: a client resolves it through a table with a fallback and must render something for a name it does not know. |
| `group` | `"ai" \| "text" \| "sources" \| "files" \| "search" \| "records" \| "outbound" \| "flow" \| "utility"` | yes | The picker group it belongs to — one of `groups[]`. |
| `phase` | `"ingest" \| "inline" \| "control"` | yes | When in a run this function executes. It constrains where an action using it can sit in a flow. |
| `effectClass` | `"read" \| "idempotent-side-effect" \| "record-mutation"` | yes | What kind of effect running it has — whether it writes anything durable, and what. Whether a re-run repeats the write is `run.retry`. |
| `editor` | `object` | yes | What an action editor must ask the operator for this function: which work surface to show, whether a prompt and a model are required, and where this function's inputs and output slot come from. Always fully populated — a function that declares nothing is served the platform defaults, so a client never applies a default of its own. |
| `glance` | `object` | yes | What goes in, what the action does, what comes out — in plain words. |
| `groupWord` | `string` | yes | The word this function's group is shown by ("Tables" for `records`), the same as on `groups[]`. |
| `searchWords` | `string[]` | yes | The words a customer types for what this function does — tasks, outcomes, everyday terms. Match them to find a function by intent; they may be shown. |
| `searchProductNames` | `string[]` | yes | Other products' names a customer may type for what this function does ("chatgpt"). Match them; never show them. Empty when none. |
| `essentials` | `object[]` | yes | The settings that matter, in reading order: every required one, then those that change the result. Empty when none is worth a card. |
| `emits` | `string` | no | What it produces, in prose. |
| `reads` | `string` | no | What it consumes, in prose. |
| `inputHint` | `string` | no | A short hint at the input shape — "string", "file", "slot map". |
| `suggestedInputStreams` | `string[]` | yes | The input wiring suggested when an action picks this function. A starting point, not a constraint. |
| `requiredApiKey` | `string` | no | The vendor key this function needs at run time, as a phrase to read ("a Firecrawl API key"). Present means the function CANNOT run without one: the project's own, stored in its secrets, or the platform's. The exact credential to store is `credential`. |
| `externalDep` | `object` | no | An outside service this function depends on, when it needs one. |
| `followsTaskModel` | `boolean` | yes | True when the model this function runs on is decided by the action's `taskKey` binding, so changing that binding moves this action. False when the function uses no model at all, or picks one a task binding cannot move. |
| `attachesFiles` | `boolean` | yes | True when this function attaches a file-shaped input to what the model is sent — no `{{placeholder}}` names it, and the action's prompt is not where it is wired. False when a file input is refused outright, and for every function that calls no model. |
| `templateFilters` | `object[]` | yes | The `{{slot\|filter}}` suffixes this function's templates may use, sorted by name and already narrowed to what its own save would accept. A function that caches its results omits the clock-reading filters. |
| `config` | `object[]` | yes | The settings an action using this function can tune. Empty for functions with nothing to configure. |
| `configConstraints` | `object[]` | no | Rules about SEVERAL config settings at once, which no single field carries. Absent means this function declares none. The platform checks the same list when an action is saved. |
| `configOutputSlots` | `object[]` | no | Where this function's config names the slots the action WRITES. Absent means the config names none and the action's own output slot is the whole answer. ⚠️ Each value there is a slot NAME other actions read, not free text. |
| `io` | `object` | yes | Input and output as comparable tokens, beside the prose in `reads` / `emits`. |
| `rateLimit` | `object` | no | How fast it may call upstream, and whose allowance that spends. Absent means it declares no limit and counts into no bucket -- which is NOT the same as being free. |
| `credential` | `object` | no | The secret-vault credential this function resolves before calling its vendor. Absent means it asks the vault for nothing -- true of every pure-CPU function, and ALSO of the AI ones: a model call runs on the platform's own key for its provider, and no project can bring one. For a function whose vendor is chosen per action, the DEFAULT vendor's -- see `providers`. |
| `charges` | `object` | no | The vendor operations an action on this function is charged under, beside its compute. Absent means it bills no vendor fetch — true of every pure-CPU function and of the AI ones, whose model calls are priced by `GET /v1/nodes/{nodeId}/model-prices`. An action spending a stored vendor key is not charged these. For a function whose vendor is chosen per action, the DEFAULT vendor's — see `providers`. |
| `actionCredential` | `object` | no | Present when an ACTION may name a stored secret of its own. Unlike `credential`, the purpose is the author's: store a secret of this type under any purpose, and write that purpose in the config field. The stored secret says where in the request it goes and which hosts may receive it. |
| `providers` | `object` | no | Present only when each action chooses the vendor (`functionConfig.provider`): every vendor it may name and the credential each spends. Absent means the function has one vendor, the one `credential` names. |
| `queue` | `object` | no | Retry and cache policy. Present only for `ingest` functions; an inline or control function runs in the pipeline with neither. |
| `run` | `object` | yes | How an action using this function is run: what its time limit bounds, where the default comes from, and any limit the function keeps whatever the action says. Always present. |
| `inputContract` | `object[] \| null` | no | The structural bound on each input position, resolved against this project's registry. Position N bounds `inputStreams[N]`. Null means the function declares no contract — every position is unconstrained. Distinguish that from `contractUnresolved` below, which means the function DOES declare one and it could not be computed. |
| `variadicInputContract` | `object \| null` | no | The bound every input position must satisfy, for a function that takes any number of same-shaped inputs. Null when the function is not variadic. Mutually exclusive with `inputContract` in practice. |
| `staticOutputSchema` | `object \| null` | no | What this function emits in this project BEFORE any wiring — its output resolver asked with no inputs and no config. Null for a function whose output type mirrors an input (it cannot be known until wired) and for one that writes no output slot at all. |
| `contractUnresolved` | `boolean` | no | True when a declared resolver THREW while being asked — a dangling library type, normally a platform defect. The three fields above are null in that case for a different reason than 'not declared', and a picker must not silently stop filtering: say the check could not run. |
| `configDefaults` | `unknown` | no | The function's config with every default applied — what an action gets if it sends no `functionConfig` at all. Shaped by `config` above. |
| `configDefaultsValid` | `boolean` | no | Whether those defaults actually satisfy the function's own config schema. False means the function declares a required field with no default, so an action using it MUST send config; it is not an error. |
| `freeFormInput` | `object \| null` | no | How this function takes slot references through its config rather than through input positions. Null for the ordinary positional function. |

Each item of `groups`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `group` | `"ai" \| "text" \| "sources" \| "files" \| "search" \| "records" \| "outbound" \| "flow" \| "utility"` | yes | The group this sentence is about. |
| `word` | `string` | yes | The word the group is shown by ("Tables"); typing it finds the group's functions. |
| `note` | `string` | yes | What this group is for, in one sentence, at any size. |

Each item of `valueKinds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `"text" \| "long-text" \| "search-phrase" \| "language-code" \| "country-code" \| "region-code" \| "email-address" \| "handle" \| "id" \| "record-id" \| "user-id" \| "video-id" \| "place-id" \| "web-address" \| "file-address" \| "image-address" \| "post-link" \| "profile-link" \| "ad-link" \| "date" \| "file" \| "image" \| "audio" \| "video" \| "document" \| "number" \| "count" \| "money" \| "boolean"` | yes | A value kind's key, one of the catalog's `valueKinds`. |
| `words` | `string` | yes | What an author reads: `a web address`. |
| `parent` | `"text" \| "long-text" \| "search-phrase" \| "language-code" \| "country-code" \| "region-code" \| "email-address" \| "handle" \| "id" \| "record-id" \| "user-id" \| "video-id" \| "place-id" \| "web-address" \| "file-address" \| "image-address" \| "post-link" \| "profile-link" \| "ad-link" \| "date" \| "file" \| "image" \| "audio" \| "video" \| "document" \| "number" \| "count" \| "money" \| "boolean" \| null` | yes | The kind this one is a case of; `null` for a root. |
| `base` | `"string" \| "file" \| "number" \| "boolean" \| "object" \| "list"` | yes | The type the kind sits on; a child sits on its parent's. |
| `scoped` | `boolean` | yes | Whether the kind takes a network (an Instagram handle). |

Each item of `expressionFunctions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The name, without the `$`: `hostOf`. |
| `family` | `"value" \| "list" \| "text" \| "url" \| "date" \| "locale" \| "parse" \| "term" \| "format"` | yes | What kind of work it does. |
| `usage` | `string` | yes | How a call reads: `$formatDate(date, pattern, [locale], [timeZone])`; optional arguments in brackets. |
| `signature` | `string` | yes | Its JSONata signature string (`<(sla)-:s>`): the types each argument takes and the type it answers. |
| `description` | `string` | yes | What it does, in one line. |
| `absent` | `string` | yes | What it answers when its first argument has no value: missing, null, empty text or an empty list. |
| `examples` | `object[]` | yes | Worked calls, each checked against the real evaluator. |

Each item of `forbiddenExpressionFunctions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The JSONata function, without the `$`. |
| `why` | `string` | yes | Why it is refused, and what to use instead. |

### `GET /v1/functions/{key}`

One function's catalog entry — what it reads, emits and accepts as config, its `group` (lowercase, such as `ai` or `text`) — plus a worked example. An unknown key is a 404.
The whole catalog, without examples, is `GET /v1/functions`; pass `?project=` there to resolve types against one project.
Any authenticated caller; the answer is the same for everyone.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The function key, e.g. `url.scrape`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The function's key — the value an action's `functionKey` stores to select it. |
| `title` | `string` | yes | Its display name. |
| `description` | `string` | yes | What it does. |
| `detailedDescription` | `string` | yes | What the one sentence in `description` left out: caveats, cost, failure and ordering. A short paragraph, drawn apart from `description`. |
| `icon` | `string` | yes | A name for the glyph that stands for this function, authored beside it on its own descriptor. An OPEN vocabulary: a client resolves it through a table with a fallback and must render something for a name it does not know. |
| `group` | `"ai" \| "text" \| "sources" \| "files" \| "search" \| "records" \| "outbound" \| "flow" \| "utility"` | yes | The picker group it belongs to — one of `groups[]`. |
| `phase` | `"ingest" \| "inline" \| "control"` | yes | When in a run this function executes. It constrains where an action using it can sit in a flow. |
| `effectClass` | `"read" \| "idempotent-side-effect" \| "record-mutation"` | yes | What kind of effect running it has — whether it writes anything durable, and what. Whether a re-run repeats the write is `run.retry`. |
| `editor` | `object` | yes | What an action editor must ask the operator for this function: which work surface to show, whether a prompt and a model are required, and where this function's inputs and output slot come from. Always fully populated — a function that declares nothing is served the platform defaults, so a client never applies a default of its own. |
| `glance` | `object` | yes | What goes in, what the action does, what comes out — in plain words. |
| `groupWord` | `string` | yes | The word this function's group is shown by ("Tables" for `records`), the same as on `groups[]`. |
| `searchWords` | `string[]` | yes | The words a customer types for what this function does — tasks, outcomes, everyday terms. Match them to find a function by intent; they may be shown. |
| `searchProductNames` | `string[]` | yes | Other products' names a customer may type for what this function does ("chatgpt"). Match them; never show them. Empty when none. |
| `essentials` | `object[]` | yes | The settings that matter, in reading order: every required one, then those that change the result. Empty when none is worth a card. |
| `emits` | `string` | no | What it produces, in prose. |
| `reads` | `string` | no | What it consumes, in prose. |
| `inputHint` | `string` | no | A short hint at the input shape — "string", "file", "slot map". |
| `suggestedInputStreams` | `string[]` | yes | The input wiring suggested when an action picks this function. A starting point, not a constraint. |
| `requiredApiKey` | `string` | no | The vendor key this function needs at run time, as a phrase to read ("a Firecrawl API key"). Present means the function CANNOT run without one: the project's own, stored in its secrets, or the platform's. The exact credential to store is `credential`. |
| `externalDep` | `object` | no | An outside service this function depends on, when it needs one. |
| `followsTaskModel` | `boolean` | yes | True when the model this function runs on is decided by the action's `taskKey` binding, so changing that binding moves this action. False when the function uses no model at all, or picks one a task binding cannot move. |
| `attachesFiles` | `boolean` | yes | True when this function attaches a file-shaped input to what the model is sent — no `{{placeholder}}` names it, and the action's prompt is not where it is wired. False when a file input is refused outright, and for every function that calls no model. |
| `templateFilters` | `object[]` | yes | The `{{slot\|filter}}` suffixes this function's templates may use, sorted by name and already narrowed to what its own save would accept. A function that caches its results omits the clock-reading filters. |
| `config` | `object[]` | yes | The settings an action using this function can tune. Empty for functions with nothing to configure. |
| `configConstraints` | `object[]` | no | Rules about SEVERAL config settings at once, which no single field carries. Absent means this function declares none. The platform checks the same list when an action is saved. |
| `configOutputSlots` | `object[]` | no | Where this function's config names the slots the action WRITES. Absent means the config names none and the action's own output slot is the whole answer. ⚠️ Each value there is a slot NAME other actions read, not free text. |
| `io` | `object` | yes | Input and output as comparable tokens, beside the prose in `reads` / `emits`. |
| `rateLimit` | `object` | no | How fast it may call upstream, and whose allowance that spends. Absent means it declares no limit and counts into no bucket -- which is NOT the same as being free. |
| `credential` | `object` | no | The secret-vault credential this function resolves before calling its vendor. Absent means it asks the vault for nothing -- true of every pure-CPU function, and ALSO of the AI ones: a model call runs on the platform's own key for its provider, and no project can bring one. For a function whose vendor is chosen per action, the DEFAULT vendor's -- see `providers`. |
| `charges` | `object` | no | The vendor operations an action on this function is charged under, beside its compute. Absent means it bills no vendor fetch — true of every pure-CPU function and of the AI ones, whose model calls are priced by `GET /v1/nodes/{nodeId}/model-prices`. An action spending a stored vendor key is not charged these. For a function whose vendor is chosen per action, the DEFAULT vendor's — see `providers`. |
| `actionCredential` | `object` | no | Present when an ACTION may name a stored secret of its own. Unlike `credential`, the purpose is the author's: store a secret of this type under any purpose, and write that purpose in the config field. The stored secret says where in the request it goes and which hosts may receive it. |
| `providers` | `object` | no | Present only when each action chooses the vendor (`functionConfig.provider`): every vendor it may name and the credential each spends. Absent means the function has one vendor, the one `credential` names. |
| `queue` | `object` | no | Retry and cache policy. Present only for `ingest` functions; an inline or control function runs in the pipeline with neither. |
| `run` | `object` | yes | How an action using this function is run: what its time limit bounds, where the default comes from, and any limit the function keeps whatever the action says. Always present. |
| `example` | `object` | no | The worked example, when this function ships one. |

Each item of `essentials`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `field` | `string` | yes | A top-level config field, or the action column it names: `promptTemplate`, `systemPrompt`, `outputSchema`, `modelId`. |
| `says` | `string` | yes | What it decides, in at most twelve words. |
| `required` | `boolean` | yes | Whether an action cannot be saved without it. |

Each item of `templateFilters`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The filter name, as it is typed after the `\|`. |
| `detail` | `string` | yes | One line on what the filter renders, for a picker to show beside the name. |

Each item of `config`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The config field's name. A nested object surfaces as one field of type `object`; its own fields arrive in `members`. |
| `type` | `string` | yes | A compact type label — `string`, `number`, `boolean`, `string[]`, `object`, `object[]`, `enum` (see `enumValues`), `union` for a field that takes one of several shapes and `union[]` for a list whose items each do (see `options`), or a `\|`-joined list of plain types such as `string \| number \| boolean`. Any of them ends in ` \| null` when the field may be null, as in `enum \| null`; a list whose items take several types reads `(string \| number)[]`. |
| `members` | `object[]` | no | The fields inside, in the order the function declares them — an `object`'s own fields, or the fields of each item of an `object[]`, nullable or not. Absent when the object has no fixed fields, such as a map from names to slots. |
| `options` | `object[]` | no | The shapes a `union` or `union \| null` field may take, or each item of a `union[]` one, one per alternative, in declared order. A fixed value arrives as `value` and an object as its `members`; an alternative that is neither carries both absent. |
| `enumValues` | `string[]` | no | The accepted values, present only when `type` is `enum` or `enum \| null`. |
| `itemEnumValues` | `string[]` | no | The values each item may take, present only when `type` is a list whose items come from a fixed set. |
| `minimum` | `number` | no | The smallest value a number field accepts, itself allowed. Absent when the field declares none. |
| `exclusiveMinimum` | `number` | no | A number field's value must be greater than this. Absent when the field declares none. |
| `maximum` | `number` | no | The largest value a number field accepts, itself allowed. Absent when the field declares none. |
| `exclusiveMaximum` | `number` | no | A number field's value must be less than this. Absent when the field declares none. |
| `required` | `boolean` | yes | Whether an action using this function must set the field. |
| `default` | `string` | no | The default, JSON-ENCODED — so a string default arrives quoted, e.g. "\"auto\"". Absent when the field has no default. |
| `description` | `string` | no | What the field does, when the function's author wrote it down. |
| `refKind` | `"table" \| "vocabulary" \| "flow" \| "relation" \| "field" \| "event" \| "event-category" \| "view"` | no | The kind of project object this field names — a table, a vocabulary, a flow or a relation by key, a field of a table by path, or one half of an event (`event-category` and `event`, two fields of one function that together name one of the project's events). Absent when the field names none. It is the KIND, not an instance: which one is configured per action. |
| `offerAs` | `string` | no | How this function reads with one object of `refKind`, its name in the placeholder: "Save to {table}", "Run {flow}". Offered as a choice when adding an action. Absent on a field that names none. |
| `suggestOnMatchingType` | `true` | no | Set on the one table field whose `offerAs` is suggested for a table whose records have the added value's type. Absent elsewhere. |
| `caution` | `string` | no | What goes wrong if this field is set wrong, and what it costs. Absent when the field carries no such cost. |

Each item of `configConstraints`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"all-or-none"` | yes | Every setting in `fields` is set, or none of them is. |
| `fields` | `string[]` | no | Set all of these, or none of them. |
| `field` | `string` | no | The setting that may have no effect. |
| `when` | `object` | no | The condition under which `field` applies at all. |

Each item of `configOutputSlots`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"name" \| "record-keys" \| "record-values"` | yes | How slot names sit at `path`: the value itself (a string, an object's member, or each list item's member), the KEYS of a map there, or its VALUES. |
| `path` | `string` | yes | The config setting, or `setting.member` for a member of an object or of each item of a list. |

### `POST /v1/functions/missed-searches`

Record a search on a flow's add list that ended with nothing chosen, or with "Ask AI to …": the phrase, the value kind and how it ended. Requires EDITOR on the flow, which is not kept. A phrase of fewer than three letters or digits is refused; the same phrase, value kind and ending again within an hour is accepted and not kept twice; a caller records at most 30 a minute, and past 5000 kept in 24 hours across all callers a record is accepted and not kept. Staff read them with `GET /v1/functions/missed-searches`; matching a request to a function is `GET /v1/functions` (`searchWords`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow whose add list was searched. Checked for EDITOR and not kept. |
| `phrase` | `string` | yes | What was typed: at least 3 letters or digits, no NUL. Kept lowercased, with one space between words, trimmed, its first 200 characters; the same phrase, value kind and ending again within an hour is not kept twice. |
| `valueKind` | `"text" \| "long-text" \| "search-phrase" \| "language-code" \| "country-code" \| "region-code" \| "email-address" \| "handle" \| "id" \| "record-id" \| "user-id" \| "video-id" \| "place-id" \| "web-address" \| "file-address" \| "image-address" \| "post-link" \| "profile-link" \| "ad-link" \| "date" \| "file" \| "image" \| "audio" \| "video" \| "document" \| "number" \| "count" \| "money" \| "boolean" \| null` | yes | The value kind's key the list was opened for (`long-text`), or null. |
| `ending` | `"nothing" \| "ask-ai"` | yes | How the search ended: `nothing` chosen, or "Ask AI to …" (`ask-ai`). |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `recorded` | `true` | yes | Accepted. Kept anonymously, unless the same search was kept within the last hour. |

### `GET /v1/nodes/{nodeId}/model-prices`

What each model in the catalog costs at this node — the price a call made here is charged. The models themselves, with no price, are `GET /v1/ai-models`; which model each task runs on here is `GET /v1/nodes/{nodeId}/task-models`; what a paid fetch — a scrape, a search, a profile read — costs here is `GET /v1/nodes/{nodeId}/vendor-prices`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node to price the catalog for. Prices are the same at every node today. A project's id is its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these prices were resolved for. |
| `prices` | `object[]` | yes | Every ENABLED model's billable operations — the same models `/v1/ai-models` lists. A model appears once per operation it bills. Ordered by address, not by catalog position. |
| `tiers` | `object[]` | yes | Each rated model's price tier, `$` to `$$$` against its kind. Ordered by model id. |

Each item of `prices`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The model this price is for — an id from `GET /v1/ai-models`. |
| `operation` | `string` | yes | The billable operation — `tokens-in`, `tokens-out`, `embed-tokens`, `transcribe-minutes` or `rerank`. A model bills the ones its TYPE declares, never the ones that happen to carry a non-zero rate. |
| `unit` | `"million-tokens" \| "minute" \| "search"` | yes | What `credits` is the price OF. Token operations quote a million tokens, audio a minute and rerank a search. |
| `credits` | `number \| null` | yes | The charged price in credits (1 credit = 1 µUSD) for one `unit`. Always a POSITIVE integer or null; zero is never published. Null means no single per-unit figure describes this address — nothing prices it, the price is zero with no rule choosing that, the price carries a unit allowance or floor the charge applies, or the rate is too small to word at this unit. None of them is a claim that the operation is free. |

Each item of `tiers`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The model rated — an id from `GET /v1/ai-models`. |
| `tier` | `integer` | yes | 1 is the cheapest third of the models billed the same way (chat, embedding, transcription, rerank), 3 the priciest, on a log scale of their charged price here — a chat model by three parts input to one part output. An action is at least a doubling, so models that cost about the same share a rating. A model with no stated price, or alone of its kind, is not rated. |

### `GET /v1/nodes/{nodeId}/routing`

Which provider account each model's calls go to at this node — the nearest routing policy up the tree, per model. Requires **VIEWER**. The platform-wide default is `PUT /v1/model-registry/models/{modelId}/route` (staff); which model a task uses here is `GET /v1/nodes/{nodeId}/task-models`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node. ⚠️ A node id, not a project id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node read. |
| `policies` | `object[]` | yes | Every model a policy routes at this node — the nearest policy up the chain, per model. A model absent here uses the default: its creator's own offer when it is on, else the enabled offer with the lowest provider id, and no failover. |

Each item of `policies`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The model routed, `creator/slug`. |
| `providerOrder` | `string[]` | yes | Provider accounts, first choice first. |
| `failover` | `"none" \| "on-exhaustion"` | yes | `none` — a call uses the first enabled offer and fails if that account cannot serve it. `on-exhaustion` — when the account is out of quota or credit, the call is retried once through each next offer in order; each attempt is its own AI call, billed at the offer that served it. |
| `setHere` | `boolean` | yes | Set on THIS node. False when inherited from an ancestor — `decidedAt` names which. |
| `decidedAt` | `object` | yes | The node whose policy applies here. |

### `PUT /v1/nodes/{nodeId}/routing/{modelId}`

Set this node's routing policy for one model — the provider order and failover — which its descendants inherit. Requires **ADMIN**. The platform-wide route every node falls back to is `PUT /v1/model-registry/models/{modelId}/route` (staff); clearing this node's own policy is `DELETE`. Which model a task uses is `PUT /v1/nodes/{nodeId}/task-models/{task}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node. ⚠️ A node id, not a project id. |
| `modelId` | `string` | yes | The model, `creator/slug` — URL-encode the slash. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `providerOrder` | `string[]` | yes | The provider accounts to use for this model, first choice first. Each must offer the model and have that offer switched on. Only the accounts listed serve the model: with `failover` `none` the first one alone, and a call fails when it is switched off. |
| `failover` | `"none" \| "on-exhaustion"` | yes | `none` — a call uses the first enabled offer and fails if that account cannot serve it. `on-exhaustion` — when the account is out of quota or credit, the call is retried once through each next offer in order; each attempt is its own AI call, billed at the offer that served it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node read. |
| `policies` | `object[]` | yes | Every model a policy routes at this node — the nearest policy up the chain, per model. A model absent here uses the default: its creator's own offer when it is on, else the enabled offer with the lowest provider id, and no failover. |

Each item of `policies`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The model routed, `creator/slug`. |
| `providerOrder` | `string[]` | yes | Provider accounts, first choice first. |
| `failover` | `"none" \| "on-exhaustion"` | yes | `none` — a call uses the first enabled offer and fails if that account cannot serve it. `on-exhaustion` — when the account is out of quota or credit, the call is retried once through each next offer in order; each attempt is its own AI call, billed at the offer that served it. |
| `setHere` | `boolean` | yes | Set on THIS node. False when inherited from an ancestor — `decidedAt` names which. |
| `decidedAt` | `object` | yes | The node whose policy applies here. |

### `DELETE /v1/nodes/{nodeId}/routing/{modelId}`

Clear this node's own routing policy for one model, answering `{id: <modelId>, deleted: true}` with the node's routing as it now stands — an ancestor's policy, or the default. Idempotent: a node with no policy of its own for the model answers the same, since after the call it has none either way. Requires **ADMIN**.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node. ⚠️ A node id, not a project id. |
| `modelId` | `string` | yes | The model, `creator/slug` — URL-encode the slash. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | The model whose policy on this node was cleared. |
| `nodeId` | `string` | yes | The node read. |
| `policies` | `object[]` | yes | Every model a policy routes at this node now — the nearest policy up the chain, per model. The cleared model is here again only when an ancestor routes it. |

Each item of `policies`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The model routed, `creator/slug`. |
| `providerOrder` | `string[]` | yes | Provider accounts, first choice first. |
| `failover` | `"none" \| "on-exhaustion"` | yes | `none` — a call uses the first enabled offer and fails if that account cannot serve it. `on-exhaustion` — when the account is out of quota or credit, the call is retried once through each next offer in order; each attempt is its own AI call, billed at the offer that served it. |
| `setHere` | `boolean` | yes | Set on THIS node. False when inherited from an ancestor — `decidedAt` names which. |
| `decidedAt` | `object` | yes | The node whose policy applies here. |

### `GET /v1/nodes/{nodeId}/task-models`

Which model each AI task kind resolves to at this node, and which layer decided — this node, an ancestor, or the platform. At a project's node this is what the project's actions get when they pin no model; at the root node it is the platform's defaults. To bind a task here, `PUT /v1/nodes/{nodeId}/task-models/{task}`; to stop binding it, `DELETE` the same path. The model catalog itself is `GET /v1/ai-models`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node whose bindings to read — a project (its id), an organization, or the root, whose bindings are the platform's defaults. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these bindings were resolved at. |
| `nodeName` | `string` | yes | That node's display name. |
| `nodeKind` | `string` | yes | That node's kind, UPPERCASE, as written — `SYSTEM` \| `ORGANIZATION` \| `PROJECT`. ⚠️ NOT the lowercase `orgNodeKind` vocabulary the bootstrap and `/v1/nodes` surfaces send; the two spell the same three values differently, so a comparison written against the wrong one is always false and every row silently reads as unbound. ⚠️ And `isSystemRoot` is the field that answers “is this the platform layer”, not this one. |
| `isSystemRoot` | `boolean` | yes | Whether this node is the tree's root — the PLATFORM layer, whose bindings every project inherits unless something nearer overrides them. ⭐ Read this; do not derive it from `nodeKind` or from a `decidedAt.depth`. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order — including the ones this node has not bound, which carry what they inherit. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its action nor its task sets a limit. The DEPLOYMENT's, at every node — it does not inherit down the tree and this node cannot change it. |

Each item of `tasks`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `task` | `string` | yes | The task kind — what an action names in `taskKey` to select a model by role rather than by id. |
| `modelId` | `string` | yes | The model an action with this `taskKey` actually runs on. |
| `offer` | `object \| null` | yes | WHERE the model is obtained for this task: one model as served by one provider. ⛔ `null` MEANS NOTHING SERVES IT: a binding names `modelId` and every offer of that model is switched off, so an AI call following this task FAILS rather than running on some other model. Rebind or clear the task on `decidedAt`, or enable an offer of the model. |
| `failover` | `"none" \| "on-exhaustion"` | yes | Whether a call following this task may be retried through the model's next offer when the first account is out of quota or credit — the nearest routing policy's (`/v1/nodes/{nodeId}/routing`), `none` without one. |
| `retirement` | `object \| null` | yes | The model is on its way out — move this binding before its sunset. Null for a model in service. |
| `source` | `"node" \| "environment" \| "code-default"` | yes | WHICH layer decided. `node` — a binding on the ownership tree, and `decidedAt` says which node set it. `environment` — a deployment env var. `code-default` — the platform's built-in, which means nobody has bound this task anywhere. |
| `decidedAt` | `object \| null` | yes | The node that decided, or null when no binding on the chain answered and the env var or the built-in supplied the model. Present exactly when `source` is `node`. |
| `reasoningEffort` | `string \| null` | yes | The reasoning-effort override the deciding binding carried, or null when it carried none. ⚠️ It always comes from the same binding as the model. |
| `assignableToAction` | `boolean` | yes | Whether an action may name this task in `taskKey`. The taxonomy is wider than what an action can select. ⚠️ THREE of the eight come back false today — `transcription` and `rerank`, resolved by their functions directly, plus `substrate-embedding`. Filter on THIS FIELD rather than on a remembered list of exceptions. |
| `timeLimitMs` | `integer \| null` | yes | The per-call time limit this task's AI calls get when an action sets none of its own, or null when none is configured — an AI generation call then stops at `generationTimeLimitMs`, and an embed, rerank or transcribe call at its function's own wait. ⛔ THE DEPLOYMENT'S, AND THE ONE SETTING HERE THAT DOES NOT INHERIT. A write that sets one on a project is refused. |
| `callable` | `boolean` | yes | Whether a call following this task would be served on this deployment: a switched-on account serves the model AND the deployment holds that account's key. False on an inherited row means the binding above cannot run here — bind the task at this node. Configuration only: whether that account is answering calls right now is `serving`. |
| `inherited` | `object \| null` | yes | Present when `boundHere` is true and the node has a parent: what the task would resolve to without this node's binding. Null otherwise — an inherited row already IS that answer. |
| `boundHere` | `boolean` | yes | Whether THIS node carries the binding — equivalently, `decidedAt` is this node at depth 0. False means the value is inherited from an ancestor (or, when `source` is not `node`, from an env var or the platform's built-in) and clearing it here would change nothing. |
| `runsAtReasoningEffort` | `string \| null` | yes | The reasoning effort a call following this task RUNS at: the deciding binding's override, else the platform's default for the task (`low` for `reasoning`). Null when neither sets one, or when no enabled offer serves the bound model. ⚠️ Not a control value — `reasoningEffort` is the stored override a binding write edits; writing this one back would pin the platform default into the node. |
| `serving` | `object \| null` | yes | Whether the platform's account that would serve this task (`offer.provider`) is answering calls right now. `callable` is configuration and stays true while that account is out of credit; this is the live half. Null when `offer` is null — no account would serve it. Every account at once is `GET /v1/platform-status`. |

### `PUT /v1/nodes/{nodeId}/task-models/{task}`

Bind a task kind to a model at this node; every project beneath it follows unless something nearer binds the task. Answers the node's bindings after the write. To stop binding it here, `DELETE /v1/nodes/{nodeId}/task-models/{task}`; a single action can still pin its own `modelId`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node whose bindings to read — a project (its id), an organization, or the root, whose bindings are the platform's defaults. |
| `task` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak" \| "transcription" \| "rerank" \| "substrate-embedding"` | yes | The pipeline task kind this binding is for. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | A `modelId` from `GET /v1/ai-models`. It must be enabled, and its capability class must suit the task — an embedding model cannot serve `extraction`, and the `reasoning` task additionally requires a model whose `canReason` is true. |
| `reasoningEffort` | `"none" \| "low" \| "medium" \| "high" \| null` | no | How much hidden reasoning the model may spend before answering, or null for the platform's own default for this task. Sent where the model takes it (`reasoningEffortHonoured` on `GET /v1/ai-models`); `none` only on a model that lists it. It rides on this binding and inherits with it, so a node that sets a model sets the effort that goes with it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these bindings were resolved at. |
| `nodeName` | `string` | yes | That node's display name. |
| `nodeKind` | `string` | yes | That node's kind, UPPERCASE, as written — `SYSTEM` \| `ORGANIZATION` \| `PROJECT`. ⚠️ NOT the lowercase `orgNodeKind` vocabulary the bootstrap and `/v1/nodes` surfaces send; the two spell the same three values differently, so a comparison written against the wrong one is always false and every row silently reads as unbound. ⚠️ And `isSystemRoot` is the field that answers “is this the platform layer”, not this one. |
| `isSystemRoot` | `boolean` | yes | Whether this node is the tree's root — the PLATFORM layer, whose bindings every project inherits unless something nearer overrides them. ⭐ Read this; do not derive it from `nodeKind` or from a `decidedAt.depth`. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order — including the ones this node has not bound, which carry what they inherit. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its action nor its task sets a limit. The DEPLOYMENT's, at every node — it does not inherit down the tree and this node cannot change it. |

Each item of `tasks`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `task` | `string` | yes | The task kind — what an action names in `taskKey` to select a model by role rather than by id. |
| `modelId` | `string` | yes | The model an action with this `taskKey` actually runs on. |
| `offer` | `object \| null` | yes | WHERE the model is obtained for this task: one model as served by one provider. ⛔ `null` MEANS NOTHING SERVES IT: a binding names `modelId` and every offer of that model is switched off, so an AI call following this task FAILS rather than running on some other model. Rebind or clear the task on `decidedAt`, or enable an offer of the model. |
| `failover` | `"none" \| "on-exhaustion"` | yes | Whether a call following this task may be retried through the model's next offer when the first account is out of quota or credit — the nearest routing policy's (`/v1/nodes/{nodeId}/routing`), `none` without one. |
| `retirement` | `object \| null` | yes | The model is on its way out — move this binding before its sunset. Null for a model in service. |
| `source` | `"node" \| "environment" \| "code-default"` | yes | WHICH layer decided. `node` — a binding on the ownership tree, and `decidedAt` says which node set it. `environment` — a deployment env var. `code-default` — the platform's built-in, which means nobody has bound this task anywhere. |
| `decidedAt` | `object \| null` | yes | The node that decided, or null when no binding on the chain answered and the env var or the built-in supplied the model. Present exactly when `source` is `node`. |
| `reasoningEffort` | `string \| null` | yes | The reasoning-effort override the deciding binding carried, or null when it carried none. ⚠️ It always comes from the same binding as the model. |
| `assignableToAction` | `boolean` | yes | Whether an action may name this task in `taskKey`. The taxonomy is wider than what an action can select. ⚠️ THREE of the eight come back false today — `transcription` and `rerank`, resolved by their functions directly, plus `substrate-embedding`. Filter on THIS FIELD rather than on a remembered list of exceptions. |
| `timeLimitMs` | `integer \| null` | yes | The per-call time limit this task's AI calls get when an action sets none of its own, or null when none is configured — an AI generation call then stops at `generationTimeLimitMs`, and an embed, rerank or transcribe call at its function's own wait. ⛔ THE DEPLOYMENT'S, AND THE ONE SETTING HERE THAT DOES NOT INHERIT. A write that sets one on a project is refused. |
| `callable` | `boolean` | yes | Whether a call following this task would be served on this deployment: a switched-on account serves the model AND the deployment holds that account's key. False on an inherited row means the binding above cannot run here — bind the task at this node. Configuration only: whether that account is answering calls right now is `serving`. |
| `inherited` | `object \| null` | yes | Present when `boundHere` is true and the node has a parent: what the task would resolve to without this node's binding. Null otherwise — an inherited row already IS that answer. |
| `boundHere` | `boolean` | yes | Whether THIS node carries the binding — equivalently, `decidedAt` is this node at depth 0. False means the value is inherited from an ancestor (or, when `source` is not `node`, from an env var or the platform's built-in) and clearing it here would change nothing. |
| `runsAtReasoningEffort` | `string \| null` | yes | The reasoning effort a call following this task RUNS at: the deciding binding's override, else the platform's default for the task (`low` for `reasoning`). Null when neither sets one, or when no enabled offer serves the bound model. ⚠️ Not a control value — `reasoningEffort` is the stored override a binding write edits; writing this one back would pin the platform default into the node. |
| `serving` | `object \| null` | yes | Whether the platform's account that would serve this task (`offer.provider`) is answering calls right now. `callable` is configuration and stays true while that account is out of credit; this is the live half. Null when `offer` is null — no account would serve it. Every account at once is `GET /v1/platform-status`. |

### `DELETE /v1/nodes/{nodeId}/task-models/{task}`

Stop binding a task at this node. The task then falls to the nearest binding above it — an organization's, or the platform's — and the answer says which, in `bindings`. To bind it instead, `PUT /v1/nodes/{nodeId}/task-models/{task}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node whose bindings to read — a project (its id), an organization, or the root, whose bindings are the platform's defaults. |
| `task` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak" \| "transcription" \| "rerank" \| "substrate-embedding"` | yes | The pipeline task kind this binding is for. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The task whose binding at this node was cleared. |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `bindings` | `object` | yes | The node's bindings after the clear — what `GET /v1/nodes/{nodeId}/task-models` now answers, including what the cleared task falls to. |

### `GET /v1/nodes/{nodeId}/vendor-prices`

What each paid fetch costs at this node — the price a source function's vendor call is charged, per call or per item, with any included units and floor. These are the platform's prices for a call on the platform's vendor key: an action that spends a vendor key stored on the project or an organisation above it makes no `vendor-fetch` charge, the vendor bills the key's holder. Which operations a function is charged under is on its reference page. Model prices are `GET /v1/nodes/{nodeId}/model-prices`; what a run was actually charged is `GET /v1/runs/{runId}/spend`, and a project's total `GET /v1/projects/{nodeId}/usage`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node to price the catalog for. Prices are the same at every node today. A project's id is its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these prices were resolved for. |
| `prices` | `object[]` | yes | Every vendor operation a function can be charged under, priced or not. Ordered by `provider`, then `operation`. Bounded by the platform's declared operations, so it is not paged. |

Each item of `prices`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `provider` | `string` | yes | The vendor the operation is fetched from — the value a function's `provider` config field names where an action may choose one. |
| `operation` | `string` | yes | The billable operation at that vendor. A function's reference page lists the `provider/operation` pairs an action on it is charged under. |
| `unit` | `"call" \| "item"` | yes | What `credits` is the price OF: one call to the vendor, or one item it returns or counts (a post, a place, a review, a credit of the vendor's own). `countedAs` says which item. |
| `countedAs` | `string \| null` | yes | What one item is, where `unit` is `item`: a post returned, a place read, a page of search results. Null where `unit` is `call`. |
| `billing` | `"metered" \| "quota-free"` | yes | `metered` is charged per `unit`. `quota-free` is not charged at all: the vendor bills a daily quota rather than per call. |
| `credits` | `number \| null` | yes | The charged price in credits (1 credit = 1 µUSD) for ONE `unit`, exact and never negative. An action's `vendor-fetch` charge is this times the units billed, after `includedUnits` and `minimumUnits`, rounded down. Null beside `quota-free` means no charge; null beside `metered` means no price is set for the operation here, so none can be quoted — it is not a statement that the call is free. `0` is a price somebody chose. |
| `includedUnits` | `integer \| null` | yes | Units that are free per charge event before `credits` applies. A charge event is one request or one job at the vendor: a read that pages makes one per page, a search run as a single job makes one. Counted afresh on each event, not per run or per day. Null when the price includes none. |
| `minimumUnits` | `integer \| null` | yes | The fewest units one charge event bills, however few the vendor returned — an empty answer still costs this many. Per charge event, as `includedUnits`: a read of five pages owes five floors. Null when the price has no floor. |
