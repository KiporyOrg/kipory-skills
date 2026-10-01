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

For a new project, or any change of more than a few rows, author the document instead ([below](#author-the-whole-project-as-one-document)); the row-by-row sequence here is for single-step edits.

```
POST  /v1/flows                          { project, key, label, inputTypeNames, outputTypeNames, outputBinding? }
POST  /v1/steps                         one step — or POST /v1/steps/batch for creates, updates and deletes in one transaction
PATCH /v1/flows/{id}                     { outputBinding, version }  ← without this the flow returns nothing
GET   /v1/flows/{id}/health              the whole-flow verdict: diagnostics, counts, danglingReads
POST  /v1/flows/{id}/preview             run it — ADMIN, bills the payer, applies writes unless apply: false
```

A skill body carries `flowId`, `key`, `handlerKey`, `handlerConfig`, `inputStreams`, and optionally `inputSchemas` (omit it and the platform types each input from what feeds it; a list you send is kept and must be the same length), `outputSlot` (required only by a handler that writes a result), `promptTemplate` (only a prompt handler needs one), `taskKey` (omitted, a new step starts on `extraction`; a document step the flow already holds keeps its own), `condition`, `inputPaths`, `inputProjectionNames` (both positional, same length as `inputStreams`), `outputSchema`, `modelId`, `timeoutMs`, `enabled`, and how it runs — `tries`, `tryDelayMs`, `onFailure`, `reuseResultsForMinutes`. `inputTypeNames` and `outputTypeNames` entries are objects `{ typeName, slot?, isList?, required? }`, not bare names. There is **no position field**: execution order is derived from slot edges. A PATCH requires `version`.

Three fields every step carries, whatever its handler:

- **Leave out what the handler does not read.** `promptTemplate` (absent or `null` is `""`) is needed only by `text.generate` and `text.interpolate`; `outputSlot` is refused as missing only on a handler that writes a result — `event.emit`, `vector.upsert`, `flow.merge`, `flow.invoke`, `flow.loop-end` and `flow.dispatch` need none.
- **`taskKey` is one of `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak`** — and it is required on a step that makes no model call too; pick `extraction` there. Anything else is a 422 listing these five.

**`outputBinding`** maps each flow output slot to `{ fromSlot, path? }`. `path` is omitted or `null` to take the whole value, and otherwise an **object, never a string**:

```json
{
  "outputBinding": {
    "id": {
      "fromSlot": "created",
      "path": { "segments": [{ "kind": "field", "name": "recordId" }] }
    },
    "first": {
      "fromSlot": "rows",
      "path": {
        "segments": [
          { "kind": "field", "name": "records" },
          { "kind": "first" }
        ]
      }
    }
  }
}
```

Segments apply in order: `{kind:"field",name}` one property, `{kind:"first"}` / `{kind:"last"}` / `{kind:"index",index}` one list item, `{kind:"pluck",name}` that property from every item (a list), `{kind:"wrap"}` one value lifted into a one-item list. The same object is what `inputPaths[i]` holds. **A `field` segment needs a typed source**: the step's `outputSchema` must be a shape that declares that field. A step typed as the builtin `object` (or a list) refuses a field path with a type mismatch — give the step a schema entry and bind into it.

**Schema references** — what `inputSchemas[]` and `outputSchema` hold. On the row API a named shape is `{ "kind": "ref", "entryId": "<id>" }`; inside a document it is `{ "kind": "ref", "ref": "<entry key>" }`. The other forms wrap one of those:

| Form                                              | Means                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `{ "kind": "list", "element": <ref> }`            | a list — `RecordRead[]` is `list` of `ref RecordRead`                                                              |
| `{ "kind": "optional", "inner": <ref> }`          | may be absent — an optional flow input arrives this way, and a step reading one must type it so (`patterns.md` §8) |
| `{ "kind": "union", "members": [<ref>, <ref>] }`  | one of several — on an input only, never an output                                                                 |
| `{ "kind": "record", "valueType": <ref> }`        | a string-keyed map                                                                                                 |
| `{ "kind": "recordRef", "recordType": "<type>" }` | one stored record's id                                                                                             |

The built-ins (`string`, `number`, `boolean`, `object`, `file`, …) and the platform's own shapes (`RecordRead`, `RecordPage`, `UserInfo`, `ProjectInfo`, …) are entries like yours: in a document name them by key; on the row API read the id with `GET /v1/schema-entries?project={nodeId}&key=<Key>`. `GET /v1/flows/{id}/scope` lists every slot a step may read already typed.

Before a risky edit: `POST /v1/flow-checkpoints { flowId, label }`. Before committing to a rollback: the restore with `validateOnly: true`, which rehearses it, answers the restore's own refusals and shows the current and captured steps side by side (`derived.restore`); the restore itself (`POST /v1/flow-checkpoints/{id}/restore { version }` — the flow's `version`, ADMIN) swaps the whole step set, signature and binding, and takes an automatic checkpoint of the previous state first.

Cheap checks before a save: `validateOnly: true` on `POST /v1/steps` (and on `PATCH /v1/steps/{id}`) runs every rule that write runs — the flow-graph gate, a key or output slot another step holds, the pinned model, how the step runs — writes nothing, and answers a verdict; ask it before a create or an edit. Beside the verdict, `derived.draft` answers a narrower question — what the configuration reads and whether it parses — and a clean one does not mean the step will save; a PATCH dry run that changes `outputSlot` also answers `derived.rename`, what renaming the slot would touch. `POST /v1/steps/preview` interpolates one prompt and, for `text.generate` only, makes one model call — it is not a flow run.

## What will bite you

<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: record-owner — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->

- **The diagnostics are not where you look.** Skill writes return `outstandingIssues` — code, message, severity, and **no skill id**. The refusal (422) carries `details.diagnostics[]` _with_ a skill id. Flow writes carry nothing. For attribution ask `GET /v1/flows/{id}/health`; its classified diagnostics say which step and which edge. A clean `outstandingIssues` on a write does not mean the flow is healthy — the write validates a subset around the touched steps; health, a document plan, and a flow or schema-entry PATCH with `validateOnly` (its `leavesBehind`) run the whole graph.
- ⛔ **`expand=health` works on the list only.** `GET /v1/flows/{id}` accepts only `expand=timeLimits`; `expand=health` there is a 422 (and what holds a flow is its delete's dry run, `DELETE /v1/flows/{id}?validateOnly=true`). Use the health route — the list's `health` summary (with its `firstErrorCode`) is a digest, not the attributed diagnostics.
- **An unbound output is a common cause of a dead endpoint.** A required output the run never produced is refused `422 FLOW_OUTPUT_MISSING` (`details.missing` names it), whatever its type, and the run's writes are discarded; nothing is filled in. Preview names it first: `missingRequiredOutput` is non-null exactly when a live call would be refused. Bind the slots. The same rule is why a guard that skipped a write refuses the call; for your own message use `$assert` (a `422`), for a missing record `entity.read`'s `failIfEmpty` (a `404`) — see `references/patterns.md` §8. A flow whose honest answer can be empty produces that value (`0`, `[]`) or declares the output optional.
- ⛔ **Preview costs money and writes.** `apply` defaults to true. `apply: false` still runs every step and every model call, then discards the change set — readable at `GET /v1/runs/{runId}/change-set` where the run id is the response's `previewSessionId`. An `entity.create` on a project-wide type still reports an id, and it is the id a live run with the same data will get — a record's identity is its content — so an id in a dry run's output is not proof anything was stored; the change set is. The two `principal` values live on different input arms: `no-end-user` on `slots`, `record-owner` on `record`. Fan-out is capped at 5 branches per node — `fanOutCap` sets that preview cap (a number or `"uncapped"`) but never lifts the step's own `maxItems` — the wall clock at 180 seconds, and a capped preview proves wiring and per-element behaviour, not the merge over the real population.
- **Three flow routes that look like reads are ADMIN**: preview, its stream and `POST /v1/flows/{id}/preview-runs` — and so are `POST /v1/steps/preview`, running an eval suite (`POST /v1/eval-suites/{id}/run`, unless `validateOnly`), every delete and the restore. An EDITOR key can author a whole flow and cannot preview it.
- **`/v1/steps/batch` is one transaction**: one stale `version` refuses the whole batch. Reach for it deliberately; to change one step, patch that step, and to set a flow's steps as a whole, state them in a project document.
- **For merge, invoke, dispatch and loop-end the row's `outputSlot` is a mirror**, not the truth: their real outputs are in config — lanes, output maps, branches, escape slots. `flow.invoke` writes no primary slot at all.
- **A condition that fails is a skip, not a failure**, and so is a condition that throws. Its `path` is a plain dot-string, while `inputPaths` entries are structured objects — two path notations on one row.
- **`flow.dispatch` with no `default` silently skips an unmatched input**, and so does every step below the unwritten branch slot whose inputs all trace back to it. A step that also reads another present slot still runs — a step runs while any one input is present — so guard a branch step on its branch slot with `slotPresent`.
- **Pinning `modelId` opts a step out of the project's next model change, silently.** Omit it to inherit through `taskKey`; read `GET /v1/nodes/{nodeId}/task-models` at the project's id and its `source` first. A `text.generate` step's `modelSlot` naming an unknown or disabled model fails the run with no fallback.
- **Changing `text.embed`'s model invalidates every stored vector** and needs an index rebuild. `model` is a catalog id (`creator/slug`); the account that serves it is not part of the config.
- **A step whose settings or prompt name its inputs gets them from the platform** — `value.transform`, `value.first-non-empty`, `entity.list`, `entity.read`, `text.generate` and the other config- or template-driven handlers. Omit `inputStreams` (or send `[]`) and the save stores the names the settings or prompt read, each typed from what feeds it; a PATCH that changes the settings or prompt without `inputStreams` re-derives them. A list you DO send must be exactly those names (plus any file a prompt step attaches): the save compares the two as sets and refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH`, whose message names what is missing or extra. Two things catch people:
  - **Provider slots count.** `entity.list` and `entity.read` default `userIdSlot` to `userInfo.userId`, so `userInfo` must be an input (schema `UserInfo`) even on a project-wide type a key calls; a prompt reading `{{projectInfo.config.<namespace>.<field>}}` needs `projectInfo` (schema `ProjectInfo`). A key's run has no `userInfo` at all: a step whose only inputs are provider slots still runs, a project-wide read ignores the missing user, and a per-user record type refuses. But a step reading `userInfo` beside a real slot (a cursor, an optional query filter) waits for that slot, and is skipped when it never arrives — the optional-filter recipe is in `references/patterns.md` §8.
  - **In JSONata, every bare name that starts a path is read as a slot**, including a field name inside a projection: `docs.{"id": id}` makes `id` a slot. Reach into items through a bound variable instead — `$map(docs, function($d){ {"id": $d.id} })`. So is `undefined`: JSONata has no such literal. To emit nothing, write a conditional with no else (`ok ? {…}`); `references/patterns.md` lists the five refused functions (`$eval` among them).
- **A signature change states the side it changes.** A `PATCH /v1/flows/{id}` carrying only `outputTypeNames` changes the outputs and keeps the inputs as stored (and the reverse); the stored binding is carried, pruned to the outputs that remain, unless you send `outputBinding`. While an endpoint or a flow-backed record type holds a snapshot of the old signature it is `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` (under `validateOnly`, an `ok: false` verdict with that code) unless the PATCH adds `adoptSnapshots: true`, which re-publishes those endpoints' contracts to their callers.
- **A model call can fail on the provider, not on you.** When preview's `errors[].message` (or a run's step log) says a provider account is exhausted — quota or billing — move the task, not the step: read `GET /v1/nodes/{nodeId}/task-models` (at the project's id) for the task's current model and `source`, pick a chat model from another creator in `GET /v1/ai-models?type=chat` (every listed row is served — a disabled one is absent; prefer `status: "active"` over `deprecated`, and an `offers[].provider` other than the exhausted one), and bind it at the project node with `PUT /v1/nodes/{nodeId}/task-models/{task} { "modelId": "<creator/slug>" }` (**ADMIN**; a key may do it for its own project). Every step on that `taskKey` follows; pinning `modelId` on one step does the same for that step only and stops it following the next change. `PUT /v1/nodes/{nodeId}/routing/{modelId} { providerOrder, failover: "on-exhaustion" }` (ADMIN) is not an alternative model: it retries the SAME model through the next account listed in `providerOrder`, and only those; naming an account that does not offer the model is refused with `PROVIDER_HAS_NO_OFFER`, and a one-account order is accepted but cannot fail over. A write moves the project's version, so present the version a fresh read or plan gives you on the next document apply.
- **A sync endpoint over `text.generate` can 504 while the model is fast.** `text.generate` and the other ingest-phase handlers queue on the platform's worker, and the wait counts against `syncTimeoutMs` (default 30 s). Raise it on the endpoint (up to 120 000) for a flow with a model step, or make the endpoint `async`. The step log's `durationMs` includes the wait; `GET /v1/ai-calls?project={nodeId}` `latencyMs` is the model's own time, so the difference is queue.
- **`OUTPUT_SLOT_UNBOUND` means the binding is missing, and it is only a warning.** A step may already write the slot; what is absent is the flow's output binding naming it. If it is required, every live call is refused `422 FLOW_OUTPUT_MISSING`, so an unheeded warning ships an endpoint that refuses everything. Bind the slot.
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
`severity` and `introduced`, never on `code`; an error already in the project carries `introduced: false` and does not block), `consequences` (what the change does to stored data: records
re-stamped, vectors re-indexed, and `records-invalid`, the stored records that would no longer
fit a shape you changed), and the `delete` rows of `changes`, which include what a removal takes
along by cascade.

- **Every element is addressed by its `key`** — the key each section's map is keyed by; display
  text is `label`. Where the row API takes an id (`dataEntryId`, `flowId`, `resolverFlowId`) the
  document takes the key (`shape`, `flow`, `resolver`). A bare flow key is this project's; a
  platform flow is `system:<key>`. A step's `ref` is a schema entry's key. The document states
  `kipory: 2`; a `kipory: 1` document is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
- **A partial document is fine.** A section left out is untouched, and so is every row you do not
  name; of an existing row's optional fields, only the ones you state are compared. A row's
  required fields are required, because a row is its create body.
- **Absence never deletes.** Removal is `delete: true` on a row, or `prune: true` on a map to
  remove every row of that map you did not name — and any document that removes something needs
  ADMIN. Owned collections (a flow's `skills`, a facet's `terms`, a suite's `cases`,
  a kind's `pairings`) are stated whole and replace the owner's, so a member you leave out of one
  IS a removal, with the same floor.
- **A field the row's PATCH does not take is permanent.** A facet's `cardinality`, a profile's
  `modelId`, a trigger's `source`: stated as exported it is fine, stated changed it is refused on
  its path — the document never drops it in silence. A new value is a new row under a new key.
- **A shape may be stated inline under the record type that uses it.** That type then OWNS it:
  the shape is edited only through the type and refused to every other consumer until it is
  promoted (`POST /v1/schema-entries/{id}/promote`, one way).
- **`version` is required on the apply** and is the export's. A stale one answers `409` with the
  current document under `details` — re-base on it rather than resending. Any other write to the project
  in between — a task-model binding, a row edit — moves the version too.
- **The plan judges the state it leaves, not only the rows it writes.** Every flow the document
  can move — the ones it writes, the ones invoking them, the ones reading a shape or a table it
  changes — is checked with `GET /v1/flows/{id}/health`'s own rules, and so are the schedules,
  triggers and endpoints that start them. Each such finding carries `introduced`: `true` when this
  document causes it, `false` when it was already there. Only an introduced error makes `ok` false
  and refuses the apply; one already there is reported so you can fix it when you choose. So an `ok`
  plan leaves no flow with an error the plan did not name — `/health` after the apply is a
  confirmation, not the check.
- **A step keeps its id across applies; a changed one moves its version.** Steps are matched by `id`, then by key: one the document leaves alone is not written, one it changes is updated in place with its `version` moved, a new key is created, and a key the `skills` map omits is deleted. Hold a step by id if you like — a rename that keeps the `id` under the new key keeps it too; only a new key stated without the `id` gives a new one. The step-result cache a live run reads first is keyed by the step's id and version, so an apply empties it for the steps it changed and no others.
- **A document writes a `flow.invoke` step's `inputStreams` as stated.** A single step save derives them from the `kind: "slot"` input rows; in a document list them yourself (`patterns.md` §3). What else a step save works out, a document does too: each output row's `derivedShape` is filled from the flow it calls (never state it), and a flow's new signature is judged against the steps the document leaves, so retyping an input and replacing its reader is one apply. A step's `inputPaths` is the same positional list of path objects, `[{ "segments": [{ "kind": "first" }] }]`.
- **YAML in, JSON out.** Send `content-type: application/yaml` or JSON; a document is at most
  2 MiB and 2 000 rows, refused with `413` past either.

`references/packs/project-document.md` carries the rest, and `references/packs/authoring-order.md`
says what must exist before what if you author row by row anyway.

## If a facet sent you here

First check you need a flow at all — usually you do not. A facet whose `matching` is `exact` needs no resolver, and a `semantic` one created without an explicit `null` is bound to a platform default. Author your own resolver only when the default is not what you want, then patch `resolverFlowId` onto the facet (`kipory-model`).

## References

| File                                                                                       | What it answers                                                                                                           |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `references/first-flow.md`                                                                 | one flow from nothing to a live endpoint, every body complete — row by row and as one document                            |
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
