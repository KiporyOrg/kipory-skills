<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Record types & schema entries

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> The reserved field set is listed below. This pack carries judgment.

## What they are

- A **schema entry** is a named shape in the project's registry — reusable, referenced by skills
  and by record types.
- A **record type** is a named kind of stored record. It does **not** inline a shape; it
  _references_ an entry for its data shape, and optionally binds a flow whose output slots become
  the type's derived fields.

They are separate resources on purpose: shapes are authored once and reused, while a record type
is a thin descriptor pointing at one.

> The operator UI calls record types **"Entities"**. That is a display name only — the API
> resource, its wire fields and this pack all say record type.

## When you need which

- **A reusable shape** — a payload schema, a model's output schema, a nested object used in
  several places — is a **schema entry**, referenced from skills.
- **A kind of record people create and the system processes** is a **record type**, referencing an
  entry for its data and optionally a flow that processes it.
- **Derived fields are not authored.** They are _captured_ from the bound flow's output slots. To
  change a record type's output shape you edit the flow, never the record type.

## The sequence

```
POST /v1/schema-entries       author an operator shape
POST /v1/record-types         create the type, referencing the entry — and say what its fields are FOR (`uses`)
PATCH /v1/record-types/{id}   bind a flowId to make it flow-backed; replace `uses` whole

# Not part of the sequence — the builtin and library shapes are synthesized on
# read and have no rows, so nothing seeds them. This route re-materializes the
# infrastructure-tier Flow-Provider entries only, and is idempotent:
POST /v1/schema-entries/seed
```

### A shape of the type's own

A shape only one record type will ever use does not have to be a shared registry entry. In a
project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`), state the shape INLINE under the type —
`records.<name>.shape` as the shape itself rather than an entry's name — and one apply creates the
entry, the record type and the ownership together. Such an entry is OWNED:

- it is edited only through its record type's `shape`; a registry PATCH answers
  `SCHEMA_ENTRY_OWNED`, naming the type. A registry PATCH that lands answers the row and its
  `touched` list — every event type and record type whose version moved with it — as the record
  type and flow PATCHes do;
- no other record type, event payload, relation kind, config namespace or profile may use it —
  same code, same naming. A flow's slots and a step's schema references MAY name it: the type's
  own processing flow has to;
- the registry read marks it `owned: { recordType }`, and the document exports it nested under
  its owner and not under `schema`.

`POST /v1/schema-entries/{id}/promote` with the entry's `version` makes it an ordinary shared
entry. It is one way — by then other rows may depend on it — and it changes no shape and re-points
nothing. Deleting the owning record type — or re-pointing it at another shape — releases the shape
the same way rather than deleting it or stranding it.

Both are scoped by `project`. Reads take useful expansions: the synthesised derived output shape,
a **drift** verdict, and the type-relation graph.

## The model to hold

1. **The data shape lives on the registry and is referenced softly.** A record type points at an
   operator-authored object entry. What you see on the record type's wire shape is a **read-only
   projection** of that entry — there is no inline definition to edit.
2. **Flow-backedness is just a bound flow.** There is no separate flag and no named output type.
   Binding captures a snapshot of the flow's signature, and that snapshot's output slots become
   the type's flat derived fields.
3. **Drift is a first-class read**, and it has **five** answers, not two: `ok`, `drift`,
   `flow-missing` (bound to a flow that no longer exists — nothing to re-capture from),
   `uncaptured` (bound, but no snapshot was ever taken), and `not-flow-backed`. ⚠️ Never read
   `uncaptured` or `flow-missing` as `ok` — neither means "matches"; both mean there is nothing to
   compare against, and `flow-missing` is the actionable one. Branch on those literals: `ok` and
   `drift` are the wire values, not "clean" and "drifted".
4. **A type declares no source families, and never usefully did.** The wire used to carry a
   `families` list naming what a type could emit. It is **retired** and no longer on the read.
   Three of its values simply restated the flow binding, and the other two — attached files and
   committed facet terms — were never something a type could declare: files attach to any record,
   a flow commits terms to any record, and `entity.read` / `entity.list` honour their facets and
   files include-flags for every type. Ask the flow binding what a type derives; ask the record
   what it holds.

## Which shapes may be a data shape — ask the server, do not guess

A record type's data shape must be an **operator** entry, object-shaped, that
**compiles** against the project registry, whose top-level field names are
letter-led alphanumeric and collide with no reserved system field. Five gates,
and the last three are the ones that surprise people: a shape with a field
called `id` or `createdAt` is refused, and so is one whose name carries an
underscore.

Every schema-entry read therefore carries **`recordTypeEligible`** — the
server's verdict, from the same gates the save runs. There is a sibling flag,
`profileEligible`, answering the same kind of question for the end-user profile.

A third, **`facetExtractable`**, answers a question the save never asks: would a
`$facet` marker on one of this type's fields be READ? Only where a
`text.generate` step answers with exactly this type does a marker become that
step's facet extraction. Anywhere else — including a step answering with a
_list_ of the type — a marker saves cleanly and extracts nothing, because the
save checks the marker's name, uniqueness and facet, never whether anything
reads it.

⚠️ **Do not re-derive any of them.** Object-shapedness is not the gate, and
treating it as one is a live way to build a picker that offers a shape the save
then refuses — which is exactly what the operator UI did until it started
reading this flag. Filter on the flag and a refusal becomes impossible to reach
by choosing.

## What a keyword on a field does — ask the server, do not guess

A keyword in a stored definition is not a constraint just because it is there.
Validation reads a fragment's `$ref`, `const`, `allOf`, `enum`, `oneOf` or
`anyOf` **before** its `type`, and whichever it reads first decides the value —
so `{"type": "string", "enum": ["ab"], "minLength": 5}` accepts `"ab"`: the
`minLength` is never compiled. Reading `type` alone gets that wrong, and a tool
that did so told operators a length bound held when it did not.

`GET /v1/schema-entries?expand=keywords` adds **`keywordVerdicts`** to every
entry: one row per keyword per fragment, keyed by `pointer` (the fragment's
place in the definition), with `enforcement` — `enforced`, `ignored`, or
`conditional` when validation ignores it but something else reads it (a config
namespace serving a top-level `default`, the end-user profile seeding one, facet
extraction, relation declarations) — and a `reason` naming which. The verdict is
about the document as stored: after an edit, read it again. The keywords that
are the definition's structure carry no row — `type` and `$ref`, the object's
`properties` with its `required` list and `additionalProperties`, a list's
`items`, and `x-field-order` — nor do the two labels, and a `$ref` target's
keywords are that entry's own rows. Absent means not asked; an API older than the
`keywords` expand refuses the whole read with a 422.

### Ask about a definition you have not saved: `POST /v1/schema-entries/{id}/keywords-preview`

The read judges the document as stored. To know what an EDIT would do before you
save it, send the whole draft definition — exactly as the PATCH would carry it —
to `POST /v1/schema-entries/{id}/keywords-preview` (`{ "definition": { ... } }`).
The answer is `keywordVerdicts` in the read's shape, computed by the same function
with the same bindings: whether a `default` is read depends on what binds the type
now (a config namespace, the end-user profile), and those come from the stored
type the path names, never from the body. Send the stored document and you get
exactly the read's rows. Nothing is written and nothing is validated — a draft the
save would refuse still gets an answer, which is how you see the unread keyword
the save would refuse before you send it. It needs EDITOR on the type, like the
PATCH, and a retired project refuses it like any other write.

For a type you have **not created yet**, ask `POST /v1/schema-entries/keywords-preview`
with `{ "project": "<node id>", "definition": { ... } }` — the same answer for a
type nothing binds, which is what a new type is until something does. It needs
EDITOR on the project node. To check the create itself, send the create body to
`POST /v1/schema-entries` with `validateOnly: true`.

## Owner scope — whose records are these?

Declared on the type, and every generic reader, writer and processor branches on it.

- **User-scoped**: records belong to one end user. Creation requires the run's
  authenticated user, and reads are pinned to them.
- **Project-scoped**: the type is the project's **shared pool** — ingested once, read by everyone.
  Rows carry no user, creation needs no user (so a schedule can write), and the idempotent id
  substitutes the project for the user, so repeated ingests of one payload converge on **one**
  record rather than one per subscriber.

**Scope freezes once records exist** (`RECORD_TYPE_PINNED_BY_RECORDS`). Decide it before you
write anything, because unwinding it means deleting the data.

⛔ **`ownerScope` is therefore REQUIRED on `POST /v1/record-types`.** It used to be optional and
default to `USER`, which meant a create that never mentioned it made this permanent decision on
your behalf — and you could not undo it after the first write. A body without it is now refused.

⚠️ **`PATCH` keeps it optional, and that is not an inconsistency.** There, omitting a key means
_keep the current value_, which is a real answer. On a create there is nothing to keep, so silence
is not an answer at all.

⚠️ Pool types have real limits in this version, and they are limits of the _machinery_, not
oversights: **no file attachment**, **no per-record teardown**, and **no file-producing handlers
in the bound flow** — all of that is per-user end to end. A pool processing run carries no user
at all, so **a flow that reads user attributes cannot run under one**: the provider fails closed.
Read configuration through the project attribute instead. Billing lands on the project's payer.

## One statement of what each field is for: `uses`

A record type carries ONE storage declaration, `uses`, and everything the platform stores about
its fields is derived from it. Per field, a list of what the field is **for**:

- `filter` — an indexed column; the field can be filtered on, in the record store and the vector
  index alike (the derived `queryable` list, in this order).
- `search` — the vector index; `{ "kind": "search", "role"? }`, the text is embedded (the derived
  `searchable` document).
- `link` — the edge store; `{ "kind": "link", "relation", "element"? }`, the field holds a record id,
  or is a list of objects whose `element.ref` does (the derived `relations` document).
  `element.filters` names the sibling properties to carry on the edge and filter on — see
  "Filtering on the data an edge carries" below.
- `stream` — the stream store; `{ "kind": "stream", "at", "filters"?, "retainDays"? }`, the field is
  a list of timed events that grows without bound, appended never assigned — see "A list that grows
  without bound" below.
- `key` — the natural-key index; the field identifies the record (the derived `naturalKey`).

There is no `file` use any more. It was retired on 2026-09-24: it derived nothing, nothing read it,
and it was legal only on a field whose type was already File — which is what uploads, storage and
processing go by. A statement still naming it fails request validation (`422 VALIDATION_FAILED`),
not a `RECORD_TYPE_USES_INVALID` issue.

And three statements about the **type**, beside the fields: `search` (the embedding profile, with
optional overrides of `chunking` and `stages`, and of `indexWhen` and `isolationGroup` — required iff a field is
marked `search`), `join` (this type IS an edge), and `facets` (the ordered facet keys the type
surfaces — a facet is not a field, so it is not a use of one; see "Which facets a type surfaces").

```jsonc
{
  "uses": {
    "fields": [
      {
        "source": { "family": "submission", "field": "externalId" },
        "uses": ["key", "filter"],
      },
      {
        "source": { "family": "submission", "field": "body" },
        "uses": [{ "kind": "search" }],
      },
      {
        "source": { "family": "submission", "field": "publishedAt" },
        "uses": ["filter"],
      },
      {
        "source": { "family": "submission", "field": "sourceId" },
        "uses": [{ "kind": "link", "relation": "published-by" }],
      },
    ],
    "search": { "profileId": "prof_…" },
    "facets": ["topic", "language"],
  },
}
```

⛔ **`searchable` as well as `queryable` and `relations` are READ-ONLY on the wire.** They are derived from
`uses` and reported beside it; a create or patch body naming any of them is a `422` from the strict
schema, and there is no merge form of anything — `uses` is **sent whole**. Order matters for exactly
one use: `filter` fields are assigned storage slots by position, so reordering two of them moves
their values to different columns and re-stamps every record. A patch that omits `uses` keeps the
stored statement.

⭐ **The read tells you where each use landed: `GET /v1/record-types/{id}?expand=uses`.**
`usesRouting` carries `supported` — the use kinds THIS deployment has a reader for — then per field,
per use, the store it routed to and the physical handle it got (the slot column for `filter`, the
profile slots for `search`, the producer key for `link`), and the surfaced facets with their
positions. Offer exactly the kinds `supported` lists — every word in the vocabulary has a reader
today, so the list is the deployment's statement, not a promise.

**A refusal derives nothing.** Every issue comes back at once as `422 RECORD_TYPE_USES_INVALID`, and
`details.issues[]` carries per issue a `code` to branch on, the `path` into your statement, the
`field` and `use` it is about, and a `remedy` — what to do instead, never empty. Branch on the code:
`USES_FIELD_UNKNOWN` (no such contract field), `USES_ILLEGAL_FOR_SHAPE` (that shape cannot be used
that way — an object cannot be filtered, a number or a file cannot be a key), `USES_TWO_KEYS`,
`USES_KEY_NOT_SUBMITTED` (a `key` on a field that is not submitted data, such as a flow output),
`USES_SEARCH_NO_TEXT`, `USES_SEARCH_SETTINGS` (a `search` use with no `search` settings, or the
reverse), `USES_FACET_UNKNOWN`, `USES_RELATION_UNKNOWN`, `USES_MARKER_DISAGREES` (the entry already
marks the field as a reference to a different type), and for `element.filters` on a `link`:
`EDGE_FILTER_NOT_FILTERABLE`, `EDGE_FILTER_BUDGET_EXCEEDED`, `EDGE_FILTER_TYPE_CONFLICT` (below).
Nothing is written on a refusal — not the statement, not a projection, not a marker.

## Making a type searchable

Marking a text field `search` and naming an embedding profile (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`) in
`uses.search` is the **only** way a type gets vectors. The `searchable` document you read back is
derived from that: which fields fill which vector slots (a `search` use fills the profile's default
role — its first dense slot, plus the sparse slot if it has one — unless `role` names another dense
slot), how they are chunked (the profile's `defaultChunking`, unless `uses.search.chunking`
overrides it), and which fields travel with each point (every `filter` field, and only those).

