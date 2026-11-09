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
- Every write here is EDITOR, except embedding-profile activation, minting a generation and every delete, which are ADMIN.

## The order, and why it is not arbitrary

**1. Embedding profile first, if anything will be searchable.** A table names a profile generation in `uses.search.profileId`, so the profile has to exist to be named — and it carries the `defaultChunking` (required) every table on it inherits unless the table overrides it. Naming it is what makes it serve; the active generation is derived from the declarations, so a fresh profile needs no activate.

```
POST /v1/embedding-profiles                    { project, key, modelId, keywords, defaultChunking, … }   → inert until a table names it
PATCH /v1/embedding-profiles/{id}              { version, label?, isDefault?, defaultChunking? } — a chunking change re-derives and re-embeds every inheriting type
POST /v1/embedding-profiles/{id}/generations   { modelId?, keywords? } — mint the next generation; changes nothing until activated
POST /v1/embedding-profiles/{id}/activate      { version } — repoint every declaration on the key onto this generation and reindex
```

**The profile's fields, and activation** — what `modelId`, `keywords` and `defaultChunking` take, and what activating a generation costs: `references/embedding-profile-setup.md`.

**2. Types, then tables.** A table references its type, so the type is authored first.

**A type refers to another type by id**, inside its `definition`, in one form only:

```json
{ "type": "array", "items": { "$ref": "#/$defs/<dataTypeId>" } }
```

- **The id, never the key** — on the row API and inside a document alike. A key there (`"$ref": "Row"`, `"#/$defs/Row"`) is refused `SCHEMA_DEFINITION_INVALID_JSON_SCHEMA`. A document re-spells flow and table references by key, but not this one.
- **Two new types where one refers to the other are two applies.** A new type has no id until it is applied: apply the referenced type first, read its `id` from the apply's returned `document`, then apply the type that refers to it.
- **Inline fields need one apply but name nothing.** An inline object is the anonymous `object`, not a named type, so a step reading a row's field of such a list gets no type for it: the save warns `STEP_INPUT_FIELD_UNTYPED` (`kipory-build`'s `references/utilities.md`, `value.transform`).

```
POST /v1/types                        a reusable set of fields
POST /v1/types/seed                   { project } — materialise the flow-provider types, idempotent
POST /v1/tables                          key, type, owner scope (`user` | `project`), processing flow, `uses`
PATCH /v1/tables/{id}                    replace `uses` whole; `searchable`/`queryable`/`relations` in a body are a 422
GET  /v1/tables/{id}?expand=uses         where each use landed, and which use kinds this deployment supports
PATCH /v1/tables/{id} validateOnly:true  what your PATCH body would do — derived declarations, reindex, restamp, the contract a
                                               type or flow move leaves (`derived.contract`), the verdict a `key` use gets
                                               (`derived.naturalKey`) — writing nothing
PATCH /v1/tables/{id} definition         rewrite the definition of the type the table points at — for every type, event and link that uses it
```

**A table and its processing flow name each other, so one of them goes first.** The flow's steps name the table by key and its input uses the table's type; the table names the flow by id. Create the table without `flowId`, build the flow (`kipory-build`), then `PATCH /v1/tables/{id} { flowId, version }` — or state the type, the table and the flow in one project document, which orders them for you. Add a `processed` field to `uses` only after the flow is bound: until then the table has no such field to name.

A field reference inside `uses` (a `search` field's `source`, a template) names a `family` and a `field`. The families are `submission` (the record's submitted data), `processed` (an output of the flow bound to the table — how a searchable `body` extracted from a file is named) and `system` (platform fields such as the id and creation time). `search`, `link` and `filter` take either of the first two; **`key` takes a `submission` field only** (on a processed one it is refused `USES_KEY_NOT_SUBMITTED`). A `filter` on a processed field lets you filter, order and count on a value the flow computes, with no copy into the submitted data: it holds the record's stored flow output (what the last finished run wrote, or a flow's later `record.update` of it), and moves when that output changes. Two refusals are its own, both `TABLE_QUERYABLE_INVALID`: a submitted and a processed field of the same name cannot both be filters (`QUERYABLE_FIELD_NAME_CLASH`), and a processed field cannot become one while the table's copy of the flow's output no longer matches the flow (`QUERYABLE_PROCESSED_FIELD_DRIFTED`). Once a processed field is a filter, a flow change that drops it or changes its type is refused (`TABLE_FILTER_BROKEN_BY_SIGNATURE`) until the filter goes; pointing the table at a new flow from the table itself re-fills it instead.

`uses` is one object, `{ "fields": [...], "search"?, "vocabularies"? }`, and each `fields` entry pairs a source with what it is for. A use is a word or an object: a natural key that is also filterable is `{ "source": { "family": "submission", "field": "sku" }, "uses": ["key", "filter"] }`; a searched field is `{ "kind": "search" }`, a relation's producing field `{ "kind": "link", "relation": "<relation key>" }`. The `tables-and-types` pack has the whole statement.

The natural key is the `key` use on a field in `uses`: the save verifies every existing record first and refuses the whole PATCH with `409 TABLE_NATURAL_KEY_UNSATISFIED` if two share a value or any record cannot supply the field. **A key is unique per project and per table — and, on a table owned by its users, per owner**: two users may each hold a record with the same key, and one user's record never collides with another's. So "each user follows a source once" is a `key` use on the source field of a per-user table, with no user id in the key. A `uses` refusal is `422 TABLE_USES_INVALID` with every issue and its remedy in `details.issues`.

