# Conventions every design resource shares

The rules below hold across the whole design API. Each resource's own page under `api/` lists its fields; this file is what those pages assume.

## Two hosts, two planes

- **The api host** serves the design API: everything under `/v1/` that authors or reads a project's configuration and runs. It answers to your key. Coded route groups `management` and `keys` live only here.
- **The project's host** serves the product: the dynamic endpoints you authored, the end-user session routes, and the credit balance. Its address is the project's `baseUrl` — on each project in `GET /v1/grant` and on `GET /v1/projects/{nodeId}`. Read it; never build it from `subdomain`, which is a label, or from the api host you were handed. Dynamic endpoints exist only there; calling one on the api host is a 404 `No project matched this request's host`.
- `baseUrl` is `null` on a deployment that publishes no public host (a local api on `localhost`); there the project is reached on the api host with the header `x-kipory-project-slug: <slug>`. The header is read on a local or development stack only; a production deployment ignores it.
- A route served on the wrong host is a 404, before authentication. The api host gives the same `No project matched this request's host` answer to a mistyped design route, so a 404 with that message on a design call means the path is wrong, not the host.
- The `invokeUrl` an endpoint read returns is the project's `baseUrl` plus the endpoint's path, with its `{param}` placeholders kept. It is `null` wherever `baseUrl` is; it follows the deployment's configured address, not the base URL you call, so read it and never infer it.

## Ids

