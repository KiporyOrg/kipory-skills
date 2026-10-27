<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.list` — List records

List a user's records, newest first, one page at a time.

Read one page and its cursor, or every page. Filter by status, date, vocabulary, field or link.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `user id + cursor` → `RecordPage`
- **Also found as:** all records, browse records, page of rows, table rows
- **Reads:** The user id, from `userId`. To read past the first page, wire the previous page's cursor into `cursor`. Each filter's `value` may come from a slot too. _(shape hint: `user id + cursor`)_
- **Emits:** A `RecordPage`: the rows, newest first, each record's fields flattened to the top level, and a cursor when more remain — with `pages`, only under `onMore: "stop"`.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `createdAfter` | string | no | — | Keep only rows created at or after this fixed ISO-8601 date. |
| `createdBefore` | string | no | — | Keep only rows created at or before this date. |
| `cursor` | union | no | — | A previous page's cursor; empty for the first page. ⚠️ An edited or truncated cursor fails the action. |
| `dataContains` | union | no | — | The object to look for in that list. ⚠️ If the slot is missing the action is skipped; a non-object fails it. |
| `dataContainsPath` | string | no | — | Keep only rows whose list at this `data` path contains `dataContains`. ⚠️ This reads every row of the table before narrowing. |
| `dataEquals` | union | no | — | The value to compare: text, number or true/false. ⚠️ If the slot is missing the action is skipped; a wrong kind fails it. |
| `dataEqualsPath` | string | no | — | Keep only rows whose value at this `data` path equals `dataEquals`. ⚠️ This reads every row of the table before narrowing. |
| `dataNullChecks` | object[], at least 1 item | no | — | Keep rows by whether a path inside `data` is empty or filled. ⚠️ A missing key counts as no value, and every row is read. |
| `fieldFilters` | object[], at least 1 item | no | — | Filters on the table's queryable fields, including ranges. ⚠️ An unqueryable field fails the run; a missing slot skips the action, and an empty list matches nothing. |
| `fields` | string[] | no | `[]` | Which fields each row carries; empty means all of them. ⚠️ An over-size page fails the action; a run warns from half the limit and a save when one is likely. |
| `include` | object | no | `{}` | Extra details per row; terms come by default, the rest opt-in. ⚠️ Files sign a download URL for every file on every row. |
| `limit` | union | no | — | Rows per page, 1 to 100; 50 by default. ⚠️ Only `nextCursor` shows a page was cut short; a value outside 1–100 or not whole reads the default. |
| `linkFilters` | object[], at least 1 item | no | — | Keep only rows carrying a link of these relations. ⚠️ If an entry's slot is missing, the action is skipped. |
| `linked` | object | no | — | Linked records each record carries, under `linked.<name>`. |
| `order` | `asc` \| `desc` | no | `"desc"` | Sort direction: `desc` (default, newest first) or `asc`. |
| `pages` | object | no | — | Read every page in one action; unset reads one page. ⚠️ Records left after the last page fail the action unless `onMore` is "stop". |
| `scalars` | object | no | `{}` | Extra values per row: failure summary and file count. |
| `sort` | `createdAt` \| `updatedAt` | no | `"createdAt"` | Order by when a row was created (default) or last changed. |
| `sortField` | string | no | — | Order by one of the table's queryable fields instead of `sort`. ⚠️ The field must be a date; rows without a value are left out. |
| `statuses` | string[], at least 1 item | no | — | Keep only rows with these statuses; empty allows every status. |
| `tableKey` | string | yes | — | The table to list. ⚠️ A field with no value is left out of the row, so test it with `$exists(x)` or `$default(x, d)`. |
| `userId` | union | no | `"userInfo.userId"` | The signed-in user's id; only user-owned types use it. ⚠️ On a user-owned type, an empty value fails the action. |
| `vocabularyFilter` | object[], at least 1 item | no | — | Keep only rows tagged with all of these vocabulary terms. ⚠️ A nested term slug matches under every parent unless `parentSlug` is set. |

### `cursor` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `dataContains` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `dataEquals` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `dataNullChecks` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `path` | string | yes | — | A dotted path inside the record's `data`. |
| `op` | `isNull` \| `isNotNull` | yes | — | `isNull` keeps rows with no value there; `isNotNull` keeps the rest. |

### `fieldFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | A field the table declares queryable. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` | yes | — | The comparison; `in`, or `eq` given a list, matches any listed value. |
| `value` | union | yes | — | The value to compare with, or the list for `in`. |

`value` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`value` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`value` › an object with `expr`**

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

### `limit` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `linkFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `relationKey` | string | yes | — | The relation a row must have a link of, by key. |
| `peerRecordId` | union | no | — | The record at the other end; empty means any link. |

