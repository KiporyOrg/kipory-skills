<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.query` — Query records

Find records by their fields, terms, links, or meaning, all in one question.

Exact clauses narrow first; `semantic` ranks by meaning, over every table in `tableKeys`. Every answer says whether it is complete.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the slots its clauses name` → `RecordQueryPage`
- **Also found as:** look up, lookup, find a record, find records, filter records, search records, search rows
- **Reads:** The slots its clauses name for the values they compare against; optionally a cursor from `cursorSlot`; and on a user-owned type the user id from `userIdSlot`. _(shape hint: `the slots its clauses name`)_
- **Emits:** A `RecordQueryPage`: the records satisfying every clause, a `nextCursor` when an exact-only query has more, and `bounded` plus `explanation` on every answer.
- **Rate limit:** 300 per min in bucket `ai-embed`, counted per project — shared with `term.search`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clauses` | union[], 1 to 16 items | yes | — | Records must match every clause; a value may come from a slot. ⚠️ A semantic clause returns at most topK records, with no further pages. |
| `cursorSlot` | string | no | — | The slot holding a prior answer's cursor; empty for the first page. ⚠️ A cursor that has been edited or truncated fails the action; an absent one starts from the newest record. |
| `fields` | string[] | no | `[]` | Which fields each row carries; empty means all of them. ⚠️ An over-size answer fails the action; with `tableKeys`, each row carries its own table's named fields. |
| `limit` | integer, 1 to 100 | no | `50` | How many records come back at most: 1 to 100. ⚠️ A run warns from half the slot limit, and a save when a page of large records would pass it. |
| `linked` | object | no | — | Linked records each record carries, under `linked.<name>`. |
| `order` | union | no | — | Order by `created`, `meaning`, or a date field of the type. ⚠️ A field order leaves out records with no value in that field. |
| `pages` | object | no | — | Read every page of an exact question in one action. ⚠️ Only an exact question reads every page; records left after the last page fail the action unless `onMore` is "stop". |
| `tableKey` | string | no | — | The table to query; set exactly one of this and `tableKeys`. ⚠️ A field with no value is left out of the row, so test it with `$exists(x)` or `$default(x, d)`. |
| `tableKeys` | string[], 2 to 8 items | no | — | 2 to 8 tables ranked in one answer, in place of `tableKey`. ⚠️ Needs a `semantic` clause and one search model; tell the mixed rows apart by `scores[i].tableKey`, never by their fields. |
| `userIdSlot` | string | no | — | The slot holding whose records to query; empty means the signed-in user. ⚠️ An empty value, or no signed-in user, fails the action on user-owned tables. |

### `clauses` — each item is one of

**`kind: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `field` | yes | — | A condition on a field the type routes with `filter`. |
| `field` | string | yes | — | A field of the table with a `filter` use. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` \| `not-in` | yes | — | Each operator takes one value; `in` takes a list. |
| `value` | union | no | — | One value, or a list for `in`; dates as ISO 8601. |
| `valueSlot` | string | no | — | A slot holding the value to compare, instead of `value`. |

`value` — one of: `string | number | boolean`; `(string | number | boolean)[]`, 1 to 1000 items.

**`kind: term`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `term` | yes | — | An assignment of a vocabulary term, by slug. |
| `vocabularyKey` | string | yes | — | A vocabulary the table lists in `uses.vocabularies`. |
| `slug` | string | no | — | The term, by slug; an alias counts as its term. |
| `slugSlot` | string | no | — | A slot holding the term's slug, instead of `slug`. |

**`kind: link`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `link` | yes | — | A relation a `link` use declares, with optional filters and a count. |
| `relation` | string | yes | — | A relation a `link` use declares, from or to this table. |
| `direction` | `outgoing` \| `incoming` \| `either` | no | — | Which end the record is on; default `outgoing`. |
| `where` | object[], 1 to 16 items | no | — | Clauses on the relation's declared link filters, ANDed. |
| `count` | object | no | — | How many matching links to require; default at least one. |
| `peer` | union[], 1 to 16 items | no | — | Clauses on the linked record, one hop away. |

`where` — each item:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `property` | string | yes | — | A declared link filter, or stream filter of the field. |
| `op` | `eq` \| `ne` \| `in` \| `lt` \| `lte` \| `gt` \| `gte` | yes | — | How the stamped value compares. |
| `value` | string | no | — | The value to compare, as text; `in` takes up to 1000. |
| `valueSlot` | string | no | — | A slot holding the text to compare, instead of `value`. |

`count`:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `>=` \| `>` \| `=` \| `<` \| `<=` | yes | — | How the count compares to `n`. |
| `n` | integer, at least 0 | yes | — | The count compared against. |

`peer` — each item is one of:

- `kind: field` — the same members as `kind: field` of `clauses`
- `kind: term` — the same members as `kind: term` of `clauses`
- `kind: semantic` — the same members as `kind: semantic` of `clauses`

**`kind: stream`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `stream` | yes | — | A field the type routes with `stream`: event rows inside a window. |
| `field` | string | yes | — | A field of the type that carries a `stream` use. |
| `window` | object | no | — | The time window on the event's `at`; default the stream's retention. |
| `where` | object[], 1 to 16 items | no | — | Clauses on the stream's declared filters, ANDed. |
| `count` | union | no | — | `exists` (default), `none` (no matching event), or a comparison on the count. |

`window`:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `from` | string | no | — | Inclusive start of the window, ISO 8601. |
| `fromSlot` | string | no | — | The slot holding the window's start, in place of `from`. |
| `to` | string | no | — | Inclusive end of the window, ISO 8601; default now. |
| `toSlot` | string | no | — | The slot holding the window's end, in place of `to`. |

`where` — each item:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `property` | string | yes | — | A declared link filter, or stream filter of the field. |
| `op` | `eq` \| `ne` \| `in` \| `lt` \| `lte` \| `gt` \| `gte` | yes | — | How the stamped value compares. |
| `value` | string | no | — | The value to compare, as text; `in` takes up to 1000. |
| `valueSlot` | string | no | — | A slot holding the text to compare, instead of `value`. |

`count` — one of:

- an object with `op`, `n` — the table below
- the value `exists`
- the value `none`

**`count` › an object with `op`, `n`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `op` | `>=` \| `>` \| `=` \| `<` \| `<=` | yes | — | How the count compares to `n`. |
| `n` | integer, at least 0 | yes | — | The count compared against. |

**`kind: semantic`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `semantic` | yes | — | A phrase ranked by meaning; at most one per query. |
| `field` | string | no | — | A field with a `search` use to rank on. |
| `text` | string, at most 8000 characters | no | — | The phrase to resemble. |
| `textSlot` | string | no | — | The slot whose run-time value is the phrase, in place of `text`. |
| `likeRecordId` | string | no | — | A record to resemble instead of a phrase; it is left out. |
| `likeTableKey` | string | no | — | The table of the record to resemble, if not the queried one. |
| `likeRecordIdSlot` | string | no | — | A slot holding the id of the record to resemble. |
| `topK` | integer, 1 to 200 | no | — | How many to rank; default 50. |
| `minScore` | number, -1 to 1 | no | — | Leave out records scoring below this, from −1 to 1. |
| `passage` | boolean | no | — | `true` also returns the text of each record's best-matching part. |

### `order` — one of

**`by: created`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `created` | yes | — | Newest created first. |

**`by: meaning`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `meaning` | yes | — | Closest first; needs a `semantic` clause. |

**`by: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `field` | yes | — | By one of the table's own date fields. |
| `field` | string | yes | — | A date field with a `filter` use; empty dates are left out. |
| `direction` | `asc` \| `desc` | no | `"desc"` | `desc` (latest first, the default) or `asc`. |

