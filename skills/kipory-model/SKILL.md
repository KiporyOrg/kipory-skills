---
name: kipory-model
description: Define a Kipory project's data — the record types and the reusable shapes they refer to, the facets that classify records against a vocabulary of terms, the typed relation kinds that link records, and the embedding profile that makes them searchable. Use when deciding what kinds of things exist in a project and how they connect, when adding a field, a facet or a link to an existing type, or when a search returns nothing because no record type names an embedding profile. Not for the records themselves (that is data) and not for the flows that process them (that is build).
license: MIT
---

# Model a project's data

Five resources, five packs, and an order the packs do not state because each answers for one capability. Two facts most people get wrong: **a record type has ONE storage declaration, `uses`** — per field, what it is for (`filter`, `search`, `link`, `key`, `stream`), plus the type-level `search` settings, `join` and `facets`; `searchable`, `queryable`, `relations`, the natural key and the facet links are derived from it and read-only, and it is sent whole. And **an embedding profile is live the moment a record type names one of its versions in `uses.search.profileId`** — creating it changes nothing until then, and activation is for later: it repoints every declaration on the profile's name onto another version and reindexes, the one expensive move here.

## Before the first call

- Fetch the judgment for the resource you are about to touch: `references/packs/record-types-and-schema-entries.md`, `facets.md`, `relations.md`, `embedding-profiles.md` (served live under `GET /v1/capability-packs/{id}`).
- Read `GET /v1/bootstrap?project={nodeId}&sections=schema,relations,vectors` first: everything modelled so far, in one call. Do not author what already exists.
- Every write here is EDITOR, except embedding-profile activation, minting a version, vector search and every delete, which are ADMIN.

## The order, and why it is not arbitrary

**1. Embedding profile first, if anything will be searchable.** A record type names a profile version in `uses.search.profileId`, so the profile has to exist to be named — and it carries the `defaultChunking` (required) every type on it inherits unless the type overrides it. Naming it is what makes it serve; the active version is derived from the declarations, so a fresh profile needs no activate.

```
POST /v1/embedding-profiles                    { project, name, modelId, denseSlots, defaultChunking, … }   → inert until a type names it
PATCH /v1/embedding-profiles/{id}              label, isDefault, defaultChunking — a chunking change re-derives and re-embeds every inheriting type
POST /v1/embedding-profiles/{id}/versions      mint the next geometry — changes nothing until activated
POST /v1/embedding-profiles/{id}/activate      repoint every declaration on the name onto this version and reindex
```

- **`modelId`** is an embedding model's id from `GET /v1/ai-models?type=embedding` — nothing else lists them. A listed model is not a working one: before you choose, read `GET /v1/projects/{nodeId}/ai-calls?origins=all&outcome=error` for recent rows with `errorCode: "error:quota_exhausted"` by provider and pick another provider's model if its account is out. On a project with no history the first failed embed is the probe — see the indexing failure below.
- **`defaultChunking`** is exactly one of two shapes: `{ "kind": "whole" }` (one point per record) or `{ "kind": "chunks", "tokens": 400, "overlap": 50 }` (token-sized pieces, `overlap` strictly below `tokens`). Any other `kind` — `tokens`, `fixed` — is a 422 `Expected 'whole' | 'chunks'`. A type's `uses.search.chunking` takes the same two shapes.

Activation is direction-agnostic — pointing at a superseded version is the rollback, and it is lossless because the collections it moves off are never dropped. Its response names `movedRecordTypes` and `repointedSteps`: saved search steps whose literal collection name was rewritten. An empty `movedRecordTypes` means it was already active; repeating is safe.

**2. Shapes, then record types.** A type references its shape, so the shape is authored first.

```
POST /v1/schema-entries                        a reusable typed shape
POST /v1/schema-entries/seed                   { project } — materialise the flow-provider entries, idempotent
POST /v1/record-types                          name, shape, owner scope, processing flow, `uses`
PATCH /v1/record-types/{id}                    replace `uses` whole; `searchable`/`queryable`/`relations` in a body are a 422
GET  /v1/record-types/{id}?expand=uses         where each use landed, and which use kinds this deployment supports
GET  /v1/record-types/{id}/contract-preview    the field vocabulary a proposed shape or flow would give the type
PATCH /v1/record-types/{id} validateOnly:true  what your PATCH body would do — derived declarations, reindex, restamp — writing nothing
POST /v1/record-types/{id}/natural-key-preview the verdict a `key` use would get, per candidate field, before you send it
```

A field reference inside `uses` (a `search` field's `source`, a template) names a `family` and a `field`. The families are `submission` (the record's submitted data), `processed` (an output of the flow bound to the type — how a searchable `body` extracted from a file is named) and `system` (platform fields such as the id and creation time).