Nothing physical happens when you save. The collection is **derived** from the project, the
profile and its version, the owner scope and the isolation group, then provisioned in the
background. Nobody names a collection.

Three consequences that catch people out, and only two of them fail _silently_:

- ⚠️ **A field must carry `filter` to be filtered on** — see below. Only those get an index.
  ⭐ This one is **loud**: a `vector.search` filter naming an undeclared key is refused at plan
  time (`SEARCH_FILTER_KEY_NOT_FILTERABLE`). It used to save clean and match nothing at runtime;
  that silent-zero behaviour is a closed defect, so read the refusal as the platform naming the
  fix rather than as a broken search. (The operator records list is different: a condition beside
  a meaning-based search there is answered by the **record store** first, and the ranking runs
  over what it kept — so a `filter` field the points do not carry still narrows, exactly.)
- ⚠️ **The tenant key is the scope key, not the user id.** Filtering by user id against a derived
  collection matches nothing, silently. The scope key holds the user for a user-scoped type, the
  project for a pool type, and the session for a preview write.
- **Turning searchable off does not delete the points immediately.** A background pass notices and
  removes them later.

⚠️ **Moving the derived searchable declaration re-embeds every existing record, and re-embedding
costs credits.** Marking a different field `search`, changing its role, changing the profile, or
changing the chunking — on the type, OR on the profile's default that this type inherits — makes
every stored record's points stale, and the background reconcile re-runs each record's projection,
embedding calls included. The save itself is instant; the spend arrives record by record as the
re-embed drains. Three changes that look adjacent are **not** in that set: adding or removing a
`filter` rewrites each stored record's vector payload in place with no embedding calls (no credits —
see "Making fields filterable"), dropping the last `search` use deletes the points without spending
credits, and re-pointing the bound flow or the
referenced shape diverges nothing at the save — those records re-embed later, each as it is next
reprocessed, not as this save's own bill. The trigger is the **diff of the derived document**, not
the edit: re-sending the same `uses` derives the same document and enqueues nothing.

**The cost is estimable before you save, from measurements:
`GET /v1/record-types/{id}?expand=embedding`** carries the profile's model, its current rate in
`creditsPerMillionTokens`, and `avgTokensPerRecord` — averaged over the project's recent
embedding calls narrowed to this type's records (`measuredCalls` says how many the average stands
on). Multiply by your record count for the estimate — an upper bound: a rate-card entry carrying an
included-units allowance makes each call's first tokens free, and the estimate does not model
that. A type never embedded has nulls, which means "not yet measured", never free. **And the drain is countable while it runs:
`expand=vectorProgress`** answers `{examined, remaining, scanCapped}` by the reconcile sweep's
own divergence classifier — `remaining: 0` off an uncapped scan means converged. `scanCapped:
true` means the type is too large to count in one pass: the figures describe a prefix, and the
sweep keeps draining on its own — it continues from where the capped pass stopped, lap after lap,
until a lap finds nothing left, or hands what remains to the nightly sweep when laps stop
shrinking (a provider outage looks like that) — so read a capped answer as "still working",
never as a fraction and never as done. A `remaining` frozen across polls during an outage is the
hand-off, not a stall in your data. Both scan-priced expansions (`embedding`, `vectorProgress`) are **item-route
only**: the list route refuses them, because a page of types multiplied by a row scan each is a
cost nobody asked for. Poll during a re-embed rather than attaching either to routine reads.

