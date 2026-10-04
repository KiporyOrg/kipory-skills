# Reading and changing records from inside a flow

Everything in this skill's main page happens over HTTP, as the design plane. A flow does the same
work through handlers, and the two are not interchangeable: a route runs as **your key**, a handler
runs as **the run's principal**. That single difference explains most of what surprises people here.

## The handlers

| Handler                  | Does                                                          | Effect class           |
| ------------------------ | ------------------------------------------------------------- | ---------------------- |
| `entity.create`          | writes a new record                                           | record mutation        |
| `entity.update`          | changes fields on one                                         | record mutation        |
| `entity.read`            | reads one by id                                               | read                   |
| `entity.list`            | lists them                                                    | read                   |
| `entity.query`           | finds them by fields, terms, links or meaning in one question | read                   |
| `entity.count`           | counts without reading                                        | read                   |
| `entity.links`           | reads a record's edges, grouped by kind                       | read                   |
| `entity.link-assert`     | states an edge                                                | idempotent side effect |
| `entity.link-retract`    | retracts one                                                  | idempotent side effect |
| `entity.append`          | adds events to a record's stream field                        | record mutation        |
| `entity.delete`          | deletes by id                                                 | record mutation        |
| `entity.teardown`        | strips generated files and term links                         | idempotent side effect |
| `entity.enqueue-process` | hands the record to its processing flow                       | idempotent side effect |

`entity.create`, `entity.update` and `entity.enqueue-process` are covered where record creation
is taught, in `kipory-build`, and `entity.query`'s clauses on its handler page there. The rest are
below; every field of each is on its handler page in `kipory-build`.

## Counting

`entity.count` answers a number and reads no record. It takes a `recordType` and the same
narrowing a list does: `fieldFilters` (the only form that takes a range), `fieldFilterSlots`,
`facetFilter`, `edgeFilters`, `statuses`, `createdAfter` and `createdBefore`.

- **A field filter needs a `filter` use on the field.** One without it fails the step when it
  runs, not at save.
- **A filter slot that is missing skips the step**; it never counts without that filter. An empty
  list counts `0`.
- **A per-user type is counted for one user** — `userIdSlot`, default `userInfo.userId` — and the
  step fails on a run with none. A project-scoped type ignores the slot.

## Stating and retracting edges

