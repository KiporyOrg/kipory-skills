---
name: kipory.secrets
description: Store credentials a Kipory project needs — vendor API keys, OAuth clients, signing keys — in the node-scoped vault, so a web-fetching handler spends your key instead of the platform's and that vendor bills you directly. Model calls are not covered and always run on the platform's key. Use when a flow needs a credential, when a handler reports a missing API key, or when deciding who pays a paid vendor.
---

# Store a credential

The vault holds anything a project needs and nobody should read back. Fetch the judgment first:

```
GET /v1/capability-packs/secrets
```

## The one thing worth knowing before you start

⛔ **This does not apply to model calls, and that is where most of the money is.** Generation,
embedding, transcription and reranking always run on the platform's key at the platform's price —
they do not read this vault and cannot be made to. Storing an AI vendor's key here changes nothing
about who that vendor bills, however plausible the catalog's example values make it look. Only the
handlers that fetch from an external web vendor resolve a credential this way; confirm which vendor
a handler wants from `GET /v1/handlers` before storing anything on its account.

For those handlers, the key is looked for in three places, in order: **your node's vault**, then the
**nearest ancestor node**, then the **platform's own key**. Whichever answers first is the one that
gets spent.

That choice is a billing decision. On the first two, the vendor bills you directly and the platform
does not also pass its own vendor charge through for a call you already paid for. On the third, you
are spending the platform's key at the platform's price.

⚠️ **It removes the vendor pass-through, not the cost of the run.** The compute fee is charged
either way — one charge per handler invocation, metered in whole seconds of its runtime, so a
ten-step flow bills ten of them. Bringing your own key changes who the vendor invoices; it does not
make the run free.

So a project that has its own vendor account should put the key here, and one that does not can
often run without touching this surface at all.

## The calls

```
GET    /v1/secrets/catalog          the supported types and their fields
GET    /v1/secrets                  one node's own credentials — metadata only
POST   /v1/secrets                  store one: node + type + purpose + value
PUT    /v1/secrets/{id}             rotate the value in place
POST   /v1/secrets/{id}/disable     stop using it
POST   /v1/secrets/{id}/enable      use it again
DELETE /v1/secrets/{id}             remove it
```

A secret is identified by the node it hangs on, its **type**, and a **purpose** you choose.

⛔ **Storing a second one with those same three is an UPSERT, not a refusal.** It replaces the
stored value in place and answers `201`, exactly as a rotation would — and since nothing reads a
value back, the value you overwrote is gone. Treat a repeat `POST` as destructive: list the node
first if you are not certain what is already there. (A re-save leaves `status` alone, so a record
you disabled stays disabled.)

**Read the catalog before composing a value.** It returns each type with its field keys, and each
field says whether it is secret. Send the value as a flat object of those keys. Deployments can
support types this file has never heard of, so do not assume a shape.

## Addressed by node, not by project

This is the surprise, because every neighbouring design resource scopes by project. A secret does
not: it attaches to any node and resolves up the ancestor chain, so an organisation-wide default
with a per-project override is the normal arrangement.

If you have a project id and not a node id, resolve that first — the same node id the design plane
already wants.

## Rules that bite

- ⚠️ **Disable is not off. It means "use the one above."** A disabled record is skipped, so
  disabling a project's override hands the vendor call to the organisation's default and the run
  keeps succeeding on a different key.
- ⛔ **And disabling every record up the chain does not stop the vendor being called.** It only
  stops _your_ key being spent: the handler then falls through to the platform's own key, the run
  succeeds, and you are charged the platform's price instead. Removing the vendor from the flow is
  the only way to stop the call.
- ⚠️ **Nothing reads a value back.** Creating and rotating both return metadata only, and there is
  no read path at all. Keep your own copy of whatever you store — the platform cannot tell you
  later what it holds.
- **A suspended branch resolves nothing of yours** — and the call then takes the platform's key, so
  the run keeps succeeding and is billed at the platform's price. You see a missing-key failure only
  when the platform holds no key for that vendor either. Check the branch before hunting for a
  deleted secret, and check the charge before assuming nothing happened.
- **It fails closed.** A credential that cannot be decrypted yields nothing; it never falls back to
  a different node's key and never returns a value that is merely plausible.
- **`publicMeta` is the clear part** — an OAuth client id, say. It does come back, which is why
  even listing needs a real grant on the node.

## Permissions

Listing needs viewer on the node. Every write — store, rotate, enable, disable, delete — needs
**admin**, which is stricter than the design-mutation floor elsewhere, because whose key pays a
vendor is a billing decision.

⚠️ **There is no call that tells you what your own key holds.** Nothing echoes a grant back to its
bearer, so do not plan around a permission check: attempt the write and read the refusal. A `403`
means the grant is below admin or does not reach that node. A key granted below admin can read the
vault's metadata and change nothing in it.

## When a handler says the key is missing

That failure names the vendor it wanted. Store a credential whose purpose is that vendor's name,
on the node the flow runs under or any ancestor of it, then run again — there is nothing to
redeploy and no flow edit to make.

⚠️ **A store you were not allowed to make is never silent** — it answers `403`. So a `201` means
the credential really is stored, and a handler still reporting a missing key afterwards is a
_resolution_ problem, not a storage one: the branch is suspended, the record is disabled, or the
`purpose` does not match the vendor the handler asked for.

## Then

`kipory.build` — the flow whose handler needed the credential. `kipory.diagnose` — the flow's
**trace**, to see what the handler emitted once the key was in place. ⚠️ There is no success flag on
a trace, and tracing is sampled, so absence of evidence is not evidence the call failed.
