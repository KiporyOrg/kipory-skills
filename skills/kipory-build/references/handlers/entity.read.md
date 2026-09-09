<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.read` — Read records by ID

Read records by ID so later steps can use their text, files, or metadata.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any+` → `RecordRead[]`
- **Reads:** The id list, from the slot `idsSlot` names — either plain ids or the candidate objects a vector search emits. Plus the user id from `userIdSlot`. _(shape hint: `any+`)_
- **Emits:** A `RecordRead` per record, in the order the ids came in and deduplicated. An id that does not resolve is dropped, so the list can come back shorter.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataNullChecks` | object[] | no | — | Keep rows by whether a path inside `data` is empty or filled. With `failIfEmpty`, this is how a soft-deleted record reads as missing. ⚠️ A row missing the key matches neither choice, so the record type has to always write it. |
| `failIfEmpty` | boolean | no | `false` | Fail the step when nothing resolves, instead of returning an empty list. Turn it on for a read that should answer not-found. ⚠️ Off by default, because a list read treats missing ids as ordinary. Leaving it off on a single-id read turns a missing record into a confusing downstream failure instead of a clean one. |
| `fields` | string[] | no | `[]` | Which of the record type's fields each row carries. Leave it empty for all of them. `id`, `createdAt`, `updatedAt` and `status` always come back. ⚠️ A name the record type does not declare is ignored, and a list of only unknown names falls back to emitting every field rather than blanking the row. |
| `idsSlot` | string | yes | — | The slot holding the ids to read. Accepts plain ids or the candidate objects a vector search emits, and dot-paths work. |
| `include` | object | no | `{}` | Extra dimensions per row. Terms come back by default; files, relations and cost are opt-in, and each shows up in the step's output type. ⚠️ Turning on files signs a download URL for every file on the record. Relations come back grouped by kind, with one property bag per time the pair was named. |
| `recordType` | string | yes | — | The record type to read. Required: only rows of this one type are ever returned. |
| `scalars` | object | no | `{}` | Opt-in scalar fields. `statusError` adds the failure summary (string\|null); `fileCount` adds the attached-file count. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Ids belonging to anyone else are dropped from the result. ⚠️ This value is mandatory: an empty one fails the step rather than reading across users. A dropped id is silent — the list simply comes back shorter. |

## Worked example

Reads the full record behind each id a search returned, so a later step can work with the real text instead of ids.

Reads: read ids + userId. Emits: RecordRead rows.

#### candidate objects from a search

Four hits in, three rows out: a step reads ONE record type, and the `answer` is not it.

Reads `list<CandidateHit>` → emits `RecordRead[]` · 1 in → 1 out

Input:

```
[
  { "id": "ckwx4j2nq0001oj5qhdz9pq6y", "score": 0.91, "matchedVector": "vec.content",       "recordType": "item"   },
  { "id": "ckwx4j2nq0002oj5q…",        "score": 0.84, "matchedVector": "vec.user-language", "recordType": "item"   },
  { "id": "ckwx4j2nq0003oj5q…",        "score": 0.78, "matchedVector": "vec.content",       "recordType": "item"   },
  { "id": "ckwx4j2nq0004oj5q…",        "score": 0.71, "matchedVector": "vec.user-language", "recordType": "answer" }
]
```

Output:

```
[
  { "id": "ckwx4j2nq0001oj5qhdz9pq6y", "title": "Latest groceries receipt", "summary": "Whole Foods, $48.12", "thumbnail": "https://cdn/thumb/a.jpg", "text": "WHOLE FOODS MARKET\n2026-05-29 14:22\nTotal: $48.12…", "comment": "for week 05-29", "createdAt": "2026-05-29T18:22:31.000Z", "updatedAt": "2026-05-29T18:25:02.000Z", "status": "READY" },
  { "id": "ckwx4j2nq0002oj5q…",        "title": "Receipt — Trader Joe's",  "summary": "Trader Joe's, $33.10", "thumbnail": null,                       "text": "TRADER JOE'S\n2026-05-25 …",                                "comment": null,            "createdAt": "2026-05-25T13:11:02.000Z", "updatedAt": "2026-05-25T13:12:40.000Z", "status": "READY" },
  { "id": "ckwx4j2nq0003oj5q…",        "title": "Costco order",            "summary": "Costco, $112.00",      "thumbnail": null,                       "text": "COSTCO #134 …",                                            "comment": null,            "createdAt": "2026-05-20T10:01:55.000Z", "updatedAt": "2026-05-20T10:03:10.000Z", "status": "READY" }
]
```

#### cross-tenant safety

Three ids in, one owned by another user. That row never comes back and no error is raised.

Reads `list<string>` → emits `RecordRead[]` · 1 in → 1 out

Input:

```
["ckwx_user_a_1", "ckwx_user_b_2", "ckwx_user_a_3"]
```

Output:

```
[
  { "id": "ckwx_user_a_1", "title": "...", "summary": "...", "thumbnail": null, "text": "...", "comment": null, "createdAt": "2026-05-29T18:22:31.000Z", "updatedAt": "2026-05-29T18:25:02.000Z", "status": "READY" },
  { "id": "ckwx_user_a_3", "title": "...", "summary": "...", "thumbnail": null, "text": "...", "comment": null, "createdAt": "2026-05-25T13:11:02.000Z", "updatedAt": "2026-05-25T13:12:40.000Z", "status": "READY" }
]
```

#### nothing to read

The upstream search found nothing. The handler skips the database entirely and returns an empty list.

Reads `list<CandidateHit>` → emits `RecordRead[]` · 1 in → 1 out

Input:

```
[]
```

Output:

```
[]
```
