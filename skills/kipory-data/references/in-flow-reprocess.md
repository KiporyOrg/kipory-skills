# Running a record's processing flow again, from inside a flow

Read this before a flow queues a record's processing with `record.enqueue-process`: what the run keeps under each of its three `replay` modes, and who it reaches.

One action, for any record the run can reach — a pool record on a run with no user included:

```
record.enqueue-process (replay: clean) → set the record pending and queue its processing flow
```

The enqueue sets a `READY` or `FAILED` record back to `PENDING` itself, in the calling run's
change set, so no `record.update` with `setStatus` is needed before it. It answers `false`, with no
error, for an id the run cannot reach and for a record being processed or deleted — a parent whose
own run is under way is not queued again, so a flow that must catch every change reads the answer
and tries the next time. A processing flow that queues a record whose own flow queues back is a
loop: each run processes, and is billed, again, until the action in the ninth record run of the
chain fails `RECORD_HANDOFF_DEPTH_EXCEEDED` rather than queue a tenth.

`replay` says what the new run keeps from the last one. Every mode runs every action again, against
the flow as it is now — a flow edited since the record last ran is not a reason for refusal.

| `replay`           | Generated files and term assignments                                    | The previous run's output                           | Use it for                                               |
| ------------------ | ----------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| `resume` (default) | kept                                                                    | kept: a slot this run does not emit keeps its value | retrying a record that failed part-way                   |
| `rerun`            | kept                                                                    | kept, the same way                                  | a poll that re-fetches on a schedule                     |
| `clean`            | terms removed before the run; files replaced only when the run succeeds | dropped                                             | reprocessing: the flow, the file or the data was changed |

`resume` and `rerun` behave the same on a record run; only `clean` differs. `clean` removes the
record's term assignments before the run, and a failed run does not bring them back. Its processed
fields and generated files are replaced only when the run succeeds, and the record is indexed again
then; a failed run keeps them. A successful run removes each generated file the record held before
it that the run did not attach again and its processed fields do not name, even when it made no new
one. A record that is not ready — failed, or waiting to run again — is taken out of search by the
index sweep, whatever its replay mode, until a run succeeds. A run that "succeeds" by writing a
failure note on the row is a success here: to keep the last file until a new one exists, use
`rerun`, which leaves the old file in place (beside the new one, unless the new one reuses its key).

**A failed or ready record needs no status reset.** `record.enqueue-process` on a record whose
processing failed or finished returns it to processing, with the replay mode the action states, as
part of the calling run's change set — so if the calling run fails, the record is left exactly as
it was. A pending record is queued as it stands. A record being processed or deleted is not
queued: the action answers `false`, so a flow can tell it apart from a record that was queued.

**To re-run a parent when its children change, declare `reprocessOn` on its table** instead of
queuing it from each child's flow: Kipory waits out a burst, runs a parent still being processed
once more after its run, and hands the run what joined, left or changed (`runInfo.reprocess`).
`kipory-build`'s `references/records-and-endpoints.md` §10 has the declaration.

**A flow that sends failed records back reads `processing`.** Every record read, and every record
a flow reads, carries `processing { attempts, lastFailureClass }`: how many times the record was
sent to processing, and the class of its last failure (`logic`, `definition`, `vendor`, `limit`,
`platform-fault`, `platform-account`, …; null if it never failed, and kept after a later success). Stop after a few
`attempts`, and leave alone a record whose `lastFailureClass` says its own data is at fault
(`logic`) — the same record fails the same way again. `processing` is a reserved field name: a
table cannot declare it.

- **Do not send back what the platform is already running again.** A processing run that ended on
  one of the platform's own failures (`platform-busy`, `platform-interrupted`, `platform-fault`,
  or `platform-account` from a throttled platform account) is started again by the platform, up
  to three attempts <!-- count: run-attempts -->, and the record stays `PENDING` meanwhile; only a run that failed for
  good leaves it failed. Waiting for a free worker is not a failure either. A run that failed
  because a platform account is out of credit or its key was refused (`platform-account`,
  `retryable: false`) is not started again: it fails at once, and sending it back before the
  account serves again fails it the same way.
- **A record's failed processing is reported to the project**, not to the flow that queued it: the
  first failure of a table as a `platform/run.failed` event and later ones in summaries, and the
  runs are listed on `GET /v1/failed-runs?project={nodeId}&subjectKind=table&subjectKey=<table key>`.
  The table's `health` reads `failing`; a table is never paused (`kipory-operate`'s `references/when-a-run-fails.md`).
- **The records a `platform` event's flow queues tell nobody.** A record queued by a run that a `platform` event
  started causes no `platform` event when its processing fails.

- **Only `clean` is safe for a flow that classifies.** `term.upsert` adds assignments and never
  replaces one, so under `resume` or `rerun` a one-value vocabulary that resolves to a different
  term fails the run when its writes apply, and a many-value vocabulary keeps the old terms beside
  the new (`kipory-model`'s `references/classification-runtime.md`).
- **Only `clean` avoids two generations of derived data.** Under the other two a file the last run
  produced stays beside the one this run produces.
- **`mode`** is a separate setting: `full` (the default) runs every action for real; `from-cache`
  lets an action whose inputs and settings have not changed answer from its cached result.
- **The queued run is charged as the run that queued it is**, model calls included
  (`kipory-operate` has what a run costs and who pays).

`record.teardown` does the stripping as an action of its own — but it is per-user end to end: it
**fails the action on a run with no signed-in user**, which is every run your key starts, and reaches
only that user's own records, never pool records. With `replay: clean` you do not need it.

Over HTTP, `POST /v1/records/{id}/reprocess` is the same clean run in one call, for any record
your key can see; this skill's main page has what it refuses and what it costs.
