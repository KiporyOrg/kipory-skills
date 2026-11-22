---
name: kipory-model
description: Define a Kipory project's data model — tables and the types they refer to, what each field is for (`uses` — key, filter, search, stream, vocabularies), the vocabularies whose terms classify or tag records, the relations that link records, and the embedding that makes a table searchable. Use when deciding what kinds of things exist and how they connect, adding a field, a category list, a tag or a link to a table, making records filterable, unique or searchable, reviewing candidate terms, or when records never become searchable. On a project that already holds records read kipory-evolve first. Not for the records themselves (kipory-data) and not for the flows that process them (kipory-build).
license: MIT
---

# Model a project's data

<!-- field-ok: ownerId — a row's owner, not a request field -->

Five resources, four packs, and an order the packs do not state because each answers for one capability. Two facts most people get wrong:

- **A table has ONE storage declaration, `uses`**, grouped by use (`key`, `filter`, `search`, `stream`, `vocabularies`, `join`), sent whole; what it derives is read-only. A link is not a use: it is stated on the relation (`from: book.authorId`, `to: author`).
- **An embedding is live the moment a table's `uses.search` reaches it.** The project's embeddings sit in `project.ai.embeddings`, and `project.ai.defaultEmbedding` names the one a `search` use gets when it names none (else `default`). A new model re-embeds every table on it: the one expensive move.

## Before the first call

- Fetch the judgment for the resource you are about to touch: `references/packs/tables-and-types.md`, `vocabularies.md`, `relations-and-links.md`, `embeddings.md` (served live under `GET /v1/capability-packs/{id}`).
- Read `GET /v1/bootstrap?project={nodeId}&sections=schema,relations,project` first: everything modelled so far, in one call. Do not author what already exists.
- Every write here is EDITOR, except activating an embedding generation, minting one and every delete, which are ADMIN.

## The order, and why it is not arbitrary

**1. Embedding first, if anything will be searchable.** `uses.search` names one (`embedding: notes`) or gets the default; its `chunking` applies unless the table's overrides it. Naming `default`, or none, makes it if missing, from the inherited model (`matchExactWords: false`, `chunking: whole`). Exact words on (names, codes, ids): state your own.

```yaml
project:
  ai:
    defaultEmbedding: notes
    embeddings:
      notes:
        {
          model: <embedding model id>,
          matchExactWords: true,
          chunking: { tokens: 400, overlap: 50 },
        }
```

```
POST /v1/embeddings                    { project, key, model, matchExactWords, chunking, … }   → inert until a table names it
PATCH /v1/embeddings/{id}              { version, label?, chunking? } — a chunking change re-derives and re-embeds every inheriting type
POST /v1/embeddings/{id}/generations   { model?, matchExactWords? } — mint the next generation; changes nothing until activated
POST /v1/embeddings/{id}/activate      { version } — repoint every declaration on the key onto this generation and reindex
```

**The embedding's fields, and activation** — what `model`, `matchExactWords` and `chunking` take, and what activating a generation costs: `references/embedding-profile-setup.md`.

**2. Types, then tables.** A table references its type, so the type is authored first.

**A type refers to another type by id**, inside its schema (in the document the type row is its JSON Schema, its one note the row's `description`, up to 4,000 characters; the row API wraps it in `definition`), in one form only:

```json
{ "type": "array", "items": { "$ref": "#/$defs/<dataTypeId>" } }
```

- **The id, never the key** — on the row API and inside a document alike. A key there (`"$ref": "Row"`, `"#/$defs/Row"`) is refused `SCHEMA_DEFINITION_INVALID_JSON_SCHEMA`. A document re-spells flow and table references by key, but not this one.
- **Two new types where one refers to the other are two applies.** A new type has no id until it is applied: apply the referenced type first, read its `id` from the apply's returned `document`, then apply the type that refers to it.
- **Inline fields need one apply but name nothing.** An inline object is the anonymous `object`, not a named type, so a step reading a row's field of such a list gets no type for it: the save warns `STEP_INPUT_FIELD_UNTYPED` (`kipory-build`'s `references/utilities.md`, `value.transform`).

