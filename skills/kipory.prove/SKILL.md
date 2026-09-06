---
name: kipory.prove
description: Pin what "working" means for a Kipory flow and re-check it after every edit — stored test cases with assertions for pass/fail behaviour, eval suites with scorers when quality is a matter of degree. Use after a flow works and before you change it again.
---

# Prove a Kipory flow works

Two surfaces answering two different questions. Reaching for the wrong one is the mistake this skill
exists to prevent.

| Question                  | Surface         | Fetch                                      |
| ------------------------- | --------------- | ------------------------------------------ |
| **Does this still work?** | flow test cases | `GET /v1/capability-packs/flow-test-cases` |
| **Is this any good?**     | eval suites     | `GET /v1/capability-packs/evals`           |

**Pass/fail → test cases. A matter of degree → evals.** A test case that tries to assert quality
becomes a brittle string compare somebody eventually deletes; an eval suite used for pass/fail is an
expensive way to run one assertion.

The assertion vocabulary is **shared** between them, so an assertion you learn on one transfers to
the other unchanged.

## The sequence

```
POST /v1/flow-test-cases     store an input bag + assertions, scoped to the flow
POST /v1/flows/{id}/test     run them — omit the body to run every enabled case
```

```
POST /v1/eval-suites            create — bind the flow (or the dataset)
POST /v1/eval-cases             inputs, expected, labels, assertions
POST /v1/eval-suites/{id}/run   202 {queued} — ADMIN only, 409 if one is in flight
GET  /v1/eval-suites/{id}/runs  poll for the row the worker writes
GET  /v1/eval-runs/{id}         one run, WITH its delta against the previous one
GET  /v1/eval-suites/{id}/trend one suite's scores across runs
GET  /v1/eval-suites/trend      every suite in the project, same shape
```

⚠️ **The run call does not return a run.** It answers `202` with `{ suiteId, queued: true }` and
nothing else — no id, no results — so there is nothing to poll on directly. Re-read the suite's
runs until the worker's row appears. This is the one asymmetry with `POST /v1/flows/{id}/test`,
which answers `200` with the results themselves.

## What will bite you

- **Both cost money.** A run is real execution against real providers. An eval suite over a large
  case set is the most expensive thing in this skill — size it deliberately.
- **An eval run is single-flight per suite** and refused while one is in flight. Serialise; do not
  fire a second and hope.
- **Two different cross-run questions, two different reads — do not use one for the other.** "Where
  has this been going" is the trend, one suite or the whole project. "Did this edit break it" is the
  run's own `delta`, on `GET /v1/eval-runs/{id}`: which cases were comparable, which changed, which
  were added or removed, and which metrics moved, against the previous settled run. The trend
  carries none of that. ⚠️ A run also carries a `regressed` verdict where **`null` means no verdict
  was computed** — a different answer from `false`, and a list that renders null as "fine" reports a
  suite nobody judged as a suite that passed. What you should not do is fetch runs and difference
  them by hand: that comparison already exists and knows which cases were even comparable.
- **Write the assertions before the change, not after.** Assertions written to describe what a flow
  currently does will agree with the bug. Pin the behaviour you _want_ while you still remember why.
- **Do not skip this because the project is small.** The assertions are the only part of a design
  that survives a later rewrite.

## Before a risky edit

Capture a checkpoint (`kipory.build`). Tests tell you something broke; a checkpoint is how you get
back. They are not substitutes for each other.

## Then

`kipory.operate` once it is worth running unattended.
