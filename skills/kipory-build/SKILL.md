---
name: kipory-build
description: Build or edit a Kipory flow — create it with its typed signature, add steps over the handler catalog, wire slots between them, bind the output so a call actually returns something, check the whole-flow health, and preview against real inputs. Use when implementing the processing a plan called for, changing a flow that already exists, choosing a handler for a job, adding a fan-out, merge, loop, branch or sub-flow, or when a flow saved but health says it cannot run. Not for putting the flow on HTTP (that is expose) and not for reading a past run (that is diagnose).
license: MIT
---

# Build a flow

Flows are the main build target and where most time is spent. A flow is a named group of **skills** — in the API a skill is one step: a handler key, its config, the slots it reads and the slot it writes — plus a typed signature and an output binding. The fact most people get wrong: **a skill write returning 2xx is not a promise the flow will run.** Only a skill-level error refuses a save; edge and flow errors save cleanly and ride back as `outstandingIssues`, and nothing re-checks the graph at run time.

## Before the first call

- **Read the whole handler catalog** — `references/handlers/README.md`, or `GET /v1/handlers` live — not a filtered view. A keyword search returns what you already believed existed. Confirm every key live before you author a step; a remembered key has already burned real calls.
- Fetch `references/packs/flows-and-skills.md` for the capability judgment and `references/packs/flow-checkpoints.md` before any edit you would not want to undo by hand.
- Know the three grammars you will type, and that they differ: a **slot name** is letters and digits starting with a letter — no underscores; a **template placeholder** is `{{slot}}` or `{{slot.field}}` with pipe filters; an **input projection** (`inputPaths`) is a structured path object, never a string. JSONata belongs to `value.transform` alone.

## The sequence

```
POST  /v1/flows                          { project, name, slug, inputTypeNames, outputTypeNames, outputBinding? }
POST  /v1/skills                         one step — or POST /v1/skills/batch for creates, updates and deletes in one transaction
PATCH /v1/flows/{id}                     { outputBinding }  ← without this the flow returns nothing
GET   /v1/flows/{id}/health              the whole-flow verdict: isActivatable, errors, warnings, blockingCode
POST  /v1/flows/{id}/preview             run it — ADMIN, bills the payer, applies writes unless apply: false
```

A skill body carries `flow`, `name`, `handlerKey`, `handlerConfig`, `inputStreams`, `inputSchemas` (same length), `outputSlot`, `promptTemplate`, `taskKey`, and optionally `condition`, `inputPaths`, `inputProjectionNames` (both positional, same length as `inputStreams`), `outputSchema`, `modelId`, `timeoutMs`, `enabled`. There is **no position field**: execution order is derived from slot edges. A PATCH requires `capturedVersion`.

Before a risky edit: `POST /v1/flow-checkpoints { flow, name }`. Before committing to a rollback: `GET /v1/flow-checkpoints/{id}/restore-preview`, which never refuses and shows the current and captured steps side by side; the restore itself (`POST /v1/flow-checkpoints/{id}/restore`, no body, ADMIN) swaps the whole step set, signature and binding, and takes an automatic checkpoint of the previous state first.

Cheap checks before a save: `POST /v1/skills/validate-draft` runs the validator over an unsaved step and executes nothing; `GET /v1/skills/rename-preview` says what renaming a slot would touch; `POST /v1/skills/preview` interpolates one prompt and, for `text.generate` only, makes one model call — it is not a flow run.

## What will bite you

<!-- field-ok: noEndUser — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: recordOwner — an enum VALUE of the preview's principal, not a property -->

