<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Embeddings

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> a generation's derived geometry → the embedding's read itself. This pack carries judgment.

## What it is

An embedding is what a project's tables are indexed with when a field is marked `search`. It is
three choices and nothing else — the embedding **model**, whether each record's **exact words** are
indexed too (`matchExactWords`), and how text is split (`chunking`). You never name where a field
is stored: a table marks fields `search`, and the platform keeps each one in its own place in the
index.

One read shows them all: `GET /v1/projects/{nodeId}/settings` answers `embeddings` — the engine
default (what `default` would be created as now), the project's default key, and each embedding
with the tables that search with it, whether it is the default or the engine's, and why a delete
would be refused. A table stays on the embedding it was put on until told otherwise.

In the project document embeddings live under `project.ai.embeddings`, and one pointer says which
is the default:

```yaml
project:
  ai:
    defaultEmbedding: default # omitted = the embedding keyed `default`
    embeddings:
      default: { model: <model id>, matchExactWords: true, chunking: whole }
      long-text:
        {
          model: <model id>,
          matchExactWords: false,
          chunking: { tokens: 400, overlap: 50 },
        }
```

The row API (`/v1/embeddings`) spells an embedding the same way: `model`, `matchExactWords` and
`chunking`. A table's `uses.search` names an embedding with `embedding: <key>`, or names none
and takes the default.

**`default` is a reserved key that always resolves.** Naming it — `uses.search.embedding: default`,
`defaultEmbedding: default`, or leaving `embedding` out — on a project that has no `default` yet
creates it as the engine default: the inherited `embedding` model, exact words on, whole-record
chunking. So an exported document applies to a fresh project as it stands.

**The export states only what differs from the engine.** It prints the `default` row under
`project.ai.embeddings`, and a table's `embedding` line, only once they differ from what the engine
would make now (the `?defaults=show` form states them anyway). Stating them as the engine's default
changes nothing in a plan, and leaving a hidden row out is not a removal: `prune` never deletes it.

**The project's `ai` written without `defaultEmbedding` keeps the pointer** — it is not reset. Moving it
back is `defaultEmbedding: default`.

`matchExactWords` is worth deciding deliberately. With it on, every `semantic` query clause — in
`record.query`, `POST /v1/records/query` and the records list's `mode=semantic` — fuses keyword rank
with meaning on its own. Turn it on when exact words (names, codes, rare terms) must be findable,
and know two things: fusion decides the order, while each record's `score` stays the cosine of its
closest part, so a record a literal match lifted can rank above one that scores higher; and the
exact words indexed are those of one field per table — the first one marked `search`. `matchExactWords` is required on create;
say `false` for meaning alone.

An embedding's read also tells you `searchFieldsPerTable`: how many fields of one table on it may be
marked `search`. It is 4 on every embedding, whenever it was created. Marking one field
more is refused at the table save with `USES_SEARCH_FIELDS_OVER_LIMIT`, whose issue carries `limit`
and `marked`.

The **geometry** — how many dimensions, and which distance metric — is **derived** from the model
and returned read-only.

An embedding is also **the default way records enter the space**: `chunking` (required on
create). Chunking has exactly two forms: `"whole"` is one point per record, and
`{ "tokens": 400, "overlap": 50 }` splits each record's text into token-sized
pieces, each repeating `overlap` tokens of the one before (`overlap` must be below `tokens`). Any
other shape is refused. Every table that marks a field `search` against this embedding
inherits it unless its own `uses.search.chunking` overrides it — and omitting the override is the
common case.

**You pick a model. You never pick a dimension count, and you never pick a distance metric.**
The `model` is an embedding model's id from `GET /v1/ai-models?type=embedding`. Listed is not
the same as working: a provider whose account is out of quota refuses every embed. Before you
choose, read `GET /v1/ai-calls?project={nodeId}&origins=all&outcome=error` for recent
rows whose `errorCode` is `quota-exhausted`, by provider, and prefer a model on a provider
with none.

That inversion is the whole design. The metric is a property of the model it was trained for, and
choosing the wrong one does not raise an error — it quietly degrades every search you will ever
run. A dimension mismatch at least fails loudly; two models of the same dimension and different
training produce meaningless similarity scores with nothing anywhere reporting a problem.

## When you need it — and when you don't

- **Anything searchable is indexed by an embedding**, the one its table's `uses.search` names or the
  project's default. A project with none gets one: the first table that declares `search` and names
  no embedding creates `default` from the inherited `embedding` model, with exact words on and
  whole-record chunking, pinned from then on. Most projects want exactly one and never think about
  it again.
- **A second embedding is an advanced choice with a permanent consequence.** Two tables on
  different embeddings live in different physical collections by construction, so **no single query
  can search both.** Reach for one only when a table genuinely needs a different model, and know
  that you are partitioning your own search.
