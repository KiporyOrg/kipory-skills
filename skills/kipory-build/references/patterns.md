# Flow patterns

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

Six control shapes cover how most flows are wired. Each names the control functions involved and the one rule each has that is not obvious from its config table. Field names are the function's own config keys — see `functions/<key>.md` for the full table and a worked example.

The numbering runs on in two sibling files: `records-and-endpoints.md` holds §7 (a record's processing flow), §8 (what an endpoint answers: 404, 422, optional filters), §9 (`record.query` and a per-user feed), §10 (roll-ups) and §11 (views: a read declared once, and the endpoint that pages itself); `models.md` holds which model function to use, `text.decide` questions, model bindings and prices.

## The three grammars, once

| Where                                        | Grammar                                                                                                                                    | Example                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| A slot name (`outputSlot`, `inputStreams[]`) | letters and digits, starting with a letter; **no underscore**                                                                              | `pageText`, `summary`                              |
| A prompt template (`promptTemplate`)         | `{{slot}}`, `{{slot.field}}`, `{{slot[0]}}`, sections `{{#slot}}…{{/slot}}`, filters `{{slot\|truncate:200}}`                              | `Summarise: {{pageText}}`                          |
| An input projection (`inputPaths[i]`)        | a structured path object with segments `field`, `first`, `last`, `index`, `pluck`, `wrap`, `distinct`, `compact` — never a string          | pluck `id` from a list, wrap one value into a list |
| A condition (`condition`)                    | a clause `{ op, slot, path?, … }`; `path` here **is** a dot-string. `not` wraps one clause (`inner`), `and` and `or` a list (`all`, `any`) | `{ op: "slotPresent", slot: "summary" }`           |
| A setting that reads a value (an argument)   | a slot path string, `{ "literal": … }` (a bare number or `true`/`false` too) or `{ "expr": "…" }` — `action-fields.md` §7                  | `"page.records[].id[distinct]"`                    |
| A computation                                | JSONata, in `value.transform`, in an argument's `expr`, in every `value.build` field (a bare string there too) and in an `expr` condition  | `$count(items)`                                    |

A fixed value enters a flow as an argument — `{ "literal": … }` (or a bare number or `true`/`false`) in any setting that reads a value, a `flow.invoke` input and a `flow.loop` seed included — or as a JSONata expression's own constants. A bare string in a setting is a slot path, never a text: a fixed text is `{ "literal": "neutral" }`. The one exception is `value.build`'s `fields`, where every value is a JSONata expression — `"book.title"` there is JSONata, and `"$count(reviews.records)"` beside it is too.

**A path and an expression read a list differently.** A read's output is a list even for one id (`record.read` gives `RecordRead[]`). In JSONata, `book.title` maps over the list: one item gives its title, several give a list of titles. A slot path never reads through a list: `"book.title"` as a setting reads nothing and the plan refuses it `CONFIG_SLOT_PATH_CROSSES_LIST` — write `book[0].title` (or `[first]`, `[last]`), or `book[].title` for every item's title.

A list slot in a prompt: a bare `{{points}}` holding a list of text renders as one line, items trimmed, empties dropped, joined with `, `. For one item per line use a section, `{{#points}}- {{.}}\n{{/points}}` (`{{@index}}` is the position); for a list of objects use `{{rows | json}}` or a section reading `{{rows.field}}`.

## 1. Ingest pipeline

**Shape:** a source function → text functions → a writer, with the terminal slot bound in the flow's `outputBinding`.

```
url.scrape (pageUrl → page) → text.generate (page → summary) → record.update (summary → …)
```

- Ingest-phase functions run in the async worker and carry a **queue**: retries, a wait ceiling, and a cache keyed on their input. Inline and control functions have neither retry nor cache.
- `text.generate`'s config `temperature` and `reasoningEffort` are part of the cache key: changing either discards every cached answer for the same prompt. Higher reasoning effort dominates both time and the token bill.
- Two actions write a record. `record.update` (above) patches the record the run is processing — `recordId`, then `data` and/or `derived`. `record.create` makes a new one — `tableKey`, `data` and an optional `fileIds`; a per-user table refuses a key-driven run. Lifecycle is decided by the table: with no processing flow the new record is `READY`; with one it is `PENDING` until that flow has processed it, and a record a flow created is queued for it only by an `record.enqueue-process` action (`records-and-endpoints.md` §7).
- Bind the last slot. A flow whose required output is unbound is refused `422 FLOW_OUTPUT_MISSING` on every live call, and preview names the slot in `missingRequiredOutput`.
- **An action runs when any one of its inputs is present**, so a writer downstream of an action that produced nothing still runs on its other inputs. A provider slot counts when present: `projectInfo` and `runInfo` always are, and `userInfo` is on a signed-in run, so an action reading one beside a real slot runs without waiting for it — only an absent `userInfo` (a key, a schedule, a trigger) leaves the action waiting on its other inputs. "Present" means non-empty: `""` and `[]` count as absent, both here and for a `slotPresent` condition, and an action that produced `{}` or an empty file stored no slot at all. A source that fails softly (a vendor out of credit answers a warning and an empty page) then leads to a record written with a hole in it. Guard the write: `"condition": { "op": "slotPresent", "slot": "summary" }` on the writer.
- **To run an action only when a slot is absent, negate the guard on that action**: `"condition": { "op": "not", "inner": { "op": "slotPresent", "slot": "found" } }`. A condition is judged before the action's inputs and may name a slot the action does not read, so the action keeps its own inputs and no helper action is needed (`action-fields.md` §5).
- **One failed action fails the run** (502, its writes discarded) even when a sibling succeeded, unless the action carries `"onFailure": "continue"`. `continue` is allowed on an action that writes nothing and on a sub-flow call (§3); it is refused on every other control action, on an action whose function may write, and on an action that writes a slot a required flow output is bound to. A run that carried on past a failure closes `partial`, not `succeeded`.
- A fallback for a page is `url.scrape` and `url.fetch` side by side into `value.first-non-empty`, with `"onFailure": "continue"` on the fetch (it fails the action on a 4xx or an unresolvable host) and a `slotPresent` guard on **every** action that reads the result beside another slot — a model action reading the page and the `url` otherwise runs on the URL alone and invents the page. `kipory-gather` owns the recipe: the strip expression, the types to coalesce and a no-vendor variant.

## 2. Fan-out and merge

**Shape:** a list slot → `flow.fan-out` → the body → `flow.merge`.

- `flow.fan-out` reads one **list-shaped** slot and emits the element schema, one branch per element.
- Any list fans out — text, files, objects, numbers or booleans — and each branch carries its element as it is, so a list of rows needs no flattening: the branch slot is typed as the list's element, and a body action reads a field of it like any object slot. That needs the element to be a named type: a list whose `items` are written inline in its parent's definition has the anonymous `object` as its element, so the branch is an `object`, a `field` path into it is refused, and stating a named `outputSchema` on the fan-out is a `NOMINAL_MISMATCH`. Give the row its own type and reference it from `items` (`kipory-model` has the form). `flow.merge` folds every one of those kinds back into a list of the same kind. Config: `dedupe` (default true: text compared exactly, a file by its key, an object by its value, so two identical rows run once), `maxItems` (default 20), `maxParallelBranches`, `branchTargetsAreDisjoint` (default false).
- **`maxItems` has a system ceiling, 100** unless the deployment changed it (`GET /v1/functions` → the fan-out's `config` → `maximum`). A value above it is refused with `INVALID_FUNCTION_CONFIG`, whose message names the setting and the bound ("`maxItems` must be at most 100"), and a document plan's finding points at `….functionConfig.maxItems`. So one importer run takes at most 100 rows: split a larger file, or run the import once per chunk.
- **Items past `maxItems` are not processed, and the run still succeeds.** A fan-out handed 30 items with `maxItems: 20` runs the first 20. Two signs: an `action-warned` row on the fan-out action — `detail.kind` `fan-out-capped`, with `requested`, `branches` and `cappedBy` (`config` for the action's own `maxItems`, `system` for the ceiling) — and, when the fan-out names a `failureSlot`, `code: "fan-out-capped"` there, which every branch and what follows the merge can read. Where every item must be handled, size `maxItems` to the largest list the action can be handed, or make the producer page so that no list is longer than the limit. A preview's own five-branch cap warns with `cappedBy: "preview"` and is reported in `fanOutCaps`, but writes no `fan-out-capped` to the failure slot, so the flow takes the path it takes live.
- **Absent `maxParallelBranches` means "decide from the graph"**: up to 8 branches at once (the project's `runs.parallel-branches` limit) when nothing in a branch can reach a sibling, and **one at a time otherwise** — so most fan-outs run their branches one by one. A branch is held to one at a time by an action that changes or deletes an existing record (`record.update`, `record.delete`, … — unless the fan-out sets `branchTargetsAreDisjoint`), by another lasting write such as `email.send` or `source.watch`, by `event.emit`, `state.write` (unless its `op` is `union`), or a sub-flow you cannot read. A sub-flow call counts by what the sub-flow does: one that only reads or creates runs together like those actions would. Creating records (`record.create`, `term.upsert`) does not hold it. **A change to the item's own record runs together without a setting**: a `record.update` or `record.append` whose `recordId` is `<item>.id` (in the branch, or in a sub-flow handed the item), with no `fileIds` and no record read (`record.read`, `record.list`, `record.query`, …) in the branch, runs branches together whenever the listed records are distinct — and one at a time, without saying so, when one record appears twice. The flow's health warns `FANOUT_RUNS_ONE_AT_A_TIME` naming the action that held it, and the sub-flow it sits in (`details.holdingFlowIds`), until you set `maxParallelBranches` to say what you want. Two branches of 9 s and 2 s take about 11 s one at a time and 9 s together. `1` is the only setting where a branch reliably sees what earlier ones wrote. `branchTargetsAreDisjoint` is a promise about the data, not a bigger number — it waives only the same-record check, so tick it only when each branch's record is distinct some other way than `<item>.id` (a record the item points at, say); if two branches do hit one record, the last write wins.
- **Inside one branch, as in a whole flow, actions run in waves by `level`** — each level waits for its slowest action before the next starts (`packs/flows-and-actions.md`). Work that must not wait for a slow sibling goes in a branch of its own.
- `flow.merge` is **multi-lane**: `lanes[]` of `{ sourceSlots, outputSlot, strategy }` with strategy `concat`, `list-union` or `dedup-concat`. The output is always a list. The row's `inputStreams` is the dedup of every lane's sources and its `outputSlot` mirrors the first lane.
- **Whether a failed branch fails the run is the fan-out's to say, once**: `maxFailedBranches` (a whole number) or `maxFailedShare` (above 0, at most 1 — a share of the branches run, rounded down). State one, never both. With neither, the first failed branch stops the fan-out: no further branch starts, and neither the merge nor anything after it runs.
- **A branch within the tolerance is dropped whole.** Nothing it staged is kept, the merge gathers the other branches only, and the run closes `partial`. At least one branch must succeed whatever is stated. A branch that failed for the platform's own reasons, a spend cap or a cancel is never tolerated.
- **Under a tolerance a branch does not read what a sibling still running has staged.** Two parallel branches that would each find-or-create one record both stage a create, and the run fails when its changes are applied — set `maxParallelBranches: 1` where branches can meet on a record. A tolerance is refused when a branch reads or writes run state (`FANOUT_TOLERANCE_SHARED_RUN_STATE`).
- **The merge's `failuresSlot` lists what was tolerated**: one `{ index, failure }` per failed branch, `index` its position in the list from 0 and `failure` an `ActionFailure`. It is absent when no branch failed, so guard on it with `slotPresent`. Naming it under a fan-out that states no tolerance is refused (`FAILURE_SLOT_NEVER_WRITTEN`).
- **`flow.merge` no longer takes `onBranchFailure`**; a config that still carries it is refused with `INVALID_FUNCTION_CONFIG`.
- **A `partial` run kept its changes.** Its `closing.verdict` is `partial` and `closing.absorbed.branches` counts the branches dropped; an unattended one is listed on `GET /v1/failed-runs` and reported to the project in `platform/run.partial` summaries (`kipory-operate`). A fan-out over an empty list fails nothing.
- A merge must pair with an enclosing fan-out, and the pairing is derived from slot lineage, not creation order. A lane naming a slot no action in the branch writes always merges nothing — the validator says so.
- A fan-out inside another fan-out's branch multiplies: the plan warns `NESTED_FANOUT` with the worst case, the product of their `maxItems`. A fan-out that reads what an earlier one's merge gathered runs after it, not inside it, and draws no warning.
- Preview runs at most 5 branches per fan-out by default. `fanOutCap` on the preview body sets that preview-only cap — a number or `"uncapped"` — but never lifts an action's own `maxItems`, the ceiling a live run also has. It reports each truncation in `fanOutCaps` with what capped it.

<!-- field-ok: onBranchFailure — a `flow.merge` function-config key this release REMOVED, named so a reader knows what to delete -->

## 3. Sub-flow

**Shape:** `flow.invoke` with `targetFlowId` (in a document: `target`, the flow's key, or `system:<key>`), an `inputs` map and an `outputs[]`.

- `inputs` maps each sub-flow input to an argument: a parent slot path (`"allPoints"`, `"book.title"`), a fixed value (`{ "literal": "neutral" }`, any JSON) or an expression. Each entry is checked against the sub-flow input's type at plan. **Only mapped inputs cross the boundary.**
- **One parent slot may feed several inputs.** To unpack an object, give each input its own path: `{ "title": "book.title", "author": "book.author" }`.
- A path's root is parent scope and follows a slot rename; the map's keys are the sub-flow's inputs and never do.
- Empty `outputs` means side effects only. `flow.invoke` writes no primary output slot; its outputs are the `outputs[]` rows' `parentSlot` names.
- The sub-flow returns only the output slots it binds. `subFlowSlot` in an `outputs[]` row names one of them; a slot a sub-flow action wrote and the sub-flow did not bind never reaches the parent.
- **A call may continue past its sub-flow's failure**: `"onFailure": "continue"` on the `flow.invoke` action, whatever the called flow writes. The call is a scope — when the sub-flow fails, everything it staged is dropped, none of the call's outputs is written, and the action's `failureSlot`, when it names one, holds `sub-flow-failed` with the cause's code. The parent carries on and the run closes `partial`. Guard every reader of the call's outputs with `slotPresent`. Refused on a call writing a slot a required flow output is bound to, and when the called flow reads or writes run state (`RUN_CONTINUE_NOT_ALLOWED`). A sub-flow that failed for the platform's own reasons, a spend cap or a cancel still fails the run.
- The validator refuses a cycle, a depth over the limit, a cross-project target, and two output rows that read the same `subFlowSlot` (`FLOW_INVOKE_DUPLICATE_OUTPUT`). Two inputs reading the same parent slot are not duplicates.
- **You never state `derivedShape`.** The platform types each `outputs[]` row from the sub-flow action that writes `subFlowSlot` — on a single action save and in a document alike, including for a sub-flow the same document creates. A document that rewrites a sub-flow's actions re-types every action calling it, restated or not; a single action save of the sub-flow does not, so save the calling action again — until then health says `FLOW_INVOKE_DERIVED_SHAPES_STALE`. A mapped slot no sub-flow action writes has no type.
- **Leave `inputStreams`, `inputSchemas` and `outputSlot` to the platform.** An action save — single or document — derives the inputs from the slots the `inputs` map reads (each path's root, each expression's top-level names), types them from the flow it calls, and mirrors the first output's `parentSlot` into `outputSlot`. A list you state is replaced by the derived one, in a document as on a single save, so there is nothing to keep in sync. Other action fields as in `first-flow.md` §8:

```json
"brief": {
  "functionKey": "flow.invoke",
  "functionConfig": {
    "target": "write-brief",
    "inputs": {
      "points": "allPoints",
      "tone": { "literal": "neutral" }
    },
    "outputs": [
      { "subFlowSlot": "brief", "parentSlot": "draft" }
    ]
  },
  "condition": { "op": "slotPresent", "slot": "allPoints" }
}
```

### A run for each person

A run that acts for nobody — a schedule, a trigger, an API key — cannot write a person's own records. To do something for each person, start a flow once per person with `flow.start-per-person`: `targetFlowId` (in a document: `target`), the same `inputs` map as `flow.invoke`, and `people`:

- `{ "kind": "project" }` — everyone in the project;
- `{ "kind": "linked", "relationId": …, "recordId": … }` — the people who own a record linked to one record (the followers of a feed), each once;
- `{ "kind": "list", "userIds": … }` — ids an earlier action produced; ids that are not in the project are dropped.

Each run acts for its person, so the target flow writes that person's records, and the project pays. The runs start once the starting run saves, so a failed run starts nobody, and a start replayed after a crash starts nobody twice. The action answers a `PeopleStartResult` — how many, never who. A preview starts nobody and answers `preview: true`. It refuses in a run that already acts for a person (`START_NEEDS_NO_PERSON`) and a set over the limit (`PEOPLE_SET_TOO_LARGE`).

**A few named people, without a run each.** When a schedule or a trigger only writes a record for each of a few people it already holds the ids of, a record writer can name the person itself: `record.create`, `record.update`, `record.delete`, `record.append`, `record.teardown`, `record.enqueue-process`, `record.link-assert` and `record.link-retract` take an optional `userId`, and so do `source.watch` and `source.unwatch`, so a schedule can hold a channel with a person's own follow and the watch ends with their account. In a run that acts for nobody the write then acts for that person — a create is owned by them, an update or delete reaches their records and the pool, never another person's — and a person who is not an active member of the project fails the action `PERSON_NOT_IN_PROJECT`. In a run that acts for a person, `userId` may name only that person (`PERSON_NOT_THE_RUNS`). `record.enqueue-process` for a named person is paid by the project. Saving a flow that a schedule or trigger runs, which writes a person's record with no `userId`, carries the warning `NO_PERSON_WRITES_PERSON_RECORDS`: that write fails every time the schedule runs.

**A schedule writes each person's inbox, then pushes.** The usual shape for "every morning, tell each follower what is new":

1. a schedule runs `morning`, which starts `digest` once per person: `flow.start-per-person` with `people: { "kind": "linked", … }` over the follow relation;
2. `digest` runs as that person: it reads what is new for them, writes their `alert` records with `record.create`, and ends with `push.send` (`recipient` left as the run's own person) whose title and body come from those records.

Each person's run writes only their own records, a person who left the project before their run starts is skipped, and a preview of `morning` starts nobody.

## 4. Loop

**Shape:** `flow.loop` (opener) → the body → `flow.loop-end` (closer).

- **Do not loop to page a record read.** `record.list`, and a `record.query` with no phrase over one table, take `"pages": { "max": N }` and read every page in the one action, in order, each record once. A first page plus N passes is `max: N + 1`. Records left after the last page fail the action `RECORD_READ_HAS_MORE` unless `"onMore": "stop"`, which answers what was read and a `nextCursor` — and covers the slot size too (one slot holds about 2,400 short records). A read without `pages` whose `nextCursor` nothing reads warns `RECORD_LIST_CURSOR_UNREAD`; `"pages": { "max": 1, "onMore": "stop" }` says one page is what you meant. `kipory-data`'s `references/in-flow-record-functions.md` has the rules.

- The opener's `outputSlot` **is the carry slot** the body reads each iteration. `seed` maps each carry slot to an argument — a slot path, a fixed value (`{ "literal": 0 }`, any JSON) or an expression. `maxIterations` (default 10) is a safety backstop, not the control.
- **`onMaxIterations` defaults to `fail`**: a loop that reaches its cap with `until` still false fails the closer, and the run with it. For a bounded refine ("improve it at most three times") set `"onMaxIterations": "proceed"` on the opener (`flow.loop`) — the last pass's values leave the loop and the run carries a warning instead.
- The closer's `until` is a **condition stored in config**, not the action's own `condition`, so it never becomes a dependency-cycle edge. It is checked after each iteration — do-while, so a loop that starts runs its body at least once.
- **A loop whose seed never arrived does not start.** When none of the slots its `seed` reads was written, the opener, the body and the closer are all skipped, and an action that reads only the closer's slots is skipped with them. A seed written empty (`""`, `[]`) still starts the loop: an empty accumulator is a start. A loop seeded only by fixed values always starts. So a loop whose seed is skipped needs no condition of its own (a loop marker takes none, `LOOP_CONDITION_ON_MARKER`).
- **A numeric compare needs an object.** `slotLt`, `slotGt`, `slotLte` and `slotGte` require a `path` to a number field, in `until` as in any condition, so a bare number slot cannot be compared. Emit an object from a transform — `{"words": $count($split(draft, " "))}` into `measure` — and stop on `{ "op": "slotLt", "slot": "measure", "path": "words", "value": 80 }`.
- `carryMap` is `{ bodySlot: carrySlot }`: the key is a slot an action inside the loop writes, the value the carry slot it feeds on the next pass. The carry is **replaced** each iteration, not accumulated. A key no action inside the loop writes is refused on the closer's save, `LOOP_CARRY_REFERENCES_UNKNOWN_SLOT`.
- The closer requires its own config `outputSlot` — the slot outside the loop that receives the last pass's value of the **first** `carryMap` key's body slot; the row's `outputSlot` mirrors it.
- **A model action inside the body sets `"reuseResultsForMinutes": 0`.** `text.generate`, `pdf.parse` and the other functions that save results would otherwise hand every iteration the first answer, and health flags the action `LOOP_BODY_CACHE_FORBIDDEN` until the period is `0`.
- `escapeSlots` is a **rename map** `{ innerSlot: outerSlot }`: an inner slot's last-pass value published under a fresh outer name whose sole producer is the loop-end. Publishing under the same name would pull downstream consumers back into the body and re-run them per iteration.

## 5. Branch

**Shape:** `flow.dispatch` with ordered `rules[]` of `{ pattern, outputSlot }` and an optional `default: { outputSlot }`.

- Rules are evaluated in order; **first match wins**. With no `default`, an unmatched input is **silently skipped**, and so is every action below the unwritten branch slot that reads nothing else. A branch action that also reads a present slot (the list of points, say) runs anyway — give it `"condition": { "op": "slotPresent", "slot": "<its branch slot>" }`.
- `matchOn` chooses what is compared — the value itself, the URL host, or a named field of an object or file input — but **the original input is what is forwarded**: a file in stays a file out.
- `patternSyntax` is `regex` (validity checked at save) or `glob` (`*` only, always case-insensitive, ignores `flags`).
- The row's `outputSlot` is a mirror; the real writes land in the slots the rules name.
- **The branch slots are typed by the action's `outputSchema`, which defaults to text.** Forwarding anything else — a file, an object — set `outputSchema` to that type (`{ "kind": "ref", "ref": "file" }` in a document), or every reader of a branch slot is refused with a type mismatch.

```json
"functionConfig": {
  "matchOn": { "field": "mime" },
  "rules": [{ "pattern": "^application/pdf$", "outputSlot": "pdfFile" }],
  "default": { "outputSlot": "textFile" }
}
```

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

## Utilities you will reach for

- `value.first-non-empty` — an ordered `inputs` list of slots or paths; emits the first non-empty **preserving its runtime shape**, which is what lets it coalesce a URL string and a file. `valueKind` narrows to `string` or `file`. `inputStreams` must list the root slot of every entry in `inputs`, no more and no fewer.
- `text.interpolate` — a prompt template and nothing else; makes no model call and cannot emit a list. Use it for prose with holes, and `value.transform` for computation.
- `record.read` — `ids` must hold a **list** of ids, or of objects carrying `id` (a `RecordPage`'s rows: `"page.records"`). A record search's hits carry `recordId`, not `id`: name `hits[].recordId`. A single id string — or a path that resolves to one, such as `created.recordId` — reads nothing, and with `failIfEmpty` that is a 404: give it as a one-item list in the setting itself, `"ids": { "expr": "[bookId]" }` — no transform.
- `list.concat` — an ordered `inputs` list of slots; flattens lists, lifts scalars to one-element lists, and joins them in the order given. `strategy` is `concat` or `dedup-concat`. It collects contributions from parallel sources **without needing a fan-out and merge pair**, which is the cheaper answer whenever the branches were never really a fan-out.
- `record.query` — the one function that joins: records matching several clauses at once (a field, a term, a link to a matching peer, a phrase by meaning), with values read from slots. `records-and-endpoints.md` §9 has the clause grammar.
- `record.view` — the same read declared once as a view and named by key; prefer it whenever the read's values are the caller's own sets or the request's params rather than something an earlier action computed (`records-and-endpoints.md` §11).

### `value.transform`

One JSONata `expression`; nothing else in a flow computes.

- **A read's records are typed by their table, and the save checks what you read off them.** A `record.list`, `record.read` or `record.query` knows the fields it asks for in `fields` (every field when it names none), the members its `include` adds, and its `linked` records. `GET /v1/actions/input-options` and `GET /v1/flows/{id}/scope` show each read's `rowType`. A path naming a field the record does not have — `books.records.titel`, or `linked.author.nmae` — is refused `JSONATA_FIELD_UNKNOWN` with the field's nearest name (`"did you mean title?"`); a field the table has but the read leaves out says to add it to `fields`. The same holds for an input path (`records[0].titel`) and a condition on a record field (`CONDITION_FIELD_UNKNOWN`). Only a sure miss is reported: through `$map`/`$each` results, a computed `$lookup`, `*`, `**` or a sub-flow's output nothing is checked.
- **Old actions are warned, new and changed ones are refused.** An action saved before this check, or one a table edit made wrong, is `JSONATA_FIELD_UNKNOWN_STORED` on health and never blocks a save; the error is for an action you create or whose expression, inputs or condition you change. Removing a table field that actions still read, retyping it, or dropping a processing flow's output they read is refused with one 422 `VALIDATION_FAILED`, a `TABLE_FIELD_STILL_READ` finding per reading action on `details.diagnostics`: change the readers first, or state the change and the readers together in one project document (its plan judges what both leave). A retype or a flow output change cannot be done row by row — the reader you change first is judged against the field as it still is — so use the document. To rename a type's own field, `PATCH /v1/types/{id}` with `renameFields` moves the stored values and rewrites the readers it can.
- **Pin what an expression does with `examples`.** Up to 5 per action:
  ```json
  {
    "expression": "books.records.{ \"t\": title }",
    "examples": [
      {
        "input": {
          "books": {
            "records": [
              {
                "id": "b1",
                "status": "READY",
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z",
                "title": "Dune"
              },
              {
                "id": "b2",
                "status": "READY",
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z",
                "title": "Emma"
              }
            ]
          }
        },
        "output": [{ "t": "Dune" }, { "t": "Emma" }]
      }
    ]
  }
  ```
  Every save runs them with the run's own evaluator and refuses one whose output changed (`TRANSFORM_EXAMPLE_FAILED`, naming the first place they differ); `{ "input": …, "absent": true }` pins "gives nothing". Key `input` by the names the expression reads. Write made-up values, never ones copied from a run. An input from a read is the read's whole answer: a `record.list` input is `{ "records": [...] }`, and a `record.query` input also carries `"bounded": false` and `"explanation": { "clauses": [], "pushdown": { "ids": 0, "cap": 0, "mode": "none" } }` (its `RecordQueryPage` type; `GET /v1/types?project=<nodeId>&key=RecordQueryPage`). A refusal names every member an input is missing.
- **Try one action without running the flow: `POST /v1/actions/evaluate`** with the action (`{ "id": … }` or a draft) and `slots`, or `fromRun` to use a recorded run's values. It answers the value, its time and its parts, and writes nothing:

  ```json
  {
    "project": "<project node id>",
    "action": {
      "draft": {
        "flowId": "<a saved flow's id>",
        "functionKey": "value.transform",
        "functionConfig": { "expression": "books.records.{ \"t\": title }" }
      }
    },
    "slots": {
      "books": {
        "records": [
          {
            "id": "b1",
            "status": "READY",
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z",
            "title": "Dune"
          }
        ]
      }
    }
  }
  ```
  - **A draft is not the action create body.** It takes `flowId`, `functionKey`, `functionConfig`, the wiring (`inputStreams`, `inputPaths`, `inputProjectionNames`), `promptTemplate`, `systemPrompt`, `inputSchemas`, `outputSchema`, `key`, and run settings under `run` (`timeoutMs`). No `outputSlot`, `condition` or `taskKey`: an unknown member is 422 `VALIDATION_FAILED`. Leave `inputStreams` out (or empty) and they are read from the expression, as a save does — then leave `inputPaths`, `inputProjectionNames` and `inputSchemas` out too, since they line up with it by position; `slots` is keyed by those names.
  - **The flow must already be saved**, since the draft names it by id. To try a transform before the document that creates its flow, apply the flow with its reads first, evaluate, then apply the transform.
  - **Who may call it and what it costs.** A transform, `value.first-non-empty`, `list.concat` and `text.interpolate` (exactly these four) run free at EDITOR. A record read (`record.list`, `record.read`, `record.query`) runs read-only at ADMIN and is billed as a preview; a `record.query` with a `semantic` clause is refused `ACTION_EVALUATE_UNSUPPORTED`, as is any other function — use the flow preview. A project may evaluate 120 times a minute; past that, 429 `RATE_LIMITED`.

- **Top-level identifiers are slot names**, which the save reads into `inputStreams` when you leave it out. A list you send must be exactly those names — the save refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH` (`action-fields.md`, inputs the platform derives).
- **Only a name at the top of the expression is a slot.** Inside a predicate `[...]`, after a `.` (`docs.{"id": id}`), in a group-by or a sort, a bare name is a field of each item (after a focus binding `list@$e` it reads the outer context instead), and the save does not count it as an input: `meaning.scores[score > 0.5]` reads the slot `meaning` and each score's `score`. A lambda body written at the top counts as the top: `$map(docs, function($d){ title })` reads the slot `title`.
- **To read a slot from inside a predicate or after a `.`, write `$$.name`** (or bind it first). `cached.records[expiresAt > runInfo.now]` reads `runInfo` off each record, finds nothing, and filters every item out; `cached.records[expiresAt > $$.runInfo.now]` compares with the run's clock. The plan warns `JSONATA_ITEM_FIELD_NAMED_LIKE_SLOT` when an item field there is spelled like a slot the flow has; `$.name` reads the item's field and says so.
- **Index or filter an array constructor in parentheses.** `[$filter(xs, f)][0].id` is nothing, and so is `[xs][id = 1].name` when one item matches; `([$filter(xs, f)])[0].id` is the first item's `id`. The run says nothing, so the plan warns `JSONATA_INDEXED_LIST_FIELD_READS_NOTHING`.
- **A regex is read as a regex**: a backslash escapes the next character, and inside a class `[...]` only `]` ends it, so `[^)]`, `[^"\\]` and `\\(\[|\])` all read. A regex that never ends is refused `JSONATA_SYNTAX_ERROR` naming it ("The regular expression starting `/[a(b/…` has no closing `/`"), and an invalid one with the regex engine's own sentence.
- **JSONata has no `undefined` literal.** `undefined` at the top of an expression is read as a slot name, and the save refuses it as a missing input.
- **An expression is capped at 1,000 parts.** A part is one node of the parsed expression — roughly each name, operator, literal and function call — and a save over the cap is refused `JSONATA_EXPRESSION_TOO_COMPLEX` with the count in the message ("1,006 parts, and the limit is 1,000"). A plan shows every stated expression's size on its action's row (`expressionParts`), and warns `JSONATA_EXPRESSION_NEAR_LIMIT` from 800. Split the work into two or three transforms, each with a typed `outputSchema`, the later ones reading the earlier ones' slots. An expression cannot share a function with another action, so a helper used in two transforms is written in both.
- **An action's inputs together are capped at 1,000,000 characters of JSON**, and over it the action fails ("JSONata input bag is … exceeding the maximum of 1000000"; the message says bytes and counts characters). The count is the JSON of every input slot the action lists, so quotes and line breaks count twice, and each slot can itself hold up to 500,000 characters: two fetched pages, or a text beside the list of its own chunks, are enough. Read one large slot per transform, reduce it there, and combine the reduced values in a second action. `"onFailure": "continue"` on a transform that reads a fetched page keeps one oversized page from failing the run.
- **`x ?? d` gives `d` when `x` is missing** (`book[0].tags ?? []`); `$default(x, d)` also replaces `null`, empty text and an empty list. Both work in every expression: a transform, an `expr` argument, a `value.build` field and a condition.
- **`$sum` over nothing is nothing, not 0.** A path that matches no value is absent, and `$sum`, `$max`, `$min` and `$average` of an absent value are absent too, so `{"total": $sum(rows.amount)}` has no `total` when `rows` is empty and an action output typed `number` then fails. Arithmetic on nothing is nothing too, so `own.count + $sum(kids.n)` loses the whole count. Give the empty case its value: `$sum([rows.amount])` is 0 for no rows, `$max(rows.amount) ?? 0` gives a default, or `$count(rows) > 0 ? $sum(rows.amount) : 0`. `$count` of nothing is 0. The plan warns `JSONATA_AGGREGATE_OF_NO_ITEMS_IS_NOTHING` when such a call reaches arithmetic, directly or through a variable; and when the output check refuses a missing field, its message names the inputs that were empty on that run (`childEvents.records`).
- **`!=` against nothing is false, not true.** Any comparison with a missing value is false, so `$type(rows[0].id) != "string" ? row` gives nothing when there is no row — a "create it when it is missing" action that never creates. Write `$not($type(rows[0].id) = "string") ? row`, which is true when the value is missing. The plan warns `JSONATA_NOT_EQUAL_ON_MISSING_IS_FALSE` for `$type(…) != …` and for a field read through an index (`rows[0].status != "done"`), unless `$exists(…) and` or a `$count(…) > 0` guards it. A record row read by `record.read`, `record.list` or `record.query` leaves a field with no value out, so `$r.flag != true` over rows is false for an unset `flag` too, and the row drops out of a filter: write `$not($r.flag = true)`. The plan warns `JSONATA_ROW_FIELD_ABSENT_NOT_NULL` on such reads of a row's field, and `$default(x, d)` gives a value for one that is missing, `null`, empty text or an empty list.
- **A filter that matches nothing is nothing, not `[]`.** `$filter(rows, function($r){ $r.kept })` and `rows[kept]` yield no value when no element matches, so the action produces nothing: no slot is stored and an action reading only that slot is skipped. Where a reader needs a list every time, wrap the expression — `[rows[kept]]` is a list for none, one or many — and remember that `[]`, though stored and visible to a transform, still counts as absent to `slotPresent` and to an action's input gate.
- **Five functions are refused**, at save and at run time, with `JSONATA_FORBIDDEN_FUNCTION`: `$now`, `$millis`, `$random` and `$shuffle` (they break caching) and `$eval` (a sandbox escape — there is no parsing a JSON string back into an object).
- **The result is checked at run time against the action's `outputSchema`.** Left at the default `object`, it must be text, an object — whose fields may nest lists and objects — or a list of text or of objects; a bare number, boolean or `null`, a mixed list or a list of lists fails the action.
- **To emit nothing**, so a `slotPresent` guard downstream holds, write a conditional with no else — `$count(words) > 50 ? {"text": body}`. An action that produces nothing stores no slot, so every reader sees what a skipped action leaves:
  - an action reading only that slot is skipped, and a `slotPresent` condition on it is false;
  - in another `value.transform` the name is unbound — `$exists(page)` is false, a field read off `page` is nothing, and `{"a": page}` has no `a`;
  - a `flow.merge` gets no element from a fan-out branch that produced nothing;
  - a setting that reads it (a `fieldFilters` value, `ids`) sees a missing slot.
- **`{}` and an empty file are "nothing" from any action**, not only from a transform: a literal `{}` an expression returns, an object action that answered `{}`, and a file action whose vendor refused (`url.screenshot`, `url.fetch-as-file`) all store no slot. `""` and `[]` are different: they are stored, a transform sees them as an empty string and an empty list, and they still count as absent to `slotPresent` and to an action's inputs.
- An empty result skips the `outputSchema` check; a literal `{}` is checked against `outputSchema` first (and refused by a type with required fields). This holds whatever the declared type: an action declared `string` whose expression gives nothing (`$join` over no items, a path that matches nothing) stores no text, and a `{{name}}` reading it in a prompt leaves its place empty. Where a prompt needs the text every time, give the expression a fallback (`$exists(x) ? x : ""`).
- **A result that should be a list must be built as one.** JSONata returns a one-item sequence as the bare item, so a path, `$filter` or `$map` that matches exactly one element yields an object, and an action whose `outputSchema` is a list then fails at run time — a 502 on a sync call, after a plan and health that were clean, because nothing checks an expression's result before a run. Wrap the expression in `[ … ]`: `[$filter(hits, function($h){ $h.score > 0.5 })]` is a list for none, one or many.
- **A flow output bound to a slot whose action produced nothing is not set.** An optional output is left out of the response; a required one fails the run. Have the expression return a real value on every path, or mark the output optional. An empty list is a value: an output bound to a list that came back empty answers `[]`, and the run succeeds. Health warns `FLOW_REQUIRED_OUTPUT_MAY_BE_MISSING` when every action writing a required output may write nothing: it has a condition, answers a test with no `else`, is a dispatch branch or switched off, or is skipped — it reads only slots that may each be missing or an empty list, or a setting it needs (a query's operand, a loop's seed) may be missing. When it reads only possibly-empty slots, have it also read `runInfo` and it runs either way.
- **Preview both branches of any conditional before trusting it**: these result shapes are judged only when a run produces them.
- **`$assert(condition, "message")` refuses the call with your words** — a `422 VALIDATION_FAILED` (`records-and-endpoints.md` §8).
