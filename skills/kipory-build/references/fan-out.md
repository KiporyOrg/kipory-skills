# Fan-out and merge

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

The control shapes §2 and §6 (`patterns.md` has the map of every section). Field names are the functions' own config keys — `functions/<key>.md` has each table.

## 2. Fan-out and merge

**Shape:** a list slot → `flow.fan-out` → the body → `flow.merge`.

- `flow.fan-out` reads one **list-shaped** slot and emits the element schema, one branch per element.
- Any list fans out — text, files, objects, numbers or booleans — and each branch carries its element as it is, so a list of rows needs no flattening: the branch slot is typed as the list's element, and a body action reads a field of it like any object slot. That needs the element to be a named type: a list whose `items` are written inline in its parent's definition has the anonymous `object` as its element, so the branch is an `object`, a `field` path into it is refused, and stating a named `outputSchema` on the fan-out is a `NOMINAL_MISMATCH`. Give the row its own type and reference it from `items` (`kipory-model` has the form). `flow.merge` folds every one of those kinds back into a list of the same kind. Config: `dedupe` (default true: text compared exactly, a file by its key, an object by its value, so two identical rows run once), `maxItems` (optional: cuts the list on purpose), `maxParallelBranches`, `branchTargetsAreDisjoint` (default false).
- **One run fans out over at most the project's `runs.fan-out-items`: 1,000 unless the project's limit was changed** (`GET /v1/projects/{nodeId}/limits`). A fan-out handed more runs no branch and fails with `FAN_OUT_OVER_LIMIT` (`errorDetails` carries `requested` and `limit`); the run is not retried, and the failed-run alert names it. The plan warns `FANOUT_MAY_PASS_LIMIT` when the fan-out's list is a read whose `limit` × `pages.max` passes the limit. So one run handles at most 1,000 rows; a longer job continues page by page (next point).
- **A job longer than one run continues page by page with `flow.continue`.** Give the flow an optional text input for the cursor (say `after`), read with `cursor: "after"`, `limit: 100` and `pages: {max: 10, onMore: "stop"}`, fan out over `<read>.records`, close the fan-out with a `flow.merge` (without one, every action after a fan-out runs in each branch, and a page of 1,000 would start 1,000 next pages), and end with `flow.continue` (`cursor: "<read>.nextCursor"`, `cursorInput: "after"`, `inputs` for anything else the next run needs). Once this run's changes are saved, the next run of the same flow starts from the cursor, acting for nobody; an empty cursor ends the job, and the action answers `{continued, page}`. Each page is its own run: saved whole, retried whole, listed on its own in the runs. A failed page starts nothing, so the job stops there; a write keyed on the table's natural key with `onKeyTaken: "skip"` lets a page be run again safely. One job runs at most `runs.continue-pages` pages (100 unless changed): the action that would start one more fails `CONTINUE_PAGES_OVER_LIMIT`. It refuses inside a fan-out or loop (`FLOW_CONTINUE_IN_BRANCH`), in a sub-flow (`CONTINUE_IN_SUB_FLOW`) and in a run that acts for a person (`START_NEEDS_NO_PERSON`); the plan warns `FLOW_CONTINUE_READ_FAILS_ON_MORE` when the read would fail instead of stopping. A preview starts no page and answers the page it would have.
- **`maxItems` cuts the list on purpose, and the run still succeeds.** A fan-out handed 30 items with `maxItems: 20` runs the first 20. Two signs: an `action-warned` row on the fan-out action — `detail.kind` `fan-out-capped`, with `requested`, `branches` and `cappedBy: "config"` — and, when the fan-out names a `failureSlot`, `code: "fan-out-capped"` there, which every branch and what follows the merge can read. Leave `maxItems` out where every item must be handled. A preview's own five-branch cap warns with `cappedBy: "preview"` and is reported in `fanOutCaps`, but writes no `fan-out-capped` to the failure slot, so the flow takes the path it takes live.
- **Absent `maxParallelBranches` means "decide from the graph"**: up to 8 branches at once (the project's `runs.parallel-branches` limit) when nothing in a branch can reach a sibling, and **one at a time otherwise** — so most fan-outs run their branches one by one. A branch is held to one at a time by an action that changes or deletes an existing record (`record.update`, `record.delete`, … — unless the fan-out sets `branchTargetsAreDisjoint`), by another lasting write such as `email.send` or `source.watch`, by `event.emit`, `state.write` (unless its `op` is `union`), or a sub-flow you cannot read. A sub-flow call counts by what the sub-flow does: one that only reads or creates runs together like those actions would. Creating records (`record.create`, `term.upsert`) does not hold it. **A change to the item's own record runs together without a setting**: a `record.update` or `record.append` whose `recordId` is `<item>.id` (in the branch, or in a sub-flow handed the item), with no `fileIds` and no record read (`record.read`, `record.list`, `record.query`, …) in the branch, runs branches together whenever the listed records are distinct — and one at a time, without saying so, when one record appears twice. The flow's health warns `FANOUT_RUNS_ONE_AT_A_TIME` naming the action that held it, and the sub-flow it sits in (`details.holdingFlowIds`), until you set `maxParallelBranches` to say what you want. Two branches of 9 s and 2 s take about 11 s one at a time and 9 s together. `1` is the only setting where a branch reliably sees what earlier ones wrote. `branchTargetsAreDisjoint` is a promise about the data, not a bigger number — it waives only the same-record check. Tick it when no two branches ever change one record and the rule above does not already run them together: a record the item points at, or the item's own record in a branch that also reads records or attaches files (the tick then also answers for what those reads see). If two branches do hit one record, the last write wins.
- **Inside one branch, as in a whole flow, actions run in waves by `level`** — each level waits for its slowest action before the next starts (`packs/flows-and-actions.md`). Work that must not wait for a slow sibling goes in a branch of its own.
- `flow.merge` is **multi-lane**: `lanes[]` of `{ sourceSlots, outputSlot, strategy }` with strategy `concat`, `list-union` or `dedup-concat`. The output is always a list. The row's `inputStreams` is the dedup of every lane's sources and its `outputSlot` mirrors the first lane.
- **Whether a failed branch fails the run is the fan-out's to say, once**: `maxFailedBranches` (a whole number) or `maxFailedShare` (above 0, at most 1 — a share of the branches run, rounded down). State one, never both. With neither, the first failed branch stops the fan-out: no further branch starts, and neither the merge nor anything after it runs.
- **A branch within the tolerance is dropped whole.** Nothing it staged is kept, the merge gathers the other branches only, and the run closes `partial`. At least one branch must succeed whatever is stated. A branch that failed for the platform's own reasons, a spend cap or a cancel is never tolerated.
- **Under a tolerance a branch does not read what a sibling still running has staged.** Two parallel branches that would each find-or-create one record both stage a create, and the run fails when its changes are applied — set `maxParallelBranches: 1` where branches can meet on a record. A tolerance is refused when a branch reads or writes run state (`FANOUT_TOLERANCE_SHARED_RUN_STATE`).
- **The merge's `failuresSlot` lists what was tolerated**: one `{ index, failure }` per failed branch, `index` its position in the list from 0 and `failure` an `ActionFailure`. It is absent when no branch failed, so guard on it with `slotPresent`. Naming it under a fan-out that states no tolerance is refused (`FAILURE_SLOT_NEVER_WRITTEN`).
- **`flow.merge` no longer takes `onBranchFailure`**; a config that still carries it is refused with `INVALID_FUNCTION_CONFIG`.
- **A `partial` run kept its changes.** Its `closing.verdict` is `partial` and `closing.absorbed.branches` counts the branches dropped; an unattended one is listed on `GET /v1/failed-runs` and reported to the project in `platform/run.partial` summaries (`kipory-operate`). A fan-out over an empty list fails nothing.
- A merge must pair with an enclosing fan-out, and the pairing is derived from slot lineage, not creation order. A lane naming a slot no action in the branch writes always merges nothing — the validator says so.
- A fan-out inside another fan-out's branch multiplies: the plan warns `NESTED_FANOUT` with the worst case, the product of their `maxItems` (the project's fan-out limit where one is left out). A fan-out that reads what an earlier one's merge gathered runs after it, not inside it, and draws no warning.
- Preview runs at most 5 branches per fan-out by default. `fanOutCap` on the preview body sets that preview-only cap — a number or `"uncapped"` — but never lifts an action's own `maxItems`, the ceiling a live run also has. It reports each truncation in `fanOutCaps` with what capped it.

