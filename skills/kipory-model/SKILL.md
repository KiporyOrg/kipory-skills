---
name: kipory-model
description: Define a Kipory project's data model — tables and the types they refer to, what each field is for (`uses` — filter, search, link, key), the vocabularies whose terms classify or tag records, the relations that link records, and the embedding profile that makes a table searchable. Use when deciding what kinds of things exist and how they connect, adding a field, a category list, a tag or a link to a table, making records filterable, unique or searchable, reviewing candidate terms, or when records never become searchable. On a project that already holds records read kipory-evolve first. Not for the records themselves (kipory-data) and not for the flows that process them (kipory-build).
license: MIT
---

# Model a project's data

Five resources, four packs, and an order the packs do not state because each answers for one capability. Two facts most people get wrong:

- **A table has ONE storage declaration, `uses`** — per field, what it is for (`filter`, `search`, `link`, `key`, `stream`), plus the table-level `search` settings, `join` and `vocabularies`. `searchable`, `queryable`, `relations`, the natural key and the surfaced vocabularies are derived from it and read-only, and it is sent whole.
- **An embedding profile is live the moment a table names one of its generations in `uses.search.profileId`.** Creating it changes nothing until then. Activation is for later: it repoints every declaration on the profile's name onto another generation and reindexes, the one expensive move here.

## Before the first call

- Fetch the judgment for the resource you are about to touch: `references/packs/tables-and-types.md`, `vocabularies.md`, `relations-and-links.md`, `embedding-profiles.md` (served live under `GET /v1/capability-packs/{id}`).
- Read `GET /v1/bootstrap?project={nodeId}&sections=schema,relations,vectors` first: everything modelled so far, in one call. Do not author what already exists.
- Every write here is EDITOR, except embedding-profile activation, minting a generation, vector search and every delete, which are ADMIN.

## The order, and why it is not arbitrary

**1. Embedding profile first, if anything will be searchable.** A table names a profile generation in `uses.search.profileId`, so the profile has to exist to be named — and it carries the `defaultChunking` (required) every table on it inherits unless the table overrides it. Naming it is what makes it serve; the active generation is derived from the declarations, so a fresh profile needs no activate.

```
POST /v1/embedding-profiles                    { project, key, modelId, denseSlots, defaultChunking, … }   → inert until a type names it
PATCH /v1/embedding-profiles/{id}              { version, label?, isDefault?, defaultChunking? } — a chunking change re-derives and re-embeds every inheriting type
POST /v1/embedding-profiles/{id}/generations   mint the next geometry generation — changes nothing until activated
POST /v1/embedding-profiles/{id}/activate      { version } — repoint every declaration on the key onto this generation and reindex
```

- **`modelId`** is an embedding model's id from `GET /v1/ai-models?type=embedding` — nothing else lists them. A listed model is not a working one: before you choose, read `GET /v1/ai-calls?project={nodeId}&origins=all&outcome=error` for recent rows with `errorCode: "quota-exhausted"` by provider and pick another provider's model if its account is out. On a project with no history the first failed embed is the probe — see the indexing failure below.
- **`defaultChunking`** is exactly one of two shapes: `{ "kind": "whole" }` (one point per record) or `{ "kind": "chunks", "tokens": 400, "overlap": 50 }` (token-sized pieces, `overlap` strictly below `tokens`). Any other `kind` — `tokens`, `fixed` — is a 422 `Expected 'whole' | 'chunks'`. A table's `uses.search.chunking` takes the same two shapes.

Activation is direction-agnostic — pointing at a superseded generation is the rollback, and it is lossless because the collections it moves off are never dropped. Its response names `movedTables` and `repointedSteps`: saved search steps whose literal collection name was rewritten. An empty `movedTables` means it was already active; repeating is safe.

**2. Shapes, then tables.** A table references its shape, so the shape is authored first.

**A shape refers to another shape by id**, inside its `definition`, in one form only:

```json
{ "type": "array", "items": { "$ref": "#/$defs/<dataTypeId>" } }
```

- **The id, never the key** — on the row API and inside a document alike. A key there (`"$ref": "Row"`, `"#/$defs/Row"`) is refused `SCHEMA_DEFINITION_INVALID_JSON_SCHEMA`. A document re-spells step and table references by key, but not this one.
- **Two new shapes where one refers to the other are two applies.** A new type has no id until it is applied: apply the referenced shape first, read its `id` from the apply's returned `document`, then apply the shape that refers to it.
- **Inline fields need one apply but name nothing.** An inline object is the anonymous `object`, not a named type, and a `flow.fan-out` over such a list cannot read its rows' fields (`kipory-build`'s `references/patterns.md`, fan-out).

