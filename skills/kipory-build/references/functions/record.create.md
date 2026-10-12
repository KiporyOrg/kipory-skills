<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.create` — Create a record

Create a new record of the type you choose.

A per-user type's record belongs to the run's user, a project type's to the project.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A record owned by a user is keyed on the run's idempotency key, so a new run creates a second one unless its caller sends the same Idempotency-Key; a record the project owns converges.
- **I/O:** `submission object` → `RecordCreate`
- **Also found as:** save, save to table, store, add a row, insert, new record, spreadsheet
- **Reads:** The new record's fields, from the slot `dataSlot` names, and optional uploaded file ids to attach. Fields off the type's shape fail the action, each named, as through the API. _(shape hint: `submission object`)_
- **Emits:** A `RecordCreate` — the new record's id and what it was created as. A retry under the same key reuses that id rather than minting another.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dataSlot` | string | yes | — | The slot holding the new record's data object. |
| `fileIdsSlot` | string | no | — | The slot holding uploaded file ids to attach to the new record. ⚠️ Each file must be the owner's, fully uploaded, and attached nowhere else. |
| `tableKey` | string | yes | — | The table to create a record in. |
| `userIdSlot` | string | no | — | The slot holding the person a run for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

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
