<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vector.upsert` — Store search data

Store an item's search data so it can be found by meaning or keywords.

Writes one point to a search collection: an id, any number of named vectors, and a payload. Writes nothing back into the flow and runs every time, since a cached result would replay nothing. Slots that arrive empty are skipped rather than erroring.

- **Group:** search · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `nothing`
- **Reads:** The slots named in this action's config: one for the point id, one per named vector, and whichever hold the payload. An empty one leaves that vector unwritten. _(shape hint: `any+`)_
- **Emits:** Nothing — it writes and returns. Re-running with the same point id overwrites that point. The owning tenant is always stamped on the payload so the point stays reachable.
- **Rate limit:** 600 per min in bucket `vector.upsert`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 30 s; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `collection` | string | yes | — | Which collection to write into. It must already exist, with room for the vector names configured below. ⚠️ The write needs a signed-in user. A run a key or a schedule starts, and a project-scoped record's processing run, fail on this action. |
| `payloadObjectSlot` | string | no | — | A slot holding an object whose keys become the payload. Use it when an earlier action has already shaped that object. ⚠️ Mutually exclusive with the per-field map — pick one. A key the store will not accept is skipped with a warning; a non-object value writes no payload at all. |
| `payloadSlots` | object | no | — | A map of payload key to the slot holding its value. Use plain identifiers for the keys. ⚠️ Mutually exclusive with the bulk object slot — pick one. A key containing a dot breaks the filter syntax that reads it later. |
| `pointIdSlot` | string | yes | — | The slot holding the point id. Usually a record id, or another id stable across re-runs. |
| `sparseVectorSlots` | object | no | — | A map of sparse vector name to the slot holding it. Leave one empty to write nothing for that name. ⚠️ A name cannot appear here and in the dense map at once — one slot on the collection is either dense or sparse, and saving is refused. |
| `vectorSlots` | object | no | `{}` | A map of vector name to the slot holding it. Leave one empty to write nothing for that name. |

## Worked example

Several slots go in and one point is written; nothing comes back. The variants show a full point, a partial one, and payload only.

#### Everything stored

Reads `slots` → emits `point in notes` · 4 slots → 1 point · 2 of 2 vectors

Input:

- `selfItemId` — `pointId`
- `contentVector` — `vector`
- `userLanguageVector` — `vector`
- `tags` — `payload`

Written:

- id d64e2f78-1825-ecd7-9838-a6ea8e9a7ac5
- vector vec.content — 3072 dims
- vector vec.user-language — 3072 dims
- tags: ["pasta", "whole-foods", "weekend"]

#### One vector empty

Reads `slots` → emits `point in notes` · 4 slots → 1 point · 2 of 2 vectors

Input:

- `selfItemId` — `pointId`
- `contentVector` — `vector`
- `userLanguageVector` — `vector`
- `tags` — `payload`

Written:

- id d64e2f78-1825-ecd7-9838-a6ea8e9a7ac5
- vector vec.content — 3072 dims
- vector vec.user-language — `sparse`
- tags: ["pasta"]

#### No vectors

Reads `slots` → emits `point in notes` · 5 slots → 1 point · 2 of 2 vectors

Input:

- `selfItemId` — `pointId`
- `contentVector` — `vector`
- `userLanguageVector` — `vector`
- `category` — `payload`
- `tags` — `payload`

Written:

- id d64e2f78-1825-ecd7-9838-a6ea8e9a7ac5
- vector vec.content — `sparse`
- vector vec.user-language — `sparse`
- category: "grocery"
- tags: ["pasta", "barilla"]
