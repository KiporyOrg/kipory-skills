---
name: kipory-secrets
description: Store the credentials a Kipory project's flows need — vendor API keys, a request credential for a service with no function of its own, a webhook's signing secret, your own Google OAuth client or Apple sign-in key — in the node-scoped vault, so a web-fetching function spends the project's own key and its vendor bills the project. Use when a flow needs a credential, a function reports a missing API key, or deciding who pays a vendor. Most model calls are not covered: generation, embedding and transcription always run on the platform's key; reranking (`cohere`) and `text.decide` (`typesafe`) read the vault, still at the platform's model price. A request credential (`http_credential`) is named in the `secret` of a `url.fetch`, `url.fetch-as-file` or `url.send` step; a signing secret (`signing_secret`) in the `storedSecret` of `request.verify-signature`. Not for choosing which source function to use (kipory-gather), not for end-user sign-in itself (kipory-expose), not for what a run cost (kipory-operate).
license: MIT
---

# Store a credential

The vault holds anything a project needs and nobody should read back. The fact most people get wrong: **this does not apply to most model calls, and that is where most of the money is.** Generation, embedding and transcription always run on the platform's key at the platform's price — they do not read this vault and cannot be made to. The functions that fetch from an external web vendor resolve a credential this way, and so do two model functions with a single fixed vendor: `text.rerank` (purpose `cohere`) and `text.decide` (purpose `typesafe`). On those two your key changes whose account the call runs on, not what the platform charges: the vendor invoices you and the platform still charges its model price for the call.

## Before the first call

- Fetch the judgment: `references/packs/secrets.md`, or live at `GET /v1/capability-packs/secrets`.
- Confirm which vendor a function wants from `GET /v1/functions/{key}` — the entry names the credential type and purpose it resolves — before storing anything on that vendor's account.
- Read `GET /v1/secrets/catalog` before composing a value. It returns each supported type with its field keys and says which fields are secret; the value is a flat object of those keys — `{ "apiKey": "…" }` for `api_key` — and a deployment can support types this file has never heard of. A value that does not fit is a 422 naming every failing key, each also in `details.issues` with its `path` under `value`. A type's `purposePlaceholder` (`firecrawl` on `api_key`) is an example for a form, not a list of vendors the platform reads your key for — generation, embedding and transcription never use a stored key.

## How a credential is chosen

The key is looked for in three places, in order: **your node's vault**, then the **nearest ancestor node**, then the **platform's own key**. Whichever answers first is the one that gets spent. On the first two the vendor bills you directly; on the third you are spending the platform's key at the platform's price. For a web-fetch vendor, a key of your own means the platform does not also pass its own vendor charge through. For `cohere` and `typesafe` it means nothing of the kind: the platform charges its model price for a re-ranking or decision call whoever's key answered, so on your own key you pay that vendor and the platform for the same call. A request credential (`http_credential`) has only the first two: with none stored and switched on, a `url.fetch` or `url.fetch-as-file` step fails `api-key-missing`, and a `url.send` request is not delivered, with nothing in the run to say so.

A key of your own is also the way off the platform's account. The platform holds its own accounts at each vendor for every project — it may hold several at one vendor, and a call moves to the next on empty credit or a refused key — and they can all run out: a step that fetches from that vendor then fails with `detail.phase: "platform-fault"` and "The platform's … account is out of credits … This is a platform fault, not a fault in the flow" — not charged, and not something a flow can fix (the step inside a `try`, or an `each` whose `maxFailedBranches` or `maxFailedShare` lets it go, can only carry on past it). The project is told: a trigger on `platform/vendor.unavailable` fires once when that account stops serving, and `platform/vendor.available` once when it serves again; a project that already stores its own key hears it too, with a message saying it is not affected. Storing your own `api_key` under that vendor's name as purpose moves the step onto your account from the next call, with no flow edit. From then on a refused key or an empty account is yours: the step fails `api-key-missing` or `quota-exhausted`, and is charged as any failed step. Model calls have no such way out — generation, embedding and transcription never read this vault — so an exhausted model provider is the deployment's to top up (`kipory-build`'s `references/models.md` for moving a task to another account meanwhile).

Bringing your own web-fetch key removes the vendor pass-through, **not the cost of the run**. The compute fee is charged either way — one charge per function invocation, metered in milliseconds of its runtime — so a ten-step flow bills ten of them. A step answered from its function's cache makes no vendor call on anyone's key and still pays the compute of its lookup (`kipory-operate` has the billing detail).

A step that can reach more than one vendor resolves **each vendor's key separately**. An `x.posts` or `youtube.transcript` step moves to another vendor only as its `vendor.switch` allows (`never` by default; `when-kipory-account-fails`; `when-vendor-fails`), and a switched step is billed by the vendor that answered: with your own key for one vendor only, a switch spends Kipory's key at the next. Store a key for each vendor the step can reach, or leave `vendor.switch` at `never` (`kipory-gather`).

## A connection's key

A connection (`kipory-gather`'s `references/connections.md`) takes its credential in its own
`POST /v1/nodes/{nodeId}/connections` call, not through `/v1/secrets`: the key is stored in the
**organization's** vault under the connection's own purpose (`connection-<slug>`), and a new one is
given with `PATCH …/connections/{slug}` `{ credential, version }`, which tests every function on it
before keeping it. None of the three places above applies to it: its functions send the
organization's key and only that — never a project's entry under the same purpose, never Kipory's —
so without it a step fails, and it never falls through to the platform's account. The API bills
the organization's account; the step still pays its compute. Its daily tests, when the organization
turns them on, run on that key too and are paid by that account, never from Kipory's. Deleting the
connection removes the key.

## The sequence

```
GET    /v1/secrets/catalog          the supported types and their fields
GET    /v1/secrets?node=…           one node's own credentials — metadata only
GET    /v1/secrets/resolution?node=… which record each credential resolves to at that node, who holds it, who pays
POST   /v1/secrets                  store one: node + type + purpose + value → 201
PUT    /v1/secrets/{id}             rotate the value in place
PATCH  /v1/secrets/{id}             { enabled: false } stop using it — the one above takes over
                                    { enabled: true }  use it again
DELETE /v1/secrets/{id}             remove it → { id, deleted: true }
```

A secret is identified by the node it hangs on, its **type**, and a **purpose** you choose. When a function says the key is missing, the failure names the vendor it wanted: store a credential whose purpose is that vendor's name, on the node the flow runs under or any ancestor of it, then run again. There is nothing to redeploy and no flow edit to make.

## What will bite you

**What will bite you** — where a secret is used, upserts, node scope, disable and suspension, ADMIN writes, push keys, and the coverage read: `references/pitfalls.md`.

## References

| File                          | What it answers                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `references/packs/secrets.md` | the judgment: which tier's key pays, why disable defers upward, why nothing reads back |
| `references/api/secrets.md`   | every route's fields, the catalog shape                                                |
| `references/pitfalls.md`      | what will bite you when storing a credential                                           |

## Then

`kipory-build` — the flow whose function needed the credential. `kipory-diagnose` — the run's steps and the flow's trace, to see what the function emitted once the key was in place; there is no success flag on a trace, and tracing is sampled, so absence of evidence is not evidence the call failed. `kipory-operate` for what the run then cost. `kipory-expose` when the credential is your own Google sign-in client (type `oauth_client`, purpose `google`) or your own Apple sign-in key (type `apple_signin`, purpose `apple`): its `references/sign-in.md` has the rest of that setup. `kipory-gather` for which vendor each source function spends.
