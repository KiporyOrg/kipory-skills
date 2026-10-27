<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.loop` — Start a loop

Start a loop that repeats the actions inside it.

Actions up to its `flow.loop-end` repeat until the stop condition holds or the cap is reached.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the starting values` → `string`
- **Also found as:** repeat, while, until, retry until
- **Reads:** The slots that seed the first pass. The stop condition and the feedback wiring live on the paired closing action. _(shape hint: `the starting values`)_
- **Emits:** The carry slot for this pass — the seed on the first one, and whatever the closing action rebound after that.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxIterations` | integer, 1 to 10000 | no | `10` | The most passes the loop may make, as a safety stop. |
| `onMaxIterations` | `fail` \| `proceed` | no | `"fail"` | What to do if the cap is reached before the stop condition. |
| `seed` | object | no | `{}` | Each carry slot's first value: a slot path, fixed value or expression. |

## Worked example

Opens a region that repeats. Each pass reads the carry slot, until the closing action's condition holds or the cap is reached.

#### Example

Reads `carry` → emits `carry` · one pass

Action settings (`functionConfig`):

```json
{
  "seed": {
    "draft": "firstDraft"
  },
  "maxIterations": 5,
  "onMaxIterations": "proceed"
}
```

Input:

- the starting values — read on every pass

Each pass:

- the carry slot, each pass
