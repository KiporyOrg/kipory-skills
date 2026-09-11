<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8a31334ff890 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Sources

What writes events into a project's log — a watched Telegram channel today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow; a trigger pointing at it does. Health, the listening count and the source's own events are read here.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/sources`](#get-v1-sources) |  |
| `POST` | [`/v1/sources`](#post-v1-sources) |  |
| `GET` | [`/v1/sources/{id}`](#get-v1-sources-id) |  |
| `PATCH` | [`/v1/sources/{id}`](#patch-v1-sources-id) |  |
| `DELETE` | [`/v1/sources/{id}`](#delete-v1-sources-id) |  |
| `POST` | [`/v1/sources/{id}/disable`](#post-v1-sources-id-disable) |  |
| `POST` | [`/v1/sources/{id}/enable`](#post-v1-sources-id-enable) |  |
| `GET` | [`/v1/sources/{id}/events`](#get-v1-sources-id-events) |  |

### `GET /v1/sources`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to list sources for. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | no | Only sources of this provider. |
| `limit` | `integer` | no | How many sources to return, newest first. Defaults to 100, capped at 200. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `sources` | `object[]` | yes | The project's sources, newest first, up to `limit`. |

### `POST /v1/sources`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to create the source in. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source to create. A provider the platform cannot run yet is refused with 422. |
| `key` | `string` | no | Your identifier for this source within the project and provider. Letters, digits, dots, dashes and underscores. When omitted, it is slugified from what the source watches. |
| `name` | `string` | no | Display name. Omit to leave the source unnamed. |
| `config` | `object` | yes | The provider's configuration, in that provider's shape (see the `config` shapes on the source row). Validated against the provider's schema; a field that does not parse is refused with 422 naming it. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `enabled` | `boolean` | yes | Whether the source writes events. Change it through the enable and disable endpoints rather than a patch. Disabling is not instant for Telegram: the watcher fleet drops the channel on the next pass of its own reconcile loop, on a cadence the watcher service sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection; removing a source something listens to is refused with 409. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/sources/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `enabled` | `boolean` | yes | Whether the source writes events. Change it through the enable and disable endpoints rather than a patch. Disabling is not instant for Telegram: the watcher fleet drops the channel on the next pass of its own reconcile loop, on a cadence the watcher service sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection; removing a source something listens to is refused with 409. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/sources/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The version you read. Refused with 409 if it has moved. |
| `name` | `string \| null` | no | New display name, or null to clear it. Omit to leave it alone. |
| `config` | `object` | no | A replacement configuration, whole, in the provider's shape. Omit to leave it alone. The provider itself cannot change. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `enabled` | `boolean` | yes | Whether the source writes events. Change it through the enable and disable endpoints rather than a patch. Disabling is not instant for Telegram: the watcher fleet drops the channel on the next pass of its own reconcile loop, on a cadence the watcher service sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection; removing a source something listens to is refused with 409. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/sources/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `POST /v1/sources/{id}/disable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The version you read. Refused with 409 if it has moved. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `enabled` | `boolean` | yes | Whether the source writes events. Change it through the enable and disable endpoints rather than a patch. Disabling is not instant for Telegram: the watcher fleet drops the channel on the next pass of its own reconcile loop, on a cadence the watcher service sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection; removing a source something listens to is refused with 409. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/sources/{id}/enable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The version you read. Refused with 409 if it has moved. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `enabled` | `boolean` | yes | Whether the source writes events. Change it through the enable and disable endpoints rather than a patch. Disabling is not instant for Telegram: the watcher fleet drops the channel on the next pass of its own reconcile loop, on a cadence the watcher service sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection; removing a source something listens to is refused with 409. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/sources/{id}/events`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many of the newest events to return. Default 50, cap 200. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `events` | `object[]` | yes | Newest first. |
| `truncated` | `boolean` | yes | True when more events exist within retention than the limit. |
