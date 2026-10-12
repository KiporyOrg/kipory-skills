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
| `candidatesSlot` | string | no | — | Slot path containing the descending similarity candidates from `vector.search`. |
| `parentTermIdSlot` | string | no | — | Optional slot path containing the resolved parent term id for hierarchical vocabularies. |
| `proposalLabelSlot` | string | no | — | The slot holding the proposed label; empty uses the slug. |
| `proposalSlugSlot` | string | no | — | The slot holding the slug for a newly created term. |
| `thresholdsSlot` | string | no | — | The slot holding this vocabulary's `highThreshold` and `lowThreshold`. |
| `vocabularyKey` | string | no | — | Which vocabulary this gate resolves; ignored when `vocabularySlot` is set. ⚠️ Whether the vocabulary exists is checked when the terms are saved, not here. |
| `vocabularySlot` | string | no | — | Optional slot path containing the vocabulary to stamp onto the decisive `TermResolution.vocabularyKey`. |

## Worked example

Compare the top candidate's score against the vocabulary thresholds: reuse, coin, or defer.

#### Clear match

The top candidate is reused as a match on the `type` vocabulary — no LLM call.

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKey": "type",
  "candidatesSlot": "candidates.candidates",
  "thresholdsSlot": "candidates.thresholds"
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
  "candidatesSlot": "candidates.candidates",
  "thresholdsSlot": "candidates.thresholds"
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
