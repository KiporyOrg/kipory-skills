# The project document: the rules

`kipory-build` owns the project document; `SKILL.md` has the routes and the loop. This page has the rules a document is held to. `packs/project-document.md` carries the reference forms and what does not travel; `first-flow.md` §8 is a complete worked document.

## What you state

- **Every element is addressed by its `key`** — the key each section's map is keyed by; display text is `label`.
  - Where the row API takes an id (`dataEntryId`, `flowId`, `resolverFlowId`) the document takes the key (`shape`, `flow`, `resolver`).
  - A bare flow key is this project's; a platform flow is `system:<key>`.
  - A step's `ref` is a schema entry's key.
  - The document states `kipory: 2`; a `kipory: 1` document is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
- **A partial document is fine.** A section left out is untouched, and so is every row you do not name; of an existing row's optional fields, only the ones you state are compared. A row's required fields are required, because a row is its create body.
- **Absence never deletes.** Removal is `delete: true` on a row, or `prune: true` on a map to remove every row of that map you did not name — and any document that removes something needs ADMIN.
- **Owned collections are stated whole.** A flow's `skills`, a facet's `terms`, a suite's `cases` and a kind's `pairings` replace the owner's, so a member you leave out of one IS a removal, with the same ADMIN floor.
- **A field the row's PATCH does not take is permanent.** A facet's `cardinality`, a profile's `modelId`, a trigger's `source`: stated as exported it is fine, stated changed it is refused on its path — the document never drops it in silence. A new value is a new row under a new key.
- **A shape is stated under `schema`, and a record type names it by key.** State both in one document to make a type and its shape together; any other row may use the same shape.
- **YAML in, JSON out.** Send `content-type: application/yaml` or JSON; a document is at most 2 MiB and 2 000 rows, refused with `413` past either.

## What a plan tells you

A plan is not a simulation: the platform applies the document through every row's own write, in one transaction, and rolls it back — so what a plan refuses is exactly what an apply refuses. Read three things off it:

| List                           | Says                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagnostics`                  | each finding on a path in YOUR document, such as `records.member.shape`. Gate on `severity` and `introduced`, never on `code`                                        |
| `consequences`                 | what the change does to stored data: records re-stamped, vectors re-indexed, and `records-invalid` — the stored records that would no longer fit a shape you changed |
| the `delete` rows of `changes` | what is removed, including what a removal takes along by cascade                                                                                                     |

- **A plan answers the contract of each record type it creates.** `contracts.<key>` is the vocabulary the new type would have — the fields a caller sends and the ones its flow adds — and `supportedUses` is the use kinds this deployment accepts. Read them to pick `uses` before the type exists; an apply does not carry them.
- **The plan judges the state it leaves, not only the rows it writes.** Every flow the document can move — the ones it writes, the ones invoking them, the ones reading a shape or a table it changes — is checked with `GET /v1/flows/{id}/health`'s own rules, and so are the schedules, triggers and endpoints that start them.
- **`introduced` says whose finding it is.** `true` when this document causes it, `false` when it was already there; a finding about the document itself (a refused row, a bad reference) has no `introduced` and counts as introduced. Only an introduced error makes `ok` false and refuses the apply; one already there is reported so you can fix it when you choose.
- **So an `ok` plan leaves no flow with an error the plan did not name** — `/health` after the apply is a confirmation, not the check.
- **Plan a large document as it grows, not all at once.** A section you leave out is untouched, so plan the shapes and facets alone, then add the record types and plan again, then the flows, then the endpoints — each plan carrying everything before it. One mistake then shows in the section that introduced it, and a refusal that is not a finding (a 5xx) is found in one call instead of by bisecting the whole. Apply once, when the full document plans clean.

## The apply

- **`version` is required on the apply**: the one the export or the plan answered. A stale one answers `409` with the current document under `details` — re-base on it rather than resending.
- **Any other write to the project in between moves the version too** — a task-model binding, a row edit.
- **A refused apply answers `422` with the plan as its body.**

## Steps in a document

- **A step keeps its id across applies; a changed one moves its version.** Steps are matched by `id`, then by key:
  - one the document leaves alone is not written;
  - one it changes is updated in place with its `version` moved;
  - a new key is created;
  - a key the `skills` map omits is deleted.
- **Hold a step by id if you like.** A rename that keeps the `id` under the new key keeps the step; only a new key stated without the `id` gives a new one.
- **The step-result cache follows the step.** The cache a live run reads first is keyed by the step's id and version, so an apply empties it for the steps it changed and no others.
- **Re-applying an unchanged document, or its export, changes no step.** What the platform fills in — a derived `derivedShape`, a dispatch's `""` `outputSlot`, a loop-end's carry streams, `{}` against `null`, a stamped `x-record-ref` — is not a difference.
- **A document step is completed the way a single save completes it.**
  - A `flow.invoke` step's `inputStreams` are derived from its `kind: "slot"` input rows; leave them out (`patterns.md` §3).
  - Each `flow.invoke` output row's `derivedShape` is filled from the flow it calls; never state it.
  - A handler whose settings or prompt name its inputs gets them derived (`step-fields.md`).
  - A step's `inputPaths` is the same positional list of path objects, `[{ "segments": [{ "kind": "first" }] }]`.
- **A flow's new signature is judged against the steps the document leaves**, so retyping an input and replacing its reader is one apply.
- **A signature or shape change that live dependents hold needs its grant on the row that changes**: `adoptSnapshots: true` on the flow's row for a signature change, and on the `schema.<Name>` row for a shape edit refused `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS` (`kipory-evolve`).
