<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 817f751217fc · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Route enablement

Per-project on/off for coded route groups and dynamic endpoints. An endpoint in a disabled group is dead independently of shadowing.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/route-enablement`](#get-v1-route-enablement) |  |
| `POST` | [`/v1/route-enablement`](#post-v1-route-enablement) |  |

### `GET /v1/route-enablement`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose enablement to resolve. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project — echoes the request, for a cache key. |
| `enabled` | `string[]` | yes | The toggleable route groups currently ON for this project, resolved. Always-on infrastructure groups are not listed here and cannot be turned off. |

### `POST /v1/route-enablement`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project. |
| `group` | `string` | yes | The route group to toggle. Must be one of the toggleable groups; an always-on or unknown group is refused with 422. |
| `enabled` | `boolean` | yes | Desired state. Turning the LAST enabled group off is refused with 422 — a project keeps at least one code-backed group on. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project — echoes the request, for a cache key. |
| `enabled` | `string[]` | yes | The toggleable route groups currently ON for this project, resolved. Always-on infrastructure groups are not listed here and cannot be turned off. |
