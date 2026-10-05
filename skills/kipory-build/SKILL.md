---
name: kipory-build
description: Build or edit a Kipory flow — create it with its typed signature, add steps over the handler catalog, wire slots between them, bind the output so a call returns something, check health, and preview it — and write, plan and apply a whole project as one document. Use when implementing the processing a plan called for, adding or changing a step, choosing a handler, calling a model or LLM with a prompt (summarise, extract, classify, decide yes or no) and choosing which model it runs on, adding a fan-out, merge, loop, branch or sub-flow, when a step save is refused, health says the flow cannot run, or a model or provider stopped answering. Not for putting the flow on HTTP (kipory-expose), not for reading a past run (kipory-diagnose), and before changing a flow that an endpoint or a record type already depends on, read kipory-evolve.
license: MIT
---

# Build a flow

Flows are the main build target and where most time is spent. A flow is a named group of **skills** — in the API a skill is one step: a handler key, its config, the slots it reads and the slot it writes — plus a typed signature and an output binding. The fact most people get wrong: **a skill write returning 2xx is not a promise the flow will run.** Only a skill-level error refuses a save; edge and flow errors save cleanly and ride back as `outstandingIssues`, and nothing re-checks the graph at run time.

## Before the first call

- **Read the whole handler catalog** — `references/handlers/README.md`, or `GET /v1/handlers` live — not a filtered view. A keyword search returns what you already believed existed. Confirm every key live before you author a step; a remembered key has already burned real calls.
- **A flow reaches the outside only through a handler.** A vendor is reachable through its own handler, and any other service with an HTTP API through `url.fetch` (a read) or `url.send` (a write, staged once per run and delivered after the run saves; a transient failure is retried, so the receiver may see it twice, and the flow never sees the answer), each with a stored key named in `secret` (`kipory-gather`). `kipory-connect`'s `references/packs/limits.md` ("What a flow can reach") has the list.
- **A yes/no, a pick from a closed list or a score is `text.decide`, not a prompt — and it is by far the cheapest model step.** It runs on a decision model that returns values, not text, and one call answers every question you give it. Reach for it before `text.generate` or `facet.resolve` — `references/models.md`.
- Fetch `references/packs/flows-and-skills.md` for the capability judgment and `references/packs/flow-checkpoints.md` before any edit you would not want to undo by hand.
- Know the three grammars you will type, and that they differ: a **slot name** is letters and digits starting with a letter — no underscores; a **template placeholder** is `{{slot}}` or `{{slot.field}}` with pipe filters; an **input projection** (`inputPaths`) is a structured path object, never a string. JSONata belongs to `value.transform` alone.

## Which handler for which job

One row per catalog group. The handler pages say what each key takes; the last column says where the judgment is.

| Group                                  | Handlers                                                                                                                                                                      | Judgment                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ai — ask a model                       | `text.generate` (written words), `text.decide` (yes/no, a closed pick, a score), `text.embed`, `text.rerank`                                                                  | `references/models.md`                                                             |
| text — shape text, no model            | `text.interpolate`, `text.extract`, `text.detect-language`, `text.chunk`, `text.sanitize`                                                                                     | `references/patterns.md` (`text.interpolate`), `kipory-extract`, `kipory-retrieve` |
| sources — fetch from outside           | `url.*`, `web.*`, `youtube.*`, `x.*`, `place.*`, `telegram.*`, `location.resolve`, the social and ad-library families                                                         | `kipory-gather`                                                                    |
| files — read what a file holds         | `pdf.parse`, `pdf.screenshot`, `file.read-text`, `file.stats`, `file.download-url`, `audio.transcribe`, `audio.metadata`, `image.metadata`, `image.resize`, `image.decode-qr` | `kipory-extract`                                                                   |
| search — store and find by meaning     | `vector.search`, `vector.upsert`, `vector.fetch`, `vector.point-id`, `text.embed-sparse`                                                                                      | `kipory-retrieve`                                                                  |
| entities — records                     | `entity.create`, `entity.update`, `entity.read`, `entity.list`, `entity.count`, `entity.enqueue-process`, and `entity.query`, the one that joins                              | `references/records-and-endpoints.md`                                              |
| entities — more writes, links          | `entity.append`, `entity.delete`, `entity.teardown`, `entity.links`, `entity.link-assert`, `entity.link-retract`                                                              | `kipory-data`'s `references/in-flow-record-handlers.md`                            |
| entities — classification              | `facet.resolve`, `term.upsert`, `term.threshold-gate`, `taxonomy.aggregate`                                                                                                   | `kipory-model`                                                                     |
| outbound — reach a person or a service | `email.send` (mail to a person), `url.send` (a keyed write to an outside HTTP API, delivered after the run saves)                                                             | `kipory-channels`; `url.send` is `kipory-gather`                                   |
| flow — steer the run                   | `flow.fan-out`, `flow.merge`, `flow.invoke`, `flow.loop`, `flow.loop-end`, `flow.dispatch`, `state.write`, `state.read`, `event.emit`                                         | `references/patterns.md`; `event.emit` is `kipory-operate`                         |
| utility — compute, pick, join          | `value.transform`, `value.first-non-empty`, `list.concat`                                                                                                                     | `references/patterns.md`                                                           |

