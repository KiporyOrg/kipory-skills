---
name: kipory-diagnose
description: Work out why a Kipory flow behaved the way it did — find the run, read its never-sampled timeline, see what it wrote, open its trace to learn what each output slot actually held, and compare a good run with a bad one. Use when a flow returns the wrong thing, an endpoint 502s, a scheduled run failed, a record failed or is stuck in processing, output changed and nobody knows which action moved, or the user asks to debug a run, see its logs, or "what happened". Not for fixing the flow (kipory-build), not for asserting it stays fixed (kipory-prove), and not for re-running or correcting the record once the cause is known (kipory-data).
license: MIT
---

# Diagnose a run

Every execution is a **run** with one id, whatever started it — an endpoint call, a schedule, a record being processed, a preview. Three records describe it, and they answer different questions: the **timeline** (which actions ran, in order, and how each ended — never sampled), the **change set** (what the run wrote), and the **trace** (what each output slot held — sampled per project and dropped on a TTL). The fact most people get wrong: **an empty trace list is not evidence the flow did not run.** Check the sampling rates before you interpret the count.

## Before the first call

- Get the run id. Where it is depends on what started the run:

  | Started by                    | The run id is                                                                                                |
  | ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
  | a synchronous endpoint call   | the `x-request-id` response header                                                                           |
  | an asynchronous endpoint call | the 202 ack's `id`                                                                                           |
  | a schedule                    | the occurrence's `invocation.id` on `GET /v1/schedules/{id}/runs`                                            |
  | a trigger                     | the decision's `invocation.id` on `GET /v1/triggers/{id}/runs`                                               |
  | a queued preview              | the `runId` that `POST /v1/flows/{id}/preview-runs` answers — a run like any other once the worker starts it |
  | an inline preview             | `previewSessionId`, which reads only the change set                                                          |
  | a record being processed      | the `runId` of an event it emitted; otherwise start from the record, below                                   |

- **Looking for what failed, not for one run: ask the list.** `GET /v1/failed-runs?project={nodeId}` is every unattended run — a schedule's, a trigger's, an asynchronous endpoint call, a record's processing — whose latest close is `failed` or `partial`, newest first, each with its `runId`, its `subject` and its `closing`. Narrow with `subjectKind` and `subjectKey` (`table` with the table's key finds failed processing runs), `class` or `verdict` (`kipory-operate`'s `references/api/failures.md`).
- **A record that failed or is stuck: read the record first.** `GET /v1/records/{id}` carries `status`, `statusError` (what went wrong, on a failed record), `failure` (on a failed record: how its latest processing run failed — `class`, `owner`, `retryable`, `attempt`, `actionKey` — the shape a run read serves as `closing.failure`), `processing { attempts, lastFailureClass }` (how many times it was sent to processing, and the class of its last failure — kept after a later success) and, on a `pending` record, `pendingRun`: `queued` means a processing job is waiting or running, `unqueued` means nothing will process it until `POST /v1/records/{id}/reprocess` (`kipory-data`), `unreadable` means the queue could not be read. Then find the run: `GET /v1/runs?project={nodeId}&flowKey=<the type's processing flow>` and take the row whose `source.kind` is `record` and `source.targetId` is the record's id. The list filters by flow and time, not by record.
- **An inline preview leaves no run.** `POST /v1/flows/{id}/preview` writes no timeline and no trace, so `…/timeline`, `…/trace` and `…/spend` answer 404 for its `previewSessionId` as for a run that does not exist, and it is not in `GET /v1/runs`. Its action detail is the preview response itself — `transcript`, `errors` and `branches`. When you want a previewed run you can read afterwards, queue it instead.
- **A logged event's `runId` is the run id.** An event in `GET /v1/project-events` carries the id of the run that emitted it — the one `GET /v1/runs/{runId}` reads and a run's `startedRuns` lists. Its `correlationId` is not: that is the run's idempotency key, the caller's `Idempotency-Key` header when one was sent. A `run`-scoped event on a live stream carries the idempotency key as its `runId` too; find that run in `GET /v1/runs?project=` by flow and time. For a trigger's fire, the run id is the `invocation.id` on `GET /v1/triggers/{id}/runs`.
- **A 404 `NOT_FOUND` on a run read means "no run you can see".** Every run read except the change set finds its project through the run's own timeline, and an id with none — a wrong id, an inline preview, a reaped run, an async invocation that failed before its run started (the ack's `statusPath` says why, e.g. `INVOKE_INPUTS_UNCOVERED`) — collapses to that one answer, and so does a run in a project your key does not reach. A 403 is a real role problem: your key reaches no project at all, or it can see the run and its role is too low (`details.requiredRole` names the floor).
- Every read here is VIEWER and answers on the api host.

## The sequence

