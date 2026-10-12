<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vector.fetch` — Read stored search data

Read the stored meaning numbers for an item.

Returns an object keyed by vector name. Names the point lacks are left out, not set to null.

- **Group:** search · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `Record<string, number[]>`
- **Also found as:** stored vectors, read embedding, vector by id
- **Reads:** One input slot, read via `freeFormInput` from the `pointIdSlot` config path: the point id to retrieve. _(shape hint: `string`)_
- **Emits:** An object keyed by vector name. A name the point does not carry is left out, so the result mirrors what is actually stored.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `collection` | string | yes | — | The collection to read from; it must exist. |
| `pointIdSlot` | string | yes | — | The slot holding the point id to read. |
| `requiredVectorNames` | string[] | no | `[]` | Names that must be present, or the action fails. |
| `vectorNames` | string[], at least 1 item | yes | — | Which stored vectors to read back; missing ones are left out. |

## Worked example

Reads the stored vectors for one point back out of the vector store.

#### Both found

The point carries both, so both come back keyed by name.

Reads `string` → emits `Record<string, number[]>` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "notes",
  "pointIdSlot": "pointId",
  "vectorNames": [
    "vec.content",
    "vec.user-language"
  ]
}
```

Input:

```
"18a9d333-363d-0460-77fa-f08e3f0526e0"
```

Output:

```
{
  "vec.content": [0.021, -0.114, 0.087],
  "vec.user-language": [0.004, 0.092, -0.031]
}
```

#### One missing

The point never carried that vector, so it is left out rather than returned empty.

Reads `string` → emits `Record<string, number[]>` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "collection": "notes",
  "pointIdSlot": "pointId",
  "vectorNames": [
    "vec.content",
    "vec.user-language"
  ]
}
```

Input:

```
"c9f6c59b-0330-2ccc-0644-68f98209a983"
```

Output:

```
{
  "vec.content": [0.018, -0.201, 0.044]
}
```
