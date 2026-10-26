<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Notices

What Kipory tells your project: the notices of changes that reach it — each published the moment its change reaches this deployment, with what changed, when, and a report naming what of your own configuration it touches — and the flows Kipory told your project are failing, with what turned each red. `scripts/sync.mjs` prints what is there for each project your key reaches; read each notice it prints, and each told flow's health. The first read by a key or member of the project tells Kipory it heard.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/notices`](#get-v1-notices) |  |
| `GET` | [`/v1/notices/{id}`](#get-v1-notices-id) |  |

### `GET /v1/notices`

What Kipory tells your project: the open notices of changes that reach it, oldest first — each names what changed, when, and carries a report on your own configuration; read each with `GET /v1/notices/{id}?project=`, which also tells Kipory you heard it — and, under `flows`, the flows Kipory told your project are failing, with what turned each red. Every error in a flow and how to fix it is `GET /v1/flows/{id}/health`. Any key or member of the project reads it. The kipory-connect skill's sync prints the open ones at the start of a session; `GET /v1/grant` lists the projects a key reaches. A project can also trigger a flow on the `platform` event `notice.published`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to read notices for — `node.id` or an entry of `projects` on `GET /v1/grant`. A key on an organization reads each of its projects in turn. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `items` | `object[]` | yes | The open notices that reach the project, oldest `effectiveAt` first. A notice reaches only the projects its change names. Not paged: it holds only the notices of the last 30 days. |
| `flows` | `object[]` | yes | The project's flows the platform told it are failing (`platform/flow-health.failing`), as last told: reading them runs no check. A flow leaves the list when it is told `flow-health.recovered`. Every error and how to fix it is at `healthPath`. |

Each item of `items`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The notice's id. |
| `project` | `string` | yes | Node id of the project this row is for. |
| `projectSlug` | `string` | yes | That project's slug. |
| `title` | `string` | yes | What changed, in one line. |
| `publishedAt` | `string` | yes | When this deployment published the notice: the moment the change reached it, as an ISO-8601 instant. |
| `effectiveAt` | `string` | yes | When the change takes or took effect, as an ISO-8601 instant. |
| `state` | `"upcoming" \| "in-effect" \| "withdrawn" \| "closed"` | yes | Where the notice stands: `upcoming` — announced, the change takes effect at `effectiveAt`; `in-effect` — the change is live (listed for 30 days after `effectiveAt`); `withdrawn` — Kipory took the notice back; `closed` — older than 30 days, no longer listed. |
| `changes` | `object[]` | yes | The routes, fields and codes the change touches. |
| `read` | `boolean` | yes | Whether a key or member of this project has read the notice with `GET /v1/notices/{id}?project=`. |

Each item of `flows`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `object` | yes | The flow. |
| `codes` | `string[]` | yes | The error codes in its health when it was last measured. |
| `since` | `string` | yes | When the platform first told the project this flow is failing, as an ISO-8601 instant. |
| `cause` | `"first-check" \| "build" \| "change" \| "other"` | yes | What turned it red: `build` — a new platform build judged the unchanged flow differently; `change` — the project's own configuration changed; `first-check` — the platform's first measure; `other` — something else, such as a secret or the model catalog. |
| `build` | `string` | no | The build that first measured it failing, as `GET /health` names it; absent where unknown. |
| `healthPath` | `string` | yes | `GET` this for every error in the flow and how to fix it. |

### `GET /v1/notices/{id}`

One notice for your project: what changed and what to do, and your project's own report when the notice carries one, naming which of its fields or routes the change touches. The first read by a key or member of the project marks the notice as heard. A notice that does not reach the project answers 404. The project's open notices are `GET /v1/notices`. The kipory-connect skill's sync prints the open ones at the start of a session; `GET /v1/grant` lists the projects a key reaches. A project can also trigger a flow on the `platform` event `notice.published`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The notice's id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to read notices for — `node.id` or an entry of `projects` on `GET /v1/grant`. A key on an organization reads each of its projects in turn. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The notice's id. |
| `project` | `string` | yes | Node id of the project this row is for. |
| `projectSlug` | `string` | yes | That project's slug. |
| `title` | `string` | yes | What changed, in one line. |
| `publishedAt` | `string` | yes | When this deployment published the notice: the moment the change reached it, as an ISO-8601 instant. |
| `effectiveAt` | `string` | yes | When the change takes or took effect, as an ISO-8601 instant. |
| `state` | `"upcoming" \| "in-effect" \| "withdrawn" \| "closed"` | yes | Where the notice stands: `upcoming` — announced, the change takes effect at `effectiveAt`; `in-effect` — the change is live (listed for 30 days after `effectiveAt`); `withdrawn` — Kipory took the notice back; `closed` — older than 30 days, no longer listed. |
| `changes` | `object[]` | yes | The routes, fields and codes the change touches. |
| `read` | `boolean` | yes | Whether a key or member of this project has read the notice with `GET /v1/notices/{id}?project=`. |
| `body` | `string` | yes | The notice, in Markdown: what changed and what to do. |
| `report` | `string \| null` | yes | This project's own report, in Markdown: what of its configuration the change touches. Null when the notice carries none for it. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `route` | `string` | no | A route the change touches, as `METHOD /v1/path` with `{param}` placeholders. While the change is still ahead, a key's responses on this route carry `Deprecation`, `Sunset` and `Link` headers. |
| `removed` | `boolean` | no | True when the change removes `route`: a call to it answers 410 `ROUTE_REMOVED` for 90 days. |
| `field` | `string` | no | A field or document path the change touches. |
| `code` | `string` | no | A refusal code the change touches. |
