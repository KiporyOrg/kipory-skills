<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.create` — Create a record

Create a new record of the type you choose.

- **Group:** entities · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A record owned by a user is keyed on the run's idempotency key, so a new run creates a second one unless its caller sends the same Idempotency-Key; a record the project owns converges.
- **I/O:** `submission object` → `RecordCreate`
- **Reads:** The new record's fields, from the slot `dataSlot` names, and optionally a list of uploaded file ids to attach in the same write. _(shape hint: `submission object`)_
- **Emits:** A `RecordCreate` — the new record's id and what it was created as. A retry under the same key reuses that id rather than minting another.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataSlot` | string | yes | — | Slot PATH (e.g. `submission`) that resolves to the new record's submitted `data` object. A non-object resolves to an empty `{}`. |
| `fileIdsSlot` | string | no | — | The slot holding uploaded file ids to attach to the new record. ⚠️ Each file must belong to the record's owner (the run's user, or the project — a key's uploads are project files), be fully uploaded, and be attached nowhere else, or the create fails. |
| `recordType` | string | yes | — | The record type to create. Must be a type defined in this project. |

## Worked example

Creates one record of a chosen type and hands back its id, so the next step can process or read it.

Reads: the new record's fields. Emits: RecordCreate.

#### A new record

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

#### Sent twice

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
