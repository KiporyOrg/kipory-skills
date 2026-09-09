<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: a5020e2fbc4b · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Project provisioning

> **Source of truth for facts:** endpoint path & request shape → live `GET /v1/openapi.json`.
> What one create call seeds is described below; read the project back to see it. This pack
> carries judgment.

## What it is

Turn zero. Every other pack begins one step after a project exists; this one is about bringing it
into being, and about the single addressing fact that trips up almost every first session.

**`POST /v1/projects` is not a design-plane resource.** It is a coded system route, which is why
it looks unlike every other resource here: there is no `project` scope parameter, because this is
the call that brings the scope into existence.

## When you need it

At step 1 of the planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`), and nowhere else. If the project
already exists, all you need from this pack is the node id — see below — and you can move on.

## The sequence

```
POST /v1/projects                     { name, slug, parentNodeId? } → 201 { id, slug, name }
GET  /v1/projects/by-project-id/{id}  resolve the OrgNode id — the one the design API wants
```

Alongside: read, update and delete a project by its node id, and preview a deletion before
committing to it.

## The one thing to get right: the id you get back is not the id you need

The design plane is **node-speaking**. Every design resource scopes by the project's **`OrgNode`
id** — as the `project` field on a create, as `?project=` on a list.

**The create response returns the project id, which is not that.** Using it is the single most
likely first mistake after provisioning, and it does not fail in an obvious way: it fails as
though the project does not exist.

So the first call after creating a project is `GET /v1/projects/by-project-id/{projectId}`, which
hands back the node id. That route exists for exactly this moment — it is the one read that can be
authorised for a caller who does not know the node yet, because it floors on the project instead.

<!-- key-unreachable-ok: GET /v1/projects — named here ONLY to warn it is refused, never prescribed -->

⚠️ **Do not reach for the project list to resolve it.** `GET /v1/projects` enumerates every project
on the installation, so it is floored at platform staff and refuses an API key categorically —
whatever node that key is granted at. It is not a stricter version of the same read; it is a
different read, and it is not yours.

A project with no node at all is not a state that occurs: the link column is NOT NULL, so a project
is born attached to one. An id the design plane cannot resolve — a typo, or a project your grant
does not reach — answers **403**, deliberately the same as an insufficient role, so the surface is
never an existence oracle.

## What one call actually does

The create is **atomic** — there is no such thing as a half-made project. In one transaction it
creates the project's **node** under the parent organisation and then the project itself, already
attached to it: the node comes first because the link column cannot be null, and there is no
trailing step that joins them. The subdomain starts equal to the slug, so the project is addressable
immediately.

⚠️ **Nothing seeds your builtin shapes, and nothing needs to.** The builtin and library tiers are
virtual — synthesized from the platform's own catalog on read, with no rows in your project — so do
not read a fresh project's empty schema-entry list as a provisioning failure.

**One part is deliberately not atomic.** After the commit, and best-effort, the flow-provider
shapes are seeded. A failure there is logged and swallowed, because the project is committed and
usable without them and they re-materialise on first use.

⚠️ **So a 201 is not proof those entries exist.** If you are about to reference one, read it back
rather than assuming.

## Choosing a slug

Validated before anything is written: non-empty, at most 40 characters, matching the slug pattern,
and not reserved. A duplicate is a conflict; an invalid one is refused with a validation error.

The uniqueness constraint in storage is the real authority — the pre-check is a friendly
race-loser, so two simultaneous creates resolve correctly rather than both succeeding.

**Ask before you claim.** You do not have to discover a collision by attempting the create:

```
GET /v1/projects/address-availability?candidate=harvest
    → 200 { candidate, available, reason, suggestion }
```

`available` answers for the label as a whole — taken, reserved, or recently released by another
project all come back unavailable, with `reason` in words you can show someone. When it is taken
and the name is otherwise fine, `suggestion` carries a free alternative that has **already been
checked**, so it is a real candidate rather than a guess at `<name>-2`.

Two limits worth knowing. The suggestion is **advisory**: it was true when computed and someone
else can claim it a moment later, so the create's own conflict response stays the authority. And a
**reserved** name gets no suggestion at all — the platform will not offer you the address next door
to one it just refused.

Omit `projectId` when you are creating. Pass it when you are renaming an existing project, which
also makes the project's own current address come back available — you may always keep the name you
already have.

**The slug is the project's public address**, since it is also the initial subdomain. That makes
it worth one deliberate question during planning rather than a generated default. Renaming later
is a separate operation on the subdomain, not a slug edit.

## Renaming the address

```
PUT /v1/projects/{nodeId}/address   { "subdomain": "orchard" }
    → 200 { subdomain, previousSubdomain }
```

This moves the **subdomain** and never touches the slug. The slug is immutable identity — external
store keys and the teardown confirmation read it — so after a rename a project's slug and its
address simply differ, which is the normal state of any project that has ever been renamed.

Node-addressed, unlike the availability check beside it, and **ADMIN** on that node: the address is
the tenant's public one, so this is a structural change rather than an editorial one.

Two answers to read carefully.

`previousSubdomain` is **null when nothing moved**. Sending the address the project already holds
succeeds and is deliberately a no-op — you may always keep the name you have, and doing so does not
put that name into the cooldown described below. A screen that announces "your old address stops
working shortly" on every success says it after calls that freed nothing.

When the rename is real, the old address is **reserved for a few minutes** and keeps resolving for
at most that long while routing caches expire. Both halves matter: the cutover is quick but not
instantaneous everywhere, and nobody else can take the label you just released while that is true.

A refusal is one of two, and they call for different remedies. **409 `PROJECT_ADDRESS_TAKEN`** —
someone holds it, or released it recently enough that it is still reserved; a different label works.
**422** — the label is malformed or reserved; a different _kind_ of label is needed. Both carry the
same sentence the availability check would have shown, so ask first and you will rarely meet either.

## Auth

A bearer API key, any valid session, or a system token authenticates. **Authorization is per
node**: the caller must hold **ownership at the _parent_ organisation node**.

For a key that means both halves of its grant, and neither implies the other: the grant's role must
be `OWNER`, _and_ the node it was granted at must reach the parent. So a key scoped to one project
cannot create a sibling project — its reach descends, and the parent organisation is above it.

The parent defaults to the platform organisation; an organisation owner passes their own node id.
⚠️ A customer credential should always pass it explicitly — inheriting that default aims the create
at a node the grant does not reach, and the refusal reads like a broken key rather than a missing
field.
A parent that would violate the tree's rules — a project under a project, a project under the
system root — is refused as a validation error, and a suspended parent as a conflict. ⚠️ A parent id
that does not exist, or that your grant does not reach, is neither: it is a **403**, because the
ownership gate fires before any validation read precisely so a refusal discloses nothing about the
parent. So check the id, not your role, when a create refuses that way. The two are worth telling apart: one is a malformed request, the other is a
correct request at the wrong moment.

## What will bite you

- **The 201 hands you the wrong id for your next call.** Worth stating twice.
- **`GET /v1/projects` is not the way to fix that.** It is platform-staff-only and refuses every
  API key. Resolve through `GET /v1/projects/by-project-id/{projectId}` instead.
- **Flow-provider seeding is best-effort**, so a 201 does not prove it ran.
- **Deletion is not the inverse of creation.** Deleting runs an ordered teardown with real
  consequences. Use the deletion preview first — it exists so that the blast radius is something
  you read before rather than discover after.

## Related

- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — step 1.
- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — what the builtin shapes
  are, and what to add next.
