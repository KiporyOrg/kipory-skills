# Reading spend — the routes, the short version, and why the reads disagree

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn that it 401s an API key, never prescribed -->

Read this to find what a run, a call or the project spent: the spend routes, billing in short, and which read answers which question.

## The routes, and the short version

```
GET /v1/runs/{runId}/spend                        every charge one run made, by step, model calls included — api host
GET /v1/eval-runs/{id}/spend                      the same for an eval run: subject and scorer steps alike
GET /v1/nodes/{nodeId}/model-prices               what each model costs, in credits, at the project's id
GET /v1/projects/{nodeId}/settings                the two spend ceilings, and `designSpend` consumed in the current window
GET /v1/projects/{nodeId}/usage?window=7d          credits and events over a window, by kind; `by=step` by step
GET /v1/projects/{nodeId}/usage?window=7d&flows=1  the same per flow, with what failed runs spent (`failedRuns`, `failedCredits`)
GET /v1/ai-calls?project={nodeId}                 every model call, filterable; GET /v1/ai-calls/rollup?project= by hour or day; GET /v1/ai-calls/{id}?payload=prompt for one
GET /v1/organizations/{nodeId}/quota              today's use of each shared vendor allowance — the ORGANISATION's id, and a key granted at the organisation
GET /v1/projects/{nodeId}/limits                  every limit the project meets: the number in force, the default, and how much is used where counted
GET /v1/credits/balance                            the wallet — on the PROJECT's host only
```

A call or a run refused at a limit names it: `details.limitKey` on the error, `limitKey` on the run's `closing` failure. Look the key up in `GET /v1/projects/{nodeId}/limits`. Only Kipory changes a limit's number; to ask for more, name the key.

`references/spend.md` states what a step is charged, what a cache hit, a preview, an eval run and a reprocess cost, and model prices; `references/balance.md` the balance's fields, member wallets and the 402 codes. The short version:

- **Every amount is credits, and one credit is one micro-USD.** `x-credits-charged: 5139` is about half a US cent.
- **Compute is charged for the time a step ran, to the millisecond.** There is no minimum: a step that ran a few milliseconds costs a fraction of a credit, and a fraction under one credit is charged as nothing.
- **Waiting is not billed.** A queued step — a model call, a fetch — is charged for the time its job ran, not for the wait for a worker or a rate-limit allowance, so its `durationMs` on `/timeline` can be far longer than the time it was charged.
- **The compute rate is the deployment's and no route lists it.** <!-- absent: GET /v1/nodes/{nodeId}/compute-rate --> Read it off a `function-run` charge on `/spend` of a second or more: `credits ÷ units` is credits per millisecond, so `× 1000` is per second.
- **Model prices are a read**: `GET /v1/nodes/{nodeId}/model-prices`, at the project's id, quotes each model in credits per million tokens, minute or search (`kipory-build`'s `references/models.md` for choosing one).
- **A cache hit is cheaper, not always free.** A step answered from the step-result cache — which only some functions keep, and previews, eval runs and a reprocess never read — is charged nothing; one answered from a function's input-keyed cache pays the compute of its lookup and no model or vendor charge.
- **Previews, eval runs and reprocesses cost what a live run costs.** Flow previews, step previews (`POST /v1/flows/{id}/steps/{key}/preview`) and eval runs are design-time work, bounded by the design-time ceiling; a reprocess is not. The one record processing the ceiling does bound is a record handed over by a `record.enqueue-process` step of a preview or an eval run.

**The spend read says what each step was charged for.** Every entry of `byStep` names its step by `flowId` and `stepKey` (with `stepName`, its name when charged) and carries `charges`, one per kind, that sum to the step's `credits` (`references/spend.md` lists the kinds).

The reads count different things, so they disagree by design. "The reads, and why they disagree" below has the table of which read answers which question; the two to remember are that `x-credits-charged` holds only what was charged by the time the response was sent — so not an asynchronous call's run, which is read on `/spend` with the 202's `id` — and that `GET /v1/ai-calls` hides previews, evals and the platform's own describing calls unless you send `origins=all`.

A machine caller has no statement of its own: `GET /v1/credits/events` scopes to a person and answers 401 to a key. Account for key-driven spend per run, or per project through `usage`.

