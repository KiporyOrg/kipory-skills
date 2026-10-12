<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vocabulary.resolve` — Pick terms for a record

Pick the right terms for a record in each vocabulary you choose.

Reuses a matching term or coins a new one when allowed. Wire the output into one `term.upsert` action.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record context` → `TermResolution[]`
- **Also found as:** tag, auto tag, categorise record, assign terms
- **Reads:** Reads the record context object it proposes vocabulary values from (the configured vocabulary keys drive which vocabularies are resolved). _(shape hint: `record context`)_
- **Emits:** A list of `TermResolution`, one per resolved value. Wire this into exactly one `term.upsert` action to save them.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `contextSlots` | string[] | no | — | Which slots the model reads to make its proposal. ⚠️ Leave it empty when every vocabulary gets its value from `deterministicSlots`, or when you are only using extraction. |
| `deterministicSlots` | object | no | — | Vocabularies mapped to slots carrying their values, which skip the proposal. ⚠️ Values past a vocabulary's cap go back to the model, which picks from them. |
| `extractedVocabulariesSlots` | string[] | no | — | Slots holding vocabulary values already extracted; they are read, not proposed. |
| `maxValues` | object | no | — | Most values per multi-value vocabulary; leave one out for no cap. ⚠️ Only applies to vocabularies that accept many values. |
| `model` | string | no | — | The proposal model by catalog id; default is the extraction model. |
| `vocabularyKeys` | string[] | no | — | Which of the project's vocabularies to propose values for. ⚠️ A key the project does not declare is refused when the action runs. |

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
