<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.query` — Query records

Find records by their fields, terms, links, or meaning, all in one question.

Returns the records of one type that satisfy every clause. Exact clauses narrow first; a `semantic` clause then ranks by meaning and adds `scores`, how close each record is. A clause's value may come from a slot. Every answer says whether it is complete.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the slots its clauses name` → `RecordQueryPage`
- **Reads:** The slots its clauses name for the values they compare against; optionally a cursor from `cursorSlot`; and on a user-owned type the user id from `userIdSlot`. _(shape hint: `the slots its clauses name`)_
- **Emits:** A `RecordQueryPage`: the records satisfying every clause, a `nextCursor` when an exact-only query has more, and `bounded` plus `explanation` on every answer.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clauses` | union[], 1 to 16 items | yes | — | Records match all clauses — field, term, edge, stream, at most one semantic. A value may come from a slot: `valueSlot`, `slugSlot`, `textSlot`, `fromSlot`, `toSlot`. ⚠️ A semantic clause makes the answer a ranking of at most topK records, with no cursor. If a value named by a slot is missing the step is skipped; an empty list answers no records. |
| `cursorSlot` | string | no | — | The slot holding a prior answer's cursor. Absent, the first page. Only a query without a semantic clause pages. ⚠️ A cursor that has been edited or truncated fails the step; an absent one starts from the newest record. |
| `limit` | integer, 1 to 100 | no | `50` | How many records come back at most: 1 to 100. A semantic clause's own topK is bounded separately. |
| `order` | union | no | — | How the answer is ordered: `created`, `meaning`, or a date field of the type. Omitted: by meaning with a semantic clause, else newest first. ⚠️ A field order needs a date field with a `filter` use, and leaves out records with no value there. Beside a semantic clause it re-orders the ranking and does not page. |
| `tableKey` | string | yes | — | The table the question is asked of. ⚠️ A row carries every field the type declares. One the record does not hold is `null`, not absent, so `$exists` is true for it: test `!= null`. |
| `userIdSlot` | string | no | — | On a user-owned type, the slot holding the user whose records are queried. Absent, the run's signed-in user. ⚠️ On a user-owned table an empty value fails the step rather than returning an unfiltered answer, and a run with no signed-in user and no slot fails the same way. |

### `clauses` — each item is one of

**`kind: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `field` | yes | — | A condition on a field the type routes with `filter`. |
| `field` | string | yes | — | A field of the table that carries a `filter` use. Any other field is refused. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` | yes | — | `eq`, `lt`, `lte`, `gt`, `gte` take one value; `in` takes a list (OR within the clause). |
| `value` | union | no | — | One scalar, or a list for `in`. Dates as ISO 8601 strings. |
| `valueSlot` | string | no | — | The slot whose run-time value is compared against, in place of `value`: one scalar, or a list for `in`. |

`value` — one of: `string | number | boolean`; `(string | number | boolean)[]`, 1 to 1000 items.

**`kind: term`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `term` | yes | — | An assignment of a vocabulary term, by slug. |
| `vocabularyKey` | string | yes | — | A vocabulary the table surfaces in `uses.vocabularies`. Any other vocabulary is refused. |
| `slug` | string | no | — | The term, by slug. An alias resolves to its canonical term, one hop. |
| `slugSlot` | string | no | — | The slot whose run-time value is the term's slug, in place of `slug`. |

**`kind: link`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `link` | yes | — | A relation a `link` use declares, optionally narrowed by its link filters, a count and one hop of peer clauses. |
| `relation` | string | yes | — | A relation a `link` use declares: on a field of this table, or, asked `incoming` or `either`, of a table pointing at it. |
| `direction` | `outgoing` \| `incoming` \| `either` | no | — | Which end the record is on. Omitted: `outgoing`. |
| `where` | object[], 1 to 16 items | no | — | Clauses on the relation's declared link filters, ANDed. |
| `count` | object | no | — | Keep records whose number of matching links compares so. Omitted: at least one. |
| `peer` | union[], 1 to 16 items | no | — | Clauses on the PEER record's own uses — `field`, `term`, and at most one `semantic` — one hop. |

`where` — each item:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `property` | string | yes | — | A declared link filter of the relation, or a declared stream filter of the field. |
| `op` | `eq` \| `ne` \| `in` \| `lt` \| `lte` \| `gt` \| `gte` | yes | — | How the stamped value compares. |
| `value` | string | no | — | The value compared against, as a string; `in` takes up to 1000 comma-separated members. |
| `valueSlot` | string | no | — | The slot whose run-time value is compared against, in place of `value`: text, or a list for `in`. |

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
| `window` | object | no | — | The time window on the event's own `at`. Omitted or open-ended: bounded to the stream's retention. |
| `where` | object[], 1 to 16 items | no | — | Clauses on the stream's declared filters, ANDed. |
| `count` | union | no | — | `exists` (default), `none` (no matching event), or a comparison on the count. |

`window`:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `from` | string | no | — | Inclusive start of the window, ISO 8601. |
| `fromSlot` | string | no | — | The slot holding the window's start, in place of `from`. |
| `to` | string | no | — | Inclusive end of the window, ISO 8601. Omitted: now. |
| `toSlot` | string | no | — | The slot holding the window's end, in place of `to`. |

`where` — each item:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `property` | string | yes | — | A declared link filter of the relation, or a declared stream filter of the field. |
| `op` | `eq` \| `ne` \| `in` \| `lt` \| `lte` \| `gt` \| `gte` | yes | — | How the stamped value compares. |
| `value` | string | no | — | The value compared against, as a string; `in` takes up to 1000 comma-separated members. |
| `valueSlot` | string | no | — | The slot whose run-time value is compared against, in place of `value`: text, or a list for `in`. |

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
| `kind` | `semantic` | yes | — | A phrase ranked by meaning against the type's search index. At most one per query, counting the one a link's peer may hold. |
| `field` | string | no | — | A field carrying a `search` use, to rank on that field's role. Omitted: the type's default search role. |
| `text` | string, at most 8000 characters | no | — | The phrase to resemble. |
| `textSlot` | string | no | — | The slot whose run-time value is the phrase, in place of `text`. |
| `likeRecordId` | string | no | — | A record to resemble, in place of a phrase. The answer ranks the records closest to it, leaves it out, and calls no model. |
| `likeTableKey` | string | no | — | The table of the record to resemble, when it is not the queried table. Both tables must use the same search model. |
| `likeRecordIdSlot` | string | no | — | The slot whose run-time value is the id of the record to resemble, in place of `likeRecordId`. |
| `topK` | integer, 1 to 200 | no | — | How many to rank. Omitted: 50. |
| `minScore` | number, -1 to 1 | no | — | Leave out records scoring below this, from −1 to 1. It removes from the `topK` ranking and never reaches past it. |
| `passage` | boolean | no | — | `true`: each entry of `scores` also carries the text of the record's best-matching part, when it is indexed in several parts. |

### `order` — one of

**`by: created`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `created` | yes | — | Newest created first. |

**`by: meaning`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `meaning` | yes | — | Closest first. Needs a `semantic` clause of the query's own. |

**`by: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `field` | yes | — | By one of the table's own date fields. |
| `field` | string | yes | — | A date field of the table that carries a `filter` use. A record with no value there is left out. |
| `direction` | `asc` \| `desc` | no | `"desc"` | `desc` (latest first, the default) or `asc`. |