## The reads, and why they disagree

The reads count different things, so they disagree by design. Pick the one that answers the question.

| Question                                        | Read                                                                               | What it counts                                                                                                                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| what one product call cost                      | its `x-credits-charged` response header                                            | the end-user charges made by the time the response was sent, model calls included — so not an asynchronous call's run. Present on a refused call (`409`, `422`, `502`) too, since what ran before the refusal is billed |
| what one scheduled occurrence cost              | `creditCost` on `GET /v1/schedules/{id}/runs`                                      | every charge the occurrence's run made, across every attempt when the platform started it again; `null` is unknown, not zero                                                                                            |
| which step of a run spent                       | `GET /v1/runs/{runId}/spend`                                                       | every charge the run made, by step, design-time and platform-paid rows included; a model call made on a worker carries the run like any other                                                                           |
| what an eval run cost                           | `GET /v1/eval-runs/{id}/spend`                                                     | one entry per step of the subject flow and of each scorer flow, across every case                                                                                                                                       |
| what the model calls were                       | `GET /v1/ai-calls?project={nodeId}` and `GET /v1/ai-calls/rollup?project={nodeId}` | one row per model call — see the caveats below                                                                                                                                                                          |
| what the project spent over a window            | `GET /v1/projects/{nodeId}/usage`                                                  | every charging actor, so it is the largest number                                                                                                                                                                       |
| what every project under the organisation spent | `GET /v1/organizations/{nodeId}/usage` (ADMIN at the organisation)                 | the same breakdown one level up, with the paying wallet's state and the ceiling nearest to refusing work                                                                                                                |
| what moved the paying wallet                    | `GET /v1/organizations/{nodeId}/ledger` (ADMIN at the organisation)                | every credit movement — usage debits, grants, adjustments — newest first; a 404 for a node with no wallet of its own                                                                                                    |
| how much is left                                | `GET /v1/credits/balance`, on the project's host                                   | the wallet the caller draws on                                                                                                                                                                                          |

**The two organisation reads take the organisation's id**, not the project's: `payer.nodeId` on the balance when `payer.kind` is `organization`. A key reaches only the node it was granted at and what is below it, so a key granted at a project answers 403 on both. They need a key granted at the organisation, `admin`.

**`/spend`.** `byStep` entries are keyed by `flowId` and `stepKey` together — a run that calls other flows has steps of several flows, and two can share a key — with `stepName`, the step's name when it ran; the entry with `stepKey: null` is spend the run made outside any step, and dropping it stops the entries summing to `credits`. An empty `byStep` has more than one cause the read cannot tell apart: the run spent nothing, it failed before its first billable operation, or it is too old for its charges to be tied to a run — for a scheduled run of that age, the occurrence's `creditCost` is complete.

**The AI-call list.**

- Its default view hides design-time origins (previews, tests, evals) and the platform's own calls describing your configuration (`origin: element-describer`, paid by the platform, 0 credits to you). Read `excludedOrigins`, or send `origins=all`.
- Eval-run model calls are logged `origin: test`.
- An `origins` list you send leaves the platform's calls out unless it names `element-describer`.
- It has no `total` and no page jump; walk its cursors.

**`usage`.**

- It defaults to seven days. `window=custom` takes `from` and `to` as RFC 3339 instants, `to` exclusive.
- `scope` chooses whose work is counted: `all` (the default) is `users` + `public` + `design` + `holding`, the four that charge. `public` is calls to public endpoints. `design` is previews and eval runs. `system` is platform-paid work, outside `all`, and read on `events` — its credits are zero by construction.
- Breakdowns name their kind in lowercase kebab (`llm-call`, `function-run`, …).
- `by=step` splits the window by step: each row's `key` is `<flowId>/<stepKey>` — the flow that holds the step, then its key, since two flows can each have a step with the same key — and its `label` the step's name as charged. `?step=<flowId>/<stepKey>` narrows to that one step; `?flowId=` to one flow.
- `by=key` names a key only on the product calls that key made. A key's previews and eval runs are design-time charges, and schedule and trigger runs have no caller, so all of those land under `key: null`.

**A machine caller has no statement of its own.** `GET /v1/credits/events` scopes to a person and answers 401 to a key. Account for key-driven spend per run, or per project through `usage`.
