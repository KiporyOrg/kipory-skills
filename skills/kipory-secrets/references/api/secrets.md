<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Secrets

The node-scoped credential vault. Every write is ADMIN; nothing reads a value back; a repeat store on the same node, type and purpose replaces the value and answers 201.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/secrets`](#get-v1-secrets) |  |
| `POST` | [`/v1/secrets`](#post-v1-secrets) |  |
| `PUT` | [`/v1/secrets/{id}`](#put-v1-secrets-id) |  |
| `PATCH` | [`/v1/secrets/{id}`](#patch-v1-secrets-id) |  |
| `DELETE` | [`/v1/secrets/{id}`](#delete-v1-secrets-id) |  |
| `GET` | [`/v1/secrets/catalog`](#get-v1-secrets-catalog) |  |
| `GET` | [`/v1/secrets/resolution`](#get-v1-secrets-resolution) |  |

### `GET /v1/secrets`

The credentials a node stores itself (`?node=`) — metadata only, never a value. Requires **VIEWER**. Whether one actually resolves there, including an ancestor's, is `GET /v1/secrets/resolution?node=`; the types you can store are `GET /v1/secrets/catalog`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node whose secrets to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `secrets` | `object[]` | yes | The node's secrets — metadata only, never any stored value. |

Each item of `secrets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id — what you rotate or delete by. |
| `node` | `string` | yes | The node this secret is attached to. |
| `type` | `string` | yes | Which kind of secret this is, from the catalog — e.g. "oauth_client". It decides which fields the value must carry. |
| `purpose` | `string` | yes | The second half of the vault's lookup key, `(type, purpose)` — e.g. "google". A credential is handed out only when something in this deployment looks up exactly this pair: sign-in reads `(oauth_client, google)` and `(apple_signin, apple)`, a handler reads the service it calls. A purpose nothing reads is stored and never used — `GET /v1/secrets/resolution` lists every pair a stored credential can answer, so one absent from it is never handed out. A request credential (`http_credential`) is the exception: a step names its purpose, and that read does not list it. Unique within a node and type. |
| `publicMeta` | `object` | yes | The fields of this secret that are NOT secret, in the clear — an OAuth client id, say. Empty when the type declares none. Still tenant data even though it is readable. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |
| `updatedAt` | `string` | yes | When the secret was last rotated or changed. |

### `POST /v1/secrets`

Store a credential on a node (`node`, `type`, `purpose`, `value`). The value is encrypted and never read back. ⚠️ A second one with the same type and purpose on the same node REPLACES the stored value (an upsert, 201) and the old value is unrecoverable — list the node first. Requires **ADMIN**. Rotate it later with `PUT /v1/secrets/{id}`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node to attach the secret to. |
| `type` | `string` | yes | Which catalog type this is. It decides the required fields. |
| `purpose` | `string` | yes | Your label for this one, unique within the node and type. Reusing an existing pair REPLACES that record's value in place (its status is left alone) — an upsert, not a refusal. |
| `value` | `object` | yes | The secret's fields, keyed by the names its catalog type declares. WRITE-ONLY — it is never returned by any read. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id — what you rotate or delete by. |
| `node` | `string` | yes | The node this secret is attached to. |
| `type` | `string` | yes | Which kind of secret this is, from the catalog — e.g. "oauth_client". It decides which fields the value must carry. |
| `purpose` | `string` | yes | The second half of the vault's lookup key, `(type, purpose)` — e.g. "google". A credential is handed out only when something in this deployment looks up exactly this pair: sign-in reads `(oauth_client, google)` and `(apple_signin, apple)`, a handler reads the service it calls. A purpose nothing reads is stored and never used — `GET /v1/secrets/resolution` lists every pair a stored credential can answer, so one absent from it is never handed out. A request credential (`http_credential`) is the exception: a step names its purpose, and that read does not list it. Unique within a node and type. |
| `publicMeta` | `object` | yes | The fields of this secret that are NOT secret, in the clear — an OAuth client id, say. Empty when the type declares none. Still tenant data even though it is readable. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |
| `updatedAt` | `string` | yes | When the secret was last rotated or changed. |

### `PUT /v1/secrets/{id}`

Rotate a stored credential: replace its value in full. It never re-enables a switched-off credential — that is `PATCH /v1/secrets/{id}` with `enabled: true`. Requires **ADMIN** at the node that holds it.

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
| `purpose` | `string` | yes | The second half of the vault's lookup key, `(type, purpose)` — e.g. "google". A credential is handed out only when something in this deployment looks up exactly this pair: sign-in reads `(oauth_client, google)` and `(apple_signin, apple)`, a handler reads the service it calls. A purpose nothing reads is stored and never used — `GET /v1/secrets/resolution` lists every pair a stored credential can answer, so one absent from it is never handed out. A request credential (`http_credential`) is the exception: a step names its purpose, and that read does not list it. Unique within a node and type. |
| `publicMeta` | `object` | yes | The fields of this secret that are NOT secret, in the clear — an OAuth client id, say. Empty when the type declares none. Still tenant data even though it is readable. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |
| `updatedAt` | `string` | yes | When the secret was last rotated or changed. |

