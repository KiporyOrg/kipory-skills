# Flows over records, and what an endpoint answers

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: isDesign — one project's example field name, not a platform field -->
<!-- field-ok: isTech — one project's example field name, not a platform field -->
<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: publishedOn — one project's example field name, not a platform field -->
<!-- field-ok: myShelf — one project's example view key, not a platform field -->
<!-- field-ok: followedAuthors — one project's example view key, not a platform field -->

**A read is a view; a flow only when it computes.** A list or a lookup an endpoint answers, or a read several flows repeat, is declared once as a view and read with one `record.view` action — §11, with a complete worked document; its `GET` endpoint declares only its path. The shapes below are for what a view does not do.

Five shapes for flows that read and write the project's records. The section numbers continue `patterns.md` (§1–§6, the control shapes), so "§8" means the same section wherever it is cited. Field names are the functions' own config keys — `functions/<key>.md` has each table.

| Section | Answers                                                                                                                                                                      |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §7      | the flow a table runs on each record: its contract, a file-to-text example, a file as a flow input                                                                           |
| §8      | what an endpoint can answer: the body shape, rows, a 404, a 422 with your message, a 403 for a key, optional query filters, a filter on a list field, natural-key collisions |
| §9      | `record.query`: a per-user feed, "due now", and the clause grammar                                                                                                           |
| §10     | a value rolled up from linked records                                                                                                                                        |
| §11     | views: a read declared once, its sets, params and shapes, `record.view`, the view endpoint that pages itself, ETag, the preview                                              |

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
  "kipory": 9,
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

## 8. Answer, refuse or miss from an endpoint

What a flow endpoint can answer besides its bound output — and nothing else reaches the caller:

- **The body is the flow's outputs, keyed by output name.** A flow with one output named `result` answers `{ "result": { … } }`, and a flow with two answers both keys. To answer the bare value instead, set `responseBody` on the endpoint's `contractConfig` to the name of one required output (`"responseBody": "result"`): the body is then that output alone — an object, a list or a scalar, always JSON. Only a synchronous `flow.invoke` takes it, and the run is still checked against every output the flow declares.

- **Rows.** `record.list` (under `records`) and `record.read` give each row as the record's submitted **and processed** fields at the top level — `derived.body` is `$r.body` — beside `id`, `status`, `createdAt` and `updatedAt`, which a content field of the same name never overwrites. The example fields on the function pages are one project's own type. A vocabulary the table surfaces sits on the row under the vocabulary's key as `{ id, slug, label, parentSlug }` (a list of them for a `many` vocabulary) — not the records API's `{ vocabularyKey, key, label, status }` entries; `slug` is the term's key, and `id` is the field to compare on.
  - **A field with no value is left out of the row, never `null`.** A field never written, or cleared — a PATCH `merge` or a `record.update` merge with `null` deletes it — is not on the row, and neither is a vocabulary with no term filed. `0`, `false`, `""` and `[]` are values and arrive as stored. So `$exists($r.pollMinutes)` is false for it, `$r.pollMinutes ?? 60` gives the default, and `$default($r.pollMinutes, 60)` also treats empty text or an empty list as unset. These reads of such a field answer differently than they would for a `null`: `x = null` and `$type(x) = "null"` are false, `x != "a"` (or `!= $v`, `!= other.field`) and `$type(x) != "string"` are false (write `$not(x = "a")`), `$not(x)` answers nothing (write `x ? b : a` for `$not(x) ? a : b`, and `[$not($exists(x) and $boolean(x))]` for a filter `[$not(x)]`), `$count(x)` is 0, `$string(x)` is nothing, `"Hi " & x` is `"Hi "`, and `$exists(x)` is false — so `$exists(x) and x != "a"` drops the row too; the plan warns `JSONATA_ROW_FIELD_ABSENT_NOT_NULL` on each but `$exists(x)`, `&`, an `$exists`-guarded read, and a read of a field the type marks required. Records stored without a required field are listed by `GET /v1/tables/{id}?expand=diagnostics` (`RECORDS_MISSING_REQUIRED_FIELD`) and `GET /v1/projects/{nodeId}/alerts?include=required-gaps`. The rewrite is for a record's field only: a value your expression computes can already be missing, and `$not(x = "a")` would change its answer. A value built only from unset fields is empty (`{"k": $r.k}` is `{}`), so an action reading only it is skipped; and a `record.update` merge whose patch copies an unset field leaves the target's field as it was — write `x ?? null` to clear it. A total over such rows has its own trap: `$sum` of no values is nothing, not 0 (`patterns.md`, `value.transform`).
- **404** comes from one place: `record.read` with `failIfEmpty: true`, when nothing resolves — an empty id list included. For a lookup by a field rather than an id, chain `record.list` (filtered on the field) into `record.read` with `ids` on the page's rows (`"page.records"` — objects carrying `id` are read as ids) and `failIfEmpty`. An `record.list` alone answers `200` with an empty page.
- **422 with your message**: `$assert(condition, "message")` in a `value.transform` fails the action as invalid input, and the caller gets `422 VALIDATION_FAILED` carrying the message. This is how to refuse a request a guard would otherwise skip in silence: put the `$assert` in a transform that reads the value that decides, where the guard would have been (`$assert($length(text) >= 200, "The page has too little text to summarise.")`).
  - `$assert` itself returns nothing, so that transform stores no slot. To check a value and pass it on in one action, return it after the assert — `($assert($length(text) >= 200, "The page has too little text to summarise."); text)` with `outputSchema` `string` — and read that slot downstream.
  - When the deciding value may itself be absent — a merge that collected `[]`, a lookup that found nothing — a transform reading only it is skipped and never asserts. Read an always-present slot beside it and return that: `($assert($count(allPoints) > 0, "None of the URLs could be read."); topic)` with `inputStreams: ["topic", "allPoints"]` — both names, because the expression reads both.
