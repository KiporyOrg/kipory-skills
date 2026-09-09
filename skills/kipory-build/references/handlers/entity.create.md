<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.create` — Create a record

Create a record of a configured entity, owned by the current user.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `record-mutation`
- **I/O:** `submission object` → `RecordCreate`
- **Reads:** The new record's fields, from the slot `dataSlot` names, and optionally a list of uploaded file ids to attach in the same write. _(shape hint: `submission object`)_
- **Emits:** A `RecordCreate` — the new record's id and what it was created as. A retry under the same key reuses that id rather than minting another.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataSlot` | string | yes | — | Slot PATH (e.g. `submission`) that resolves to the new record's submitted `data` object. A non-object resolves to an empty `{}`. |
| `fileIdsSlot` | string | no | — | The slot holding uploaded file ids to attach to the new record. ⚠️ Each file has to belong to the same user, be fully uploaded, and not already be attached elsewhere. Anything else fails the create rather than skipping the file. |
| `recordType` | string | yes | — | The record type to create. Must be a type defined in this project. |

## Worked example

Creates one record of a chosen type and hands back its id, so the next step can process or read it.

Reads: the new record's fields. Emits: RecordCreate.

#### a new record

The record is created and its id comes back. A type with no processing flow is ready at once.

Reads `object` → emits `RecordCreate` · 1 in → 1 out

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
  "recordType": "item"
}
```

#### the same request twice

A retry under the same key reuses the id already minted, so nothing is duplicated.

Reads `object` → emits `RecordCreate` · 1 in → 1 out

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
  "recordType": "item"
}
```