```
GET /v1/runs?project={nodeId}&flowKey={key}&window=24h   recent runs, newest first — flow, source, lifecycle, closing; `flowKey` is optional (runs that called it as a sub-flow count), an unknown one is a 404, not an empty page; `record={id}` for one record's runs
GET /v1/runs/{runId}                               one run and how many attempts it took
GET /v1/runs/{runId}/timeline                         the ordered timeline: run-started / run-finished / run-aborted; action-started, action-applied, action-skipped, action-not-reached, action-no-op, action-failed, action-warned; cache-hit or cache-miss; log-truncated
GET /v1/runs/{runId}/change-set                    what it wrote: captured · applied · rejected · discarded
GET /v1/runs/{runId}/flow-snapshots                the graph version that actually ran
GET /v1/runs/{runId}/trace                         the run's values: inputs, output, slotOutputs, actionOutputs (a queued preview writes it live)
GET /v1/flows/{id}/traces?source=production&limit=20   the sampled traces, each with its runId, cursor-paged — read the rates in the response first
GET /v1/flows/{id}/traces/{traceId}                one trace: runId, inputs, output, slotOutputs, actionOutputs
POST /v1/flows/{id}/preview-runs                   { input, apply: false } → 202 { runId }: a previewed run every read above answers, with nothing written (ADMIN)
```

A product call that came back 4xx may never have started a run at all — a bad credential, a body the contract refused, a limit. Every 4xx a product endpoint answered is logged apart: `GET /v1/rejected-requests?project={nodeId}`, narrowed by `class` (`auth`, `validation`, `not-found`, `limit`, `other`) or `endpointKey`, newest first and cursor-paged (walk `after=<nextCursor>` until it is `null`); each row's `credential` is `api-key`, `session` or `none`. A refusal raised by the run itself — `422 FLOW_OUTPUT_MISSING`, an `$assert` — is listed there too, and its `requestId` is the run's id: try it on `GET /v1/runs/{runId}/timeline` before concluding no run started. To learn what a refusal's `code` (or its `details.reason`) means and what to do about it, look it up in `kipory-connect`'s `references/refusal-codes.md`.

A run that sends mail closes when its message is committed, not when it is delivered, so a run can read `succeeded` while a message it sent never went. `messages` on `GET /v1/runs/{runId}` counts the messages the run committed (`owed`) and how many of them were refused, failed or bounced (`failed`). `GET /v1/mail-messages?project={nodeId}&run={runId}` lists them, newest first and cursor-paged: each row carries its `status` (`queued`, `retrying`, `sent`, `refused`, `failed`, `bounced`) and, once it failed or is being retried, the `reason`, whose `fault` it is (`platform`, `sender` or `recipient`) and the reason in a sentence (`message`). `sent` means the mail relay accepted the message, which is not proof it reached an inbox. `GET /v1/mail-messages/{id}` reads one message by its id. A row says who the message was for and never holds its subject or body.

**Read how the run closed before its actions.** `closing` on `GET /v1/runs/{runId}` (and on each row of `GET /v1/runs`) is the run's one closing record:

