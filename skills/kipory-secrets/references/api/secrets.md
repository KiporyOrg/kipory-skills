<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 93bee81e1768 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Secrets

The node-scoped credential vault. Every write is ADMIN; nothing reads a value back; a repeat store on the same node, type and purpose replaces the value and answers 201.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/secrets`](#get-v1-secrets) |  |
| `POST` | [`/v1/secrets`](#post-v1-secrets) |  |
| `PUT` | [`/v1/secrets/{id}`](#put-v1-secrets-id) |  |
| `DELETE` | [`/v1/secrets/{id}`](#delete-v1-secrets-id) |  |
| `POST` | [`/v1/secrets/{id}/disable`](#post-v1-secrets-id-disable) |  |
| `POST` | [`/v1/secrets/{id}/enable`](#post-v1-secrets-id-enable) |  |
| `GET` | [`/v1/secrets/catalog`](#get-v1-secrets-catalog) |  |

### `GET /v1/secrets`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node whose secrets to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `secrets` | `object[]` | yes | The node's secrets — metadata only, never any stored value. |

### `POST /v1/secrets`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node to attach the secret to. |
| `type` | `string` | yes | Which catalog type this is. It decides the required fields. |
| `purpose` | `string` | yes | Your label for this one, unique within the node and type. Reusing an existing pair is refused rather than silently overwriting. |
| `value` | `object` | yes | The secret's fields, keyed by the names its catalog type declares. WRITE-ONLY — it is never returned by any read. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id — what you rotate or delete by. |
| `node` | `string` | yes | The node this secret is attached to. |
| `type` | `string` | yes | Which kind of secret this is, from the catalog — e.g. "oauth_client". It decides which fields the value must carry. |
| `purpose` | `string` | yes | Your label distinguishing several secrets of the same type — e.g. "google". Unique within a node and type. |
| `publicMeta` | `object` | yes | The fields of this secret that are NOT secret, in the clear — an OAuth client id, say. Empty when the type declares none. Still tenant data even though it is readable. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |
| `updatedAt` | `string` | yes | When the secret was last rotated or changed. |

### `PUT /v1/secrets/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `value` | `object` | yes | The replacement value, in full. It REPLACES what is stored rather than merging into it, and the old value is gone — there is no read-back to recover it from. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id — what you rotate or delete by. |
| `node` | `string` | yes | The node this secret is attached to. |
| `type` | `string` | yes | Which kind of secret this is, from the catalog — e.g. "oauth_client". It decides which fields the value must carry. |
| `purpose` | `string` | yes | Your label distinguishing several secrets of the same type — e.g. "google". Unique within a node and type. |
| `publicMeta` | `object` | yes | The fields of this secret that are NOT secret, in the clear — an OAuth client id, say. Empty when the type declares none. Still tenant data even though it is readable. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |
| `updatedAt` | `string` | yes | When the secret was last rotated or changed. |

### `DELETE /v1/secrets/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Id of the secret that was removed. |
| `removed` | `true` | yes | Always `true`. The stored value is gone for good — disable it instead if you may want it back. |

### `POST /v1/secrets/{id}/disable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |

### `POST /v1/secrets/{id}/enable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |

### `GET /v1/secrets/catalog`

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `types` | `object[]` | yes | Every kind of secret this platform can store, and its fields. |