`peerRecordId` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`peerRecordId` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`peerRecordId` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `pages`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `max` | integer, 1 to 500 | yes | — | Most pages to read, up to the project's read-pages limit. |
| `onMore` | `fail` \| `stop` | no | `"fail"` | `"fail"` (default) fails when records remain; `"stop"` answers a `nextCursor`. |

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
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `vocabularyFilter` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `vocabularyKey` | string | yes | — | The vocabulary, by key. |
| `slug` | string | yes | — | The term a row must carry, by slug. |
| `parentSlug` | string | no | — | The parent term's slug, to narrow a nested term to one branch. |

## Worked example

Reads the catalog one page at a time, so a later action can summarize or count everything the user has.

#### First page

No cursor wired, so this is the first page: the 50 newest rows, and a cursor because more remain.

Reads `{ userId }` → emits `RecordPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "userId": "userInfo.userId",
  "limit": 50
}
```

Input:

```
{ "userId": "ckpg_user_a" }
```

Output:

```
{
  "records": [
    { "id": "ckwx0a", "title": "Costco receipt", "summary": "Costco, $112.00", "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY" },
    { "id": "ckwx0b", "title": "Lisbon trip notes", "summary": "4 days, May", "createdAt": "2026-06-14T08:22:31.000Z", "updatedAt": "2026-06-14T08:25:00.000Z", "status": "READY" }
    /* …48 more, newest-first… */
  ],
  "nextCursor": "eyJjIjoiMjAyNi0wNi0xMFQwOToyMjozMS4wMDBaIiwiaSI6ImNrd3gwYyJ9"
}
```

#### Last page

The previous page's cursor is wired in, so this page starts after it and is the last one.

Reads `string` → emits `RecordPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "userId": "userInfo.userId",
  "cursor": "pageCursor",
  "limit": 50
}
```

Input:

```
"eyJjIjoiMjAyNi0wNi0xMFQwOToyMjozMS4wMDBaIiwiaSI6ImNrd3gwYyJ9"
```

Output:

```
{
  "records": [
    { "id": "ckwx9y", "title": "First note", "summary": "Welcome", "createdAt": "2026-04-02T11:00:00.000Z", "updatedAt": "2026-04-02T11:05:00.000Z", "status": "READY" }
  ]
}
```

#### Every page

`pages` reads page after page until none remain: every record, and no cursor.

Reads `{ userId }` → emits `RecordPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "userId": "userInfo.userId",
  "fields": [
    "title",
    "summary"
  ],
  "limit": 100,
  "pages": {
    "max": 20,
    "onMore": "fail"
  }
}
```

Input:

```
{ "userId": "ckpg_user_a" }
```

Output:

```
{
  "records": [
    { "id": "ckwx0a", "title": "Costco receipt", "summary": "Costco, $112.00", "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY" },
    { "id": "ckwx0b", "title": "Lisbon trip notes", "summary": "4 days, May", "createdAt": "2026-06-14T08:22:31.000Z", "updatedAt": "2026-06-14T08:25:00.000Z", "status": "READY" }
    /* …every other record, newest first… */
  ]
}
```

#### With linked records

Every book carries the author it points at under `linked.author`, read for the whole page at once.

Reads `{ userId }` → emits `RecordPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "book",
  "userId": "userInfo.userId",
  "fields": [
    "title"
  ],
  "limit": 20,
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
```

Input:

```
{ "userId": "ckpg_user_a" }
```

Output:

```
{
  "records": [
    { "id": "ckbk01", "title": "The Long Walk", "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY",
      "linked": { "author": { "id": "ckau07", "name": "Ada Brook", "createdAt": "2026-01-03T09:00:00.000Z", "updatedAt": "2026-01-03T09:00:00.000Z", "status": "READY" } } },
    { "id": "ckbk02", "title": "Untitled draft", "createdAt": "2026-06-14T08:22:31.000Z", "updatedAt": "2026-06-14T08:25:00.000Z", "status": "READY",
      "linked": {} }
  ]
}
```

#### No records

The user has no records, or none match the filters. The page comes back empty, with no cursor.

Reads `{ userId }` → emits `RecordPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "userId": "userInfo.userId"
}
```

Input:

```
{ "userId": "ckpg_user_new" }
```

Output:

```
{ "records": [] }
```
