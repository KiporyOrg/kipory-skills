---
name: kipory-data
description: Read and write a Kipory project's records, files and links by hand over the design API — create, upsert, bulk-import, correct, backfill, re-file, reprocess and delete records; list, filter, query and search them; assert and walk links; upload, attach and delete files; watch a record being processed. Use when the user asks to seed, import (a CSV, a bulk), fix, backfill, reprocess or remove records, to see or query what a project holds, or asks why a record is missing, unsearchable or not attached to its file. Not for defining tables (kipory-model), not for the flow that writes records for the product's users (kipory-build), not for search inside a flow (kipory-retrieve), not for why a record failed or is stuck (kipory-diagnose).
license: MIT
---

# Read and write a project's data

A project's records are normally written by **flows**: a record comes into being when an action such as `record.create` runs — inside a dynamic endpoint your product's users call, a schedule, or a processing flow. That is still the path that scales, and the one your product should use.

The design API also writes records directly, at one prefix, `/v1/records`: `POST /v1/records` creates one by hand (or upserts it by natural key), `POST /v1/records/bulk` writes up to 500 in one change set, and `GET /v1/records/{id}`, `PATCH`, `DELETE`, `POST …/reprocess` and `PUT …/vocabularies/{vocabularyKey}` read, correct, end, re-run and re-file an existing one. Alongside those it gives you the **read side** (list, search, one hop of links, the processing stream), the **file handshake**, curated links, and the ingest report. The fact most people get wrong: a key-driven run writes the **project's shared pool** — a table whose owner scope is per-user refuses a key with a 403, because a key carries no user.

Every route here answers on the **api host** with your key. A list, create, query or bulk names the project by its **node id** as `project` (`?project=` on a GET, `project` in a body); a route addressed by a record's or a file's id needs no project at all — the row carries it.

## Before the first call

- Read `references/api/records.md`, `references/api/files.md` and `references/api/ingest.md` for every field. The list read has a large query surface and it is `strict`: an undeclared query key is a 422, not ignored.
- Know which table you are asking about. `GET /v1/records?project=<node>` picks the table holding the most records when you omit `tableKey`, and says so in `contract.chosenByDefault`.
- Know the role each call needs. Reads are VIEWER. Creating, patching, bulk-writing, re-filing and reprocessing a record, stating or retracting a link, and uploading, attaching or detaching a project file are EDITOR — and a record write that queues processing, like a reprocess, is charged as any live run is. Deleting a record or a project's file, and the cache bust, are ADMIN.
- If the project is retired, a key granted at the project itself answers 401 on every call. A key granted above it, or a signed-in person, still reads, and every write below answers 409.

## The sequence

**Look at what is there.**

```
GET /v1/records?project=<node>&tableKey=<type>&limit=50           one page, newest first — `tableKey`, the same name the bodies use
GET /v1/records?project=<node>&tableKey=<type>&q=<text>            natural key + declared text fields, case-insensitive
GET /v1/records?project=<node>&tableKey=<type>&mode=semantic&q=<text>   a bounded ranking, no pages
GET /v1/records?project=<node>&id=<id>&id=<id>                     name records by id (up to 100), any type; missing ids are absent
GET /v1/records?project=<node>&tableKey=<type>&key=<naturalKey>    the one record with exactly that natural key
GET /v1/records?project=<node>&tableKey=<type>&fields=<a>&fields=<b>   each row also carries those fields' values, in `values`
GET /v1/records/{id}                                               one record whole: its `data`, its `version`, its type's contract
POST /v1/records/query  { project, tableKey, clauses?, order?, limit?, linked? }   fields, terms, links, streams and one phrase in one question; each record with its linked records
POST /v1/views/{key}/preview?project=<node>  { asUserId?, params?, after?, before?, limit? }   one page of a named view as that member reads it, with its item schema; writes and charges nothing
```

A row's `fields` holds only the table's queryable columns, not its `data`. To read some fields of many records, name them with `fields=` (up to 32, `tableKey` required) on the page you already read, or beside `id=` for records you hold ids of — one request a page, never one `GET /v1/records/{id}` a record. A name is a top-level field the table declares, submitted or produced by its flow; a value comes whole, and a field the record has no value for is left out of `values`; an unknown or dotted name, or a stream field, is 422 `RECORD_PROJECTION_UNKNOWN_FIELD` listing the table's fields.

Narrow the list with repeated `field=name:operator:value` and `term=vocabulary:key` (up to 32 of each, AND-composed), `owner`, `status`, `createdAfter`, `createdBefore`. Page with `after` / `before` cursors; `limit` is at most 100. A `term=` condition matches **active** terms only: a record filed under a candidate term is not found by it until the term is admitted (`kipory-model`).