### `pages`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `max` | integer, 1 to 500 | yes | — | Most pages to read, up to the project's read-pages limit. |
| `onMore` | `fail` \| `stop` | no | `"fail"` | `"fail"` (default) fails when records remain; `"stop"` answers a `nextCursor`. |

## Worked example

Asks one question across a table's stores and says, on every answer, whether it is complete and which store answered each clause.

#### Three conditions

Term and link legs ran first; their intersection was pushed into the index exactly, so `bounded` is false.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "person",
  "userIdSlot": "userInfo.userId",
  "clauses": [
    {
      "kind": "term",
      "vocabularyKey": "language",
      "slug": "hebrew"
    },
    {
      "kind": "link",
      "relation": "friend-of",
      "where": [
        {
          "property": "tag",
          "op": "eq",
          "value": "close"
        }
      ]
    },
    {
      "kind": "semantic",
      "text": "loves hiking"
    }
  ]
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
    { "id": "ckwx0a", "title": "Noa Levi", "summary": "Hikes the Israel Trail every spring", "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY" }
  ],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "term-store", "index": "RecordTerm_termId_recordId_idx", "rank": 1, "candidates": 412, "freshness": "transactional" },
      { "clause": 1, "store": "link-store", "index": "Link_eText0_idx", "rank": 3, "candidates": 37, "freshness": "transactional" },
      { "clause": 2, "store": "vector-index", "index": "person.bio", "rank": 9, "candidates": 1, "freshness": { "eventual": true, "watermark": "2026-06-15T10:02:30.000Z", "unindexed": 0 } }
    ],
    "pushdown": { "ids": 37, "cap": 25000, "mode": "exact" }
  }
}
```

#### With linked records

Each answered post carries its source under `linked.source`; the answer's order is unchanged.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "post",
  "clauses": [
    {
      "kind": "field",
      "field": "lang",
      "op": "eq",
      "value": "en"
    }
  ],
  "fields": [
    "title"
  ],
  "limit": 20,
  "linked": {
    "source": {
      "relation": "from-source",
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
    { "id": "ckps01", "title": "Rain on the coast", "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY",
      "linked": { "source": { "id": "cksr02", "name": "Harbour Daily", "createdAt": "2026-02-01T09:00:00.000Z", "updatedAt": "2026-02-01T09:00:00.000Z", "status": "READY" } } }
  ],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "record-table", "index": "TableRecord_qText0_idx", "rank": 1, "candidates": 1, "freshness": "transactional" }
    ],
    "pushdown": { "ids": 1, "cap": 25000, "mode": "exact" }
  }
}
```

