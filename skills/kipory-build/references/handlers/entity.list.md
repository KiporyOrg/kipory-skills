<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.list` — List records

List a user's records, newest first, one page at a time.

- **Group:** entities · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `user id + cursor` → `RecordPage`
- **Reads:** The user id, from the slot `userIdSlot` names. To read past the first page, wire the previous page's cursor into `cursorSlot`. Everything else is settings on the step. _(shape hint: `user id + cursor`)_
- **Emits:** A `RecordPage`: the rows, newest first, each record's submitted and processed fields flattened to the top level, and a cursor when more remain.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `createdAfter` | string | no | — | Keep only rows created at or after this fixed ISO-8601 moment; no slot fills it. For a run-relative window, filter by `runInfo.now` in a `value.transform`. |
| `createdBefore` | string | no | — | Keep only rows created at or before this moment. It has to be at or after `createdAfter`. |
| `cursorSlot` | string | no | — | The slot holding the cursor from a previous page. Leave it unset for the first page. ⚠️ A cursor that has been edited or truncated fails the step; an absent one simply starts over from the newest row. |
| `dataContainsPath` | string | no | — | Keep only rows whose list at this path inside `data` contains what `dataContainsSlot` carries. Set both or neither. ⚠️ No index can serve a filter on a path inside `data`, so this one reads every row of the record type before narrowing. |
| `dataContainsSlot` | string | no | — | The slot carrying the object to look for in that list — for example `{ source: <recordId> }`. ⚠️ If the slot is missing or is not an object, the filter is simply not applied and the page comes back wider than you asked for. |
| `dataEqualsPath` | string | no | — | Keep only rows whose value at this path inside `data` equals what `dataEqualsSlot` carries. Set both or neither. ⚠️ No index can serve a filter on a path inside `data`, so this one reads every row of the record type before narrowing. |
| `dataEqualsSlot` | string | no | — | The slot carrying the value to compare — text, a number, or true/false. Pairs with `dataEqualsPath`. ⚠️ If the slot is missing or carries something else, the filter is simply not applied and the page comes back wider than you asked for. |
| `dataNullChecks` | object[] | no | — | Keep rows by whether a path inside `data` is empty or filled — for example, to hide rows whose `deletedAt` is set. ⚠️ A row missing the key matches neither choice, so the record type has to always write it. And no index can serve a `data` path, so this reads every row. |
| `edgeFilters` | object[] | no | — | Keep only rows that carry a link. Each entry names a link kind and, optionally, a slot naming the record on the other end. ⚠️ This is the only filter that reads the link graph rather than the row itself. An entry whose slot does not resolve is dropped whole, rather than widening to every link of that kind. |
| `facetFilter` | object[] | no | — | Keep rows tagged with all these facet–term pairs. Fixed in config, never read from a slot: per-request terms need `flow.dispatch` into one list step each. ⚠️ In a facet with nested terms, a term slug alone matches that slug under every parent. Add `parentSlug` to narrow it to one branch. |
| `fieldFilterSlots` | object | no | — | A map of queryable field to the slot carrying its value. One value matches exactly, a list matches any of them. ⚠️ A slot that does not resolve drops its filter, but a step with no real input present skips — route an optional filter through a step that always runs. Ranges belong in `fieldFilters`. |
| `fieldFilters` | object[] | no | — | Filters on fields the record type declared queryable. These are the fast ones, and the only ones that support ranges like `gte` and `lt`. ⚠️ A field the record type never declared queryable is refused when the step runs. A date window on a domain date belongs here, not in `createdAfter`, which bounds insert time. |
| `fields` | string[] | no | `[]` | Which of the record type's fields each row carries. Leave it empty for all of them. `id`, `createdAt`, `updatedAt` and `status` always come back. ⚠️ A whole page has one size budget, and an over-budget page collapses to nothing — page and cursor both. Narrow this to a summary slice when the type has long text columns. |
| `include` | object | no | `{}` | Extra dimensions per row. Terms come back by default; files, relations and cost are opt-in. None appears in the step's output type. ⚠️ Turning on files signs a download URL for every file on every row, so keep the page small when you do. |
| `limit` | integer | no | `50` | Page size: how many rows come back. 1..100, 50 by default. `limitSlot` overrides it while the flow runs. |
| `limitSlot` | string | no | — | A slot that sets the page size while the flow runs, the way an API's `?limit=` would. It overrides the `limit` setting. ⚠️ A value outside 1 to 100, or one that is not a whole number, is ignored — the `limit` setting applies instead, and nothing reports that it was dropped. |
| `order` | `asc` \| `desc` | no | `"desc"` | Sort direction: `desc` (default, newest-first) or `asc`. Applies to both the sort field and the `id` tiebreaker so pagination stays stable. |
| `recordType` | string | yes | — | The record type to list. Required: the page only ever returns rows of this one type. |
| `scalars` | object | no | `{}` | Opt-in scalar fields. `statusError` adds the failure summary (string\|null); `fileCount` adds the attached-file count. |
| `sort` | `createdAt` \| `updatedAt` | no | `"createdAt"` | Order the page by when a row was created or when it was last changed. Created is the default. |
| `sortField` | string | no | — | Order the page by one of the record type's own queryable fields instead. It replaces `sort`; the direction still comes from `order`. ⚠️ Rows with no value for the field are left out of the page entirely, and the field has to be a date — any other kind is refused when the step runs. |
| `statuses` | string[] | no | — | Keep only rows with one of these statuses. Leave it empty to allow every status. A catalog summary usually keeps just `READY`. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Only user-owned types filter by it, yet its slot is an input on every type. ⚠️ On a user-owned type an empty value fails the step. Key, schedule and trigger runs have none, so a step also reading an absent filter or cursor slot is skipped, not unfiltered. |

### `dataNullChecks` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `path` | string | yes | — |  |
| `op` | `isNull` \| `isNotNull` | yes | — |  |

### `edgeFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | string | yes | — |  |
| `peerRecordIdSlot` | string | no | — |  |

