<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Project provisioning

> **Source of truth for facts:** endpoint path & request shape → live `GET /v1/openapi.json`.
> What one create call seeds is described below; read the project back to see it. This pack
> carries judgment.

## What it is

Turn zero. Every other pack begins one step after a project exists; this one is about bringing it
into being.

**`POST /v1/projects` is not a design-plane resource.** It is a coded system route, which is why
it looks unlike every other resource here: there is no `project` scope parameter, because this is
the call that brings the scope into existence.

## When you need it

At step 1 of the planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`), and nowhere else. If the project
already exists, all you need is its id — the `id` its create answered, which an API key reads back
from `GET /v1/grant` — and you can move on.

## The sequence

```
POST /v1/projects   { name, slug, parentNodeId? } → 201 { id, slug, name }
```

Alongside: read, update and retire a project by that `id` — and ask what a retire would destroy
before committing to it (`DELETE /v1/projects/{nodeId}?validateOnly=true`).

## One id, everywhere

A project has **one id on the wire**: the `id` the create answers. It is the project's node in the
ownership tree, and every route takes it — as `{nodeId}` in a `/v1/projects/…` path, as `?project=`
on a list, as `project` in a create body. There is no second id to resolve.

<!-- key-unreachable-ok: GET /v1/projects — named here ONLY to warn it is refused, never prescribed -->
<!-- key-unreachable-ok: GET /v1/me/projects — named ONLY as a signed-in person's read, never prescribed to a key -->

⚠️ **Do not reach for the project list to find an id.** `GET /v1/projects` enumerates every project
on the installation, so it is floored at platform staff and refuses an API key categorically —
whatever node that key is granted at. A signed-in person's own projects, with their ids, are
`GET /v1/me/projects` — a per-person read no key can call.

**A key reads its own project with `GET /v1/grant`.** It takes no id and answers the node the key
was granted at, its role, and every project it reaches: the project's id is the `id` of `node` when
that node's `kind` is `project`, and otherwise one of `projects`. Each project there carries its id,
slug, name and `baseUrl`.

An id the design plane cannot resolve — a typo, or a project your grant does not reach — answers
**403**, deliberately the same as an insufficient role, so the surface is never an existence oracle.

## What one call actually does

The create is **atomic** — there is no such thing as a half-made project. In one transaction it
creates the project's **node** under the parent organisation and then the project itself, already
attached to it: the node comes first because the link column cannot be null, and there is no
later write that joins them. The subdomain starts equal to the slug, so the project is addressable
immediately.

**The address as a URL is `baseUrl`**, on `GET /v1/projects/{nodeId}` and on each project in
`GET /v1/grant`. The create answer does not carry it — read the project once after creating it.
Never build the URL from the `subdomain` label or the project slug: both are labels, and the host they sit under is
the deployment's. `baseUrl` is `null` on a deployment that publishes no public host.

**With a template, the same transaction also applies it.** `POST /v1/projects` takes an optional
`template` — a slug from `GET /v1/templates` — and the template's configuration is written before
the commit, so "atomic" covers it too: a template the platform refuses leaves no project, no node,
and the address free. A new account's first project — created by a signed-in person, on a route an
API key cannot call <!-- key-unreachable-ok: POST /v1/me/projects --> — is seeded the same way,
from whatever that person chose: a template, their own document, or nothing. A seed the platform
refuses refuses the whole registration rather than seating someone in a half-built project. Both
answers carry `requires` when a template was applied — the secrets its project needs and could not
carry. Without `template` or `document`, a project starts empty. See
Project templates (capability pack `templates` — `GET /v1/capability-packs/templates`) and the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`).

⚠️ **Nothing seeds your builtin shapes, and nothing needs to.** The builtin and library tiers are
virtual — synthesized from the platform's own catalog on read, with no rows in your project — so do
not read a fresh project's empty type list as a provisioning failure.

**One part is deliberately not atomic.** After the commit, and best-effort, the flow-provider
shapes are seeded. A failure there is logged and swallowed, because the project is committed and
usable without them and they re-materialise on first use.

⚠️ **So a 201 is not proof those types exist.** If you are about to reference one, read it back
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
project all come back unavailable, with `reason` in words you can show someone. When it is
unavailable, `suggestion` carries a free alternative that has **already been checked**, so it is a
real candidate rather than a guess at `<name>-2` — a reserved name included: `app` comes back with
`app-2`.

Two limits worth knowing. The suggestion is **advisory**: it was true when computed and someone
else can claim it a moment later, so the create's own conflict response stays the authority. And it
is `null` when no numbered alternative in range is free, when the name contains one of the platform's
own brand names (no numbered form of it is allowed), or when the candidate is too malformed to
derive one from.

Omit `project` when you are creating. Pass it (the project's id) when you are renaming an existing
project, which also makes the project's own current address come back available — you may always
keep the name you already have.

**The slug is the project's first public address**, since it is also the initial subdomain — the
first label of the host in `baseUrl`. That makes it worth one deliberate question during planning
rather than a generated default. Renaming later is a separate operation on the subdomain, not a
slug edit.

## Renaming the address

```
PUT /v1/projects/{nodeId}/address   { "subdomain": "orchard" }
    → 200 { subdomain, previousSubdomain }
```

This moves the **subdomain** and never touches the slug. The slug is immutable identity — external
store keys and the teardown confirmation read it — so after a rename a project's slug and its
address simply differ, which is the normal state of any project that has ever been renamed. Read
`baseUrl` again after a rename: it follows the subdomain, and so does every endpoint's `invokeUrl`.

Node-addressed, unlike the availability check beside it, and **ADMIN** on that node: the address is
the tenant's public one, so this is a structural change rather than an editorial one.

Two answers to read carefully.

`previousSubdomain` is **null when nothing moved**. Sending the address the project already holds
succeeds and is deliberately a no-op — you may always keep the name you have, and doing so does not
put that name into the cooldown described below. So tell callers the old address is going away
only when `previousSubdomain` is not null.

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
be `owner`, _and_ the node it was granted at must reach the parent. So a key scoped to one project
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

- **`GET /v1/projects` is not how you find your projects.** It is platform-staff-only and refuses
  every API key. Keep the create's `id`; a key reads the projects it reaches from `GET /v1/grant`.
- **The create answer has no URL.** `baseUrl` is on `GET /v1/projects/{nodeId}` and on
  `GET /v1/grant`; a host assembled from the slug is right only until the first rename, and wrong
  from the start on a deployment whose host you guessed.
- **Flow-provider seeding is best-effort**, so a 201 does not prove it ran.
- **Deletion is not the inverse of creation.** `DELETE /v1/projects/{nodeId}` retires the project
  and a daily sweep destroys it after `purgeAfter`, unless it is restored first. Ask with
  `?validateOnly=true` before — the same route, writing nothing, answering what a purge would
  destroy, the grace period a retire would start, and (for a project already retired) the
  `purgeAfter` deadline a second retire keeps rather than resets — so the blast radius is something
  you read before rather than discover after.

## Related

- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — step 1.
- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — what the builtin shapes
  are, and what to add next.
