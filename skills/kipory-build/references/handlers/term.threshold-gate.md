<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `term.threshold-gate` — Threshold-gate term resolution

Choose whether a proposed term should match, create, or ask for review based on similarity thresholds.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `candidates + thresholds + proposal` → `GateDecision`
- **Reads:** Reads the candidate hits, the facet's high/low thresholds, and the proposed slug/label/parent for the create-new case. _(shape hint: `candidates + thresholds + proposal`)_
- **Emits:** A `GateDecision`: either the finished resolution, or a signal that the score landed in the middle and something else has to decide.
- **Suggested input streams:** `candidates`, `thresholds`, `proposalSlug`, `proposalLabel`, `parentTermId`, `facet`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `candidatesSlot` | string | no | — | Slot path containing the descending similarity candidates from `vector.search`. |
| `facet` | string | no | — | Which facet this gate resolves. Ignored when `facetSlot` is set. ⚠️ Whether the facet exists is checked when the terms are saved, not here. |
| `facetSlot` | string | no | — | Optional slot path containing the facet to stamp onto the decisive `TermResolution.facet`. |
| `parentTermIdSlot` | string | no | — | Optional slot path containing the resolved parent term id for hierarchical facets. |
| `proposalLabelSlot` | string | no | — | Optional slot path containing the proposed label. Empty/missing falls back to the slug. |
| `proposalSlugSlot` | string | no | — | Slot path containing the proposed slug to use when the gate creates a new term. |
| `thresholdsSlot` | string | no | — | Slot path containing this facet's `{ highThreshold, lowThreshold }`, typically the resolver flow's `params` input (fed the facet's `resolutionParams` by `facet.resolve`). |

## Worked example

Compare the top candidate's score against the facet thresholds: reuse, coin, or defer.

Reads: score vs thresholds. Emits: resolved · or tiebreak.

#### decisive match

Reads `mixed` → emits `object` · 1 in → 1 out

Input:

```
{
  "candidates": [{ "termId": "term-evt", "slug": "event", "score": 0.95 }],
  "thresholds": { "highThreshold": 0.92, "lowThreshold": 0.7 }
}
```

Output:

```
{ "kind": "resolved", "resolution": { "outcome": "match", "facet": "type", "termId": "term-evt" } }
```

#### ambiguous tiebreak

Reads `mixed` → emits `object` · 1 in → 1 out

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
