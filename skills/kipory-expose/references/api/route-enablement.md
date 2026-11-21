<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Route enablement

Per-project on/off for the platform's coded route groups — not for your own endpoints, which have no switch (delete one to stop it). A coded route in a disabled group answers 404 on the project host, while still winning the match over an endpoint that shares its path.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/route-enablement`](#get-v1-route-enablement) |  |
| `POST` | [`/v1/route-enablement`](#post-v1-route-enablement) |  |

### `GET /v1/route-enablement`

Which of the platform's code-backed route groups (sign-in, account, usage and billing, files, API docs) this project serves (`?project=<nodeId>`), resolved to the list that is on, and each group with whether this project turned it off (`set-here`) or the platform default (on) stands. These are the platform's own routes under the project's host; the routes you author are endpoints (`/v1/api-endpoints`). The same answer rides `GET /v1/bootstrap` (`routeEnablement`); the document's `project.builtInRoutes` names the groups that are off.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose enablement to resolve. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project — echoes the request, for a cache key. |
| `enabled` | `string[]` | yes | The toggleable route groups currently ON for this project, resolved. Always-on infrastructure groups are not listed here and cannot be turned off. |
| `groups` | `object[]` | yes | Every toggleable route group with its state and where that state comes from, for a settings page. |

Each item of `groups`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `group` | `string` | yes | The route group. |
| `enabled` | `boolean` | yes | Whether this project serves it. |
| `source` | `"set-here" \| "platform-default"` | yes | `set-here`: this project turned it off. `platform-default`: nothing is set, so it is on. |

### `POST /v1/route-enablement`

Switch one code-backed route group on or off for a project (`{project, group, enabled}`) and answer the resolved list. Idempotent; it is a project setting, not a row, so it takes no `version`. Every group may be off; an always-on or unknown group is refused (422). The whole set at once: `project.builtInRoutes` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project. |
| `group` | `string` | yes | The route group to toggle. Must be one of the toggleable groups; an always-on or unknown group is refused with 422. |
| `enabled` | `boolean` | yes | Desired state. `true` puts the group back to the platform default, which is on. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project — echoes the request, for a cache key. |
| `enabled` | `string[]` | yes | The toggleable route groups currently ON for this project, resolved. Always-on infrastructure groups are not listed here and cannot be turned off. |
| `groups` | `object[]` | yes | Every toggleable route group with its state and where that state comes from, for a settings page. |

Each item of `groups`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `group` | `string` | yes | The route group. |
| `enabled` | `boolean` | yes | Whether this project serves it. |
| `source` | `"set-here" \| "platform-default"` | yes | `set-here`: this project turned it off. `platform-default`: nothing is set, so it is on. |
