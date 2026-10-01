---
name: kipory-prove
description: Pin what "working" means for a Kipory flow and re-check it after every edit — eval suites whose cases carry pass/fail assertions (a contract suite), scorer flows when quality is a matter of degree, and the run-to-run comparison that says whether a change made things worse. Use after a flow works and before you change it again, when the user asks whether an edit broke something, or when they want a quality score rather than a pass or fail. Not for reading why one run misbehaved (that is diagnose).
license: MIT
---

# Prove a flow works

One surface, two questions. A flow's stored checks are **eval suites**. **Does this still work?** — the cases' assertions: free, deterministic, and every run says whether its **contract** held. **Is this any good?** — scorer flows, which grade each output and cost a model call per case. A suite with no scorer flows is a **contract suite**; start there. Reaching for the wrong tool is the mistake this skill exists to prevent: an assertion that tries to judge quality becomes a brittle compare somebody deletes; a scorer used for pass/fail is an expensive way to run one assertion.

## Before the first call

- Fetch `references/packs/evals.md` and `references/assertions.md`.
- A run costs money: it is real execution against real providers, and `POST /v1/eval-suites/{id}/run` is **ADMIN** — except with `validateOnly: true`, a free VIEWER dry run that runs nothing and answers how many cases the run would grade and what it would not measure. Size a suite with scorers deliberately.
- Write the assertions **before** the change, not after. Assertions written to describe what a flow currently does agree with the bug.

## The sequence

**A contract suite — pass or fail, one call to run.**

```
POST /v1/eval-suites                 { project, key, label, flowId }  — no scorerFlowIds: a contract suite
POST /v1/eval-cases                  { suiteId, key (1–64, stable), label?, inputs, expected?, assertions (0–50), enabled? }
GET  /v1/eval-suites?project=&flowId={flowId}   the suites that check one flow
POST /v1/eval-suites/{id}/run        { wait: true }  → 200 with the settled run, its contract included
```

Read `contract` on the answer: `verdict` is `held`, `broken`, `incomplete` (nothing broke, but the 180 s deadline cut `casesNotRun` cases before they were checked — re-run them) or `none` (no case carries an assertion and the suite declares no failing values, so there is nothing to hold; also a run that judged no case and cut none), with `casesBroken`, `assertionsFailed`, `casesNotRun`, `brokenCases` (each case key with its reasons; a failed assertion's reads `<message> — got <value>`, the value JSON-encoded and capped at 2,000 characters) and `flipped`. **A case that held in its baseline and is broken now regresses the run** (`regressed: true`, named in `regressionReason`). The baseline is per case: the newest of the last 20 earlier runs that judged it. An assertion break is compared even across an edit to the flow or a scorer, because that is the edit a contract exists to catch; a change to the case's own inputs, expected value or assertions re-baselines it. A break by a declared failing value alone is not compared across a scorer-checkpoint change or an edit of those values, and a case broken only by its scorers throwing never flips. `contract` never changes `status`, which only says whether the measurement happened.

Per case the outcome is `scored` (it ran and was checked), `errored`, `invalid` or `not-run`. **`invalid` means the stored inputs no longer match the flow's slots — that staleness is the regression signal, not a setup error**, and it breaks the contract. `not-run` means the wall budget expired. Every requested case appears; none is omitted.

`wait: true` works for a suite with no scorer flows, `repeats: 1` and `bracketed: false`; any other suite answers 422 naming the condition (and `validateOnly: true` says so first). The inline run has 180 seconds — a case the deadline cuts is `not-run`, never errored, and leaves the run `partial` (`error` when every case was cut, a regression only when its baseline also ran under the 180 s budget and finished every case) — and each running case holds one of the project's preview slots, so a project at its ceiling answers 429. A subject that outlasts the request's time limit answers 504, and while the run queue cannot be read a `wait` run is refused with 409 rather than risk overtaking a queued one — retry, or queue the run. ⚠️ The `wait` answer carries no `diagnostics`: dry-run first (`validateOnly: true`) to see warnings such as `EVAL_CASE_CANNOT_FAIL`. `caseKeys` naming a case twice is refused (422).

**Scorers — a matter of degree.**

```
POST /v1/eval-suites                 { project, key, label, flowId, scorerFlowIds, scoreRules?, … }
GET  /v1/eval-suites/{id}/readiness  what the configuration alone says will happen — read before the first run
POST /v1/eval-suites/{id}/run        202 { suiteId, runId, queued: true, diagnostics } — 409 while one is in flight
GET  /v1/eval-runs/{id}              the run by the 202's runId — 404 until the worker starts it — WITH its delta against the previous `success`/`partial` run
GET  /v1/eval-suites/{id}/runs       the suite's runs, newest first, cursor-paged
GET  /v1/eval-suites/{id}/trend      one suite's scores across runs
GET  /v1/eval-suites/trend?project=  every suite in the project
```

Scorers are **flows**, not a vocabulary: `scorerFlowIds` names them, and each scorer call is a billed model call, unlike a case's own assertions. An eval case may carry no assertions at all and be graded by scorers alone. A scorer that throws leaves its case `errored` with `scorerErrors`, and the rest of the run goes on.

**The scorer-flow contract is by slot name.** Its input slots are filled by name: `output` gets the subject's bound flow output, `inputs` the case's input bag, `expected` the case's `expected` (left unfilled when the case has none), and any other name gets the value the subject's step wrote to the output slot of that name, read from the case's trace. Its outputs are read by name: `value` (a finite number) makes a numeric score, else `verdict` (or `stringValue`, which wins when both are set) — a non-empty string — a categorical one; `name` names the score (the scorer flow's key when absent) and `comment` annotates it. A scorer that returns neither `value` nor `verdict` records no score, not a zero. Declare `output` and `expected` typed as the subject's output shape (or the builtin `object`).