**A `search` use needs text, and the platform says so before it derives anything.** `search` on a
number, a date, a boolean, an object or a list of objects is refused `USES_SEARCH_NO_TEXT` with a
remedy (render the value into a text field with a per-record stage, and search that); `search` on a
file is `USES_SEARCH_NEEDS_STAGE` — bind an extraction stage and search its output. It used to be
possible to save such a slot, and the result was the worst of the three possible outcomes: nothing
errored, every record rendered to an empty string, each one was skipped as having no content, and
the type sat there looking searchable while indexing nothing at all.

The refusal is about the field's **shape**: a record that happens to be empty is reported per
record, which is a fact about data rather than about the declaration. There is no template slot to
compose several fields into one: put a per-record stage in `uses.search.stages` (or on the profile's
`defaultStages`) and mark its output `search`.

The contract read carries the same answer per field, so an editor can grey the option out and say
why instead of offering it and indexing silence. It is a **separate** question from whether a
field can be filtered — the two overlap and are not the same, and a field can be unfilterable and
perfectly embeddable.

### There is no partial edit: `uses` is one statement, sent whole

The three derived documents used to be authored one by one, each with a merge form so a client
could edit one slot without re-sending the parts it did not model. All of that is gone. What you
send is the whole `uses` statement, and the three documents are derived from it in the same
transaction — so the trap the merge form existed for (a client silently dropping the chunking it
never modelled) cannot happen: chunking lives on the profile, and a field's every purpose is stated
in one place. Read `uses`, change it, send it back with the `version` you read.

## Making fields filterable

The `filter` use marks a field records of this type may be **filtered** on; the derived `queryable`
list is those fields, in the order you stated them. It is independent of `search`, and that is the
point: filtering has nothing to do with embeddings, so **a type with no vectors at all can still
mark fields `filter`.**

One list serves both stores. A field you list here is filterable when you query records directly
and when you search by similarity — it is filterable in both, or in neither, so a filter means the
same thing wherever it runs.

Things to know before you declare one:

- **The number of fields is capped, per kind.** Each queryable field takes a fixed storage slot
  shared by every record type, so declaring one is a save rather than a schema change. You get
  thirty-two text fields, eight numbers, eight dates and four booleans — a budget wide enough that
  it is no longer the thing you design around. A read names each field's slot as `column` and its
  kind as `family` (`text`, `number`, `datetime`, `bool`; null until the save resolves a column),
  so count a type's usage by `family` rather than by parsing column names.
- ⚠️ **Saving the list queues a rewrite of every existing record of the type.** The save itself
  returns immediately; a durable background restamp then rewrites each record's filter columns, so
  the filter you just turned on answers correctly for records that already existed, instead of only
  for ones written afterwards. Until it completes, filters answer from the **previous** declaration
  — a coherent window, never a mix of old and new columns — and a crash cannot lose the obligation:
  it is retried at startup and by any later save of the type.
- **On a searchable type, changing this list spends no credits — but it does rewrite every
  point.** A `filter` field travels on each stored vector, so adding or dropping one changes what
  every record's points carry: the background reconcile rewrites each record's payload in place,
  and nothing is re-embedded. Until a record's rewrite lands, a filter on the new field that is
  pushed into the vector store does not match that record — `expand=vectorProgress` counts the
  records still waiting, the same way it counts a re-embed. The only billed change on a searchable
  type is moving the searchable declaration itself (a content slot, or the profile); see "Making a
  type searchable".
- **The window is readable: `GET /v1/record-types/{id}?expand=restamp`.** The section carries
  `pending` (the restamp has not converged yet), `startedAt` (when the pending run began, null
  before the runner starts), and `lastRows`/`lastMs` — the last **completed** restamp's own
  measurement: rows rewritten and wall-clock duration. That pair is the platform's measured
  restamp rate for this type; multiply your record count by it to estimate the next window rather
  than guessing. Both are null until a first restamp completes — treat that as "not yet measured",
  not as fast.
- ⚠️ **A date only behaves like a date if you say so.** A timestamp declared as a plain string is
  a _text_ field: it matches exactly and it does not compare. Give it the `date-time` format in
  its schema entry and it becomes a date — which is what makes "before" and "after" mean what you
  expect, and what moves it out of your text budget.
- **Not every field can be filtered.** Objects, nested lists, untyped fields and fields that can
  hold more than one kind of value are refused when you save, with the reason. Project the value
  you actually want to filter on into its own field.
- **You do not choose the storage.** The platform assigns each `filter` field a slot when you save
  — by family and position in your `uses.fields` — and records it on the derived declaration, the
  same way it resolves a derive stage's flow. `expand=uses` shows the column. Send the field; leave
  the slot alone, and know that **reordering two `filter` fields moves their values** and re-stamps
  the type.
- **Dropping `filter` from a field removes the filter, not the data.** Records keep their values,
  so putting it back costs nothing.
- **On a searchable type every `filter` field also travels on each point.** The derivation makes
  the payload and the filter list the same list, so a filter clause can be pushed into the vector
  store; there is no separate "stored but not indexed" payload field to declare.

Once a field is queryable, a listing step can filter on it two ways, and they compose:

- **A fixed filter** carries its own comparison — equals, before/after, at least, at most, or any
  of a list. This is where a **range** lives, and it is the only place one can: "published after
  March", "at least five views". Two fixed filters on one field bound it from both sides.
- **A filter from an upstream value** takes what an earlier step produced. Equals, or any-of when
  the value is a list. There is no range here, because a filter named by field has nowhere to put
  the comparison.

⚠️ **A field that does not carry `filter` is refused, not filtered slowly.** That is deliberate:
the alternative is a filter that quietly reads every record of the type on every request, forever,
which is exactly the cost the declaration exists to avoid. If a listing step rejects a field, mark
it `filter` — do not work around it.

A counting step takes the same filters and answers **how many** without reading the rows. That is
not a convenience over listing: a page is capped, so counting one is right only while the whole
matching set fits on it, and paging through everything to add it up reads the entire set to throw
it away. A count over a queryable field is served by that field's own index and never reads a
record at all.

A listing step can also **order** by a declared date field, which is the only way to sort by what
your data means by a date rather than by when the row arrived. Two things to know:

- **Only date fields.** The continuation token a page hands back carries a date, so that is what a
  page can resume from. A timestamp stored as a plain string is a text field until its schema entry
  declares the `date-time` format — declare it and sorting works.
- ⚠️ **Records with no value for that field are left out of the page.** The field's index only
  covers records that have a value, and including the rest would mean sorting every record of the
  type on every request. Sorting by a date a record does not have has no answer anyway.

Listing and counting steps can also filter on **relationships** — keep only records carrying an
edge of a given kind, optionally to one specific record. That is the one filter that reaches the
relationship graph rather than a record's own fields, and it answers questions no field filter can:
"which answers cite this item", "how many notes link to this project".

- **The kind is your configuration; the linked record is a runtime value.** Leaving the linked
  record unset is itself a useful filter — "carries any edge of this kind".
- ⚠️ **If the linked record's value is missing at runtime, the whole filter is dropped** — it does
  NOT fall back to "any edge of this kind". That would answer a neighbouring question with a wider
  result that still looks right.
- **A relationship kind the project does not have matches nothing**, and the filter is dropped
  rather than widened, exactly as for a missing value above. ⚠️ This used to promise more: it said
  an "unexposed" kind matched nothing, so a filter could never prove a hidden kind existed. There
  is no longer any way to hide a kind — the `exposed` column is removed, and the relations pack
  says why — so do not design around that guarantee.
- **There is no "does not link to".** A negative relationship filter would let a caller enumerate
  what a record is _not_ connected to.

⚠️ **A date window on a declared timestamp is not the same as the created window.** The created
window bounds when the record was _stored_; a queryable date field bounds whatever your data
means by it. A feed item ingested today can have been published last year.

### Filtering on the data an edge carries

A `link` on a list of objects can say which of the element's OTHER properties travel onto the edge
and can be filtered on there: `element.filters`.