- **Not for changing an existing space.** The model and `matchExactWords` are not editable — see below.

Embedding is the model binding that works this way, because it is the one baked into every vector
you have already written: every other kind of model choice is stateless, so swapping it just changes
the next call.

⚠️ **A project has a SECOND vector space, and no embedding defines it.** Vocabulary-term vectors live
in a single system-wide space with one shared model, deliberately, so that terms stay comparable
across every project — a per-project model there would write incomparable vectors. It has its own
index, no embedding names it, and **activating an embedding's generation does not reindex it**. So the
whole of vocabularies (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`) — semantic resolution, seeded vocabularies, term matching —
operates outside everything on this page. Its model is the platform's `substrate-embedding` task,
read at the platform root: a project cannot move it. Binding that task anywhere below the root is
refused (422, `details.reason: "TASK_READ_AT_ROOT_ONLY"`); a project-node binding of `embedding` is
accepted, and moves record search, never terms.

⚠️ **An indexing failure does not surface on the embedding, the table or the record.** When the
embedding's model refuses (quota, outage), records stay `indexState: "never"` and the table's
`?expand=vectorProgress` keeps a non-zero `remaining`. The cause is only in the AI-call list:
`GET /v1/ai-calls?project={nodeId}&origins=projection&outcome=error` lists each failed embed with
its `errorCode` (`quota-exhausted`, …), and `GET /v1/ai-calls/{id}`
gives that call's `errorMessage`. A failed embed is retried three times within about fifteen
seconds, then only by the daily re-index sweep (08:00 UTC). Moving to a working model is a new
generation plus activate.

## The sequence

```
POST   /v1/embeddings                  create — model, matchExactWords, chunking; geometry is derived
PATCH  /v1/embeddings/{id}             label, chunking — with `version`
POST   /v1/embeddings/{id}/generations mint the next generation — another model or matchExactWords (free, inert)
POST   /v1/embeddings/{id}/activate    repoint declarations and reindex (expensive) — `{ version }`
DELETE /v1/embeddings/{id}             one generation; `?validateOnly=true` asks first
```

**Two numbers, and they are not the same thing.** `generation` is the number of the model-and-
`matchExactWords` pair the index was built with, allocated by the mint, never sent back. `version` is the row's
optimistic lock: send the value you read on the PATCH and on activate, and either is refused with
409 `VERSION_CONFLICT` if someone changed the embedding since. A missing `version` is a 422, never a
last-writer-wins save.

An activation answers `touched`: every table it re-pointed, each with the version it holds
now. Update the copies you hold, or the next PATCH to one of them is refused as stale.

Reading an embedding — one, or the project's list with the default first — gives you its `model`,
`matchExactWords`, `searchFieldsPerTable`, the derived geometry and how many tables use it. It names
no slot and no collection, and takes no `expand`.

Updating an embedding in place covers its label and `chunking`. Which one is the default is
the project's `ai.defaultEmbedding`, stated in the document's `project` section.
What defines a generation — the model, and `matchExactWords` — moves through a new generation instead.

⚠️ **Changing `chunking` is not a geometry change, and it is not free either.** No generation
is minted; instead every table on the embedding that does NOT override the default is
re-derived on the spot, and each one whose derived declaration moved is re-embedded in
the background — with the credits that costs. A table that sets its own `uses.search.chunking` is
untouched. A new generation copies the default onto itself.

**Geometry is resolved before the row is written**, so a model with no recorded dimensions or no
recorded distance is refused rather than stored half-usable.

## Why a new generation is two calls

Because the two halves cost completely different things, and collapsing them would hide that.

- **Minting is free and inert.** It creates the next generation of the same key from `model`,
  `matchExactWords` or both, taking the current generation's value for the one you leave out. It takes no
  lock: it writes a new row and leaves the one it starts from untouched. No declaration points at
  it, so nothing is provisioned and nothing is reindexed. A mint that changes neither the model nor
  `matchExactWords` is refused (`EMBEDDING_GENERATION_UNCHANGED`): a label is a PATCH.
- **Activating is the expensive half.** It repoints every searchable declaration on that key onto
  the generation and enqueues the reindex. The new generation's index starts
  **empty**, so searches return less while it drains. It answers the embedding, `movedTables` and
  `touched`, and changes no flow: no step names where a table is indexed.

Do not collapse them to save a round trip. The split is what makes the costly half a deliberate
act.

Activation is idempotent — activating what everything already points at is a no-op, not a
conflict. It is refused when a declaration would be invalid under the target — a field that no
longer exists, or a target whose model no longer resolves. ⚠️ And it takes an optimistic lock over **every**
table descriptor it moves, all-or-nothing, beside the embedding's own `version` you send: a
concurrent edit to the embedding or to any table in the set fails the whole activation with a
version conflict. Re-read and retry rather than assuming a partial
move landed.

**Activation is also the rollback, and a rollback is a second reindex.** It is direction-agnostic:
activating the superseded generation points every table back at it. But a record's entries leave
the old index as the record is indexed into the new one, so the old index empties while the new
one fills. Going back embeds the records that had already moved again, and bills them again. Only
a rollback made before the reindex reached a record finds that record still in the old index.

**Deleting a generation removes its index.** A generation no table uses can be deleted, and the
delete removes the search indexes it owns with it; the answer says how many (`indexesRemoved`), and
`DELETE …?validateOnly=true` warns of the same number first and removes nothing. Deleting the
superseded generation gives up even the partial rollback above: it can no longer be activated, and
going back to its model means minting a new generation, which indexes every record again. An embedding whose tables are all gone is deleted the same way.

## What the platform refuses

- **Deleting an embedding still named by a searchable table.** You do not have to discover it by
  trying: every embedding carries `deleteRefusal` — the delete's own code and sentence, or null —
  and the listing adds `canDelete`, which also folds in the ADMIN role the delete needs and whether
  the project is retired.
- **A model with no recorded distance metric.** Defaulting to a common one is tempting and wrong,
  for the reason at the top of this pack.
- **A new generation that changes neither the model nor `matchExactWords`.**
- **A slot name or a collection name.** An embedding's create and mint take a model and `matchExactWords`,
  and a `search` use takes no `role`: any member naming a place in the index is refused as an
  unknown member, on the route and in a project document, and so is a `collections` map under a
  document's `project.ai.embeddings`.

## Asking before you write — `validateOnly`

The create (`POST /v1/embeddings`), the PATCH (`PATCH /v1/embeddings/{id}`) and the
generation mint (`POST /v1/embeddings/{id}/generations`) each take **`validateOnly: true`** in
the body, and the delete takes **`?validateOnly=true`** — its verdict is the delete's own refusal,
the one the listing publishes as `deleteRefusal`. It runs the same decisions the write runs, writes nothing, and answers **200** with the
verdict every design dry run answers. Each finding carries the body `field` it is about where there
is one — an overlap the chunker could not advance past is reported on the `overlap` in `chunking` —
and the rule's own code (`EMBEDDING_KEY_INVALID`, `EMBEDDING_CHUNKING_INVALID`, …),
the same token the save's refusal names.

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
vocabulary's (which also carries `assignedTerms`); anything else in the query is refused.

- **The PATCH dry run plans every inheriting table**, exactly as the save does. A default
  that one of them cannot take comes back as a finding naming the table, before anything commits.
- **A taken key is a finding on `key`, not a 409.** Its absence is a snapshot, not a reservation:
  a create that lands in between still takes the key, and the save then answers 409 itself.
- ⚠️ **An invalid draft is not a failed request.** A 4xx still means the platform could not look at
  the draft — an embedding id that addresses nothing, or a role it will not serve.
- ⛔ **Gate on `severity`, never on `code`.** An unrecognised code is a generic finding of its stated
  severity.

## What will bite you

- ⚠️ **The PATCH dry run does not check your `version`.** The lock is checked by the save alone, so
  a verdict of `ok: true` can still meet a 409 when someone saved in between.
- **Generation numbers are never reused.** They are allocated above every generation the key has
  ever had, including ones whose row is gone but whose index was built. A reused number
  would resolve to an index that already holds entries at a geometry nothing re-checked.
- **The active generation is derived, not stored.** It is whichever generation the declarations
  point at — not the newest. A key whose tables are all
  non-searchable has _no_ active generation, which is honest: nothing is serving.
- **The key is immutable**, and lower-case kebab. Renames go through the label instead.
- **`searchFieldsPerTable` is the same on every embedding.** A second embedding is never the way to
  mark more fields: it allows the same number, and moving a table to it embeds every record again.
- **A field keeps its place in the index, and the table is still embedded again.** Unmarking one
  `search` field and marking another does not move the fields that stayed, so a search that names
  one keeps ranking on it. But marking or unmarking ANY `search` field changes the table's index
  declaration: every record of the table is embedded again — all its `search` fields — and billed.
  Send the table save with `validateOnly: true` first. Until the index takes on a newly marked
  field, a search naming it answers 503 with `details.reason: "index-not-built"`; send it again
  shortly.
- **A null geometry is a real state, not an error.** It means the embedding's model no longer
  resolves, or resolves without the facts geometry needs. The read reports it rather than failing,
  so you can see and fix it — but an embedding in that state is not going to serve a search.

## Related

- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — the `uses.search` settings
  that name an embedding, and the per-table override of its chunking.
