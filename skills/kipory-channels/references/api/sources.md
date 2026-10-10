<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Sources

What writes events into a project's log — a watched Telegram channel today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow; a trigger pointing at it does. Health and the listening count are read here; the events a source delivered are `GET /v1/project-events?sourceId=`.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

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

Each item of `sources`:

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
| `listening` | `integer` | yes | How many triggers listen to this source: those that name it, and enabled triggers with no source on its provider's own events, which hear every source of that provider in the project. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count — only a trigger that names the source refuses it. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `watchedByRuns` | `boolean` | yes | True once a flow's `source.watch` has held this source. A source runs hold counts against the project's cap on sources watched by runs while it is on. |
| `holders` | `integer` | yes | How many holders keep this source watched through `source.watch`. The last `source.unwatch` switches it off. Zero for a source no run holds. |
| `lastRunId` | `string \| null` | yes | The run that last created, switched on or switched off this source through `source.watch` / `source.unwatch` — or null when no run has. Look it up with `/v1/runs/{runId}`. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

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

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

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
| `listening` | `integer` | yes | How many triggers listen to this source: those that name it, and enabled triggers with no source on its provider's own events, which hear every source of that provider in the project. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count — only a trigger that names the source refuses it. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `watchedByRuns` | `boolean` | yes | True once a flow's `source.watch` has held this source. A source runs hold counts against the project's cap on sources watched by runs while it is on. |
| `holders` | `integer` | yes | How many holders keep this source watched through `source.watch`. The last `source.unwatch` switches it off. Zero for a source no run holds. |
| `lastRunId` | `string \| null` | yes | The run that last created, switched on or switched off this source through `source.watch` / `source.unwatch` — or null when no run has. Look it up with `/v1/runs/{runId}`. |
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
| `listening` | `integer` | yes | How many triggers listen to this source: those that name it, and enabled triggers with no source on its provider's own events, which hear every source of that provider in the project. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count — only a trigger that names the source refuses it. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `watchedByRuns` | `boolean` | yes | True once a flow's `source.watch` has held this source. A source runs hold counts against the project's cap on sources watched by runs while it is on. |
| `holders` | `integer` | yes | How many holders keep this source watched through `source.watch`. The last `source.unwatch` switches it off. Zero for a source no run holds. |
| `lastRunId` | `string \| null` | yes | The run that last created, switched on or switched off this source through `source.watch` / `source.unwatch` — or null when no run has. Look it up with `/v1/runs/{runId}`. |
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
| `listening` | `integer` | yes | How many triggers listen to this source: those that name it, and enabled triggers with no source on its provider's own events, which hear every source of that provider in the project. A source nothing listens to still costs its connection. Whether a delete would be refused is `deleteRefusal`, not this count — only a trigger that names the source refuses it. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this source would be refused right now, in the delete's own words — or null when nothing about the source stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired. A trigger created between this read and the delete still refuses it. |
| `watchedByRuns` | `boolean` | yes | True once a flow's `source.watch` has held this source. A source runs hold counts against the project's cap on sources watched by runs while it is on. |
| `holders` | `integer` | yes | How many holders keep this source watched through `source.watch`. The last `source.unwatch` switches it off. Zero for a source no run holds. |
| `lastRunId` | `string \| null` | yes | The run that last created, switched on or switched off this source through `source.watch` / `source.unwatch` — or null when no run has. Look it up with `/v1/runs/{runId}`. |
| `version` | `integer` | yes | Increments on every operator write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the source in the meantime. A provider's own report never bumps it. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write would compute. Nothing here has happened. ⚠️ THE CREATE'S ONLY — a patch cannot move a source's key, so it answers without this. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

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

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `GET /v1/sources/providers`

The source-provider registry: every provider a source can be, grouped by concern, with the events it writes, what one source of it watches (`naturalKeyField`), the overlap policy a trigger on it defaults to and whether it can be created today (`availability`, the verdict `POST /v1/sources` enforces), plus the names announced as coming. The same for every caller; no project is read. Read it before creating a source.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `concerns` | `object[]` | yes | Every concern, in the order the catalogue draws them. Adding a provider never adds a concern. |
| `providers` | `object[]` | yes | Every provider a source can be, grouped by concern in `concerns` order, then as declared. |
| `announced` | `object[]` | yes | Names the catalogue shows as coming, with no provider, config schema or source behind them. Never creatable. |

Each item of `concerns`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `"platform" \| "messaging" \| "data" \| "web" \| "scraping" \| "files"` | yes | The concern — what a provider's `concern` names. |
| `label` | `string` | yes | The concern's display name. |

Each item of `providers`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `"telegram" \| "webhook" \| "postgres" \| "apify"` | yes | The provider — what a source's `provider` is. |
| `concern` | `"platform" \| "messaging" \| "data" \| "web" \| "scraping" \| "files"` | yes | The concern the catalogue groups this provider under. |
| `label` | `string` | yes | The provider's display name. |
| `whatFires` | `string` | yes | One lower-case line completing “listens to …”: what makes this provider write an event. |
| `availability` | `"available" \| "soon"` | yes | Whether a source of this provider can be created today. `soon` is refused at create with 422 — the platform has no writer for it yet. |
| `categoryKey` | `string` | yes | Key of the event category a source of this provider seeds into the project's registry. |
| `categoryLabel` | `string` | yes | That category's display name. |
| `events` | `object[]` | yes | The event types this provider seeds, in declared order. |
| `naturalKeyField` | `string` | yes | The one config field that names what a source watches — a channel, a table. A source's `key` is slugified from it, and its `naturalKey` is read from it. |
| `naturalKeyNoun` | `string` | yes | How a person says that field: the `channel` in “channel is @x”. |
| `overlapDefault` | `"skip" \| "allow"` | yes | What a new trigger on a source of this provider does when an event arrives while its previous run is still in flight — the `overlapPolicy` a trigger create applies when it omits one. `allow` for a message source, where skipping would drop that message; `skip` otherwise. |

Each item of `announced`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | A provider name the catalogue shows before the platform has one — not a `provider` any source can be. |
| `concern` | `"platform" \| "messaging" \| "data" \| "web" \| "scraping" \| "files"` | yes | The concern it is shown under. |
| `label` | `string` | yes | Its display name. |
| `whatFires` | `string` | yes | What would make it write an event. |
