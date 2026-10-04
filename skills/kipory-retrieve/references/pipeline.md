# The retrieval pipeline, step by step

Two halves that meet only at the collection. The write half indexes; the read half answers.

## Write half — a record becomes points

There is nothing to build: declare `search` in the type's `uses` (`kipory-model`) and the platform
chunks, embeds and writes each record into the collection derived from the embedding profile, with
the payload `record` mode reads back. Collections have no create route —
`GET /v1/vector-collections?project={nodeId}` lists the ones that exist. Indexing is asynchronous,
so a record can be `ready` before it is searchable.
<!-- absent: POST /v1/vector-collections -->

## Read half — which records?

One step. `entity.query` with a `semantic` clause returns the records, ranked, with their fields:

| #   | Handler           | Reads                         | Emits                                  | Why it is here                             |
| --- | ----------------- | ----------------------------- | -------------------------------------- | ------------------------------------------ |
| 1   | `entity.query`    | the question (`textSlot`)     | `records`, `bounded`, `explanation`    | rank by meaning, narrowed by exact clauses |
| 2   | `value.transform` | `records`                     | `{ id, text }[]`                       | pick the field the model should read       |
| 3   | `text.sanitize`   | `itemsSlot`: `{ id, text }[]` | `{ id, sanitizedText }[]`, or a string | retrieved text is untrusted input          |
| 4   | `text.generate`   | question + wrapped sources    | the answer                             | the answer                                 |

Steps 2–4 are only for an answer a model writes. A list of matching records is step 1 alone.
The step's `limit` (1–100, default 50) cuts the ranking after `topK`, so raise both together.

## Read half — similar records and matched chunks

For a similar-to-this-record search, a similarity threshold, several record types at once, or to
learn which chunk of a record matched. No step returns a chunk's text — the text is the record's,
read in step 2. Steps 3 and 4 are optional; the rest are not, if the answer is meant to be
trustworthy.

| #   | Handler           | Reads                                                                    | Emits                                  | Why it is here                                 |
| --- | ----------------- | ------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------- |
| 1   | `vector.search`   | the question, or a record id                                             | hits — ids and scores, no text         | find candidates                                |
| 2   | `entity.read`     | `recordType` + `idsSlot: "hits[].recordId"` (one step per type searched) | the hit records, with their fields     | a hit carries no text                          |
| 3   | `text.rerank`     | question + `{ id, text }[]`                                              | `{ id, relevance }[]` — no text        | precision the vector score alone does not give |
| 4   | `value.transform` | rerank hits + the texts                                                  | `{ id, text }[]` in rerank order       | rerank drops the text; sanitize needs it back  |
| 5   | `text.sanitize`   | `itemsSlot`: `{ id, text }[]`                                            | `{ id, sanitizedText }[]`, or a string | retrieved text is untrusted input              |
| 6   | `text.generate`   | question + wrapped sources                                               | the answer                             | the answer                                     |

- **Step 1** takes the question as text (`queryTextSlot`) — the search embeds it with the
  collection's own model, a model call billed inside the step — or a record id
  (`queryRecordIdSlot`), which embeds nothing. A vector embedded upstream is refused at save
  (`VECTOR_SEARCH_QUERY_NOT_DERIVED`). Its `collection` is the full `collectionName`
  (`{slug}.{name}`) from `GET /v1/vector-collections?project={nodeId}`, not the short `name` the
  collection routes take.
- **Step 2** reads one record type: `recordType` is required, and ids of any other type are
  dropped without an error. A search over several `includeRecordTypes` needs one `entity.read`
  per type, each on the same `hits[].recordId`.
- **Between 2 and 3** a `value.transform` shapes the rows `entity.read` returned into
  `{ id, text }` — before step 3, or before step 5 when you skip re-ranking.
- **`expand: "record"`** fills a hit's `text` only for a record that matched more than
  `expandMergeThreshold` chunks; a one-chunk match never merges. Reading the records is the way
  that always works.
