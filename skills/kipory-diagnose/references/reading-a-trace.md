# Reading a trace — a worked walk

<!-- field-ok: pageText — one project's slot name in this worked example, not a platform field -->

The complaint: an endpoint that summarises a saved link started returning an empty summary yesterday. Nothing was deployed. This walks the reads in the order that finds the cause fastest. Names below — `link`, `pageText`, `summary`, `summarise` — are one project's, not the platform's.

## 1. Find the run

The caller has the response's `x-request-id` header. That is the run id.

```
GET /v1/runs/{runId}
```

`run.lifecycle` is `unknown` — ordinary for a synchronous endpoint call, which leaves no invocation row to say how it ended; it means "no outcome recorded", not "still running" and not "finished". The step log answers instead: `closing.kind` says it finished, `stepsStarted` is 3 against `declaredSteps` 3. So the flow ran to completion and produced the empty value on purpose, as far as the engine is concerned.

## 2. Read the step log — it is complete

```
GET /v1/runs/{runId}/steps
```

```
step_started   scrape       …
step_applied   scrape       durationMs 1840
step_started   summarise    …
step_skipped   summarise    (no data)
step_applied   write        …
run_finished
```

The summarising step was **skipped**, not failed. The row does not say why: a skip by the step's condition and a skip for a missing required input both carry no data at all; only a projection miss carries `data` (`missReason`, `slotKey`, `inputIndex`). The step's condition is here "run only when `pageText` is present", so the trace's values decide which it was. A skipped step writes nothing, and the flow's required `summary` output was filled with the type's empty value on the way out — which is why the caller saw `""` and a 200 rather than a 502. Had the step failed, `step_failed` would name the step but carry no phase and no message — those are in the endpoint's `502` body (`details.phase`), the trace's `stepOutputs[].error`, and the model-call ledger.

## 3. Read the trace for the values

The step log says _what_ happened; only the trace says _what the values were_. You already hold the run id, so open that run's trace directly:

```
GET /v1/runs/{runId}/trace
```

A 404 here is ordinary: the run was not sampled, or its trace expired. Before reading it as a symptom, check the rates on the flow's listing:

```
GET /v1/flows/{id}/traces?source=production&limit=20
```

`sampling.request` of `0.2` means one run in five leaves a trace, so "only four traces for twenty runs" is expected. The listing carries no values — no `inputs`, `output` or `slotOutputs` — so it cannot tell you which trace is the complaint's; choose by time, `recordId` or duration, and open one with `GET /v1/flows/{id}/traces/{traceId}` to see its values.

In this run's trace:

- `output.summary` is `""` — consistent with the step log.
- `slotOutputs.pageText` is present and **empty** — the real "ran and emitted nothing" signal. The scrape step applied and emitted an empty page.
- `slotOutputs.summary` is absent — the step declared the slot and never wrote it, because it was skipped.

So the skip traces back to `pageText` being empty — whichever gate stopped `summarise`, it did its job. The question moved upstream: why did the scrape return nothing?

## 4. Compare with a good run

Open a trace from two days ago for the same site. `slotOutputs.pageText` is 4,000 characters. Same URL host, same handler config. The difference is outside the flow: the site now serves its article behind a consent widget the main-content pass keeps, and the extractor mistakes it for the page.

## 5. Decide, then go back to build

The fix is a handler config change — `excludeTags` on the scrape step — not a flow rewrite (`kipory-build`, `references/handlers/url.scrape.md`). Before changing it: checkpoint the flow, and store a test case whose assertion is `output-present` on `summary` for a known-good link (`kipory-prove`), so the next silent change surfaces as a failed test rather than a complaint.

## What this walk did not need

- **Guessing from the HTTP status.** A 200 with an empty body and a 502 are the same class of failure — an unproduced required output — differing only in whether the slot's type has a safe empty value.
- **The change set.** `GET /v1/runs/{runId}/change-set` would have shown one record write with an empty summary. Useful when the question is "what did it write", not "why".
- **Re-running the flow.** A preview would have cost money and, without `apply: false`, written the record again.
