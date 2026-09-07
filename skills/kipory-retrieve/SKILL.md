---
name: kipory-retrieve
description: Search a Kipory project's own records and answer questions over them — chunk and embed what the project holds, write it to a vector collection, search that collection densely or hybrid, re-rank the hits, and make the model's citations provable against the sources they name. Use when the product has to answer from the project's data rather than from the model's memory, when search returns nothing or returns the wrong things, when hits come back with ids nothing downstream can resolve, or when an answer quotes a source it never read.
license: MIT
---

# Search and answer over the project's own data

Retrieval on Kipory is a chain of handlers, not a resource you configure. The write half turns records into points in a vector collection; the read half turns a question into hits, narrows them, and hands a model text it is allowed to quote. Both halves run as steps in a flow — see `kipory-build` for the flow itself.

**The fact most people get wrong: a hit's id is not a record id.** Points are stored under a UUID the vector store requires, so a search whose hits are meant to be read, cited or linked must be told which payload field carries the record id. Get that wrong and every step after it is holding an identifier that resolves to nothing.

## Before the first call

- **The collection has to exist already.** `GET /v1/vector-collections` lists them and `GET /v1/vector-collections/{name}` shows the vector names it reserves room for. `vector.upsert` does not create one, and a name the collection has no slot for is not written.
- **The embedding profile decides the width.** The profile the collection was built with fixes the vector length, and the model that produces that length is not a per-step choice — `kipory-model` owns the profile and its version bumps.
- **Confirm every handler's config live** with `GET /v1/handlers/{key}`. The shapes below are the catalog's, and the deployment's catalog wins.

## The chain, once

```
write   text.chunk → text.embed  (+ text.embed-sparse)  → vector.point-id → vector.upsert
read    question   → vector.search → text.rerank → text.sanitize → text.generate → text.validate-citations
```

Nothing forces both halves into one flow. The write half usually hangs off a record type's processing flow so a record is indexed as it arrives; the read half is usually the flow behind an endpoint.

## The write half

**Chunk before you embed.** `text.chunk` cuts on token boundaries with `overlapTokens` shared between neighbours, so a sentence split across a boundary still appears whole in one of them. `overlapTokens` must be strictly below `chunkTokens` — the handler throws at run time rather than at save. `maxChunks` defaults to 30 and **drops the tail** when a document runs past it, warning as it goes: a long document silently loses its ending unless you raise the cap or split it upstream.

**Embed dense, and sparse when exact words matter.** `text.embed` gives you meaning; `text.embed-sparse` gives you the words themselves. A dense vector blurs a proper name, an invoice number or a SKU — the sparse one keeps it exact, which is why a collection that has to find `INV-2026-0412` carries both. Leave `text.embed`'s model empty to inherit the project's embedding default rather than pinning one per step.

**Derive the point id, never invent it.** `vector.point-id` maps a record id to the deterministic UUID that record's vectors live under. Because it is a function of the record id, re-running the flow overwrites the same point instead of accumulating duplicates. Feed the same derived id to `vector.fetch` to read the stored vectors back.

**Write the payload you will later filter and cite on.** `vector.upsert` takes either `payloadSlots` (a map of key to slot) or `payloadObjectSlot` (one already-shaped object) — never both. **A payload key containing a dot breaks the filter syntax that reads it back**, so keep keys plain. A vector name cannot be dense in one map and sparse in the other; saving is refused.

## The read half

`vector.search` is four searches behind one key. `hitShape` picks which, and each mode requires its own companion fields:

| `hitShape`  | For                                            | Needs                                                             |
| ----------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `term`      | resolving a value against a vocabulary         | the default; hits are terms                                       |
| `generic`   | a bare similarity lookup                       | nothing extra                                                     |
| `candidate` | proposing records for something else to decide | `includeRecordTypes`, and `idPayloadField` if the id must resolve |
| `record`    | answering a question from documents            | the expansion fields below                                        |

**Record mode is the one that answers questions.** `topK` caps **records**; `chunksPerRecord` caps the chunks returned per record — deliberately different units, because twenty records with three chunks each cannot be said with one number. `expand` then decides how much context comes back: `neighbors` adds the chunks either side of a match, `record` swaps a record's chunks for its whole text once `expandMergeThreshold` of them matched. That threshold must be **below** `chunksPerRecord` or it can never be reached, and saving is refused. `expandRecordTextField` names which field supplies the returned text, because what was embedded is often a shortened or synthesised form and returning that instead is a subtly wrong answer.

