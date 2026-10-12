<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.merge` — Gather branch results

Gather the results of parallel branches into one list.

Each lane gathers its own slots from every branch with its own strategy. Actions after the merge run once.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `T[]+` → `T[]`
- **Also found as:** merge branches, join branches, combine results, collect results
- **Reads:** The per-branch slots you list. The kind they carry — text, files, objects, numbers or booleans — chooses the reducer, not the strategy. _(shape hint: `any+`)_
- **Emits:** The branches' values reduced into one list. `concat` keeps everything; `dedup-concat` drops repeats, keeping the first of each.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `failuresSlot` | string | no | — | Lists each branch the fan-out tolerated: its position and why it failed. ⚠️ Absent unless a branch was tolerated, so read it as optional; name it only with `maxFailedBranches` or `maxFailedShare`. |
| `lanes` | object[], at least 1 item | yes | — | The merge lanes in order; the first is the action's own output. |

### `lanes` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `sourceSlots` | string[], at least 1 item | yes | — | The slots this lane reads from each branch that reaches the merge. |
| `outputSlot` | string | yes | — | The slot this lane writes, unique across lanes. |
| `strategy` | `concat` \| `list-union` \| `dedup-concat` | yes | — | How the lane combines branch values, following their shape, not its name. |
| `derivedShape` | union | no | — | This lane's shape, worked out on save; the runtime ignores it. |

`derivedShape` — one of:

**`derivedShape` › `kind: ref`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `ref` | yes | — | A named shape from the project's types, by id. |
| `dataTypeId` | string | yes | — | The id of an existing type this points at. |

**`derivedShape` › `kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | An array of values. |
| `element` | any `derivedShape` alternative | yes | — | The shape at this position, one level in. |

**`derivedShape` › `kind: optional`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `optional` | yes | — | A value that may be absent altogether. |
| `inner` | any `derivedShape` alternative | yes | — | The shape at this position, one level in. |

**`derivedShape` › `kind: union`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `union` | yes | — | One of several shapes; an action writes only one. |
| `members` | a list of `derivedShape` alternatives, at least 2 items | yes | — | The alternatives, at least two. |

**`derivedShape` › `kind: record`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `record` | yes | — | A map from text keys to values of one type. |
| `valueType` | any `derivedShape` alternative | yes | — | The shape at this position, one level in. |

**`derivedShape` › `kind: recordRef`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `recordRef` | yes | — | One stored record, given by its id. |
| `tableKey` | string | yes | — | Which table the id refers to. |

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