- **Step 5** reads `idField` and `textField` (defaults `id`, `text`) from each item; handed rerank
  hits directly it wraps every source as an empty `<doc>`. It cuts each body at `maxCharsPerItem`
  (4 000 characters by default), so raise it for whole documents. `outputShape: "joined"` emits the
  blocks as one string, ready for a prompt. The skill's main page has the whole contract, the nonce
  included.

## Tuning, in the order that pays

1. **Chunk size.** Too large and the match is diluted; too small and the answer loses context. It
   is set on the embedding profile's `defaultChunking`, or the type's `uses.search.chunking`
   (`kipory-model`); changing it re-embeds the type's records.
2. **Hybrid on or off.** Turn it on when exact tokens matter — names, codes, identifiers. The
   hit's `score` becomes rank-derived; `scoreThreshold` still cuts only the dense matches, on the
   cosine scale. It needs a profile with a sparse slot.
3. **`topK` and `chunksPerRecord`.** Widen the net before you sharpen it.
4. **Re-rank.** Fixes ordering, not recall: it can only re-order what search already returned.
5. **Expansion.** `expand: record` saves the `entity.read` step for records that matched several
   chunks; it does not change what the model can see.

Pin the quality first with an eval suite (`kipory-prove`), or every one of these is a guess whose
effect nobody measured.

## The hand-built write chain

For extra points the declaration does not write, and only in a flow a signed-in end user calls:
`vector.upsert` fails on a run with no signed-in user, which is every run a key or a schedule
starts and the processing run of a project-scoped record. It writes into a collection that already
exists — it cannot create one.

| #   | Handler             | Reads                       | Emits           | Why it is here                                 |
| --- | ------------------- | --------------------------- | --------------- | ---------------------------------------------- |
| 1   | `text.chunk`        | the record's text           | `string[]`      | one vector cannot represent a long document    |
| 2   | `flow.fan-out`      | the chunk list              | one branch each | every chunk is embedded and written separately |
| 3   | `text.embed`        | one chunk                   | `Vector`        | meaning                                        |
| 4   | `text.embed-sparse` | the same chunk              | `SparseVector`  | the exact words, for hybrid search             |
| 5   | `vector.point-id`   | a value distinct per point  | `string`        | a stable id, so a re-run overwrites            |
| 6   | `vector.upsert`     | id + both vectors + payload | nothing         | the write                                      |
| 7   | `flow.merge`        | the branches                | a list          | closes the fan-out                             |

- **`text.chunk`** cuts on token boundaries with `overlapTokens` shared between neighbours.
  `overlapTokens` must be strictly below `chunkTokens` — the handler throws at run time rather than
  at save. `maxChunks` defaults to 30 and **drops the tail** when a document runs past it, warning
  as it goes.
- **`text.embed`** must use the profile's own model, or the scores mean nothing. An empty input
  embeds to an empty vector, makes no model call, and `vector.upsert` leaves that vector unwritten
  — so a point can exist with its dense vector present and its sparse one missing, and a hybrid
  search will quietly under-serve it.
- **`vector.point-id`** hashes **whatever value the slot holds** into the store's id format, so a
  re-run overwrites the same point. Feed it a record id and every chunk of that record lands on one
  point and overwrites the last; a point per chunk needs a value distinct per chunk (the record id
  joined with the chunk's index, composed upstream). Feed the same derived id to `vector.fetch` to
  read the stored vectors back.
- **`vector.upsert`** takes either `payloadSlots` (a map of key to slot) or `payloadObjectSlot`
  (one already-shaped object) — never both. A payload key may use only letters, digits and
  underscores; a dotted key is refused at save. A vector name cannot be dense in one map and sparse
  in the other; saving is refused. The vector names must be ones the collection reserves
  (`GET /v1/vector-collections/{name}?project={nodeId}`).
- **A record-mode search returns such a point only if its payload carries** `recordId`, a
  `recordType` the search's `includeRecordTypes` names, and — on a per-user collection — the
  `scopeKey` the search filters on.
