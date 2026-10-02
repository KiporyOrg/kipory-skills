<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.query` — Query records

Find records by their fields, terms, links, or meaning, all in one question.

- **Group:** entities · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `clause values + cursor + user slots` → `RecordQueryPage`
- **Reads:** The slots its clauses name for the values they compare against; optionally a cursor from `cursorSlot`; and on a user-owned type the user id from `userIdSlot`. _(shape hint: `clause values + cursor + user slots`)_
- **Emits:** A `RecordQueryPage`: the records satisfying every clause, a `nextCursor` when an exact-only query has more, and `bounded` plus `explanation` on every answer.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clauses` | any[] | yes | — | Records match all clauses — field, term, edge, stream, at most one semantic. A value may come from a slot: `valueSlot`, `slugSlot`, `textSlot`, `fromSlot`, `toSlot`. ⚠️ A semantic clause makes the answer a ranking of at most topK records, with no cursor. If a value named by a slot is missing the step is skipped; an empty list answers no records. |
| `cursorSlot` | string | no | — | The slot holding a prior answer's cursor. Absent, the first page. Only a query without a semantic clause pages. ⚠️ A cursor that has been edited or truncated fails the step; an absent one starts from the newest record. |
| `limit` | integer | no | `50` | How many records come back at most: 1 to 100. A semantic clause's own topK is bounded separately. |
| `order` | union | no | — | How the answer is ordered: `created`, `meaning`, or a date field of the type. Omitted: by meaning with a semantic clause, else newest first. ⚠️ A field order needs a date field with a `filter` use, and leaves out records with no value there. Beside a semantic clause it re-orders the ranking and does not page. |
| `recordType` | string | yes | — | The record type the question is asked of. |
| `userIdSlot` | string | no | — | On a user-owned type, the slot holding the user whose records are queried. Absent, the run's signed-in user. ⚠️ On a user-owned record type an empty value fails the step rather than returning an unfiltered answer, and a run with no signed-in user and no slot fails the same way. |

### `order` — one of

**Alternative 1**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `created` | yes | — | Newest created first. |

**Alternative 2**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `meaning` | yes | — | Closest first. Needs a `semantic` clause of the query's own. |

**Alternative 3**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `field` | yes | — | By one of the type's own date fields. |
| `field` | string | yes | — | A date field of the record type that carries a `filter` use. A record with no value there is left out. |
| `direction` | `asc` \| `desc` | no | `"desc"` | `desc` (latest first, the default) or `asc`. |

## Worked example

Asks one question across a record type's stores and says, on every answer, whether it is complete and which store answered each clause.

Reads: clause values, the cursor and the user. Emits: records + bounded + explanation.

#### Three conditions

Term and edge legs ran first; their intersection was pushed into the index exactly, so `bounded` is false.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "recordType": "person",
  "userIdSlot": "userInfo.userId",
  "clauses": [
    {
      "kind": "term",
      "facet": "language",
      "slug": "hebrew"
    },
    {
      "kind": "edge",
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
      { "clause": 1, "store": "edge-store", "index": "RecordRelation_eText0_idx", "rank": 3, "candidates": 37, "freshness": "transactional" },
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
  "recordType": "person",
  "userIdSlot": "userInfo.userId",
  "clauses": [
    {
      "kind": "term",
      "facet": "language",
      "slug": "hebrew"
    },
    {
      "kind": "edge",
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
      { "clause": 1, "store": "edge-store", "index": "RecordRelation_eText0_idx", "rank": 3, "candidates": 0, "freshness": "transactional" }
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
  "recordType": "outing",
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
  "recordType": "guide",
  "clauses": [
    {
      "kind": "edge",
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
      { "clause": 0, "store": "edge-store", "index": "RecordRelation_validity_idx", "rank": 3, "candidates": 14, "freshness": "transactional", "operands": [{ "path": "peer.0.text", "slot": "request.q" }] }
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
  "recordType": "person",
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
