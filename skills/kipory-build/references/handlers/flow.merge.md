<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `flow.merge` — Merge fan-out branches

Gather outputs from fan-out branches into one list.

- **Group:** Flow · **Phase:** `control` · **Effect class:** `read`
- **I/O:** `T[]+` → `T[]`
- **Reads:** The per-branch slots you list. The shape they carry — text or files — chooses the reducer, not the strategy. _(shape hint: `any+`)_
- **Emits:** The branches' values reduced into one list. `concat` keeps everything; `dedup-concat` drops repeats, keeping the first of each.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `lanes` | object[] | yes | — | The merge lanes, in order. The first is the step's own output; the rest are extra outputs. At least one is required. |
| `onBranchFailure` | `proceed` \| `fail` | no | `"proceed"` | What to do when a branch failed before reaching here. `proceed` merges what succeeded; `fail` stops the record. ⚠️ It is a whole-merge policy, not per-lane — `fail` writes no lane at all. |

## Worked example

Branch results come back together as one list. The variants show keeping everything against dropping repeats, over both text and files.

Reads: gather branches. Emits: reduce by strategy.

#### concat (text)

Reads `string[]` → emits `string[]` · 5 branches → 5 items

Input:

- {"index":0,"value":"https://kipory.dev/docs, https://kipory.dev/blog","detail":"branch 1"}
- {"index":1,"value":"https://example.com/launch","detail":"branch 2"}
- {"index":2,"value":"https://github.com/kipory/sdk, https://github.com/kipory/cli","detail":"branch 3"}

Merged:

- {"index":0,"value":"https://kipory.dev/docs"}
- {"index":1,"value":"https://kipory.dev/blog"}
- {"index":2,"value":"https://example.com/launch"}
- {"index":3,"value":"https://github.com/kipory/sdk"}
- {"index":4,"value":"https://github.com/kipory/cli"}

#### dedup-concat (text)

Reads `string[]` → emits `string[]` · 6 branches → 4 items

Input:

- {"index":0,"value":"https://kipory.dev/docs, https://kipory.dev/blog","detail":"branch 1"}
- {"index":1,"value":"https://example.com/launch, https://kipory.dev/docs","detail":"branch 2"}
- {"index":2,"value":"https://kipory.dev/blog, https://github.com/kipory/sdk","detail":"branch 3"}

Merged:

- {"index":0,"value":"https://kipory.dev/docs"}
- {"index":1,"value":"https://kipory.dev/blog"}
- {"index":2,"value":"https://example.com/launch"}
- {"index":3,"value":"https://github.com/kipory/sdk"}

#### dedup-concat (files)

Reads `file[]` → emits `file[]` · 6 branches → 4 items

Input:

- {"index":0,"value":"receipts/aug.pdf, receipts/sep.pdf","detail":"branch 1"}
- {"index":1,"value":"receipts/sep.pdf, receipts/oct.pdf","detail":"branch 2"}
- {"index":2,"value":"receipts/oct.pdf, receipts/nov.pdf","detail":"branch 3"}

Merged:

- {"index":0,"value":"receipts/aug.pdf"}
- {"index":1,"value":"receipts/sep.pdf"}
- {"index":2,"value":"receipts/oct.pdf"}
- {"index":3,"value":"receipts/nov.pdf"}

#### multi-source concat

Reads `string[]` → emits `string[]` · 9 branches → 9 items

Input:

- {"index":0,"value":"https://kipory.dev/docs, https://kipory.dev/blog, https://kipory.dev/logo.png, https://kipory.dev/hero.webp","detail":"branch 1"}
- {"index":1,"value":"https://example.com/launch, https://example.com/og-image.jpg","detail":"branch 2"}
- {"index":2,"value":"https://github.com/kipory/sdk, https://github.com/kipory/cli, https://github.com/kipory/logo.svg","detail":"branch 3"}

Merged:

- {"index":0,"value":"https://kipory.dev/docs"}
- {"index":1,"value":"https://kipory.dev/blog"}
- {"index":2,"value":"https://kipory.dev/logo.png"}
- {"index":3,"value":"https://kipory.dev/hero.webp"}
- {"index":4,"value":"https://example.com/launch"}
- {"index":5,"value":"https://example.com/og-image.jpg"}
- {"index":6,"value":"https://github.com/kipory/sdk"}
- {"index":7,"value":"https://github.com/kipory/cli"}
- {"index":8,"value":"https://github.com/kipory/logo.svg"}
