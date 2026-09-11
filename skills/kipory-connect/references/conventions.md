# Conventions every design resource shares

The rules below hold across the whole design API. Each resource's own page under `api/` lists its fields; this file is what those pages assume.

## Two hosts, two planes

- **The api host** serves the design API: everything under `/v1/` that authors or reads a project's configuration and runs. It answers to your key. Coded route groups `management` and `keys` live only here.
- **The project's host** — `https://<subdomain>.<deployment-host>` — serves the product: the dynamic endpoints you authored, the end-user session routes, and the credit balance. Dynamic endpoints exist only there; calling one on the api host is a 404 that reads `Not found.`
- A route served on the wrong host is a plain 404, before authentication. It is indistinguishable from a typo.
- The `invokeUrl` an endpoint read returns is the project-host URL, with its `{param}` placeholders kept. It is `null` on a deployment with no derivable public host.

## Ids

- A project has **two ids**: the project id (returned by create, `proj_…`) and its node id (`orgnode_…`). Design routes scope by the **node id** as `?project=` or `{nodeId}`; the exceptions spell `{projectId}` in the path (`feature-map`, `handlers`, `handler-activity`, `task-models`, `by-project-id`).
- A resource with a parent design object scopes by **that**: skills by `?flow=`, checkpoints by `?flow=`, test cases by `?flow=`, event types by `?category=` (the category's row id, not its key), eval cases by `?suite=`.
- Item routes address a row by its **id**, which is a cuid — never by its key or slug. A relation kind's traversal (`/v1/records/{id}/relations/{kind}`) is the exception: `{kind}` is the kind's key.
- A key is a **machine principal**: one node, one role, no user. It never has a `me`.

## The role ladder

Read → `VIEWER`. Design mutation → `EDITOR`. Destructive, structural or **spending** → `ADMIN`. Creating a project → `OWNER` at the parent. A grant is uniform over its whole reach (plain descent from the grant node). Stricter than the ladder, by design: every secret write, every project-settings write, and every auth-config write is ADMIN; running anything — preview, tests, eval runs, vector search, cache bust — is ADMIN because it spends.

## Refusals

- Every error is `{ code, message, details?, requestId }`. **Branch on `code`, never on `message`** — wording may change at any time. `requestId` is also the `x-request-id` header on every response.
- `401` — credential missing, malformed, revoked, expired; or a route that needs a person, answered to a key.
- `403` — grant does not reach, role below the floor, or a structural refusal of the key principal. Never an existence oracle: unknown node, missing project and insufficient role refuse identically.
- `404` — wrong host, disabled route group (`This API is not enabled for this project.`), or a row that does not exist under a project you may read.
- `409` — optimistic lock conflict (`version`), a retired project's write freeze, a single-flight run already in progress, a name or path already taken.
- `422` — `VALIDATION_FAILED`: any schema failure, including an **undeclared query key**. Design semantic refusals arrive as one 422 whose `details.diagnostics[]` carry the rule codes.
- `402` — two codes with opposite remedies: `BALANCE_BELOW_SOFT_CAP` (top up the wallet) and `USER_SPEND_CAP_EXCEEDED` (raise that person's ceiling). The gate skips GET, so an over-cap project degrades to read-only.

## Optimistic locking

- A PATCH carries the `version` you last read; a stale one is a **409** naming the captured and current versions. Re-read and reconcile; never blind-retry.
- `version` is **required** wherever a PATCH body accepts it: skills (`capturedVersion`), api-endpoints, facets, schedules (patch, enable, disable), event categories and types, schema entries, project config (when the namespace exists), flow test cases, eval suites and cases, triggers (patch, enable, disable) and sources (patch, enable, disable).
- Two resources publish a `version` that is **not** a lock: an embedding profile's `version` is its geometry generation and its PATCH refuses one; a record's `version` is owned by a database trigger and there is no record PATCH.
- Resources with **no lock at all**: the flow PATCH, project settings, auth config, managed email addresses, route enablement, nodes. Last writer wins.
- Every write body is **strict**: an unknown key, including `version` where none is accepted, is a 422.

## `expand=`

<!-- field-ok: flowLabels — an expand KEY on the record-types read, not a property -->

A comma-separated list of computed fields a read will add. Each may cost extra queries, so ask only for what you will read. The complete vocabulary:

| Resource                      | Values                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /v1/flows` (list only)   | `health`                                                                                                  |
| `GET /v1/api-endpoints`       | `drift`, `flowLabel`, `shadowed`                                                                          |
| `GET /v1/facets`              | `stats`, `samples`, `validator`, `readiness`                                                              |
| `GET /v1/relation-kinds`      | `relationCount`, `liveRelationCount`, `pairings`, `readiness`                                             |
| `GET /v1/record-types/{id}`   | `drift`, `flowLabels`, `outputDefinition`, `contract`, `facets`, `restamp`, `embedding`, `vectorProgress` |
| `GET /v1/record-types` (list) | the first six only — `embedding` and `vectorProgress` are refused on the list                             |
| `GET /v1/schedules`           | `drift`, `flowLabel`, `lastRun`                                                                           |
| `GET /v1/schema-entries`      | `graph`                                                                                                   |
| `GET /v1/terms`               | `usage`                                                                                                   |
| `GET /v1/embedding-profiles`  | `collections` — **repeat the parameter**, this one is not comma-separated                                 |

Everything else takes no `expand`, and every query is strict, so asking is a 422. `GET /v1/flows/{id}` is the one route with no query schema: it ignores `expand` silently, so ask `GET /v1/flows/{id}/health` instead.

## Readiness

Facets and relation kinds report readiness under `expand=readiness`, from a four-value vocabulary, **worst first**: `blocked` (it cannot work), `inert` (it works and reaches nobody), `unproven` (nothing has flowed through it, or nothing recently), `ready`. `reasons[]` lists every reason worst-first, not just the one that set the state. `unproven` is not an error on a kind authored an hour ago. **Flows do not use this vocabulary**: a flow's health is `isActivatable` plus error and warning counts and a `blockingCode`.

## A save is not a promise it will run

- Only a **skill-target** error refuses a skill write. Edge- and flow-level errors save cleanly and come back as `outstandingIssues` (code, message, severity — no skill id); warnings never block anything. Flow writes carry no diagnostics at all: ask `GET /v1/flows/{id}/health`, whose classified diagnostics carry attribution.
- Nothing re-checks a graph at run time. A flow saved with blocking issues still runs and leaves a trace.
- Elsewhere, re-read the resource asking for readiness.

## Preview is a run

`POST /v1/flows/{id}/preview` executes the flow in full. It bills the project's payer, refuses a suspended one, and **applies its record writes unless you pass `apply: false`** — the dry run still executes every step and discards the sealed change set, readable at `GET /v1/runs/{runId}/change-set` where the run id is the response's `previewSessionId`. What it withholds either way: no vectors are written, emitted events resolve but are never delivered, produced files land in the preview area (`preview/`, expired after 7 days). Fan-out is capped at 5 branches per node unless you raise `fanOutCap`; the wall clock is 180 seconds. Preview does **not** fill an unproduced required output — it names it in `missingRequiredOutput`; a live invocation fills it with the type's empty value or 502s.

## Paging

- Lists that page walk by **keyset cursors** `after` / `before`, both together being a 400. `nextCursor` and `prevCursor` are `string | null`, never a boolean, never omitted; `prevCursor` is measured, not inferred.
- `paging` is present on every list response or explicitly `null`. Null is a statement: the route declined to count. `?page=` exists exactly where `paging` is non-null, and clamps.
- A `limit` with no cursor is a **cap**, not a page — schedule runs, eval runs, flow traces. Where such a read can be cut short it says so in `truncated`; there is no way to ask for the rest.
- `after` means "older" on `GET /v1/runs` (newest first) and "later" on `GET /v1/runs/{runId}/steps` (forward through a run). Same name, opposite direction.
- The array key is the resource's own word — `flows`, `records`, `files`, `runs`, `steps` — never `items`.
- Most design lists are unpaginated: flows, record types, facets, schedules, event types, eval suites, project config, schema entries.

## Streams

- Every server-sent-events response is `event: <name>` + `data: <JSON>`. An opening comment `:open` and a `:keep-alive` every 15 seconds are not events.
- `error` and `close` are always followed by `done`. `error` is the **transport** failing; `close` is the source finishing for a reason it knows. The close vocabulary is `lifetime`, `transport-unavailable`, `revoked`, `terminal`, `too-slow`; treat an unrecognised reason as `lifetime` and reconnect with jitter.
- Every stream ends on its own after ten to twelve minutes with `close { lifetime }`, whatever the activity. A long-lived subscriber reconnects.
- Once hijacked, the HTTP status is fixed at 200; a failure arrives as an `error` frame with a `code`. A client treating 200 as success misses every stream failure.
- A stream refuses **before** hijacking — an ownership 404, a capacity 503 with `Retry-After`, a bus outage 503 — as an ordinary JSON envelope.

## Seeded rows

Anything the platform installed — event categories and types with `origin: seed`, provider schema entries — refuses a delete with 409 and generally accepts a patch. Seeded is not read-only.
