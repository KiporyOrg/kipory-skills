<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.update` — Update a record

Change an existing record's data.

Merges or replaces the data; can also clear derived output, set a status and attach files.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record slot + data/derived patches` → `boolean`
- **Also found as:** edit record, change record, change a row, modify, set field
- **Reads:** The record id (`recordId`) plus the changes you give: new fields (`fields` one by one, or `data` whole), derived output, and file ids. _(shape hint: `record slot + data/derived patches`)_
- **Emits:** A bare boolean — `true` iff a row was patched, `false` when the record was absent, foreign, or failed the status precondition (mirrors `record.delete`).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `clearDerived` | boolean | no | `false` | Empty the record's derived output in the same write. ⚠️ Cannot be combined with `derived`. |
| `data` | union | no | — | The new fields as one object, or use `fields`; empty changes nothing. ⚠️ Nothing is written when it is not an object, or when a field it writes breaks its table's type. |
| `derived` | union | no | — | The new derived output; empty leaves it alone. ⚠️ Cannot be combined with `clearDerived` — one writes derived output and the other empties it. |
| `failIfPreconditionUnmet` | boolean | no | `false` | Fail with a conflict when nothing matched, instead of reporting no change. |
| `fields` | object | no | — | The fields to write, each a slot path, fixed value or expression. |
| `fileIds` | union | no | — | The file ids to attach to the record. ⚠️ A file must belong to the record's owner or to the project, and be attached nowhere else. |
| `ifChangedMeanwhile` | `start-again` \| `apply` | no | — | When another run changed the record since this run read it. ⚠️ On a conflict `start-again` writes nothing, while `apply` (merge only) overwrites what another run wrote to these fields meanwhile. |
| `mode` | `merge` \| `replace` | no | `"merge"` | `merge` (default) merges over existing values; `replace` overwrites them. ⚠️ In `merge`, a key set to `null` is removed from the record. |
| `recordId` | union | yes | — | The id of the record to patch. ⚠️ On a per-user type, another user's id changes nothing and reports no error. |
| `requireStatus` | `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` | no | — | Only write when the record currently has this status. |
| `setStatus` | `PENDING` \| `PROCESSING` \| `READY` \| `FAILED` | no | — | Set the record to this status, clearing any earlier error. ⚠️ Setting it to pending does not start processing on its own — a separate `record.enqueue-process` action does that. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `data` — one of

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

### `derived` — one of

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

### `fileIds` — one of

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

### `recordId` — one of

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

Patches an existing record in place and says whether a row changed.

#### Record updated

The named fields are merged into the record and the action reports that a row changed.

Reads `object` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordId": "patch.recordId",
  "data": "patch.data",
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
  "recordId": "patch.recordId",
  "data": "patch.data",
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
