<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Vocabularies

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`
> (design plane); the `vocabulary.resolve` function config → live `GET /v1/functions`. This pack carries
> judgment, not the field lists.

## What it is

A named, resolvable dimension you hang off records — a claim type, a category, a role, a tag.

A vocabulary does not hold a value. It declares **how a value is resolved** from a record's content,
and the resolved values land as terms linked to that record. One vocabulary per project and key.

The difference matters: a field stores what someone wrote; a vocabulary resolves what they meant
against a shared set of terms, so two records that say the same thing differently end up pointing at
the same term.

## When you need it — and when you don't

- **Against a plain field on the shape.** Use a field when a caller or a single action just
  _writes_ the value. Use a vocabulary when the value should be resolved against shared terms —
  deduplicated, reused across records, and able to nest. A field gives you a flat literal; a
  vocabulary gives you terms with reuse.
- **Against a relation.** A vocabulary classifies a record against its _terms_. A link
  joins a record to _another record_. If the thing on the other end is itself first-class — with
  its own fields and its own lifecycle — it is a relation (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`), not a
  vocabulary.

### Two questions, not one — decide both

A vocabulary's admission is two settings — "may this grow?" and "how does it find what it already
has?"

⛔ **They are independent only on the `semantic` arm.** Under `matching: "exact"` the resolve path
returns before the mint filter is ever consulted, so **`mint` is inert**: nothing is ever coined,
whatever you set. An `exact` vocabulary configured `active` in the expectation of growing
gets one that can never grow — and if nothing was seeded it reads `blocked`, not `ready`.

**`mint` — what a value it has never seen may become.**

- **`active`** coins a live term you can match against immediately.
- **`none`** drops the value and reports it unresolved.
- **`candidate`** coins a term that stays attached to the record that proposed it and OUT of the
  vocabulary until you activate it. The vocabulary's own later proposals reuse it; nothing else
  matches against a candidate. Activating one is a status change on the term
  (`PATCH /v1/terms/{id}`). A record read says which of its `terms` are candidates: each entry
  carries `status`. A `term=` condition on the records list and a query's `term` clause match
  **active** terms only, so a record filed under a candidate is not found by them until the term is
  admitted.

A value that is a word for nothing — `null`, `none`, `n/a`, or one with no letters or digits — is
never coined, whatever `mint` says. It still matches a term the vocabulary really holds under that
key; otherwise it is reported unresolved.

**`matching` — how a value it already has is found.**

- **`exact`** matches the slugified value and nothing else, in code.
- **`semantic`** dispatches to the vocabulary's resolver flow — embed, search, gate — so `ML` can
  reach `machine-learning`. It needs a resolver bound.

**A candidate is reused, so its records are a count.** A `candidate` vocabulary looks for a value
among its active terms and its own candidates, the same way it would look among active terms alone:
the identical key always matches, and under `semantic` so does a value the resolver scores at or
above the vocabulary's high threshold (or the tiebreak accepts). A second record about the same
thing lands on the candidate the first one coined, and that candidate stays a candidate. How many
records a candidate carries is the evidence for admitting it — read it from the terms list — and
admitting, merging or archiving is still your step: nothing activates a candidate on its own.

⚠️ Reuse is as good as the match. Short or differently worded values (`tv`, then `television`)
score low against each other and can still coin two candidates; merge them when you review. A
resolver flow of your own that states `status: active` on its `term.search` action searches active
terms only and reuses no candidate — leave the status unset.

Choose `none` when the value set is authoritative and finite, `active` when the vocabulary should
learn from what arrives, `candidate` when it should learn but not unsupervised. Getting `mint`
wrong is expensive in one direction only: `active` pointed at data it should not have been
learning from leaves you with a vocabulary someone has to clean up by hand.

