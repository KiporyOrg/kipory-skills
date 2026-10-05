<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Secrets

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

A credential vault scoped to a node — an organisation or a project. One secret is identified by three things — the node it
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
directly. For a web-fetch vendor the platform then does not also pass its own vendor charge through
for a call you have already paid for. For the two model vendors (`cohere`, `typesafe`) it still
charges its model price — see below. On the third you are spending the platform's key at the
platform's price.

A request credential (`http_credential`, below) has only the first two tiers: the platform holds
none, so with none stored and switched on a read fails `api-key-missing` and a `url.send` request
is not delivered.

⚠️ **This removes the vendor pass-through, not the whole cost of the run.** The flat per-run
compute fee is charged either way — one charge per handler invocation, metered in whole seconds of
its runtime, so bringing your own key changes who the vendor invoices and does not make the run
free. Do not try to confirm the saving by reading your charges: the suppression is a silent absence,
deliberately not a zero-priced line, so it is invisible in a spend breakdown either way — and
`GET /v1/credits/events` answers `401` to an API key, which has no user to scope a statement to.

So adding your own key is a billing decision as much as an isolation one, and it is the single
most common reason to touch this surface at all.

⛔ **Most model calls are outside this surface, and that is where most of a project's vendor
money goes.** Generation, embedding and transcription run through the platform's own model
configuration, which has no access to this vault at all — it cannot read a stored credential even
in principle.
Storing a key for one of those vendors here changes nothing about who that vendor bills, no matter
how plausible a catalog example value makes it look. Two model handlers with one fixed vendor are
the exception and do resolve a key here: `text.rerank` (purpose `cohere`) and `text.decide`
(purpose `typesafe`).

⛔ **Your own `cohere` or `typesafe` key does not lower what the platform charges.** The call runs
on your account, so that vendor invoices you, and the platform still charges its own model price
for the same re-ranking or decision call, as well as the compute fee. Store one of these keys to
use your own account's limits or terms, not to save money: you pay for the call twice.

Which vendor a given handler needs is part of that handler's own description — confirm it against
`GET /v1/handlers`, never against a pack. The provider keys that resolve this way today are stored
under a purpose matching the vendor's name. The external web-fetch vendors: `firecrawl`, `apify`,
`twitterapi`, `youtube`, `supadata`, and `scrapecreators` — the last for every social-platform
read (`tiktok.*`, `instagram.*`, `linkedin.*`, `reddit.*`, `threads.*`, `facebook.*`, `google.*`,
`x.profile`, `x.transcript`, `youtube.posts`, `youtube.comments`, `youtube.search`) and for
`x.posts` and `youtube.transcript` on a step that chose it. The two model vendors: `cohere` and
`typesafe`. Each is a credential of the catalog's plain bearer-key type.

**A secret is used only where the platform looks it up: a handler that names its purpose, a step
that names it in `secret`, or sign-in.** A vendor with no handler of its own is reached with a
request credential on `url.fetch`, `url.fetch-as-file` or `url.send` — see the request credential
below.

⚠️ **A step that can reach two vendors resolves each vendor's key separately.** `x.posts` and
`youtube.transcript` fall back to another vendor when the chosen one fails, and the fallback is
billed by the vendor that answered — so your own key for one vendor does not stop the platform's
key being spent for the next. Store a key for each vendor the step can reach, or set
`fallback: false` on the step.

**Read the handler's `credential` field, not its `requiredApiKey`.** A handler that resolves a
tenant key carries `credential` — the catalog `type` and the `purpose` to store it under, plus the
vendor's own name for prose. That pair is the thing this surface is addressed by, so it is the
answer to "what do I store, and under what name". `requiredApiKey` beside it is a **phrase for a
person** ("a Firecrawl API key"), not an address; deriving a purpose from it is a guess that has no
reason to keep working.

⚠️ **A handler with neither `credential` nor `stepCredential` cannot use a key you store, at any
price.** Most model calls are
the population that matters: text generation, embedding and transcription reach their provider
through the platform's own configuration and never consult the vault, so a credential stored for
one of those is a row nothing will ever read. Absence of both fields is the whole signal — there is
no error, and every other sign the row is healthy will be present. (`stepCredential` is the other
way a handler reads a key: see the request credential below.)

The `custom` type is in the same position: it stores a value under a name of your choosing, and no
handler reads it. Storing an outside service's API key as a `custom` secret does not make that
service reachable from a flow — store it as an `http_credential` instead.

## A key for a service that has no handler: `http_credential`

