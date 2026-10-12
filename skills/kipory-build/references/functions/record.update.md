<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.update` — Update a record

Change an existing record's data.

Merges or replaces the data; can also clear derived output, set a status and attach files.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record slot + data/derived patches` → `boolean`
- **Also found as:** edit record, change record, change a row, modify, set field
- **Reads:** The record id, from the slot `recordIdSlot` names, plus whichever patch slots you wire: the new data, the new derived output, and file ids to attach. _(shape hint: `record slot + data/derived patches`)_
- **Emits:** A bare boolean — `true` iff a row was patched, `false` when the record was absent, foreign, or failed the status precondition (mirrors `record.delete`).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clearDerived` | boolean | no | `false` | Empty the record's derived output in the same write. ⚠️ Cannot be combined with `derivedSlot`. |
| `dataSlot` | string | no | — | The slot holding the new fields; empty leaves the data alone. ⚠️ If it holds something other than an object, nothing is written. |
| `derivedSlot` | string | no | — | The slot holding new derived output; empty leaves it alone. ⚠️ Cannot be combined with `clearDerived` — one writes derived output and the other empties it. |
| `failIfPreconditionUnmet` | boolean | no | `false` | Fail with a conflict when nothing matched, instead of reporting no change. |
| `fileIdsSlot` | string | no | — | The slot holding file ids to attach to the record. ⚠️ A file must belong to the record's owner and be attached nowhere else. |
| `mode` | `merge` \| `replace` | no | `"merge"` | `merge` (default) merges over existing values; `replace` overwrites them. ⚠️ In `merge`, a key set to `null` is removed from the record. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to patch. ⚠️ On a per-user type, another user's id changes nothing and reports no error. |
| `requireStatus` | `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` | no | — | Only write when the record currently has this status. |
| `setStatus` | `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` | no | — | Set the record to this status, clearing any earlier error. ⚠️ Setting it to pending does not start processing on its own — a separate `record.enqueue-process` action does that. |
| `userIdSlot` | string | no | — | The slot holding the person a run for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

## Worked example

Patches an existing record in place and says whether a row changed.

#### Record updated

The named fields are merged into the record and the action reports that a row changed.

Reads `object` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordIdSlot": "patch.recordId",
  "dataSlot": "patch.data",
  "mode": "merge"
}
```

Input:

```
{
  "recordId": "ckwx0a1b2c3d",
  "data": { "comment": "reimbursed" }
}
```

Output:

```
true
```

#### Nothing changed

The id belongs to someone else, or the required status did not hold. Nothing changed, and no error.

Reads `object` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordIdSlot": "patch.recordId",
  "dataSlot": "patch.data",
  "mode": "merge"
}
```

Input:

```
{
  "recordId": "ckwx_someone_else",
  "data": { "comment": "reimbursed" }
}
```

Output:

```
false
```
