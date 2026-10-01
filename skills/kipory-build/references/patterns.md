# Flow patterns

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: isDesign — one project's example field name, not a platform field -->
<!-- field-ok: isTech — one project's example field name, not a platform field -->

Six shapes cover most flows, plus the one a record type runs on its own records. Each names the control handlers involved and the one rule each has that is not obvious from its config table. Field names are the handler's own config keys — see `handlers/<key>.md` for the full table and a worked example.

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
- Two steps write a record. `entity.update` (above) patches the record the run is processing — `recordIdSlot`, then `dataSlot` and/or `derivedSlot`. `entity.create` makes a new one — `recordType`, `dataSlot` and an optional `fileIdsSlot`; a per-user record type refuses a key-driven run. Lifecycle is decided by the type: no processing flow → READY; a flow → PENDING until the flow runs `entity.enqueue-process`.
- Bind the last slot. A flow whose required output is unbound is refused `422 FLOW_OUTPUT_MISSING` on every live call, and preview names the slot in `missingRequiredOutput`.
- **A step runs when any one of its inputs is present**, so a writer downstream of a step that produced nothing still runs on its other inputs. A provider slot counts when present: `projectInfo` and `runInfo` always are, and `userInfo` is on a signed-in run, so a step reading one beside a real slot runs without waiting for it — only an absent `userInfo` (a key, a schedule, a trigger) leaves the step waiting on its other inputs. "Present" means non-empty: `""`, `[]`, `{}` and an empty file count as absent, both here and for a `slotPresent` condition. A source that fails softly (a vendor out of credit answers a warning and an empty page) then leads to a record written with a hole in it. Guard the write: `"condition": { "op": "slotPresent", "slot": "summary" }` on the writer.
- A fallback for a page: run `url.scrape` and `url.fetch` side by side on the same URL, strip the fetched HTML to text in a `value.transform`, then `value.first-non-empty` with `inputs` `["page.content", "plain"]` — scrape first, the first non-empty wins, `valueKind: "string"`, `outputSchema` `string`. Coalesce text with text: the scrape emits a `ScrapedPage` object and the fetch a raw HTML string, so the bare pair mixes types. `kipory-gather` has the strip expression and a no-vendor variant (`url.fetch` plus `url.metadata` for the title). Guard **every** step that reads the result beside another slot with `slotPresent` on the result — a model step reading the page and the `url` otherwise runs on the URL alone and invents the page. Set `"onFailure": "continue"` on the fetch: it fails the step on a 4xx or an unresolvable host, and **one failed step fails the run** (502, its writes discarded) even when its sibling succeeded. `continue` is allowed only on a step that writes nothing and does not itself write a slot the flow returns.

## 2. Fan-out and merge

**Shape:** a list slot → `flow.fan-out` → the body → `flow.merge`.

