<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `term.threshold-gate` — Decide: match or new term

Decide whether a proposed term matches one you have, is new, or needs review.

High scores reuse the matching term, low ones coin a new term, and the rest go to a model.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `candidates + thresholds + proposal` → `GateDecision`
- **Also found as:** reuse or create term, match threshold, new term decision
- **Reads:** Reads the candidate hits, the vocabulary's high/low thresholds, and the proposed slug/label/parent for the create-new case. _(shape hint: `candidates + thresholds + proposal`)_
- **Emits:** A `GateDecision`: either the finished resolution, or a signal that the score landed in the middle and something else has to decide.
- **Suggested input streams:** `candidates`, `thresholds`, `proposalSlug`, `proposalLabel`, `parentTermId`, `vocabularyKey`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `candidates` | union | no | — | The similarity candidates from `term.search`, best first. |
| `parentTermId` | union | no | — | Optional resolved parent term id, for hierarchical vocabularies. |
| `proposalLabel` | union | no | — | The proposed label; empty uses the slug. |
| `proposalSlug` | union | no | — | The slug for a newly created term. |
| `thresholds` | union | no | — | This vocabulary's `highThreshold` and `lowThreshold`. |
| `vocabulary` | union | no | — | Optional vocabulary key, read from the run, stamped onto the decisive `TermResolution.vocabularyKey`. |
| `vocabularyKey` | string | no | — | Which vocabulary this gate resolves; ignored when `vocabulary` is set. ⚠️ Whether the vocabulary exists is checked when the terms are saved, not here. |

### `candidates` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `parentTermId` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `proposalLabel` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `proposalSlug` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `thresholds` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

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
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Compare the top candidate's score against the vocabulary thresholds: reuse, coin, or defer.

#### Clear match

The top candidate is reused as a match on the `type` vocabulary — no LLM call.

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKey": "type",
  "candidates": "candidates.candidates",
  "thresholds": "candidates.thresholds"
}
```

Input:

```
{
  "candidates": [{ "termId": "term-evt", "slug": "event", "score": 0.95 }],
  "thresholds": { "highThreshold": 0.92, "lowThreshold": 0.7 }
}
```

Output:

```
{ "kind": "resolved", "resolution": { "outcome": "match", "vocabularyKey": "type", "termId": "term-evt" } }
```

#### Too close

Neither reuse nor coin is safe, so the tiebreak action decides.

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKey": "type",
  "candidates": "candidates.candidates",
  "thresholds": "candidates.thresholds"
}
```

Input:

```
{
  "candidates": [{ "termId": "term-evt", "slug": "event", "score": 0.81 }],
  "thresholds": { "highThreshold": 0.92, "lowThreshold": 0.7 }
}
```

Output:

```
{ "kind": "tiebreak" }
```
