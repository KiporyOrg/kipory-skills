<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Embeddings

The project's embeddings (`project.ai.embeddings`): which embedding model its tables are searched by meaning with (`model`), whether exact words are indexed too (`matchExactWords`), and the chunking (`chunking`). Creating an embedding or a new generation is inert; activating a generation moves every table on its key to it and reindexes.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/embeddings`](#get-v1-embeddings) |  |
| `POST` | [`/v1/embeddings`](#post-v1-embeddings) |  |
| `GET` | [`/v1/embeddings/{id}`](#get-v1-embeddings-id) |  |
| `PATCH` | [`/v1/embeddings/{id}`](#patch-v1-embeddings-id) |  |
| `DELETE` | [`/v1/embeddings/{id}`](#delete-v1-embeddings-id) |  |
| `POST` | [`/v1/embeddings/{id}/activate`](#post-v1-embeddings-id-activate) |  |
| `POST` | [`/v1/embeddings/{id}/generations`](#post-v1-embeddings-id-generations) |  |

### `GET /v1/embeddings`

List a project's embeddings — every generation of every key, superseded ones included — each with whether you may delete it now (`canDelete`) and, when you may not, why (`deleteRefusal`). For the whole project's configuration in one read, `GET /v1/bootstrap` (its `project` section's `embeddings`) or `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node whose embeddings to list. Required. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `embeddings` | `object[]` | yes | Every embedding generation in the project, including superseded ones — a key can have several generations and only one is active. |

Each item of `embeddings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this embedding generation. |
| `project` | `string` | yes | Id of the project node that owns this embedding. |
| `key` | `string` | yes | The embedding's key, shared by every generation of this embedding — the key `project.ai.embeddings` and a table's `uses.search.embedding` name. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this embedding key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embeddings/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embeddings/{id}` and `POST /v1/embeddings/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the embedding since you read it. Not the geometry — that is `generation`. |
| `model` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `matchExactWords` | `boolean` | yes | Whether records on this embedding are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this embedding may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether a table's search that names no embedding uses this one (the document's `project.ai.defaultEmbedding`). At most one embedding per project is the default. |
| `chunking` | `"whole" \| object` | yes | How records on this embedding are split into points unless a table's `uses.search.chunking` overrides it: `whole`, or `{ tokens, overlap }`. Changing it re-derives and re-indexes every table on the embedding that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this embedding writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this embedding. Deleting an embedding that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this embedding would be refused right now, in the delete's own words — or null when nothing about the embedding stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `canDelete` | `boolean` | yes | True when you may delete this embedding right now: `deleteRefusal` is null, your role on the project is ADMIN or above, and the project is not retired. A UI affordance, not a permission — the delete re-checks on the server. |

### `POST /v1/embeddings`

Declare an embedding: a new key at generation 1, with its `model`, whether exact words are indexed too (`matchExactWords`) and its `chunking`, as `project.ai.embeddings` spells them; its geometry is derived from the model. With `validateOnly: true` it answers whether the create would be taken, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (the `project.ai.embeddings` section; `/document/plan` to preview).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node that will own the embedding. |
| `key` | `string` | yes | The embedding's key. Permanent — to change what people read, set `label`. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string \| null` | no | Optional display text. |
| `model` | `string` | yes | Id of the embedding model to use — one `GET /v1/ai-models?type=embedding` lists. Pick the model, not the dimensions or the distance metric — both come from it. |
| `matchExactWords` | `boolean` | yes | Also index each record's exact words, so a search by meaning also weighs a literal match — useful for names, codes and rare terms. Required: say `false` for meaning alone. Changing it later takes a new generation and an activation. |
| `isDefault` | `boolean` | no | Make this the embedding a table's search uses when it names none. Setting it moves the default off whichever embedding currently holds it. |
| `chunking` | `"whole" \| object` | yes | The chunking every table on this embedding inherits. Required. `whole` (one point per record) or `{ tokens, overlap }` (pieces of `tokens` tokens, each repeating `overlap` tokens of the previous; `overlap` below `tokens`). |
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
| `id` | `string` | yes | Unique id of this embedding generation. |
| `project` | `string` | yes | Id of the project node that owns this embedding. |
| `key` | `string` | yes | The embedding's key, shared by every generation of this embedding — the key `project.ai.embeddings` and a table's `uses.search.embedding` name. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this embedding key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embeddings/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embeddings/{id}` and `POST /v1/embeddings/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the embedding since you read it. Not the geometry — that is `generation`. |
| `model` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `matchExactWords` | `boolean` | yes | Whether records on this embedding are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this embedding may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether a table's search that names no embedding uses this one (the document's `project.ai.defaultEmbedding`). At most one embedding per project is the default. |
| `chunking` | `"whole" \| object` | yes | How records on this embedding are split into points unless a table's `uses.search.chunking` overrides it: `whole`, or `{ tokens, overlap }`. Changing it re-derives and re-indexes every table on the embedding that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this embedding writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this embedding. Deleting an embedding that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this embedding would be refused right now, in the delete's own words — or null when nothing about the embedding stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `GET /v1/embeddings/{id}`

Read one embedding generation: its `model`, whether exact words are indexed too (`matchExactWords`), how many fields of one table may be marked `search` (`searchFieldsPerTable`), derived geometry, its `chunking`, `generation` and `version` lock. Every embedding at once: `GET /v1/embeddings?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding generation's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this embedding generation. |
| `project` | `string` | yes | Id of the project node that owns this embedding. |
| `key` | `string` | yes | The embedding's key, shared by every generation of this embedding — the key `project.ai.embeddings` and a table's `uses.search.embedding` name. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this embedding key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embeddings/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embeddings/{id}` and `POST /v1/embeddings/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the embedding since you read it. Not the geometry — that is `generation`. |
| `model` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `matchExactWords` | `boolean` | yes | Whether records on this embedding are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this embedding may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether a table's search that names no embedding uses this one (the document's `project.ai.defaultEmbedding`). At most one embedding per project is the default. |
| `chunking` | `"whole" \| object` | yes | How records on this embedding are split into points unless a table's `uses.search.chunking` overrides it: `whole`, or `{ tokens, overlap }`. Changing it re-derives and re-indexes every table on the embedding that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this embedding writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this embedding. Deleting an embedding that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this embedding would be refused right now, in the delete's own words — or null when nothing about the embedding stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/embeddings/{id}`

Change an embedding's label, whether it is the project default, or the chunking its tables inherit — never its geometry, which needs a new generation (`POST /v1/embeddings/{id}/generations`). Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be taken — every inheriting table planned against a changed default — writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding generation's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string \| null` | no | New display text, or null to clear it. |
| `isDefault` | `boolean` | no | Make this the project's default embedding. Anything that defines a generation — `model`, `matchExactWords` — is refused here and needs a new generation instead (`POST /v1/embeddings/{id}/generations`). |
| `chunking` | `"whole" \| object` | no | Change the chunking every non-overriding table on this embedding inherits: `whole` or `{ tokens, overlap }`. Re-derives and re-indexes each of them; not a geometry change, so no new generation. |
| `version` | `integer` | yes | The embedding's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the embedding changed since, so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `id`, `project`, `key`, `label`, `generation`, `version`, `model`, `modelDisplayName`, `matchExactWords`, `searchFieldsPerTable`, `isDefault`, `chunking`, `geometry`, `usedByTableCount`, `deleteRefusal`, `createdAt`, `updatedAt`, `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this embedding generation. |
| `project` | `string` | yes | Id of the project node that owns this embedding. |
| `key` | `string` | yes | The embedding's key, shared by every generation of this embedding — the key `project.ai.embeddings` and a table's `uses.search.embedding` name. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this embedding key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embeddings/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embeddings/{id}` and `POST /v1/embeddings/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the embedding since you read it. Not the geometry — that is `generation`. |
| `model` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `matchExactWords` | `boolean` | yes | Whether records on this embedding are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this embedding may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether a table's search that names no embedding uses this one (the document's `project.ai.defaultEmbedding`). At most one embedding per project is the default. |
| `chunking` | `"whole" \| object` | yes | How records on this embedding are split into points unless a table's `uses.search.chunking` overrides it: `whole`, or `{ tokens, overlap }`. Changing it re-derives and re-indexes every table on the embedding that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this embedding writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this embedding. Deleting an embedding that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this embedding would be refused right now, in the delete's own words — or null when nothing about the embedding stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `rederive` | `object` | no | Present when `chunking` changed: which inheriting tables followed. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Shape 2, with `ok`, `diagnostics`, `complete`:

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

### `DELETE /v1/embeddings/{id}`

Delete one embedding generation, together with the search indexes it owns (`indexesRemoved`). Refused (409) while a searchable table uses it — the list publishes that refusal per embedding as `deleteRefusal`. Deleting an older generation gives up the way back to it. With `?validateOnly=true` it answers whether it would be refused, and warns when indexes would be removed, writing nothing. A whole key, every generation: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding generation's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `deleted`, `id`, `indexesRemoved`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `indexesRemoved` | `integer` | yes | How many search indexes this generation owned and the delete removed with it. 0 when it never held a table's records. `DELETE …?validateOnly=true` names the same number in a warning before anything is removed. |

Shape 2, with `ok`, `diagnostics`, `complete`:

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

### `POST /v1/embeddings/{id}/activate`

Make this generation the live one for its key: every searchable table on the key moves onto it, and the project reindexes. Activating a superseded generation is the rollback. Requires the addressed embedding's `version` (409 `VERSION_CONFLICT` when stale); each moved table's own lock is checked too. Safe to repeat: an already-live generation moves nothing and is answered 200 whatever `version` the retry carries. 409 too when the project default moved while the activation ran. To mint the generation first: `POST /v1/embeddings/{id}/generations`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding generation's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The addressed embedding's `version` as you last read it. REQUIRED: an activation that moves anything is refused with 409 `VERSION_CONFLICT` if the embedding changed since. Each table it moves keeps its own lock, checked as it moves. An already-active generation moves nothing and is not judged against it, so an identical retry answers the same 200. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `embedding` | `object` | yes | The embedding generation that is now active. |
| `movedTables` | `string[]` | yes | Tables moved onto this generation by this call. Empty when it was already the active one — activation is safe to repeat. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `POST /v1/embeddings/{id}/generations`

Mint the next generation of this embedding's key — a new, INERT row with another `model` or another `matchExactWords`; a mint that changes neither is refused (`EMBEDDING_GENERATION_UNCHANGED`). Nothing is provisioned or reindexed until `POST /v1/embeddings/{id}/activate` on it. The generation number is allocated for you and takes no lock. With `validateOnly: true` it answers whether the mint would be taken, writing nothing.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding generation's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `model` | `string` | no | Embedding model for the new generation. Omit to keep the current one. |
| `matchExactWords` | `boolean` | no | Whether the new generation also indexes each record's exact words. Omit to keep the current setting. |
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
| `id` | `string` | yes | Unique id of this embedding generation. |
| `project` | `string` | yes | Id of the project node that owns this embedding. |
| `key` | `string` | yes | The embedding's key, shared by every generation of this embedding — the key `project.ai.embeddings` and a table's `uses.search.embedding` name. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this embedding key this is. Each generation has its own index, so several can exist at once and only one is active. Minted by `POST /v1/embeddings/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embeddings/{id}` and `POST /v1/embeddings/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the embedding since you read it. Not the geometry — that is `generation`. |
| `model` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `matchExactWords` | `boolean` | yes | Whether records on this embedding are also indexed by their exact words, so a search by meaning also weighs a literal match. Fixed for a generation: turning it on or off takes a new generation and an activation. |
| `searchFieldsPerTable` | `integer` | yes | How many fields of one table on this embedding may be marked `search`. Marking more is refused with `USES_SEARCH_FIELDS_OVER_LIMIT`. |
| `isDefault` | `boolean` | yes | Whether a table's search that names no embedding uses this one (the document's `project.ai.defaultEmbedding`). At most one embedding per project is the default. |
| `chunking` | `"whole" \| object` | yes | How records on this embedding are split into points unless a table's `uses.search.chunking` overrides it: `whole`, or `{ tokens, overlap }`. Changing it re-derives and re-indexes every table on the embedding that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this embedding writes, derived from its model. Null when the model no longer resolves. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this embedding. Deleting an embedding that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this embedding would be refused right now, in the delete's own words — or null when nothing about the embedding stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
