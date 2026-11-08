---
name: kipory-prove
description: Pin what "working" means for a Kipory flow and re-check it after every edit — eval suites whose cases carry pass/fail assertions (a contract suite), scorer flows when quality is a matter of degree, and the run-to-run comparison that says whether a change made things worse. Use after a flow works and before you change it again, when the user asks to test a flow, to catch a regression, whether an edit broke something, or wants a quality score rather than a pass or fail. Not for reading why one run misbehaved (kipory-diagnose) and not for trying a flow once by hand (a preview, kipory-build).
license: MIT
---

# Prove a flow works

One surface, two questions. A flow's stored checks are **eval suites**. **Does this still work?** — the cases' assertions: free, deterministic, and every run says whether its **contract** held. **Is this any good?** — scorer flows, which grade each output and cost a model call per case. A suite with no scorer flows is a **contract suite**; start there. (A flow delete uses a narrower meaning — the suite keyed `<flowKey>-contract` — see below.) Reaching for the wrong tool is the mistake this skill exists to prevent: an assertion that tries to judge quality becomes a brittle compare somebody deletes; a scorer used for pass/fail is an expensive way to run one assertion.

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
GET  /v1/eval-runs/{id}/spend        what the run cost by action, subject and scorers alike
```

The answer — and `GET /v1/eval-runs/{id}` — is `{ run, results, aggregates, delta }`: `contract`, `status`, `regression` and `credits` are fields of `run`, and `delta` sits beside it. Read `run.contract`: `verdict` is `held`, `broken`, `incomplete` (nothing broke, but the run's deadline — 180 s with `wait`, 600 s queued — cut `casesNotRun` cases before they were checked — re-run them) or `none` (no case carries an assertion and the suite declares no failing values, so there is nothing to hold; also a run that judged no case and cut none), with `casesBroken`, `assertionsFailed`, `casesNotRun`, `brokenCases` (each case key with its reasons; a failed assertion's reads `<message> — got <value>`, the value JSON-encoded and capped at 2,000 characters) and `flipped`. **A case that held in its baseline and is broken now regresses the run** (`regressed: true`, named in `regressionReason`). The baseline is per case: the newest of the last 20 earlier runs that judged it. An assertion break is compared even across an edit to the flow or a scorer, because that is the edit a contract exists to catch; a change to the case's own inputs, expected value or assertions re-baselines it. A break by a declared failing value alone is not compared across a scorer-checkpoint change or an edit of those values, and a case broken only by its scorers throwing never flips. `contract` never changes `status`, which only says whether the measurement happened.

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

**The scorer-flow contract is by slot name.** Its input slots are filled by name: `output` gets the subject's bound flow output, `inputs` the case's input bag, `expected` the case's `expected` (left unfilled when the case has none), and any other name gets the value the subject's action wrote to the output slot of that name, read from the case's trace. Its outputs are read by name: `value` (a finite number) makes a numeric score, else `verdict` (or `stringValue`, which wins when both are set) — a non-empty string — a categorical one; `name` names the score (the scorer flow's key when absent) and `comment` annotates it. A scorer that returns neither `value` nor `verdict` records no score, not a zero. Declare `output` and `expected` typed as the subject's output type (or the builtin `object`).

**`scoreRules` say how a score reads**, one entry per score name: `direction` (`higher-is-better` or `lower-is-better`), `failing` (categorical values that break a case's contract) and `floor` (the smallest mean movement that counts). A numeric metric regresses only when its paired per-case mean moved the wrong way past twice its standard error (and past `floor`); a scorer's metric with fewer than 5 comparable cases is `judged: false` and never regresses. That floor is for scorer metrics only: the platform's own (`latency.*`, `tokens.*`, `cost.*`) are judged at any case count.

## What will bite you

**The traps of proving a flow** — each with what happens and what to do, from a run call that returns no run to the cases a suite acts as and the answers to "did it regress": `references/pitfalls.md`.

## Before a risky edit

Capture a checkpoint (`kipory-build`). A broken contract tells you something broke; a checkpoint is how you get back. They are not substitutes for each other.

A capture — and a restore, which captures one of its own first — makes the suite's next run incomparable: its `delta.suppressedReason` is set and no metric is judged against the run before, even when the flow's content is identical. So run the suite once **after** the capture and before the edit; that run is the baseline the edited flow is compared with. After a restore, the first run re-baselines the same way.

## References

| File                        | What it answers                                                            |
| --------------------------- | -------------------------------------------------------------------------- |
| `references/assertions.md`  | the seven assertion kinds, their fields, and what each proves              |
| `references/pitfalls.md`    | each trap of eval suites, cases and runs, with what happens and what to do |
| `references/packs/evals.md` | contract suites, scorers, runs, the contract verdict and the delta         |
| `references/api/evals.md`   | every route's fields                                                       |

## Then

`kipory-operate` once the flow is worth running unattended, and for what a run cost. `kipory-build` for the checkpoint before a risky edit and the fix after a broken contract. `kipory-evolve` before deleting or changing a flow a suite measures. `kipory-diagnose` when a case fails and you need to see what an action actually emitted — an eval run keeps its traces attached at `GET /v1/eval-runs/{id}/traces/{traceId}`, and a case's `runId` opens its run: `GET /v1/runs/{runId}/timeline` has its warnings and each action's outcome, even for a case that passed.
