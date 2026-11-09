# Reading and changing records from inside a flow

<!-- field-ok: userInfo — an ambient value the platform fills, not a request field -->

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
| `record.merge`           | folds a duplicate into the record that stays                         | record mutation        |
| `record.teardown`        | strips generated files and term assignments                          | idempotent side effect |
| `record.enqueue-process` | hands the record to its processing flow                              | idempotent side effect |

`record.create`, `record.update` and `record.enqueue-process` are covered where record creation
is taught, in `kipory-build`, and `record.query`'s clauses on its function page there. Reading every
page and bringing linked records, which the three reads share, comes first below; the rest follow; every field of each is on its function page in `kipory-build`.

## Reading every page, and the linked records

`record.list`, and a `record.query` with no `semantic` clause over one table, answer ONE page
(`limit`, 100 at most) and a `nextCursor` when more remain. Two settings make a read whole:

- **`pages: { "max": N }` reads every page in this one step** — the records in the read's order,
  each once, as one `RecordPage`. When records remain after `N` pages, or the next page would pass
  the size of one value (about 2,400 short records; a record counts whole), the step fails
  `RECORD_READ_HAS_MORE`: the run's failure names it as `reason` (and `error` does, in a `catch`), and a
  flow endpoint answers `422 VALIDATION_FAILED` with it as `details.reason`. `"onMore": "stop"`
  instead answers what it read and a `nextCursor` to continue from — it covers the size bound as well as `max`, except when the first page alone passes that size, which fails whatever `onMore` says: lower `limit` or name fewer `fields`. `max` is at most the project's
  read-pages limit (50 unless Kipory set another); above it the save is refused
  `READ_PAGES_OVER_LIMIT`.
- **With `cursor`, `pages` starts at that cursor**, not at the first page: `max` pages from there, and `"onMore": "stop"` answers the `nextCursor` to continue from.
- **Which page a `cursor` asks for.** Only a path read ends a list: when the path's root is there
  and holds nothing at the path, the step answers an empty page and reads nothing. That is the
  previous page having run with no `nextCursor`, or an input or `repeat` var given as `{}`. It reads
  page one when the root is absent (a first run, an optional input not given, a step that gave
  nothing), when `with` has no `cursor`, or when the cursor is `""`, a fixed value, an expression, or
  a `default` (the default is the value given). A cursor no page answered is
  refused `422 VALIDATION_FAILED`.
- **A first page plus N passes is `max: N + 1`.** A `repeat` that read a page and then up to 9
  more on `nextCursor` is `pages: { max: 10 }` on one step, and the `repeat` goes.
- **A one-page read on purpose is `"pages": { "max": 1, "onMore": "stop" }`.** A read without
  `pages` whose `nextCursor` no step reads and no flow output passes on carries the warning
  `RECORD_LIST_CURSOR_UNREAD` at save and on health (`details.stepKey` names the read): the flow is treating the first page as every
  record. It never blocks the save; either setting above silences it, whatever the read's order.
- Saving refuses `pages` with `max` above 1 where a record could move across the cursor while the
  pages are read: ordered by update time, by a field that is not a date with a `filter` use, or by
  a date processing fills (`READ_PAGES_SORT_NOT_DATE`); `max: 1` reads no second page, so it takes
  any order; and on a `record.query` with a phrase, a phrase on a `peer`, or
  `tableKeys`.
- Saving refuses a greater-than or less-than on a text field in `record.list` and `record.count`
  (`RECORD_FILTER_TEXT_RANGE`): a range on text compares only values up to 2,000 bytes, and only
  `record.query` says how many it left out (`longTextSkipped` on its clause row). `eq` and `in`
  find a text value of any length in all three.
