---
name: kipory-data
description: Work with a Kipory project's own data over the design API — create, correct, re-file, re-run and delete one record by hand, list and search its records, read and state typed edges between them, upload and attach files, watch a record being processed, and see what the ingest workers fetched and cached. Use when the user asks to add, fix, re-file, re-run or remove a record, or to see, query, import or upload what a project holds, or asks why a record is stuck, missing, or not attached to its file. Not for defining record types (that is modelling), not for authoring the flow that writes records at scale (that is building), and not for the product's own end-user API, which is a dynamic endpoint.
license: MIT
---

# Read and write a project's data

A project's records are normally written by **flows**: a record comes into being when a step such as `entity.create` runs — inside a dynamic endpoint your product's users call, a schedule, or a processing flow. That is still the path that scales, and the one your product should use.

The design API also writes records directly, at one prefix, `/v1/records`: `POST /v1/records` creates one by hand (or upserts it by natural key), `POST /v1/records/bulk` writes up to 500 in one change set, and `GET /v1/records/{id}`, `PATCH`, `DELETE`, `POST …/reprocess` and `PUT …/facets/{facetKey}` read, correct, end, re-run and re-file an existing one. Alongside those it gives you the **read side** (list, search, one hop of edges, the processing stream), the **file handshake**, curated edges, and the ingest report. The fact most people get wrong: a key-driven run writes the **project's shared pool** — a record type whose owner scope is per-user refuses a key with a 403, because a key carries no user.

Every route here answers on the **api host** with your key. A list, create, query or bulk names the project by its **node id** as `project` (`?project=` on a GET, `project` in a body); a route addressed by a record's or a file's id needs no project at all — the row carries it.

## Before the first call

- Read `references/api/records.md`, `references/api/files.md` and `references/api/ingest.md` for every field. The list read has a large query surface and it is `strict`: an undeclared query key is a 422, not ignored.
- Know which record type you are asking about. `GET /v1/records?project=<node>` picks the type holding the most records when you omit `recordType`, and says so in `contract.chosenByDefault`.
- If the project is retired, every write below answers 409 — reads still pass.

## The sequence

**Look at what is there.**

```
GET /v1/records?project=<node>&recordType=<type>&limit=50         one page, newest first — `recordType`, the same name the bodies use
GET /v1/records?project=<node>&recordType=<type>&q=<text>          natural key + declared text fields, case-insensitive
GET /v1/records?project=<node>&recordType=<type>&mode=semantic&q=<text>   a bounded ranking, no pages
GET /v1/records?project=<node>&id=<id>&id=<id>                     name records by id (up to 100), any type; missing ids are absent
GET /v1/records?project=<node>&recordType=<type>&key=<naturalKey>  the one record with exactly that natural key
GET /v1/records/{id}                                               one record whole: `record.data`, `record.version`, its type's contract
```

Narrow with repeated `field=name:operator:value` and `term=facet:key` (up to 32 of each, AND-composed), `owner`, `status`, `createdAfter`, `createdBefore`. Page with `after` / `before` cursors; `limit` is at most 100.

The `field=` operators are the platform's one comparison vocabulary — the same words `POST /v1/records/query`, `entity.query` and edge `where` clauses use: text, reference and boolean take `eq`; number takes `eq`, `gt`, `gte`, `lt`, `lte`; date takes `gt`, `gte`, `lt`, `lte` (a range is two conditions). So `field=cuisine:eq:Italian`, `field=price:lte:20`. A word the field's family does not take is a 422 naming the ones it does. The query body adds `in` (a list), which the address cannot carry. Only fields with a `filter` use can be conditions; `contract.undeclaredFields` lists the rest — a `search`-only field such as an extracted `body` appears there, which is normal, not a misconfiguration.

`key=` matches the stored natural key exactly, case and all. Both sides are **trimmed** of surrounding whitespace: the stored key when the record is written, the lookup when it arrives.

**Walk and state edges.**

