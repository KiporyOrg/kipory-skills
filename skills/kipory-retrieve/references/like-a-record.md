# Records like this one

Read this when a search should rank the records closest to a given record rather than to a phrase.

## Records like this one

Give the clause a record instead of a phrase and the answer ranks the records closest to that record:

```json
{
  "tableKey": "story",
  "clauses": [
    {
      "kind": "semantic",
      "likeRecordId": "trigger.recordId",
      "topK": 5,
      "minScore": 0.6
    }
  ]
}
```

- **`likeRecordId`** takes the record's id: a path, or `{ "literal": "<id>" }` for a fixed one. The clause takes a phrase or a record, never both.
- **No model is called.** The record's own indexed parts are the query, so it costs the step and nothing else.
- **The record is left out of its own answer.**
- **A record of another type** needs `likeTableKey` naming that type — "the stories most like this post". Both types must use the same embedding profile; anything else is refused at save `QUERY_LIKE_TABLE_MODEL_MISMATCH`. The record is read on its own table's `search` field named like the field the clause ranks on, or on that table's default search field when it has none of that name; `explanation`'s `likeRecord.field` says which.
- **A record that is not indexed yet fails the step** (`QUERY_LIKE_RECORD_NOT_INDEXED`) rather than answering an empty list, which would read as "nothing resembles it". A record of a searchable table is `ready` once it is indexed: run the search from a flow that fires after the record is ready, or retry.
- **A long record is compared by its first 8 parts.** The clause's `explanation` row says so (`likeRecord.partsCapped`), and `likeRecord.stale` says when the record changed after it was indexed.
- **`passage` cannot be combined with it.**
