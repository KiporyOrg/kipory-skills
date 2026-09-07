---
name: kipory-model
description: Define a Kipory project's data — the record types and the reusable shapes they refer to, the facets that classify records against a vocabulary of terms, the typed relation kinds that link records, and the embedding profile that makes them searchable. Use when deciding what kinds of things exist in a project and how they connect, when adding a field, a facet or a link to an existing type, or when a search returns nothing because no vector space was ever activated. Not for the records themselves (that is data) and not for the flows that process them (that is build).
license: MIT
---

# Model a project's data

Five resources, five packs, and an order the packs do not state because each answers for one capability. The fact most people get wrong: **creating an embedding profile does nothing until you activate it**, and activation is the one expensive move here — it repoints every declaration and reindexes.

## Before the first call

- Fetch the judgment for the resource you are about to touch: `references/packs/record-types-and-schema-entries.md`, `facets.md`, `relations.md`, `embedding-profiles.md` (served live under `GET /v1/capability-packs/{id}`).
- Read `GET /v1/bootstrap?project={nodeId}&sections=schema,relations,vectors` first: everything modelled so far, in one call. Do not author what already exists.
- Every write here is EDITOR, except embedding-profile activation, minting a version, vector search and every delete, which are ADMIN.

## The order, and why it is not arbitrary

**1. Embedding profile first, if anything will be searchable.** A record type declares itself searchable against a profile, so the profile has to exist to be named.

```
POST /v1/embedding-profiles                    { project, … }   → inert: nothing references it yet
POST /v1/embedding-profiles/{id}/versions      mint the next geometry — still changes nothing
POST /v1/embedding-profiles/{id}/activate      repoint every declaration onto it and reindex
```

Activation is direction-agnostic — pointing at a superseded version is the rollback, and it is lossless because the collections it moves off are never dropped. Its response names `movedRecordTypes` and `repointedSteps`: saved search steps whose literal collection name was rewritten. An empty `movedRecordTypes` means it was already active; repeating is safe.

**2. Shapes, then record types.** A type references its shape, so the shape is authored first.

```
POST /v1/schema-entries                        a reusable typed shape
POST /v1/schema-entries/seed                   { project } — materialise the flow-provider entries, idempotent
POST /v1/record-types                          name, shape, owner scope, processing flow
GET  /v1/record-types/{id}/contract-preview    what a write to this type must look like
POST /v1/record-types/{id}/write-preview       try a payload against the type without storing it
PUT  /v1/record-types/{id}/natural-key         → { declared, stamped } — verifies every existing record first
```

The builtin and library shapes are **synthesized on read**: they have no rows and nothing creates them. There is no `?seed=` flag on the read; the seed is the POST.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is written, and so do the type's **name** and its **data-shape reference** (`RECORD_TYPE_PINNED_BY_RECORDS`). None can be revised afterwards without deleting the rows. A per-user type cannot be written by an API key at all — see `kipory-data`.

**4. Relation kinds, and the field that feeds them.**

```
POST /v1/relation-kinds                        send `declaration` and the producing field is spliced into the type in the same transaction
POST /v1/relation-kind-pairings                which (typeA, typeB) pairs the kind admits — seeded atomically with the kind
GET  /v1/relation-kinds/{id}?expand=readiness  blocked · inert · unproven · ready
```

Omit `declaration` and the kind is legal but produces nothing; readiness reports it `inert`. A pairing has no update — delete and recreate. The kind's key is immutable.

**5. Facets, and most of the time they need no flow at all.**

```
POST /v1/facets                                { matching: exact | semantic, resolverFlowId? }
POST /v1/facets/{id}/terms                     bulk-seed the vocabulary
PUT  /v1/record-types/{id}/facets              which facets a type carries
GET  /v1/facets/resolvers                      the resolver flows available
GET  /v1/facets/{id}/delete-preflight          what deleting would reach
GET  /v1/facets/{id}?expand=readiness
```

A facet whose `matching` is `exact` needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to a platform default at creation and works as authored; pass an explicit `null` only to opt out and bring your own resolver later (`kipory-build`, then patch it on). Single terms: `POST /v1/terms`, `PATCH /v1/terms/{id}`, `POST /v1/terms/{id}/merge`, `DELETE /v1/terms/{id}`.

## What will bite you

- ⛔ **There is no multi-hop, and that absence is the contract.** `GET /v1/records/{id}/relations/{kind}` walks one hop, one kind, and there is no depth parameter. Inside a flow the entity read and list handlers can carry a record's edges per row and select records by edge — opt-in step config; check the handler pages rather than assuming names.
- **An empty traversal is not proof of no edges.** A kind the project does not have answers 200 with an empty list, never 404. Check the kind exists before concluding a write went missing.
- **On a facet patch, `version` is required**, an omitted field preserves, and an explicit null clears only some fields: the proposal, the resolver binding and its params. On `matching` and the mint policy a null is a **no-op**, because those columns are never empty.
- **A schema edit cascades.** Read the record-types pack on what an entry change reaches before editing one that types already reference.
- **`expand=embedding` and `expand=vectorProgress` are refused on the record-types list.** They are per-row scans; ask them on `GET /v1/record-types/{id}`.
- **Readiness is the diagnostic here, not `outstandingIssues`.** That array belongs to skill writes; none of the saves in this skill carry it. Re-read the facet or kind with `expand=readiness`: `blocked` cannot work (`RESOLVER_UNBOUND` on an unbound semantic facet), `inert` is wired to nothing, `unproven` has never resolved — expected an hour after authoring, a question a year later.
- **An embedding profile's `version` is not a lock.** Its PATCH accepts only `label` and `isDefault`, and sending `version` is a 422. Changing the model or provider of the embedding step means embedding everything again and rebuilding the index.
- **A search step left behind after activation keeps querying the superseded collection** — stale results, not an error. Read `repointedSteps`.
- **Vector search is ADMIN and bills.** `POST /v1/vector-collections/{name}/search` embeds the query text on every call. The collections surface is otherwise read-only; `{name}` is the collection's name without its project prefix, and `storeState: absent` is a divergence to act on while `unreachable` is an outage — never fold them.
- **A 2xx is not a promise it will run** — see `kipory-connect`'s conventions. Runtime is stricter than authoring.

## References

| File                                                                                                                      | What it answers                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `references/packs/record-types-and-schema-entries.md`                                                                     | shapes versus types, reserved names, what an edit cascades into                        |
| `references/packs/facets.md`                                                                                              | classification, resolvers, the path from resolving to committing terms                 |
| `references/packs/relations.md`                                                                                           | kinds, pairings, the declaration on the type, the multi-hop that does not exist        |
| `references/packs/embedding-profiles.md`                                                                                  | the project's vector space                                                             |
| `references/classification-runtime.md`                                                                                    | the resolver flow's own handlers: the threshold gate's three outcomes, the browse tree |
| `references/api/record-types.md` · `schema-entries.md` · `facets-and-terms.md` · `relations.md` · `embedding-profiles.md` | every route's fields                                                                   |

## Then

`kipory-retrieve` once records are embedded and something has to search them. `kipory-evolve` before changing any of this on a project that already holds records. `kipory-build` for the flows this step referenced — the processing flow a record type binds, and any facet resolver you left unbound. `kipory-data` to see the records a type holds and the edges between them. `kipory-diagnose` if a search step returns nothing after a profile change.