⚠️ **`none` + `semantic` is the combination worth knowing about.** A fixed vocabulary that is still
searched by meaning: the model may say anything, the search finds the closest seeded term, and
anything it cannot find is dropped rather than coined. This was inexpressible while the two
settings were one field, and it is usually what people wanted when they reached for a closed
vocabulary and then found it would not recognise an obvious synonym.

⚠️ **Where "closest" stops is two numbers.** The default resolver's `resolutionParams` are
`lowThreshold: 0.3` and `highThreshold: 0.8`. A value whose best match scores at or above the
high one reuses that term; one at or below the low one is NEW — coined, proposed or dropped as `mint`
says; the band between goes to a decision model, which is shown the five nearest terms and picks
one or none. The band is wide on purpose: the score finds candidates and does not decide — a value
that means an existing term often scores near 0.5 against it, and so does a distinct neighbour.
Tune it with `PATCH /v1/vocabularies/{id}` `{ version, resolutionParams }`.

## Finding a resolver to bind

`GET /v1/vocabularies/resolvers?project=<nodeId>` lists every flow this project may bind as a
vocabulary's resolver — **your own flows and the platform's, in one call** — filtered to those whose
typed signature actually matches the resolver contract. Each row carries the flow's id, its display
`label`, its `key`, its scope (`project` or `system`), its `paramsSchema`, its
`paramsDefaults`, `platformDefault` and `paramsKind`.

⭐ **The filter is the point.** A flow whose signature cannot serve is not offered, so a binding you
make from this list cannot fail at ingest for being the wrong shape. The offered set is exactly the
set the runtime can load.

⚠️ **`paramsSchema` is what a `resolutionParams` bag for that resolver must look like** — so a form
can be typed from the resolver rather than from whatever values are already stored. It is `null`
when the resolver declares no parameters.

⭐ **`paramsDefaults` is what the platform itself would put in that bag**, so a client can show real
numbers before anything is stored rather than an empty box. It answers the question the schema
cannot: a threshold is a plain number with no declared range and no declared default, so the shape
of the bag tells you nothing about the values the platform applies when it binds a resolver on your
behalf. It is `null` for a resolver the platform has no default for — bind that one and you must
supply the values yourself.

⛔ **It is not advice, it is the same bag the create path would have stored.** Omitting
`resolverFlowId` on a create lets the platform choose a resolver and stamp its own parameters in;
sending that resolver's id together with these values produces the identical row. The two are
derived from one predicate, so a client that prefills from here cannot show numbers the create path
would have disagreed with.

⚠️ **`scope: system` means the platform owns it.** Bindable by you, editable by nobody outside the
platform. It reads at `VIEWER`, and it discloses a name and a parameter shape — never what a
platform flow does inside.

⭐ **`platformDefault` marks the platform's own pick** — `true` on the platform resolver that does
each job: the two-cut one the create path binds when you omit `resolverFlowId`, and the one-cut
one. Every other row is `false`, your own flows included, and when two platform flows fit a job
and neither is marked as its default, neither is flagged. Preselect from it rather than from list
order: the first platform resolver of a shape is not necessarily the one bound.

⭐ **`paramsKind` says what a resolver does with a value that is close but not exact** — the
platform's own classification, from the TYPE its `params` input declares. `thresholds` is the
two-cut resolver: reuse at or above the high cut, add a term at or below the low one, and hand the
band between them to a model. `reuse` is the one-cut resolver: reuse at or above its threshold, add
a term below it, no model call. It is `null` for a resolver declaring no parameters or a type the
platform has no reading of. ⛔ Do not infer it by counting the numbers in `paramsSchema` — two
unrelated numbers look exactly like two cuts. `platformDefault` with a `paramsKind` names the flow
the platform binds for that kind of decision.

## The sequence

```
GET   /v1/vocabularies/resolvers what this project may bind
POST  /v1/vocabularies           create the facet (identity, cardinality)
  … or build your own resolver flow …
PATCH /v1/vocabularies/{id}      bind resolverFlowId (and mint, matching, params, proposal)
  … then author the ingest flow that resolves it …
```

