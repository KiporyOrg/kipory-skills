# Flow patterns

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

Six control shapes cover how most flows are wired. Each names the control handlers involved and the one rule each has that is not obvious from its config table. Field names are the handler's own config keys — see `handlers/<key>.md` for the full table and a worked example.

The numbering runs on in two sibling files: `records-and-endpoints.md` holds §7 (a record's processing flow), §8 (what an endpoint answers: 404, 422, optional filters), §9 (`entity.query` and a per-user feed) and §10 (roll-ups); `models.md` holds which model handler to use, `text.decide` questions, model bindings and prices.

## The three grammars, once

| Where                                        | Grammar                                                                                                       | Example                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A slot name (`outputSlot`, `inputStreams[]`) | letters and digits, starting with a letter; **no underscore**                                                 | `pageText`, `summary`                              |
| A prompt template (`promptTemplate`)         | `{{slot}}`, `{{slot.field}}`, `{{slot[0]}}`, sections `{{#slot}}…{{/slot}}`, filters `{{slot\|truncate:200}}` | `Summarise: {{pageText}}`                          |
| An input projection (`inputPaths[i]`)        | a structured path object with segments `field`, `first`, `last`, `index`, `pluck`, `wrap` — never a string    | pluck `id` from a list, wrap one value into a list |
| A condition (`condition`)                    | a clause `{ op, slot, path?, … }`; `path` here **is** a dot-string                                            | `{ op: "slotPresent", slot: "summary" }`           |
| A computation                                | JSONata, in `value.transform` only                                                                            | `$count(items)`                                    |

Literals enter a flow in exactly three places: a `flow.invoke` input row of kind `literal`, a `flow.loop` `seedLiteral`, or a JSONata expression's own constants. A step's `inputStreams` cannot carry one.

A list slot in a prompt: a bare `{{points}}` holding a list of text renders as one line, items trimmed, empties dropped, joined with `, `. For one item per line use a section, `{{#points}}- {{.}}\n{{/points}}` (`{{@index}}` is the position); for a list of objects use `{{rows | json}}` or a section reading `{{rows.field}}`.

## 1. Ingest pipeline

**Shape:** a source handler → text handlers → a writer, with the terminal slot bound in the flow's `outputBinding`.

```
url.scrape (pageUrl → page) → text.generate (page → summary) → entity.update (summary → …)
```

- Ingest-phase handlers run in the async worker and carry a **queue**: retries, a wait ceiling, and a cache keyed on their input. Inline and control handlers have neither retry nor cache.
- `text.generate`'s config `temperature` and `reasoningEffort` are part of the cache key: changing either discards every cached answer for the same prompt. Higher reasoning effort dominates both time and the token bill.
- Two steps write a record. `entity.update` (above) patches the record the run is processing — `recordIdSlot`, then `dataSlot` and/or `derivedSlot`. `entity.create` makes a new one — `recordType`, `dataSlot` and an optional `fileIdsSlot`; a per-user record type refuses a key-driven run. Lifecycle is decided by the type: with no processing flow the new record is `READY`; with one it is `PENDING` until that flow has processed it, and a record a flow created is queued for it only by an `entity.enqueue-process` step (`records-and-endpoints.md` §7).
- Bind the last slot. A flow whose required output is unbound is refused `422 FLOW_OUTPUT_MISSING` on every live call, and preview names the slot in `missingRequiredOutput`.
- **A step runs when any one of its inputs is present**, so a writer downstream of a step that produced nothing still runs on its other inputs. A provider slot counts when present: `projectInfo` and `runInfo` always are, and `userInfo` is on a signed-in run, so a step reading one beside a real slot runs without waiting for it — only an absent `userInfo` (a key, a schedule, a trigger) leaves the step waiting on its other inputs. "Present" means non-empty: `""` and `[]` count as absent, both here and for a `slotPresent` condition, and a step that produced `{}` or an empty file stored no slot at all. A source that fails softly (a vendor out of credit answers a warning and an empty page) then leads to a record written with a hole in it. Guard the write: `"condition": { "op": "slotPresent", "slot": "summary" }` on the writer.
- **One failed step fails the run** (502, its writes discarded) even when a sibling succeeded, unless the step carries `"onFailure": "continue"`. `continue` is refused on a control step, on a step whose handler may write, and on a step that writes a slot a required flow output is bound to.
- A fallback for a page is `url.scrape` and `url.fetch` side by side into `value.first-non-empty`, with `"onFailure": "continue"` on the fetch (it fails the step on a 4xx or an unresolvable host) and a `slotPresent` guard on **every** step that reads the result beside another slot — a model step reading the page and the `url` otherwise runs on the URL alone and invents the page. `kipory-gather` owns the recipe: the strip expression, the types to coalesce and a no-vendor variant.

## 2. Fan-out and merge

**Shape:** a list slot → `flow.fan-out` → the body → `flow.merge`.

- `flow.fan-out` reads one **list-shaped** slot and emits the element schema, one branch per element.
- Any list fans out — text, files, objects, numbers or booleans — and each branch carries its element as it is, so a list of rows needs no flattening: the branch slot is typed as the list's element, and a body step reads a field of it like any object slot. That needs the element to be a named shape: a list whose `items` are written inline in its parent's definition has the anonymous `object` as its element, so the branch is an `object`, a `field` path into it is refused, and stating a named `outputSchema` on the fan-out is a `NOMINAL_MISMATCH`. Give the row its own schema entry and reference it from `items` (`kipory-model` has the form). `flow.merge` folds every one of those kinds back into a list of the same kind. Config: `dedupe` (default true: text compared exactly, a file by its key, an object by its value, so two identical rows run once), `maxItems` (default 20), `maxParallelBranches`, `branchTargetsAreDisjoint` (default false).
- **`maxItems` has a system ceiling, 100** unless the deployment changed it (`GET /v1/handlers` → the fan-out's `config` → `maximum`). A value above it is refused with `INVALID_HANDLER_CONFIG`, whose message names the setting and the bound ("`maxItems` must be at most 100"), and a document plan's finding points at `….handlerConfig.maxItems`. So one importer run takes at most 100 rows: split a larger file, or run the import once per chunk.
- **Absent `maxParallelBranches` means "decide from the graph"**: parallel when no step in the branch can reach a sibling, sequential otherwise. `1` is the only setting where a branch reliably sees what earlier ones wrote. `branchTargetsAreDisjoint` is a promise about the data, not a bigger number — it waives only the same-record check, and if two branches do hit one record, the last write wins.
- `flow.merge` is **multi-lane**: `lanes[]` of `{ sourceSlots, outputSlot, strategy }` with strategy `concat`, `list-union` or `dedup-concat`. The output is always a list. The row's `inputStreams` is the dedup of every lane's sources and its `outputSlot` mirrors the first lane.
- **`onBranchFailure` is a whole-merge policy**: `proceed` (default) merges what succeeded; `fail` writes no lane at all. Under `proceed` a merge where every branch failed writes `[]`. That counts as absent — a `slotPresent` guard on the merged slot holds and a step reading only it skips — but a step that also reads another present slot (the topic, say) still runs, on an empty list. Guard it on the merged slot.
- A merge must pair with an enclosing fan-out, and the pairing is derived from slot lineage, not creation order. A lane naming a slot no step in the branch writes always merges nothing — the validator says so.
- A fan-out inside another fan-out's branch multiplies: the plan warns `NESTED_FANOUT` with the worst case, the product of their `maxItems`. A fan-out that reads what an earlier one's merge gathered runs after it, not inside it, and draws no warning.
- Preview runs at most 5 branches per fan-out by default. `fanOutCap` on the preview body sets that preview-only cap — a number or `"uncapped"` — but never lifts a step's own `maxItems`, the ceiling a live run also has. It reports each truncation in `fanOutCaps` with what capped it.

## 3. Sub-flow

**Shape:** `flow.invoke` with `targetFlowId` (in a document: `target`, the flow's key, or `system:<key>`), an ordered `inputs[]` and an `outputs[]`.

- Each input row is `{ kind: "slot", parentSlot, subFlowSlot, path? }` — a parent slot piped in, projected before it crosses — or `{ kind: "literal", subFlowSlot, value }`. **Only mapped slots cross the boundary.**
- **One parent slot may feed several inputs.** To unpack an object, write one row per field: the same `parentSlot`, a different `path` and `subFlowSlot` on each. Each sub-flow input is filled by one row only.
- `parentSlot` is parent scope and follows a slot rename; `subFlowSlot` is the sub-flow's and never does.
- Empty `outputs` means side effects only. `flow.invoke` writes no primary output slot; its outputs are the config's `parentSlot` names.
- The sub-flow returns only the output slots it binds. `subFlowSlot` in an `outputs[]` row names one of them; a slot a sub-flow step wrote and the sub-flow did not bind never reaches the parent.
- The validator refuses a cycle, a depth over the limit, a cross-project target, two input rows that fill the same `subFlowSlot` (`FLOW_INVOKE_DUPLICATE_INPUT`), and two output rows that read the same `subFlowSlot` (`FLOW_INVOKE_DUPLICATE_OUTPUT`). Two input rows reading the same `parentSlot` are not duplicates.
- **You never state `derivedShape`.** The platform types each `outputs[]` row from the sub-flow step that writes `subFlowSlot` — on a single step save and in a document alike, including for a sub-flow the same document creates. A document that rewrites a sub-flow's steps re-types every step calling it, restated or not; a single step save of the sub-flow does not, so save the calling step again — until then health says `FLOW_INVOKE_DERIVED_SHAPES_STALE`. A mapped slot no sub-flow step writes has no shape.
- **Leave `inputStreams`, `inputSchemas` and `outputSlot` to the platform.** A step save — single or document — derives the inputs from the `kind: "slot"` input rows (each row's `parentSlot` in row order, its `path` beside it), types them from the flow it calls, and mirrors the first output's `parentSlot` into `outputSlot`. A list you state is replaced by the derived one, in a document as on a single save, so there is nothing to keep in step. Other step fields as in `first-flow.md` §8:

```json
"brief": {
  "handlerKey": "flow.invoke",
  "handlerConfig": {
    "target": "write-brief",
    "inputs": [
      { "kind": "slot", "parentSlot": "allPoints", "subFlowSlot": "points" },
      { "kind": "literal", "subFlowSlot": "tone", "value": "neutral" }
    ],
    "outputs": [
      { "subFlowSlot": "brief", "parentSlot": "draft" }
    ]
  },
  "condition": { "op": "slotPresent", "slot": "allPoints" }
}
```

## 4. Loop

**Shape:** `flow.loop` (opener) → the body → `flow.loop-end` (closer).

- The opener's `outputSlot` **is the carry slot** the body reads each iteration. Seeds are two maps keyed by carry slot: `seedFrom` (carry slot → a slot) and `seedLiteral` (carry slot → a string) — a carry slot appears in one, never both. `maxIterations` (default 10) is a safety backstop, not the control.
- **`onMaxIterations` defaults to `fail`**: a loop that reaches its cap with `until` still false fails the closer, and the run with it. For a bounded refine ("improve it at most three times") set `"onMaxIterations": "proceed"` on the opener (`flow.loop`) — the last pass's values leave the loop and the run carries a warning instead.
- The closer's `until` is a **condition stored in config**, not the step's own `condition`, so it never becomes a dependency-cycle edge. It is checked after each iteration — do-while, so the body always runs at least once.
- **A numeric compare needs an object.** `slotLt`, `slotGt`, `slotLte` and `slotGte` require a `path` to a number field, in `until` as in any condition, so a bare number slot cannot be compared. Emit an object from a transform — `{"words": $count($split(draft, " "))}` into `measure` — and stop on `{ "op": "slotLt", "slot": "measure", "path": "words", "value": 80 }`.
- `carryMap` is `{ bodySlot: carrySlot }`: the key is a slot a step inside the loop writes, the value the carry slot it feeds on the next pass. The carry is **replaced** each iteration, not accumulated. A key no step inside the loop writes is refused on the closer's save, `LOOP_CARRY_REFERENCES_UNKNOWN_SLOT`.
- The closer requires its own config `outputSlot` — the slot outside the loop that receives the last pass's value of the **first** `carryMap` key's body slot; the row's `outputSlot` mirrors it.
- **A model step inside the body sets `"reuseResultsForMinutes": 0`.** `text.generate`, `text.embed`, `pdf.parse` and the other handlers that save results would otherwise hand every iteration the first answer, and health flags the step `LOOP_BODY_CACHE_FORBIDDEN` until the period is `0`.
- `escapeSlots` is a **rename map** `{ innerSlot: outerSlot }`: an inner slot's last-pass value published under a fresh outer name whose sole producer is the loop-end. Publishing under the same name would pull downstream consumers back into the body and re-run them per iteration.

## 5. Branch

**Shape:** `flow.dispatch` with ordered `rules[]` of `{ pattern, outputSlot }` and an optional `default: { outputSlot }`.

- Rules are evaluated in order; **first match wins**. With no `default`, an unmatched input is **silently skipped**, and so is every step below the unwritten branch slot that reads nothing else. A branch step that also reads a present slot (the list of points, say) runs anyway — give it `"condition": { "op": "slotPresent", "slot": "<its branch slot>" }`.
- `matchOn` chooses what is compared — the value itself, the URL host, or a named field of an object or file input — but **the original input is what is forwarded**: a file in stays a file out.
- `patternSyntax` is `regex` (validity checked at save) or `glob` (`*` only, always case-insensitive, ignores `flags`).
- The row's `outputSlot` is a mirror; the real writes land in the slots the rules name.
- **The branch slots are typed by the step's `outputSchema`, which defaults to text.** Forwarding anything else — a file, an object — set `outputSchema` to that type (`{ "kind": "ref", "ref": "file" }` in a document), or every reader of a branch slot is refused with a type mismatch.

```json
"handlerConfig": {
  "matchOn": { "field": "mime" },
  "rules": [{ "pattern": "^application/pdf$", "outputSlot": "pdfFile" }],
  "default": { "outputSlot": "textFile" }
}
```

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
- Under `flow.fan-out` the ordering rules still apply — with `maxParallelBranches` unset, branches
  may run in parallel, and only `1` makes a branch reliably see what an earlier one wrote. `add`
  and `union` are the ops that are safe regardless of order; `set` is the one that is not.

## Utilities you will reach for

- `value.first-non-empty` — an ordered `inputs` list of slots or paths; emits the first non-empty **preserving its runtime shape**, which is what lets it coalesce a URL string and a file. `valueKind` narrows to `string` or `file`. `inputStreams` must list the root slot of every entry in `inputs`, no more and no fewer.
- `text.interpolate` — a prompt template and nothing else; makes no model call and cannot emit a list. Use it for prose with holes, and `value.transform` for computation.
- `entity.read` — `idsSlot` must hold a **list** of ids, or of objects carrying `id` (a `RecordPage`'s rows: `"page.records"`). A record search's hits carry `recordId`, not `id`: name `hits[].recordId`. A single id string — or a path that resolves to one, such as `created.recordId` — reads nothing, and with `failIfEmpty` that is a 404: wrap it first — `value.transform` with `[id]`.
- `list.concat` — an ordered `inputs` list of slots; flattens lists, lifts scalars to one-element lists, and joins them in the order given. `strategy` is `concat` or `dedup-concat`. It collects contributions from parallel sources **without needing a fan-out and merge pair**, which is the cheaper answer whenever the branches were never really a fan-out.
- `entity.query` — the one handler that joins: records matching several clauses at once (a field, a term, a link to a matching peer, a phrase by meaning), with values read from slots. `records-and-endpoints.md` §9 has the clause grammar.

### `value.transform`

One JSONata `expression`; nothing else in a flow computes.

- **Top-level identifiers are slot names**, which the save reads into `inputStreams` when you leave it out. A list you send must be exactly those names — the save refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH` (`step-fields.md`, inputs the platform derives).
- **A bare name at the start of any path is a slot**, including one inside a projection: `docs.{"id": id}` reads a slot `id`. Reach into list items through a bound variable — `$map(docs, function($d){ {"id": $d.id} })`.
- **JSONata has no `undefined` literal.** `undefined` is read as a slot name, and the save refuses it as a missing input.
- **Five functions are refused**, at save and at run time, with `JSONATA_FORBIDDEN_FUNCTION`: `$now`, `$millis`, `$random` and `$shuffle` (they break caching) and `$eval` (a sandbox escape — there is no parsing a JSON string back into an object).
- **The result is checked at run time against the step's `outputSchema`.** Left at the default `object`, it must be text, an object — whose fields may nest lists and objects — or a list of text or of objects; a bare number, boolean or `null`, a mixed list or a list of lists fails the step.
- **To emit nothing**, so a `slotPresent` guard downstream holds, write a conditional with no else — `$count(words) > 50 ? {"text": body}`. A step that produces nothing stores no slot, so every reader sees what a skipped step leaves:
  - a step reading only that slot is skipped, and a `slotPresent` condition on it is false;
  - in another `value.transform` the name is unbound — `$exists(page)` is false, a field read off `page` is nothing, and `{"a": page}` has no `a`;
  - a `flow.merge` gets no element from a fan-out branch that produced nothing;
  - a slot-valued setting (`fieldFilterSlots`, `idsSlot`) sees a missing slot.
- **`{}` and an empty file are "nothing" from any step**, not only from a transform: a literal `{}` an expression returns, an object step that answered `{}`, and a file step whose vendor refused (`url.screenshot`, `url.fetch-as-file`) all store no slot. `""` and `[]` are different: they are stored, a transform sees them as an empty string and an empty list, and they still count as absent to `slotPresent` and to a step's inputs.
- An empty result skips the `outputSchema` check; a literal `{}` is checked against `outputSchema` first (and refused by a shape with required fields).
- **A result that should be a list must be built as one.** JSONata returns a one-item sequence as the bare item, so a path, `$filter` or `$map` that matches exactly one element yields an object, and a step whose `outputSchema` is a list then fails at run time — a 502 on a sync call, after a plan and health that were clean, because nothing checks an expression's result before a run. Wrap the expression in `[ … ]`: `[$filter(hits, function($h){ $h.score > 0.5 })]` is a list for none, one or many.
- **A flow output bound to a slot whose step produced nothing is not set.** An optional output is left out of the response; a required one fails the run. Have the expression return a real value on every path, or mark the output optional.
- **Preview both branches of any conditional before trusting it**: these result shapes are judged only when a run produces them.
- **`$assert(condition, "message")` refuses the call with your words** — a `422 VALIDATION_FAILED` (`records-and-endpoints.md` §8).