The natural key is the `key` use on a field in `uses`: the save verifies every existing record first and refuses the whole PATCH with `409 RECORD_TYPE_NATURAL_KEY_UNSATISFIED` if two share a value or any record cannot supply the field. A `uses` refusal is `422 RECORD_TYPE_USES_INVALID` with every issue and its remedy in `details.issues`.

The builtin and library shapes are **synthesized on read**: they have no rows and nothing creates them. There is no `?seed=` flag on the read; the seed is the POST.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is written, and so do the type's **name** and its **data-shape reference** (`RECORD_TYPE_PINNED_BY_RECORDS`). None can be revised afterwards without deleting the rows. A per-user type cannot be written by a flow a key runs — a key's runs carry no end user; a key can only hand-write one record at a time naming its owner — see `kipory-data`.

**4. Relation kinds, and the field that feeds them.**

```
POST /v1/relation-kinds                        send `declaration` and the producing field is spliced into the type in the same transaction
POST /v1/relation-kind-pairings                which (typeA, typeB) pairs the kind admits — seeded atomically with the kind
GET  /v1/relation-kinds/{id}?expand=readiness,liveRelationCount  blocked · inert · unproven · ready
```

A pairing names record types by **name**, not id: `"pairings": [{ "from": "recipe", "to": "ingredient" }]`. The same `{ from, to }` goes to `POST /v1/relation-kind-pairings` with the kind. A `validateOnly` create forecasts readiness without counting edges, so a draft can read `ready` there. The saved kind reads `unproven` until it carries its first edge — but only on a read that also asks `expand=liveRelationCount`; without it an edgeless field or curated kind reads `ready`.

Omit `declaration` and the kind is legal but produces nothing; readiness reports it `inert`. The field that feeds a kind is otherwise a `link` use on the record type — `{ "kind": "link", "relation": "<key>" }` in its `uses`, `element.ref` for a list of objects — and the type's `relations` is derived from it. A pairing has no update — delete and recreate. The kind's key is immutable.

**5. Facets, and most of the time they need no flow at all.**

```
POST /v1/facets                                { project, facetKey, label, cardinality, matching: exact | semantic, resolverFlowId? }
POST /v1/facets/{id}/terms                     bulk-seed the vocabulary
PATCH /v1/record-types/{id}                    `uses.facets: [...]` — which facets a type surfaces, in order; read back with `expand=facets`
GET  /v1/facets/resolvers                      the resolver flows available
DELETE /v1/facets/{id}?validateOnly=true      whether the delete would be allowed, and what it would reach
GET  /v1/facets/{id}?expand=readiness
```

A facet is not a field: its values are resolved by the processing flow into the term store, so the type-to-facet link is a list on the type (`uses.facets`), not a use of a field. A key that is not a facet of the project is `USES_FACET_UNKNOWN`; one that is also a field name of the type is `USES_FACET_SHADOWS_FIELD`.

**Every term write embeds before it saves, whatever the facet's `matching`.** `POST /v1/facets/{id}/terms`, `POST /v1/terms` and a relabelling `PATCH /v1/terms/{id}` embed the term's text synchronously on the platform's shared term model (the `substrate-embedding` task). That model is platform-wide, not per project: binding `substrate-embedding` on your project node is a 422 (`details.reason: "TASK_READ_AT_ROOT_ONLY"`), and binding `embedding` there moves record search, not terms. When its provider refuses (quota, outage), the write fails — typically a 429 or 422 — and **nothing is saved**, even on an `exact` facet. A `validateOnly` seed does not embed, so it can answer `ok` for a seed the real call refuses. There is no project-side escape; retry later. `qdrantUpsertFailures` and `reembedWarning` are a different, later failure: the term row saved but its vector store write did not.

A facet whose `matching` is `exact` needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to a platform default at creation and works as authored; pass an explicit `null` only to opt out and bring your own resolver later (`kipory-build`, then patch it on). Single terms: `POST /v1/terms`, `PATCH /v1/terms/{id}`, `POST /v1/terms/{id}/merge`, `DELETE /v1/terms/{id}`.

## What will bite you

