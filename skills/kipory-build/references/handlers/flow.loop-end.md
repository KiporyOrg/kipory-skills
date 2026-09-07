<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `flow.loop-end` — Loop (end)

End a loop, check its stop condition, and expose the final result.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **I/O:** `body outputs` → `nothing`
- **Reads:** The slots the stop condition looks at, and the ones fed back as the next pass's carry. _(shape hint: `body outputs`)_
- **Emits:** The loop's result, plus anything named as escaping it. Everything else inside the loop is discarded when the region closes.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `carryMap` | object | no | `{}` | Which body output becomes which carry slot on the next pass. |
| `escapeSlots` | object | no | `{}` | Which slots survive the loop, and under what name outside it. Everything else inside is discarded when the region closes. |
| `outputSlot` | string | yes | — | The post-loop aggregate result slot in the parent scope. Mirrors Skill.outputSlot; the save action writes both. |
| `until` | object | yes | — | When to stop. It is checked after each pass, against what that pass produced. |

## Worked example

Closes the loop. After each pass it checks the stop condition, and otherwise feeds the outputs back in and goes again.

Reads: body outputs. Emits: loop result.

#### Example

Reads `carry` → emits `carry` · one pass

Input:

- {"index":0,"value":"body outputs","detail":"read at the top of every pass"}

Each pass:

- {"index":0,"value":"loop result"}