```
POST /v1/types                        a reusable set of fields
POST /v1/types/seed                   { project } — materialise the flow-provider types, idempotent
POST /v1/tables                          key, type, `owner` (`user` | `project`), processing flow, `uses`
PATCH /v1/tables/{id}                    replace `uses` whole; `searchable`/`queryable`/`relations` in a body are a 422
GET  /v1/tables/{id}?expand=uses         where each use landed, and which use kinds this deployment supports
PATCH /v1/tables/{id} validateOnly:true  what your PATCH body would do — derived declarations, reindex, restamp, the contract a
                                               type or flow move leaves (`derived.contract`), the verdict a `key` use gets
                                               (`derived.naturalKey`) — writing nothing
PATCH /v1/tables/{id} definition         rewrite the definition of the type the table points at — for every type, event and link that uses it
```

**A table and its processing flow name each other, so one of them goes first.** The flow's steps name the table by key and its input uses the table's type; the table names the flow by id. Create the table without `flowId`, build the flow (`kipory-build`), then `PATCH /v1/tables/{id} { flowId, version }` — or state the type, the table and the flow in one project document, which orders them for you. Add a processed field to `uses` only after the flow is bound: until then the table has no such field to name.

A field in `uses` is named bare when it is submitted data; a field the record does not submit is `{ field, family }`, the family `processed` (an output of the flow bound to the table — how a searchable `body` extracted from a file is named) or `computed`. `search` and `filter` take either; a relation's source field may be processed too; **`key` takes a submitted field only** (on a processed one it is refused `USES_KEY_NOT_SUBMITTED`). A `filter` on a processed field lets you filter, order and count on a value the flow computes, with no copy into the submitted data: it holds the record's stored flow output (what the last finished run wrote, or a flow's later `record.update` of it), and moves when that output changes. One refusal is its own: a submitted and a processed field of the same name cannot both be filters (`TABLE_QUERYABLE_INVALID`, `QUERYABLE_FIELD_NAME_CLASH`). A table's processed fields are its flow's outputs as they are now; a flow change needs no table save. While a filter, a search field, a relation or a stream use names a processed field, a flow or type change that removes it, or gives it a type that use cannot take, is refused with the declaration's own code (`TABLE_QUERYABLE_INVALID`, `TABLE_SEARCHABLE_INVALID`, `TABLE_RELATIONS_INVALID`, `TABLE_USES_INVALID`) whatever `acceptBreaks` holds, until the use goes (one project document may change both); a type a filter can still take is saved, and the stored records are re-stamped (a `restamp` consequence on the table's `contractChanges` row). What else such a change does to stored records: `kipory-evolve`.

`uses` is grouped by use: `{ key: sku, filter: [sku, price], search: [body], vocabularies: [cuisine] }`; a key that is also filtered is listed under both; `search` takes `{ fields, embedding?, chunking?, indexWhen? }` for settings; `filter` order means nothing. The `tables-and-types` pack has the whole statement.

The natural key is the `key` use on a field in `uses`: the save verifies every existing record first and refuses the whole PATCH with `409 TABLE_NATURAL_KEY_UNSATISFIED` if two share a value or any record cannot supply the field. **On a per-user table a key is unique per owner**: "each user follows a source once" is a `key` use on the source field, with no user id in the key. For a value unique to everyone (a handle) use `key: { field: handle, scope: project }`: another person's value is refused `409 RECORD_NATURAL_KEY_TAKEN` without their record; `onKeyTaken: "skip"` answers `keyTaken: true`, no `recordId`. A `uses` refusal is `422 TABLE_USES_INVALID` with every issue and its remedy in `details.issues`.

The builtin and library types are **synthesized on read**: they have no rows and nothing creates them. There is no `?seed=` flag on the read; the seed is the POST.

**3. Decide `owner` before any record exists.** It freezes the moment the first record is written, and so does the table's **type reference** (`TABLE_PINNED_BY_RECORDS`). Neither can be revised afterwards without deleting the rows. The table's **key** can be renamed later: its records move with it (ADMIN; the `tables-and-types` pack, renaming a table). A person's rows go in a per-user table (`owner: user`), no owner field or check: a person's run sees only theirs; a run for nobody (schedule, trigger, public endpoint, key) reads and changes all. Each row names its person as `ownerId`; a create names one with `userId`. When people must also read each other's records — a team's documents, a shared list — keep the table per-user and turn `sharing: true` on: each record stays its owner's and is shared with a person or a team record at `read`, `write` or `manage` (`kipory-data`, `references/sharing-records.md`). Unlike `owner`, `sharing` can be turned on after records exist.

**4. Relations, and the field that feeds them.**

```yaml
relations:
  written-by:
    {
      label: Written by,
      from: book.authorId,
      to: author,
      cardinality: many-to-one,
    }
```

```
POST /v1/relations                        send `declaration` and the producing field is spliced into the type in the same transaction
PATCH /v1/relations/{id}                  restate `from`/`to` or `between` to add or remove a pair
GET  /v1/relations/{id}?expand=readiness,liveLinkCount  blocked · inert · unproven · ready
```

A relation names tables by **key**: `from` and `to`, or `between: [{ from, to }, …]`, never both; a curated or join-record one names tables only (`producer: curated`). A `validateOnly` create forecasts readiness without counting links, so a draft can read `ready` there. The saved relation reads `unproven` until it carries its first link — but only on a read that also asks `expand=liveLinkCount`; without it a field or curated relation with no links reads `ready`.

Omit `declaration` and the relation is legal but produces nothing; readiness reports it `inert`. The field that feeds a relation is named on the relation, `from: <table>.<field>` (`element: { ref }` inside the long `from` for a list of objects), and the table's link and `relations` are derived from it. `expand=ends` reads its pairs (`{ from, to, id, deleteRefusal }`); restating the ends adds or removes one (removal: ADMIN). The relation's key can be renamed while links exist (ADMIN; links keep their ids — `references/packs/relations-and-links.md`, Renaming a relation); `producer` cannot. `producer` is `field` (implied by a `<table>.<field>` source, never written), `join-record` or `curated` and `cardinality` `many-to-one` or `many-to-many` — kebab, as every enum value on the wire. Every write here takes `validateOnly`: the save's verdict, unsaved.

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
| `references/packs/relations-and-links.md`                                                                        | relations, their ends, the declaration on the table, linked records in one read                                                                |
| `references/packs/embeddings.md`                                                                                 | the project's embeddings                                                                                                                       |
| `references/classification-runtime.md`                                                                           | the resolver flow's own functions: the threshold gate's two kinds, the browse tree; re-classifying a record; a term write the provider refuses |
| `references/embedding-profile-setup.md`                                                                          | an embedding's `model`, `matchExactWords` and `chunking`; activation and rollback                                                              |
| `references/vocabulary-setup.md`                                                                                 | the table's vocabulary list, a parent's cardinality, term writes, resolvers and term edits                                                     |
| `references/api/tables.md` · `types.md` · `vocabularies-and-terms.md` · `relations.md` · `embedding-profiles.md` | every route's fields                                                                                                                           |

## Then

`kipory-retrieve` once records are embedded and a flow has to search them. `kipory-evolve` before changing any of this on a project that already holds records. `kipory-build` for the flows these rows reference — the processing flow a table binds (then come back and PATCH its `flowId` onto the table), and any vocabulary resolver you left unbound. `kipory-data` to write, see and query the records a table holds and the links between them. `kipory-diagnose` if a search step returns nothing after an embedding change.
