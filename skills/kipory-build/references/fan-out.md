# Each, parallel and run state

<!-- field-ok: perMember — one project's step key used in the examples, not a platform field -->
<!-- field-ok: pageText — one project's value name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a run-ambient value the platform fills, not a request field -->
<!-- field-ok: runInfo — a run-ambient value the platform fills, not a request field -->

The control shapes §2 and §6 (`patterns.md` has the map of every section). A flow repeats over a list with an `each` block and runs independent steps at once with a `parallel` block, both written in the steps. The block fields are in `packs/flows-and-actions.md`; a function's settings are its own (`functions/<key>.md`).

## 2. Each, and parallel

**Shape:** a list → an `each` block whose steps run once per element → its `out`, read after the block as `<key>[].<name>`.

```yaml
- key: due
  function: record.list
  with: { tableKey: member, limit: 100, pages: { max: 10, onMore: fail } }
- key: perMember
  each: due.records
  as: member
  maxParallel: 4
  maxFailedShare: 0.1
  steps:
    - key: renew
      function: record.update
      with: { recordId: member.id, fields: { renewsOn: member.nextRenewsOn } }
  out: { renewed: renew }
- key: done
  return: { renewed: { expr: "$count(perMember[renewed])" } }
```

- **`each` reads any list, `as` names the element** inside the block (`member.id`). Any list goes through — text, files, numbers, objects — and the element is typed as the list's element, so a field of it is read like any value. A value that is not a list fails the block `EACH_OVER_NOT_A_LIST`, and the save refuses an `each` whose argument cannot be a list (`EACH_NOT_LIST_SHAPE`). An element that is nothing is passed over and counted, not run. An `each` over `[]` runs nothing and gives `[]`.
- **Only the block's `out` leaves it.** The value is the list of each element's `out`, in the list's order: `perMember[].renewed`, or the whole `perMember`. A step inside the block is not readable after it (`BLOCK_VALUE_ESCAPES`).
- **One run goes through at most the project's `runs.each-items`: 1,000 unless the project's limit was changed** (`GET /v1/projects/{nodeId}/limits`). A longer list fails the block `FAN_OUT_OVER_LIMIT` before any element runs, naming the limit; the save warns `EACH_MAY_PASS_LIMIT` when the list is a read that can return more. A longer job continues page by page (next point).
- **`maxItems` is your guard, not a cut.** A list longer than it fails the block `EACH_OVER_MAX_ITEMS`, running no element; its fix takes the first `maxItems` where the list is made. To take only the first n on purpose, slice there: `each: { expr: "$slice(due.records, 0, 50)" }`.
- **A job longer than one run continues page by page with `flow.continue`.** Give the flow an optional text input for the cursor (say `after`), read with `cursor: { path: after, optional: true }` (the first run has no `after`, so it reads page one), `limit: 100` and `pages: { max: 10, onMore: "stop" }`, go through `<read>.records` with an `each`, and end the flow (after the block) with a `flow.continue` step (`cursor: "<read>.nextCursor"`, `cursorInput: "after"`, `inputs` for anything else the next run needs). Once this run's changes are saved, the next run of the same flow starts from the cursor, acting for nobody; an empty cursor ends the job. On the first run `after` is not given, so the read reads page one (the cursor rule is in `endpoint-answers.md`, "422 for a bad `cursor`"). Each page is its own run: saved whole, retried whole, listed on its own. A failed page starts nothing, so the job stops there; a write keyed on the table's natural key with `onKeyTaken: "skip"` lets a page run again safely. One job runs at most `runs.continue-pages` pages (100 unless changed): the step that would start one more fails `CONTINUE_PAGES_OVER_LIMIT`. One `flow.continue` per flow, never inside an `each` or a `repeat` (`FLOW_CONTINUE_IN_BRANCH`), in a sub-flow (`CONTINUE_IN_SUB_FLOW`) or in a run that acts for a person (`START_NEEDS_NO_PERSON`); the save warns `FLOW_CONTINUE_READ_FAILS_ON_MORE` when the read would fail instead of stopping. A preview starts no page.
- **How many run at once.** Left out, `maxParallel` lets elements run together only when they cannot affect one another — up to the project's `runs.parallel-branches` — and one at a time otherwise. Elements are held to one at a time by a step that changes or deletes an existing record, another lasting change (`email.send`, `url.send`, `source.watch`), `event.emit`, `state.write` (unless its `op` is `union`), or a sub-flow that does one of these or cannot be judged; creating records (`record.create`, `term.upsert`) does not hold them, and a write to the element's own record (`recordId: member.id`) does not either. The save warns `EACH_RUNS_ONE_AT_A_TIME` naming why. `maxParallel` only lowers the number; it never overrides that verdict. `1` is the setting where an element reliably sees what an earlier one wrote.
- **A failed element fails the block**, and no further element starts, unless the block tolerates it: `maxFailedBranches` (a whole number) or `maxFailedShare` (above 0, at most 1 — a share of the elements run, rounded down), never both.
- **A tolerated element is dropped whole.** Nothing it staged is kept, it gives no `out`, and the run closes `partial` (`closing.absorbed.branches` counts them). At least one element must succeed whatever is stated: the allowance is the stated one or one fewer than the elements, whichever is less. A failure for the platform's own reasons, a spend cap, a cancel or a refusal is never tolerated. A tolerated element is silent downstream: the list is shorter, and only the run's `partial` verdict and its warnings say which failed.
- **Under a tolerance an element does not read what a sibling still running has staged.** Two elements that would each find-or-create one record both stage a create, and the run fails when its changes are applied — set `maxParallel: 1` where elements can meet on a record. A tolerance is refused when a step inside reads or writes run state (`EACH_TOLERANCE_SHARED_RUN_STATE`).
- **A `partial` run kept its changes.** Its `closing.verdict` is `partial`; an unattended one is listed on `GET /v1/failed-runs` and reported to the project in `platform/run.partial` summaries (`kipory-operate`).
- **An `each` inside an `each` multiplies** — 100 × 100 is 10,000 runs of the inner steps. Prefer one read that answers the pairs.
- **Preview runs at most 5 elements per `each` by default.** `fanOutCap` on the preview body sets that preview-only cap — a number or `"uncapped"`; it only narrows, and the limits above are judged on the whole list first. Each cut is a `step-warned` row on the `each` — `detail.kind` `each-capped`, with `requested`, `branches` and `cappedBy: "preview"` — and is reported in `fanOutCaps`. A live run never cuts a list.

