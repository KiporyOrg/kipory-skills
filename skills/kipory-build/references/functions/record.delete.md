<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.delete` — Delete records

Delete one or more records.

Deletes records by id: the signed-in user's own and the project's pool records, only the pool when the run has no user, never another user's. A record still processing is marked and goes on its own; the rest go at once. Deleting twice is harmless.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record id list` → `boolean`
- **Reads:** A list of record ids, from the slot `idsSlot` names. A single delete passes a one-element list. _(shape hint: `record id list`)_
- **Emits:** True when at least one record was removed or accepted for deletion, false when every id was already gone or belonged to another user.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `idsSlot` | string | yes | — | The slot holding the list of record ids to delete. A single delete passes a one-element list. ⚠️ Reaches the user's own and the project's pool records, so another user's id deletes nothing. At most 200 ids; an oversize list fails before anything is touched. |

## Worked example

Deletes records by id and says whether anything went.

#### Someone else's record

One id belongs to another user, so two records go and the third is untouched.

Reads `string[]` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "idsSlot": "ids"
}
```

Input:

```
["ckwx_a_1", "ckwx_b_2", "ckwx_a_3"]
```

Output:

```
true
```

#### Already deleted

Every id was already deleted, so nothing happens and the action reports it plainly.

Reads `string[]` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "idsSlot": "ids"
}
```

Input:

```
["ckwx_a_1"]
```

Output:

```
false
```