The query body asks what the address cannot spell — a link to another record, a stream window, `in` — and it is the one route that brings each record's **linked records** with it. Leave `clauses` out and it lists the table's records, newest first, paged by `after` like the list; add `linked` and every row carries `linked.<name>`:

```
POST /v1/records/query  { "project": "<node>", "tableKey": "book",
                          "linked": { "author": { "relation": "written-by", "fields": ["name"] },
                                      "reviews": { "relation": "about", "direction": "incoming", "limit": 20 } } }
```

`author` is one record (outgoing on a relation declared many-to-one), `reviews` a list of at most 20 per book — `limit` is per record, not a total; more than 20 is 422 `VALIDATION_FAILED` with `details.reason` `RECORD_LINKED_HAS_MORE` unless the linked read says `"onMore": "stop"`, which keeps 20 and sets `linkedMore.reviews`. A linked read may carry one more level of `linked`. Each linked record is this route's own row shape. `GET /v1/records` takes no `linked` (an unknown member, 422): send `linked` to this POST. The rules and every refusal are in `kipory-model`'s `references/packs/tables-and-types.md`, "One question across the stores". Its clause grammar, `bounded` and `explanation` are in `kipory-model`'s `references/packs/tables-and-types.md`, "One question across the stores". Read `bounded` before `records`: it says whether every matching record was in reach.

A stream field's events are not in the record's `data`. `GET /v1/records/{id}/stream/{field}` pages them newest first, inside the window the field's retention keeps; only a flow's `record.append` action writes them.

The `field=` operators are the platform's one comparison vocabulary — the same words `POST /v1/records/query`, `record.query` and link `where` clauses use: text, reference and boolean take `eq`; number takes `eq`, `gt`, `gte`, `lt`, `lte`; date takes `gt`, `gte`, `lt`, `lte` (a range is two conditions). So `field=cuisine:eq:Italian`, `field=price:lte:20`. A word the field's family does not take is a 422 naming the ones it does. The query body adds `in` (a list), which the address cannot carry. Only fields with a `filter` use can be conditions; `contract.undeclaredFields` lists the rest — a `search`-only field such as an extracted `body` appears there, which is normal, not a misconfiguration.

`key=` matches the stored natural key exactly, case and all. Both sides are **trimmed** of surrounding whitespace: the stored key when the record is written, the lookup when it arrives.

**Walk and state links.**

```
GET    /v1/records/{id}/links/{relationKey}                     one hop, one kind, no depth — for the records themselves, `linked` on the query
POST   /v1/records/{id}/links/{relationKey}                     { targetRecordId, properties? } → { linkId, outcome, revived }
DELETE /v1/records/{id}/links/{relationKey}/{peerRecordId}      retract your own assertion → { id, deleted: true, retracted: true }
GET    /v1/links?project=<node>&relation=<key>              every link in the project as rows
```

`{relationKey}` is the relation's **key**, not its id. The walk takes `direction` — `outgoing` (the default), `incoming` or `either`; any other word is a 422, and a symmetric relation ignores it. So from a product to its supplier is the default, and from a supplier back to its products is `?direction=incoming`. A busy record's walk pages: pass `nextCursor` back as `after`. Asserting and retracting need EDITOR on **both** records' project, and work on `curated` relations only — a `field` relation's link is changed by changing the record's field.

**Get a file in.** Three calls, and the bytes never pass through the API:

```
POST /v1/files/upload-url      { project, fileName, contentType, size } → { fileId, uploadUrl, key, expiresAt }
PUT  <uploadUrl>                the bytes, within 15 minutes, with `Content-Type: <contentType>`
POST /v1/files/{id}/confirm → { fileId, status: "uploaded", uploadConfirmedAt }
```

The signed URL does not pin `Content-Type`, so another value or none does not fail the PUT. Send the `contentType` you declared anyway: on `confirm` the file's type is taken from what storage recorded, and functions gate on it — `pdf.parse` refuses anything but `application/pdf`.

Then **attach it**. A file uploaded with `project` is a **project** file, so a key's upload attaches to a record of a project-scoped table. Two ways:

```
POST /v1/files/{id}/attach   { record }    by hand: hang a confirmed project file on an existing record (EDITOR) → { id, record }
record.create  fileIds                     in a flow: attach the ids in the same transaction as the record write
```

