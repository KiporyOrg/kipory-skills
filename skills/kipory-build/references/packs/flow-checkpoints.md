<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

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

**Who made it is the account as it is now, not as it was.** `createdByName`, `createdByEmail` and
`createdByImage` are read through the author's account on every request — enough to draw the person —
so a renamed author shows their new name on every old checkpoint. The checkpoint a restore takes of
what it replaces is authored by whoever restored. All three are null where nobody is recorded — a
checkpoint the platform took before a write to one of its own flows, one taken with a token, and one
whose author's account is gone — and those cases look the same. They are also null whenever YOU call
with an API key: a machine credential is shown no roster of humans, so a key reads `createdById` and
nothing that names the person.

## Preview before you restore

`restore-preview` is read-only, and it never refuses on what it finds — only on a stored payload it
cannot parse (422). It returns the current skills, the snapshot's skills, and a `warnings` list naming
references that no longer resolve — a model that is gone, a handler no longer registered, an invoke
target that has since been deleted, or a pinned model its step can no longer use (`model-unsuited`).
Pair the two skill lists by `name`, never by position: they are ordered separately and need not be the
same length.

It also answers what the skill lists cannot. `signatureChanges` says whether a restore would rewrite the
flow's inputs, outputs and output binding — it puts the captured signature back, so a flow whose only
change was its outputs is NOT a no-op restore. `refusals` names every step the restore would refuse that the preview can see —
captured run settings held to today's handlers, and a pinned model its call cannot use (also listed as
a `model-unsuited` warning); **any entry means the restore fails with a 422 and changes nothing**, so
read it before you call restore.

⚠️ **A restore puts back how each step runs — if the checkpoint recorded it.** A step's per-call
deadline (`timeoutMs`) and its run settings — `tries`, `tryDelayMs`, `onFailure`,
`reuseResultsForMinutes` — are captured with the step and written back by a restore. A checkpoint
taken before the format recorded them does not carry them, and restoring one resets those steps: no
per-step deadline, the handler's own tries and reuse period, and a failure that fails the run. The
preview tells the two apart: a `currentSkills` entry always carries the live values, and on the
`payloadSkills` entry with the same `name` an ABSENT key means "this record does not say", which for a
restore is the same as "it will be reset". Read the pair before restoring an older checkpoint of a flow
whose steps were tuned by hand.

Those warnings and refusals are the early signal for the one way a restore fails: **the captured graph
is validated against the project as it is now, not as it was.** A snapshot taken when a handler
existed will not restore after that handler goes away, a step pinned to a model its call cannot be
sent to — an embedding model on a step that generates text — is refused until the pin changes, and a
step's run settings are held to its handler's rules today. Empty warnings and empty refusals mean a
clean restore.

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
