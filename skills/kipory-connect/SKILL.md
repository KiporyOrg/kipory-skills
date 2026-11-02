---
name: kipory-connect
description: Start a session that builds on Kipory — prove the deployment is there, prove the API key is alive and reaches the project, read the project's whole configuration in one call, and learn the platform's conventions before authoring anything. Use at the beginning of any work on a Kipory project, when a call returns 401, 403 or 404 and the cause is unclear, when the user hands over a base URL and an API key, or when you need to know which id, host or role a call wants. This is the entry skill; every other kipory skill assumes it ran.
license: MIT
---

# Connect to Kipory

Kipory is a platform for building a product's backend — its processes, its data, and the entry points the outside uses. A product on Kipory is a **project**, and a project is not code: its flows, tables, HTTP endpoints, triggers, schedules, vocabularies and events are **validated configuration rows** you author by calling the design API over HTTP. This skill is turn zero. The fact most people get wrong: there are **two hosts**, and the design API you author against answers on the api host with your key, while the product's own endpoints answer on the project's host — a design route called on the project host, or a product endpoint called on the api host, is a 404 that looks like a typo.

## What you need before turn one

Two things, and **both come from the human**:

| You need                         | Why you cannot derive it                                         |
| -------------------------------- | ---------------------------------------------------------------- |
| The **base URL** of the api host | Kipory is deployed per installation. There is no canonical host. |
| An **API key**                   | Only a signed-in person can mint one — a key cannot mint a key.  |

A project has **one id**: the `id` its create returns, its node in the ownership tree. Every route takes it — `{nodeId}` in a path, `?project=` on a list, `project` in a body — and the key tells you it (step 2).

**Where the human gets the key:** the project's **Keys** page in the operator UI → **New key**, with the role the work needs (viewer unless they pick one; previewing or testing a flow needs admin) and an expiry. The plaintext is shown once, with the project's id beside it; the id is also on the project's **Settings** page. **Never ask the human to paste the key into a file you will write, a commit, or a log line.** Read it from the environment.

## The sequence

