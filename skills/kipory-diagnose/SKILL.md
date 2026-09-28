---
name: kipory-diagnose
description: Work out why a Kipory flow behaved the way it did — find the run, read its never-sampled step log, see what it wrote, open its trace to learn what each output slot actually held, and compare a good run with a bad one. Use when a flow returns the wrong thing, an endpoint 502s, a scheduled run failed, a record is stuck, output changed and nobody knows which step moved, or the user asks "what happened". Not for fixing the flow (that is build) and not for asserting it stays fixed (that is prove).
license: MIT
---

# Diagnose a run

Every execution is a **run** with one id, whatever started it — an endpoint call, a schedule, a record being processed, a preview. Three records describe it, and they answer different questions: the **step log** (which steps ran, in order, and how each ended — never sampled), the **change set** (what the run wrote), and the **trace** (what each output slot held — sampled per project and dropped on a TTL). The fact most people get wrong: **an empty trace list is not evidence the flow did not run.** Check the sampling rates before you interpret the count.

## Before the first call

- Get the run id. On a synchronous endpoint call it is the `x-request-id` response header. On an asynchronous one it is the 202 ack's `id`. On a schedule it is the occurrence's `invocation.id` from `GET /v1/schedules/{id}/runs`. On a preview it is `previewSessionId`, and that id reads only the change set (`GET /v1/runs/{runId}/change-set`): an inline preview writes no step log and no trace, so `…/steps` and `…/trace` answer 403 as for a run that does not exist, and the preview is not in `GET /v1/runs`. Its step detail is the preview response itself — `transcript`, `errors` and `branches`. A record-processing run has no published id — find it in `GET /v1/runs?project={nodeId}` with a `record` source.
- **An emitted event's `runId` and `correlationId` are not the run id.** The envelope carries the run's idempotency key — the caller's `Idempotency-Key` header when one was sent, otherwise a fresh id (the invocation id on an async call). To diagnose the run that emitted an event, find it in `GET /v1/runs?project=` by flow and time; for a trigger's fire, the run id is the `invocation.id` on `GET /v1/triggers/{id}/runs`.
- **A 403 `insufficient_project_role … VIEWER` on a run read usually means "no such run", not a role problem.** Every run read resolves its project from the run's own step log, and an id with none — a wrong id, an inline preview, a reaped run, an async invocation that failed before its run started (the ack's `statusPath` says why, e.g. `INVOKE_INPUTS_UNCOVERED`) — collapses to that one answer.
- Every read here is VIEWER and answers on the api host.

## The sequence

```
GET /v1/runs?project={nodeId}&window=24h           recent runs, newest first — flow, trigger, lifecycle, closing
GET /v1/runs/{runId}                               one run and how many attempts it took
GET /v1/runs/{runId}/steps                         the ordered step log: run started / finished / aborted; step started, applied, skipped, not reached, no-op, failed, warned; cache hit or miss; log truncated
GET /v1/runs/{runId}/change-set                    what it wrote: captured · applied · rejected · discarded
GET /v1/runs/{runId}/flow-snapshots                the graph version that actually ran
GET /v1/runs/{runId}/trace                         the run's values: inputs, output, slotOutputs, stepOutputs (a queued preview writes it live)
GET /v1/flows/{id}/traces?source=production&limit=20   the sampled traces — read the rates in the response first
GET /v1/flows/{id}/traces/{traceId}                one trace: inputs, output, slotOutputs, stepOutputs
```

A product call that came back 4xx may never have started a run at all — a bad credential, a body the contract refused, a limit. Those are logged apart, with no run id: `GET /v1/rejected-requests?project={nodeId}`, narrowed by `class` (`auth`, `validation`, `not-found`, `limit`, `other`) or `endpoint`.

Start with the step log — it is complete and it names the failing **step**, but not why: a `step_failed` row carries only `tries` (and `cacheHit` / `rateLimitWaitMs` when they apply) — no phase, no error text. The phase is in a sync endpoint's `502` body (`details.phase`) and in the preview's `errors`; the error text is in the trace's `stepOutputs[].error` (when the run was sampled) and, for a model step, in `GET /v1/projects/{nodeId}/ai-calls?outcome=error&origins=all`. Reach for the trace when you need the **values** a step emitted, which is the one thing only a trace carries.

## Reading a trace

