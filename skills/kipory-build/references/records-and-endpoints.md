# Flows over records

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: shelfLimit — an example of an action-named paging input, a project-authored name -->
<!-- field-ok: isDesign — one project's example field name, not a platform field -->
<!-- field-ok: isTech — one project's example field name, not a platform field -->
<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: publishedOn — one project's example field name, not a platform field -->
<!-- field-ok: myShelf — one project's example view key, not a platform field -->
<!-- field-ok: followedAuthors — one project's example view key, not a platform field -->

**A read is a view; a flow only when it computes.** A list or a lookup an endpoint answers, or a read several flows repeat, is declared once as a view and read with one `record.view` action — `views.md` (§11), with a complete worked document; its `GET` endpoint declares only its path. The shapes below are for what a view does not do.

Two shapes for flows that read and write the project's records: §7 and §10. The other sections live on their own pages:

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

## 7. Process a record on ingest

**Shape:** a table bound to a **processing flow**; each record the table receives runs it once, and the flow's outputs become the record's `derived` fields.

The contract the flow is held to:

- **Its inputs are named after the record.** Each input slot reads the submitted field of the same name. Three more names come from the record row itself: `recordId` (string), `createdAt` (ISO timestamp) and `files` — the files attached to the record, as a list of files (declare `{ "slot": "files", "typeName": "file", "isList": true }`). Binding the flow refuses a required input that is none of those three and not a required field of the table's type; a field the type leaves optional is an input with `"required": false`.
- **It declares at least one output**, or binding it is refused with `TABLE_OUTPUT_EMPTY`. A flow that only files terms or writes elsewhere still needs one — bind a small computed value.
- **A value a function's config names by slot must be produced by an action.** Some config slots (`vocabulary.resolve`'s `deterministic`, for one) refuse a flow input directly with `…_UNRESOLVED "has no producing node"`; put a `value.transform` in between.
- **Records wait for it.** A table with a processing flow creates records pending. A record created through the records API is queued for processing on its own; a record a flow creates with `record.create` is not — that flow must run `record.enqueue-process` after it. A table with no processing flow creates records ready.
- **A flow writes a record whole or field by field.** `record.create` and `record.update` take `data` — an argument naming the whole object, usually a slot path (`"data": "shaped"`) — or `fields`, one argument per table field: `{ "title": "page.title", "status": { "literal": "new" }, "tags": "page.tags[compact]" }`. Never both. The plan checks each `fields` key against the table (the nearest name is suggested) and each value's type against the field; an entry that comes out absent is left off the record. `fields` saves the `value.transform` that only built the object.
- **A status has two spellings.** The records API writes it lower-case (`pending`, `ready`); inside a flow — `setStatus` and `requireStatus` on `record.update`, `statuses` on a read, a row's `status` — it is upper-case (`PENDING`, `READY`).

In a document:

```json kipory:request=project-document
{
  "kipory": 10,
  "types": {
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
      "actions": {
        "write-summary": {
          "description": null,
          "functionKey": "text.generate",
          "functionConfig": {},
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
  "tables": {
    "note": {
      "type": "Note",
      "ownerScope": "project",
      "flow": "summarise-note"
    }
  }
}
```

Plan it first (`document.md`): the plan checks the flow's health as it will stand. A record created with `POST /v1/records { project, tableKey: "note", data: { title, body } }` goes `pending`, then `ready` with `derived.summary`. Preview the flow on a stored record with `input: { kind: "record", recordId }`.

**File in, searchable text out.** The most common processing flow: the record carries one uploaded file, a PDF or a text file, and the flow produces one `body` to index (`uses` `{ "source": { "family": "processed", "field": "body" }, "uses": [{ "kind": "search" }] }` on the table). Inputs `files` (`isList: true`) and output `body` (required). `files` is a list, so the dispatch takes the first item with an `inputPaths` entry; the two readers each run only on their branch, and the last action keeps whichever wrote. Each action also states `description: null`, `condition: null`, `promptTemplate: ""`, `taskKey: "extraction"` and `enabled: true`, left out here:

```json
"actions": {
  "route-file": {
    "functionKey": "flow.dispatch",
    "functionConfig": {
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
    "functionKey": "pdf.parse", "functionConfig": {},
    "inputStreams": ["pdfFile"], "inputSchemas": [{ "kind": "ref", "ref": "file" }],
    "outputSlot": "pdfDoc", "outputSchema": { "kind": "ref", "ref": "PdfDocument" }
  },
  "read-text": {
    "functionKey": "file.read-text", "functionConfig": {},
    "inputStreams": ["textFile"], "inputSchemas": [{ "kind": "ref", "ref": "file" }],
    "outputSlot": "plainText", "outputSchema": { "kind": "ref", "ref": "string" }
  },
  "pick-body": {
    "functionKey": "value.transform",
    "functionConfig": { "expression": "$exists(pdfDoc) ? pdfDoc.text : plainText" },
    "inputStreams": ["pdfDoc", "plainText"],
    "inputSchemas": [{ "kind": "ref", "ref": "PdfDocument" }, { "kind": "ref", "ref": "string" }],
    "outputSlot": "body", "outputSchema": { "kind": "ref", "ref": "string" }
  }
}
```

A **scanned** PDF has no text layer: `pdf.parse` answers empty `text` with a `pageCount`, so `body` comes out empty and the record has no text to index. Where scans arrive, branch on the empty text into `pdf.screenshot` and a vision-model `text.generate` before `pick-body` — `kipory-extract` has that branch and its cost.

`inputPaths` is positional with `inputStreams`; an action that projects nothing omits it (or holds `null` in that position).

