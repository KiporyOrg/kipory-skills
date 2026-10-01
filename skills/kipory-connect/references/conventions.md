# Conventions every design resource shares

The rules below hold across the whole design API. Each resource's own page under `api/` lists its fields; this file is what those pages assume.

## Two hosts, two planes

- **The api host** serves the design API: everything under `/v1/` that authors or reads a project's configuration and runs. It answers to your key. Coded route groups `management` and `keys` live only here.
- **The project's host** — `https://<subdomain>.<deployment-host>` — serves the product: the dynamic endpoints you authored, the end-user session routes, and the credit balance. Dynamic endpoints exist only there; calling one on the api host is a 404 that reads `Not found.`
- A route served on the wrong host is a plain 404, before authentication. It is indistinguishable from a typo.
- The `invokeUrl` an endpoint read returns is the project-host URL, with its `{param}` placeholders kept. It is `null` on a deployment with no derivable public host.

## Ids

- A project has **one id**: the `id` its create returns — its node in the ownership tree, a bare cuid such as `cmukzzjhc0001hlq36d38bun1`. Treat every id as opaque: never check a prefix (only a few platform nodes carry a readable id such as `orgnode_kipory`). Every route takes it: `?project=` on a list, `project` in a body, `{nodeId}` in a `/v1/projects/…` path; `node` where any node — organization or project — is accepted.
- A resource with a parent design object scopes by **that**: skills by `?flowId=`, checkpoints by `?flowId=`, eval suites by `?project=` and optionally `&flowId=`, eval cases and runs by `?suiteId=`; a list filter that holds a key says so (`?facetKey=` on terms, `?recordTypeKey=` on relation-kind pairings, `?categoryKey=`/`?eventKey=` on the project event log).
- Every project element has a **`key`** — its identifier within the project (or its parent), unique and yours to choose — and, where it has display text, a **`label`**. A field that names another element says what it holds by its suffix: `<kind>Id` holds the row id (`flowId`, `suiteId`), `<kind>Key` holds the key (`facetKey`, `categoryKey`, `eventKey`, `profileKey`). Keys of schema entries, record types, skills, eval suites and eval cases can be renamed; every other key is permanent.
- Item routes address a row by its **id**, which is a cuid — never by its key. A relation kind's traversal (`/v1/records/{id}/relations/{kind}`) is the exception: `{kind}` is the kind's key.
- A key is a **machine principal**: one node, one role, no user. It never has a `me`.

## The role ladder

Read → `VIEWER`. Design mutation → `EDITOR`. Destructive, structural or **spending** → `ADMIN`. Creating a project → `OWNER` at the parent. A grant is uniform over its whole reach (plain descent from the grant node). Stricter than the ladder, by design: every secret write, every project-settings write, and every auth-config write is ADMIN; running anything — preview, tests, eval runs, vector search, cache bust — is ADMIN because it spends.

## Refusals

