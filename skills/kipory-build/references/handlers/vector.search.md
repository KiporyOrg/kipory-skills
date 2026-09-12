<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `vector.search` — Search vectors

Search a vector collection and return the closest hits.

- **Group:** Search · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any+` → `TermHit[]`
- **Reads:** One slot holding the query: a vector from `text.embed` or `text.embed-sparse`, the text to search for, or the id of a record to find neighbours of. _(shape hint: `any+`)_
- **Emits:** A hit list, best first, capped at `topK` — a `TermHit`, `GenericHit`, `CandidateHit` or `RecordHit`, depending on `hitShape`. Empty when nothing matches.
- **Suggested input streams:** `vector`
- **External dependency:** Model provider — A text query is embedded here, with the model the target collection was built with, before the search runs. A query arriving as a vector spends no model call.
- **Rate limit:** 300 per 60000ms in bucket `ai-embed` — shared with `text.embed`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `chunksPerRecord` | integer | no | — | How many chunks to return for each record. Record mode only, and applied before the chunks are transferred. ⚠️ A different unit from `topK`, which caps RECORDS. One shared cap could not express twenty records with three chunks each. |
| `collection` | string | yes | — | Which collection to search. Facets are scoped by a payload filter, not by a separate collection. |
| `expand` | `none` \| `neighbors` \| `record` | no | — | How much context to return around each match. Record mode only. ⚠️ `neighbors` adds the chunks either side, outside the per-record cap and marked unmatched. `record` replaces a record's chunks with its whole text once enough of it matched. |
| `expandMergeThreshold` | integer | no | — | How many chunks of a record must match before its whole text is returned instead. Required with record expansion. ⚠️ It must be below `chunksPerRecord` — that cap is the most chunks a record can present, so a threshold at or above it can never be reached. Saving is refused. |
| `expandNeighborRadius` | integer | no | — | How many chunks either side of a match to include. Neighbour expansion only. ⚠️ Each record's chunk count grows by up to twice this per matched chunk, so a large radius is a whole-record read by another name — and record expansion does that in one read. |
| `expandRecordMaxBytes` | integer | no | — | How many bytes of a merged record's text to return. Record expansion only. ⚠️ A truncated record is reported on the hit rather than shortened quietly — a silently cut document handed to a model is a wrong answer with no symptom. |
| `expandRecordTextField` | string | no | — | Which field of the record holds the text to return. Required with record expansion. ⚠️ Named rather than inferred from what was embedded: the embedded form is often synthesised or shortened, and returning that instead would be a subtly wrong answer. |
| `filter` | object | no | — | Optional payload filter. Fields are operator-controlled. For a term vocabulary, a facet / status / parent-term filter within the single terms collection. |
| `filterSlots` | object | no | — | A map of payload key to the slot supplying that key's filter value at run time. ⚠️ An empty value filters for the key being unset; a list matches any of its values. A key cannot be filtered here and statically at once — saving is refused. |
| `hitShape` | `term` \| `generic` \| `candidate` \| `record` | no | `"term"` | What each hit looks like, and how the search is run. Each mode requires its own companion fields. |
| `hybrid` | boolean | no | — | Also search the collection's sparse vectors and fuse the two result sets. Record mode only, off by default. ⚠️ Fusion moves the score onto a rank-derived scale, so anything comparing scores across searches sees a different scale the moment this is on. Ignored when the query is already a vector. |
| `idPayloadField` | string | no | — | Which payload field supplies each hit's id. Candidate mode only; unset uses the raw point id. ⚠️ A point's own id is a UUID the store requires, not the record id. Set this to the record-id key when a later step has to read or cite the record. |
| `includeRecordTypes` | string[] | no | — | Which record types may appear in the results. Required in candidate mode. Several values search across all of them. |
| `maxSourceChunks` | integer | no | — | How many chunks of the source record to use as queries. Similar-to-record searches only. ⚠️ The cost is chunks times slots, so a long record drives it. When the cap bites the step warns — a silently truncated query is a silently worse result. |
| `queryRecordIdSlot` | string | no | — | The slot holding a record id to find neighbours of. Record mode only, and one query source at a time. ⚠️ It searches with the record's own stored vectors, so nothing is embedded and a tuned threshold keeps meaning. An unindexed record fails rather than returning an empty list. |
| `queryTextSlot` | string | no | — | The slot holding the query text. Record mode only, and one query source at a time. ⚠️ The text is embedded with the model the target collection was built with. Prefer this over embedding upstream: a different model of the same size scores meaninglessly and errors nowhere. |
| `queryVectorSlot` | string | no | — | The slot holding the query vector. Dense or sparse, and a dotted path reaches into an object slot. |
| `scoreThreshold` | number | no | — | A lower bound on the score, applied by the store on every query. Leave it off for recall, set it for precision. ⚠️ The score is cosine similarity and is legitimately NEGATIVE for a poor match — it is not bounded to 0..1. With `hybrid` on it becomes a rank-derived number on a different scale entirely. |
| `topK` | integer | no | `5` | Top-K candidates to return, descending by score. Default 5; hard cap at 200 to keep tiebreak prompts bounded. |
| `vectorName` | string | no | — | Which named vector to search along. Unset searches the collection's default one. ⚠️ Required when the query is a sparse vector — the store routes sparse only through a named slot. A name the collection does not have fails at run time, not at save. |
| `vectorNames` | string[] | no | — | Which named vectors to search. Candidate mode only — one search per name, merged by taking each point's best score. |

## Worked example

A query vector goes in and the nearest points come back, best first. What each hit looks like depends on the mode.

Reads: read query. Emits: top-K by similarity.

#### warm collection (term)

Five hits by similarity. A high score means the same concept; a low one means the query is genuinely new.

Reads `Vector` → emits `TermHit[]` · 1 in → 1 out

Input:

```
{
  "vector": [0.0142, -0.0381, 0.0726, ..., 0.0094]
}
```

Output:

```
[
  { "termId": "term_event_concert",      "slug": "concert",      "score": 0.91 },
  { "termId": "term_event_performance",  "slug": "performance",  "score": 0.84 },
  { "termId": "term_event_show",         "slug": "show",         "score": 0.78 },
  { "termId": "term_event_recital",      "slug": "recital",      "score": 0.72 },
  { "termId": "term_event_gig",          "slug": "gig",          "score": 0.69 }
]
```

#### cold start

An empty collection returns an empty list rather than erroring. A later step treats that as no match.

Reads `Vector` → emits `TermHit[]` · 1 in → 1 out

Input:

```
{
  "vector": [0.0142, -0.0381, 0.0726, ..., 0.0094]
}
```

Output:

```
[]
```

#### parent-scoped

The search is restricted to candidates under an already-resolved parent, so only the relevant subtree is offered.

Reads `Vector` → emits `TermHit[]` · 1 in → 1 out

Input:

```
{
  "vector": [0.0142, -0.0381, 0.0726, ..., 0.0094]
}
```

Output:

```
[
  { "termId": "term_type_live-music",    "slug": "live-music",    "score": 0.88 },
  { "termId": "term_type_theatre",       "slug": "theatre",       "score": 0.79 },
  { "termId": "term_type_dance",         "slug": "dance",         "score": 0.74 }
]
```

#### generic hits

In generic mode the stored payload passes through untouched, so a later step projects whatever fields it needs.

Reads `Vector` → emits `GenericHit[]` · 1 in → 1 out

Input:

```
{
  "vector": [0.0142, -0.0381, 0.0726, ..., 0.0094]
}
```

Output:

```
[
  {
    "id":      "8f5c2a90-...-...-...-............",
    "score":   0.88,
    "payload": {
      "userId":         "usr_anton",
      "recordId":       "itm_abc123",
      "snippet":        "Saw the new Spike Lee film last night...",
      "tags":           ["film", "review"],
      "people":         ["spike-lee"],
      "createdAt":      "2026-05-21T19:04:11Z"
    }
  },
  {
    "id":      "4e6a1b02-...-...-...-............",
    "score":   0.74,
    "payload": {
      "userId":         "usr_anton",
      "recordId":       "itm_def456",
      "snippet":        "Watched Do The Right Thing at the rep theatre.",
      "tags":           ["film"],
      "people":         ["spike-lee"],
      "createdAt":      "2026-04-09T22:13:55Z"
    }
  }
]
```

#### a sparse query

A sparse query has to name the vector slot it searches. It mixes with dense search in a hybrid flow.

Reads `SparseVector` → emits `GenericHit[]` · 1 in → 1 out

Input:

```
{
  "indices": [3471, 91204, 142087, 209533],
  "values":  [0.62,  1.18,   0.41,   2.07]
}
```

Output:

```
[
  { "id": "8f5c2a90-...-...-...-............", "score": 12.41, "payload": { "userId": "usr_anton", "recordId": "itm_abc123" } },
  { "id": "4e6a1b02-...-...-...-............", "score":  9.05, "payload": { "userId": "usr_anton", "recordId": "itm_def456" } }
]
```
