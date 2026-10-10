<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Relations & links

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> The declaration half rides on the table, so its shape is the table schema. This pack
> carries judgment, not field lists.

## Read this first

⛔ **What genuinely does not exist is MULTI-HOP.** There is no `depth` parameter left at 1 —
recursive traversal is out of scope, and the absence is the contract rather than a default anyone
can raise. Design the read path around that before you author the relations.

Links themselves arrive on more than one surface, and picking the wrong one is where the cost goes:

- `GET /v1/records/{id}/links/{relationKey}` — one record, **one relation** per call. The narrowest
  read, and the only one that reaches a `join-record` relation.
- **Inside a flow**, the record read and list actions can carry a record's links per row, grouped by
  relation and for every relation at once, and the list and count actions can keep only rows that
  carry a link. Both are action configuration, opt-in and off by default — check the function catalog
  for the field names rather than trusting this pack's vocabulary.
- **Over HTTP**, the project's links sweep (`GET /v1/links?project=`) anchored on a record
  (`record=`) returns its links across every relation in one call.

So "show this record and its neighbours" is one call on the surfaces that expand, not one call per
relation. Reach for the per-relation walk when you want exactly one relation, or when the relation
is join-backed.

## What it is

A directed link between two records. Most links exist **because a record's own stored data says
so**; the rest exist because somebody stated them. Which of the two produced a link is stamped on
it and governs everything that can happen to it afterwards — see
[Three producers](#three-producers-and-they-behave-differently).

Three things are authored and one is derived:

- **A relation** is the definition of a kind of link: a key, a label, a direction, a producer,
  optionally a cardinality, and optionally a shape for the link's properties.
- **A pairing** declares that a relation applies between two specific tables. The triple of
  relation, from and to _is_ the row — which is why there is nothing to update on one.
- **A `link` use on the table** names, on a field, **which relation its reference feeds** —
  `{ "kind": "link", "relation": "<relation key>" }` in the table's `uses`, with `element.ref` when
  the field is a list of objects. The table's `relations` document is derived from those uses (and
  from `uses.join`) and is read-only. This is the part that actually makes links.
- **The link itself** is derived for a `field` relation — you never write one directly. `field` is
  the only producer whose links you never author: a `curated` link is asserted directly, and a
  `join-record` relation writes no link at all, because the join records ARE the links.

⭐ **A relation plus a pairing produces nothing.** Until a table declares a field feeding it, the
relation is legal, listed, and doing nothing. That state is _reported_ rather than refused — the
previous generation of this system had a silent version of exactly this, and a whole set of
relations could look healthy while producing no links at all.

⛔ **A relation with NO pairing is a different case, and it is refused outright**: it would be a
definition that applies to no tables and can connect nothing. Three rules keep it out:

- `POST /v1/relations` **requires** at least one pairing. The relation and its first pair are
  written in one transaction, so nothing is lost by requiring it.
- `DELETE /v1/relation-pairings/{id}` **refuses the last one** with `409
RELATION_NO_PAIRINGS`. Delete the relation if that is what you meant.
- Declaring a field that feeds a relation with no pairing is refused rather than warned.

⭐ **A relation that is nonetheless unpaired is still editable.** The refusal is on the CREATE,
not on every write: `PATCH /v1/relations/{id}` carries no `pairings` field, so refusing it
would name something the request could not have contained — and would lock the row out of having
its label or its properties type changed. Adding a pairing is the repair, and it is never
blocked.

## The model in one paragraph

Field-derived links are produced **inside the record write, in the same transaction as the record**.
Writing a record re-derives that record's declared links and supersedes its own previous ones. There
is no link flow, no queue, no model call, and no confidence score — a field either holds a reference
or it does not. Because it is transactional, a link cannot outlive a rolled-back write, and there
is no window where the record is saved and its links are not.

## Three producers, and they behave differently

- **`field`** — the link is a projection of stored data. The declaration is the truth and the rows
  are derived, so they are **reconciled**: a rewrite recomputes the set and hard-deletes what the
  field stopped saying. There is nothing to retract, because there is nothing the field does not
  already decide.
- **`curated`** — somebody stated the link, either over
  `POST /v1/records/{id}/links/{relationKey}` or from one of your own flows. **The
  assertion _is_ the fact**, which changes every operation on it: removal is **expiry, not
  deletion** (`DELETE /v1/records/{id}/links/{relationKey}/{peerRecordId}` stamps an end time and
  keeps who asserted what, and when), nothing reconciles a curated relation, and cardinality is not
  enforced — assertions arrive one at a time from different people, so a limit could only ever be
  checked against whatever happened to have arrived.
