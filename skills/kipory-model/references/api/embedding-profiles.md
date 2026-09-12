<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 817f751217fc · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Embedding profiles and vector collections

The project's vector space and the collections derived from it. Creating a profile is inert; activating one repoints every declaration and reindexes.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/embedding-profiles`](#get-v1-embedding-profiles) |  |
| `POST` | [`/v1/embedding-profiles`](#post-v1-embedding-profiles) |  |
| `GET` | [`/v1/embedding-profiles/{id}`](#get-v1-embedding-profiles-id) |  |
| `PATCH` | [`/v1/embedding-profiles/{id}`](#patch-v1-embedding-profiles-id) |  |
| `DELETE` | [`/v1/embedding-profiles/{id}`](#delete-v1-embedding-profiles-id) |  |
| `POST` | [`/v1/embedding-profiles/{id}/activate`](#post-v1-embedding-profiles-id-activate) |  |
| `POST` | [`/v1/embedding-profiles/{id}/versions`](#post-v1-embedding-profiles-id-versions) |  |
| `GET` | [`/v1/vector-collections`](#get-v1-vector-collections) |  |
| `GET` | [`/v1/vector-collections/{name}`](#get-v1-vector-collections-name) |  |
| `GET` | [`/v1/vector-collections/{name}/points`](#get-v1-vector-collections-name-points) |  |
| `POST` | [`/v1/vector-collections/{name}/search`](#post-v1-vector-collections-name-search) |  |

### `GET /v1/embedding-profiles`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node whose profiles to list. Required. |
| `expand` | `"collections" \| "collections"[]` | no | Optional sections to include. Repeat the parameter to ask for more than one. Currently only `collections`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `profiles` | `object[]` | yes | Every profile version in the project, including superseded ones — a name can have several versions and only one is active. |

### `POST /v1/embedding-profiles`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Id of the project node that will own the profile. |
| `name` | `string` | yes | Kebab-case name, used verbatim in the profile's collection names. Permanent — to change what people read, set `label`. |
| `label` | `string \| null` | no | Optional human-readable name. |
| `modelId` | `string` | yes | Id of the embedding model to use. Pick the model, not the dimensions or the distance metric — both come from it. |
| `denseSlots` | `string[]` | yes | Names for the dense vector slots this profile writes. At least one is required — a profile with no dense slot could back nothing searchable. |
| `sparseSlot` | `string \| null` | no | Optional name for a sparse vector slot. Declaring one makes every record carry sparse vectors from then on, so only add it if a search step will read them. |
| `isDefault` | `boolean` | no | Make this the profile used when a searchable declaration names none. Setting it moves the default off whichever profile currently holds it. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile version. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `name` | `string` | yes | Kebab-case name, shared by every version of this profile and used verbatim in its collection names. Immutable — change the display name through `label` instead. |
| `label` | `string \| null` | yes | Human-readable name, or null if none was set. |
| `version` | `integer` | yes | Which version of this profile name this is. Each version owns its own collections, so several can exist at once and only one is active. |
| `modelId` | `string` | yes | Id of the embedding model this version uses. It determines the geometry, so changing it requires a new version. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByRecordTypeCount` | `integer` | yes | How many searchable record types point at this profile. Deleting a profile that is still in use is refused. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which record types use it — one per scope and isolation group in play, never named by hand. |

### `GET /v1/embedding-profiles/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `"collections" \| "collections"[]` | no | Optional sections to include. Repeat the parameter to ask for more than one. Currently only `collections`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile version. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `name` | `string` | yes | Kebab-case name, shared by every version of this profile and used verbatim in its collection names. Immutable — change the display name through `label` instead. |
| `label` | `string \| null` | yes | Human-readable name, or null if none was set. |
| `version` | `integer` | yes | Which version of this profile name this is. Each version owns its own collections, so several can exist at once and only one is active. |
| `modelId` | `string` | yes | Id of the embedding model this version uses. It determines the geometry, so changing it requires a new version. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByRecordTypeCount` | `integer` | yes | How many searchable record types point at this profile. Deleting a profile that is still in use is refused. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which record types use it — one per scope and isolation group in play, never named by hand. |

### `PATCH /v1/embedding-profiles/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string \| null` | no | New human-readable name, or null to clear it. |
| `isDefault` | `boolean` | no | Make this the project's default profile. Anything that changes the vector space — the model, the slots — is refused here and needs a version bump instead. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile version. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `name` | `string` | yes | Kebab-case name, shared by every version of this profile and used verbatim in its collection names. Immutable — change the display name through `label` instead. |
| `label` | `string \| null` | yes | Human-readable name, or null if none was set. |
| `version` | `integer` | yes | Which version of this profile name this is. Each version owns its own collections, so several can exist at once and only one is active. |
| `modelId` | `string` | yes | Id of the embedding model this version uses. It determines the geometry, so changing it requires a new version. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByRecordTypeCount` | `integer` | yes | How many searchable record types point at this profile. Deleting a profile that is still in use is refused. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which record types use it — one per scope and isolation group in play, never named by hand. |

### `DELETE /v1/embedding-profiles/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `POST /v1/embedding-profiles/{id}/activate`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `profile` | `object` | yes | The profile version that is now active. |
| `movedRecordTypes` | `string[]` | yes | Record types moved onto this version by this call. Empty when it was already the active one — activation is safe to repeat. |
| `repointedSteps` | `string[]` | yes | Names of saved search steps whose stored collection name was rewritten onto the new version. A step stores that name as a literal and the version is part of it, so a step left behind keeps querying the superseded collection — which still exists, so it returns stale results rather than an error. |

### `POST /v1/embedding-profiles/{id}/versions`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The embedding profile's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `modelId` | `string` | no | Embedding model for the new version. Omit to keep the current one. |
| `denseSlots` | `string[]` | no | Dense slot names for the new version. Omit to keep the current ones. |
| `sparseSlot` | `string \| null` | no | Sparse slot name for the new version; null removes it. Omit to keep the current one. |
| `label` | `string \| null` | no | Human-readable name for the new version. Omit to keep the current one. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of this profile version. |
| `project` | `string` | yes | Id of the project node that owns this profile. |
| `name` | `string` | yes | Kebab-case name, shared by every version of this profile and used verbatim in its collection names. Immutable — change the display name through `label` instead. |
| `label` | `string \| null` | yes | Human-readable name, or null if none was set. |
| `version` | `integer` | yes | Which version of this profile name this is. Each version owns its own collections, so several can exist at once and only one is active. |
| `modelId` | `string` | yes | Id of the embedding model this version uses. It determines the geometry, so changing it requires a new version. |
| `modelDisplayName` | `string \| null` | yes | Display name of that model, or null when the model is no longer in the catalog. |
| `denseSlots` | `string[]` | yes | Named dense vector slots this profile writes, in order. A searchable declaration targets one of these by name. |
| `sparseSlot` | `string \| null` | yes | Name of the sparse vector slot this profile writes, or null if it writes none. Declaring one makes every record carry sparse vectors, whether or not anything searches them — see `sparseUsage`. |
| `isDefault` | `boolean` | yes | Whether new searchable declarations in this project use this profile when none is named. At most one profile per project is the default. |
| `geometry` | `object \| null` | yes | The vector shape this profile writes, derived from its model. Null when the model no longer resolves — a real state to surface, not an error. |
| `usedByRecordTypeCount` | `integer` | yes | How many searchable record types point at this profile. Deleting a profile that is still in use is refused. |
| `sparseUsage` | `object \| null` | yes | Whether this profile's sparse slot is really queried, or null when it declares none. Sparse vectors are written as soon as the slot is declared, but only read by a step that opts into hybrid search — so a slot can cost storage and be read by nothing. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `collections` | `object[]` | no | The collections this profile implies, present only when you pass `expand=collections`. Derived from which record types use it — one per scope and isolation group in play, never named by hand. |

### `GET /v1/vector-collections`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose collections to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `collections` | `object[]` | yes | The project's live collections. Empty AND `reachable: false` means unknown, not none — check `reachable` before concluding anything from an empty list. |
| `reachable` | `boolean` | yes | Whether the vector store answered the ENUMERATION. False means the SET is unknown, not empty; reading an empty list as “this project has no collections” is how an outage becomes a wrong answer. It says nothing about any one collection — read that row's `storeState`. |

### `GET /v1/vector-collections/{name}`

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
| `identity` | `object` | yes | The tuple the physical name was computed from. Nobody parses the name. |
| `payloadIndexes` | `object[] \| null` | yes | Every INDEXED payload key. A key absent from this list cannot be filtered on — Qdrant answers a filter over an unindexed key without complaining. ⛔ NULL MEANS THE LIST WAS NOT READ, and `[]` cannot say that: an empty array is a collection that genuinely indexes nothing, and folding the two renders an outage as “nothing here is filterable”. ⚠️ NULL DOES NOT IMPLY A NON-`present` `storeState`: the index list is a SECOND store call, so a collection dropped between the two — or a list this reader could not parse — is `present` with a null list. Read this field's own nullness, never `storeState`, to decide whether the list is known. |
| `recordTypes` | `string[]` | yes | Record types whose points land here, from the registry's own reads. Empty for a collection no declaration owns. |
| `counts` | `object` | yes | How much is in the collection, and of what. |

### `GET /v1/vector-collections/{name}/points`

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
| `paging` | `object \| null` | yes | Always null here: a scroll cursor is a point id rather than an offset, so this route cannot say which page you are on and offers no page jump. `total` carries the half it CAN answer. |
| `total` | `integer \| null` | yes | How many points this walk will visit in all, under the same filter — an exact count off the payload index. Null when the store did not answer it, which is NOT zero: a range drawn over a failed count would report an empty collection. |

### `POST /v1/vector-collections/{name}/search`

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