```jsonc
{
  "source": { "family": "processed", "field": "citations" },
  "uses": [
    {
      "kind": "link",
      "relation": "cites",
      "element": { "ref": "source", "filters": ["quote", "spanStart"] },
    },
  ],
}
```

Each named property is carried on the edge and stamped into an indexed edge column. The relations
pack has the read side (`where` and `count` on an edge walk). Before you declare:

- **Scalars only, and a list of scalars stamps its first element.** A string, number, integer,
  boolean or date-time property, or a list of one of those. A nested object, a list of objects, an
  untyped property, or the element's own reference (`ref` — the target, not data on the edge) is
  refused `EDGE_FILTER_NOT_FILTERABLE`.
- **The budget is the relation KIND's, and it is small.** Eight text, two number, two date-time,
  two boolean columns per kind — shared by every record type that filters on that kind, because an
  edge row is one row whichever type produced it. Past it, `EDGE_FILTER_BUDGET_EXCEEDED`, counted
  over every declaring type. This is deliberately narrower than the record budget: an edge is a
  relationship with a few attributes, not a document. Model anything wider as its own record type.
- **Two types filtering on one kind must agree on each property's type.** A `quote` that is a string
  in one type and an object in another is `EDGE_FILTER_TYPE_CONFLICT`, and the message names the
  other type. The map is the kind's — `edgeFilters` on the relation-kind read, `{ property →