**1. Prove the deployment is there.** `GET /health` → 200 (`sha` is the build's commit, or null). Then run `node <this skill's directory>/scripts/sync.mjs` with `KIPORY_BASE_URL` and `KIPORY_API_KEY` set: it compares these skills with what the deployment serves, prints what the platform tells your project (`notices`), and says on its `document` line whether the deployment reads the document format these skills write. Where it says a layer differs, **the deployment wins**. `references/session-start.md` explains every line.

**2. Prove the key is alive, and ask it what it holds.**

```
GET /v1/grant               Authorization: Bearer <key>
→ 200 { key: { id, label, keyPrefix, expiresAt },
        node: { id, name, kind },      — where the key acts
        role,                          — viewer | editor | admin | owner
        projects: [{ id, slug, name, baseUrl }] }
```

It takes no id, so a 200 means the key exists, is not revoked and not expired, and the body is its grant. When `node.kind` is `project`, `node.id` is the project's id. When it is `organization`, the key reaches every project in `projects`; ask the human which one, or create one (below). Check `role` against the work now: a `viewer` key will pass every read here and refuse the first write.

Keep the project's `baseUrl`: it is the **project's host**, where the endpoints you author, the end-user session routes and `GET /v1/credits/balance` answer. Read it here or from `GET /v1/projects/{nodeId}`; do not build it from the api host or from `subdomain`. `null` means this deployment publishes no public host.

If the human also gave you a project id, compare it with `projects` before using it. An id from another project is the commonest wrong input, and without this read it shows up only as a 403.

**3. On a project that already holds work, read the map first.** `GET /v1/projects/{nodeId}/map` is one entry per flow — what starts it, what it reads, writes and calls — at about 0.5 KB a flow; `GET /v1/flows/{id}/outline` is one flow's shape. An empty project has nothing to read: go to the build.

**If you must create the project** you need `owner` at the parent organisation node:

```
POST /v1/projects  { name, slug, parentNodeId }       → 201 { id, slug, name }   — `id` is the project's id everywhere
```

⚠️ Pass `parentNodeId` explicitly. It defaults to the platform organisation, which your grant almost certainly does not reach, so omitting it turns a correct request into a 403 that looks like a broken key.

**4. Check the models your actions will run on.** `GET /v1/nodes/{nodeId}/task-models` lists each task an action inherits its model through; a row with `callable: false` fails every action on that task (`kipory-build`'s `references/models.md`). When a run fails with `detail.phase: "platform-fault"`, `GET /v1/platform-status` says whether the platform's provider account is refusing — the deployment's fault, not the flow's. Confirm facts live, never from memory: `GET /v1/functions`, `GET /v1/openapi.json`, `GET /v1/coded-routes` (`references/session-start.md`).

## Build the backend

**Read `kipory-build`'s `references/quickstart-document.md` next, before anything else.** It is one complete project — per-person data, create and list endpoints, a kept total, a model call, a daily job and email — as one document this deployment planned, applied and ran, with every name and field that refuses a plan. For most backends it is the only page you need; it says when to open another.

## Reading a refusal

| Code  | Means                                                                                                                                                                                            | Do                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401` | The credential is missing, malformed, revoked or expired — or it was granted at a project that has been retired                                                                                  | Re-check the header, then ask the human for a live key                                                                                                   |
| `403` | The credential is fine; the grant does not authorise this                                                                                                                                        | Read `details`: `requiredRole` against `grant` — below                                                                                                   |
| `404` | On the api host: the node resolved and hosts no project, or the route is served on the other host — or, on an item route, an id you cannot see (missing, or in a project your key doesn't reach) | Check the path first — a mistyped design route gets the same answer. Then the host. Then whether the id is an organisation's, or one your key cannot see |
| `402` | Something that pays is out of credits or at a ceiling — one of five codes <!-- count: api-402-codes -->, each with a different remedy                                                            | Branch on `code`: `references/conventions.md`, Refusals; the gates themselves are `kipory-operate`                                                       |

A role-floor `403` carries `details: { reason: "insufficient_project_role", requiredRole, grant: { nodeId, role } }`. If `grant.role` is below `requiredRole`, ask the human for a key with that role; if not, the node you addressed is outside the key's reach — another project's id. A key is minted at `viewer` unless a role was asked for; previewing or testing a flow needs `admin`.

## When something stops you

File a report — `POST /v1/reports { project, trying, happened, impact }` — then carry on with your workaround. Do it for a `500`, a doc that said something untrue, a missing capability, or a workaround that cost more than a few minutes; not for a refusal whose remedy you can apply. One problem per report; read `GET /v1/reports?project=<nodeId>` at the start of each session. `references/session-start.md` has the full rules.

## What will bite you

- **The two hosts.** Design routes answer on the api host with your key; your project's endpoints answer on its `baseUrl`. Each on the other host is a 404 that looks like a typo.
- **A key cannot act as an end user, mint a key, or read `/v1/me*`.** Test as a person with a test user's session (`kipory-build`'s quickstart, "Try it as a person").
- **A declared query string is strict**: an unlisted key on a design route is a 422, and a write refuses any query key it does not list.
- **A new build can turn an untouched flow red.** When `sha` on `/health` changes, read `GET /v1/flows?project=<nodeId>&expand=health`.
- Everything else that bites at turn zero — retired projects, seeded types, version strings, every route a key cannot call — is in `references/session-start.md`.

## References

| File                                         | What it answers                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/conventions.md`                  | the rules every design resource shares: hosts, ids, roles, `expand=`, `version`, readiness, errors, paging, streams, preview                                                                |
| `references/glossary.md`                     | the words that collide — agent skill, action, function, record, term, event, preview — and which meaning the API uses                                                                       |
| `references/api/projects.md`                 | create, lifecycle, address, settings, history, the generated descriptions, element metadata                                                                                                 |
| `references/api/bootstrap.md`                | the one read, its sections, the change stream                                                                                                                                               |
| `references/api/nodes-and-organizations.md`  | organisations and invites                                                                                                                                                                   |
| `references/api/platform-reads.md`           | the OpenAPI document, the pack index, the coded-route manifest                                                                                                                              |
| `references/api/templates.md`                | the project templates a create can start from                                                                                                                                               |
| `references/packs/templates.md`              | when to start a project from a shipped template                                                                                                                                             |
| `references/api/routes-a-key-cannot-call.md` | every route that refuses a key, with the reason                                                                                                                                             |
| `references/refusal-codes.md`                | every refusal code once: what it means, what to do, where it appears                                                                                                                        |
| `references/format-9-renames.md`             | every setting renamed, merged or restructured from document format 8 to 9, and the ones that kept their name                                                                                |
| `references/api/reports.md`                  | filing a report when something stops you, and reading where it stands                                                                                                                       |
| `references/api/notices.md`                  | what Kipory tells your project: notices of changes that reach it, and flows it told you are failing                                                                                         |
| `references/packs/readme.md`                 | the served judgment index — which pack answers which question                                                                                                                               |
| `references/packs/limits.md`                 | what Kipory cannot do, read before designing around it                                                                                                                                      |
| `references/packs/project-provisioning.md`   | creating a project and finding its node id, in depth                                                                                                                                        |
| `scripts/sync.mjs`                           | compares the bundled snapshot with the live deployment and names the packs, functions and routes that differ, the skill changes it does not run yet, and a document format it does not read |
| `references/session-start.md`                | what `scripts/sync.mjs` prints, descriptions and metadata, creating a project and converting an older document, filing a report                                                             |

## Then

`kipory-build` for anything you author — start at its `references/quickstart-document.md`. `kipory-plan` if the human described a product rather than a change. `kipory-evolve` the moment the project holds records you will reshape. `kipory-diagnose` when something ran and came back wrong. The other skills — `kipory-model`, `kipory-data`, `kipory-expose`, `kipory-channels`, `kipory-prove`, `kipory-secrets`, `kipory-operate`, `kipory-gather`, `kipory-extract`, `kipory-retrieve` — go deep on one subject each; the quickstart says when you need one.
