<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.merge` — Gather branch results

Gather the results of parallel branches into one list.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `T[]+` → `T[]`
- **Reads:** The per-branch slots you list. The kind they carry — text, files, objects, numbers or booleans — chooses the reducer, not the strategy. _(shape hint: `any+`)_
- **Emits:** The branches' values reduced into one list. `concat` keeps everything; `dedup-concat` drops repeats, keeping the first of each.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `lanes` | object[] | yes | — | The merge lanes, in order. The first is the step's own output; the rest are extra outputs. At least one is required. |
| `onBranchFailure` | `proceed` \| `fail` | no | `"proceed"` | What to do when a branch failed before reaching here. `proceed` merges what succeeded; `fail` stops the record. ⚠️ It is a whole-merge policy, not per-lane — `fail` writes no lane at all. Under `proceed`, when every branch failed each lane holds `[]`, which later steps read as absent. |

### `lanes` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `sourceSlots` | string[] | yes | — | The slots this lane reads from each branch that reaches the merge. |
| `outputSlot` | string | yes | — | The post-merge slot this lane writes. Unique across lanes. lanes[0].outputSlot mirrors Skill.outputSlot. |
| `strategy` | `concat` \| `list-union` \| `dedup-concat` | yes | — | How this lane combines what the branches contributed. It follows the shape they carry, not the name you pick. |
| `derivedShape` | union | no | — | The shape this lane produces, worked out when you save. Metadata only; the runtime ignores it. |

## Worked example

Branch results come back together as one list. The variants show keeping everything against dropping repeats, over both text and files.

Reads: gather branches. Emits: reduce by strategy.

#### Keep everything

Reads `string[]` → emits `string[]` · 5 branches → 5 items

Input:

- https://kipory.dev/docs, https://kipory.dev/blog — branch 1
- `https://example.com/launch` — branch 2
- https://github.com/kipory/sdk, https://github.com/kipory/cli — branch 3

Merged:

- `https://kipory.dev/docs`
- `https://kipory.dev/blog`
- `https://example.com/launch`
- `https://github.com/kipory/sdk`
- `https://github.com/kipory/cli`

#### Drop repeats

Reads `string[]` → emits `string[]` · 6 branches → 4 items

Input:

- https://kipory.dev/docs, https://kipory.dev/blog — branch 1
- https://example.com/launch, https://kipory.dev/docs — branch 2
- https://kipory.dev/blog, https://github.com/kipory/sdk — branch 3

Merged:

- `https://kipory.dev/docs`
- `https://kipory.dev/blog`
- `https://example.com/launch`
- `https://github.com/kipory/sdk`

#### Drop repeated files

Reads `file[]` → emits `file[]` · 6 branches → 4 items

Input:

- receipts/aug.pdf, receipts/sep.pdf — branch 1
- receipts/sep.pdf, receipts/oct.pdf — branch 2
- receipts/oct.pdf, receipts/nov.pdf — branch 3

Merged:

- `receipts/aug.pdf`
- `receipts/sep.pdf`
- `receipts/oct.pdf`
- `receipts/nov.pdf`

#### Two sources

Reads `string[]` → emits `string[]` · 9 branches → 9 items

Input:

- https://kipory.dev/docs, https://kipory.dev/blog, https://kipory.dev/logo.png, https://kipory.dev/hero.webp — branch 1
- https://example.com/launch, https://example.com/og-image.jpg — branch 2
- https://github.com/kipory/sdk, https://github.com/kipory/cli, https://github.com/kipory/logo.svg — branch 3

Merged:

- `https://kipory.dev/docs`
- `https://kipory.dev/blog`
- `https://kipory.dev/logo.png`
- `https://kipory.dev/hero.webp`
- `https://example.com/launch`
- `https://example.com/og-image.jpg`
- `https://github.com/kipory/sdk`
- `https://github.com/kipory/cli`
- `https://github.com/kipory/logo.svg`