column }`, read-only there; `GET /v1/record-types/{id}?expand=uses` routes the use as
  `{ store: "edge-store", relation, producerKey, filters: { quote: "eText0" } }`.
- **A property already on a column keeps it** when another type adds or drops a filter. A property
  no type names any more leaves the map. So one type's edit never moves another's columns.
- ⚠️ **Changing the filters restamps every live edge of the kind, after the save returns.** As with
  `filter` above: the save records the obligation on the kind (`edgeRestampPending`,
  `stampedEdgeFilters`), a runner rewrites the rows in batches, and edge reads resolve against the
  previous map until it converges. A filter you just declared is not queryable until then.

All three refusals arrive inside `RECORD_TYPE_USES_INVALID.details.issues` with a remedy each.

### A list that grows without bound: `stream`

A field that is a list of objects each carrying a time — every action of a person, every reading of a
device — is a `stream`: its elements leave the record row and become rows of their own,
time-partitioned store, appended and never assigned, read only inside a time bound.

```jsonc
{
  "source": { "family": "submission", "field": "actions" },
  "uses": [
    {
      "kind": "stream",
      "at": "at",
      "filters": ["action", "target"],
      "retainDays": 90,
    },
  ],
}
```

- **`at` is the event's own time and is required.** It must be a datetime property of the element
  (`STREAM_AT_UNKNOWN` when it names nothing, `USES_STREAM_NO_TIME` when it is not a datetime). A late
  event lands under its `at`; the platform never substitutes arrival time.
- **`filters` become indexed columns on the event row**, under a budget of eight text, four number,
  four date-time and two boolean per stream FIELD (`STREAM_FILTER_BUDGET_EXCEEDED`); a nested object
  or a list of objects is `STREAM_FILTER_NOT_FILTERABLE`; a filter naming `at` is dropped, since the
  time is always indexed. `expand=uses` routes the use as `{ store: "stream-store", at, retainDays,
filters: { action: "sText0" } }`.
- **The field is no longer part of `data`.** `entity.create` and `entity.update` refuse a payload
  that names it — the step fails as invalid input saying the field is a stream. Events are written by
  the `entity.append` step —
  one event or a list per run, idempotent on `(recordId, at, eventId)`; the default event id hashes
  the record, the time and the payload, so a retried run converges. An event without a parseable
  `at` fails the step (`STREAM_EVENT_NO_TIME`).
- **Every read is bounded in time.** `GET /v1/records/{id}/stream/{field}` lists one record's
  events newest first inside a window (a `from` instant, a `to` instant, either optional), with a
  repeatable `where=<prop>:<op>:<value>` on the declared
  filters (an undeclared property is 422 `STREAM_FILTER_UNDECLARED`), `latest=1`, and the platform's
  cursor walk: pass back `nextCursor` as `after` for older events, `prevCursor` as `before` for newer
  ones (never both). The response says what bounded it — the request, the stream's retention, or
  nothing on an unbounded stream — and never counts: a stream's total would be a scan of its whole
  history. A window reaching before `now − retainDays` is 422
  `STREAM_WINDOW_BEYOND_RETENTION`, not an incomplete answer.
- **`retainDays` is a promise about reads, kept by a daily job.** Events past retention are deleted
  in the background and whole months are dropped once empty; declare it when you ever ask for "the
  latest", or that question opens every month.
- ⚠️ **Declaring `stream` on a field that already holds an inline list, on a type with records, is a
  MIGRATION, not an edit.** The save returns at once and records the obligation on the type; a runner
  moves each record's list into rows in batches and removes the key from `data`; watch
  `GET /v1/record-types/{id}?expand=migration` until `pending` is `null`. While it moves, the type
  is held still, each refused 409 `STREAM_MIGRATING`: appends to that field; ANY save of `uses` that
  would start another stream migration, on that field or another; `entity.update` / `entity.create`
  data naming the field, and an `entity.update` replace during a promote (it would drop the lists
  not yet moved); and a stream read or query clause on a field still being promoted, since most
  records' events are not rows yet. A list element with no parseable time cannot become a row: it is
  dropped, and the `dropped` count on the migration's `pending` says how many so far. Removing the
  use folds the rows back the same way, and is refused 422 `STREAM_DEMOTE_TOO_LARGE` (naming the
  records and the cap of 1 000 events) while any record's stream is larger than an inline list should
  be. Changing `filters` on a populated stream restamps its rows the same way. One field moves at a
  time.

### One question across the stores: a query

Every use above routes a part of a record to a store that answers its own kind of question, and
none of those stores can answer another's. A **query** asks several of them at once and returns the
records that satisfy ALL of its clauses — a conjunction, never an OR — with two fields on every
answer that say how complete it is. One grammar, two places to state it: the config of an
`entity.query` step inside a flow, and the body of `POST /v1/projects/{nodeId}/records/query` from
outside one. A body, not query-string parameters, because clauses nest.

```json
{
  "recordType": "person",
  "clauses": [
    { "kind": "term", "facet": "language", "slug": "hebrew" },
    {
      "kind": "edge",
      "relation": "friend-of",
      "where": [{ "property": "tag", "op": "eq", "value": "close" }],
      "count": { "op": ">=", "n": 2 },
      "peer": [
        { "kind": "field", "field": "city", "op": "eq", "value": "Haifa" }
      ]
    },
    {
      "kind": "stream",
      "field": "actions",
      "window": { "from": "2026-08-17T00:00:00Z" },
      "where": [{ "property": "action", "op": "eq", "value": "login" }]
    },
    { "kind": "field", "field": "age", "op": "gte", "value": 18 },
    { "kind": "semantic", "text": "loves hiking", "topK": 50 }
  ],
  "limit": 20
}
```

Each kind of clause is answered by the store its use routed the field to, so each needs that use:

- **`field`** needs `filter` on the field. `eq`, `lt`, `lte`, `gt`, `gte` take one value; `in`
  takes a list of up to 1 000 (an OR inside the clause). Dates travel as ISO strings.
- **`term`** needs the facet in `uses.facets`. The `slug` may be an alias; it resolves one hop to
  its canonical term, as every term read does.
- **`edge`** needs a `link` for the `relation`. `direction` is `outgoing` unless you say
  `incoming` or `either` (a symmetric link matches on either side whatever you ask); `where` speaks
  the link's `element.filters`; `count` is a comparison on matching edges (omitted: at least one);
  `peer` is a list of `field` and `term` clauses on the record at the far end — ONE hop, and those
  two kinds only.
- **`stream`** needs `stream` on the field. `window` is `{ from, to }` on the event's own time —
  omitted, it is bounded by the stream's retention, and a `from` before the retention cutoff is 422
  `STREAM_WINDOW_BEYOND_RETENTION`; `where` speaks the stream's `filters`; `count` is `exists`
  (default), `none` (no matching event), or a comparison.
- **`semantic`** needs a `search` use somewhere on the type (or on the named `field`). `text` is
  the phrase, up to 8 000 characters; `topK` is how many to rank, 1–200, default 50. At most one per
  query.

Up to sixteen clauses. **How it is answered:** the exact clauses run first, cheapest first, each
one narrowing the next; their intersection is then pushed into the meaning index and scored
EXACTLY when it holds at most 25 000 records, so a record satisfying every clause is never dropped
by the ranking. Above that the ranking runs first and the exact clauses narrow it — a bounded
answer, and the answer says so.

**Two honesty fields, never omitted.** Read them before you read `records`:

- `bounded` — `false` means every record satisfying every clause is in reach. Otherwise
  `{ bound, reason }`: `top-k` (every satisfying record was scored, more than `topK` satisfied, the
  closest `bound` are here), `pushdown-cap` (the exact intersection was too large to push, so the
  ranking ran first and this is at most `bound` of it), or `semantic-only` (no exact clause; a
  plain ranking).
- `explanation` — `clauses`, one row per clause in the order it ran, with the `store` that answered
  it, the `index` it used, the `rank` it was ordered by, the `candidates` it produced after the
  clauses before it narrowed it, and its `freshness`; and `pushdown` with the `ids` pushed, the
  `cap` in force and the `mode`. An exact clause is `transactional`. The semantic clause is
  `{ eventual: true, watermark, unindexed }`: a ready record not yet in the meaning index is absent
  from it, `watermark` is the instant the index is current to, and `unindexed` is how many of the
  type's ready records it cannot see yet — the number to read when a record is in an exact answer
  and missing from a semantic one.
- `emptiedBy` — present when a clause produced nothing: its index in `clauses`. No later clause
  ran and the meaning index was not asked, so an empty `records` is that clause's doing.

**Three refusals you will meet.**

- 422 `QUERY_CLAUSE_UNROUTED` — a clause on a field, facet, relation or filter property the type's
  `uses` does not route. The message names the field and the use to declare; no store scans for it.
  For the step, at flow save; for the route, at request — it has no save step. The two shape
  refusals sit beside it: `QUERY_SEMANTIC_MULTIPLE` (a second semantic clause) and
  `QUERY_PEER_DEPTH` (a `peer` holding anything but `field` and `term`).
- 422 `QUERY_CLAUSE_TOO_BROAD` — the first exact clause selected more than a million records
  before any other clause could narrow it. Add a narrower clause the planner will run first — a
  term, or a field equality — rather than reordering yours: the order is the planner's.
- 503 `VECTOR_INDEX_UNREADABLE` — the meaning index could not be reached, or was never provisioned
  for the type. Nothing partial comes back; a query with no semantic clause is unaffected.

**Paging.** Only a query WITHOUT a semantic clause pages: on the route, pass back `nextCursor` as
`after` for the next page and `prevCursor` as `before` for the previous one — never both — and
`paging` is always null because a query is never counted; in the step, `cursorSlot` in and
`nextCursor` out. With a semantic clause the answer is a ranking of at most `topK` with no cursor,
and `limit` caps what is returned of it.

**Not built — do not promise these.** OR across clauses (only `in` inside a field clause). A second
hop through `peer`. A query language — the grammar is this JSON, in a step's config or a request
body. A cached answer — every query reads the stores as they are now. The operator app draws an `entity.query` step's clauses as a read-only tree and says so on the step page; a step's clauses are written through the design API (`POST /v1/skills`, `PATCH /v1/skills/{id}`), which refuses an unrouted clause at save with 422 and names the field and the use that would route it.

## What the platform refuses

- **Reserved field names** — the identity, status, error and timestamp fields — may not be
  declared as data fields, nor collide with a derived slot
  (`RECORD_TYPE_DERIVED_FIELD_RESERVED`). Names must be letter-led alphanumeric.
- **Removing a field from an entry while a referencing type has records**
  (`SCHEMA_ENTRY_UNSAFE_FOR_RECORD_TYPE`). Editing an entry re-validates every type referencing
  it, strictest wins.
- **Deleting an entry** while it is a record type's data shape
  (`SCHEMA_ENTRY_REFERENCED_BY_RECORD_TYPE`) or referenced by the type-relation graph
  (`SCHEMA_REFERENCED_BY_GRAPH`). ⭐ Ask the delete with `validateOnly=true` in the query: it runs
  the same gate the delete runs and answers a 200 verdict, with `derived` carrying the census of
  everything pointing at the entry — record types, event types, configuration namespaces, relation
  kinds, entries reaching it through a reference, and whether a project binds it as its end-user
  profile. ⚠️ `derived` is absent when the verdict refuses: the gate stops inside its own walk, and
  a census loaded afterwards would be a different read from the one that refused. The refusal
  sentence names the consumer that blocked it.

  `GET /v1/schema-entries?expand=graph` says which graph references those are before you try: each
  entry carries `usedByGraph` and `usedByGraphRefs` — the flows, steps, handlers and sibling types
  that name it DIRECTLY. A flow taking a type that references this one is listed under that type,
  not here.

- **Deleting a record type** that has records, was seeded, or carries a reserved type name (a
  platform-wide set, not something your project defines). The DELETE answers 409 `CONFLICT` for
  records, naming the rule at the head of its message (`RECORD_TYPE_PINNED_BY_RECORDS: …`); 409
  `RECORD_TYPE_SEEDED_READONLY` for a seeded type; and 422 `VALIDATION_FAILED` for a reserved name,
  again named at the head of the message (`RECORD_TYPE_NAME_RESERVED: …`). Deleting a type
  removes only the descriptor; the entry outlives it.

  ⚠️ It does **not** leave the relation graph alone, and the response says what went. A record-type
  pair naming the deleted type disappears with it — so a link that applied to no other pair is now a
  link that connects nothing, cannot be produced and cannot be traversed. Those links are deleted
  too, along with every connection they had made, and their keys come back in
  `deletedRelationKinds`. A link that still applies to another pair survives untouched.
  `invalidatedJoins`, beside it, reports the OTHER record types whose `joins` declaration this
  delete voided. Both exist because you asked to remove one thing and something else changed.

  **Ask before you delete: `GET /v1/record-types/{id}?expand=dependents` carries
  `deleteRefusal`** — the refusal the delete would answer right now, from the function the delete
  throws from, or null when nothing stands in the way. It covers all three refusals above. Its
  `code` is the envelope's (`CONFLICT`, `RECORD_TYPE_SEEDED_READONLY` or `VALIDATION_FAILED`), and
  its `message` is the delete's sentence with the rule's name taken off the front. Gate a button
  on it. The same read counts, through the delete's own reads, the records that refuse it
  (`refuses: true`) and the paired relation kinds and other types' `joins` it would change
  (`refuses: false`). ⛔ `total` sums only the refusing counts, so a seeded or reserved type reads
  `total: 0` and is refused anyway — never gate on `total`.

  **`validateOnly=true` on the DELETE asks the same function** and answers a 200 verdict in the
  same code and words — the way to ask when you are about to delete and hold no read. ⛔ It
  carries no `derived`, deliberately: the count that refuses a pinned type rides the refusal's own
  sentence, and a structured member beside it would have read zero on every refusal — the planner
  throws before any verdict could carry a count.

- **A declaration the contract has moved out from under.** Each declaration is validated when it is
  saved; editing the shape or re-capturing the flow afterwards can leave one naming a field the
  type no longer has, and nothing refuses until the next save that restates it.
  `GET /v1/record-types/{id}?expand=diagnostics` runs the save's own validators over what is stored
  now and lists every issue with its code, path and the contract `field` it names — empty when all
  of them still hold. A type is checked the way a save checks it: its `uses` statement is
  derived first, and a refused one reports only `declaration: "uses"` issues (the same `USES_*`
  codes a `RECORD_TYPE_USES_INVALID` carries, the remedy appended to the message); a statement that
  derives has the `searchable`, `queryable` and `relations` it derives checked, not the stored
  copies. A natural key no future record could supply is a refused `key` use, so it arrives as a
  `uses` issue. Both expansions are item-route only.

- **Records created and never queued.** A record of a type that binds a processing flow is born
  `PENDING`, and `entity.create` does not queue it — only an `entity.enqueue-process` step does. A
  flow that creates the record without one leaves it waiting with no run coming, and the flow's own
  run still reads as succeeded. `GET /v1/record-types/{id}?expand=processingGaps` names every flow
  of the project with an enabled `entity.create` of this type and no enabled
  `entity.enqueue-process` step (`code: "RECORD_CREATED_NOT_QUEUED"`, the flow, the create step
  and a sentence saying what to add); always empty for a type with no processing flow. Item-route
  only. A record already stranded this way is processed with
  `POST /v1/projects/{nodeId}/records/{id}/reprocess`, which accepts a `PENDING` record only when
  no processing job is waiting or running for it — the record read's `pendingRun` says which.

- **Re-pointing or renaming a type that already has records.**
- **A stale version on either update**, and the `version` you last read is REQUIRED rather than
  optional. The update runs in a transaction, so a rejected write rolls back the whole rename
  cascade rather than leaving it half-applied.

## Ask what a change would cost, before you make it

`GET /v1/record-types/{id}?expand=contract` derives the field vocabulary from the descriptor **as
stored**. So an editor that has staged a different data shape, or a different processing flow, is
holding a contract that no longer describes what it is about to save — and any declaration it
offers against that contract is being written against the wrong vocabulary.

⭐ **Each field also says whether a LINK may be declared on it, and what it points at.**
`relationSource` carries `flat` (the field itself is a reference) or `element` (it is a list of
objects whose properties are), each with `typed` — whether the reference names its target — and
`targets`, the record types it names.

⚠️ **`typed` and `targets` answer different questions, and only the second can be checked against
the link you are making.** A declaration whose source points at `article` on a kind paired
`article → note` **saves**: the save asks whether the field IS a reference and never what it points
AT. Every edge it then produces is refused at write time as `UNDECLARED_PAIR` and reported rather
than raised, so the kind reads `0 edges` and nothing says why. `targets` is what lets an editor say
so before the save instead of after it.

⚠️ **`targets` is a LIST, and empty means untyped.** A union of two annotated references names two
types and is right for a link to either, so it cannot collapse to one value. An untyped reference —
a plain string that happens to hold an id — is still legal: the save warns with
`RELATION_SOURCE_FIELD_UNTYPED` rather than refusing, so do not treat an empty `targets` as a
refusal.

⭐ **`element.properties` carries each sibling's NAME and the JSON types it declares.** These are the
values that may travel onto an edge, and the bag they build is validated against the kind's
`propertiesEntryId` — so an editor offering that entry has to compare the two SHAPES, not their
spellings. A sibling `quote` that holds a `string`, pointed at an entry declaring `quote` as an
object, agrees on every name and is refused on every edge as `PROPERTIES_INVALID` — reported rather
than raised, so the kind reads `0 edges` and nothing says why. It was a list of bare names until
2026-08-26 and could not answer this at all.

⚠️ **`types` is a LIST, and empty means the property declares no type.** `{"type":["string","null"]}`
is one fragment and a union names several, so this cannot collapse to one value either. Empty means
UNCONSTRAINED rather than `string`, and a reader must not refuse on it: an untyped fragment compiles
to something permissive, so treating silence as a mismatch refuses a pair the platform accepts.

⚠️ **`integer` and `number` are distinct here, deliberately.** The wire reports JSON Schema's own
word rather than folding one into the other — a reader deciding what satisfies what needs the
distinction, and the compiler's `integer` arm accepts what its `number` arm does plus a whole-number
check. Fold them in your own reader, not in what you read.

`GET /v1/record-types/{id}/contract-preview` answers for a **proposed** descriptor instead:

```
GET /v1/record-types/{id}/contract-preview?dataEntryId=<entry>&flow=<flowId>|none
```

Both parameters are optional. Omit one to keep what is stored; `flow=none` proposes unbinding.
`none` is safe as a sentinel because flow ids are cuids.

To ask the same question about a **draft of the type's own shape** — fields added or changed but
not saved — send the drafted document instead:

```
POST /v1/record-types/{id}/contract-preview
{ "definition": { /* the drafted JSON Schema */ }, "flow": "<flowId>" | "none" }
```

`flow` is optional, as above; `dataEntryId` is refused (a draft of this shape and a move to another
are two different saves). The drafted document replaces the stored one and nothing is re-pointed,
so the preview judges against the binding as stored. It is a POST because a document does not fit a
query string, and it is floored at EDITOR: only an editor has a draft to ask about. The answer has
the same shape as the GET's.

The draft is gated first by the rules a save of it meets: field names (letter-led, no reserved
name), an object schema, and — with `flow` left out on a bound type — the stored flow's binding
against the draft. Any of those is a `422`. What it does NOT answer is the save's own business: a
removal with stored records, and an edit that re-shapes a signature an endpoint or this type froze
(`SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`, which a re-send with `adoptSnapshots` re-captures — this
type's included). Plan the document for those. The `declarations` verdicts are the STORED
declarations under the draft: a save that restates `uses` is judged by the uses it states instead.

⚠️ **They are not independent, and the shape one is the reason.** Re-pointing the shape re-binds the
flow against it, so a `dataEntryId`-only proposal is resolved against the flow's **live** signature
too — its `processed` fields and its declaration verdicts can both move, and it can be refused for a
flow reason on a request that never mentioned a flow. That is the save's behaviour, faithfully: a
shape change is what strands a declaration naming a flow slot.

It returns the contract the proposal would have — the same shape `expand=contract` returns — plus
the two schema documents behind it, and a **verdict per declaration**:

```jsonc
{
  "contract": [
    /* … the proposed vocabulary … */
  ],
  "definition": {
    /* the data shape's schema, as proposed */
  },
  "outputDefinition": null, // the bound flow's output schema, or null when unbound
  "declarations": {
    "searchable": null, // this type declares none
    "queryable": {
      "ok": false,
      "code": "RECORD_TYPE_QUERYABLE_INVALID",
      "message": "…",
    },
    "relations": { "ok": true, "code": null, "message": null },
  },
}
```

Three things to hold about it:

- **A proposed flow is resolved against its LIVE signature**, which is what a re-bind actually
  captures — not against the snapshot the descriptor already stores. Ask before you bind and the
  answer is the one the save will use.
- **`null` on a declaration means the type declares nothing there**, which is not the same as
  surviving. Do not render it as approval.
- **A `422` is a refusal of the CANDIDATE itself** — an entry that is not eligible, a flow in
  another project, a flow producing no outputs — and is a different answer from a 200 whose
  declarations refuse. The first says your proposal is not a descriptor; the second says it is,
  and tells you what adopting it costs.
- **A `409` means the type already holds records** and the shape you proposed is not the one they
  were written against. Re-pointing is refused for the life of those records, so this is a fact
  about the type rather than about your proposal — asking again with a different entry will not
  help.
- **`code` names which declaration refused** — `RECORD_TYPE_SEARCHABLE_INVALID`,
  `RECORD_TYPE_QUERYABLE_INVALID` or `RECORD_TYPE_RELATIONS_INVALID`. Branch on it, never on the
  message text. (The first two carried `VALIDATION_FAILED` until 2026-08-25, with the token only in
  the message; the message still opens with the same token, and the code is now the thing to read.)
- ⚠️ **A `seed`-origin type answers 200 and still cannot be saved.** Every write on one is refused
  with `RECORD_TYPE_SEEDED_READONLY`; the preview deliberately does not repeat that check, because a
  type you cannot edit is still one worth understanding. Check `origin` before offering the answer
  as something to act on.

⚠️ **Re-binding a flow is not free, even though records never freeze it.** Records pin the name,
the data shape and the owner scope; the binding can change at any point in a type's life. But a
re-bind re-derives the `processed` family and re-derives the type's whole `uses` against the new
signature — every use is re-resolved and the three derived documents re-validated **before the
write opens at all** — so one use naming a field the new signature no longer produces refuses the
whole save, including the rename that rode along with it. (Derivation precedes the transaction
rather than sharing it; the effect on you is the same, and it is why nothing partial can land.) This
route is how you find that out before you send it.

⛔ **Do not re-derive the contract yourself.** It is a pure function of the data shape's schema and
the flow's captured signature, and re-implementing it in an editor is how a declaration gets
approved against one vocabulary and indexed against another. Ask.

### And ask what the SAVE would do: `validateOnly` on the write itself

The contract preview above answers what the field vocabulary would be. This one answers what your
write would DO — send `PATCH /v1/record-types/{id}` (or `POST /v1/record-types`) with the body you
are about to save and `validateOnly: true`, and nothing is written.

⚠️ **The former write-preview sibling under this id is retired.** It asked this exact question at a
second address, taking the PATCH body verbatim so the two could not disagree — an alias holding
them together by hand. The flag on the write's own body is the same question with nothing to hold.

**A verdict comes back 200.** It says whether the write would be taken (`ok`), what the platform
found (`diagnostics`), whether every rule ran (`complete`) and what the save would compute
(`derived`). A refusal is
`ok: false` with a finding per rule that fired, each carrying its own `code`, a `severity` and the
`field` it is about — read `severity`, never `code`. ⚠️ **A stale `version` is NOT one of them**, and that is deliberate. The save guards on the version
you send and answers 409 when the row has moved — but the optimistic lock is about when the write
lands rather than about whether your draft is coherent, so reporting it through `ok` would call a
stale read a fault in the body. It arrives as `staleVersion` under `derived`, beside everything
else about the plan, which is still true.

⛔ **The two answers worth having are the two a save gives you no way to see.** A 200 that quietly
enqueues a full reindex, and a 200 that writes fewer columns than you meant.
`derived.effects.reindex` says a reconcile is queued (a declaration change, a re-bind, a re-point —
and a RENAME, which invalidates every stored point's payload namespace); `derived.effects.restamp` says
every row's query slots would be re-stamped. An **empty `writes`** under `derived` means your request
changes nothing at all, which is otherwise indistinguishable from a save that changed everything
you intended.

**`derived.effects.reembed` is the one that spends credits.** `reindex` says a reconcile is QUEUED,
and a queued reconcile can find nothing to embed — a slot moved on a profile whose model resolves
to no collection finds nothing at all, and a filter change finds only payloads to rewrite.
`reembed` resolves the stored and the saved declaration the way the reconcile sweep does, asks its
own divergence classifier whether a record indexed under the first is out of date under the second,
and asks which repair that divergence takes — so `true` means every indexed record is projected
again, embedding calls included. Two saves diverge every record and are still `false`: turning
search off removes vectors, and adding or dropping a `filter` rewrites each record's stored payload
in place — neither embeds anything.

- **`resolved`** under `derived` is each derived declaration as it would be STORED — the `searchable`
  document and the `queryable` and `relations` documents your `uses` derives to, with the platform's
  own resolutions applied: `queryable` carries the storage slot each `filter` field resolved to and
  `searchable` has its per-record derive stages bound to concrete flow ids — the half you cannot
  compute yourself. Each one is a full document, or `null` where the type would declare nothing.
- ⚠️ **`derived` is absent entirely when the planner stopped at a refusal.** There is no plan to
  describe, and an absent key says so where an empty list would read as a measurement.

It runs the save's own decision phase rather than a description of it, so an answer here cannot
disagree with the write. **EDITOR**, like the save it asks about.

## Identity — the field that says two records are the same thing

A record type may declare a **natural key**: one field of the submitted payload that identifies the
thing the record stands for. `externalId`

<!-- field-ok: externalId — a field an operator authored on their own shape, named here as the
     worked example this whole section runs on; the platform declares no such field --> on a post, a

canonical URL on a bookmark, an ISBN on a book. Declare one and the **database** refuses a second
record of that type carrying the same value.

⛔ **It is identity, not a reference.** It does not point at another record — it says which thing in
the world this one is. Two writes carrying the same value are two claims about one thing, so the
second is refused rather than converged: converging would discard the incoming payload, overwriting
would discard the stored one. An edit to an existing record goes through `entity.update`.

```
PATCH /v1/record-types/{id}                        `uses` with `"key"` on the field   declare
PATCH /v1/record-types/{id}                        `uses` without it                  retract
POST  /v1/record-types/{id}/natural-key-preview    { "fields": [...] }                ask first
```

The key is the `key` use on a field in `uses` — the same statement as every other purpose a field
has — and the read reports it as `naturalKey`. There is no separate verb any more; the one thing the
old verb had that a statement does not, asking for the verdict before committing to it, is the
preview route below.

### Declaring is a promise about the data you already have

⛔ **It is not an ordinary configuration edit, even though it rides the PATCH.** Declaring verifies
every existing record, stamps them all, and persists the declaration. A record that cannot supply
the field, or a value two records share, refuses the WHOLE save — the `key` use and everything else
in the body — with **409 `RECORD_TYPE_NATURAL_KEY_UNSATISFIED`**, listing the offending values so you
can act on them. The verification runs before the write; the stamp runs right after it commits, so
a save that answers 200 has already proved the key holds. Nothing partial lands.

The backfill is the point: without it the constraint would cover only future writes, and a
pre-existing duplicate would sit permanently under a key claiming uniqueness.

⚠️ **Retracting CLEARS the stamps.** Leaving them would keep constraining a type whose configuration
no longer declares a key — a later create failing against a rule nobody can see.

### Ask before you declare: `POST /v1/record-types/{id}/natural-key-preview`

Send the fields you are considering and get back, for each one, the verdict the declaration would
reach — measured against every record the type has, writing nothing.

```json
{
  "declared": null,
  "examined": 1240,
  "candidates": [
    {
      "field": "externalId",
      "ok": true,
      "distinct": 1240,
      "duplicates": 0,
      "unusable": 0,
      "conflicts": [],
      "unusableSample": []
    },
    {
      "field": "title",
      "ok": false,
      "distinct": 1238,
      "duplicates": 2,
      "unusable": 0,
      "conflicts": [{ "value": "Untitled", "recordIds": ["rec_1", "rec_2"] }],
      "unusableSample": []
    }
  ]
}
```

- **`duplicates` counts VALUES, not the records sharing them.** Two values held by fifty records
  each is `duplicates: 2` — the shape of the problem, not its weight.
- **`unusable` is a record that cannot supply the field at all**: absent, not a string, empty, or
  over the stamp's length. `unusableSample` carries the reason per record.
- **`conflicts` and `unusableSample` are SAMPLES, capped at five each way** — five values, five
  records per value. The counts beside them are exact.
- **A candidate that would be refused is part of a 200.** `ok: false` is the answer; the point of
  asking is to find out.
- The whole field list is measured against ONE read of the records, so ask about all of them at once
  rather than one per keystroke. **EDITOR**, and a POST: the question is what YOUR declaration would
  do, and a caller who cannot declare has none to ask about.

### The rules a key must satisfy

- **One field, top-level, of the submitted payload.** Not a dot-path: nesting would make the stamped
  value depend on a traversal rule that has to stay stable forever. Not a composite, for the same
  reason applied to a separator — two fields carrying `key` is `USES_TWO_KEYS`. The key is stamped
  when the record is created, from what was submitted, before any flow runs — so a `key` on a
  `processed` field is `USES_KEY_NOT_SUBMITTED`, even when a submitted field shares its name. A key
  you want computed is computed by the flow that creates the record, into the submission.
- **The value must be a string, and it is not coerced.** `1` and `"1"` would otherwise be the same
  record. Max 512 characters. `expand=contract` asks this of each field's schema before you have
  records: `identityRefusal` is `LIST` or `NOT_TEXT` for a field no value of which could be stamped,
  and null for one that might — null is not a promise, the declaration still checks every record.
  It is the same verdict a `key` use is refused by for its shape: a field with a non-null
  `identityRefusal` saves as `USES_ILLEGAL_FOR_SHAPE`, and a number field is one of them. It answers
  the shape only — a `processed` field with a null `identityRefusal` is still refused as above.
- **A record that cannot supply it is REFUSED, never written unconstrained** — the silent exemption
  is the gap the key exists to close.
- **Uniqueness is per project and per type**, and on a `USER`-scoped type also **per user**: two
  people may legitimately hold the same key. A `USER`-scoped record with no user cannot be covered
  and is refused at declaration time.
- **The key becomes the record's label** wherever the platform names a row — in the records list, in
  the files ledger, and as the one field a free-text record search can always look in. A type with
  no key shows its records by their generated id.

## The key you author

Three design objects are addressed by a string **you** choose rather than by the row id: an
endpoint's `endpoint`, a schema entry's `name`, and a schedule's `key`. All three share one charset
rule, and it is checked on write:

```
letters, digits, dots, dashes, underscores
first character a letter or a digit
64 characters maximum
```

<!-- field-ok: subscriptionsList — an example of a key an operator authored, not a platform field -->

⚠️ **This is not the flow-slug rule.** A flow's `slug` is strict lower-case kebab; these are not,
and deliberately — camelCase endpoint keys like `subscriptionsList` are ordinary and legal here.
Do not assume one rule from the other.

The reason for the charset is narrow and worth knowing: these keys end up as **one segment of a
URL**. Anything needing an escape to survive that — a slash, a space, a `{}` placeholder, a `?` or
a `#` — is refused at the write rather than mangled later.

