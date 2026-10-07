<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `entity.enqueue-process` — Queue for processing

Send an existing record back through its processing flow.

Puts an existing record back on the processing queue. It only triggers — it does not change the record's status or clear anything, so the flow has to do that first. Fails if the record type has no processing flow.

- **Group:** entities · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each call pushes a new processing job, so a new run processes the record again whenever it is pending by then, as it is when the flow resets its status before this step.
- **I/O:** `record id` → `boolean`
- **Reads:** The record id, from the slot `recordIdSlot` names. Everything else is settings on the step. _(shape hint: `record id`)_
- **Emits:** A bare boolean — `true` once the record's bound processing flow was queued; `false` when the record is absent / owned by another user (no-op).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `mode` | `full` \| `from-cache` | no | `"full"` | How much of the previous run to reuse. `full` re-runs every step; `from-cache` replays the ones that have not changed. ⚠️ Only use `from-cache` when the earlier derived state is still there — replaying a step whose output was torn down produces nothing. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to queue. ⚠️ Scoped to the signed-in user, so an id owned by anyone else queues nothing and reports no error. |
| `replay` | `resume` \| `rerun` \| `clean` | no | `"resume"` | What a re-run carries over. Every step runs again under each value; `clean` also strips what the last attempt produced. ⚠️ `resume` and `rerun` behave the same: a record run applies its writes at the end, so no finished step is skipped. `clean` deletes generated files, including ones from a step that is now switched off. |

## Worked example

Puts an existing record back on the processing queue. It only triggers; it changes nothing itself.

#### Queued

The record is pending and its type binds a flow, so it goes on the queue.

Reads `object` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

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
