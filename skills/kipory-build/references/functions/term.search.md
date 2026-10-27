<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `term.search` — Search terms by meaning

Find the terms of a vocabulary closest in meaning to a phrase.

Results come best first, each with a similarity score. Use it to check for a term before coining one.

- **Group:** search · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `phrase + vocabulary` → `TermHit[]`
- **Also found as:** similar terms, find term, synonym, closest tag
- **Reads:** Reads the phrase from `text`, and the vocabulary and a parent term from `vocabulary` and `parentTermId` when those are set. _(shape hint: `phrase + vocabulary`)_
- **Emits:** A list of `TermHit`, best first, at most `topK`: each term's id, slug and closeness. Empty when the phrase is empty or the vocabulary has no terms.
- **Suggested input streams:** `text`, `vocabulary`, `parentTermId`
- **Rate limit:** 300 per min in bucket `ai-embed`, counted per project — shared with `record.query`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `minScore` | number, -1 to 1 | no | — | Leave out terms scoring below this; it may be negative. |
| `parentTermId` | union | no | — | A parent term's id, to search only under it. |
| `status` | `active` \| `archived` \| `candidate` \| `any` | no | — | Which terms to read by status; `any` reads every status. |
| `text` | union | yes | — | The phrase to search; empty finds nothing. |
| `topK` | integer, 1 to 200 | no | `5` | How many terms come back, 1 to 200; default 5. |
| `vocabulary` | union | no | — | The vocabulary's key, read from the run, in place of `vocabularyKey`. |
| `vocabularyKey` | string | no | — | Which vocabulary to search; give this or `vocabulary`, not both. |

### `parentTermId` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `text` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `vocabulary` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

A phrase goes in and the nearest terms of one vocabulary come back, best first.

#### A near match

The first term scores high: the phrase means what that term means.

Reads `string` → emits `TermHit[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKey": "category",
  "text": "text",
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
  "text": "text",
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
