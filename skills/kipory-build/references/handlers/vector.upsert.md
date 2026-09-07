<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `vector.upsert` — Write vectors to a collection

Write dense and sparse vectors plus payload fields to a vector collection.

- **Group:** Search · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `any+` → `nothing`
- **Reads:** The slots named in this step's config: one for the point id, one per named vector, and whichever hold the payload. An empty one leaves that vector unwritten. _(shape hint: `any+`)_
- **Emits:** Nothing — it writes and returns. Re-running with the same point id overwrites that point. The owning tenant is always stamped on the payload so the point stays reachable.
- **Rate limit:** 600 per 60000ms in bucket `vector.upsert`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 30000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `collection` | string | yes | — | Which collection to write into. It must already exist, with room for the vector names configured below. |
| `payloadObjectSlot` | string | no | — | A slot holding an object whose keys become the payload. Use it when an earlier step has already shaped that object. ⚠️ Mutually exclusive with the per-field map — pick one. A key the store will not accept is skipped with a warning; a non-object value writes no payload at all. |
| `payloadSlots` | object | no | — | A map of payload key to the slot holding its value. Use plain identifiers for the keys. ⚠️ Mutually exclusive with the bulk object slot — pick one. A key containing a dot breaks the filter syntax that reads it later. |
| `pointIdSlot` | string | yes | — | The slot holding the point id. Usually a record id, or another id stable across re-runs. |
| `sparseVectorSlots` | object | no | — | A map of sparse vector name to the slot holding it. Leave one empty to write nothing for that name. ⚠️ A name cannot appear here and in the dense map at once — one slot on the collection is either dense or sparse, and saving is refused. |
| `vectorSlots` | object | no | `{}` | A map of vector name to the slot holding it. Leave one empty to write nothing for that name. |

## Worked example

Several slots go in and one point is written; nothing comes back. The variants show a full point, a partial one, and payload only.

Reads: read N slots. Emits: upsert point.

#### full point

Reads `slots` → emits `point in notes` · 4 slots → 1 point · 2 of 2 vectors

Input:

- {"index":0,"value":"selfItemId","detail":"pointId"}
- {"index":1,"value":"contentVector","detail":"vector"}
- {"index":2,"value":"userLanguageVector","detail":"vector"}
- {"index":3,"value":"tags","detail":"payload"}

Written:

- {"index":0,"value":"id d64e2f78-1825-ecd7-9838-a6ea8e9a7ac5"}
- {"index":1,"value":"vector vec.content","detail":"3072 dims"}
- {"index":2,"value":"vector vec.user-language","detail":"3072 dims"}
- {"index":3,"value":"tags: [\"pasta\", \"whole-foods\", \"weekend\"]"}

#### sparse user-language

Reads `slots` → emits `point in notes` · 4 slots → 1 point · 2 of 2 vectors

Input:

- {"index":0,"value":"selfItemId","detail":"pointId"}
- {"index":1,"value":"contentVector","detail":"vector"}
- {"index":2,"value":"userLanguageVector","detail":"vector"}
- {"index":3,"value":"tags","detail":"payload"}

Written:

- {"index":0,"value":"id d64e2f78-1825-ecd7-9838-a6ea8e9a7ac5"}
- {"index":1,"value":"vector vec.content","detail":"3072 dims"}
- {"index":2,"value":"vector vec.user-language","detail":"sparse"}
- {"index":3,"value":"tags: [\"pasta\"]"}

#### payload-only

Reads `slots` → emits `point in notes` · 5 slots → 1 point · 2 of 2 vectors

Input:

- {"index":0,"value":"selfItemId","detail":"pointId"}
- {"index":1,"value":"contentVector","detail":"vector"}
- {"index":2,"value":"userLanguageVector","detail":"vector"}
- {"index":3,"value":"category","detail":"payload"}
- {"index":4,"value":"tags","detail":"payload"}

Written:

- {"index":0,"value":"id d64e2f78-1825-ecd7-9838-a6ea8e9a7ac5"}
- {"index":1,"value":"vector vec.content","detail":"sparse"}
- {"index":2,"value":"vector vec.user-language","detail":"sparse"}
- {"index":3,"value":"category: \"grocery\""}
- {"index":4,"value":"tags: [\"pasta\", \"barilla\"]"}
