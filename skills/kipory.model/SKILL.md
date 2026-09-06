---
name: kipory.model
description: Define a Kipory project's data — record types and their shapes, facets for classification, typed relations between records, and the embedding profile that makes them searchable. Use when deciding what things exist in a project and how they connect, before building the flows that process them.
---

# Model a Kipory project's data

Four capabilities, four packs. What is **not** in any of them is the order they go in, because each
pack answers for one capability and this step is where they interleave.

| Fetch                                                      | For                                            |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `GET /v1/capability-packs/record-types-and-schema-entries` | shapes and the types that use them             |
| `GET /v1/capability-packs/facets`                          | classification against a resolvable vocabulary |
| `GET /v1/capability-packs/relations`                       | typed record-to-record edges                   |
| `GET /v1/capability-packs/embedding-profiles`              | the project's vector space                     |

## The order, and why it is not arbitrary

**1. Embedding profile first, if anything will be searchable.** A record type declares itself
searchable against a profile, so the profile has to exist to be named. Creating one is cheap;
_activating_ one reindexes and is not.

**2. Schema entries, then record types.** A type references its shape, so the shape is authored
first. ⚠️ The builtin and library shapes are **synthesized on read** — they have no rows and nothing
seeds them, so do not go looking for a call that creates them. The seed call materializes the
Flow-Provider infrastructure rows, and it is idempotent.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is
written (`RECORD_TYPE_PINNED_BY_RECORDS`) — and so do the type's **name** and its **data-shape
reference**. All three refuse to change once rows exist, so decide them deliberately rather than by
accepting a default; none can be revised afterwards without deleting the rows.

**4. Relation kinds, and the field that feeds them.** Creating a kind seeds its pairings atomically,
so a kind is never born without one. ⭐ **Send `declaration` in the create** and the producing field
is spliced into the record type in the same transaction — one arm of it will even write the field
for you. Omit it and the kind is legal but produces nothing. That state is not undebuggable, though:
re-read the kind asking for readiness and it reports **`inert`** — wired to nothing.

**5. Facets, and most of the time they need no flow at all.** A facet whose `matching` is `exact`
needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to a
platform default resolver at creation and works as authored — pass an explicit `null` only if you
mean to opt out. So facets go last only when you are writing your own resolver: create the facet
with `resolverFlowId: null` → build the flow (`kipory.build`) → patch it on → author the ingest flow
that resolves it. **Plan to come back here after the flows exist** only in that case.

## What will bite you

- ⛔ **There is no multi-hop, and that absence is the contract** — not a depth parameter left at 1.
  `GET /v1/records/{id}/relations/{kind}` walks one hop, one kind. Design the read path around that
  before committing to a graph-shaped feature, not after.
- **But edges are not as unreachable as that makes them sound.** Inside a flow, the entity read and
  list handlers can carry a record's edges per row and can select records by edge — both are step
  configuration you set when authoring, opt-in and off by default. Check the handler catalog for the
  exact field names rather than assuming this skill's vocabulary.
- ⚠️ **An empty traversal is not proof of no edges.** A kind the project does not have answers 200
  with an empty list rather than 404, because three read surfaces share one resolver and would
  otherwise disagree about what an unknown kind means. Check the kind exists before concluding a
  write went missing.
- **On a facet patch, an omitted field preserves — and an explicit null clears only some fields.**
  Null clears the proposal, the resolver binding and its params. ⚠️ On `matching` and on the mint
  policy a null is a **no-op, not a clear**, because those columns are never empty. And `version` is
  **required** on every facet patch: the call as most people first write it is refused without it.
- **A pairing has no update.** Re-target by deleting and recreating. The relation-kind key is
  immutable too.
- **A schema edit cascades.** Read the record-types pack on what an entry change reaches before
  editing one that types already reference.
- **A 2xx is not a promise it will run — and `outstandingIssues` is the wrong place to look for it
  in this step.** That array belongs to the flow plane; none of the saves here carry it. ⭐ Re-read
  the resource asking for **readiness** instead: `blocked` means it cannot work at all, and `inert`
  means it is wired to nothing. An unbound facet resolver reports `RESOLVER_UNBOUND` there, and a
  relation kind with no producing field reports `inert` — the two problems this step actually
  produces.

## Then

`kipory.build` for the flows this step referenced — including any facet resolver you left unbound.