A handler whose catalog entry carries `stepCredential` lets a **step** name a secret of its own.
Today that is `url.fetch`, `url.fetch-as-file` and `url.send`. The purpose is yours to choose; the step writes
it in the config field `stepCredential.configPath` names (`secret`).

The stored value says where it goes in a request, so the step never does:

| Field       | Required | What it is                                                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `value`     | yes      | The key or token, with no line break. Encrypted, never returned.                                              |
| `placement` | yes      | `header` sends it as a request header. `query` puts it in the address.                                        |
| `name`      | yes      | The header or query-parameter name, e.g. `X-Api-Key` or `Authorization`.                                      |
| `scheme`    | no       | One word sent before a header's value with a space, e.g. `Bearer`. With `placement: "header"` only.           |
| `hosts`     | no       | Host names that may receive it, separated by commas. Up to 32 exact names: no scheme, port, path or wildcard. |

The store call, for a key sent as `Authorization: Bearer <the key>` to one host:

```
POST /v1/secrets
{ "node": "<project id>", "type": "http_credential", "purpose": "crm",
  "value": { "value": "<the key>", "placement": "header", "name": "Authorization",
             "scheme": "Bearer", "hosts": "api.crm.example" } }
```

- **Every field is a string.** `hosts` is one string of names separated by commas or spaces, not a
  list; an array is a 422.
- `value` is at least 8 characters, with no line break and no space at either end.
- `name` is up to 128 letters, digits and `-` `_` `.`. As a header it cannot be one the platform
  sets itself (`Host`, `Content-Length`, `Transfer-Encoding`, `Connection`, `User-Agent`,
  `Idempotency-Key`, `Accept-Encoding`).
- `scheme` with `placement: "query"` is a 422.
- `purpose` is up to 128 characters with no space at either end.

The step then sets `"secret": "crm"`. The request carries `Authorization: Bearer <the key>`; with
`placement: "query"` the address gains `name=<the key>` instead.

⚠️ **Leave `hosts` empty and the secret goes to whatever address a step reads.** Anyone who can edit
a flow in a project the secret reaches can then send it to a server of their own, and read it. List
the service's hosts unless you have a reason not to.

How it behaves:

- A step addressed to a host the secret does not list fails before any request is made.
- It is sent over `https` on the default port only. On a redirect it travels only to a host the
  secret lists; a secret with no host list is sent on the first request alone, and no redirect
  carries it.
- An answer that comes back compressed fails the step: it could not be checked for the value.
- It resolves from the project's node and the organisations above it. Kipory holds none, so
  there is no platform fallback: with none stored and switched on, a read fails `api-key-missing`
  and a `url.send` request is not delivered. A flow whose step names a purpose no node holds
  carries a `STEP_SECRET_NOT_HELD` warning when it is saved.
- `GET /v1/secrets/resolution` does not list it: its purpose is whatever a step names. Check it
  on the node list (`GET /v1/secrets`).
- Replacing the secret replaces every field: enter the hosts again, or they are gone.
- The value never appears in a step's output, a warning, an error or a log line.
- `url.send` reads it when the request is delivered, after the run. A secret removed or narrowed by
  then fails that delivery, the run has already finished, and no read reports it.

## Address by node, not by project

Every sibling design resource scopes by project because every one of them belongs to a project. A
secret does not. It attaches to any node and resolves up the ancestor chain, so an
**organisation-level default with a per-project override** is the intended arrangement rather than
an edge case — which is exactly why the field is named for the node.

A project's id is its node id — the `id` its create answered — so for a project-level secret,
`node` is simply the project's id.

## What resolution actually does

- **Nearest wins.** The chain is walked from the node toward the root, and the first _active_
  record matching the type and purpose is the one used.
- **Disabled does not mean off — it means "defer upward."** A disabled record is skipped, so
  disabling a project's override hands the job to the organisation's default. If you meant "this
  project must not use this vendor at all," disabling the project's row does not achieve it, and
  the run will keep succeeding on somebody else's credential.
- **An inactive branch resolves nothing, and runs nothing live.** Effective status is the most
  restrictive over the node and every ancestor, so a suspended or archived organisation anywhere
  up the chain admits no secret at all. While it is not active, every live run — an endpoint
  call, a record's processing, a schedule or trigger run — is refused `403 WORKLOAD_SUSPENDED`
  before any step; a design-time preview is not behind that gate. `GET /v1/secrets/resolution`
  reports `branch-inactive`. Check the branch before you go looking
  for a deleted credential.
