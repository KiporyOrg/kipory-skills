<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.create` — Create a record

Create a new record of the type you choose.

With a processing flow, the record is not queued: follow with Queue for processing, or the stuck-records check fails it.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A record owned by a user is keyed on the run's idempotency key, so a new run creates a second one unless its caller sends the same Idempotency-Key; a record the project owns converges.
- **I/O:** `submission object` → `RecordCreate`
- **Also found as:** save, save to table, store, add a row, insert, new record, spreadsheet
- **Reads:** The new record's fields (`fields` one by one, or the object `data` names) and optional file ids. Fields off the type's shape fail the action, each named. _(shape hint: `submission object`)_
- **Emits:** A `RecordCreate` — the new record's id and what it was created as. A retry under the same key reuses that id rather than minting another.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `data` | union | no | — | The new record's data object, whole; or use `fields`. |
| `fields` | object | no | — | The new record's fields, each a slot path, fixed value or expression. |
| `fileIds` | union | no | — | The uploaded file ids to attach to the new record. ⚠️ Each file must be the record owner's or the project's, fully uploaded, and attached nowhere else. |
| `onKeyTaken` | `refuse` \| `skip` | no | — | What to do when another record already holds the natural key. ⚠️ With `skip`, a key another record holds writes nothing and answers that record; one run claiming a key twice fails. |
| `tableKey` | string | yes | — | The table to create a record in. |
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

Creates one record of a chosen type and hands back its id, so the next action can process or read it.

#### A new record

The record is created and its id comes back. A type with no processing flow is ready at once.

Reads `object` → emits `RecordCreate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "data": "submission"
}
```

Input:

```
{
  "title": "Costco receipt",
  "text": "Costco, $112.00, 15 June"
}
```

Output:

```
{
  "recordId": "ckwx0a1b2c3d",
  "tableKey": "item"
}
```

#### Sent twice

A retry under the same key reuses the id already minted, so nothing is duplicated.

Reads `object` → emits `RecordCreate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "data": "submission"
}
```

Input:

```
{
  "title": "Costco receipt",
  "text": "Costco, $112.00, 15 June"
}
```

Output:

```
{
  "recordId": "ckwx0a1b2c3d",
  "tableKey": "item"
}
```
