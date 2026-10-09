<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.loop-end` — End a loop

End a loop: stop when the condition holds, or go round again.

Closes a `flow.loop`. After each round it checks the stop condition; if it does not hold and the cap allows, its outputs become the next round's carry slots. Afterwards the flow sees the escape slots and the output slot, which holds the last carried value.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the loop's own slots` → `nothing`
- **Reads:** The slots the stop condition looks at, and the ones fed back as the next pass's carry. _(shape hint: `the loop's own slots`)_
- **Emits:** The loop's result, plus anything named as escaping it. Everything else inside the loop is discarded when the region closes.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `carryMap` | object | no | `{}` | As `{ bodySlot: carrySlot }`: after each pass, the body slot's value becomes that carry slot (the one the opener seeds) for the next pass. ⚠️ Every key must be a slot an action inside the loop writes — any other key is refused (`LOOP_CARRY_REFERENCES_UNKNOWN_SLOT`). |
| `escapeSlots` | object | no | `{}` | Which slots outlive the loop, as `{ innerSlot: outerSlot }`: each inner slot's last-pass value is published under the outer name. ⚠️ Everything else inside the loop is discarded when the region closes: a slot not listed here is gone for every later action. |
| `outputSlot` | string | yes | — | The outside-the-loop slot receiving the last pass's value of the FIRST `carryMap` key. Mirrors the action's `outputSlot`; the save writes both. |
| `until` | union | yes | — | When to stop. It is checked after each pass, against what that pass produced. |

### `until` — one of

**`op: slotEquals`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotEquals` | yes | — | Holds when the value equals `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `value` | string \| number \| boolean | yes | — | The value to equal. |

**`op: slotIn`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotIn` | yes | — | Holds when the value equals one of `values`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `values` | (string \| number \| boolean)[], at least 1 item | yes | — | The accepted values, at least one. |

**`op: slotPresent`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotPresent` | yes | — | Holds when the slot, or the field at `path`, has a value. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |

**`op: slotMatches`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotMatches` | yes | — | Holds when the text matches the regular expression. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `pattern` | string | yes | — | A JavaScript regular expression. |

**`op: slotStartsWith`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotStartsWith` | yes | — | Holds when the text starts with `prefix`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `prefix` | string | yes | — | The text the value must start with. |

**`op: slotContains`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotContains` | yes | — | Holds when the text contains `text`, case-sensitive. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `text` | string | yes | — | The text the value must contain. |

**`op: listEmpty`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `listEmpty` | yes | — | Holds when the list has no items. A missing value counts as empty. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |

**`op: slotGt`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotGt` | yes | — | Holds when the field is greater than `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | yes | — | A dotted path to the field of the slot's value that is tested. |
| `value` | number | yes | — | The number the field is compared with. |

**`op: slotLt`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotLt` | yes | — | Holds when the field is less than `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | yes | — | A dotted path to the field of the slot's value that is tested. |
| `value` | number | yes | — | The number the field is compared with. |

**`op: slotGte`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotGte` | yes | — | Holds when the field is greater than or equal to `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | yes | — | A dotted path to the field of the slot's value that is tested. |
| `value` | number | yes | — | The number the field is compared with. |

**`op: slotLte`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotLte` | yes | — | Holds when the field is less than or equal to `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | yes | — | A dotted path to the field of the slot's value that is tested. |
| `value` | number | yes | — | The number the field is compared with. |

**`op: slotAfter`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotAfter` | yes | — | Holds when the value is an instant later than `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `value` | string | yes | — | A date and time with an offset, such as `2026-09-07T12:00:00Z`. |

**`op: slotBefore`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotBefore` | yes | — | Holds when the value is an instant earlier than `value`. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | no | — | A dotted path to one field of the slot's value. Leave it out to test the whole value. |
| `value` | string | yes | — | A date and time with an offset, such as `2026-09-07T12:00:00Z`. |

**`op: slotIsTruthy`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotIsTruthy` | yes | — | Holds when the field is truthy: not empty, zero, false or null. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | yes | — | A dotted path to the field of the slot's value that is tested. |

**`op: slotIsFalsy`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `slotIsFalsy` | yes | — | Holds when the field is falsy: empty, zero, false, null or missing. |
| `slot` | string | yes | — | The slot whose value is tested. |
| `path` | string | yes | — | A dotted path to the field of the slot's value that is tested. |

**`op: not`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `not` | yes | — | Holds when `inner` does not. |
| `inner` | any `until` alternative | yes | — | The condition to negate. |

**`op: and`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `and` | yes | — | Holds when every condition in `all` does. |
| `all` | a list of `until` alternatives, at least 1 item | yes | — | The conditions that must all hold, at least one. |

**`op: or`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `or` | yes | — | Holds when any condition in `any` does. |
| `any` | a list of `until` alternatives, at least 1 item | yes | — | The conditions of which one must hold, at least one. |

## Worked example

Closes the loop. After each pass it checks the stop condition, and otherwise feeds the outputs back in and goes again.

#### Example

Reads `carry` → emits `carry` · one pass

Action settings (`functionConfig`):

```json
{
  "until": {
    "op": "slotGte",
    "slot": "review",
    "path": "score",
    "value": 8
  },
  "carryMap": {
    "revised": "draft"
  },
  "escapeSlots": {
    "review": "lastReview"
  },
  "outputSlot": "finalDraft"
}
```

Input:

- the slots this pass wrote — read on every pass

Each pass:

- the loop's result
