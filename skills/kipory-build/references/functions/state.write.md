<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `state.write` — Save a value for later

Save a value for later actions in this run, or add to one.

The value is shared across the whole run, sub-flows included. Only `set` depends on order.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any` → `string`
- **Also found as:** remember for later, keep value, store state, persist value, next run
- **Reads:** Reads one input value and accumulates it into the configured run-state cell. `set` overwrites, `add` sums, `append` builds a list, `union` builds a deduplicated set. _(shape hint: `any`)_
- **Emits:** A marker saying the write happened. Wire it into a later read to put that read after this write.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `key` | string | yes | — | A fixed name for the saved value. |
| `op` | `set` \| `add` \| `append` \| `union` | yes | — | How the value combines: overwrite, sum, append, or add to a set. |

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
