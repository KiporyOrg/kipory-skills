# Undo a run, rewind the project

Every write to a record, a link or a record's term keeps what the row held before. For
`kept-for.row-history-days` (30 days by default) that history lets you take back what a run did,
or put the whole project back to how it was at a time. Use it when a flow wrote or deleted the
wrong things — the most likely disaster when a backend is built by an agent.

## Undo one run — `POST /v1/runs/{runId}/undo` (ADMIN)

```json
{ "partial": false, "validateOnly": true }
```

Each record, link and term the run touched goes back to its state before the run — a record it
created is deleted, one it updated gets its old values, one it deleted (and the records and links its
delete removed with it) comes back with its id. The answer:

```json
{
  "applied": true,
  "planned": 11000,
  "restored": 11000,
  "refused": 0,
  "refusedRows": [],
  "notReversed": { "mail.deliver": 2 }
}
```

- **Send `validateOnly: true` first.** It tries the undo and rolls it back, so `planned`,
  `refused` and `refusedRows` are exactly what the undo would answer. `restored` is 0 and
  `applied` false: nothing is written. It answers `200` even when rows would be refused.
- **A row that cannot go back is never forced.** `refusedRows` names up to 20, each with `why`:
  - `changed` — a later run or a direct write changed it since;
  - `in-use` — a record the run created that later links, terms, files, references, holds or
    stream events still name (deleting it would take them with it);
  - `conflict` — putting it back collides with a row there now (another record holds its natural
    key, a twin link exists), or it names a record or term that is gone.

  By default one refused row refuses the whole undo: `409 CONFLICT`, `details.reason`
  `UNDO_ROWS_CHANGED_SINCE`, with `details.refusedRows`, and nothing is written. Send
  `partial: true` to put back the other rows (`200`, the refused ones counted), or undo the
  later runs first (newest first).

- **What the run did outside the database is not reversed**, and `notReversed` counts it by kind:
  mail and requests delivered, pushes sent, events published, jobs and runs started, files
  attached or detached, stream events appended, sources held, records shared or unshared
  (`record.grant.set`, `record.grant.remove`). Tell the person; an undo does not recall an email,
  and does not take back a share.
- **A record put back comes back without its files, lifecycle references, source holds and
  shares** the run removed with it: `notReversed` counts them as `record.files.removed`,
  `record.references.removed`, `record.holds.removed` and `record.grants.removed` (a share also
  goes when the team record it names is deleted). A shared record put back is shared with no one
  until it is granted again. Its stream events do not come back either.
- **A record put back is a fresh write of its old content.** Its status and processing attempts
  stay as they are (the undo does not re-run its flow), its `updatedAt` moves to now (a sync by
  `updatedAt` sees the undo), search indexes it again, and computed fields of it and of the
  records linked to it are recomputed within a minute.
- **A run older than the history window**, or one that wrote nothing, answers `409`,
  `UNDO_NOTHING_RECORDED`.
- **At most `runs.undo-rows` rows** (50,000): past it `422`, `UNDO_TOO_LARGE`, refused before
  anything is read or locked — rewind the project to just before the run instead.
- **An undo is not a run**, so it cannot be undone through this route. To reverse an undo, rewind
  the project to just before it.
- An undo reverses what the run's save wrote. Writes made outside a run — a direct record write
  through the API, an import — belong to no run: use a rewind for those.

## Rewind the project — `POST /v1/projects/{nodeId}/rewind` (OWNER)

```json
{ "at": "2026-11-03T14:00:00Z", "validateOnly": true }
```

Every record, link and term changed after `at` goes back to how it was at `at` — whoever changed
it. It is the project's own point-in-time restore. Answer:
`{ "applied", "at", "planned", "restored", "refused", "refusedRows", "notReversed" }`.

- A row that cannot go back is skipped, not forced, and named in `refusedRows` with the same `why`
  as above (a record created since that files or references still name is `in-use`; a link to a
  record that is gone is a `conflict`). The rest is rewound.
- `validateOnly: true` tries the rewind and rolls it back: the same counts, `restored` 0.
- `at` must be in the past and no earlier than the project's oldest recorded write (at most
  `kept-for.row-history-days` back): otherwise `422`, `REWIND_BEFORE_HISTORY`, and
  `details.earliest` is the earliest time a rewind can reach for this project.
- `at` is compared with the moment each write was made, not when its save committed. A save that
  wrote just before `at` and committed just after it stays. Saves take seconds, so choose a time a
  minute before the trouble began.
- At most `runs.rewind-rows` rows (50,000): past it `422`, `REWIND_TOO_LARGE` — choose a later time.
- The same things as above are not reversed: mail sent, requests made, runs started, shares made
  or taken back, and the files, references, holds and shares removed since (`notReversed` counts
  those).
- The rewind's own writes are recorded, so a rewind to just before it returns the project.

Neither call spends credits.
