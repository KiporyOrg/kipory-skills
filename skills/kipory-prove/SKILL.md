---
name: kipory-prove
description: Pin what "working" means for a Kipory flow and re-check it after every edit — stored test cases with pass/fail assertions for behaviour, eval suites with scorer flows when quality is a matter of degree, and the run-to-run comparison that says whether a change made things worse. Use after a flow works and before you change it again, when the user asks whether an edit broke something, or when they want a quality score rather than a pass or fail. Not for reading why one run misbehaved (that is diagnose).
license: MIT
---

# Prove a flow works

Two surfaces answering two different questions. **Does this still work?** — flow test cases. **Is this any good?** — eval suites. Reaching for the wrong one is the mistake this skill exists to prevent: a test case that asserts quality becomes a brittle compare somebody deletes; an eval suite used for pass/fail is an expensive way to run one assertion. The assertion vocabulary is **shared**, six kinds, so what you learn on one transfers.

## Before the first call

- Fetch `references/packs/flow-test-cases.md` and `references/packs/evals.md`.
- Both cost money to run: a run is real execution against real providers, and every run route is **ADMIN**. Size an eval suite deliberately.
- Write the assertions **before** the change, not after. Assertions written to describe what a flow currently does agree with the bug.

## The sequence

**Test cases — pass or fail.**

```
POST  /v1/flow-test-cases            { flow, name, inputs, assertions (1–50), enabled? }
GET   /v1/flow-test-cases?flow={flowId}
PATCH /v1/flow-test-cases/{id}       { version, … }  — inputs and assertions REPLACE wholesale
POST  /v1/flows/{id}/test            { testCaseIds?, includeDisabled? }  → 200 with every result
```

The test run answers with the results themselves: per case an outcome of `passed`, `failed`, `invalid` or `not-run`, each assertion's verdict and `actual`, the `missingRequiredOutput`, and the transcript. **`invalid` means the stored inputs no longer match the flow's slots — that staleness is the regression signal, not a setup error.** `not-run` means the wall budget expired. Every requested case appears; none is omitted.

**Evals — a matter of degree.**

```
POST /v1/eval-suites                 { project, subject (a flow), scorerFlowIds, … }
POST /v1/eval-cases                  { suite, inputs, expected, labels, assertions? (0–50) }
GET  /v1/eval-suites/{id}/readiness  what the configuration alone says will happen — read before the first run
POST /v1/eval-suites/{id}/run        202 { suiteId, queued: true } — ADMIN, 409 while one is in flight
GET  /v1/eval-suites/{id}/runs       poll for the row the worker writes
GET  /v1/eval-runs/{id}              one run, WITH its delta against the previous settled run
GET  /v1/eval-suites/{id}/trend      one suite's scores across runs
GET  /v1/eval-suites/trend?project=  every suite in the project
```

Scorers are **flows**, not a vocabulary: `scorerFlowIds` names them, and each scorer call is a billed model call, unlike a case's own assertions, which are free and deterministic. An eval case may carry no assertions at all and be graded by scorers alone.

## What will bite you

- **The run call does not return a run.** It answers 202 with `{ suiteId, queued }` and nothing else — no id, no results. Re-read the suite's runs until the worker's row appears. This is the one asymmetry with `POST /v1/flows/{id}/test`, which answers 200 with the results.
- **An eval run is single-flight per suite** and refused with 409 while one is in flight. Serialise.
- **Two cross-run questions, two reads.** "Where has this been going" is the trend. "Did this edit break it" is the run's own `delta` on `GET /v1/eval-runs/{id}`: which cases were comparable, which changed, which were added or removed, which metrics moved. The trend carries none of that. Do not fetch runs and difference them by hand.
- **`regressed: null` means no verdict was computed** — not `false`. A list rendering null as fine reports a suite nobody judged as one that passed. `worsenedMetrics: []` does not mean nothing regressed.
- **Readiness first.** `GET /v1/eval-suites/{id}/readiness` walks the subject flow's sub-flows and the record types it reads. A per-user record read with no acting user reads an empty corpus and reports success; the readiness report names it before you spend a run on it.
- **`version` is required on every patch**, and a patch to a test case or eval case replaces `inputs` and `assertions` wholesale.
- **Two outcome vocabularies for one subject.** A test-case result is `passed | failed | invalid | not-run`; an eval case's is `scored | errored | invalid | not-run | unknown`. `errored` is not a low score and `invalid` is not a failure.
- **There is no content-equality assertion**, deliberately. Shape and structure only; the `jsonata` kind is the escape hatch, validated at save time, and a non-boolean result fails rather than coercing truthy. It inherits the sandbox that bans `$now`, `$millis`, `$random`, `$shuffle`.
- **The project-wide trend is capped at 20 runs**, because it is multiplied by the suite count; the per-suite trend allows 100.
- **There is no datasets API.** A suite's `dataset` subject exists on the wire, but nothing creates or lists one; bind a flow.
- **Do not skip this because the project is small.** The assertions are the only part of a design that survives a later rewrite.

## Before a risky edit

Capture a checkpoint (`kipory-build`). Tests tell you something broke; a checkpoint is how you get back. They are not substitutes for each other.

## References

| File                                             | What it answers                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `references/assertions.md`                       | the six assertion kinds, their fields, and what each proves      |
| `references/packs/flow-test-cases.md`            | stored inputs and assertions replayed through the preview engine |
| `references/packs/evals.md`                      | suites, cases, scorers, runs and the delta                       |
| `references/api/flow-test-cases.md` · `evals.md` | every route's fields                                             |

## Then

`kipory-operate` once the flow is worth running unattended. `kipory-diagnose` when a case fails and you need to see what a step actually emitted — an eval run keeps its traces attached at `GET /v1/eval-runs/{id}/traces/{traceId}`.
