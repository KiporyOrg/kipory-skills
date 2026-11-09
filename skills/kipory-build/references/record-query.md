# Reading with record.query

<!-- field-ok: runInfo — a provider value the platform fills, not a request field -->
<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: myShelf — one project's example view key, not a platform field -->

§9 of the flow and record shapes (`patterns.md` has the map of every section). A list an endpoint answers is a view (`views.md`); this is for what a view does not do.

## 9. Read what one user follows

"Show me what is new from the things I follow" is, first, a view: `myShelf` in [views.md](views.md) (§11) reads the follows as a set inside the same statement, as the caller, with no 1,000-value cap and no extra step. The inline form below is for when the view cannot say it — here, a parent that matches through a link to a followed child, which a set (`field` clauses only) does not reach. It is three steps in a line. The follows are a per-user table; the feed is one `record.query` whose values come from earlier steps.

```
follows: record.list (my follows)  →  followed: value.transform (follows.records)  →  page: record.query
```

The transform's value `followed` is an object with one field: `{ "ids": [ … ] }`. `cursor` is an optional flow input carrying the `nextCursor` a previous page answered, read `optional`. Its first run has no `cursor` input, the root absent, so it reads page one. A read's `cursor` bound in `with` to a path whose root ran or was given (another read's page) with nothing at the path (that page's `nextCursor` after its last page) means the list ended, and it answers an empty page; the root absent (the first run, an optional input left out), or no `cursor` bound, reads page one. `""` is a value, so page one too.

The follows read takes every page, so a person following more than one page of things is not cut to the first 50:

```json
{
  "tableKey": "follow",
  "limit": 100,
  "pages": { "max": 10 }
}
```

`max: 10` is 1,000 follows; a person with more fails the step `RECORD_READ_HAS_MORE` rather than silently missing the rest — which also fits the 1,000-value bound on `in` below. Without `pages` the save warns `RECORD_LIST_CURSOR_UNREAD`, because no step reads the follows page's `nextCursor`. The feed query itself stays one page: its cursor goes back to the caller.

The relation is declared once, on the child: an `item` points at its `collection`, and the relation `in-collection` is paired from `item` to `collection`. The `uses` of `item`:

```json
{
  "fields": [
    {
      "source": { "family": "submission", "field": "collectionId" },
      "uses": [{ "kind": "link", "relation": "in-collection" }]
    },
    {
      "source": { "family": "submission", "field": "authorId" },
      "uses": ["filter"]
    }
  ]
}
```

The parent declares no relation. The `uses` of `collection` carry only what the query orders by:

```json
{
  "fields": [
    {
      "source": { "family": "submission", "field": "lastItemAt" },
      "uses": ["filter"]
    }
  ]
}
```

The query is asked of the parent, with the link coming IN:

```json
{
  "tableKey": "collection",
  "clauses": [
    {
      "kind": "link",
      "relation": "in-collection",
      "direction": "incoming",
      "peer": [
        {
          "kind": "field",
          "field": "authorId",
          "op": "in",
          "value": "followed.ids"
        }
      ]
    }
  ],
  "order": { "by": "field", "field": "lastItemAt", "direction": "desc" },
  "limit": 20,
  "cursor": { "path": "cursor", "optional": true }
}
```

- **Query the thing the user sees, not the thing they follow.** The clause above asks for collections linked to an item by a followed author, so each collection comes back once however many of its items match. Paging the items and collapsing them afterwards repeats a collection across pages.
- **`incoming` is asked of the table the relation points at.** The `link` use stays on the child's field (`item.collectionId`); the parent needs none, and `peer` clauses are checked against the child's `uses` (`authorId` carries `filter`). Without `direction: "incoming"` the same clause on `collection` is refused `QUERY_CLAUSE_UNROUTED`: the default, `outgoing`, needs the `link` use on the queried table. The refusal says to ask `incoming`.
- **Following nobody is an answer.** `followed.ids` holding `[]` runs the query and returns no records. A value that may be nothing is a save finding on the query: have the transform always answer a list (`{"ids": [follows.records.authorId]}`).
- **`in` takes at most 1,000 values.** Past that the step fails with `QUERY_OPERAND_INVALID`; store the membership on the record instead and filter on it.
- **Each collection with its newest items is `linked`, not a second query.** Add `"linked": { "latest": { "relation": "in-collection", "direction": "incoming", "limit": 3, "onMore": "stop" } }` to the query: each collection then carries `linked.latest`, its three newest items (`limit` is per collection), and `linkedMore.latest` when it has more. For each linked read, the records it hangs off times its `limit`, summed over every linked read, must stay within 20,000 — checked at save.
- **Order by a field the record carries:** `created` or a `filter` field (date, number, true/false, text with `maxLength` ≤ 500). `pages` needs a date or `created` order. A linked record's value: next pattern.
- **Filter or look up only by a field with a `filter` use**, your own markers too.
- **"Due now" is the same shape.** `{ "kind": "field", "field": "nextRunAt", "op": "lte", "value": "runInfo.now" }` reads only the due records; listing them all and filtering in a transform reads the whole table.

### The clause grammar

`record.query` is the one function that joins: a record matches when it matches **every** clause in `clauses` (at most 16). Each clause is one of five kinds. Each value is an argument: a path (`"followed.ids"`), a fixed value (`{ "literal": "published" }`; a bare number or `true`/`false` too) or an expression (`{ "expr": "…" }`):

