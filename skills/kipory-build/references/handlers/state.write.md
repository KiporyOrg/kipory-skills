<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `state.write` — Write run state

Write or accumulate a value into a named run-scoped state cell.

- **Group:** Flow · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any` → `string`
- **Reads:** Reads one input value and accumulates it into the configured run-state cell. `set` overwrites, `add` sums, `append` builds a list, `union` builds a deduplicated set. _(shape hint: `any`)_
- **Emits:** A marker saying the write happened. Wire it into a later read to put that read after this write.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `key` | string | yes | — | Which cell to write. A fixed name chosen here, not a slot reference and not computed while running. |
| `op` | `set` \| `add` \| `append` \| `union` | yes | — | How the value combines into the cell: overwrite, sum, append to a list, or add to a set. |

## Worked example

Accumulates a value into a run-state cell that a later step can read.

Reads: the value. Emits: a marker.

#### adding to a set

The value joins the cell without repeating what is already there, because the mode is union.

Reads `any` → emits `string` · 1 in → 1 out

Input:

```
"https://example.com/b"
```

Output:

```
ok
```

#### overwriting

The mode is set, so the cell now holds this value alone and whatever was there is gone.

Reads `any` → emits `string` · 1 in → 1 out

Input:

```
"page-3"
```

Output:

```
ok
```
