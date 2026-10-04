# Flows over records, and what an endpoint answers

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: isDesign — one project's example field name, not a platform field -->
<!-- field-ok: isTech — one project's example field name, not a platform field -->

Four shapes for flows that read and write the project's records. The section numbers continue `patterns.md` (§1–§6, the control shapes), so "§8" means the same section wherever it is cited. Field names are the handlers' own config keys — `handlers/<key>.md` has each table.

| Section | Answers                                                                                                                                     |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| §7      | the flow a record type runs on each record: its contract, a file-to-text example, a file as a flow input                                    |
| §8      | what an endpoint can answer: rows, a 404, a 422 with your message, optional query filters, a filter on a list field, natural-key collisions |
| §9      | `entity.query`: a per-user feed, "due now", and the clause grammar                                                                          |
| §10     | a value rolled up from linked records                                                                                                       |

## 7. Process a record on ingest

**Shape:** a record type bound to a **processing flow**; each record the type receives runs it once, and the flow's outputs become the record's `derived` fields.

The contract the flow is held to:

- **Its inputs are named after the record.** Each input slot reads the submitted field of the same name. Three more names come from the record row itself: `recordId` (string), `createdAt` (ISO timestamp) and `files` — the files attached to the record, as a list of files (declare `{ "slot": "files", "typeName": "file", "isList": true }`). Binding the flow refuses a required input that is none of those three and not a required field of the type's shape; a field the shape leaves optional is an input with `"required": false`.
- **It declares at least one output**, or binding it is refused with `RECORD_TYPE_OUTPUT_EMPTY`. A flow that only files terms or writes elsewhere still needs one — bind a small computed value.
- **A value a handler's config names by slot must be produced by a step.** Some config slots (`facet.resolve`'s `deterministicSlots`, for one) refuse a flow input directly with `…_UNRESOLVED "has no producing node"`; put a `value.transform` in between.
- **Records wait for it.** A type with a processing flow creates records pending. A record created through the records API is queued for processing on its own; a record a flow creates with `entity.create` is not — that flow must run `entity.enqueue-process` after it. A type with no processing flow creates records ready.
- **A status has two spellings.** The records API writes it lower-case (`pending`, `ready`); inside a flow — `setStatus` and `requireStatus` on `entity.update`, `statuses` on a read, a row's `status` — it is upper-case (`PENDING`, `READY`).

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

Plan it first (`document.md`): the plan checks the flow's health as it will stand. A record created with `POST /v1/records { project, recordType: "note", data: { title, body } }` goes `pending`, then `ready` with `derived.summary`. Preview the flow on a stored record with `input: { kind: "record", recordId }`.

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

`inputPaths` is positional with `inputStreams`; a step that projects nothing omits it (or holds `null` in that position).

**Getting the file onto the record.** `POST /v1/records` takes no files. Either create the record from a flow — `entity.create` with `fileIdsSlot` holding the `fileId`s the upload handshake confirmed, then `entity.enqueue-process` — or create the record, attach the file with `POST /v1/files/{id}/attach { record }`, and reprocess it; the attach itself runs nothing. On that second path the record's first run happens before the attach and finds no file; the reprocess after the attach is the run that reads it. `kipory-data` owns the handshake, the attach and the reprocess.

