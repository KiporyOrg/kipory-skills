---
name: kipory-evolve
description: Change a Kipory project that is already live — rename or re-shape a record type that holds records, remove a flow, facet, term or relation kind something else depends on, and roll an edit back when it goes wrong. Use whenever the project is not empty: before any delete, before changing a type's fields or its searchable declaration, when a delete is refused and the message names dependents, when an edit has to be undone, or when a change has to be rehearsed before it is committed.
license: MIT
---

# Change a project that is already live

Authoring into an empty project and changing a live one are different disciplines. In an empty
project every write is a create and nothing can break. In a live one, records already exist, flows
already reference each other, endpoints already serve clients, and a configuration digest is
already cached by everything that read it.

**The fact most people get wrong: the platform rehearses almost every dangerous change for you, and
each rehearsal has a different name.** There is no single dry-run flag. There are eleven routes with
eleven names, and an agent that does not know they exist discovers a cascade by causing it.

## Before the first call

- **Read the current state and keep the digest.** `GET /v1/bootstrap` returns every section plus a
  `structureVersion`. Every change here moves it; that is how a client knows its cached copy is
  stale.
- **Know whether the thing you are changing has data.** A record type carries `hasRecords` and
  `recordCount` on its own read. They are the difference between an edit and a migration.
- **Concurrency control is per-resource, and you have to know which kind you are facing.** Record
  types, facets and their neighbours require the `version` you last read on a patch and refuse a
  stale one. A step in a flow is optimistic-locked on its own `capturedVersion` and answers **409**
  with one of three kinds — `stale-version`, `concurrent-consumer-write` or `unique-collision`. The
  first two are re-read-and-retry, or resubmit with `overwriteConcurrentEdit`, which skips the
  pre-check **and nothing else**: it never clears a `unique-collision`, and it never relaxes
  validation. Read the resource's own contract before assuming either shape.

  <!-- field-ok: version — the optimistic-concurrency token, named on several design resources -->

## Rehearse first

| Route                                           | Answers                                                       |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `GET /v1/projects/{nodeId}/usage`               | what the project holds, before you touch any of it            |
| `GET /v1/projects/{nodeId}/deletion-preview`    | what deleting the whole project would take with it            |
| `GET /v1/facets/{id}/delete-preflight`          | what deleting a facet reaches — the blast radius, named       |
| `GET /v1/record-types/{id}/contract-preview`    | the field vocabulary as **stored**, not as you have staged it |
| `POST /v1/record-types/{id}/write-preview`      | whether a record of the new shape would actually save         |
| `GET /v1/skills/rename-preview`                 | every step whose wiring a slot rename would rewrite           |
| `POST /v1/skills/validate-draft`                | whether an unsaved step is valid — it executes nothing        |
| `GET /v1/flows/{id}/health`                     | whether the flow is whole after the edit                      |
| `GET /v1/flow-checkpoints/{id}/restore-preview` | what restoring would change back                              |
| `GET /v1/eval-suites/{id}/readiness`            | whether the suite can still judge the thing you changed       |

⚠️ **`POST /v1/flows/{id}/preview` is not one of these.** It runs the flow for real and **applies
its writes** unless you pass `apply: false`, it bills the payer, and it needs ADMIN. It is a test
run, not a rehearsal. `kipory-build` covers it.

## The order of operations

Work outside-in when adding, inside-out when removing.

**Adding** — the dependency has to exist before the thing that names it: schema entry → record type
→ flow → endpoint → schedule. Anything else is a save refused for naming something absent.

**Removing** — reverse it. Detach the endpoint before deleting the flow it calls; retire the
schedule before the flow it fires. Delete the leaf, then what it hung from.

**Changing a shape under live records** is neither. It is three steps, in this order:

1. **Rehearse.** `contract-preview` for what the stored descriptor actually says; `write-preview`
   for whether a record of the new shape saves.
2. **Widen, never narrow, in the first write.** Add the new field as optional. Existing records stay
   valid, and nothing has to be backfilled before the change lands.
3. **Backfill, then narrow.** Populate the field on existing records (a flow over the type — see
   `kipory-data`), and only then make it required.

Narrowing first is what turns a change into an outage: every record that lacks the field becomes
invalid at once, and there is no partial state to recover from.