⭐ **You can skip the binding entirely.** Omit `resolverFlowId` on create and a `semantic` vocabulary
is bound to the platform's default resolver with its default parameters. Send an id to bind a
specific one; `resolutionParams` is **ignored unless you named a resolver explicitly**. Sending an
explicit `null` for `resolverFlowId` creates the vocabulary UNBOUND, which fails at its first
ingest.

⚠️ **Two things decide whether that default actually happens.** The create defaults are
`mint: active` and `matching: semantic`, and the auto-binding is keyed on **`matching`** — so a
vocabulary you left at the defaults gets a resolver, and an `exact` one never does because it needs
none. And the platform binds a default only when a **compatible** resolver exists for that
parameter shape; where none does, an omitted `resolverFlowId` still leaves the vocabulary unbound.
Read the vocabulary back and check rather than assuming.

⭐ **Naming a resolver and omitting its parameters takes that resolver's own defaults** — the same
bag `GET /v1/vocabularies/resolvers` reports as `paramsDefaults`, so what a form prefills is what the
create would have stored. An explicit `null` for `resolutionParams` still means none, and the two
are distinguishable on purpose: one is "you choose", the other is "I want it bare". A resolver
declaring a parameter shape the platform has no default for stores nothing either way, and you must
supply the values.

Scoped by the project's `OrgNode` id. Create takes the vocabulary key (camelCase, and it is the
identity), a label, a `cardinality` of `one` or `many`, and optionally a parent vocabulary key. A
term attaches to the whole record: model a part inside a record as its own table with a relation.

**The label is editable; nothing else about a vocabulary's shape is.** Renaming touches only the
display string — the key is the identity, so no term, no link and no stored resolution moves. There
is no merge: folding two vocabularies into one would destroy an identity, and that is a different
verb with different costs.

Resolver wiring is folded in by a later update, where **an omitted field preserves** — the
distinction to hold when patching, because "leave it alone" and "remove it" look nearly identical in
a payload. ⚠️ An explicit null clears only `proposal`, `resolverFlowId` and `resolutionParams`; on
`mint` and `matching` a null is a **no-op, not a clear**, because neither column is ever empty. And
⛔ **an OMITTED `resolutionParams` does not survive a binding change** — repoint `resolverFlowId` at
a different resolver and the params are replaced with that resolver's defaults. Send them explicitly
if you meant to keep yours. `version` is required on every vocabulary patch. A patch takes
**`validateOnly: true`** too: it answers a 200 verdict (narrow on `ok`) saying whether the patch
would be accepted, and writes nothing. The dry run does not judge the lock; the save answers a
stale `version` with 409 `VERSION_CONFLICT`.

## How a value actually reaches a record

This is the part that is most often got wrong.

**`vocabulary.resolve` writes nothing.** It computes resolutions and emits them. Under `semantic`
matching it tries the same exact key lookup FIRST and dispatches only what did not match to the
resolver flow — so a value that slugs to an existing term never reaches the resolver at all, and
cost estimates counting "every value" are too high. Under `exact` it matches directly and stops.
Then `mint` decides what may happen to a value the search did not find — ⚠️ on the `semantic` arm
only, since the `exact` arm returns before the mint filter is consulted.

Its output must reach **exactly one persistence sink**, and a `term.upsert` node is the usual one:
it persists, and it backfills parent links inside the same transaction, so a child term can point at
a parent minted in the same batch. ⚠️ **A resolver SUBFLOW is the exception** — one invoked by
another flow legitimately hands persistence off to its caller by binding the bundle to an ordinary
flow output, and adding a `term.upsert` there is not required.

