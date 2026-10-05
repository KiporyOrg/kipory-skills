---
name: kipory-evolve
description: Change a Kipory project that already holds records or serves callers, without breaking it — rename or re-shape a record type, add a required field (a migration), change a flow's inputs or outputs behind a live endpoint (a breaking change), re-run stored records after their processing flow changed, delete a flow, facet, term, relation kind or record type that something depends on, and undo a change. Use before any delete, rename or shape change on a project that is not empty, when a write is refused naming dependents, pinned records or a locked signature (a 409), when asking what a change would break before making it (`validateOnly`, a document plan's consequences and cascades), or when an edit has to be rolled back. Not for authoring on an empty project or an ordinary step edit (kipory-build, kipory-model).
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
- **Know whether the thing you are changing has data.** A record type carries `hasRecords` and
  `recordCount` on its own read, `GET /v1/record-types/{id}` — not on the bootstrap's record-type
  rows, which omit both. They are the difference between an edit and a migration.
  `GET /v1/projects/{nodeId}/usage` is not this read — it answers what the project SPENT, not what
  it holds.
- **Concurrency control is per-resource, and you have to know which kind you are facing.** Record
  types, facets and their neighbours require the `version` you last read on a patch and refuse a
  stale one. A step in a flow is optimistic-locked the same way and answers **409**
  with one of three kinds — `stale-version`, `concurrent-consumer-write` or `unique-collision`. The
  first two are re-read-and-retry, or resubmit with `overwriteConcurrentEdit`, which skips the
  pre-check **and nothing else**: it never clears a `unique-collision`, and it never relaxes
  validation. Read the resource's own contract before assuming either shape.

  <!-- field-ok: version — the optimistic-concurrency token, named on several design resources -->

## Rehearse first

Every rehearsal, route by route, with what each answers, is the first table of
`references/change-order.md`. The short form:

| To learn                                  | Ask                                                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| what the project holds                    | `GET /v1/bootstrap?project={nodeId}`, then `GET /v1/record-types/{id}` for each type's `hasRecords` / `recordCount`                                                |
| what points at an element                 | `GET /v1/projects/{nodeId}/connections` — computed from the configuration, so current after every write                                                            |
| whether a delete would be refused         | the same `DELETE` with `?validateOnly=true` — every design-row delete has one, and its reference lists it; a record, file, edge or secret delete has none          |
| what a patch would derive, break or queue | the same `PATCH` with `validateOnly: true` — flows, steps, schema entries, record types, relation kinds, and every other design row whose reference lists the flag |
| what a checkpoint restore would undo      | `POST /v1/flow-checkpoints/{id}/restore` with `validateOnly: true`                                                                                                 |
| what a whole change would do              | `POST /v1/projects/{nodeId}/document/plan` — every refusal, every cascade, and what it does to stored records, without writing                                     |

After the edit, `GET /v1/flows/{id}/health` says whether the flow is whole and
`GET /v1/eval-suites/{id}/readiness` whether a suite can still judge it.

⚠️ **`POST /v1/flows/{id}/preview` is not one of these.** It runs the flow for real and **applies
its writes** unless you pass `apply: false`, it bills the payer, and it needs ADMIN. It is a test
run, not a rehearsal. `kipory-build` covers it.

## Change many things at once: the document

Export the project (`GET /v1/projects/{nodeId}/document`), edit the file, plan it (the body is the
document itself), apply it as `{ version, document }` with the version the export or the plan
answered — the project's current one. `kipory-build` owns that loop and the document's format. What
matters here is that the plan is the apply rolled back, so it answers the same refusals a
row-by-row change would meet, in one read, and three things a row write never tells you:

- **`consequences`** — how many stored records the change re-stamps or re-indexes, and
  `records-invalid`: the records that would no longer fit a shape you changed, found by reach
  (a shape another shape references is checked through every type that reaches it). A
  consequence is never a refusal; the platform tells you and lets you. Deleting a relation kind
  deletes every stored edge of that kind, and the plan counts them as `edges-deleted` on the
  kind's path — save them first (`GET /v1/relations?project=<node>&link=<kind>`) if they matter.
