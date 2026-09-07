# The retrieval pipeline, step by step

Two flows, not one. The write half indexes; the read half answers. They meet only at the
collection.

## Write half — a record becomes points

Usually the processing flow a record type binds, so a record is indexed as it is created.

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
record-level index keeps one point per record and carries the chunks in the payload instead. The
collection decides which of the two it is built for, and `GET /v1/vector-collections/{name}` says
what it reserves room for.

`vector.upsert` writes nothing for a vector slot that arrived empty, so a chunk that failed to
embed leaves a point that exists and is half-searchable rather than one that is absent.

## Read half — a question becomes an answer

Usually the flow behind an endpoint. Steps 3 and 5 are optional; the rest are not, if the answer
is meant to be trustworthy.

| #   | Handler                   | Reads                        | Emits                  | Why it is here                                 |
| --- | ------------------------- | ---------------------------- | ---------------------- | ---------------------------------------------- |
| 1   | `vector.search`           | the question                 | hits                   | find candidates                                |
| 2   | `text.rerank`             | question + hits              | `RerankHit[]`          | precision the vector score alone does not give |
| 3   | `text.sanitize`           | the hit texts                | wrapped `<doc>` blocks | retrieved text is untrusted input              |
| 4   | `text.generate`           | question + wrapped sources   | answer + citations     | the answer                                     |
| 5   | `text.validate-citations` | answer + citations + sources | verdict or errors      | proves the answer quoted what it claims        |

Step 1 can take the question as text — `vector.search` embeds it with the collection's own model —
or as a vector you embedded yourself. Text costs a model call inside the search step; a vector
costs nothing there because you already paid for it.

## Wiring the citation check

`text.validate-citations` needs four things, and three of them come from the step that assembled
the context rather than from the model:

- `answerTextSlot` — the model's answer body
- `citationsSlot` — the model's `{ recordId, quote }` pairs
- `citableSourceIdsSlot` — the allow-list of record ids the context step actually supplied
- `citableSourceTextsSlot` — a map of record id to the source text the quote must appear in

The allow-list is the point. Without it the check can only ask whether a quote appears somewhere;
with it, the check asks whether the model cited something it was actually given. Build both from
the same step that built the prompt, so they cannot drift apart.

## Where the ids come from

A hit's id is the vector store's own UUID unless `idPayloadField` names the payload key holding the
record id. In candidate and record modes, set it. Everything downstream — the citation allow-list,
a `entity.read` that fetches the record, a link back into the product — needs the record id, and a
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
