---
name: kipory-connect
description: Start a session that builds on Kipory — prove the deployment is there, prove the API key is alive and reaches the project, read the project's whole configuration in one call, and learn the platform's conventions before authoring anything. Use at the beginning of any work on a Kipory project, when a call returns 401, 403 or 404 and the cause is unclear, when the user hands over a base URL and an API key, or when you need to know which id, host or role a call wants. This is the entry skill; every other kipory skill assumes it ran.
license: MIT
---

# Connect to Kipory

Kipory is a platform for building a product's backend — its processes, its data, and the entry points the outside uses. A product on Kipory is a **project**, and a project is not code: its flows, record types, HTTP endpoints, triggers, schedules, facets and events are **validated configuration rows** you author by calling the design API over HTTP. This skill is turn zero. The fact most people get wrong: there are **two hosts**, and the design API you author against answers on the api host with your key, while the product's own endpoints answer on the project's host — a design route called on the project host, or a product endpoint called on the api host, is a 404 that looks like a typo.

## What you need before turn one

Three things, and **all three come from the human**:

| You need                         | Why you cannot derive it                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| The **base URL** of the api host | Kipory is deployed per installation. There is no canonical host.                   |
| An **API key**                   | Only a signed-in person can mint one — a key cannot mint a key.                    |
| The **project's id**             | Every route addresses a project by its id, and a key is told nothing at mint time. |

A project has **one id**: the `id` its create call returns, which is its node in the ownership tree. Every route takes it — `{nodeId}` in a `/v1/projects/…` path, `?project=` on a list, `project` in a create body.

**Where the human gets the key:** in the operator UI, the project's **Keys** page → **New key**, choosing the role the work needs (VIEWER unless they pick one; anything that previews or runs a flow needs ADMIN) and an expiry. The plaintext is shown once. Ask them for the project's id at the same time.

> Never ask the human to paste the key into a file you will write, a commit, or a log line. Read it from the environment.

## The sequence

**1. Prove the deployment is there — no credential.**

```
GET /health                 → 200; `sha` is the build's commit, or null
GET /v1/capability-packs    → 200, the pack index and a `version`
```

