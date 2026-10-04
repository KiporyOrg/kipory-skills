<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Handler catalog and model reads

The catalog of what a step can be, its per-handler worked example, the task→model bindings a node sets and a project resolves, and what each model costs at that node. Confirm every handler key here, never from memory.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/ai-models`](#get-v1-ai-models) |  |
| `GET` | [`/v1/handlers`](#get-v1-handlers) |  |
| `GET` | [`/v1/handlers/{key}`](#get-v1-handlers-key) |  |
| `GET` | [`/v1/nodes/{nodeId}/model-prices`](#get-v1-nodes-nodeid-model-prices) |  |
| `GET` | [`/v1/nodes/{nodeId}/routing`](#get-v1-nodes-nodeid-routing) |  |
| `PUT` | [`/v1/nodes/{nodeId}/routing/{modelId}`](#put-v1-nodes-nodeid-routing-modelid) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/routing/{modelId}`](#delete-v1-nodes-nodeid-routing-modelid) |  |
| `GET` | [`/v1/nodes/{nodeId}/task-models`](#get-v1-nodes-nodeid-task-models) |  |
| `PUT` | [`/v1/nodes/{nodeId}/task-models/{task}`](#put-v1-nodes-nodeid-task-models-task) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/task-models/{task}`](#delete-v1-nodes-nodeid-task-models-task) |  |

### `GET /v1/ai-models`

The AI models this deployment supports and what each can do, optionally narrowed by `type`; the ids are the ones a skill or embedding profile accepts. Which provider account a model's calls go to at a node is `GET /v1/nodes/{nodeId}/routing`; which model a task uses there is `GET /v1/nodes/{nodeId}/task-models`. Any signed-in caller.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"chat" \| "embedding" \| "transcription" \| "rerank" \| "decision"` | no | Narrow to one capability class. Omit for the whole catalog. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `models` | `object[]` | yes | Every model this deployment supports, ordered by `modelId` so a diff between two reads is stable. Models an operator has disabled are absent, not listed as unavailable. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The id to write into a skill's `modelId` or an embedding profile's `modelId`, spelled `creator/model` — e.g. `anthropic/claude-opus-4-6`. Those writes validate against this same catalog, so an id from this response is one they will accept. It is NOT the id a vendor takes on its own API; the platform translates when it dispatches. |
| `creator` | `string` | yes | Who made the model — `openai`, `anthropic`, `meta`. Not necessarily an account this deployment holds: a model reached through a gateway has a creator the platform has no relationship with. |
| `displayName` | `string` | yes | Human label for a picker, e.g. “GPT-4o mini”. |
| `description` | `string \| null` | yes | When to reach for this model, when the catalog row says. Null when no guidance has been written. |
| `offers` | `object[]` | yes | Where this deployment can obtain the model. A model served by its creator and by a gateway lists both; the platform chooses, and the choice does not change what the model is or what you write. Replaces the single `provider` field, which could not describe a model reachable more than one way. What each provider CHARGES is deliberately absent — see the pricing surface for what you pay. |
| `type` | `"chat" \| "embedding" \| "transcription" \| "rerank" \| "decision"` | yes | Capability class. Determines which skills can run on the model, and whether the embedding fields below are populated. |
| `contextWindow` | `integer \| null` | yes | Total token budget the model accepts (prompt + completion). Null when the vendor declares none in tokens — audio models are priced per minute and have no token budget. |
| `maxOutputTokens` | `integer \| null` | yes | Maximum completion tokens. Null when undeclared, and always null on embedding and rerank models, which produce no completion. |
| `knowledgeCutoff` | `string \| null` | yes | Training-data cutoff as `YYYY-MM`; null when the vendor has not declared one. |
| `releasedAt` | `string \| null` | yes | The vendor's release date as `YYYY-MM-DD`; null when unknown. |
| `inputModalities` | `string[]` | yes | Accepted input modalities, e.g. `[“text”, “image”]`. |
| `outputModalities` | `string[]` | yes | Produced output modalities, e.g. `[“text”]`. |
| `supportsVision` | `boolean` | yes | Accepts image inputs — `image` is among `inputModalities`. A skill wired to a file input slot needs this. |
| `supportsVideo` | `boolean` | yes | Accepts video file inputs — `video` is among `inputModalities`. |
| `supportsJson` | `boolean` | yes | Supports structured output — required to give a generation skill an output schema. |
| `supportsFunctionCalling` | `boolean` | yes | Supports provider-side tool/function calling. |
| `supportsTemperature` | `boolean` | yes | The model accepts a `temperature`. FALSE means the platform REMOVES any temperature set on a skill before the call — the model is not asked for one and no error is raised — so a surface offering the setting should say so rather than report a value that will be discarded. |
| `canReason` | `boolean` | yes | The model can spend hidden reasoning tokens before it answers. The `reasoning` task may only bind to a model where this is true. |
| `reasoningEfforts` | `string[]` | yes | The effort levels the vendor accepts for that reasoning, in the vendor's own words (`low`, `medium`, `high`, …). Empty when the model has no dial, including models that reason at a fixed depth. |
| `embeddingDimensions` | `integer \| null` | yes | Output dimension count. Non-null exactly on embedding models. |
| `embeddingDistance` | `"Cosine" \| "Dot" \| "Euclid"` | yes | Distance metric the embedding space was trained for. An embedding profile derives its collection geometry from this and `embeddingDimensions`, so null means the row is not yet complete enough to bind a profile to. |
| `status` | `string` | yes | `active`, or `deprecated` when the vendor has announced a retirement. A model this deployment has decided to stop serving is absent from the catalog rather than labelled here. |
| `deprecatedAt` | `string \| null` | yes | The retirement date the vendor published, as `YYYY-MM-DD` — possibly in the future. Non-null means: still runnable and still referenced by existing skills, but going away — migrate off it. A model that is no longer usable at all is absent from this catalog rather than dated here. Null when the vendor has announced nothing. |
| `successorModelId` | `string \| null` | yes | What to migrate to, once somebody has named one — an id from this same catalog. Null when no successor has been chosen, which is the usual state even for a deprecated model. |

### `GET /v1/handlers`

Every system handler this deployment runs — what each reads, emits and accepts as config — with a `version` hash to cache on. Pass `?project=` to have each handler's declared types resolved against that project's type registry (VIEWER on the project), which is what a step editor needs when picking a handler; without it the catalog is the same for every caller. One handler with its worked example is `GET /v1/handlers/{key}`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Resolve each handler's declared types against this project's type registry — its id, as `POST /v1/projects` answered it. Omit for the deployment's catalog alone. Requires VIEWER on the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the catalog — a stable cache key. Two deployments serving the same handlers hash identically, and any change (a new handler, a config field, a copy edit) changes it. |
| `hashes` | `object` | yes | One content hash per handler key, over what `GET /v1/handlers/{key}` answers. A handler's hash moves only when that handler changes, so a cached copy of one handler can be checked without re-reading the rest. |
| `handlers` | `object[]` | yes | Every system handler this deployment registers, sorted by key. With `?project=`, each also carries `inputContract`, `variadicInputContract`, `staticOutputSchema`, `contractUnresolved`, `configDefaults`, `configDefaultsValid` and `freeFormInput`, resolved against that project's types; without it those are absent. |
| `groups` | `object[]` | yes | Every picker group, IN DISPLAY ORDER, with the one sentence that says what it is for. Order is meaningful: it runs roughly from what a flow produces toward what it is plumbed with. |

Each item of `handlers`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The handler's key — the value a step's `handlerKey` stores to select it. |
| `title` | `string` | yes | Its display name. |
| `description` | `string` | yes | What it does. |
| `icon` | `string` | yes | A name for the glyph that stands for this handler, authored beside it on its own descriptor. An OPEN vocabulary: a client resolves it through a table with a fallback and must render something for a name it does not know. |
| `group` | `"ai" \| "text" \| "sources" \| "files" \| "search" \| "entities" \| "outbound" \| "flow" \| "utility"` | yes | The picker group it belongs to -- the same taxonomy the flow editor offers handlers under, so a reader meets one vocabulary rather than two. |
| `phase` | `"ingest" \| "inline" \| "control"` | yes | When in a run this handler executes. It constrains where a step using it can sit in a flow. |
| `effectClass` | `"read" \| "idempotent-side-effect" \| "record-mutation"` | yes | What kind of effect running it has — whether it writes anything durable, and what. Whether a re-run repeats the write is `run.retry`. |
| `editor` | `object` | yes | What a step editor must ask the operator for this handler: which work surface to show, whether a prompt and a model are required, and where this handler's inputs and output slot come from. Always fully populated — a handler that declares nothing is served the platform defaults, so a client never applies a default of its own. |
| `glance` | `object` | yes | What goes in, what the step does, what comes out — in plain words. |
| `essentials` | `object[]` | yes | The settings that matter, in reading order: every required one, then those that change the result. Empty when none is worth a card. |
| `emits` | `string` | no | What it produces, in prose. |
| `reads` | `string` | no | What it consumes, in prose. |
| `inputHint` | `string` | no | A short hint at the input shape — "string", "file", "slot map". |
| `suggestedInputStreams` | `string[]` | yes | The input wiring suggested when a step picks this handler. A starting point, not a constraint. |
| `requiredApiKey` | `string` | no | The vendor key this handler needs at run time, as a phrase to read ("a Firecrawl API key"). Present means the handler CANNOT run without one: the project's own, stored in its secrets, or the platform's. The exact credential to store is `credential`. |
| `externalDep` | `object` | no | An outside service this handler depends on, when it needs one. |
| `followsTaskModel` | `boolean` | yes | True when the model this handler runs on is decided by the step's `taskKey` binding, so changing that binding moves this step. False when the handler uses no model at all, or picks one a task binding cannot move. |
| `attachesFiles` | `boolean` | yes | True when this handler attaches a file-shaped input to what the model is sent — no `{{placeholder}}` names it, and the step's prompt is not where it is wired. False when a file input is refused outright, and for every handler that calls no model. |
| `templateFilters` | `object[]` | yes | The `{{slot\|filter}}` suffixes this handler's templates may use, sorted by name and already narrowed to what its own save would accept. A handler that caches its results omits the clock-reading filters, because a cached answer would keep a phrase like "5 years ago" long after it stopped being true. |
| `config` | `object[]` | yes | The settings a step using this handler can tune. Empty for handlers with nothing to configure. |
| `configConstraints` | `object[]` | no | Rules about SEVERAL config settings at once, which no single field carries. Absent means this handler declares none. A form reads these to draw a pair as one unit BEFORE it is broken, and to mark a setting the current config makes inert; the platform evaluates the same list, so a refusal and the drawing cannot disagree. |
| `configOutputSlots` | `object[]` | no | Where this handler's config names the slots the step WRITES. Absent means the config names none and the step's own output slot is the whole answer. A form reads these to draw those settings as slot NAMES — which a rename has to carry across every step that reads them — rather than as free text. |
| `io` | `object` | yes | Input and output as comparable tokens, beside the prose in `reads` / `emits`. |
| `rateLimit` | `object` | no | How fast it may call upstream, and whose allowance that spends. Absent means it declares no limit and counts into no bucket -- which is NOT the same as being free. |
| `credential` | `object` | no | The secret-vault credential this handler resolves before calling its vendor. Absent means it asks the vault for nothing -- true of every pure-CPU handler, and ALSO of the AI ones: a model call runs on the platform's own key for its provider, and no project can bring one. For a handler whose vendor is chosen per step, the DEFAULT vendor's -- see `providers`. |
| `stepCredential` | `object` | no | Present when a STEP may name a stored secret of its own. Unlike `credential`, the purpose is the author's: store a secret of this type under any purpose, and write that purpose in the config field. The stored secret says where in the request it goes and which hosts may receive it. |
| `providers` | `object` | no | Present only when each step chooses the vendor (`handlerConfig.provider`): every vendor it may name and the credential each spends. Absent means the handler has one vendor, the one `credential` names. |
| `queue` | `object` | no | Retry and cache policy. Present only for `ingest` handlers; an inline or control handler runs in the pipeline with neither. |
| `run` | `object` | yes | How a step using this handler is run: what its time limit bounds, where the default comes from, and any limit the handler keeps whatever the step says. Always present. |
| `inputContract` | `object[] \| null` | no | The structural bound on each input position, resolved against this project's registry. Position N bounds `inputStreams[N]`. Null means the handler declares no contract — every position is unconstrained. Distinguish that from `contractUnresolved` below, which means the handler DOES declare one and it could not be computed. |
| `variadicInputContract` | `object` | no | The bound every input position must satisfy, for a handler that takes any number of same-shaped inputs. Null when the handler is not variadic. Mutually exclusive with `inputContract` in practice. |
| `staticOutputSchema` | `object` | no | What this handler emits in this project BEFORE any wiring — its output resolver asked with no inputs and no config. Null for a handler whose output type mirrors an input (it cannot be known until wired) and for one that writes no output slot at all. |
| `contractUnresolved` | `boolean` | no | True when a declared resolver THREW while being asked — a dangling library type, normally a platform defect. The three fields above are null in that case for a different reason than 'not declared', and a picker must not silently stop filtering: say the check could not run. |
| `configDefaults` | `unknown` | no | The handler's config with every default applied — what a step gets if it sends no `handlerConfig` at all. Shaped by `config` above. |
| `configDefaultsValid` | `boolean` | no | Whether those defaults actually satisfy the handler's own config schema. False means the handler declares a required field with no default, so a step using it MUST send config; it is not an error. |
| `freeFormInput` | `object` | no | How this handler takes slot references through its config rather than through input positions. Null for the ordinary positional handler. |

Each item of `groups`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `group` | `"ai" \| "text" \| "sources" \| "files" \| "search" \| "entities" \| "outbound" \| "flow" \| "utility"` | yes | The group this sentence is about. |
| `note` | `string` | yes | What this group is for, in one sentence, at any size. |

### `GET /v1/handlers/{key}`

One system handler's catalog entry — what it reads, emits and accepts as config, its `group` (lowercase, such as `ai` or `text`) — plus a worked example. An unknown key is a 404.
The whole catalog, without examples, is `GET /v1/handlers`; pass `?project=` there to resolve types against one project.
Any authenticated caller; the answer is the same for everyone.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The handler key, e.g. `url.scrape`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The handler's key — the value a step's `handlerKey` stores to select it. |
| `title` | `string` | yes | Its display name. |
| `description` | `string` | yes | What it does. |
| `icon` | `string` | yes | A name for the glyph that stands for this handler, authored beside it on its own descriptor. An OPEN vocabulary: a client resolves it through a table with a fallback and must render something for a name it does not know. |
| `group` | `"ai" \| "text" \| "sources" \| "files" \| "search" \| "entities" \| "outbound" \| "flow" \| "utility"` | yes | The picker group it belongs to -- the same taxonomy the flow editor offers handlers under, so a reader meets one vocabulary rather than two. |
| `phase` | `"ingest" \| "inline" \| "control"` | yes | When in a run this handler executes. It constrains where a step using it can sit in a flow. |
| `effectClass` | `"read" \| "idempotent-side-effect" \| "record-mutation"` | yes | What kind of effect running it has — whether it writes anything durable, and what. Whether a re-run repeats the write is `run.retry`. |
| `editor` | `object` | yes | What a step editor must ask the operator for this handler: which work surface to show, whether a prompt and a model are required, and where this handler's inputs and output slot come from. Always fully populated — a handler that declares nothing is served the platform defaults, so a client never applies a default of its own. |
| `glance` | `object` | yes | What goes in, what the step does, what comes out — in plain words. |
| `essentials` | `object[]` | yes | The settings that matter, in reading order: every required one, then those that change the result. Empty when none is worth a card. |
| `emits` | `string` | no | What it produces, in prose. |
| `reads` | `string` | no | What it consumes, in prose. |
| `inputHint` | `string` | no | A short hint at the input shape — "string", "file", "slot map". |
| `suggestedInputStreams` | `string[]` | yes | The input wiring suggested when a step picks this handler. A starting point, not a constraint. |
| `requiredApiKey` | `string` | no | The vendor key this handler needs at run time, as a phrase to read ("a Firecrawl API key"). Present means the handler CANNOT run without one: the project's own, stored in its secrets, or the platform's. The exact credential to store is `credential`. |
| `externalDep` | `object` | no | An outside service this handler depends on, when it needs one. |
| `followsTaskModel` | `boolean` | yes | True when the model this handler runs on is decided by the step's `taskKey` binding, so changing that binding moves this step. False when the handler uses no model at all, or picks one a task binding cannot move. |
| `attachesFiles` | `boolean` | yes | True when this handler attaches a file-shaped input to what the model is sent — no `{{placeholder}}` names it, and the step's prompt is not where it is wired. False when a file input is refused outright, and for every handler that calls no model. |
| `templateFilters` | `object[]` | yes | The `{{slot\|filter}}` suffixes this handler's templates may use, sorted by name and already narrowed to what its own save would accept. A handler that caches its results omits the clock-reading filters, because a cached answer would keep a phrase like "5 years ago" long after it stopped being true. |
| `config` | `object[]` | yes | The settings a step using this handler can tune. Empty for handlers with nothing to configure. |
| `configConstraints` | `object[]` | no | Rules about SEVERAL config settings at once, which no single field carries. Absent means this handler declares none. A form reads these to draw a pair as one unit BEFORE it is broken, and to mark a setting the current config makes inert; the platform evaluates the same list, so a refusal and the drawing cannot disagree. |
| `configOutputSlots` | `object[]` | no | Where this handler's config names the slots the step WRITES. Absent means the config names none and the step's own output slot is the whole answer. A form reads these to draw those settings as slot NAMES — which a rename has to carry across every step that reads them — rather than as free text. |
| `io` | `object` | yes | Input and output as comparable tokens, beside the prose in `reads` / `emits`. |
| `rateLimit` | `object` | no | How fast it may call upstream, and whose allowance that spends. Absent means it declares no limit and counts into no bucket -- which is NOT the same as being free. |
| `credential` | `object` | no | The secret-vault credential this handler resolves before calling its vendor. Absent means it asks the vault for nothing -- true of every pure-CPU handler, and ALSO of the AI ones: a model call runs on the platform's own key for its provider, and no project can bring one. For a handler whose vendor is chosen per step, the DEFAULT vendor's -- see `providers`. |
| `stepCredential` | `object` | no | Present when a STEP may name a stored secret of its own. Unlike `credential`, the purpose is the author's: store a secret of this type under any purpose, and write that purpose in the config field. The stored secret says where in the request it goes and which hosts may receive it. |
| `providers` | `object` | no | Present only when each step chooses the vendor (`handlerConfig.provider`): every vendor it may name and the credential each spends. Absent means the handler has one vendor, the one `credential` names. |
| `queue` | `object` | no | Retry and cache policy. Present only for `ingest` handlers; an inline or control handler runs in the pipeline with neither. |
| `run` | `object` | yes | How a step using this handler is run: what its time limit bounds, where the default comes from, and any limit the handler keeps whatever the step says. Always present. |
| `example` | `object` | no | The worked example, when this handler ships one. |

Each item of `essentials`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `field` | `string` | yes | A top-level config field, or the step column it names: `promptTemplate`, `systemPrompt`, `outputSchema`, `modelId`. |
| `says` | `string` | yes | What it decides, in at most twelve words. |
| `required` | `boolean` | yes | Whether a step cannot be saved without it. |

Each item of `templateFilters`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The filter name, as it is typed after the `\|`. |
| `detail` | `string` | yes | One line on what the filter renders, for a picker to show beside the name. |

Each item of `config`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The config field's name. A nested object surfaces as one field of type `object` rather than being flattened; its own fields arrive in `members`. |
| `type` | `string` | yes | A compact type label — `string`, `number`, `boolean`, `string[]`, `object`, `object[]`, `enum` (see `enumValues`), `union` for a field that takes one of several shapes and `union[]` for a list whose items each do (see `options`), or a `\|`-joined list of plain types such as `string \| number \| boolean`. Any of them ends in ` \| null` when the field may be null, as in `enum \| null`; a list whose items take several types reads `(string \| number)[]`. |
| `members` | `object[]` | no | The fields inside, in the order the handler declares them — an `object`'s own fields, or the fields of each item of an `object[]`, nullable or not. Absent when the object has no fixed fields, such as a map from names to slots. |
| `options` | `object[]` | no | The shapes a `union` or `union \| null` field may take, or each item of a `union[]` one, one per alternative, in declared order. A fixed value arrives as `value` and an object as its `members`; an alternative that is neither carries both absent. |
| `enumValues` | `string[]` | no | The accepted values, present only when `type` is `enum` or `enum \| null`. |
| `itemEnumValues` | `string[]` | no | The values each item may take, present only when `type` is a list whose items come from a fixed set. |
| `minimum` | `number` | no | The smallest value a number field accepts, itself allowed. Absent when the field declares none. |
| `exclusiveMinimum` | `number` | no | A number field's value must be greater than this. Absent when the field declares none. |
| `maximum` | `number` | no | The largest value a number field accepts, itself allowed. Absent when the field declares none. |
| `exclusiveMaximum` | `number` | no | A number field's value must be less than this. Absent when the field declares none. |
| `required` | `boolean` | yes | Whether a step using this handler must set the field. |
| `default` | `string` | no | The default, JSON-ENCODED — so a string default arrives quoted, e.g. "\"auto\"". Absent when the field has no default. |
| `description` | `string` | no | What the field does, when the handler's author wrote it down. |
| `refKind` | `"record-type" \| "facet" \| "flow"` | no | The kind of project object this field names — a record type, a facet or a flow. Absent when the field names none. It is the KIND, not an instance: which one is configured per skill. |
| `caution` | `string` | no | What goes wrong if this field is set wrong, and what it costs. Absent when the field carries no such cost. |

Each item of `configConstraints`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"all-or-none"` | yes | Every setting in `fields` is set, or none of them is. |
| `fields` | `string[]` | yes | Set all of these, or none of them. |
| `field` | `string` | yes | The setting that may have no effect. |
| `when` | `object` | yes | The condition under which `field` applies at all. |

Each item of `configOutputSlots`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"name" \| "record-keys" \| "record-values"` | yes | How slot names sit at `path`: the value itself (a string, an object's member, or each list item's member), the KEYS of a map there, or its VALUES. |
| `path` | `string` | yes | The config setting, or `setting.member` for a member of an object or of each item of a list. |

### `GET /v1/nodes/{nodeId}/model-prices`

What each model in the catalog costs at this node — the price a call made here is charged. The models themselves, with no price, are `GET /v1/ai-models`; which model each task runs on here is `GET /v1/nodes/{nodeId}/task-models`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode to price the catalog for. Prices come from the platform's price rules, which are platform-wide today; the node is the address so a tenant's own price needs no route change. A project's id is its node id. |

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
| `unit` | `"million-tokens" \| "minute" \| "search"` | yes | What `credits` is the price OF. Token operations quote a million tokens because a per-token figure in credits is a fraction nobody can read; audio quotes a minute and rerank a search. |
| `credits` | `number \| null` | yes | The charged price in credits (1 credit = 1 µUSD) for one `unit`. Always a POSITIVE integer or null; zero is never published. Null means no single per-unit figure describes this address — nothing prices it (the charge path's `PRICE_NO_MATCH`), the price is zero with no rule choosing that (which the coverage report grades as an unpriced address, not a free tier), the price carries a unit allowance or floor the charge applies, or the rate is too small to word at this unit. None of them is a claim that the operation is free. |

Each item of `tiers`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | The model rated — an id from `GET /v1/ai-models`. |
| `tier` | `integer` | yes | 1 is the cheapest third of the models billed the same way (chat, embedding, transcription, rerank), 3 the priciest, on a log scale of their charged price here — a chat model by three parts input to one part output. A step is at least a doubling, so models that cost about the same share a rating. A model with no stated price, or alone of its kind, is not rated. |

### `GET /v1/nodes/{nodeId}/routing`

Which provider account each model's calls go to at this node — the nearest routing policy up the tree, per model. Requires **VIEWER**. The platform-wide default is `PUT /v1/model-registry/models/{modelId}/route` (staff); which model a task uses here is `GET /v1/nodes/{nodeId}/task-models`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode. ⚠️ A node id, not a project id. |

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
| `nodeId` | `string` | yes | The OrgNode. ⚠️ A node id, not a project id. |
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
| `nodeId` | `string` | yes | The OrgNode. ⚠️ A node id, not a project id. |
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

Which model each AI task kind resolves to at this node, and which layer decided — this node, an ancestor, or the platform. At a project's node this is what the project's steps get when they pin no model; at the root node it is the platform's defaults. To bind a task here, `PUT /v1/nodes/{nodeId}/task-models/{task}`; to stop binding it, `DELETE` the same path. The model catalog itself is `GET /v1/ai-models`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode whose bindings to read — a project (its id), an organization, or the root, whose bindings are the platform's defaults. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these bindings were resolved at. |
| `nodeName` | `string` | yes | That node's display name. |
| `nodeKind` | `string` | yes | That node's kind, UPPERCASE — `SYSTEM` \| `ORGANIZATION` \| `PROJECT`, the Prisma enum verbatim. ⚠️ NOT the lowercase `orgNodeKind` vocabulary the bootstrap and `/v1/nodes` surfaces send; the two spell the same three values differently, so a comparison written against the wrong one is always false and every row silently reads as unbound. ⚠️ And `isSystemRoot` is the field that answers “is this the platform layer”, not this one — see there. |
| `isSystemRoot` | `boolean` | yes | Whether this node is the tree's root — the PLATFORM layer, whose bindings every project inherits unless something nearer overrides them. ⭐ It is stated rather than derived because a client cannot compute it: the root is the node with no parent, and `parentId` is not on this response. Deriving it from `nodeKind` or from a `decidedAt.depth` is the mistake this field exists to prevent. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order — including the ones this node has not bound, which carry what they inherit. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its step nor its task sets a limit. The DEPLOYMENT's, at every node — it does not inherit down the tree and this node cannot change it. |

Each item of `tasks`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `task` | `string` | yes | The task kind — what a step names in `taskKey` to select a model by role rather than by id. |
| `modelId` | `string` | yes | The model a step with this `taskKey` actually runs on. |
| `offer` | `object \| null` | yes | WHERE the model is obtained for this task: one model as served by one provider. Replaces the bare `provider` field, which could not say what the provider calls the model. ⛔ `null` MEANS NOTHING SERVES IT: a binding names `modelId` and every offer of that model is switched off, so an AI call following this task FAILS rather than running on some other model. Rebind or clear the task on `decidedAt`, or enable an offer of the model. |
| `failover` | `"none" \| "on-exhaustion"` | yes | Whether a call following this task may be retried through the model's next offer when the first account is out of quota or credit — the nearest routing policy's (`/v1/nodes/{nodeId}/routing`), `none` without one. |
| `retirement` | `object \| null` | yes | The model is on its way out — move this binding before its sunset. Null for a model in service. |
| `source` | `"node" \| "environment" \| "code-default"` | yes | WHICH layer decided, and the reason this read exists. `node` — a binding on the ownership tree, and `decidedAt` says which node set it. `environment` — a deployment env var. `code-default` — the platform's built-in, which means nobody has bound this task anywhere. |
| `decidedAt` | `object \| null` | yes | The node that decided, or null when no binding on the chain answered and the env var or the built-in supplied the model. Present exactly when `source` is `node`. |
| `reasoningEffort` | `string \| null` | yes | The reasoning-effort override the deciding binding carried, or null when it carried none. ⚠️ It inherits on the SAME walk as the model and comes off the SAME row, so the pair cannot disagree. |
| `assignableToStep` | `boolean` | yes | Whether a step may name this task in `taskKey`. The taxonomy is wider than what a step can select, so offering the whole list in a picker would let an author pick a task the write refuses. ⚠️ THREE of the eight come back false today — `transcription` and `rerank`, resolved by their handlers directly, plus `substrate-embedding`. Filter on THIS FIELD rather than on a remembered list of exceptions. |
| `timeLimitMs` | `integer \| null` | yes | The per-call time limit this task's AI calls get when a step sets none of its own, or null when none is configured — an AI generation call then stops at `generationTimeLimitMs`, and an embed, rerank or transcribe call at its handler's own wait. ⛔ THE DEPLOYMENT'S, AND THE ONE SETTING HERE THAT DOES NOT INHERIT — it is read from the system root alone, because a deadline spends a shared worker's time rather than the tenant's own. A write that sets one on a project is refused. |
| `callable` | `boolean` | yes | Whether a call following this task would be served on this deployment: a switched-on account serves the model AND the deployment holds that account's key. False on an inherited row means the binding above cannot run here — bind the task at this node. |
| `inherited` | `object \| null` | yes | Present when `boundHere` is true and the node has a parent: what the task would resolve to without this node's binding. Null otherwise — an inherited row already IS that answer. |
| `boundHere` | `boolean` | yes | Whether THIS node carries the binding — equivalently, `decidedAt` is this node at depth 0. False means the value is inherited from an ancestor (or, when `source` is not `node`, from an env var or the platform's built-in) and clearing it here would change nothing. |
| `runsAtReasoningEffort` | `string \| null` | yes | The reasoning effort a call following this task RUNS at: the deciding binding's override, else the platform's default for the task (`low` for `reasoning`). Null when neither sets one, or when no enabled offer serves the bound model. ⚠️ Not a control value — `reasoningEffort` is the stored override a binding write edits; writing this one back would pin the platform default into the node. |

### `PUT /v1/nodes/{nodeId}/task-models/{task}`

Bind a task kind to a model at this node; every project beneath it follows unless something nearer binds the task. Answers the node's bindings after the write. To stop binding it here, `DELETE /v1/nodes/{nodeId}/task-models/{task}`; a single step can still pin its own `modelId`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode whose bindings to read — a project (its id), an organization, or the root, whose bindings are the platform's defaults. |
| `task` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak" \| "transcription" \| "rerank" \| "substrate-embedding"` | yes | The pipeline task kind this binding is for. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | yes | A `modelId` from `GET /v1/ai-models`. It must be enabled, and its capability class must suit the task — an embedding model cannot serve `extraction`, and the `reasoning` task additionally requires a model whose `canReason` is true. |
| `reasoningEffort` | `"low" \| "medium" \| "high"` | no | How much hidden reasoning the model may spend before answering, or null for the platform's own default for this task. ⚠️ Only OpenAI reasoning models read it; other vendors ignore it. It rides on this binding and inherits with it, so a node that sets a model sets the effort that goes with it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these bindings were resolved at. |
| `nodeName` | `string` | yes | That node's display name. |
| `nodeKind` | `string` | yes | That node's kind, UPPERCASE — `SYSTEM` \| `ORGANIZATION` \| `PROJECT`, the Prisma enum verbatim. ⚠️ NOT the lowercase `orgNodeKind` vocabulary the bootstrap and `/v1/nodes` surfaces send; the two spell the same three values differently, so a comparison written against the wrong one is always false and every row silently reads as unbound. ⚠️ And `isSystemRoot` is the field that answers “is this the platform layer”, not this one — see there. |
| `isSystemRoot` | `boolean` | yes | Whether this node is the tree's root — the PLATFORM layer, whose bindings every project inherits unless something nearer overrides them. ⭐ It is stated rather than derived because a client cannot compute it: the root is the node with no parent, and `parentId` is not on this response. Deriving it from `nodeKind` or from a `decidedAt.depth` is the mistake this field exists to prevent. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order — including the ones this node has not bound, which carry what they inherit. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its step nor its task sets a limit. The DEPLOYMENT's, at every node — it does not inherit down the tree and this node cannot change it. |

Each item of `tasks`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `task` | `string` | yes | The task kind — what a step names in `taskKey` to select a model by role rather than by id. |
| `modelId` | `string` | yes | The model a step with this `taskKey` actually runs on. |
| `offer` | `object \| null` | yes | WHERE the model is obtained for this task: one model as served by one provider. Replaces the bare `provider` field, which could not say what the provider calls the model. ⛔ `null` MEANS NOTHING SERVES IT: a binding names `modelId` and every offer of that model is switched off, so an AI call following this task FAILS rather than running on some other model. Rebind or clear the task on `decidedAt`, or enable an offer of the model. |
| `failover` | `"none" \| "on-exhaustion"` | yes | Whether a call following this task may be retried through the model's next offer when the first account is out of quota or credit — the nearest routing policy's (`/v1/nodes/{nodeId}/routing`), `none` without one. |
| `retirement` | `object \| null` | yes | The model is on its way out — move this binding before its sunset. Null for a model in service. |
| `source` | `"node" \| "environment" \| "code-default"` | yes | WHICH layer decided, and the reason this read exists. `node` — a binding on the ownership tree, and `decidedAt` says which node set it. `environment` — a deployment env var. `code-default` — the platform's built-in, which means nobody has bound this task anywhere. |
| `decidedAt` | `object \| null` | yes | The node that decided, or null when no binding on the chain answered and the env var or the built-in supplied the model. Present exactly when `source` is `node`. |
| `reasoningEffort` | `string \| null` | yes | The reasoning-effort override the deciding binding carried, or null when it carried none. ⚠️ It inherits on the SAME walk as the model and comes off the SAME row, so the pair cannot disagree. |
| `assignableToStep` | `boolean` | yes | Whether a step may name this task in `taskKey`. The taxonomy is wider than what a step can select, so offering the whole list in a picker would let an author pick a task the write refuses. ⚠️ THREE of the eight come back false today — `transcription` and `rerank`, resolved by their handlers directly, plus `substrate-embedding`. Filter on THIS FIELD rather than on a remembered list of exceptions. |
| `timeLimitMs` | `integer \| null` | yes | The per-call time limit this task's AI calls get when a step sets none of its own, or null when none is configured — an AI generation call then stops at `generationTimeLimitMs`, and an embed, rerank or transcribe call at its handler's own wait. ⛔ THE DEPLOYMENT'S, AND THE ONE SETTING HERE THAT DOES NOT INHERIT — it is read from the system root alone, because a deadline spends a shared worker's time rather than the tenant's own. A write that sets one on a project is refused. |
| `callable` | `boolean` | yes | Whether a call following this task would be served on this deployment: a switched-on account serves the model AND the deployment holds that account's key. False on an inherited row means the binding above cannot run here — bind the task at this node. |
| `inherited` | `object \| null` | yes | Present when `boundHere` is true and the node has a parent: what the task would resolve to without this node's binding. Null otherwise — an inherited row already IS that answer. |
| `boundHere` | `boolean` | yes | Whether THIS node carries the binding — equivalently, `decidedAt` is this node at depth 0. False means the value is inherited from an ancestor (or, when `source` is not `node`, from an env var or the platform's built-in) and clearing it here would change nothing. |
| `runsAtReasoningEffort` | `string \| null` | yes | The reasoning effort a call following this task RUNS at: the deciding binding's override, else the platform's default for the task (`low` for `reasoning`). Null when neither sets one, or when no enabled offer serves the bound model. ⚠️ Not a control value — `reasoningEffort` is the stored override a binding write edits; writing this one back would pin the platform default into the node. |

### `DELETE /v1/nodes/{nodeId}/task-models/{task}`

Stop binding a task at this node. The task then falls to the nearest binding above it — an organization's, or the platform's — and the answer says which, in `bindings`. To bind it instead, `PUT /v1/nodes/{nodeId}/task-models/{task}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode whose bindings to read — a project (its id), an organization, or the root, whose bindings are the platform's defaults. |
| `task` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak" \| "transcription" \| "rerank" \| "substrate-embedding"` | yes | The pipeline task kind this binding is for. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The task whose binding at this node was cleared — a binding is keyed by its task under the node. |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `bindings` | `object` | yes | The node's bindings after the clear — what `GET /v1/nodes/{nodeId}/task-models` now answers, including what the cleared task falls to. |
