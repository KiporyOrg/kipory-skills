<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `state.read` — Read run state

Read a named run-scoped state cell into a slot.

- **Group:** Flow · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `none` → `string`
- **Reads:** No slots. It returns whatever the named cell holds, or empty if nothing has written it. _(shape hint: `none`)_
- **Emits:** The current value of a named run-state cell, materialized into this skill's output slot (a string for set/add cells, a list for append/union cells).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `key` | string | yes | — | The run-state cell name to read. A fixed literal; its value is surfaced into this skill's output slot for downstream skills. |

## Worked example

Reads a run-state cell that an earlier step wrote.

Reads: nothing. Emits: the stored value.

#### a value is there

The cell was written earlier in this run, so its current value comes back.

Reads `none` → emits `string[]` · 1 in → 1 out

Input:

```
{ "cell": "seenUrls" }
```

Output:

```
["https://example.com/a", "https://example.com/b"]
```

#### never written

No step has written this cell in this run, so the empty value comes back.

Reads `none` → emits `string[]` · 1 in → 1 out

Input:

```
{ "cell": "seenUrls" }
```

Output:

```
[]
```
