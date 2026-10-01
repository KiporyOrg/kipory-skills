---
name: kipory-secrets
description: Store the credentials a Kipory project's flows need — vendor API keys, OAuth clients, signing keys — in the node-scoped vault, so a web-fetching handler spends the project's own key and that vendor bills the project directly. Use when a flow needs a credential, when a handler reports a missing API key, or when deciding who pays a paid vendor. Most model calls are not covered: generation, embedding and transcription always run on the platform's key; reranking (`cohere`) and `text.decide` (`typesafe`) are the exceptions and do read the vault.
license: MIT
---

# Store a credential

The vault holds anything a project needs and nobody should read back. The fact most people get wrong: **this does not apply to most model calls, and that is where most of the money is.** Generation, embedding and transcription always run on the platform's key at the platform's price — they do not read this vault and cannot be made to. The handlers that fetch from an external web vendor resolve a credential this way, and so do two model handlers with a single fixed vendor: `text.rerank` (purpose `cohere`) and `text.decide` (purpose `typesafe`).

## Before the first call

- Fetch the judgment: `references/packs/secrets.md`, or live at `GET /v1/capability-packs/secrets`.
- Confirm which vendor a handler wants from `GET /v1/handlers/{key}` — the entry names the credential type and purpose it resolves — before storing anything on that vendor's account.
- Read `GET /v1/secrets/catalog` before composing a value. It returns each supported type with its field keys and says which fields are secret; the value is a flat object of those keys — `{ "apiKey": "…" }` for `api_key` — and a deployment can support types this file has never heard of. A value that does not fit is a 422 naming every failing key, each also in `details.issues` with its `path` under `value`. A type's `purposePlaceholder` (`firecrawl` on `api_key`) is an example for a form, not a list of vendors the platform reads your key for — model calls never use a stored key.

## How a credential is chosen

The key is looked for in three places, in order: **your node's vault**, then the **nearest ancestor node**, then the **platform's own key**. Whichever answers first is the one that gets spent. On the first two the vendor bills you directly and the platform does not also pass its own vendor charge through; on the third you are spending the platform's key at the platform's price.

Bringing your own key removes the vendor pass-through, **not the cost of the run**. The compute fee is charged either way — one charge per handler invocation, metered in whole seconds of its runtime — so a ten-step flow bills ten of them.

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

A secret is identified by the node it hangs on, its **type**, and a **purpose** you choose. When a handler says the key is missing, the failure names the vendor it wanted: store a credential whose purpose is that vendor's name, on the node the flow runs under or any ancestor of it, then run again. There is nothing to redeploy and no flow edit to make.

## What will bite you

- **A second store with the same node, type and purpose is an UPSERT, not a refusal.** It replaces the stored value in place and answers 201, exactly as a rotation would — and since nothing reads a value back, the value you overwrote is gone. List the node first if you are not certain what is already there. A re-save leaves `status` alone, so a record you disabled stays disabled.
- **Addressed by node, not by project.** Every neighbouring design resource scopes by project; a secret attaches to any node — an organisation or a project, whose id is its node id — and resolves up the ancestor chain, so an organisation-wide default with a per-project override is the normal arrangement.
- **Disable is not off. It means "use the one above."** A disabled record is skipped, so disabling a project's override hands the vendor call to the organisation's default and the run keeps succeeding on a different key.
- **Disabling every record up the chain does not stop the vendor being called.** It only stops _your_ key being spent: the handler falls through to the platform's own key, the run succeeds, and you are charged the platform's price. Removing the vendor from the flow is the only way to stop the call.
- **Nothing reads a value back.** Creating and rotating return metadata only, and there is no read path at all. Keep your own copy of whatever you store. `publicMeta` — an OAuth client id, say — is the clear part and does come back, which is why even listing needs a real grant on the node.
- **A suspended branch resolves nothing of yours.** The call then takes the platform's key, the run keeps succeeding, and it is billed at the platform's price. You see a missing-key failure only when the platform holds no key for that vendor either. Check the branch before hunting for a deleted secret, and check the charge before assuming nothing happened.
- **It fails closed.** A credential that cannot be decrypted yields nothing; it never falls back to a different node's key and never returns a value that is merely plausible.
- **Every write is ADMIN, stricter than the design-mutation floor elsewhere**, because whose key pays a vendor is a billing decision. Listing needs VIEWER on the node. No call tells you what your own key holds, so do not plan around a permission check: attempt the write and read the refusal. A 403 means the grant is below admin or does not reach that node.
- **A store you were not allowed to make is never silent** — it answers 403. So a 201 means the credential really is stored, and a handler still reporting a missing key afterwards is a _resolution_ problem, not a storage one: the branch is suspended, the record is disabled, or the `purpose` does not match the vendor the handler asked for.
- **The list is one node's own rows; coverage is a separate read.** `GET /v1/secrets` shows only what is attached to that node. `GET /v1/secrets/resolution?node=…` (VIEWER) answers what a call there would actually use: a `state` per credential (`present`, `disabled`, `not-found`, `branch-inactive`), the node that holds it, and who pays — including the suspended-branch gate a per-ancestor list cannot show. A holder above your grant's reach still reports its `state`, with the holder's id and name null. `billedBy` is `vendor-to-holder` when your credential resolves (the vendor invoices its holder, the platform charges compute only), `kipory` when none does (the call runs on the platform's key at its price), and `null` on a key that is never billed — a sign-in credential, any `fallback` other than `platform-key`. `ownStatus` is the status of the row stored on the node itself, whichever row resolves, and `null` when the node stores none: `disabled` there beside a `present` held above means your switched-off key is being stood in for. `fallback` is what happens with nothing of yours: `platform-key` (the call still succeeds, billed by the platform — every vendor key today), `fails-closed` (refused — sign-in credentials), `platform-only` (never a tenant's key), `not-looked-up` (nothing reads that name). A purpose absent from this read is never used, however it was stored.

## References

| File                          | What it answers                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `references/packs/secrets.md` | the judgment: which tier's key pays, why disable defers upward, why nothing reads back |
| `references/api/secrets.md`   | every route's fields, the catalog shape                                                |

## Then

`kipory-build` — the flow whose handler needed the credential. `kipory-diagnose` — the run's steps and the flow's trace, to see what the handler emitted once the key was in place; there is no success flag on a trace, and tracing is sampled, so absence of evidence is not evidence the call failed. `kipory-operate` for what the run then cost.
