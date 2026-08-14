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
first. The builtin shapes are already seeded and the seed call is idempotent.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is
written (`RECORD_TYPE_PINNED_BY_RECORDS`). This is the one decision in the whole model step that
cannot be revised later without deleting data — make it deliberately, not by accepting a default.

**4. Relation kinds, then the record-type field that feeds them.** Creating a kind seeds its
pairings atomically, so a kind is never born without one. ⚠️ **Then patch the record type to declare
which field feeds the kind — the step people forget.** Skip it and every call still succeeds while
nothing is ever produced: no error, no edges, nothing to debug.

**5. Facets last, because a facet needs a flow.** The sequence is create the facet → build its
resolver flow → patch the facet to bind `resolverFlowId` → then author the ingest flow that resolves
it. Two of those four steps are `kipory.build`, which is why modelling and building are not cleanly
sequential: **plan to come back here after the flows exist.**

## What will bite you

- **Edges are read by walking from a record, never by finding them on one.**
  `GET /v1/records/{id}/relations/{kind}` gives you one hop. No record read or list carries edges,
  and no filter selects records by edge — so "this record and its neighbours" is two calls, and
  there is no multi-hop. Design the read path around that before committing to a graph-shaped
  feature, not after.
- ⚠️ **An empty traversal is not proof of no edges.** A kind the project does not have, and a kind
  marked unexposed, both answer 200 with an empty list — deliberately, so nobody can enumerate a
  project's hidden vocabulary. Check the kind exists and is exposed before you go looking for a
  missing write.
- **On a facet patch, an omitted field preserves and an explicit null clears.** "Leave it alone" and
  "remove it" look nearly identical in a payload and mean opposite things.
- **A pairing has no update.** Re-target by deleting and recreating. The relation-kind key is
  immutable too.
- **A schema edit cascades.** Read the record-types pack on what an entry change reaches before
  editing one that types already reference.
- **A 2xx is not a promise it will run.** Saves return success with an `outstandingIssues` array
  even while wiring is unresolved; only a resource's _blocking_ problems refuse the write. Read
  `outstandingIssues` on every save in this step — it is where the unbound facet resolver and the
  undeclared relation field show up.

## Then

`kipory.build` for the flows this step referenced — including any facet resolver you left unbound.
