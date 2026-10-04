# Checking a flow: dry runs, health, preview, checkpoints

<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: record-owner — an enum VALUE of the preview's principal, not a property -->

Five <!-- count: rows-of-next-table --> questions to ask about a flow before a caller does, cheapest first. `packs/flows-and-skills.md` has each in more depth.

| Question                                       | Ask                                                                | Role   | Costs                       |
| ---------------------------------------------- | ------------------------------------------------------------------ | ------ | --------------------------- |
| Would this step save, and what would it break? | `validateOnly: true` on `POST /v1/steps` or `PATCH /v1/steps/{id}` | EDITOR | nothing                     |
| What does this prompt become?                  | `POST /v1/steps/interpolate`                                       | EDITOR | nothing                     |
| Is the whole flow sound?                       | `GET /v1/flows/{id}/health`                                        | VIEWER | nothing                     |
| What does one model call answer?               | `POST /v1/steps/preview`                                           | ADMIN  | one model call              |
| What does a run produce?                       | `POST /v1/flows/{id}/preview`, or `…/preview-runs` to keep the run | ADMIN  | everything a live run costs |

## 1. Where the diagnostics are

- **Step writes return `outstandingIssues`** — code, message, severity, and **no step id**. Only a problem attributable to the one step refuses the save; edge and flow problems save cleanly and ride back here.
- **A refusal (422) carries `details.diagnostics[]`** _with_ a step id (`skillId`).
- **Flow writes carry nothing.**
- **For attribution ask `GET /v1/flows/{id}/health`**: its classified diagnostics say which step and which edge. A clean `outstandingIssues` on a write does not mean the flow is healthy — the write validates a subset around the touched steps; health, a document plan, and a flow or schema-entry PATCH with `validateOnly` (its `leavesBehind`) run the whole graph.
- **`expand=health` works on the list only.** `GET /v1/flows?project={nodeId}&expand=health` gives each row a `health` summary with its `firstErrorCode` — a digest, not the attributed diagnostics. `GET /v1/flows/{id}` accepts only `expand=timeLimits`; `expand=health` there is a 422. What holds a flow is its delete's dry run, `DELETE /v1/flows/{id}?validateOnly=true`.
- **`OUTPUT_SLOT_UNBOUND` means the binding is missing, and it is only a warning.** A step may already write the slot; what is absent is the flow's output binding naming it. If the output is required, every live call is refused `422 FLOW_OUTPUT_MISSING`, so an unheeded warning ships an endpoint that refuses everything.
- **Nothing re-validates a graph at run time.** A flow saved with blocking edge issues runs and leaves a trace — usually the fastest way to see what the diagnostic was predicting.

## 2. Dry runs of a step write

`validateOnly: true` on `POST /v1/steps` (and on `PATCH /v1/steps/{id}`) runs every rule that write runs — the flow-graph gate, a key or output slot another step holds, the pinned model, how the step runs — writes nothing, and answers a verdict.

- Each finding carries the severity the save would give it.
- `leavesBehind` lists what the write would leave broken in the flow.
- `ok` is `false` when the write would leave an error behind — the verdict a document plan of the same change gives.
- `derived.draft`, beside the verdict, answers a narrower question — what the configuration reads and whether it parses. A clean one does not mean the step will save.
- A PATCH dry run that changes `outputSlot` also answers `derived.rename`: what renaming the slot would touch.

`POST /v1/steps/interpolate` renders a prompt with the `slotValues` you send and calls nothing. `POST /v1/steps/preview` interpolates one prompt and, for `text.generate` only, makes one model call — it is not a flow run.

`POST /v1/steps/batch` is one transaction: one stale `version` refuses the whole batch. Reach for it deliberately; to change one step, patch that step, and to set a flow's steps as a whole, state them in a project document (`document.md`).

## 3. Preview

`POST /v1/flows/{id}/preview` runs the stored steps on the values you send: `{ "input": { "kind": "slots", "inputs": { … } }, "apply": false }`, or `"kind": "record"` with a `recordId`.

