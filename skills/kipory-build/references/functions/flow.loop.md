<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.loop` — Start a loop

Start a loop that repeats the actions inside it.

Opens a loop with a capped number of rounds. The actions between this and its `flow.loop-end` repeat until the stop condition holds or the cap is reached. Each round reads the carry slot, which is this action's output and is seeded for the first round.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the starting values` → `string`
- **Reads:** The slots that seed the first pass. The stop condition and the feedback wiring live on the paired closing action. _(shape hint: `the starting values`)_
- **Emits:** The carry slot for this pass — the seed on the first one, and whatever the closing action rebound after that.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxIterations` | integer, 1 to 50 | no | `10` | The most passes the loop may make: a safety stop, not the way to end it. The deployment sets the highest value it accepts. |
| `onMaxIterations` | `fail` \| `proceed` | no | `"fail"` | What to do when the cap is reached and the stop condition still has not held. |
| `seedFrom` | object | no | `{}` | Where each carry slot gets its first value from. A carry slot is seeded by this or by a literal, not both. |
| `seedLiteral` | object | no | `{}` | Iteration-0 seed: maps each carry slot (key) to a fixed literal string starting value. Mutually exclusive per slot with seedFrom. |

## Worked example

Opens a region that repeats. Each pass reads the carry slot, until the closing action's condition holds or the cap is reached.

#### Example

Reads `carry` → emits `carry` · one pass

Action settings (`functionConfig`):

```json
{
  "seedFrom": {
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