```
GET    /v1/records/{id}/relations/{kind}                     one hop, one kind — there is no multi-hop
POST   /v1/records/{id}/relations/{kind}                     { targetRecordId, properties? } → { edgeId, outcome, revived }
DELETE /v1/records/{id}/relations/{kind}/{peerRecordId}      retract your own assertion → { id, deleted: true, retracted: true }
GET    /v1/relations?project=<node>&link=<kind>              every edge in the project as rows
```

`{kind}` is the relation kind's **key**, not its id. The walk takes `direction` — `outgoing` (the default), `incoming` or `either`; any other word is a 422, and a symmetric kind ignores it. So from a product to its supplier is the default, and from a supplier back to its products is `?direction=incoming`. A busy record's walk pages: pass `nextCursor` back as `after`. Asserting and retracting need EDITOR on **both** records' project.

**Get a file in.** Three steps, and the bytes never pass through the API:

```
POST /v1/files/upload-url      { project, fileName, contentType, size } → { fileId, uploadUrl, key, expiresAt }
PUT  <uploadUrl>                the bytes, within 15 minutes, with `Content-Type: <contentType>`
POST /v1/files/{id}/confirm → { fileId, status: "uploaded", uploadConfirmedAt }
```

The signed URL does not pin `Content-Type`, so another value or none does not fail the PUT. Send the `contentType` you declared anyway: on `confirm` the file's type is taken from what storage recorded, and handlers gate on it — `pdf.parse` refuses anything but `application/pdf`.

Then **attach it from a flow**: `entity.create` takes a `fileIdsSlot` and attaches the ids in the same transaction as the record write. There is no attach route, and `POST /v1/records` takes no file field. A file uploaded with `project` is a **project** file, so a key's upload attaches to a record of a project-scoped type — the flow runs under the same key.

**Two ways to hand an upload to a flow, and they take different values.** `fileIdsSlot` names a slot holding a **list** of `fileId`s from `upload-url`; a single id string attaches nothing and nothing says so, so wrap one id in a list first (a `value.transform` returning `[ <the id> ]`). A flow input declared with the builtin `file` type takes a file reference `{ "key": "<upload-url's key>", "name": "products.csv", "mime": "text/csv" }` — all three required; a bare `fileId` string is a `422 Expected object`.

**A bulk import from your key, processed on ingest.** Upload, then call an endpoint whose flow does the write (`kipory-expose`), choosing by what the file becomes:

