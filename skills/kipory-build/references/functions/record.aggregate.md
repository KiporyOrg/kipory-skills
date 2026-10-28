<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.aggregate` — Total records

Count, sum or average the records that match, as a whole or per group.

One exact answer over every matching record, grouped by a field, a date, a term or the status.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the values its clauses compare against` → `RecordAggregate`
- **Also found as:** total, sum, average, group by, per day, dashboard figures, how many per
- **Reads:** The values its clauses compare against, each a slot, a fixed value or an expression; on a user-owned table the `userId`. _(shape hint: `the values its clauses compare against`)_
- **Emits:** A `RecordAggregate`: a row per group with its keys and totals. A count or sum of nothing is `0`; an average, minimum or maximum of nothing is left out.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clauses` | union[], 0 to 16 items | no | `[]` | Which records to total, as `record.query` asks; none totals them all. ⚠️ A `semantic` clause is refused: a meaning search ranks a few, it does not total. |
| `groupBy` | union[], at most 2 items | no | `[]` | Up to two keys: a field, a date period, terms or status. ⚠️ A record with two terms counts in both groups; give a hyphenated vocabulary key an `as`. |
| `limit` | integer, 1 to 1000 | no | `100` | How many groups come back at most: 1 to 1000. ⚠️ More groups than this answer the first ones in order, with `complete: false`. |
| `measures` | object | yes | — | Named totals: count, countDistinct, sum, avg, min or max of a field. |
| `order` | object | no | — | Order groups by a key or a measure; group keys by default. |
| `tableKey` | string | yes | — | The table whose records to total. |
| `timeZone` | string | no | `"UTC"` | The time zone days, weeks and months are cut in. |
| `userId` | union | no | — | The person whose records to total; empty means the signed-in user. ⚠️ An empty value, or no signed-in user, fails the action on user-owned tables. |

### `clauses` — each item is one of

**`kind: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `field` | yes | — | A condition on a field the type routes with `filter`. |
| `field` | string | yes | — | A field of the table with a `filter` use. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` \| `not-in` | yes | — | Each operator takes one value; `in` takes a list. |
| `value` | union | yes | — | The value to compare (a list for `in`; dates in ISO 8601). |

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

**`kind: term`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `term` | yes | — | An assignment of a vocabulary term, by slug. |
| `vocabularyKey` | string | yes | — | A vocabulary the table lists in `uses.vocabularies`. |
| `slug` | union | yes | — | The term, by slug; an alias counts as its term. |

`slug` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`slug` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`slug` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

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
| `value` | union | yes | — | The text value to compare; for `in`, up to 1000 values. |

`where` › `value` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`where` › `value` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`where` › `value` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

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
| `from` | union | no | — | Inclusive start of the window, an ISO 8601 moment. |
| `to` | union | no | — | Inclusive end of the window, an ISO 8601 moment; default now. |

`window` › `from` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`window` › `from` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`window` › `from` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

`window` › `to` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`window` › `to` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`window` › `to` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

`where` — each item:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `property` | string | yes | — | A declared link filter, or stream filter of the field. |
| `op` | `eq` \| `ne` \| `in` \| `lt` \| `lte` \| `gt` \| `gte` | yes | — | How the stamped value compares. |
| `value` | union | yes | — | The text value to compare; for `in`, up to 1000 values. |

`where` › `value` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`where` › `value` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`where` › `value` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

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
| `text` | union | no | — | The phrase to resemble. |
| `likeRecordId` | union | no | — | A record id to resemble instead of a phrase; excluded from results. |
| `likeTableKey` | string | no | — | The table of the record to resemble, if not the queried one. |
| `topK` | integer, 1 to 200 | no | — | How many to rank; default 50. |
| `minScore` | number, -1 to 1 | no | — | Leave out records scoring below this, from −1 to 1. |
| `passage` | boolean | no | — | `true` also returns the text of each record's best-matching part. |

`text` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`text` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`text` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

`likeRecordId` — one of:

- `string`
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`likeRecordId` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`likeRecordId` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `groupBy` — each item is one of

**An object with `field`, `bucket`, `as`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | A field of the table with a `filter` use. |
| `bucket` | `day` \| `week` \| `month` | no | — | For a date field: cut it into days, weeks or months. |
| `as` | string | no | — | Its name in each group; by default the key's own name. |

**An object with `created`, `as`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `created` | `day` \| `week` \| `month` | yes | — | Group by when the record was created. |
| `as` | string | no | — | Its name in each group; by default the key's own name. |

**An object with `vocabulary`, `as`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `vocabulary` | string | yes | — | Group by the record's active terms of this vocabulary. |
| `as` | string | no | — | Its name in each group; by default the key's own name. |

**An object with `status`, `as`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `status` | boolean | yes | — | Group by the record's processing status. |
| `as` | string | no | — | Its name in each group; by default the key's own name. |

### `order`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | string | yes | — | A group key's or a measure's name. |
| `direction` | `asc` \| `desc` | no | `"asc"` |  |

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

## Worked example

Totals every matching record in one statement, so a figure is exact however large the table grows.

#### Totals

No group keys, so one row: the approved loans, their summed amount and the largest.

Reads `{ decision }` → emits `RecordAggregate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "loan",
  "clauses": [
    {
      "kind": "field",
      "field": "decision",
      "op": "eq",
      "value": "review.decision"
    }
  ],
  "measures": {
    "loans": {
      "count": true
    },
    "principal": {
      "sum": "amount"
    },
    "largest": {
      "max": "amount"
    }
  }
}
```

Input:

```
{ "decision": "approved" }
```

Output:

```
{
  "groups": [{ "loans": 1503, "principal": 18234500, "largest": 250000 }],
  "complete": true
}
```

#### Per region per month

Two keys: a field and a date cut into months. Loans with no region form the `null` group.

Reads `{ from }` → emits `RecordAggregate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "loan",
  "clauses": [
    {
      "kind": "field",
      "field": "approvedAt",
      "op": "gte",
      "value": "report.from"
    }
  ],
  "groupBy": [
    {
      "field": "region"
    },
    {
      "field": "approvedAt",
      "bucket": "month"
    }
  ],
  "measures": {
    "loans": {
      "count": true
    },
    "principal": {
      "sum": "amount"
    }
  },
  "order": {
    "by": "principal",
    "direction": "desc"
  },
  "limit": 3,
  "timeZone": "Europe/Berlin"
}
```

Input:

```
{ "from": "2026-08-01T00:00:00.000Z" }
```

Output:

```
{
  "groups": [
    { "region": "north", "approvedAt": "2026-08-31T22:00:00.000Z", "loans": 212, "principal": 2650000 },
    { "region": "south", "approvedAt": "2026-08-31T22:00:00.000Z", "loans": 180, "principal": 2210000 },
    { "region": null, "approvedAt": "2026-08-31T22:00:00.000Z", "loans": 9, "principal": 98000 }
  ],
  "complete": false
}
```

#### Nothing matches

No record matched. The count and the sum are `0`, a real answer; the largest of nothing is left out.

Reads `string` → emits `RecordAggregate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "loan",
  "clauses": [
    {
      "kind": "field",
      "field": "region",
      "op": "eq",
      "value": "regionId"
    }
  ],
  "measures": {
    "loans": {
      "count": true
    },
    "principal": {
      "sum": "amount"
    },
    "largest": {
      "max": "amount"
    }
  }
}
```

Input:

```
"region_new"
```

Output:

```
{
  "groups": [{ "loans": 0, "principal": 0 }],
  "complete": true
}
```