- **`closing.verdict` has three values.** `succeeded`; `failed` — nothing it wrote was kept; `partial` — it finished and kept its changes after carrying on past a failure it was set to tolerate, and `closing.absorbed { actions, calls, branches }` counts those: actions under `"onFailure": "continue"`, sub-flow calls under it, and fan-out branches within the fan-out's tolerance. A tolerated branch or a continued sub-flow call is dropped whole: nothing it staged is applied.
- **`closing.failure` says whose failure it was.** `class` is one of `logic` (the flow's own expression, input or data rule), `definition` (the flow cannot be run as stored), `limit` (a spend cap, the paying account's standing, an allowance), `vendor` (a site or service the flow called), `platform-busy`, `platform-interrupted`, `platform-fault` (the platform's own: no worker was free, the worker stopped, its engine, database or queue failed), `platform-account` (one of the platform's own accounts at a vendor or model provider is out of credit, refused its key, or throttled it; nothing in the flow needs changing) and `cancelled`. `owner` is who has to act — `customer`, `vendor`, `platform` or `caller` — and `retryable` whether the same run, unchanged, could end differently. `actionKey`, `functionKey`, `phase` and `code` name the action when one action is to blame. When none is, `cause` says what closed the run; a run whose changes were refused when they were saved (every action succeeded, the run still failed) carries `cause` — `natural-key-collision`, `write-refused`, `unique-violation`, `precondition-conflict` (an unattended run is started again; a direct call is told to retry) — and `refusedWrite`, which names what it can: for a refused write its `actionKey` and, for a create, its `tableKey`, plus the `holderRecordId` that already holds a taken key; for a conflict the `recordId` another run wrote after the `readByActionKey` action read it. The timeline's `run-finished` row carries the same `failure`. A schedule's or trigger's run carries the same record as `invocation.failure`.
- **`waiting` means the run has not failed.** When an attempt of an unattended run ends `platform-busy`, `platform-interrupted`, `platform-fault`, or `platform-account` from a throttled account (`rate-limited`), the platform starts the run again: same run id, `status` back to `pending`, no `closing`, and `waiting { reason, attempt, notBefore }`. Nothing the failed attempt staged was saved. At most three attempts <!-- count: run-attempts --> are made; only the last attempt's failure closes the run `failed`. A failure of the flow, a vendor or a limit is never run again, nor is a platform account out of credit or with its key refused (`platform-account`, `retryable: false`): that run fails at once. `attempts` on each run of `GET /v1/runs` and on `GET /v1/runs/{runId}` counts them.
- **Waiting for a worker is not a failure.** A queued action's time limit counts the time its job ran. An action fails for the wait only when no worker took its job for five minutes: class `platform-busy`, not charged, and the run is started again.
- **A later attempt runs the flow the run first started with** — not the flow as it is stored when that attempt starts. A flow edit saved between two attempts, in the run's own flow or a sub-flow it calls by a fixed reference, does not change a run already under way; so a run that keeps failing after you fixed its flow is finishing on the old definition, and the next run is the test of the fix.
- **A run keeps the flow versions it loaded.** A record's, a schedule's, a trigger's or an async endpoint's run reads its own flow and every flow it can call when it starts; a synchronous or streaming endpoint call, a preview and an eval case read a called flow when they first call it. Either way every later call in the run, in every branch, runs that same version, and a run started again runs the versions its first start read. A flow you apply while a run is under way changes only the runs that load it afterwards, so the first results after an apply may come from a run that started before it. Before reading a run's output as proof of an apply, check `flowVersions` on its `run-finished` row: it maps every flow the run ran, called flows included, to a digest, and `GET /v1/runs/{runId}/flow-snapshots` shows the graph each digest stands for.
- **`platform-interrupted` around a deployment is expected.** A worker being replaced lets its runs finish for up to five minutes, then interrupts what is left and the platform starts those again; during that time queued runs wait, up to six minutes, without failing.

Then the timeline — it is complete, and it names the failing **action**.

Each of these is explained in [references/reading-the-timeline.md](references/reading-the-timeline.md). Read the entry for what the timeline shows you:

- Which action a row is about.
- Why an action failed.
- `platform-fault` is not yours to fix.
- An action that produced nothing without failing.
- "Could not look" and "looked, found nothing" are two kinds.
- Which action came back empty.
- A saved answer keeps its warnings.
- A flow cannot read a warning.
- Longer error text.
- A failed run with no failed action failed at apply.

Reach for the trace when you need the **values** an action emitted, which is the one thing only a trace carries.

When there is no trace to read:

- **A record's processing run that was not sampled:** replay it on the same record without writing — `POST /v1/flows/{id}/preview/stream` with `{ "input": { "kind": "record", "recordId": "<id>" }, "apply": false }`. Each `action-ended` frame carries the `slotBag`, the slot values at that point. It bills like any preview.
- **Any run you can reproduce:** queue a preview of the same inputs — `POST /v1/flows/{id}/preview-runs` with `{ "input": { "kind": "slots", "inputs": { … } }, "apply": false }`, where `inputs` is the bad run's input bag keyed by slot (a trace's `inputs`, when one was kept) — and read the new run's `/trace`, `/timeline` and `/spend`. A queued preview of the project's own flow writes its trace as it runs (a platform flow's writes none), and with `apply: false` nothing it stages is applied.
- **The next runs, recorded whole:** `PATCH /v1/flows/{id}/value-recording` with `{ "until": "<ISO time>" }` makes every run this flow starts keep its trace until then, whatever the sampling; `until` may be at most as far ahead as traces are kept (`kept-for.trace-days`, 7 days by default). A run of it called from another flow (`flow.invoke`) keeps its trace only when its caller's run does, and a project whose trace rate staff set to 0 keeps none. `{ "until": null }` stops, and `GET /v1/flows/{id}/value-recording` says whether it is on. It changes what runs keep, never what they do (EDITOR).
- **A failed record run:** `failedInputs` on `GET /v1/runs/{runId}` is what each failed action was handed when it threw, keyed by the input's name (its projection name, else the slot it read), for a run's first 20 failures. Long values are cut, and a field whose name contains key, token, secret, auth, password, credential, cookie, bearer, jwt, session or signature reads `[redacted]` at any depth, whatever it holds (a `keywords` field too). It is empty for any run that did not process a record (a request, endpoint, schedule, trigger or preview run), for an action that failed before its function was called, and for a failure of the whole run (a timeout, a refusal at commit). They are recorded values, under the same two rules as a trace: none are kept while the project's recording of record runs is turned off (whatever a flow's "record every run" says), and they are cleared once the run is older than recorded values are kept (7 days by default) — `failedInputs` then reads empty, though the run and its failure stay.
- **A refused synchronous call:** the run's id is the response's `x-request-id`. Its timeline names the action and why, and `GET /v1/runs/{runId}/flow-snapshots` the actions that ran, even when no trace was kept.
- **To practise on a failure:** set `timeoutMs` to `1` on a fetch or model action of a copy of the flow and queue a preview (`POST /v1/flows/{id}/preview-runs`, `apply: false`): the action fails on its time limit and the run is there to read. An inline preview leaves no run, and a 1 ms limit never fires on an action that computes in-process, such as `text.interpolate`.

