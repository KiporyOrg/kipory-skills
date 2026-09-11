<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 423f5af968c4 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Relations

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> The declaration half rides on the record type, so its shape is the record-type schema. This pack
> carries judgment, not field lists.

## Read this first

⛔ **What genuinely does not exist is MULTI-HOP.** There is no `depth` parameter left at 1 —
recursive traversal is out of scope, and the absence is the contract rather than a default anyone
can raise. Design the read path around that before you author the vocabulary.

Edges themselves arrive on more than one surface, and picking the wrong one is where the cost goes:

- `GET /v1/records/{id}/relations/{kind}` — one record, **one kind** per call. The narrowest read,
  and the only one that reaches a `joinRecord` kind.
- **Inside a flow**, the entity read and list steps can carry a record's edges per row, grouped by
  kind and for every kind at once, and the list and count steps can keep only rows that carry a
  link. Both are step configuration, opt-in and off by default — check the handler catalog for the
  field names rather than trusting this pack's vocabulary.
- **Over HTTP**, a project-scoped relations read anchored on a record returns its edges across every
  kind in one call.

So "show this record and its neighbours" is one call on the surfaces that expand, not one call per
kind. Reach for the per-kind walk when you want exactly one kind, or when the kind is join-backed.

## What it is

A directed edge between two records. Most edges exist **because a record's own stored data says
so**; the rest exist because somebody stated them. Which of the two produced an edge is stamped on
it and governs everything that can happen to it afterwards — see
[Three producers](#three-producers-and-they-behave-differently).

Three things are authored and one is derived:

- **A relation kind** is the vocabulary for an edge type: a key, a label, a direction, a producer,
  optionally a cardinality, and optionally a shape for the edge's properties.
- **A pairing** declares that a kind applies between two specific record types. The triple of
  kind, from and to _is_ the row — which is why there is nothing to update on one.
- **A declaration on the record type** names, for each kind, **which field carries the reference**.
  This is the part that actually makes edges.
- **The edge itself** is derived for a `field` kind — you never write one directly. `field` is the
  only producer whose edges you never author: a `curated` edge is asserted directly, and a
  `joinRecord` kind writes no edge at all, because the join records ARE the edges.

⭐ **A kind plus a pairing produces nothing.** Until a record type declares a field feeding it, the
kind is legal, listed, and doing nothing. That state is _reported_ rather than refused — the
previous generation of this system had a silent version of exactly this, and a whole edge
vocabulary could look healthy while producing no edges at all.

⛔ **A kind with NO pairing is a different case, and it is now refused outright.** It used to be
allowed and called _inert_: a create could omit the pairing seed, the last pairing could be deleted,
and what was left was a vocabulary entry that applied to no record types and could connect nothing.
Three things changed at once:

- `POST /v1/relation-kinds` **requires** at least one pairing. The kind and its first pair are
  written in one transaction, so nothing is lost by requiring it.
- `DELETE /v1/relation-kind-pairings/{id}` **refuses the last one** with `409
RELATION_KIND_NO_PAIRINGS`. Delete the kind if that is what you meant.
- Declaring a field that feeds a kind with no pairing is refused rather than warned.

The state was reported through a `warnings` list that no caller read, and the behaviour it warned
about — edges being discarded at write time — had already been retired with the handler that
enforced it. So it was a legal state that described nothing, warned nobody, and no longer did what
it claimed.

⭐ **A kind left unpaired from before the change is still editable.** The refusal is on the CREATE,
not on every write: `PATCH /v1/relation-kinds/{id}` carries no `pairings` field, so refusing it
would name something the request could not have contained — and would lock the row out of having
its label or its properties entry changed. Adding a pairing is the repair, and it is never
blocked.

## The model in one paragraph

Field-derived edges are produced **inside the record write, in the same transaction as the record**.
Writing a record re-derives that record's declared edges and supersedes its own previous ones. There
is no link flow, no queue, no model call, and no confidence score — a field either holds a reference
or it does not. Because it is transactional, an edge cannot outlive a rolled-back write, and there
is no window where the record is saved and its edges are not.

## Three producers, and they behave differently

- **`field`** — the edge is a projection of stored data. The declaration is the truth and the rows
  are derived, so they are **reconciled**: a rewrite recomputes the set and hard-deletes what the
  field stopped saying. There is nothing to retract, because there is nothing the field does not
  already decide.
- **`curated`** — somebody stated the edge, either over
  `POST /v1/records/{id}/relations/{kind}` or from one of your own flows. **The
  assertion _is_ the fact**, which changes every operation on it: removal is **expiry, not
  deletion** (`DELETE /v1/records/{id}/relations/{kind}/{peerRecordId}` stamps an end time and
  keeps who asserted what, and when), nothing reconciles a curated kind, and cardinality is not
  enforced — assertions arrive one at a time from different people, so a limit could only ever be
  checked against whatever happened to have arrived.
- **`joinRecord`** — the record type IS the edge. No `RecordRelation` row is ever written: a
  traversal resolves against the join type's records instead, and an edge's properties are that
  record's own fields. Cardinality is **not enforced here either**, and for a sharper reason — there
  is no edge write at all, so nothing on any path could count a degree. The platform refuses one
  rather than storing a limit nobody applies.

⭐ **A curated edge is scoped to the actor who asserted it.** Two people asserting the same pair are
two edges, and each may retract only their own. There is deliberately no operation that removes
edges by endpoint alone.

Both ROUTES above need EDITOR on **both** ends, and both refuse an unresolvable end identically — so
a refusal cannot tell a caller whether the far record exists.

⭐ **A flow states one under a label you choose.** The two steps are
`entity.link-assert` and `entity.link-retract`; each reads two positional slots — the record the
link runs FROM, then the one it runs TO — so the order between them decides which way a directed
link points. Assert answers `stated` or `refused`; retract answers `retracted` or `not-found`, and
finding nothing to take back is an ordinary answer rather than a failure. Give the stating step a
label and
the step that takes edges back the SAME label, and the second reaches exactly what the first wrote —
never an edge a person made by hand, and never another label's. That scoping is why the label
matters more than it looks: it is not a name, it is who is allowed to take the edge back. A flow can
never reach a person's edge, and cannot learn one is there — finding nothing to take back and
finding somebody else's are the same answer.

⚠️ A flow-stated link carries **no properties**. The route above takes a properties bag and these
steps have no such input, so a kind whose meaning lives in its bag is stated from the route rather
than from a flow.

## When you need it — and when you don't

- **Against a facet.** Use a facet (capability pack `facets` — `GET /v1/capability-packs/facets`) to classify a record against a vocabulary of
  _terms_. Use a relation when the other end is a **first-class record** — article to author,
  claim to source.
- **Directed or symmetric.** Directed makes a pairing's endpoints an ordered pair. Symmetric makes
  them unordered, and the write sorts them so one unordered edge has exactly one spelling.

⛔ **A symmetric kind may not name a "one" side.** `manyToOne` is refused on one
(`RELATION_CARDINALITY_UNORDERED`); `manyToMany` and no cardinality at all are both fine.

<!-- field-ok: manyToOne — a VALUE of the `cardinality` enum (`relationKindCardinalitySchema`), not a wire field -->
<!-- field-ok: joinRecord — a VALUE of the `producer` enum (`relationKindProducerSchema`), not a wire field -->
<!-- field-ok: traversalLimit — a RETIRED column, named only to say it is gone; no contract declares it and none should -->
<!-- field-ok: oneToOne — a REMOVED enum value, named only to say it is gone -->
<!-- field-ok: manyToMany — a VALUE of the `cardinality` enum, not a wire field -->

⛔ **`oneToOne` was removed, and what it promised was never enforced.** It meant `manyToOne` PLUS
"at most one edge into a target" — and nothing ever checked the second half: every write path plans
one source's edges at a time, so the in-degree branch was unreachable, and the unique index its
comment named does not exist (`(kindId, targetRecordId)` is a plain index). It behaved exactly like
`manyToOne`. **A kind that carried it should be `manyToOne`** — that is what it actually delivered.

The pair-sorting a symmetric kind does is why: the degree count runs on the STORED `source`, which
after the swap is whichever record id happens to sort lower — so the limit would fall on an arbitrary half of the
pair. Two records with the same shape of data would get different limits. Make the kind directed if
one end really is the "one".

- **Which producer.** `field` means the edge is a projection of stored data — the field is the
  truth and the edge follows. `curated` means somebody asserted it and nothing derived may retract
  it. `joinRecord` means a record type IS the edge, and no edge row is written at all. Choose
  `field` whenever the relationship is already in the payload.

## The sequence

```
POST  /v1/relation-kinds        the kind, its pairings AND its declaration — one call
  … write records as usual; their edges are derived by the write …
GET   /v1/records/{id}/relations/{kind}   walk one hop
```

Creating a kind is deliberately wide: it seeds its pairings atomically, and **at least one is
required**, so a kind is never born without one. The key is immutable. Pairings have **no update** — re-target by deleting and
recreating. ⚠️ But that recipe stops working the moment edges exist: a pairing carrying live edges
is refused outright (`RELATION_PAIRING_PINNED_BY_EDGES`), and that is ANY pairing, not just the
last one, because removing it would strand the links sitting on it. Remove those edges first, or
delete the kind. (Separately, the LAST pairing can never be deleted at all.) Both resources are scoped by the project's `OrgNode` id.

### `declaration` — the producer's own half, in the same transaction

The create body takes an optional `declaration`, spliced into the named record type's `relations`
inside the kind's own transaction. **Three** arms, and which one is legal follows from `producer`:

```jsonc
// producer: "field" — name a field the type already has
{ "declaration": { "recordType": "post", "produces": { "source": { "family": "submission", "field": "sourceId" } } } }

// producer: "field" — have the field WRITTEN for you, in the same transaction
{ "declaration": { "recordType": "post", "generate": { "field": "sources" } } }

// producer: "joinRecord"
{ "declaration": { "recordType": "subscription",
                   "joins": { "from": { "family": "submission", "field": "spaceId" },
                              "to":   { "family": "submission", "field": "sourceId" } } } }
```

⭐ **`generate` is the link bringing its own field.** The other `produces` arm names a property that
already exists, which made one link two jobs: model a reference field on the entity, then come back
and point a kind at it. This arm inverts it — the property is composed and written beside the kind
and its pairing, so the whole link lands in one call.

The generated property is exactly what a `recordRef` compiles to, as a list:

```jsonc
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "ref": {
        "type": "string",
        "minLength": 1,
        "x-record-ref": "<the pairing's `to`>",
      },
    },
    "required": ["ref"],
    // Open, so a properties type declared later has somewhere to put its
    // values without reshaping a field whose records already hold data.
    "additionalProperties": true,
  },
  "x-owned-by-link": "<the kind's key>",
}
```

⛔ **The element is an OBJECT with a `ref`, not a bare string, and the difference is
load-bearing.** An array of plain strings is not a shape either half of the platform supports:
the declaration validator's flat arm requires the field's own branches to be `string`, and the
producer reads `typeof value === "string"` and takes ONE target. A create generating that shape
came back `RELATION_SOURCE_FIELD_TYPE` — measured against a live API. The two shapes that exist are
a scalar string (one target) and an array of objects read through an `element` source (many); a
link usually means many, so a generated field is the element form. Write records against the
element shape, or your edges are silently absent.

`x-owned-by-link` names **which** link decides the field's shape, which is what a reader needs in
order to go and change it. ⚠️ It is not a lock — nothing refuses a later hand-edit of the property,
and a field-level permission is not built.

⛔ **A `readOnly: true` was written beside it and no longer is.** It was carried as the spec
annotation "any schema-aware editor already understands", which is a fact about the spec rather than
about anything on this platform reading it — and the type registry now refuses a keyword that names
no reader. Emitting it made the record type's own schema entry refuse its next edit. If you relied
on it to grey the field out, read `x-owned-by-link` instead: its presence is the same signal and it
is a fact the platform actually keeps.

⛔ **`generate` requires exactly ONE pairing, and the holder must be that pair's `from`.** The
annotation `x-record-ref` holds a single string and every reader of it checks presence rather than
value, so a two-target generated field would carry an annotation that is a lie for half its rows
with nothing to catch it. Both refusals are `RECORD_TYPE_RELATIONS_INVALID`. Model the field
yourself and use the `produces` arm when a kind needs several pairs.

⛔ **The name goes through the platform's own field-name rule.** A data entry's property
names become API resource keys, so they must be letter-led alphanumeric (`^[a-zA-Z][a-zA-Z0-9]*$`)
and must not collide with one of the reserved system field names every record already carries.
Both come back as `VALIDATION_FAILED` carrying
`RECORD_TYPE_CONTRACT_UNDERIVABLE`. ⚠️ It is the same rule, and the same refusal, that guards a
field added through `PATCH /v1/schema-entries/{id}` — the create checks it explicitly rather than
inheriting it, because it writes the shape inside its own transaction. A name like `$%^` was
accepted and written before that was closed.

⛔ **It is additive and refuses a name that is taken.** A property that already exists is never
merged into — the name comes back as a 422 rather than silently retyping a field whose records hold
values. This is the same rule the entry write path enforces from the other side, where removing a
declared field from a type with records is refused outright (`SCHEMA_ENTRY_UNSAFE_FOR_RECORD_TYPE`,
_"Add fields instead"_) — so a generated field can be created and not un-created by the same door.

⚠️ **It resyncs three sections, not two.** The kind lands in `relations`, the declaration in the
record type's section, and the field in **`schema-entries`** — a client told about only the first
two would resync a record type whose declaration names a property its cached entry has never heard
of.

⭐ **It splices; it never overwrites.** One record type may declare several links, and `relations`
is a single object — so the create reads what is there, folds this kind's entry in, and writes the
whole thing back. Neighbouring declarations survive, and a `produces` entry for the same kind is
replaced rather than doubled.

⛔ **A record type is one edge or none.** A `joins` declaration naming a type that is already
another kind's edge is refused (`RECORD_TYPE_RELATIONS_INVALID`) rather than spliced over — there
is no value that honours both, so it cannot degrade to a warning.

⚠️ **Omitting it is legal, and for a `joinRecord` kind it is a trap.** A `field` kind with no
declaration produces nothing and says so; you can add one later with
`PATCH /v1/record-types/{id}`. A **join kind has no edge table to fall back on** — until its type
declares `joins`, every traversal resolves nothing, while the kind is listed and its pairing is
right. Send the declaration with the create.

⚠️ **The `kind` is implied, not spelled.** The stored `produces[]`/`joins` shapes each carry a
`kind` because they live in a list on the record type; here it is the kind being created, and a
second spelling could only disagree with it.

## Walking an edge

`GET /v1/records/{id}/relations/{kind}` returns the peers, one hop, with the direction resolved for
you — you get _the other end_, never a raw pair you have to work out which side of. It takes a
direction (ignored for a symmetric kind, whose stored pair is canonical rather than meaningful), a
limit, whether to include expired edges, and an ordering by one of the kind's declared edge
properties.

Three behaviours worth knowing before you debug an empty answer:

- **`limit` is yours to set, within a platform ceiling.** It defaults to **50** and is capped at
  **500**; asking for more is a 400, and the resolver clamps regardless of which route calls it.
  ⚠️ It used to be a ceiling the KIND set and you could only lower — that per-link
  `traversalLimit` is removed. How many edges a read returns is a property of the question.
- ⚠️ **An unknown kind answers 200 with no edges, not 404.** **So an empty list is not evidence
  the record has no edges** — check the kind exists before concluding anything. (This used to be
  load-bearing for a second reason: a kind could be marked "not exposed" and had to be
  indistinguishable from a missing one. That flag is gone; the shape stays, so the three read
  surfaces cannot diverge on what they return.)
- **The 404 that does exist is for the record**, and it fires before any edge is read — so an
  absent record stays distinguishable from a record with no edges of that kind.

**Ordering is ignored, not refused, when the kind declares no edge properties.** The response says
which ordering actually ran, so an ignored request is visible rather than silent — read it rather
than assuming the sort you asked for happened.

## The clause everything else rests on

⭐ **Supersession is scoped to the producer, never to an endpoint.** Rewriting a record retracts
only the edges _that record's own declared field_ produced. Everything else touching either
endpoint — another type's declaration, a curated assertion — survives untouched.

The system this replaced deleted every edge touching a record before rewriting it, which is how it
lost edges its neighbours had authored. If you remember one thing here, remember that a write is
responsible only for what it claims.

## What the platform refuses

- **A producer is required and immutable** (`RELATION_PRODUCER_REQUIRED`,
  `RELATION_PRODUCER_IMMUTABLE`). There is no default, and ⚠️ it can **never** change — not "once
  edges exist": a kind created a second ago with no edges at all refuses just the same, because the
  value is denormalised onto every edge and the guard consults no count. A PATCH restating the
  current value is fine (the editor patches the whole object back); any other value is refused.
  Delete the kind and declare a new one.
- **A declaration may only point at a field-producer kind** (`RELATION_PRODUCER_MISMATCH`), and
  only at a kind the project has (`RELATION_KIND_NOT_FOUND`).
- **Cardinality only where a producer can enforce it** (`RELATION_CARDINALITY_NOT_APPLICABLE`) — a
  curated kind has nothing to count against.
- **A field that is not on the type's contract** (`CONTRACT_FIELD_NOT_FOUND`) or that cannot hold
  a reference at all (`RELATION_SOURCE_FIELD_TYPE`).
- **A declaration on a type the kind does not connect** (`RELATION_SOURCE_TYPE_UNPAIRED`). The
  declaring record type must be on the SOURCE side of one of the kind's pairings — `from` for a
  directed kind, either end for a symmetric one, whose pairing is unordered. Otherwise every edge
  the field could produce is one the write path drops as an undeclared pair, so the declaration
  could only ever produce nothing.

⚠️ **Passing that check does not promise your edges will be written.** It asks the only question
answerable before any record exists: whether the SOURCE type is paired. The target's type comes
from the record's own data, so a record naming a target of an undeclared type still produces no
edge — silently, per the rule below that a bad reference never fails a record write.

⚠️ **But a plain-string field is a WARNING, not a refusal** (`RELATION_SOURCE_FIELD_UNTYPED`).
Pointing a declaration at an unannotated string saves successfully and works. Requiring the
stronger form would have gated adoption on migrating every existing shape in a live project — so
this is a deliberate concession, and it means a successful save does not prove your field is
well-typed.

## What will bite you

- **Editing a relation kind REQUIRES the `version` you last read**, and a stale one is a 409.
  Cardinality and the source/target types are what every existing edge was admitted against, so an
  overwritten edit here is not a lost sentence — it is a rule the stored edges no longer match.
- ⭐ **A bad reference never fails the record write.** A field naming a record that does not exist,
  lives in another project, or is the writing record itself produces no edge and no error.
  References may dangle, because out-of-order ingest makes that routine rather than exceptional.
  Your write succeeds and your edge is simply absent.
- ⚠️ **"Missing" and "belongs to another project" are one refusal, deliberately.** Telling them
  apart would confirm that a foreign id is real.
- **Edge identity is the kind, the source, the target and the producer** — so a field naming the
  same target twice is **one** edge. That is what the data means: naming a target twice states one
  relationship, and two rows would double-count it in every traversal and every cardinality check.
- **An edge's properties are a LIST — one bag per naming of the pair.** A list-of-objects source
  keeps every occurrence in the order the record gave them; an exact repeat is dropped because
  dropping it loses nothing, and a differing repeat joins the list. **For a field-produced edge the shape does not
  depend on the count** — one naming is a one-element list, so a consumer never branches. ⚠️ A
  **curated** edge is the other shape: it carries the single bag the assertion sent, as a bare
  object rather than a list. On a kind that could hold both, branch on the edge's producer before
  reading its properties. A shape that
  changed the first time a second occurrence arrived would break every reader exactly when the
  data got interesting.
- **Materialising edges for records written _before_ the declaration is a platform-side backfill**,
  not something you can trigger over the API. New writes need nothing. ⚠️ And a backfill is not
  insert-only — it reconciles, so re-pointing a declaration at a different field and backfilling
  **removes** the old field's edges. That is usually what is meant and never what the word
  suggests.
- **The minimum-confidence value is inert.** No producer emits confidence, so nothing reads it.
  <!-- absent: relations-min-confidence-inert -->
- ⛔ **There is no way to hide a kind, and no way to pause one.** There was an `exposed` flag; it
  gated READS only — both producers wrote through it, the reconciler ran through it, and storage
  grew through it — so it could never stop the thing worth stopping, while the empty answer it
  produced was indistinguishable from "no such kind". It has been removed. To stop a kind
  producing, clear the declaration that feeds it; to remove it and its edges, delete the kind.
- **Deleting a kind cascades** to its edges _and_ its pairings, and tells you how many of each.
  Deleting a pairing cascades nothing — but the **last** pairing cannot be deleted at all, because a
  kind that applies to no record types can connect nothing. Delete the kind instead.

## Counting edges — two numbers, and picking the wrong one is silent

A relation-kind read offers two counts, both behind `expand`, and they are not interchangeable:

- **`expand=relationCount`** — every `RecordRelation` row of this kind, retracted ones included.
  This is the **blast radius**: deleting the kind destroys every one of them, retracted or not.
  Show this in a delete confirmation.
- **`expand=liveRelationCount`** — only the rows with `validTo IS NULL`. This is **what the project
  has right now**, and it is the number that matches what an edge walk returns, because every
  ordinary read defaults to the currently-valid set.

⚠️ **They agree on a field-backed kind and diverge on a curated one**, which is exactly why the
mistake is quiet. A field producer HARD-DELETES its edges when the field stops saying so (see the
last bullet below), so both counts return the same figure and a surface using either one looks
correct. A curated edge is retracted by EXPIRY so its history survives — so on curated kinds the
gap opens on the first retraction and widens with every rewrite, and nothing about the response
says which kind of number you are holding.

⭐ **Neither is free, and neither is on by default in the same way.** `relationCount` rides the
kind row's own aggregate; `liveRelationCount` needs a second query, so it is never in the default
expand set and you pay for it only by naming it. Ask for what you will actually show.

## Asking whether a link is doing anything — `expand=readiness`

The counts above say **how much**. They cannot say **whether the thing is wired at all**, and that
is a different question with a much worse failure mode: a kind that applies to no entity pair, a
`field` kind no field feeds, and a kind declared a minute ago all report `0`. The first two will
report `0` for as long as they exist. The third is healthy.

`expand=readiness` answers it directly, in the same four words a facet's readiness uses:

- **`blocked`** — it cannot produce an edge. Every write is refused.
- **`inert`** — it is wired to nothing, so nothing will ever run.
- **`unproven`** — it is wired and nothing has come through yet.
- **`ready`** — it is carrying edges.

Each verdict carries **every** reason, worst first, each with a `code` to branch on and a sentence
safe to show a person. Branch on the code, never on the message.

⚠️ **A reason is not automatically a fault.** `PROPERTIES_INERT` rides a `ready` state: a properties
type with no values ticked builds no bag, so it is stored, never consulted, and stops no edge from
being written. It is worth telling somebody and it is not a problem.

⛔ **An input the read did not load produces NO verdict — never a passing one.** The reasons you get
depend on what you asked for: `NEVER_PRODUCED` needs `expand=liveRelationCount` beside it, because
without a live count there is nothing to judge, and `relationCount` must not stand in — it counts
retracted edges too, so a kind whose every edge has expired would report as producing.
⛔ **And which ROUTE you asked matters more than which expansion.** The LIST route can only ever
emit `NO_PAIRING` and `NEVER_PRODUCED`; the five reasons that need a per-kind read — no producing
field, no join type, and the three properties reasons — come only from the ITEM route. So one link
can legitimately read `unproven` on a board and `blocked` on its own page. ⚠️ For a `joinRecord`
kind, `NEVER_PRODUCED` is fed by the join type's record count, not by `liveRelationCount`, which is
structurally zero there. What you must
NOT read is a short reason list as a clean bill of health.

⛔ **`NO_PAIRING` is reachable even though the platform refuses to create one.** A create with no
pairing is refused (`RELATION_KIND_NO_PAIRINGS`) and the last pairing cannot be deleted, so nothing
can ENTER that state today — but rows that predate those two doors still exist and stay repairable.
The validator calls that check "quarantining a row" rather than enforcing an invariant, and this is
the first read that says so out loud.

## What the read half still does not do

Do not promise these:

- **No multi-hop.** One hop per call, deliberately. A two-hop question is two rounds of calls, and
  bounding that fan-out is yours to do.
  <!-- absent: relations-no-multi-hop -->
- **No edge history for a field-backed kind.** Its edges are hard-deleted when the field stops
  saying so, because the field is the truth and the history lives on the record. Only a curated
  edge expires rather than vanishing.

## Related

- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — where the declaration
  lives.
- Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) — when the other end is a term rather than a record.