## What refuses, and what cascades instead

Some destructive changes are refused outright:

- **A record type with records cannot be deleted.** The refusal names the count. Delete the records
  first, or leave the type alone.
- **Reserved and seeded record types cannot be deleted**, whatever they hold.
- **A flow something still references cannot be deleted** — the refusal names what references it.
- **A step whose output later steps read cannot be deleted** — the refusal counts the dependents and
  names the slots they read.
- **A term assigned to records cannot be deleted** while those assignments exist.
  `POST /v1/terms/{id}/merge` is the neighbouring verb, and it is not a delete: it points the source
  term at a target as an **alias**, leaving the row in place rather than removing it. It refuses a
  merge into the term itself, a target that is already an alias, and a source and target under
  different parents — a cross-parent merge would break the hierarchy the assignments hang from.
- **Built-in event categories and types cannot be deleted.**
- **A relation kind cannot be left with no pairings**, so the last one cannot be deleted.

Others do not refuse. They cascade, and the response tells you what else moved:

- **Deleting a record type** reports `deletedRelationKinds` — links that applied only to that pair —
  and `invalidatedJoins`, the other types whose join declarations this voided. You asked to remove
  one thing and something else changed.
- **Changing the searchable declaration re-embeds every existing record of the type.**
- **Saving the facet list queues a rewrite of every existing record of the type.**
- **Renaming runs as a cascade in one transaction.** It either lands completely or not at all.

The pattern is worth internalising: a refusal protects you, a cascade informs you, and the second
one is the one that costs money while you are not looking.

## Rolling back

**Flows have checkpoints; nothing else does.** Take one before a risky edit — `POST /v1/flow-checkpoints`
with the flow and a name — and restore through `POST /v1/flow-checkpoints/{id}/restore` after
reading `GET /v1/flow-checkpoints/{id}/restore-preview`. `kipory-build` owns the detail.

For everything else, the undo is a forward change you author yourself, and some things have no undo
at all:

- **Deleted records are gone.** No checkpoint covers the records plane.
- **Re-embedding cannot be un-run.** It can only be run again, and it is billed each time.
- **A secret's old value is unrecoverable** — nothing reads one back (`kipory-secrets`).
- **A term merge moves assignments permanently.**

## What will bite you

- **`contract-preview` describes what is stored, not what you have staged.** An agent holding an
  edited-but-unsaved shape is reading a contract that no longer describes what it is about to write,
  and any declaration it derives from that contract is written against the wrong vocabulary.
- **A refused delete is the good outcome.** The dangerous ones are the changes that succeed and
  quietly invalidate something — a join declaration, a cached digest, an endpoint whose flow no
  longer returns the shape it promised.
- **A stale token is refused, not merged.** Re-read and re-apply rather than retrying the same body,
  and reach for `overwriteConcurrentEdit` only when you actually mean to discard whatever the other
  writer did — it is an override, not a retry.
- **`structureVersion` moves on every one of these**, so every client caching against it must
  re-read. If you built something that caches configuration, this is the signal it was waiting for.
- **Changing a flow does not change the endpoints in front of it.** An endpoint keeps serving the
  contract it was configured with, so a flow whose output shape you changed can start returning
  something its endpoint never promised. Re-check with `kipory-expose`.
- **Evals and test cases pin the old behaviour.** After a deliberate change they will fail, and that
  failure is correct. Re-baseline them on purpose (`kipory-prove`) rather than deleting the ones
  that went red — a suite deleted because it was inconvenient is the one that would have caught the
  next change.
- **Deleting a project is previewable and then final.** Read `deletion-preview` first; there is no
  checkpoint for it.

## References

| File                         | What it answers                                                      |
| ---------------------------- | -------------------------------------------------------------------- |
| `references/change-order.md` | a change request → the order to work in, the rehearsal, what refuses |

## Then

`kipory-model` for the record type, facet, term or relation kind itself, and for what each delete
reports. `kipory-build` for checkpoints, flow health and the step-level dependents report.
`kipory-expose` when the change reaches an endpoint's contract. `kipory-prove` to re-baseline what a
deliberate change made red. `kipory-data` for the backfill, and for deleting records before a type
can go. `kipory-diagnose` when the change landed and something downstream started answering wrongly.