- A project has **one id**: the `id` its create returns — its node in the ownership tree, a bare cuid such as `cmukzzjhc0001hlq36d38bun1`. Treat every id as opaque: never check a prefix (only a few platform nodes carry a readable id such as `orgnode_kipory`). Every route takes it: `?project=` on a list, `project` in a body, `{nodeId}` in a `/v1/projects/…` path; `node` where any node — organization or project — is accepted.
- A resource with a parent design object scopes by **that**: skills by `?flowId=`, checkpoints by `?flowId=`, eval suites by `?project=` and optionally `&flowId=`, eval cases and runs by `?suiteId=`; a list filter that holds a key says so (`?facetKey=` on terms, `?recordTypeKey=` on relation-kind pairings, `?categoryKey=`/`?eventKey=` on the project event log).
- Every project element has a **`key`** — its identifier within the project (or its parent), unique and yours to choose — and, where it has display text, a **`label`**. A field that names another element says what it holds by its suffix: `<kind>Id` holds the row id (`flowId`, `suiteId`), `<kind>Key` holds the key (`facetKey`, `categoryKey`, `eventKey`, `profileKey`). Keys of schema entries, record types, skills, eval suites and eval cases can be renamed; every other key is permanent.
- **What a key may contain depends on what it names.** There are five grammars, each checked on write; a key outside its grammar is refused with the rule in the message. A key is at most 64 characters (a term's, 128).

  | The key of                                                                                | Grammar                                                               | Example                        |
  | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------ |
  | a flow, a term, an event category, an event type, a relation kind, an embedding profile   | lower-case letters and digits in words joined by single dashes        | `enrich-business`              |
  | a step                                                                                    | the same lower-case dashed words, optionally grouped by dots          | `summarize`, `extract.species` |
  | a record type                                                                             | a letter, then letters and digits only — no dash, dot or underscore   | `Observation`                  |
  | a facet                                                                                   | a lower-case letter, then letters and digits (camelCase)              | `cuisine`                      |
  | a schema entry, an endpoint, a trigger, a schedule, a source, an eval suite, an eval case | a letter or digit, then letters, digits, dots, dashes and underscores | `TicketTriage`, `get-feed`     |

  A slot name is not a key and has its own rule: letters and digits starting with a letter, no dash and no underscore (`kipory-build`).

- Item routes address a row by its **id**, which is a cuid — never by its key. A relation kind's traversal (`/v1/records/{id}/relations/{kind}`) is the exception: `{kind}` is the kind's key.
- A key is a **machine principal**: one node, one role, no user. It never has a `me`.

## The role ladder

Read → `VIEWER`. Design mutation → `EDITOR`. Destructive or structural → `ADMIN`. Creating a project → `OWNER` at the parent. A grant is uniform over its whole reach (plain descent from the grant node). Stricter than the ladder, by design: every secret write, every project-settings write, and every auth-config write is ADMIN, and so are the design API's test runs — preview, `POST /v1/steps/preview`, eval runs, vector search, cache bust. Spending is not what sets the floor: a record write that queues processing, a reprocess and a trigger replay are EDITOR and are charged like any live run. Deleting a record or a file is ADMIN.

These files name a route's floor in capitals. On the wire a role is lowercase — `viewer`, `editor`, `admin`, `owner` — in `GET /v1/grant` and in a refusal's `details`; it is the same role.

## Refusals

- Every error is `{ code, message, details?, requestId }`. **Branch on `code`, never on `message`** — wording may change at any time. `requestId` is also the `x-request-id` header on every response. `code` is sometimes a specific rule (`VERSION_CONFLICT`, `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`) and sometimes only the HTTP outcome (`CONFLICT`, `VALIDATION_FAILED`); when such a generic refusal names the rule that refused (`RECORD_TYPE_PINNED_BY_RECORDS: …`, or one code on every issue), that name is `details.reason` — and the same name is the finding's `code` on the matching `validateOnly` verdict and in a document plan.
- `401` — credential missing, malformed, revoked, expired; a key granted at a project that has been retired, until the project is restored; or a route that needs a person, answered to a key.
- `403` — grant does not reach, role below the floor, or a structural refusal of the key principal. Never an existence oracle: unknown node, missing project and insufficient role refuse identically. A design route's role refusal carries `details: { reason: "insufficient_project_role", requiredRole, grant: { nodeId, role } }` — `requiredRole` is the lowest role, on the project or organization the request names, that the route accepts, and `grant` is what your key holds (the same answer as `GET /v1/grant`). Both roles are lowercase (`viewer` … `owner`). `requiredRole` depends only on the route and `grant` only on the key, so neither says whether the node exists; when `grant.role` already meets `requiredRole`, the node you named is outside `grant.nodeId`. Match `details.reason` before reading either, since other `FORBIDDEN` answers carry no such details. On an item route addressed by a row id (`/v1/runs/{runId}`, `/v1/facets/{id}`, …) this 403 means the row is there and your role is too low for it.
- `404` — wrong host, disabled route group (`This API is not enabled for this project.`), or, on an item route addressed by a row id (runs, flows, triggers, facets, …), an id you cannot see: a row that does not exist, or one in a project your key does not reach. It answers `NOT_FOUND` whenever your key holds at least VIEWER on some project in its reach — an event envelope's `runId`, which is not a run id, lands here. Only a key that reaches no project at all is answered 403 instead. Node-addressed routes (`/v1/projects/{nodeId}/…`) and `/v1/secrets/{id}`, `/v1/managed-email-addresses/{id}` still answer an unseen id with 403.
- `409` — optimistic lock conflict (`version`), a retired project's write freeze (a key granted at the project never sees it — it answers 401; a key granted above it, or a signed-in person, does; the restore, the purge, switching off a schedule, trigger or source, and deleting a secret stay open), a single-flight run already in progress, a key or path already taken.
- `422` — `VALIDATION_FAILED`: any schema failure, including an **unlisted query key** on a route that declares query parameters, or on any DELETE. Design semantic refusals arrive as one 422 whose `details.diagnostics[]` carry the rule codes.
- `402` — four codes <!-- count: api-402-codes -->, four remedies. The gate skips GET, so a refused project degrades to read-only, and `GET /v1/credits/balance` on the project's host still answers. `kipory-operate` has the detail of each gate.
  - `BALANCE_BELOW_SOFT_CAP` — the wallet that pays is past its floor. No route a key can call adds credits: tell the human which wallet (`payer.name`, `payer.nodeId` on `GET /v1/credits/balance`) needs credit from the deployment's operator. The same code answers for a **suspended** wallet, where more credit changes nothing: `details.reason` is `payer_suspended`, and only the deployment's operator lifts it.
  - `USER_SPEND_CAP_EXCEEDED` — one signed-in person reached their own ceiling on a healthy wallet: raise `perUserSpendCapCredits` on the project's settings, or wait for the next `perUserSpendCapPeriod` when it is not `lifetime`. A key is never refused this way; it is no person.
  - `DESIGN_SPEND_CAP_EXCEEDED` — the project's design-time work (flow previews, `POST /v1/steps/preview`, eval runs, `POST /v1/vector-collections/{name}/search`) reached `designSpendCapCredits` on the project's settings: raise it, or wait for the period in `details`. A reprocess, a record's processing and a schedule or trigger run are not design-time work — except a record handed to its processing flow by an `entity.enqueue-process` step of a preview or an eval run, which counts toward this ceiling and is refused by it.
  - `MEMBER_WALLET_EMPTY` — a signed-in member's own wallet in the project is at zero: wait for `details.nextGrantAt` (null when the project makes no regular grant — then only an admin's grant helps), or have an admin grant that member credits. Topping up the project's wallet does nothing for them.

