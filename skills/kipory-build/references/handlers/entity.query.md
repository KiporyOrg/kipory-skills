<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.query` — Query records

Ask one question across a record type's stores: fields, terms, links, streams and meaning, answered exactly.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `cursor + user slots` → `RecordQueryPage`
- **Reads:** Optionally a prior answer's cursor from the slot `cursorSlot` names, and on a user-owned type the user id from `userIdSlot`; the question itself is config. _(shape hint: `cursor + user slots`)_
- **Emits:** A `RecordQueryPage`: the records satisfying every clause, a `nextCursor` when an exact-only query has more, and `bounded` plus `explanation` on every answer.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clauses` | any[] | yes | — | Every returned record satisfies all of these: field, term, edge, stream, and at most one semantic clause. Up to 16. ⚠️ With a semantic clause the answer is a ranking of at most its topK records and carries no cursor; `bounded` on the output says so. Without one, the answer is complete and pages. |
| `cursorSlot` | string | no | — | The slot holding a prior answer's cursor. Absent, the first page. Only a query without a semantic clause pages. ⚠️ A cursor that has been edited or truncated fails the step; an absent one starts from the newest record. |
| `limit` | integer | no | `50` | How many records come back at most: 1 to 100. A semantic clause's own topK is bounded separately. |
| `recordType` | string | yes | — | The record type the question is asked of. |
| `userIdSlot` | string | no | — | On a user-owned type, the slot holding the user whose records are queried. Absent, the run's signed-in user. ⚠️ On a user-owned record type an empty value fails the step rather than returning an unfiltered answer, and a run with no signed-in user and no slot fails the same way. |

## Worked example

Asks one question across a record type's stores and says, on every answer, whether it is complete and which store answered each clause.

Reads: the cursor and user slots. Emits: records + bounded + explanation.

#### three clauses, answered exactly

Term and edge legs ran first; their intersection was pushed into the index exactly, so `bounded` is false.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

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

#### a clause emptied the set

The edge leg found nobody, so the semantic clause never ran: `emptiedBy` names it.

Reads `{ userId }` → emits `RecordQueryPage` · 1 in → 1 out

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

#### exact-only, paged

No semantic clause, so the answer is complete and pages newest-first; the cursor resumes after this page.

Reads `string` → emits `RecordQueryPage` · 1 in → 1 out

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
