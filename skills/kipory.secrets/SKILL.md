---
name: kipory.secrets
description: Store credentials a Kipory project needs — your own vendor API keys, OAuth clients, signing keys — in the node-scoped vault, so a handler spends your key instead of the platform's and the vendor bills you directly. Use when a flow needs a credential, when a handler reports a missing API key, or when deciding who pays a paid vendor.
---

# Store a credential

The vault holds anything a project needs and nobody should read back. Fetch the judgment first:

```
GET /v1/capability-packs/secrets
```

## The one thing worth knowing before you start

A handler that calls a paid vendor looks for its key in three places, in order: **your node's
vault**, then the **nearest ancestor node**, then the **platform's own key**. Whichever answers
first is the one that gets spent.

That choice is a billing decision. On the first two, the vendor bills you directly and the platform
does not also pass its own vendor charge through for a call you already paid for. On the third, you
are spending the platform's key at the platform's price.

⚠️ **It removes the vendor pass-through, not the cost of the run.** The flat per-run compute fee is
charged either way, so bringing your own key changes who the vendor invoices — it does not make the
run free. Check `GET /v1/credits/events` rather than assuming a saving.

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

A secret is identified by the node it hangs on, its **type**, and a **purpose** you choose. Storing
a second one with the same three on the same node is refused rather than merged — rotate instead.

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
  keeps succeeding on a different key. To stop a vendor being called with any credential, no
  ancestor may hold an active one either.
- ⚠️ **Nothing reads a value back.** Creating and rotating both return metadata only, and there is
  no read path at all. Keep your own copy of whatever you store — the platform cannot tell you
  later what it holds.
- **A suspended branch resolves nothing.** If the node or any ancestor is not active, no credential
  is admitted, and the handler reports a missing key rather than a suspension. Check the branch
  before hunting for a deleted secret.
- **It fails closed.** A credential that cannot be decrypted yields nothing; it never falls back to
  a different node's key and never returns a value that is merely plausible.
- **`publicMeta` is the clear part** — an OAuth client id, say. It does come back, which is why
  even listing needs a real grant on the node.

## Permissions

Listing needs viewer on the node. Every write — store, rotate, enable, disable, delete — needs
admin. Check before you plan around it:

```
GET /v1/nodes/{id}/effective-role
```

A key granted below admin can read the vault's metadata and change nothing in it.

## When a handler says the key is missing

That failure names the vendor it wanted. Store a credential whose purpose is that vendor's name,
on the node the flow runs under or any ancestor of it, then run again — there is nothing to
redeploy and no flow edit to make. If it still reports missing, the branch is inactive or the
grant is below admin, in both of which cases the store silently never happened.

## Then

`kipory.build` — the flow whose handler needed the credential. `kipory.diagnose` — the run history
that shows whether the call actually succeeded once the key was in place.
