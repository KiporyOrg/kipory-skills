<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.count` — Count records

Count the records that match, without reading them.

Counts the records of one type that match its filters; the database does the counting. Takes the same filters as `record.list` and none of its paging. Use it when an action needs a total rather than the rows.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `user id` → `number`
- **Reads:** The user id, from the slot `userIdSlot` names. Everything else is settings on the action. There is no page size and no cursor. _(shape hint: `user id`)_
- **Emits:** A number: how many records match every filter. An empty result is `0`, which is a real answer rather than a missing one.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `createdAfter` | string | no | — | Count only rows created at or after this moment. A fixed date, written in ISO-8601. ⚠️ This bounds when the row was stored, not what your data means by a date. For that, put a range in `fieldFilters` on a declared timestamp. |
| `createdBefore` | string | no | — | Optional inclusive upper bound on `createdAt` (ISO-8601). Same caveat as `createdAfter`: this is the row's insert time. |
| `fieldFilterSlots` | object | no | — | A map of queryable field to the slot carrying its value. One value matches exactly, a list matches any of them. ⚠️ If any slot is missing the action is skipped, never run without that filter; an empty list counts zero. Ranges belong in `fieldFilters`. |
| `fieldFilters` | object[], at least 1 item | no | — | Filters on fields the table declared queryable. These are what make a count cheap, and the only ones that support ranges. ⚠️ A field the table never declared queryable is refused when the action runs. Counting over a declared one reads its index and never touches the record. |
| `linkFilters` | object[], at least 1 item | no | — | Count only rows that carry a link. Each entry names a relation and, optionally, a slot naming the record on the other end. ⚠️ The only filter that reads the link graph, not the row. If an entry's slot is missing the action is skipped, never widened to every link of that relation. |
| `statuses` | string[], at least 1 item | no | — | Count only rows with one of these statuses. Leave it empty to count them all. A catalog total usually keeps just `READY`. |
| `tableKey` | string | yes | — | The table to count. Required: a declared field belongs to one table, so a filter has nothing to resolve against without it. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Only tables owned by a user are filtered by it; a project-wide table ignores it. ⚠️ A count discloses how many records exist outside the caller's scope without naming one, so nothing downstream looks wrong. The owner pin matters here at least as much as on a list. |
| `vocabularyFilter` | object[], at least 1 item | no | — | Count only rows tagged with all of these vocabulary–term pairs. The pairs are fixed in config, never read from a slot. ⚠️ In a vocabulary with nested terms, a term slug alone matches that slug under every parent. Add `parentSlug` to narrow it to one branch. |

### `fieldFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | A field the table declares queryable. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` | yes | — | The comparison. `in` takes a list; every other one takes one value. |
| `value` | union | yes | — | The value to compare with, or the list for `in`. |

`value` — one of: `string`; `number`; `boolean`; `(string | number)[]`, at least 1 item.

### `linkFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | string | yes | — | The relation a row must have a link of, by key. |
| `peerRecordIdSlot` | string | no | — | The slot holding the id of the record at the other end. Leave it out to keep rows with any link of the relation. |

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
