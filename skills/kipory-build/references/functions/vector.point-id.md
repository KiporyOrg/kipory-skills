<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `vector.point-id` — Make a search data id

Make the stable id a record's search data is stored under.

Turns a record id into the point id its vectors are stored under. The same record id always gives the same point id. A missing or non-string id fails loudly rather than addressing the wrong point.

- **Group:** search · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any` → `string`
- **Reads:** One slot holding a record id. A missing or empty id fails the action rather than inventing a point. _(shape hint: `any`)_
- **Emits:** The point id this record's vectors are stored under. Same record, same id every time, so a re-run overwrites rather than duplicating. Wire it into `vector.upsert` or `vector.fetch`.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `recordIdSlot` | string | yes | — | The slot holding the record id, either a name or a dotted path into an object slot. |

## Worked example

Derives the stable point id a record's vectors are stored under.

#### Always the same

The id is a function of the value, so re-running writes over the same point instead of a second one.

Reads `string` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordIdSlot": "recordId"
}
```

Input:

```
"ckwx0a1b2c3d"
```

Output:

```
"18a9d333-363d-0460-77fa-f08e3f0526e0"
```