- **`join-record`** — the table IS the link. No `Link` row is ever written: a
  traversal resolves against the join table's records instead, and a link's properties are that
  record's own fields. Cardinality is **not enforced here either**, and for a sharper reason — there
  is no link write at all, so nothing on any path could count a degree. The platform refuses one
  rather than storing a limit nobody applies.

⭐ **A curated link is scoped to the actor who asserted it.** Two people asserting the same pair are
two links, and each may retract only their own. There is deliberately no operation that removes
links by endpoint alone.

Both ROUTES above need EDITOR on **both** ends, and both refuse an unresolvable end identically — so
a refusal cannot tell a caller whether the far record exists.

⭐ **A flow states one under a label you choose.** The two actions are
`record.link-assert` and `record.link-retract`; each reads two positional slots — the record the
link runs FROM, then the one it runs TO — so the order between them decides which way a directed
link points. Each slot takes a record ID: after a `record.create`, read `recordId` off its receipt,
since a whole receipt wired there is refused when the action is saved. Assert answers `stated` or
`refused`, and a refusal also leaves a `LINK_REFUSED` warning on the action in the run, since the action
itself still finishes; retract answers `retracted` or `not-found`, and
finding nothing to take back is an ordinary answer rather than a failure. Give the stating action a
label and
the action that takes links back the SAME label, and the second reaches exactly what the first wrote —
never a link a person made by hand, and never another label's. That scoping is why the label
matters more than it looks: it is not a name, it is who is allowed to take the link back. A flow can
never reach a person's link, and cannot learn one is there — finding nothing to take back and
finding somebody else's are the same answer.

⚠️ A flow-stated link carries **no properties**. The route above takes a properties bag and these
actions have no such input, so a relation whose meaning lives in its bag is stated from the route
rather than from a flow.

## When you need it — and when you don't