⚠️ **`term.upsert` adds an assignment; it never replaces one.** A run that resolves a `one`
vocabulary to a different term than the record already carries fails when its writes apply: the
record goes `failed`, every write of the run is dropped, and `GET /v1/runs/{runId}/change-set` reads
`rejected` with `rejection.cause.kind: "unique-violation"` — while the timeline shows every action
applied. On a `many` vocabulary the new terms land beside the old ones. So re-classify a record only
on a clean run — `POST /v1/records/{id}/reprocess`, or `record.enqueue-process` with
`replay: clean`, both of which strip the record's terms first — or replace one vocabulary's terms by
hand with `PUT /v1/records/{id}/vocabularies/{vocabularyKey}`.

**A resolve flow with no sink at all resolves nothing** — the values simply never land, because
resolving itself succeeded and nothing failed. It is not silent at save, though: it warns there like
the others.

### Three more ways it lands nowhere, and every one of them warns at save

**The node can only write from a flow a table reaches.** `term.upsert` persists under a
committing run, and a run only commits when its flow was resolved FROM a table — live ingest
works that way, and nothing else does — flow preview never commits. A flow no table
reaches, directly or through any depth of `flow.invoke`, runs its `term.upsert` and discards
everything, on every run. Saving one warns, because a resolver sub-flow legitimately exists before
the parent that invokes it.

**And a vocabulary the table does not LIST is written but never read.** Resolution succeeds, the
assignment row lands, and every read of that record omits the value — a read returns exactly the
vocabularies named in its table's `uses.vocabularies`, in that order (the
tables pack (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) has the shape). Saving warns; adding the
vocabulary to the list afterwards surfaces every assignment already written, so nothing is lost by
saving first.

**And a vocabulary that cannot coin, with nothing seeded, resolves nothing — quietly.** The trigger
is `mint: none` **OR** `matching: exact`, whichever the other setting says: either one means no new
term can be produced, so an empty vocabulary can never produce anything at all. An exact lookup
finds no row, a semantic search runs over an empty collection, and the vocabulary is dropped from
the LLM's proposal schema entirely because there are no term keys to build its enum from. Saving
warns. ⚠️ Note the `exact` + `active` case in particular: it looks configured to grow and cannot.

That last one is worth separating from its neighbour. A `semantic` vocabulary with no resolver bound
is **refused**, because it throws at ingest and blocking the save turns an outage into a 422. An
empty vocabulary never fails at all: every ingest succeeds and the vocabulary simply resolves
nothing, which is precisely why something has to say so out loud.

<!-- field-ok: vocabularyFields — a `text.generate` FUNCTION CONFIG key, not a wire field; it reaches the
     API inside the opaque `functionConfig` blob, so no wire contract declares it by name. -->

**And one more, on the extraction side:** a `text.generate` action's `vocabularyFields` — the list of
`{ vocabularyKey, field }` pairs in its `functionConfig` — is what the run reads. The
`$vocabularyKey` markers on the type the action answers with are never read at run time, and no write
re-derives the list from them. Editing the type afterwards leaves the list behind: a marker you
added is never extracted, a marker you removed is still extracted into a field the type no longer
declares. The run succeeds either way. The flow's health warns
`LLM_GENERATE_VOCABULARY_FIELDS_DRIFTED`, naming the vocabularies the type added and the ones the
action still carries; the fix is to send the action's `functionConfig` again (`PATCH /v1/actions/{id}`)
with `vocabularyFields` matching the type's markers. Two save errors guard that write. Each pair's
`field` must equal its `vocabularyKey` (`LLM_GENERATE_VOCABULARY_FIELD_MISMATCH` otherwise). And
`outputs` must hold exactly one entry while `vocabularyFields` is non-empty — the slot the
vocabulary values are written to, named differently from the action's own output slot — and none when
it is empty (`LLM_GENERATE_VOCABULARY_OUTPUTS_MISMATCH`).

All four are warnings rather than refusals for the same reason: each names a state that is ordinary
while a project is still being assembled.

## What the platform refuses

