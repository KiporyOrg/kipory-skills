<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.rerank` — Rank by relevance

Sort documents by how well they answer a question.

More accurate than the search that found them, but too slow for a whole collection.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `a question + documents` → `RerankHit[]`
- **Also found as:** rank results, sort by relevance, reorder, best match
- **Reads:** Two slots you name: the text to match against, and the documents to score. Each document carries its own id. _(shape hint: `a question + documents`)_
- **Emits:** A `list<RerankHit>`, best first and capped at `topN`. Empty when either slot was empty; when the scorer cannot answer, the candidates come back in the order they arrived.
- **Softens these failures:** `vendor-unavailable`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `query`, `documents`
- **External dependency:** Cohere — Re-scores candidates through Cohere's rerank API. Uses a Cohere API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `cohere` (vendor: Cohere); falls through to the platform's own key when no node holds one.
- **Rate limit:** 600 per min in bucket `cohere`
- **Queue:** 2 attempts, exponential from 1 s 500 ms; waits up to 1 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `documentItemsSlot` | string | yes | — | The slot holding the documents to score, each with its own id. |
| `maxDocumentChars` | integer, 100 to 500000 | no | `50000` | Most characters per document; longer ones are rejected, not cut. |
| `maxDocuments` | integer, 1 to 1000 | no | `100` | Most documents to score; extras are dropped with a warning. ⚠️ Cost is billed per hundred documents scored, so raising this past the default multiplies what every call costs. |
| `model` | string | no | `"cohere/rerank-v3.5"` | Which re-ranking model scores, by catalog id; default is the multilingual one. |
| `queryStreams` | string | yes | — | The slot holding the text to match against. |
| `topN` | integer, 1 to 100 | no | `10` | How many results to return, best first, up to the documents scored. ⚠️ Saving is refused when this exceeds the number of documents scored. |

## Worked example

A query and five candidates go in; the same five come back ordered by how well each one answers it.

#### Search results

The candidate that actually answers the question wins, though the search that produced the list had ranked another one first.

Reads `object` → emits `list<RerankHit>` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "queryStreams": "userQuery",
  "documentItemsSlot": "candidateDocs"
}
```

Input:

```
{
  "userQuery": "the frying pan I bought in April",
  "candidateDocs": [
    { "id": "rec_a", "text": "Cast iron care — seasoning, drying, and what strips it." },
    { "id": "rec_b", "text": "Kitchen purchases, April 2026: pan, two baking trays, a thermometer." },
    { "id": "rec_c", "text": "Copper-bottomed 24cm frying pan bought 2026-04-12, oven-safe, hand wash only." },
    { "id": "rec_d", "text": "Frying pan roundup — non-stick versus stainless." },
    { "id": "rec_e", "text": "Weeknight one-pan chicken recipe." }
  ]
}
```

Output:

```
[
  { "id": "rec_c", "relevance": 0.94 },
  { "id": "rec_b", "relevance": 0.71 },
  { "id": "rec_e", "relevance": 0.58 },
  { "id": "rec_a", "relevance": 0.42 },
  { "id": "rec_d", "relevance": 0.08 }
]
```