#### No matches

The link leg found nobody, so the semantic clause never ran: `emptiedBy` names it.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "person",
  "userIdSlot": "userInfo.userId",
  "clauses": [
    {
      "kind": "term",
      "vocabularyKey": "language",
      "slug": "hebrew"
    },
    {
      "kind": "link",
      "relation": "friend-of",
      "where": [
        {
          "property": "tag",
          "op": "eq",
          "value": "close"
        }
      ]
    },
    {
      "kind": "semantic",
      "text": "loves hiking"
    }
  ]
}
```

Input:

```
{ "userId": "ckpg_user_b" }
```

Output:

```
{
  "records": [],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "term-store", "index": "RecordTerm_termId_recordId_idx", "rank": 1, "candidates": 9, "freshness": "transactional" },
      { "clause": 1, "store": "link-store", "index": "Link_eText0_idx", "rank": 3, "candidates": 0, "freshness": "transactional" }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  },
  "emptiedBy": 1
}
```

#### A value from the run

The followed guides came from a slot; the clause row says so, with the member count, never the values.

Reads `{ guideIds }` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "outing",
  "clauses": [
    {
      "kind": "field",
      "field": "guideId",
      "op": "in",
      "valueSlot": "followed.guideIds"
    },
    {
      "kind": "field",
      "field": "startsAt",
      "op": "gte",
      "valueSlot": "runInfo.now"
    }
  ],
  "limit": 20,
  "fields": [
    "title",
    "startsAt"
  ]
}
```

Input:

```
{ "guideIds": ["ckg_01", "ckg_02", "ckg_03"] }
```

Output:

```
{
  "records": [
    { "id": "ckwx2a", "title": "Ridge walk at dawn", "startsAt": "2026-06-27T04:30:00.000Z", "createdAt": "2026-06-20T07:00:00.000Z", "updatedAt": "2026-06-20T07:00:05.000Z", "status": "READY" }
    /* …up to 19 more, newest-first… */
  ],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "record-store", "index": "TableRecord_sText0_idx", "rank": 2, "candidates": 41, "freshness": "transactional", "operands": [{ "path": "value", "slot": "followed.guideIds", "members": 3 }] },
      { "clause": 1, "store": "record-store", "index": "TableRecord_sDate0_idx", "rank": 5, "candidates": 12, "freshness": "transactional", "operands": [{ "path": "value", "slot": "runInfo.now" }] }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```

#### Linked to what matches

The outings were ranked first; the guides linked to the closest come back by start date, and `bounded` says so.

Reads `{ q }` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "guide",
  "clauses": [
    {
      "kind": "link",
      "relation": "led-by",
      "direction": "incoming",
      "peer": [
        {
          "kind": "semantic",
          "textSlot": "request.q",
          "topK": 50
        }
      ]
    }
  ],
  "order": {
    "by": "field",
    "field": "joinedAt",
    "direction": "desc"
  },
  "limit": 20
}
```

Input:

```
{ "q": "river crossings with children" }
```

Output:

```
{
  "records": [
    { "id": "ckg_02", "title": "Maya Ben-Ami", "summary": "Leads family routes in the north", "createdAt": "2026-03-02T09:00:00.000Z", "updatedAt": "2026-03-02T09:00:04.000Z", "status": "READY" }
    /* …the other guides linked to one of the 50 closest outings… */
  ],
  "bounded": { "bound": 50, "reason": "peer-top-k" },
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "vector-index", "index": "outing.description", "rank": 9, "candidates": 50, "freshness": { "eventual": true, "watermark": "2026-06-15T10:02:30.000Z", "unindexed": 0 }, "operands": [{ "path": "peer.0.text", "slot": "request.q" }] },
      { "clause": 0, "store": "link-store", "index": "Link_validity_idx", "rank": 3, "candidates": 14, "freshness": "transactional", "operands": [{ "path": "peer.0.text", "slot": "request.q" }] }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```

#### Page by page

No semantic clause, so the answer is complete and pages newest-first; the cursor resumes after this page.

Reads `string` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "person",
  "clauses": [
    {
      "kind": "field",
      "field": "city",
      "op": "eq",
      "value": "Tel Aviv"
    }
  ],
  "cursorSlot": "pageCursor",
  "limit": 50
}
```

Input:

```
"eyJjcmVhdGVkQXQiOiIyMDI2LTA2LTEwVDA5OjIyOjMxLjAwMFoiLCJpZCI6ImNrd3gwYyJ9"
```

Output:

```
{
  "records": [
    { "id": "ckwx0b", "title": "Dana Cohen", "summary": "Runs a book club", "createdAt": "2026-06-09T08:22:31.000Z", "updatedAt": "2026-06-09T08:25:00.000Z", "status": "READY" }
    /* …49 more, newest-first… */
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA1LTAxVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNrd3g5eSJ9",
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "record-store", "index": "TableRecord_sText0_idx", "rank": 2, "candidates": 214, "freshness": "transactional" }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```

#### Every page

`pages` reads page after page of an exact question: every match, and no cursor.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "person",
  "userIdSlot": "userInfo.userId",
  "clauses": [
    {
      "kind": "field",
      "field": "city",
      "op": "eq",
      "value": "Tel Aviv"
    }
  ],
  "limit": 100,
  "fields": [
    "title"
  ],
  "pages": {
    "max": 10,
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
    { "id": "ckwx0b", "title": "Dana Cohen", "createdAt": "2026-06-09T08:22:31.000Z", "updatedAt": "2026-06-09T08:25:00.000Z", "status": "READY" }
    /* …every other match, newest-first… */
  ],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "record-store", "index": "TableRecord_sText0_idx", "rank": 2, "candidates": 214, "freshness": "transactional" }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```