| `kind`     | Members                                                                                                                                                                                                         | Matches                                                                                                                                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `field`    | `field`, `op` (`eq`, `lt`, `lte`, `gt`, `gte`, `in`), `value`                                                                                                                                                   | a field of the table that carries a `filter` use. `in` takes a list (any of them, at most 1,000); dates are ISO 8601 strings                                                                                                                       |
| `term`     | `vocabularyKey`, `slug`                                                                                                                                                                                         | a term of a vocabulary the table surfaces, by slug; an alias resolves to its canonical term                                                                                                                                                        |
| `semantic` | `text`, optional `field`, optional `topK` (default 50, at most 200)                                                                                                                                             | records ranked by meaning against the table's search index. At most one per query, counting one inside a link clause's `peer`                                                                                                                      |
| `link`     | `relation`, optional `direction` (`outgoing` by default, `incoming` or `either`), optional `where[]`, `count` (`{ op, n }` with `op` one of `>=`, `>`, `=`, `<`, `<=`; omitted means at least one) and `peer[]` | records linked by a relation a `link` use declares: on a field of the table, or, for `incoming` and `either`, on a field of a table that points at it; `peer` holds `field`, `term` and `semantic` clauses on the record at the other end, one hop |
| `stream`   | `field`, optional `window` (`from`, `to`), optional `where[]` and `count` (`"exists"` by default, `"none"`, or `{ op, n }`)                                                                                     | event rows of a field that carries a `stream` use, inside a time window                                                                                                                                                                            |

A text `field` clause finds a value of any length with `eq` and `in`; `lt`/`lte`/`gt`/`gte` compare only values up to 2,000 bytes, and the clause's explanation row says how many records it left out (`longTextSkipped`). Keep a field you range over short (`maxLength` 500 or fewer); find long text by meaning with `semantic`. `record.list` and `record.count` take no range on a text field: saving one is refused `RECORD_FILTER_TEXT_RANGE`.

A `where[]` entry is `{ property, op, value }` over a filter the relation or the stream declares. Only a query without a `semantic` clause pages (`cursor`); `limit` is 1 to 100. `POST /v1/records/query` asks the same clauses from outside a flow (`kipory-data`).

### Totals: `record.aggregate`

A figure over many records — how many, a sum, an average, per day or per source — is one `record.aggregate` step, never a page reduced in `value.transform`: a page holds at most 100 records, so a total read from one is right while the table is small and quietly wrong after. `record.aggregate` takes `record.query`'s `clauses` (none totals the whole table), up to two `groupBy` keys and named `measures`, and answers one row per group:

```yaml
- key: totals
  function: record.aggregate
  with:
    tableKey: loan
    clauses:
      - { kind: field, field: decision, op: eq, value: { literal: approved } }
    groupBy:
      - { field: region }
      - { field: approvedAt, bucket: month }
    measures:
      loans: { count: true }
      principal: { sum: amount }
    order: { by: principal, direction: desc }
    limit: 10
    timeZone: Europe/Berlin
```

→ `{ "groups": [{ "region": "north", "approvedAt": "2026-08-31T22:00:00.000Z", "loans": 212, "principal": 2650000 }, …], "complete": false }`

- **Every field it reads carries `filter`** — a measure's field and a group key's. A field without one is refused at save. `sum` and `avg` take a number field; `min` and `max` a number or a date.
- **A group key** is `{ "field" }`, `{ "field", "bucket": "day" | "week" | "month" }` (a date; a week starts on Monday), `{ "created": "day" }`, `{ "vocabulary" }` (the record's active terms: a record with two terms counts in both groups) or `{ "status": true }`. `timeZone` is an IANA name such as `Europe/Berlin`; an offset is refused. `as` renames it in the answer — give a vocabulary key one when its name has a hyphen (`risk-band`), so a transform reads `groups[0].risk` rather than a subtraction. Records with no value form one group whose key is `null`. A term key is the term's slug: two terms with one slug under different parents count as one group. A `status` key holds the status as flow records spell it (`READY`); `POST /v1/records/aggregate` answers it lowercase (`ready`).
- **Of nothing**, a count and a sum are `0`; an average, minimum or maximum is left out of the row.
- **`complete: false`** means more groups exist than `limit` (default 100, at most 1,000); the ones answered come first in `order`.
- **A `semantic` clause is refused**: a meaning search ranks a few records, it does not total them. So is a text range (`gt` / `lt` on a text field): it compares values up to 2,000 bytes only, so a total could not be exact — compare text with `eq` or `in`.
- **Sums and averages are exact decimals**: 0.1 + 0.2 totals 0.3.
- **A date-only field** (`format: date`) is cut by its calendar date, whatever `timeZone` says; a timestamp and `created` are cut in `timeZone`.
- **A term, link or stream clause** is read a moment before the rows it counts; a field clause is read with them.
- **At most two totals run at once per project, in each server process.** A third flow step waits up to 10 s for a turn, then fails as the platform busy and the run is tried again; a third `POST /v1/records/aggregate` answers 429 `RATE_LIMITED` — retry after `retryAfterSeconds`.
- **On a large table** (about 250,000 records and up) a whole-table total can pass its 4 s budget (`QUERY_AGGREGATE_TOO_BROAD`): narrow it with a clause or a date window (`gte` on a date field).
- On a table each user owns, the step totals one user's records: the signed-in user's, or the one `userId` names — in a run that acts for a signed-in user, only that user (`PERSON_NOT_THE_RUNS`). ⚠️ On a public endpoint, a `userId` read from the request lets anyone total anyone's records; the save warns `PUBLIC_ENDPOINT_NAMES_PERSON`. `POST /v1/records/aggregate` asks the same from outside a flow, reading every user's records as `POST /v1/records/query` does: its body takes each clause value as itself (no `{literal}` or `{expr}`), and `clauses: []` totals all.
