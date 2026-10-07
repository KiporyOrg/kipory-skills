<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.rerank` — Rank by relevance

Sort documents by how well they answer a question.

Scores every candidate together with the query rather than comparing two vectors separately. More accurate than the search that produced them, and far too slow to run over a whole collection. Each result carries the id it was given, so nothing matches on position.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `a question + documents` → `RerankHit[]`
- **Reads:** Two slots you name: the text to match against, and the documents to score. Each document carries its own id. _(shape hint: `a question + documents`)_
- **Emits:** A `list<RerankHit>`, best first and capped at `topN`. Empty when either slot was empty; when the scorer cannot answer, the candidates come back in the order they arrived.
- **Softens these failures:** `vendor-unavailable`, `error` — the step still finishes with a warning, and a `failureSlot` on it then holds the code (`step-fields.md` §6).
- **Suggested input streams:** `query`, `documents`
- **External dependency:** Cohere — Re-scores candidates through Cohere's rerank API. Uses a Cohere API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `cohere` (vendor: Cohere); falls through to the platform's own key when no node holds one.
- **Rate limit:** 600 per min in bucket `cohere`
- **Queue:** 2 attempts, exponential from 1 s 500 ms; waits up to 1 min; cache no expiry — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `documentItemsSlot` | string | yes | — | The slot holding the documents to score. Each one carries its own id, which comes back on the result. |
| `maxDocumentChars` | integer, 100 to 500000 | no | `50000` | How long a single document may be. A longer one is rejected rather than quietly cut short. |
| `maxDocuments` | integer, 1 to 1000 | no | `100` | How many documents to score at most. Anything past this is dropped before scoring, with a warning. ⚠️ Cost is billed per hundred documents scored, so raising this past the default multiplies what every call costs. |
| `model` | string | no | `"cohere/rerank-v3.5"` | Which re-ranking model to score with, by its catalog id (creator/slug, as GET /v1/ai-models lists it). The default is the stable multilingual one. |
| `queryStreams` | string | yes | — | The slot holding the text to match against. |
| `topN` | integer, 1 to 100 | no | `10` | How many results to return, best first. It cannot be higher than the number of documents scored. ⚠️ Saving is refused when this is higher than the number of documents scored — otherwise the extra rows would silently never arrive. |

## Worked example

A query and five candidates go in; the same five come back ordered by how well each one answers it.

#### Search results

The candidate that actually answers the question wins, though the search that produced the list had ranked another one first.

Reads `object` → emits `list<RerankHit>` · 1 in → 1 out

Step settings (`handlerConfig`):

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
