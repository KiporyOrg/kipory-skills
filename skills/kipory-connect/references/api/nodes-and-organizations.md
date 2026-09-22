<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Nodes and organisations

The ownership tree: an organisation node holds project nodes, and a grant at a node reaches everything beneath it. Reading or administering a node and its members is a signed-in human's surface; the routes here are the ones an API key can call. A key learns its own grant from the `tenancy` section of `GET /v1/bootstrap`.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/nodes/{nodeId}/effective-role`](#get-v1-nodes-nodeid-effective-role) |  |
| `POST` | [`/v1/organizations`](#post-v1-organizations) |  |

### `GET /v1/nodes/{nodeId}/effective-role`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node to resolve the role at. Not a project id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `userId` | `string` | yes | WHOSE role to resolve. Not yours — this asks about another user's standing at that node. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node the role was resolved at. |
| `userId` | `string` | yes | Whose role this is. |
| `role` | `"OWNER" \| "ADMIN" \| "EDITOR" \| "VIEWER" \| "NONE"` | yes | What that user may do at that node, inherited from anywhere above it. `NONE` is an ORDINARY ANSWER meaning they hold nothing here — not an error, and not a refusal to say. Handle it explicitly. |

### `POST /v1/organizations`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | Display name, 1–200 characters. |
| `parent` | `string` | no | Node id to create under. Omit for a top-level organization; pass another organization's node id to nest one beneath it. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id — how every route that takes a node addresses it. |
| `name` | `string` | yes | Display name. Not unique, and not how anything addresses it. |
| `kind` | `"organization"` | yes | Always `organization`; present so node shapes are discriminable. |
| `parentId` | `string` | yes | Node id of the parent. Every organization has one — a top-level organization's parent is the installation root. |
| `status` | `"active" \| "archived" \| "suspended"` | yes | This node's OWN status — what was set here, never overwritten by an ancestor. Anything other than `active` restricts what the projects beneath it may do. |
| `effectiveStatus` | `"active" \| "archived" \| "suspended"` | yes | The most restrictive status over this node and everything above it. This is what decides whether work is admitted. When it is stricter than `status`, the restriction was set higher up and is not this node's to lift. |