```
POST /v1/types                        a reusable typed shape
POST /v1/types/seed                   { project } — materialise the flow-provider entries, idempotent
POST /v1/tables                          key, shape, owner scope (`user` | `project`), processing flow, `uses`
PATCH /v1/tables/{id}                    replace `uses` whole; `searchable`/`queryable`/`relations` in a body are a 422
GET  /v1/tables/{id}?expand=uses         where each use landed, and which use kinds this deployment supports
PATCH /v1/tables/{id} validateOnly:true  what your PATCH body would do — derived declarations, reindex, restamp, the contract a
                                               shape or flow move leaves (`derived.contract`), the verdict a `key` use gets
                                               (`derived.naturalKey`) — writing nothing
PATCH /v1/tables/{id} definition         rewrite the shape of the entry the type points at — for every type, event and link that uses it
```

**A table and its processing flow name each other, so one of them goes first.** The flow's steps name the table by key and its input uses the table's shape; the table names the flow by id. Create the table without `flowId`, build the flow (`kipory-build`), then `PATCH /v1/tables/{id} { flowId, version }` — or state the shape, the table and the flow in one project document, which orders them for you. Add a `processed` field to `uses` only after the flow is bound: until then the table has no such field to name.

A field reference inside `uses` (a `search` field's `source`, a template) names a `family` and a `field`. The families are `submission` (the record's submitted data), `processed` (an output of the flow bound to the table — how a searchable `body` extracted from a file is named) and `system` (platform fields such as the id and creation time). `search` and `link` take either of the first two; **`filter` and `key` take a `submission` field only** — a `filter` on a processed field is refused `TABLE_QUERYABLE_INVALID`, a `key` on one `USES_KEY_NOT_SUBMITTED`. To filter, order or count on a value the flow computes, declare it as an optional submitted field and have the flow write it with `record.update` (`kipory-build`'s `references/records-and-endpoints.md`, roll-ups).

`uses` is one object, `{ "fields": [...], "search"?, "vocabularies"? }`, and each `fields` entry pairs a source with what it is for. A use is a word or an object: a natural key that is also filterable is `{ "source": { "family": "submission", "field": "sku" }, "uses": ["key", "filter"] }`; a searched field is `{ "kind": "search" }`, a relation's producing field `{ "kind": "link", "relation": "<relation key>" }`. The `tables-and-types` pack has the whole statement.

The natural key is the `key` use on a field in `uses`: the save verifies every existing record first and refuses the whole PATCH with `409 TABLE_NATURAL_KEY_UNSATISFIED` if two share a value or any record cannot supply the field. **A key is unique per project and per table — and, on a table owned by its users, per owner**: two users may each hold a record with the same key, and one user's record never collides with another's. So "each user follows a source once" is a `key` use on the source field of a per-user table, with no user id in the key. A `uses` refusal is `422 TABLE_USES_INVALID` with every issue and its remedy in `details.issues`.

The builtin and library shapes are **synthesized on read**: they have no rows and nothing creates them. There is no `?seed=` flag on the read; the seed is the POST.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is written, and so do the table's **key** and its **data-shape reference** (`TABLE_PINNED_BY_RECORDS`); a key a step's configuration names is refused a rename too (`TABLE_NAMED_BY_CONFIG`). None can be revised afterwards without deleting the rows. A per-user table cannot be written by a flow a key runs — a key's runs carry no end user; a key can only hand-write one record at a time naming its owner (`userId` on `POST /v1/records`) — see `kipory-data`.

**4. Relations, and the field that feeds them.**

```
POST /v1/relations                        send `declaration` and the producing field is spliced into the type in the same transaction
POST /v1/relation-pairings                which (typeA, typeB) pairs the kind admits — seeded atomically with the kind
GET  /v1/relations/{id}?expand=readiness,liveRelationCount  blocked · inert · unproven · ready
```

A pairing names tables by **key**, not id: `"pairings": [{ "fromTableKey": "recipe", "toTableKey": "ingredient" }]`. The same `{ fromTableKey, toTableKey }` goes to `POST /v1/relation-pairings` with the relation's `relationKey`. A `validateOnly` create forecasts readiness without counting links, so a draft can read `ready` there. The saved relation reads `unproven` until it carries its first link — but only on a read that also asks `expand=liveRelationCount`; without it a field or curated relation with no links reads `ready`.

Omit `declaration` and the relation is legal but produces nothing; readiness reports it `inert`. The field that feeds a relation is otherwise a `link` use on the table — `{ "kind": "link", "relation": "<key>" }` in its `uses`, `element.ref` for a list of objects — and the table's `relations` is derived from it. A pairing has no update — delete and recreate. <!-- absent: PATCH /v1/relation-pairings/{id} --> The relation's key is immutable. `producer` is `field`, `join-record` or `curated` and `cardinality` `many-to-one` or `many-to-many` — kebab, as every enum value on the wire. Every write here takes `validateOnly` (a pairing's DELETE as `?validateOnly=true`) and answers the save's own verdict, writing nothing.

**5. Vocabularies, and most of the time they need no flow at all.**

```
POST /v1/vocabularies                                { project, key, label, cardinality, matching: exact | semantic, resolverFlowId? }
POST /v1/vocabularies/{id}/terms                     bulk-seed the vocabulary
PATCH /v1/tables/{id}                    `uses.vocabularies: [...]` — which vocabularies a type surfaces, in order; read back with `expand=vocabularies`
GET  /v1/vocabularies/resolvers                      the resolver flows available
DELETE /v1/vocabularies/{id}?validateOnly=true      whether the delete would be allowed, and what it would reach
GET  /v1/vocabularies/{id}?expand=readiness
```

A vocabulary is not a field: its values are resolved by the processing flow into the term store, so the table-to-vocabulary association is a list on the table (`uses.vocabularies`), not a use of a field. A key that is not a vocabulary of the project is `USES_VOCABULARY_UNKNOWN`; one that is also a field name of the table is `USES_VOCABULARY_SHADOWS_FIELD`.

**A vocabulary that is the parent of another must be `cardinality: one`** — a child term hangs under exactly one parent term, so the child vocabulary's create is refused `VOCABULARY_PARENT_CARDINALITY` otherwise, and a vocabulary's PATCH does not take `cardinality`. Decide it before seeding the parent's terms.

**Every term write embeds before it saves, whatever the vocabulary's `matching`.** `POST /v1/vocabularies/{id}/terms` and a relabelling `PATCH /v1/terms/{id}` embed the term's text on the platform's shared term model. When that model's provider refuses, **nothing is saved**, even on an `exact` vocabulary, and a `validateOnly` seed does not embed — so it can answer `ok` for a seed the real call refuses. `references/classification-runtime.md` has how to read that failure.

A vocabulary whose `matching` is `exact` needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to a platform default at creation and works as authored; pass an explicit `null` only to opt out and bring your own resolver later (`kipory-build`, then patch it on). A term is created under its vocabulary — `POST /v1/vocabularies/{id}/terms` takes one row as readily as many, and a key the vocabulary already holds answers `existed` rather than a conflict. After that: `PATCH /v1/terms/{id}` and `POST /v1/terms/{id}/merge` (both require the term's `version` from `GET /v1/terms`; a stale one is 409 `VERSION_CONFLICT`), `DELETE /v1/terms/{id}`.

## What will bite you

- ⛔ **There is no multi-hop, and that absence is the contract.** `GET /v1/records/{id}/links/{relationKey}` walks one hop, one relation, and there is no depth parameter. Inside a flow the record read and list handlers can carry a record's links per row and select records by link — opt-in step config; check the handler pages rather than assuming names.
- **An empty traversal is not proof of no links.** A relation the project does not have answers 200 with an empty list, never 404 (`kipory-data` walks links). Check the relation exists before concluding a write went missing.
- **A `link` field does not check that its target exists.** A field naming a record that does not exist, is in another project, or is the record itself saves without an error and produces no link. Read the link back (`GET /v1/records/{id}/links/{relationKey}`) when it matters.
- **A term filter finds active terms only.** A vocabulary with `mint: candidate` files records under candidate terms, which a record read shows — but `term=` on the records list and a query's `term` clause do not match them until the term is admitted (`PATCH /v1/terms/{id}`).
- **Re-classifying a record needs a clean run.** `term.upsert` adds assignments and never replaces one, so a second run that resolves a `one` vocabulary differently fails the whole run when its writes apply — `references/classification-runtime.md`.
- **Do not give a vocabulary the key of a field of a table that surfaces it.** A list row carries each vocabulary as a top-level field named by its key, so vocabulary `cuisine` beside submitted field `cuisine` would replace the value with the term. The table save refuses the pair with `USES_VOCABULARY_SHADOWS_FIELD`, and a type edit that adds the field later with `TYPE_UNSAFE_FOR_TABLE`; a pair made any other way (a flow output of that name) saves and shows only in the table's diagnostics. Name the vocabulary differently (`cuisineTag`). <!-- field-ok: cuisineTag — an example facet key a project would author, not a platform field -->
- **A 404 on a row route means the id is not one you can see.** A design route that addresses a row (`/v1/terms/{id}/merge`, `/v1/vocabularies/{id}`, …) answers a missing id and one in a project your key does not reach with the same `404 NOT_FOUND`, so ids cannot be probed; re-read the id from its list. A 403 `insufficient_project_role` there is a real role gap on a row you can see, and `details.requiredRole` names the floor.
- **On a vocabulary patch, `version` is required**, an omitted field preserves, and an explicit null clears only some fields: the proposal, the resolver binding and its params. On `matching` and the mint policy a null is a **no-op**, because those columns are never empty.
- **A schema edit cascades.** Read the tables pack on what a type change reaches before editing one that tables already reference.
- **`expand=embedding` and `expand=vectorProgress` are refused on the tables list.** They are per-row scans; ask them on `GET /v1/tables/{id}`. On tables, `expand` is **comma-separated** (`?expand=embedding,vectorProgress`); repeating the parameter is a 422 `Expected string, received array`.
- **An indexing failure is silent on the record and the table.** Records stay `indexState: "never"` and `vectorProgress.remaining` stops falling; neither says why. The cause is in the AI-call list: `GET /v1/ai-calls?project={nodeId}&origins=projection` — each failed embed is a row with `errorCode` (`quota-exhausted`, …); read one by id (`GET /v1/ai-calls/{id}`) for the provider's `errorMessage`. A failed embed is retried three times within about fifteen seconds, then only by the daily re-index sweep (08:00 UTC). The usual remedy is a new profile generation on another embedding model, then activate it.
- **Readiness is the diagnostic here, not `outstandingIssues`.** That array belongs to skill writes; none of the saves in this skill carry it. Re-read the vocabulary or relation with `expand=readiness` (a relation also with `liveRelationCount`, or `unproven` never shows): `blocked` cannot work (`RESOLVER_UNBOUND` on an unbound semantic vocabulary), `inert` is wired to nothing, `unproven` has never resolved — no run has filed one of its terms onto a record and applied (a preview does not count) — expected an hour after authoring, a question a year later.
- **An embedding profile carries two numbers.** `generation` is its geometry — the `v{n}` in its collection names, minted by `POST …/generations`, never sent back. `version` is its lock, like every other row's: required on the PATCH and on `POST …/activate`, and a stale one is 409 `VERSION_CONFLICT`. Changing the model or the slots goes through a new generation and re-embeds everything; changing `defaultChunking` re-derives and re-embeds every table that inherits it, without a new generation.
- **`uses` is sent whole.** A PATCH carrying it replaces the statement; reordering two `filter` fields moves their storage slots and re-stamps every record of the table. Read it, change it, send it back with the `version` you read — and ask the same PATCH with `validateOnly: true` first if you are not sure what it derives to.
- **A search step left behind after activation keeps querying the superseded collection** — stale results, not an error. Read `repointedSteps`.
- **A collection has two names, and each surface takes a different one.** `GET /v1/vector-collections?project={nodeId}` returns both: `name` (without the project prefix, e.g. `handbook-v2-project`) and `collectionName` (the physical `{slug}.{name}`, e.g. `my-project.handbook-v2-project`). The `/v1/vector-collections/{name}` routes take `name`; a `vector.search` step's `collection` takes the full **`collectionName`**. A step naming the short name is refused at save with `VECTOR_SEARCH_COLLECTION_UNKNOWN`, and the remedy names the full name it matches. The name carries the profile `generation`, so activating a new generation changes it (activation repoints saved steps for you).
- **Vector search is ADMIN and bills.** `POST /v1/vector-collections/{name}/search` embeds the query text on every call. `GET /v1/vector-collections/{name}/points?project={nodeId}` pages the points a collection stores, optionally narrowed by `filter`, and is free (VIEWER). The collections surface is otherwise read-only, and `storeState: absent` is a divergence to act on while `unreachable` is an outage — never fold them.
- **A 2xx is not a promise it will run** — see `kipory-connect`'s conventions. Runtime is stricter than authoring.

## References

| File                                                                                                             | What it answers                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/packs/tables-and-types.md`                                                                           | types versus tables, reserved names, what an edit cascades into                                                                               |
| `references/packs/vocabularies.md`                                                                               | classification, resolvers, the path from resolving to committing terms                                                                        |
| `references/packs/relations-and-links.md`                                                                        | relations, pairings, the declaration on the table, the multi-hop that does not exist                                                          |
| `references/packs/embedding-profiles.md`                                                                         | the project's vector space                                                                                                                    |
| `references/classification-runtime.md`                                                                           | the resolver flow's own handlers: the threshold gate's two kinds, the browse tree; re-classifying a record; a term write the provider refuses |
| `references/api/tables.md` · `types.md` · `vocabularies-and-terms.md` · `relations.md` · `embedding-profiles.md` | every route's fields                                                                                                                          |

## Then

`kipory-retrieve` once records are embedded and a flow has to search them. `kipory-evolve` before changing any of this on a project that already holds records. `kipory-build` for the flows this step referenced — the processing flow a table binds (then come back and PATCH its `flowId` onto the table), and any vocabulary resolver you left unbound. `kipory-data` to write, see and query the records a table holds and the links between them. `kipory-diagnose` if a search step returns nothing after a profile change.
