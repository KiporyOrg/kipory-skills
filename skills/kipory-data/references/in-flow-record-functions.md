# Reading and changing records from inside a flow

Everything in this skill's main page happens over HTTP, as the design plane. A flow does the same
work through functions, and the two are not interchangeable: a route runs as **your key**, a function
runs as **the run's principal**. That single difference explains most of what surprises people here.

## The functions

| Function                 | Does                                                                 | Effect class           |
| ------------------------ | -------------------------------------------------------------------- | ---------------------- |
| `record.create`          | writes a new record                                                  | record mutation        |
| `record.update`          | changes fields on one                                                | record mutation        |
| `record.read`            | reads one by id                                                      | read                   |
| `record.list`            | lists them                                                           | read                   |
| `record.query`           | finds them by fields, terms, links or meaning in one question        | read                   |
| `record.count`           | counts without reading                                               | read                   |
| `record.links`           | reads a record's links, grouped by relation                          | read                   |
| `record.link-counts`     | counts the links of one relation reaching each record, from everyone | read                   |
| `record.link-assert`     | states a link                                                        | idempotent side effect |
| `record.link-retract`    | retracts one                                                         | idempotent side effect |
| `record.append`          | adds events to a record's stream field                               | record mutation        |
| `record.delete`          | deletes by id                                                        | record mutation        |
| `record.teardown`        | strips generated files and term assignments                          | idempotent side effect |
| `record.enqueue-process` | hands the record to its processing flow                              | idempotent side effect |

`record.create`, `record.update` and `record.enqueue-process` are covered where record creation
is taught, in `kipory-build`, and `record.query`'s clauses on its function page there. Reading every
page and bringing linked records, which the three reads share, comes first below; the rest follow; every field of each is on its function page in `kipory-build`.

## Reading every page, and the linked records

`record.list`, and a `record.query` with no `semantic` clause over one table, answer ONE page
(`limit`, 100 at most) and a `nextCursor` when more remain. Two settings make a read whole:

- **`pages: { "max": N }` reads every page in this one action** — the records in the read's order,
  each once, as one `RecordPage`. When records remain after `N` pages, or the next page would pass
  one slot (about 2,400 short records; a record counts whole), the action fails
  `RECORD_READ_HAS_MORE`. `"onMore": "stop"` instead answers what it read and a `nextCursor` to
  continue from — it covers the size bound as well as `max`. `max` is at most the project's
  read-pages limit (50 unless Kipory set another); above it the save is refused
  `READ_PAGES_OVER_LIMIT`.
- **A first page plus N passes is `max: N + 1`.** A flow that read a page and then looped up to 9
  more times on `nextCursor` is `"pages": { "max": 10 }` on the one action, and the loop goes.
- **A one-page read on purpose is `"pages": { "max": 1, "onMore": "stop" }`.** A read without
  `pages` whose `nextCursor` no action reads and no flow output passes on carries the warning
  `RECORD_LIST_CURSOR_UNREAD` at save and on health: the flow is treating the first page as every
  record. It never blocks the save; either setting above silences it.
- Saving refuses `pages` where a record could move across the cursor while the pages are read:
  ordered by update time, by a field that is not a date, or by a date processing fills
  (`READ_PAGES_SORT_NOT_DATE`); and on a `record.query` with a phrase, a phrase on a `peer`, or
  `tableKeys`.

`linked` brings each record's linked records with it — on `record.read`, `record.list` and
`record.query` alike:

```json
{
  "tableKey": "book",
  "limit": 50,
  "pages": { "max": 20 },
  "linked": {
    "author": { "relation": "written-by", "fields": ["name"] },
    "reviews": {
      "relation": "about",
      "direction": "incoming",
      "limit": 10,
      "onMore": "stop"
    }
  }
}
```

Each row carries `linked.author` (one record, no key when none: outgoing on a relation declared
many-to-one) and `linked.reviews` (a list, `[]` when none; `linkedMore.reviews: true` when a book had
more than ten). `limit` is per record — ten reviews for EACH book. One read brings at most 20,000
linked records over all its linked reads, checked at save: per linked read, the records it hangs off times its
`limit` (one each for a one-record linked read), summed over every linked read at both levels; a list of `a` with
a list of `b` inside fits a 200-id read when `a × (1 + b)` is 100 or less. Name `table` only when the relation reaches more
than one table. One more level of `linked` is allowed, not two. The relations pack (`kipory-model`'s
`references/packs/relations-and-links.md`, "Linked records in one read") has every rule.

Two things that follow from the run's principal:

- **A linked record is what a plain read of its table would answer in this run.** A schedule,
  trigger or key-started run that follows a link into a table whose records belong to people fails,
  as reading that table directly fails.
- **Records the run wrote itself** follow their field links on `record.read`: create a record, read
  it back with `linked`, and the record its field names is there. A link stated with
  `record.link-assert` in the same run is not followed until the run ends.

## Counting

`record.count` answers a number and reads no record. It takes a `tableKey` and the same
narrowing a list does: `fieldFilters` (the only form that takes a range), `fieldFilterSlots`,
`vocabularyFilter`, `linkFilters`, `statuses`, `createdAfter` and `createdBefore`.

- **A field filter needs a `filter` use on the field.** One without it fails the action when it
  runs, not at save.
- **A filter slot that is missing skips the action**; it never counts without that filter. An empty
  list counts `0`.
- **A per-user table is counted for one user** — `userIdSlot`, default `userInfo.userId` — and the
  action fails on a run with none. A project-scoped table ignores the slot.

