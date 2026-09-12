<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `flow.loop` — Loop (start)

Start a bounded loop that repeats the enclosed steps.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **I/O:** `seed` → `string`
- **Reads:** The slots that seed the first pass. The stop condition and the feedback wiring live on the paired closing step. _(shape hint: `seed`)_
- **Emits:** The carry slot for this pass — the seed on the first one, and whatever the closing step rebound after that.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxIterations` | integer | no | `10` | Hard iteration cap (safety backstop, not the control mechanism). Bounded by KIPORY_SYSTEM_MAX_LOOP_ITERATIONS; re-checked at runtime in walkLoop. |
| `onMaxIterations` | `fail` \| `proceed` | no | `"fail"` | What to do when the cap is reached and the stop condition still has not held. |
| `seedFrom` | object | no | `{}` | Where each carry slot gets its first value from. A carry slot is seeded by this or by a literal, not both. |
| `seedLiteral` | object | no | `{}` | Iteration-0 seed: maps each carry slot (key) to a fixed literal string starting value. Mutually exclusive per slot with seedFrom. |

## Worked example

Opens a region that repeats. Each pass reads the carry slot, until the closing step's condition holds or the cap is reached.

Reads: seed carry. Emits: carry (per iteration).

#### Example

Reads `carry` → emits `carry` · one pass

Input:

- {"index":0,"value":"seed carry","detail":"read at the top of every pass"}

Each pass:

- {"index":0,"value":"carry (per iteration)"}