## The sequence

For a new project, or any change of more than a few rows, author the document instead ([below](#author-the-whole-project-as-one-document)); the row-by-row sequence here is for single-step edits.

```
POST  /v1/flows                          { project, key, label, inputTypeNames, outputTypeNames, outputBinding? }
POST  /v1/steps                         one step — or POST /v1/steps/batch for creates, updates and deletes in one transaction
PATCH /v1/flows/{id}                     { outputBinding, version }  ← without this the flow returns nothing
GET   /v1/flows/{id}/health              the whole-flow verdict: diagnostics, counts, danglingReads
POST  /v1/flows/{id}/preview             run it — ADMIN, bills the payer, applies writes unless apply: false
```

- **A step body** needs `flowId`, `key` and `handlerKey`; most also state `handlerConfig`. Everything else has a default or is derived. `outputSlot` is required only by a handler that writes a result, `promptTemplate` only by a prompt handler, and `taskKey` omitted starts a new step on `extraction`. `references/step-fields.md` has every field and what leaving it out does.
- **There is no position field**: execution order is derived from slot edges. A PATCH requires `version`.
- **`inputTypeNames` and `outputTypeNames` entries are objects** `{ typeName, slot?, isList?, required? }`, not bare names.
- **`outputBinding`** maps each flow output slot to `{ fromSlot, path? }`. `path` is omitted or `null` to take the whole value, and otherwise an **object, never a string** — `{ "segments": [{ "kind": "field", "name": "recordId" }] }`. A `field` segment needs a typed source: a step typed as the builtin `object` refuses it. The segment kinds are in `references/step-fields.md` §2.
- **A type is a schema reference**: `{ "kind": "ref", "entryId": "<id>" }` on the row API, `{ "kind": "ref", "ref": "<entry key>" }` in a document. Named shapes match by entry, never by structure — reuse one entry or meet `NOMINAL_MISMATCH`. The list, optional, union, map and record-id forms are in `references/step-fields.md` §3.
- **Ask before you save**: `validateOnly: true` on `POST /v1/steps` and `PATCH /v1/steps/{id}` runs every rule the write runs and writes nothing. Before a risky edit, `POST /v1/flow-checkpoints { flowId, label }`. Both are in `references/checking.md`.

## What will bite you

<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->

- **The diagnostics are not where you look.** Skill writes return `outstandingIssues` with no skill id; a 422 carries `details.diagnostics[]` with one; flow writes carry nothing. For the whole-flow verdict, attributed to a step and an edge, ask `GET /v1/flows/{id}/health` — `expand=health` works on the flow list only. `references/checking.md` §1.
- **An unbound output is a common cause of a dead endpoint.** A required output the run never produced is refused `422 FLOW_OUTPUT_MISSING` (`details.missing` names it), whatever its type, and the run's writes are discarded; nothing is filled in. Preview names it first: `missingRequiredOutput` is non-null exactly when a live call would be refused. Bind the slots — `OUTPUT_SLOT_UNBOUND` is only a warning, and it is this. A flow whose honest answer can be empty produces that value (`0`, `[]`) or declares the output optional.
- **A guard that skipped a write refuses the call the same way.** For your own message use `$assert` (a `422`), for a missing record `entity.read`'s `failIfEmpty` (a `404`) — `references/records-and-endpoints.md` §8.
- ⛔ **Preview costs money and writes.** `apply` defaults to true; `apply: false` still runs every step and every model call, then discards the change set. Fan-out is capped at 5 branches and the wall clock at 180 seconds. To run it as a key or a schedule will, send `principal: "no-end-user"`. `references/checking.md` §3.
- **A sync preview shows no slot values.** Its `transcript` carries outcomes and timings only. To see what each step wrote, queue it: `POST /v1/flows/{id}/preview-runs` (same body, `202 { runId }`), then `GET /v1/runs/{runId}/trace`.
- **A refused run is still charged for what ran**; the refusal's `x-credits-charged` header says how much. Preview the flow before a caller can reach it. Billing is `kipory-operate`'s `references/spend.md`.
- **Preview is ADMIN**, and so are its stream, `preview-runs`, `POST /v1/steps/preview`, every delete and the checkpoint restore. An EDITOR key can author a whole flow, dry-run every write and render a prompt (`POST /v1/steps/interpolate`), and cannot preview it.
- **A step runs while any one input is present**, so a step below a skipped one still runs on its other inputs. Guard it with `"condition": { "op": "slotPresent", "slot": "<the slot it needs>" }`. A condition that fails is a skip, not a failure. `references/patterns.md` §1.
- **A run with no signed-in user has no `userInfo`** — a key's call, a schedule, a trigger. A step reading only provider slots still runs; a step reading `userInfo` beside a real slot waits for that slot. `references/step-fields.md` §5.
- **Leave `inputStreams` out where the settings or the prompt name the inputs** — `value.transform`, `entity.list`, `entity.read`, `text.generate`. The save derives them; a list you send that differs is refused `FREE_FORM_INPUT_STREAMS_MISMATCH`. A `flow.invoke` step's are always derived from its input rows, in a document too. `references/step-fields.md` §4.
- **For merge, invoke, dispatch and loop-end the row's `outputSlot` is a mirror**: their real outputs are in config. `references/patterns.md` has one rule for each.
- **Pinning `modelId` opts a step out of the project's next model change, silently.** Omit it to inherit through `taskKey`. `references/models.md` §3.
- **A model call can fail on the provider, not on you.** When the error says a provider account is exhausted, move the task to another model — `references/models.md` §5 has the three calls. The same section covers a sync endpoint over `text.generate` that answers 504 while the model is fast.
- **A signature change states the side it changes**, and is `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` while an endpoint or a record type holds the old one. `references/step-fields.md` §1; read `kipory-evolve` first.
- **`/v1/steps/batch` is one transaction**: one stale `version` refuses the whole batch.

## Author the whole project as one document

`kipory-build` owns the project document. When a plan was accepted, or the change touches more than a handful of rows, do not author row by row. State the project as one **document** and let the platform order the writes.

```
GET   /v1/projects/{nodeId}/document          the project now, with the version an apply must present
POST  /v1/projects/{nodeId}/document/plan     what applying it would do — writes nothing, VIEWER
POST  /v1/projects/{nodeId}/document          { version, document } — one transaction, one version, one history entry
GET   /v1/project-document/schema             the format, public
GET   /v1/project-document/example            a complete document that belongs to no project, public
```

The loop is **export → edit → plan → read → apply**. A plan is not a simulation: the platform applies the document through every row's own write, in one transaction, and rolls it back — so what a plan refuses is exactly what an apply refuses.

- **Read three things off a plan**: `diagnostics` (gate on `severity` and `introduced`, never on `code`), `consequences` (what the change does to stored data) and the `delete` rows of `changes`.
- **Everything is addressed by `key`**; a schema reference is `{ "kind": "ref", "ref": "<entry key>" }`.
- **A partial document is fine, and absence never deletes.** Removal is `delete: true` on a row or `prune: true` on a map, and needs ADMIN. Owned collections — a flow's `skills`, a facet's `terms` — are stated whole, so a step you leave out of a flow's `skills` IS removed.
- **`version` is required on the apply.** A stale one answers `409` with the current document under `details`; any other write to the project in between moves it.
- **Plan a large document as it grows**: shapes and facets, then record types, then flows, then endpoints. Apply once, when the whole plans clean.
- **An `ok` plan has already run health** on every flow the document can move, so `/health` after the apply is a confirmation.

`references/document.md` has every rule — what is permanent, how a shape is stated, how steps keep their ids, what a document derives for a step, the size limits. `references/packs/project-document.md` carries the reference forms, and `references/packs/authoring-order.md` says what must exist before what if you author row by row anyway.

## If a facet sent you here

First check you need a flow at all — usually you do not. A facet whose `matching` is `exact` needs no resolver, and a `semantic` one created without an explicit `null` is bound to a platform default. Author your own resolver only when the default is not what you want, then patch `resolverFlowId` onto the facet (`kipory-model`).

## References

| File                                                                                       | What it answers                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `references/first-flow.md`                                                                 | one flow from nothing to a live endpoint, every body complete — row by row and as one document                                                               |
| `references/step-fields.md`                                                                | every step field and what leaving it out does, path segments, schema reference forms, the inputs the platform derives, when a step runs                      |
| `references/patterns.md`                                                                   | §1–§6, the control shapes — pipeline, fan-out and merge, sub-flow, loop, branch, run state — and the utilities, `value.transform` first                      |
| `references/records-and-endpoints.md`                                                      | §7–§10 — a record's processing flow and file inputs, what an endpoint answers (404, 422, optional filters), `entity.query` and a per-user feed, roll-ups     |
| `references/models.md`                                                                     | which model handler to use, how to write a `text.decide` question and gate on its confidence, task bindings, model prices, a provider that stopped answering |
| `references/checking.md`                                                                   | where diagnostics are, dry runs, preview and the queued preview's trace, what needs ADMIN, checkpoints                                                       |
| `references/document.md`                                                                   | the project document's rules: keys, partial documents, removal, what a plan reports, versions, steps across applies                                          |
| `references/handlers/README.md`                                                            | every handler, one line each, by group, tagged with its phase and what it spends                                                                             |
| `references/handlers/<key>.md`                                                             | one handler: what it reads and emits, its config table with cautions, credential, rate limit, queue, and a worked example                                    |
| `references/packs/flows-and-skills.md`                                                     | the judgment: output binding, preview, how a step runs, what travels between steps                                                                           |
| `references/packs/flow-checkpoints.md`                                                     | snapshot and restore                                                                                                                                         |
| `references/packs/project-document.md`                                                     | the whole project as one document: reference forms, the plan's three lists, what does not travel                                                             |
| `references/packs/authoring-order.md`                                                      | what must exist before what, when you author row by row                                                                                                      |
| `references/api/flows.md` · `skills.md` · `flow-checkpoints.md` · `handlers-and-models.md` | every route's fields                                                                                                                                         |
| `references/api/project-document.md`                                                       | the export, plan and apply routes, and the two public reads                                                                                                  |

## Then

`kipory-expose` to put the flow on HTTP. `kipory-prove` to pin what "working" means before you edit it again. `kipory-model` when the flow needs a record type, a shape or a facet that does not exist yet. `kipory-data` to seed or correct the records the flow reads, and to reprocess them after an edit. `kipory-operate` to run the flow on a schedule or a trigger, and for what it spent. `kipory-secrets` if a handler reported a missing API key — the fix is a stored credential, not a flow edit. `kipory-channels` if a step sends mail or reads a Telegram channel. For the step itself rather than the wiring: `kipory-gather` for a source that reaches outside the project, `kipory-extract` for one that opens a file, and `kipory-retrieve` for the chunk-embed-search-cite chain. `kipory-evolve` before changing a flow that something already depends on. `kipory-diagnose` when a run came back wrong.