- **Against a vocabulary.** Use a vocabulary (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`) to classify a record against a set
  of _terms_. Use a relation when the other end is a **first-class record** — article to author,
  claim to source.
- **Directed or symmetric.** Directed makes a pairing's endpoints an ordered pair. Symmetric makes
  them unordered, and the write sorts them so one unordered link has exactly one spelling.

⛔ **A symmetric relation may not name a "one" side.** `many-to-one` is refused on one
(`RELATION_CARDINALITY_UNORDERED`); `many-to-many` and no cardinality at all are both fine.

⚠️ **The values are kebab: `producer` is `field`, `join-record` or `curated`; `cardinality` is
`many-to-one` or `many-to-many`** — on the relation's routes, in `GET /v1/bootstrap` and in the
project document alike. The camelCase spellings a message may still quote (`joinRecord`,
`manyToOne`) are refused on every write. `GET /v1/links` spells each link's `producer` (`links[]`)
the relation's way too. A link's own `origin`, on the records routes and on each `/v1/links` row, is
a different field and keeps its own spelling.

<!-- field-ok: joinRecord — the REFUSED old spelling of a `producer` value, named only to say it is refused -->
<!-- field-ok: manyToOne — the REFUSED old spelling of a `cardinality` value, named only to say it is refused -->

⛔ **There is no one-to-one cardinality.** Nothing limits how many links point INTO a target: every
write path plans one source's links at a time. `many-to-one` is the closest there is.

The pair-sorting a symmetric relation does is why: the degree count runs on the STORED `source`,
which after the swap is whichever record id happens to sort lower — so the limit would fall on an
arbitrary half of the pair. Two records with the same shape of data would get different limits. Make
the relation directed if one end really is the "one".

- **Which producer.** `field` means the link is a projection of stored data — the field is the
  truth and the link follows. `curated` means somebody asserted it and nothing derived may retract
  it. `join-record` means a table IS the link, and no link row is written at all. Choose
  `field` whenever the relationship is already in the payload.

## The sequence

```
POST  /v1/relations        the kind, its pairings AND its declaration — one call
  … write records as usual; their edges are derived by the write …
GET   /v1/records/{id}/links/{relationKey}   walk one hop
```

Creating a relation is deliberately wide: it seeds its pairings atomically, and **at least one is
required**, so a relation is never born without one; a seed pair states `fromTableKey` and
`toTableKey` — tables by **key**, e.g.
`"pairings": [{ "fromTableKey": "recipe", "toTableKey": "ingredient" }]` — the same two
fields a pair added later carries. The key is lower-case kebab and immutable. A pair added later is
its own resource, `POST /v1/relation-pairings` with `relationKey`, `fromTableKey` and `toTableKey`;
`GET /v1/relation-pairings?project=…&tableKey=…` lists the pairs touching one table.
Pairings have **no update** — re-target by deleting and recreating. ⚠️ But that recipe stops working
the moment links exist: a pairing carrying live links is refused outright
(`RELATION_PAIRING_PINNED_BY_LINKS`), and that is ANY pairing, not just the last one, because
removing it would strand the links sitting on it. Remove those links first, or delete the relation.
(Separately, the LAST pairing can never be deleted at all.) A `symmetric` relation that declares the
same two tables both ways round refuses either ordering too while links stand on the pair. Ask
before you press: a read of ONE relation, `GET /v1/relations/{id}?expand=pairings`, gives each pair
its `id` and `deleteRefusal` — either 409 in the delete's own words, or null — from the function the
delete throws from. The list gives each pair its `id` but no `deleteRefusal`: judging every pair
there means counting every live link in the project. The live links are counted when you read, so a
link written in between can still make the delete refuse, with that same sentence. Both resources
are scoped by the project's `OrgNode` id.

### `declaration` — the producer's own half, in the same transaction

The create body takes an optional `declaration`, spliced into the named table's `relations`
inside the relation's own transaction. **Three** arms, and which one is legal follows from
`producer`:

```jsonc
// producer: "field" — name a field the type already has
{ "declaration": { "tableKey": "post", "produces": { "source": { "family": "submission", "field": "sourceId" } } } }

// producer: "field" — have the field WRITTEN for you, in the same transaction
{ "declaration": { "tableKey": "post", "generate": { "field": "sources" } } }

// producer: "join-record"
{ "declaration": { "tableKey": "subscription",
                   "joins": { "from": { "family": "submission", "field": "spaceId" },
                              "to":   { "family": "submission", "field": "sourceId" } } } }
```

A field reference's `family` is one of `submission`, `processed` or `system` — the fields the
record stores. There is no `derived` family; a reference naming it is refused.

⭐ **`generate` is the link bringing its own field.** The other `produces` arm names a property that
already exists, which made one link two jobs: model a reference field on the table, then come back
and point a relation at it. This arm inverts it — the property is composed and written beside the
relation and its pairing, so the whole link lands in one call.

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
        "x-record-ref": "<the pairing's `toTableKey`>",
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
element shape, or your links are silently absent.

`x-owned-by-link` names **which** link decides the field's shape, which is what a reader needs in
order to go and change it. ⚠️ It is not a lock — nothing refuses a later hand-edit of the property,
and a field-level permission is not built.

⛔ **No `readOnly: true` is written beside it**, and the type registry refuses a keyword that names
no reader. To tell that a link owns a field, read `x-owned-by-link`.

⛔ **`generate` requires exactly ONE pairing, and the holder must be that pair's `fromTableKey`.**
The annotation `x-record-ref` holds a single string and every reader of it checks presence rather
than value, so a two-target generated field would carry an annotation that is a lie for half its
rows with nothing to catch it. Both refusals are `TABLE_RELATIONS_INVALID`. Model the field
yourself and use the `produces` arm when a relation needs several pairs.

⛔ **The name goes through the platform's own field-name rule.** A type's property
names become API resource keys, so they must be letter-led alphanumeric (`^[a-zA-Z][a-zA-Z0-9]*$`)
and must not collide with one of the reserved system field names every record already carries.
Both come back as `VALIDATION_FAILED` carrying
`TABLE_CONTRACT_UNDERIVABLE`. ⚠️ It is the same rule, and the same refusal, that guards a
field added through `PATCH /v1/types/{id}` — the create checks it explicitly rather than
inheriting it, because it writes the shape inside its own transaction. A name like `$%^` was
accepted and written before that was closed.

⛔ **It is additive and refuses a name that is taken.** A property that already exists is never
merged into — the name comes back as a 422 rather than silently retyping a field whose records hold
values. This is the same rule the type write path enforces from the other side, where removing a
declared field from a type with records is refused outright (`TYPE_UNSAFE_FOR_TABLE`,
_"Add fields instead"_) — so a generated field can be created and not un-created by the same door.

⚠️ **It resyncs three sections, not two.** The relation lands in `relations`, the declaration in the
table's section, and the field in **`types`** — a client told about only the first
two would resync a table whose declaration names a property its cached type has never heard
of.

⭐ **It splices; it never overwrites.** One table may declare several links, and `relations`
is a single object — so the create reads what is there, folds this relation's entry in, and writes
the whole thing back. Neighbouring declarations survive, and a `produces` entry for the same
relation is replaced rather than doubled.

⛔ **A table is one link or none.** A `joins` declaration naming a table that is already
another relation's link is refused (`TABLE_RELATIONS_INVALID`) rather than spliced over — there
is no value that honours both, so it cannot degrade to a warning.

⚠️ **Omitting it is legal, and for a `join-record` relation it is a trap.** A `field` relation with
no declaration produces nothing and says so; you can add one later with
`PATCH /v1/tables/{id}` — a `link` use naming the relation on the field, or `join` on the table, in
the table's `uses` (see the tables pack (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)). A **join relation
has no link rows to fall back on** — until its table declares `joins`, every traversal resolves
nothing, while the relation is listed and its pairing is right. Send the declaration with the
create.

⭐ **A `link` use TYPES the field.** When the relation's pairings name exactly one target for the
declaring table, saving the use stamps `x-record-ref` with that target onto the field's schema
property — so a plain string that holds ids becomes a typed reference by being used as one, and
`RELATION_SOURCE_FIELD_UNTYPED` stops applying. A marker already there naming a DIFFERENT table is
refused (`USES_MARKER_DISAGREES`) rather than overwritten; a relation with several targets leaves
the field unmarked.

⚠️ **The relation is implied, not spelled.** The stored `produces[]`/`joins` shapes each carry a
`relationKey` because they live in a list on the table; here it is the relation being created, and a
second spelling could only disagree with it.

## Walking a link

`GET /v1/records/{id}/links/{relationKey}` returns the peers, one hop, with the direction resolved
for you — you get _the other end_, never a raw pair you have to work out which side of. It takes a
`direction` of `outgoing` (the default), `incoming` or `either` — any other word is a 422, and a
symmetric relation ignores it, its stored pair being canonical rather than meaningful — so walking
from the target of a relation back to its sources is `?direction=incoming`. It also takes a
limit, whether to include expired links, and an ordering by one of the relation's declared link
properties. Each link names its peer by id — `peerRecordId`, beside its `direction` and `origin` —
and carries none of the peer's fields: read the peers in one call with
`GET /v1/records?project=<node>&id=<peerRecordId>&id=…` (up to 100 ids).

Three behaviours worth knowing before you debug an empty answer:

- **`limit` is yours to set, within a platform ceiling.** It defaults to **50** and is capped at
  **500** per page; asking for more is a 422. A record with more links than one page pages: pass
  the answer's `nextCursor` back as `after`.
- ⚠️ **An unknown relation answers 200 with no links, not 404.** **So an empty list is not evidence
  the record has no links** — check the relation exists before concluding anything.
- **The 404 that does exist is for the record**, and it fires before any link is read — so an
  absent record stays distinguishable from a record with no links of that relation.

**Ordering is ignored, not refused, when the relation declares no link properties.** The response
says which ordering actually ran, so an ignored request is visible rather than silent — read it
rather than assuming the sort you asked for happened.

### Filtering on the data a link carries: the `where` clause, the `count` request

A `link` use on a list of objects may name `element.filters` — the sibling properties to carry on
the link AND to filter on (the tables pack has the declaration side). Each named property is
stamped into an indexed link column, and two clauses read those columns:

- `?where=<prop>:<op>:<value>` — repeatable; several clauses AND. Ops: `eq`, `ne`, `in`, `lt`,
  `lte`, `gt`, `gte`. `in` takes a comma list. The value is typed by the filter's column — an ISO
  instant for a date filter, a number for a number filter, `true`/`false` for a boolean — and a
  value that cannot be typed is a 422. A list-valued property is matched on its FIRST element only,
  because one column holds one value. ⚠️ `ne` matches a link that CARRIES the property with another
  value; a link without the property is unstamped and is not returned.
- `?count=<prop>` — the response carries `counts: { value → n }` for the record's links of that
  relation, computed on the stamped column without loading peers and independent of `limit`. Keys
  are the stamped values as strings. Links that lack the property are not counted under any key. At
  most 500 values come back, largest counts first; `countsTruncated: true` says there were more —
  so counting a near-unique property (an instant, free text) on a busy record is a truncated answer,
  not a complete one.

Both work on the per-relation walk (`GET /v1/records/{id}/links/{relationKey}`) and on the project
sweep (`GET /v1/links?project=…&relation=K&where=…`).

⚠️ **A property nobody declared is a 422 `LINK_FILTER_UNDECLARED`, never a scan.** This is the one
run-time refusal in the vocabulary: a read is never saved, so nothing could validate the clause earlier.
Check the relation's `linkFilters` map (on the relation read) before you offer a property to filter
on.

- **A symmetric relation matches on either side.** Both endpoints may have declared the link with
  different property values; a `where` clause matches if EITHER producer's row matches, and each
  returned link carries `matchedBy` — the producer key of the row that matched.
- **Retracted links are excluded** from a `where` clause and from a `count` request unless
  `includeExpired=true`, the same default the plain walk has.
- **The relation reports its restamp state.** `linkFilters` is the relation's
  `{ property → column }` map, derived from every table filtering on it and read-only on the
  relation. When a table save changes it, `linkRestampPending` is true and `stampedLinkFilters`
  holds the map the rows are still stamped for; clauses are resolved against `stampedLinkFilters`
  until it clears. A property present in `linkFilters` and absent from `stampedLinkFilters` is one
  you cannot filter on yet.
- **Not here: a clause into the peer record's own fields, and OR across clauses.** A `where` names a
  property of the LINK. "Peers whose own field is X" is a query with an `link` clause and `peer`
  (Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)), not this read, and two
  `where` clauses are always AND.

## The clause everything else rests on

⭐ **Supersession is scoped to the producer, never to an endpoint.** Rewriting a record retracts
only the links _that record's own declared field_ produced. Everything else touching either
endpoint — another table's declaration, a curated assertion — survives untouched.

The system this replaced deleted every link touching a record before rewriting it, which is how it
lost links its neighbours had authored. If you remember one thing here, remember that a write is
responsible only for what it claims.

## Asking before you write — `validateOnly`

`POST /v1/relations` takes **`validateOnly: true`** in the body. It runs every rule the real
create runs, writes nothing, and answers **200** with a verdict either way (a created relation is
the 201). Every other write of this family takes the same flag and answers the same verdict:
`PATCH /v1/relations/{id}` (the link rules over every declaration of the relation, and a changed
`producer` as `RELATION_PRODUCER_IMMUTABLE`; the `version` lock is the write's, not the dry run's),
`POST /v1/relation-pairings` (a pair already standing, a dangling table, a second pair on a
`join-record` relation), `DELETE /v1/relation-pairings/{id}?validateOnly=true` (the pair's
`deleteRefusal`, answered now), and `DELETE /v1/relations/{id}?validateOnly=true` (which adds
`consequences`, below):

```json
{
  "ok": false,
  "complete": false,
  "diagnostics": [
    { "code": "RELATION_CARDINALITY_NOT_APPLICABLE", "severity": "error",
      "message": "…", "field": "cardinality" }
  ],
  "derived": { "readiness": { "state": "inert", "reasons": [ … ] } }
}
```

⚠️ **An invalid draft is not a failed request.** The dry run succeeded — it computed a verdict, and
the verdict is "no". A 4xx here means the _validate request itself_ was malformed, which is a
different thing to show a person.

⛔ **Gate on `severity`, never on `code`.** The code is a deliberately open string: a rule added to
the platform tomorrow arrives with a code your build has never heard of and a severity it has.
Treat an unrecognised code as a generic finding of its stated severity.

⚠️ **`complete: false` means checking stopped early**, because an earlier finding made the later
rules unanswerable. Fix what is listed, ask again, and expect more. **A shorter list is not a
healthier draft.**

⚠️ **`ok: true` is a snapshot, not a promise.** The key's uniqueness is a database constraint the
write learns about by attempting it — a collision found here is certain, its absence is not. Nothing
stops another write taking the key between your check and your create; that create answers 409 as it
always did.

⭐ **The `readiness` under `derived` is why this is worth a round trip.** It is the same verdict
`expand=readiness` returns for a link that exists, computed against your draft — so you can see that
a link will land `inert` (no pairing, no producing field, a properties type nothing ticks) _before_
creating it, rather than by noticing a count that never leaves zero. It is not the resource: there
is no id and no version, because nothing was created. ⚠️ A draft has no links to count, so the
forecast cannot say `unproven`: a healthy draft reads `ready` here, and the same relation reads
`unproven` once saved until its first link lands. Read the forecast for `blocked` and `inert`, not
as proof of links.

It is a flag on the real route rather than a sibling `/validate`, deliberately. One route is one set
of rules, so a check that passes and a save that refuses cannot come apart.

## What the platform refuses

- **A producer is required and immutable.** The create body's schema requires it, so a create
  without one is a 422 issue at `producer`, and a document's relation row needs one too. There is
  no default, and ⚠️ it can **never** change (`RELATION_PRODUCER_IMMUTABLE`) — not "once
  links exist": a relation created a second ago with no links at all refuses just the same, because
  the value is denormalised onto every link and the guard consults no count. A PATCH restating the
  current value is fine; any other value is refused.
  Delete the relation and declare a new one.
- **A declaration may only point at a field-producer relation** (`RELATION_PRODUCER_MISMATCH`), and
  only at a relation the project has (`RELATION_NOT_FOUND`; from a `link` use,
  `USES_RELATION_UNKNOWN` inside a `TABLE_USES_INVALID` refusal).
- **A `link` on a field whose shape cannot hold a record id** — a number, a date, a list of objects
  with no string property — is refused at the vocabulary (`USES_ILLEGAL_FOR_SHAPE`), with the remedy
  in the response.
- **Cardinality only where a producer can enforce it** (`RELATION_CARDINALITY_NOT_APPLICABLE`) — a
  curated relation has nothing to count against.
- **A link filter that cannot be a column**, inside a `TABLE_USES_INVALID` refusal of the
  table save: `LINK_FILTER_NOT_FILTERABLE` (a nested or untyped property, or the element's own
  reference), `LINK_FILTER_BUDGET_EXCEEDED` (the relation's 8 text / 2 number / 2 date-time / 2
  boolean columns are taken, counted over EVERY table filtering on the relation),
  `LINK_FILTER_TYPE_CONFLICT` (another table gives the same property a different type — the message
  names it). Nothing is written on a refusal.
- **A clause on a property the relation has no filter for** (`where`, or the `count` request) — 422
  `LINK_FILTER_UNDECLARED`, at read time.
- **A field that is not on the table's contract** (`CONTRACT_FIELD_NOT_FOUND`) or that cannot hold
  a reference at all (`RELATION_SOURCE_FIELD_TYPE`).
- **Values carried onto each link with no properties type to validate them**
  (`RELATION_PROPERTIES_UNDECLARED`) — the `blocked` readiness `PROPERTIES_UNDECLARED`, refused at
  the write instead of reported after it. A create whose declaration ticks element properties
  while `propertiesDataTypeId` is empty is refused, in the save and the `validateOnly` dry run; and
  every PATCH of a relation left in that state is refused (`RELATION_INVALID`) until the patch
  names a properties type or the declaring table's `uses` stops carrying the values.
- **A declaration that could connect nothing**, judged the same way on the relation create, on the
  relation's PATCH and on the table's own save: a join table that is one of the relation's ends
  (`RELATION_JOIN_TYPE_IS_AN_END`), both join ends read from one field
  (`RELATION_JOIN_ENDS_SAME_FIELD`), a source whose `x-record-ref` names a table the relation does
  not pair it with (`RELATION_SOURCE_TARGET_MISMATCH`), carried values the properties type refuses —
  a required one not carried, or an undeclared one on a closed type
  (`RELATION_PROPERTIES_UNSATISFIED`) — or of a type it cannot take
  (`RELATION_PROPERTIES_TYPE_MISMATCH`), and `RELATION_PROPERTIES_UNDECLARED` above. On the table
  they arrive inside a `TABLE_RELATIONS_INVALID` 422 (and its `validateOnly` dry run), each message
  naming the link. ⚠️ **The refusal is flat:** every declaration on the table is judged on every
  save that re-derives it, touched or not, and an edit of the table's type too — a table holding one
  such declaration saves nothing until that link is fixed. A join relation no table declares yet is
  not judged; declare it later. The relation's own PATCH is flat the same way: it judges EVERY
  table's declaration of the relation against the relation the patch leaves behind (its direction,
  its properties type), so a label-only patch of a relation standing on a defective declaration is
  refused too — a `RELATION_INVALID` 422 whose issues sit under `tables.<type>.relations…`,
  each message naming the table that declares it, because the fix is usually there. The same
  judgement, over the state the write leaves behind, runs on the three other writes that move a
  link: `POST /v1/relation-pairings` (with the new pair in), `DELETE /v1/relation-pairings/{id}`
  (with the pair gone — a field still pointing at the table that pair connected, or a declaring
  table left on no pair's source side, `RELATION_SOURCE_TYPE_UNPAIRED`), and a PATCH of the
  relation's properties type (a `required` value no declaration carries, a closed root, a re-typed
  property — and its `validateOnly` dry run says so). Each answers the same `RELATION_INVALID` 422.
  The delete's refusal is published before you press it: `expand=pairings` on the relation's read
  carries it as that pair's `deleteRefusal` (`code: RELATION_INVALID`), in the delete's own words.
  When the relation create's dry run finds a fault in one of the table's OTHER links, it is
  addressed under that table (`tables.<type>.relations…`), not under the create's
  `declaration`; and an edit of a table's type refused over a link names the table that declares it.
- **A project document is judged on the state it leaves behind**, not write by write. A document
  that moves both halves of a link at once — the relation's properties type AND the values the table
  carries, or the relation's pairs AND the field's `x-record-ref` — plans and applies cleanly when
  the result is valid; each owed judgement runs once, after the document's last write, with the same
  codes and the same flat reach, and lands on the row whose write owed it. Moving one half alone is
  refused exactly as the row write would refuse it.
- **A declaration on a table the relation does not connect** (`RELATION_SOURCE_TYPE_UNPAIRED`). The
  declaring table must be on the SOURCE side of one of the relation's pairings — `fromTableKey` for
  a directed relation, either end for a symmetric one, whose pairing is unordered. Otherwise every
  link the field could produce is one the write path drops as an undeclared pair, so the declaration
  could only ever produce nothing.

⚠️ **Passing that check does not promise your links will be written.** It asks the only question
answerable before any record exists: whether the SOURCE table is paired. The target's table comes
from the record's own data, so a record naming a target of an undeclared table still produces no
link — silently, per the rule below that a bad reference never fails a record write.

⚠️ **But a plain-string field is a WARNING, not a refusal** (`RELATION_SOURCE_FIELD_UNTYPED`).
Pointing a declaration at an unannotated string saves successfully and works. Requiring the
stronger form would have gated adoption on migrating every existing shape in a live project — so
this is a deliberate concession, and it means a successful save does not prove your field is
well-typed.

## What will bite you

- **Editing a relation REQUIRES the `version` you last read**, and a stale one is a 409.
  Cardinality and the source/target tables are what every existing link was admitted against, so an
  overwritten edit here is not a lost sentence — it is a rule the stored links no longer match.
- ⭐ **A bad reference never fails the record write.** A field naming a record that does not exist,
  lives in another project, or is the writing record itself produces no link and no error.
  References may dangle, because out-of-order ingest makes that routine rather than exceptional.
  Your write succeeds and your link is simply absent.
- ⚠️ **"Missing" and "belongs to another project" are one refusal, deliberately.** Telling them
  apart would confirm that a foreign id is real.
- **Link identity is the relation, the source, the target and the producer** — so a field naming the
  same target twice is **one** link. That is what the data means: naming a target twice states one
  relationship, and two rows would double-count it in every traversal and every cardinality check.
- **A link's properties are a LIST — one bag per naming of the pair.** A list-of-objects source
  keeps every occurrence in the order the record gave them; an exact repeat is dropped because
  dropping it loses nothing, and a differing repeat joins the list. **For a field-produced link the
  shape does not depend on the count** — one naming is a one-element list, so a consumer never
  branches. ⚠️ A **curated** link is the other shape: it carries the single bag the assertion sent,
  as a bare object rather than a list. On a relation that could hold both, branch on the link's
  producer before reading its properties. A shape that
  changed the first time a second occurrence arrived would break every reader exactly when the
  data got interesting.
- **Materialising links for records written _before_ the declaration is a platform-side backfill**,
  not something you can trigger over the API. New writes need nothing. ⚠️ And a backfill is not
  insert-only — it reconciles, so re-pointing a declaration at a different field and backfilling
  **removes** the old field's links. That is usually what is meant and never what the word
  suggests.
- **The minimum-confidence value is inert.** No producer emits confidence, so nothing reads it.
  <!-- absent: relations-min-confidence-inert -->
- ⛔ **There is no way to hide a relation, and no way to pause one.** Every relation the project has
  is readable. To stop a relation producing, drop the `link` use that feeds it from the table's
  `uses`; to remove it and its links, delete the relation.
- **Link properties are declared from `uses`, and the budget is the RELATION's.** A `link` on a list
  of objects names the element's `ref` and, in `element.filters`, the sibling properties to carry
  and filter on. Fourteen columns per relation — 8 text, 2 number, 2 date-time, 2 boolean — are
  shared by every table filtering on that relation, so a second table declaring filters on the same
  relation spends the first table's budget. A property already on a column keeps it when another
  table adds or drops a filter; a property nobody names any more leaves the map.
- **Changing a relation's filters restamps every live link of the relation, after the save
  returns.** The save records the obligation on the relation (`linkRestampPending`,
  `stampedLinkFilters`) and a runner rewrites the rows in batches. Until it converges, your `where`
  clauses resolve against the map the rows are stamped for, not the one you just saved — coherent,
  and stale.
- **Deleting a relation cascades** to its links _and_ its pairings, and tells you how many of each.
  Ask first with `DELETE /v1/relations/{id}?validateOnly=true`: it rehearses the delete,
  rolls it back, and answers a verdict whose `consequences` carry the `links-deleted` count — the
  same count a document plan reports — and whose `leavesBehind` names any flow the delete breaks.
  Deleting a pairing cascades nothing — but the **last** pairing cannot be deleted at all, because a
  relation that applies to no tables can connect nothing. Delete the relation instead.

## Counting links — two numbers, and picking the wrong one is silent

A relation read offers two counts, both behind `expand`, and they are not interchangeable:

- **`expand=relationCount`** — every `Link` row of this relation, retracted ones included.
  This is the **blast radius**: deleting the relation destroys every one of them, retracted or not.
  Show this in a delete confirmation.
- **`expand=liveRelationCount`** — only the rows with `validTo IS NULL`. This is **what the project
  has right now**, and it is the number that matches what a link walk returns, because every
  ordinary read defaults to the currently-valid set.

⚠️ **They agree on a field-backed relation and diverge on a curated one**, which is exactly why the
mistake is quiet. A field producer HARD-DELETES its links when the field stops saying so (see the
last bullet below), so both counts return the same figure and a surface using either one looks
correct. A curated link is retracted by EXPIRY so its history survives — so on curated relations the
gap opens on the first retraction and widens with every rewrite, and nothing about the response
says which kind of number you are holding.

⭐ **Neither is free, and neither is on by default in the same way.** `relationCount` rides the
relation row's own aggregate; `liveRelationCount` needs a second query, so it is never in the
default expand set and you pay for it only by naming it. Ask for what you will actually show.

## Asking whether a link is doing anything — `expand=readiness`

The counts above say **how much**. They cannot say **whether the thing is wired at all**, and that
is a different question with a much worse failure mode: a relation that applies to no table pair, a
`field` relation no field feeds, and a relation declared a minute ago all report `0`. The first two
will report `0` for as long as they exist. The third is healthy.

`expand=readiness` answers it directly, in the same four words a vocabulary's readiness uses:

- **`blocked`** — it cannot produce a link. Every write is refused.
- **`inert`** — it is wired to nothing, so nothing will ever run.
- **`unproven`** — it is wired and nothing has come through yet.
- **`ready`** — it is carrying links.

Each verdict carries **every** reason, worst first, each with a `code` to branch on and a sentence
safe to show a person. Branch on the code, never on the message.

⚠️ **A reason is not automatically a fault.** `PROPERTIES_INERT` rides a `ready` state: a properties
type with no values ticked builds no bag, so it is stored, never consulted, and stops no link from
being written. It is worth telling somebody and it is not a problem.

⛔ **An input the read did not load produces NO verdict — never a passing one.** The reasons you get
depend on what you asked for: `NEVER_PRODUCED` needs `expand=liveRelationCount` beside it, because
without a live count there is nothing to judge, and `relationCount` must not stand in — it counts
retracted links too, so a relation whose every link has expired would report as producing.
⛔ **And which ROUTE you asked matters more than which expansion.** The LIST route can only ever
emit `NO_PAIRING` and `NEVER_PRODUCED`; the five reasons that need a per-relation read — no
producing field, no join table, and the three properties reasons — come only from the ITEM route. So
one link can legitimately read `unproven` on a board and `blocked` on its own page. ⚠️ For a
`join-record` relation, `NEVER_PRODUCED` is fed by the join table's record count, not by
`liveRelationCount`, which is structurally zero there. What you must
NOT read is a short reason list as a clean bill of health.

⛔ **`NO_PAIRING` is reachable even though the platform refuses to create one.** A create with no
pairing is refused (`RELATION_NO_PAIRINGS`) and the last pairing cannot be deleted, so nothing
can ENTER that state today — but rows that predate those two doors still exist and stay repairable.
The validator calls that check "quarantining a row" rather than enforcing an invariant, and this is
the first read that says so out loud.

## What the read half still does not do

Do not promise these:

- **No multi-hop.** One hop per call, deliberately. A two-hop question is two rounds of calls, and
  bounding that fan-out is yours to do.
  <!-- absent: relations-no-multi-hop -->
- **No link history for a field-backed relation.** Its links are hard-deleted when the field stops
  saying so, because the field is the truth and the history lives on the record. Only a curated
  link expires rather than vanishing.
- **No peer clause on the link read.** A `where` here names a property stamped on the LINK; it
  cannot reach into the peer record's own declared fields. That question is a query: the `link`
  clause of a query takes a `peer` list of `field`, `term` and at most one `semantic` clause on the
  record at the far end, one hop — see the query section of
  Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`). OR across clauses is not
  built anywhere.

## Related

- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — where the declaration
  lives.
- Vocabularies (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`) — when the other end is a term rather than a record.
- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — the table ↔ relation cycle, and the rows a
  create with a declaration touches.