### `facetFilter` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `facet` | string | yes | — |  |
| `slug` | string | yes | — |  |
| `parentSlug` | string | no | — |  |

### `fieldFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — |  |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` | yes | — |  |
| `value` | union | yes | — |  |

### `include`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `facets` | boolean | no | `true` |  |
| `relations` | boolean | no | `false` |  |
| `files` | boolean | no | `false` |  |
| `cost` | boolean | no | `false` |  |

### `scalars`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `statusError` | boolean | no | `false` |  |
| `fileCount` | boolean | no | `false` |  |

## Worked example

Reads the catalog one page at a time, so a later step can summarize or count everything the user has.

Reads: read userId + cursor. Emits: RecordPage.

#### First page

No cursor wired, so this is the first page: the 50 newest rows, and a cursor because more remain.

Reads `{ userId }` → emits `RecordPage` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "recordType": "item",
  "userIdSlot": "userInfo.userId",
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
    { "id": "ckwx0a", "title": "Costco receipt", "summary": "Costco, $112.00", "text": null, "comment": null, "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY" },
    { "id": "ckwx0b", "title": "Lisbon trip notes", "summary": "4 days, May", "text": null, "comment": null, "createdAt": "2026-06-14T08:22:31.000Z", "updatedAt": "2026-06-14T08:25:00.000Z", "status": "READY" }
    /* …48 more, newest-first… */
  ],
  "nextCursor": "eyJjIjoiMjAyNi0wNi0xMFQwOToyMjozMS4wMDBaIiwiaSI6ImNrd3gwYyJ9"
}
```

#### Last page

The previous page's cursor is wired in, so this page starts after it and is the last one.

Reads `string` → emits `RecordPage` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "recordType": "item",
  "userIdSlot": "userInfo.userId",
  "cursorSlot": "pageCursor",
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
    { "id": "ckwx9y", "title": "First note", "summary": "Welcome", "text": null, "comment": null, "createdAt": "2026-04-02T11:00:00.000Z", "updatedAt": "2026-04-02T11:05:00.000Z", "status": "READY" }
  ]
}
```

#### No records

The user has no records, or none match the filters. The page comes back empty, with no cursor.

Reads `{ userId }` → emits `RecordPage` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "recordType": "item",
  "userIdSlot": "userInfo.userId"
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
