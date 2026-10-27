<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.delete` — Delete records

Delete one or more records.

Deletes the user's own and the project's records, never another user's. Deleting twice is harmless.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record id list` → `boolean`
- **Also found as:** remove records, erase, delete rows
- **Reads:** A list of record ids, from `ids`. A single delete passes a one-element list. _(shape hint: `record id list`)_
- **Emits:** True when at least one record was removed or accepted for deletion, false when every id was already gone or belonged to another user.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `ids` | union | yes | — | The list of record ids to delete. ⚠️ At most 200 ids; a longer list fails before anything is deleted. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `ids` — one of

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

Deletes records by id and says whether anything went.

#### Someone else's record

One id belongs to another user, so two records go and the third is untouched.

Reads `string[]` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "ids": "ids"
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
  "ids": "ids"
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