- ⛔ **There is no multi-hop, and that absence is the contract.** `GET /v1/records/{id}/relations/{kind}` walks one hop, one kind, and there is no depth parameter. Inside a flow the entity read and list handlers can carry a record's edges per row and select records by edge — opt-in step config; check the handler pages rather than assuming names.
- **An empty traversal is not proof of no edges.** A kind the project does not have answers 200 with an empty list, never 404. Check the kind exists before concluding a write went missing.
- **Do not give a facet the key of a field of a type that surfaces it.** A list row carries each facet as a top-level field named by its key, so facet `cuisine` beside submitted field `cuisine` would replace the value with the term. The record type save refuses the pair with `USES_FACET_SHADOWS_FIELD`, and a schema-entry edit that adds the field later with `SCHEMA_ENTRY_UNSAFE_FOR_RECORD_TYPE`; a pair made any other way (a flow output of that name) saves and shows only in the type's diagnostics. Name the facet differently (`cuisineTag`). <!-- field-ok: cuisineTag — an example facet key a project would author, not a platform field -->
- **A 403 naming a `requiredRole` you hold usually means the id does not exist.** A design route that addresses a row (`/v1/terms/{id}/merge`, `/v1/facets/{id}`, …) answers a missing or foreign id with the same 403 `insufficient_project_role` as a real role gap, so ids cannot be probed. Before suspecting your key, re-read the id from its list.
- **On a facet patch, `version` is required**, an omitted field preserves, and an explicit null clears only some fields: the proposal, the resolver binding and its params. On `matching` and the mint policy a null is a **no-op**, because those columns are never empty.
- **A schema edit cascades.** Read the record-types pack on what an entry change reaches before editing one that types already reference.
- **`expand=embedding` and `expand=vectorProgress` are refused on the record-types list.** They are per-row scans; ask them on `GET /v1/record-types/{id}`. On record types, `expand` is **comma-separated** (`?expand=embedding,vectorProgress`); repeating the parameter is a 422 `Expected string, received array`.
- **An indexing failure is silent on the record and the type.** Records stay `indexState: "never"` and `vectorProgress.remaining` stops falling; neither says why. The cause is in the model-call ledger: `GET /v1/projects/{nodeId}/ai-calls?origins=projection` — each failed embed is a row with `errorCode` (`error:quota_exhausted`, …); read one by id (`/ai-calls/{callId}`) for the provider's `errorMessage`. A failed embed is retried three times within about fifteen seconds, then only by the daily re-index sweep (08:00 UTC). The usual remedy is a new profile version on another embedding model, then activate it.
- **Readiness is the diagnostic here, not `outstandingIssues`.** That array belongs to skill writes; none of the saves in this skill carry it. Re-read the facet or kind with `expand=readiness` (a kind also with `liveRelationCount`, or `unproven` never shows): `blocked` cannot work (`RESOLVER_UNBOUND` on an unbound semantic facet), `inert` is wired to nothing, `unproven` has never resolved — expected an hour after authoring, a question a year later.
- **An embedding profile's `version` is not a lock.** Its PATCH accepts `label`, `isDefault` and `defaultChunking`, and sending `version` is a 422. Changing the model or the slots goes through a version and re-embeds everything; changing `defaultChunking` re-derives and re-embeds every type that inherits it, without a version.
- **`uses` is sent whole.** A PATCH carrying it replaces the statement; reordering two `filter` fields moves their storage slots and re-stamps every record of the type. Read it, change it, send it back with the `version` you read — and ask the same PATCH with `validateOnly: true` first if you are not sure what it derives to.
- **A search step left behind after activation keeps querying the superseded collection** — stale results, not an error. Read `repointedSteps`.
- **A collection has two names, and each surface takes a different one.** `GET /v1/vector-collections?project={nodeId}` returns both: `name` (without the project prefix, e.g. `handbook-v2-project`) and `collectionName` (the physical `{slug}.{name}`, e.g. `my-project.handbook-v2-project`). The `/v1/vector-collections/{name}` routes take `name`; a `vector.search` step's `collection` takes the full **`collectionName`**. A step naming the short name is refused at save with `VECTOR_SEARCH_COLLECTION_UNKNOWN`, and the remedy names the full name it matches. The name carries the profile version, so activating a new version changes it (activation repoints saved steps for you).
- **Vector search is ADMIN and bills.** `POST /v1/vector-collections/{name}/search` embeds the query text on every call. The collections surface is otherwise read-only, and `storeState: absent` is a divergence to act on while `unreachable` is an outage — never fold them.
- **A 2xx is not a promise it will run** — see `kipory-connect`'s conventions. Runtime is stricter than authoring.

## References

| File                                                                                                                      | What it answers                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `references/packs/record-types-and-schema-entries.md`                                                                     | shapes versus types, reserved names, what an edit cascades into                   |
| `references/packs/facets.md`                                                                                              | classification, resolvers, the path from resolving to committing terms            |
| `references/packs/relations.md`                                                                                           | kinds, pairings, the declaration on the type, the multi-hop that does not exist   |
| `references/packs/embedding-profiles.md`                                                                                  | the project's vector space                                                        |
| `references/classification-runtime.md`                                                                                    | the resolver flow's own handlers: the threshold gate's two kinds, the browse tree |
| `references/api/record-types.md` · `schema-entries.md` · `facets-and-terms.md` · `relations.md` · `embedding-profiles.md` | every route's fields                                                              |

## Then

`kipory-retrieve` once records are embedded and something has to search them. `kipory-evolve` before changing any of this on a project that already holds records. `kipory-build` for the flows this step referenced — the processing flow a record type binds, and any facet resolver you left unbound. `kipory-data` to see the records a type holds and the edges between them. `kipory-diagnose` if a search step returns nothing after a profile change.