- **A `semantic` vocabulary with no resolver bound blocks the flow save** with
  `VOCABULARIES_RESOLVE_SEMANTIC_VOCABULARY_UNBOUND_RESOLVER`. This is deliberately an
  authoring-time refusal rather than a runtime one. Hence the order above: resolver flow first, bind
  it, then author the flow that uses it.
- **Reserved keys are refused** with `VOCABULARY_KEY_INVALID` — the identity, content and metadata
  names the record shape already owns, along with `vocabularies`, `terms`, `tableKey` and the
  timestamps. A vocabulary's `key` is a **field key** — camelCase, starting lower-case — because it
  becomes a JSON property a model reads; it is permanent.
- **Do not give a vocabulary the key of a field of a table that surfaces it**, or a key every record
  row already carries — its status, files and cost among them. A record read carries each vocabulary
  as a top-level key, so vocabulary `cuisine` beside a submitted `cuisine` would answer every row
  with the term in place of the value. The vocabulary itself saves. The table's `uses.vocabularies`
  naming it is refused with `USES_VOCABULARY_SHADOWS_FIELD`, and a type edit that adds the field to
  a table already surfacing the vocabulary is refused with `TYPE_UNSAFE_FOR_TABLE`. A pair that
  arises any other way (a flow output of that name, say) is not refused; the table's
  diagnostics report it. Pick a key no surfacing table uses as a field name (`cuisineTag`).
  <!-- field-ok: cuisineTag — an example facet key a project would author, not a platform field -->
- **An empty label is refused** with `VOCABULARY_LABEL_EMPTY`, on the create and the rename alike.
  ⭐ Every one of these refusals carries the field it is about on `details.issues`.
- **A parent vocabulary is cardinality `one`** (`VOCABULARY_PARENT_CARDINALITY` on the child's
  create): a child term hangs under exactly one parent term, so the record must carry exactly one.
  This is a product decision, not a detail — every record gets ONE top-level value, and
  `cardinality` has no PATCH. Before seeding a parent vocabulary, ask of every pair of its terms
  "can one record be both?". Where the answer is yes (a term for a field and one for a part of that
  field, two names for neighbouring ideas, a term whose meaning depends on the reader), fold the
  narrower one into the child vocabulary under the broader, or drop it. A term's key is permanent,
  so this is cheapest before the first seed.
- **A vocabulary cannot nest under itself** (`VOCABULARY_PARENT_SELF`). The hierarchy is a chain of
  VOCABULARIES, not a tree of terms inside one: each level is its own vocabulary with its own
  admission, resolver and surfacing tables, which is the whole reason it is a separate vocabulary.
- **A stale `version` on update is refused**, and the field is REQUIRED.
- **A parent term sent for a TOP-LEVEL vocabulary is refused**, on both write paths — creating one
  term and bulk-seeding a batch. If you sent a parent, you meant something by it, so neither path
  drops it and lands the term at the top level.
- **An unknown key inside `proposal` is refused.** The bag is closed: guidance prose, a list of
  worked examples (each a term `key` and its `label`; the key must be one a term could hold —
  lowercase segments joined by `-`, at most 128 characters — or the write is a 422), and a flag permitting an empty answer — the exact shape the live schema
  declares, and nothing beside it. A misspelled key is a 422 at the moment you write it.

## Is this vocabulary actually doing anything?

Ask the vocabularies read for its readiness and it answers in one of four states,
worst first.

**Blocked** means it cannot work. Either it needs a resolver flow and has none
bound, in which case resolving it fails the run, or it cannot mint and
it holds no terms, in which case it can never produce a term. Both are
configuration you can fix.

**Inert** means it works and reaches nobody: no table surfaces it, so its
values are stored and never returned by any read. The terms are real, the
labelling happened, and every response omits it.

**Unproven** means nothing has flowed through it — either ever, or not for a
long time. This is deliberately not an error. A vocabulary authored an hour ago has
resolved nothing and is fine; the same vocabulary a year on is a question, and the
state lets you tell which one you are looking at rather than deciding for you.

