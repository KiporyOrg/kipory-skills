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
POST /v1/eval-suites         create — bind the flow (or the dataset)
POST /v1/eval-cases          inputs, expected, labels, assertions
POST /v1/eval-suites/{id}/run   establishes or extends the baseline
GET  /v1/eval-suites/{id}/trend across runs — the only cross-run read there is
```

## What will bite you

- **Both cost money.** A run is real execution against real providers. An eval suite over a large
  case set is the most expensive thing in this skill — size it deliberately.
- **An eval run is single-flight per suite** and refused while one is in flight. Serialise; do not
  fire a second and hope.
- **The trend read is the only cross-run comparison there is.** Reading individual runs and
  differencing them yourself is doing worse what the trend already does.
- **Write the assertions before the change, not after.** Assertions written to describe what a flow
  currently does will agree with the bug. Pin the behaviour you _want_ while you still remember why.
- **Do not skip this because the project is small.** The assertions are the only part of a design
  that survives a later rewrite.

## Before a risky edit

Capture a checkpoint (`kipory.build`). Tests tell you something broke; a checkpoint is how you get
back. They are not substitutes for each other.

## Then

`kipory.operate` once it is worth running unattended.
