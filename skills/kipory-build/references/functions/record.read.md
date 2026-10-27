<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.read` — Read records

Read records so later actions can use their text, files, and details.

Returns records in the order of the ids given; on user-owned types, only the user's own.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `RecordRead[]`
- **Also found as:** get record, load record, fetch record by id
- **Reads:** A list of ids from `ids` — plain ids or objects carrying an `id`. Plus the user id from `userId`. _(shape hint: `any+`)_
- **Emits:** A `RecordRead` per record, its submitted and processed fields flattened to the top level. In the order asked, deduplicated; unresolved ids drop.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataNullChecks` | object[], at least 1 item | no | — | Keep rows by whether a path inside `data` is empty or filled. ⚠️ A missing key counts as no value; only the submitted value is checked. |
| `failIfEmpty` | boolean | no | `false` | Fail when nothing is found instead of returning an empty list. ⚠️ Without it, a missing record fails later actions in a confusing way. |
| `fields` | string[] | no | `[]` | Which fields each row carries; empty means all of them. ⚠️ Unknown field names are ignored. |
| `ids` | union | yes | — | A list of ids, or a path like `hits[].recordId`. ⚠️ A lone id reads nothing; give it as a one-item list: `{"expr": "[recordId]"}`. |
| `include` | object | no | `{}` | Extra details per row; terms come by default, the rest opt-in. ⚠️ Files sign a download URL for every file on the record. |
| `linked` | object | no | — | Linked records each record carries, under `linked.<name>`. |
| `scalars` | object | no | `{}` | Extra values per row: failure summary and file count. |
| `tableKey` | string | yes | — | The table to read. ⚠️ A field with no value is left out of the row, so test it with `$exists(x)` or `$default(x, d)`. |
| `userId` | union | no | `"userInfo.userId"` | The signed-in user's id; others' ids are dropped. ⚠️ On a user-owned type, an empty value fails the action; dropped ids are silent. |

### `dataNullChecks` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `path` | string | yes | — | A dotted path inside the record's `data`. |
| `op` | `isNull` \| `isNotNull` | yes | — | `isNull` keeps rows with no value there; `isNotNull` keeps the rest. |

### `ids` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

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

### `userId` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Reads the full record behind each id an earlier action produced, so a later action can work with the real text instead of ids.

#### From a ranked list

Four ids in, three rows out: an action reads ONE table, and the fourth id belongs to another.

Reads `list<{ id }>` → emits `RecordRead[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "ids": "candidates",
  "tableKey": "item"
}
```

Input:

```
[
  { "id": "ckwx4j2nq0001oj5qhdz9pq6y", "relevance": 0.91 },
  { "id": "ckwx4j2nq0002oj5q…",        "relevance": 0.84 },
  { "id": "ckwx4j2nq0003oj5q…",        "relevance": 0.78 },
  { "id": "ckwx4j2nq0004oj5q…",        "relevance": 0.71 }
]
```

Output:

```
[
  { "id": "ckwx4j2nq0001oj5qhdz9pq6y", "title": "Latest groceries receipt", "summary": "Whole Foods, $48.12", "thumbnail": "https://cdn/thumb/a.jpg", "text": "WHOLE FOODS MARKET\n2026-05-29 14:22\nTotal: $48.12…", "comment": "for week 05-29", "createdAt": "2026-05-29T18:22:31.000Z", "updatedAt": "2026-05-29T18:25:02.000Z", "status": "READY" },
  { "id": "ckwx4j2nq0002oj5q…",        "title": "Receipt — Trader Joe's",  "summary": "Trader Joe's, $33.10",                       "text": "TRADER JOE'S\n2026-05-25 …",            "createdAt": "2026-05-25T13:11:02.000Z", "updatedAt": "2026-05-25T13:12:40.000Z", "status": "READY" },
  { "id": "ckwx4j2nq0003oj5q…",        "title": "Costco order",            "summary": "Costco, $112.00",                       "text": "COSTCO #134 …",            "createdAt": "2026-05-20T10:01:55.000Z", "updatedAt": "2026-05-20T10:03:10.000Z", "status": "READY" }
]
```

#### Someone else's record

Three ids in, one owned by another user. That row never comes back and no error is raised.

Reads `list<string>` → emits `RecordRead[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "ids": "candidates",
  "tableKey": "item",
  "userId": "userInfo.userId"
}
```

Input:

```
["ckwx_user_a_1", "ckwx_user_b_2", "ckwx_user_a_3"]
```

Output:

```
[
  { "id": "ckwx_user_a_1", "title": "...", "summary": "...", "text": "...", "createdAt": "2026-05-29T18:22:31.000Z", "updatedAt": "2026-05-29T18:25:02.000Z", "status": "READY" },
  { "id": "ckwx_user_a_3", "title": "...", "summary": "...", "text": "...", "createdAt": "2026-05-25T13:11:02.000Z", "updatedAt": "2026-05-25T13:12:40.000Z", "status": "READY" }
]
```

#### With linked records

`linked` brings the record each review points at, and that book's author one level further, for every id at once.

Reads `list<string>` → emits `RecordRead[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "ids": "candidates",
  "tableKey": "review",
  "fields": [
    "rating"
  ],
  "linked": {
    "book": {
      "relation": "about",
      "direction": "outgoing",
      "fields": [
        "title"
      ],
      "linked": {
        "author": {
          "relation": "written-by",
          "direction": "outgoing",
          "fields": [
            "name"
          ]
        }
      }
    }
  }
}
```

Input:

```
["ckrv_01", "ckrv_02"]
```

Output:

```
[
  { "id": "ckrv_01", "rating": 5, "createdAt": "2026-06-01T10:00:00.000Z", "updatedAt": "2026-06-01T10:00:00.000Z", "status": "READY",
    "linked": { "book": { "id": "ckbk01", "title": "The Long Walk", "createdAt": "2026-05-01T09:00:00.000Z", "updatedAt": "2026-05-01T09:00:00.000Z", "status": "READY",
      "linked": { "author": { "id": "ckau07", "name": "Ada Brook", "createdAt": "2026-01-03T09:00:00.000Z", "updatedAt": "2026-01-03T09:00:00.000Z", "status": "READY" } } } } },
  { "id": "ckrv_02", "rating": 3, "createdAt": "2026-06-02T10:00:00.000Z", "updatedAt": "2026-06-02T10:00:00.000Z", "status": "READY", "linked": {} }
]
```

#### Nothing to read

The action upstream found nothing. The function skips the database entirely and returns an empty list.

Reads `list<{ id }>` → emits `RecordRead[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "ids": "candidates",
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
