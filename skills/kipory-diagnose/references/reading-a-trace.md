# Reading a trace — a worked walk

<!-- field-ok: pageText — one project's slot name in this worked example, not a platform field -->

The complaint: an endpoint that summarises a saved link started answering `422 FLOW_OUTPUT_MISSING` (`details.missing: ["summary"]`) yesterday. Nothing was deployed. This walks the reads in the order that finds the cause fastest. Names below — `link`, `pageText`, `summary`, `summarise` — are one project's, not the platform's.

## 1. Find the run

The caller has the response's `x-request-id` header. That is the run id.

```
GET /v1/runs/{runId}
```

`run.lifecycle` is `settled` — a synchronous endpoint call leaves no invocation row, so its closing frame is what says it ended; with no closing frame it would read `unknown`, which means "no outcome recorded", not "still running" and not "finished". `closing.kind` is `run-finished`, with `verdict: failed` and `missingOutputs: ["summary"]`, and `stepsStarted` is 3 against `declaredSteps` 3. So no step failed: the run reached its end without producing a required output, and the platform refused it.

## 2. Read the step log — it is complete

```
GET /v1/runs/{runId}/steps
```

```
step-started   scrape       …
step-applied   scrape       durationMs 1840
step-started   summarise    …
step-skipped   summarise    (no detail)
step-applied   write        …
run-finished
```

The summarising step was **skipped**, not failed. The row does not say why: a skip by the step's condition and a skip for a missing required input both carry no data at all, and so does a skip because the payer ran out of credit part-way through the run — but that one skips every step after it, and here `write` still applied. Only a projection miss carries `detail` (`missReason`, `slotKey`, `inputIndex`). The step's condition is here "run only when `pageText` is present", so the trace's values decide which it was. A skipped step writes nothing, so the flow's required `summary` output was never produced. That is why the caller got `422 FLOW_OUTPUT_MISSING` and the run's writes were discarded. Nothing is filled in with an empty value. Had the step failed, `step-failed` would name the step and carry `detail.phase` and a `detail.message` cut to 500 characters; longer text (up to 2,000 characters) is in the trace's `stepOutputs[].error` and, for a model step, its row in `GET /v1/ai-calls?project={nodeId}`.

## 3. Read the trace for the values

The step log says _what_ happened; only the trace says _what the values were_. You already hold the run id, so open that run's trace directly:

```
GET /v1/runs/{runId}/trace
```

A 404 here is ordinary: the run was not sampled, or its trace expired. Before reading it as a symptom, check the rates on the flow's listing:

```
GET /v1/flows/{id}/traces?source=production&limit=20
```

`sampling.request` of `0.2` means one run in five leaves a trace, so "only four traces for twenty runs" is expected. The listing is cursor-paged (older traces behind `after=<nextCursor>`) and carries no values — no `inputs`, `output` or `slotOutputs` — but every row names its `runId`, so the complaint's trace is the one whose `runId` is the run you already hold; otherwise choose by time, `recordId` or duration, and open one with `GET /v1/flows/{id}/traces/{traceId}` to see its values.

In this run's trace:

- `output` has no `summary` — consistent with the step log.
- `slotOutputs.pageText` is present and **empty** — the real "ran and emitted nothing" signal. The scrape step applied and emitted an empty page.
- `slotOutputs.summary` is absent — the step declared the slot and never wrote it, because it was skipped.

So the skip traces back to `pageText` being empty — whichever gate stopped `summarise`, it did its job. The question moved upstream: why did the scrape return nothing?

## 4. Compare with a good run

Open a trace from two days ago for the same site. `slotOutputs.pageText` is 4,000 characters. Same URL host, same handler config. The difference is outside the flow: the site now serves its article behind a consent widget the main-content pass keeps, and the extractor mistakes it for the page.

## 5. Decide, then go back to build

The fix is a handler config change — `excludeTags` on the scrape step — not a flow rewrite (`kipory-build`, `references/handlers/url.scrape.md`). Before changing it: checkpoint the flow, and store an eval case whose assertion is `output-present` on `summary` for a known-good link in the flow's contract suite (`kipory-prove`), so the next silent change surfaces as a broken contract rather than a complaint.

## What this walk did not need

- **Guessing from the HTTP status.** `FLOW_OUTPUT_MISSING` says which output is missing, not why; the step log and the trace say why.
- **The change set.** `GET /v1/runs/{runId}/change-set` would have shown the record write, `discarded`: a refused run writes nothing. Useful when the question is "what would it have written", not "why".
- **Re-running the flow.** A preview would have cost money and, without `apply: false`, written the record again.