- `record.query` also takes `contains` on a text field (text anywhere, ignoring case, at least 3
  characters with a word in them, not signs alone), an `any` clause (2 to 8 field, term, link or stream alternatives, one level deep, an
  OR), and an `order` by a number, true/false or text field with a `filter` use. A text order needs
  the type's `maxLength` of at most 500 on the field (`QUERY_ORDER_TEXT_UNBOUNDED`), and reading
  every page (`pages` above 1) still needs a date or `created` order.

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
a list of `b` inside fits a 200-id read when `a × (1 + b)` is 100 or less. With `pages`, the budget is per page: the
check counts one page (the read's `limit`), and each page brings up to 20,000 linked records of its own — `pages` does
not multiply it. A `record.read` fed ids from a value counts
as 200 unless the value is bounded: ids read off a `record.list`'s `records` with a fixed `limit` count as
`limit` × `pages.max`, and a writer whose output type is a list with `maxItems` counts as that (a step returning more fails at run, naming it). One more level
of `linked` is allowed, not two.

**One relation, two tables at the other end: name `peerTable`.** A relation paired `event → event` and
`story → event` reaches both from an event, read `incoming`. The save refuses the linked read until it
names one (`LINKED_PEER_TABLE_UNCLEAR`), and with `"peerTable": "event"` it brings events only, its `limit`
counting them alone, however many stories point at the same event. For both, write two linked reads:

```json
"linked": {
  "events": { "relation": "under", "direction": "incoming", "peerTable": "event", "limit": 50 },
  "stories": { "relation": "under", "direction": "incoming", "peerTable": "story", "limit": 20, "onMore": "stop" }
}
```

**Read a linked read only on the calls that need it: `when`.** A setting like `limit` — a value
read by path, a fixed `true`/`false`, or `{ "expr": "tab = 'category'" }` — on a linked read at either level. Only
`true` reads it; `false` or nothing leaves it out, so no record carries its name
under `linked` (absent, not `[]`; `linked` itself stays, empty when nothing is left); any other value fails the step (`LINKED_WHEN_NOT_BOOLEAN`). A
value only `when` reads never holds the read back. The relations pack (`kipory-model`'s
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
narrowing a list does: `fieldFilters` (each entry's `value` a path, a `{literal}` or an
`{expr}`), `vocabularyFilter`, `linkFilters`, `statuses`, `createdAfter` and `createdBefore`.

- **A field filter needs a `filter` use on the field.** One without it fails the step when it
  runs, not at save.
- **A range (`lt`, `lte`, `gt`, `gte`) needs a number or a date field.** A text field compares by
  `eq` only. A field typed `format: date` or `date-time` is a date field: a range on it compares
  instants. Give a fixed value as a full ISO time with its offset, `2026-11-09T00:00:00Z`; a
  date-only `2026-11-09` is refused at save (`ARGUMENT_TYPE_MISMATCH`), with that day's start in UTC
  as the fix, which is how a record's date-only value is stored. A value a path or an expression
  gives must be a full ISO time too (`runInfo.now`, never `$substring(runInfo.now, 0, 10)`): a
  date-only one fails the run.
- **A filter value that may be missing is refused at save** (`STEP_INPUT_MAY_BE_ABSENT`, with the
  `if has` fix); one missing at run fails the step (`FILTER_VALUE_ABSENT`). It never counts
  without that filter. An empty list counts `0`.
- **A per-user table is counted for one user** — `userId`, default `userInfo.userId` — and the
  step fails on a run with none (a schedule has no `userInfo`). A project-scoped table ignores it.

## Stating and retracting links

`record.link-assert` takes `sourceRecordId` — the record the link runs from — and
`targetRecordId`, the one it runs to, and `kind` (the relation's key) and `actor`, a label of your choosing
recorded on every link the step writes. It answers `{ outcome, reason }`: `stated` when the link
stands (written, revived or already there), `refused` otherwise, with `reason` one of
`UNRESOLVABLE`, `UNDECLARED_PAIR` (the two records' tables are not a pair the relation admits) or
`SELF_LINK` (both ends are the same record).

- **Only a `curated` relation works.** A relation a field or a join record produces is refused
  `UNRESOLVABLE` exactly as an unknown relation is, and so is an end the run cannot read — one
  answer for those causes, so a refusal cannot probe what exists.
- **A refusal does not fail the step.** Branch on `outcome`, or a flow that linked nothing looks
  the same as one that linked everything.
- **`record.link-retract` takes the same pair and the same `actor`.** It
  reaches only links stated under that label — never one a person or a key stated over the API —
  and answers `retracted` or `not-found`; finding nothing is an ordinary answer.

## Appending to a stream

`record.append` adds events to a record's stream field — a field the table's `uses` gives a
`stream` use. Config: `tableKey`, `field`, `recordId`, and `event` holding one event
object or a list. It answers `appended` when at least one event was new and `unchanged` when
every one already existed, so a retry converges.

- **Each event carries its time** under the property the stream declares. One event without it,
  or with a value that is not a datetime, fails the step and nothing of the batch is written.
- **An event's identity is the record, the time and its id.** Left to the step, the id is derived
  from the event's content; with your own ids in `eventId`, the same id under another time is
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

An empty or non-text `recordId` gives an empty list rather than an error — so a bad id and a record
with no links look the same at this step.

## Counting links across everyone

`record.link-counts` answers "how many people follow this": for up to 200 records (one id or a list,
from `recordIds`) it returns `{ recordId, count }` — how many current links of one relation reach
each, from every owner's records. Numbers only: no far end, no field, no owner. It works in a run
that acts for nobody (a schedule, a trigger), and stays right after any delete, account erasure
included, because links go with their records. The records you ask about must be ones the run may
write (its person's own or pool records); any other id is left out rather than counted as 0.
A relation backed by a join table stores no links, so it is refused (`RELATION_NOT_COUNTABLE`), as
is an unknown one (`RELATION_NOT_FOUND`).

## Deleting, and the thing that is not deleting

`record.delete` takes a list of ids, or one id alone. It reaches the
run's user's own records and the project's pool records — the pool alone on a run with no user —
and never another user's. It returns true when at least one record was removed, and **false when
every id was already gone or out of reach** — the same answer for "already deleted" and "not
yours". It never tells you which.

Every writer here takes an optional `userId`, the two link functions included. In a run that
acts for nobody — a schedule, a trigger — it names the person the write is for: a create is owned
by them; an update, delete, append or teardown reaches their records and the pool; a link may join
their records and the pool. The person
must be an active member of the project (`PERSON_NOT_IN_PROJECT` otherwise, with one answer
whatever the reason). In a run that acts for a person it may name only that person
(`PERSON_NOT_THE_RUNS`). Without it, each writer behaves as above.

A delete also follows each reference's delete rule (`onTargetDelete` on the `link` use): records
naming a deleted one are deleted too (`delete`), lose the reference (`clear`), or stop the delete
(`refuse`) — then the step fails with `RECORD_REFERENCED` and nothing is deleted. Over HTTP,
`DELETE /v1/records/{id}?validateOnly=true` says what a delete would do first.

`record.merge` folds a duplicate (`merge`) into the record that stays (`keep`), both of one table and
owner: every record naming the duplicate then names `keep`, and the duplicate becomes a redirect —
lists and queries leave it out, and reading it by id answers `keep`. Over HTTP it is
`POST /v1/records/{id}/merge` with `{ into }`. Merging the same pair again is harmless; there is no
unmerge.

`record.teardown` is the one people reach for when they mean "reprocess this". It strips a record's
**generated** files and its term assignments — `targets` defaults to both — and leaves the record
itself alone. Files that were submitted rather than generated are not touched. It reports one count
per target actually run, and a target you did not ask for is **absent** rather than zero, so a
reader can tell "not asked" from "nothing to delete".

## Running a record's processing flow again

`record.enqueue-process` and its three `replay` modes — what the run keeps, and who it reaches: `in-flow-reprocess.md`.

## The scoping that catches people

**These functions run as the run's user, not as your key.** `record.delete` reaches that user's own
records and the project's pool — only the pool when no one is signed in; `record.teardown` reaches
only the user's own and fails outright with no user. A record belonging to another user matches
nothing. A step that appears to do nothing is usually operating on records it cannot see,
and it reports that as an ordinary empty result rather than a permission error.

**A `userId` names someone else only in a run that acts for nobody** — a schedule, a trigger, a
key's call. In a run that acts for a signed-in user, a read or a write whose `userId` names anyone
but that user fails `PERSON_NOT_THE_RUNS`, so a value the caller sends cannot open another user's
records.

<!-- field-ok: ownerId — a member of a flow's record row read through a share (423-record-sharing-gaps), not a wire field -->

**On a table that shares, a person reaches more.** A read answers their own records and every
record shared with them or a team of theirs, each carrying `access` (what they may do) and
`ownerId`; an update, an append or a link reaches a record shared at `write` or above, a delete at
`delete` or above, and a lower level answers 403 by itself. `record.list` takes `whose: "own"` or
`"shared"` (newest share first). `record.grant`, `record.revoke` and `record.grants` share, unshare
and list the shares (`references/sharing-records.md`).

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