- Every error is `{ code, message, details?, requestId }`. **Branch on `code`, never on `message`** — wording may change at any time. `requestId` is also the `x-request-id` header on every response. `code` is sometimes a specific rule (`VERSION_CONFLICT`, `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`) and sometimes only the HTTP outcome (`CONFLICT`, `VALIDATION_FAILED`); when such a generic refusal names the rule that refused (`RECORD_TYPE_PINNED_BY_RECORDS: …`, or one code on every issue), that name is `details.reason` — and the same name is the finding's `code` on the matching `validateOnly` verdict and in a document plan.
- `401` — credential missing, malformed, revoked, expired; or a route that needs a person, answered to a key.
- `403` — grant does not reach, role below the floor, or a structural refusal of the key principal. Never an existence oracle: unknown node, missing project and insufficient role refuse identically. A design route's role refusal carries `details: { reason: "insufficient_project_role", requiredRole }` — `requiredRole` is the lowest role, on the project or organization the request names, that the route accepts. It depends only on the route; match `details.reason` before reading it, since other `FORBIDDEN` answers carry no such details. On an item route addressed by a row id (`/v1/runs/{runId}`, `/v1/facets/{id}`, …) this 403 means the row is there and your role is too low for it.
- `404` — wrong host, disabled route group (`This API is not enabled for this project.`), or, on an item route addressed by a row id (runs, flows, triggers, facets, …), an id you cannot see: a row that does not exist, or one in a project your key does not reach. It answers `NOT_FOUND` whenever your key holds at least VIEWER on some project in its reach — an event envelope's `runId`, which is not a run id, lands here. Only a key that reaches no project at all is answered 403 instead. Node-addressed routes (`/v1/projects/{nodeId}/…`) and `/v1/secrets/{id}`, `/v1/managed-email-addresses/{id}` still answer an unseen id with 403.
- `409` — optimistic lock conflict (`version`), a retired project's write freeze, a single-flight run already in progress, a key or path already taken.
- `422` — `VALIDATION_FAILED`: any schema failure, including an **unlisted query key** on a route that declares query parameters, or on any DELETE. Design semantic refusals arrive as one 422 whose `details.diagnostics[]` carry the rule codes.
- `402` — two codes with opposite remedies: `BALANCE_BELOW_SOFT_CAP` (top up the wallet) and `USER_SPEND_CAP_EXCEEDED` (raise that person's ceiling). The gate skips GET, so an over-cap project degrades to read-only.

## Optimistic locking

- A PATCH carries the `version` you last read; a stale one is a **409** naming the captured and current versions. Re-read and reconcile; never blind-retry.
- `version` is **required** on every PATCH of a design row — flows, steps, api-endpoints, facets, terms, relation kinds, embedding profiles, schedules, triggers and sources (their `enabled` switch included), event types, schema entries, record types, project config (when the namespace exists), eval suites and cases — and on a state-changing POST: a term's merge and an embedding profile's activate.
- One resource publishes a `version` that is **not** a lock: a record's `version` is owned by a database trigger and there is no record PATCH. An embedding profile's `version` IS a lock; its geometry number is the separate `generation`.
- Resources with **no lock at all**: project settings, auth config, managed email addresses, route enablement, nodes. Last writer wins.
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

⛔ **A delete rehearses only where its reference lists `validateOnly`.** Most design deletes do — `DELETE /v1/facets/{id}`, `DELETE /v1/record-types/{id}`, `DELETE /v1/flows/{id}`, `DELETE /v1/api-endpoints/{id}` and `DELETE /v1/schedules/{id}` among them; a delete whose reference does not list it does not. A current deployment answers an unknown query key on any DELETE with a 422 and deletes nothing, and the same for a JSON body with any key (`{"validateOnly": true}` included) on a DELETE that declares no body — but an older one ignores either and **deletes**: never send `validateOnly`, in the query or the body, to a delete whose reference does not list it. Where a delete has no rehearsal, a document plan that states `delete: true` is one.

## Readiness

Facets and relation kinds report readiness under `expand=readiness`, from a four-value vocabulary, **worst first**: `blocked` (it cannot work), `inert` (it works and reaches nobody), `unproven` (nothing has flowed through it, or nothing recently), `ready`. `reasons[]` lists every reason worst-first, not just the one that set the state. `unproven` is not an error on a kind authored an hour ago. **Flows do not use this vocabulary**: a flow's health is error and warning counts and the first error's code, and an error there does not stop the flow from running.

## A save is not a promise it will run

- Only a **skill-target** error refuses a skill write. Edge- and flow-level errors save cleanly and come back as `outstandingIssues` (code, message, severity — no skill id); warnings never block anything. Flow writes carry no diagnostics at all: ask `GET /v1/flows/{id}/health`, whose classified diagnostics carry attribution.
- Nothing re-checks a graph at run time. A flow saved with blocking issues still runs and leaves a trace.
- Elsewhere, re-read the resource asking for readiness.

## Preview is a run

`POST /v1/flows/{id}/preview` executes the flow in full. It bills the project's payer, refuses a suspended one, and **applies its record writes unless you pass `apply: false`** — the dry run still executes every step and discards the sealed change set, readable at `GET /v1/runs/{runId}/change-set` where the run id is the response's `previewSessionId`. What it withholds either way: no vectors are written, an emitted event resolves and checks its payload but is never recorded or published, so no trigger starts, produced files land in the preview area (`preview/`, expired after 7 days). What it does not withhold: an `entity.enqueue-process` step hands the record to its processing flow, which runs live once the preview applies. A withheld event does not appear in the dry run's change set; its type is checked and the drop is logged on the server. Fan-out is capped at 5 branches per node by default — `fanOutCap` sets the preview's cap, up to `"uncapped"`, but never above the fan-out's own `maxItems`; the wall clock is 180 seconds. Preview names an unproduced required output in `missingRequiredOutput`; a live invocation is refused `422 FLOW_OUTPUT_MISSING` for it and writes nothing, so the preview discards its writes too, even with `apply`, and adds an `errors` entry `{ skillId: "__runner__", phase: "output-missing" }` — which an eval case's `no-errors` assertion counts as failed.

## Paging

- Lists that page walk by **keyset cursors** `after` / `before`, both together being a 400. `nextCursor` and `prevCursor` are `string | null`, never a boolean, never omitted; `prevCursor` is measured, not inferred.
- `paging` is present on every list response or explicitly `null`. Null is a statement: the route declined to count. `?page=` exists exactly where `paging` is non-null, and clamps.
- Run and event logs page the same way, newest first: schedule runs, trigger runs, eval runs, flow traces, project events, rejected requests. Each answers `{ <items>, paging: null, nextCursor, prevCursor }`; walk `after=<nextCursor>` until `nextCursor` is `null`.
- A `limit` with no cursor is a **cap**, not a page — an eval suite's trend, a schedule's `firings`, flow coverage. Where such a read can be cut short it says so in `truncated`; there is no way to ask for the rest.
- `after` means "older" on `GET /v1/runs` and every log above (newest first) and "later" on `GET /v1/runs/{runId}/steps` (forward through a run). Same name, opposite direction.
- The array key is the resource's own word — `flows`, `records`, `files`, `runs`, `steps` — never `items`.
- Most design lists are unpaginated: flows, record types, facets, schedules, event types, eval suites, project config, schema entries.

## Streams

- Every server-sent-events response is `event: <name>` + `data: <JSON>`. An opening comment `:open` and a `:keep-alive` every 15 seconds are not events.
- Every stream's last frame is `done` (`data: {}`) — after a `flow.stream`'s `result`, and after `error` or `close` on any stream. `error` is the **transport** failing; `close` is the source finishing for a reason it knows. The close vocabulary is `lifetime`, `transport-unavailable`, `revoked`, `terminal`, `too-slow`; treat an unrecognised reason as `lifetime` and reconnect with jitter.
- Every stream ends on its own after ten to twelve minutes with `close { lifetime }`, whatever the activity. A long-lived subscriber reconnects.
- Once hijacked, the HTTP status is fixed at 200; a failure arrives as an `error` frame with a `code`. A client treating 200 as success misses every stream failure.
- A stream refuses **before** hijacking — an ownership 404, a capacity 503 with `Retry-After`, a bus outage 503 — as an ordinary JSON envelope.

## Seeded rows

Anything the platform installed — event types with `origin: seed`, provider schema entries — refuses a delete with 409 and generally accepts a patch. Seeded is not read-only.
