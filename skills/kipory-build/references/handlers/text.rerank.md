<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.rerank` — Re-rank documents

Re-rank candidate documents by relevance to a query.

- **Group:** AI · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `slot map` → `RerankHit[]`
- **Reads:** Two slots you name: the text to match against, and the documents to score. Each document carries its own id. _(shape hint: `slot map`)_
- **Emits:** A `list<RerankHit>`, best first and capped at `topN`. Empty when either slot was empty; when the scorer cannot answer, the candidates come back in the order they arrived.
- **Suggested input streams:** `query`, `documents`
- **External dependency:** Cohere — Re-scores candidates through Cohere's rerank API (KIPORY_COHERE_API_KEY).
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `cohere` (vendor: Cohere); falls through to the platform's own key when no node holds one.
- **Rate limit:** 600 per 60000ms in bucket `cohere`
- **Queue:** 2 attempts, exponential from 1500ms; waits up to 60000ms; cache no expiry (default-input-slot-hash)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `documentItemsSlot` | string | yes | — | The slot holding the documents to score. Each one carries its own id, which comes back on the result. |
| `maxDocumentChars` | integer | no | `50000` | How long a single document may be. A longer one is rejected rather than quietly cut short. |
| `maxDocuments` | integer | no | `100` | How many documents to score at most. Anything past this is dropped before scoring, with a warning. ⚠️ Cost is billed per hundred documents scored, so raising this past the default multiplies what every call costs. |
| `model` | string | no | `"rerank-v3.5"` | Which re-ranking model to score with. The default is the stable multilingual one. |
| `provider` | string | no | `"cohere"` | Which service does the scoring. Only providers with a re-ranking model can be picked. |
| `queryStreams` | string | yes | — | The slot holding the text to match against. |
| `topN` | integer | no | `10` | How many results to return, best first. It cannot be higher than the number of documents scored. ⚠️ Saving is refused when this is higher than the number of documents scored — otherwise the extra rows would silently never arrive. |

## Worked example

A query and five candidates go in; the same five come back ordered by how well each one answers it.

Reads: read query + documents. Emits: score against the query.

#### search verification

The candidate that actually answers the question wins, though the search that produced the list had ranked another one first.

Reads `object` → emits `list<RerankHit>` · 1 in → 1 out

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
