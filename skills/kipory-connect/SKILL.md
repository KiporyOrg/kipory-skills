---
name: kipory-connect
description: Start a session that builds on Kipory — prove the deployment is there, prove the API key is alive and reaches the project, read the project's whole configuration in one call, and learn the platform's conventions before authoring anything. Use at the beginning of any work on a Kipory project, when a call returns 401, 403 or 404 and the cause is unclear, when the user hands over a base URL and an API key, or when you need to know which id, host or role a call wants. This is the entry skill; every other kipory skill assumes it ran.
license: MIT
---

# Connect to Kipory

Kipory is a platform for building products. A product on Kipory is a **project**, and a project is not code: its record types, flows, HTTP endpoints, facets, schedules and events are **validated configuration rows** you author by calling the design API over HTTP. This skill is turn zero. The fact most people get wrong: there are **two hosts**, and the design API you author against answers on the api host with your key, while the product's own endpoints answer on the project's host — a design route called on the project host, or a product endpoint called on the api host, is a 404 that looks like a typo.

## What you need before turn one

Three things, and **all three come from the human**:

| You need                         | Why you cannot derive it                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| The **base URL** of the api host | Kipory is deployed per installation. There is no canonical host.                             |
| An **API key**                   | Only a signed-in person can mint one — a key cannot mint a key.                              |
| The **project's node id**        | The design plane addresses a project by its node id, and a key is told nothing at mint time. |

⚠️ **Two ids, and they are different values for the same project.** The _project id_ is what the create call returns; the _node id_ is what almost every design route scopes by. `GET /v1/projects/by-project-id/{projectId}` is the bridge. Two sub-resources want the project id instead, and their paths say so: `/v1/projects/{projectId}/feature-map` and `/v1/projects/{projectId}/handlers`.

> Never ask the human to paste the key into a file you will write, a commit, or a log line. Read it from the environment.

## The sequence

**1. Prove the deployment is there — no credential.**

```
GET /health                 → 200; `sha` is the build's commit, or null
GET /v1/capability-packs    → 200, the pack index and a `version`
```

`/health` is a liveness probe: `status` is a constant and no dependency is checked. `sha` is null on an unstamped build, which is not an error. Run `scripts/sync.mjs` now: it compares the `version` of the packs and handler catalog bundled with these skills against what this deployment serves and tells you which to trust. **When they differ, the deployment wins.**

**2. Prove the key is alive.**

```
GET /v1/handlers            Authorization: Bearer <key>
```

Authenticated but floored on no project, so a 200 means the key exists, is not revoked and not expired — and nothing about reach.

**3. Prove the key reaches the project, and read everything it holds.**

```
GET /v1/projects/{nodeId}                         → 200 and you are connected
GET /v1/bootstrap?project={nodeId}                → the whole authored configuration, versioned
GET /v1/bootstrap?project={nodeId}&sections=tenancy   → your grant: the nodes you reach, with your role on each
```

The bootstrap read returns nine sections — project, schema, relations, events, flows, surfaces, vectors, evals, tenancy — each the resource's own envelope, with a `structureVersion` to cache against and a `sections` map that says which moved. **The `tenancy` section is how a key learns its own grant**: the shallowest node in `nodes[]` is the grant node and `role` on every node is the grant's role. Read it once; do not probe ids to discover reach.

**If you must create the project** you need OWNER at the parent organisation node:

```
POST /v1/projects  { name, slug, parentNodeId }       → 201 { id, slug, name }
GET  /v1/projects/by-project-id/{projectId}           → { nodeId, … }
```

⚠️ Pass `parentNodeId` explicitly. It defaults to the platform organisation, which your grant almost certainly does not reach, so omitting it turns a correct request into a 403 that looks like a broken key.

**4. Confirm facts live, never from memory.** Handler keys come from `GET /v1/handlers`, request shapes from `GET /v1/openapi.json`, the platform's own paths from `GET /v1/coded-routes` — all on _this_ deployment. The bundled `references/` are a snapshot of the same sources with the hash they were taken at; step 1 told you whether it is current.

## Reading a refusal

| Code  | Means                                                                                             | Do                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `401` | The credential is missing, malformed, revoked or expired                                          | Re-check the header, then ask the human for a live key                                 |
| `403` | The credential is fine; the grant does not authorise this                                         | Check role, then reach — in that order                                                 |
| `404` | On the api host: the node resolved and hosts no project, or the route is served on the other host | You are holding the organisation node or the project id — or you are on the wrong host |

