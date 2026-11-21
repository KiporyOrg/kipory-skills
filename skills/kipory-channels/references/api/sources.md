<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Sources

What writes events into a project's log — a watched Telegram channel today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow; a trigger pointing at it does. Health and the listening count are read here; the events a source delivered are `GET /v1/project-events?sourceId=`.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/sources`](#get-v1-sources) |  |
| `GET` | [`/v1/sources/{id}`](#get-v1-sources-id) |  |
| `GET` | [`/v1/sources/providers`](#get-v1-sources-providers) |  |

### `GET /v1/sources`

List one project's sources (`?project=<nodeId>`, optionally one `provider`): what its triggers' `watch` and its records hold. Each with its health and last event, who holds it (`holders`: the triggers by key, the records as a count per table) and the triggers that hear it without holding it (`heardBy`). Nothing writes a source here: a trigger's `watch` (`POST /v1/triggers`, `PATCH /v1/triggers/{id}`) or a flow's `source.watch` holds one, and releasing the last hold switches it off. The rows without health and holders ride `GET /v1/bootstrap`.

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
| `enabled` | `boolean` | yes | Whether the source writes events: on while something holds it, switched off when its last hold is released. Switching off is not instant for a connector's source: the connector stops watching the key on the next pass of its own reconcile loop. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `holders` | `object` | yes | Who keeps this source watched. A source nothing holds is switched off. |
| `heardBy` | `string[]` | yes | The keys of the enabled triggers that hear this source without holding it: their `watch` is null on its provider's own events, so they hear every source of that provider the project watches. |
| `lastRunId` | `string \| null` | yes | The run that last created, switched on or switched off this source through `source.watch` / `source.unwatch` — or null when no run has. Look it up with `/v1/runs/{runId}`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/sources/{id}`

Read one source, with its health, who holds it (`holders`) and the triggers that hear it without holding it (`heardBy`). The events it wrote: `GET /v1/project-events?project=<nodeId>&sourceId=<id>`. Every source at once: `GET /v1/sources?project=`. To change what is watched, edit a trigger's `watch`.

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
| `enabled` | `boolean` | yes | Whether the source writes events: on while something holds it, switched off when its last hold is released. Switching off is not instant for a connector's source: the connector stops watching the key on the next pass of its own reconcile loop. |
| `createdByUserId` | `string \| null` | yes | Who set the source up. History only — a source is owned by its project. Null for a source created by a token, or once that account is gone. |
| `health` | `object` | yes | How the source is doing right now, merged from the provider's last report and the platform's own signals. |
| `holders` | `object` | yes | Who keeps this source watched. A source nothing holds is switched off. |
| `heardBy` | `string[]` | yes | The keys of the enabled triggers that hear this source without holding it: their `watch` is null on its provider's own events, so they hear every source of that provider the project watches. |
| `lastRunId` | `string \| null` | yes | The run that last created, switched on or switched off this source through `source.watch` / `source.unwatch` — or null when no run has. Look it up with `/v1/runs/{runId}`. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/sources/providers`

The source-provider registry: every provider a source can be, grouped by concern, with the events it writes, what one source of it watches (`naturalKeyField`), the overlap policy a trigger on it defaults to and whether a trigger can watch it today (`availability`, the verdict a trigger's `watch` on `POST /v1/triggers` enforces), plus the names announced as coming. The same for every caller; no project is read.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `concerns` | `object[]` | yes | Every concern, in the order the catalogue draws them. |
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
