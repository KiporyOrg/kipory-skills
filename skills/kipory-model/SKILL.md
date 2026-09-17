---
name: kipory-model
description: Define a Kipory project's data — the record types and the reusable shapes they refer to, the facets that classify records against a vocabulary of terms, the typed relation kinds that link records, and the embedding profile that makes them searchable. Use when deciding what kinds of things exist in a project and how they connect, when adding a field, a facet or a link to an existing type, or when a search returns nothing because no vector space was ever activated. Not for the records themselves (that is data) and not for the flows that process them (that is build).
license: MIT
---

# Model a project's data

Five resources, five packs, and an order the packs do not state because each answers for one capability. Two facts most people get wrong: **a record type has ONE storage declaration, `uses`** — per field, what it is for (`filter`, `search`, `link`, `key`, `file`), plus the type-level `search` settings, `join` and `facets`; `searchable`, `queryable`, `relations`, the natural key and the facet links are derived from it and read-only, and it is sent whole. And **creating an embedding profile does nothing until you activate it** — activation is the one expensive move here; it repoints every declaration and reindexes.

## Before the first call

- Fetch the judgment for the resource you are about to touch: `references/packs/record-types-and-schema-entries.md`, `facets.md`, `relations.md`, `embedding-profiles.md` (served live under `GET /v1/capability-packs/{id}`).
- Read `GET /v1/bootstrap?project={nodeId}&sections=schema,relations,vectors` first: everything modelled so far, in one call. Do not author what already exists.
- Every write here is EDITOR, except embedding-profile activation, minting a version, vector search and every delete, which are ADMIN.

## The order, and why it is not arbitrary

**1. Embedding profile first, if anything will be searchable.** A record type names a profile in `uses.search`, so the profile has to exist to be named — and it carries the `defaultChunking` (required) and `defaultStages` every type on it inherits unless the type overrides them.

```
POST /v1/embedding-profiles                    { project, defaultChunking, … }   → inert: nothing references it yet
PATCH /v1/embedding-profiles/{id}              label, isDefault, defaultChunking, defaultStages — a default change re-derives and re-embeds every inheriting type
POST /v1/embedding-profiles/{id}/versions      mint the next geometry — still changes nothing
POST /v1/embedding-profiles/{id}/activate      repoint every declaration onto it and reindex
```

Activation is direction-agnostic — pointing at a superseded version is the rollback, and it is lossless because the collections it moves off are never dropped. Its response names `movedRecordTypes` and `repointedSteps`: saved search steps whose literal collection name was rewritten. An empty `movedRecordTypes` means it was already active; repeating is safe.

**2. Shapes, then record types.** A type references its shape, so the shape is authored first.

```
POST /v1/schema-entries                        a reusable typed shape
POST /v1/schema-entries/seed                   { project } — materialise the flow-provider entries, idempotent
POST /v1/record-types                          name, shape, owner scope, processing flow, `uses`
PATCH /v1/record-types/{id}                    replace `uses` whole; `searchable`/`queryable`/`relations` in a body are a 422
GET  /v1/record-types/{id}?expand=uses         where each use landed, and which use kinds this deployment supports
GET  /v1/record-types/{id}/contract-preview    the field vocabulary a proposed shape or flow would give the type
POST /v1/record-types/{id}/write-preview       what your PATCH body would do — derived declarations, reindex, restamp — writing nothing
POST /v1/record-types/{id}/natural-key-preview the verdict a `key` use would get, per candidate field, before you send it
```

The natural key is the `key` use on a field in `uses`: the save verifies every existing record first and refuses the whole PATCH with `409 RECORD_TYPE_NATURAL_KEY_UNSATISFIED` if two share a value. A `uses` refusal is `422 RECORD_TYPE_USES_INVALID` with every issue and its remedy in `details.issues`; a type from before the vocabulary answers `409 USES_NOT_MIGRATED` until migrated.

