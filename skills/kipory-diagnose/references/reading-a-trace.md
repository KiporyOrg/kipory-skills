# Reading a trace — a worked walk

<!-- field-ok: noPage — one project's step key in this worked example, not a platform field -->
<!-- field-ok: hasText — one project's step key in this worked example, not a platform field -->

The complaint: an endpoint that summarises a saved link started answering `422` with the code `PAGE_EMPTY` yesterday. Nothing was deployed. This walks the reads in the order that finds the cause fastest. Names below — the flow's steps `page`, `summarise`, `noPage` and the code `PAGE_EMPTY` — are one project's, not the platform's.

The flow, as written:

```yaml
steps:
  - key: page
    function: url.scrape
    with: { url: link }
  - key: hasText
    if:
      - test: { filled: page.content }
        steps:
          - key: summarise
            function: text.generate
            with: { prompt: "Summarise in three sentences: {{page.content}}" }
          - key: done
            return: { summary: summarise }
    else:
      steps:
        - key: noPage
          fail:
            {
              code: PAGE_EMPTY,
              message: "The page had no text to summarise.",
              status: 422,
            }
```

`url.scrape` may give nothing, and an empty page is still a value, so the save made the flow test it before reading it. That test is what answered the caller.

## 1. Find the run

The caller has the response's `x-request-id` header. That is the run id.

```
GET /v1/runs/{runId}
```

`run.lifecycle` is `settled` — a synchronous endpoint call leaves no invocation row, so its closing frame is what says it ended; with no closing frame it would read `unknown`, which means "no outcome recorded", not "still running" and not "finished". `closing.verdict` is `failed`, and `closing.failure.code` is the flow's own `PAGE_EMPTY`: no function failed — the flow chose to fail.

## 2. Read the timeline — it is complete

```
GET /v1/runs/{runId}/timeline
```

```
step-started         page        …
step-applied         page        durationMs 1840
step-not-run         summarise   notRun branch-not-taken
run-finished         failed
```

`summarise` did not run because the test on `page.content` did not hold, so the `else` ran and `noPage` ended the run. Nothing was skipped silently and nothing was filled in with an empty value. Had a step failed, `step-failed` would name it by `stepKey` and carry `detail.phase` and a `detail.message` cut to 500 characters; longer text (up to 2,000 characters) is in the trace's `stepOutputs.writes[].error` and, for a model step, its row in `GET /v1/ai-calls?project={nodeId}`.

## 3. Read the trace for the values

The timeline says _what_ happened; only the trace says _what the values were_. You already hold the run id, so open that run's trace directly:

```
GET /v1/runs/{runId}/trace
```

A 404 here is ordinary: the run was not sampled, or its trace expired. A record or asynchronous run in which a step failed keeps its trace whatever the rate, so a 404 there means it expired, was too large, or the rate is 0. Before reading it as a symptom, check the rates on the flow's listing:

```
GET /v1/flows/{id}/traces?source=production&limit=20
```

`sampling.request` of `0.2` means one run in five leaves a trace, so "only four traces for twenty runs" is expected. The listing is cursor-paged (older traces behind `after=<nextCursor>`) and carries no values — no `inputs`, `output` or `stepOutputs` — but every row names its `runId`, so the complaint's trace is the one whose `runId` is the run you already hold; otherwise choose by time, `recordId` or duration, and open one with `GET /v1/flows/{id}/traces/{traceId}` to see its values.

In this run's trace, `stepOutputs.writes` holds one entry, for `stepKey: page`, and its `content` is **empty** (`""`) — the real "ran and gave an empty answer" signal. There is no entry for `summarise`: it never ran. So the question moves upstream: why did the scrape return nothing?

## 4. Compare with a good run

Open a trace from two days ago for the same site. The `page` entry's `content` is 4,000 characters. Same URL host, same settings. The difference is outside the flow: the site now serves its article behind a consent widget the main-content pass keeps, and the extractor mistakes it for the page.

## 5. Decide, then go back to build

The fix is one setting — `excludeTags` on the `page` step — not a flow rewrite (`kipory-build`, `references/functions/url.scrape.md`): `POST /v1/flows/{id}/steps/edit` with `{set: page, field: "with.excludeTags", value: [...]}`. Before changing it: checkpoint the flow, and store an eval case whose assertion is `output-present` on `summary` for a known-good link in the flow's contract suite (`kipory-prove`), so the next silent change surfaces as a broken contract rather than a complaint.

## What this walk did not need

- **Guessing from the HTTP status.** `PAGE_EMPTY` says which test ended the run, not why its value was empty; the timeline and the trace say why.
- **The change set.** `GET /v1/runs/{runId}/change-set` would have shown nothing kept: a failed run writes nothing. Useful when the question is "what would it have written", not "why".
- **Re-running the flow.** A preview would have cost money and, without `apply: false`, written records again.
