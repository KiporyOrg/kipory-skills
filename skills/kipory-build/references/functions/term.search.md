<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `term.search` — Search terms by meaning

Find the terms of a vocabulary closest in meaning to a phrase.

Returns the terms of one vocabulary closest in meaning to a phrase, best first, each with a similarity score. Use it to check whether a value already has a term before coining one, or to offer the nearest terms for a typed phrase.

- **Group:** search · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `phrase + vocabulary` → `TermHit[]`
- **Reads:** Reads the phrase from `textSlot`, and the vocabulary and a parent term from their slots when those are set. _(shape hint: `phrase + vocabulary`)_
- **Emits:** A list of `TermHit`, best first, at most `topK`: each term's id, slug and closeness. Empty when the phrase is empty or the vocabulary has no terms.
- **Suggested input streams:** `text`, `vocabulary`, `parentTermId`
- **Rate limit:** 300 per min in bucket `ai-embed` — shared with `text.embed`, `vector.search`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `minScore` | number, -1 to 1 | no | — | Leave out terms whose similarity score is below this. A poor match scores below zero, so a negative value is allowed. |
| `parentTermIdSlot` | string | no | — | The slot holding a parent term's id, to search only under it. Set and empty, it reads top-level terms; left out, every level. |
| `status` | `active` \| `archived` \| `candidate` \| `any` | no | — | Which terms to read by status. Left out: active terms, plus candidates when the vocabulary coins them. `any`: every status. |
| `textSlot` | string | yes | — | The slot holding the phrase to search for. An empty phrase answers no terms and calls no model. |
| `topK` | integer, 1 to 200 | no | `5` | How many terms come back at most, best first: 1 to 200. Default 5. |
| `vocabularyKey` | string | no | — | Which vocabulary's terms to search. Give this or `vocabularySlot`, not both. |
| `vocabularySlot` | string | no | — | The slot holding the vocabulary's key, in place of `vocabularyKey`. |

## Worked example

A phrase goes in and the nearest terms of one vocabulary come back, best first.

#### A near match

The first term scores high: the phrase means what that term means.

Reads `string` → emits `TermHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKey": "category",
  "textSlot": "text",
  "topK": 3
}
```

Input:

```
{
  "text": "brolly"
}
```

Output:

```
[
  { "termId": "term_category_umbrella", "slug": "umbrella", "score": 0.86 },
  { "termId": "term_category_raincoat", "slug": "raincoat", "score": 0.52 },
  { "termId": "term_category_parasol",  "slug": "parasol",  "score": 0.49 }
]
```

#### Nothing close

With a minimum score set, a phrase no term resembles answers an empty list: the value is new.

Reads `string` → emits `TermHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKey": "category",
  "textSlot": "text",
  "minScore": 0.6
}
```

Input:

```
{
  "text": "snowboard"
}
```

Output:

```
[]
```
