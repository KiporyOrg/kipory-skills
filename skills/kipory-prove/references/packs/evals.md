<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 423f5af968c4 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Eval suites

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

Cases, a subject, and scorers. Running a suite pushes every case through the subject's flow,
grades each result, and keeps the grades attached to the trace that case produced — so runs can be
compared rather than merely repeated.

It is the graded sibling of a flow test case, and the distinction is the whole reason both exist:

|                          | Flow test case            | Eval suite                         |
| ------------------------ | ------------------------- | ---------------------------------- |
| Asks                     | does this still work?     | is this any good?                  |
| Answers                  | pass or fail              | a score, numeric or categorical    |
| Result                   | returned, then forgotten  | persisted, comparable across runs  |
| Tolerates nondeterminism | no — assertions pin shape | yes — that is what scorers are for |

Use a test case for a contract. Use an eval when the answer is a matter of degree.

## When you need it — and when you don't

- **When output _quality_ is what you are iterating on** — ranking, extraction accuracy, summary
  faithfulness. A test case can tell you the flow still returns ten results; only an eval can tell
  you they got worse.
- **Around a prompt edit.** The delta between two runs is the only honest answer to "did that
  help?", and this resource will refuse to give you one when the comparison would lie.

Do not reach for an eval to check that a flow still runs — that is cheaper, faster and
deterministic as a test case (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`).

## The sequence

```
POST /v1/eval-suites            create — bind the flow
POST /v1/eval-cases             add cases: a REQUIRED stable `key`, then inputs, expected
                                (if any), labels, assertions
POST /v1/eval-suites/{id}/run   queue a run — 202, the run has NOT happened yet
GET  /v1/eval-suites/{id}/runs  poll here for the row the worker writes
GET  /v1/eval-runs/{id}         read one run back, WITH its delta against the previous
GET  /v1/eval-suites/{id}/trend across runs — one suite, its whole recent history
GET  /v1/eval-suites/trend      across runs AND suites — every series in one answer
```

Suites are scoped by `project`; cases are scoped by their suite. Individual traces are readable
per run for drill-down.

### The suite list carries each suite's standing

`GET /v1/eval-suites` answers with a `lastRun` on every suite — status, the four counts, the
reason a run produced nothing usable, and what it cost. You do not need a second call per suite to
know whether a suite is worth believing, and you should not make one: the standing is what decides
whether any number under it means anything.

⛔ **`lastRun` is `null` for a suite that has never run, and that is not a zero.** A suite authored
this morning and a suite whose last run scored nothing are different findings — the second is a
result and the first is the absence of one. Rendering the null as `0/0 scored` invents a
measurement nobody took, which is the failure this whole resource exists to make visible.

⚠️ **`credits` is `null` when the cost is unknown.** Not free — unknown. A run whose cost events
were never recorded and a run that genuinely cost nothing are different, and only one of them is
safe to add up.

⭐ **`lastRun` also carries the run's TRIGGER and its VERDICT** — `triggeredBy`, `regressed`,
`regressionReason` and `worsenedMetrics`, with the same meanings they have on the run itself. So a
list can say which suites got worse without a call per suite. ⛔ `regressed` is `null` when no
verdict was computed, which is not `false`; rendering null as "fine" reports a suite nobody judged
as one that passed.

⚠️ **A bracketed suite's control arm is never reported here.** It measures the previous
configuration on purpose, so reading it as the newest run would show you last week's numbers as
this week's.

⚠️ **A run is single-flight per suite** and is refused while one is in flight. Two concurrent runs
would each compare against the same predecessor, so the second's delta would describe a baseline
it never actually had.

### Starting a run does not wait for it

⛔ **`POST /v1/eval-suites/{id}/run` answers `202` with `{ suiteId, queued: true }` — not the run.**
A suite run is `cases × repeats` subject runs **plus** `cases × scorers` grading calls — grading
happens ONCE, on the first repeat's trace, so repeats do not multiply scorer spend — under a
ten-minute budget. ⚠️ Two settings move the bill and neither is obvious: `subjectUncached` defaults
to **true**, so every repeat is a real call with the ingest cache out of the path, and `bracketed`
**doubles** the suite's spend by running the baseline's configuration alongside the live one.

The run used to execute inside the request and return the finished run, which no HTTP client can
wait for: a
15-second client abort left the caller believing nothing had happened while the run went on to
completion and billed for it.

⛔ **There is no `runId` in that response, and there is nothing to poll for by id.** The run row is
written by the worker when the run STARTS. Read the suite's runs back — `GET
/v1/eval-suites/{id}/runs` — and the newest one is yours. A row that has not appeared yet means the
worker has not picked the job up; it does not mean the run failed.

⚠️ **Everything that can be refused up front IS refused up front**, while your call is still open: a
suite that is gone (404), a subject flow that no longer resolves, a `runAsUserId` naming somebody who has left
the project, an unknown case key (422), and a suite that already has a run going (409). What cannot be
refused up front is SPEND — the run meters as it goes, so a run accepted here can still stop part
way when the balance runs out, and that shows on the run.

⚠️ **A queued run is attributed to you.** `triggeredBy` is `MANUAL` and the run is owned by the
caller — the same row a sweep would have written, with a different provenance.

### A run says what asked for it

Every run carries `triggeredBy`: `CONFIG_CHANGE` (the sweep saw the flow under test move),
`CODE_CHANGE` (the flow was untouched and the platform under it moved), or `MANUAL` (someone
pressed Run).

⭐ **The first two are kept apart because they point at different culprits.** When a regression
turns up, "the flow was edited" and "nobody touched the flow" are the two answers worth telling
apart, and they lead to different people looking at different things.

⛔ **`null` means the trigger was NOT RECORDED — it does not mean `MANUAL`.** Runs from before this
was kept carry `null`. Reading absence as a hand-started run would invent a person for every
historical sweep fire, which is precisely the distinction the field exists to draw.

### A run carries the verdict it reached

Every run answers with a `regression`: whether it came out worse than its baseline, why, which
metrics moved the wrong way, and whether an event was **built and handed to** the bus for it.
⛔ `announced: true` is not delivery — the publish is fire-and-forget so a run is never lost to a
notification, and a bus that rejects the envelope after the handover is logged, not recorded here.

There are two ways to regress and they fail differently. A metric moved the wrong way _in its own
direction_ and past the noise floor — `latency.subject` rising is worse, not better. Or the suite
**stopped producing measurable results at all**: that is not a low score, it is a suite that has
stopped answering, and it is the state a real flow sat in unnoticed for two days.

⛔ **`regression` is `null` when no verdict was computed, which is not `regressed: false`.** Runs
predate the field, and so does every run ever started by hand before detection moved into the run
itself. "We did not look" and "we looked and it was fine" are different findings.

⭐ **The verdict is what this run decided, not what a fresh comparison would decide now.** A
judgement is made against a baseline under the thresholds then in force — delete the run it compared
against, retune a floor, add a metric, and a recomputed answer differs from the one that actually
fired the event. Read it as a record of the past.

⚠️ **`announced: false` does not mean "nothing regressed".** It is false when there was nothing to
announce _and_ when there was something and it could not be — the suite names no event type, the
project does not define the one it names, or the payload failed its contract. `regressed: true` with
`announced: false` is a real regression nobody was told about, and it is worth looking for.

⚠️ **A suite that names no regression event type does not emit**, and that is a complete
configuration rather than a broken one. Kipory ships no project configuration, so the event a
regression announces is one your own project already defines.

## The subject

Each case carries an input bag, and the suite binds the flow every case runs through.

⛔ **A suite runs through the preview engine, and a preview APPLIES its writes.** `apply` defaults to
true and the eval runner does not pass `apply: false`, so a suite over a flow that creates or
updates records **mutates the very corpus it is measuring** — which also moves the case fingerprint
and makes the next delta incomparable. Files land in a sandbox prefix and mail is refused; records
and terms are not isolated. Re-running a suite over a mutating flow is not a safe idempotent act:
measure a flow that does not write, or accept that each run changes the baseline.

## Two tiers of scorer — reach for the free one first

- **Assertions** reuse the flow-test-case vocabulary: free, deterministic, sandboxed.
- **Scorer flows** are ordinary flows that take the inputs, the expected value and the output, and
  return a name with a value or verdict and an optional comment.

**Anything an expression can answer about the run's shape must not cost a model call.** Fifty
cases against three model judges is a hundred and fifty billed calls _per run_, and you will run it
repeatedly. Model grading is for qualities that genuinely vary — faithfulness, relevance, tone —
where an exact rule would reject legitimate output.

A scorer declares which trace slots it reads and is never handed the trace whole. ⚠️ **A scorer
wired to a slot the flow no longer produces does not score zero — it fails the WHOLE RUN, and it
fails at run time rather than at save time.** Saving only checks that the scorer flow exists and
belongs to this project; nothing there compares its declared slots against what the subject can
produce. So the failure lands after every subject call has already billed. Re-check your scorer
bindings yourself whenever you edit the subject's output slots.

Every score carries a `source` saying what produced it, and the set is closed at three:
`SCORER_FLOW` (a grading flow), `ASSERTION` (a deterministic check), and `SYSTEM` (the platform's
own reading of latency, tokens or cost — a measurement with no judgement in it). Branch on it
when you aggregate: folding a stopwatch reading in with a model's opinion averages two things
that are not the same kind of number.

⚠️ **Two more sources were published here until 2026-08-19 and never existed** — one naming a
human reviewer, one naming end-user feedback. Both were declared alongside the others in
anticipation of a review surface and a feedback surface, neither of which was built, so no score
could ever carry them. If you wrote a branch for either, it was unreachable. There is no
human-annotation or end-user-feedback path today; when one ships it brings its own source back.

## What you can know before you spend: `GET /v1/eval-suites/{id}/readiness`

One failure mode costs more than every other in this pack put together, and it is decided by
configuration alone: **a suite with no `runAsUserId` runs as a sentinel, which owns no records.**
If the flow under test reads a record type whose rows belong to individual users, every case
searches an empty corpus — and the run reports SUCCESS with a column of real zeroes. Nothing
downstream can tell that from a flow that genuinely retrieves nothing.

The suite carries half the answer. This read carries the other half: it walks the subject flow's
transitive `flow.invoke` closure and reports every record type the enabled skills name, together
with its `ownerScope`.

- `ownerScope: "USER"` — rows belong to one end user. Paired with a suite that names no user,
  this is the failure above, and you can fix it before spending anything.
- `ownerScope: "PROJECT"` — a shared pool every user of the project reads. A sentinel run reads
  it normally.
- `ownerScope: null` — **this project declares no type by that name.** The skill names something
  that does not exist, which fails the run rather than emptying it. It is deliberately not folded
  into the `PROJECT` arm: that is the safe-looking one, and this is not a safe state.

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
- **A delta is suppressed when the configuration moved.** If the subject flow or any scorer
  changed between two runs, the numeric deltas are withheld and the reason is named. An edited
  judge silently rebaselines every prior score, and a delta measured across that edit looks
  exactly like evidence.
- **Adding cases does not suppress the delta** over the cases that did not change — but every
  metric reports its sample size alongside. A gain over 4 of 50 cases is not the claim a gain over
  49 is, and the number that tells you which is right there.

The trend read carries a comparability verdict on **each point**, for the same reason: a line
drawn through an edited judge implies a continuity the numbers do not have, and a flat list of
scores has nowhere to put that caveat.

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

### Both cross-run reads are WINDOWS, and each says so

`limit` on the runs list and on both trends is a **ceiling, not a page** — there is no cursor and no
way to ask for what fell outside it. So both responses carry `truncated`: true when older runs
exist beyond what you are holding.

⛔ **Read the flag; do not compare the count against your own `limit`.** A window that came back
full is not evidence of anything — a suite with exactly that many runs fills it too, and a client
that infers from the count then warns about history that does not exist.

⭐ **On the trend it is what tells a short series from a new suite.** The leftmost point says _"no
earlier run to compare against"_ either way; only `truncated` distinguishes "this suite has run
twice" from "you asked for the last twenty". Plot the first point accordingly — a series that
begins mid-history is not a baseline.

### Editing a suite or a case

Both PATCHes REQUIRE the `version` you last read, and a stale one is a 409. That matters more here
than on most design resources: a suite is the thing two people tune at once, and an edit that
silently overwrites a scorer binding rebaselines every score measured after it — a change that
looks like a result rather than an edit. Re-read and reconcile on a refusal.

## Authoring order

1. Get the flow previewing cleanly, and save a **test case** for the contract first.
2. Create the suite and bind the subject.
3. Add cases — inputs, an expected value where there is ground truth, labels for per-label
   breakdowns, and assertions for everything checkable for free.
4. Run once to establish a baseline.
5. Add scorer flows only for what assertions genuinely cannot express.

An expected value is optional throughout. Reference-free scorers — a faithfulness judge, a
coverage assertion — need no ground truth, and requiring one would exclude exactly the scorers
that also work against production traffic.

## Related

- Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) — the free, deterministic sibling. Start there.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the subject being measured, and the preview engine that
  runs it.