- **A secret that cannot be used is skipped, not substituted from an ancestor.** If the applicable
  record exists but cannot be decrypted, it yields nothing of yours: the lookup does not move on to
  a different node's credential and never returns a value that is merely plausible. A vendor call
  then runs on the platform's key at its price, while the resolution read still says `present`. A
  Google sign-in client in that state refuses the sign-in; an Apple sign-in key in that state
  still signs people in, and only the later revocation of the Apple grant is lost.

## Ask what resolves — do not reconstruct it

`GET /v1/secrets/resolution` answers, for one node, the question the list declines to: for every
credential the platform looks up — each vendor key a handler resolves and each sign-in credential
— which record a call there would use. Each key reports a `state` (`present`, `disabled`,
`not-found`, `branch-inactive`), the node holding the record that state is about, `ownStatus` for
the row stored on the node itself (`null` when the node stores none), and, for a vendor key,
`billedBy` — `vendor-to-holder` when the vendor invoices the holder and the platform charges compute
only, `vendor-and-kipory` when the vendor invoices the holder and the platform also charges its
model price (the `cohere` and `typesafe` keys), `kipory` when the call runs on the platform's key
at the platform's price, `null` on a key that is never billed (a sign-in credential). It is the same walk
resolution performs, effective-status gate included, and nothing in it is decrypted.

Each key also says what happens when nothing of yours resolves, as `fallback`: `platform-key` — the
call runs on the platform's key and the platform bills it (every vendor key); `fails-closed` —
nothing takes over: the platform's own credential is never substituted (a sign-in credential: one
project's users are never signed in through another's client). Google sign-in is then refused;
Apple still signs people in and loses only the later revocation of the grant.

The list of keys here is the list of vendor and sign-in purposes actually read: one of those
stored under a purpose that appears nowhere in it is never used. A request credential
(`http_credential`) is not listed — a step reads it by the name in its `secret`.

⛔ **Do not rebuild this by listing every ancestor and taking the first active row.** That
reconstruction cannot see the effective-status gate, so it reports a suspended organisation's key
as the one in use when resolution admits nothing at all.

⚠️ **`present` is not proof the value works.** A record that fails to decrypt, or whose value is
not the shape its handler expects, still yields nothing of yours at run time — the call runs on the
platform's key instead — and a metadata read cannot see either. And a holder above your own reach is withheld — its node and name come back null beside a
`present` state — because whether a credential resolves for your node is yours to know and who
holds it above you is not.

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
The `api_key` type's value is `{ "apiKey": "…" }`. A value that does not fit is a 422 whose message
names every failing field key, and whose `details.issues` carries each with its `path` under
`value`. A type's `purposePlaceholder` is an example word for a form
(`firecrawl` on `api_key`, a purpose the scrape handlers read), not a list of vendors that read the
vault — generation, embedding and transcription never use a stored key.

The catalog is built to grow — a deployment may support a type this pack has never heard of — so
read it rather than assuming a shape. A type absent from the catalog on your deployment is absent
from the vault too, however well documented it is elsewhere.

## Who may call it

Listing is a viewer-floor call on the node. Every write — create, rotate, switch on or off, delete
— requires admin on that node, which is stricter than the design-mutation floor elsewhere because
whose key pays a vendor is a billing decision.

**Read `GET /v1/grant` before the first write.** It answers what your key holds: `role` must be
`admin` or `owner`, and `node` must be the secret's node or an ancestor of it. A `403` means the
grant is below admin or does not reach that node, and the `grant` inside its `details` repeats what the key
holds. `GET /v1/nodes/{nodeId}/effective-role` does **not** answer this — it requires a `userId`
naming **another user** whose membership you are asking about, and it resolves a person's
membership rather than a key's grant.

## The calls

| To                                   | Call                                               |
| ------------------------------------ | -------------------------------------------------- |
| Learn the supported types and fields | `GET /v1/secrets/catalog`                          |
| List one node's own credentials      | `GET /v1/secrets`                                  |
| See which credential each key uses   | `GET /v1/secrets/resolution`                       |
| Store a new credential               | `POST /v1/secrets`                                 |
| Replace a value in place             | `PUT /v1/secrets/{id}`                             |
| Stop using one, keeping the record   | `PATCH /v1/secrets/{id}` with `{"enabled": false}` |
| Resume using it                      | `PATCH /v1/secrets/{id}` with `{"enabled": true}`  |
| Remove it entirely                   | `DELETE /v1/secrets/{id}` → `{id, deleted: true}`  |

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

- Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`) — finding the node id this surface is
  addressed by.
- Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`) — the tunable, readable sibling, and the line between them.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the handlers that consume a credential, and where a
  missing-key failure surfaces.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — what the platform will not do for you regardless of whose key pays.
