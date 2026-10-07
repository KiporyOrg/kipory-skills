# The retrieval pipeline, step by step

Two halves. The write half indexes and is declared; the read half answers and is one step.

## Write half — a record becomes searchable

There is nothing to build: declare `search` in the type's `uses` (`kipory-model`) and the platform
splits, embeds and indexes each record. Indexing is asynchronous, so a record can be `ready`
before it is searchable.

## Read half — which records, and how close?

One step. `record.query` with a `semantic` clause returns the records, ranked, with their fields
and a score for each:

| #   | Handler           | Reads                                  | Emits                                         | Why it is here                             |
| --- | ----------------- | -------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| 1   | `record.query`    | the question (`textSlot`), or a record | `records`, `scores`, `bounded`, `explanation` | rank by meaning, narrowed by exact clauses |
| 2   | `text.rerank`     | question + `{ id, text }[]`            | `{ id, relevance }[]` — no text               | precision the score alone does not give    |
| 3   | `value.transform` | records, or rerank hits + the texts    | `{ id, text }[]`                              | pick the text the model should read        |
| 4   | `text.sanitize`   | `itemsSlot`: `{ id, text }[]`          | `{ id, sanitizedText }[]`, or a string        | retrieved text is untrusted input          |
| 5   | `text.generate`   | question + wrapped sources             | the answer                                    | the answer                                 |

Steps 2–5 are only for an answer a model writes; step 2 is optional among them. A list of matching
records, or a match-or-new decision, is step 1 and a `value.transform`.

- **Step 1** takes the question as text (`textSlot`) — it embeds the phrase with the model the
  type was indexed with, a model call billed inside the step — or a record id
  (`likeRecordIdSlot`), which embeds nothing. Its `limit` (1–100, default 50) cuts the ranking
  after `topK`, so raise both together.
- **`scores`** lists `{ id, score }` in the order of `records`. With `passage: true` an entry also
  carries `passage: { index, text }`, the record's best-matching part.
- **Step 3** shapes the rows into `{ id, text }`: the field you want read, or the passage when you
  asked for one. After a re-rank it also joins each rerank hit back to its text by `id`, in rerank
  order — rerank drops the text and sanitize needs it back.
- **Step 4** reads `idField` and `textField` (defaults `id`, `text`) from each item; handed rerank
  hits directly it wraps every source as an empty `<doc>`. It cuts each body at `maxCharsPerItem`
  (4 000 characters by default), so raise it for whole documents. `outputShape: "joined"` emits the
  blocks as one string, ready for a prompt. The skill's main page has the whole contract, the nonce
  included.

## Match or new, by score

The same step answers "is this the thing we already have?". Read the best score and decide in
bands:

| #   | Handler           | Reads                                                  | Emits                                      |
| --- | ----------------- | ------------------------------------------------------ | ------------------------------------------ |
| 1   | `record.query`    | the new item's text                                    | the closest records, with `scores`         |
| 2   | `value.transform` | `records`, `scores`, your marks                        | `{ band: "same" \| "ask" \| "new", best }` |
| 3   | `text.decide`     | the candidate and the new item, on `band = "ask"` only | a yes/no with its probability              |

Keep the two marks in project config rather than in the expression, so they can be tuned without
editing the flow. `minScore` on the clause removes what is below the low mark before step 2 sees
it.

## Tuning, in the order that pays

1. **Part size.** Too large and the match is diluted; too small and the answer loses context. It
   is set on the embedding profile's `defaultChunking`, or the type's `uses.search.chunking`
   (`kipory-model`); changing it re-embeds the type's records.
2. **Exact words.** A profile that also indexes exact words blends keyword rank into the order,
   which helps when names, codes and identifiers matter. The score keeps its scale either way.
3. **`topK`.** Widen the net before you sharpen it.
4. **`minScore`.** Set it from scores you have looked at, not from a guess: run the query without
   it and read `scores` for matches you know are right and wrong.
5. **Re-rank.** Fixes ordering, not recall: it can only re-order what the search already returned.
6. **`passage`.** Hands the model the part that matched instead of the whole document; it does not
   change which records come back.

Pin the quality first with an eval suite (`kipory-prove`), or every one of these is a guess whose
effect nobody measured.
