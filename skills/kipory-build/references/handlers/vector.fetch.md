<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `vector.fetch` — Read stored vectors

Read the stored named vectors for a point ID.

- **Group:** Search · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `Record<string, number[]>`
- **Reads:** One input slot, read via `freeFormInput` from the `pointIdSlot` config path: the point id to retrieve. _(shape hint: `string`)_
- **Emits:** An object keyed by vector name. A name the point does not carry is left out, so the result mirrors what is actually stored.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `collection` | string | yes | — | Target collection to read the point from. The collection must exist; a missing one surfaces as VECTOR_FETCH_QDRANT_ERROR. |
| `pointIdSlot` | string | yes | — | The slot holding the point id to read. Usually the output of a step that derives it from a record id. |
| `requiredVectorNames` | string[] | no | `[]` | Which of the names above must be there. A missing one fails the step instead of returning a half-empty result. |
| `vectorNames` | string[] | yes | — | Which stored vectors to read back. A name the point does not carry is simply left out of the result. |

## Worked example

Reads the stored vectors for one point back out of the vector store.

Reads: the point id. Emits: vectors by name.

#### two named vectors

The point carries both, so both come back keyed by name.

Reads `string` → emits `Record<string, number[]>` · 1 in → 1 out

Input:

```
"ckwx0a1b2c3d"
```

Output:

```
{
  "vec.content": [0.021, -0.114, 0.087],
  "vec.user-language": [0.004, 0.092, -0.031]
}
```

#### one of them missing

The point never carried that vector, so it is left out rather than returned empty.

Reads `string` → emits `Record<string, number[]>` · 1 in → 1 out

Input:

```
"ckwx_older"
```

Output:

```
{
  "vec.content": [0.018, -0.201, 0.044]
}
```
