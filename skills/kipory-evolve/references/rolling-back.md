# Rolling back a change

Read this before a risky edit, to know what can be undone and how, and after one that has to be undone.

## Rolling back

**Flows have checkpoints; nothing else does.** Take one before a risky edit — `POST /v1/flow-checkpoints`
with the flow and a `label` — and restore through `POST /v1/flow-checkpoints/{id}/restore` after
asking it the same with `validateOnly: true` (both take the flow's `version`). A restore writes the checkpoint's steps through the
same save as any steps write — an error refuses it — and moves the flow's `version`, so re-read the flow before your
next edit. A capture or a restore also makes each eval suite's next run on that flow
incomparable with the one before (`delta.suppressedReason`): run the suite once after the capture,
before the edit, so the edit has a baseline (`kipory-prove`). `kipory-build` owns the detail. A flow's checkpoints are deleted with
the flow, so a deleted flow comes back only from an export.

**An export is the nearest thing to a checkpoint of the whole configuration.** Keep the document
you exported before a change. The file still carries the read it was made at, so planned as it is
it lists every element changed since under `moved` (or answers `409 PLAN_STALE` `read-too-old`) —
and those refusals' "export again" is not the way back here. Plan the kept file against the
project as it is now: `POST /v1/projects/{nodeId}/document/plan?basedOn=<version>`, where
`<version>` is the project's current one (the `version` a fresh `GET …/document` answers). Its
`moved` is then empty and its `changes` are the rollback; apply that plan, `{ planId, note }`. An
export in another format is refused (`DOCUMENT_VERSION_UNSUPPORTED`) and nothing converts it:
copy the rows you need into a fresh export. The
apply puts its rows back — a row deleted since returns as a new row with a new id, and a row added since stays unless the document says
`prune` — under the same refusals as any other apply. It covers configuration only: no records,
no vectors, no secret values. Deleting a table leaves the type it took its fields
from, so the rollback re-creates the table on that same type. A schedule's or trigger's `enabled` travels: one the rollback re-creates comes back in the
state the export recorded. What it does not restore as you left them:

- **A field added since the export cannot be rolled back off records that hold it.** Re-applying
  the older type removes the field, and a type edit that removes a declared field some record
  holds is refused `TYPE_UNSAFE_FOR_TABLE`, naming how many records hold it and skipping the
  rows that depend on it. Keep the new field in the rollback document's type, or remove it from
  those records first.
- **Links are data, not configuration.** A relation the change deleted comes back EMPTY:
  every link asserted by hand (`POST /v1/records/{id}/links/{relationKey}`) is gone for good, and
  only re-asserting it restores it. Save them (`GET /v1/links?project=<node>&relation=<key>`)
  before any change that deletes a relation, and count the links again after the rollback.

For everything else, the undo is a forward change you author yourself, and some things have no undo
at all:

- **Deleted records are gone.** No checkpoint covers the records plane.
- **Re-embedding cannot be un-run.** It can only be run again, and it is billed each time.
- **A secret's old value is unrecoverable** — nothing reads one back (`kipory-secrets`).
- **A term merge cannot be taken back through the API** — the alias it sets stays.
