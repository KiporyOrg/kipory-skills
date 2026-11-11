---
name: kipory-evolve
description: Change a Kipory project that already holds records or serves callers, without breaking it — rename a table or change its type, add a required field (a migration), change a flow's inputs or outputs behind a live endpoint (a breaking change), re-run stored records after their processing flow changed, delete a flow, vocabulary, term, relation or table that something depends on, and undo a change. Use before any delete, rename or type change on a project that is not empty, when a write is refused naming dependents, pinned records or a locked signature (a 409), when asking what a change would break before making it (`validateOnly`, a document plan's consequences and cascades), or when an edit has to be rolled back. Not for authoring on an empty project or an ordinary step edit (kipory-build, kipory-model).
license: MIT
---

# Change a project that is already live

Authoring into an empty project and changing a live one are different disciplines. In an empty
project every write is a create and nothing can break. In a live one, records already exist, flows
already reference each other, endpoints already serve clients, and a configuration digest is
already cached by everything that read it.

**The fact most people get wrong: the platform rehearses almost every dangerous change for you, and
each rehearsal has a different name.** There is no single dry-run flag. There are more than a dozen
routes with as many names, and an agent that does not know they exist discovers a cascade by causing it. There is
one rehearsal that covers a whole change at once — a planned **document** — and it is the one to
reach for when the change touches more than a handful of rows.

## Before the first call

- **Read the current state and keep the digest.** `GET /v1/bootstrap` returns every section plus a
  `structureVersion`. Every change here moves it; that is how a client knows its cached copy is
  stale.
- **Know whether the thing you are changing has data.** A table carries `hasRecords` and
  `recordCount` on its own read, `GET /v1/tables/{id}` — not on the bootstrap's table
  rows, which omit both. They are the difference between an edit and a migration.
  `GET /v1/projects/{nodeId}/usage` is not this read — it answers what the project SPENT, not what
  it holds.
- **Concurrency control is per-resource, and you have to know which kind you are facing.** Tables,
  vocabularies and their neighbours require the `version` you last read on a patch and refuse a
  stale one. A flow's steps are locked by the flow's own `version`: a step write
  (`PUT /v1/flows/{id}/steps`, `POST /v1/flows/{id}/steps/edit`) against any other answers **409**
  and saves nothing. Re-read the flow and apply your change again; there is no override.

  <!-- field-ok: version — the optimistic-concurrency token, named on several design resources -->

## Rehearse first

Every rehearsal, route by route, with what each answers, is `references/rehearsals.md`. The short
form:

| To learn                                       | Ask                                                                                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| what the project holds                         | `GET /v1/bootstrap?project={nodeId}`, then `GET /v1/tables/{id}` for each table's `hasRecords` / `recordCount`                                                              |
| what points at an element                      | `GET /v1/projects/{nodeId}/connections` — computed from the configuration, so current after every write                                                                     |
| who uses a field, config key, relation or flow | `GET /v1/projects/{nodeId}/references?of=field:review.stars` — every use, at its step's outline path, with how sure the platform is                                         |
| what each flow does, in one small read         | `GET /v1/projects/{nodeId}/map`                                                                                                                                             |
| whether a delete would be refused              | the same `DELETE` with `?validateOnly=true` — every design-row delete and a record's has one, and none takes a `confirm` flag; a file, link or secret delete has no dry run |
| what a patch would derive, break or queue      | the same `PATCH` with `validateOnly: true` — flows, types, tables, relations, and every other design row whose reference lists the flag                                     |
| what a step change would break                 | `PUT /v1/flows/{id}/steps` or `POST /v1/flows/{id}/steps/edit` with `validateOnly: true` — the verdict, each finding with its ready fix                                     |
| what a checkpoint restore would undo           | `POST /v1/flow-checkpoints/{id}/restore` with `validateOnly: true`                                                                                                          |
| what a whole change would do                   | `POST /v1/projects/{nodeId}/document/plan` — every refusal, every cascade, and what it does to stored records, without writing                                              |

**Before a rename or a removal, ask who uses it.** `GET /v1/projects/{nodeId}/references?of=<subject>`
takes up to 20 subjects by key — `field:review.stars`, `config:club.digestHour`, `relation:review-of-book`,
`flow-output:book-card.card`, `step-output:book-card.reviews` (a step's value) — and answers every use: the step (with its
outline path) or the endpoint, schedule, trigger or declaration, its `role` and the `path` inside it. Read
`certainty` before you act: `declared` and `typed` are certain; `named` is a name matched inside an expression
or on a value of unknown type, and `whole` means the whole record is read or written, so check those by hand.
Narrow a long answer with `&certainty=declared&certainty=typed` or `&role=writes`.

After the edit, `GET /v1/flows/{id}/health` says whether the flow is whole and
`GET /v1/eval-suites/{id}/readiness` whether a suite can still judge it.

⚠️ **`POST /v1/flows/{id}/preview` is not one of these.** It runs the flow for real and **applies
its writes** unless you pass `apply: false`, it bills the payer, and it needs ADMIN. It is a test
run, not a rehearsal. `kipory-build` covers it.

## Change many things at once: the document

**Check the format first.** A document states its format in its `kipory:` key (`kipory: 11`), and the
deployment reads exactly one, with no overlap: `documentFormat.version` on
`GET /v1/platform-status`, beside a line saying what it is. A document in any other format is
refused whole with `DOCUMENT_VERSION_UNSUPPORTED` before anything is planned, and nothing converts
it: export the project again and make the change there. The `kipory-connect` skill's sync script
compares the format these skills write with the deployment's, and its `document` line says plainly
when they differ: update these skills when the deployment's is newer.