## Reading a trace

1. **Start from `output`.** If it is missing a slot the caller declared, you have your failure — also the usual cause of a 502 through an endpoint.
2. **Then `slotOutputs`.** It is keyed by **output slot**, one level — not by action, not nested. A slot that is present and empty (`[]`, `""`) is the real "ran and emitted nothing" signal. An absent slot tells you nothing: the action may have been skipped, or may declare no output slot at all — a branch-selecting action is exactly such a node.
3. **Read `actionOutputs` beside it** when you need to know which action wrote a slot. Within one flow a slot name already names an action; this earns its place in the two cases where it does not — a sub-flow, and a fan-out branch where two actions write one slot name and `slotOutputs` keeps only the last. Every `superseded` entry is a write that is not in `slotOutputs` at all.
4. **Compare a good run to a bad one.** The fastest way to find an action whose behaviour changed. The trace listing is cursor-paged, newest first: `nextCursor` set means older traces exist, so pass `after=<nextCursor>` (`limit` is 100 at most per page) or narrow with `recordId`. Each trace names its `runId`, so a trace and the run's timeline join directly.
5. **Check `durationMs`** if the complaint is slowness — null means the writer did not time itself, not that the run was instant. Each action's own `durationMs` is on its row in `GET /v1/runs/{runId}/timeline`, and a run that started late carries `queued` on `GET /v1/runs/{runId}`: how long it waited before starting, and what held it.

Values are truncated at write time — embeddings reduced to a head marker, long lists capped, anything over the row budget replaced by a `dropped-oversized` marker naming the size. You are reading evidence, not a replay.

## What will bite you

Each of these is a trap with its explanation and remedy in [references/pitfalls.md](references/pitfalls.md). Read the entry before you build on the thing it names:

- Working around a problem in silence.
- Three silent things stand between a run and a trace.
- `null` and `0` in the sampling rates mean opposite things.
- A trace has no status field, and a whole `output` does not mean the run succeeded.
- The timeline is complete where the trace is not.
- `closing: null` on a run is three facts at once
- The runs list has no status or trigger filter
- Read `source`, not `trigger`, for what started a run.
- A slow sync call is not always a slow model.
- Records stuck `indexState: never` or a `vectorProgress` that does not move is an embedding failure you will not see on the record.
- `GET /v1/runs/{runId}/spend` answers an empty breakdown, not a 404, for a real run.
- `credits: 0` on an action is not always a free action.
- A 402 is not a flow problem, and at admission it leaves no run to read.
- Which actions processing actually runs is a read.
- A flow that saved with blocking issues still runs
- To reproduce, take a trace's `inputs` to a preview — with `apply: false`, or it writes again
- `GET /v1/activity/stream?project=` tells you that something moved

## References

| File                                  | What it answers                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `references/reading-a-trace.md`       | a worked walk from a wrong answer to the action that produced it                                 |
| `references/api/runs.md`              | the runs list, one run, actions, the timeline stream, change set, snapshots, the activity stream |
| `references/api/traces.md`            | the trace list and one trace                                                                     |
| `references/api/rejected-requests.md` | the product endpoint calls that answered 4xx — by class, by endpoint                             |
| `references/api/mail-messages.md`     | what happened to each message a run sent — by run, by status, one by id                          |
| `references/reading-the-timeline.md`  | what each part of a run's timeline tells you, and what to do about it                            |
| `references/pitfalls.md`              | each trap of diagnosing a run, with what happens and what to do                                  |

The failed-runs list, the alerts read and the test event are in `kipory-operate`'s `references/api/failures.md`.

The judgment for what an action is allowed to emit is `kipory-build`'s flows pack; the error table for a symptom that arrived over HTTP is `kipory-expose`'s consumer reference.

## Then

`kipory-build` to fix the action the log named, and to checkpoint before you do. `kipory-prove` to pin the corrected behaviour so it stays fixed. `kipory-operate` when a scheduled run never fired — that is a schedule question, and the schedule's own history is not sampled or expired the same way — and for being told when a run fails rather than finding out, and for a schedule or trigger the platform paused. `kipory-secrets` when the failing phase names a missing vendor key. `kipory-data` to reprocess or correct the record once you know why its run failed.