<!-- field-ok: onBranchFailure — a `flow.merge` function-config key this release REMOVED, named so a reader knows what to delete -->

## 6. Accumulate across branches

**Shape:** `state.write` in the branch body, `state.read` after the merge.

A fan-out's branches cannot see each other's slots, and a merge lane only collects what an action in
the branch wrote to a named slot. Run-state cells are the way a run accumulates a total, a set or a
running list across branches that otherwise never meet.

- `state.write` names a **fixed** `key` — chosen when you author the action, never computed at run
  time — and an `op`: `set` overwrites, `add` sums, `append` builds a list, `union` builds a
  deduplicated set. `state.read` reads the same key back.
- **A cell is scoped to one run.** It is not project state, it does not persist, and a second run
  starts empty. For state that outlives a run, write a record (`record.update`).
- `state.read` reads no slots of its own, which means **nothing orders it against the writes**
  until you give it an input. Skip that and you will read a cell before the branch that filled it
  ran.
  - **Writes inside a fan-out, read after it:** the read must list a slot the `flow.merge` writes
    in its `inputStreams`, which places it after every branch. A `state.write`'s marker is a branch
    slot, so a read wired straight to it belongs to the branch body and runs once per branch.
  - **Write and read on the trunk:** wire the write's marker — the slot `state.write` emits — into
    the read. Left at the same stage, health reports `STATE_READ_WRITE_SAME_STAGE` on the read.
- The shape depends on the op: `set` and `add` cells read back as a string, `append` and `union` as
  a list (`union` sorted). `state.read`'s output type defaults to `string`, so for an `append` or
  `union` cell set the read's `outputSchema` to a list of `string`, or health warns
  `STATE_READ_SHAPE_MISMATCH`.
- **Cells hold text.** An object is stored as its JSON text, and `add` needs a number or a numeric
  string.
- The other save-time findings: `STATE_KEY_OP_CONFLICT` (two writes to one key with different
  ops), `STATE_DANGLING_READ` (a read of a key nothing writes, a warning), `STATE_SET_CONFLICT`
  (two `set` writes of one key at the same stage) and `STATE_WRITE_VALUE_SOURCE_MISSING` (a
  `state.write` with no input wired to the value it writes).
- **Run state and a failure tolerance do not mix.** A cell is one store the whole run shares, and a dropped branch cannot take back what it wrote there, so a fan-out that states `maxFailedBranches` or `maxFailedShare` is refused when a branch — or any flow a branch calls — reads or writes run state (`FANOUT_TOLERANCE_SHARED_RUN_STATE`), and so is a sub-flow call set to `continue` (`RUN_CONTINUE_NOT_ALLOWED`).
- Under `flow.fan-out` the ordering rules still apply — with `maxParallelBranches` unset, branches
  may run in parallel, and only `1` makes a branch reliably see what an earlier one wrote. `add`
  and `union` are the ops that are safe regardless of order; `set` is the one that is not.
