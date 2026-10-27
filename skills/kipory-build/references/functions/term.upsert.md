<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `term.upsert` — Save terms

Save resolved terms and link them to their records.

Matches existing terms, creates the rest and indexes them for search. A preview run writes nothing.

- **Group:** records · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `TermResolution[]` → `nothing`
- **Also found as:** store terms, add tags, create terms
- **Reads:** The resolved terms to save, from `resolutions` — usually what `vocabulary.resolve` emitted. An empty list saves nothing and succeeds. _(shape hint: `TermResolution[]`)_
- **Emits:** Nothing — the terms are saved. Leave `outputSlot` out: a named one is refused, and no later action can wait for this one. A repeat changes nothing.
- **Softens these failures:** `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Queue:** 3 attempts, exponential from 2 s; waits up to 30 s; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `resolutions` | union | yes | — | The resolved terms to save, usually from `vocabulary.resolve`. ⚠️ An empty bundle saves nothing and still succeeds; a preview writes nothing. |

### `resolutions` — one of

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

Saves a bundle of resolved terms and links them to the record. Nothing comes back.

#### One new term

The matched term is reused and the new one is created and embedded. The action writes no slot.

Reads `TermResolution[]` → emits `nothing` · 1 in → (empty)

Action settings (`functionConfig`):

```json
{
  "resolutions": "termResolutions"
}
```

Input:

```
[
  { "outcome": "match", "vocabularyKey": "category", "termId": "trm_7h2" },
  { "outcome": "create-new", "vocabularyKey": "type", "proposedSlug": "receipt",
    "proposedLabel": "Receipt", "parentTermId": null }
]
```

Output:

```

```

#### Nothing to save

Nothing was resolved, so nothing is written and the action still succeeds.

Reads `TermResolution[]` → emits `nothing` · 1 in → (empty)

Action settings (`functionConfig`):

```json
{
  "resolutions": "termResolutions"
}
```

Input:

```
[]
```

Output:

```

```
