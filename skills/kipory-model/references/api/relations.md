<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: a22b93e6cbba · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Relation kinds and pairings

The vocabulary of typed record-to-record edges: a kind, and the (typeA, typeB) pairs it admits. A pairing has no update; re-target by deleting and recreating.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/relation-kind-pairings`](#get-v1-relation-kind-pairings) |  |
| `POST` | [`/v1/relation-kind-pairings`](#post-v1-relation-kind-pairings) |  |
| `GET` | [`/v1/relation-kind-pairings/{id}`](#get-v1-relation-kind-pairings-id) |  |
| `DELETE` | [`/v1/relation-kind-pairings/{id}`](#delete-v1-relation-kind-pairings-id) |  |
| `GET` | [`/v1/relation-kinds`](#get-v1-relation-kinds) |  |
| `POST` | [`/v1/relation-kinds`](#post-v1-relation-kinds) |  |
| `GET` | [`/v1/relation-kinds/{id}`](#get-v1-relation-kinds-id) |  |
| `PATCH` | [`/v1/relation-kinds/{id}`](#patch-v1-relation-kinds-id) |  |
| `DELETE` | [`/v1/relation-kinds/{id}`](#delete-v1-relation-kinds-id) |  |

### `GET /v1/relation-kind-pairings`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose pairings to list. |
| `recordType` | `string` | no | Keep only pairings where this record type appears at EITHER end. Omit for all pairings in the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relationKindPairings` | `object[]` | yes | Which record-type pairs each relation kind may link. |

### `POST /v1/relation-kind-pairings`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the owning project. |
| `kind` | `string` | yes | Key of an existing relation kind in this project. |
| `from` | `string` | yes | Name of an existing record type — the source end. |
| `to` | `string` | yes | Name of an existing record type — the target end. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `kind` | `string` | yes | Key of the relation kind this pairing applies to. |
| `from` | `string` | yes | Record-type name at the source end, for a directional kind. |
| `to` | `string` | yes | Record-type name at the target end, for a directional kind. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/relation-kind-pairings/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The pairing's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `kind` | `string` | yes | Key of the relation kind this pairing applies to. |
| `from` | `string` | yes | Record-type name at the source end, for a directional kind. |
| `to` | `string` | yes | Record-type name at the target end, for a directional kind. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/relation-kind-pairings/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The pairing's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `GET /v1/relation-kinds`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose relation kinds to list. Required. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: relationCount, liveRelationCount, pairings, readiness. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relationKinds` | `object[]` | yes | The project's relation kinds, unpaginated. |

### `POST /v1/relation-kinds`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the kind. |
| `key` | `string` | yes | Kebab-case key, unique within the project. Permanent once created — pairings link to it by key. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. Required. |
| `minConfidence` | `number \| null` | no | Reserved; has no effect today. |
| `direction` | `"directed" \| "symmetric"` | no | Whether the two ends mean different things. Choose deliberately — it decides whether `(from, to)` order is meaningful. |
| `producer` | `"field" \| "joinRecord" \| "curated"` | no | How edges of this kind come into existence. |
| `cardinality` | `"manyToOne" \| "manyToMany"` | no | How many edges of this kind one record may have. Leave unset for a curated kind, where it does not apply. |
| `propertiesEntryId` | `string \| null` | no | Schema entry describing properties edges may carry. Omit for edges with none. |
| `sortOrder` | `integer` | no | Position among the project's relation kinds. |
| `pairings` | `object[]` | yes | Record-type pairs to apply the kind to, created in the same transaction. At least one is required — a kind that applies to no pair can connect nothing. Every type named must already exist. |
| `declaration` | `object` | no | The producer's own declaration, spliced into `recordType.relations` in the same transaction as the kind. Omit to declare it later. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Kebab-case key for this kind, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(from, to)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "joinRecord" \| "curated"` | yes | How edges of this kind come into existence — derived automatically, or curated by hand. |
| `cardinality` | `"manyToOne" \| "manyToMany"` | yes | How many edges of this kind one record may have. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `joinRecord` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present only when you pass `expand=relationCount`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present only when you pass `expand=pairings`. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |

### `GET /v1/relation-kinds/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The relation kind's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: relationCount, liveRelationCount, pairings, readiness. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Kebab-case key for this kind, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(from, to)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "joinRecord" \| "curated"` | yes | How edges of this kind come into existence — derived automatically, or curated by hand. |
| `cardinality` | `"manyToOne" \| "manyToMany"` | yes | How many edges of this kind one record may have. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `joinRecord` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present only when you pass `expand=relationCount`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present only when you pass `expand=pairings`. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |

### `PATCH /v1/relation-kinds/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The relation kind's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: relationCount, liveRelationCount, pairings, readiness. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New name. Omit to leave it alone. |
| `description` | `string` | no | New description. Omit to leave it alone. |
| `minConfidence` | `number \| null` | no | Reserved; has no effect today. |
| `direction` | `"directed" \| "symmetric"` | no | Change whether the two ends mean different things. Existing edges are not rewritten, so switching this re-interprets data that is already stored. |
| `producer` | `"field" \| "joinRecord" \| "curated"` | no | Change how edges of this kind come into existence. |
| `cardinality` | `"manyToOne" \| "manyToMany"` | no | Change how many edges one record may have. Existing edges that now exceed it are not removed. |
| `propertiesEntryId` | `string \| null` | no | Point at a different schema entry for edge properties, or null for none. |
| `sortOrder` | `integer` | no | Change the position. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Kebab-case key for this kind, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(from, to)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "joinRecord" \| "curated"` | yes | How edges of this kind come into existence — derived automatically, or curated by hand. |
| `cardinality` | `"manyToOne" \| "manyToMany"` | yes | How many edges of this kind one record may have. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `joinRecord` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present only when you pass `expand=relationCount`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present only when you pass `expand=pairings`. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |

### `DELETE /v1/relation-kinds/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The relation kind's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedCounts` | `object` | yes | What the deletion took with it. Deleting a kind cascades — read this before, not after. |
