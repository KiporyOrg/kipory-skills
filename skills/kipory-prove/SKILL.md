---
name: kipory-prove
description: Pin what "working" means for a Kipory flow and re-check it after every edit — stored test cases with pass/fail assertions for behaviour, eval suites with scorer flows when quality is a matter of degree, and the run-to-run comparison that says whether a change made things worse. Use after a flow works and before you change it again, when the user asks whether an edit broke something, or when they want a quality score rather than a pass or fail. Not for reading why one run misbehaved (that is diagnose).
license: MIT
---

# Prove a flow works

Two surfaces answering two different questions. **Does this still work?** — flow test cases. **Is this any good?** — eval suites. Reaching for the wrong one is the mistake this skill exists to prevent: a test case that asserts quality becomes a brittle compare somebody deletes; an eval suite used for pass/fail is an expensive way to run one assertion. The assertion vocabulary is **shared**, six kinds, so what you learn on one transfers.

## Before the first call

- Fetch `references/packs/flow-test-cases.md` and `references/packs/evals.md`.
- Both cost money to run: a run is real execution against real providers, and every run route is **ADMIN** — except `POST /v1/eval-suites/{id}/run` with `validateOnly: true`, a free VIEWER dry run that queues nothing and answers how many cases the run would grade and what it would not measure. Size an eval suite deliberately.
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
POST /v1/eval-suites                 { project, name, flow, scorerFlowIds?, … }
POST /v1/eval-cases                  { suite, key (1–200, stable), inputs, expected?, labels?, assertions? (0–50) }
GET  /v1/eval-suites/{id}/readiness  what the configuration alone says will happen — read before the first run
POST /v1/eval-suites/{id}/run        202 { suiteId, queued: true, diagnostics } — ADMIN, 409 while one is in flight; validateOnly: true is a VIEWER dry run
GET  /v1/eval-suites/{id}/runs       poll for the row the worker writes
GET  /v1/eval-runs/{id}              one run, WITH its delta against the previous settled run
GET  /v1/eval-suites/{id}/trend      one suite's scores across runs
GET  /v1/eval-suites/trend?project=  every suite in the project
```

Scorers are **flows**, not a vocabulary: `scorerFlowIds` names them, and each scorer call is a billed model call, unlike a case's own assertions, which are free and deterministic. An eval case may carry no assertions at all and be graded by scorers alone.

**The scorer-flow contract is by slot name.** Its input slots are filled by name: `output` gets the subject's bound flow output, `inputs` the case's input bag, `expected` the case's `expected` (left unfilled when the case has none), and any other name gets the value the subject's step wrote to the output slot of that name, read from the case's trace. Its outputs are read by name: `value` (a finite number) makes a numeric score, else `verdict` (or `stringValue`, which wins when both are set) — a non-empty string — a categorical one; `name` names the score (the scorer flow's slug when absent) and `comment` annotates it. A scorer that returns neither `value` nor `verdict` records no score, not a zero. Declare `output` and `expected` typed as the subject's output shape (or the builtin `object`).

## What will bite you

- **The run call does not return a run.** It answers 202 with `{ suiteId, queued, diagnostics }` — no id, no results; `diagnostics[]` carries warnings about what the run will not measure, so read it. Re-read the suite's runs until the worker's row appears. This is the one asymmetry with `POST /v1/flows/{id}/test`, which answers 200 with the results.
- **Poll on the run's `status` word.** It is `RUNNING` while the worker works, then one of `SUCCESS`, `PARTIAL` (some cases errored, the rest scored), `ERROR` (nothing usable ran) or `NOT_MEASURED` (everything ran, but coverage says the numbers are not evidence). Stop polling on anything that is not `RUNNING`; before the row exists, `runInFlight` on the suite read says a run is still queued.
- **A new suite may bill on its own.** `POST /v1/eval-suites` defaults `runOnConfigChange: true` and `subjectUncached: true`. The platform's sweep (about every ten minutes) then queues a full paid run whenever the subject flow's configuration differs from the suite's last run — once it has sat unedited for ten minutes — and an enabled suite that has never run counts as changed. Send `runOnConfigChange: false` on a suite with paid scorers you mean to run by hand, and `subjectUncached: false` on a quality suite.
- **A test run can be answered from the 24 h cache.** Test runs go through the preview engine, which reads and writes the handlers' input-keyed cache — a fetched or scraped page, and a `text.generate` answer to the same prompt, model and settings. A rerun on unchanged inputs inside that window may call no vendor and no model, so a pass proves the wiring, not that the provider still answers. To force a fresh call, set `"reuseResultsForMinutes": 0` on the step (no lookup, no store) for that run, or bust the ingest cache (`kipory-data`, ADMIN, billed on the next run).
- **An eval run is single-flight per suite** and refused with 409 while one is in flight. Serialise.
- **Test and eval runs apply record writes, not events.** Both run through the preview engine without `apply: false`, so records the flow creates are really created: point a suite at a flow that does not write, or accept that each run changes its data. The run's own `event.emit` resolves and checks its payload, but no event is recorded or published and no trigger starts. Mail is refused. One thing is not withheld: an `entity.enqueue-process` step hands the record to its processing flow, which runs live once the run applies — its events publish and its mail is sent. Their model calls are `origin: test` in the ledger, eval and test runs alike.
- **Two cross-run questions, two reads.** "Where has this been going" is the trend. "Did this edit break it" is the run's own `delta` on `GET /v1/eval-runs/{id}`: which cases were comparable, which changed, which were added or removed, which metrics moved. The trend carries none of that. Do not fetch runs and difference them by hand. The baseline is the settled run **before** the one you read — reading an older run compares it with its own predecessor, never with a later run — except on a bracketed suite, where it is the run's own control arm (the previous configuration, measured alongside it). While a suite has only one settled run, that run's `delta` is `null` — there is nothing to compare against — which is a different field from `regression: null` below.
- **Three answers to "did it regress", and only one means fine.** `regression: null` (or `regressed: null` on a suite's `lastRun`) means no verdict was computed. `regressed: false` with `delta.suppressedReason` set means the run was NOT compared — the subject or a scorer changed, or the cases moved — so read `suppressedReason` before you read `false` as a pass; only a suite that stopped measuring (`SUCCESS` → `ERROR`/`NOT_MEASURED`) is judged across a suppressed delta. `regressed: false` with no `suppressedReason` is the real "no metric moved past its noise floor". `worsenedMetrics: []` does not mean nothing regressed.
- **Readiness first.** `GET /v1/eval-suites/{id}/readiness` walks the subject flow's sub-flows and the record types it reads. A per-user record read with no acting user reads an empty corpus and reports success; the readiness report names it before you spend a run on it.
- **`version` is required on every patch**, and a patch to a test case or eval case replaces `inputs` and `assertions` wholesale.
- **Two outcome vocabularies for one subject.** A test-case result is `passed | failed | invalid | not-run`; an eval case's is `scored | errored | invalid | not-run | unknown`. `errored` is not a low score and `invalid` is not a failure.
- **There is no content-equality assertion**, deliberately. Shape and structure only; the `jsonata` kind is the escape hatch, validated at save time, and a non-boolean result fails rather than coercing truthy. It inherits the sandbox that bans `$now`, `$millis`, `$random`, `$shuffle`.
- **A `jsonata` assertion's root is `output`, not the preview's `flowOutput`.** The expression sees `{ output, missingRequiredOutput, transcript, errors, warnings, totalTokensIn, totalTokensOut, latencyMs }`, where `output` is the flow's bound outputs — so `output.urgent = true`, never `flowOutput.urgent`. A misspelled root reads as absent and the assertion fails with `actual: "null"`.
- **The project-wide trend is capped at 20 runs**, because it is multiplied by the suite count; the per-suite trend allows 100.
- **A suite measures one flow.** Every suite binds a `flow`, and every case carries its own inputs; there is no record-set subject.
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