- **The attach route runs nothing.** Follow it with `POST /v1/records/{id}/reprocess` when the table's processing flow should read the file. It answers 409 for a file a flow produced, an upload not confirmed yet, a file another record already carries, a person's own upload on a record that is not theirs, and a record that already holds the same content.
- **`POST /v1/records` takes no file field.** Create the record, then attach.
- **The rest of the file surface:** `GET /v1/files?project=<node>` lists the project's files. `POST /v1/files/{id}/detach` releases a file from its record and keeps its bytes. `DELETE /v1/files/{id}` (ADMIN on the file's project) removes the file, and its bytes once no other file row still names them → `{ id, deleted: true }`. Detach and delete both refuse (409) a file a flow produced for a record; a file an endpoint, schedule or trigger run produced and kept because a link was made to it hangs on no record, and delete removes it. `GET /v1/files/{id}/download-url` answers a signed `downloadUrl` for the bytes — valid for 15 minutes on a project's file — and refuses (409) an upload not confirmed yet.

**Two ways to hand an upload to a flow, and they take different values.** `fileIds` names a slot holding a **list** of `fileId`s from `upload-url`; a single id string attaches nothing and nothing says so, so give one id as a one-item list: `"fileIds": { "expr": "[fileId]" }`. A flow input declared with the builtin `file` type takes a file reference `{ "key": "<upload-url's key>", "name": "products.csv", "mime": "text/csv" }` — all three required; a bare `fileId` string is a `422 Expected object`.

**A bulk import from your key, processed on ingest.** Choose by what the file becomes:

- _One file, one record_ (a document to search): three calls and no flow of your own — `POST /v1/records` creates the record, `POST /v1/files/{id}/attach` hangs the upload on it, `POST /v1/records/{id}/reprocess` runs the table's processing flow, which reads the attached file from its `files` input and produces the searchable fields. The create queues a first run of its own, so wait for the record to settle (`ready` or `failed`) before the reprocess — while a run is queued or under way it answers `409 RECORD_NOT_RERUNNABLE`. That first run sees no file, so expect it to fail or produce an empty body; the reprocess is the run that counts. For your product's users, the same thing is an endpoint flow (`kipory-expose`): it takes the `fileId`, wraps it in a one-item list, runs `record.create` with that list in `fileIds`, then `record.enqueue-process`.
- _One file, many records_ (a CSV): upload, then call an endpoint whose flow takes a `file` input, reads it (`file.read-text`), parses rows in a `value.transform` (`references/csv-import.md` has a worked expression), and writes each row in a `flow.fan-out` branch. A file with no valid rows starts no branch, so build the flow's answer in an action that also reads the parse action's own output — or the call is refused `422 FLOW_OUTPUT_MISSING`. Re-importing converges on the same records when the rows are unchanged (below).
- _Rows you already hold as data_ (no file needed): one `POST /v1/records/bulk` of up to 500 creates, each `{ tableKey, data, onKeyTaken: "update" }` — a row whose natural key a record already holds updates that record instead of being refused, so re-running the import is safe.

**Correct or backfill existing records.** One record is a `PATCH`; many are one bulk:

```
GET   /v1/records?project=<node>&tableKey=<type>&limit=100    ids and versions (every row carries `version`; follow `nextCursor`)
PATCH /v1/records/{id}     { "version": <version>, "merge": { "phone": "…" } }       one record
POST  /v1/records/bulk     { "project": "<node>", "items": [ { "id", "version", "merge": { "phone": "…" } }, … ] }   up to 500
```

- **`merge` or `data`.** `merge` names only the keys that change (`null` removes one); `data` instead replaces the whole document. Either way the result is validated against the table's current type and the record is re-indexed. The processing flow does **not** re-run.
- **A bulk writes all of its items or none.** It judges every item first: a refusal is a 422 `RECORD_BULK_REFUSED` whose `details.issues[].path` names each item (`items.3`) and whose `code` is the item's own. `"validateOnly": true` answers what each item would do and writes nothing.
- **`RECORD_VERSION_STALE`** means a run moved the row since you read it — re-read and resend. A row that moves in the instant between the judgement and the write answers 409 with the same code and the same `details.issues[]` shape; it is not a key conflict.
- **`RECORD_NATURAL_KEY_TAKEN`** on a create item means another record already holds the natural key; send the item with `onKeyTaken: "update"` to update that record.

⭐ **Adding a required field to a table with records is four calls**: widen the type with the field optional (`kipory-evolve`), list the ids and versions, one bulk `merge` setting the field on each, then make it required.