## Stating and retracting links

`record.link-assert` reads two slots **by position** — the record the link runs from, then the one
it runs to — and takes `kind` (the relation's key) and `actor`, a label of your choosing
recorded on every link the action writes. It answers `{ outcome, reason }`: `stated` when the link
stands (written, revived or already there), `refused` otherwise, with `reason` one of
`UNRESOLVABLE`, `UNDECLARED_PAIR` (the two records' tables are not a pair the relation admits) or
`SELF_LINK` (both ends are the same record).

- **Only a `curated` relation works.** A relation a field or a join record produces is refused
  `UNRESOLVABLE` exactly as an unknown relation is, and so is an end the run cannot read — one
  answer for those causes, so a refusal cannot probe what exists.
- **A refusal does not fail the action.** Branch on `outcome`, or a flow that linked nothing looks
  the same as one that linked everything.
- **`record.link-retract` takes the same pair in the same order and the same `actor`.** It
  reaches only links stated under that label — never one a person or a key stated over the API —
  and answers `retracted` or `not-found`; finding nothing is an ordinary answer.

## Appending to a stream

`record.append` adds events to a record's stream field — a field the table's `uses` gives a
`stream` use. Config: `tableKey`, `field`, `recordIdSlot`, and `eventSlot` holding one event
object or a list. It answers `appended` when at least one event was new and `unchanged` when
every one already existed, so a retry converges.

- **Each event carries its time** under the property the stream declares. One event without it,
  or with a value that is not a datetime, fails the action and nothing of the batch is written.
- **An event's identity is the record, the time and its id.** Left to the action, the id is derived
  from the event's content; with your own ids in `eventIdSlot`, the same id under another time is
  a second event.
- **The record's `data` does not change.** Read the events back with
  `GET /v1/records/{id}/stream/{field}`, or ask about them with a `stream` clause of
  `record.query`.

## Reading links

`record.links` returns one `RecordLink` per link with the far end, the relation, the direction and
any declared properties. Three things about it are easy to get wrong:

- **`limit` defaults to 100** and applies across the whole read, after a deterministic ordering with
  the most recently valid first. A record with more links than that returns a truncated view that
  looks complete.
- **A link is retracted by expiry, not deletion.** History stays readable, and `includeExpired`
  brings it back. Default is off, so a retracted link is simply absent rather than marked.
- **A link whose far end this run may not read is left out**, not blanked — a user's run does not
  see links to another user's records. No relation can be hidden: every relation the project has is
  readable.

An empty or non-text slot gives an empty list rather than an error — so an unwired slot and a record
with no links are indistinguishable at this action.

## Counting links across everyone

`record.link-counts` answers "how many people follow this": for up to 200 records (one id or a list,
from `recordIdsSlot`) it returns `{ recordId, count }` — how many current links of one relation reach
each, from every owner's records. Numbers only: no far end, no field, no owner. It works in a run
that acts for nobody (a schedule, a trigger), and stays right after any delete, account erasure
included, because links go with their records. The records you ask about must be ones the run may
write (its person's own or pool records); any other id is left out rather than counted as 0.
A relation backed by a join table stores no links, so it is refused (`RELATION_NOT_COUNTABLE`), as
is an unknown one (`RELATION_NOT_FOUND`).

## Deleting, and the thing that is not deleting

`record.delete` takes a **list** of ids; a single delete passes a one-element list. It reaches the
run's user's own records and the project's pool records — the pool alone on a run with no user —
and never another user's. It returns true when at least one record was removed, and **false when
every id was already gone or out of reach** — the same answer for "already deleted" and "not
yours". It never tells you which.

Every writer here takes an optional `userIdSlot`, the two link functions included. In a run that
acts for nobody — a schedule, a trigger — it names the person the write is for: a create is owned
by them; an update, delete, append or teardown reaches their records and the pool; a link may join
their records and the pool. The person
must be an active member of the project (`PERSON_NOT_IN_PROJECT` otherwise, with one answer
whatever the reason). In a run that acts for a person it may name only that person
(`PERSON_NOT_THE_RUNS`). Without it, each writer behaves as above.

`record.teardown` is the one people reach for when they mean "reprocess this". It strips a record's
**generated** files and its term assignments — `targets` defaults to both — and leaves the record
itself alone. Files that were submitted rather than generated are not touched. It reports one count
per target actually run, and a target you did not ask for is **absent** rather than zero, so a
reader can tell "not asked" from "nothing to delete".

## Running a record's processing flow again

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

## The scoping that catches people

**These functions run as the run's user, not as your key.** `record.delete` reaches that user's own
records and the project's pool — only the pool when no one is signed in; `record.teardown` reaches
only the user's own and fails outright with no user. A record belonging to another user matches
nothing. An action that appears to do nothing is usually operating on records it cannot see,
and it reports that as an ordinary empty result rather than a permission error.

This is the opposite of the HTTP routes in this skill, which run with your key's grant and reach
every record in the project. A flow tested with your own records and shipped to end users will
behave differently for each of them, and correctly so.

## When to use which

| You want to                                      | Use                                                                                                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| explore, migrate or audit as an operator         | the HTTP routes on this skill's main page                                                             |
| act on records as part of the product's own work | these functions, inside a flow                                                                        |
| back-fill a field across existing records        | one `POST /v1/records/bulk` of `merge` items; a flow over the table when the value has to be computed |
| delete a table that refuses to go                | the routes, to clear the records first (`kipory-evolve`)                                              |
