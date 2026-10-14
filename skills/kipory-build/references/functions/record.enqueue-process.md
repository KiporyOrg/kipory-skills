<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.enqueue-process` — Queue for processing

Send an existing record back through its processing flow.

It does not change the record's status, and fails if the table has no processing flow.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each call pushes a new processing job, so a new run processes the record again whenever it is pending by then, as it is when the flow resets its status before this action.
- **I/O:** `record id` → `boolean`
- **Also found as:** reprocess, process later, queue record
- **Reads:** The record id, from the slot `recordIdSlot` names. Everything else is settings on the action. _(shape hint: `record id`)_
- **Emits:** A bare boolean — `true` once the record's bound processing flow was queued; `false` when the record is absent / owned by another user (no-op).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `mode` | `full` \| `from-cache` | no | `"full"` | `full` re-runs every action; `from-cache` replays the unchanged ones. ⚠️ Use `from-cache` only when the earlier derived output still exists. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to queue. ⚠️ Scoped to the signed-in user, so an id owned by anyone else queues nothing and reports no error. |
| `replay` | `resume` \| `rerun` \| `clean` | no | `"resume"` | What a re-run carries over; `clean` replaces the last output on success. ⚠️ `clean` replaces output and generated files when the run succeeds, removing those of actions now switched off. |
| `userIdSlot` | string | no | — | The slot holding the person a run for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

## Worked example

Puts an existing record back on the processing queue. It only triggers; it changes nothing itself.

#### Queued

The record is pending and its type binds a flow, so it goes on the queue.

Reads `object` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordIdSlot": "record.recordId"
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
