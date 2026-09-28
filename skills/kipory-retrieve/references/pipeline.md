# The retrieval pipeline, step by step

Two halves that meet only at the collection. The write half indexes; the read half answers.

## Write half — a record becomes points

For a record type's own search there is nothing to build: declare `search` in the type's `uses`
(`kipory-model`) and the platform chunks, embeds and writes each record into the collection
derived from the embedding profile, with the payload `record` mode reads back. Collections have no
create route — `GET /v1/vector-collections?project={nodeId}` lists the ones that exist.

The hand-built chain below writes extra points into a collection that already exists;
`vector.upsert` cannot create one. Every collection is derived, and a search on one lets the
collection embed the query (`queryTextSlot` or `queryRecordIdSlot`): a `queryVectorSlot` search is
refused at save (`VECTOR_SEARCH_QUERY_NOT_DERIVED`). Such a search returns a hand-written point
only if its payload carries a `recordId` and a `recordType` the search's `includeRecordTypes` names.

| #   | Handler             | Reads                       | Emits           | Why it is here                                 |
| --- | ------------------- | --------------------------- | --------------- | ---------------------------------------------- |
| 1   | `text.chunk`        | the record's text           | `string[]`      | one vector cannot represent a long document    |
| 2   | `flow.fan-out`      | the chunk list              | one branch each | every chunk is embedded and written separately |
| 3   | `text.embed`        | one chunk                   | `Vector`        | meaning                                        |
| 4   | `text.embed-sparse` | the same chunk              | `SparseVector`  | the exact words, for hybrid search             |
| 5   | `vector.point-id`   | the record id               | `string`        | a stable id, so a re-run overwrites            |
| 6   | `vector.upsert`     | id + both vectors + payload | nothing         | the write                                      |
| 7   | `flow.merge`        | the branches                | a list          | closes the fan-out                             |

`vector.point-id` hashes **whatever value the slot holds** into the store's id format. Feed it a
record id and one record maps to one point — which means every chunk of that record would land on
the same point and overwrite the last. A chunk-level index therefore needs a value that is distinct
per chunk (the record id combined with the chunk's index, composed upstream of step 5); a
record-level index keeps one point per record and carries the chunks in the payload instead.
`GET /v1/vector-collections/{name}?project={nodeId}` says which vector names the collection
reserves room for.

`vector.upsert` writes nothing for a vector slot that arrived empty, so a chunk that failed to
embed leaves a point that exists and is half-searchable rather than one that is absent.

## Read half — a question becomes an answer

Usually the flow behind an endpoint. Steps 2 and 3 are optional; the rest are not, if the answer
is meant to be trustworthy.

| #   | Handler           | Reads                         | Emits                                  | Why it is here                                 |
| --- | ----------------- | ----------------------------- | -------------------------------------- | ---------------------------------------------- |
| 1   | `vector.search`   | the question                  | hits                                   | find candidates                                |
| 2   | `text.rerank`     | question + `{ id, text }[]`   | `{ id, relevance }[]` — no text        | precision the vector score alone does not give |
| 3   | `value.transform` | rerank hits + the texts       | `{ id, text }[]` in rerank order       | rerank drops the text; sanitize needs it back  |
| 4   | `text.sanitize`   | `itemsSlot`: `{ id, text }[]` | `{ id, sanitizedText }[]`, or a string | retrieved text is untrusted input              |
| 5   | `text.generate`   | question + wrapped sources    | the answer                             | the answer                                     |

Search hits carry no text at all in `record` mode — each chunk's payload is ids and filter fields,
and `text` is filled only when `expand: "record"` merged the record (more than
`expandMergeThreshold` matched chunks). Put an `entity.read` with `idsSlot: "hits[].recordId"`
after step 1 to fetch the records, then a `value.transform` that shapes those rows into
`{ id, text }` before step 2 (or before step 4 when you skip re-ranking). Step 4 reads `idField` and `textField` (defaults `id`,
`text`) from each item; handed rerank hits directly it wraps every source as an empty `<doc>`.
`outputShape: "joined"` emits the blocks as one string, ready for a prompt.

Step 1's `collection` is the full `collectionName` (`{slug}.{name}`) from
`GET /v1/vector-collections?project={nodeId}`, not the short `name` the collection routes take.
Step 1 can take the question as text — `vector.search` embeds it with the collection's own model —
or as a vector you embedded yourself. Text costs a model call inside the search step; a vector
costs nothing there because you already paid for it.

## Where the ids come from

In `record` mode every hit is a record and carries `recordId`; `idPayloadField` is refused there at
save. In `candidate` mode a hit's id is the vector store's own UUID unless `idPayloadField`
names the payload key holding the record id — `recordId`, which the platform stamps — so set it.
`term` and `generic` hits keep the point id. Everything downstream — a `entity.read` that
fetches the record, a link back into the product — needs the record id, and a
UUID that resolves to nothing fails silently at the far end of the flow rather than at the search.

## Tuning, in the order that pays

1. **Chunk size.** Too large and the match is diluted; too small and the answer loses context.
   `overlapTokens` is what stops a boundary from destroying a sentence.
2. **Hybrid on or off.** Turn it on when exact tokens matter — names, codes, identifiers. Remember
   it re-scales the score.
3. **`topK` and `chunksPerRecord`.** Widen the net before you sharpen it.
4. **Re-rank.** Fixes ordering, not recall: it can only re-order what search already returned.
5. **Expansion.** `record` expansion is the difference between a model seeing three fragments and
   seeing the document.

Pin the quality first with an eval suite (`kipory-prove`), or every one of these is a guess whose
effect nobody measured.
