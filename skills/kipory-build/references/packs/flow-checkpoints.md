<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 423f5af968c4 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Flow checkpoints

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

A snapshot of a flow's whole shape, taken by value: every skill in order, the typed signature, and
the output binding. Restoring one rewrites the flow back to exactly that state, atomically.

It snapshots the _shape_, not the _history_ — no records, no runs. Restoring does not undo work a
flow did; it undoes what the flow **is**.

## When you need it — and when you don't

Take one before any edit you are not certain of: replacing a skill set, rewriting a signature,
re-doing a binding. It is the rollback primitive, so reach for it as a habit rather than as a
reaction.

You do not need one for a change you can trivially reverse by hand, and you should not reach for
it to undo a _run_. If the problem is bad data rather than a bad flow, this is the wrong tool.

## The sequence

```
POST /v1/flow-checkpoints                         capture, before the risky edit
  … make the change …
GET  /v1/flow-checkpoints/{id}/restore-preview    see what a restore would change
POST /v1/flow-checkpoints/{id}/restore            roll back (no body)
```

Capture takes the flow, a name, and an optional description. Listing is scoped by `flow`; an
individual checkpoint is addressed by its own id.

**Reads never return the payload.** List and metadata give you counts, whether it was automatic,
who made it and when — but not the snapshot itself. If you want to know what a restore would do,
that is what the preview is for.

## Preview before you restore

`restore-preview` is read-only and never refuses. It returns the current skills, the snapshot's
skills, and a `warnings` list naming references that no longer resolve — a model that is gone, a
handler no longer registered, an invoke target that has since been deleted.

⚠️ **`timeoutMs` is the one field a restore always clears, and the preview now shows that.** A step's
per-call deadline is a persisted, operator-set column, and the checkpoint FORMAT has never carried one
— so a restored step comes back with no per-step deadline and falls to the per-task default. That was
already true; what changed is that you can SEE it: `currentSkills[i].timeoutMs` carries the live
value, `payloadSkills[i].timeoutMs` is `null` because the snapshot does not record one. A `null` on
the payload side means "this record does not say", which for a restore is the same as "it will be
cleared". Read the pair before restoring a flow whose steps were tuned by hand.

Those warnings are the early signal for the one way a restore fails: **the captured graph is
validated against the project as it is now, not as it was.** A snapshot taken when a handler
existed will not restore after that handler goes away. Empty warnings mean a clean restore.

## What the platform guarantees

**Restore is all-or-nothing.** In a single transaction it captures the pre-restore state, swaps
the entire skill set, reinstates the captured signature and binding, and validates the resulting
graph. A blocking problem rolls the whole thing back — there is no half-restored flow.

**A restore is itself reversible**, because the state you are leaving is auto-captured on the way
out, and the response hands you that checkpoint's id.

⚠️ **Automatic checkpoints are capped at ten per flow**, oldest pruned first. Manual ones are
never pruned automatically. So the "a restore is always reversible" guarantee holds for your last
ten restores and no further — if a particular state matters, capture it _manually_ and give it a
name, rather than trusting the automatic one to still be there.

## What will bite you

- **A restore rewrites; it does not merge.** Anything added to the flow after the snapshot is
  gone. That is the point, but it means a checkpoint taken before a long session throws away the
  good changes along with the bad.
- **Restore and the atomic skill-replace share the same path**, so a restore accepts entries a
  single skill create would have rejected — it validates the resulting graph rather than the
  incoming format.
- **A flow whose project is off the design surface is a 404**, and so are its checkpoints.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — what is being snapshotted, and the atomic replace that
  restore uses.
- Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) — how to find out you needed the rollback.
