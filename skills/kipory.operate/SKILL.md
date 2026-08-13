---
name: kipory.operate
description: Run a Kipory project unattended — schedules that fire flows on a clock, events that report progress and fan-out, and namespaced config that lets a flow be tuned without an edit. Use once a flow works and should run, report, or be adjustable without redeployment.
---

# Operate a Kipory project

Three capabilities that only matter once something works. Fetch the pack for the one you need:

|                                           |                                       |
| ----------------------------------------- | ------------------------------------- |
| `GET /v1/capability-packs/schedules`      | time-triggered runs and their history |
| `GET /v1/capability-packs/events`         | progress and fan-out signals          |
| `GET /v1/capability-packs/project-config` | runtime tunables a flow reads         |

## Schedules

```
POST /v1/schedules                    flow + inputs + cron + timezone
GET  /v1/schedules/{id}/runs?limit=N  what actually fired, and what happened
POST /v1/schedules/{id}/disable       stop it
POST /v1/schedules/{id}/enable        start it — recomputes the next run from now
```

Inputs are keyed by input slot. Optionally a start, an end, a maximum run count, and an overlap
policy of `skip` or `allow`.

- **The next-run time you are handed is computed by the same code the tick uses**, so it is a claim
  you can hold the platform to rather than an estimate.
- **Enable recomputes from now.** A schedule disabled across its window does not fire a backlog on
  re-enable.
- ⚠️ **Choose the overlap policy deliberately.** `allow` on a flow that takes longer than its
  interval will run copies of itself concurrently.
- **Run history is the diagnostic surface here.** For a schedule, `runs` is how you find out what
  happened — there is no general flow-run history to fall back on.

## Events

```
POST /v1/event-categories   the grouping
POST /v1/event-types        the event ← scoped by CATEGORY id, not by project
  … then add an emit node to the flow …
```

⚠️ **Event types are scoped by their category's id, not by the project** — the one addressing
surprise in this resource, and it fails looking like a missing project.

A type takes a default scope of `run`, `record`, `user` or `project`. A signal scoped to one run and
one on the bus are different things: pick by who needs to hear it. The payload shape is optional —
omit it and the event is a payload-less marker.

**Seeded rows are read-only.** Anything the platform seeded refuses edits and deletes.

## Project config

```
GET    /v1/project-config?project=…   every row carries overrides AND effective values
POST   /v1/project-config             upsert on (project, namespace)
DELETE /v1/project-config/{id}
```

The write is an **upsert on the natural key**, so "set the ranking config" is one idempotent call
rather than a create-or-update dance. Creating names the shape it binds; updating carries the
`version` you last read, and a stale one is refused — re-read and reconcile, never blind-retry.

**Reach for this instead of editing a flow** whenever the thing being changed is a threshold, a
cadence or a weight. A tunable in config is adjustable without touching a flow that has passing
tests against it.

## Then

Nothing yet for reading a flow's execution trace outside an eval run — if you need per-run
diagnostics, `kipory.prove`'s eval traces are currently the only drill-down.
