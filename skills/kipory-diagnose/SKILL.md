---
name: kipory-diagnose
description: Work out why a Kipory flow behaved the way it did — find the run, read its never-sampled step log, see what it wrote, open its trace to learn what each output slot actually held, and compare a good run with a bad one. Use when a flow returns the wrong thing, an endpoint 502s, a scheduled run failed, a record is stuck, output changed and nobody knows which step moved, or the user asks "what happened". Not for fixing the flow (that is build) and not for asserting it stays fixed (that is prove).
license: MIT
---

# Diagnose a run

Every execution is a **run** with one id, whatever started it — an endpoint call, a schedule, a record being processed, a preview. Three records describe it, and they answer different questions: the **step log** (which steps ran, in order, and how each ended — never sampled), the **change set** (what the run wrote), and the **trace** (what each output slot held — sampled per project and dropped on a TTL). The fact most people get wrong: **an empty trace list is not evidence the flow did not run.** Check the sampling rates before you interpret the count.

## Before the first call

- Get the run id. On a synchronous endpoint call it is the `x-request-id` response header. On an asynchronous one it is the 202 ack's `id`. On a schedule it is the occurrence's `invocation.id` from `GET /v1/schedules/{id}/runs`. On a preview it is `previewSessionId`, and that id reads only the change set (`GET /v1/runs/{runId}/change-set`): an inline preview writes no step log and no trace, so `…/steps` and `…/trace` answer 404 as for a run that does not exist, and the preview is not in `GET /v1/runs`. Its step detail is the preview response itself — `transcript`, `errors` and `branches`. A record-processing run has no published id — find it in `GET /v1/runs?project={nodeId}` with a `record` source.
- **An emitted event's `runId` and `correlationId` are not the run id.** The envelope carries the run's idempotency key — the caller's `Idempotency-Key` header when one was sent, otherwise a fresh id (the invocation id on an async call). To diagnose the run that emitted an event, find it in `GET /v1/runs?project=` by flow and time; for a trigger's fire, the run id is the `invocation.id` on `GET /v1/triggers/{id}/runs`.
- **A 404 `NOT_FOUND` on a run read means "no run you can see".** Every run read resolves its project from the run's own step log, and an id with none — a wrong id, an inline preview, a reaped run, an async invocation that failed before its run started (the ack's `statusPath` says why, e.g. `INVOKE_INPUTS_UNCOVERED`) — collapses to that one answer, and so does a run in a project your key does not reach. A 403 is a real role problem: your key reaches no project at all, or it can see the run and its role is too low (`details.requiredRole` names the floor).
- Every read here is VIEWER and answers on the api host.

## The sequence

```
GET /v1/runs?project={nodeId}&window=24h           recent runs, newest first — flow, trigger, lifecycle, closing
GET /v1/runs/{runId}                               one run and how many attempts it took
GET /v1/runs/{runId}/steps                         the ordered step log: run-started / run-finished / run-aborted; step-started, step-applied, step-skipped, step-not-reached, step-no-op, step-failed, step-warned; cache-hit or cache-miss; log-truncated
GET /v1/runs/{runId}/change-set                    what it wrote: captured · applied · rejected · discarded
GET /v1/runs/{runId}/flow-snapshots                the graph version that actually ran
GET /v1/runs/{runId}/trace                         the run's values: inputs, output, slotOutputs, stepOutputs (a queued preview writes it live)
GET /v1/flows/{id}/traces?source=production&limit=20   the sampled traces, each with its runId, cursor-paged — read the rates in the response first
GET /v1/flows/{id}/traces/{traceId}                one trace: runId, inputs, output, slotOutputs, stepOutputs
```

A product call that came back 4xx may never have started a run at all — a bad credential, a body the contract refused, a limit. Every 4xx a product endpoint answered is logged apart: `GET /v1/rejected-requests?project={nodeId}`, narrowed by `class` (`auth`, `validation`, `not-found`, `limit`, `other`) or `endpointKey`, newest first and cursor-paged (walk `after=<nextCursor>` until it is `null`); each row's `credential` is `api-key`, `session` or `none`. A refusal raised by the run itself — `422 FLOW_OUTPUT_MISSING`, an `$assert` — is listed there too, and its `requestId` is the run's id: try it on `GET /v1/runs/{runId}/steps` before concluding no run started.