- _One file, one record_ (a document to search): the flow takes the `fileId`, wraps it in a one-item list, runs `entity.create` with that list in `fileIdsSlot`, then `entity.enqueue-process`; the type's processing flow reads the attached file from its `files` input and produces the searchable fields.
- _One file, many records_ (a CSV): the flow takes a `file` input, reads it (`file.read-text`), parses rows in a `value.transform`, and writes each row in a `flow.fan-out` branch. Re-importing converges on the same records when the rows are unchanged (below). `POST /v1/files/{id}/detach` releases a file from its record and keeps its bytes; `DELETE /v1/files/{id}` (ADMIN on the file's project) removes the file, and its bytes once no other file row still names them → `{ id, deleted: true }`. Both refuse (409) a file a flow produced. `GET /v1/files?project=<node>` lists the project's files.
- _Rows you already hold as data_ (no file needed): one `POST /v1/records/bulk` of up to 500 creates, each `{ recordType, data, onKeyTaken: "update" }` — a row whose natural key a record already holds updates that record instead of being refused, so re-running the import is safe.

**Correct or backfill existing records.** One record is a `PATCH`; many are one bulk:

```
GET   /v1/records?project=<node>&recordType=<type>&limit=100    ids and versions (every row carries `version`; follow `nextCursor`)
PATCH /v1/records/{id}     { "version": <version>, "merge": { "phone": "…" } }       one record
POST  /v1/records/bulk     { "project": "<node>", "items": [ { "id", "version", "merge": { "phone": "…" } }, … ] }   up to 500
```

`merge` names only the keys that change (`null` removes one); `data` instead replaces the whole document. Either way the result is validated against the type's current shape, the record is re-indexed, and the processing flow does **not** re-run — `POST /v1/records/{id}/reprocess` does that. A bulk judges every item first and writes all of them or none: a refusal is a 422 `RECORD_BULK_REFUSED` whose `details.issues[].path` names each item (`items.3`) and whose `code` is the item's own (`RECORD_VERSION_STALE` means a run moved the row since you read it — re-read and resend). A row that moves in the instant between that judgement and the write answers 409 `RECORD_VERSION_STALE`, the same `details.issues[]` shape — re-read those items and resend; it is not a key conflict. A create whose natural key another record already holds is refused per item as `RECORD_NATURAL_KEY_TAKEN` (send it with `onKeyTaken: "update"` to update that record). `"validateOnly": true` answers what each item would do and writes nothing.

⭐ **Adding a required field to a type with records is four calls**: widen the shape with the field optional (`kipory-evolve`), list the ids and versions, one bulk `merge` setting the field on each, then make it required.

**See what processing did.**

```
GET /v1/records/{id}/processing-stream           SSE: snapshot · status · error · close · done
GET /v1/projects/{nodeId}/ingest/summary?window=7d   what the ingest workers fetched, cached, and failed
```

## What will bite you

- **A per-user record type refuses a key.** `entity.create` on a type whose owner scope is per-user raises a 403 naming the wrong credential. A key's runs are project-owned; only a signed-in end user writes person-owned records.
- **A pool record's identity is its content.** For a project-scoped type the record id derives from (project, type, data), so the same payload from two runs, two schedules or a retry converges on one record — and that convergence is a success, not an error. Two _different_ payloads claiming one natural key are refused whatever the order — in a flow (sync endpoint) as `409 RECORD_NATURAL_KEY_TAKEN`; on `POST /v1/records` the same `409 RECORD_NATURAL_KEY_TAKEN` (unless it asked `onKeyTaken: "update"`). Nothing was written: send the create again with `onKeyTaken: "update"` to update the record that holds the key, or look the holder up with `?key=` and PATCH it. Values are trimmed before comparison, so `"tomato "` collides with `"tomato"`.
- **A natural-key collision inside a flow discards the whole run.** The staged writes are checked only when the run's change set applies, so a sync endpoint answers `409 RECORD_NATURAL_KEY_TAKEN` (nothing written) with `details.seq` (the refused write's position in `GET /v1/runs/{runId}/change-set`), `details.skillId` (the step that staged it), `details.recordType` (for a create) and `details.recordId`. On any endpoint the run's change set reads `rejected`, `rejection.reason: "transaction-failed"`, with `rejection.cause.kind: "natural-key-collision"` and the same identifiers. The key's **value** is never echoed — find it from the staged write `seq` names. Every other write of that run is dropped too, the new rows with it. There is no upsert mode inside a flow (over HTTP, `POST /v1/records` and the bulk take `onKeyTaken: "update"`): a flow importing rows that may have changed looks each one up first — `entity.list` with `fieldFilterSlots` on the key field (the field needs a `filter` use as well as `key`) — then `entity.update` with the found id in `recordIdSlot`, and `entity.create` only when nothing was found (a `slotPresent` / `listEmpty` condition on each).
- **A record is `ready` or `pending` depending on its type, and who queues it depends on who wrote it.** A type with no processing flow creates records `ready`. A type bound to a processing flow creates them `pending`, and something must hand each one to the queue. `POST /v1/records` does that itself (`queued: true` in its answer). A flow that **creates** records with `entity.create` does not: that flow — the writer, not the processing flow — must follow the create with an `entity.enqueue-process` step, or the rows sit `pending` until the watchdog finalises them `failed`. `GET /v1/record-types/{id}?expand=processingGaps` names flows that create without queuing.
- **A processed field sits in a different place on each read.** The one-record read keeps them apart — `record.data` for what was sent, `record.derived` for what the processing flow produced (`null` means never produced). The list's rows carry neither in full: a row's `fields` holds one `{ key, family, value }` entry per **column** — the type's fields with a `filter` use, submitted or processed (the response's `columns` say which, as `source`) — and nothing else; every other field is named in `contract.undeclaredFields`. The whole submission is only on the one-record read. Inside a flow, an `entity.read` or `entity.list` row has both spread top-level beside `id` and `status` — `$row.body`, not `$row.derived.body` — and a submitted field wins a name clash.
- **`paging` on the records list is nullable, and null is normal.** An unnarrowed corpus over the count threshold, a literal `q` search, any semantic ranking, or a read by `id` declines to count; `declinedCountReason` says which. A search still answers `nextCursor` — whether there is more — so walk it; a filter, not a phrase, brings a total back. Do not compute page numbers yourself.
- **A read that runs past the 4 s budget is a 422 `QUERY_TOO_BROAD`, not a 500.** A very short phrase over a large type is the usual cause; add a filter or a longer phrase and ask again.
- **`terms` on a row is capped at two chips.** `termCount` is the real number. The cap keeps the first two, so an empty `terms` array means the record has no terms; a short one is the cap artefact — read `termCount`.
- **`null` means not measured, never zero** — on `hitRate`, `unindexedCount`, `quotaDay`, and every null in the ingest summary.
- **An unknown relation kind answers 200 with no edges**, not 404. An empty traversal is not proof of no edges; check the kind exists.
- **`upload-url` promises nothing about bytes.** The row exists `pending-upload` before any PUT, is swept within a day if never confirmed, and `confirm` answers 409 until the object is in storage. A landed object over 25,000,000 bytes is a 413 and the row stays pending.
- **`confirm` does not attach.** A confirmed file has `record: null` until a flow claims it. That is ordinary, not an error.
- **The default file listing hides flow output.** `scope` defaults to `sent-in`; produced files are under `scope=produced` or `scope=all`, and `totals.hiddenByScope` counts what you are not seeing.
- **A record FAILURE on the processing stream is a `status` frame, not an `error` frame.** `error` is transport only. A clean `close` then `done` after `status: "failed"` is a stream that worked and a run that did not.
- **The stream ends on its own.** A terminal snapshot closes at once; a live one closes with `close { lifetime }` after a bounded, jittered window. Reconnect and re-read the snapshot; there is no cursor.
- **Cache bust spends money and is ADMIN.** `POST /v1/projects/{nodeId}/ingest/cache/bust` makes the next run re-fetch against a vendor budget; `deleted: 0` is a success, and an unknown `handlerKey` deletes nothing rather than everything.
- **Semantic search can 503 through no fault of yours.** `VECTOR_INDEX_UNREADABLE` means the collection was never provisioned, the profile is gone, or the store is unreachable — see `kipory-model` for the embedding profile.

## References

| File                                    | What it answers                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `references/api/records.md`             | every query key, operator and response field of the records list; the edge routes                                                       |
| `references/api/files.md`               | the upload handshake, listing scopes and totals, download and detach                                                                    |
| `references/api/ingest.md`              | the summary's vocabulary — outcomes, cache, quota — and the bust call                                                                   |
| `references/in-flow-record-handlers.md` | the same work from inside a flow: reading edges, deleting, teardown before a reprocess, and the owner scoping that differs from a route |

The handler that writes a record is `entity.create`; its config and worked example are in `kipory-build` under `references/handlers/`.

## Then

`kipory-extract` when a file attached to a record has to become text. `kipory-retrieve` to make what a project holds searchable. `kipory-evolve` before deleting records to clear a type. `kipory-build` to author the flow that creates or processes records at scale — the path every record your product's own users produce travels, and the one the write above is the operator's exception to. `kipory-model` when the type, facet or relation kind you need does not exist yet. `kipory-diagnose` when a record processed and came back wrong: the processing stream tells you _that_ it failed, the run's steps tell you _where_. `kipory-expose` to put the record write on HTTP for your product's users.