- **Cascades before the fact.** A removal that takes other rows along — the relation kinds that
  pair a deleted record type, the terms of a deleted facet — is in `changes` as a
  `delete` with `because: "cascade"` and a `DOCUMENT_DELETE_CASCADED` warning. Read the plan's
  delete list before applying; it is the true list, not only yours. A record-type delete also names
  its reach on its own path — the relation kinds and joins it would take — even when the plan
  refuses the delete.
- **Nothing partial.** A refused apply answers `422` with the plan and has written nothing — not
  the rows before the refused one either. A document that changes nothing answers `applied: true`
  and moves no version.

Removal is explicit (`delete: true`, or `prune: true` on a map) and needs ADMIN; absence never
deletes. How to write a delete row, and what a plan's `changes` do and do not promise, is
`references/change-order.md`, "Removing through a document".

## The order of operations

Work outside-in when adding, inside-out when removing, and classify the change before either:
the class decides the sequence, and every sequence is written out once, in
`references/change-order.md`.

| The change                                                   | The rule                                                                                                                                             |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adding**                                                   | the dependency exists before the thing that names it: schema entry → flow → record type → endpoint → schedule                                        |
| **Removing**                                                 | the reverse: delete the leaf, then what it hung from. A flow delete is `409 FLOW_HAS_DEPENDENTS` while anything names it, a disabled schedule too    |
| **Changing a shape under live records**                      | four steps: widen (add the field as optional), backfill, patch the fixed inputs of schedules and triggers, then narrow. Narrowing first is an outage |
| **Editing the processing flow of a type that holds records** | the edit saves and stored records keep what the old steps wrote. Reprocess them (`kipory-data`); a reprocess is charged like a first processing      |
| **Renaming a step's output slot**                            | rehearse, then one document carrying the step, its readers and the flow's `outputBinding`                                                            |
| **Changing a flow's own input or output slots**              | a change to the product's API: `409` until `adoptSnapshots: true`                                                                                    |

## What refuses, and what cascades instead

Some destructive changes are refused outright:

- deleting a record type that holds records (`RECORD_TYPE_PINNED_BY_RECORDS`), or renaming it, or
  removing a field from its shape; deleting a reserved or seeded type, whatever it holds;
- deleting a flow something still references, or a step whose output later steps read;
- deleting a term that is assigned, is a parent, or is the canonical of aliases;
- deleting a facet without `confirm=true`, or while another facet nests under it;
- deleting a built-in event type, or a relation kind's last pairing.

Others do not refuse. They cascade, and the response tells you what else moved:

- deleting a record type takes relation kinds and voids other types' joins;
- changing a type's `search` uses queues a reindex or a billed re-embed, and its `filter` uses a
  rewrite of every record's filter columns;
- a slot rename rewrites its readers only when you confirm it, and never the flow's outputs;
- editing a processing flow re-runs nothing.

What each refusal carries, the way round where one exists, and what each cascade reports are in
`references/change-order.md`, "Reading a refusal" and "Reading a cascade".

The pattern is worth internalising: a refusal protects you, a cascade informs you, and the second
one is the one that costs money while you are not looking.

## Rolling back

