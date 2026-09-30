<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.loop-end` — End a loop

End a loop: stop when the condition holds, or go round again.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `body outputs` → `nothing`
- **Reads:** The slots the stop condition looks at, and the ones fed back as the next pass's carry. _(shape hint: `body outputs`)_
- **Emits:** The loop's result, plus anything named as escaping it. Everything else inside the loop is discarded when the region closes.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `carryMap` | object | no | `{}` | Which body output becomes which carry slot on the next pass. |
| `escapeSlots` | object | no | `{}` | Which slots survive the loop, and under what name outside it. Everything else inside is discarded when the region closes. |
| `outputSlot` | string | yes | — | The post-loop aggregate result slot in the parent scope. Mirrors Skill.outputSlot; the save action writes both. |
| `until` | union | yes | — | When to stop. It is checked after each pass, against what that pass produced. |

### `until` — one of

**`op: slotEquals`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotEquals` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `value` | string \| number \| boolean | yes | — |  |

**`op: slotIn`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotIn` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `values` | (string \| number \| boolean)[] | yes | — |  |

**`op: slotPresent`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotPresent` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |

**`op: slotMatches`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotMatches` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `pattern` | string | yes | — |  |

**`op: slotStartsWith`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotStartsWith` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `prefix` | string | yes | — |  |

**`op: slotContains`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotContains` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `text` | string | yes | — |  |

**`op: listEmpty`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `listEmpty` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |

**`op: slotGt`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotGt` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | yes | — |  |
| `value` | number | yes | — |  |

**`op: slotLt`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotLt` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | yes | — |  |
| `value` | number | yes | — |  |

**`op: slotGte`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotGte` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | yes | — |  |
| `value` | number | yes | — |  |

**`op: slotLte`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotLte` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | yes | — |  |
| `value` | number | yes | — |  |

**`op: slotAfter`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotAfter` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `value` | string | yes | — |  |

**`op: slotBefore`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotBefore` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | no | — |  |
| `value` | string | yes | — |  |

**`op: slotIsTruthy`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotIsTruthy` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | yes | — |  |

**`op: slotIsFalsy`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotIsFalsy` | yes | — |  |
| `slot` | string | yes | — |  |
| `path` | string | yes | — |  |

**`op: not`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `not` | yes | — |  |
| `inner` | object | yes | — |  |

**`op: and`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `and` | yes | — |  |
| `all` | any[] | yes | — |  |

**`op: or`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `or` | yes | — |  |
| `any` | any[] | yes | — |  |

## Worked example

Closes the loop. After each pass it checks the stop condition, and otherwise feeds the outputs back in and goes again.

Reads: body outputs. Emits: loop result.

#### Example

Reads `carry` → emits `carry` · one pass

Input:

- {"index":0,"value":"body outputs","detail":"read at the top of every pass"}

Each pass:

- {"index":0,"value":"loop result"}