⚠️ Unlike the other two, a schema entry's `name` **is** renameable — references resolve by id, so a
rename breaks nothing. The charset rule applies to the rename exactly as it does to the create.

### A schema entry also carries a `slug`, and you do not author it

Every schema entry on the wire — in the flat CRUD reply, in the registry read, and in the project
bootstrap — now carries a **`slug`** beside its `name`. It is the entry's **address**: the operator
UI reaches a type at `/<project>/types/<slug>`, the way it already reaches a flow by `Flow.slug`.

```
RecordPage   → record-page        FileMetadata → file-metadata
PDFDocument  → pdf-document       string       → string
```

Three things to know about it:

- **It is derived from the name, not stored.** There is no column and nothing to set: the platform
  folds the name on every read. That is what lets it cover the `builtin` and `library` tiers, which
  have no rows at all — a stored slug could only ever have covered half the registry.
- **It moves when you rename.** The slug is a function of the name, so renaming a type changes its
  URL. References are untouched, as before, because they resolve by id.
- **Two names can fold onto one slug, and the second is refused.** `OrderItem`, `Order_Item` and
  `Order.Item` are three legal names sharing one address, so a create or rename that lands on an
  address another type already holds is a `409` — including against a `builtin` or `library` name,
  which has no row to collide with in the table.

