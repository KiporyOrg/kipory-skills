---
name: kipory.connect
description: Establish a working connection to a Kipory deployment — confirm the credential is live, learn exactly what it can reach, and load the deployment's judgment layer. Use at the start of any session that will build on Kipory, before authoring anything.
---

# Connect to Kipory

This is turn zero. It runs before planning, before modelling, before a single design call — and it
is the one skill that cannot be fetched from the platform, because it is what tells you how to
fetch from the platform.

## What Kipory is, in four sentences

Kipory is a platform for building products. A product on Kipory is a **project**, and a project is
not code — its record types, flows, HTTP endpoints, facets, schedules and events are **validated
configuration rows** you author by calling the design API over HTTP.

There are two planes and they face opposite directions: the **design plane** is where a project is
authored (that is the one you call), and the **dynamic plane** is where the project's own users are
served. Do not reach for one from inside the other.

## What you need before turn one

Three things. **None of them is discoverable — all three come from the human.**

| You need              | Why you cannot derive it                                         |
| --------------------- | ---------------------------------------------------------------- |
| The **base URL**      | Kipory is deployed per installation. There is no canonical host. |
| An **API key**        | A key can only be minted from a signed-in session — see below.   |
| The key's **node id** | Nothing echoes a grant back. There is no `whoami` for a key.     |

<!-- key-unreachable-ok: GET /v1/me — named ONLY to explain why it refuses a key, never prescribed -->

That third row is the one that surprises people. Your key carries a grant — one node, one role —
and **no endpoint will tell you what it is.** `GET /v1/me` is a per-user surface and answers `401`
to a key, correctly: a key is a machine principal and has no "me". If the human did not give you a
node id, ask for it. Do not guess, and do not try to discover it by probing ids.

> **Never ask the human to paste the key into a file you will write, a commit, or a log line.** It
> is a standing credential with its own role. Read it from the environment.

## The sequence

### 1. Prove the deployment is there — no credential needed

```
GET /health              → 200, and `sha` is the build actually running
GET /v1/capability-packs → 200, the judgment layer + a `version`
```

Both are public on purpose. An agent that must read the packs _before_ it can author anything
cannot be asked for a credential it does not have yet.

### 2. Load the judgment layer

`GET /v1/capability-packs` returns every pack with a `version` that is a content hash of the whole
set. **Read the README pack first** — it is the index, and it tells you which pack answers which
question. Fetch one pack with `GET /v1/capability-packs/{id}`.

Cache against `version`. A `version` you have not seen means this deployment's judgment changed
under you.

### 3. Prove the key is alive

```
GET /v1/handlers    Authorization: Bearer <key>
```

This is the **liveness** probe, and it is the right one because it is authenticated but not floored
against any project. A `200` means the key exists, is not revoked and is not expired. It tells you
nothing about reach — that is the next call, and keeping the two apart is what makes a later
refusal readable.

### 4. Prove the key reaches the project

**If the project already exists**, and you were given its node id:

```
GET /v1/projects/{nodeId}    → 200 and you are connected
```

**If you must create it**, you need `OWNER` at the parent organisation node:

```
POST /v1/projects  { name, slug, parentNodeId }     → 201 { id, slug, name }
GET  /v1/projects/by-project-id/{id}                → { nodeId, projectId, … }
```

⚠️ **Pass `parentNodeId` explicitly.** It defaults to the platform organisation, which your grant
almost certainly does not reach — so omitting it turns a correct request into a `403` that looks
like a broken key.

⚠️ **The create response hands you the project id, and the design plane speaks node.** Every design
resource scopes by the project's `OrgNode` id. `by-project-id` is the bridge, and it exists
precisely because the caller does not know the node yet. Do not go looking for a list endpoint to
resolve it — see below.

## Reading a refusal

The two codes answer different questions, and telling them apart saves an hour:

| Code  | Means                                                     | Do                                                     |
| ----- | --------------------------------------------------------- | ------------------------------------------------------ |
| `401` | The credential is missing, malformed, revoked or expired  | Re-check the header, then ask the human for a live key |
| `403` | The credential is fine; the grant does not authorise this | Check role, then reach — in that order                 |

**A `403` is deliberately not an existence oracle.** An unresolvable node, a project that was never
created, a corrupt tree and an insufficient role all refuse identically. So a `403` never means
"that id is wrong" and never means "that id is right" — you cannot use it to probe.

## What your key can and cannot do

A key holds a **grant**: one node and one role, written on the row when it was minted.

- **Reach is plain descent.** A key granted at your organisation node reaches every project beneath
  it. A key granted at a single project node reaches that project and nothing else — that is a
  supported, intended shape, and it is the right one when the project already exists.
- **Role is uniform over that whole reach.** A `VIEWER` grant at the org root reaches everything and
  may still only read.
- **The ladder** is cumulative: read → `VIEWER`, design mutation → `EDITOR`, destructive, structural
  or billing → `ADMIN`. Creating a project needs `OWNER` at the parent.

**A key is minted at `VIEWER` unless a role was asked for.** If every write refuses while reads
succeed, suspect the role before you suspect anything else.

<!-- key-unreachable-ok: GET /v1/projects — named ONLY to warn it is refused, never prescribed -->

## What the platform refuses

- **A key cannot mint a key.** Key management accepts a signed-in session only — a leaked key must
  not be able to manufacture siblings that outlive revoking the original. The human mints it.
- **A key is never platform staff**, whatever node it is granted at. So `GET /v1/projects` — the
  list of every project on the installation — answers `403` to every customer key, always. It is
  not the way to resolve your node id; `by-project-id` is.
- **A key is never granted on the system root.** That would be a customer credential with reach over
  every tenant, and it is refused at mint.
- **A key cannot exceed its minter.** The granted role is capped at the effective role of whoever
  minted it.

## What will bite you

- **Silence about the node id.** Nothing tells you your own grant. Get it from the human at turn
  zero, not at the first `403`.
- **`parentNodeId` omitted on create** — defaults to the platform organisation, refuses, and reads
  like an auth failure.
- **The `201` is not proof of everything.** Project creation is atomic, but the flow-provider shapes
  are seeded afterwards, best-effort. If you are about to reference one, read it back.
- **Confirm facts live, never from memory.** Handler keys, routes and request shapes come from
  `GET /v1/handlers` and `GET /v1/openapi.json` on _this_ deployment. A remembered handler key has
  already cost real wasted calls.

## Where to go next

Everything past connecting is judgment, and it is served by the deployment rather than carried here
— so it stays true as the platform moves.

| Next                                  | Fetch                                           |
| ------------------------------------- | ----------------------------------------------- |
| Turn an idea into a plan              | `GET /v1/capability-packs/planning-protocol`    |
| Know what Kipory **cannot** do        | `GET /v1/capability-packs/limits`               |
| Create a project, or find its node id | `GET /v1/capability-packs/project-provisioning` |
| Anything else                         | `GET /v1/capability-packs/readme` — the index   |

**Read one or two packs per step, not all of them.** The index is built for that.
