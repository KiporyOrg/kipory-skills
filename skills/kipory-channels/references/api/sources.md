<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Sources

What writes events into a project's log — a watched Telegram channel today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow; a trigger pointing at it does. Health and the listening count are read here; the events a source delivered are `GET /v1/project-events?sourceId=`.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/sources`](#get-v1-sources) |  |
| `POST` | [`/v1/sources`](#post-v1-sources) |  |
| `GET` | [`/v1/sources/{id}`](#get-v1-sources-id) |  |
| `PATCH` | [`/v1/sources/{id}`](#patch-v1-sources-id) |  |
| `DELETE` | [`/v1/sources/{id}`](#delete-v1-sources-id) |  |
| `GET` | [`/v1/sources/providers`](#get-v1-sources-providers) |  |

### `GET /v1/sources`

List one project's sources (`?project=<nodeId>`, optionally one `provider`), each with its health, how many triggers listen to it and whether a delete would be refused (`deleteRefusal`). The same rows, as authored and without those three, ride `GET /v1/bootstrap` and the `surfaces.sources` section of `GET /v1/projects/{nodeId}/document`.

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

Create a source: something that writes events a trigger can listen to, of one provider from `GET /v1/sources/providers`, in that provider's config shape. The first source of a provider seeds its event types. Refused (409) when the key is taken or the channel is already watched. With `validateOnly: true` it answers whether the create would be refused and the key it would get (`derived.key`), writing nothing. A trigger can create its source in the same write (`newSource` on `POST /v1/triggers`). Several sources at once: the `surfaces.sources` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to create the source in. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source to create. A provider the platform cannot run yet is refused with 422. |
| `key` | `string` | no | Your identifier for this source within the project and provider. Letters, digits, dots, dashes and underscores. When omitted, it is slugified from what the source watches. |
| `label` | `string` | no | Display text. Omit to leave the source unlabelled. |
| `config` | `object` | yes | The provider's configuration, in that provider's shape (see the `config` shapes on the source row). Validated against the provider's schema; a field that does not parse is refused with 422 naming it. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write would compute. Nothing here has happened. ⚠️ THE CREATE'S ONLY — a patch cannot move a source's key, so it answers without this. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `naturalKey` | `string \| null` | yes | What this source watches, as the provider names it — a channel, a Postgres table, an Apify actor — read from the config field the provider's `naturalKeyField` names. Null when the config carries none (a webhook's address is minted by the platform). |
| `enabled` | `boolean` | yes | Whether the source writes events. Switch it with `PATCH /v1/sources/{id}` `{enabled, version}`. Switching off is not instant for a connector's source: the connector stops watching the key on the next pass of its own reconcile loop, on a cadence the connector sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/sources/{id}`

Read one source, with its health, listening count and `deleteRefusal`. The events it wrote: `GET /v1/project-events?project=<nodeId>&sourceId=<id>`. Every source at once: `GET /v1/sources?project=`.

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
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `naturalKey` | `string \| null` | yes | What this source watches, as the provider names it — a channel, a Postgres table, an Apify actor — read from the config field the provider's `naturalKeyField` names. Null when the config carries none (a webhook's address is minted by the platform). |
| `enabled` | `boolean` | yes | Whether the source writes events. Switch it with `PATCH /v1/sources/{id}` `{enabled, version}`. Switching off is not instant for a connector's source: the connector stops watching the key on the next pass of its own reconcile loop, on a cadence the connector sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/sources/{id}`

Change a source's name or config (the provider is permanent), or switch it on or off with `enabled` — a source switched off writes no events. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. On a retired project only `{enabled: false, version}` is accepted. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The version you read. Refused with 409 if it has moved. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `label` | `string \| null` | no | New display text, or null to clear it. Omit to leave it alone. |
| `config` | `object` | no | A replacement configuration, whole, in the provider's shape. Omit to leave it alone. The provider itself cannot change. |
| `enabled` | `boolean` | no | Switch the source on or off. Omit to leave it alone. A source switched off writes no events, so no trigger listening to it fires. On a retired project, a patch whose only change is `enabled: false` is still accepted; every other patch is refused with 409. |
| `validateOnly` | `boolean` | no | Check this patch against the stored source and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the source — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `provider` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | Which kind of source this is. Permanent — a patch cannot change it. |
| `key` | `string` | yes | Your identifier for this source within the project and provider, slugified from what it watches when you do not supply one. Permanent. |
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this source. |
| `config` | `object` | yes | The provider's own configuration. Which shape applies is decided by the source's `provider`. |
| `naturalKey` | `string \| null` | yes | What this source watches, as the provider names it — a channel, a Postgres table, an Apify actor — read from the config field the provider's `naturalKeyField` names. Null when the config carries none (a webhook's address is minted by the platform). |
| `enabled` | `boolean` | yes | Whether the source writes events. Switch it with `PATCH /v1/sources/{id}` `{enabled, version}`. Switching off is not instant for a connector's source: the connector stops watching the key on the next pass of its own reconcile loop, on a cadence the connector sets rather than this API. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `listening` | `integer` | yes | How many triggers listen to this source. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write would compute. Nothing here has happened. ⚠️ THE CREATE'S ONLY — a patch cannot move a source's key, so it answers without this. |

### `DELETE /v1/sources/{id}`

Delete one source. Refused (409 `SOURCE_HAS_LISTENERS`) while a trigger listens to it — the list publishes that refusal per source as `deleteRefusal`. With `?validateOnly=true` it answers whether it would be, writing nothing. To stop it but keep it: `PATCH /v1/sources/{id}` with `enabled: false`. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `GET /v1/sources/providers`

The source-provider registry: every provider a source can be, grouped by concern, with the events it writes, what one source of it watches (`naturalKeyField`), the overlap policy a trigger on it defaults to and whether it can be created today (`availability`, the verdict `POST /v1/sources` enforces), plus the names announced as coming. The same for every caller; no project is read. Read it before creating a source.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `concerns` | `object[]` | yes | Every concern, in the order the catalogue draws them. Adding a provider never adds a concern. |
| `providers` | `object[]` | yes | Every provider a source can be, grouped by concern in `concerns` order, then as declared. |
| `announced` | `object[]` | yes | Names the catalogue shows as coming, with no provider, config schema or source behind them. Never creatable. |
