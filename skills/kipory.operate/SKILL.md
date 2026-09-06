---
name: kipory.operate
description: Run a Kipory project unattended — schedules that fire flows on a clock, events that report progress and fan-out, namespaced config that lets a flow be tuned without an edit, and the spend reads that say what it all cost and what will stop it. Use once a flow works and should run, report, or be adjustable without redeployment, or when a call came back 402.
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
- **`runs` answers "did it fire", and more than that.** It gives you the occurrence and its outcome
  — fired, skipped, blocked. ⚠️ Do not stop at the schedule's own error text: on an ordinary skill
  failure it is a fixed generic string by design. ⭐ **But the same occurrence carries a `failure`
  naming the `skillName` and phase that broke** — read that before going anywhere else. For the
  whole ordered run, take the occurrence's invocation id to `GET /v1/runs/{runId}/steps`: which
  steps ran and what happened to each, and unlike a trace it is never sampled. Reach for the flow's
  trace (`GET /v1/flows/{id}/traces`, `kipory.diagnose`) when you need the _values_ a step emitted,
  which is the one thing only a trace carries.

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

⚠️ **Seeded rows cannot be DELETED — but they can be edited.** A category or type the platform
installed refuses a delete with 409, and accepts a patch. So a built-in event's label, scope,
payload binding and status are all still changeable, and nothing stops you: if you did not mean to
reshape a platform-installed event, check what you are patching.

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

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn that it 401s an API key, never prescribed; the machine-caller read below is /v1/runs/{runId}/spend -->

```
GET /v1/credits/balance      the wallet, the ceiling if one binds you, and its window
GET /v1/runs/{runId}/spend   what one run cost — the read a machine caller has
```

⛔ **Read this before you build anything against spend: an API key is not a person, and half of
this surface answers only to a person.**

- ⛔ **`GET /v1/credits/events` answers `401` to an API key, always.** The ledger scopes to a user,
  and a key has none — the refusal comes from inside the handler, so nothing about the route's
  shape warns you. It serves session-token callers only, and then only that user's own charges. To
  account for key-driven spend, read `GET /v1/runs/{runId}/spend` per run, or the schedule
  occurrence's `creditCost`.
- ⛔ **The per-user ceiling does not bind a key either.** `perUserSpendCap` caps how much of the
  wallet one _person_ may spend, and it is inert for machine traffic. On a key-authenticated
  balance read it comes back `null` — which there means _there is no person to cap_, not "the
  project set no ceiling". For a key there is exactly one gate that can `402` you, and it is the
  wallet: `creditsRemaining` against `softCapCredits`, reported as `status`.
- **If you are building for your product's own end users, the ceiling is real and `status` is not
  enough.** A session caller reads `status: "active"` on a healthy wallet and is still refused by
  their own ceiling, so a view rendering only `status` says everything is fine right up to a `402`
  it cannot explain. There, `perUserSpendCap: null` means no ceiling and `0` means block
  everything — a falsy check turns the second into the first — and
  `perUserSpendWindowStart` should be read, never recomputed, so the number you show and the number
  enforced cannot disagree. It is `null` exactly when the period is lifetime.
- **The balance read keeps working while you are over cap** — deliberately exempt from the gate,
  because the one call an over-cap customer needs is the one that says so. A `402` elsewhere and a
  `200` here is expected.

**Prices are not here.** What things cost is a platform-operator surface an API key cannot read.
What you spent is this one.

## Then

`kipory.diagnose` when something running unattended does the wrong thing — the flow's trace answers
"what did each step actually emit on the run that misbehaved", which is the one question no other
surface answers. Start closer to home, though: the schedule's history names the failing step and
hands you the run id for the un-sampled step log, so reach for the trace when you need the values
rather than the sequence.