- **It costs what a live run costs, and it writes.** `apply` defaults to true. `apply: false` still runs every step and every model call, then discards the change set — readable at `GET /v1/runs/{runId}/change-set`, where the run id is the response's `previewSessionId`. `kipory-operate`'s `references/spend.md` has what a preview is charged.
- **Its cache is not a live run's.** A preview shares the handlers' input-keyed cache with live runs, but never reads or fills the step-result cache a live run reads first, so a preview does not make the next live call free.
- **A step that sends fails in a preview.** A `url.send` or `email.send` step fails rather than sending, with `apply: false` too, and the same holds in an eval run. Preview the flow with that step guarded off by a `condition`, and prove the send with one live run. `"onFailure": "continue"` is not a way round: the save refuses it on a step that may write.
- **An id in a dry run's output is not proof anything was stored.** An `entity.create` on a project-wide type still reports an id, and it is the id a live run with the same data will get — a record's identity is its content. The change set is the proof.
- **`missingRequiredOutput` is non-null exactly when a live call would be refused** `422 FLOW_OUTPUT_MISSING`.
- **Who the run acts as is `principal`**, and the two special values live on different input arms: `no-end-user` on `slots` (the run a key, a schedule or a trigger gets), `record-owner` on `record`. The default, `operator`, is a request-shaped run.
- **Fan-out is capped at 5 branches per node.** `fanOutCap` sets that preview cap (a number or `"uncapped"`) but never lifts the step's own `maxItems`. The wall clock is 180 seconds. A capped preview proves wiring and per-element behaviour, not the merge over the real population.

**To see what each step wrote, queue the preview.** The synchronous preview's `transcript` carries each step's outcome, timing and error — no slot values — and leaves no step log and no trace. `POST /v1/flows/{id}/preview-runs` takes the same body and answers `202 { runId }`; a worker runs it, and the run is read like any other:

```
GET /v1/runs/{runId}/trace        the flow's inputs and each step's output by slot (slotOutputs)
GET /v1/runs/{runId}/steps        the step log
GET /v1/runs/{runId}/spend        what it cost, by step
GET /v1/runs/{runId}/change-set   what it wrote, or would have
```

Those reads answer 404 until the worker has started the run, so poll `GET /v1/runs/{runId}`: the run is finished when `run.closing` is non-null. `run.closing.verdict` is then `succeeded` or `failed`, or null with `run.closing.kind: "run-aborted"` when the run was ended from outside. `run.lifecycle` reads `unknown` until then and `settled` after.

**`succeeded` does not mean every step got an answer.** A step whose vendor refused the call — a search, a page read, a screenshot — ends `step-applied` with an empty output, and the run still succeeds. Each such step leaves a `step-warned` row in `GET /v1/runs/{runId}/steps` (`detail.warningKind`: `SEARCH_FAILED`, `SCRAPE_FAILED`, …) whose `detail.message` is the vendor's reason, so read the step log for them before designing around an empty result. `kipory-diagnose` reads a trace.

## 4. What needs ADMIN

Three flow routes that look like reads are ADMIN: preview, its stream and `POST /v1/flows/{id}/preview-runs`. So are `POST /v1/steps/preview`, running an eval suite (`POST /v1/eval-suites/{id}/run`, unless `validateOnly`), every delete and the checkpoint restore. An EDITOR key can author a whole flow, dry-run every write and render a prompt, and cannot preview the flow.

## 5. Checkpoints

Before a risky edit: `POST /v1/flow-checkpoints { flowId, label }`.

Before committing to a rollback: the restore with `validateOnly: true`, which rehearses it, answers the restore's own refusals and shows the current and captured steps side by side (`derived.restore`).

The restore itself — `POST /v1/flow-checkpoints/{id}/restore { version }`, the flow's `version`, ADMIN — swaps the whole step set, signature and binding, and takes an automatic checkpoint of the previous state first. `packs/flow-checkpoints.md` has the rest.
