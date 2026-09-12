<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.count` — Count records

Count matching records without reading them — the answer a paged list cannot give.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `user id` → `number`
- **Reads:** The user id, from the slot `userIdSlot` names. Everything else is settings on the step. There is no page size and no cursor. _(shape hint: `user id`)_
- **Emits:** A number: how many records match every filter. An empty result is `0`, which is a real answer rather than a missing one.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `createdAfter` | string | no | — | Count only rows created at or after this moment. A fixed date, written in ISO-8601. ⚠️ This bounds when the row was stored, not what your data means by a date. For that, put a range in `fieldFilters` on a declared timestamp. |
| `createdBefore` | string | no | — | Optional inclusive upper bound on `createdAt` (ISO-8601). Same caveat as `createdAfter`: this is the row's insert time. |
| `edgeFilters` | object[] | no | — | Count only rows that carry a link. Each entry names a link kind and, optionally, a slot naming the record on the other end. ⚠️ This is the only filter that reads the link graph rather than the row itself. An entry whose slot does not resolve is dropped whole, rather than widening to every link of that kind. |
| `facetFilter` | object[] | no | — | Count only rows tagged with these terms. Each entry names a facet and a term; a row must match all of them. ⚠️ In a facet with nested terms, a term slug alone matches that slug under every parent. Add `parentSlug` to narrow it to one branch. |
| `fieldFilterSlots` | object | no | — | A map of queryable field to the slot carrying its value. One value matches exactly, a list matches any of them. ⚠️ A slot that does not resolve drops its filter rather than matching nothing. Ranges have no live form; put those in `fieldFilters`. |
| `fieldFilters` | object[] | no | — | Filters on fields the record type declared queryable. These are what make a count cheap, and the only ones that support ranges. ⚠️ A field the record type never declared queryable is refused when the step runs. Counting over a declared one reads its index and never touches the record. |
| `recordType` | string | yes | — | The record type to count. Required: a declared field belongs to one type, so a filter has nothing to resolve against without it. |
| `statuses` | string[] | no | — | Count only rows with one of these statuses. Leave it empty to count them all. A catalog total usually keeps just `READY`. |
| `userIdSlot` | string | no | `"userInfo.userId"` | The slot holding the signed-in user's id. Only record types owned by a user are filtered by it; a project-wide type ignores it. ⚠️ A count discloses how many records exist outside the caller's scope without naming one, so nothing downstream looks wrong. The owner pin matters here at least as much as on a list. |

## Worked example

Counts every record matching its filters, so a step can answer a total without reading the rows.

Reads: read userId. Emits: number.

#### the whole catalog

No filters beyond the type and the owner, so this is the user's total for that record type.

Reads `{ userId }` → emits `number` · 1 in → 1 out

Input:

```
{ "userId": "ckpg_user_a" }
```

Output:

```
1284
```

#### narrowed by a declared field

One declared field narrows the count. The value lives in that field's own column, so an index answers it.

Reads `{ userId }` → emits `number` · 1 in → 1 out

Input:

```
{ "userId": "ckpg_user_a" }
```

Output:

```
417
```

#### nothing matches

The filters exclude every row. `0` is a real answer, not an absence a later step must guard.

Reads `string` → emits `number` · 1 in → 1 out

Input:

```
"item_never_used"
```

Output:

```
0
```
