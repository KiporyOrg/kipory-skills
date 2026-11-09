# Turn zero, in full

Read this when the short sequence in `SKILL.md` is not enough: what each first call proves, creating a project, reading a refusal, and what bites at turn zero.

## Where the human gets the key

the project's **Keys** page in the operator UI → **New key**, with the role the work needs (viewer unless they pick one; previewing or testing a flow needs admin) and an expiry. The plaintext is shown once, with the project's id beside it; the id is also on the project's **Settings** page. **Never ask the human to paste the key into a file you will write, a commit, or a log line.** Read it from the environment.

## The sequence, step by step

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

**2b. Check the wallet can pay.** `GET <baseUrl>/v1/credits/balance` with the same key, on the project's host (the api host answers 404): `status` is `active` and `creditsRemaining` is above `-softCapCredits`. It takes no `?node=`; the host names the project. An empty wallet stops your endpoints' POSTs, previews and schedule fires while plan, apply and `POST /v1/records` still work, so a dry wallet looks like a broken flow. With no `baseUrl`, `GET /v1/projects/{nodeId}/usage` on the api host has `payer.wallet` (`balance`, `overdraft`, `status`), but only when the key administers the node that pays; a key at a project that does not hold its own wallet reads `wallet: null`.

**3. On a project that already holds work, read the map first.** `GET /v1/projects/{nodeId}/map` is one entry per flow — what starts it, what it reads, writes and calls — at about 0.5 KB a flow; `GET /v1/flows/{id}/outline` is one flow's steps as an outline. An empty project has nothing to read: go to the build. A flow with no `steps` yet is not started (`FLOW_NOT_AUTHORED`) until they are written (`kipory-build`). A project from before format 11 is gone: `references/session-start.md`.

**If you must create the project** you need `owner` at the parent organisation node:

```
POST /v1/projects  { name, slug, parentNodeId }       → 201 { id, slug, name }   — `id` is the project's id everywhere
```

⚠️ Pass `parentNodeId` explicitly. It defaults to the platform organisation, which your grant almost certainly does not reach, so omitting it turns a correct request into a 403 that looks like a broken key.

**4. Check the models your steps will run on.** `GET /v1/nodes/{nodeId}/task-models` lists each task a step inherits its model through; a row with `callable: false` fails every step on that task (`kipory-build`'s `references/models.md`). When a run fails with `detail.phase: "platform-fault"`, `GET /v1/platform-status` says whether the platform's provider account is refusing — the deployment's fault, not the flow's. Confirm facts live, never from memory: `GET /v1/functions`, `GET /v1/openapi.json`, `GET /v1/coded-routes` (`references/session-start.md`).

## Reading a refusal

| Code  | Means                                                                                                                                                                                            | Do                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401` | The credential is missing, malformed, revoked or expired — or it was granted at a project that has been retired                                                                                  | Re-check the header, then ask the human for a live key                                                                                                   |
| `403` | The credential is fine; the grant does not authorise this                                                                                                                                        | Read `details`: `requiredRole` against `grant` — below                                                                                                   |
| `404` | On the api host: the node resolved and hosts no project, or the route is served on the other host — or, on an item route, an id you cannot see (missing, or in a project your key doesn't reach) | Check the path first — a mistyped design route gets the same answer. Then the host. Then whether the id is an organisation's, or one your key cannot see |
| `402` | Something that pays is out of credits or at a ceiling — one of five codes <!-- count: api-402-codes -->, each with a different remedy                                                            | Branch on `code`: `references/conventions.md`, Refusals; the gates themselves are `kipory-operate`                                                       |

A role-floor `403` carries `details: { reason: "insufficient_project_role", requiredRole, grant: { nodeId, role } }`. If `grant.role` is below `requiredRole`, ask the human for a key with that role; if not, the node you addressed is outside the key's reach — another project's id. A key is minted at `viewer` unless a role was asked for; previewing or testing a flow needs `admin`.

## What will bite you

- **The two hosts.** Design routes answer on the api host with your key; your project's endpoints answer on its `baseUrl`. Each on the other host is a 404 that looks like a typo.
- **A key cannot act as an end user, mint a key, or read `/v1/me*`.** Test as a person with a test user's session (`kipory-build`'s quickstart, "Try it as a person").
- **A declared query string is strict**: an unlisted key on a design route is a 422, and a write refuses any query key it does not list.
- **A new build can turn an untouched flow red.** When `sha` on `/health` changes, read `GET /v1/flows?project=<nodeId>&expand=health`.
- Everything else that bites at turn zero — retired projects, seeded types, version strings, every route a key cannot call — is in `references/session-start.md`.