**`scoreRules` say how a score reads**, one entry per score name: `direction` (`higher-is-better` or `lower-is-better`), `failing` (categorical values that break a case's contract) and `floor` (the smallest mean movement that counts). A numeric metric regresses only when its paired per-case mean moved the wrong way past twice its standard error (and past `floor`); with fewer than 5 comparable cases it is `judged: false` and never regresses.

## What will bite you

- **Without `wait`, the run call does not return a run.** It answers 202 with `{ suiteId, runId, queued, diagnostics }` — no results; `diagnostics[]` carries warnings about what the run will not measure (`EVAL_CASE_CANNOT_FAIL` names a case with no assertions in a suite with no scorers), so read it. `GET /v1/eval-runs/{id}` with that `runId` answers 404 until the worker starts the run, and for good if the job is lost before a worker takes it; the suite's `runInFlight` says whether it is still coming. A run that fails before its first case (the lock refused it, a selected case was deleted, its end user is gone) is stored under that id as an `error` row with `neverStarted: true` and a `notMeasuredReason` saying why; it is never a baseline or a suite's last run.
- **Poll on the run's `status` word.** It is `running` while the worker works, then one of `success`, `partial` (some cases errored, were invalid or were cut by the deadline; the rest scored), `error` (nothing usable ran) or `not-measured` (everything ran, but coverage says the numbers are not evidence). Stop polling on anything that is not `running`; before the row exists, `runInFlight` on the suite read says a run is still queued.
- **A suite runs itself only when asked to.** `runOnConfigChange` defaults to `false` on a new suite (a suite created before 2026-10-01 keeps what it stored). Set it `true` and the platform's sweep (about every ten minutes) queues a full paid run whenever the subject flow's configuration differs from the suite's last run — once it has sat unedited for ten minutes — or the platform was redeployed since. `coverageMode` defaults to `report-only` on a suite with no scorer flows and `strict` on one with them; `subjectUncached` defaults to `true`.
- **A suite with `subjectUncached: false` can be answered from the 24 h cache.** Runs go through the preview engine, and with the cache in the path they read and write the handlers' input-keyed cache — a fetched or scraped page, and a `text.generate` answer to the same prompt, model and settings. A rerun on unchanged inputs inside that window may call no vendor and no model, so a held contract proves the wiring, not that the provider still answers. The default (`true`) keeps the cache out of the path.
- **An eval run is single-flight per suite** and refused with 409 while one is in flight. Serialise.
- **Eval runs apply record writes, not events.** They run through the preview engine without `apply: false`, so records the flow creates are really created: point a suite at a flow that does not write, or accept that each run changes its data. The run's own `event.emit` resolves and checks its payload, but no event is recorded or published and no trigger starts. Mail is refused. One thing is not withheld: an `entity.enqueue-process` step hands the record to its processing flow, which runs live once the run applies — its events publish and its mail is sent. Their model calls are `origin: test` in the AI-call list.
- **Two cross-run questions, two reads.** "Where has this been going" is the trend. "Did this edit break it" is the run's own `delta` on `GET /v1/eval-runs/{id}`: which cases were comparable, which changed, which were added or removed, which metrics moved. The trend carries none of that. Do not fetch runs and difference them by hand. The baseline is the `success` or `partial` run **before** the one you read — reading an older run compares it with its own predecessor, never with a later run — except on a bracketed suite, where it is the run's own control arm (the previous configuration, measured alongside it). While a suite has only one settled run, that run's `delta` is `null` — there is nothing to compare against — which is a different field from `regression: null` below.
- **Three answers to "did it regress", and only one means fine.** `regression: null` (or `regressed: null` on a suite's `lastRun`) means no verdict was computed. `regressed: false` with `delta.suppressedReason` set means the run was NOT compared — the subject or a scorer changed, or the cases moved — so read `suppressedReason` before you read `false` as a pass; a run regresses three ways — a metric moved the wrong way past its noise floor, the suite stopped producing measurable results (`success` → `error`/`not-measured`), or a case that held broke its contract (`contract.flipped`) — and only the last two are judged across a suppressed delta. `regressed: false` with no `suppressedReason` is the real "no metric moved past its noise floor and no case flipped". `worsenedMetrics: []` does not mean nothing regressed: a flip-only regression leaves it empty.
- **Readiness first.** `GET /v1/eval-suites/{id}/readiness` walks the subject flow's sub-flows and the record types it reads. A per-user record read with no acting user reads an empty corpus and reports success; the readiness report names it before you spend a run on it.
- **`version` is required on every patch**, and a patch to an eval case replaces `inputs` and `assertions` wholesale; a suite patch replaces `scoreRules` wholesale.
- **Check a suite or case write before making it.** `POST`/`PATCH` on `/v1/eval-suites` and `/v1/eval-cases` take `validateOnly: true` in the body, `DELETE` takes `?validateOnly=true`: nothing is written, and the 200 verdict names what the write would refuse (a flow the project does not hold, a case with no inputs, a taken key). A suite's `coverageMode` is `strict` or `report-only`.
- **A case's outcome is `scored | errored | invalid | not-run | unknown`.** `errored` is not a low score and `invalid` is not a low score either — both break a contract. `unknown` is a run from before per-case outcomes were stored.
- **There is no content-equality assertion**, deliberately. Shape and structure only; the `jsonata` kind is the escape hatch, validated at save time, and a non-boolean result fails rather than coercing truthy. It inherits the sandbox that bans `$now`, `$millis`, `$random`, `$shuffle`.
- **A `jsonata` assertion's root is `output`, not the preview's `flowOutput`.** The expression sees `{ output, inputs, expected, missingRequiredOutput, transcript, errors, warnings, totalTokensIn, totalTokensOut, latencyMs }`, where `output` is the flow's bound outputs and `inputs`/`expected` are the case's own (`expected` is null when the case has none) — so `output.urgent = true`, never `flowOutput.urgent`. A misspelled root reads as absent and the assertion fails, its reason ending `— got null`.
- **The project-wide trend is capped at 20 runs**, because it is multiplied by the suite count; the per-suite trend allows 100.
- **A suite measures one flow.** Every suite binds a flow (`flowId`), and every case carries its own inputs; there is no record-set subject. The flow may be a platform flow: its cases run as the suite's project, the platform pays, and each trace is filed under the project marked `platformFlowRun: true`.
- **Several suites and their cases at once** go in the project document's `evals` section, cases under `evals.<suite>.cases`. A document carrying a flow's old `tests` key is refused with `DOCUMENT_FLOW_TESTS_MOVED`.
- **Do not skip this because the project is small.** The assertions are the only part of a design that survives a later rewrite.

## Before a risky edit

Capture a checkpoint (`kipory-build`). A broken contract tells you something broke; a checkpoint is how you get back. They are not substitutes for each other.

## References

| File                        | What it answers                                                    |
| --------------------------- | ------------------------------------------------------------------ |
| `references/assertions.md`  | the six assertion kinds, their fields, and what each proves        |
| `references/packs/evals.md` | contract suites, scorers, runs, the contract verdict and the delta |
| `references/api/evals.md`   | every route's fields                                               |

## Then

`kipory-operate` once the flow is worth running unattended. `kipory-diagnose` when a case fails and you need to see what a step actually emitted — an eval run keeps its traces attached at `GET /v1/eval-runs/{id}/traces/{traceId}`.
