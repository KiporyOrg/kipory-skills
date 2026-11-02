---
name: kipory-build
description: Build or edit a Kipory flow — create it with its typed signature, add actions over the function catalog, wire slots between them, bind the output so a call returns something, check health, and preview it — and write, plan and apply a whole project as one document. Use when implementing the processing a plan called for, adding or changing an action, choosing a function, calling a model or LLM with a prompt (summarise, extract, classify, decide yes or no) and choosing which model it runs on, adding a fan-out, merge, loop, branch or sub-flow, when an action save is refused, health says the flow cannot run, or a model or provider stopped answering. Not for putting the flow on HTTP (kipory-expose), not for reading a past run (kipory-diagnose), and before changing a flow that an endpoint or a table already depends on, read kipory-evolve.
license: MIT
---

# Build a flow

Flows are the main build target and where most time is spent. A flow is a named group of **actions** — an action is one part of a flow: a function key, its config, the slots it reads and the slot it writes — plus a typed signature and an output binding. The fact most people get wrong: **an action write returning 2xx is not a promise the flow will run.** Only an action-level error refuses a save; edge and flow errors save cleanly and ride back as `outstandingIssues`, and nothing re-checks the graph at run time.

## Start here

**A new backend, or any change of more than a few rows, is one project document.** Read `references/quickstart-document.md` first: one complete project this deployment planned, applied and ran, the loop (read `basedOn`, plan, apply), and every name and field that refuses a plan. Copy its shapes. `references/document.md` has every rule of the document; `references/row-by-row.md` has the single-action routes and the long list of pitfalls.

- **Function keys:** `references/functions/README.md` lists every function in one line; open a function's own page only for one you use. Confirm a key live with `GET /v1/functions/{key}` before relying on it.
- **A yes/no, a pick from a closed list or a score is `text.decide`, not a prompt** — the cheapest model action (`references/models.md`).
- **A flow reaches the outside only through a function** — `url.fetch` / `url.send` for any HTTP API (`kipory-gather`).

## Which function for which job

One row per catalog group. The function pages say what each key takes; the last column says where the judgment is.

