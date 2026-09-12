<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.update` — Update a record

Patch an existing record's submitted data and/or derived output.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `record-mutation`
- **I/O:** `record slot + data/derived patches` → `boolean`
- **Reads:** The record id, from the slot `recordIdSlot` names, plus whichever patch slots you wire: the new data, the new derived output, and file ids to attach. _(shape hint: `record slot + data/derived patches`)_
- **Emits:** A bare boolean — `true` iff a row was patched, `false` when the record was absent, foreign, or failed the status precondition (mirrors `entity.delete`).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clearDerived` | boolean | no | `false` | Empty the record's derived output in the same write. Off by default. ⚠️ Used when the next run should regenerate derived output from scratch. Cannot be combined with `derivedSlot`. |
| `dataSlot` | string | no | — | The slot holding the new fields. Leave it unset to leave the record's data alone. ⚠️ When it is set but resolves to something that is not an object, the patch is empty and the write does nothing. |
| `derivedSlot` | string | no | — | The slot holding new derived output. Written under the same merge-or-replace mode as the data. Leave it unset to leave derived alone. ⚠️ Cannot be combined with `clearDerived` — one writes derived output and the other empties it. |
| `failIfPreconditionUnmet` | boolean | no | `false` | What happens when nothing matched. Off, the step reports that nothing changed; on, it fails with a conflict. |
| `fileIdsSlot` | string | no | — | The slot holding file ids to attach to the record in the same write. ⚠️ A file has to be owned by whoever owns the record and not already attached somewhere else. This is how an edited event brings its media along. |
| `mode` | `merge` \| `replace` | no | `"merge"` | `merge` (default) shallow-merges each provided patch over the record's existing column value; `replace` overwrites. Applies to BOTH `data` and `derived`. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to patch. ⚠️ The patch is scoped to the signed-in user, so an id owned by anyone else changes nothing and reports no error. |
| `requireStatus` | `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` | no | — | Only write when the record's current status is this one. Leave it unset to write to any record that is not being deleted. |
| `setStatus` | `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` | no | — | Flip the record to this processing status, clearing any earlier error. Leave it unset to leave the status alone. ⚠️ Setting it to pending does not start processing on its own — a separate `entity.enqueue-process` step does that. |

## Worked example

Patches an existing record in place and says whether a row changed.

Reads: the record id and the patch. Emits: changed?.

#### a patch lands

The named fields are merged into the record and the step reports that a row changed.

Reads `object` → emits `boolean` · 1 in → 1 out

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

#### nothing matched

The id belongs to someone else, or the required status did not hold. Nothing changed, and no error.

Reads `object` → emits `boolean` · 1 in → 1 out

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
