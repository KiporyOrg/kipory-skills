<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vocabulary.resolve` — Pick terms for a record

Pick the right terms for a record in each vocabulary you choose.

Proposes vocabulary values for a record in one call, then resolves each into a term — reusing one that matches, or minting a new one when the vocabulary allows it. Wire the output into a single `term.upsert` action to save them.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record context` → `TermResolution[]`
- **Reads:** Reads the record context object it proposes vocabulary values from (the configured vocabulary keys drive which vocabularies are resolved). _(shape hint: `record context`)_
- **Emits:** A list of `TermResolution`, one per resolved value. Wire this into exactly one `term.upsert` action to save them.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `contextSlots` | string[] | no | — | Which slots feed the proposal. Each one's value becomes part of the context the model reads. ⚠️ Leave it empty when every vocabulary gets its value from `deterministicSlots`, or when you are only using extraction. |
| `deterministicSlots` | object | no | — | A map of vocabulary to the slot carrying its value. A vocabulary wired here skips the proposal. ⚠️ A vocabulary fed more values than its cap allows goes back to the model, which picks from what you fed it rather than proposing anew. |
| `extractedVocabulariesSlots` | string[] | no | — | Which slots hold vocabulary values an earlier action already extracted. No proposal runs for these — the values are read straight out. |
| `maxValues` | object | no | — | How many values each multi-value vocabulary may resolve. Leave a vocabulary out for no cap. ⚠️ Only applies to vocabularies that accept many values. One that accepts a single value is capped at one already. |
| `model` | string | no | — | The model for the batched proposal call, by catalog id (creator/slug). One per action; defaults to the extraction model. |
| `vocabularyKeys` | string[] | no | — | Which vocabularies this action proposes values for. Every key has to be one the project declares. ⚠️ A key the project does not declare is refused when the action runs. |

## Worked example

Proposes vocabulary values for a record and resolves each into a term, ready to be saved.

#### Two vocabularies

One value matched a term that already exists; the other is new and carries what is needed to create it.

Reads `object` → emits `TermResolution[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKeys": [
    "category",
    "type"
  ],
  "contextSlots": [
    "context"
  ]
}
```

Input:

```
{
  "text": "Costco receipt, groceries, 15 June"
}
```

Output:

```
[
  { "outcome": "match", "vocabularyKey": "category", "termId": "trm_7h2" },
  { "outcome": "create-new", "vocabularyKey": "type", "proposedSlug": "receipt",
    "proposedLabel": "Receipt", "parentTermId": null }
]
```

#### Nothing found

The model proposed no value for any configured vocabulary, so an empty list comes back.

Reads `object` → emits `TermResolution[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "vocabularyKeys": [
    "category",
    "type"
  ],
  "contextSlots": [
    "context"
  ]
}
```

Input:

```
{ "text": "" }
```

Output:

```
[]
```
