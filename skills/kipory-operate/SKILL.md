---
name: kipory-operate
description: Run a Kipory project unattended — schedules that fire a flow on a cron, the event registry a flow emits into and clients subscribe to, namespaced runtime config that tunes a flow without an edit, and the spend reads that say what it all cost and what will stop it. Use once a flow works and should run on a clock, report progress, or be adjustable without redeployment; when the user asks what a project spent; or when a call came back 402. Not for diagnosing a single bad run (that is diagnose) and not for the credentials a flow needs (that is secrets).
license: MIT
---

# Operate a project

Four capabilities that only matter once something works, and one fact most people get wrong about money: **the credit balance is a project-host read.** `GET /v1/credits/balance` answers on the product's own host and is a plain 404 on the api host, where everything else in this skill lives. What you spent, per run and per project, is on the api host.

## Before the first call

- Fetch the pack for the capability you touch: `references/packs/schedules.md`, `events.md`, `project-config.md`, `credits.md`.
- `GET /v1/bootstrap?project={nodeId}&sections=surfaces,events,project` returns every schedule, every event category and type, the route enablement and the config namespaces in one call.
- Writes here are EDITOR; deletes, and the project settings that hold the spend ceiling, are ADMIN.

## Schedules

```
POST   /v1/schedules                       { project, key, flowId, inputs, cronPattern, tz, startsAt?, endsAt?, maxRuns?, overlapPolicy? }
GET    /v1/schedules?project={nodeId}&expand=lastRun,drift,flowLabel
PATCH  /v1/schedules/{id}                   { version, … } — inputs REPLACE; key is immutable and not a body field
POST   /v1/schedules/{id}/disable           { version }
POST   /v1/schedules/{id}/enable            { version } — recomputes the next run from now
GET    /v1/schedules/{id}/runs?limit=50     the occurrences, what each did, and the run id it produced
```

Inputs are keyed by input slot; `overlapPolicy` is `skip` or `allow`. The next-run time you are handed is computed by the same code the tick uses, so it is a claim you can hold the platform to. Enable recomputes from now: a schedule disabled across its window does not fire a backlog.

Each occurrence in `runs` carries its `outcome` — `fired`, `skipped`, `blocked` — its `invocation` with `id`, `status` and a `failure` naming the step and phase that broke, and `creditCost` where null is not zero. **The invocation's `id` is the run id**: take it to `GET /v1/runs/{runId}/steps` for the ordered, never-sampled step log (`kipory-diagnose`).

## Events

```
POST /v1/event-categories        { project, categoryKey, label, durableDefault? }
POST /v1/event-types             { category, eventKey, label, defaultScope, payloadEntryId?, durable? }   ← scoped by the CATEGORY's row id
GET  /v1/event-types?category={categoryId}
```

A type's `defaultScope` is `run`, `record`, `user` or `project`: a signal scoped to one run and one on the bus are different things — pick by who needs to hear it. The payload shape is optional; omit it and the event is a marker. A flow emits with an `event.emit` step; a client subscribes through an `events.subscribe` endpoint (`kipory-expose`) or watches the project-wide `GET /v1/activity/stream`.

## Project config

```
GET    /v1/project-config?project={nodeId}       every row carries the overrides AND the effective values
POST   /v1/project-config                        upsert on (project, namespace): schemaEntryId on create, version when it exists
DELETE /v1/project-config/{id}
```

Reach for this instead of editing a flow whenever the thing being changed is a threshold, a cadence or a weight. The `namespace` binds a schema entry whose field defaults are overlaid, per top-level field, with your `data` (at most 32 KiB); `effective` is computed on every read, never stored, so editing a default in the entry takes effect at once. The entry reference is soft: deleting it leaves reads working and refuses the next write.

## Spend

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn that it 401s an API key, never prescribed -->

```
GET /v1/runs/{runId}/spend                        what one run cost, by step — api host
GET /v1/projects/{nodeId}/usage?window=7d          credits and events over a window, by kind and step
GET /v1/projects/{nodeId}/ai-calls                the model-call ledger, filterable; /rollup by hour or day; /{callId}?payload=prompt for one
GET /v1/organizations/{nodeId}/quota              the organisation's resource ceilings and what is used
GET /v1/credits/balance                            the wallet — on the PROJECT's host only
```

A machine caller has no ledger of its own: `GET /v1/credits/events` scopes to a person and answers 401 to a key from inside the handler. Account for key-driven spend per run, or per project through `usage`.

## What will bite you

- **The balance read 404s on the api host.** Group `usage` is served on the project's host only, and a project may switch that group off. On the project host a key reads the payer's wallet with `perUserSpendCap` null — there is no person to cap — so for a key exactly one gate can 402 it: `creditsRemaining` against `softCapCredits`, reported as `status`. The read stays available while over cap, deliberately.
- **Two 402 codes with opposite remedies.** `BALANCE_BELOW_SOFT_CAP` means top up; `USER_SPEND_CAP_EXCEEDED` means a person hit their own ceiling on a healthy wallet. The gate skips GET, so an over-cap project degrades to read-only.
- **The per-person ceiling lives on project settings and is ADMIN**: `PATCH /v1/projects/{nodeId}/settings` with `perUserSpendCapCredits`, where `null` means no ceiling and `0` means block everything — opposites, and a falsy check turns one into the other. That PATCH has no `version` lock.
- **A schedule's `key` never changes** and is not on the patch body — sending it is a 422. Rename through `name`; a blank string is a 422, `null` clears.
- **`runs` is a cap, not a page.** `limit` goes to 200, there is no cursor, and `truncated` is the only word you get about what was cut.
- **Choose `overlapPolicy` deliberately.** `allow` on a flow slower than its interval runs copies of itself concurrently.
- **Event types are scoped by their category's row id, not by the project** — the one addressing surprise in this resource, and it fails looking like a missing project. Fetch categories first.
- **Seeded categories and types cannot be deleted (409) but can be patched.** A platform-installed event's label, scope and payload binding are all changeable, and nothing stops you.
- **A type's `status` does not gate emitting.** A retired type still fires; removing the emit step is the way to stop it. An event type carries two version numbers: `payloadVersion` for its shape and `version` for the lock.
- **Config `version` is required when the namespace exists and ignored on create.** A stale one is a 409; re-read and reconcile. An override replaces the whole top-level field, never merges into it.
- **`usage` defaults to seven days and excludes system charges**, which are zero by construction. `ai-calls` has no `total` and no page jump; walk its cursors.
- **Prices are not here.** What things cost is a platform-operator surface a key cannot read. What you spent is this one.

## References

| File                                                                           | What it answers                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `references/packs/schedules.md`                                                | time-triggered runs and their history                                                       |
| `references/packs/events.md`                                                   | the registry, emitting, the difference between a run signal and a bus signal                |
| `references/packs/project-config.md`                                           | tunables typed by a bound shape                                                             |
| `references/packs/credits.md`                                                  | the balance, the ledger, and the second gate a client that renders only `status` never sees |
| `references/api/schedules.md` · `events.md` · `project-config.md` · `spend.md` | every route's fields                                                                        |

## Then

`kipory-diagnose` when something running unattended does the wrong thing: the schedule's history names the failing step and hands you the run id; the step log gives the sequence; the trace gives the values. `kipory-expose` for the subscription endpoint that delivers events to a client.