- **422 without a message of your own**: a required output a skipped action never produced is refused `422 FLOW_OUTPUT_MISSING`, `details.missing` naming the output, and the run's writes are discarded. Nothing is filled in. So a guard that skips a write already refuses the call; use `$assert` when the caller should read why. A flow whose honest answer can be "nothing" produces that value (a transform emitting `0` or `[]`) or declares the output optional. There is no fail action and no configurable error status; `successStatus` takes only a 2xx.
- **403 for a key on a per-user read or write.** An action that reads or writes a table owned by its users (`record.list`, `record.read`, `record.count`, `record.query`, `record.create`, `record.append`; `vocabulary.aggregate` and `record.teardown` whatever the table) needs a signed-in user. An API key acts as the project and has none, so the call is refused `403 FORBIDDEN` with a message saying a signed-in user is required — before the flow runs. The endpoint read says so beforehand: `access.requiresUser`, with the functions in `access.requiresUserBy`. An action counts on any branch — one the key's call would skip included — so a key needs a flow of its own, and a flow cannot turn this into another status. What does not count: a read whose `userId` names a slot other than `userInfo` (a path parameter, for a key reading on a user's behalf), a disabled action, and an action set to `"onFailure": "continue"` — which only `record.count` and `vocabulary.aggregate` accept. Three ways to serve more than one kind of caller:
  - **Shared data with a personal extra** (a catalog item plus "do I follow it") is two endpoints over two flows. One flow reads only project-owned tables, so its endpoint reads `requiresUser: false` and takes a key and a signed-in user alike. The other adds the per-user action and takes only a signed-in user. The client calls the second when it holds a session and the first when it does not. Share the common actions by putting them in a flow both invoke (`flow.invoke`).
  - **Anonymous visitors and signed-in users** are two endpoints for the same reason, the first one public (`contractConfig.auth: "none"`, `kipory-expose`). A public endpoint ignores a session sent along, so its run never has a user and the personal part cannot ride on it; a public endpoint over a flow that needs a user is refused at the save (`PUBLIC_ENDPOINT_NEEDS_USER`).
  - **A key acting for a named user** reads that user's records through a flow input: declare an input (`userId`), bind it from a path parameter (`{ "userId": { "from": "path.userId" } }`), and set `"userId": "userId"` on the read. The endpoint reads `requiresUser: false` and a key's call runs. Whoever holds the key can then read any user's records of that table, so hand it only to your own server.
  - **Keeping one endpoint by letting the per-user action fail does not work for a list.** `"onFailure": "continue"` on `record.list`, `record.read` or `record.query` is refused at the save (`RUN_CONTINUE_NOT_ALLOWED`: the function may write). It is accepted on `record.count` and `vocabulary.aggregate`, when the action's slot is not one a required flow output is bound to. The endpoint then reads `requiresUser: false`; on a key's call the action runs, fails, and leaves a warning on the run, and its slot is absent. So one endpoint can answer "how many of these has the caller saved" to a signed-in user and leave it out for a key — if the transform that reads the count also reads a slot that is always there and tests `$exists` on the count, since a transform reading only an absent slot is skipped.
- **A function's own refusal names its rule as `details.reason`.** When an action's function refuses with a rule of its own — `record.list` with records left past `pages.max` (`RECORD_READ_HAS_MORE`), a linked read over its `limit` (`RECORD_LINKED_HAS_MORE`), a stream event with no time (`STREAM_EVENT_NO_TIME`) — the caller gets `422 VALIDATION_FAILED` with the function's message and that code as `details.reason`. A refusal over the run's state rather than its input — `STREAM_MIGRATING`, `QUERY_LIKE_RECORD_NOT_INDEXED`, and a value a filter, a `record.query` clause or a `term.search` reads from the run that the run did not supply (`FILTER_VALUE_ABSENT`, `QUERY_OPERAND_ABSENT`, `TERM_SEARCH_VOCABULARY_ABSENT`) — answers `409 CONFLICT` with a generic message and the code as `details.reason`. The run's closing record carries the same code as `failure.reason`, and a preview's `errors[]` entry as `reason`. Look each code up in `kipory-connect`'s `references/refusal-codes.md`.
- **422 for a bad `cursor`.** A `cursor` value that is not a `nextCursor` a previous page answered is refused `422 VALIDATION_FAILED`, by `record.list` and `record.query` alike. An absent or empty cursor is the first page. The same `422` answers an id list past the cap (200, for `record.read` and `record.delete`) and an `record.create` whose data lacks the table's `key` field or holds a non-string there.
- **Optional query filters are a view's `optional` params** (§11): `?genre=` absent reads every row, present narrows it, in one `record.view` action, and the view endpoint types and bounds the parameter itself. An inline read is different, and the difference matters when you do write one: a filter value it reads from a slot (a `fieldFilters` entry's `value`, `dataEquals`, `dataContains`, a `linkFilters` peer, a `record.query` `value`) must be there when the action runs; if it is missing the action is **skipped**, never run without the filter — a missing value does not widen the answer.
  - **The action types an optional input as optional.** A flow input with `"required": false` arrives as `{ "kind": "optional", "inner": <ref> }`, and an action that reads it must list that same form in `inputSchemas` — `{ "kind": "optional", "inner": { "kind": "ref", "ref": "string" } }` in a document. A plain `ref string` is refused by the plan with `OPTIONAL_NARROWING` and `FLOW_INPUT_TYPE_MISMATCH` on the action, as health reports them — except in the case below.
  - **An optional input feeds a function directly when the action cannot run without it.** That is so when the slot is the action's only input (`url.metadata` reading an optional `website`: absent, the action is skipped and so are its readers), or when the function requires that slot (a slot an `record.query` clause or an `record.list` filter reads). Leave `inputSchemas` out, or state either form. Beside a second input the action runs on that one alone, so a function input that needs a value still refuses the optional slot with `OPTIONAL_NARROWING`; put a `value.transform` with `$exists(website) ? website` between them, typed `optional string` in and `string` out.
  - **An empty query value is absent.** `?category=` reaches the flow as no `category` at all; a required parameter sent empty is refused `422` as missing.
  - **An empty LIST is not absent.** A slot holding `[]` runs the action and matches nothing — an empty page, a count of zero — which is what "the caller follows nobody" should answer.
