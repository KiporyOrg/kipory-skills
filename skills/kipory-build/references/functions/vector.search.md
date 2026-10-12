<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vector.search` — Search by meaning

Find the stored items closest in meaning to a query.

Query by text, a vector, or a record's own vectors; set only one. An empty collection returns an empty list.

- **Group:** search · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `a hit list, typed by hitShape`
- **Also found as:** semantic search, similar items, nearest neighbours, find similar
- **Reads:** One slot holding the query: a vector from `text.embed` or `text.embed-sparse`, the text to search for, or the id of a record to find neighbours of. _(shape hint: `any+`)_
- **Emits:** `TermHit` (default), `GenericHit`, `CandidateHit` or `RecordHit` per `hitShape`, best first, capped at `topK`. A `RecordHit` holds matched chunks, not the record's text, unless `expand: "record"` merged it.
- **Suggested input streams:** `vector`
- **External dependency:** a model provider — A text query is embedded here, with the model the target collection was built with, before the search runs. A query arriving as a vector spends no model call.
- **Rate limit:** 300 per min in bucket `ai-embed` — shared with `term.search`, `text.embed`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `chunksPerRecord` | integer, 1 to 20 | no | — | How many chunks to return for each record, in record mode. ⚠️ `topK` caps records; this caps chunks within each record. |
| `collection` | string | yes | — | The collection's full `collectionName`, not its short `name`. |
| `expand` | `none` \| `neighbors` \| `record` | no | — | How much context to return around each match, in record mode. ⚠️ `neighbors` adds the chunks either side; `record` returns the whole text once enough matched. |
| `expandMergeThreshold` | integer, at least 1 | no | — | Return a record's whole text once more than this many chunks matched. ⚠️ A one-chunk match never merges; keep this below `chunksPerRecord`. |
| `expandNeighborRadius` | integer, 1 to 5 | no | — | How many chunks either side of a match to include. ⚠️ A large radius reads nearly whole records; record expansion does that in one read. |
| `expandRecordMaxBytes` | integer, 1 to 262144 | no | — | How many bytes of a merged record's text to return. ⚠️ A cut record is marked as truncated on its hit. |
| `expandRecordTextField` | string | no | — | Which record field holds the text to return. ⚠️ Name the original text field, not the embedded form, which is often shortened. |
| `filter` | object | no | — | Payload values a result must match. |
| `filterSlots` | object | no | — | Filter keys mapped to their value slots; terms take `vocabularyKey`, `parentTermId`, `status`. ⚠️ An empty value matches an unset key; a list matches any of its values. |
| `hitShape` | `term` \| `generic` \| `candidate` \| `record` | no | `"term"` | What each hit looks like, and how the search is run. |
| `hybrid` | boolean | no | — | Also search sparse vectors and merge both results, in record mode. ⚠️ Turning this on puts scores on a different scale. |
| `idPayloadField` | string | no | — | Which payload field gives each hit's id; empty uses the point id. ⚠️ Set this to the record-id key when a later action reads the record. |
| `includeTableKeys` | string[], at least 1 item | no | — | Which tables may appear in the results; required in candidate mode. |
| `maxSourceChunks` | integer, 1 to 40 | no | — | How many of the source record's chunks to search with. ⚠️ Cost grows with chunks times vector names; the action warns when the cap bites. |
| `queryRecordIdSlot` | string | no | — | The slot holding a record id to find neighbours of. ⚠️ Uses the record's stored vectors; an unindexed record fails. |
| `queryTextSlot` | string | no | — | The slot holding the query text, in record mode only. ⚠️ The text is embedded with the collection's own model. |
| `queryVectorSlot` | string | no | — | The slot holding the query vector, dense or sparse. |
| `scoreThreshold` | number | no | — | The lowest score a result may have; empty keeps every result. ⚠️ Scores can be negative for a poor match; they are not 0 to 1. |
| `topK` | integer, 1 to 200 | no | `5` | How many results to return, best first; default 5, at most 200. |
| `vectorName` | string | no | — | Which named vector to search; outside `record` mode, empty means the default. ⚠️ Required for a sparse query, and for a text or vector query in `record` mode. |
| `vectorNames` | string[], at least 1 item | no | — | Which named vectors to search, merged by each point's best score. |

### `filter`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `parentTermId` | string \| null | no | — | Keep only candidates under this parent term; `null` searches the roots. |
| `vocabularyKey` | string | no | — | Which vocabulary to search within. |
| `status` | `active` \| `archived` \| `READY` \| null | no | — | Which term statuses to include; `null` includes every status. |

## Worked example

A query vector goes in and the nearest points come back, best first. What each hit looks like depends on the mode.

#### Close matches

Five hits by similarity. A high score means the same concept; a low one means the query is genuinely new.

Reads `Vector` → emits `TermHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "$project.terms",
  "queryVectorSlot": "vector",
  "hitShape": "term",
  "topK": 5,
  "filter": {
    "vocabularyKey": "event",
    "status": "active"
  }
}
```

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

#### Empty collection

An empty collection returns an empty list rather than erroring. A later action treats that as no match.

Reads `Vector` → emits `TermHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "$project.terms",
  "queryVectorSlot": "vector",
  "hitShape": "term",
  "topK": 5,
  "filter": {
    "vocabularyKey": "mood",
    "status": "active"
  }
}
```

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

#### Within one parent

The search is restricted to candidates under an already-resolved parent, so only the relevant subtree is offered.

Reads `Vector` → emits `TermHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "$project.terms",
  "queryVectorSlot": "vector",
  "hitShape": "term",
  "topK": 5,
  "filter": {
    "vocabularyKey": "type",
    "status": "active",
    "parentTermId": "term_category_event"
  }
}
```

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

#### Raw stored data

In generic mode the stored payload passes through untouched, so a later action projects whatever fields it needs.

Reads `Vector` → emits `GenericHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "notes",
  "queryVectorSlot": "vector",
  "hitShape": "generic",
  "vectorName": "vec.content",
  "topK": 2
}
```

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

#### Keyword query

A sparse query has to name the vector slot it searches. It mixes with dense search in a hybrid flow.

Reads `SparseVector` → emits `GenericHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "notes",
  "queryVectorSlot": "vector",
  "hitShape": "generic",
  "vectorName": "vec.bm25",
  "topK": 2
}
```

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