**Getting the file onto the record.** `POST /v1/records` takes no files. Either create the record from a flow — `record.create` with `fileIds` holding the `fileId`s the upload handshake confirmed, then `record.enqueue-process` — or create the record, attach the file with `POST /v1/files/{id}/attach { record }`, and reprocess it; the attach itself runs nothing. On that second path the record's first run happens before the attach and finds no file; the reprocess after the attach is the run that reads it. `kipory-data` owns the handshake, the attach and the reprocess.

**A file as a flow input.** A flow input of type `file` (not a processing flow's `files`) takes a file reference `{ "key", "name", "mime" }` — never a `fileId`, which is refused `Expected object`. `key` is the one `POST /v1/files/upload-url` (with `project`) returned; `name` and `mime` are the `fileName` and `contentType` you sent it. The same object goes in a preview's `inputs` and in an endpoint's request body: `{ "csv": { "key": "<key>", "name": "products.csv", "mime": "text/csv" } }`.

## 10. Keep a value rolled up from linked records

A parent that shows its children's count, total or average declares it as a **computed** field, and Kipory keeps it:

```json
"recipes": {
  "computed": {
    "reviewCount": {
      "rollup": {
        "relation": "review-of",
        "count": true,
        "where": [{ "kind": "field", "field": "hidden", "op": "eq", "value": false }]
      }
    }
  }
}
```

- **Each field read in a rollup is a `filter` field of the related table** (`hidden` above; `stars` for a `sum` of stars), one of the related table's own computed fields, or a filter the relation's links carry. The plan refuses any other field, and you may add the `filter` use in the same document.
- **A `distinct` list keeps at most 100 values.** Its `max` is required and may not pass 100; a larger one is refused `COMPUTED_DISTINCT_TOO_LONG`. Past `max` values, the list keeps the first ones in its order (`by`, `order`) and drops the rest.
- **A valueless `min`/`max`/`latest` leaves sorts** unless it has `ifNone`: `"createdAt"` or `{ "value": … }` (else `COMPUTED_IF_NONE_INVALID`).
- **`eq false` skips records where the field is absent**: a missing value never equals `false`. Make the field required (or always write it), or count with no `where`.
- **The value follows every change, a few seconds later.** A child created, moved to another parent, edited or deleted — through a flow, the records API or an erasure — and the parent is recomputed. Existing records get the value when you declare it; the plan shows a `recompute` line with their count. It is free and is not a run.
- **Read it as a field of the parent.** A flow's `record.read` / `record.list` / `record.query` row carries it beside the record's own fields; `GET /v1/records/{id}` answers `computed`, `computedAt` and `computing` (true while a recompute is due). Sync on `computedAt`, not `updatedAt`: a recompute moves neither `updatedAt` nor `version`.
- **Nothing else writes it.** A `record.create`, `record.update` or records-API write naming a computed field is refused (`FIELD_IS_COMPUTED`, `RECORD_FIELD_IS_COMPUTED`); a flow whose writer surely names one is a `FLOW_WRITES_COMPUTED_FIELD` error in the plan.
- **A field the type already keeps by hand** turns computed in one document: remove it from the type and declare it under `computed` with the same name. The plan's `recompute` line says the held values are replaced. To remove computed fields, state `computed: {}`; leaving `computed` out keeps them.

A value that needs the parent's own flow — an AI judgement, the commonest language — stays a flow output:

- **Output them from the parent's own processing flow.** Compute the roll-up in the flow (`record.read` the parent with a linked read bringing its children — `"direction": "incoming"`, a `limit`, and `"onMore": "fail"` so a parent with more children than the limit fails rather than rolls up a part; or `record.list` the children with `pages` → `value.transform`) and return it as an output slot. A flow output is a `processed` field, and it can carry a `filter` use like a submitted one: it is stored when the parent's run finishes, so it can be filtered and ordered by. Do not copy it into the record's submitted data with `record.update`: that is a second write per run, and the submitted data should hold only what was sent. Until the parent's next run finishes, filters see the value from its last run.
- **Re-run the parent when its children change: declare `reprocessOn`**, and Kipory queues the parent's processing for you:

  ```json
  "recipes": {
    "flow": "summarize",
    "reprocessOn": [
      { "relation": "review-of", "on": ["join", "leave"], "debounceSeconds": 30 }
    ]
  }
  ```

  `on` is `join` (a child links in), `leave` (one unlinks or is deleted) and `change` (one changes a field named in `fields`, any field of the child table). The run starts once no further change has come for `debounceSeconds` (default 30), so a burst of children is one run; a parent whose run is still to come or under way gets exactly one more after it. The run reads what happened in `runInfo.reprocess` (`relations`, `joined`, `left`, `changed`), is billed like any processing run, and the runs list shows it with `source.reason: "reprocess"`. A run's own writes to its record's children queue nothing, a parent is re-run at most `runs.reprocess-per-record-per-hour` times an hour, and a chain of tables queuing each other through other tables' processing is refused at plan time (`REPROCESS_CYCLE`). Do not queue the parent from the child's flow with `record.enqueue-process` for this: that run can miss children that join while it works. If the parent's flow files a term on a vocabulary that holds one value and that value can change (the common language, here), set `replay: "clean"`: otherwise the old term stays, the new one is refused, and the run fails. `kipory-data`'s `references/in-flow-reprocess.md` has the replay modes.

- **Take the majority, not the first.** For a value the children can disagree on (a language, a category), count them and take the commonest, ignoring an unknown while any child has a known value. Copying the first child's value lets one early odd record decide for the rest.
- **Do not store the children as a list on the parent.** They are the incoming links of the relation; a list in the record grows without bound and cannot be filtered on.
