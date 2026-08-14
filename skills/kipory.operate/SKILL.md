---
name: kipory.operate
description: Run a Kipory project unattended — schedules that fire flows on a clock, events that report progress and fan-out, and namespaced config that lets a flow be tuned without an edit. Use once a flow works and should run, report, or be adjustable without redeployment.
---

# Operate a Kipory project

Four capabilities that only matter once something works. Fetch the pack for the one you need:

|                                           |                                         |
| ----------------------------------------- | --------------------------------------- |
| `GET /v1/capability-packs/schedules`      | time-triggered runs and their history   |
| `GET /v1/capability-packs/events`         | progress and fan-out signals            |
| `GET /v1/capability-packs/project-config` | runtime tunables a flow reads           |
| `GET /v1/capability-packs/credits`        | what you have spent, and what stops you |

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
- **`runs` answers "did it fire", not "why was the answer wrong".** It gives you the occurrence and
  its outcome — fired, skipped, blocked. For a run that fired and produced the wrong thing, the
  flow's own trace is the surface with the per-skill detail, and a scheduled fire leaves one like
  any other run: `GET /v1/flows/{id}/traces`. ⚠️ Do not stop at the schedule's own error text — on
  an ordinary skill failure it is a fixed generic string by design. See `kipory.diagnose`.

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

## Spend

```
GET /v1/credits/balance   the wallet, your ceiling, and the window it is measured over
GET /v1/credits/events    your own charge ledger — filter, then page by cursor
```

⚠️ **Two independent gates refuse a call, and only one of them is `status`.** The wallet
(`creditsRemaining` against `softCapCredits`) is the obvious one. The other is your own ceiling —
`perUserSpendCap` with `perUserSpendConsumed` against it — which caps how much of that wallet
_this caller_ may use. A caller reads `status: "active"` on a healthy wallet and is still refused
by the ceiling, so a view rendering only `status` says everything is fine right up to a `402` it
cannot explain.

- **`perUserSpendCap: null` means no ceiling; `0` means block everything.** A falsy check turns the
  second into the first.
- **Read `perUserSpendWindowStart`, never recompute it.** It is the boundary the consumed figure
  was actually summed from, so the number you show and the number enforced cannot disagree. It is
  `null` exactly when the period is lifetime.
- **Both reads keep working while you are over cap** — deliberately exempt from the gate, because
  the one call an over-cap customer needs is the one that says so. A `402` elsewhere and a `200`
  here is expected.
- **The ledger is yours, not the tenant's.** Every bearer binds a user and the ledger scopes to it;
  a wider grant does not widen the answer.

**Prices are not here.** What things cost is a platform-operator surface an API key cannot read.
What you spent is this one.

## Then

`kipory.diagnose` when something running unattended does the wrong thing — the flow's trace answers
"what did each step actually emit on the run that misbehaved", which the schedule's own history
cannot.
