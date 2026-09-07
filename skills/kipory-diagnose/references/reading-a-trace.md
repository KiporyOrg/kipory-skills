# Reading a trace — a worked walk

<!-- field-ok: pageText — one project's slot name in this worked example, not a platform field -->

The complaint: an endpoint that summarises a saved link started returning an empty summary yesterday. Nothing was deployed. This walks the reads in the order that finds the cause fastest. Names below — `link`, `pageText`, `summary`, `summarise` — are one project's, not the platform's.

## 1. Find the run

The caller has the response's `x-request-id` header. That is the run id.

```
GET /v1/runs/{runId}
```

`run.lifecycle` is `settled`, `closing.kind` says it finished, `stepsStarted` is 3 against `declaredSteps` 3. So the flow ran to completion and produced the empty value on purpose, as far as the engine is concerned.

## 2. Read the step log — it is complete

```
GET /v1/runs/{runId}/steps
```

```
step_started   scrape       …
step_applied   scrape       durationMs 1840
step_started   summarise    …
step_skipped   summarise    detail: { reason: "condition" }
step_applied   write        …
run_finished
```

The summarising step was **skipped by its condition**, not failed. A skipped step writes nothing, and the flow's required `summary` output was filled with the type's empty value on the way out — which is why the caller saw `""` and a 200 rather than a 502. Had the step failed, `step_failed` would name the phase.

## 3. Read the trace for the values

The step log says _what_ happened; only the trace says _what the values were_. Check the sampling rates on the listing before reading the count:

```
GET /v1/flows/{id}/traces?source=production&limit=20
```

The response's `sampling.request` is `0.2` — one run in five leaves a trace — so "only four traces for twenty runs" is expected, not a symptom. Pick the one whose `inputs.link` matches the complaint and open it:

```
GET /v1/flows/{id}/traces/{traceId}
```

- `output.summary` is `""` — consistent with the step log.
- `slotOutputs.pageText` is present and **empty** — the real "ran and emitted nothing" signal. The scrape step applied and emitted an empty page.
- `slotOutputs.summary` is absent — the step declared the slot and never wrote it, because it was skipped.

So the condition on `summarise` — "run only when `pageText` is present" — did its job. The question moved upstream: why did the scrape return nothing?

## 4. Compare with a good run

Open a trace from two days ago for the same site. `slotOutputs.pageText` is 4,000 characters. Same URL host, same handler config. The difference is outside the flow: the site now serves its article behind a consent widget the main-content pass keeps, and the extractor mistakes it for the page.

## 5. Decide, then go back to build

The fix is a handler config change — `excludeTags` on the scrape step — not a flow rewrite (`kipory-build`, `references/handlers/url.scrape.md`). Before changing it: checkpoint the flow, and store a test case whose assertion is `output-present` on `summary` for a known-good link (`kipory-prove`), so the next silent change surfaces as a failed test rather than a complaint.

## What this walk did not need

- **Guessing from the HTTP status.** A 200 with an empty body and a 502 are the same class of failure — an unproduced required output — differing only in whether the slot's type has a safe empty value.
- **The change set.** `GET /v1/runs/{runId}/change-set` would have shown one record write with an empty summary. Useful when the question is "what did it write", not "why".
- **Re-running the flow.** A preview would have cost money and, without `apply: false`, written the record again.