`/health` is a liveness probe: `status` is a constant and no dependency is checked. `sha` is null on an unstamped build, which is not an error. Run `node <this skill's directory>/scripts/sync.mjs` now, with `KIPORY_BASE_URL` (and `KIPORY_API_KEY`, to compare handlers) in the environment: it compares the versions of the packs, the handler catalog and the API pages bundled with these skills against what this deployment serves. Exit 0 means every layer is current; exit 1 means one differs, and it prints which layer to read live instead; exit 2 means something could not be compared — the deployment was unreachable, or a layer could not be read (without `KIPORY_API_KEY` the handler catalog cannot be), and it says which. A difference does not say which side is newer — a deployment older than these files is ordinary — and either way **the deployment wins**.

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
POST /v1/projects  { name, slug, parentNodeId }       → 201 { id, slug, name }   — `id` is the project's id everywhere
```

The create also takes a `template` slug (`GET /v1/templates` lists them) or a whole `document`
(`kipory-build`'s `references/packs/project-document.md`), one or the other, applied in the same
transaction — a refused one leaves no project behind.

⚠️ Pass `parentNodeId` explicitly. It defaults to the platform organisation, which your grant almost certainly does not reach, so omitting it turns a correct request into a 403 that looks like a broken key.

**4. Confirm facts live, never from memory.** Handler keys come from `GET /v1/handlers`, request shapes from `GET /v1/openapi.json`, the platform's own paths from `GET /v1/coded-routes` — all on _this_ deployment. The bundled `references/` are a snapshot of the same sources with the hash they were taken at; step 1 told you whether it is current.

## Reading a refusal

| Code  | Means                                                                                                                                                                                            | Do                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `401` | The credential is missing, malformed, revoked or expired                                                                                                                                         | Re-check the header, then ask the human for a live key              |
| `403` | The credential is fine; the grant does not authorise this                                                                                                                                        | Check role, then reach — in that order                              |
| `404` | On the api host: the node resolved and hosts no project, or the route is served on the other host — or, on an item route, an id you cannot see (missing, or in a project your key doesn't reach) | You are holding an organisation's id — or you are on the wrong host |

A `403` is deliberately not an existence oracle: an unresolvable node, a project never created and an insufficient role all refuse identically. A key holds **one node and one role**. Reach is plain descent — a grant at an organisation reaches every project beneath it; a grant at one project reaches that project only. The role is uniform over the whole reach and cumulative: read → VIEWER, design mutation → EDITOR, destructive, structural or spending → ADMIN; creating a project needs OWNER at the parent. **A key is minted at VIEWER unless a role was asked for**, so if every write refuses while reads succeed, suspect the role first. Anything that runs a flow — preview, tests, eval runs, vector search — is ADMIN, because it spends.

## What the platform refuses a key, always

<!-- key-unreachable-ok: GET /v1/projects — named ONLY to warn it is refused, never prescribed -->
<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to warn it is refused, never prescribed -->

The full list with reasons is `references/api/routes-a-key-cannot-call.md`. The ones you will meet:

- **A key cannot mint a key.** Key management accepts a signed-in session only. The human mints it, on the api host, and tells you the node, the role and the expiry.
- **A key is never platform staff.** `GET /v1/projects` — every project on the installation — answers 403 to every customer key. Keep the id the create answered, or ask the human for it.
- **A key has no `me`.** Every `/v1/me*` route and the charges statement `GET /v1/credits/events` answer 401 from inside the handler. Reading a node's members, or the node itself through `/v1/nodes`, is a human's surface too; the bootstrap's `tenancy` section is yours.
- **A key cannot act as an end user.** A flow that writes person-owned records, or an events subscription scoped to a user or a record, refuses a key with 403; a key's runs are project-owned.

## What will bite you

- **Silence about the node id.** Nothing at mint time tells the key its grant. Ask for it at turn zero — or read `tenancy` — not at the first 403.
- **`parentNodeId` omitted on create** — defaults to the platform organisation, refuses, and reads like an auth failure.
- **The 201 is not proof of everything.** Project creation is atomic, but the flow-provider shapes are seeded afterwards, best-effort. Read them back before referencing one, or call `POST /v1/schema-entries/seed`.
- **A retired project freezes writes.** Every POST, PUT, PATCH and DELETE naming it answers 409 while reads pass.
- **A declared query string is strict.** On a route whose reference lists query parameters, an unlisted key or value — `expand` on a resource that has none, an `expand` value that resource does not offer, a typo — is a 422. A route whose reference lists no query parameters ignores any you send, so a misspelled flag there is silent — except a DELETE, which refuses any query key it does not list (422) and deletes nothing.
- **Versions on the bootstrap are decimal strings.** Compare them as big integers; `"9" > "10"` as text is the documented failure.

## References

| File                                         | What it answers                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `references/conventions.md`                  | the rules every design resource shares: hosts, ids, roles, `expand=`, `version`, readiness, errors, paging, streams, preview |
| `references/glossary.md`                     | the words that collide — skill, handler, record, term, event, preview — and which meaning the API uses                       |
| `references/api/projects.md`                 | create, lifecycle, address, settings, history                                                                                |
| `references/api/bootstrap.md`                | the one read, its sections, the change stream                                                                                |
| `references/api/nodes-and-organizations.md`  | organisations and invites                                                                                                    |
| `references/api/platform-reads.md`           | the OpenAPI document, the pack index, the coded-route manifest                                                               |
| `references/api/templates.md`                | the project templates a create can start from                                                                                |
| `references/packs/templates.md`              | when to start a project from a shipped template                                                                              |
| `references/api/routes-a-key-cannot-call.md` | every route that refuses a key, with the reason                                                                              |
| `references/packs/readme.md`                 | the served judgment index — which pack answers which question                                                                |
| `references/packs/limits.md`                 | what Kipory cannot do, read before designing around it                                                                       |
| `references/packs/project-provisioning.md`   | creating a project and finding its node id, in depth                                                                         |
| `scripts/sync.mjs`                           | compares the bundled snapshot with the live deployment                                                                       |

## Your first flow

`kipory-build`'s `references/first-flow.md` is one small product built end to end — a flow, its one step, its output binding, a preview, the endpoint, and the call a client makes — with every body exact, then the same project as one document. Read it before authoring anything on a new project; it is the shape every other skill assumes you know.

## Then

`kipory-plan` if the human described a product rather than an endpoint — it turns an idea into a build sheet before anything is authored. If a plan exists, go to the step it calls for: `kipory-model` for the data, `kipory-build` for flows, `kipory-data` for the records and files a project already holds, `kipory-expose` to put a flow on HTTP, `kipory-channels` for mail and Telegram, `kipory-prove` to pin what working means, `kipory-secrets` when a handler needs a vendor credential, `kipory-operate` for schedules, events, config and spend, and `kipory-diagnose` when something ran and came back wrong. For what a flow's steps actually do: `kipory-gather` to bring data in from outside the project, `kipory-extract` to turn a file into text or data, and `kipory-retrieve` to search the project's own records and answer over them. `kipory-evolve` the moment the project is no longer empty — changing something that already holds records is a different discipline from authoring it.
