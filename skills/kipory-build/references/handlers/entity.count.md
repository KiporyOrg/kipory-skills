<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.count` — Count records

Count the records that match, without reading them.

Counts the records of one type that match its filters; the database does the counting. Takes the same filters as `entity.list` and none of its paging. Use it when a step needs a total rather than the rows.

- **Group:** entities · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `user id` → `number`
- **Reads:** The user id, from the slot `userIdSlot` names. Everything else is settings on the step. There is no page size and no cursor. _(shape hint: `user id`)_
- **Emits:** A number: how many records match every filter. An empty result is `0`, which is a real answer rather than a missing one.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `createdAfter` | string | no | — | Count only rows created at or after this moment. A fixed date, written in ISO-8601. ⚠️ This bounds when the row was stored, not what your data means by a date. For that, put a range in `fieldFilters` on a declared timestamp. |
| `createdBefore` | string | no | — | Optional inclusive upper bound on `createdAt` (ISO-8601). Same caveat as `createdAfter`: this is the row's insert time. |
| `edgeFilters` | object[], at least 1 item | no | — | Count only rows that carry a link. Each entry names a link kind and, optionally, a slot naming the record on the other end. ⚠️ The only filter that reads the link graph, not the row. If an entry's slot is missing the step is skipped, never widened to every link of that kind. |
| `facetFilter` | object[], at least 1 item | no | — | Count only rows tagged with all of these facet–term pairs. The pairs are fixed in config, never read from a slot. ⚠️ In a facet with nested terms, a term slug alone matches that slug under every parent. Add `parentSlug` to narrow it to one branch. |
| `fieldFilterSlots` | object | no | — | A map of queryable field to the slot carrying its value. One value matches exactly, a list matches any of them. ⚠️ If any slot is missing the step is skipped, never run without that filter; an empty list counts zero. Ranges belong in `fieldFilters`. |
| `fieldFilters` | object[], at least 1 item | no | — | Filters on fields the record type declared queryable. These are what make a count cheap, and the only ones that support ranges. ⚠️ A field the record type never declared queryable is refused when the step runs. Counting over a declared one reads its index and never touches the record. |
| `recordType` | string | yes | — | The record type to count. Required: a declared field belongs to one type, so a filter has nothing to resolve against without it. |
| `statuses` | string[], at least 1 item | no | — | Count only rows with one of these statuses. Leave it empty to count them all. A catalog total usually keeps just `READY`. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Only record types owned by a user are filtered by it; a project-wide type ignores it. ⚠️ A count discloses how many records exist outside the caller's scope without naming one, so nothing downstream looks wrong. The owner pin matters here at least as much as on a list. |

### `edgeFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | string | yes | — | The relation kind a row must have a link of, by key. |
| `peerRecordIdSlot` | string | no | — | The slot holding the id of the record at the other end. Leave it out to keep rows with any link of the kind. |

### `facetFilter` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `facet` | string | yes | — | The facet, by key. |
| `slug` | string | yes | — | The term a row must carry, by slug. |
| `parentSlug` | string | no | — | The parent term's slug, to narrow a nested term to one branch. |

### `fieldFilters` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | A field the record type declares queryable. |
| `op` | `eq` \| `lt` \| `lte` \| `gt` \| `gte` \| `in` | yes | — | The comparison. `in` takes a list; every other one takes one value. |
| `value` | union | yes | — | The value to compare with, or the list for `in`. |

`value` — one of: `string`; `number`; `boolean`; `(string | number)[]`, at least 1 item.

## Worked example

Counts every record matching its filters, so a step can answer a total without reading the rows.

#### Everything

No filters beyond the type and the owner, so this is the user's total for that record type.

Reads `{ userId }` → emits `number` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "userIdSlot": "userInfo.userId",
  "recordType": "item"
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

Step settings (`handlerConfig`):

```json
{
  "userIdSlot": "userInfo.userId",
  "recordType": "item",
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

The filters exclude every row. `0` is a real answer, not an absence a later step must guard.

Reads `string` → emits `number` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "recordType": "item",
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
