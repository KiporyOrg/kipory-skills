---
name: kipory-data
description: Work with a Kipory project's own data over the design API — list and search its records, read and state typed edges between them, upload and attach files, watch a record being processed, and see what the ingest workers fetched and cached. Use when the user asks to see, query, import or upload what a project holds, or asks why a record is stuck, missing, or not attached to its file. Not for defining record types (that is modelling) and not for the product's own end-user API, which is a dynamic endpoint.
license: MIT
---

# Read and write a project's data

A project's records are written by **flows**, never by a coded route: there is no `POST /v1/…/records`. A record comes into being when a step such as `entity.create` runs — inside a dynamic endpoint your product's users call, a schedule, or a processing flow. What the design API gives you directly is the **read side** (list, search, one hop of edges, the processing stream), the **file handshake**, curated edges, and the ingest report. The fact most people get wrong: a key-driven run writes the **project's shared pool** — a record type whose owner scope is per-user refuses a key with a 403, because a key carries no user.

Every route here answers on the **api host** with your key and addresses the project by its **node id**. Passing the project id where a node id is wanted is a uniform 403, not a helpful error.

## Before the first call

- Read `references/api/records.md`, `references/api/files.md` and `references/api/ingest.md` for every field. The list read has a large query surface and it is `strict`: an undeclared query key is a 422, not ignored.
- Know which record type you are asking about. `GET /v1/projects/{nodeId}/records` picks the type holding the most records when you omit `type`, and says so in `contract.chosenByDefault`.
- If the project is retired, every write below answers 409 — reads still pass.

## The sequence

**Look at what is there.**

```
GET /v1/projects/{nodeId}/records?type=<recordType>&limit=50        one page, newest first
GET /v1/projects/{nodeId}/records?type=<recordType>&q=<text>         natural key + declared text fields, case-insensitive
GET /v1/projects/{nodeId}/records?type=<recordType>&mode=semantic&q=<text>   a bounded ranking, no pages
GET /v1/projects/{nodeId}/records?type=<recordType>&record=<id>      the page plus one record's detail beside it
```

Narrow with repeated `field=name:operator:value` and `term=facet:slug` (up to 32 of each, AND-composed), `owner`, `status`, `createdAfter`, `createdBefore`. Page with `after` / `before` cursors; `limit` is at most 100.

**Walk and state edges.**

```
GET    /v1/records/{id}/relations/{kind}                     one hop, one kind — there is no multi-hop
POST   /v1/records/{id}/relations/{kind}                     { targetRecordId, properties? } → { edgeId, outcome, revived }
DELETE /v1/records/{id}/relations/{kind}/{peerRecordId}      retract your own assertion
GET    /v1/projects/{nodeId}/relations?link=<kind>            every edge in the project as rows
```

`{kind}` is the relation kind's **key**, not its id. Asserting and retracting need EDITOR on **both** records' project.

**Get a file in.** Three steps, and the bytes never pass through the API:

```
POST /v1/projects/{nodeId}/files/upload-url     { fileName, contentType, size } → { fileId, uploadUrl, key, expiresAt }
PUT  <uploadUrl>                                 the bytes, within 15 minutes
POST /v1/projects/{nodeId}/files/{fileId}/confirm → { fileId, status, uploadConfirmedAt }
```

Then **attach it from a flow**: `entity.create` takes a `fileIdsSlot` and attaches the ids in the same transaction as the record write. There is no attach route and no delete route; `POST /v1/projects/{nodeId}/files/{fileId}/detach` releases a file from its record.

**See what processing did.**

```
GET /v1/records/{id}/processing-stream           SSE: snapshot · status · error · close · done
GET /v1/projects/{nodeId}/ingest/summary?window=7d   what the ingest workers fetched, cached, and failed
```

## What will bite you

- **A per-user record type refuses a key.** `entity.create` on a type whose owner scope is per-user raises a 403 naming the wrong credential. A key's runs are project-owned; only a signed-in end user writes person-owned records.
- **A pool record's identity is its content.** For a project-scoped type the record id derives from (project, type, data), so the same payload from two runs, two schedules or a retry converges on one record — and that convergence is a success, not an error. Two _different_ payloads claiming one natural key are refused whatever the order.
- **A record is READY or PENDING depending on its type.** A type with no processing flow creates records READY. A type bound to a flow creates them PENDING, and the flow must run an `entity.enqueue-process` step; a flow that omits it leaves rows PENDING until the watchdog finalises them FAILED.
- **`paging` on the records list is nullable, and null is normal.** An unnarrowed corpus over the count threshold, or any semantic ranking, declines to count; `declinedCountReason` says which. Do not compute page numbers yourself.
- **`terms` on a row is capped at two chips.** `termCount` is the real number. An empty `terms` array is a cap artefact, not evidence.
- **`null` means not measured, never zero** — on `hitRate`, `unindexedCount`, `quotaDay`, and every null in the ingest summary.
- **An unknown relation kind answers 200 with no edges**, not 404. An empty traversal is not proof of no edges; check the kind exists.
- **`upload-url` promises nothing about bytes.** The row exists PENDING before any PUT, is swept within a day if never confirmed, and `confirm` answers 409 until the object is in storage. A landed object over 25,000,000 bytes is a 413 and the row stays pending.
- **`confirm` does not attach.** A confirmed file has `record: null` until a flow claims it. That is ordinary, not an error.
- **The default file listing hides flow output.** `scope` defaults to `sent-in`; produced files are under `scope=produced` or `scope=all`, and `totals.hiddenByScope` counts what you are not seeing.
- **A record FAILURE on the processing stream is a `status` frame, not an `error` frame.** `error` is transport only. A clean `close` then `done` after `status: FAILED` is a stream that worked and a run that did not.
- **The stream ends on its own.** A terminal snapshot closes at once; a live one closes with `close { lifetime }` after a bounded, jittered window. Reconnect and re-read the snapshot; there is no cursor.
- **Cache bust spends money and is ADMIN.** `POST /v1/projects/{nodeId}/ingest/cache/bust` makes the next run re-fetch against a vendor budget; `deleted: 0` is a success, and an unknown `handlerKey` deletes nothing rather than everything.
- **Semantic search can 503 through no fault of yours.** `VECTOR_INDEX_UNREADABLE` means the collection was never provisioned, the profile is gone, or the store is unreachable — see `kipory-model` for the embedding profile.

## References

| File                        | What it answers                                                                   |
| --------------------------- | --------------------------------------------------------------------------------- |
| `references/api/records.md` | every query key, operator and response field of the records list; the edge routes |
| `references/api/files.md`   | the upload handshake, listing scopes and totals, download and detach              |
| `references/api/ingest.md`  | the summary's vocabulary — outcomes, cache, quota — and the bust call             |

The handler that writes a record is `entity.create`; its config and worked example are in `kipory-build` under `references/handlers/`.

## Then

`kipory-build` to author the flow that creates or processes records — that is where a record write actually happens. `kipory-model` when the type, facet or relation kind you need does not exist yet. `kipory-diagnose` when a record processed and came back wrong: the processing stream tells you _that_ it failed, the run's steps tell you _where_. `kipory-expose` to put the record write on HTTP for your product's users.
