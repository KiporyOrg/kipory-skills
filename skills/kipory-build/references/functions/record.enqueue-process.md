<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.enqueue-process` — Queue for processing

Send an existing record back through its processing flow.

A ready or failed record is set pending and processed again. One being processed or deleted is not queued: false.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each call sets the record pending and pushes a new processing job, so every new run processes the record again.
- **I/O:** `record id` → `boolean`
- **Also found as:** reprocess, process later, queue record
- **Reads:** The record id, from `recordId`. Everything else is settings on the action. _(shape hint: `record id`)_
- **Emits:** A bare boolean — `true` once the record's processing flow was queued; `false` when the record is absent, another user's, being processed or being deleted.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `mode` | `full` \| `from-cache` | no | `"full"` | `full` re-runs every action; `from-cache` replays the unchanged ones. ⚠️ Use `from-cache` only when the earlier derived output still exists. |
| `recordId` | union | yes | — | The id of the record to queue. ⚠️ Scoped to the signed-in user, so an id owned by anyone else queues nothing and reports no error. |
| `replay` | `resume` \| `rerun` \| `clean` | no | `"resume"` | What a re-run carries over; `clean` replaces the last output on success. ⚠️ `clean` keeps files until the run succeeds, then removes earlier generated files it did not reattach or name. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

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

Puts an existing record back on the processing queue; a ready or failed record becomes pending again.

#### Queued

The record is ready and its type binds a flow, so it is set pending and goes on the queue.

Reads `object` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordId": "record.recordId"
}
```

Input:

```
{ "recordId": "ckwx0a1b2c3d" }
```

Output:

```
true
```
