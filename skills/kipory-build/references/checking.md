# Checking a flow: dry runs, health, preview, checkpoints

<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: record-owner — an enum VALUE of the preview's principal, not a property -->

Five <!-- count: rows-of-next-table --> questions to ask about a flow before a caller does, cheapest first. `packs/flows-and-actions.md` has each in more depth.

| Question                                         | Ask                                                                    | Role   | Costs                       |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ------ | --------------------------- |
| Would this action save, and what would it break? | `validateOnly: true` on `POST /v1/actions` or `PATCH /v1/actions/{id}` | EDITOR | nothing                     |
| What does this prompt become?                    | `POST /v1/actions/interpolate`                                         | EDITOR | nothing                     |
| Is the whole flow sound?                         | `GET /v1/flows/{id}/health`                                            | VIEWER | nothing                     |
| What does one model call answer?                 | `POST /v1/actions/preview`                                             | ADMIN  | one model call              |
| What does a run produce?                         | `POST /v1/flows/{id}/preview`, or `…/preview-runs` to keep the run     | ADMIN  | everything a live run costs |

## 1. Where the diagnostics are

- **Action writes return `outstandingIssues`** — code, message, severity, and **no action id**. Only a problem attributable to the one action refuses the save; edge and flow problems save cleanly and ride back here.
- **A refusal (422) carries `details.diagnostics[]`** _with_ an action id (`actionId`).
- **Flow writes carry nothing.**
- **For attribution ask `GET /v1/flows/{id}/health`**: its classified diagnostics say which action and which edge. A clean `outstandingIssues` on a write does not mean the flow is healthy — the write validates a subset around the touched actions; health, a document plan, and a flow or type PATCH with `validateOnly` (its `leavesBehind`) run the whole graph.
- **`expand=health` works on the list only.** `GET /v1/flows?project={nodeId}&expand=health` gives each row a `health` summary with its `firstErrorCode` — a digest, not the attributed diagnostics. `GET /v1/flows/{id}` accepts only `expand=timeLimits`; `expand=health` there is a 422. What holds a flow is its delete's dry run, `DELETE /v1/flows/{id}?validateOnly=true`.
- **`OUTPUT_SLOT_UNBOUND` means the binding is missing, and it is only a warning.** An action may already write the slot; what is absent is the flow's output binding naming it. If the output is required, every live call is refused `422 FLOW_OUTPUT_MISSING`, so an unheeded warning ships an endpoint that refuses everything.
- **Nothing re-validates a graph at run time.** A flow saved with blocking edge issues runs and leaves a trace — usually the fastest way to see what the diagnostic was predicting.

## 2. Dry runs of an action write

`validateOnly: true` on `POST /v1/actions` (and on `PATCH /v1/actions/{id}`) runs every rule that write runs — the flow-graph gate, a key or output slot another action holds, the pinned model, how the action runs — writes nothing, and answers a verdict.

- Each finding carries the severity the save would give it.
- `leavesBehind` lists what the write would leave broken in the flow.
- `ok` is `false` when the write would leave an error behind — the verdict a document plan of the same change gives.
- `derived.draft`, beside the verdict, answers a narrower question — what the configuration reads and whether it parses. A clean one does not mean the action will save.
- A PATCH dry run that changes `outputSlot` also answers `derived.rename`: what renaming the slot would touch.

`POST /v1/actions/interpolate` renders a prompt with the `slotValues` you send and calls nothing. `POST /v1/actions/preview` interpolates one prompt and, for `text.generate` only, makes one model call — it is not a flow run.

`POST /v1/actions/batch` is one transaction: one stale `version` refuses the whole batch. Reach for it deliberately; to change one action, patch that action, and to set a flow's actions as a whole, state them in a project document (`document.md`).

## 3. Preview

`POST /v1/flows/{id}/preview` runs the stored actions on the values you send: `{ "input": { "kind": "slots", "inputs": { … } }, "apply": false }`, or `"kind": "record"` with a `recordId`.