## Optimistic locking

- A PATCH carries the `version` you last read; a stale one is a **409** naming the captured and current versions. Re-read and reconcile; never blind-retry.
- `version` is **required** on every PATCH of a design row — flows, steps, api-endpoints, facets, terms, relation kinds, embedding profiles, schedules, triggers and sources (their `enabled` switch included), event types, schema entries, record types, project config (when the namespace exists), eval suites and cases, flow checkpoints — and on a state-changing POST: a term's merge, an embedding profile's activate, and a checkpoint restore (which takes the **flow's** `version`, not the checkpoint's).
- A write can move a row you did not address — a relation kind created with a `declaration` moves the record type's `version`, a checkpoint restore moves the flow's. The answer lists each such row with the version it holds now under `touched`; replace the copy you hold.
- A document apply is locked by the **project's** `version`: the one the export or the plan answered. Any other write to the project moves it, so present the one from your most recent read or plan.
- A record's `version` is a lock too: `PATCH /v1/records/{id}` and each item of `POST /v1/records/bulk` that names an existing record carry it, and a stale one is `RECORD_VERSION_STALE` (`kipory-data`). A run that writes the record moves it, so re-read before correcting a record its flow has just processed.
- An embedding profile's `version` is a lock; its geometry number is the separate `generation`.
- The bootstrap's `structureVersion` and section versions are not locks: they are decimal strings to cache against, compared as big integers.
- Resources with **no lock at all**: project settings, auth config, managed email addresses, route enablement, nodes. Last writer wins.
- Every write body is **strict**: an unknown key, including `version` where none is accepted, is a 422.

## `expand=`

<!-- field-ok: flowLabels — an expand KEY on the record-types read, not a property -->

A comma-separated list of computed fields a read will add. Each may cost extra queries, so ask only for what you will read. The values each read takes today — the route's own page under `api/` is authoritative when the two differ:

