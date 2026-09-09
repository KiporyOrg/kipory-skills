# Flow patterns

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->

Five shapes cover most flows. Each names the control handlers involved and the one rule each has that is not obvious from its config table. Field names are the handler's own config keys — see `handlers/<key>.md` for the full table and a worked example.

## The three grammars, once

| Where                                        | Grammar                                                                                                       | Example                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A slot name (`outputSlot`, `inputStreams[]`) | letters and digits, starting with a letter; **no underscore**                                                 | `pageText`, `summary`                              |
| A prompt template (`promptTemplate`)         | `{{slot}}`, `{{slot.field}}`, `{{slot[0]}}`, sections `{{#slot}}…{{/slot}}`, filters `{{slot\|truncate:200}}` | `Summarise: {{pageText}}`                          |
| An input projection (`inputPaths[i]`)        | a structured path object with segments `field`, `first`, `last`, `index`, `pluck`, `wrap` — never a string    | pluck `id` from a list, wrap one value into a list |
| A condition (`condition`)                    | a clause `{ op, slot, path?, … }`; `path` here **is** a dot-string                                            | `{ op: "slotPresent", slot: "summary" }`           |
| A computation                                | JSONata, in `value.transform` only                                                                            | `$count(items)`                                    |

Literals enter a flow in exactly three places: a `flow.invoke` input row of kind `literal`, a `flow.loop` `seedLiteral`, or a JSONata expression's own constants. A step's `inputStreams` cannot carry one.

## 1. Ingest pipeline

**Shape:** a source handler → text handlers → a writer, with the terminal slot bound in the flow's `outputBinding`.

```
url.scrape (pageUrl → page) → text.generate (page → summary) → entity.update (summary → …)
```

- Ingest-phase handlers run in the async worker and carry a **queue**: retries, a wait ceiling, and a cache keyed on their input. Inline and control handlers have neither retry nor cache.
- `text.generate`'s config `temperature` and `reasoningEffort` are part of the cache key: changing either discards every cached answer for the same prompt. Higher reasoning effort dominates both time and the token bill.
- The one step that writes a record — `entity.create` — takes `recordType`, `dataSlot` and an optional `fileIdsSlot`; a per-user record type refuses a key-driven run. Lifecycle is decided by the type: no processing flow → READY; a flow → PENDING until the flow runs `entity.enqueue-process`.
- Bind the last slot. A flow whose required output is unbound 502s or returns an empty value on a live call, and preview names the slot in `missingRequiredOutput`.

## 2. Fan-out and merge

**Shape:** a list slot → `flow.fan-out` → the body → `flow.merge`.

- `flow.fan-out` reads one **list-shaped** slot and emits the element schema, one branch per element. Config: `dedupe` (default true, exact-string), `maxItems` (default 20), `maxParallelBranches`, `branchTargetsAreDisjoint` (default false).
- **Absent `maxParallelBranches` means "decide from the graph"**: parallel when no step in the branch can reach a sibling, sequential otherwise. `1` is the only setting where a branch reliably sees what earlier ones wrote. `branchTargetsAreDisjoint` is a promise about the data, not a bigger number — it waives only the same-record check, and if two branches do hit one record, the last write wins.
- `flow.merge` is **multi-lane**: `lanes[]` of `{ sourceSlots, outputSlot, strategy }` with strategy `concat`, `list-union` or `dedup-concat`. The output is always a list. The row's `inputStreams` is the dedup of every lane's sources and its `outputSlot` mirrors the first lane.
- **`onBranchFailure` is a whole-merge policy**: `proceed` (default) merges what succeeded; `fail` writes no lane at all.
- A merge must pair with an enclosing fan-out, and the pairing is derived from slot lineage, not creation order. A lane naming a slot no step in the branch writes always merges nothing — the validator says so.
- Preview caps fan-out at 5 branches per node unless you raise `fanOutCap`; it reports each truncation in `fanOutCaps` with what capped it.

## 3. Sub-flow

**Shape:** `flow.invoke` with `targetFlowId`, an ordered `inputs[]` and an `outputs[]`.

- Each input row is `{ kind: "slot", parentSlot, subFlowSlot, path? }` — a parent slot piped in, projected before it crosses — or `{ kind: "literal", subFlowSlot, value }`. **Only mapped slots cross the boundary.**
- `parentSlot` is parent scope and follows a slot rename; `subFlowSlot` is the sub-flow's and never does.
- Empty `outputs` means side effects only. `flow.invoke` writes no primary output slot; its outputs are the config's `parentSlot` names.
- The sub-flow does **not** need a declared signature. With an output binding it behaves as a typed function; with none, the raw produced slots are spliced back.
- The validator refuses a cycle, a depth over the limit, a cross-project target, and duplicate input or output rows.