`entity.link-assert` reads two slots **by position** — the record the edge runs from, then the one
it runs to — and takes `kind` (the relation kind's key) and `actor`, a label of your choosing
recorded on every edge the step writes. It answers `{ outcome, reason }`: `stated` when the edge
stands (written, revived or already there), `refused` otherwise, with `reason` one of
`UNRESOLVABLE`, `UNDECLARED_PAIR` (the two records' types are not a pair the kind admits) or
`SELF_EDGE` (both ends are the same record).

- **Only a `curated` kind works.** A kind a field or a join record produces is refused
  `UNRESOLVABLE` exactly as an unknown kind is, and so is an end the run cannot read — one answer
  for those causes, so a refusal cannot probe what exists.
- **A refusal does not fail the step.** Branch on `outcome`, or a flow that linked nothing looks
  the same as one that linked everything.
- **`entity.link-retract` takes the same pair in the same order and the same `actor`.** It
  reaches only edges stated under that label — never one a person or a key stated over the API —
  and answers `retracted` or `not-found`; finding nothing is an ordinary answer.

## Appending to a stream

`entity.append` adds events to a record's stream field — a field the type's `uses` gives a
`stream` use. Config: `recordType`, `field`, `recordIdSlot`, and `eventSlot` holding one event
object or a list. It answers `appended` when at least one event was new and `unchanged` when
every one already existed, so a retry converges.

- **Each event carries its time** under the property the stream declares. One event without it,
  or with a value that is not a datetime, fails the step and nothing of the batch is written.
- **An event's identity is the record, the time and its id.** Left to the step, the id is derived
  from the event's content; with your own ids in `eventIdSlot`, the same id under another time is
  a second event.
- **The record's `data` does not change.** Read the events back with
  `GET /v1/records/{id}/stream/{field}`, or ask about them with a `stream` clause of
  `entity.query`.

## Reading edges

`entity.links` returns one `RecordLink` per edge with the far end, the kind, the direction and any
declared properties. Three things about it are easy to get wrong:

- **`limit` defaults to 100** and applies across the whole read, after a deterministic ordering with
  the most recently valid first. A record with more edges than that returns a truncated view that
  looks complete.
- **An edge is retracted by expiry, not deletion.** History stays readable, and `includeExpired`
  brings it back. Default is off, so a retracted edge is simply absent rather than marked.
- **A link whose far end this run may not read is left out**, not blanked — a user's run does not
  see edges to another user's records. No kind can be hidden: every kind the project has is
  readable.

An empty or non-text slot gives an empty list rather than an error — so an unwired slot and a record
with no links are indistinguishable at this step.

## Deleting, and the thing that is not deleting

`entity.delete` takes a **list** of ids; a single delete passes a one-element list. It reaches the
run's user's own records and the project's pool records — the pool alone on a run with no user —
and never another user's. It returns true when at least one record was removed, and **false when
every id was already gone or out of reach** — the same answer for "already deleted" and "not
yours". It never tells you which.

`entity.teardown` is the one people reach for when they mean "reprocess this". It strips a record's
**generated** files and its term assignments — `targets` defaults to both — and leaves the record
itself alone. Files that were submitted rather than generated are not touched. It reports one count
per target actually run, and a target you did not ask for is **absent** rather than zero, so a
reader can tell "not asked" from "nothing to delete".

## Running a record's processing flow again

Two steps, for any record the run can reach — a pool record on a run with no user included:

```
entity.update (setStatus: PENDING, clearDerived: true) → make the record processable again
entity.enqueue-process (replay: clean)                 → queue the processing flow
```

The enqueue only queues: the worker processes a record that is `PENDING` and skips any other, so
without the status reset a `READY` record stays as it was. It answers `false`, with no error, for
an id the run cannot reach.

`replay` says what the new run keeps from the last one. Every mode runs every step again, against
the flow as it is now — a flow edited since the record last ran is not a reason for refusal.

| `replay`           | Generated files and term assignments  | The previous run's output                           | Use it for                                               |
| ------------------ | ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| `resume` (default) | kept                                  | kept: a slot this run does not emit keeps its value | retrying a record that failed part-way                   |
| `rerun`            | kept                                  | kept, the same way                                  | a poll that re-fetches on a schedule                     |
| `clean`            | stripped by the worker before the run | dropped                                             | reprocessing: the flow, the file or the data was changed |

`resume` and `rerun` behave the same on a record run; only `clean` differs.

- **Only `clean` is safe for a flow that classifies.** `term.upsert` adds assignments and never
  replaces one, so under `resume` or `rerun` a one-value facet that resolves to a different term
  fails the run when its writes apply, and a many-value facet keeps the old terms beside the new
  (`kipory-model`'s `references/classification-runtime.md`).
- **Only `clean` avoids two generations of derived data.** Under the other two a file the last run
  produced stays beside the one this run produces.
- **`mode`** is a separate setting: `full` (the default) runs every step for real; `from-cache`
  lets a step whose inputs and settings have not changed answer from its cached result.
- **The queued run is charged as the run that queued it is**, model calls included
  (`kipory-operate` has what a run costs and who pays).

`entity.teardown` does the stripping as a step of its own — but it is per-user end to end: it
**fails the step on a run with no signed-in user**, which is every run your key starts, and reaches
only that user's own records, never pool records. With `replay: clean` you do not need it.

Over HTTP, `POST /v1/records/{id}/reprocess` is the same clean run in one call, for any record
your key can see; this skill's main page has what it refuses and what it costs.

## The scoping that catches people

**These handlers run as the run's user, not as your key.** `entity.delete` reaches that user's own
records and the project's pool — only the pool when no one is signed in; `entity.teardown` reaches
only the user's own and fails outright with no user. A record belonging to another user matches
nothing. A step that appears to do nothing is usually operating on records it cannot see,
and it reports that as an ordinary empty result rather than a permission error.

This is the opposite of the HTTP routes in this skill, which run with your key's grant and reach
every record in the project. A flow tested with your own records and shipped to end users will
behave differently for each of them, and correctly so.

## When to use which

| You want to                                      | Use                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| explore, migrate or audit as an operator         | the HTTP routes on this skill's main page                                                            |
| act on records as part of the product's own work | these handlers, inside a flow                                                                        |
| back-fill a field across existing records        | one `POST /v1/records/bulk` of `merge` items; a flow over the type when the value has to be computed |
| delete a record type that refuses to go          | the routes, to clear the records first (`kipory-evolve`)                                             |
