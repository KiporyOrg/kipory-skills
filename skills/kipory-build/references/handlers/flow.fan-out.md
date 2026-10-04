<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.fan-out` — Run once per item

Run the next steps once for each item in a list.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `T[]` → `T`
- **Reads:** One list. Any kind of list — every branch carries whatever the elements are. _(shape hint: `list`)_
- **Emits:** One downstream branch per list element. In each branch the step's `outputSlot` holds that branch's element, which is what the steps below it read.
- **Suggested input streams:** `extractedUrls`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `branchTargetsAreDisjoint` | boolean | no | `false` | Tick this when every branch writes its own record and no two ever touch the same one. ⚠️ It lets the engine overlap branches that write records, which it otherwise cannot. Leave it off if unsure: if two branches DO hit one record, the last write wins. |
| `dedupe` | boolean | no | `true` | Drop repeated list elements before fan-out: text compared exactly (case-sensitive), a file by its storage key, anything else by its value. |
| `maxItems` | integer, 1 to 100 | no | `20` | The most branches one run starts; later items are dropped. ⚠️ Above the system ceiling (100 unless the deployment changed it) the save refuses it with INVALID_HANDLER_CONFIG naming the setting and the limit. One run handles at most that many items, so split a bigger import. |
| `maxParallelBranches` | integer, 1 to 8 | no | — | How many branches may run at once. Leave it empty to let the engine decide from what the branches touch. ⚠️ 1 forces one at a time — the only setting where a branch reliably sees what earlier ones wrote. Higher forces overlap, so two branches writing one record become a race. |

## Worked example

One branch per list element, each with its own value. They can rejoin later through a merge step.

#### Example

Reads `string[]` → emits `string` · 1 list → 3 branches

Input:

- `https://kipory.dev/docs`
- `https://example.com/blog/launch`
- `https://github.com/kipory/sdk`

Branches:

- `https://kipory.dev/docs`
- `https://example.com/blog/launch`
- `https://github.com/kipory/sdk`
