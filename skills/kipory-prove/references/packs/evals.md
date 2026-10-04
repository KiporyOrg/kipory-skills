<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Eval suites

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

Cases, a subject, and scorers. Running a suite pushes every case through the subject's flow,
grades each result, and keeps the grades attached to the trace that case produced — so runs can be
compared rather than merely repeated.

A suite is the one place a flow's stored checks live, and it answers two questions. **Does this
still work?** — the cases' assertions, free and deterministic, decide whether the run's contract
held. **Is this any good?** — scorer flows grade each output, numerically or categorically. A suite
with no scorer flows is a **contract suite**: it asks only the first question, and it is where to
start (see [Contract suites](#contract-suites) below).

## When you need it — and when you don't

- **The moment a flow previews cleanly.** Save that exact input and the assertions that made it
  clean as a case in a contract suite. This is the cheapest it will ever be — you already have the
  payload in hand.
- **Before editing a flow you did not author.** Run its suites first to learn what the flow
  currently guarantees, _then_ change it. A suite you ran only after your edit cannot tell you which
  failures you caused.
- **When output _quality_ is what you are iterating on** — ranking, extraction accuracy, summary
  faithfulness. An assertion can tell you the flow still returns ten results; only a scorer can tell
  you they got worse.
- **Around a prompt edit.** The delta between two runs is the only honest answer to "did that
  help?", and this resource will refuse to give you one when the comparison would lie.

Do not add a scorer flow to check that a flow still runs — an assertion answers that for nothing,
deterministically.

## The sequence

```
POST /v1/eval-suites            create — a `key`, a `label`, and the flow (`flowId`)
POST /v1/eval-cases             add cases: the `suiteId`, a REQUIRED `key`, then a `label`, inputs,
                                expected (if any), labels, assertions (the six kinds below: a
                                `skill-outcome` names its step by `skillKey`)
POST /v1/eval-suites/{id}/run   queue a run — 202 with its `runId`, the run has NOT happened yet
                                … with `wait: true` — 200 with the settled run (no scorers only)
                                … with `validateOnly: true` — 200 with a verdict, nothing queued
GET  /v1/eval-suites/{id}/runs  the suite's runs, newest first (each run names its `suiteId`)
GET  /v1/eval-suites?project=&flowId=   the suites whose subject is one flow
GET  /v1/eval-runs/{id}         read one run back, WITH its delta against the previous
GET  /v1/eval-runs/{id}/spend   what that run cost, by step — subject and scorer steps alike
GET  /v1/eval-suites/{id}/trend across runs — one suite, its whole recent history
GET  /v1/eval-suites/trend      across runs AND suites — every series in one answer
```

Suites are scoped by `project`; cases are scoped by their suite. Both keys are address keys and
both are renameable; a suite's display text is `label`, and a case's optional display text is its
`label` too (null when unset; nothing resolves a case by it). Individual traces are readable per run for
drill-down. Several suites with their cases at once: the `evals` section of the
project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`), each suite's `cases` nested under it.

A suite's `coverageMode` is `strict` (a coverage shortfall fails the run) or `report-only` (the
shortfall is recorded and the run succeeds); the stored `STRICT` / `REPORT_ONLY` is refused, on
the row as in a document. Sent neither, a new suite with scorer flows is `strict` and one with
none — a contract suite, judged by its assertions — is `report-only`.

## Contract suites

A contract suite is a suite with no scorer flows. Every case carries assertions, and a run answers
whether each still holds. It costs no grading calls — only the subject runs, which a preview would
bill anyway — and with `wait: true` (below) it is one call from "run it" to "did it hold".

⚠️ **A flow delete uses a narrower meaning.** `DELETE /v1/flows/{id}` deletes the suite keyed
`<flowKey>-contract` over that flow, cases and runs included, and answers
`deletedContractSuiteCount`. Every other suite over the flow stays, and its runs are refused until
it names a flow that exists. Re-key or re-point a suite you want to keep before deleting the flow.

### The assertions

Six kinds, a closed set — unknown fields are refused, and a case carries up to 50:

| Kind                         | Asserts                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `no-missing-required-output` | the flow produced everything its signature promises           |
| `output-present`             | a named slot exists and is non-empty                          |
| `output-matches-schema`      | a slot's value validates against its declared type            |
| `skill-outcome`              | the step `skillKey` reached applied, skipped, no-op or failed |
| `no-errors`                  | the run produced no skill errors                              |
| `jsonata`                    | a boolean expression over the whole run result                |

**Write `no-missing-required-output` first.** It is the highest-value assertion in the list: a
failure means a real invocation of this flow would fail outright. If you write only one assertion
per case, write that one.

⚠️ **A case with no assertions in a suite with no scorers cannot fail.** Planning a run warns with
`EVAL_CASE_CANNOT_FAIL`, naming the cases — in the dry run (`validateOnly: true`) and a queued run's
202 `diagnostics`. A `wait: true` answer is the settled run and carries no diagnostics, so dry-run
first.

### Assert shape, never content

**There is no content-equality kind, on purpose.** A flow that ends in a model call produces
different words every time. An assertion over that text encodes flake, and a flaky suite is worse
than no suite at all — it teaches everyone to ignore red, including you.

Assert structure instead. The expression kind covers most of what you actually want:

```
$count(output.insights.action_items) > 0
output.sentiment in ["positive", "neutral", "negative"]
output.category = expected.category
```

Those expressions run in the same sandbox as flow wiring, which blocks the clock and the random
generator — so an assertion cannot itself be the thing that flakes. An expression reaching for one
is **refused when you save the case**, not discovered later when the suite goes red. Comparing a
field with ground truth (`expected`) is fine when the field is a closed value — a category, a count,
an id — rather than generated prose.

The expression sees one object: `output` (the flow's bound outputs, keyed by output slot), `inputs`
(the case's input bag), `expected` (the case's expected value, `null` when it has none),
`missingRequiredOutput` (the unbound required output, or null), `transcript` (the steps as they ran),
`errors` (failed steps), `warnings` (step warnings), `totalTokensIn` and `totalTokensOut` (model
tokens) and `latencyMs` (wall time). ⚠️ The root is `output` — not `flowOutput`, which is what the
preview response calls the same value. `flowOutput.urgent = true` reads nothing and fails. A
non-boolean result is its own kind of failure, not a truthy pass.

### What a contract run costs and changes

⚠️ **A run makes real model calls and bills the project's payer** — every model call the subject
makes, per case, exactly as a preview of it would. A contract suite adds no grading calls on top.
What bounds that spend is the project's design-time ceiling (`402` `DESIGN_SPEND_CAP_EXCEEDED`) and
behind it the payer's wallet (`402` `BALANCE_BELOW_SOFT_CAP`); the two look identical on the status
line and their remedies are not interchangeable. Run a suite when something changed, never as a
polling heartbeat.

⚠️ **A run applies its record writes unless the suite says `applyWrites: false`, and publishes no
events** — see [The subject](#the-subject) below. Set it false on a suite over a flow that writes,
or accept that each run changes the data it reads.

### In a project document

A flow's cases live under its suite: `evals.<suite>.cases`. A document that still carries
`flows.<key>.tests` is refused with `DOCUMENT_FLOW_TESTS_MOVED` at that field, naming where the
cases go now.

### The suite list carries each suite's standing

`GET /v1/eval-suites` answers with a `lastRun` on every suite — status, the four counts, the
reason a run produced nothing usable, and what it cost. You do not need a second call per suite to
know whether a suite is worth believing, and you should not make one: the standing is what decides
whether any number under it means anything.

⛔ **`lastRun` is `null` for a suite that has never run, and that is not a zero.** A suite authored
this morning and a suite whose last run scored nothing are different findings — the second is a
result and the first is the absence of one.

⚠️ **`credits` is `null` when the cost is unknown.** Not free — unknown. A run whose cost events
were never recorded and a run that genuinely cost nothing are different, and only one of them is
safe to add up.

⭐ **`lastRun` also carries the run's TRIGGER and its VERDICT** — `triggeredBy`, `regressed`,
`regressionReason` and `worsenedMetrics`, with the same meanings they have on the run itself. So a
list can say which suites got worse without a call per suite. ⛔ `regressed` is `null` when no
verdict was computed, which is not `false`.

⚠️ **A bracketed suite's control arm is never reported here.** It measures the previous
configuration on purpose, so reading it as the newest run would show you last week's numbers as
this week's.

⚠️ **A run is single-flight per suite** and is refused while one is in flight. Two concurrent runs
would each compare against the same predecessor, so the second's delta would describe a baseline
it never actually had.

⭐ **Every suite read says whether a run is in flight — `runInFlight`.** It is `true` exactly when
`POST /v1/eval-suites/{id}/run` would answer 409, and that includes a run that is queued and not yet
picked up. ⛔ Do not read it off `lastRun.status === "running"`: the run row is written only when
the worker starts, so for the whole wait the newest run is still the previous, settled one. It is also `true` while a run row
still holds the suite's lock after its worker died — the platform honours that lock for twelve
minutes and refuses a POST on it. `runInFlight` is `null` only when the platform could not read its
queue AND no such lock is held; that says nothing either way.

### Starting a run does not wait for it

⛔ **`POST /v1/eval-suites/{id}/run` answers `202` with `{ suiteId, runId, queued: true,
diagnostics }` — not the run.**
A suite run is `cases × repeats` subject runs **plus** `cases × scorers` grading calls — grading
happens ONCE, on the first repeat's trace, so repeats do not multiply scorer spend — under a
ten-minute budget. ⚠️ Two settings move the bill and neither is obvious: `subjectUncached` defaults
to **true**, so every repeat is a real call with the ingest cache out of the path, and `bracketed`
**doubles** the suite's spend by running the baseline's configuration alongside the live one.

A queued run has 600 seconds and can carry scorers, repeats and bracketing; a `wait` run (below)
has 180 seconds and none of them. Queue anything a caller cannot sit through.

⚠️ **`runId` names a row that does not exist yet.** The worker writes the run under that id when
the run STARTS, so `GET /v1/eval-runs/{runId}` answers 404 until then — and for good if the job
is lost before a worker takes it. A run that fails before its first case (the suite's lock refused
it, a selected case was deleted, its end user is gone, a read failed) is stored under that id as an
`error` row with `neverStarted: true` and a `notMeasuredReason` saying why; no baseline, last run,
trend point or sweep reads it. A 404 while the suite's `runInFlight` is `true` means the worker has not
picked the job up; it does not mean the run failed.

### Or wait for it: `wait: true`

⭐ **A suite with no scorer flows, `repeats: 1` and `bracketed: false` can run inside the request.**
`wait: true` answers `200` with the settled run — the same body `GET /v1/eval-runs/{runId}`
answers: `{ run, results, aggregates, delta }`, the `contract` sitting on `run` beside the run's
own status and credits — so checking a flow's contract is one call. Any other suite
answers 422 naming what disqualifies it, and `validateOnly: true` with `wait: true` says the same as
a verdict. The run has **180 seconds**: a case the deadline cuts, running or not yet started, is
`not-run` with the reason, never errored. Each running case holds one of the project's preview
slots, so a project at its ceiling answers 429, and a subject that outlasts the request's time
limit answers 504. While the run queue cannot be read, a `wait` run is refused with 409 rather than
risk overtaking a queued run of the suite: retry, or queue it. It is the same run as a queued one — one run per
suite at a time (409), stored, fingerprinted and re-baselining the sweep — and it still settles if
you disconnect.

A run's `status` is `running` until it settles, then `success`, `partial` (some cases errored, were
invalid or were cut by the deadline; the rest were scored), `error` (it could not start, or nothing completed) or `not-measured` (everything
ran, and coverage says the numbers are not evidence). Poll until it is not `running`.

⚠️ **A suite can also run itself.** With `runOnConfigChange: true` — off by default for a new
suite; read it on a suite you did not create — a sweep about every ten minutes
queues a paid run when either (1) the subject flow's configuration differs from the one the
suite's last run measured, once the flow has sat unedited for ten minutes — an enabled suite that
has never run counts as differing — and the run says `triggeredBy: config-change`; or (2) the
platform has been redeployed since that run, even with your flow untouched and with no wait, and
the run says `triggeredBy: code-change`. Leave it off on a suite with paid scorers you mean to run by
hand.

⚠️ **Everything that can be refused up front IS refused up front**, while your call is still open: a
suite that is gone (404), a subject flow that no longer resolves, a `runAsUserId` naming somebody who has left
the project, an unknown case key (422), and a suite that already has a run going (409). What cannot be
refused up front is SPEND — the run meters as it goes, so a run accepted here can still stop part
way when the balance runs out, and that shows on the run.

### What the run WILL measure: `validateOnly`

⭐ **`POST /v1/eval-suites/{id}/run` with `validateOnly: true` answers `200` with a verdict and
queues nothing.** It is the same route and the same rules — a flag on the real route rather than a
sibling, so a check that passes and a run that refuses cannot come apart. It is the standard dry-run
envelope — a verdict, its findings, and whether every rule ran — plus one derived figure.

`derived.gradedCaseCount` is how many cases this run would grade under the selection you sent, which
is NOT the suite's case count.

⛔ **`ok: true` WITH findings is the normal answer here.** On a write surface a finding usually
means the row will not save. On this one the run is almost always accepted; the findings say what it
will and will not have measured when it finishes. Gate on `severity`, never on `code` — `error`,
`warning`, or `info` for a note about something the platform left alone:

| code                              | what it means                                                    | the run still happens |
| --------------------------------- | ---------------------------------------------------------------- | --------------------- |
| `EVAL_RUN_NO_CASES`               | the selection grades nothing, so the run lands `error`           | yes                   |
| `EVAL_RUN_SCORER_UNRESOLVABLE`    | a named scorer flow is gone; its cases come back ungraded        | yes                   |
| `EVAL_SUITE_DISABLED`             | the sweep skips this suite; only a run asked for by hand happens | yes                   |
| `EVAL_REGRESSION_EVENT_UNDEFINED` | a detected regression is recorded and emitted to nobody          | yes                   |
| `EVAL_SCORER_SLOT_UNFILLABLE`     | a scorer reads a slot no subject step writes; its cases error    | yes                   |
| `EVAL_CASE_CANNOT_FAIL`           | a scorer-less suite has cases with no assertions                 | yes                   |

⚠️ **The same findings ride the 202.** A caller who queued a run without asking first gets
them on `diagnostics` of the accept body, so this is not advice you can only have by asking for it.

⚠️ **A queued run is attributed to you.** `triggeredBy` is `manual` and the run is owned by the
caller — the same row a sweep would have written, with a different provenance.

### A run says what asked for it

Every run carries `triggeredBy`: `config-change` (the sweep saw the flow under test move),
`code-change` (the flow was untouched and the platform under it moved), or `manual` (a caller
asked for it).

⭐ **The first two are kept apart because they point at different culprits.** When a regression
turns up, "the flow was edited" and "nobody touched the flow" are the two answers worth telling
apart, and they lead to different people looking at different things.

⛔ **`null` means the trigger was NOT RECORDED — it does not mean `manual`.**

### A run carries the verdict it reached

Every run answers with a `regression`: whether it came out worse than its baseline, why, which
metrics moved the wrong way, and whether an event was **built and handed to** the bus for it.
⛔ `announced: true` is not delivery — the publish is fire-and-forget so a run is never lost to a
notification, and a bus that rejects the envelope after the handover is logged, not recorded here.

There are three ways to regress and they fail differently. A quality or timing metric moved the
wrong way _in its own direction_ and past the noise floor — `latency.subject` rising is worse, not
better. The suite **stopped producing measurable results at all**: that is not a low score, it is a
suite that has stopped answering. Or
a case that held broke its contract (the run's `flipped` cases, below). A run whose deadline cut
every case, with nothing errored, is `error`: it regresses only when its baseline ran under the same
budget (`measurementConditions.budgetMs`: 180 s for a `wait` run, 600 s for a queued one) and
finished every case (a flow that starts hanging). A baseline the deadline cut even once, or one that
ran under the longer budget, raises no regression.

⭐ **Cost never regresses a run.** `cost.credits`, `tokens.in` and `tokens.out` are
reported in `regression.costChanges` — `{name, previous, current, direction}` for each one that
moved past its noise floor, `up` or `down` — and never in `worsenedMetrics`. A run whose scores held
and whose credits rose answers `regressed: false` with the rise beside it. Decide for yourself
whether the cost is acceptable; the verdict is about quality.

⚠️ **A run compared against nothing says why.** A suite's first run answers with
`reason: "no-baseline"`; a run whose previous run exists but could not be loaded answers
`reason: "baseline-unreadable"`. Both have `delta: null` and `costChanges: []`, and neither
regresses unless a case flipped — a contract flip's reason then takes the place of theirs. Only a
`false` beside a null `reason` and no `delta.suppressedReason` means "compared, and nothing got
worse".

⛔ **`regression` is `null` when no verdict was computed, which is not `regressed: false`.** An
older run can carry none. "We did not look" and "we looked and it was fine" are different findings.

⚠️ **A suppressed delta answers `regressed: false`, not `null`.** When the delta is withheld because
the configuration or the cases moved, no metric is compared, so the verdict is `false` — unless the
suite stopped producing measurable results (`success` or `partial` → `error` or `not-measured`) or a
case flipped, both of which are judged across any delta. Read `delta.suppressedReason` before you
read `false` as "compared and fine".

⭐ **The verdict is what this run decided, not what a fresh comparison would decide now.** A
judgement is made against a baseline under the thresholds then in force — delete the run it compared
against, retune a floor, add a metric, and a recomputed answer differs from the one that actually
fired the event. Read it as a record of the past.

⚠️ **A run carries what it cost — `credits` — summed from its own `cost.credits` scores**, the same
sum a suite's `lastRun.credits` reports. `null` is unknown, never free. Do not rebuild it from an
aggregate's mean and sample size. `GET /v1/eval-runs/{id}/spend` breaks the cost down by step,
subject and scorer steps alike, with `uncharged` counting the operations the platform paid for. It
can read higher than `credits`: a case the run's deadline cut is charged there and not scored here.

⚠️ **A case's `latencyMs` is `null` when no duration was recorded** — a case the run never started,
or a run from before per-case outcomes were stored. A `0` is a measured zero.

### A run says whether its contract held

Every run carries `contract`: `verdict` is `held`, `broken`, `incomplete` or `none`, with
`casesBroken`, `assertionsFailed`, `casesNotRun`, `brokenCases` (each case key with the reasons it
broke; a failed assertion's reason reads `<message> — got <value>`, the value JSON-encoded and cut at
2,000 characters — there is no separate `actual` field) and `flipped`. A run has a contract when any
case carries an assertion or the suite declares failing values (below); without one — no case carries
an assertion and the suite declares no failing values — it reads `none`, as does a run that judged no
case and cut none. In a run with a contract, a case is broken by a failed assertion, a declared
failing value, or an `errored` or `invalid` outcome. `incomplete` means nothing broke but the run's
deadline cut `casesNotRun` cases before they were checked, so the run cannot vouch for them; re-run
them. ⛔ `contract` never changes `status`, which still says only whether the measurement happened: a
run with cut cases is `partial`, one with every case cut is `error`. `null` means not recorded (runs
before it was kept, or one abandoned before it settled), never `held`.

⭐ **A case that held in its baseline and is broken now regresses the run**, named first in
`regressionReason`, and `flipped` lists it; for a flip-only regression `worsenedMetrics` is empty.
Each case compares against the newest of the last 20 earlier non-control runs that judged it, so a
subset run or a cut case leaves the others' baselines in place. An assertion break is compared across
a subject or scorer configuration change — that is the change a contract exists to catch — and a
moved fixture (the case's inputs, expected value or assertions) re-baselines the case instead. Two
breaks are exempt: one by a declared failing value alone is not compared across a scorer-checkpoint
change or an edit of the failing values that apply to it, and one caused only by the case's scorers
throwing is broken but never flipped.

### Declaring how a score reads: `scoreRules`

A suite's `scoreRules` (on create and patch, replaced wholesale) holds one entry per scorer score
name: `direction` (`higher-is-better` or `lower-is-better`), `failing` (the categorical values that
break a case) and `floor` (the smallest mean movement that counts, in the score's unit). An entry
must declare at least one; a duplicated name, an empty `failing`, a negative `floor` and a name under
`latency.*`, `tokens.*` or `cost.*` (the platform's own metrics keep their direction and floor) are
refused with a 422 that names the entry. A suite takes at most 50 rules, and a rule at most 100
`failing` values of at most 200 characters each. A name no scorer of the suite is known to emit is only a
warning (`EVAL_SCORE_RULE_NAME_UNKNOWN`) in the write's `validateOnly` answer.

⭐ **A scorer metric regresses only on a real move.** The delta pairs each case with itself and
compares the mean per-case difference with its standard error: it counts only past twice the
standard error, in the declared direction, and past the declared floor when there is one (every case
moving alike leaves the floor alone to decide). Each delta row says `standardError`, `judged` and
`directionAssumed` (no direction declared, so higher read as better). Below 5 comparable cases the
row is `judged: false` with `notJudgedReason: "too few comparable cases"` and never regresses. A row
whose values are too large for a mean, movement or standard error to be a number carries `null` for
it and is likewise `judged: false`. One bad case cannot clear the rule; that is the contract's job.

A categorical score with no `failing` values declared never regresses a run, but the delta's
`categoricalChanges` lists each comparable case whose value changed (`{name, caseKey, from, to}`).
`failing` is not refused on a score that turns out numeric, since a scorer's output type is known
only at run time; there it never matches.

⚠️ **`announced: false` does not mean "nothing regressed".** It is false when there was nothing to
announce _and_ when there was something and it could not be — the suite names no event type, the
project does not define the one it names, or the payload failed its contract. `regressed: true` with
`announced: false` is a real regression nobody was told about, and it is worth looking for.

⚠️ **A suite that names no regression event type (`regressionCategoryKey` + `regressionEventKey`)
does not emit**, and that is a complete
configuration rather than a broken one. Kipory ships no project configuration, so the event a
regression announces is one your own project already defines.

## The subject

Each case carries an input bag, and the suite binds the flow every case runs through.

A suite's subject, or a scorer, may be a **platform flow**. Each case then runs as the suite's
project, and **the suite's project pays** for it exactly as for its own flows: the same credits,
design-time ceiling and `402` when the project is over its cap. The case's trace is filed under the
suite's project marked `platformFlowRun: true`, so a reader can tell it from the project's own
flows. The run read carries the same mark on each case result, `results[].platformFlowRun`.

⛔ **A suite runs through the preview engine, and a preview APPLIES its writes.** The suite's
`applyWrites` is the preview's `apply`, and it defaults to true, so a suite over a flow that creates
or updates records **mutates the very corpus it is measuring** — which also moves the case
fingerprint and makes the next delta incomparable.

⭐ **`applyWrites: false` makes every case a dry run.** Every step runs — every model call, the
same credits — and the records and terms the flow would have written are discarded when the case
ends, on both arms of a bracketed run. An `entity.enqueue-process` handoff is discarded with the
writes, so the record's processing flow does not run. Scorer flows are not covered: a scorer that
writes still applies. Each run keeps the answer it started under as
`measurementConditions.writesApplied` (`null` on a run recorded before it was kept), so a later edit of
the suite does not change what an earlier run says it left behind.

⚠️ **A dry run does not prove the writes would save.** The platform checks a run's writes against
the database when it applies them, and a dry run stops before that. A write the apply would refuse
— a record another writer changed while the case ran, a unique value taken in the meantime, a write
the database rejects — fails an applying case with a run-level error and passes a dry one. Keep one
applying case, or preview the flow once with `apply` left on, when the write itself is what you are
checking.

In either mode a run reads its own writes one way only: a step that reads a record by id sees what
an earlier step of the same case wrote, and a list, query, count or search does not.

Whatever `applyWrites` says: files land in a sandbox prefix, a send is refused — an `email.send` or `url.send` step
fails rather than sending — and an
emitted `record`, `user` or `project` event is checked and then dropped: it is never recorded or
published, so no trigger starts. In an applying suite, records and terms are not isolated, and
neither is a processing handoff: an `entity.enqueue-process` step runs the record's processing flow
live once the case applies, and that flow's events publish and its mail is sent. An eval run's model calls are
`origin: test` in the AI-call list; the run's own `credits` is the per-suite figure. Re-running an applying suite over a mutating flow is not a safe idempotent act:
set `applyWrites: false`, measure a flow that does not write, or accept that each run changes the
baseline.

## Two tiers of scorer — reach for the free one first

- **Assertions** — the six kinds above: free, deterministic, sandboxed. A `jsonata` assertion also
  reads the case's `inputs` and `expected` (`null` when the case has none), so
  `output.answer = expected.answer` is a free check.
- **Scorer flows** are ordinary flows that take the inputs, the expected value and the output, and
  return a name with a value or verdict and an optional comment.

The contract is by slot NAME, on both sides. An input slot named `output` receives the subject's
bound output, one named `inputs` the case's input bag, and one named `expected` the case's `expected` value; any other
input slot receives what the subject's step wrote to the output slot of that name in the case's
trace. The scorer's own outputs are read as `value` (a finite number → a numeric score), else
`verdict` or `stringValue` (a non-empty string → a categorical one), `name` (the score's name —
the scorer flow's key when absent) and `comment`. A scorer that returns neither a value nor a
verdict records no score.

**Anything an expression can answer about the run's shape must not cost a model call.** Fifty
cases against three model judges is a hundred and fifty billed calls _per run_, and you will run it
repeatedly. Model grading is for qualities that genuinely vary — faithfulness, relevance, tone —
where an exact rule would reject legitimate output.

A scorer declares which trace slots it reads and is never handed the trace whole. ⚠️ **A scorer
that throws — a slot the flow no longer produces, a refused call — does not score zero and does not
stop the run: that case comes back `errored`, with `scorerErrors` naming the scorer's key and the
reason, and no score from it.** The run's other cases are still scored. A payer over its cap, a
timeout for the whole run and a shutdown still stop it. Saving does not refuse such a scorer; the
suite write's `validateOnly` answer and the run's plan warn with `EVAL_SCORER_SLOT_UNFILLABLE`.

Every score carries a `source` saying what produced it, and the set is closed at three:
`scorer-flow` (a grading flow), `assertion` (a deterministic check), and `system` (the platform's
own reading of latency, tokens or cost — a measurement with no judgement in it). Branch on it
when you aggregate: folding a stopwatch reading in with a model's opinion averages two things
that are not the same kind of number. There is no human-annotation or end-user-feedback source.

## What you can know before you spend: `GET /v1/eval-suites/{id}/readiness`

One failure mode costs more than every other in this pack put together, and it is decided by
configuration alone: **a suite with no `runAsUserId` runs as a sentinel, which owns no records.**
If the flow under test reads a record type whose rows belong to individual users, every case
searches an empty corpus — and the run reports `success` with a column of real zeroes. Nothing
downstream can tell that from a flow that genuinely retrieves nothing.

The suite carries half the answer. This read carries the other half: it walks the subject flow's
transitive `flow.invoke` closure and reports every record type the enabled skills name, together
with its `ownerScope`.

- `ownerScope: "user"` — rows belong to one end user. Paired with a suite that names no user,
  this is the failure above, and you can fix it before spending anything.
- `ownerScope: "project"` — a shared pool every user of the project reads. A sentinel run reads
  it normally.
- `ownerScope: null` — **this project declares no type by that name.** The skill names something
  that does not exist, which fails the run rather than emptying it. It is deliberately not folded
  into the `project` arm: that is the safe-looking one, and this is not a safe state.

⛔ **An empty `recordTypeReads` is NOT an all-clear, and the response says so out loud.** The walk
reads each handler's own declaration of which configuration field names a record type. That
declaration is not enforcement, and it covers top-level configuration fields only — so a handler
can name a record type without the walk being able to see which. Six handlers in the catalog reach
record or vector data while naming no type; `taxonomy.aggregate` is the one that reads per-user
data. Any of them present in the closure is reported in `unattributedHandlerKeys`, which is the
measured size of the blind spot rather than a silence.

⛔ **`scope: null` means the graph could not be walked** — the suite's flow is not in the project's
flow library. It never means "walked and found
nothing"; that answer is a present `scope` with an empty `recordTypeReads`. Exactly one of `scope`
and `unavailableReason` is ever set.

## What the platform will not let you conclude

This is the part worth carrying, because every item is a way a harness can report clean numbers
while measuring nothing:

- **A case that could not run is never a zero.** Stale inputs come back as _invalid_ — the flow's
  contract moved, which is its own regression signal. A crash or a missing trace comes back as
  _errored_. Neither is a low score, and averaging them as zeros would manufacture a decline.
- **A scorer that emitted nothing records no score**, rather than a zero.
- **A run with no cases is an error**, never a green pass over nothing.
- **A delta is suppressed when a checkpoint moved.** If the subject flow's newest checkpoint, or
  any scorer's, differs between two runs — one was captured or restored in between — the numeric
  deltas are withheld and the reason is named. An edited judge silently rebaselines every prior
  score, and a delta measured across that edit looks exactly like evidence. A step edit takes no
  checkpoint on a project flow, so a delta across an edit alone IS reported: that is the read for
  "did this edit break it". Capture a checkpoint after editing a scorer so its old scores are not
  compared with its new ones.
- **Adding cases does not suppress the delta** over the cases that did not change — but every
  metric reports its sample size alongside. A gain over 4 of 50 cases is not the claim a gain over
  49 is, and the number that tells you which is right there.

The trend read carries a comparability verdict on **each point**, for the same reason: a line
drawn through an edited judge implies a continuity the numbers do not have, and a flat list of
scores has nowhere to put that caveat.

### Editing a suite or a case

Both PATCHes REQUIRE the `version` you last read, and a stale one is a 409. That matters more here
than on most design resources: a suite is the thing two people tune at once, and an edit that
silently overwrites a scorer binding rebaselines every score measured after it — a change that
looks like a result rather than an edit. Re-read and reconcile on a refusal.

Every suite and case write takes `validateOnly` — in the body on `POST` and `PATCH`, as
`?validateOnly=true` on `DELETE` — and then writes nothing and answers `200` with the verdict the
write would reach: a subject or scorer flow the project does not hold, a case with no inputs, a key
already taken, each as a finding. It is the write's own check, so it never says `ok: true` where
the write refuses — except for a stale `version`, which only the write sees. It is not the run's
dry run: `POST /v1/eval-suites/{id}/run` with `validateOnly: true` answers what a run would
measure, and the design writes answer whether a row would be saved.

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
facet's (which also carries `confirm` and `assignedTerms`); anything else in the query is refused.

## Authoring order

1. Get the flow previewing cleanly.
2. Create the suite and bind the subject — no scorer flows yet, so it is a contract suite.
3. Add cases — inputs, an expected value where there is ground truth, labels for per-label
   breakdowns, and assertions for everything checkable for free.
4. Run it with `wait: true` and read the `contract` on its `run`; that run is the baseline.
5. Add scorer flows only for what assertions genuinely cannot express.

An expected value is optional throughout. Reference-free scorers — a faithfulness judge, a
coverage assertion — need no ground truth, and requiring one would exclude exactly the scorers
that also work against production traffic.

## Building a screen over these reads

For a client that draws suites, runs and trends. None of it changes what a run measures.

⭐ **To mark the series a verdict named, read `worsened` on the pooled aggregates** — do not match
`worsenedMetrics` against names yourself. Those are display names (`latency.skill (rerankSet)`),
and two series can spell the same one. The platform joins its own recorded verdict back to each
series: `true` names this series, `false` does not, and `null` means no verdict was computed, the
series is in a per-label group (a verdict judges the pooled comparison only), or the verdict's name
fits more than one series.

⭐ **The aggregates carry it too.** Every numeric and categorical aggregate — on a run, and on every
trend point — has a `source`, so telling a suite's own answers from the platform's instrumentation
never needs a list of system metric names, which would go stale the day the platform adds one.
⚠️ It is `null` when one series pools scores from more than one producer: a scorer is free to name
its score `cost.credits`, and that series then holds both.
Both trend reads also answer `numericSeries` — one `{ name, skillKey, source }` per numeric series
across the whole window, its `source` merged over every run by the same rule. Order or filter a
chart's series by it rather than folding the points' sources yourself.

When `numericSeries` is empty, `emptyReason` says why — decided from what the runs MEASURED, never
from their statuses: `never-run` (no settled run in the window), `categorical-only` (the runs
produced verdicts and no number — a suite working as authored), or `nothing-measured` (no score of
either kind — a coverage failure to look into). It is `null` whenever there is a line to draw.
⚠️ Do not infer it from `status`: a categorical suite with one `partial` run is still categorical.

### Drawing every suite at once: `GET /v1/eval-suites/trend`

⛔ **Do not call `/{id}/trend` once per suite.** It reads one aggregate per run, so a loop over six
suites at twenty points is a hundred and twenty aggregate reads for one screen. `GET
/v1/eval-suites/trend?project={nodeId}` answers every suite of a project in one request, and its
points are built by the same code from the same samples — a suite's series here and the same
suite's series from its own endpoint cannot disagree.

Two differences from the per-suite read, both deliberate:

- `limit` is capped at **20** rather than 100, and defaults to 8. This window is taken for every
  suite in the project rather than for one, so the ceiling that bounds a single series has to be
  lower when it bounds all of them. Ask the suite itself for a longer history.
- A suite that has **never run is in the answer**, carrying an empty `points` array. Omitting it
  would make "this suite has no settled run" and "this suite was not in the response" the same
  shape, and nothing in the payload would let you tell which you were looking at.

### The runs list pages; the trends are windows

`GET /v1/eval-suites/{id}/runs` is **cursor-paged**, newest first: it answers `{ runs, paging: null,
nextCursor, prevCursor }`. Pass `after=<nextCursor>` for older runs and keep going until
`nextCursor` is `null` — that is the only signal that you hold the suite's whole history.

`limit` on both trends is a **ceiling, not a page** — there is no cursor and no way to ask for what
fell outside it. So both trend responses carry `truncated`: true when older runs exist beyond what
you are holding.

⛔ **Read the cursor or the flag; do not compare the count against your own `limit`.** A page or
window that came back full is not evidence of anything — a suite with exactly that many runs fills
it too, and a client that infers from the count then warns about history that does not exist.

⭐ **On the trend it is what tells a short series from a new suite.** The leftmost point says _"no
earlier run to compare against"_ either way; only `truncated` distinguishes "this suite has run
twice" from "you asked for the last twenty". Plot the first point accordingly — a series that
begins mid-history is not a baseline.

## Related

- Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`) — what to do when a run tells you the edit was bad.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the subject being measured, and the preview engine that
  runs it.
