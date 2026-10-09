<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `state.write` — Save a value for later

Save a value for later actions in this run, or add to one.

The cell is shared across the whole run, sub-flows included, so two branches writing one name contend for it. That is why only `set` depends on order. It emits a marker, so a later read can be ordered after this write.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any` → `string`
- **Reads:** Reads one input value and accumulates it into the configured run-state cell. `set` overwrites, `add` sums, `append` builds a list, `union` builds a deduplicated set. _(shape hint: `any`)_
- **Emits:** A marker saying the write happened. Wire it into a later read to put that read after this write.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `key` | string | yes | — | Which cell to write. A fixed name chosen here, not a slot reference and not computed while running. |
| `op` | `set` \| `add` \| `append` \| `union` | yes | — | How the value combines into the cell: overwrite, sum, append to a list, or add to a set. |

## Worked example

Accumulates a value into a run-state cell that a later action can read.

#### Keep unique values

The value joins the cell without repeating what is already there, because the mode is union.

Reads `any` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "key": "seenUrls",
  "op": "union"
}
```

Input:

```
"https://example.com/b"
```

Output:

```
ok
```

#### Replace the value

The mode is set, so the cell now holds this value alone and whatever was there is gone.

Reads `any` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "key": "nextPage",
  "op": "set"
}
```

Input:

```
"page-3"
```

Output:

```
ok
```