| Resource                                                                                 | Values                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/flows` (list)                                                                   | `health`                                                                                                                                                                                                                                                      |
| `GET /v1/flows/{id}`                                                                     | `timeLimits` — the health verdict is its own read, `GET /v1/flows/{id}/health`, and what holds the flow is the delete's dry run, `DELETE /v1/flows/{id}?validateOnly=true`                                                                                    |
| `GET /v1/api-endpoints`, `GET /v1/api-endpoints/{id}`                                    | `drift`, `flowLabel`, `shadowed`                                                                                                                                                                                                                              |
| `GET /v1/facets`, `GET /v1/facets/{id}`                                                  | `stats`, `samples`, `validator`, `readiness`, `wiring`                                                                                                                                                                                                        |
| `GET /v1/relation-kinds`, `GET /v1/relation-kinds/{id}`, `PATCH /v1/relation-kinds/{id}` | `relationCount`, `liveRelationCount`, `pairings`, `readiness`                                                                                                                                                                                                 |
| `GET /v1/record-types/{id}`                                                              | `drift`, `flowLabels`, `outputDefinition`, `contract`, `facets`, `uses`, `restamp`, `migration`, `embedding`, `vectorProgress`, `diagnostics`, `processingGaps` — what holds a type is the delete's dry run, `DELETE /v1/record-types/{id}?validateOnly=true` |
| `GET /v1/record-types` (list)                                                            | `drift`, `flowLabels`, `outputDefinition`, `contract`, `facets`, `uses`, `restamp`, `migration` — the item read's first eight                                                                                                                                 |
| `GET /v1/schedules`, `GET /v1/schedules/{id}`                                            | `drift`, `flowLabel`, `lastRun`, `timing`                                                                                                                                                                                                                     |
| `GET /v1/triggers`, `GET /v1/triggers/{id}`                                              | `drift`, `flowLabel`, `lastRun`                                                                                                                                                                                                                               |
| `GET /v1/schema-entries`                                                                 | `graph`, `keywords`                                                                                                                                                                                                                                           |
| `GET /v1/terms`                                                                          | `usage`, `findings`                                                                                                                                                                                                                                           |
| `GET /v1/embedding-profiles`, `GET /v1/embedding-profiles/{id}`                          | `collections` — **repeat the parameter**, this one is not comma-separated                                                                                                                                                                                     |

Everywhere else the comma form is the only one: `?expand=drift&expand=contract` is a 422 on the record-types read. A route that lists query parameters but no `expand` refuses one; a route that lists no query parameters at all ignores it.

⛔ **A delete rehearses only where its reference lists `validateOnly`.** Most design deletes do — `DELETE /v1/facets/{id}`, `DELETE /v1/record-types/{id}`, `DELETE /v1/flows/{id}`, `DELETE /v1/api-endpoints/{id}` and `DELETE /v1/schedules/{id}` among them; a delete whose reference does not list it does not. A current deployment answers an unknown query key on any DELETE with a 422 and deletes nothing, and the same for a JSON body with any key (`{"validateOnly": true}` included) on a DELETE that declares no body — but an older one ignores either and **deletes**: never send `validateOnly`, in the query or the body, to a delete whose reference does not list it. Where a delete has no rehearsal, a document plan that states `delete: true` is one.

## Readiness

Facets and relation kinds report readiness under `expand=readiness`, from a four-value vocabulary, **worst first**: `blocked` (it cannot work), `inert` (it works and reaches nobody), `unproven` (nothing has flowed through it, or nothing recently), `ready`. `reasons[]` lists every reason worst-first, not just the one that set the state. `unproven` is not an error on a kind authored an hour ago. **Flows do not use this vocabulary**: a flow's health is error and warning counts and the first error's code, and an error there does not stop the flow from running.

## A save is not a promise it will run

- Only a **skill-target** error refuses a skill write. Edge- and flow-level errors save cleanly and come back as `outstandingIssues` (code, message, severity — no skill id); warnings never block anything. Flow writes carry no diagnostics at all: ask `GET /v1/flows/{id}/health`, whose classified diagnostics carry attribution.
- Nothing re-checks a graph at run time. A flow saved with blocking issues still runs and leaves a trace.
- Elsewhere, re-read the resource asking for readiness.

## Preview is a run

`POST /v1/flows/{id}/preview` executes the flow in full. It bills the project's payer, refuses a suspended one, and **applies its record writes unless you pass `apply: false`** — the dry run still executes every step and discards the sealed change set, readable at `GET /v1/runs/{runId}/change-set` where the run id is the response's `previewSessionId`. What it withholds either way: no vectors are written, an emitted event resolves and checks its payload but is never recorded or published, so no trigger starts, produced files land in the preview area (`preview/`, expired after 7 days), and a step that sends — `email.send`, `url.send` — fails rather than sending, so prove a send with one live run. What it does not withhold: an `entity.enqueue-process` step hands the record to its processing flow, which runs live once the preview applies. A withheld event does not appear in the dry run's change set; its type is checked and the drop is logged on the server. Fan-out is capped at 5 branches per node by default — `fanOutCap` sets the preview's cap, up to `"uncapped"`, but never above the fan-out's own `maxItems`; the wall clock is 180 seconds. Preview names an unproduced required output in `missingRequiredOutput`; a live invocation is refused `422 FLOW_OUTPUT_MISSING` for it and writes nothing, so the preview discards its writes too, even with `apply`, and adds an `errors` entry `{ skillId: "__runner__", phase: "output-missing" }` — which an eval case's `no-errors` assertion counts as failed.

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