**`hybrid` is record mode only.** It searches the sparse vectors too and fuses both result sets — and fusion moves the score onto a rank-derived scale, so anything that compares scores across searches sees a different scale the moment you switch it on. It is ignored when the query already arrives as a vector.

**Re-rank when precision matters more than a round trip.** `text.rerank` re-scores candidates against the query with a model built for the job, best first, capped at `topN`. It bills per hundred documents scored, so raising `maxDocuments` past its default multiplies what every call costs; `topN` above the number scored is refused at save rather than silently returning fewer rows. A document longer than `maxDocumentChars` is rejected, not truncated. It resolves a Cohere credential from the vault under purpose `cohere` and falls through to the platform's key when no node holds one — `kipory-secrets` decides who pays.

**Sanitize retrieved text before it reaches a prompt.** `text.sanitize` wraps each body in a `<doc>` block carrying a nonce, so the prompt can tell the model that everything inside is data rather than instruction. Retrieved text is untrusted — a record can hold whatever someone put in it, and a page fetched by `kipory-gather` is a stranger's text. Skipping this step is how a document talks your flow into ignoring its prompt.

## Making the citations provable

A model asked to cite will cite plausibly whether or not it read anything. `text.validate-citations` is the step that settles it: give it the answer, the model's `{ recordId, quote }` pairs, the allow-list of ids the context step actually supplied, and the source text for each. It enforces three invariants — the id is on the allow-list, the quote is a **verbatim substring** of that source, and the quote appears **exactly once** in the answer — and returns either the citations enriched with server-derived spans or a structured list naming each one that failed and why.

Wire the failure somewhere. A validation result nothing reads is the same as not validating.

## What will bite you

- **`text.embed` and `vector.search` share one rate-limit bucket** (300 per minute). A fan-out that embeds and searches in the same run spends one budget twice over, and the ceiling arrives sooner than either handler's own numbers suggest.
- **Changing the embedding model or provider means re-embedding everything.** The model decides the vector's length and the collection reserved room for that length. There is no partial migration: old points answer a query the new model never asked.
- **An empty input embeds to an empty vector and costs nothing** — and `vector.upsert` leaves that vector unwritten rather than storing a zero. A point can therefore exist with its dense vector present and its sparse one missing, and a hybrid search will quietly under-serve it.
- **`vector.search` embeds a text query for you**, using the model the collection was built with. That is a model call inside a step you may have been reading as a pure lookup. Passing a vector instead spends nothing.
- **`maxSourceChunks` drives the cost of a similar-to-this-record search** — the query is chunks times slots, so a long source record is an expensive query. The step warns when the cap bites, and a silently truncated query is a silently worse result.
- **`expandRecordMaxBytes` reports truncation on the hit rather than shortening quietly**, because a cut document handed to a model is a wrong answer with no symptom. Read that flag before trusting the answer built from it.
- **A search that returns nothing is not always a bad index.** A payload filter with a key that was written containing a dot, a `filterSlots` value that arrived empty (which filters for _unset_, not for _anything_), or a collection name that exists but reserves no room for the vector you are querying all return an empty list rather than an error.

## References

| File                     | What it answers                                                          |
| ------------------------ | ------------------------------------------------------------------------ |
| `references/pipeline.md` | the whole chain as steps and slots, both halves, with the wiring between |

The vector-collection and embedding-profile routes belong to `kipory-model`, which owns the profile
that decides a collection's width; the per-handler config tables belong to `kipory-build`, which
owns the handler catalog.

## Then

`kipory-build` for the flow these steps live in, and for the fan-out and loop grammar that drives the write half over many records. `kipory-model` when the answer is that the embedding profile or the record type is wrong rather than the query. `kipory-gather` when the text to index comes from outside the project, and `kipory-extract` when it arrives as a PDF, an image or audio. `kipory-secrets` for the re-ranker's credential. `kipory-prove` to pin retrieval quality with an eval suite before you tune anything, and `kipory-diagnose` to read what a search step actually emitted on a run that answered badly.