## 4. Loop

**Shape:** `flow.loop` (opener) → the body → `flow.loop-end` (closer).

- The opener's `outputSlot` **is the carry slot** the body reads each iteration. It is seeded by `seedFrom` (a slot) or `seedLiteral` (a string) — never both. `maxIterations` (default 10) is a safety backstop, not the control.
- The closer's `until` is a **condition stored in config**, not the step's own `condition`, so it never becomes a dependency-cycle edge. It is checked after each iteration — do-while.
- `carryMap` writes a body output back into a carry slot; the carry is **replaced** each iteration, not accumulated.
- `escapeSlots` is a **rename map**: an inner slot published under a fresh outer name whose sole producer is the loop-end. Publishing under the same name would pull downstream consumers back into the body and re-run them per iteration.

## 5. Branch

**Shape:** `flow.dispatch` with ordered `rules[]` and an optional `default`.

- Rules are evaluated in order; **first match wins**. With no `default`, an unmatched input is **silently skipped**, and so is everything below the unwritten branch slot.
- `matchOn` chooses what is compared — the value itself, the URL host, or a named field of an object or file input — but **the original input is what is forwarded**: a file in stays a file out.
- `patternSyntax` is `regex` (validity checked at save) or `glob` (`*` only, always case-insensitive, ignores `flags`).
- The row's `outputSlot` is a mirror; the real writes land in the slots the rules name.

## 6. Accumulate across branches

**Shape:** `state.write` in the branch body, `state.read` after the merge.

A fan-out's branches cannot see each other's slots, and a merge lane only collects what a step in
the branch wrote to a named slot. Run-state cells are the way a run accumulates a total, a set or a
running list across branches that otherwise never meet.

- `state.write` names a **fixed** `key` — chosen when you author the step, never computed at run
  time — and an `op`: `set` overwrites, `add` sums, `append` builds a list, `union` builds a
  deduplicated set. `state.read` reads the same key back.
- **A cell is scoped to one run.** It is not project state, it does not persist, and a second run
  starts empty. For state that outlives a run, write a record (`entity.update`).
- `state.read` reads no slots at all, which means **nothing orders it against the writes**.
  `state.write` emits a marker for exactly this reason: wire that marker into the read to put the
  read after the write. Skip that and you will read a cell before the branch that filled it ran.
- The shape depends on the op: `set` and `add` cells read back as a string, `append` and `union` as
  a list.
- Under `flow.fan-out` the ordering rules still apply — with `maxParallelBranches` unset, branches
  may run in parallel, and only `1` makes a branch reliably see what an earlier one wrote. `add`
  and `union` are the ops that are safe regardless of order; `set` is the one that is not.

## Utilities you will reach for

- `value.first-non-empty` — an ordered `inputs` list of slots or paths; emits the first non-empty **preserving its runtime shape**, which is what lets it coalesce a URL string and a file. `valueKind` narrows to `string` or `file`.
- `value.transform` — one JSONata `expression`; top-level identifiers are slot names. The result must be text, a file, a flat object, or a list of those. `$now`, `$millis`, `$random` and `$shuffle` are refused because they break caching. Use it for computation; for prose with holes use `text.interpolate`.
- `text.interpolate` — a prompt template and nothing else; makes no model call and cannot emit a list.
- `list.concat` — an ordered `inputs` list of slots; flattens lists, lifts scalars to one-element lists, and joins them in the order given. `strategy` is `concat` or `dedup-concat`. It collects contributions from parallel sources **without needing a fan-out and merge pair**, which is the cheaper answer whenever the branches were never really a fan-out.

## Model choice

A step's model resolves in this order: `text.generate`'s `modelSlot` at run time → the step's `modelId` → the project's binding for the step's `taskKey` → the deployment default → the code default. Omitting `modelId` inherits, and inheriting is a real answer. `GET /v1/ai-models` lists what a project may bind (no prices — a non-null `deprecationDate` means still runnable, retiring on that date); `GET /v1/projects/{projectId}/task-models` shows each task's current model and its `source` — `project`, `system-default`, `environment`, `code-default` — and whether it is `assignableToStep`. Only five task kinds are writable on a step: `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak`.
