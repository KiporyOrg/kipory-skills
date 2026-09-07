<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 1e228431bd0e · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Facets

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`
> (design plane); the `facet.resolve` handler config → live `GET /v1/handlers`. This pack carries
> judgment, not the field lists.

## What it is

A named, resolvable dimension you hang off records — a claim type, a category, a role, a tag.

A facet does not hold a value. It declares **how a value is resolved** from a record's content,
and the resolved values land as terms linked to that record. One facet per project and key.

The difference matters: a field stores what someone wrote; a facet resolves what they meant
against a shared vocabulary, so two records that say the same thing differently end up pointing at
the same term.

## When you need it — and when you don't

- **Against a plain field on the shape.** Use a field when a caller or a single step just
  _writes_ the value. Use a facet when the value should be resolved against a shared vocabulary —
  deduplicated, reused across records, and able to nest. A field gives you a flat literal; a facet
  gives you a vocabulary with reuse.
- **Against a relation.** A facet classifies a record against a vocabulary of _terms_. A relation
  links a record to _another record_. If the thing on the other end is itself first-class — with
  its own fields and its own lifecycle — it is a relation (capability pack `relations` — `GET /v1/capability-packs/relations`), not a facet.

### Two questions, not one — decide both

A facet's admission is two settings — "may this grow?" and "how does it find what it already has?"

⛔ **They are independent only on the `semantic` arm.** Under `matching: "exact"` the resolve path
returns before the mint filter is ever consulted, so **`mint` is inert**: nothing is ever coined,
whatever you set. An `exact` facet configured `active` in the expectation of a growing vocabulary
gets one that can never grow — and if nothing was seeded it reads `blocked`, not `ready`.

**`mint` — what a value it has never seen may become.**

- **`active`** coins a live term you can match against immediately.
- **`none`** drops the value and reports it unresolved.
- **`candidate`** coins a term that stays attached to the record that proposed it and OUT of the
  vocabulary until you activate it. Nothing matches against a candidate; activating one is a
  status change on the term.

**`matching` — how a value it already has is found.**

- **`exact`** matches the slugified value and nothing else, in code.
- **`semantic`** dispatches to the facet's resolver flow — embed, search, gate — so `ML` can reach
  `machine-learning`. It needs a resolver bound.

Choose `none` when the value set is authoritative and finite, `active` when the vocabulary should
learn from what arrives, `candidate` when it should learn but not unsupervised. Getting `mint`
wrong is expensive in one direction only: `active` pointed at data it should not have been
learning from leaves you with a vocabulary someone has to clean up by hand.

⚠️ **`none` + `semantic` is the combination worth knowing about.** A fixed vocabulary that is still
searched by meaning: the model may say anything, the search finds the closest seeded term, and
anything it cannot find is dropped rather than coined. This was inexpressible while the two
settings were one field, and it is usually what people wanted when they reached for a closed
vocabulary and then found it would not recognise an obvious synonym.

## Finding a resolver to bind

`GET /v1/facets/resolvers?project=<nodeId>` lists every flow this project may bind as a facet's
resolver — **your own flows and the platform's, in one call** — filtered to those whose typed
signature actually matches the resolver contract. Each row carries the flow's id and its display
name, the slug it lives at, its scope (`PROJECT` or `SYSTEM`), its `paramsSchema` and its
`paramsDefaults`.

⭐ **The filter is the point.** A flow whose signature cannot serve is not offered, so a binding you
make from this list cannot fail at ingest for being the wrong shape. The offered set is exactly the
set the runtime can load.

⚠️ **`paramsSchema` is what a `resolutionParams` bag for that resolver must look like** — so a form
can be typed from the resolver rather than from whatever values are already stored. It is `null`
when the resolver declares no parameters.

⭐ **`paramsDefaults` is what the platform itself would put in that bag**, so a client can show real
numbers before anything is stored rather than an empty box. It answers the question the schema
cannot: a threshold is a plain number with no declared range and no declared default, so the shape
of the bag tells you nothing about the values the platform applies when it binds a resolver on your
behalf. It is `null` for a resolver the platform has no default for — bind that one and you must
supply the values yourself.

⛔ **It is not advice, it is the same bag the create path would have stored.** Omitting
`resolverFlowId` on a create lets the platform choose a resolver and stamp its own parameters in;
sending that resolver's id together with these values produces the identical row. The two are
derived from one predicate, so a client that prefills from here cannot show numbers the create path
would have disagreed with.

⚠️ **`scope: SYSTEM` means the platform owns it.** Bindable by you, editable by nobody outside the
platform. It reads at `VIEWER`, and it discloses a name and a parameter shape — never what a
platform flow does inside.

## The sequence

```
GET   /v1/facets/resolvers what this project may bind
POST  /v1/facets           create the facet (identity, binding, cardinality)
  … or build your own resolver flow …
