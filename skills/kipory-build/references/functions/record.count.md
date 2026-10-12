<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.count` — Count records

Count the records that match, without reading them.

Filter by status, date, vocabulary, field or link; the database does the counting.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `user id` → `number`
- **Also found as:** how many records, number of records, tally
- **Reads:** The user id, from the slot `userIdSlot` names. Everything else is settings on the action. There is no page size and no cursor. _(shape hint: `user id`)_
- **Emits:** A number: how many records match every filter. An empty result is `0`, which is a real answer rather than a missing one.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `createdAfter` | string | no | — | Count only rows created at or after this ISO-8601 date. ⚠️ This is when the row was stored; for your own dates use `fieldFilters`. |
| `createdBefore` | string | no | — | Count only rows created at or before this ISO-8601 date. |
| `fieldFilterSlots` | object | no | — | Each queryable field with the slot carrying its value or list. ⚠️ If a slot is missing the action is skipped; an empty list counts zero. |
| `fieldFilters` | object[], at least 1 item | no | — | Filters on the table's queryable fields, including ranges. ⚠️ A field the table never declared queryable is refused when the action runs. |
| `linkFilters` | object[], at least 1 item | no | — | Count only rows carrying a link of these relations. ⚠️ If an entry's slot is missing, the action is skipped. |
| `statuses` | string[], at least 1 item | no | — | Count only rows with these statuses; empty counts them all. |
| `tableKey` | string | yes | — | The table to count. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id; project-wide tables ignore it. ⚠️ A count can reveal how many records exist outside the user's own. |
| `vocabularyFilter` | object[], at least 1 item | no | — | Count only rows tagged with all of these vocabulary terms. ⚠️ A nested term slug matches under every parent unless `parentSlug` is set. |

### `fieldFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | A field the table declares queryable. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` | yes | — | The comparison; `in` takes a list, the others one value. |
| `value` | union | yes | — | The value to compare with, or the list for `in`. |

`value` — one of: `string`; `number`; `boolean`; `(string | number)[]`, at least 1 item.

### `linkFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `relationKey` | string | yes | — | The relation a row must have a link of, by key. |
| `peerRecordIdSlot` | string | no | — | The record at the other end; empty means any link. |

### `vocabularyFilter` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `vocabularyKey` | string | yes | — | The vocabulary, by key. |
| `slug` | string | yes | — | The term a row must carry, by slug. |
| `parentSlug` | string | no | — | The parent term's slug, to narrow a nested term to one branch. |

## Worked example

Counts every record matching its filters, so an action can answer a total without reading the rows.

#### Everything

No filters beyond the table and the owner, so this is the user's total for that table.

Reads `{ userId }` → emits `number` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "userIdSlot": "userInfo.userId",
  "tableKey": "item"
}
```

Input:

```
{ "userId": "ckpg_user_a" }
```

Output:

```
1284
```

#### Filtered by field

One declared field narrows the count. The value lives in that field's own column, so an index answers it.

Reads `{ userId }` → emits `number` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "userIdSlot": "userInfo.userId",
  "tableKey": "item",
  "fieldFilters": [
    {
      "field": "kind",
      "op": "eq",
      "value": "article"
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
417
```

#### Nothing matches

The filters exclude every row. `0` is a real answer, not an absence a later action must guard.

Reads `string` → emits `number` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "fieldFilterSlots": {
    "sourceId": "sourceId"
  }
}
```

Input:

```
"item_never_used"
```

Output:

```
0
```
