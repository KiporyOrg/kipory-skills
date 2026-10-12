<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.fan-out` — Run once per item

Run the next actions once for each item in a list.

Each branch runs the rest of the flow with its item in the output slot. Any list works.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `T[]` → `T`
- **Also found as:** for each, each item, each post, each row, per item, iterate
- **Reads:** One list. Any kind of list — every branch carries whatever the elements are. _(shape hint: `list`)_
- **Emits:** One downstream branch per list element. In each branch the action's `outputSlot` holds that branch's element, which is what the actions below it read.
- **Suggested input streams:** `extractedUrls`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `branchTargetsAreDisjoint` | boolean | no | `false` | Tick when every branch writes its own record, never a shared one. ⚠️ It lets record-writing branches overlap; leave it off if unsure, since two hitting one record means the last write wins. |
| `dedupe` | boolean | no | `true` | Drop repeated items before starting branches. ⚠️ Text is compared exactly, case included, a file by its storage key and anything else by its value. |
| `maxFailedBranches` | integer, at least 0 | no | — | Branches that may fail; each is dropped, the run ends `partial`. ⚠️ Set this or `maxFailedShare`, not both; with neither, one failure fails the run; a tolerated branch keeps nothing it staged. |
| `maxFailedShare` | number, more than 0, at most 1 | no | — | That tolerance as a share, rounded down: 0.2 of 10 is 2. ⚠️ Platform failures, spend caps and cancels are never tolerated; one branch must succeed; none sees a sibling's staged writes. |
| `maxItems` | integer, 1 to 100 | no | `20` | The most branches one run starts; later items are dropped. ⚠️ Above the usual ceiling of 100 the save is refused; items past `maxItems` get no branch and warn `fan-out-capped`. |
| `maxParallelBranches` | integer, 1 to 8 | no | — | How many branches run at once; empty lets the engine decide. ⚠️ Only 1 lets a branch reliably see earlier branches' writes; higher values can race. |

## Worked example

One branch per list element, each with its own value. They can rejoin later through a merge action.

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
