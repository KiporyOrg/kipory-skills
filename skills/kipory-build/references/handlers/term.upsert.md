<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `term.upsert` — Save terms

Save resolved terms and link them to their records.

- **Group:** entities · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `TermResolution[]` → `nothing`
- **Reads:** One slot, named by `resolutionsSlot`, holding the resolved terms to save — usually what `facet.resolve` emitted. An empty one saves nothing and succeeds. _(shape hint: `TermResolution[]`)_
- **Emits:** Nothing a later step reads: it saves, leaving an empty marker in its slot. It still needs an `outputSlot`: any unused slot. A repeat with the same input changes nothing.
- **Queue:** 3 attempts, exponential from 2 s; waits up to 30 s; cache no expiry — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `resolutionsSlot` | string | yes | — | The slot holding the resolved terms to save. Usually the output of a `facet.resolve` step. ⚠️ An empty or absent bundle saves nothing and still succeeds. Writes only happen on a committing run; a preview skips them all. |

## Worked example

Saves a bundle of resolved terms and links them to the record. Nothing comes back.

#### One new term

The matched term is reused and the new one is created and embedded. The step writes no slot.

Reads `TermResolution[]` → emits `nothing` · 1 in → (empty)

Step settings (`handlerConfig`):

```json
{
  "resolutionsSlot": "termResolutions"
}
```

Input:

```
[
  { "outcome": "match", "facet": "category", "termId": "trm_7h2" },
  { "outcome": "create-new", "facet": "type", "proposedSlug": "receipt",
    "proposedLabel": "Receipt", "parentTermId": null }
]
```

Output:

```

```

#### Nothing to save

Nothing was resolved, so nothing is written and the step still succeeds.

Reads `TermResolution[]` → emits `nothing` · 1 in → (empty)

Step settings (`handlerConfig`):

```json
{
  "resolutionsSlot": "termResolutions"
}
```

Input:

```
[]
```

Output:

```

```
