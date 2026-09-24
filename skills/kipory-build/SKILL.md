---
name: kipory-build
description: Build or edit a Kipory flow — create it with its typed signature, add steps over the handler catalog, wire slots between them, bind the output so a call actually returns something, check the whole-flow health, and preview against real inputs — or state a whole project as one document and plan it before applying it. Use when implementing the processing a plan called for, when a plan has been accepted and its document is the next artifact, changing a flow that already exists, choosing a handler for a job, adding a fan-out, merge, loop, branch or sub-flow, or when a flow saved but health says it cannot run. Not for putting the flow on HTTP (that is expose) and not for reading a past run (that is diagnose).
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

A skill body carries `flow`, `name`, `handlerKey`, `handlerConfig`, `inputStreams`, `inputSchemas` (same length), `outputSlot`, `promptTemplate`, and optionally `taskKey` (a single `POST /v1/skills` starts a step without one on `extraction`; batch and replace entries still require it), `condition`, `inputPaths`, `inputProjectionNames` (both positional, same length as `inputStreams`), `outputSchema`, `modelId`, `timeoutMs`, `enabled`, and how it runs — `tries`, `tryDelayMs`, `onFailure`, `reuseResultsForMinutes`. There is **no position field**: execution order is derived from slot edges. A PATCH requires `capturedVersion`.

Before a risky edit: `POST /v1/flow-checkpoints { flow, name }`. Before committing to a rollback: `GET /v1/flow-checkpoints/{id}/restore-preview`, which never refuses and shows the current and captured steps side by side; the restore itself (`POST /v1/flow-checkpoints/{id}/restore`, no body, ADMIN) swaps the whole step set, signature and binding, and takes an automatic checkpoint of the previous state first.

Cheap checks before a save: `validateOnly: true` on `POST /v1/skills` (and on `PATCH /v1/skills/{id}`) runs every rule that write runs — the flow-graph gate, a name or output slot another step holds, the pinned model, how the step runs — writes nothing, and answers a verdict; ask it before a create or an edit. `POST /v1/skills/validate-draft` answers a different question — what a configuration reads and whether it parses — and a clean answer there does not mean the step will save. `GET /v1/skills/rename-preview` says what renaming a slot would touch; `POST /v1/skills/preview` interpolates one prompt and, for `text.generate` only, makes one model call — it is not a flow run.

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
- **Changing `text.embed`'s model invalidates every stored vector** and needs an index rebuild. `model` is a catalog id (`creator/slug`); the account that serves it is not part of the config.
- **A save-time collision is half the guarantee.** Nothing re-validates a graph at run time, so a flow saved with blocking edge issues runs and leaves a trace — usually the fastest way to see what the diagnostic was predicting.

## Author the whole project as one document

When a plan was accepted, or the change touches more than a handful of rows, do not author row by
row. State the project as one **document** and let the platform order the writes.

```
GET   /v1/projects/{nodeId}/document          the project now, with the version an apply must present
POST  /v1/projects/{nodeId}/document/plan     what applying it would do — writes nothing, VIEWER
POST  /v1/projects/{nodeId}/document          { version, document } — one transaction, one version, one history entry
GET   /v1/project-document/schema · /example  the format and a complete document, public
```

The loop is **export → edit → plan → read → apply**. A plan is not a simulation: the platform
applies the document through every row's own write, in one transaction, and rolls it back — so
what a plan refuses is exactly what an apply refuses. Read three things off it before applying:
`diagnostics` (each on a path in YOUR document, such as `records.member.shape` — gate on
`severity`, never on `code`), `consequences` (what the change does to stored data: records
re-stamped, vectors re-indexed, and `records-invalid`, the stored records that would no longer
fit a shape you changed), and the `delete` rows of `changes`, which include what a removal takes
along by cascade.

- **Everything is addressed by name** — a shape by its entry name, a flow by its slug, a facet by
  its key. Where the row API takes an id (`dataEntryId`, `flowId`, `resolverFlowId`) the document
  takes the name (`shape`, `flow`, `resolver`). A bare flow slug is this project's; a platform
  flow is `system:<slug>`. A step's `ref` is a schema entry's name.
- **A partial document is fine.** A section left out is untouched, and so is every row you do not
  name; of an existing row's optional fields, only the ones you state are compared. A row's
  required fields are required, because a row is its create body.
- **Absence never deletes.** Removal is `delete: true` on a row, or `prune: true` on a map to
  remove every row of that map you did not name — and any document that removes something needs
  ADMIN. Owned collections (a flow's `skills` and `tests`, a facet's `terms`, a suite's `cases`,
  a kind's `pairings`) are stated whole and replace the owner's, so a member you leave out of one
  IS a removal, with the same floor.
- **A field the row's PATCH does not take is permanent.** A facet's `cardinality`, a profile's
  `modelId`, a trigger's `source`: stated as exported it is fine, stated changed it is refused on
  its path — the document never drops it in silence. A new value is a new row under a new key.
- **A shape may be stated inline under the record type that uses it.** That type then OWNS it:
  the shape is edited only through the type and refused to every other consumer until it is
  promoted (`POST /v1/schema-entries/{id}/promote`, one way).
- **`version` is required on the apply** and is the export's. A stale one answers `409` with the
  current document under `details` — re-base on it rather than resending.
- **YAML in, JSON out.** Send `content-type: application/yaml` or JSON; a document is at most
  2 MiB and 2 000 rows, refused with `413` past either.

`references/packs/project-document.md` carries the rest, and `references/packs/authoring-order.md`
says what must exist before what if you author row by row anyway.

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
| `references/packs/project-document.md`                                                     | the whole project as one document: reference forms, the plan's three lists, what does not travel                          |
| `references/packs/authoring-order.md`                                                      | what must exist before what, when you author row by row                                                                   |
| `references/api/flows.md` · `skills.md` · `flow-checkpoints.md` · `handlers-and-models.md` | every route's fields                                                                                                      |
| `references/api/project-document.md`                                                       | the export, plan and apply routes, and the two public reads                                                               |

## Then

`kipory-expose` to put the flow on HTTP. `kipory-prove` to pin what "working" means before you edit it again. `kipory-secrets` if a handler reported a missing API key — the fix is a stored credential, not a flow edit. `kipory-channels` if a step sends mail or reads a Telegram channel. For the step itself rather than the wiring: `kipory-gather` for a source that reaches outside the project, `kipory-extract` for one that opens a file, and `kipory-retrieve` for the chunk-embed-search-cite chain. `kipory-evolve` before changing a flow that something already depends on. `kipory-diagnose` when a run came back wrong.