- **It costs what a live run costs, and it writes.** `apply` defaults to true. `apply: false` still runs every action and every model call, then discards the change set — readable at `GET /v1/runs/{runId}/change-set`, where the run id is the response's `previewSessionId`. `kipory-operate`'s `references/spend.md` has what a preview is charged.
- **Its cache is not a live run's.** A preview shares the functions' input-keyed cache with live runs, but never reads or fills the action-result cache a live run reads first, so a preview does not make the next live call free.
- **An action that sends fails in a preview.** A `url.send` or `email.send` action fails rather than sending, with `apply: false` too, and the same holds in an eval run. Preview the flow with that action guarded off by a `condition`, and prove the send with one live run. `"onFailure": "continue"` is not a way round: the save refuses it on an action that may write.
- **An id in a dry run's output is not proof anything was stored.** An `record.create` on a project-wide table still reports an id, and it is the id a live run with the same data will get — a record's identity is its content. The change set is the proof.
- **`missingRequiredOutput` is non-null exactly when a live call would be refused** `422 FLOW_OUTPUT_MISSING`.
- **Who the run acts as is `principal`**, and the two special values live on different input arms: `no-end-user` on `slots` (the run a key, a schedule or a trigger gets), `record-owner` on `record`. The default, `operator`, is a request-shaped run.
- **Fan-out is capped at 5 branches per node.** `fanOutCap` sets that preview cap (a number or `"uncapped"`) but never lifts the action's own `maxItems`. The wall clock is 180 seconds. A capped preview proves wiring and per-element behaviour, not the merge over the real population.

**To see what each action wrote, queue the preview.** The synchronous preview's `transcript` carries each action's outcome, timing and error — no slot values — and leaves no timeline and no trace. `POST /v1/flows/{id}/preview-runs` takes the same body and answers `202 { runId }`; a worker runs it, and the run is read like any other:

```
GET /v1/runs/{runId}/trace        the flow's inputs and each action's output by slot (slotOutputs)
GET /v1/runs/{runId}/timeline        the timeline
GET /v1/runs/{runId}/spend        what it cost, by action
GET /v1/runs/{runId}/change-set   what it wrote, or would have
```

Those reads answer 404 until the worker has started the run, so poll `GET /v1/runs/{runId}`: the run is finished when `run.closing` is non-null. `run.closing.verdict` is then `succeeded` or `failed`, or null with `run.closing.kind: "run-aborted"` when the run was ended from outside. `run.lifecycle` reads `unknown` until then and `settled` after.

**`succeeded` does not mean every action got an answer.** An action whose vendor refused the call — a search, a page read, a screenshot — ends `action-applied` with an empty output, and the run still succeeds. Each such action leaves an `action-warned` row in `GET /v1/runs/{runId}/timeline` (`detail.warningKind`: `SEARCH_FAILED`, `SCRAPE_FAILED`, …) whose `detail.message` is the vendor's reason, so read the timeline for them before designing around an empty result. The run says how many it has without the log: `run.closing.warnings` lists the warnings it produced, counted by `kind` (and `warningKind` for a function's own), and is empty when there were none — check it on every run you are about to trust, the list read (`GET /v1/runs`) included. It also counts the engine's own: a value cut at the slot cap (`slot-truncated`), items a fan-out dropped (`fan-out-capped`), an action that failed under `"onFailure": "continue"` (`action-failed-continued`). `kipory-diagnose` reads a trace.

## 4. What needs ADMIN

Three flow routes that look like reads are ADMIN: preview, its stream and `POST /v1/flows/{id}/preview-runs`. So are `POST /v1/actions/preview`, running an eval suite (`POST /v1/eval-suites/{id}/run`, unless `validateOnly`), every delete and the checkpoint restore. An EDITOR key can author a whole flow, dry-run every write and render a prompt, and cannot preview the flow.

## 5. Checkpoints

Before a risky edit: `POST /v1/flow-checkpoints { flowId, label }`.

Before committing to a rollback: the restore with `validateOnly: true`, which rehearses it, answers the restore's own refusals and shows the current and captured actions side by side (`derived.restore`).

The restore itself — `POST /v1/flow-checkpoints/{id}/restore { version }`, the flow's `version`, ADMIN — swaps the whole action set, signature and binding, and takes an automatic checkpoint of the previous state first. `packs/flow-checkpoints.md` has the rest.