**Flows have checkpoints; nothing else does.** Take one before a risky edit — `POST /v1/flow-checkpoints`
with the flow and a `label` — and restore through `POST /v1/flow-checkpoints/{id}/restore` after
asking it the same with `validateOnly: true` (both take the flow's `version`). A restore keeps each step's id by key (a
step deleted since comes back with a new one) and moves a changed step's version forward, so re-read the steps
before your next step edit. A capture or a restore also makes each eval suite's next run on that flow
incomparable with the one before (`delta.suppressedReason`): run the suite once after the capture,
before the edit, so the edit has a baseline (`kipory-prove`). `kipory-build` owns the detail. A flow's checkpoints are deleted with
the flow, so a deleted flow comes back only from an export.

**An export is the nearest thing to a checkpoint of the whole configuration.** Keep the document
you exported before a change. Planning it and applying it — with the project's CURRENT `version`
(export again, or take it from the plan), not the old export's, which answers `409` — puts its rows back — a row deleted
since returns as a new row with a new id, and a row added since stays unless the document says
`prune` — under the same refusals as any other apply. It covers configuration only: no records,
no vectors, no secret values. Deleting a record type leaves the schema entry it took its shape
from, so the rollback re-creates the type on that same entry. A schedule's or trigger's `enabled` travels: one the rollback re-creates comes back in the
state the export recorded. What it does not restore as you left them:

- **A field added since the export cannot be rolled back off a type with records.** Re-applying the
  older shape removes the field, and a shape edit that removes a declared field from a type
  holding any record — whether or not a record holds that field — is refused
  `SCHEMA_ENTRY_UNSAFE_FOR_RECORD_TYPE`, skipping the rows that depend on it. Keep the new field in
  the rollback document's shape.
- **Edges are data, not configuration.** A relation kind the change deleted comes back EMPTY:
  every edge asserted by hand (`POST /v1/records/{id}/relations/{kind}`) is gone for good, and only
  re-asserting it restores it. Save them (`GET /v1/relations?project=<node>&link=<kind>`)
  before any change that deletes a kind, and count the edges again after the rollback.

For everything else, the undo is a forward change you author yourself, and some things have no undo
at all:

- **Deleted records are gone.** No checkpoint covers the records plane.
- **Re-embedding cannot be un-run.** It can only be run again, and it is billed each time.
- **A secret's old value is unrecoverable** — nothing reads one back (`kipory-secrets`).
- **A term merge cannot be taken back through the API** — the alias it sets stays.

## What will bite you

- **Ask the PATCH's dry run about the edit, not the stored type.** `expand=contract` answers for
  what is stored; an agent holding an edited-but-unsaved shape must send it — the drafted
  `definition`, or the proposed `dataEntryId`/`flowId`, with `validateOnly: true` — or it derives
  declarations against a vocabulary it is about to replace. Send the `uses` the save would send
  too: the dry run re-derives them against the proposed contract.
- **A refused delete is the good outcome.** The dangerous ones are the changes that succeed and
  quietly invalidate something — a join declaration, a cached digest, an endpoint whose flow no
  longer returns the shape it promised.
- **A stale token is refused, not merged.** Re-read and re-apply rather than retrying the same body,
  and reach for `overwriteConcurrentEdit` only when you actually mean to discard whatever the other
  writer did — it is an override, not a retry.
- **`structureVersion` moves on every one of these**, so every client caching against it must
  re-read. If you built something that caches configuration, this is the signal it was waiting for.
- **A flow's signature is frozen by what publishes it.** Changing its input or output slots (a
  rename, a new required input, a type) while an endpoint — or a record type processing through it
  — holds a snapshot answers `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` (under `validateOnly`, an
  `ok: false` verdict with that code).
  `PATCH /v1/flows/{id}` with `adoptSnapshots: true` lands it and re-publishes those contracts in
  the same transaction: every client of that endpoint sees the new response keys at once. Treat it
  as an API change to the product's callers, not an internal edit (`kipory-expose`). A change to
  `outputBinding` alone is not a signature change.
- **Never send `validateOnly` to a delete whose route reference does not list it.** Such a delete
  has no rehearsal: the flag — query or body — answers `422`, and a deployment older than these
  files may ignore it and delete. A delete route either names its rehearsal or has none.