## Worked example

Asks one question across a table's stores and says, on every answer, whether it is complete and which store answered each clause.

#### Three conditions

Term and edge legs ran first; their intersection was pushed into the index exactly, so `bounded` is false.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Step settings (`handlerConfig`):

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
    { "id": "ckwx0a", "title": "Noa Levi", "summary": "Hikes the Israel Trail every spring", "text": null, "comment": null, "createdAt": "2026-06-15T10:01:55.000Z", "updatedAt": "2026-06-15T10:02:10.000Z", "status": "READY" }
  ],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "term-store", "index": "RecordTerm_termId_recordId_idx", "rank": 1, "candidates": 412, "freshness": "transactional" },
      { "clause": 1, "store": "link-store", "index": "RecordRelation_eText0_idx", "rank": 3, "candidates": 37, "freshness": "transactional" },
      { "clause": 2, "store": "vector-index", "index": "kipory_proj_a1b2_person", "rank": 9, "candidates": 1, "freshness": { "eventual": true, "watermark": "2026-06-15T10:02:30.000Z", "unindexed": 0 } }
    ],
    "pushdown": { "ids": 37, "cap": 25000, "mode": "exact" }
  }
}
```

#### No matches

The edge leg found nobody, so the semantic clause never ran: `emptiedBy` names it.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Step settings (`handlerConfig`):

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
      { "clause": 1, "store": "link-store", "index": "RecordRelation_eText0_idx", "rank": 3, "candidates": 0, "freshness": "transactional" }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  },
  "emptiedBy": 1
}
```