| Group                                  | Functions                                                                                                                                                                                                                                      | Judgment                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| ai — ask a model                       | `text.generate` (written words), `text.decide` (yes/no, a closed pick, a score), `text.rerank`                                                                                                                                                 | `references/models.md`                                                             |
| text — shape text, no model            | `text.interpolate`, `text.extract`, `text.detect-language`, `text.chunk`, `text.sanitize`                                                                                                                                                      | `references/patterns.md` (`text.interpolate`), `kipory-extract`, `kipory-retrieve` |
| sources — fetch from outside           | `url.*`, `web.*`, `youtube.*`, `x.*`, `place.*`, `telegram.*`, `location.resolve`, the social and ad-library families; `source.watch` / `source.unwatch` keep a channel watched while your users follow it                                     | `kipory-gather`; watching is `kipory-channels` (`packs/sources.md`)                |
| files — read what a file holds         | `pdf.parse`, `pdf.screenshot`, `file.read-text`, `file.stats`, `file.download-url`, `file.copy`, `audio.transcribe`, `audio.metadata`, `image.metadata`, `image.resize`, `image.decode-qr`                                                     | `kipory-extract`                                                                   |
| search — find by meaning               | `record.query` with a `semantic` clause (records), `term.search` (a vocabulary's terms). The platform indexes records itself from a table's `search` use; no action embeds or writes to the index                                              | `kipory-retrieve`                                                                  |
| records — write and read               | `record.create`, `record.update`, `record.read`, `record.list`, `record.count`, `record.aggregate` (totals and per-group figures), `record.enqueue-process`, `record.query`, the one that joins, and `record.view`, which reads a view by name | `references/records-and-endpoints.md`                                              |
| records — more writes, links           | `record.append`, `record.delete`, `record.merge`, `record.teardown`, `record.links`, `record.link-counts`, `record.link-assert`, `record.link-retract`                                                                                         | `kipory-data`'s `references/in-flow-record-functions.md`                           |
| records — classification               | `vocabulary.resolve`, `term.upsert`, `term.threshold-gate`, `vocabulary.aggregate`                                                                                                                                                             | `kipory-model`                                                                     |
| outbound — reach a person or a service | `email.send` (mail to a person), `push.send` (a notification to a person's devices), `url.send` (a keyed write to an outside HTTP API, delivered after the run saves)                                                                          | `kipory-channels`; `url.send` is `kipory-gather`                                   |
| flow — steer the run                   | `flow.fan-out`, `flow.merge`, `flow.invoke`, `flow.start-per-person`, `flow.continue`, `flow.loop`, `flow.loop-end`, `flow.dispatch`, `state.write`, `state.read`, `event.emit`                                                                | `references/patterns.md`; `event.emit` is `kipory-operate`                         |
| utility — compute, pick, join          | `value.transform`, `value.first-non-empty`, `list.concat`                                                                                                                                                                                      | `references/patterns.md`                                                           |

## The document loop

```
GET   /v1/projects/{nodeId}/document          the project now; the document carries `basedOn` (`<nodeId>@<version>`), your read
POST  /v1/projects/{nodeId}/document/plan     ?basedOn=&label= — what applying it would do, kept as `planId`
GET   /v1/projects/{nodeId}/document/plans/{planId}   a kept plan read back — for a reviewer, before it is applied
POST  /v1/projects/{nodeId}/document          { planId, note, label? } — one transaction, one version, one history entry
GET   /v1/project-document/schema             the format, public
GET   /v1/project-document/example            a complete document that belongs to no project, public
```

- **Read the plan before you apply it**: `changes` (only what changes; each `update` says `fields` from → to), `moved` (what someone else changed after your read — any here and `ok` is false), `diagnostics` (what this document introduces; gate on `severity`, never on `code`), `health` (errors and warnings before and after, over the flows it reaches), `consequences` (what it does to stored data) and the `delete` rows. A platform release that breaks a live flow is not in any plan: the project hears it as the `platform/flow-health.failing` event.
- **The format is 10** (`"kipory": 10`). Plan the `document` alone, never an export's envelope `{ "version", "document" }`.
- **Everything is addressed by `key`**; a schema reference is `{ "kind": "ref", "ref": "<type key>" }`.
- **A partial document is fine, and absence never deletes.** Removal is `delete: true` on a row or `prune: true` on a map, and needs ADMIN. Owned collections — a flow's `actions`, a vocabulary's `terms` — are stated whole, so an action you leave out of a flow's `actions` IS removed.
- **Apply the plan you read, with a note**: `{planId, note: "Shorten the reminder copy", label: "agent-docs"}`. The note and label show in history. The answer carries no document; keep its `basedOn` and plan the next part from it. Never resend an old document.
- **On `409 VERSION_CONFLICT`**: read `details.moved` (who changed what after your read), read the project again, make your change on what it says now, plan, apply. **On `409 PLAN_STALE`**: plan again. Changes to elements your document does not touch never refuse it.
- **Plan a large document as it grows**: types and vocabularies, then tables, then flows, then endpoints. Apply once, when the whole plans clean — or in parts from one read, each under the same `label`, so your own parts never count as moves.
- **An `ok` plan has already run health** on every flow the document can move, so `/health` after the apply is a confirmation.

## If a vocabulary sent you here

First check you need a flow at all — usually you do not. A vocabulary whose `matching` is `exact` needs no resolver, and a `semantic` one created without an explicit `null` is bound to a platform default. Author your own resolver only when the default is not what you want, then patch `resolverFlowId` onto the vocabulary (`kipory-model`).

## References

| File                                                                                         | What it answers                                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/quickstart-document.md`                                                          | start here: one complete project as a document, the loop, and what refuses a plan                                                                                 |
| `references/row-by-row.md`                                                                   | before the first call, the row-by-row routes, every pitfall, the full document loop                                                                               |
| `references/first-flow.md`                                                                   | one flow from nothing to a live endpoint, every body complete — row by row and as one document                                                                    |
| `references/action-fields.md`                                                                | every action field and what leaving it out does, path segments, schema reference forms, the inputs the platform derives, when an action runs                      |
| `references/patterns.md`                                                                     | §1–§6, the control shapes — pipeline, fan-out and merge, sub-flow, loop, branch, run state — and the utilities, `value.transform` first                           |
| `references/records-and-endpoints.md`                                                        | §7–§11 — a record's processing flow and file inputs, what an endpoint answers (404, 422), `record.query` and a per-user feed, roll-ups, and views (§11)           |
| `references/models.md`                                                                       | which model function to use, how to write a `text.decide` question and gate on its confidence, task bindings, model prices, a provider that stopped answering     |
| `references/checking.md`                                                                     | where diagnostics are, dry runs, preview and the queued preview's trace, what needs ADMIN, checkpoints                                                            |
| `references/document.md`                                                                     | the project document's rules: keys, partial documents, removal, what a plan reports, versions, actions across applies                                             |
| `references/functions/README.md`                                                             | every function, one line each, by group, tagged with its phase and what it spends                                                                                 |
| `references/functions/<key>.md`                                                              | one function: what it reads and emits, its config table with cautions, credential, rate limit, queue, and a worked example                                        |
| `references/functions/expressions.md`                                                        | every function an expression may call beyond JSONata's own — `$list`, `$indexBy`, `$hostOf`, `$formatDate`, `$termLabel`, … — with what each answers for no value |
| `references/packs/flows-and-actions.md`                                                      | the judgment: output binding, preview, how an action runs, what travels between actions                                                                           |
| `references/packs/flow-checkpoints.md`                                                       | snapshot and restore                                                                                                                                              |
| `references/packs/project-document.md`                                                       | the whole project as one document: reference forms, the plan's three lists, what does not travel                                                                  |
| `references/packs/authoring-order.md`                                                        | what must exist before what, when you author row by row                                                                                                           |
| `references/api/flows.md` · `actions.md` · `flow-checkpoints.md` · `functions-and-models.md` | every route's fields                                                                                                                                              |
| `references/api/project-document.md`                                                         | the export, plan and apply routes, and the two public reads                                                                                                       |

## Then

`kipory-expose` to put the flow on HTTP. `kipory-prove` to pin what "working" means before you edit it again. `kipory-model` when the flow needs a table, a type or a vocabulary that does not exist yet. `kipory-data` to seed or correct the records the flow reads, and to reprocess them after an edit. `kipory-operate` to run the flow on a schedule or a trigger, and for what it spent. `kipory-secrets` if a function reported a missing API key — the fix is a stored credential, not a flow edit. `kipory-channels` if an action sends mail or reads a Telegram channel. For the action itself rather than the wiring: `kipory-gather` for a source that reaches outside the project, `kipory-extract` for one that opens a file, and `kipory-retrieve` for the chunk-embed-search-cite chain. `kipory-evolve` before changing a flow that something already depends on. `kipory-diagnose` when a run came back wrong.
