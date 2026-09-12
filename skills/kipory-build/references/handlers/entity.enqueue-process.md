<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.enqueue-process` — Enqueue record processing

Queue an existing record for (re)processing by its bound flow.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **I/O:** `record id` → `boolean`
- **Reads:** The record id, from the slot `recordIdSlot` names. Everything else is settings on the step. _(shape hint: `record id`)_
- **Emits:** A bare boolean — `true` once the record's bound processing flow was queued; `false` when the record is absent / owned by another user (no-op).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `mode` | `full` \| `from-cache` | no | `"full"` | How much of the previous run to reuse. `full` re-runs every step; `from-cache` replays the ones that have not changed. ⚠️ Only use `from-cache` when the earlier derived state is still there — replaying a step whose output was torn down produces nothing. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to queue. ⚠️ Scoped to the signed-in user, so an id owned by anyone else queues nothing and reports no error. |
| `replay` | `resume` \| `rerun` \| `clean` | no | `"resume"` | What a re-run carries over. `resume` skips steps the last attempt finished, `rerun` runs them all again, and `clean` also strips what it produced. ⚠️ `resume` is the default and is wrong on a schedule — the second run finds nothing left to do. `clean` deletes generated files, including ones from a step that is now switched off. |

## Worked example

Puts an existing record back on the processing queue. It only triggers; it changes nothing itself.

Reads: the record id. Emits: queued?.

#### queued

The record is pending and its type binds a flow, so it goes on the queue.

Reads `object` → emits `boolean` · 1 in → 1 out

Input:

```
{ "recordId": "ckwx0a1b2c3d" }
```

Output:

```
true
```