The builtin and library types are **synthesized on read**: they have no rows and nothing creates them. There is no `?seed=` flag on the read; the seed is the POST.

**3. Decide owner scope before any record exists.** Scope freezes the moment the first record is written, and so does the table's **type reference** (`TABLE_PINNED_BY_RECORDS`). Neither can be revised afterwards without deleting the rows. The table's **key** can be renamed later: its records move with it (ADMIN; the `tables-and-types` pack, renaming a table). A per-user table cannot be written by a flow a key runs — a key's runs carry no end user; a key can only hand-write one record at a time naming its owner (`userId` on `POST /v1/records`) — see `kipory-data`. When people must also read each other's records — a team's documents, a shared list — keep the table per-user and turn `sharing: true` on: each record stays its owner's and is shared with a person or a team record at `read`, `write` or `manage` (`kipory-data`, `references/sharing-records.md`). Unlike owner scope, `sharing` can be turned on after records exist.

**4. Relations, and the field that feeds them.**

```
POST /v1/relations                        send `declaration` and the producing field is spliced into the type in the same transaction
POST /v1/relation-pairings                which (tableA, tableB) pairs the relation admits — seeded atomically with the relation
GET  /v1/relations/{id}?expand=readiness,liveLinkCount  blocked · inert · unproven · ready
```

A pairing names tables by **key**, not id: `"pairings": [{ "fromTableKey": "recipe", "toTableKey": "ingredient" }]`. The same `{ fromTableKey, toTableKey }` goes to `POST /v1/relation-pairings` with the relation's `relationKey`. A `validateOnly` create forecasts readiness without counting links, so a draft can read `ready` there. The saved relation reads `unproven` until it carries its first link — but only on a read that also asks `expand=liveLinkCount`; without it a field or curated relation with no links reads `ready`.

Omit `declaration` and the relation is legal but produces nothing; readiness reports it `inert`. The field that feeds a relation is otherwise a `link` use on the table — `{ "kind": "link", "relation": "<key>" }` in its `uses`, `element.ref` for a list of objects — and the table's `relations` is derived from it. A pairing has no update — delete and recreate. <!-- absent: PATCH /v1/relation-pairings/{id} --> The relation's key can be renamed while links exist (ADMIN; links keep their ids — `references/packs/relations-and-links.md`, Renaming a relation); `producer` cannot. `producer` is `field`, `join-record` or `curated` and `cardinality` `many-to-one` or `many-to-many` — kebab, as every enum value on the wire. Every write here takes `validateOnly` (a pairing's DELETE as `?validateOnly=true`) and answers the save's own verdict, writing nothing.

**5. Vocabularies, and most of the time they need no flow at all.**

```
POST /v1/vocabularies                                { project, key, label, cardinality, matching: exact | semantic, resolverFlowId? }
POST /v1/vocabularies/{id}/terms                     bulk-seed the vocabulary
PATCH /v1/tables/{id}                    `uses.vocabularies: [...]` — which vocabularies a type surfaces, in order; read back with `expand=vocabularies`
GET  /v1/vocabularies/resolvers                      the resolver flows available
DELETE /v1/vocabularies/{id}?validateOnly=true      whether the delete would be allowed, and what it would reach
GET  /v1/vocabularies/{id}?expand=readiness
```

**What a vocabulary is, and its terms** — the table's `uses.vocabularies` list, a parent's cardinality, why a term write can fail on an `exact` vocabulary, resolvers and term edits: `references/vocabulary-setup.md`.

## What will bite you

**The traps of modelling** — each with what happens and what to do, from links that check nothing to `uses` being sent whole: `references/pitfalls.md`.

## References

| File                                                                                                             | What it answers                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/packs/tables-and-types.md`                                                                           | types versus tables, reserved names, what an edit cascades into                                                                                |
| `references/packs/vocabularies.md`                                                                               | classification, resolvers, the path from resolving to committing terms                                                                         |
| `references/packs/relations-and-links.md`                                                                        | relations, pairings, the declaration on the table, linked records in one read                                                                  |
| `references/packs/embedding-profiles.md`                                                                         | the project's search model                                                                                                                     |
| `references/classification-runtime.md`                                                                           | the resolver flow's own functions: the threshold gate's two kinds, the browse tree; re-classifying a record; a term write the provider refuses |
| `references/embedding-profile-setup.md`                                                                          | the profile's `modelId`, `keywords` and `defaultChunking`; activation and rollback                                                             |
| `references/vocabulary-setup.md`                                                                                 | the table's vocabulary list, a parent's cardinality, term writes, resolvers and term edits                                                     |
| `references/api/tables.md` · `types.md` · `vocabularies-and-terms.md` · `relations.md` · `embedding-profiles.md` | every route's fields                                                                                                                           |

## Then

`kipory-retrieve` once records are embedded and a flow has to search them. `kipory-evolve` before changing any of this on a project that already holds records. `kipory-build` for the flows these rows reference — the processing flow a table binds (then come back and PATCH its `flowId` onto the table), and any vocabulary resolver you left unbound. `kipory-data` to write, see and query the records a table holds and the links between them. `kipory-diagnose` if a search step returns nothing after a profile change.
