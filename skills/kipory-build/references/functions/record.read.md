<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.read` — Read records

Read records so later actions can use their text, files, and details.

Returns records in the order of the ids given; on user-owned types, only the user's own.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `RecordRead[]`
- **Also found as:** get record, load record, fetch record by id
- **Reads:** A list of ids from the slot `idsSlot` names — plain ids or a vector search's candidates. Plus the user id from `userIdSlot`. _(shape hint: `any+`)_
- **Emits:** A `RecordRead` per record, its submitted and processed fields flattened to the top level. In the order asked, deduplicated; unresolved ids drop.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataNullChecks` | object[], at least 1 item | no | — | Keep rows by whether a path inside `data` is empty or filled. ⚠️ A row missing the key matches neither choice, so the table has to always write it. |
| `failIfEmpty` | boolean | no | `false` | Fail when nothing is found instead of returning an empty list. ⚠️ Without it, a missing record fails later actions in a confusing way. |
| `fields` | string[] | no | `[]` | Which fields each row carries; empty means all of them. ⚠️ Unknown field names are ignored. |
| `idsSlot` | string | yes | — | The slot holding a list of ids, or a path like `hits[].recordId`. ⚠️ A lone id reads nothing; wrap it as `[recordId]` in a `value.transform`. |
| `include` | object | no | `{}` | Extra details per row; terms come by default, the rest opt-in. ⚠️ Files sign a download URL for every file on the record. |
| `scalars` | object | no | `{}` | Extra values per row: failure summary and file count. |
| `tableKey` | string | yes | — | The table to read. ⚠️ A field the record does not hold is `null`, so test `!= null`. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id; others' ids are dropped. ⚠️ On a user-owned type, an empty value fails the action; dropped ids are silent. |

### `dataNullChecks` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `path` | string | yes | — | A dotted path inside the record's `data`. |
| `op` | `isNull` \| `isNotNull` | yes | — | `isNull` keeps null values at the path; `isNotNull` keeps set ones. |

### `include`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `vocabularies` | boolean | no | `true` | Add the terms each row is filed under. |
| `links` | boolean | no | `false` | Add each row's links. |
| `files` | boolean | no | `false` | Add each row's attached files. |
| `cost` | boolean | no | `false` | Add what each row's processing cost. |

### `scalars`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `statusError` | boolean | no | `false` | Add the row's failure summary, or null when it has none. |
| `fileCount` | boolean | no | `false` | Add the number of files attached to the row. |

## Worked example

Reads the full record behind each id a search returned, so a later action can work with the real text instead of ids.

#### From a search

Four hits in, three rows out: an action reads ONE table, and the `answer` is not it.

Reads `list<CandidateHit>` → emits `RecordRead[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "idsSlot": "candidates",
  "tableKey": "item"
}
```

Input:

```
[
  { "id": "ckwx4j2nq0001oj5qhdz9pq6y", "score": 0.91, "matchedVector": "vec.content",       "tableKey": "item"   },
  { "id": "ckwx4j2nq0002oj5q…",        "score": 0.84, "matchedVector": "vec.user-language", "tableKey": "item"   },
  { "id": "ckwx4j2nq0003oj5q…",        "score": 0.78, "matchedVector": "vec.content",       "tableKey": "item"   },
  { "id": "ckwx4j2nq0004oj5q…",        "score": 0.71, "matchedVector": "vec.user-language", "tableKey": "answer" }
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

Action settings (`functionConfig`):

```json
{
  "idsSlot": "candidates",
  "tableKey": "item",
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

The upstream search found nothing. The function skips the database entirely and returns an empty list.

Reads `list<CandidateHit>` → emits `RecordRead[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "idsSlot": "candidates",
  "tableKey": "item"
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
