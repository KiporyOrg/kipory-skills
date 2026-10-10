<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.create` — Create a record

Create a new record of the type you choose.

Creates a record of one of the project's types. On a per-user type the record belongs to the run's user (a run with no user is refused); on a project type, to the project. With a processing flow it stays pending until an `record.enqueue-process` action.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A record owned by a user is keyed on the run's idempotency key, so a new run creates a second one unless its caller sends the same Idempotency-Key; a record the project owns converges.
- **I/O:** `submission object` → `RecordCreate`
- **Reads:** The new record's fields, from the slot `dataSlot` names, and optional uploaded file ids to attach. Fields off the type's shape fail the action, each named, as through the API. _(shape hint: `submission object`)_
- **Emits:** A `RecordCreate` — the new record's id and what it was created as. A retry under the same key reuses that id rather than minting another.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataSlot` | string | yes | — | Slot PATH (e.g. `submission`) that resolves to the new record's submitted `data` object. A non-object resolves to an empty `{}`. |
| `fileIdsSlot` | string | no | — | The slot holding uploaded file ids to attach to the new record. ⚠️ Each file must belong to the record's owner (the run's user, or the project — a key's uploads are project files), be fully uploaded, and be attached nowhere else, or the create fails. |
| `tableKey` | string | yes | — | The table to create a record in. Must be one defined in this project. |

## Worked example

Creates one record of a chosen type and hands back its id, so the next action can process or read it.

#### A new record

The record is created and its id comes back. A type with no processing flow is ready at once.

Reads `object` → emits `RecordCreate` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "item",
  "dataSlot": "submission"
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
  "dataSlot": "submission"
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
