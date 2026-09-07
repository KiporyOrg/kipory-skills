# Reading and changing records from inside a flow

Everything in this skill's main page happens over HTTP, as the design plane. A flow does the same
work through handlers, and the two are not interchangeable: a route runs as **your key**, a handler
runs as **the run's principal**. That single difference explains most of what surprises people here.

## The handlers

| Handler                  | Does                                    | Effect class           |
| ------------------------ | --------------------------------------- | ---------------------- |
| `entity.create`          | writes a new record                     | record mutation        |
| `entity.update`          | changes fields on one                   | record mutation        |
| `entity.read`            | reads one by id                         | read                   |
| `entity.list`            | lists them                              | read                   |
| `entity.count`           | counts without reading                  | read                   |
| `entity.links`           | reads a record's edges, grouped by kind | read                   |
| `entity.link-assert`     | states an edge                          | idempotent side effect |
| `entity.link-retract`    | retracts one                            | idempotent side effect |
| `entity.delete`          | deletes by id                           | record mutation        |
| `entity.teardown`        | strips generated files and term links   | idempotent side effect |
| `entity.enqueue-process` | hands the record to its processing flow | side effect            |

`entity.create`, `entity.update` and `entity.enqueue-process` are covered where record creation is
taught, in `kipory-build`. The rest are below.

## Reading edges

`entity.links` returns one `RecordLink` per edge with the far end, the kind, the direction and any
declared properties. Three things about it are easy to get wrong:

- **`limit` defaults to 100** and applies across the whole read, after a deterministic ordering with
  the most recently valid first. A record with more edges than that returns a truncated view that
  looks complete.
- **An edge is retracted by expiry, not deletion.** History stays readable, and `includeExpired`
  brings it back. Default is off, so a retracted edge is simply absent rather than marked.
- **A hidden kind is never returned**, whatever you pass in `kind`. If an edge you know exists never
  appears, check whether the project marks its kind hidden before hunting for the write.

An empty or non-text slot gives an empty list rather than an error — so an unwired slot and a record
with no links are indistinguishable at this step.

## Deleting, and the thing that is not deleting

`entity.delete` takes a **list** of ids; a single delete passes a one-element list. It returns true
when at least one record was removed, and **false when every id was already gone or belonged to
someone else** — the same answer for "already deleted" and "not yours". It never tells you which.

`entity.teardown` is the one people reach for when they mean "reprocess this". It strips a record's
**generated** files and its term assignments — `targets` defaults to both — and leaves the record
itself alone. Files that were submitted rather than generated are not touched. It reports one count
per target actually run, and a target you did not ask for is **absent** rather than zero, so a
reader can tell "not asked" from "nothing to delete".

The reprocess sequence is teardown then enqueue:

```
entity.teardown  → clear what the last run produced
entity.enqueue-process → run the processing flow again
```

Skipping the teardown is how a record ends up with two generations of derived data at once.

## The scoping that catches people

**These handlers run as the record's owner, not as your key.** `entity.delete` is scoped to the
signed-in user; `entity.teardown` takes its owner from the run, so a record belonging to anyone else
matches nothing. A step that appears to do nothing is usually operating on records it cannot see,
and it reports that as an ordinary empty result rather than a permission error.

This is the opposite of the HTTP routes in this skill, which run with your key's grant and reach
every record in the project. A flow tested with your own records and shipped to end users will
behave differently for each of them, and correctly so.

## When to use which

| You want to                                      | Use                                                      |
| ------------------------------------------------ | -------------------------------------------------------- |
| explore, migrate or audit as an operator         | the HTTP routes on this skill's main page                |
| act on records as part of the product's own work | these handlers, inside a flow                            |
| back-fill a field across existing records        | a flow over the type — the handlers, on a schedule       |
| delete a record type that refuses to go          | the routes, to clear the records first (`kipory-evolve`) |
