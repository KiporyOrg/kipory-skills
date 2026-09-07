<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `vector.point-id` — Derive a vector point id

Derive the deterministic point id a record's vectors are stored under.

- **Group:** Search · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any` → `string`
- **Reads:** One slot holding a record id. A missing or empty id fails the step rather than inventing a point. _(shape hint: `any`)_
- **Emits:** The point id this record's vectors are stored under. Same record, same id every time, so a re-run overwrites rather than duplicating. Wire it into `vector.upsert` or `vector.fetch`.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `recordIdSlot` | string | yes | — | The slot holding the record id, either a name or a dotted path into an object slot. |

## Worked example

Derives the stable point id a value will be stored under.

Reads: a value. Emits: the point id.

#### the same input, the same id

The id is a function of the value, so re-running writes over the same point instead of a second one.

Reads `any` → emits `string` · 1 in → 1 out

Input:

```
"ckwx0a1b2c3d"
```

Output:

```
"18a9d333-363d-0460-77fa-f08e3f0526e0"
```