The builtin and library shapes are **synthesized on read**: they have no rows and nothing creates them. There is no `?seed=` flag on the read; the seed is the POST.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is written, and so do the type's **name** and its **data-shape reference** (`RECORD_TYPE_PINNED_BY_RECORDS`). None can be revised afterwards without deleting the rows. A per-user type cannot be written by an API key at all — see `kipory-data`.

**4. Relation kinds, and the field that feeds them.**

```
POST /v1/relation-kinds                        send `declaration` and the producing field is spliced into the type in the same transaction
POST /v1/relation-kind-pairings                which (typeA, typeB) pairs the kind admits — seeded atomically with the kind
GET  /v1/relation-kinds/{id}?expand=readiness  blocked · inert · unproven · ready
```

Omit `declaration` and the kind is legal but produces nothing; readiness reports it `inert`. The field that feeds a kind is otherwise a `link` use on the record type — `{ "kind": "link", "relation": "<key>" }` in its `uses`, `element.ref` for a list of objects — and the type's `relations` is derived from it. A pairing has no update — delete and recreate. The kind's key is immutable.

**5. Facets, and most of the time they need no flow at all.**

```
POST /v1/facets                                { matching: exact | semantic, resolverFlowId? }
POST /v1/facets/{id}/terms                     bulk-seed the vocabulary
PATCH /v1/record-types/{id}                    `uses.facets: [...]` — which facets a type surfaces, in order; read back with `expand=facets`
GET  /v1/facets/resolvers                      the resolver flows available
GET  /v1/facets/{id}/delete-preflight          what deleting would reach
GET  /v1/facets/{id}?expand=readiness
```

A facet is not a field: its values are resolved by the processing flow into the term store, so the type-to-facet link is a list on the type (`uses.facets`), not a use of a field. A key that is not a facet of the project is `USES_FACET_UNKNOWN`.

A facet whose `matching` is `exact` needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to a platform default at creation and works as authored; pass an explicit `null` only to opt out and bring your own resolver later (`kipory-build`, then patch it on). Single terms: `POST /v1/terms`, `PATCH /v1/terms/{id}`, `POST /v1/terms/{id}/merge`, `DELETE /v1/terms/{id}`.

## What will bite you

- ⛔ **There is no multi-hop, and that absence is the contract.** `GET /v1/records/{id}/relations/{kind}` walks one hop, one kind, and there is no depth parameter. Inside a flow the entity read and list handlers can carry a record's edges per row and select records by edge — opt-in step config; check the handler pages rather than assuming names.
- **An empty traversal is not proof of no edges.** A kind the project does not have answers 200 with an empty list, never 404. Check the kind exists before concluding a write went missing.
- **On a facet patch, `version` is required**, an omitted field preserves, and an explicit null clears only some fields: the proposal, the resolver binding and its params. On `matching` and the mint policy a null is a **no-op**, because those columns are never empty.
- **A schema edit cascades.** Read the record-types pack on what an entry change reaches before editing one that types already reference.
- **`expand=embedding` and `expand=vectorProgress` are refused on the record-types list.** They are per-row scans; ask them on `GET /v1/record-types/{id}`.
- **Readiness is the diagnostic here, not `outstandingIssues`.** That array belongs to skill writes; none of the saves in this skill carry it. Re-read the facet or kind with `expand=readiness`: `blocked` cannot work (`RESOLVER_UNBOUND` on an unbound semantic facet), `inert` is wired to nothing, `unproven` has never resolved — expected an hour after authoring, a question a year later.
- **An embedding profile's `version` is not a lock.** Its PATCH accepts `label`, `isDefault`, `defaultChunking` and `defaultStages`, and sending `version` is a 422. Changing the model or the slots goes through a version and re-embeds everything; changing a default re-derives and re-embeds every type that inherits it, without a version.
- **`uses` is sent whole.** A PATCH carrying it replaces the statement; reordering two `filter` fields moves their storage slots and re-stamps every record of the type. Read it, change it, send it back with the `version` you read — and ask `write-preview` first if you are not sure what it derives to.
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
