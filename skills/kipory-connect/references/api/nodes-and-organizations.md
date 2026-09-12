<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 93bee81e1768 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Nodes and organisations

The ownership tree: an organisation node holds project nodes, and a grant at a node reaches everything beneath it. Reading or administering a node and its members is a signed-in human's surface; the routes here are the ones an API key can call. A key learns its own grant from the `tenancy` section of `GET /v1/bootstrap`.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/nodes/{nodeId}/effective-role`](#get-v1-nodes-nodeid-effective-role) |  |
| `GET` | [`/v1/nodes/{nodeId}/invites`](#get-v1-nodes-nodeid-invites) |  |
| `POST` | [`/v1/nodes/{nodeId}/invites`](#post-v1-nodes-nodeid-invites) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/invites/{inviteId}`](#delete-v1-nodes-nodeid-invites-inviteid) |  |
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

### `GET /v1/nodes/{nodeId}/invites`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node the invitation is for. Not a project id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `items` | `object[]` | yes | Pending invites on this node, newest first. Claimed and expired invites are not listed. |

### `POST /v1/nodes/{nodeId}/invites`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node the invitation is for. Not a project id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `email` | `string` | yes | Address to invite. Must be a valid email. |
| `role` | `"VIEWER" \| "EDITOR" \| "ADMIN" \| "OWNER"` | yes | Role the invitee receives on this node once they claim. |
| `projectId` | `string` | yes | The project the invitee signs in through to claim. For a project node this is that project; for an organization node the caller picks one, since it cannot be derived from the node. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `inviteId` | `string` | yes | Id of the created invite. Read the list endpoint for the full record. |
| `notified` | `boolean` | yes | Whether the invitation email was accepted by the mail transport. `false` means the invite stands and is claimable, but the invited person has NOT been told — tell them another way, or re-issue after the transport is fixed. |

### `DELETE /v1/nodes/{nodeId}/invites/{inviteId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The node the invitation belongs to. |
| `inviteId` | `string` | yes | The invitation to revoke. |

**Response `204`**

_No fields._

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
| `status` | `"active" \| "archived" \| "suspended" \| "deleted"` | yes | This node's OWN status — what was set here, never overwritten by an ancestor. Anything other than `active` restricts what the projects beneath it may do. |
| `effectiveStatus` | `"active" \| "archived" \| "suspended" \| "deleted"` | yes | The most restrictive status over this node and everything above it. This is what decides whether work is admitted. When it is stricter than `status`, the restriction was set higher up and is not this node's to lift. |