Export the project (`GET /v1/projects/{nodeId}/document` — the file carries `basedOn`, your read),
edit the file, plan it (the body is the document itself; it binds to that read), read the plan,
and apply `{ planId, note }` — never the document again. `kipory-build` owns that loop and the document's format.

**Name your session on every write.** A plan takes `?label=`, an apply `label`, and a row save
(`PATCH /v1/flows/{id}`, `PUT /v1/flows/{id}/steps`, any design row's own write) the header
`Kipory-Session-Label: <label>` (1–64 characters), beside `Kipory-Change-Note: <why>` (1–500), the
sentence history shows for that save; text outside ASCII goes percent-encoded. Send the same label
from the same key on every plan, apply and save of one working session. The label is how a plan
tells your own writes since your read from someone else's: a save or an apply without it is listed
under the plan's `moved`, and the apply answers `409 VERSION_CONFLICT` for your own work.

What matters here is that the plan is the apply rolled back, so it answers the same refusals a
row-by-row change would meet, in one read, and three things a row write never tells you:

- **`consequences`** — how many stored records the change re-stamps or re-indexes. A
  consequence is never a refusal; the platform tells you and lets you. A type change stored
  records would break is not a consequence: it is refused `TYPE_UNSAFE_FOR_TABLE`, judged by reach
  (a type another type references is checked through every table that reaches it). Widen,
  backfill, then narrow. Deleting a relation
  deletes every stored link of that relation, and the plan counts them as `links-deleted` on the
  relation's path — save them first (`GET /v1/links?project=<node>&relation=<key>`) if they matter.
  `flows-affected` names every flow your document does not state that reads or writes a type
  it changes. Type names are project-wide, so a type you state may be the one another
  document's flows use: if it is not yours, rename yours before applying.
- **Cascades before the fact.** A removal that takes other rows along — the relations that
  pair a deleted table, the terms of a deleted vocabulary — is in `changes` as a
  `delete` with `because: "cascade"` and a `DOCUMENT_DELETE_CASCADED` warning. Read the plan's
  delete list before applying; it is the true list, not only yours. A table delete also names
  its reach on its own path — the relations and joins it would take — even when the plan
  refuses the delete.
- **Nothing partial.** A refused apply answers `422 VALIDATION_FAILED` with the plan under `details.plan` and has written nothing — not
  the rows before the refused one either. A document that changes nothing answers `applied: true`
  and moves no version.

Removal is explicit (`delete: true`, or `prune: true` on a map) and needs ADMIN; absence never
deletes. How to write a delete row, and what a plan's `changes` do and do not promise, is
`references/change-order.md`, "Removing through a document".

## The order of operations

Work outside-in when adding, inside-out when removing, and classify the change before either:
the class decides the sequence, and every sequence is written out once, in
`references/change-order.md`.

| The change                                                    | The rule                                                                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adding**                                                    | the dependency exists before the thing that names it: type → flow → table → endpoint → schedule                                                      |
| **Removing**                                                  | the reverse: delete the leaf, then what it hung from. A flow delete is `409 FLOW_HAS_DEPENDENTS` while anything names it, a disabled schedule too    |
| **Changing a type under live records**                        | four moves: widen (add the field as optional), backfill, patch the fixed inputs of schedules and triggers, then narrow. Narrowing first is an outage |
| **Editing the processing flow of a table that holds records** | the edit saves and stored records keep what the old steps wrote. Reprocess them (`kipory-data`); a reprocess is charged like a first processing      |
| **Renaming a step's key**                                     | its key is its value's name: one steps write that renames it and every reader, rehearsed with `validateOnly` first                                   |
| **Changing a flow's own inputs or outputs**                   | a change to the product's API: `409` until `adoptSnapshots: true`                                                                                    |

## What refuses, and what cascades instead

**What refuses, and what cascades instead** — which destructive changes are refused outright, which cascade instead, and what each refusal and cascade carries: `references/refusals-and-cascades.md`.

## Rolling back

**Rolling back** — flow checkpoints, an export planned against the project as it is now, and what has no undo: `references/rolling-back.md`.

## What will bite you

**What will bite you** — the traps of changing a live project: dry runs, health after a roll, stale tokens, frozen signatures, retries, retire and purge, address moves: `references/pitfalls.md`.

## References

| File                                  | What it answers                                                                                                                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/rehearsals.md`            | every rehearsal route and what it answers                                                                                                                                                                                                                              |
| `references/change-order.md`          | a change request → its class, then the full sequence for each: additive, narrowing a type (who owns it, `adoptSnapshots`, the backfill), editing a processing flow under live records, removing, changing a flow's steps, retiring a term, removing through a document |
| `references/refusals-and-cascades.md` | what refuses and what cascades instead; what each refusal carries and the way round it; what each cascade reports                                                                                                                                                      |
| `references/rolling-back.md`          | flow checkpoints, an export as the rollback, and what has no undo                                                                                                                                                                                                      |
| `references/pitfalls.md`              | what will bite you when changing a live project                                                                                                                                                                                                                        |

## Then

`kipory-model` for the table, vocabulary, term or relation itself; what each delete reports
is on that skill's `references/api/` pages. `kipory-build` for checkpoints, flow health and writing steps.
`kipory-expose` when the change reaches an endpoint's contract. `kipory-prove` to re-baseline what a
deliberate change made red. `kipory-data` for the backfill, for reprocessing stored records after
their flow changed, and for deleting records before a table can go. `kipory-diagnose` when the change landed and something downstream started answering wrongly.