Start with the step log — it is complete, it names the failing **step**, and its `step-failed` row says why, under `detail`: `detail.phase` (`handler-error`, `condition-error`, `fanout-error`, `sub-flow-failed`, …) and `detail.message`, the step's error text cut to 500 characters (an ellipsis marks the cut; a step that failed the same way earlier in the run carries `detail.messageRepeated: true` instead), beside `detail.tries` (only when the step's job was tried more than once) and `detail.cacheHit` / `detail.rateLimitWaitMs` when they apply. For longer text read the trace's `stepOutputs[].error` (up to 2,000 characters, when the run was sampled) or, for a model step, `GET /v1/ai-calls?project={nodeId}&outcome=error&origins=all`. Reach for the trace when you need the **values** a step emitted, which is the one thing only a trace carries.

When there is no trace to read:

- **A record's processing run that was not sampled:** replay it on the same record without writing — `POST /v1/flows/{id}/preview/stream` with `{ "input": { "kind": "record", "recordId": "<id>" }, "apply": false }`. Each `skill-ended` frame carries the `slotBag`, the slot values at that point. It bills like any preview.
- **A refused synchronous call:** the run's id is the response's `x-request-id`. Its step log names the step and why, and `GET /v1/runs/{runId}/flow-snapshots` the steps that ran, even when no trace was kept.
- **To practise on a failure:** set one step's `timeoutMs` to `1` on a copy of the flow and preview it — the step fails on its time limit and leaves a failed run to read.

## Reading a trace

1. **Start from `output`.** If it is missing a slot the caller declared, you have your failure — also the usual cause of a 502 through an endpoint.
2. **Then `slotOutputs`.** It is keyed by **output slot**, one level — not by skill, not nested. A slot that is present and empty (`[]`, `""`) is the real "ran and emitted nothing" signal. An absent slot tells you nothing: the step may have been skipped, or may declare no output slot at all — a branch-selecting step is exactly such a node.
3. **Read `stepOutputs` beside it** when you need to know which step wrote a slot. Within one flow a slot name already names a skill; this earns its place in the two cases where it does not — a sub-flow, and a fan-out branch where two steps write one slot name and `slotOutputs` keeps only the last. Every `superseded` entry is a write that is not in `slotOutputs` at all.
4. **Compare a good run to a bad one.** The fastest way to find a step whose behaviour changed. The trace listing is cursor-paged, newest first: `nextCursor` set means older traces exist, so pass `after=<nextCursor>` (`limit` is 100 at most per page) or narrow with `recordId`. Each trace names its `runId`, so a trace and the run's step log join directly.
5. **Check `durationMs`** if the complaint is slowness — null means the writer did not time itself, not that the run was instant.

Values are truncated at write time — embeddings reduced to a head marker, long lists capped, anything over the row budget replaced by a `dropped-oversized` marker naming the size. You are reading evidence, not a replay.

## What will bite you

