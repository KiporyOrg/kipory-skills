<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 116a24886bfa · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Embedding profiles

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> a version's derived geometry → the profile read itself. This pack carries judgment.

## What it is

Where a project's RECORD vector space is defined. A profile names a dense embedding model and an
ordered set of named vector slots — and it may also declare a **sparse** slot, which is worth
deciding deliberately: declaring one makes every record carry sparse vectors whether or not anything
searches them, and only a hybrid search step ever reads them. The **geometry** — how many dimensions, and which distance
metric — is **derived** from the model and returned read-only.

**You pick a model. You never pick a dimension count, and you never pick a distance metric.**

That inversion is the whole design. The metric is a property of the model it was trained for, and
choosing the wrong one does not raise an error — it quietly degrades every search you will ever
run. A dimension mismatch at least fails loudly; two models of the same dimension and different
training produce meaningless similarity scores with nothing anywhere reporting a problem.

## When you need it — and when you don't

- **Anything searchable needs a profile first**, then a record type's searchable declaration
  referencing it. Most projects want exactly one and never think about it again.
- **A second profile is an advanced choice with a permanent consequence.** Two record types on
  different profiles live in different physical collections by construction, so **no single query
  can search both.** Reach for one only when a type genuinely needs a different model, and know
  that you are partitioning your own search.
- **Not for changing an existing space.** The model and the slot set are not editable — see below.

Embedding is the model binding that works this way, because it is the one baked into every vector
you have already written: every other kind of model choice is stateless, so swapping it just changes
the next call.

⚠️ **A project has a SECOND vector space, and no profile defines it.** Facet-term vectors live in a
single system-wide space with one shared model, deliberately, so that terms stay comparable across
every project — a per-project model there would write incomparable vectors. It has its own
collection, no profile names it, and **activating a profile version does not reindex it**. So the
whole of facets (capability pack `facets` — `GET /v1/capability-packs/facets`) — semantic resolution, seeded vocabularies, term matching — operates
outside everything on this page.

## The sequence

```
POST /v1/embedding-profiles              create — model + slots; geometry is derived
POST /v1/embedding-profiles/{id}/versions  mint the next version (free, inert)
POST /v1/embedding-profiles/{id}/activate  repoint declarations and reindex (expensive)
```

Reading a profile — one, or the project's list with the default first — gives you the derived
geometry and how many record types use it. Ask for the collections expansion to see the physical
collections your declarations actually imply.

Updating a profile in place is limited to its label and whether it is the default. Everything that
defines the vector space moves through a version instead.

**Geometry is resolved before the row is written**, so a model with no recorded dimensions or no
recorded distance is refused rather than stored half-usable.

## Why the version bump is two calls

Because the two halves cost completely different things, and collapsing them would hide that.

- **Minting is free and inert.** It creates the next version of the same name, taking the current
  version's values for anything you do not override. No declaration points at it, so no collection
  is provisioned and nothing is reindexed. It is refused if nothing about the vector space would
  actually change.
- **Activating is the expensive half.** It repoints every searchable declaration on that name onto
  the version, moves the default, and enqueues the reindex. The new collections start **empty**, so
  searches return less while it drains. ⚠️ It also **rewrites the stored collection name inside your
  saved vector steps** and reports which ones in `repointedSteps` — a step left behind would keep
  querying the superseded collection and return stale results rather than an error, so this is a
  silent mutation of your flows that you want to read back.

Do not collapse them to save a round trip. The split is what makes the costly half a deliberate
act.

Activation is idempotent — activating what everything already points at is a no-op, not a
conflict. It is refused when a declaration would be invalid under the target, most often because
the target dropped a slot that a declaration fills. ⚠️ And it takes an optimistic lock over **every**
record-type descriptor it moves, all-or-nothing: a concurrent record-type edit anywhere in the set
fails the whole activation with a version conflict. Re-read and retry rather than assuming a partial
move landed.

**Activation is also the rollback.** It is direction-agnostic and never drops the collections it
moves away from, so activating the superseded version restores the previous state instantly and
losslessly. That is what makes the reindex window acceptable: it is recoverable, even though it is
not invisible.

## What the platform refuses

- **Deleting a profile still named by a searchable record type**, and again while the version
  still owns provisioned collections.
- **A model with no recorded distance metric.** Defaulting to a common one is tempting and wrong,
  for the reason at the top of this pack.
- **A version bump that changes nothing** about the vector space.

## What will bite you

- **Version numbers are never reused.** They are allocated above every version the name has ever
  had, including ones whose profile row is gone but whose collections were provisioned. A reused
  number would resolve to a physical collection that already holds points at a geometry nothing
  re-checked.
- **The active version is derived, not stored.** It is whichever version the declarations point
  at — not the newest, and not the one marked default. A name whose record types are all
  non-searchable has _no_ active version, which is honest: nothing is serving.
- **The name is immutable and appears in the physical collection name.** Renames go through the
  label instead. Renaming the name itself would rename every collection derived from it.
- **The slot set belongs to the profile, not to the record types using it.** Adding a slot forces
  a reindex across the group either way; putting it here makes that cost an explicit version bump
  rather than a side effect of adding one record type.
- **A null geometry is a real state, not an error.** It means the profile's model no longer
  resolves, or resolves without the facts geometry needs. The read reports it rather than failing,
  so you can see and fix it — but a profile in that state is not going to serve a search.

## Related

- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — the searchable declaration
  that names a profile.