**A file as a flow input.** A flow input of type `file` (not a processing flow's `files`) takes a file reference `{ "key", "name", "mime" }` — never a `fileId`, which is refused `Expected object`. `key` is the one `POST /v1/files/upload-url` (with `project`) returned; `name` and `mime` are the `fileName` and `contentType` you sent it. The same object goes in a preview's `inputs` and in an endpoint's request body: `{ "csv": { "key": "<key>", "name": "products.csv", "mime": "text/csv" } }`.

## 8. Answer, refuse or miss from an endpoint

What a flow endpoint can answer besides its bound output — and nothing else reaches the caller:

- **Rows.** `entity.list` (under `records`) and `entity.read` give each row as the record's submitted **and processed** fields at the top level — `derived.body` is `$r.body` — beside `id`, `status`, `createdAt` and `updatedAt`, which a content field of the same name never overwrites. The example fields on the handler pages are one project's shape. A facet the type surfaces sits on the row under the facet's key as `{ id, slug, label, parentSlug }` (a list of them for a `many` facet) — not the records API's `{ facetKey, key, label, status }` entries; `slug` is the term's key, and `id` is the field to compare on.
- **404** comes from one place: `entity.read` with `failIfEmpty: true`, when nothing resolves — an empty id list included. For a lookup by a field rather than an id, chain `entity.list` (filtered on the field) into `entity.read` with `idsSlot` on the page's rows (`"page.records"` — objects carrying `id` are read as ids) and `failIfEmpty`. An `entity.list` alone answers `200` with an empty page.
- **422 with your message**: `$assert(condition, "message")` in a `value.transform` fails the step as invalid input, and the caller gets `422 VALIDATION_FAILED` carrying the message. This is how to refuse a request a guard would otherwise skip in silence: put the `$assert` in a transform that reads the value that decides, where the guard would have been (`$assert($length(text) >= 200, "The page has too little text to summarise.")`).
  - `$assert` itself returns nothing, so that transform writes the empty `{}`. To check a value and pass it on in one step, return it after the assert — `($assert($length(text) >= 200, "The page has too little text to summarise."); text)` with `outputSchema` `string` — and read that slot downstream.
  - When the deciding value may itself be absent — a merge that collected `[]`, a lookup that found nothing — a transform reading only it is skipped and never asserts. Read an always-present slot beside it and return that: `($assert($count(allPoints) > 0, "None of the URLs could be read."); topic)` with `inputStreams: ["topic", "allPoints"]` — both names, because the expression reads both.
- **422 without a message of your own**: a required output a skipped step never produced is refused `422 FLOW_OUTPUT_MISSING`, `details.missing` naming the output, and the run's writes are discarded. Nothing is filled in. So a guard that skips a write already refuses the call; use `$assert` when the caller should read why. A flow whose honest answer can be "nothing" produces that value (a transform emitting `0` or `[]`) or declares the output optional. There is no fail step and no configurable error status; `successStatus` takes only a 2xx.
- **Optional query filters.** A filter value named by a slot (`fieldFilterSlots`, `dataEqualsSlot`, `dataContainsSlot`, an `edgeFilters` peer, an `entity.query` `valueSlot`) must be there when the step runs: if it is missing the step is **skipped**, never run without the filter — a missing value does not widen the answer. So `?category=` being optional is two steps, not one: a `flow.dispatch` on whether the value arrived, routing to a list WITH the filter or a list WITHOUT it, and a `flow.merge` of the two results into the slot the endpoint returns. Three details make it work:
  - **The step types the optional input as optional.** A flow input with `"required": false` arrives as `{ "kind": "optional", "inner": <ref> }`, and a step that reads it must list that same form in `inputSchemas` — `{ "kind": "optional", "inner": { "kind": "ref", "ref": "string" } }` in a document. A plain `ref string` is refused by the plan with `OPTIONAL_NARROWING` and `FLOW_INPUT_TYPE_MISMATCH` on the step, as health reports them.
  - **An empty query value is absent.** `?category=` reaches the flow as no `category` at all, so the dispatch takes the unfiltered branch; a required parameter sent empty is refused `422` as missing.
  - **An empty LIST is not absent.** A slot holding `[]` runs the step and matches nothing — an empty page, a count of zero — which is what "the caller follows nobody" should answer.
- **Filtering on one element of a list field** (`?tag=design` over a record's `tags`). A `filter` use is refused on a list (`USES_ILLEGAL_FOR_SHAPE` "… is a list. A filterable field holds one value per record."), and `fieldFilterSlots` reads a list in the _slot_ as "any of these values" against a one-value field, not "the record's list holds this". `dataContainsPath` + `dataContainsSlot` matches only an **object** element (`{ "source": "<id>" }` in a list of objects); a string in the slot fails the step. Three ways that work:
  - **Post-filter one page.** `entity.list` (up to 100 rows, newest first) → `value.transform` `$filter(page.records, function($r){ tag in $r.tags })`. Simple and exact, but it sees one page only, so it suits a list that fits in one.
  - **Project the value into fields.** For a small closed vocabulary, store one boolean field per value (`isDesign`, `isTech`) with a `filter` use — for at most four values: a type may declare 4 boolean fields as queryable (32 text, 8 number, 8 datetime), and a fifth is refused `RECORD_TYPE_QUERYABLE_INVALID`. Past four, file the values as facet terms (next bullet). Map every one in `fieldFilterSlots` (`{ "isDesign": "filters.isDesign", … }`) and set every one in the transform, `{"isDesign": tag = "design", "isTech": tag = "tech"}` — each filter needs a value, so this suits "exactly this tag"; for "this tag, whatever the others" use one list step per value behind a `flow.dispatch`.
  - **File the values as facet terms** (`kipory-model`). `entity.list`'s `facetFilter` takes fixed `{ facet, slug }` pairs in config, not a slot, so a parameter needs one list step per term behind a `flow.dispatch`; an `entity.query` `term` clause takes the slug from a slot (`slugSlot`, §9); the records API's `term=facet:key` is the operator's side of the same filter.
- **Natural-key collisions fail the whole run.** A flow's `entity.create` on a project-wide type is keyed by its content, so writing identical data again converges on the same record. Writing _different_ data under a `key` field another record already holds is a `409 RECORD_NATURAL_KEY_TAKEN`, and the run is all-or-nothing: no other row it wrote is kept. There is no upsert handler. <!-- absent-handler: entity.upsert --> The refusal names:
  - the refused write's `seq`, the step that staged it and the record type;
  - `details.refusedRecordId` — the refused write's own id (for a create, the id it would have had, which exists nowhere);
  - for a create or an update, `details.holderRecordId` — the record that holds the key and the one to update (never the key's value).

  For an importer: look the key up first (`entity.list` filtered on it), then split with `value.transform` into an existing id — `entity.update` with `recordIdSlot` — or new data — `entity.create` — each guarded with `slotPresent`.

## 9. Read what one user follows

"Show me what is new from the things I follow" is three steps and no loop. The follows are a per-user record type; the feed is one `entity.query` whose values come from the run.

```
entity.list (my follows → follows)  →  value.transform (follows.records → followed)  →  entity.query (→ page)
```

The transform writes the slot `followed`, an object with one field: `{ "ids": [ … ] }`. `cursor` is an optional flow input carrying the `nextCursor` a previous page answered; absent, the query returns the first page.

```json
{
  "recordType": "collection",
  "clauses": [
    {
      "kind": "edge",
      "relation": "in-collection",
      "direction": "incoming",
      "peer": [
        {
          "kind": "field",
          "field": "authorId",
          "op": "in",
          "valueSlot": "followed.ids"
        }
      ]
    }
  ],
  "order": { "by": "field", "field": "lastItemAt", "direction": "desc" },
  "limit": 20,
  "cursorSlot": "cursor"
}
```

- **Query the thing the user sees, not the thing they follow.** The clause above asks for collections linked to an item by a followed author, so each collection comes back once however many of its items match. Paging the items and collapsing them afterwards repeats a collection across pages.
- **Following nobody is an answer.** A slot holding `[]` runs the step and returns no records. A slot that is absent skips the step, so produce the list in a step that always runs.
- **`in` takes at most 1,000 values.** Past that the step fails with `QUERY_OPERAND_INVALID`; store the membership on the record instead and filter on it.
- **Order by a date the record carries.** `order` takes `created`, or one of the type's own date fields with a `filter` use; a record with no value there is left out. To order by something a linked record holds (the newest item's date), keep it on the record — the next pattern.
- **"Due now" is the same shape.** `{ "kind": "field", "field": "nextRunAt", "op": "lte", "valueSlot": "runInfo.now" }` reads only the due records; listing them all and filtering in a transform reads the whole type.

### The clause grammar

`entity.query` is the one handler that joins: a record matches when it matches **every** clause in `clauses` (at most 16). Each clause is one of five kinds, and each value may be written in config or named by a slot — one or the other, never both:

| `kind`     | Members                                                                                                                                                                                                         | Matches                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`    | `field`, `op` (`eq`, `lt`, `lte`, `gt`, `gte`, `in`), `value` or `valueSlot`                                                                                                                                    | a field of the type that carries a `filter` use. `in` takes a list (any of them, at most 1,000); dates are ISO 8601 strings                                                 |
| `term`     | `facet`, `slug` or `slugSlot`                                                                                                                                                                                   | a term of a facet the type surfaces, by slug; an alias resolves to its canonical term                                                                                       |
| `semantic` | `text` or `textSlot`, optional `field`, optional `topK` (default 50, at most 200)                                                                                                                               | records ranked by meaning against the type's search index. At most one per query, counting one inside an edge's `peer`                                                      |
| `edge`     | `relation`, optional `direction` (`outgoing` by default, `incoming` or `either`), optional `where[]`, `count` (`{ op, n }` with `op` one of `>=`, `>`, `=`, `<`, `<=`; omitted means at least one) and `peer[]` | records linked by a relation kind a field of the type carries a `link` use for; `peer` holds `field`, `term` and `semantic` clauses on the record at the other end, one hop |
| `stream`   | `field`, optional `window` (`from` or `fromSlot`, `to` or `toSlot`), optional `where[]` and `count` (`"exists"` by default, `"none"`, or `{ op, n }`)                                                           | event rows of a field that carries a `stream` use, inside a time window                                                                                                     |

A `where[]` entry is `{ property, op, value | valueSlot }` over a filter the relation kind or the stream declares. Only a query without a `semantic` clause pages (`cursorSlot`); `limit` is 1 to 100. `POST /v1/records/query` asks the same clauses from outside a flow (`kipory-data`).

## 10. Keep a value rolled up from linked records

A parent that shows its children's count, latest date or common language stores those values itself.

- **Write them with `entity.update`, in the parent's flow.** A field that is the OUTPUT of the type's processing flow cannot carry a `filter` use (`RECORD_TYPE_QUERYABLE_INVALID`): a filterable field is stamped from the record's own data, and nothing stamps a flow output. Declare the roll-up as an optional field of the shape, compute it in the flow (`entity.list` the children → `value.transform`), and write it back with `entity.update`. It can then be filtered and ordered by.
- **Re-run the parent when a child joins.** The child's flow runs `entity.update` on the parent with `setStatus: "PENDING"`, then `entity.enqueue-process`. Every step runs again under any `replay` value. If the parent's flow files a term on a facet that holds one value and that value can change (the common language, here), set `replay: "clean"`: otherwise the old term stays, the new one is refused, and the run fails. (`entity.teardown` is not a substitute here: it fails on a run with no signed-in user and reaches only that user's own records.) `kipory-data`'s `references/in-flow-record-handlers.md` has the replay modes. The parent's flow recomputes from all its children, so the value never drifts from a running total. Each re-run is a whole run of the parent's flow and is billed as one (`kipory-operate`).
- **Take the majority, not the first.** For a value the children can disagree on (a language, a category), count them and take the commonest, ignoring an unknown while any child has a known value. Copying the first child's value lets one early odd record decide for the rest.
- **Do not store the children as a list on the parent.** They are the incoming edges of the link; a list in the record grows without bound and cannot be filtered on.
