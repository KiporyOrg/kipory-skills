# What will bite you when changing a live project

Read this before a change to a project that already holds records or serves callers.

## What will bite you

- **Working around a problem in silence.** When something on Kipory stops you — an unexpected error, a doc that said something untrue, a capability you need that is missing — file a report: `kipory-connect`, "When something stops you".
- **Ask the PATCH's dry run about the edit, not the stored table.** `expand=contract` answers for
  what is stored; an agent holding an edited-but-unsaved type must send it — the drafted
  `definition`, or the proposed `dataTypeId`/`flowId`, with `validateOnly: true` — or it derives
  declarations against a field vocabulary it is about to replace. Send the `uses` the save would
  send too: the dry run re-derives them against the proposed contract.
- **A flow nobody edited can start failing health after a roll.** A new build can add a rule or
  tighten one, and its health then reads errors though its runs keep succeeding; a write that
  rewrites the action an error is on — a save of it, or a document that changes it — is refused for
  it. When `sha` on `GET /health` changes,
  read `GET /v1/flows?project=<nodeId>&expand=health` and fix every error; `GET /v1/platform-status`
  names the codes the build added or tightened (`rules`). A roll can also change what a route or a
  read answers without failing any flow: read `GET /v1/notices?project=<nodeId>` too (or re-run
  `kipory-connect`'s sync script, which prints them). A notice reaches only the projects its report
  names, and says which of your fields or routes the change touches. To be told rather than ask, put a trigger on
  `platform/flow-health.failing` (`kipory-operate`'s triggers pack). And a stated element is whole (document format 8): a field left out of an action, a flow or any
  row you state goes back to its default (the plan warns `FIELD_RESET_TO_DEFAULT` on each), so a run
  setting (`timeoutMs`, `tries`, `onFailure`, `modelId` and the rest) left out is reset. State each one you mean to keep, and `null` to clear one a rule now refuses (a control
  action's `timeoutMs`).
- **A refused delete is the good outcome.** The dangerous ones are the changes that succeed and
  quietly invalidate something — a join declaration, a cached digest, an endpoint whose flow no
  longer returns what it promised.
- **A stale token is refused, not merged.** Re-read and re-apply rather than retrying the same body,
  and reach for `overwriteConcurrentEdit` only when you actually mean to discard whatever the other
  writer did — it is an override, not a retry.
- **`structureVersion` moves on every one of these**, so every client caching against it must
  re-read. If you built something that caches configuration, this is the signal it was waiting for.
- **A flow's signature is frozen by what publishes it.** Changing its input or output slots (a
  rename, a new required input, a type) while an endpoint — or a table processing through it
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
- **A `502` from a sync endpoint wrote nothing; a `200` with an empty output did.** A failed action
  discards every write the run staged, so a retry on a 5xx does not write twice (it is charged
  again). A `200` applied its writes even when its output came back empty, and a client that
  retries it writes twice unless the write is idempotent — give the table a natural key, or send an
  `Idempotency-Key` (`kipory-expose`'s `references/consumer.md` says what it guarantees).
- **An `record.create` pointed at the wrong table is caught only when a declared field misfits.**
  Switching its `tableKey` saves. Health and a document plan warn `RECORD_CREATE_DATA_MISMATCH`,
  and the run fails the action naming each field — the check `POST /v1/records` makes — when the
  incoming slot lacks a field the table requires or carries one under a different type. Fields the
  table's type does not declare are not a misfit unless the type sets
  `"additionalProperties": false`: the warning stays silent, the action does not fail, and the run
  writes a record in the wrong table. Close the type if that matters, and preview with
  `apply: false` after such an edit, reading the `tableKey` it reports.
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
