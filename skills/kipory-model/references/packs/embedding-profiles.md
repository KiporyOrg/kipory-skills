<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Embedding profiles

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> a generation's derived geometry → the profile read itself. This pack carries judgment.

## What it is

Where a project's RECORD vector space is defined. A profile names a dense embedding model and an
ordered set of named vector slots — and it may also declare a **sparse** slot, which is worth
deciding deliberately: declaring one makes every record carry sparse vectors whether or not anything
searches them, and only a hybrid search step ever reads them. The **geometry** — how many dimensions, and which distance
metric — is **derived** from the model and returned read-only.

A profile is also **the default way records enter the space**: `defaultChunking` (required on
create). Chunking has exactly two shapes: `{ "kind": "whole" }` is one point per record, and
`{ "kind": "chunks", "tokens": 400, "overlap": 50 }` splits each record's text into token-sized
pieces, each repeating `overlap` tokens of the one before (`overlap` must be below `tokens`). Any
other `kind` is refused. Every record type that marks a field `search` against this profile
inherits it unless its own `uses.search.chunking` overrides it — and omitting the override is the
common case.

**You pick a model. You never pick a dimension count, and you never pick a distance metric.**
The `modelId` is an embedding model's id from `GET /v1/ai-models?type=embedding`. Listed is not
the same as working: a provider whose account is out of quota refuses every embed. Before you
choose, read `GET /v1/ai-calls?project={nodeId}&origins=all&outcome=error` for recent
rows whose `errorCode` is `quota-exhausted`, by provider, and prefer a model on a provider
with none.

That inversion is the whole design. The metric is a property of the model it was trained for, and
choosing the wrong one does not raise an error — it quietly degrades every search you will ever
run. A dimension mismatch at least fails loudly; two models of the same dimension and different
training produce meaningless similarity scores with nothing anywhere reporting a problem.

## When you need it — and when you don't

- **Anything searchable needs a profile first**, then a record type naming it in `uses.search`
  and marking a text field `search`. Most projects want exactly one and never think about it again.
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
collection, no profile names it, and **activating a profile generation does not reindex it**. So the
whole of facets (capability pack `facets` — `GET /v1/capability-packs/facets`) — semantic resolution, seeded vocabularies, term matching — operates
outside everything on this page. Its model is the platform's `substrate-embedding` task, read at
the platform root: a project cannot move it. Binding that task anywhere below the root is refused
(422, `details.reason: "TASK_READ_AT_ROOT_ONLY"`); a project-node binding of `embedding` is
accepted, and moves record search, never terms.

⚠️ **An indexing failure does not surface on the profile, the type or the record.** When the
profile's model refuses (quota, outage), records stay `indexState: "never"` and the type's
`?expand=vectorProgress` keeps a non-zero `remaining`. The cause is only in the AI-call list:
`GET /v1/ai-calls?project={nodeId}&origins=projection&outcome=error` lists each failed embed with
its `errorCode` (`quota-exhausted`, …), and `GET /v1/ai-calls/{id}`
gives that call's `errorMessage`. A failed embed is retried three times within about fifteen seconds, then only by the daily re-index sweep (08:00 UTC). Moving to a
working model is a new generation plus activate.

## The sequence

```
POST  /v1/embedding-profiles               create — model + slots + defaultChunking; geometry is derived
PATCH  /v1/embedding-profiles/{id}             label, isDefault, defaultChunking — with `version`
POST   /v1/embedding-profiles/{id}/generations mint the next generation (free, inert)
POST   /v1/embedding-profiles/{id}/activate    repoint declarations and reindex (expensive) — `{ version }`
DELETE /v1/embedding-profiles/{id}             one generation; `?validateOnly=true` asks first
```

**Two numbers, and they are not the same thing.** `generation` is the geometry's number — the
`v{n}` in every collection name, allocated by the mint, never sent back. `version` is the row's
optimistic lock: send the value you read on the PATCH and on activate, and either is refused with
409 `VERSION_CONFLICT` if someone changed the profile since. A missing `version` is a 422, never a
last-writer-wins save.

An activation answers `touched`: every record type it re-pointed, each with the version it holds
now. Update the copies you hold, or the next PATCH to one of them is refused as stale.

Reading a profile — one, or the project's list with the default first — gives you the derived
geometry and how many record types use it. Ask for the collections expansion to see the physical
collections your declarations actually imply — each names the record types landing in it by key,
under `recordTypeKeys`.

Updating a profile in place covers its label, whether it is the default, and `defaultChunking`.
Everything that defines the vector space — the model, the slots — moves through a new generation instead.

⚠️ **Changing `defaultChunking` is not a geometry change, and it is not free either.** No generation
is minted; instead every record type on the profile that does NOT override the default is
re-derived on the spot, and each one whose derived declaration moved is re-embedded in
the background — with the credits that costs. A type that sets its own `uses.search.chunking` is
untouched. A new generation copies the default onto itself.

**Geometry is resolved before the row is written**, so a model with no recorded dimensions or no
recorded distance is refused rather than stored half-usable.

