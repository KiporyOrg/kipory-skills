<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `flow.fan-out` — Fan out over a list

Run the next steps once for each item in a list.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **I/O:** `T[]` → `T`
- **Reads:** One list. Any kind of list — every branch carries whatever the elements are. _(shape hint: `list`)_
- **Emits:** One downstream branch per list element — the handler itself produces no slot value.
- **Suggested input streams:** `extractedUrls`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `branchTargetsAreDisjoint` | boolean | no | `false` | Tick this when every branch writes its own record and no two ever touch the same one. ⚠️ It lets the engine overlap branches that write records, which it otherwise cannot. Leave it off if unsure: if two branches DO hit one record, the last write wins. |
| `dedupe` | boolean | no | `true` | Exact-string, case-sensitive deduplication of list elements before fan-out. |
| `maxItems` | integer | no | `20` | Maximum branches per ProjectRecord. Bounded by KIPORY_SYSTEM_MAX_FAN_OUT to prevent runaway sessions. |
| `maxParallelBranches` | integer | no | — | How many branches may run at once. Leave it empty to let the engine decide from what the branches touch. ⚠️ 1 forces one at a time — the only setting where a branch reliably sees what earlier ones wrote. Higher forces overlap, so two branches writing one record become a race. |

## Worked example

One branch per list element, each with its own value. They can rejoin later through a merge step.

Reads: iterate elements. Emits: spawn branch.

#### Example

Reads `string[]` → emits `string` · 1 list → 3 branches

Input:

- {"index":0,"value":"https://kipory.dev/docs"}
- {"index":1,"value":"https://example.com/blog/launch"}
- {"index":2,"value":"https://github.com/kipory/sdk"}

Branches:

- {"index":0,"value":"https://kipory.dev/docs"}
- {"index":1,"value":"https://example.com/blog/launch"}
- {"index":2,"value":"https://github.com/kipory/sdk"}
