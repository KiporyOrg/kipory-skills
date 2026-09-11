<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 423f5af968c4 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Secrets

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

A credential vault scoped to an `OrgNode`. One secret is identified by three things — the node it
hangs on, a catalog **type**, and a **purpose** you choose — and that triple is unique. The purpose
is what lets one node hold several credentials of the same type: it is the vendor's own name for a
provider key, or a name you invent for a free-form value.

It is the only place a value nobody should be able to read back belongs. Project config is the
resource that looks adjacent and is not: it is typed, tunable and readable by flows in the clear.
The vault is none of those things, deliberately.

<!-- key-unreachable-ok: GET /v1/credits/events — named ONLY to say it refuses an API key, so a reader does not go looking there to confirm a BYOK saving -->

## Why a project wants one at all

A handler that calls a paid vendor resolves its key in three tiers, in order:

1. the vault at the run's own node,
2. the nearest ancestor node that holds a matching credential,
3. the platform's shared key.

**The tier that answers decides who pays the vendor.** On the first two the vendor bills you
directly, and the platform does not also pass its own vendor charge through for a call you have
already paid for. On the third you are spending the platform's key at the platform's price.

⚠️ **This removes the vendor pass-through, not the whole cost of the run.** The flat per-run
compute fee is charged either way — one charge per handler invocation, metered in whole seconds of
its runtime, so bringing your own key changes who the vendor invoices and does not make the run
free. Do not try to confirm the saving by reading a ledger: the suppression is a silent absence,
deliberately not a zero-priced line, so it is invisible in a spend breakdown either way — and
`GET /v1/credits/events` answers `401` to an API key, which has no user to scope a ledger to.

So adding your own key is a billing decision as much as an isolation one, and it is the single
most common reason to touch this surface at all.

⛔ **Model calls are outside this surface entirely, and that is where most of a project's vendor
money goes.** Generation, embedding, transcription and reranking run through the platform's AI
chokepoint, which has no access to this vault at all — it cannot read a stored credential even in
principle. Storing an AI vendor's key here changes nothing about who that vendor bills, no matter
how plausible a catalog example value makes it look.

Which vendor a given handler needs is part of that handler's own description — confirm it against
`GET /v1/handlers`, never against a pack. The provider keys that resolve this way today are the
external web-fetch vendors, stored under a purpose matching the vendor's name: `firecrawl`,
`apify`, `youtube`, `supadata`. Each is a credential of the catalog's plain bearer-key type.

**Read the handler's `credential` field, not its `requiredApiKey`.** A handler that resolves a
tenant key carries `credential` — the catalog `type` and the `purpose` to store it under, plus the
vendor's own name for prose. That pair is the thing this surface is addressed by, so it is the
answer to "what do I store, and under what name". `requiredApiKey` beside it names an
**environment variable on the platform**, which is a fact about the deployment's own fallback and
not about your vault; deriving a purpose from it is a guess that has no reason to keep working.

⚠️ **A handler with no `credential` cannot use a key you store, at any price.** Model calls are
the population that matters: text generation, embedding and transcription reach their provider
through the platform's own configuration and never consult the vault, so a credential stored for
one of those is a row nothing will ever read. Absence of the field is the whole signal — there is
no error, and every other sign the row is healthy will be present.

## Address by node, not by project

Every sibling design resource scopes by project because every one of them belongs to a project. A
secret does not. It attaches to any node and resolves up the ancestor chain, so an
**organisation-level default with a per-project override** is the intended arrangement rather than
an edge case — which is exactly why the field is named for the node.

If you only have a project id, get its node id first; that is turn zero for this surface as much
as for the design plane.

## What resolution actually does

- **Nearest wins.** The chain is walked from the node toward the root, and the first _active_
  record matching the type and purpose is the one used.
- **Disabled does not mean off — it means "defer upward."** A disabled record is skipped, so
  disabling a project's override hands the job to the organisation's default. If you meant "this
  project must not use this vendor at all," disabling the project's row does not achieve it, and
  the run will keep succeeding on somebody else's credential.