## Why a new generation is two calls

Because the two halves cost completely different things, and collapsing them would hide that.

- **Minting is free and inert.** It creates the next generation of the same key, taking the current
  generation's values for anything you do not override. It takes no lock: it writes a new row and
  leaves the one it starts from untouched. No declaration points at it, so no collection
  is provisioned and nothing is reindexed. It is refused if nothing about the vector space would
  actually change.
- **Activating is the expensive half.** It repoints every searchable declaration on that key onto
  the generation, moves the default, and enqueues the reindex. The new collections start **empty**, so
  searches return less while it drains. ⚠️ It also **rewrites the stored collection name inside your
  saved vector steps** and reports which ones in `repointedSteps` — a step left behind would keep
  querying the superseded collection and return stale results rather than an error, so this is a
  silent mutation of your flows that you want to read back.

Do not collapse them to save a round trip. The split is what makes the costly half a deliberate
act.

Activation is idempotent — activating what everything already points at is a no-op, not a
conflict. It is refused when a declaration would be invalid under the target, most often because
the target dropped a slot that a declaration fills. ⚠️ And it takes an optimistic lock over **every**
record-type descriptor it moves, all-or-nothing, beside the profile's own `version` you send: a
concurrent edit to the profile or to any record type in the set fails the whole activation with a
version conflict. Re-read and retry rather than assuming a partial
move landed.

**Activation is also the rollback.** It is direction-agnostic and never drops the collections it
moves away from, so activating the superseded generation restores the previous state instantly and
losslessly. That is what makes the reindex window acceptable: it is recoverable, even though it is
not invisible.

## What the platform refuses

- **Deleting a profile still named by a searchable record type**, and again while the generation
  still owns provisioned collections. You do not have to discover either by trying: every profile
  carries `deleteRefusal` — the delete's own code and sentence, or null — and the listing adds
  `canDelete`, which also folds in the ADMIN role the delete needs and whether the project is
  retired. A superseded generation nothing declares against is the case that catches people: its
  usage count is zero and it is still refused.
- **A model with no recorded distance metric.** Defaulting to a common one is tempting and wrong,
  for the reason at the top of this pack.
- **A new generation that changes nothing** about the vector space.

## Asking before you write — `validateOnly`

The create (`POST /v1/embedding-profiles`), the PATCH (`PATCH /v1/embedding-profiles/{id}`) and the
generation mint (`POST /v1/embedding-profiles/{id}/generations`) each take **`validateOnly: true`** in
the body, and the delete takes **`?validateOnly=true`** — its verdict is the delete's own refusal,
the one the listing publishes as `deleteRefusal`. It runs the same decisions the write runs, writes nothing, and answers **200** with the
verdict every design dry run answers. Each finding carries the body `field` it is about where there
is one — an overlap the chunker could not advance past is reported on `defaultChunking.overlap` —
and the rule's own code (`EMBEDDING_PROFILE_KEY_INVALID`, `EMBEDDING_PROFILE_CHUNKING_INVALID`, …),
the same token the save's refusal names.

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
facet's (which also carries `confirm` and `assignedTerms`); anything else in the query is refused.

- **The PATCH dry run plans every inheriting record type**, exactly as the save does. A default
  that one of them cannot take comes back as a finding naming the type, before anything commits.
- **A taken key is a finding on `key`, not a 409.** Its absence is a snapshot, not a reservation:
  a create that lands in between still takes the key, and the save then answers 409 itself.
- ⚠️ **An invalid draft is not a failed request.** A 4xx still means the platform could not look at
  the draft — a profile id that addresses nothing, or a role it will not serve.
- ⛔ **Gate on `severity`, never on `code`.** An unrecognised code is a generic finding of its stated
  severity.

## What will bite you

- ⚠️ **The PATCH dry run does not check your `version`.** The lock is checked by the save alone, so
  a verdict of `ok: true` can still meet a 409 when someone saved in between.
- **Generation numbers are never reused.** They are allocated above every generation the key has
  ever had, including ones whose profile row is gone but whose collections were provisioned. A reused
  number would resolve to a physical collection that already holds points at a geometry nothing
  re-checked.
- **The active generation is derived, not stored.** It is whichever generation the declarations
  point at — not the newest, and not the one marked default. A key whose record types are all
  non-searchable has _no_ active generation, which is honest: nothing is serving.
- **The key is immutable and appears in the physical collection name** — which is why it is
  lower-case kebab. Renames go through the label instead. Renaming the key itself would rename
  every collection derived from it.
- **The slot set belongs to the profile, not to the record types using it.** Adding a slot forces
  a reindex across the group either way; putting it here makes that cost an explicit new generation
  rather than a side effect of adding one record type.
- **A null geometry is a real state, not an error.** It means the profile's model no longer
  resolves, or resolves without the facts geometry needs. The read reports it rather than failing,
  so you can see and fix it — but a profile in that state is not going to serve a search.

## Related

- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — the `uses.search` settings
  that name a profile, and the per-type override of its defaults.