**Ready** means configured, surfaced, and resolving.

Every reason is reported, not only the one that set the state — a vocabulary can be
both unbound and unsurfaced, and fixing only the one named leaves it broken in a
way you were already told about. Each reason carries a stable code to branch on
and a sentence to show a person.

Readiness is a different question from whether the substrate is internally
consistent. That check reads tables, indexes and constraints, and a project in
which every vocabulary is inert passes all of it. A green consistency badge has never
meant the vocabularies were doing their job, and now there is something that does.

Two timestamps back this. A vocabulary records when a value for it was last written
to a record, and a term records when it was last chosen rather than minted.
Both start empty and fill from the first resolution after they began being
recorded, so an empty one means nothing was observed, never that nothing
happened. A preview run does not count — only values that actually landed.

## Who feeds this vocabulary?

Ask the vocabularies read with `expand=wiring` and each vocabulary lists the flow nodes that put
values into it: the flow (`flowId`, `flowKey`, `flowLabel`) and node (`actionId`, `actionKey`), and
how — `extracted` (a `text.generate` action lists it in `vocabularyFields`), `proposed` (a
`vocabulary.resolve` action lists it with no slot feeding it, so its own model call proposes values)
or `fed` (a `vocabulary.resolve` action reads candidates from a slot, with no model call). It is the
same scan the platform's own wiring view reads, so a node whose configuration does not parse
contributes nothing, exactly as it would contribute nothing to a run.

⚠️ **Two flags on an `extracted` row are about drift between a node and its type.** `drift` is a
sentence, set when the node's stored `vocabularyFields` no longer matches the `$vocabularyKey`
markers on its response type — the same sentence the save-time warning carries. `declaredOnly` marks
a row that exists only because the TYPE marks the vocabulary while the node has not captured it yet:
nothing reaches the vocabulary from that row until the node is re-derived from its type.

⛔ **An empty list is weaker than "nothing fills it".** The scan reads configuration, and a
`vocabulary.resolve` action can pick a vocabulary up from a slot it discovers at run time without
naming it anywhere. Empty means no node's configuration names this vocabulary.

## Adding terms — one or many, under the vocabulary

⭐ **A term is created on its vocabulary, and only there.** `POST /v1/vocabularies/{id}/terms` takes
one row or up to 500, each `{ key, label }`, under one `parentTermId` when the vocabulary nests
under another: the terms are operator-authored, embedded for search, and bound by the parent rules —
a nested vocabulary requires an active, canonical parent term of its parent vocabulary, and a
top-level vocabulary refuses a parent (`TERM_PARENT_UNEXPECTED`) rather than dropping it. A key the
vocabulary already holds under that parent is reused and reported `existed` with the held term's id
— not a conflict — so re-sending a grown list is safe. This route is the only way to create a term —
one row is a list of one.

⚠️ **An `existed` row reports the term as it IS, not as you sent it.** Its `label` and `status` are
the stored ones: a seed never relabels a term and never revives an archived one. A `label` that
differs from yours, or `status: "archived"`, means nothing was created — `PATCH /v1/terms/{id}`
renames or restores it. A seed whose embedding call answers no usable vector is 502
`UPSTREAM_FAILED`, as a rename's is, and writes nothing.

**`key` is optional**. Omit it and the platform derives one from the label.

⛔⛔ **Coining it yourself is how a vocabulary stops matching.** A term's key is
what record ingest matches on, and a client deriving its own has to reproduce
the platform's normalization exactly — including that an accented letter
decomposes before it is filtered. When the two disagreed, `Crème brûlée` was
seeded under one spelling and looked up under another: the records never
resolved, and a create-new resolution minted a **second term for the same
concept**. Pass a key only when the identity matters more than the match.

### Asking first — `validateOnly`