- **An inactive branch resolves nothing.** Effective status is the most restrictive over the node
  and every ancestor, so a suspended organisation anywhere up the chain admits no secret at all.
  The handler then reports a missing key — the failure names the absence, not the suspension, so
  check the branch before you go looking for a deleted credential.
- **It fails closed.** If the applicable record exists but cannot be decrypted, resolution yields
  nothing at all. It never falls through to a different node's credential and never returns a
  value that is merely plausible.

## There is no read-back, and that is structural

No response on this surface carries a secret value. Creating takes a value and returns metadata;
rotating takes a value and returns metadata. Plaintext leaves the vault only on the backend
resolution path, and that path has no route — so a stolen session cannot exfiltrate a stored
credential, and neither can you.

**Keep your own copy of anything you store.** The platform cannot tell you later what it holds.

What does come back is `publicMeta`: the part of a value the catalog classifies as non-secret, an
OAuth client id being the usual example. It is returned in the clear, which is why even listing is
a tenant-scoped read rather than a public one.

## Let the catalog tell you the shape

`GET /v1/secrets/catalog` returns every supported type with its fields, and each field declares
whether it is secret. Send a value as a flat object keyed by those field keys; the type's own
parser splits it into the clear part and the encrypted part, and rejects keys it does not know.

The catalog is built to grow — a deployment may support a type this pack has never heard of — so
read it rather than assuming a shape. A type absent from the catalog on your deployment is absent
from the vault too, however well documented it is elsewhere.

## Who may call it

Listing is a viewer-floor call on the node. Every write — create, rotate, enable, disable, delete
— requires admin on that node, which is stricter than the design-mutation floor elsewhere because
whose key pays a vendor is a billing decision.

⛔ **There is no call that reports what your own credential holds.** Nothing echoes a grant back to
its bearer, so a build sheet cannot check first and then assume: attempt the write and read the
refusal, where a `403` means the grant is below admin or does not reach that node.
`GET /v1/nodes/{nodeId}/effective-role` does **not** answer this — it requires a `userId` naming
**another user** whose membership you are asking about, it resolves a person's membership rather
than a key's grant, and it is itself floored at admin on that node, so the caller who most needs
the check is exactly the one it refuses.

## The calls

| To                                   | Call                            |
| ------------------------------------ | ------------------------------- |
| Learn the supported types and fields | `GET /v1/secrets/catalog`       |
| List one node's own credentials      | `GET /v1/secrets`               |
| Store a new credential               | `POST /v1/secrets`              |
| Replace a value in place             | `PUT /v1/secrets/{id}`          |
| Stop using one, keeping the record   | `POST /v1/secrets/{id}/disable` |
| Resume using it                      | `POST /v1/secrets/{id}/enable`  |
| Remove it entirely                   | `DELETE /v1/secrets/{id}`       |

⛔ **Storing a second credential with the same type and purpose on the same node is an UPSERT, not
a refusal.** It replaces the stored value in place and answers `201`, exactly as a rotation would —
and because nothing reads a value back, the value it overwrote is unrecoverable. Treat a repeat
`POST` as destructive and list the node first if you are not certain what is already there. (The
re-save leaves `status` alone, so a record someone disabled stays disabled.)

## Mistakes already made

- **Treating disable as a kill switch.** It is a fallback instruction. The only way to guarantee a
  node uses no credential for a vendor is for no ancestor to hold an active one either.
- **Expecting to read a value back** to copy it somewhere else. Nothing returns it; plan for the
  value to exist only where you first had it.
- **Putting a credential in project config** because that surface is easier to read. It is easier
  to read for everything else too.
- **Assuming project addressing** because every neighbouring resource uses it, then storing an
  organisation-wide key on one project's node where its siblings cannot reach it.

## Related

- Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`) — finding the `OrgNode` id this surface is
  addressed by.
- Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`) — the tunable, readable sibling, and the line between them.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the handlers that consume a credential, and where a
  missing-key failure surfaces.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — what the platform will not do for you regardless of whose key pays.
