<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `term.upsert` — Upsert terms

Persist resolved terms, their record assignments, and their vectors.

- **Group:** Entities · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `1` → `nothing`
- **Reads:** One slot, named by `resolutionsSlot`, holding the resolved terms to save — usually what `facet.resolve` emitted. An empty one saves nothing and succeeds. _(shape hint: `1`)_
- **Emits:** Nothing. The step writes to the database and leaves no slot behind. Running it twice with the same input changes nothing the first run did not.
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 30000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `resolutionsSlot` | string | yes | — | The slot holding the resolved terms to save. Usually the output of a `facet.resolve` step. ⚠️ An empty or absent bundle saves nothing and still succeeds. Writes only happen on a committing run; a preview skips them all. |

## Worked example

Saves a bundle of resolved terms and links them to the record. Nothing comes back.

Reads: resolved terms. Emits: nothing.

#### one match, one new

The matched term is reused and the new one is created and embedded. The step writes no slot.

Reads `TermResolution[]` → emits `nothing` · 1 in → (empty)

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

#### an empty bundle

Nothing was resolved, so nothing is written and the step still succeeds.

Reads `TermResolution[]` → emits `nothing` · 1 in → (empty)

Input:

```
[]
```

Output:

```

```