For the same reason, a name that differs from an existing one **only by capitalisation** is now
refused as well: `String` beside the builtin `string` is two entries a reader cannot tell apart and
one address. Rows written before this rule keep resolving; only new writes are refused.

### The registry read carries the `version` a PATCH needs

Every schema entry on the wire — the flat CRUD reply, the registry read and the project bootstrap —
carries **`version`**, the optimistic lock. Send it back on a PATCH:

```jsonc
{ "name": "OrderLine", "version": 7 }
```

- **It is REQUIRED on the PATCH.** An omitted lock is not a lighter check, it is no check: two
  callers editing one entry would both be told the write succeeded and one edit would be gone. A
  body without it is a `422`, and a stale one is a `409` — re-read and reconcile.
- **It is `null` on the `builtin` and `library` tiers**, which are synthesized from the platform
  catalog and have no row to version. Those are exactly the tiers a PATCH refuses anyway, so a null
  version and "not yours to edit" are the same fact. Never invent a number for one: `0` would be a
  lock claim about a version nobody read.
- **Read it from the same response you edited from.** Fetching the entry again immediately before
  writing gives you a lock that proves nothing about the document you actually looked at.

### A `library` entry also names the handler that declares it

Every schema entry on the same three reads carries **`declaredBy`**: the handler key for a `library`
entry, and `null` on every other tier.

