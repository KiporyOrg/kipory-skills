<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Embedding profiles and vector collections

The project's vector space and the collections derived from it. Creating a profile is inert; activating one repoints every declaration and reindexes.

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
| `GET` | [`/v1/vector-collections`](#get-v1-vector-collections) |  |
| `GET` | [`/v1/vector-collections/{name}`](#get-v1-vector-collections-name) |  |
| `GET` | [`/v1/vector-collections/{name}/points`](#get-v1-vector-collections-name-points) |  |
| `POST` | [`/v1/vector-collections/{name}/search`](#post-v1-vector-collections-name-search) |  |

### `GET /v1/embedding-profiles`

List a project's embedding profiles — every generation of every key, superseded ones included — each with whether you may delete it now (`canDelete`) and, when you may not, why (`deleteRefusal`). For the whole project's configuration in one read, `GET /v1/bootstrap` (its `vectors` section) or `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node whose profiles to list. Required. |
| `expand` | `"collections" \| "collections"[]` | no | Optional sections to include. Currently only `collections`, so send `expand=collections`. (The tables routes take a comma-separated list instead, and refuse a repeated parameter.) |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `profiles` | `object[]` | yes | Every profile generation in the project, including superseded ones — a key can have several generations and only one is active. |

Each item of `profiles`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile and used verbatim in its collection names. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is — the `v{n}` in its collection names. Each generation owns its own collections, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which tables use it — one per scope and isolation group in play, never named by hand. |
| `canDelete` | `boolean` | yes | True when you may delete this profile right now: `deleteRefusal` is null, your role on the project is ADMIN or above, and the project is not retired. A UI affordance, not a permission — the delete re-checks on the server. |

### `POST /v1/embedding-profiles`

Declare a vector space: a new profile key at generation 1, its geometry derived from the embedding model. With `validateOnly: true` it answers whether the create would be taken, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (the `vectors.profiles` section; `/document/plan` to preview).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node that will own the profile. |
| `key` | `string` | yes | The profile's key, used verbatim in its collection names. Permanent — to change what people read, set `label`. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string \| null` | no | Optional display text. |
| `modelId` | `string` | yes | Id of the embedding model to use — one `GET /v1/ai-models?type=embedding` lists. Pick the model, not the dimensions or the distance metric — both come from it. |
| `denseSlots` | `string[]` | yes | Names for the dense vector slots this profile writes. At least one is required — a profile with no dense slot could back nothing searchable. |
| `sparseSlot` | `string \| null` | no | Optional name for a sparse vector slot. Declaring one makes every record carry sparse vectors from then on, so only add it if a search step will read them. |
| `isDefault` | `boolean` | no | Make this the profile used when a searchable declaration names none. Setting it moves the default off whichever profile currently holds it. |
| `defaultChunking` | `object` | yes | The chunking every table on this profile inherits. Required: a profile is a vector space AND the default way records enter it. Exactly one of `{ kind: "whole" }` (one point per record) or `{ kind: "chunks", tokens, overlap }` (pieces of `tokens` tokens, each repeating `overlap` tokens of the previous; `overlap` below `tokens`). |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
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

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile and used verbatim in its collection names. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is — the `v{n}` in its collection names. Each generation owns its own collections, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which tables use it — one per scope and isolation group in play, never named by hand. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `collections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `collectionName` | `string` | yes | The physical collection name to use in a search step, shaped `{project}.{profile}-v{generation}-{scope}[-{group}]`. It contains the generation, so activating a new generation changes it. |
| `scope` | `"user" \| "project" \| "session"` | yes | Who the vectors in a collection belong to, and therefore what a search can reach: `project` is shared across the project, `user` is partitioned per end user, `session` per conversation. |
| `isolationGroup` | `string \| null` | yes | The value vectors in this collection are partitioned by, or null when the scope needs no partition. Two tables with different isolation groups never share a collection. |
| `tableKeys` | `string[]` | yes | Keys of the tables whose searchable declarations are stored in this collection. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `GET /v1/embedding-profiles/{id}`

Read one embedding profile generation: its model, slots, derived geometry, default chunking, `generation` and `version` lock; `expand=collections` adds the collections its tables imply. Every profile at once: `GET /v1/embedding-profiles?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `"collections" \| "collections"[]` | no | Optional sections to include. Currently only `collections`, so send `expand=collections`. (The tables routes take a comma-separated list instead, and refuse a repeated parameter.) |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile and used verbatim in its collection names. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is — the `v{n}` in its collection names. Each generation owns its own collections, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which tables use it — one per scope and isolation group in play, never named by hand. |

Each item of `collections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `collectionName` | `string` | yes | The physical collection name to use in a search step, shaped `{project}.{profile}-v{generation}-{scope}[-{group}]`. It contains the generation, so activating a new generation changes it. |
| `scope` | `"user" \| "project" \| "session"` | yes | Who the vectors in a collection belong to, and therefore what a search can reach: `project` is shared across the project, `user` is partitioned per end user, `session` per conversation. |
| `isolationGroup` | `string \| null` | yes | The value vectors in this collection are partitioned by, or null when the scope needs no partition. Two tables with different isolation groups never share a collection. |
| `tableKeys` | `string[]` | yes | Keys of the tables whose searchable declarations are stored in this collection. |

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
| `isDefault` | `boolean` | no | Make this the project's default profile. Anything that changes the vector space — the model, the slots — is refused here and needs a new generation instead (`POST /v1/embedding-profiles/{id}/generations`). |
| `defaultChunking` | `object` | no | Change the chunking every non-overriding type on this profile inherits. Re-derives and re-indexes each of them; not a geometry change, so no new generation. |
| `version` | `integer` | yes | The profile's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the profile changed since, so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile and used verbatim in its collection names. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is — the `v{n}` in its collection names. Each generation owns its own collections, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which tables use it — one per scope and isolation group in play, never named by hand. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `rederive` | `object` | no | Present when `defaultChunking` changed: which inheriting tables followed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `collections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `collectionName` | `string` | yes | The physical collection name to use in a search step, shaped `{project}.{profile}-v{generation}-{scope}[-{group}]`. It contains the generation, so activating a new generation changes it. |
| `scope` | `"user" \| "project" \| "session"` | yes | Who the vectors in a collection belong to, and therefore what a search can reach: `project` is shared across the project, `user` is partitioned per end user, `session` per conversation. |
| `isolationGroup` | `string \| null` | yes | The value vectors in this collection are partitioned by, or null when the scope needs no partition. Two tables with different isolation groups never share a collection. |
| `tableKeys` | `string[]` | yes | Keys of the tables whose searchable declarations are stored in this collection. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `DELETE /v1/embedding-profiles/{id}`

Delete one profile generation. Refused (409) while a searchable table uses it, or while it still owns provisioned collections (the rollback path of the generation that superseded it) — the list publishes that refusal per profile as `deleteRefusal`. With `?validateOnly=true` it answers whether it would be, writing nothing. A whole key, every generation: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

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

### `POST /v1/embedding-profiles/{id}/activate`

Make this generation the live one for its key: every searchable table on the key moves onto it, saved search steps are repointed at its collections, and the project reindexes. Activating a superseded generation is the rollback. Requires the addressed profile's `version` (409 `VERSION_CONFLICT` when stale); each moved table's own lock is checked too. Safe to repeat: an already-live generation moves nothing and is answered 200 whatever `version` the retry carries. 409 too when the project default moved while the activation ran. To mint the generation first: `POST /v1/embedding-profiles/{id}/generations`.

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
| `repointedSteps` | `string[]` | yes | Names of saved search steps whose stored collection name was rewritten onto the new generation. A step stores that name as a literal and the generation is part of it, so a step left behind keeps querying the superseded collection — which still exists, so it returns stale results rather than an error. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `POST /v1/embedding-profiles/{id}/generations`

Mint the next generation of this profile's key — a new, INERT row with a new model or slot set; nothing is provisioned or reindexed until `POST /v1/embedding-profiles/{id}/activate` on it. The generation number is allocated for you and takes no lock. With `validateOnly: true` it answers whether the mint would be taken, writing nothing.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | no | Embedding model for the new generation. Omit to keep the current one. |
| `denseSlots` | `string[]` | no | Dense slot names for the new generation. Omit to keep the current ones. |
| `sparseSlot` | `string \| null` | no | Sparse slot name for the new generation; null removes it. Omit to keep the current one. |
| `label` | `string \| null` | no | Display text for the new generation. Omit to keep the current one. |
| `validateOnly` | `boolean` | no | Check this new generation against the one it starts from and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
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

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile generation. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `key` | `string` | yes | The profile's key, shared by every generation of this profile and used verbatim in its collection names. Immutable — change the display text through `label` instead. |
| `label` | `string \| null` | yes | Display text, or null if none was set. |
| `generation` | `integer` | yes | Which generation of this profile key this is — the `v{n}` in its collection names. Each generation owns its own collections, so several can exist at once and only one is active. Minted by `POST /v1/embedding-profiles/{id}/generations`; never a lock. |
| `version` | `integer` | yes | Increments on every write to this row. Send it back on `PATCH /v1/embedding-profiles/{id}` and `POST /v1/embedding-profiles/{id}/activate`; either is refused with 409 `VERSION_CONFLICT` if someone else changed the profile since you read it. Not the geometry — that is `generation`. |
| `modelId` | `string` | yes | Id of the embedding model this generation uses. It determines the geometry, so changing it requires a new generation. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `defaultChunking` | `object` | yes | How records on this profile are split into points unless a table's `uses.search.chunking` overrides it. Changing it re-derives and re-indexes every table on the profile that does not override. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByTableCount` | `integer` | yes | How many searchable tables point at this profile. Deleting a profile that is still in use is refused. |
| `deleteRefusal` | `object \| null` | yes | Why deleting this profile would be refused right now, in the delete's own words — or null when nothing about the profile stands in the way. Null does not mean YOU may delete it: the delete also needs the ADMIN role and a project that is not retired, which the listing's `canDelete` folds in. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which tables use it — one per scope and isolation group in play, never named by hand. |

Each item of `collections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `collectionName` | `string` | yes | The physical collection name to use in a search step, shaped `{project}.{profile}-v{generation}-{scope}[-{group}]`. It contains the generation, so activating a new generation changes it. |
| `scope` | `"user" \| "project" \| "session"` | yes | Who the vectors in a collection belong to, and therefore what a search can reach: `project` is shared across the project, `user` is partitioned per end user, `session` per conversation. |
| `isolationGroup` | `string \| null` | yes | The value vectors in this collection are partitioned by, or null when the scope needs no partition. Two tables with different isolation groups never share a collection. |
| `tableKeys` | `string[]` | yes | Keys of the tables whose searchable declarations are stored in this collection. |

### `GET /v1/vector-collections`

The vector collections of the project named by `?project=`, each derived from an embedding profile. One collection with its identity is `GET /v1/vector-collections/{name}`; collections are not created here but by the embedding profiles at `/v1/embedding-profiles`. Requires **VIEWER**.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose collections to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `collections` | `object[]` | yes | The project's live collections. Empty AND `reachable: false` means unknown, not none — check `reachable` before concluding anything from an empty list. |
| `reachable` | `boolean` | yes | Whether the vector store answered the ENUMERATION. False means the SET is unknown, not empty; reading an empty list as “this project has no collections” is how an outage becomes a wrong answer. It says nothing about any one collection — read that row's `storeState`. |

Each item of `collections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that owns the collection. |
| `name` | `string` | yes | Collection name without the project prefix — the short name an operator recognises. |
| `collectionName` | `string` | yes | Physical collection name (`{slug}.{name}`) — the value a vector-search skill's `collection` setting carries. |
| `live` | `object \| null` | yes | Geometry read from the vector store. Null means the store did not hand one over — either it has no such collection or the read failed — and `storeState` says WHICH. Do not read a null here as an empty collection, and do not read it as an outage either. |
| `storeState` | `"present" \| "absent" \| "unreachable"` | yes | What the store said about THIS collection. `present`: it answered and `live` carries the geometry. `absent`: it answered clearly that it holds no such collection — a divergence to act on, NOT an outage. `unreachable`: the read failed, so the geometry and everything derived from it are unknown. `live` is null under both of the last two and they must never be folded together. |
| `role` | `"derived" \| "terms" \| "preview" \| "unregistered"` | yes | What this collection is. `derived`: a registry row claims it — the record vectors of one embedding profile version, for one scope and isolation group; `identity` names them. `terms`: the project's vocabulary terms. `preview`: the project's flow-preview store, partitioned by session. `unregistered`: none of those — nothing on the platform owns it, so it is residue to investigate. Decided by the registry and the two fixed names, never by parsing the rest of the name. |
| `identity` | `object` | yes | The tuple the physical name was computed from, read from the registry. Nobody parses the name: for anything but a `derived` collection `registered` is false and every profile field is null. |

### `GET /v1/vector-collections/{name}`

One collection of the project named by `?project=`, by the `name` a listing returns (not its `collectionName`): its vector fields, point count and the embedding profile it derives from. Its stored points are `GET /v1/vector-collections/{name}/points`. Requires **VIEWER**.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The collection's name WITHOUT its project prefix — the `name` field a listing returns, not the `collectionName`. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose collections to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that owns the collection. |
| `name` | `string` | yes | Collection name without the project prefix — the short name an operator recognises. |
| `collectionName` | `string` | yes | Physical collection name (`{slug}.{name}`) — the value a vector-search skill's `collection` setting carries. |
| `live` | `object \| null` | yes | Geometry read from the vector store. Null means the store did not hand one over — either it has no such collection or the read failed — and `storeState` says WHICH. Do not read a null here as an empty collection, and do not read it as an outage either. |
| `storeState` | `"present" \| "absent" \| "unreachable"` | yes | What the store said about THIS collection. `present`: it answered and `live` carries the geometry. `absent`: it answered clearly that it holds no such collection — a divergence to act on, NOT an outage. `unreachable`: the read failed, so the geometry and everything derived from it are unknown. `live` is null under both of the last two and they must never be folded together. |
| `role` | `"derived" \| "terms" \| "preview" \| "unregistered"` | yes | What this collection is. `derived`: a registry row claims it — the record vectors of one embedding profile version, for one scope and isolation group; `identity` names them. `terms`: the project's vocabulary terms. `preview`: the project's flow-preview store, partitioned by session. `unregistered`: none of those — nothing on the platform owns it, so it is residue to investigate. Decided by the registry and the two fixed names, never by parsing the rest of the name. |
| `identity` | `object` | yes | The tuple the physical name was computed from, read from the registry. Nobody parses the name: for anything but a `derived` collection `registered` is false and every profile field is null. |
| `payloadIndexes` | `object[] \| null` | yes | Every INDEXED payload key. A key absent from this list cannot be filtered on — Qdrant answers a filter over an unindexed key without complaining. ⛔ NULL MEANS THE LIST WAS NOT READ, and `[]` cannot say that: an empty array is a collection that genuinely indexes nothing, and folding the two renders an outage as “nothing here is filterable”. ⚠️ NULL DOES NOT IMPLY A NON-`present` `storeState`: the index list is a SECOND store call, so a collection dropped between the two — or a list this reader could not parse — is `present` with a null list. Read this field's own nullness, never `storeState`, to decide whether the list is known. |
| `tableKeys` | `string[]` | yes | Keys of the tables whose points land here, from the registry's own reads. Empty for a collection no declaration owns. |
| `counts` | `object` | yes | How much is in the collection, and of what. |

Each item of `payloadIndexes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `field` | `string` | yes | Physical payload key — namespaced (`post_language`) for a declared field, bare for a system one. |
| `type` | `"keyword" \| "integer" \| "float" \| "text" \| "geo" \| "datetime" \| "bool" \| "uuid"` | yes | Index type Qdrant reports for the key. |

### `GET /v1/vector-collections/{name}/points`

Page through the points stored in one collection, optionally narrowed by `filter`, a JSON array of `{key, value}` clauses. Free: it reads what is stored. To rank points against query text, `POST /v1/vector-collections/{name}/search`. Requires **VIEWER**.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The collection's name WITHOUT its project prefix — the `name` field a listing returns, not the `collectionName`. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that owns the collection. |
| `limit` | `integer` | no | Points per page. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. There is no `before` on this route: the walk is one-way, because the store's scroll has no backward mode. |
| `filter` | `string` | no | JSON-encoded array of `{key, value}` clauses, ANDed. Every key must be indexed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `points` | `object[]` | yes | This page of points. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |
| `paging` | `null` | yes | Always null here: a scroll cursor is a point id rather than an offset, so this route cannot say which page you are on and offers no page jump. `total` carries the half it CAN answer. |
| `total` | `integer \| null` | yes | How many points this walk will visit in all, under the same filter — an exact count off the payload index. Null when the store did not answer it, which is NOT zero: a range drawn over a failed count would report an empty collection. |

Each item of `points`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Qdrant point id. |
| `subject` | `object \| null` | yes | The record or term this point was projected from. Null when the payload names neither — a foreign collection, or one written before the projector stamped its system keys. |
| `chunkIndex` | `integer \| null` | yes | Which chunk of the record this point is. ⚠️ Always null for a TERM: one point is one term and there is nothing to chunk, so an absence here is a fact about the collection rather than a missing read. |
| `label` | `string \| null` | yes | A readable name for the SUBJECT — a record's own title, or a term's `label`. ⚠️ NOT the embedded text — no point payload carries that — so every chunk of one record shares this label and only `chunkIndex` separates them. |
| `payload` | `object \| null` | yes | The point's payload exactly as stored. |

### `POST /v1/vector-collections/{name}/search`

Rank one collection's points against `query` text. It writes nothing but embeds the query with a billable provider call charged to the project. To read stored points without spending, `GET /v1/vector-collections/{name}/points`. Requires **ADMIN**.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The collection's name WITHOUT its project prefix — the `name` field a listing returns, not the `collectionName`. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose collections to read. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `query` | `string` | yes | Text to rank against. Embedded with the COLLECTION's own model. |
| `slot` | `string` | no | Named vector slot to query. Defaults to the collection's only slot; required when it has more than one, because a default would silently pick one meaning over another. |
| `limit` | `integer` | no | Maximum results — groups when `groupByRecord`, else points. |
| `groupByRecord` | `boolean` | no | Collapse chunks so one record is one result, scored by its best chunk. Off returns raw points, where one long record can fill the page. |
| `filter` | `object[]` | no | Payload clauses, ANDed. Every key must be indexed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `results` | `object[]` | yes | Ranked results, nearest first. |
| `slot` | `string \| null` | yes | The slot actually queried, so the caller never has to infer it. Null means the collection's single unnamed vector. |
| `grouped` | `boolean` | yes | Whether one result is one record (scored by its best-matching chunk) or one raw point. ⚠️ A grouped result does NOT report how many chunks of that record matched: the store returns a bounded number of hits per group, so any such figure would be a cap presented as a count. |

Each item of `results`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Qdrant point id. |
| `subject` | `object \| null` | yes | The record or term this point was projected from. Null when the payload names neither — a foreign collection, or one written before the projector stamped its system keys. |
| `chunkIndex` | `integer \| null` | yes | Which chunk of the record this point is. ⚠️ Always null for a TERM: one point is one term and there is nothing to chunk, so an absence here is a fact about the collection rather than a missing read. |
| `label` | `string \| null` | yes | A readable name for the SUBJECT — a record's own title, or a term's `label`. ⚠️ NOT the embedded text — no point payload carries that — so every chunk of one record shares this label and only `chunkIndex` separates them. |
| `payload` | `object \| null` | yes | The point's payload exactly as stored. |
| `score` | `number` | yes | Similarity under the collection's metric. Every metric this platform admits ranks higher-is-nearer. |
