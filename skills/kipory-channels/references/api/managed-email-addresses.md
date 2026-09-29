<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Managed email addresses

Sending identities attached to a node, which the outbound mail handler sends from.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/managed-email-addresses`](#get-v1-managed-email-addresses) |  |
| `POST` | [`/v1/managed-email-addresses`](#post-v1-managed-email-addresses) |  |
| `PATCH` | [`/v1/managed-email-addresses/{id}`](#patch-v1-managed-email-addresses-id) |  |
| `DELETE` | [`/v1/managed-email-addresses/{id}`](#delete-v1-managed-email-addresses-id) |  |

### `GET /v1/managed-email-addresses`

The managed sending addresses a node owns itself (`?node=`), not those of the nodes beneath it. Requires **VIEWER** at the node.

A sending address is a platform-wide claim on a name, distinct from a stored credential: credentials are `GET /v1/secrets`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node whose OWN addresses to list. Inherited addresses are not included: inheritance is a send-time concern, and what you manage here is what is attached here. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `addresses` | `object[]` | yes | The node's own addresses, ordered by domain then local part. |

### `POST /v1/managed-email-addresses`

Claim a managed sending address for a node (`node` in the body). The name is unique across the whole platform, so a taken one is refused 409. Requires **ADMIN** at the node.

To change its display name, reply-to or grade later, or to switch it off, `PATCH /v1/managed-email-addresses/{id}`; to give the name up, `DELETE`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `node` | `string` | yes | The node that will own this address. |
| `localPart` | `string` | yes | The part before the `@`. Case and surrounding whitespace are folded before the claim is made, because the delivery service treats the folded forms as one address. |
| `domain` | `string` | yes | The part after the `@`, e.g. `kipory.com`. |
| `grade` | `"relay" \| "mailbox"` | yes | Whether a real mailbox exists behind this address. `relay` has no account: it can send, replies fall to the catch-all, and it costs nothing. `mailbox` is backed by a provisioned user account that can be signed into — and to which the delivery service's per-user daily send cap applies, which is the difference that matters in code. This platform RECORDS the grade; it cannot create or verify the mailbox. |
| `displayName` | `string` | no | Optional human name shown beside the address. |
| `replyTo` | `string` | no | Optional address replies should be directed to instead. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Opaque identifier for this address. |
| `orgNodeId` | `string` | yes | The node that owns this address. Ownership reaches DOWNWARD: this node and every node beneath it may send as the address. |
| `localPart` | `string` | yes | The part before the `@`, stored lowercased and trimmed. Excludes `+`, which the platform's return-path scheme uses as a separator. |
| `domain` | `string` | yes | The part after the `@`, stored lowercased. |
| `address` | `string` | yes | The full address, composed from the two parts above. |
| `grade` | `"relay" \| "mailbox"` | yes | Whether a real mailbox exists behind this address. `relay` has no account: it can send, replies fall to the catch-all, and it costs nothing. `mailbox` is backed by a provisioned user account that can be signed into — and to which the delivery service's per-user daily send cap applies, which is the difference that matters in code. This platform RECORDS the grade; it cannot create or verify the mailbox. |
| `displayName` | `string \| null` | yes | The human name a recipient sees beside the address. Quoted in the header only when the format requires it. |
| `replyTo` | `string \| null` | yes | Where replies go, when that is not the address itself. Null means replies reach whatever the address's inbound arrangement is — for a relay-grade address, the catch-all. |
| `status` | `"active" \| "disabled"` | yes | Whether this address may send. Disabling keeps the row and its claim on the global namespace, so it is reversible in a way removing is not — removing releases the name for any other node to take. |

### `PATCH /v1/managed-email-addresses/{id}`

Change a managed sending address: its `displayName`, `replyTo` or `grade`, and switch it off (`enabled: false` — it stops sending and keeps its claim on the name) or back on (`enabled: true`). Send only the fields to change.

To give the name up for good, `DELETE /v1/managed-email-addresses/{id}`, which releases it to every other node. On a retired project only `{"enabled": false}` is accepted (409 otherwise). Requires **ADMIN** at the node that owns the address.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The managed email address's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `displayName` | `string \| null` | no | New display name. Null clears it; omitting the field leaves it alone. |
| `replyTo` | `string \| null` | no | New reply-to. Null clears it; omitting the field leaves it alone. |
| `grade` | `"relay" \| "mailbox"` | no | Whether a real mailbox exists behind this address. `relay` has no account: it can send, replies fall to the catch-all, and it costs nothing. `mailbox` is backed by a provisioned user account that can be signed into — and to which the delivery service's per-user daily send cap applies, which is the difference that matters in code. This platform RECORDS the grade; it cannot create or verify the mailbox. |
| `enabled` | `boolean` | no | `false` stops the address sending and keeps its claim on the name; `true` lets it send again. Omitting the field leaves it alone. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Opaque identifier for this address. |
| `orgNodeId` | `string` | yes | The node that owns this address. Ownership reaches DOWNWARD: this node and every node beneath it may send as the address. |
| `localPart` | `string` | yes | The part before the `@`, stored lowercased and trimmed. Excludes `+`, which the platform's return-path scheme uses as a separator. |
| `domain` | `string` | yes | The part after the `@`, stored lowercased. |
| `address` | `string` | yes | The full address, composed from the two parts above. |
| `grade` | `"relay" \| "mailbox"` | yes | Whether a real mailbox exists behind this address. `relay` has no account: it can send, replies fall to the catch-all, and it costs nothing. `mailbox` is backed by a provisioned user account that can be signed into — and to which the delivery service's per-user daily send cap applies, which is the difference that matters in code. This platform RECORDS the grade; it cannot create or verify the mailbox. |
| `displayName` | `string \| null` | yes | The human name a recipient sees beside the address. Quoted in the header only when the format requires it. |
| `replyTo` | `string \| null` | yes | Where replies go, when that is not the address itself. Null means replies reach whatever the address's inbound arrangement is — for a relay-grade address, the catch-all. |
| `status` | `"active" \| "disabled"` | yes | Whether this address may send. Disabling keeps the row and its claim on the global namespace, so it is reversible in a way removing is not — removing releases the name for any other node to take. |

### `DELETE /v1/managed-email-addresses/{id}`

Delete a managed sending address, releasing its name to every other node. Answers `{id, deleted: true, releasedAddress}`. Requires **ADMIN** at the node that owns it; still allowed on a retired project, whose purge waits for it.

To stop it sending but keep the claim, switch it off instead: `PATCH /v1/managed-email-addresses/{id}` with `{"enabled": false}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The managed email address's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the address that was deleted. Switch it off instead (`PATCH` with `enabled: false`) if you may want it back — that keeps the claim, deleting does not. |
| `releasedAddress` | `string` | yes | The address whose name is now free for ANY node to claim. Named explicitly because the namespace is platform-wide: removing is not a private act, and whoever claims it next receives mail people may still be sending here. |