The same route takes **`validateOnly: true`**. It runs every rule the seed
runs, writes nothing, and answers 200 with a verdict and the rows it would
write:

```json
{
  "ok": true,
  "complete": true,
  "diagnostics": [],
  "derived": {
    "terms": [
      { "key": "creme-brulee", "label": "Crème brûlée", "outcome": "created" },
      { "key": "water-damage", "label": "Water Damage", "outcome": "existed" }
    ]
  }
}
```

⭐ **`derived.terms` answers two things before you seed**: the
permanent name each row would get, and which rows a term already holds. The
second is a read of the moment — another seed landing first turns a `created`
into an `existed`, which is a normal success either way, because this route is
idempotent.

⛔ **One status, two bodies.** Being idempotent is exactly what leaves no second
success code for a verdict: a `200` is either the seeded batch or a verdict
about one that was not seeded. Narrow on `ok`, which only the verdict declares.

⚠️ **`ok: true` does not embed.** The real seed — like a relabelling
`PATCH /v1/terms/{id}` — embeds every term's text **before** it writes, on the platform's shared
term model (the `substrate-embedding` task, read at the platform root; a project cannot rebind it,
and binding it at a project node is refused with `TASK_READ_AT_ROOT_ONLY`). A provider refusal fails
the whole write with nothing saved, **whatever the vocabulary's `matching`** — an `exact` vocabulary
embeds its terms too. There is no project-side workaround; retry once the provider answers.
`qdrantUpsertFailures` (and a single term's `reembedWarning`) is a different, later failure: the
rows saved and the vector-store write after them did not.

⚠️ **`ok: true` does not check the parent's existence.** A parent term is
resolved inside the write's own transaction; the dry run knows only whether one
was supplied where one was required. A parent id naming nothing is still a 422
from the write.

⚠️ **An invalid batch is not a failed request**, and `complete: false` means
checking stopped early. Gate on `severity`, never on `code`.

### Asking a vocabulary first — `validateOnly` on the create

`POST /v1/vocabularies` takes **`validateOnly: true`** as well. It runs every rule the
create runs — the key's charset, the reserved list, the project-wide uniqueness,
the parent's existence and cardinality, the admission knobs — and answers 200
with a verdict plus the state the vocabulary would be BORN in:

```json
{
  "ok": true,
  "complete": true,
  "diagnostics": [],
  "derived": {
    "readiness": {
      "state": "blocked",
      "reasons": [
        { "code": "VOCABULARY_EMPTY", "state": "blocked", "message": "…" },
        { "code": "NOT_SURFACED", "state": "inert", "message": "…" },
        { "code": "NEVER_RESOLVED", "state": "unproven", "message": "…" }
      ]
    },
    "resolverFlowId": "flw_…"
  }
}
```

⭐⭐ **`derived.readiness` is the combination warning, before the vocabulary exists.**
A new vocabulary has no terms and nothing surfacing it — those are FACTS about a
row that has not been written, not counts nobody loaded — so the state it will
arrive in is fully knowable. The `exact` + empty case this pack warns about
twice reads `blocked` HERE, rather than after you create the vocabulary and read it
back.

⛔ **`blocked` is not a refusal.** `ok: true` beside it means the create would
succeed and the vocabulary would arrive needing work. Gate on `ok`; read `readiness`
to know what work.

⭐ **`derived.resolverFlowId` is the resolver the create would bind** — the one
part of the outcome you cannot compute, because whether the platform HAS a
default for that parameter shape is a platform fact. `null` means the vocabulary
would be born unbound, which for `semantic` matching is why `readiness` reads
`blocked`.

⛔ **A key already taken rides the 200 as a finding on `key`**, where the
real create answers `409`. Both are the platform having read your draft; only
one of them is a status a form can render under an input.

⚠️ **`derived` is absent when the draft is refused** — there is no binding to
look up and no readiness to forecast. Absent and "full of defaults" are
different claims, and only one of them is true.

## What will bite you

- **Deleting a vocabulary cascades** — it unlinks the vocabulary from every table that used it,
  removes all its terms, and can strip labels off records. ⛔ Ask the delete itself first, with
  `validateOnly=true` in the query: it answers a 200 verdict saying whether the delete would be
  allowed and, under `derived`, the blast radius it would reach — before anything is written. The
  real delete's response carries only COUNTS, not the list of what was hit.
  ⚠️ Send the SAME query you intend to delete with. A destructive delete is refused without
  `confirm=true`, and a vocabulary with assigned terms also needs an `assignedTerms` disposition, so
  a dry run that omits either answers the refusal you would have got — which is the point of asking.
- **`vocabulary.resolve` runs inline, not queued.** It dispatches sub-flows bound to the live run:
  depth and cycle guards, the provider cache, the tenant scope, billing. That is precisely why it
  cannot be moved off into background processing, and why a slow resolver makes ingestion slow.
- **Terms are the vocabulary substrate; there is no separate taxonomy resource.** Vocabulary
  statistics and samples are computed over terms.
- **A term carries a `version`, and its writes are locked on it.** `GET /v1/terms` publishes it;
  `PATCH /v1/terms/{id}` (rename, archive, restore or admit — both a label and a status in one call
  is one write) and `POST /v1/terms/{id}/merge` (the absorbed term's) require it, and a stale one
  answers 409 `VERSION_CONFLICT`. Every author write to a term's label, status, parent or alias
  moves it — a vocabulary delete archiving a term included — but ingest never does: a record
  matching a term, or its vector being re-synced, leaves your `version` current. The PATCH takes
  `validateOnly: true` and answers the save's refusals (an unchanged label, restoring a merged
  alias) as a verdict, writing and embedding nothing.
- **A term is deleted only when nothing points at it** — no record carries it, no term nests under
  it, no merged alias points at it; otherwise `DELETE /v1/terms/{id}` is a 409. ⭐ Read
  `GET /v1/terms?expand=usage` first: each term carries `deleteRefusal`, the delete's own check —
  `null` when the delete would be accepted, else the code and sentence it would refuse with. Offer
  the delete where it is `null` rather than re-comparing the three counts beside it. ⚠️ Absent means
  you did not ask for usage, which is not the same as deletable, and a reference that lands between
  the read and the delete still refuses it (`TERM_DELETE_RACE`). `DELETE /v1/terms/{id}?validateOnly=true`
  asks the delete itself, writing nothing.
- **What is wrong with a vocabulary is a read, not something to recompute.** `GET /v1/terms`
  with `expand=findings` answers `findings`, most severe kind first: `dangling-alias` (a merged
  term whose canonical is gone), `orphan-parent` (a `parentId` naming a term the project does not
  hold), `unattached` (a parentless term on a vocabulary that nests) and `duplicate` (canonical
  terms of one vocabulary and one parent whose labels make the same key — one finding per colliding
  group). ⛔ The checks always run over the WHOLE project; `vocabularyKey` narrows only which
  findings come back. ⚠️ Absent means you did not ask, and an empty list means the check ran and
  found nothing. Every kind is certain — there is no fuzzy near-duplicate pass, because the remedy
  is a merge and a merge has no undo.
- **A vocabulary that looks builtin is just a row.** Anything shipped as a default is an ordinary,
  editable vocabulary — but its resolver wiring may never have been bound. Verify a vocabulary's
  live binding before assuming it resolves anything.

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
vocabulary's (which also carries `confirm` and `assignedTerms`); anything else in the query is
refused.

## Related

- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — what a vocabulary attaches to,
  and the `uses.vocabularies` list that says which tables surface it.
- Relations & links (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`) — when the value is a record rather than a term.
- Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`) — building the resolver, and the ingest flow that uses it.
- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — a vocabulary before the table that uses it; a parent
  vocabulary and a parent term before their children.
