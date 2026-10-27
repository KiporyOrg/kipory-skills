# The project document: the rules

`kipory-build` owns the project document; `SKILL.md` has the routes and the loop. This page has the rules a document is held to. `packs/project-document.md` carries the reference forms and what does not travel; `first-flow.md` §8 is a complete worked document.

## What you state

- **Every element is addressed by its `key`** — the key each section's map is keyed by; display text is `label`.
  - Where the row API takes an id (`dataTypeId`, `flowId`, `resolverFlowId`) the document takes the key (`type`, `flow`, `resolver`).
  - A bare flow key is this project's; a platform flow is `system:<key>`.
  - An action's `ref` is a type's key.
  - The document states `kipory: 9`; a `kipory: 2` to `kipory: 8` document is refused with `DOCUMENT_VERSION_UNSUPPORTED`, and the `kipory-connect` skill's upgrade script converts it. The one format a deployment reads is `documentFormat.version` on `GET /v1/platform-status`, with no overlap between formats: check it before you plan or apply a document. A current document that still says `schema` or a table's `shape` is refused with `DOCUMENT_KEY_RENAMED` at that key.
- **A partial document is fine; a stated element is whole.** A section left out is untouched, and so is every row you do not name. A row you DO state is the whole element: an own optional field you leave out goes back to its default (the plan shows it, with `FIELD_RESET_TO_DEFAULT` naming the value held now), so state every field you mean to keep — the export states them all. Owned collections (`actions`, `cases`, `terms`, `pairings`, `project.config`, `project.routes`, a table's `uses`) left out are untouched; what the platform chooses (an action's input types, output slot and type, `taskKey`; a vocabulary's resolver), a field only a create sets (a trigger's `source`, a vocabulary's `parentVocabularyKey`) and the project's `name` are kept when left out. An action's input wiring left out is what the save derives from its settings, and is cleared where it derives none. A reference left out is cleared: a table's `flow` unbinds, an event type's `payload` and a suite's `regression` go. A config namespace always has a type (`type: null` is refused), and an eval case's `inputs` is required. A row's required fields are required, because a row is its create body.
- **Absence never deletes.** Removal is `delete: true` on a row, or `prune: true` on a map to remove every row of that map you did not name — and any document that removes something needs ADMIN.
- **Owned collections are stated whole.** A flow's `actions`, a vocabulary's `terms`, a suite's `cases` and a relation's `pairings` replace the owner's, so a member you leave out of one IS a removal, with the same ADMIN floor.
- **A field the row's PATCH does not take is permanent.** A vocabulary's `cardinality`, a profile's `modelId`, a trigger's `source`: stated as exported it is fine, stated changed it is refused on its path — the document never drops it in silence. A new value is a new row under a new key.
- **A schedule and a trigger state `failurePolicy`** — `pause` (the default) or `keep-running`: whether the platform may pause the row when its runs keep failing. It is an ordinary field. An export also shows `paused: { at, reason }` on a row the platform has paused; that is read-only — never planned, never applied — and `enabled: true` does not resume the row. Only `POST /v1/schedules/{id}/resume` or `POST /v1/triggers/{id}/resume` does (`kipory-operate`).
- **The `platform` event types are not yours to state.** Every project has them; a document neither creates nor prunes them, and a trigger row may select one (`categoryKey: platform`) like any other type — that trigger is how the project hears of its failures.
- **A type is stated under `types`, and a table names it with `type`.** State both in one document to make a table and its type together; any other row may use the same type.
- **YAML in, JSON out.** Send `content-type: application/yaml` or JSON; a document is at most 8 MiB and 6 000 rows, refused with `413` past either.
- **The YAML export prints each flow's outline as comments above it** (`# outline (format 4), derived at export; plan ignores it`) — the same lines `GET /v1/flows/{id}/outline` answers. A plan ignores comments, so they never change what a plan does; edit the actions, and the next export redraws the outline. A plan finding about one flow action carries its `outlinePath` in that outline.

## What a plan tells you

A plan is not a simulation: the platform applies the document through every row's own write, in one transaction, and rolls it back — so what a plan refuses is exactly what an apply refuses. Read three things off it:

| List                           | Says                                                                                                                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagnostics`                  | each finding on a path in YOUR document, such as `tables.member.type`. Gate on `severity` and `introduced`, never on `code`                                                                                                                                |
| `consequences`                 | what the change does to stored data: records re-stamped, vectors re-indexed, `records-invalid` — the stored records that would no longer fit a type you changed — and `flows-affected` — the flows your document does not state that use a type it changes |
| the `delete` rows of `changes` | what is removed, including what a removal takes along by cascade                                                                                                                                                                                           |

- **A plan answers the contract of each table it creates.** `contracts.<key>` is the field vocabulary the new table would have — the fields a caller sends and the ones its flow adds — and `supportedUses` is the use kinds this deployment accepts. Read them to pick `uses` before the table exists; an apply does not carry them.
- **The plan judges the state it leaves, not only the rows it writes.** Every flow the document can move — the ones it writes, the ones invoking them, the ones reading a type or a table it changes — is checked with `GET /v1/flows/{id}/health`'s own rules, and so are the schedules, triggers and endpoints that start them.
- **`introduced` says whose finding it is.** `true` when this document causes it, `false` when it was already there; a finding about the document itself (a refused row, a bad reference) has no `introduced` and counts as introduced. Only an introduced error makes `ok` false and refuses the apply; one already there is reported so you can fix it when you choose. An error an action you leave as it is already had does not refuse the document, even when you change its neighbours in the same flow; a new one your change causes on it still does. An action you DO change is judged whole: an error it already had refuses the change (`introduced: true`, its message saying it was already stored), so fix it in the same edit.
- **A plan says when nobody would be told of a failure.** A project that runs schedules or triggers and has no enabled trigger on `platform/run.failed` gets `DOCUMENT_NO_FAILURE_LISTENER`. It is information and blocks nothing — but such a project is told of no failed run, and none of its schedules or triggers is ever paused.
- **The failure settings are judged like any other.** A fan-out's `maxFailedBranches` or `maxFailedShare`, a merge's `failuresSlot` and a continuing `flow.invoke` are refused in a plan on the same rules as on an action save (`patterns.md` §2, §3); a document whose `flow.merge` action still states `onBranchFailure` is refused `INVALID_FUNCTION_CONFIG` — say it on the fan-out instead.
- **So an `ok` plan leaves no flow with an error the plan did not name** — `/health` after the apply is a confirmation, not the check.
- **Plan a large document as it grows, not all at once.** A section you leave out is untouched, so plan the types and vocabularies alone, then add the tables and plan again, then the flows, then the endpoints — each plan carrying everything before it. One mistake then shows in the section that introduced it, and a refusal that is not a finding (a 5xx) is found in one call instead of by bisecting the whole. Apply once, when the full document plans clean.

<!-- field-ok: onBranchFailure — a `flow.merge` function-config key this release REMOVED, named so a reader knows what to delete -->

## The apply

- **Plan from your read, apply the plan.** The export writes `basedOn: <nodeId>@<version>` into the document; plan with it (or `?basedOn=`, which overrides it), read the plan, then apply `{planId, note, label?}` — the note says why, in history. Never resend a document to the apply.
- **A file from another project is refused, not bound** (`422`, `details.reason: "BASED_ON_OTHER_PROJECT"`, naming both projects and this one's `version`). To promote a dev project's file to another project, plan it there with that project's current version: `?basedOn=<version>`.
- **Only what someone else changed in YOUR elements stops you.** The plan lists it under `moved` (who, when, why, what); the apply refuses it `409 VERSION_CONFLICT` with the same. Read again, make the change on what the project says now, plan, apply. A change to an element your document does not touch never refuses it.
- **`404 PLAN_UNKNOWN`**: the plan was applied, is over 24 hours old, or was dropped to make room — a key keeps at most 50 open plans per session label, 200 in all and 64 MB of documents per project, oldest dropped first; reading a kept plan an earlier release made answers `outdated`. Plan again.
- **`409 PLAN_STALE`**: the plan no longer says what the apply would do (`changed`), or your read is older than the history the project keeps (`read-too-old`). Plan again from a fresh export.
- **The answer's `basedOn` is your next read**: plan the next part from it. With a `label`, your own earlier parts never count as moves — so give each session its own label: two sessions sharing one key and one label read each other's changes as their own.
- **A platform change can end your read.** When the platform rewrites rows in your project that the history does not record (a change to a platform flow your evals run, a data migration), every read from before it answers `read-too-old`. Export again and plan; nothing of yours was lost.
- **A refused apply answers the standard error, with the plan inside it.** `422 VALIDATION_FAILED`, `details.reason: "DOCUMENT_APPLY_FAILED"`, the whole plan under `details.plan`, and one `details.issues` entry per refusing finding. It is JSON whatever `Accept` asks, a YAML caller included.

## Actions in a document

- **An action keeps its id across applies; a changed one moves its version.** Actions are matched by `id`, then by key:
  - one the document leaves alone is not written;
  - one it changes is updated in place with its `version` moved;
  - a new key is created;
  - a key the `actions` map omits is deleted.
- **Hold an action by id if you like.** A rename that keeps the `id` under the new key keeps the action; only a new key stated without the `id` gives a new one.
- **The action-result cache follows the action.** The cache a live run reads first is keyed by the action's id and version, so an apply empties it for the actions it changed and no others.
- **Re-applying an unchanged document, or its export, changes no action.** What the platform fills in — a derived `derivedShape`, a dispatch's `""` `outputSlot`, a loop-end's carry streams, `{}` against `null`, a stamped `x-record-ref` — is not a difference.
- **A document action is completed the way a single save completes it.**
  - A `flow.invoke` action's `inputStreams` are derived from the slots its `inputs` map reads; leave them out (`patterns.md` §3).
  - Each `flow.invoke` output row's `derivedShape` is filled from the flow it calls; never state it.
  - A function whose settings or prompt name its inputs gets them derived (`action-fields.md`).
  - An action's `inputPaths` is the same positional list of path objects, `[{ "segments": [{ "kind": "first" }] }]`.
- **A flow's new signature is judged against the actions the document leaves**, so retyping an input and replacing its reader is one apply.
- **A signature or type change that live dependents hold needs its grant on the row that changes**: `adoptSnapshots: true` on the flow's row for a signature change, and on the `types.<Name>` row for a type edit refused `TYPE_RESHAPES_BOUND_SNAPSHOTS` (`kipory-evolve`).