```
AudioMetadata → "audio.metadata"     RecordPage → "entity.list"
RunInfo       → null                 string     → null
```

**`null` is an answer, not a gap.** A `builtin` and an `infrastructure` entry are platform code with
no handler behind them, and an `operator` entry was written by you. Only the library tier has
something to name, so a reader that treats `null` as "not sent" will draw a hole where the correct
reading is "nobody declares this — the platform brought it".

⚠️ **Do not parse it out of `description`.** A library entry's description opens `Library type —
declared by handler <key>.`, so the key is technically recoverable from that sentence — and a
consumer doing so owns a copy of a format it does not control, which breaks silently the day the
sentence is reworded. The field is on the wire so that parse never has to exist.

## Which facets a type surfaces

A record type shows a facet only when a link exists between the two. Creating the facet does not
do it, and neither does a term resolving into it — the link is its own declaration, and until it
exists the facet is invisible on every read of that type no matter how much term data sits behind
it.

The declaration is **`uses.facets`**: the facet keys, in the order the type surfaces them, and that
order is the field order the API emits. It is a list on the TYPE, beside `join`, and not a use of a
field — a facet's values are resolved by the processing flow into the term store and never sit on a
record field, so there is no field to hang it on. It goes with the rest of `uses`, whole:
re-sending the same list changes nothing, a shorter list unlinks what you left out, and the same
keys in a different order is how you reorder. There is no separate attach verb, no detach verb and
no facet-list route, so a half-applied change is not something the API can produce.

What it refuses: a key that is not a facet of this project (`USES_FACET_UNKNOWN`, one issue per
unknown key, all at once), a key that repeats, and — like every other write — any change to a seeded
record type (`RECORD_TYPE_SEEDED_READONLY`).

Reading the current list is `expand=facets` on the ordinary type read rather than an endpoint of
its own (and `expand=uses` shows each facet's position). An empty list means the type surfaces
nothing — which is not the same as the project having no facets, and the difference is the whole
point of the link.

Each entry carries the facet's own label, binding, cardinality and BOTH of its admission
settings — `mint` (what a value the facet has never seen may become: `none`, `active` or
`candidate`) and `matching` (how an existing term is found: `exact` or `semantic`) — so a client
can render the list without a second call. These two replaced a single `mode` field that conflated
them; a reader that showed one word could not distinguish a fixed vocabulary matched by slug from
one searched by meaning, which are very different facets to hand a record type. See
Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) for what to choose.

Unlinking is not deletion. The term rows a record already carries survive it; the link decides what
is projected, never what is stored, so re-linking brings the same values back.

## Asking whether a type edit would be accepted — `validateOnly`

`POST /v1/schema-entries` and `PATCH /v1/schema-entries/{id}` take **`validateOnly: true`** in the
body. Each runs every rule its write runs — the name clash, the definition compile gate, the
unread-keyword and dead-null-arm refusals, the cycle detector, and every consumer guard (record-type
declarations, flow bindings, user profiles, event payloads) — writes nothing, and answers **200**
with a verdict:

```json
{
  "ok": false,
  "complete": false,
  "diagnostics": [{ "code": "…", "severity": "error", "message": "…" }]
}
```

⭐ **This surface is worth asking because the rules are many and most of them are about OTHER rows.**
A type edit is refused for what it does to the things that reference it, which no client can compute
from the document in front of it.

⛔ **There is no `derived`, deliberately.** The sibling surfaces publish one because their write
COMPUTES something you could not otherwise see — a schedule's occurrences, an endpoint's access. A
type edit computes nothing of that kind: what it produces is the document you sent. A field with
nothing true to put in it is worse than an absent one.

⚠️ **The 409 is not a verdict.** An edit that re-shapes bound snapshots without `adoptSnapshots`
is refused with **409** `SCHEMA_ENTRY_RESHAPES_BOUND_SNAPSHOTS`, listing what it would re-shape —
and a dry run answers that 409 too, because it is the status the save gives. Send
`adoptSnapshots: true` alongside the check to ask what the permitted edit would do instead.

⚠️ **An invalid draft is not a failed request.** A 4xx means the _validate request itself_ could not
be served — an id that addresses nothing answers **404**, not a verdict.

⚠️ **`complete: false` means checking stopped early**, because an earlier finding made the later
rules unanswerable. Fix what is listed, ask again, and expect more. **A shorter list is not a
healthier draft.**

⛔ **Gate on `severity`, never on `code`.**

## What will bite you

- **Editing a shape re-fires cached work, deliberately.** An entry edit bumps the version of every
  skill whose compiled schema depends on it — directly or through a nested chain — and that
  version is folded into the ingest cache key. So a shape edit re-runs dependent cached ingests
  with no manual cache bust. Useful, and expensive if you did not expect it.
- **A flow-backed binding is re-validated against a new shape, but the captured snapshot is not
  rewritten.** The drift read is what owns the live comparison — which is why `uncaptured` matters.
- **Vector guards fail open.** An unreachable vector store does not block a save, so a save can
  succeed while the search half of your change quietly did not land.
- **A record type is named by name in handler config**, not by id — which means a rename is not
  something the id-based delete guards can see coming.
- **A schema entry lists every consumer that blocks its delete, and `usedByRelationKinds` is one
  of them.** Alongside `usedByRecordTypes`, `usedByEventTypes`, `usedByConfigNamespaces` and
  `usedAsProfile`, an entry reports the relation kinds whose edge properties it describes. It was
  added because the delete gate began refusing on that column while the list did not report it —
  so an entry consumed only by a link listed as unused and then answered 409 to the delete the
  list had implied was safe.

## How they connect to flows

- The record-creating handler names a record type **by name**, plus the slot carrying the
  submission. Flow-less types are born ready; flow-backed types start pending and are processed.
- `text.generate` does **not** carry its output schema in handler config — the shape lives on the
  skill and points at a schema entry. That is the main link between the registry and a skill.
- A reference to a record-type _instance_ names the type by name too, and is deliberately
  invisible to the id-based delete checks.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the flow a record type binds.
- Embedding profiles (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`) — what `uses.search` names, and where chunking defaults live.
- Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) and Relations (capability pack `relations` — `GET /v1/capability-packs/relations`) — classifying and linking records.
- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — the shape comes first, and what a relation kind's
  declaration moves on the type.