#### A value from the run

The followed guides came from a slot; the clause row says so, with the member count, never the values.

Reads `{ guideIds }` → emits `RecordQueryPage` · 1 in → 1 out

Step settings (`handlerConfig`):

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
  "limit": 20
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
    { "id": "ckwx2a", "title": "Ridge walk at dawn", "summary": "Six hours, moderate", "text": null, "comment": null, "createdAt": "2026-06-20T07:00:00.000Z", "updatedAt": "2026-06-20T07:00:05.000Z", "status": "READY" }
    /* …up to 19 more, newest-first… */
  ],
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "record-store", "index": "ProjectRecord_sText0_idx", "rank": 2, "candidates": 41, "freshness": "transactional", "operands": [{ "path": "value", "slot": "followed.guideIds", "members": 3 }] },
      { "clause": 1, "store": "record-store", "index": "ProjectRecord_sDate0_idx", "rank": 5, "candidates": 12, "freshness": "transactional", "operands": [{ "path": "value", "slot": "runInfo.now" }] }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```

#### Linked to what matches

The outings were ranked first; the guides linked to the closest come back by start date, and `bounded` says so.

Reads `{ q }` → emits `RecordQueryPage` · 1 in → 1 out

Step settings (`handlerConfig`):

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
    { "id": "ckg_02", "title": "Maya Ben-Ami", "summary": "Leads family routes in the north", "text": null, "comment": null, "createdAt": "2026-03-02T09:00:00.000Z", "updatedAt": "2026-03-02T09:00:04.000Z", "status": "READY" }
    /* …the other guides linked to one of the 50 closest outings… */
  ],
  "bounded": { "bound": 50, "reason": "peer-top-k" },
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "vector-index", "index": "kipory_proj_a1b2_outing", "rank": 9, "candidates": 50, "freshness": { "eventual": true, "watermark": "2026-06-15T10:02:30.000Z", "unindexed": 0 }, "operands": [{ "path": "peer.0.text", "slot": "request.q" }] },
      { "clause": 0, "store": "link-store", "index": "RecordRelation_validity_idx", "rank": 3, "candidates": 14, "freshness": "transactional", "operands": [{ "path": "peer.0.text", "slot": "request.q" }] }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```

#### Page by page

No semantic clause, so the answer is complete and pages newest-first; the cursor resumes after this page.

Reads `string` → emits `RecordQueryPage` · 1 in → 1 out

Step settings (`handlerConfig`):

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
    { "id": "ckwx0b", "title": "Dana Cohen", "summary": "Runs a book club", "text": null, "comment": null, "createdAt": "2026-06-09T08:22:31.000Z", "updatedAt": "2026-06-09T08:25:00.000Z", "status": "READY" }
    /* …49 more, newest-first… */
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA1LTAxVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImNrd3g5eSJ9",
  "bounded": false,
  "explanation": {
    "clauses": [
      { "clause": 0, "store": "record-store", "index": "ProjectRecord_sText0_idx", "rank": 2, "candidates": 214, "freshness": "transactional" }
    ],
    "pushdown": { "ids": 0, "cap": 25000, "mode": "none" }
  }
}
```
