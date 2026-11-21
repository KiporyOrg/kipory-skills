# Reprocessing a table's records together

Read this to bring many records of one table to its current shape, or to run its flow over all of
them again. Starting one is ADMIN; its dry run is VIEWER.

```
POST  /v1/record-reprocesses { project, table, scope: "not-current" | "all", validateOnly? }
GET   /v1/record-reprocesses/{id}
PATCH /v1/record-reprocesses/{id} { version, stopped: true }
```

- **Ask first.** `validateOnly: true` answers how many records it would run and an `estimate` of the credits, from what the table's recent runs charged, and starts nothing.
- **Each record is re-run as the single reprocess re-runs it**, charged the same, a few at a time; a record that route would refuse is skipped and counted under `skips`. `not-current` takes the records `expand=shape` counts as `older` or `unstamped`.
- **Read its progress** at `GET …/{id}`: `records` says how many were reprocessed, failed, skipped, are running and are left; `shape.moved` says the table's processed fields changed while it ran (its flow's outputs, or a type they hold). One per table at a time (`409 RECORD_REPROCESS_RUNNING`, naming it). A stop queues nothing more and keeps what finished.
