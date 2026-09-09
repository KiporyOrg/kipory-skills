<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8f1c60e82a35 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Handler catalog and model reads

The catalog of what a step can be, its per-handler worked example, and the models a project may bind. Confirm every handler key here, never from memory.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/ai-models`](#get-v1-ai-models) |  |
| `GET` | [`/v1/handlers`](#get-v1-handlers) |  |
| `GET` | [`/v1/handlers/{key}`](#get-v1-handlers-key) |  |
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
| `config` | `object[]` | yes | The settings a step using this handler can tune. Empty for handlers with nothing to configure. |
| `io` | `object` | yes | Input and output as comparable tokens, beside the prose in `reads` / `emits`. |
| `rateLimit` | `object` | no | How fast it may call upstream, and whose allowance that spends. Absent means it declares no limit and counts into no bucket -- which is NOT the same as being free. |
| `credential` | `object` | no | The secret-vault credential this handler resolves before calling its vendor. Absent means it asks the vault for nothing -- true of every pure-CPU handler, and ALSO of the AI ones, which build their client from the environment and never consult the vault at all. |
| `queue` | `object` | no | Retry and cache policy. Present only for `ingest` handlers; an inline or control handler runs in the pipeline with neither. |
| `example` | `object` | no | The worked example, when this handler ships one. |

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