- **A flow PATCH carries the flow's `version`.** `PATCH /v1/flows/{id}` without it is a `422`, and
  a stale one a `409 VERSION_CONFLICT` — a checkpoint restore and a document apply move it too (a
  restore names the flow's new `version` in its `touched`), so re-read the flow after either. A signature PATCH may state one side alone; the other is kept.
- **A `502` from a sync endpoint wrote nothing; a `200` with an empty output did.** A failed step
  discards every write the run staged, so a retry on a 5xx does not write twice (it is charged
  again). A `200` applied its writes even when its output came back empty, and a client that
  retries it writes twice unless the write is idempotent — give the type a natural key, or send an
  `Idempotency-Key` (`kipory-expose`'s `references/consumer.md` says what it guarantees).
- **An `entity.create` pointed at the wrong type is caught only when a declared field misfits.**
  Switching its `recordType` saves. Health and a document plan warn `ENTITY_CREATE_DATA_MISMATCH`,
  and the run fails the step naming each field — the check `POST /v1/records` makes — when the
  incoming slot lacks a field the type requires or carries one under a different type. Fields the
  type's shape does not declare are not a misfit unless the shape sets
  `"additionalProperties": false`: the warning stays silent, the step does not fail, and the run
  writes a record of the wrong type. Close the shape if that matters, and preview with `apply: false` after
  such an edit, reading the `recordType` it reports.
- **A schedule PATCH's dry run does not check `version`.** `validateOnly: true` answers `ok: true`
  on a stale one, and the same body sent for real answers `409 VERSION_CONFLICT`. Re-read the
  schedule's `version` after a document apply or any other write that touched it.
- **Eval suites pin the old behaviour.** After a deliberate change their contracts will break, and
  that failure is correct. Re-baseline them on purpose (`kipory-prove`) rather than deleting the ones
  that went red — a suite deleted because it was inconvenient is the one that would have caught the
  next change.
- **A project's retire is rehearsable and undoable; a purge is final.** Ask
  `DELETE /v1/projects/{nodeId}?validateOnly=true` first; the real call carries `{ confirmSlug }`,
  the project's slug. A retire holds every key granted at the project: they answer `401` from that
  moment, so a key granted at the project cannot undo its own retire. A person, or a key granted at
  the organisation, restores it until `purgeAfter` with `POST /v1/projects/{nodeId}/restore` — its
  keys, schedules and sources come back as they were — and
  `POST /v1/projects/{nodeId}/purge { confirmSlug, confirmForce }` destroys it before then. All
  three are ADMIN. There is no checkpoint for a project.
- **Moving a project's address moves every client.** `PUT /v1/projects/{nodeId}/address { subdomain }`
  (ADMIN) changes `baseUrl` and every endpoint's `invokeUrl`. The old address does not redirect: it
  stops answering within a few minutes, and for those minutes nobody else can claim it. Ask `GET /v1/projects/address-availability?candidate=&project=` first. The slug never
  changes.
- **What was applied is a read, not a way back.** `GET /v1/projects/{nodeId}/history` lists the applied
  changes to the configuration, newest first, one action per entry, and
  `GET /v1/projects/{nodeId}/history/{structureVersion}` is one action with every row it changed. To
  keep a flow as it is and restore it later, take a checkpoint first.

## References

| File                         | What it answers                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/change-order.md` | every rehearsal route and what it answers; a change request → its class, then the full sequence for each: additive, narrowing a shape (who owns it, `adoptSnapshots`, the backfill), editing a processing flow under live records, removing, renaming a slot, retiring a term, removing through a document; what each refusal carries and the way round it; what each cascade reports |

## Then

`kipory-model` for the record type, facet, term or relation kind itself; what each delete reports
is on that skill's `references/api/` pages. `kipory-build` for checkpoints, flow health and the step-level dependents report.
`kipory-expose` when the change reaches an endpoint's contract. `kipory-prove` to re-baseline what a
deliberate change made red. `kipory-data` for the backfill, for reprocessing stored records after
their flow changed, and for deleting records before a type can go. `kipory-diagnose` when the change landed and something downstream started answering wrongly.