A `403` is deliberately not an existence oracle: an unresolvable node, a project never created and an insufficient role all refuse identically. A key holds **one node and one role**. Reach is plain descent — a grant at an organisation reaches every project beneath it; a grant at one project reaches that project only. The role is uniform over the whole reach and cumulative: read → VIEWER, design mutation → EDITOR, destructive, structural or spending → ADMIN; creating a project needs OWNER at the parent. **A key is minted at VIEWER unless a role was asked for**, so if every write refuses while reads succeed, suspect the role first. Anything that runs a flow — preview, tests, eval runs, vector search — is ADMIN, because it spends.

## What the platform refuses a key, always

<!-- key-unreachable-ok: GET /v1/projects — named ONLY to warn it is refused, never prescribed -->
<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn it is refused, never prescribed -->

The full list with reasons is `references/api/routes-a-key-cannot-call.md`. The ones you will meet:

- **A key cannot mint a key.** Key management accepts a signed-in session only. The human mints it, on the api host, and tells you the node, the role and the expiry.
- **A key is never platform staff.** `GET /v1/projects` — every project on the installation — answers 403 to every customer key. Resolve your node with `by-project-id`.
- **A key has no `me`.** Every `/v1/me*` route and the spend ledger `GET /v1/credits/events` answer 401 from inside the handler. Reading a node's members, or the node itself through `/v1/nodes`, is a human's surface too; the bootstrap's `tenancy` section is yours.
- **A key cannot act as an end user.** A flow that writes person-owned records, or an events subscription scoped to a user or a record, refuses a key with 403; a key's runs are project-owned.

## What will bite you

- **Silence about the node id.** Nothing at mint time tells the key its grant. Ask for it at turn zero — or read `tenancy` — not at the first 403.
- **`parentNodeId` omitted on create** — defaults to the platform organisation, refuses, and reads like an auth failure.
- **The 201 is not proof of everything.** Project creation is atomic, but the flow-provider shapes are seeded afterwards, best-effort. Read them back before referencing one, or call `POST /v1/schema-entries/seed`.
- **A retired project freezes writes.** Every POST, PUT, PATCH and DELETE naming it answers 409 while reads pass.
- **Every query string is strict.** An undeclared key — `expand` on a resource that has none, a typo — is a 422, never ignored. The exception is `GET /v1/flows/{id}`, which declares no query at all and silently ignores one.
- **Versions on the bootstrap are decimal strings.** Compare them as big integers; `"9" > "10"` as text is the documented failure.

## References

| File                                         | What it answers                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `references/conventions.md`                  | the rules every design resource shares: hosts, ids, roles, `expand=`, `version`, readiness, errors, paging, streams, preview |
| `references/glossary.md`                     | the words that collide — skill, handler, record, term, event, preview — and which meaning the API uses                       |
| `references/api/projects.md`                 | create, lifecycle, address, settings, history, feature map                                                                   |
| `references/api/bootstrap.md`                | the one read, its sections, the change stream                                                                                |
| `references/api/nodes-and-organizations.md`  | organisations and invites                                                                                                    |
| `references/api/platform-reads.md`           | the OpenAPI document, the pack index, the coded-route manifest                                                               |
| `references/api/routes-a-key-cannot-call.md` | every route that refuses a key, with the reason                                                                              |
| `references/packs/readme.md`                 | the served judgment index — which pack answers which question                                                                |
| `references/packs/limits.md`                 | what Kipory cannot do, read before designing around it                                                                       |
| `references/packs/project-provisioning.md`   | creating a project and finding its node id, in depth                                                                         |
| `scripts/sync.mjs`                           | compares the bundled snapshot with the live deployment                                                                       |

## Then

`kipory-plan` if the human described a product rather than an endpoint — it turns an idea into a build sheet before anything is authored. If a plan exists, go to the step it calls for: `kipory-model` for the data, `kipory-build` for flows, `kipory-data` for the records and files a project already holds, `kipory-expose` to put a flow on HTTP, `kipory-channels` for mail and Telegram, `kipory-prove` to pin what working means, `kipory-secrets` when a handler needs a vendor credential, `kipory-operate` for schedules, events, config and spend, and `kipory-diagnose` when something ran and came back wrong. For what a flow's steps actually do: `kipory-gather` to bring data in from outside the project, `kipory-extract` to turn a file into text or data, and `kipory-retrieve` to search the project's own records and answer over them. `kipory-evolve` the moment the project is no longer empty — changing something that already holds records is a different discipline from authoring it.