- `flow.fan-out` reads one **list-shaped** slot and emits the element schema, one branch per element.
- Any list fans out — text, files, objects, numbers or booleans — and each branch carries its element as it is, so a list of rows needs no flattening: the branch slot is typed as the list's element, and a body step reads a field of it like any object slot. `flow.merge` folds every one of those kinds back into a list of the same kind. Config: `dedupe` (default true: text compared exactly, a file by its key, an object by its value, so two identical rows run once), `maxItems` (default 20), `maxParallelBranches`, `branchTargetsAreDisjoint` (default false).
- **`maxItems` has a system ceiling, 100** unless the deployment changed it (`GET /v1/handlers` → the fan-out's `config` → `maximum`). A value above it is refused with `INVALID_HANDLER_CONFIG`, whose message names the setting and the bound ("`maxItems` must be at most 100"), and a document plan's finding points at `….handlerConfig.maxItems`. So one importer run takes at most 100 rows: split a larger file, or run the import once per chunk.
- **Absent `maxParallelBranches` means "decide from the graph"**: parallel when no step in the branch can reach a sibling, sequential otherwise. `1` is the only setting where a branch reliably sees what earlier ones wrote. `branchTargetsAreDisjoint` is a promise about the data, not a bigger number — it waives only the same-record check, and if two branches do hit one record, the last write wins.
- `flow.merge` is **multi-lane**: `lanes[]` of `{ sourceSlots, outputSlot, strategy }` with strategy `concat`, `list-union` or `dedup-concat`. The output is always a list. The row's `inputStreams` is the dedup of every lane's sources and its `outputSlot` mirrors the first lane.
- **`onBranchFailure` is a whole-merge policy**: `proceed` (default) merges what succeeded; `fail` writes no lane at all. Under `proceed` a merge where every branch failed writes `[]`. That counts as absent — a `slotPresent` guard on the merged slot holds and a step reading only it skips — but a step that also reads another present slot (the topic, say) still runs, on an empty list. Guard it on the merged slot.
- A merge must pair with an enclosing fan-out, and the pairing is derived from slot lineage, not creation order. A lane naming a slot no step in the branch writes always merges nothing — the validator says so.
- Preview runs at most 5 branches per fan-out by default. `fanOutCap` on the preview body sets that preview-only cap — a number or `"uncapped"` — but never lifts a step's own `maxItems`, the ceiling a live run also has. It reports each truncation in `fanOutCaps` with what capped it.

## 3. Sub-flow

**Shape:** `flow.invoke` with `targetFlowId` (in a document: `target`, the flow's key, or `system:<key>`), an ordered `inputs[]` and an `outputs[]`.

- Each input row is `{ kind: "slot", parentSlot, subFlowSlot, path? }` — a parent slot piped in, projected before it crosses — or `{ kind: "literal", subFlowSlot, value }`. **Only mapped slots cross the boundary.**
- `parentSlot` is parent scope and follows a slot rename; `subFlowSlot` is the sub-flow's and never does.
- Empty `outputs` means side effects only. `flow.invoke` writes no primary output slot; its outputs are the config's `parentSlot` names.
- The sub-flow does **not** need a declared signature. With an output binding it behaves as a typed function; with none, the raw produced slots are spliced back.
- The validator refuses a cycle, a depth over the limit, a cross-project target, and duplicate input or output rows.
- **You never state `derivedShape`.** The platform types each `outputs[]` row from the sub-flow step that writes `subFlowSlot` — on a single step save and in a document alike, including for a sub-flow the same document creates. A document that rewrites a sub-flow's steps re-types every step calling it, restated or not; a single step save of the sub-flow does not, so save the calling step again — until then health says `FLOW_INVOKE_DERIVED_SHAPES_STALE`. A mapped slot no sub-flow step writes has no shape.
- **Leave `inputStreams`, `inputSchemas` and `outputSlot` to the platform.** A step save — single or document — derives the inputs from the `kind: "slot"` input rows (each row's `parentSlot` in row order, its `path` beside it), types them from the flow it calls, and mirrors the first output's `parentSlot` into `outputSlot`. A document writes a list you DO state as stated, and nothing compares it with the rows, so state one only to match them exactly. Other step fields as in `first-flow.md` §8:

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
  "condition": { "op": "slotPresent", "slot": "allPoints" },
  "inputStreams": ["allPoints"],
  "inputSchemas": [{ "kind": "list", "element": { "kind": "ref", "ref": "string" } }],
  "outputSlot": "draft",
  "outputSchema": null
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
- `state.read` reads no slots at all, which means **nothing orders it against the writes**.
  `state.write` emits a marker for exactly this reason: wire that marker into the read to put the
  read after the write. Skip that and you will read a cell before the branch that filled it ran.
- The shape depends on the op: `set` and `add` cells read back as a string, `append` and `union` as
  a list.
- Under `flow.fan-out` the ordering rules still apply — with `maxParallelBranches` unset, branches
  may run in parallel, and only `1` makes a branch reliably see what an earlier one wrote. `add`
  and `union` are the ops that are safe regardless of order; `set` is the one that is not.

## 7. Process a record on ingest

**Shape:** a record type bound to a **processing flow**; each record the type receives runs it once, and the flow's outputs become the record's `derived` fields.

The contract the flow is held to:

- **Its inputs are named after the record.** Each input slot reads the submitted field of the same name. Three more names come from the record row itself: `recordId` (string), `createdAt` (ISO timestamp) and `files` — the files attached to the record, as a list of files (declare `{ "slot": "files", "typeName": "file", "isList": true }`). Binding the flow refuses a required input that is none of those three and not a required field of the type's shape; a field the shape leaves optional is an input with `"required": false`.
- **It declares at least one output**, or binding it is refused with `RECORD_TYPE_OUTPUT_EMPTY`. A flow that only files terms or writes elsewhere still needs one — bind a small computed value.
- **A value a handler's config names by slot must be produced by a step.** Some config slots (`facet.resolve`'s `deterministicSlots`, for one) refuse a flow input directly with `…_UNRESOLVED "has no producing node"`; put a `value.transform` in between.
- **Records wait for it.** A type with a processing flow creates records `PENDING`. A record created through the records API is queued for processing on its own; a record a flow creates with `entity.create` is not — that flow must run `entity.enqueue-process` after it.

In a document:

```json
{
  "kipory": 2,
  "schema": {
    "Note": {
      "definition": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "body": { "type": "string" }
        },
        "required": ["title", "body"]
      }
    }
  },
  "flows": {
    "summarise-note": {
      "label": "Summarise note",
      "inputTypeNames": [{ "slot": "body", "typeName": "string" }],
      "outputTypeNames": [
        { "slot": "summary", "typeName": "string", "required": true }
      ],
      "outputBinding": { "summary": { "fromSlot": "summary" } },
      "skills": {
        "write-summary": {
          "description": null,
          "handlerKey": "text.generate",
          "handlerConfig": {},
          "condition": null,
          "inputStreams": ["body"],
          "inputSchemas": [{ "kind": "ref", "ref": "string" }],
          "outputSlot": "summary",
          "outputSchema": { "kind": "ref", "ref": "string" },
          "promptTemplate": "Summarise this note in one sentence.\n\n{{body}}",
          "taskKey": "summarization",
          "enabled": true
        }
      }
    }
  },
  "records": {
    "note": {
      "shape": "Note",
      "ownerScope": "project",
      "flow": "summarise-note"
    }
  }
}
```

Plan it first (`kipory-build`'s SKILL.md): the plan checks the flow's health as it will stand. A record created with `POST /v1/records { project, recordType: "note", data: { title, body } }` goes `pending`, then `ready` with `derived.summary`. Preview the flow on a stored record with `input: { kind: "record", recordId }`.

**File in, searchable text out.** The most common processing flow: the record carries one uploaded file, a PDF or a text file, and the flow produces one `body` to index (`uses` `{ "source": { "family": "processed", "field": "body" }, "uses": [{ "kind": "search" }] }` on the type). Inputs `files` (`isList: true`) and output `body` (required). `files` is a list, so the dispatch takes the first item with an `inputPaths` entry; the two readers each run only on their branch, and the last step keeps whichever wrote. Each step also states `description: null`, `condition: null`, `promptTemplate: ""`, `taskKey: "extraction"` and `enabled: true`, left out here:

```json
"skills": {
  "route-file": {
    "handlerKey": "flow.dispatch",
    "handlerConfig": {
      "matchOn": { "field": "mime" },
      "rules": [{ "pattern": "^application/pdf$", "outputSlot": "pdfFile" }],
      "default": { "outputSlot": "textFile" }
    },
    "inputStreams": ["files"],
    "inputPaths": [{ "segments": [{ "kind": "first" }] }],
    "inputSchemas": [{ "kind": "ref", "ref": "file" }],
    "outputSlot": "routed",
    "outputSchema": { "kind": "ref", "ref": "file" }
  },
  "parse-pdf": {
    "handlerKey": "pdf.parse", "handlerConfig": {},
    "inputStreams": ["pdfFile"], "inputSchemas": [{ "kind": "ref", "ref": "file" }],
    "outputSlot": "pdfDoc", "outputSchema": { "kind": "ref", "ref": "PdfDocument" }
  },
  "read-text": {
    "handlerKey": "file.read-text", "handlerConfig": {},
    "inputStreams": ["textFile"], "inputSchemas": [{ "kind": "ref", "ref": "file" }],
    "outputSlot": "plainText", "outputSchema": { "kind": "ref", "ref": "string" }
  },
  "pick-body": {
    "handlerKey": "value.transform",
    "handlerConfig": { "expression": "$exists(pdfDoc) ? pdfDoc.text : plainText" },
    "inputStreams": ["pdfDoc", "plainText"],
    "inputSchemas": [{ "kind": "ref", "ref": "PdfDocument" }, { "kind": "ref", "ref": "string" }],
    "outputSlot": "body", "outputSchema": { "kind": "ref", "ref": "string" }
  }
}
```

A **scanned** PDF has no text layer: `pdf.parse` answers empty `text` with a `pageCount`, so `body` comes out empty and the record has no text to index. Where scans arrive, branch on the empty text into `pdf.screenshot` and a vision-model `text.generate` before `pick-body` — `kipory-extract` has that branch and its cost.

`inputPaths` is positional with `inputStreams`; a step that projects nothing omits it (or holds `null` in that position). A key reaches this flow on a project-wide type by creating the record from its own flow — `entity.create` with `fileIdsSlot` holding the `fileId`s the upload handshake confirmed, then `entity.enqueue-process` — since the records API takes no files.

**A file as a flow input.** A flow input of type `file` (not a processing flow's `files`) takes a file reference `{ "key", "name", "mime" }` — never a `fileId`, which is refused `Expected object`. `key` is the one `POST /v1/files/upload-url` (with `project`) returned; `name` and `mime` are the `fileName` and `contentType` you sent it (`kipory-data` has the handshake). The same object goes in a preview's `inputs` and in an endpoint's request body: `{ "csv": { "key": "<key>", "name": "products.csv", "mime": "text/csv" } }`.

## 8. Answer, refuse or miss from an endpoint

What a flow endpoint can answer besides its bound output — and nothing else reaches the caller:

- **Rows.** `entity.list` (under `records`) and `entity.read` give each row as the record's submitted **and processed** fields at the top level — `derived.body` is `$r.body` — beside `id`, `status`, `createdAt` and `updatedAt`, which a content field of the same name never overwrites. The example fields on the handler pages are one project's shape. A facet the type surfaces sits on the row under the facet's key as `{ id, slug, label, parentSlug }` (a list of them for a `many` facet) — not the records API's `{ facetKey, key, label }` entries; `slug` is the term's key, and `id` is the field to compare on.
- **404** comes from one place: `entity.read` with `failIfEmpty: true`, when nothing resolves — an empty id list included. For a lookup by a field rather than an id, chain `entity.list` (filtered on the field) into `entity.read` with `idsSlot` on the page's rows (`"page.records"` — objects carrying `id` are read as ids) and `failIfEmpty`. An `entity.list` alone answers `200` with an empty page.
- **422 with your message**: `$assert(condition, "message")` in a `value.transform` fails the step as invalid input, and the caller gets `422 VALIDATION_FAILED` carrying the message. This is how to refuse a request a guard would otherwise skip in silence: put the `$assert` in a transform that reads the value that decides, where the guard would have been (`$assert($length(text) >= 200, "The page has too little text to summarise.")`). `$assert` itself returns nothing, so that transform writes the empty `{}`; to check a value and pass it on in one step, return it after the assert — `($assert($length(text) >= 200, "The page has too little text to summarise."); text)` with `outputSchema` `string` — and read that slot downstream. When the deciding value may itself be absent — a merge that collected `[]`, a lookup that found nothing — a transform reading only it is skipped and never asserts. Read an always-present slot beside it and return that: `($assert($count(allPoints) > 0, "None of the URLs could be read."); topic)` with `inputStreams: ["topic", "allPoints"]` — both names, because the expression reads both.
- **422 without a message of your own**: a required output a skipped step never produced is refused `422 FLOW_OUTPUT_MISSING`, `details.missing` naming the output, and the run's writes are discarded. Nothing is filled in. So a guard that skips a write already refuses the call; use `$assert` when the caller should read why. A flow whose honest answer can be "nothing" produces that value (a transform emitting `0` or `[]`) or declares the output optional. There is no fail step and no configurable error status; `successStatus` takes only a 2xx.
- **Optional query filters under a key.** A step runs when one real input is present, and a key's run has no `userInfo`. So an `entity.list` reading `userInfo` and an optional `category` skips — `200` with nothing bound — when the caller leaves `category` out. Feed the filter through a transform that always runs, because it also reads the always-present `projectInfo`: `{"category": category, "scope": $type(projectInfo)}` into a shape with an optional `category`, then `fieldFilterSlots: { "category": "filters.category" }` on the list. An absent field there drops that filter rather than matching nothing. Three details make it work:
  - **The step types the optional input as optional.** A flow input with `"required": false` arrives as `{ "kind": "optional", "inner": <ref> }`, and a step that reads it must list that same form in `inputSchemas` — `{ "kind": "optional", "inner": { "kind": "ref", "ref": "string" } }` in a document. A plain `ref string` is refused by the plan with `OPTIONAL_NARROWING` and `FLOW_INPUT_TYPE_MISMATCH` on the step, as health reports them.
  - **An empty query value is absent.** `?category=` reaches the flow as no `category` at all, so the filter drops; a required parameter sent empty is refused `422` as missing. No guard is needed in the transform.
  - **Test an optional slot with `$exists(slot)`.** An absent slot is JSONata's undefined, so `$string(tag) = ""` is not true for it: `$exists(tag) ? …` or `$length(tag) > 0 ? …` is.
- **Filtering on one element of a list field** (`?tag=design` over a record's `tags`). A `filter` use is refused on a list (`USES_ILLEGAL_FOR_SHAPE` "… is a list. A filterable field holds one value per record."), and `fieldFilterSlots` reads a list in the _slot_ as "any of these values" against a one-value field, not "the record's list holds this". `dataContainsPath` + `dataContainsSlot` matches only an **object** element (`{ "source": "<id>" }` in a list of objects); a string in the slot is ignored and the page comes back unfiltered. Three ways that work:
  - **Post-filter one page.** `entity.list` (up to 100 rows, newest first) → `value.transform` `$filter(page.records, function($r){ tag in $r.tags })`. Simple and exact, but it sees one page only, so it suits a list that fits in one.
  - **Project the value into fields.** For a small closed vocabulary, store one boolean field per value (`isDesign`, `isTech`) with a `filter` use. Map every one in `fieldFilterSlots` (`{ "isDesign": "filters.isDesign", … }`) and set only the asked one in the transform, `{"isDesign": tag = "design" ? true, "isTech": tag = "tech" ? true}` — an absent field drops its filter, as above.
  - **File the values as facet terms** (`kipory-model`). `entity.list`'s `facetFilter` takes fixed `{ facet, slug }` pairs in config, not a slot, so a parameter needs one list step per term behind a `flow.dispatch`; the records API's `term=facet:key` is the operator's side of the same filter.
- **Natural-key collisions fail the whole run.** A flow's `entity.create` on a project-wide type is keyed by its content, so writing identical data again converges on the same record. Writing _different_ data under a `key` field another record already holds is a `409 RECORD_NATURAL_KEY_TAKEN` naming the refused write's `seq`, the step that staged it, the record type, `details.refusedRecordId` — the refused write's own id (for a create, the id it would have had, which exists nowhere) — and, for a create or an update, `details.holderRecordId`, the record that holds the key and the one to update (never the key's value), and the run is all-or-nothing: no other row it wrote is kept. There is no upsert handler. For an importer: look the key up first (`entity.list` filtered on it), then split with `value.transform` into an existing id — `entity.update` with `recordIdSlot` — or new data — `entity.create` — each guarded with `slotPresent`.

## Utilities you will reach for

- `value.first-non-empty` — an ordered `inputs` list of slots or paths; emits the first non-empty **preserving its runtime shape**, which is what lets it coalesce a URL string and a file. `valueKind` narrows to `string` or `file`. `inputStreams` must list the root slot of every entry in `inputs`, no more and no fewer.
- `value.transform` — one JSONata `expression`; top-level identifiers are slot names, which the save reads into `inputStreams` when you leave it out (a list you send must be exactly those — the save refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH`). A bare name at the start of any path counts, including one inside a projection — `docs.{"id": id}` reads a slot `id` — so reach into list items with `$map(docs, function($d){ {"id": $d.id} })`. The result is checked at run time against the step's `outputSchema`; left at the default `object`, it must be text, an object — whose fields may nest lists and objects — or a list of text or of objects, and a bare number, boolean or `null`, a mixed list or a list of lists fails the step. Five functions are refused, at save and at run time, with `JSONATA_FORBIDDEN_FUNCTION`: `$now`, `$millis`, `$random` and `$shuffle` (they break caching) and `$eval` (a sandbox escape — there is no parsing a JSON string back into an object). **To emit nothing**, so a `slotPresent` guard downstream holds, write a conditional with no else — `$count(words) > 50 ? {"text": body}` — whose empty result the step writes as `{}`, which counts as absent. Only that empty result skips the `outputSchema` check: a literal `{}` the expression returns is a value like any other, checked against `outputSchema` (and refused by a shape with required fields). JSONata has no `undefined` literal: `undefined` is read as a slot name, and the save refuses it as a missing input. Use it for computation; for prose with holes use `text.interpolate`.
- `text.interpolate` — a prompt template and nothing else; makes no model call and cannot emit a list.
- `entity.read` — `idsSlot` must hold a **list** of ids (or of objects carrying `id`, as search hits do; `hits[].recordId` is a path to one). A single id string — or a path that resolves to one, such as `created.recordId` — reads nothing, and with `failIfEmpty` that is a 404: wrap it first — `value.transform` with `[id]`.
- `list.concat` — an ordered `inputs` list of slots; flattens lists, lifts scalars to one-element lists, and joins them in the order given. `strategy` is `concat` or `dedup-concat`. It collects contributions from parallel sources **without needing a fan-out and merge pair**, which is the cheaper answer whenever the branches were never really a fan-out.

## Model choice

A step's model resolves in this order: `text.generate`'s `modelSlot` at run time → the step's `modelId` → the binding for the step's `taskKey` on the nearest node that has one (the project, or an ancestor) → the environment → the code default. Omitting `modelId` inherits, and inheriting is a real answer. `GET /v1/ai-models` lists what a project may bind (no prices — a non-null `deprecatedAt` means still runnable, retiring on that date); `GET /v1/nodes/{nodeId}/task-models` (at the project's id) shows each task's current model and its `source` — `node` (a binding on this project or an ancestor; `decidedAt` names which), `environment`, `code-default` — and whether it is `assignableToStep`. Only five task kinds are writable on a step: `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak`.
