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
POST /v1/flow-checkpoints/{id}/restore            { version, validateOnly: true } — what a restore would do
POST /v1/flow-checkpoints/{id}/restore            { version } — roll back
```

`version` on a restore is the **flow's** `version` (from the flow row) — the flow the restore
overwrites. The checkpoint itself never changes. A flow edited since you read it answers 409
`VERSION_CONFLICT`, on the dry run as on the restore; re-read the flow and try again. A restore
moves the flow's `version`, and its answer names the new one in `touched`
(`[{ resource: "flows", id, version }]`) — replace the version you hold before your next flow
PATCH or restore rather than re-reading.

Capture takes the flow (`flowId`), a `label`, and an optional description. Listing is scoped by
`?flowId=`; an individual checkpoint is addressed by its own id, and every checkpoint names the flow
it was taken from as `flowId`. A restore warning names the step by `skillKey`. An
automatic checkpoint's `label` reads `auto: …` followed by why it was taken.

Renaming a checkpoint or changing its note is `PATCH /v1/flow-checkpoints/{id}` with `label` and/or
`description` — and the checkpoint's `version`, which every read carries. A stale one answers 409
`VERSION_CONFLICT`. What it captured never changes. Capture, rename and delete each take
`validateOnly` too (on a delete, `?validateOnly=true`) and answer whether they would go through,
writing nothing.

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
facet's (which also carries `confirm` and `assignedTerms`); anything else in the query is refused.

**Reads never return the payload.** List and metadata give you counts, whether it was automatic,
who made it and when — but not the snapshot itself. If you want to know what a restore would do,
that is what the restore's dry run is for.

**Who made it is the account as it is now, not as it was.** `createdByName`, `createdByEmail` and
`createdByImage` are read through the author's account on every request — enough to draw the person —
so a renamed author shows their new name on every old checkpoint. The checkpoint a restore takes of
what it replaces is authored by whoever restored. All three are null where nobody is recorded — a
checkpoint the platform took before a write to one of its own flows, one taken with a token, and one
whose author's account is gone — and those cases look the same. They are also null whenever YOU call
with an API key: a machine credential is shown no roster of humans, so a key reads `createdById` and
nothing that names the person.

## Ask before you restore — the dry run

`POST /v1/flow-checkpoints/{id}/restore` with `validateOnly: true` **rehearses the restore and rolls
it back**, so its verdict is the restore's own: `ok: false` with the refusal in `diagnostics` when the
captured signature would break what is bound to the flow (409 on the real call), or when a captured
step is refused by today's rules (422 on the real call) — run settings held to today's handlers, a
pinned model its call cannot use. **Any error in `diagnostics` means the restore fails and changes
nothing**, so read the verdict before you call restore. A stored payload the platform cannot parse
is still a plain 422. A platform flow's restore is rehearsed the same way, with `leavesBehind` and
`consequences` empty: they judge one project's flows, and the projects bound to a platform flow are
held by the signature guards instead.

Whatever the verdict, `derived.restore` says what the restore would do. `currentSteps` and
`restoredSteps` are the flow's steps now and the checkpoint's — pair them by `key`, never by
position: they are ordered separately and need not be the same length. `warnings` names references
that no longer resolve — a model that is gone, a handler no longer registered, an invoke target that
has since been deleted, or a pinned model its step can no longer use (`model-unsuited`, which the
restore also refuses). `signatureChanges` says whether a restore would rewrite the flow's inputs,
outputs and output binding — it puts the captured signature back, so a flow whose only change was
its outputs is NOT a no-op restore.

⚠️ **A restore puts back how each step runs — if the checkpoint recorded it.** A step's per-call
deadline (`timeoutMs`) and its run settings — `tries`, `tryDelayMs`, `onFailure`,
`reuseResultsForMinutes` — are captured with the step and written back by a restore. A checkpoint
taken before the format recorded them does not carry them, and restoring one resets those steps: no
per-step deadline, the handler's own tries and reuse period, and a failure that fails the run. The
dry run tells the two apart: a `currentSteps` entry always carries the live values, and on the
`restoredSteps` entry with the same `key` an ABSENT field means "this record does not say", which for a
restore is the same as "it will be reset". Read the pair before restoring an older checkpoint of a flow
whose steps were tuned by hand.

Those warnings and the verdict are the early signal for the way a restore usually fails: **the captured graph
is validated against the project as it is now, not as it was.** A snapshot taken when a handler
existed will not restore after that handler goes away, a step pinned to a model its call cannot be
sent to — an embedding model on a step that generates text — is refused until the pin changes, and a
step's run settings are held to its handler's rules today. `ok: true` and empty warnings mean a
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
label, rather than trusting the automatic one to still be there.

## What will bite you

- **A restore rewrites; it does not merge.** Anything added to the flow after the snapshot is
  gone. That is the point, but it means a checkpoint taken before a long session throws away the
  good changes along with the bad.
- **A restore matches steps by key.** A step the flow still holds is rewritten in place and keeps
  its id; if the restore changes it, its `version` moves FORWARD (never back to the captured
  number), so a `version` you held is stale: re-read the flow's steps after a restore. The flow's
  own `version` moves too — a restore rewrites the flow's signature and binding. A step deleted since comes back with a NEW
  id, and one added since is deleted. History keyed by step id —
  `GET /v1/projects/{nodeId}/ai-calls?skillId=`, the `bySkill` rows of
  `GET /v1/runs/{runId}/spend`, a trace's `skillId` — splits only for a step that came back with a
  new id; key your own history by step key and it never splits. A project-document apply matches
  steps the same way — and by `id` first, where the document states one.
- **Restore and a project-document apply share the same step-set path**, so a restore accepts
  entries a single skill create would have rejected — it validates the resulting graph rather than
  the incoming format.
- **A flow whose project is off the design surface is a 404**, and so are its checkpoints.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — what is being snapshotted.
- Project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the other write that sets a flow's steps as a whole.
- Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) — how to find out you needed the rollback.
