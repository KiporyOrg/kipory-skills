<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Embedding profiles

The project's search models: which embedding model its tables are searched by meaning with, whether exact words are indexed too, and the default chunking. Creating a profile or a new generation is inert; activating one repoints every table that uses it and reindexes.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/embedding-profiles`](#get-v1-embedding-profiles) |  |
| `POST` | [`/v1/embedding-profiles`](#post-v1-embedding-profiles) |  |
| `GET` | [`/v1/embedding-profiles/{id}`](#get-v1-embedding-profiles-id) |  |
| `PATCH` | [`/v1/embedding-profiles/{id}`](#patch-v1-embedding-profiles-id) |  |
| `DELETE` | [`/v1/embedding-profiles/{id}`](#delete-v1-embedding-profiles-id) |  |
| `POST` | [`/v1/embedding-profiles/{id}/activate`](#post-v1-embedding-profiles-id-activate) |  |
| `POST` | [`/v1/embedding-profiles/{id}/generations`](#post-v1-embedding-profiles-id-generations) |  |

### `GET /v1/embedding-profiles`

List a project's embedding profiles — every generation of every key, superseded ones included — each with whether you may delete it now (`canDelete`) and, when you may not, why (`deleteRefusal`). For the whole project's configuration in one read, `GET /v1/bootstrap` (its `vectors` section) or `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node whose profiles to list. Required. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `profiles` | `object[]` | yes | Every profile generation in the project, including superseded ones — a key can have several generations and only one is active. |

Each item of `profiles`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `keywords` | `boolean` | yes | Whether records on this profile are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this profile may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `canDelete` | `boolean` | yes | True when you may delete this profile right now: `deleteRefusal` is null, your role on the project is ADMIN or above, and the project is not retired. A UI affordance, not a permission — the delete re-checks on the server. |

### `POST /v1/embedding-profiles`

Declare a search model: a new profile key at generation 1, with an embedding model, whether exact words are indexed too (`keywords`) and the default chunking; its geometry is derived from the model. With `validateOnly: true` it answers whether the create would be taken, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (the `vectors.profiles` section; `/document/plan` to preview).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node that will own the profile. |
| `key` | `string` | yes | The profile's key. Permanent — to change what people read, set `label`. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string \| null` | no | Optional display text. |
| `modelId` | `string` | yes | Id of the embedding model to use — one `GET /v1/ai-models?type=embedding` lists. Pick the model, not the dimensions or the distance metric — both come from it. |
| `keywords` | `boolean` | yes | Also index each record's exact words, so a search by meaning also weighs a literal match — useful for names, codes and rare terms. Required: say `false` for meaning alone. Changing it later takes a new generation and an activation. |
| `isDefault` | `boolean` | no | Make this the profile used when a searchable declaration names none. Setting it moves the default off whichever profile currently holds it. |
| `defaultChunking` | `object` | yes | The chunking every table on this profile inherits. Required. Exactly one of `{ kind: "whole" }` (one point per record) or `{ kind: "chunks", tokens, overlap }` (pieces of `tokens` tokens, each repeating `overlap` tokens of the previous; `overlap` below `tokens`). |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `keywords` | `boolean` | yes | Whether records on this profile are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this profile may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `GET /v1/embedding-profiles/{id}`

Read one embedding profile generation: its model, whether exact words are indexed too (`keywords`), how many fields of one table may be marked `search` (`searchFieldsPerTable`), derived geometry, default chunking, `generation` and `version` lock. Every profile at once: `GET /v1/embedding-profiles?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `keywords` | `boolean` | yes | Whether records on this profile are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this profile may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/embedding-profiles/{id}`

Change a profile's label, whether it is the project default, or the chunking its tables inherit — never its geometry, which needs a new generation (`POST /v1/embedding-profiles/{id}/generations`). Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be taken — every inheriting table planned against a changed default — writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string \| null` | no | New display text, or null to clear it. |
| `isDefault` | `boolean` | no | Make this the project's default profile. Anything that defines a generation — the model, `keywords` — is refused here and needs a new generation instead (`POST /v1/embedding-profiles/{id}/generations`). |
| `defaultChunking` | `object` | no | Change the chunking every non-overriding type on this profile inherits. Re-derives and re-indexes each of them; not a geometry change, so no new generation. |
| `version` | `integer` | yes | The profile's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the profile changed since, so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `keywords` | `boolean` | yes | Whether records on this profile are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this profile may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `rederive` | `object` | no | Present when `defaultChunking` changed: which inheriting tables followed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `DELETE /v1/embedding-profiles/{id}`

Delete one profile generation, together with the search indexes it owns (`indexesRemoved`). Refused (409) while a searchable table uses it — the list publishes that refusal per profile as `deleteRefusal`. Deleting an older generation gives up the way back to it. With `?validateOnly=true` it answers whether it would be refused, and warns when indexes would be removed, writing nothing. A whole key, every generation: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `indexesRemoved` | `integer` | yes | How many search indexes this generation owned and the delete removed with it. 0 when it never held a table's records. `DELETE …?validateOnly=true` names the same number in a warning before anything is removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `POST /v1/embedding-profiles/{id}/activate`

Make this generation the live one for its key: every searchable table on the key moves onto it, and the project reindexes. Activating a superseded generation is the rollback. Requires the addressed profile's `version` (409 `VERSION_CONFLICT` when stale); each moved table's own lock is checked too. Safe to repeat: an already-live generation moves nothing and is answered 200 whatever `version` the retry carries. 409 too when the project default moved while the activation ran. To mint the generation first: `POST /v1/embedding-profiles/{id}/generations`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The addressed profile's `version` as you last read it. REQUIRED: an activation that moves anything is refused with 409 `VERSION_CONFLICT` if the profile changed since. Each table it moves keeps its own lock, checked as it moves. An already-active generation moves nothing and is not judged against it, so an identical retry answers the same 200. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `profile` | `object` | yes | The profile generation that is now active. |
| `movedTables` | `string[]` | yes | Tables moved onto this generation by this call. Empty when it was already the active one — activation is safe to repeat. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `POST /v1/embedding-profiles/{id}/generations`

Mint the next generation of this profile's key — a new, INERT row with another model or another `keywords`; a mint that changes neither is refused (`EMBEDDING_PROFILE_GENERATION_UNCHANGED`). Nothing is provisioned or reindexed until `POST /v1/embedding-profiles/{id}/activate` on it. The generation number is allocated for you and takes no lock. With `validateOnly: true` it answers whether the mint would be taken, writing nothing.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | no | Embedding model for the new generation. Omit to keep the current one. |
| `keywords` | `boolean` | no | Whether the new generation also indexes each record's exact words. Omit to keep the current setting. |
| `label` | `string \| null` | no | Display text for the new generation. Omit to keep the current one. |
| `validateOnly` | `boolean` | no | Check this new generation against the one it starts from and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `keywords` | `boolean` | yes | Whether records on this profile are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this profile may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
