<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.merge` — Gather branch results

Gather the results of parallel branches into one list.

Gathers what a `flow.fan-out`'s branches produced into one or more output slots. Each lane reads its own source slots, branch by branch, and reduces them into its own output slot with its own strategy. Steps after the merge run once, on the gathered values.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `T[]+` → `T[]`
- **Reads:** The per-branch slots you list. The kind they carry — text, files, objects, numbers or booleans — chooses the reducer, not the strategy. _(shape hint: `any+`)_
- **Emits:** The branches' values reduced into one list. `concat` keeps everything; `dedup-concat` drops repeats, keeping the first of each.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `lanes` | object[], at least 1 item | yes | — | The merge lanes, in order. The first is the step's own output; the rest are extra outputs. At least one is required. |
| `onBranchFailure` | `proceed` \| `fail` | no | `"proceed"` | What to do when a branch failed before reaching here. `proceed` merges what succeeded; `fail` fails this merge step. ⚠️ It is a whole-merge policy, not per-lane — `fail` writes no lane at all. Under `proceed`, when every branch failed each lane holds `[]`, which later steps read as absent. |

### `lanes` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `sourceSlots` | string[], at least 1 item | yes | — | The slots this lane reads from each branch that reaches the merge. |
| `outputSlot` | string | yes | — | The post-merge slot this lane writes. Unique across lanes. The first lane's is also the step's own `outputSlot`. |
| `strategy` | `concat` \| `list-union` \| `dedup-concat` | yes | — | How this lane combines what the branches contributed. It follows the shape they carry, not the name you pick. |
| `derivedShape` | union | no | — | The shape this lane produces, worked out when you save. Metadata only; the runtime ignores it. |

`derivedShape` — one of:

**`derivedShape` › `kind: ref`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `ref` | yes | — | A named shape, defined once in the project's schema entries and reused by id. |
| `entryId` | string | yes | — | Id of the schema entry this points at. It has to already exist, and one that something still points at cannot be deleted. |

**`derivedShape` › `kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | An array of values. |
| `element` | any `derivedShape` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`derivedShape` › `kind: optional`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `optional` | yes | — | A value that may be absent altogether. |
| `inner` | any `derivedShape` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`derivedShape` › `kind: union`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `union` | yes | — | One of several alternative shapes. A step may READ a union; what it writes has to be one concrete shape. |
| `members` | a list of `derivedShape` alternatives, at least 2 items | yes | — | The alternatives — at least two, since a single-member union is just that member. |

**`derivedShape` › `kind: record`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `record` | yes | — | A map from string keys to values. Only the values are typed; the keys are always strings and are not constrained. |
| `valueType` | any `derivedShape` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`derivedShape` › `kind: recordRef`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `recordRef` | yes | — | A pointer to one stored record. The value on the wire is that record's id. |
| `recordType` | string | yes | — | Which record type the id refers to. Makes the reference filterable. The target is never checked, so a deleted record leaves it pointing at nothing. |

## Worked example

Branch results come back together as one list. The variants show keeping everything against dropping repeats, over both text and files.

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
