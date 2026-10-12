<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vector.upsert` — Store search data

Store an item's search data so it can be found by meaning or keywords.

Writes an id, named vectors and a payload, and returns nothing. Runs every time; empty slots are skipped.

- **Group:** search · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **Not undone when a run fails:** `vector-write` — The point is written to the search collection while the action runs, under the point id the action is given, so writing it again replaces it with the same point. Doing it twice is harmless; a failed run lists it in `closing.unstagedEffects`.
- **I/O:** `any+` → `nothing`
- **Also found as:** save embedding, index vectors, store vectors
- **Reads:** The slots named in this action's config: one for the point id, one per named vector, and whichever hold the payload. An empty one leaves that vector unwritten. _(shape hint: `any+`)_
- **Emits:** Nothing — the point is saved. The action needs no `outputSlot`; leave it out. A repeat with the same point id overwrites that point.
- **Rate limit:** 600 per min in bucket `vector.upsert`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 30 s; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `collection` | string | yes | — | Which collection to write into; it must already exist. ⚠️ Needs a signed-in user; a run started by a key or schedule fails here. |
| `payloadObjectSlot` | string | no | — | A slot holding an object whose keys become the payload. ⚠️ Use this or the per-key map, not both; a non-object writes no payload. |
| `payloadSlots` | object | no | — | Payload keys mapped to their slots; use plain identifiers as keys. ⚠️ Use this or the object slot, not both; a key with a dot breaks later filters. |
| `pointIdSlot` | string | yes | — | The slot holding the point id, usually a record id. |
| `sparseVectorSlots` | object | no | — | Sparse vector names mapped to their slots; an empty slot writes nothing. ⚠️ A name cannot be in both the dense and sparse maps. |
| `vectorSlots` | object | no | `{}` | Vector names mapped to their slots; an empty slot writes nothing. |

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