**Delete a record.** `DELETE /v1/records/{id}` (ADMIN, irreversible) removes the record and everything derived from it — terms, links, files it produced, vector points — and answers `{ id, deleted: true, outcome }`: `removed`, or `draining` when a run was over it (it goes at that run's next action). The bulk route takes creates and updates only, so to clear a table, page `GET /v1/records?project=<node>&tableKey=<type>` and delete each id.

**Run a record's processing flow again.**

```
POST /v1/records/{id}/reprocess   → { id, status: "pending", mode: "full" }
```

- **It is a clean slate.** The record's term assignments are removed before the run — a vocabulary filed by hand with `PUT …/vocabularies/{vocabularyKey}` included — and a failed run does not bring them back. Its processed fields and generated files are replaced only when the run succeeds; a successful run removes each earlier generated file it did not attach again and its processed fields do not name. Its previous output is dropped, nothing is answered from an action cache, and every action runs against the flow as it is now. So it is the call to make after you edit a flow, attach a file, or correct a record's data: an edit to the flow since the record last ran is no reason for it to be refused.
- **It is charged like the record's first processing** — every model call is billed again, and so is every run it queues through `record.enqueue-process`. It settles to the project's wallet unless the record's own owner asked for it (`kipory-operate` has what a run costs).
- **It refuses what it cannot start.** `409 RECORD_NOT_RERUNNABLE`: a run is already queued or under way (or the queue could not be read to tell), the record is being deleted, or a person-owned record's owner no longer exists. `409 RECORD_STATUS_MOVED`: something else moved the record first; read it and ask again. `422 RECORD_NOT_PROCESSABLE`: the table binds no processing flow. `503 RECORD_NOT_QUEUED`: the run could not be queued; ask again.
- **Inside a flow** the same thing is `record.enqueue-process`, whose `replay` chooses what the run keeps — `references/in-flow-record-functions.md` has the three modes.

**See what processing did.**

```
GET /v1/records/{id}/processing-stream           SSE: snapshot · status · error · close · done
GET /v1/projects/{nodeId}/ingest/summary?window=7d   what the ingest workers fetched, cached, and failed
```

## What will bite you

Each of these is a trap with its explanation and remedy in [references/pitfalls.md](references/pitfalls.md). Read the entry before you build on the thing it names:

- Working around a problem in silence.
- A per-user table refuses a key's run.
- A pool record's identity is its content.
- A natural-key collision inside a flow discards the whole run.
- A record is `ready` or `pending` depending on its table, and who queues it depends on who wrote it.
- A processed field sits in a different place on each read.
- `paging` on the records list is nullable, and null is normal.
- A read that runs past the 4 s budget is a 422 `QUERY_TOO_BROAD`, not a 500.
- `terms` on a row is capped at two chips.
- `null` means not measured, never zero
- An unknown relation answers 200 with no links
- `upload-url` promises nothing about bytes.
- `confirm` does not attach.
- A record's terms are added to, never replaced, by a run.
- The default file listing hides flow output.
- A record FAILURE on the processing stream is a `status` frame, not an `error` frame.
- The stream ends on its own.
- Cache bust spends money and is ADMIN.
- Semantic search can 503 through no fault of yours.

## References

| File                                     | What it answers                                                                                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/api/records.md`              | every query key, operator and response field of the records list; the link routes                                                                                                                         |
| `references/api/files.md`                | the upload handshake, listing scopes and totals, download, attach and detach                                                                                                                              |
| `references/api/ingest.md`               | the summary's vocabulary — outcomes, cache, quota — and the bust call                                                                                                                                     |
| `references/csv-import.md`               | a worked CSV parse for a `value.transform`, and what goes wrong around a file import                                                                                                                      |
| `references/in-flow-record-functions.md` | the same work from inside a flow: counting, reading and stating links, appending to a stream, deleting, re-running a record and its three `replay` modes, and the owner scoping that differs from a route |
| `references/pitfalls.md`                 | each trap of reading and writing data, with what happens and what to do                                                                                                                                   |

The function that writes a record is `record.create`; its config and worked example are in `kipory-build` under `references/functions/`.

## Then

`kipory-extract` when a file attached to a record has to become text. `kipory-retrieve` to search or answer from the records inside a flow; `kipory-model` when a table's records never become searchable. `kipory-operate` for what a run or a reprocess cost. `kipory-evolve` before deleting records to clear a table. `kipory-build` to author the flow that creates or processes records at scale — the path every record your product's own users produce travels, and the one the write above is the operator's exception to. `kipory-model` when the table, vocabulary or relation you need does not exist yet. `kipory-diagnose` when a record processed and came back wrong: the processing stream tells you _that_ it failed, the run's timeline tells you _where_. `kipory-expose` to put the record write on HTTP for your product's users.
