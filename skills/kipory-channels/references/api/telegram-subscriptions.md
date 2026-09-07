<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 87ba7606f60b · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Telegram subscriptions

A project's subscriptions to Telegram channels, which feed ingest.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/telegram-subscriptions`](#get-v1-telegram-subscriptions) |  |
| `POST` | [`/v1/telegram-subscriptions`](#post-v1-telegram-subscriptions) |  |
| `GET` | [`/v1/telegram-subscriptions/{id}`](#get-v1-telegram-subscriptions-id) |  |
| `PATCH` | [`/v1/telegram-subscriptions/{id}`](#patch-v1-telegram-subscriptions-id) |  |
| `DELETE` | [`/v1/telegram-subscriptions/{id}`](#delete-v1-telegram-subscriptions-id) |  |
| `POST` | [`/v1/telegram-subscriptions/{id}/disable`](#post-v1-telegram-subscriptions-id-disable) |  |
| `POST` | [`/v1/telegram-subscriptions/{id}/enable`](#post-v1-telegram-subscriptions-id-enable) |  |

### `GET /v1/telegram-subscriptions`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose subscriptions to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `subscriptions` | `object[]` | yes | The project's telegram subscriptions, unpaginated. |

### `POST /v1/telegram-subscriptions`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the subscription. |
| `channel` | `string` | yes | The Telegram channel to watch. |
| `sourceStrategy` | `"mtproto"` | no | How messages should be fetched. Defaults to `mtproto`, which is also the only accepted value: `http_poll` and `apify` are reserved in the data model but no adapter fetches them yet, and a subscription saved under one would report itself enabled while never receiving a message. They become accepted here the moment an adapter ships. |
| `endpoint` | `string` | yes | A free-text attribution label recorded against every ingested message. Not resolved against anything — pick something you will recognise in a trace. |
| `flowId` | `string` | yes | The flow to run per message. Must belong to this project; checked when you save. |
| `inputsTemplate` | `object` | no | Fixed inputs passed to the flow on every message. Defaults to empty. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Subscription id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `createdByUserId` | `string \| null` | yes | Who created this subscription. PROVENANCE ONLY — the flow does not run as this user, and the subscription keeps working after they are gone. Null when it was created by a token, or once that account is torn down. |
| `channel` | `string` | yes | The Telegram channel being watched, as it was entered. |
| `sourceStrategy` | `"mtproto" \| "http_poll" \| "apify"` | yes | How messages are fetched from this channel. Wider than what you may SAVE: only strategies with a running adapter are accepted on write, and this reports whatever the row actually holds. |
| `endpoint` | `string` | yes | A free-text label recorded against every message this subscription ingests, for attribution and tracing. ⚠️ Despite the name it is NOT checked against your API endpoints — nothing resolves it, so a value that looks like a route is still just a string. |
| `flowId` | `string` | yes | The flow run once per incoming message. Validated against the project when you save, but held as a soft reference afterwards: deleting the flow leaves this pointing at nothing rather than deleting the subscription. |
| `inputsTemplate` | `object` | yes | Fixed inputs passed to the flow on every message, alongside the message itself. Empty when the flow needs nothing beyond the message. |
| `enabled` | `boolean` | yes | Whether incoming messages are ingested. Disabling stops ingestion going forward and does not remove what was already taken in. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | When the subscription was created (ISO). |
| `updatedAt` | `string` | yes | When it was last changed (ISO). |

### `GET /v1/telegram-subscriptions/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The subscription's id, as returned by create or list. Not the channel name, and not the `endpoint` label. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Subscription id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `createdByUserId` | `string \| null` | yes | Who created this subscription. PROVENANCE ONLY — the flow does not run as this user, and the subscription keeps working after they are gone. Null when it was created by a token, or once that account is torn down. |
| `channel` | `string` | yes | The Telegram channel being watched, as it was entered. |
| `sourceStrategy` | `"mtproto" \| "http_poll" \| "apify"` | yes | How messages are fetched from this channel. Wider than what you may SAVE: only strategies with a running adapter are accepted on write, and this reports whatever the row actually holds. |
| `endpoint` | `string` | yes | A free-text label recorded against every message this subscription ingests, for attribution and tracing. ⚠️ Despite the name it is NOT checked against your API endpoints — nothing resolves it, so a value that looks like a route is still just a string. |
| `flowId` | `string` | yes | The flow run once per incoming message. Validated against the project when you save, but held as a soft reference afterwards: deleting the flow leaves this pointing at nothing rather than deleting the subscription. |
| `inputsTemplate` | `object` | yes | Fixed inputs passed to the flow on every message, alongside the message itself. Empty when the flow needs nothing beyond the message. |
| `enabled` | `boolean` | yes | Whether incoming messages are ingested. Disabling stops ingestion going forward and does not remove what was already taken in. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | When the subscription was created (ISO). |
| `updatedAt` | `string` | yes | When it was last changed (ISO). |

### `PATCH /v1/telegram-subscriptions/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The subscription's id, as returned by create or list. Not the channel name, and not the `endpoint` label. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required; a mismatch is refused with 409. |
| `channel` | `string` | no | Watch a different channel. Messages already ingested from the old one stay where they are. |
| `sourceStrategy` | `"mtproto"` | no | Change how messages are fetched. Same restriction as on create: only a strategy with a running adapter is accepted, so this cannot move a working subscription onto one that would silently stop fetching. |
| `endpoint` | `string` | no | Change the attribution label used for future messages. |
| `flowId` | `string` | no | Run a different flow per message. Must belong to this project. |
| `inputsTemplate` | `object` | no | REPLACES the fixed inputs wholesale rather than merging into them — send the whole object, including keys you are not changing. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Subscription id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `createdByUserId` | `string \| null` | yes | Who created this subscription. PROVENANCE ONLY — the flow does not run as this user, and the subscription keeps working after they are gone. Null when it was created by a token, or once that account is torn down. |
| `channel` | `string` | yes | The Telegram channel being watched, as it was entered. |
| `sourceStrategy` | `"mtproto" \| "http_poll" \| "apify"` | yes | How messages are fetched from this channel. Wider than what you may SAVE: only strategies with a running adapter are accepted on write, and this reports whatever the row actually holds. |
| `endpoint` | `string` | yes | A free-text label recorded against every message this subscription ingests, for attribution and tracing. ⚠️ Despite the name it is NOT checked against your API endpoints — nothing resolves it, so a value that looks like a route is still just a string. |
| `flowId` | `string` | yes | The flow run once per incoming message. Validated against the project when you save, but held as a soft reference afterwards: deleting the flow leaves this pointing at nothing rather than deleting the subscription. |
| `inputsTemplate` | `object` | yes | Fixed inputs passed to the flow on every message, alongside the message itself. Empty when the flow needs nothing beyond the message. |
| `enabled` | `boolean` | yes | Whether incoming messages are ingested. Disabling stops ingestion going forward and does not remove what was already taken in. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | When the subscription was created (ISO). |
| `updatedAt` | `string` | yes | When it was last changed (ISO). |

### `DELETE /v1/telegram-subscriptions/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The subscription's id, as returned by create or list. Not the channel name, and not the `endpoint` label. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the subscription that was removed. |

### `POST /v1/telegram-subscriptions/{id}/disable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The subscription's id, as returned by create or list. Not the channel name, and not the `endpoint` label. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required, so enabling or disabling cannot race another edit; a mismatch is refused with 409. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Subscription id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `createdByUserId` | `string \| null` | yes | Who created this subscription. PROVENANCE ONLY — the flow does not run as this user, and the subscription keeps working after they are gone. Null when it was created by a token, or once that account is torn down. |
| `channel` | `string` | yes | The Telegram channel being watched, as it was entered. |
| `sourceStrategy` | `"mtproto" \| "http_poll" \| "apify"` | yes | How messages are fetched from this channel. Wider than what you may SAVE: only strategies with a running adapter are accepted on write, and this reports whatever the row actually holds. |
| `endpoint` | `string` | yes | A free-text label recorded against every message this subscription ingests, for attribution and tracing. ⚠️ Despite the name it is NOT checked against your API endpoints — nothing resolves it, so a value that looks like a route is still just a string. |
| `flowId` | `string` | yes | The flow run once per incoming message. Validated against the project when you save, but held as a soft reference afterwards: deleting the flow leaves this pointing at nothing rather than deleting the subscription. |
| `inputsTemplate` | `object` | yes | Fixed inputs passed to the flow on every message, alongside the message itself. Empty when the flow needs nothing beyond the message. |
| `enabled` | `boolean` | yes | Whether incoming messages are ingested. Disabling stops ingestion going forward and does not remove what was already taken in. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | When the subscription was created (ISO). |
| `updatedAt` | `string` | yes | When it was last changed (ISO). |

### `POST /v1/telegram-subscriptions/{id}/enable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The subscription's id, as returned by create or list. Not the channel name, and not the `endpoint` label. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required, so enabling or disabling cannot race another edit; a mismatch is refused with 409. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Subscription id — the address for read, patch, delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `createdByUserId` | `string \| null` | yes | Who created this subscription. PROVENANCE ONLY — the flow does not run as this user, and the subscription keeps working after they are gone. Null when it was created by a token, or once that account is torn down. |
| `channel` | `string` | yes | The Telegram channel being watched, as it was entered. |
| `sourceStrategy` | `"mtproto" \| "http_poll" \| "apify"` | yes | How messages are fetched from this channel. Wider than what you may SAVE: only strategies with a running adapter are accepted on write, and this reports whatever the row actually holds. |
| `endpoint` | `string` | yes | A free-text label recorded against every message this subscription ingests, for attribution and tracing. ⚠️ Despite the name it is NOT checked against your API endpoints — nothing resolves it, so a value that looks like a route is still just a string. |
| `flowId` | `string` | yes | The flow run once per incoming message. Validated against the project when you save, but held as a soft reference afterwards: deleting the flow leaves this pointing at nothing rather than deleting the subscription. |
| `inputsTemplate` | `object` | yes | Fixed inputs passed to the flow on every message, alongside the message itself. Empty when the flow needs nothing beyond the message. |
| `enabled` | `boolean` | yes | Whether incoming messages are ingested. Disabling stops ingestion going forward and does not remove what was already taken in. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | When the subscription was created (ISO). |
| `updatedAt` | `string` | yes | When it was last changed (ISO). |
