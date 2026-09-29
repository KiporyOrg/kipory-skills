# Conventions every design resource shares

The rules below hold across the whole design API. Each resource's own page under `api/` lists its fields; this file is what those pages assume.

## Two hosts, two planes

- **The api host** serves the design API: everything under `/v1/` that authors or reads a project's configuration and runs. It answers to your key. Coded route groups `management` and `keys` live only here.
- **The project's host** — `https://<subdomain>.<deployment-host>` — serves the product: the dynamic endpoints you authored, the end-user session routes, and the credit balance. Dynamic endpoints exist only there; calling one on the api host is a 404 that reads `Not found.`
- A route served on the wrong host is a plain 404, before authentication. It is indistinguishable from a typo.
- The `invokeUrl` an endpoint read returns is the project-host URL, with its `{param}` placeholders kept. It is `null` on a deployment with no derivable public host.

## Ids

- A project has **two ids**: the project id (returned by create, `proj_…`) and its node id — a bare cuid such as `cmukzzjhc0001hlq36d38bun1`, with no prefix. Treat every id as opaque: never check a prefix to decide which id you hold (only a few platform nodes carry a readable id such as `orgnode_kipory`). Design routes scope by the **node id** as `?project=` or `{nodeId}`; the exceptions spell `{projectId}` in the path (`handlers`, `handler-activity`, `task-models`, `descriptions`, `describer`, `by-project-id`).
- A resource with a parent design object scopes by **that**: skills by `?flowId=`, checkpoints by `?flowId=`, test cases by `?flowId=`, event types by `?categoryId=` (the category's row id, not its key), eval cases and runs by `?suiteId=`; a list filter that holds a key says so (`?facetKey=` on terms, `?recordTypeKey=` on relation-kind pairings, `?categoryKey=`/`?eventKey=` on the project event log).
- Every project element has a **`key`** — its identifier within the project (or its parent), unique and yours to choose — and, where it has display text, a **`label`**. A field that names another element says what it holds by its suffix: `<kind>Id` holds the row id (`flowId`, `categoryId`, `suiteId`), `<kind>Key` holds the key (`facetKey`, `categoryKey`, `eventKey`, `profileKey`). Keys of schema entries, record types, skills, flow test cases, eval suites and eval cases can be renamed; every other key is permanent.
- Item routes address a row by its **id**, which is a cuid — never by its key. A relation kind's traversal (`/v1/records/{id}/relations/{kind}`) is the exception: `{kind}` is the kind's key.
- A key is a **machine principal**: one node, one role, no user. It never has a `me`.

## The role ladder

Read → `VIEWER`. Design mutation → `EDITOR`. Destructive, structural or **spending** → `ADMIN`. Creating a project → `OWNER` at the parent. A grant is uniform over its whole reach (plain descent from the grant node). Stricter than the ladder, by design: every secret write, every project-settings write, and every auth-config write is ADMIN; running anything — preview, tests, eval runs, vector search, cache bust — is ADMIN because it spends.

## Refusals

- Every error is `{ code, message, details?, requestId }`. **Branch on `code`, never on `message`** — wording may change at any time. `requestId` is also the `x-request-id` header on every response. `code` is sometimes a specific rule (`VERSION_CONFLICT`, `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`) and sometimes only the HTTP outcome (`CONFLICT`, `VALIDATION_FAILED`); when such a generic refusal names the rule that refused (`RECORD_TYPE_PINNED_BY_RECORDS: …`, or one code on every issue), that name is `details.reason` — and the same name is the finding's `code` on the matching `validateOnly` verdict and in a document plan.
- `401` — credential missing, malformed, revoked, expired; or a route that needs a person, answered to a key.
- `403` — grant does not reach, role below the floor, or a structural refusal of the key principal. Never an existence oracle: unknown node, missing project and insufficient role refuse identically. A design route's role refusal carries `details: { reason: "insufficient_project_role", requiredRole }` — `requiredRole` is the lowest role, on the project or organization the request names, that the route accepts. It depends only on the route, so it says nothing about whether the row exists; match `details.reason` before reading it, since other `FORBIDDEN` answers carry no such details. ⚠️ On an item route an id that resolves to no row you may read answers this same 403 — so an ADMIN key told `requiredRole: VIEWER` (or `EDITOR`) is holding an id that does not exist here, such as an event envelope's `runId`, not a role problem.
- `404` — wrong host, disabled route group (`This API is not enabled for this project.`), or a row that does not exist under a project you may read.
- `409` — optimistic lock conflict (`version`), a retired project's write freeze, a single-flight run already in progress, a key or path already taken.
- `422` — `VALIDATION_FAILED`: any schema failure, including an **unlisted query key** on a route that declares query parameters, or on any DELETE. Design semantic refusals arrive as one 422 whose `details.diagnostics[]` carry the rule codes.
- `402` — two codes with opposite remedies: `BALANCE_BELOW_SOFT_CAP` (top up the wallet) and `USER_SPEND_CAP_EXCEEDED` (raise that person's ceiling). The gate skips GET, so an over-cap project degrades to read-only.

## Optimistic locking

- A PATCH carries the `version` you last read; a stale one is a **409** naming the captured and current versions. Re-read and reconcile; never blind-retry.
- `version` is **required** wherever a PATCH body accepts it: skills (`capturedVersion`), api-endpoints, facets, schedules (patch, enable, disable), event categories and types, schema entries, project config (when the namespace exists), flow test cases, eval suites and cases, triggers (patch, enable, disable) and sources (patch, enable, disable).
- Two resources publish a `version` that is **not** a lock: an embedding profile's `version` is its geometry generation and its PATCH refuses one; a record's `version` is owned by a database trigger and there is no record PATCH.
- Resources with **no lock at all**: the flow PATCH, project settings, auth config, managed email addresses, route enablement, nodes. Last writer wins.
- Every write body is **strict**: an unknown key, including `version` where none is accepted, is a 422.

## `expand=`

<!-- field-ok: flowLabels — an expand KEY on the record-types read, not a property -->

A comma-separated list of computed fields a read will add. Each may cost extra queries, so ask only for what you will read. The values each read takes today — the route's own page under `api/` is authoritative when the two differ:

| Resource                      | Values                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/flows` (list)        | `health`                                                                                                                                                                      |
| `GET /v1/flows/{id}`          | `dependents`, `timeLimits` — not `health`; ask `GET /v1/flows/{id}/health`                                                                                                    |
| `GET /v1/api-endpoints`       | `drift`, `flowLabel`, `shadowed`                                                                                                                                              |
| `GET /v1/facets`              | `stats`, `samples`, `validator`, `readiness`, `wiring`                                                                                                                        |
| `GET /v1/relation-kinds`      | `relationCount`, `liveRelationCount`, `pairings`, `readiness`                                                                                                                 |
| `GET /v1/record-types/{id}`   | `drift`, `flowLabels`, `outputDefinition`, `contract`, `facets`, `uses`, `restamp`, `migration`, `embedding`, `vectorProgress`, `diagnostics`, `dependents`, `processingGaps` |
| `GET /v1/record-types` (list) | the first eight only                                                                                                                                                          |
| `GET /v1/schedules`           | `drift`, `flowLabel`, `lastRun`, `timing`                                                                                                                                     |
| `GET /v1/triggers`            | `drift`, `flowLabel`, `lastRun`                                                                                                                                               |
| `GET /v1/schema-entries`      | `graph`, `keywords`                                                                                                                                                           |
| `GET /v1/terms`               | `usage`, `findings`                                                                                                                                                           |
| `GET /v1/embedding-profiles`  | `collections` — **repeat the parameter**, this one is not comma-separated                                                                                                     |

Everywhere else the comma form is the only one: `?expand=drift&expand=contract` is a 422 on the record-types read. A route that lists query parameters but no `expand` refuses one; a route that lists no query parameters at all ignores it.

⛔ **A delete rehearses only where its reference lists `validateOnly`.** `DELETE /v1/facets/{id}` and `DELETE /v1/record-types/{id}` do; most deletes — `DELETE /v1/flows/{id}` among them — do not. A current deployment answers an unknown query key on any DELETE with a 422 and deletes nothing, and the same for a JSON body with any key (`{"validateOnly": true}` included) on a DELETE that declares no body — but an older one ignores either and **deletes**: never send `validateOnly`, in the query or the body, to a delete whose reference does not list it. Rehearse a flow delete with `GET /v1/flows/{id}?expand=dependents` (its `deleteRefusal`) or a document plan that states `delete: true`.

## Readiness

Facets and relation kinds report readiness under `expand=readiness`, from a four-value vocabulary, **worst first**: `blocked` (it cannot work), `inert` (it works and reaches nobody), `unproven` (nothing has flowed through it, or nothing recently), `ready`. `reasons[]` lists every reason worst-first, not just the one that set the state. `unproven` is not an error on a kind authored an hour ago. **Flows do not use this vocabulary**: a flow's health is error and warning counts and the first error's code, and an error there does not stop the flow from running.

## A save is not a promise it will run

- Only a **skill-target** error refuses a skill write. Edge- and flow-level errors save cleanly and come back as `outstandingIssues` (code, message, severity — no skill id); warnings never block anything. Flow writes carry no diagnostics at all: ask `GET /v1/flows/{id}/health`, whose classified diagnostics carry attribution.
- Nothing re-checks a graph at run time. A flow saved with blocking issues still runs and leaves a trace.
- Elsewhere, re-read the resource asking for readiness.

## Preview is a run

`POST /v1/flows/{id}/preview` executes the flow in full. It bills the project's payer, refuses a suspended one, and **applies its record writes unless you pass `apply: false`** — the dry run still executes every step and discards the sealed change set, readable at `GET /v1/runs/{runId}/change-set` where the run id is the response's `previewSessionId`. What it withholds either way: no vectors are written, an emitted event resolves and checks its payload but is never recorded or published, so no trigger starts, produced files land in the preview area (`preview/`, expired after 7 days). What it does not withhold: an `entity.enqueue-process` step hands the record to its processing flow, which runs live once the preview applies. A withheld event does not appear in the dry run's change set; its type is checked and the drop is logged on the server. Fan-out is capped at 5 branches per node by default — `fanOutCap` sets the preview's cap, up to `"uncapped"`, but never above the fan-out's own `maxItems`; the wall clock is 180 seconds. Preview does **not** fill an unproduced required output — it names it in `missingRequiredOutput`; a live invocation fills it with the type's empty value or 502s.

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
