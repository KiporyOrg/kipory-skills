<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: d7a9504f5f62 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Handler catalog and model reads

The catalog of what a step can be, its per-handler worked example, the task→model bindings a node sets and a project resolves, and what each model costs at that node. Confirm every handler key here, never from memory.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/ai-models`](#get-v1-ai-models) |  |
| `GET` | [`/v1/handlers`](#get-v1-handlers) |  |
| `GET` | [`/v1/handlers/{key}`](#get-v1-handlers-key) |  |
| `GET` | [`/v1/nodes/{nodeId}/model-prices`](#get-v1-nodes-nodeid-model-prices) |  |
| `GET` | [`/v1/nodes/{nodeId}/task-models`](#get-v1-nodes-nodeid-task-models) |  |
| `PUT` | [`/v1/nodes/{nodeId}/task-models/{task}`](#put-v1-nodes-nodeid-task-models-task) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/task-models/{task}`](#delete-v1-nodes-nodeid-task-models-task) |  |
| `GET` | [`/v1/projects/{projectId}/task-models`](#get-v1-projects-projectid-task-models) |  |

### `GET /v1/ai-models`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"chat" \| "embedding" \| "transcription" \| "rerank"` | no | Narrow to one capability class. Omit for the whole catalog. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `models` | `object[]` | yes | Every model this deployment supports, ordered by `modelId` so a diff between two reads is stable. Models an operator has disabled are absent, not listed as unavailable. |

### `GET /v1/handlers`

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the catalog — a stable cache key. Two deployments serving the same handlers hash identically, and any change (a new handler, a config field, a copy edit) changes it. |
| `handlers` | `object[]` | yes | Every system handler this deployment registers, sorted by key. |
| `groups` | `object[]` | yes | Every picker group, IN DISPLAY ORDER, with the one sentence that says what it is for. Order is meaningful: it runs roughly from what a flow produces toward what it is plumbed with. |

### `GET /v1/handlers/{key}`

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
| `group` | `"AI" \| "Text" \| "Sources" \| "Files" \| "Search" \| "Entities" \| "Outbound" \| "Flow" \| "Utility"` | yes | The picker group it belongs to -- the same taxonomy the flow editor offers handlers under, so a reader meets one vocabulary rather than two. |
| `phase` | `"ingest" \| "inline" \| "control"` | yes | When in a run this handler executes. It constrains where a step using it can sit in a flow. |
| `effectClass` | `"read" \| "idempotent-side-effect" \| "record-mutation"` | yes | What kind of effect running it has — whether it writes anything durable, and therefore whether running it twice is safe. |
| `editor` | `object` | yes | What a step editor must ask the operator for this handler: which work surface to show, whether a prompt and a model are required, and where this handler's inputs and output slot come from. Always fully populated — a handler that declares nothing is served the platform defaults, so a client never applies a default of its own. |
| `emits` | `string` | no | What it produces, in prose. |
| `reads` | `string` | no | What it consumes, in prose. |
| `inputHint` | `string` | no | A short hint at the input shape — "string", "file", "slot map". |
| `suggestedInputStreams` | `string[]` | yes | The input wiring suggested when a step picks this handler. A starting point, not a constraint. |
| `requiredApiKey` | `string` | no | The environment variable this handler needs at run time. Present means the handler CANNOT run without it configured. |
| `externalDep` | `object` | no | An outside service this handler depends on, when it needs one. |
| `followsTaskModel` | `boolean` | yes | True when the model this handler runs on is decided by the step's `taskKey` binding, so changing that binding moves this step. False when the handler uses no model at all, or picks one a task binding cannot move. |
| `attachesFiles` | `boolean` | yes | True when this handler attaches a file-shaped input to what the model is sent — no `{{placeholder}}` names it, and the step's prompt is not where it is wired. False when a file input is refused outright, and for every handler that calls no model. |
| `templateFilters` | `object[]` | yes | The `{{slot\|filter}}` suffixes this handler's templates may use, sorted by name and already narrowed to what its own save would accept. A handler that caches its results omits the clock-reading filters, because a cached answer would keep a phrase like "5 years ago" long after it stopped being true. |
| `config` | `object[]` | yes | The settings a step using this handler can tune. Empty for handlers with nothing to configure. |
| `configConstraints` | `object[]` | no | Rules about SEVERAL config settings at once, which no single field carries. Absent means this handler declares none. A form reads these to draw a pair as one unit BEFORE it is broken, and to mark a setting the current config makes inert; the platform evaluates the same list, so a refusal and the drawing cannot disagree. |
| `configOutputSlots` | `object[]` | no | Where this handler's config names the slots the step WRITES. Absent means the config names none and the step's own output slot is the whole answer. A form reads these to draw those settings as slot NAMES — which a rename has to carry across every step that reads them — rather than as free text. |
| `io` | `object` | yes | Input and output as comparable tokens, beside the prose in `reads` / `emits`. |
| `rateLimit` | `object` | no | How fast it may call upstream, and whose allowance that spends. Absent means it declares no limit and counts into no bucket -- which is NOT the same as being free. |
| `credential` | `object` | no | The secret-vault credential this handler resolves before calling its vendor. Absent means it asks the vault for nothing -- true of every pure-CPU handler, and ALSO of the AI ones, which build their client from the environment and never consult the vault at all. |
| `queue` | `object` | no | Retry and cache policy. Present only for `ingest` handlers; an inline or control handler runs in the pipeline with neither. |
| `run` | `object` | yes | How a step using this handler is run: what its time limit bounds, where the default comes from, and any limit the handler keeps whatever the step says. Always present. |
| `example` | `object` | no | The worked example, when this handler ships one. |

### `GET /v1/nodes/{nodeId}/model-prices`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode to price the catalog for — its project's pinned rate card decides, and the platform's active card where it pins none. ⚠️ A node id, not a project id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these prices were resolved for. |
| `prices` | `object[]` | yes | Every ENABLED model's billable operations — the same models `/v1/ai-models` lists. A model appears once per operation it bills. Ordered by address, not by catalog position. |

### `GET /v1/nodes/{nodeId}/task-models`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode whose bindings to read. ⚠️ A node id, not a project id — `Project.id` and `Project.orgNodeId` are different values on the same project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these bindings were resolved at. |
| `nodeName` | `string` | yes | That node's display name. |
| `nodeKind` | `string` | yes | That node's kind, UPPERCASE — `SYSTEM` \| `ORGANIZATION` \| `PROJECT`, the Prisma enum verbatim. ⚠️ NOT the lowercase `orgNodeKind` vocabulary the bootstrap and `/v1/nodes` surfaces send; the two spell the same three values differently, so a comparison written against the wrong one is always false and every row silently reads as unbound. ⚠️ And `isSystemRoot` is the field that answers “is this the platform layer”, not this one — see there. |
| `isSystemRoot` | `boolean` | yes | Whether this node is the tree's root — the PLATFORM layer, whose bindings every project inherits unless something nearer overrides them. ⭐ It is stated rather than derived because a client cannot compute it: the root is the node with no parent, and `parentId` is not on this response. Deriving it from `nodeKind` or from a `decidedAt.depth` is the mistake this field exists to prevent. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order — including the ones this node has not bound, which carry what they inherit. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its step nor its task sets a limit. The DEPLOYMENT's, at every node — it does not inherit down the tree and this node cannot change it. |

### `PUT /v1/nodes/{nodeId}/task-models/{task}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode whose bindings to read. ⚠️ A node id, not a project id — `Project.id` and `Project.orgNodeId` are different values on the same project. |
| `task` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak" \| "transcription" \| "rerank" \| "substrate-embedding" \| "chunk-context"` | yes | The pipeline task kind this binding is for. |

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

### `DELETE /v1/nodes/{nodeId}/task-models/{task}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The OrgNode whose bindings to read. ⚠️ A node id, not a project id — `Project.id` and `Project.orgNodeId` are different values on the same project. |
| `task` | `"embedding" \| "extraction" \| "reasoning" \| "summarization" \| "tiebreak" \| "transcription" \| "rerank" \| "substrate-embedding" \| "chunk-context"` | yes | The pipeline task kind this binding is for. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node these bindings were resolved at. |
| `nodeName` | `string` | yes | That node's display name. |
| `nodeKind` | `string` | yes | That node's kind, UPPERCASE — `SYSTEM` \| `ORGANIZATION` \| `PROJECT`, the Prisma enum verbatim. ⚠️ NOT the lowercase `orgNodeKind` vocabulary the bootstrap and `/v1/nodes` surfaces send; the two spell the same three values differently, so a comparison written against the wrong one is always false and every row silently reads as unbound. ⚠️ And `isSystemRoot` is the field that answers “is this the platform layer”, not this one — see there. |
| `isSystemRoot` | `boolean` | yes | Whether this node is the tree's root — the PLATFORM layer, whose bindings every project inherits unless something nearer overrides them. ⭐ It is stated rather than derived because a client cannot compute it: the root is the node with no parent, and `parentId` is not on this response. Deriving it from `nodeKind` or from a `decidedAt.depth` is the mistake this field exists to prevent. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order — including the ones this node has not bound, which carry what they inherit. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its step nor its task sets a limit. The DEPLOYMENT's, at every node — it does not inherit down the tree and this node cannot change it. |

### `GET /v1/projects/{projectId}/task-models`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project whose task bindings to resolve. Not the `nodeId`, which is a different value on the same project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project these bindings were resolved for. |
| `tasks` | `object[]` | yes | Every task kind in the taxonomy, in declaration order. A task with no binding anywhere still appears, carrying its `code-default`. |
| `generationTimeLimitMs` | `integer` | yes | What an AI generation call stops at when neither its step nor its task sets a limit. |
