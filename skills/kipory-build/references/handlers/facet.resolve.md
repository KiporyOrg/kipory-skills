<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `facet.resolve` — Resolve facets

Propose and resolve a set of facets for a record in one node, emitting term resolutions.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `record context` → `TermResolution[]`
- **Reads:** Reads the record context object it proposes facet values from (the configured facet keys drive which facets are resolved). _(shape hint: `record context`)_
- **Emits:** A list of `TermResolution`, one per resolved value. Wire this into exactly one `term.upsert` step to save them.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `contextSlots` | string[] | no | — | Which slots feed the proposal. Each one's value becomes part of the context the model reads. ⚠️ Leave it empty when every facet gets its value from `deterministicSlots`, or when you are only using extraction. |
| `deterministicSlots` | object | no | — | A map of facet to the slot carrying its value. A facet wired here skips the proposal. ⚠️ A facet fed more values than its cap allows goes back to the model, which picks from what you fed it rather than proposing anew. |
| `extractedFacetsSlots` | string[] | no | — | Which slots hold facet values an earlier step already extracted. No proposal runs for these — the values are read straight out. |
| `facetKeys` | string[] | no | — | Which facets this step proposes values for. Every key has to be one the project declares. ⚠️ A key the project does not declare is refused when the step runs. |
| `maxValues` | object | no | — | How many values each multi-value facet may resolve. Leave a facet out for no cap. ⚠️ Only applies to facets that accept many values. One that accepts a single value is capped at one already. |
| `model` | string | no | — | Optional model id for the batched proposal LLM call. Node-level (never per-facet); falls back to the extraction-task default model. |

## Worked example

Proposes facet values for a record and resolves each into a term, ready to be saved.

Reads: the record context. Emits: TermResolution[].

#### two facets

One value matched a term that already exists; the other is new and carries what is needed to create it.

Reads `object` → emits `TermResolution[]` · 1 in → 1 out

Input:

```
{
  "text": "Costco receipt, groceries, 15 June"
}
```

Output:

```
[
  { "outcome": "match", "facet": "category", "termId": "trm_7h2" },
  { "outcome": "create-new", "facet": "type", "proposedSlug": "receipt",
    "proposedLabel": "Receipt", "parentTermId": null }
]
```

#### nothing to resolve

The model proposed no value for any configured facet, so an empty list comes back.

Reads `object` → emits `TermResolution[]` · 1 in → 1 out

Input:

```
{ "text": "" }
```

Output:

```
[]
```
