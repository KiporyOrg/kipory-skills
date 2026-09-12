<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: be2e8d720ebb · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Flow test cases

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

A stored input bag plus a list of assertions, replayed through the same preview engine you use
while authoring.

It turns the loop you are already running — build, preview, read the diagnostics, fix — into
something that outlives the session. Without it, the inputs that proved a flow worked and the
expectations that made them meaningful exist only in one conversation. The next session, the next
agent, and every person who edits that flow afterwards start from nothing.

## When you need it — and when you don't

- **The moment a flow previews cleanly.** Save that exact input and the assertions that made it
  clean. This is the cheapest it will ever be — you already have the payload in hand.
- **Before editing a flow you did not author.** Run the suite first to learn what the flow
  currently guarantees, _then_ change it. A suite you ran only after your edit cannot tell you
  which failures you caused.
- **Before deleting or rewiring a skill**, to find out what depends on it.

Do not reach for this when the question is "is the output any good?" — that is a matter of degree
and belongs to eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`). A test case answers pass or fail.

## The sequence

```
POST /v1/flow-test-cases    store an input bag and its assertions, scoped to the flow
POST /v1/flows/{id}/test    run the suite — omit the body to run every enabled case
```

Cases are scoped by `flow` and addressed by their own id. Running takes an optional list of case
ids and a flag for including disabled ones. ⚠️ **Naming ids runs exactly those, enabled or not** —
the disabled flag is ignored the moment you name any, so it only governs an unnamed run.

The assertion vocabulary is shared with the evals surface, which evaluates the same assertions —
so an assertion you learn here transfers there unchanged.

## The assertions

Six kinds, a closed set:

| Kind                         | Asserts                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `no-missing-required-output` | the flow produced everything its signature promises     |
| `output-present`             | a named slot exists and is non-empty                    |
| `output-matches-schema`      | a slot's value validates against its declared type      |
| `skill-outcome`              | a named skill reached applied, skipped, no-op or failed |
| `no-errors`                  | the run produced no skill errors                        |
| `jsonata`                    | a boolean expression over the whole run result          |

**Write `no-missing-required-output` first.** It is the highest-value assertion in the list: a
failure means a real invocation of this flow would fail outright. If you write only one assertion
per case, write that one.

## The rule that matters most: assert shape, never content

**There is no content-equality assertion, on purpose.** A flow that ends in a model call produces
different words every time. An assertion over that text encodes flake, and a flaky suite is worse
than no suite at all — it teaches everyone to ignore red, including you.

Assert structure instead. The expression kind covers most of what you actually want:

```
$count(output.insights.action_items) > 0
output.sentiment in ["positive", "neutral", "negative"]
$count($keys(output.analysis)) = 3
```

Those expressions run in the same sandbox as flow wiring, which blocks the clock and the random
generator — so an assertion cannot itself be the thing that flakes. An expression reaching for one
is **refused when you create the case**, not discovered later when the suite goes red.

The expression sees the output, whether anything required was missing, the per-skill transcript,
the errors and warnings, and the token and latency totals. A non-boolean result is its own kind of
failure, not a truthy pass.

## Reading a run

Four outcomes, kept apart because they mean genuinely different things:

- **passed** — every assertion held.
- **failed** — it ran and an assertion did not hold. Each failure reports the kind, its parameters,
  and **the actual value**, so you can act without a second call. ⚠️ `failed` also covers a **runner
  crash inside preview**, and those carry an EMPTY assertions array with the cause in `reason` —
  so read `reason` before you read `assertions`, or a crash looks like a case with no failures.
- **invalid** — it could not run: the stored inputs no longer match the flow's declared input
  slots. **This is a signal, not an error to route around.** Someone renamed or removed a slot;
  the fixture is stale because the contract moved, and that is exactly what you wanted to be told.
- **not-run** — the suite's time budget ran out before this case started. Never silently omitted,
  because a missing result reads as a pass.

One **assertion** failure never aborts the suite. ⚠️ A `402` (a spend ceiling) or a `504` (a case
exceeding preview's own timeout) is request-shaped rather than case-shaped: it aborts the whole run
and you get no results back at all, for cases you have already paid for.

## Cost — read this before you loop

⚠️ **A suite run makes real model calls and bills the project's payer.** It inherits preview's
billing exactly, and the spend lands on the project.

The suite's time budget bounds **duration, not spend**. What bounds spend is the project's
**design-time ceiling** — a project setting on a rolling window, refused as `402`
`DESIGN_SPEND_CAP_EXCEEDED` — and behind it the payer's wallet, refused as `402`
`BALANCE_BELOW_SOFT_CAP`. ⚠️ The two look identical on the status line and their remedies are not
interchangeable: one is a project setting, the other a top-up. The per-END-USER cap never applies to
design-time work at all.

⛔ **Admission is re-checked per case, not once up front.** So a suite that crosses a ceiling at case
twelve aborts the whole run and hands you no results — having already billed for the eleven that
ran. An agent re-running a large suite as a polling heartbeat is spending the customer's money on
nothing: run a suite when something changed.

Suite runs are tagged distinctly from interactive previews, so this spend is separable when
somebody goes looking for it.

## What will bite you

- **Cases are scoped to the flow, not pinned to a checkpoint.** Deliberately: a test pinned to a
  snapshot would validate a frozen copy rather than the flow anyone can currently break.
- **Case names are unique per flow** — a clash is refused rather than silently overwriting.
- **Updating REQUIRES the version you read.** A concurrent edit is then a 409 rather than a
  silent overwrite; the field used to be optional, and omitting it let the last writer win.
- **Deleting a flow deletes its cases.** There is no orphan state to clean up.
- **The RESULTS are ephemeral** — returned in the response and never stored. ⚠️ The runs themselves
  are not invisible: each case still persists a flow trace and its cost and AI-call rows, tagged as
  test runs, so a suite is auditable and billable even though its verdicts are not kept. A stored
  history of the verdicts would
  only be interpretable if each result could be attributed to a specific flow revision, and a
  flow has no revision to attribute it to. If you need the history, keep it yourself.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the preview engine these replay through.
- Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`) — the graded sibling, for when the answer is a matter of degree.
- Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`) — what to do when the suite tells you the edit was bad.