PATCH /v1/facets/{id}      bind resolverFlowId (and mint, matching, params, proposal)
  … then author the ingest flow that resolves it …
```

⭐ **You can skip the binding entirely.** Omit `resolverFlowId` on create and a `semantic` facet is
bound to the platform's default resolver with its default parameters. Send an id to bind a specific
one; `resolutionParams` is **ignored unless you named a resolver explicitly**. Sending an explicit
`null` for `resolverFlowId` creates the facet UNBOUND, which fails at its first ingest.

⚠️ **Two things decide whether that default actually happens.** The create defaults are
`mint: active` and `matching: semantic`, and the auto-binding is keyed on **`matching`** — so a
facet you left at the defaults gets a resolver, and an `exact` one never does because it needs
none. And the platform binds a default only when a **compatible** resolver exists for that
parameter shape; where none does, an omitted `resolverFlowId` still leaves the facet unbound. Read
the facet back and check rather than assuming.

⭐ **Naming a resolver and omitting its parameters takes that resolver's own defaults** — the same
bag `GET /v1/facets/resolvers` reports as `paramsDefaults`, so what a form prefills is what the
create would have stored. An explicit `null` for `resolutionParams` still means none, and the two
are distinguishable on purpose: one is "you choose", the other is "I want it bare". A resolver
declaring a parameter shape the platform has no default for stores nothing either way, and you must
supply the values.

Scoped by the project's `OrgNode` id. Create takes the facet key (camelCase, and it is the
identity), a label, a `cardinality` of `one` or `many`, and optionally a parent facet key. The
`binding` is **`record`** — the whole record — and that is the only value you can create.

⚠️ A `sub-entity` binding, which labelled a part INSIDE a record, is retracted. It resolved
`{ subject, value }` pairings and then had nowhere to store the subject, so two subjects sharing a
term collapsed into one row. Existing facets still read; new ones are refused with
`FACET_BINDING_RETRACTED`. Model a part inside a record as its own record type with a relation.

**The label is editable; nothing else about a facet's shape is.** Renaming touches only the display
string — the key is the identity, so no term, no link and no stored resolution moves. There is no
merge: folding two facets into one would destroy an identity, and that is a different verb with
different costs.

Resolver wiring is folded in by a later update, where **an omitted field preserves** — the
distinction to hold when patching, because "leave it alone" and "remove it" look nearly identical in
a payload. ⚠️ An explicit null clears only `proposal`, `resolverFlowId` and `resolutionParams`; on
`mint` and `matching` a null is a **no-op, not a clear**, because neither column is ever empty. And
⛔ **an OMITTED `resolutionParams` does not survive a binding change** — repoint `resolverFlowId` at
a different resolver and the params are replaced with that resolver's defaults. Send them explicitly
if you meant to keep yours. `version` is required on every facet patch.

## How a value actually reaches a record

This is the part that is most often got wrong.

**`facet.resolve` writes nothing.** It computes resolutions and emits them. Under `semantic`
matching it tries the same exact slug lookup FIRST and dispatches only what did not match to the
resolver flow — so a value that slugs to an existing term never reaches the resolver at all, and
cost estimates counting "every value" are too high. Under `exact` it matches directly and stops.
Then `mint` decides what may happen to a value the search did not find — ⚠️ on the `semantic` arm
only, since the `exact` arm returns before the mint filter is consulted.

Its output must reach **exactly one persistence sink**, and a `term.upsert` node is the usual one:
it persists, and it backfills parent links inside the same transaction, so a child term can point at
a parent minted in the same batch. ⚠️ **A resolver SUBFLOW is the exception** — one invoked by
another flow legitimately hands persistence off to its caller by binding the bundle to an ordinary
flow output, and adding a `term.upsert` there is not required. (A legacy side-channel output is the
other sanctioned sink, and is being retired.)

**A resolve flow with no sink at all resolves nothing** — the values simply never land, because
resolving itself succeeded and nothing failed. It is not silent at save, though: it warns there like
the others.

### Three more ways it lands nowhere, and every one of them warns at save

**The node can only write from a flow a record type reaches.** `term.upsert` persists under a
committing run, and a run only commits when its flow was resolved FROM a record type — live ingest
and the playground's commit gesture both work that way, and nothing else does. A flow no record type
reaches, directly or through any depth of `flow.invoke`, runs its `term.upsert` and discards
everything, on every run. Saving one warns, because a resolver sub-flow legitimately exists before
the parent that invokes it.

**And a facet the record type does not LINK is written but never read.** Resolution succeeds, the
assignment row lands, and every read of that record omits the value — a read returns exactly the
facets its record type links. Saving warns; linking the facet afterwards surfaces every assignment
already written, so nothing is lost by saving first.

**And a facet that cannot coin, with nothing seeded, resolves nothing — quietly.** The trigger is
`mint: none` **OR** `matching: exact`, whichever the other setting says: either one means no new
term can be produced, so an empty vocabulary can never produce anything at all. An exact lookup
finds no row, a semantic search runs over an empty collection, and the facet is dropped from the
LLM's proposal schema entirely because there are no slugs to build its enum from. Saving warns.
⚠️ Note the `exact` + `active` case in particular: it looks configured to grow and cannot.

That last one is worth separating from its neighbour. A `semantic` facet with no resolver bound is
**refused**, because it throws at ingest and blocking the save turns an outage into a 422. An empty
vocabulary never fails at all: every ingest succeeds and the facet simply resolves nothing, which is
precisely why something has to say so out loud.

<!-- field-ok: facetFields — a `text.generate` HANDLER CONFIG key, not a wire field; it reaches the
     API inside the opaque `handlerConfig` blob, so no wire contract declares it by name. -->

**And one more, on the extraction side:** a `text.generate` node's `facetFields` is a SNAPSHOT of the
`$facet` markers on the type it answers with, taken when you last pressed Adopt — the runtime reads
the config, never the markers. Editing the type afterwards moves the source and leaves the snapshot
behind: a marker you added is never extracted, a marker you removed is still extracted into a field
the type no longer declares. The run succeeds either way. Saving warns, and Adopt re-derives.

All four are warnings rather than refusals for the same reason: each names a state that is ordinary
while a project is still being assembled, and each is fixed in a different surface than the flow
editor you are standing in.

## What the platform refuses

- **A `semantic` facet with no resolver bound blocks the flow save** with
  `FACETS_RESOLVE_SEMANTIC_FACET_UNBOUND_RESOLVER`. This is deliberately an authoring-time refusal
  rather than a runtime one. Hence the order above: resolver flow first, bind it, then author the
  flow that uses it.
- **Reserved keys are refused** with `FACET_KEY_INVALID` — the identity, content and metadata
  names the record shape already owns, along with `facets`, `terms`, `recordType` and the
  timestamps. Keys must be camelCase.
- **A `sub-entity` binding is refused** with `FACET_BINDING_RETRACTED` — see above.
- **A facet cannot nest under itself** (`FACET_PARENT_SELF`). The hierarchy is a chain of FACETS,
  not a tree of terms inside one: each level is its own facet with its own admission, resolver and
  record-type links, which is the whole reason it is a separate facet.
- **A stale `version` on update is refused**, and the field is REQUIRED — omitting it used to
  mean last-writer-wins, which is a documented way to lose somebody else's edit.
- **A parent term sent for a TOP-LEVEL facet is refused**, on both write paths — creating one term
  and bulk-seeding a batch. It used to be refused by the batch and silently DROPPED by the single
  create, which returned 201 while the term landed at the top level. If you sent a parent, you
  meant something by it.
- **An unknown key inside `proposal` is refused.** The bag is closed: guidance prose, a list of
  worked examples, and a flag permitting an empty answer — the exact shape the live schema
  declares, and nothing beside it. It used to accept any object, so a misspelled key persisted,
  returned 201, and left the facet behaving as though the setting had never been made. A typo is
  the only failure this field has, so it is now a 422 at the moment you write it. Reads are
  unaffected — a row stored before the rule still serializes.

## Is this facet actually doing anything?

Ask the facets read for its readiness and it answers in one of four states,
worst first.

**Blocked** means it cannot work. Either it needs a resolver flow and has none
bound, in which case resolving it fails the run, or it cannot mint and its
vocabulary is empty, in which case it can never produce a term. Both are
configuration you can fix.

**Inert** means it works and reaches nobody: no record type surfaces it, so its
values are stored and never returned by any read. The terms are real, the
labelling happened, and every response omits it.

**Unproven** means nothing has flowed through it — either ever, or not for a
long time. This is deliberately not an error. A facet authored an hour ago has
resolved nothing and is fine; the same facet a year on is a question, and the
state lets you tell which one you are looking at rather than deciding for you.

**Ready** means configured, surfaced, and resolving.

Every reason is reported, not only the one that set the state — a facet can be
both unbound and unsurfaced, and fixing only the one named leaves it broken in a
way you were already told about. Each reason carries a stable code to branch on
and a sentence to show a person.

Readiness is a different question from whether the substrate is internally
consistent. That check reads tables, indexes and constraints, and a project in
which every facet is inert passes all of it. A green consistency badge has never
meant the facets were doing their job, and now there is something that does.

Two timestamps back this. A facet records when a value for it was last written
to a record, and a term records when it was last chosen rather than minted.
Both start empty and fill from the first resolution after they began being
recorded, so an empty one means nothing was observed, never that nothing
happened. A preview run does not count — only values that actually landed.

## What will bite you

- **Deleting a facet cascades** — it unlinks the facet from every record type that used it, removes
  its whole vocabulary, and can strip labels off records. ⛔ Ask
  `GET /v1/facets/{id}/delete-preflight` FIRST: that is where the blast radius is named, before
  anything is written. The delete response carries only COUNTS, not the list of what was hit.
  ⚠️ A destructive delete is refused without `confirm=true`, and a facet with assigned terms also
  needs an `assignedTerms` disposition — a plain `DELETE` on a facet in use is a 409, not a delete.
- **`facet.resolve` runs inline, not queued.** It dispatches sub-flows bound to the live run:
  depth and cycle guards, the provider cache, the tenant scope, billing. That is precisely why it
  cannot be moved off into background processing, and why a slow resolver makes ingestion slow.
- **Terms are the vocabulary substrate; there is no separate taxonomy resource.** Facet
  statistics and samples are computed over terms.
- **A facet that looks builtin is just a row.** Anything shipped as a default is an ordinary,
  editable facet — but its resolver wiring may never have been bound. Verify a facet's live
  binding before assuming it resolves anything.

## Related

- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — what a facet attaches to.
- Relations (capability pack `relations` — `GET /v1/capability-packs/relations`) — when the value is a record rather than a term.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — building the resolver, and the ingest flow that uses it.