- **The diagnostics are not where you look.** Skill writes return `outstandingIssues` — code, message, severity, and **no skill id**. The refusal (422) carries `details.diagnostics[]` _with_ a skill id. Flow writes carry nothing. For attribution ask `GET /v1/flows/{id}/health`; its classified diagnostics say which step and which edge. A clean `outstandingIssues` on a write does not mean the flow is healthy — the write validates a subset around the touched steps; only health runs the whole graph.
- ⛔ **`expand=health` works on the list only.** `GET /v1/flows/{id}` declares no query and ignores `expand` silently, so you get a flow with no `health` field and no error. Use the health route.
- **An unbound output is a common cause of a dead endpoint, and it does not announce itself.** Depending on the slot's type a live call either 502s or returns 200 with an empty value — `[]`, `{}`, `""`, `0` — because the invoke path fills an unproduced required slot. Preview does not: `missingRequiredOutput` is non-null exactly when a live call would come back wrong. Bind the slots.
- ⛔ **Preview costs money and writes.** `apply` defaults to true. `apply: false` still runs every step and every model call, then discards the change set — readable at `GET /v1/runs/{runId}/change-set` where the run id is the response's `previewSessionId`. The two `principal` values live on different input arms: `noEndUser` on `slots`, `recordOwner` on `record`. Fan-out is capped at 5 branches per node (`fanOutCap`), the wall clock at 180 seconds, and a capped preview proves wiring and per-element behaviour, not the merge over the real population.
- **Three routes that look like reads are ADMIN**: preview, its stream, and `POST /v1/flows/{id}/test`, plus `POST /v1/skills/preview`, every delete and the restore. An EDITOR key can author a whole flow and cannot preview it.
- **`/v1/skills/replace` replaces the whole step set** — anything absent is removed — and it accepts entries a single create would refuse. `/v1/skills/batch` is one transaction: one stale `capturedVersion` refuses the whole batch. Reach for either deliberately; to change one step, patch that step.
- **For merge, invoke, dispatch and loop-end the row's `outputSlot` is a mirror**, not the truth: their real outputs are in config — lanes, output maps, branches, escape slots. `flow.invoke` writes no primary slot at all.
- **A condition that fails is a skip, not a failure**, and so is a condition that throws. Its `path` is a plain dot-string, while `inputPaths` entries are structured objects — two path notations on one row.
- **`flow.dispatch` with no `default` silently skips an unmatched input**, and every step below the unwritten branch slot skips too.
- **Pinning `modelId` opts a step out of the project's next model change, silently.** Omit it to inherit through `taskKey`; read `GET /v1/projects/{projectId}/task-models` and its `source` first. A `text.generate` step's `modelSlot` naming an unknown or disabled model fails the run with no fallback.
- **Changing `text.embed`'s model or provider invalidates every stored vector** and needs an index rebuild.
- **A save-time collision is half the guarantee.** Nothing re-validates a graph at run time, so a flow saved with blocking edge issues runs and leaves a trace — usually the fastest way to see what the diagnostic was predicting.

## If a facet sent you here

First check you need a flow at all — usually you do not. A facet whose `matching` is `exact` needs no resolver, and a `semantic` one created without an explicit `null` is bound to a platform default. Author your own resolver only when the default is not what you want, then patch `resolverFlowId` onto the facet (`kipory-model`).

## References

| File                                                                                       | What it answers                                                                                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `references/handlers/README.md`                                                            | every handler by group and phase, one line each                                                                           |
| `references/handlers/<key>.md`                                                             | one handler: what it reads and emits, its config table with cautions, credential, rate limit, queue, and a worked example |
| `references/patterns.md`                                                                   | ingest pipeline, fan-out and merge, sub-flow, loop, branch — the control handlers' one rule each                          |
| `references/packs/flows-and-skills.md`                                                     | the judgment: output binding, preview, what travels between skills                                                        |
| `references/packs/flow-checkpoints.md`                                                     | snapshot and restore                                                                                                      |
| `references/api/flows.md` · `skills.md` · `flow-checkpoints.md` · `handlers-and-models.md` | every route's fields                                                                                                      |

## Then

`kipory-expose` to put the flow on HTTP. `kipory-prove` to pin what "working" means before you edit it again. `kipory-secrets` if a handler reported a missing API key — the fix is a stored credential, not a flow edit. `kipory-channels` if a step sends mail or reads a Telegram channel. `kipory-diagnose` when a run came back wrong.