### `PATCH /v1/secrets/{id}`

Switch a stored credential off (`{"enabled": false}`) or back on (`{"enabled": true}`). Off, it stops resolving for calls made at its node and below — an active credential of the same key on an ancestor node takes over, or the key falls back as `GET /v1/secrets/resolution` shows — and its value is kept. `enabled: true` is the only way back to active: rotating the value with `PUT /v1/secrets/{id}` never re-enables it.

To destroy the value instead, `DELETE /v1/secrets/{id}`. On a retired project only switching off is accepted (409 otherwise). Requires **ADMIN** at the node that holds the secret.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `enabled` | `boolean` | yes | `false` stops the credential resolving — an active one on an ancestor node may take over — and keeps its value; `true` is the only way back to active (rotating the value with `PUT` never re-enables it). On a retired project only `false` is accepted. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id. |
| `status` | `"active" \| "disabled"` | yes | Whether this secret is currently usable. Disabling keeps the stored value and stops it being handed out, so it is reversible in a way deleting is not. |

### `DELETE /v1/secrets/{id}`

Destroy a stored credential's value for good, answering `{id, deleted: true}`. To stop it resolving but keep it, switch it off instead (`PATCH /v1/secrets/{id}`). Requires **ADMIN**; still allowed on a retired project.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The secret's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the secret that was deleted. The stored value is gone for good — switch it off (`PATCH` with `enabled: false`) instead if you may want it back. |

### `GET /v1/secrets/catalog`

The credential types this deployment can store, and the fields each takes. Any signed-in caller; read it before storing a first credential with `POST /v1/secrets`.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `types` | `object[]` | yes | Every kind of secret this platform can store, and its fields. |

Each item of `types`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type id you pass as `type` when creating one. |
| `label` | `string` | yes | A human-readable name for the type. |
| `purposeLabel` | `string` | yes | What this type calls its purpose, for a form label. |
| `purposePlaceholder` | `string` | no | An example purpose for this type. |
| `fields` | `object[]` | yes | The fields a secret of this type carries; one marked `optional` may be left out. |

### `GET /v1/secrets/resolution`

How every credential key the platform looks up resolves at one node (`?node=`): whose credential a call would use, what happens when none resolves (`fallback`) and who pays (`billedBy`). Requires **VIEWER**.

The credentials a node stores itself are `GET /v1/secrets?node=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node to resolve credentials for — usually a project's node. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node these resolutions are for. |
| `keys` | `object[]` | yes | Every key a tenant credential can answer — each vendor key a handler looks up and each sign-in credential — in the platform's own roster order, which is not a contract term. Keys the platform only ever reads from its own root are not listed. |

Each item of `keys`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `string` | yes | The catalog type, e.g. "api_key" — half of the lookup. |
| `purpose` | `string` | yes | The purpose, e.g. "firecrawl" — the other half. |
| `fallback` | `"platform-key" \| "fails-closed" \| "platform-only" \| "not-looked-up"` | yes | What happens when no credential resolves for this key: `platform-key` means the call falls through to Kipory's own key and Kipory is billed; `fails-closed` means nothing takes over and the operation is refused. This read answers only those two: it lists no key the other two values describe. |
| `state` | `"present" \| "disabled" \| "not-found" \| "branch-inactive"` | yes | Whether a credential resolves for this key at this node. `present`: an active one does — on this node or the nearest ancestor holding one — and it is what a call will use. `disabled`: the nearest one is switched off and nothing active sits above it, so none resolves. `not-found`: no node on the chain holds one. `branch-inactive`: this node or an ancestor is suspended or archived, and a branch that is not active resolves no credential at all, whatever is stored. |
| `holderNodeId` | `string \| null` | yes | The node holding the record `state` is about: the active one for `present`, the nearest switched-off one for `disabled`. Null for `not-found` and `branch-inactive`, and null when that node is an ancestor you hold no role on. |
| `holderName` | `string \| null` | yes | That node's name. Null exactly when `holderNodeId` is null. |
| `status` | `"active" \| "disabled"` | yes | The status of that record — `active` for `present`, `disabled` for `disabled`. Null when there is no such record. |
| `updatedAt` | `string \| null` | yes | When that record last changed, a status flip included. Null exactly when `holderNodeId` is null. |
| `ownStatus` | `"active" \| "disabled"` | yes | The status of the record stored on the requested node ITSELF, whether or not it is the one that resolves. Null when the node stores none. A `disabled` here beside a `present` held elsewhere is a key you switched off that an ancestor's is now standing in for. |
| `billedBy` | `"vendor-to-holder" \| "kipory"` | yes | Who pays for a call on this key. Null when `fallback` is not `platform-key`: a sign-in credential is never billed. |