- **Three silent things stand between a run and a trace.** _Sampling_: per project, per path — request-driven runs and record processing each have a rate, and the listing returns them; at `0.05` a flow that ran two hundred times leaves about ten traces, at `0` none while working perfectly; `eval` and `manual` traces are always captured. _Expiry_: seven days by default; a 404 on yesterday's id is the reaper. _The row budget_: a run whose values do not fit even after truncation is dropped **whole**, indistinguishable from not being sampled.
- **`null` and `0` in the sampling rates mean opposite things.** Null inherits the deployment default — tracing is on, but sampled: by default about half of request-driven runs and a tenth of record-processing runs keep a trace. Zero records nothing. The rates are the platform operator's to set; no project role or key can change them. A run that was not sampled answers `404 No trace is retained for run …`; its step log and change set are still there, and a preview of the same inputs answers the slot values in its own response.
- **A trace has no status field, and a whole `output` does not mean the run succeeded.** The flag is per step: `stepOutputs.steps[]` with `kind: "failed"` and its `error`. A step that fails after the bound slots were written — an `event.emit`, a late write — leaves `output` complete on a run that answered 502, so read the steps (or the step log) before `output`. Under `fail-run` the steps that do not depend on the failed one still run and log `step-applied`; its dependents skip. The first `step-failed` row is the cause, and a later `step-applied` is not evidence the run recovered. `stepOutputs: null` means that writer recorded no steps; an empty array means it recorded and there were none.
- **The step log is complete where the trace is not.** `paging.total` counts recorded steps and `truncated` says events happened past the writer's bound; both can be true. `after` on the step log means _later_; on the runs list it means _older_. `run-aborted` is an ending from outside, not a failure of the flow. `step-not-reached` means the step's branch never materialized — not a skip. `log-truncated` means rows past the per-run cap were dropped: an incomplete timeline, not a short one. A `step-skipped` with no `detail` was stopped by its condition or a missing required input, and the row does not say which; only a projection miss carries `detail`.
- **`closing: null` on a run is three facts at once** — in flight, crashed with its buffer, or reaped — and `lifecycle: unknown` means no outcome was recorded, never finished — and it is what every synchronous endpoint call reads, since that path leaves no invocation row; read its `closing` instead. `flow.label` is a live read, so a relabelled flow reports its new label on an old run; `flow: null` means the flow is gone. Only `flow-snapshots` says what graph actually ran — its steps only: the flow's `outputBinding` is not in it, so a binding fault is `GET /v1/flows/{id}/health`'s to name.
- **The runs list has no status or trigger filter**, deliberately. `declaredSteps` is a floor: fan-out branches and sub-flows are uncounted, so `stepsStarted` can exceed it.
- **Read `source`, not `trigger`, for what started a run.** `source.kind` is `schedule`, `trigger`, `endpoint`, `record`, `request`, `preview` or `unknown`, with `targetId`. A synchronous or streaming endpoint call reads `request` with `targetId: null` — it names no endpoint; only an async endpoint call reads `endpoint`, with the endpoint's key. `trigger` (and `detail.trigger.kind` on the step log's `run-started`) is the stored vocabulary: `request` for a sync or streaming call, and `endpoint` for an async call and for a schedule's or a trigger's fire, whose id is `schedule:<id>` or `trigger:<id>`.
- **A slow sync call is not always a slow model.** A `text.generate` step (and the other ingest-phase steps) queues on the ingest worker, and its `durationMs` in the step log counts the queue wait. `latencyMs` on the matching row of `GET /v1/ai-calls?project={nodeId}` is the model's own time; the difference is queue. A sync endpoint that 504s at its `syncTimeoutMs` (30 s by default) on a busy worker needs a higher timeout or an async endpoint, not a faster model.
- **Records stuck `indexState: never` or a `vectorProgress` that does not move is an embedding failure you will not see on the record.** Read `GET /v1/ai-calls?project={nodeId}&origins=projection&outcome=error` — a provider quota error there is retried three times within about fifteen seconds, then only by the daily re-index sweep (08:00 UTC), and never surfaces anywhere else.
- **`GET /v1/runs/{runId}/spend` answers an empty breakdown, not a 404, for a real run.** A run that spent nothing and one whose spend aged out both return an empty breakdown; an id with no step log — an unknown id, or an inline preview's `previewSessionId` — is a 404 like the other run reads, and a preview's cost is read from `GET /v1/projects/{nodeId}/usage/events?scope=design` instead; `skillId: null` is the unattributed bucket.
- **A 402 is not a flow problem and leaves no run to read.** Three gates produce it — the wallet, a person's own ceiling, the project's design-time ceiling — and the remedies do not substitute. Branch on the error `code` (`kipory-operate`).
- **A flow that saved with blocking issues still runs**, because nothing re-checks the graph at run time; its trace is usually the fastest way to see what the diagnostic predicted. A flow that would not save never ran — that is `kipory-build`.
- **To reproduce, take a trace's `inputs` to a preview** — but a preview is not a rehearsal: it bills and **applies the writes it stages** unless `apply: false`. Reproducing a bad run against a live project without that flag writes real records a second time.
- **`GET /v1/activity/stream?project=` tells you that something moved**, in five domains — eval runs, flow runs, schedule runs, endpoint calls, record ingestion — and carries no ids at all. It is a signal to go read, not a feed of runs.

## References

| File                                  | What it answers                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `references/reading-a-trace.md`       | a worked walk from a wrong answer to the step that produced it                             |
| `references/api/runs.md`              | the runs list, one run, steps, the step stream, change set, snapshots, the activity stream |
| `references/api/traces.md`            | the trace list and one trace                                                               |
| `references/api/rejected-requests.md` | the product endpoint calls that answered 4xx — by class, by endpoint                       |

The judgment for what a step is allowed to emit is `kipory-build`'s flows pack; the error table for a symptom that arrived over HTTP is `kipory-expose`'s consumer reference.

## Then

`kipory-build` to fix the step the log named, and to checkpoint before you do. `kipory-prove` to pin the corrected behaviour so it stays fixed. `kipory-operate` when a scheduled run never fired — that is a schedule question, and the schedule's own history is not sampled or expired the same way. `kipory-secrets` when the failing phase names a missing vendor key.
