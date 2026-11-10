# The project document: the rules

`kipory-build` owns the project document; `SKILL.md` has the routes and the loop. This page has the rules a document is held to. `packs/project-document.md` carries the reference forms and what does not travel; `quickstart-document.md` is a complete worked document.

## What you state

- **Every element is addressed by its `key`** — the key each section's map is keyed by; display text is `label`.
  - Where the row API takes an id (`dataTypeId`, `flowId`, `resolverFlowId`) the document takes the key (`type`, `flow`, `resolver`).
  - A bare flow key is this project's; a platform flow is `system:<key>`.
  - A `flow.invoke` or `flow.start-per-person` step names the flow it calls by key in `with.flow`.
  - The document states `kipory: 11`; any other format is refused at plan with `DOCUMENT_VERSION_UNSUPPORTED`. The one format a deployment reads is `documentFormat.version` on `GET /v1/platform-status`: check it before you plan. Nothing converts a document from another format: export the project again, or write it in format 11.
- **A partial document is fine; a stated element is whole.** A section left out is untouched, and so is every row you do not name. A row you DO state is the whole element: an own optional field you leave out goes back to its default (the plan shows it, with `FIELD_RESET_TO_DEFAULT` naming the value held now), so state every field you mean to keep — the export states them all. Owned collections (a flow's `steps`, `cases`, `terms`, `pairings`, `project.config`, `project.routes`, a table's `uses`) left out are untouched; what the platform chooses (a vocabulary's resolver), a field only a create sets (a trigger's `source`, a vocabulary's `parentVocabularyKey`) and the project's `name` are kept when left out. A reference left out is cleared: a table's `flow` unbinds, an event type's `payload` and a suite's `regression` go. A config namespace always has a type (`type: null` is refused), and an eval case's `inputs` is required. A row's required fields are required, because a row is its create body.
- **Absence never deletes.** Removal is `delete: true` on a row, or `prune: true` on a map to remove every row of that map you did not name — and any document that removes something needs ADMIN.
- **Owned collections are stated whole.** A flow's `steps`, a vocabulary's `terms`, a suite's `cases` and a relation's `pairings` replace the owner's, so a member you leave out of one IS a removal, with the same ADMIN floor.
- **A field the row's PATCH does not take is permanent.** A vocabulary's `cardinality`, a profile's `modelId`, a trigger's `source`: stated as exported it is fine, stated changed it is refused on its path — the document never drops it in silence. A new value is a new row under a new key.
- **A schedule and a trigger state `failurePolicy`** — `pause` (the default) or `keep-running`: whether the platform may pause the row when its runs keep failing. It is an ordinary field. An export also shows `paused: { at, reason }` on a row the platform has paused; that is read-only — never planned, never applied — and `enabled: true` does not resume the row. Only `POST /v1/schedules/{id}/resume` or `POST /v1/triggers/{id}/resume` does (`kipory-operate`).
- **The `platform` event types are not yours to state.** Every project has them; a document neither creates nor prunes them, and a trigger row may select one (`categoryKey: platform`) like any other type — that trigger is how the project hears of its failures.
- **A type is stated under `types`, and a table names it with `type`.** State both in one document to make a table and its type together; any other row may use the same type.
- **YAML in, JSON out.** Send `content-type: application/yaml` or JSON; a document is at most 8 MiB and 6 000 rows, refused with `413` past either.
- **The YAML export prints each flow's outline as comments above it** — the same lines `GET /v1/flows/{id}/outline` answers. A plan ignores comments; edit the steps, and the next export redraws the outline.
- **In YAML, quote a path holding `[` inside `{ … }`**: `{ notes: "perMember[].written" }`. Unquoted, the document does not parse.

## What a plan tells you

A plan is not a simulation: the platform applies the document through every row's own write, in one transaction, and rolls it back — so what a plan refuses is exactly what an apply refuses. Read three things off it:

| List                           | Says                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagnostics`                  | each finding on a path in YOUR document, such as `tables.member.type` or `flows.renew-members.steps[perMember].steps[reachable].if[0].test`. A finding about steps also carries `at` and its `fixes` or `decision`. Gate on `severity` and `introduced`, never on `code`                                |
| `consequences`                 | what the change does to stored data: records re-stamped, vectors re-indexed, and `flows-affected` — the flows your document does not state that use a type it changes. A type change stored records would break is no consequence: it is refused `TYPE_UNSAFE_FOR_TABLE` (widen, backfill, then narrow) |
| the `delete` rows of `changes` | what is removed, including what a removal takes along by cascade                                                                                                                                                                                                                                        |

- **A plan answers the contract of each table it creates.** `contracts.<key>` is the field vocabulary the new table would have — the fields a caller sends and the ones its flow adds — and `supportedUses` is the use kinds this deployment accepts. Read them to pick `uses` before the table exists; an apply does not carry them.
- **The plan judges the state it leaves, not only the rows it writes.** Every flow the document can move — the ones it writes, the ones invoking them, the ones reading a type or a table it changes — is checked with `GET /v1/flows/{id}/health`'s own rules, and so are the schedules, triggers and endpoints that start them.
- **`introduced` says whose finding it is.** `true` when this document causes it, `false` when it was already there; a finding about the document itself (a refused row, a bad reference) has no `introduced` and counts as introduced. Only an introduced error makes `ok` false and refuses the apply; one already there is reported so you can fix it when you choose. An error a step you leave as it is already had does not refuse the document, even when you change its neighbours in the same flow; a new one your change causes on it still does. A step you DO change is judged whole: an error it already had refuses the change, so fix it in the same edit.
- **A plan says when nobody would be told of a failure.** A project that runs schedules or triggers and has no enabled trigger on `platform/run.failed` gets `DOCUMENT_NO_FAILURE_LISTENER`, an `info` finding, on every plan while nothing listens (`kipory plan` counts it; `--all` prints it). It is information and blocks nothing — but such a project is told of no failed run, and none of its schedules or triggers is ever paused.
- **So an `ok` plan leaves no flow with an error the plan did not name** — `/health` after the apply is a confirmation, not the check.
- **Plan a large document as it grows, not all at once.** A section you leave out is untouched, so plan the types and vocabularies alone, then add the tables and plan again, then the flows, then the endpoints — each plan carrying everything before it. One mistake then shows in the section that introduced it, and a refusal that is not a finding (a 5xx) is found in one call instead of by bisecting the whole. Apply once, when the full document plans clean.

## The apply

- **Plan from your read, apply the plan.** The JSON export answers `{ version, document }` and writes `basedOn: <nodeId>@<version>` inside `document`, not beside it; plan with it (or `?basedOn=`, which overrides it and takes the envelope's `version` or the whole `<nodeId>@<version>`), read the plan, then apply `{planId, note, label?}` — the note says why, in history. Never resend a document to the apply.
- **A file from another project is refused, not bound** (`422`, `details.reason: "BASED_ON_OTHER_PROJECT"`, naming both projects and this one's `version`). To promote a dev project's file to another project, plan it there with that project's current version: `?basedOn=<version>`.
- **Only what someone else changed in YOUR elements stops you.** The plan lists it under `moved` (who, when, why, what); the apply refuses it `409 VERSION_CONFLICT` with the same. Read again, make the change on what the project says now, plan, apply. A change to an element your document does not touch never refuses it.
- **`404 PLAN_UNKNOWN`**: the plan was applied, is over 24 hours old, or was dropped to make room — a key keeps at most 50 open plans per session label, 200 in all and 64 MB of documents per project, oldest dropped first; reading a kept plan an earlier release made answers `outdated`. Plan again.
- **`409 PLAN_STALE`**: the plan no longer says what the apply would do (`changed`), or your read is older than the history the project keeps (`read-too-old`). Plan again from a fresh export.
- **The answer's `basedOn` is your next read**: plan the next part from it. With a `label`, your own earlier parts never count as moves — so give each session its own label: two sessions sharing one key and one label read each other's changes as their own.
- **A platform change can end your read.** When the platform rewrites rows in your project that the history does not record (a change to a platform flow your evals run, a data migration), every read from before it answers `read-too-old`. Export again and plan; nothing of yours was lost.
- **A refused apply answers the standard error, with the plan inside it.** `422 VALIDATION_FAILED`, `details.reason: "DOCUMENT_APPLY_FAILED"`, the whole plan under `details.plan`, and one `details.issues` entry per refusing finding. It is JSON whatever `Accept` asks, a YAML caller included.

## Steps in a document

- **A flow's `steps` are its whole list, in written order.** A step you leave out is removed; a flow whose `steps` key is left out keeps its steps as they are. The export always states them.
- **The plan matches steps by flow and key.** A step whose fields changed is an `update` with each field from → to; one whose parent block, branch or position changed is a `move`; a key that is new is a `create`; a key gone is a `delete`. Renaming a step's key is a delete and a create, and every reader of the old key must change with it.
- **The plan judges every flow with the save's own proof** (`checking.md` §1): a finding's `fixes[].edit` is the change to make in your file — the same edits `POST /v1/flows/{id}/steps/edit` takes once the flow exists.
- **Re-applying an unchanged document, or its export, changes no step.**
- **A flow's new signature is judged against the steps the same document gives it**, so retyping an input and changing its readers is one apply.
- **A signature or type change that live dependents hold needs its grant on the row that changes**: `adoptSnapshots: true` on the flow's row for a signature change, and on the `types.<Name>` row for a type edit refused `TYPE_RESHAPES_BOUND_SNAPSHOTS` (`kipory-evolve`). A change that only adds optional fields (or a new output) needs none: the plan adopts it and says so (`DOCUMENT_ADOPTED_ADDITIVE`).
- **A flow with no steps yet does not start** (`FLOW_NOT_AUTHORED`). A document may state a flow with `steps: []`; write its steps and plan again.

## The document loop, route by route

```
GET   /v1/projects/{nodeId}/document          the project now; the document carries `basedOn` (`<nodeId>@<version>`), your read
POST  /v1/projects/{nodeId}/document/plan     ?basedOn=&label= — what applying it would do, kept as `planId`
GET   /v1/projects/{nodeId}/document/plans/{planId}   a kept plan read back — for a reviewer, before it is applied
POST  /v1/projects/{nodeId}/document          { planId, note, label? } — one transaction, one version, one history entry
GET   /v1/project-document/schema             the format, public
GET   /v1/project-document/example            a complete document that belongs to no project, public
```

- **The format is 11** (`kipory: 11`), and only 11: an older document is refused at plan with `DOCUMENT_VERSION_UNSUPPORTED`. Plan the `document` alone, never an export's envelope `{ "version", "document" }`.
- **Read the plan before you apply it**: `changes` (only what changes; steps are matched by flow and key, and a step whose place changed is a `move`), `moved` (what someone else changed after your read — any here and `ok` is false), `diagnostics` (gate on `severity`, never on `code`; a step finding carries `at` and its `fixes` or `decision`), `health`, `consequences` and the `delete` rows. A platform release that breaks a live flow is not in any plan: the project hears it as the `platform/flow-health.failing` event.
- **Everything is addressed by `key`.** A flow's `steps` are stated whole, in written order: a step you leave out IS removed. Other rows: absence never deletes; removal is `delete: true` on a row or `prune: true` on a map, and needs ADMIN.
- **Apply the plan you read, with a note**: `{planId, note: "Shorten the reminder copy", label: "agent-docs"}`. The answer's `basedOn` is your next read. **On `409 VERSION_CONFLICT`**: read again, change what the project says now, plan, apply. **On `409 PLAN_STALE`**: plan again.
- **Plan a large document as it grows** — types, tables, flows, endpoints — and apply once it plans clean.