- **Filtering on one element of a list field** (`?tag=design` over a record's `tags`). A `filter` use is refused on a list (`USES_ILLEGAL_FOR_SHAPE` "… is a list. A filterable field holds one value per record."), and a `fieldFilters` entry with `op: "eq"` reads a list in the _slot_ as "any of these values" against a one-value field, not "the record's list holds this". `dataContainsPath` + `dataContains` matches only an **object** element (`{ "source": "<id>" }` in a list of objects); a string in the slot fails the action. Three ways that work:
  - **Post-filter one page.** `record.list` (up to 100 rows, newest first) → `value.transform` `$filter(page.records, function($r){ tag in $r.tags })`. Simple and exact, but it sees one page only, so it suits a list that fits in one.
  - **Project the value into fields.** For a small closed vocabulary, store one boolean field per value (`isDesign`, `isTech`) with a `filter` use — for at most four values: a table may declare 4 boolean fields as queryable (32 text, 8 number, 8 datetime), and a fifth is refused `TABLE_QUERYABLE_INVALID`. Past four, file the values as vocabulary terms (next bullet). Give every one a `fieldFilters` entry (`{ "field": "isDesign", "op": "eq", "value": "filters.isDesign" }`, …) and set every one in the transform, `{"isDesign": tag = "design", "isTech": tag = "tech"}` — each filter needs a value, so this suits "exactly this tag"; for "this tag, whatever the others" use one list action per value behind a `flow.dispatch`.
  - **File the values as vocabulary terms** (`kipory-model`). `record.list`'s `vocabularyFilter` takes fixed `{ vocabularyKey, slug }` pairs in config, not a slot, so a parameter needs one list action per term behind a `flow.dispatch`; an `record.query` `term` clause takes the slug from a slot (`slug`, §9); the records API's `term=vocabulary:key` is the operator's side of the same filter.
- **Natural-key collisions fail the whole run.** A flow's `record.create` on a project-wide table is keyed by its content, so writing identical data again converges on the same record. Writing _different_ data under a `key` field another record already holds is a `409 RECORD_NATURAL_KEY_TAKEN`, and the run is all-or-nothing: no other row it wrote is kept. There is no upsert function. <!-- absent-function: record.upsert --> The refusal names:
  - the refused write's `seq`, the action that staged it and the table;
  - `details.refusedRecordId` — the refused write's own id (for a create, the id it would have had, which exists nowhere);
  - for a create or an update, `details.holderRecordId` — the record that holds the key and the one to update (never the key's value).

  For an importer: look the key up first (`record.list` filtered on it), then guard the two writes on what it found, each condition on the write action itself. On the page: `record.create` carries `{ "op": "listEmpty", "slot": "found", "path": "records" }` and `record.update` (with `recordId` on the found row's id) the same clause inside `{ "op": "not", "inner": … }`. Where the lookup instead leaves a slot that is absent when nothing was found — a transform that picked the existing id — the create carries `{ "op": "not", "inner": { "op": "slotPresent", "slot": "existingId" } }`. Either way the create reads only its data slot: a condition may name a slot the action does not read (`action-fields.md` §5), so no transform is needed to turn "nothing found" into a value.

## 9. Read what one user follows

"Show me what is new from the things I follow" is, first, a view: `myShelf` in §11 reads the follows as a set inside the same statement, as the caller, with no 1,000-value cap and no extra action. The inline form below is for when the view cannot say it — here, a parent that matches through a link to a followed child, which a set (`field` clauses only) does not reach. It is three actions and no loop. The follows are a per-user table; the feed is one `record.query` whose values come from the run.

```
record.list (my follows → follows)  →  value.transform (follows.records → followed)  →  record.query (→ page)
```

The transform writes the slot `followed`, an object with one field: `{ "ids": [ … ] }`. `cursor` is an optional flow input carrying the `nextCursor` a previous page answered; absent, the query returns the first page.

The follows read takes every page, so a person following more than one page of things is not cut to the first 50:

```json
{
  "tableKey": "follow",
  "limit": 100,
  "pages": { "max": 10 }
}
```

`max: 10` is 1,000 follows; a person with more fails the action `RECORD_READ_HAS_MORE` rather than silently missing the rest — which also fits the 1,000-value bound on `in` below. Without `pages` the save warns `RECORD_LIST_CURSOR_UNREAD`, because no action reads the follows page's `nextCursor`. The feed query itself stays one page: its cursor goes back to the caller.

The relation is declared once, on the child: an `item` points at its `collection`, and the relation `in-collection` is paired from `item` to `collection`. The `uses` of `item`:

```json
{
  "fields": [
    {
      "source": { "family": "submission", "field": "collectionId" },
      "uses": [{ "kind": "link", "relation": "in-collection" }]
    },
    {
      "source": { "family": "submission", "field": "authorId" },
      "uses": ["filter"]
    }
  ]
}
```

The parent declares no relation. The `uses` of `collection` carry only what the query orders by:

```json
{
  "fields": [
    {
      "source": { "family": "submission", "field": "lastItemAt" },
      "uses": ["filter"]
    }
  ]
}
```

The query is asked of the parent, with the link coming IN:

```json
{
  "tableKey": "collection",
  "clauses": [
    {
      "kind": "link",
      "relation": "in-collection",
      "direction": "incoming",
      "peer": [
        {
          "kind": "field",
          "field": "authorId",
          "op": "in",
          "value": "followed.ids"
        }
      ]
    }
  ],
  "order": { "by": "field", "field": "lastItemAt", "direction": "desc" },
  "limit": 20,
  "cursor": "cursor"
}
```

- **Query the thing the user sees, not the thing they follow.** The clause above asks for collections linked to an item by a followed author, so each collection comes back once however many of its items match. Paging the items and collapsing them afterwards repeats a collection across pages.
- **`incoming` is asked of the table the relation points at.** The `link` use stays on the child's field (`item.collectionId`); the parent needs none, and `peer` clauses are checked against the child's `uses` (`authorId` carries `filter`). Without `direction: "incoming"` the same clause on `collection` is refused `QUERY_CLAUSE_UNROUTED`: the default, `outgoing`, needs the `link` use on the queried table. The refusal says to ask `incoming`.
- **Following nobody is an answer.** A slot holding `[]` runs the action and returns no records. A slot that is absent skips the action, so produce the list in an action that always runs.
- **`in` takes at most 1,000 values.** Past that the action fails with `QUERY_OPERAND_INVALID`; store the membership on the record instead and filter on it.
- **Each collection with its newest items is `linked`, not a second query.** Add `"linked": { "latest": { "relation": "in-collection", "direction": "incoming", "limit": 3, "onMore": "stop" } }` to the query: each collection then carries `linked.latest`, its three newest items (`limit` is per collection), and `linkedMore.latest` when it has more. For each linked read, the records it hangs off times its `limit`, summed over every linked read, must stay within 20,000 — checked at save.
- **Order by a date the record carries.** `order` takes `created`, or one of the table's own date fields with a `filter` use; a record with no value there is left out. To order by something a linked record holds (the newest item's date), keep it on the record — the next pattern.
- **"Due now" is the same shape.** `{ "kind": "field", "field": "nextRunAt", "op": "lte", "value": "runInfo.now" }` reads only the due records; listing them all and filtering in a transform reads the whole table.

### The clause grammar

`record.query` is the one function that joins: a record matches when it matches **every** clause in `clauses` (at most 16). Each clause is one of five kinds. Each value is an argument: a slot path (`"followed.ids"`), a fixed value (`{ "literal": "published" }`; a bare number or `true`/`false` too) or an expression (`{ "expr": "…" }`):

| `kind`     | Members                                                                                                                                                                                                         | Matches                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`    | `field`, `op` (`eq`, `lt`, `lte`, `gt`, `gte`, `in`), `value`                                                                                                                                                   | a field of the table that carries a `filter` use. `in` takes a list (any of them, at most 1,000); dates are ISO 8601 strings                                                                                                                       |
| `term`     | `vocabularyKey`, `slug`                                                                                                                                                                                         | a term of a vocabulary the table surfaces, by slug; an alias resolves to its canonical term                                                                                                                                                        |
| `semantic` | `text`, optional `field`, optional `topK` (default 50, at most 200)                                                                                                                                             | records ranked by meaning against the table's search index. At most one per query, counting one inside a link clause's `peer`                                                                                                                      |
| `link`     | `relation`, optional `direction` (`outgoing` by default, `incoming` or `either`), optional `where[]`, `count` (`{ op, n }` with `op` one of `>=`, `>`, `=`, `<`, `<=`; omitted means at least one) and `peer[]` | records linked by a relation a `link` use declares: on a field of the table, or, for `incoming` and `either`, on a field of a table that points at it; `peer` holds `field`, `term` and `semantic` clauses on the record at the other end, one hop |
| `stream`   | `field`, optional `window` (`from`, `to`), optional `where[]` and `count` (`"exists"` by default, `"none"`, or `{ op, n }`)                                                                                     | event rows of a field that carries a `stream` use, inside a time window                                                                                                                                                                            |

A text `field` clause finds a value of any length with `eq` and `in`; `lt`/`lte`/`gt`/`gte` compare only values up to 2,000 bytes, and the clause's explanation row says how many records it left out (`longTextSkipped`). Keep a field you range over short (`maxLength` 500 or fewer); find long text by meaning with `semantic`. `record.list` and `record.count` take no range on a text field: saving one is refused `RECORD_FILTER_TEXT_RANGE`.

A `where[]` entry is `{ property, op, value }` over a filter the relation or the stream declares. Only a query without a `semantic` clause pages (`cursor`); `limit` is 1 to 100. `POST /v1/records/query` asks the same clauses from outside a flow (`kipory-data`).

## 10. Keep a value rolled up from linked records

A parent that shows its children's count, latest date or common language stores those values itself.

- **Output them from the parent's own processing flow.** Compute the roll-up in the flow (`record.read` the parent with a linked read bringing its children — `"direction": "incoming"`, a `limit`, and `"onMore": "fail"` so a parent with more children than the limit fails rather than rolls up a part; or `record.list` the children with `pages` → `value.transform`) and return it as an output slot. A flow output is a `processed` field, and it can carry a `filter` use like a submitted one: it is stored when the parent's run finishes, so it can be filtered and ordered by. Do not copy it into the record's submitted data with `record.update`: that is a second write per run, and the submitted data should hold only what was sent. Until the parent's next run finishes, filters see the value from its last run.
- **Re-run the parent when a child joins.** The child's flow runs `record.enqueue-process` on the parent, which sets a ready parent back to pending itself; a `record.update` with `setStatus: "PENDING"` before it is not needed. A parent whose own run is under way is not queued again: the action answers `false`, and that run may have read the children before this one joined, so read the answer and queue the parent again later (the next child's run, or a sweep) when it is `false`. Every action runs again under any `replay` value. If the parent's flow files a term on a vocabulary that holds one value and that value can change (the common language, here), set `replay: "clean"`: otherwise the old term stays, the new one is refused, and the run fails. (`record.teardown` is not a substitute here: it fails on a run with no signed-in user and reaches only that user's own records.) `kipory-data`'s `references/in-flow-record-functions.md` has the replay modes. The parent's flow recomputes from all its children, so the value never drifts from a running total. Each re-run is a whole run of the parent's flow and is billed as one (`kipory-operate`).
- **Take the majority, not the first.** For a value the children can disagree on (a language, a category), count them and take the commonest, ignoring an unknown while any child has a known value. Copying the first child's value lets one early odd record decide for the rest.
- **Do not store the children as a list on the parent.** They are the incoming links of the relation; a list in the record grows without bound and cannot be filtered on.

## 11. A read is a view; a flow only when it computes

A read the project asks more than once — "my shelf", "the authors I follow", "one book" — is declared once under the document's `views` and read by name: by one `record.view` action in a flow, by another view as a set or a base, and by a `GET` endpoint that declares nothing but its path. Write an inline `record.list` or `record.query` only when the read needs a value another action computes, or something a view cannot say (the end of this section). A plan steers you: an inline read equal to a declared view warns `READ_REPEATS_VIEW`, and a `GET` whose flow is one inline read answered as is warns `ENDPOINT_IS_A_VIEW`. Neither refuses.

### The worked model, as one document

A reading circle: `author` and `book` are the project's, `follow` and `hide` are each member's own (`ownerScope: "user"`). The endpoint `shelf` (a `GET` on the project's own path `/v1/shelf`) answers the books of the authors the caller follows, newest first, never an author the caller hid, optionally narrowed by `?genre=`; `book` (`/v1/books/{id}`) answers one book. Every field a clause names carries a `filter` use, as for `record.query` (§9).

```json kipory:request=project-document
{
  "kipory": 9,
  "types": {
    "Author": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "country": { "type": "string" }
        }
      }
    },
    "Book": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "authorId": { "type": "string" },
          "publishedOn": { "type": "string", "format": "date-time" },
          "genre": { "type": "string" }
        }
      }
    },
    "Follow": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": { "authorId": { "type": "string" } }
      }
    },
    "Hide": {
      "description": null,
      "definition": {
        "type": "object",
        "properties": { "authorId": { "type": "string" } }
      }
    }
  },
  "tables": {
    "author": {
      "description": null,
      "ownerScope": "project",
      "type": "Author",
      "uses": { "fields": [] }
    },
    "book": {
      "description": null,
      "ownerScope": "project",
      "type": "Book",
      "uses": {
        "fields": [
          {
            "source": { "family": "submission", "field": "publishedOn" },
            "uses": ["filter"]
          },
          {
            "source": { "family": "submission", "field": "genre" },
            "uses": ["filter"]
          },
          {
            "source": { "family": "submission", "field": "authorId" },
            "uses": ["filter", { "kind": "link", "relation": "written-by" }]
          }
        ]
      }
    },
    "follow": {
      "description": null,
      "ownerScope": "user",
      "type": "Follow",
      "uses": {
        "fields": [
          {
            "source": { "family": "submission", "field": "authorId" },
            "uses": ["filter"]
          }
        ]
      }
    },
    "hide": {
      "description": null,
      "ownerScope": "user",
      "type": "Hide",
      "uses": {
        "fields": [
          {
            "source": { "family": "submission", "field": "authorId" },
            "uses": ["filter"]
          }
        ]
      }
    }
  },
  "relations": {
    "written-by": {
      "label": "Written by",
      "description": "book → author",
      "minConfidence": null,
      "direction": "directed",
      "producer": "field",
      "cardinality": "many-to-one",
      "sortOrder": 0,
      "pairings": [{ "fromTableKey": "book", "toTableKey": "author" }]
    }
  },
  "shapes": {
    "authorChip": {
      "table": "author",
      "properties": { "name": "name", "country": "country" }
    },
    "bookCard": {
      "table": "book",
      "properties": {
        "title": "title",
        "publishedOn": "publishedOn",
        "genre": "genre"
      },
      "linked": {
        "author": { "relation": "written-by", "shape": "authorChip" }
      }
    }
  },
  "views": {
    "followedAuthors": {
      "description": "The authors the signed-in member follows.",
      "table": "follow",
      "fields": ["authorId"]
    },
    "hiddenAuthors": { "table": "hide", "fields": ["authorId"] },
    "visibleBooks": {
      "table": "book",
      "where": [
        {
          "kind": "field",
          "field": "authorId",
          "op": "not-in",
          "set": { "view": "hiddenAuthors", "field": "authorId" }
        }
      ]
    },
    "myShelf": {
      "description": "New books by the authors I follow, newest first.",
      "extends": "visibleBooks",
      "params": { "genre": { "type": "string", "optional": true } },
      "where": [
        {
          "kind": "field",
          "field": "authorId",
          "op": "in",
          "set": { "view": "followedAuthors", "field": "authorId" }
        },
        { "kind": "field", "field": "genre", "op": "eq", "param": "genre" }
      ],
      "order": { "by": "field", "field": "publishedOn", "direction": "desc" },
      "pageSize": { "default": 20, "max": 50 },
      "shape": "bookCard"
    },
    "book": {
      "table": "book",
      "scope": "project",
      "one": true,
      "params": { "id": { "type": "string" } },
      "where": [{ "kind": "field", "field": "id", "op": "eq", "param": "id" }],
      "shape": "bookCard"
    }
  },
  "flows": {
    "get-shelf": {
      "label": "Get shelf",
      "description": null,
      "inputTypeNames": [
        { "slot": "genre", "typeName": "string", "required": false },
        { "slot": "readAfter", "typeName": "string", "required": false },
        { "slot": "readBefore", "typeName": "string", "required": false },
        { "slot": "readLimit", "typeName": "number", "required": false }
      ],
      "outputTypeNames": [
        { "slot": "shelf", "typeName": "object", "required": true }
      ],
      "outputBinding": { "shelf": { "fromSlot": "page" } },
      "actions": {
        "read": {
          "description": null,
          "functionKey": "record.view",
          "functionConfig": { "view": "myShelf" },
          "condition": null,
          "outputSlot": "page",
          "outputSchema": null,
          "enabled": true
        }
      }
    },
    "get-book": {
      "label": "Get book",
      "description": null,
      "inputTypeNames": [
        { "slot": "id", "typeName": "string", "required": true }
      ],
      "outputTypeNames": [
        { "slot": "book", "typeName": "object", "required": true }
      ],
      "outputBinding": { "book": { "fromSlot": "found" } },
      "actions": {
        "read": {
          "description": null,
          "functionKey": "record.view",
          "functionConfig": { "view": "book" },
          "condition": null,
          "outputSlot": "found",
          "outputSchema": null,
          "enabled": true
        }
      }
    }
  },
  "surfaces": {
    "endpoints": {
      "shelf": {
        "contractConfig": {
          "method": "GET",
          "path": "/v1/shelf",
          "params": {},
          "successStatus": 200,
          "auth": "required"
        },
        "targetConfig": {
          "kind": "flow.invoke",
          "execution": "sync",
          "flow": "get-shelf",
          "inputs": {}
        }
      },
      "book": {
        "contractConfig": {
          "method": "GET",
          "path": "/v1/books/{id}",
          "params": {
            "id": { "in": "path", "type": "string", "required": true }
          },
          "successStatus": 200,
          "auth": "required"
        },
        "targetConfig": {
          "kind": "flow.invoke",
          "execution": "sync",
          "flow": "get-book",
          "inputs": {}
        }
      }
    }
  }
}
```

A member's `GET` of `/v1/shelf?genre=poetry&limit=5` answers:

```json
{
  "items": [
    {
      "id": "ckbk01",
      "title": "Salt Lines",
      "publishedOn": "2026-06-15T00:00:00.000Z",
      "genre": "poetry",
      "author": { "id": "ckau07", "name": "Ines Amaro", "country": "PT" }
    }
  ],
  "nextCursor": "eyJ2Ijo…",
  "prevCursor": null,
  "paging": null
}
```

Map keys may come in any order: a view may be listed before the set, base or shape it names, and a document may delete a view together with the table it reads.

### A view

| Field         | Holds                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table`       | the table it reads. Not beside `extends`, which takes the base's                                                                                                                                                                                               |
| `scope`       | `"caller"` (the default): a person-owned table — its own, a set's, the base's or a linked one — answers only the signed-in person's rows. `"project"`: the project's rows; refused on a view reaching a person-owned table (`VIEW_SCOPE_PROJECT_READS_PEOPLE`) |
| `extends`     | a base view: its `table`, `scope` and `where` are taken, and this view's `where` is added to them. One level only (`VIEW_EXTENDS_DEPTH`)                                                                                                                       |
| `params`      | the values a reader gives, by name — at most 16                                                                                                                                                                                                                |
| `where`       | conditions every row meets, all of them (at most 16, the base's counted in). Absent reads every row the scope allows                                                                                                                                           |
| `order`       | `{ "by": "created" }` (newest first), `{ "by": "field", "field": <a date field with a filter use>, "direction": "desc" or "asc" }` — a record with no value there is left out — or `{ "by": "meaning" }` beside a `semantic` clause                            |
| `pageSize`    | `{ "default", "max" }`, each 1 to 100. Absent: 50 a page (or `max`, if lower), up to 100                                                                                                                                                                       |
| `pages`       | read every page in one read, as on `record.list` (`kipory-data`)                                                                                                                                                                                               |
| `shape`       | the shape each row takes. Or `fields` (which fields each row carries) and `linked` (linked records, as on `record.query`), not both                                                                                                                            |
| `one`         | `true`: at most one record. The view must filter `id` by `eq` (`VIEW_ONE_NOT_UNIQUE` otherwise)                                                                                                                                                                |
| `description` | a sentence saying what it answers                                                                                                                                                                                                                              |

**`where` is `record.query`'s clause grammar (§9), with fixed values only.** A view reads no run slot, so where an action's bare string would be a slot path, a view's fixed text is written `{ "literal": … }`: `{ "kind": "field", "field": "genre", "op": "eq", "value": { "literal": "poetry" } }`. A bare number or `true`/`false` stays as it is. A bare text is refused, and so is an `{ "expr": … }`; a value the reader gives is a `param`. The same form holds at every operand of a clause: a `term`'s `slug`, a `semantic` `text` or `likeRecordId`, a `link` or `stream` `where` entry's `value`, a stream `window`'s `from` / `to`, a `peer` field clause's `value`. A `field` clause carries exactly one of three operands:

- `value` — a fixed value, `{ "literal": … }` (a list for `in` and `not-in`: `{ "literal": ["novel", "poetry"] }`), or a bare number or `true`/`false`;
- `param` — one of the view's `params`;
- `set` — `{ "view": <key>, "field": <field> }`: the values of `field` across that view's rows (`field` defaults to `id`), compared with `in` or `not-in`.

`not-in` is the exclusion: it keeps a record holding none of the values, and keeps a record with no value in the field at all — an exclusion removes only what it names. `field: "id"` compares the record's own id (`eq`, `in`, `not-in`) and needs no use.

### Sets: the caller's own rows as an operand

A set is read in the same statement as the outer view, as the same caller, with no cap on its size: `followedAuthors` holding 2,500 authors costs one statement, not a list in a slot (an inline `in` stops at 1,000). Because the exclusion runs before the page is cut, a page is full whenever enough rows match.

- A set view holds only `field` clauses and sets of its own, two levels deep at most (`VIEW_SET_DEPTH`). A `link`, `term`, `stream` or `semantic` clause in a set, or `one` or `linked` on it, is refused `VIEW_SET_CLAUSE_KIND`; a view with a `semantic` clause uses no set (`VIEW_SET_WITH_SEMANTIC`).
- The set's `field` is a field of the set's table with a `filter` use, or `id` (`VIEW_SET_FIELD_UNKNOWN`), and of the same kind as the field it is compared to — text to text, number to number (`VIEW_SET_FIELD_TYPE`).
- `pageSize` and `pages` of a set view are ignored.
- An empty set is an answer, not an error: `in` it matches nothing (the caller follows nobody: an empty shelf), `not-in` it matches everything (the caller hid nobody).
- A set or a base reads under the same caller, so one member's follows never reach another's read.
- A set or base is checked from its readers' side too: an edit to `followedAuthors` alone that would break `myShelf` is refused on `myShelf`.

### Params: an absent value never widens the read

```json
"params": {
  "genre": { "type": "string", "optional": true },
  "minStars": { "type": "integer", "min": 1, "max": 5, "default": 1 },
  "ids": { "type": "list", "items": "string", "max": 50 }
}
```

<!-- field-ok: minStars — one project's example param name, not a platform field -->

- **`type`**: `string`, `integer`, `number`, `boolean`, `date-time`, `enum` (with `values`), or `list` (with `items`: `string` or `integer`, for `in` and `not-in`). `min` and `max` bound a number, a text's length or a list's length.
- **Absent, a param takes its `default`.** With `optional: true` instead, every clause naming it is left out — and only those clauses. With neither it is required: a read without it fails `VIEW_PARAM_MISSING` before reading anything. A value of the wrong type or out of bounds fails `VIEW_PARAM_INVALID`. A param has a `default` or `optional`, not both.
- A param is never named `after`, `before` or `limit`: those are the names a request pages by.
- **A param of a set or a base needs a `default`** (`VIEW_SET_PARAMS`, `VIEW_BASE_PARAMS`): its reader cannot pass it a value. A view does not redeclare its base's param (`VIEW_PARAM_SHADOWS_BASE`).

This replaces the two-branch recipe for an optional filter: `?genre=` absent reads the whole shelf, present narrows it, in one action.

### Shapes: the answer's type, named once

A shape maps answer properties to one table's fields (renaming as it likes), and its `linked` properties carry the records a relation brings, each in a shape of the other table: `relation`, and optionally `direction`, `limit`, `onMore`, as a linked read on `record.query`. A row in a shape carries `id` and exactly the properties named, nothing else; a linked one-record property is absent when there is no linked record, and a list stays a list. Two levels of linked at most (`SHAPE_LINKED_DEPTH`). No expressions, no vocabularies: compute in a flow action. A field the table does not have is `SHAPE_UNKNOWN_FIELD`, a linked shape of another table than the relation reaches `SHAPE_TABLE_MISMATCH`. The flow slot the view answers into, the endpoint's answer and its schema in the project's OpenAPI document (a component per shape, `BookCard` and `AuthorChip` here) all take their type from the shape; a view with no shape answers the table's typed rows.

### `record.view` in a flow

<!-- field-ok: readAfter — a flow input a project names, after its `record.view` action `read` -->
<!-- field-ok: readBefore — a flow input a project names, after its `record.view` action `read` -->
<!-- field-ok: readLimit — a flow input a project names, after its `record.view` action `read` -->
<!-- field-ok: readShelfAfter — a flow input a project names, after its `record.view` action `read-shelf` -->

`functionConfig` is `{ "view": <key> }`. The action reads the run's slots named like the view's params, and its own paging inputs, named after the action: for the action `read`, `readAfter` (or `readBefore`) and `readLimit` (1 to `pageSize.max`); for `read-shelf`, `readShelfAfter` and so on. So two `record.view` actions in one flow page independently, each by its own cursor. The flow declares an input of each of those names it exposes; state no `inputStreams` — the action runs even when every one of them is absent. It answers `{ records, nextCursor?, prevCursor? }`, or `{ record? }` for a `one` view; type the flow output that carries it `object`. It reads with `record.query`'s engine and is billed as one action. Read the page in a later action as you would `record.query`'s (`page.records`) — a flow that computes over the page is still a flow; it is just not a view endpoint (below).

**Who it reads as.** A `scope: "caller"` view reaching a person-owned table needs a signed-in person. The plan refuses `VIEW_CALLER_WITHOUT_PERSON`, naming the start, the flow, the view and the table, when a flow that reads such a view — directly, through `flow.invoke`, or behind a `flow.dispatch` — can start with no person: a schedule, a trigger, processing of a project-owned table, an eval suite with no run-as member. Processing of a person-owned table (it runs as the record's owner), `flow.start-per-person` and a credentialed endpoint called with a session start with one. An `auth: "none"` endpoint over such a flow is refused `PUBLIC_ENDPOINT_NEEDS_USER`, naming the view; serve the public part from a `scope: "project"` view. An API key calling a credentialed endpoint over it gets `403` before any read, as for any per-user read (§8).

### A view endpoint: declare the path, nothing else

A `GET`, synchronous `flow.invoke` endpoint whose answer — `responseBody`, or the flow's only output — is a `record.view` page bound unchanged is a **view endpoint**. Its contract is derived from the view at save:

- **Declare no query params and no `inputs`.** The query takes the view's params, typed and bounded as declared, plus `after`, `before` and `limit`. A param binds the flow input of the same name; `after`, `before` and `limit` bind the answering action's own paging inputs (`readAfter`, `readBefore`, `readLimit` for the action `read`). A path parameter (`{id}` above) is declared as today and feeds the param of its name. A flow input typed otherwise than the view gives it is refused `VIEW_INPUT_TYPE`.
- **Never declare `after`, `before` or `limit` in the contract.** An endpoint that does — or an asynchronous one — is not a view endpoint: it keeps the contract it declares, and the plan warns `VIEW_ENDPOINT_NOT_DERIVED` naming why.
- **The answer** is `{ items, nextCursor, prevCursor, paging: null }`, cursors `string | null`: walk forward with `?after=<nextCursor>` and back with `?before=<prevCursor>`. A view ranked by meaning takes no cursor and answers both `null`. A `one` view answers the record itself, and the same `404 NOT_FOUND` for a record that does not exist and one the caller may not read.
- **Refusals**: an unknown query key, a value of the wrong type, out of bounds or missing, `?limit=` past `pageSize.max` — `422 VALIDATION_FAILED` naming it. A cursor from another view, another person or other params — `400 VIEW_CURSOR_INVALID`, never another read's rows.
- **A view, shape or flow edit** re-derives the endpoint in the same apply; the plan lists it as an `update` of `surfaces.endpoints.<key>`, with `published.query.<param>` for a param renamed, retyped, added or removed.
- **An endpoint whose flow edits the page** (a transform counting or reshaping it) is an ordinary endpoint and answers exactly what its flow outputs.

**ETag.** A view endpoint whose flow is exactly one enabled `record.view`, every input from the request, over a view that reads only fields and links — no `term`, `stream` or `semantic` clause anywhere in it, its sets, base or linked reads, no vocabularies, no file field — answers an `ETag`. Send it back as `If-None-Match`: while nothing the answer depends on changed (the records and links of every table the view reads, the project's configuration, the caller, the params, the page), the answer is `304` with no body, no run and no charge. Add a guard or any other action and the endpoint still pages by the view but answers no ETag. Every view-endpoint answer carries `Cache-Control: private, no-cache`. The project's OpenAPI document says which operations answer `304`.

### Try a view before a flow uses it

`POST /v1/views/{key}/preview?project=<id>` with `{ "asUserId": <a member>, "params": { "genre": "poetry" }, "limit": 5 }` reads an applied view as that member — `asUserId` is left out for a view reaching no person's records — and answers the page (`items`, `nextCursor`, `prevCursor`, `paging: null`) beside `itemSchema` (one row's JSON Schema), `tables` (every table the read reaches: `book`, `follow`, `hide` for `myShelf`) and `clauses` (what it ran, base and params merged in). It needs the viewer role and writes, charges and runs nothing. An unknown key is `404`; a caller view with no `asUserId`, `422`. It reads applied views: plan and apply the view first.

### What a view cannot say yet

Write these as a flow action after `record.view` (the endpoint then answers what the flow computes, with no derived paging), or inline:

- **OR across clauses** — a view's clauses are all required; "followed authors' books, or anything tagged featured" is two reads.
- **Order by a linked record's value** ("collections by their newest item") — keep that value on the record (§10) and order by it.
- **A set over `link` or `term` clauses** — a set holds `field` clauses and sets only.
- **A value the run computes** — a view reads no slot; a filter built by an earlier action is an inline `record.query` (§9).
- **Computed answer properties** — a shape renames and links; a `value.transform` after the read computes.
