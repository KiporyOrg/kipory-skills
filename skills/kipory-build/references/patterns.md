# Flow patterns

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

Four of the control shapes that wire most flows are here; fan-out and merge, and accumulating across branches, are `fan-out.md`. Each names the control functions involved and the one rule each has that is not obvious from its config table. Field names are the function's own config keys — see `functions/<key>.md` for the full table and a worked example.

The flow and record shapes are split by topic:

| Section   | Page                            | Answers                                                                                                                                                                      |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1, §3–§5 | `patterns.md`                   | an ingest pipeline, a sub-flow, a loop, a branch                                                                                                                             |
| §2, §6    | `fan-out.md`                    | fan-out and merge, accumulating across branches                                                                                                                              |
| —         | `utilities.md`                  | the small functions most flows use (`value.first-non-empty`, `text.interpolate`, `list.concat`, `record.read`) and `value.transform`'s JSONata habits                        |
| §7, §10   | `records-and-endpoints.md`      | a record's processing flow; a value rolled up from linked records                                                                                                            |
| §8        | `endpoint-answers.md`           | what an endpoint can answer: the body shape, rows, a 404, a 422 with your message, a 403 for a key, optional query filters, a filter on a list field, natural-key collisions |
| §9        | `record-query.md`               | `record.query`: a per-user feed, "due now", the clause grammar, and totals with `record.aggregate`                                                                           |
| §11       | `views.md`, `view-endpoints.md` | views: a read declared once, its sets, params and shapes; then `record.view` in a flow, the view endpoint that pages itself, ETag, the preview                               |

The section numbers are one sequence across these pages, so "§8" means the same section wherever it is cited. `models.md` holds which model function to use, `text.decide` questions, model bindings and prices.

## The three grammars, once

| Where                                        | Grammar                                                                                                                                                                                                                                  | Example                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| A slot name (`outputSlot`, `inputStreams[]`) | letters and digits, starting with a letter; **no underscore**                                                                                                                                                                            | `pageText`, `summary`                              |
| A prompt template (`promptTemplate`)         | `{{slot}}`, `{{slot.field}}`, `{{slot[0]}}`, sections `{{#slot}}…{{/slot}}`, filters `{{slot\|truncate:200}}`; never a numbered field (`{{appts.0.service}}` is sent as written — compute one item's field in a `value.transform` first) | `Summarise: {{pageText}}`                          |
| An input projection (`inputPaths[i]`)        | a structured path object with segments `field`, `first`, `last`, `index`, `pluck`, `wrap`, `distinct`, `compact` — never a string                                                                                                        | pluck `id` from a list, wrap one value into a list |
| A condition (`condition`)                    | a clause `{ op, slot, path?, … }`; `path` here **is** a dot-string. `not` wraps one clause (`inner`), `and` and `or` a list (`all`, `any`)                                                                                               | `{ op: "slotPresent", slot: "summary" }`           |
| A setting that reads a value (an argument)   | a slot path string, `{ "literal": … }` (a bare number or `true`/`false` too) or `{ "expr": "…" }` — `action-inputs.md` §7                                                                                                                | `"page.records[].id[distinct]"`                    |
| A computation                                | JSONata, in `value.transform`, in an argument's `expr`, in every `value.build` field (a bare string there too) and in an `expr` condition                                                                                                | `$count(items)`                                    |

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
- Two actions write a record. `record.update` (above) patches the record the run is processing — `recordId`, then `data` and/or `derived`. `record.create` makes a new one — `tableKey`, `data` and an optional `fileIds`; a run acting for nobody writes a per-user table only for a person it names in `userId`. Lifecycle is decided by the table: with no processing flow the new record is `READY`; with one it is `PENDING` until that flow has processed it, and a record a flow created is queued for it only by an `record.enqueue-process` action (`records-and-endpoints.md` §7).
- Bind the last slot. A flow whose required output is unbound is refused `422 FLOW_OUTPUT_MISSING` on every live call, and preview names the slot in `missingRequiredOutput`.
- **An action runs when any one of its inputs is present**, so a writer downstream of an action that produced nothing still runs on its other inputs. A provider slot counts when present: `projectInfo` and `runInfo` always are, and `userInfo` is on a signed-in run, so an action reading one beside a real slot runs without waiting for it — only an absent `userInfo` (a key, a schedule, a trigger) leaves the action waiting on its other inputs. "Present" means non-empty: `""` and `[]` count as absent, both here and for a `slotPresent` condition, and an action that produced `{}` or an empty file stored no slot at all. A source that fails softly (a vendor out of credit answers a warning and an empty page) then leads to a record written with a hole in it. Guard the write: `"condition": { "op": "slotPresent", "slot": "summary" }` on the writer.
- **To run an action only when a slot is absent, negate the guard on that action**: `"condition": { "op": "not", "inner": { "op": "slotPresent", "slot": "found" } }`. A condition is judged before the action's inputs and may name a slot the action does not read, so the action keeps its own inputs and no helper action is needed (`action-inputs.md` §5).
- **One failed action fails the run** (502, its writes discarded) even when a sibling succeeded, unless the action carries `"onFailure": "continue"`. `continue` is allowed on an action that writes nothing and on a sub-flow call (§3, below); it is refused on every other control action, on an action whose function may write, and on an action that writes a slot a required flow output is bound to. A run that carried on past a failure closes `partial`, not `succeeded`.
- A fallback for a page is `url.scrape` and `url.fetch` side by side into `value.first-non-empty`, with `"onFailure": "continue"` on the fetch (it fails the action on a 4xx or an unresolvable host) and a `slotPresent` guard on **every** action that reads the result beside another slot — a model action reading the page and the `url` otherwise runs on the URL alone and invents the page. `kipory-gather` owns the recipe: the strip expression, the types to coalesce and a no-vendor variant.

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