**`parallel` — independent steps at the same time.** `{ key, parallel: [steps], out? }` runs its children at once, each from the values there before the block. None may read a sibling (`PARALLEL_READS_SIBLING`, whose fix moves the reader after the block and reads through `out`). Two children that may change the same record warn `PARALLEL_EFFECTS_MAY_CONFLICT`: they may land in either order, so write them in order instead if order matters. A child running `request.refuse` or `request.verify-signature` starts before its siblings, which start nothing once it refused. Use `parallel` for slow independent reads — two vendor lookups of one company — whose results a later step combines; written order already runs everything else one after another.

## 6. Run state across elements

**Shape:** `state.write` inside the `each`, `state.read` after it.

The elements of an `each` cannot see each other's values, and the block's `out` only collects what each element gives. Run-state cells are the way a run accumulates a total, a set or a running list across elements that otherwise never meet. Usually an `out` is simpler: `$sum(perMember[].amount)` after the block is the total.

- `state.write` names a **fixed** `key` — chosen when you write the step, never computed at run time — and an `op`: `set` overwrites, `add` sums, `append` builds a list, `union` builds a deduplicated set. `state.read` reads the same key back.
- **A cell is scoped to one run.** It is not project state, it does not persist, and a second run starts empty. For state that outlives a run, write a record (`record.update`).
- **Written order orders the reads.** A `state.read` written after the `each` sees every element's writes. The steps that run together — a `parallel`'s children, and an `each`'s elements when they run at once — land in either order: two `set` writes of one key there are `STATE_SET_CONFLICT`, and a read beside a write of the same key is `STATE_READ_WRITE_SAME_STAGE`. `add` and `union` are the ops that are safe in any order; `set` is the one that is not.
- `set` and `add` cells read back as text, `append` and `union` as a list (`union` sorted). **Cells hold text**: an object is stored as its JSON text, and `add` needs a number or a numeric string.
- The other save-time findings: `STATE_KEY_OP_CONFLICT` (two writes to one key with different ops, a called flow's included), `STATE_DANGLING_READ` (a read of a key nothing in this flow or the flows it calls writes, a warning) and `STATE_WRITE_VALUE_SOURCE_MISSING` (a `state.write` with no `value`).
- **Run state and a failure tolerance do not mix.** A cell is one store the whole run shares, and a dropped element cannot take back what it wrote there, so an `each` that states `maxFailedBranches` or `maxFailedShare` is refused when a step inside — or any flow it calls — reads or writes run state (`EACH_TOLERANCE_SHARED_RUN_STATE`).