1. **Start from `output`.** If it is missing a slot the caller declared, you have your failure — also the usual cause of a 502 through an endpoint.
2. **Then `slotOutputs`.** It is keyed by **output slot**, one level — not by skill, not nested. A slot that is present and empty (`[]`, `""`) is the real "ran and emitted nothing" signal. An absent slot tells you nothing: the step may have been skipped, or may declare no output slot at all — a branch-selecting step is exactly such a node.
3. **Read `stepOutputs` beside it** when you need to know which step wrote a slot. Within one flow a slot name already names a skill; this earns its place in the two cases where it does not — a sub-flow, and a fan-out branch where two steps write one slot name and `slotOutputs` keeps only the last. Every `superseded` entry is a write that is not in `slotOutputs` at all.
4. **Compare a good run to a bad one.** The fastest way to find a step whose behaviour changed. Check `truncated` on the listing first: true means older runs exist beyond this window and **there is no cursor** — `limit` is a ceiling, 100 at most. Raise it or narrow with `recordId`.
5. **Check `durationMs`** if the complaint is slowness — null means the writer did not time itself, not that the run was instant.

Values are truncated at write time — embeddings reduced to a head marker, long lists capped, anything over the row budget replaced by a `dropped-oversized` marker naming the size. You are reading evidence, not a replay.

## What will bite you

- **Three silent things stand between a run and a trace.** _Sampling_: per project, per path — request-driven runs and record processing each have a rate, and the listing returns them; at `0.05` a flow that ran two hundred times leaves about ten traces, at `0` none while working perfectly; `eval` and `manual` traces are always captured. _Expiry_: seven days by default; a 404 on yesterday's id is the reaper. _The row budget_: a run whose values do not fit even after truncation is dropped **whole**, indistinguishable from not being sampled.
- **`null` and `0` in the sampling rates mean opposite things.** Null inherits the deployment default — tracing is probably on. Zero records nothing.
- **A trace has no status field.** Failure shows up as a missing or wrong `output`, not a flag. `stepOutputs: null` means that writer recorded no steps; an empty array means it recorded and there were none.
- **The step log is complete where the trace is not.** `paging.total` counts recorded steps and `truncated` says events happened past the writer's bound; both can be true. `after` on the step log means _later_; on the runs list it means _older_. `run_aborted` is an ending from outside, not a failure of the flow. `step_not_reached` means the step's branch never materialized — not a skip. `log_truncated` means rows past the per-run cap were dropped: an incomplete timeline, not a short one. A `step_skipped` with no `data` was stopped by its condition or a missing required input, and the row does not say which; only a projection miss carries `data`.
- **`closing: null` on a run is three facts at once** — in flight, crashed with its buffer, or reaped — and `lifecycle: unknown` means no outcome was recorded, never finished — and it is what every synchronous endpoint call reads, since that path leaves no invocation row; read its `closing` instead. `flow.name` is a live read, so a renamed flow reports its new name on an old run; `flow: null` means the flow is gone. Only `flow-snapshots` says what graph actually ran.
- **The runs list has no status or trigger filter**, deliberately. `declaredSteps` is a floor: fan-out branches and sub-flows are uncounted, so `stepsStarted` can exceed it.
- **Read `source`, not `trigger`, for what started a run.** `source.kind` is `schedule`, `trigger`, `endpoint`, `record`, `request`, `preview` or `unknown`, with `targetId`. `trigger` is the stored vocabulary: a schedule's or a trigger's fire is stored as `endpoint` with id `schedule:<id>` or `trigger:<id>`.
- **A slow sync call is not always a slow model.** A `text.generate` step (and the other ingest-phase steps) queues on the ingest worker, and its `durationMs` in the step log counts the queue wait. `latencyMs` on the matching row of `GET /v1/projects/{nodeId}/ai-calls` is the model's own time; the difference is queue. A sync endpoint that 504s at its `syncTimeoutMs` (30 s by default) on a busy worker needs a higher timeout or an async endpoint, not a faster model.
- **Records stuck `indexState: never` or a `vectorProgress` that does not move is an embedding failure you will not see on the record.** Read `GET /v1/projects/{nodeId}/ai-calls?origins=projection&outcome=error` — a provider quota error there is retried three times within about fifteen seconds, then only by the daily re-index sweep (08:00 UTC), and never surfaces anywhere else.
- **`GET /v1/runs/{runId}/spend` has no 404.** A run that spent nothing and one whose spend aged out both return an empty breakdown; `skillId: null` is the unattributed bucket.
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
| `references/api/rejected-requests.md` | the product endpoint calls refused before any run started — by class, by endpoint          |

The judgment for what a step is allowed to emit is `kipory-build`'s flows pack; the error table for a symptom that arrived over HTTP is `kipory-expose`'s consumer reference.

## Then

`kipory-build` to fix the step the log named, and to checkpoint before you do. `kipory-prove` to pin the corrected behaviour so it stays fixed. `kipory-operate` when a scheduled run never fired — that is a schedule question, and the schedule's own history is not sampled or expired the same way. `kipory-secrets` when the failing phase names a missing vendor key.
