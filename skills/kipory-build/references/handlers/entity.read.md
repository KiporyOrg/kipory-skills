<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.read` — Read records

Read records so later steps can use their text, files, and details.

Reads records by id. Takes a list of ids from an earlier step and returns the requested fields in the order the ids came in. On a user-owned type it keeps only the signed-in user's records.

- **Group:** entities · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `RecordRead[]`
- **Reads:** A list of ids from the slot `idsSlot` names — plain ids or a vector search's candidates. Plus the user id from `userIdSlot`. _(shape hint: `any+`)_
- **Emits:** A `RecordRead` per record, its submitted and processed fields flattened to the top level. In the order asked, deduplicated; unresolved ids drop.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataNullChecks` | object[], at least 1 item | no | — | Keep rows by whether a path inside `data` is empty or filled. With `failIfEmpty`, this is how a soft-deleted record reads as missing. ⚠️ A row missing the key matches neither choice, so the record type has to always write it. |
| `failIfEmpty` | boolean | no | `false` | Fail the step when nothing resolves, instead of returning an empty list. Turn it on for a read that should answer not-found. ⚠️ Off by default, because a list read treats missing ids as ordinary. Leaving it off on a single-id read turns a missing record into a confusing downstream failure instead of a clean one. |
| `fields` | string[] | no | `[]` | Which of the record type's fields each row carries. Leave it empty for all of them. `id`, `createdAt`, `updatedAt` and `status` always come back. ⚠️ A name the record type does not declare is ignored, and a list of only unknown names falls back to emitting every field rather than blanking the row. |
| `idsSlot` | string | yes | — | The slot holding a list of ids — plain ids, a vector search's candidate objects, or a path into either (`hits[].recordId`). ⚠️ It must hold a list: a lone id, or a path to one (`created.recordId`), reads nothing — wrap it as `[recordId]` in a `value.transform`. A bare field off a list reads nothing too. |
| `include` | object | no | `{}` | Extra dimensions per row. Terms come back by default; files, relations and cost are opt-in. None appears in the step's output type. ⚠️ Turning on files signs a download URL for every file on the record. Relations come back grouped by kind, with one property bag per time the pair was named. |
| `recordType` | string | yes | — | The record type to read. Required: only rows of this one type are ever returned. ⚠️ A row carries every field the type declares. One the record does not hold is `null`, not absent, so `$exists` is true for it: test `!= null`. |
| `scalars` | object | no | `{}` | Opt-in scalar fields. `statusError` adds the failure summary (string\|null); `fileCount` adds the attached-file count. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Ids belonging to anyone else are dropped from the result. ⚠️ On a user-owned type an empty value fails the step rather than reading across users; a project-wide type ignores it. A dropped id is silent — the list simply comes back shorter. |

### `dataNullChecks` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `path` | string | yes | — | A dotted path inside the record's `data`. |
| `op` | `isNull` \| `isNotNull` | yes | — | `isNull` keeps rows where the path is null; `isNotNull` keeps rows where it holds a value. |

### `include`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `facets` | boolean | no | `true` | Add the terms each row is filed under. |
| `relations` | boolean | no | `false` | Add each row's links. |
| `files` | boolean | no | `false` | Add each row's attached files. |
| `cost` | boolean | no | `false` | Add what each row's processing cost. |

### `scalars`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `statusError` | boolean | no | `false` | Add the row's failure summary, or null when it has none. |
| `fileCount` | boolean | no | `false` | Add the number of files attached to the row. |

## Worked example

Reads the full record behind each id a search returned, so a later step can work with the real text instead of ids.

#### From a search

Four hits in, three rows out: a step reads ONE record type, and the `answer` is not it.

Reads `list<CandidateHit>` → emits `RecordRead[]` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "idsSlot": "candidates",
  "recordType": "item"
}
```

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

#### Someone else's record

Three ids in, one owned by another user. That row never comes back and no error is raised.

Reads `list<string>` → emits `RecordRead[]` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "idsSlot": "candidates",
  "recordType": "item",
  "userIdSlot": "userInfo.userId"
}
```

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

#### Nothing to read

The upstream search found nothing. The handler skips the database entirely and returns an empty list.

Reads `list<CandidateHit>` → emits `RecordRead[]` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "idsSlot": "candidates",
  "recordType": "item"
}
```

Input:

```
[]
```

Output:

```
[]
```
