<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 423f5af968c4 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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
POST /v1/record-types         create the type, referencing the entry
PATCH /v1/record-types/{id}   bind a flowId to make it flow-backed

# Not part of the sequence — the builtin and library shapes are synthesized on
# read and have no rows, so nothing seeds them. This route re-materializes the
# infrastructure-tier Flow-Provider entries only, and is idempotent:
POST /v1/schema-entries/seed
```

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

⚠️ **Do not re-derive either one.** Object-shapedness is not the gate, and
treating it as one is a live way to build a picker that offers a shape the save
then refuses — which is exactly what the operator UI did until it started
reading this flag. Filter on the flag and a refusal becomes impossible to reach
by choosing.

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

## Making a type searchable

A `searchable` declaration is the **only** way a type gets vectors. It names an
embedding profile (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`) and two halves: which fields fill which vector slots
and how they are chunked, and which fields are stored alongside each point.

Nothing physical happens when you save. The collection is **derived** from the project, the
profile and its version, the owner scope and the isolation group, then provisioned in the
background. Nobody names a collection.

Three consequences that catch people out, and only two of them fail _silently_:

- ⚠️ **A field must be declared queryable to be filtered on** — see below. Only those get an index.
  ⭐ This one is **loud**: a filter naming an undeclared key is refused at plan time
  (`SEARCH_FILTER_KEY_NOT_FILTERABLE`) and answered `422 RECORD_FIELD_NOT_INDEXED` at runtime. It
  used to save clean and match nothing at runtime; that silent-zero behaviour is a closed defect, so
  read the 422 as the platform naming the fix rather than as a broken search.
- ⚠️ **The tenant key is the scope key, not the user id.** Filtering by user id against a derived
  collection matches nothing, silently. The scope key holds the user for a user-scoped type, the
  project for a pool type, and the session for a preview write.
- **Turning searchable off does not delete the points immediately.** A background pass notices and
  removes them later.

⚠️ **Moving the searchable declaration itself re-embeds every existing record, and re-embedding
costs credits.** Changing a content slot or the embedding profile makes every stored record's
points stale, and the background reconcile re-runs each record's projection, embedding calls
included. The save itself is instant; the spend arrives record by record as the re-embed drains.
Three changes that look adjacent are **not** in that set: the queryable list moves the payload
index in place (free — see "Making fields filterable"), removing `searchable` entirely deletes
the points without spending credits, and re-pointing the bound flow or the referenced shape
diverges nothing at the save — those records re-embed later, each as it is next reprocessed, not
as this save's own bill.

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

**A content slot's field must be able to hold text, and the platform now says so.** A slot
sourced from an object, a list of objects, or a null-only field is refused
(`SEARCHABLE_FIELD_NOT_EMBEDDABLE`) rather than saved. It used to be accepted, and the result was
the worst of the three possible outcomes: nothing errored, every record rendered to an empty
string, each one was skipped as having no content, and the type sat there looking searchable while
indexing nothing at all.

The refusal is deliberately narrow — only shapes where **no** value could ever render as text.
A field whose schema says nothing, or which admits several scalar types, is still allowed; a
record that happens to be empty is reported per record, which is a fact about data rather than
about the declaration. To combine or reshape something that is not plain text, use a template
slot: it composes fields rather than reading one.

The contract read carries the same answer per field, so an editor can grey the option out and say
why instead of offering it and indexing silence. It is a **separate** question from whether a
field can be filtered — the two overlap and are not the same, and a field can be unfilterable and
perfectly embeddable.

### Editing part of a declaration: send a merge, not the whole document

The `searchable` declaration is a **document**, and so are `queryable` and `relations`. A PATCH
that names one REPLACES it. That is unambiguous and it is a trap for any client that models only part of one: to move a
single content slot you must send back `content.chunking`, `content.stages`, `payload.fields` and
`isolationGroup` as well — and whatever your editor does not model leaves with the write.

⛔ **Nothing catches that.** The request is well-formed, the `version` is current, and you are
overwriting your own read. The optimistic lock refuses a STALE write; it has nothing to say about
a complete one that means less than it says. The answer comes back 200 and the collection loses a
chunking policy nobody typed.

So each of the three has a **merge** twin — `searchableMerge`, `queryableMerge`, `relationsMerge`
— taking an [RFC 7386](https://www.rfc-editor.org/rfc/rfc7386) merge patch:

- a key you **omit** keeps its stored value;
- a key set to **`null`** is removed;
- an object **merges recursively**;
- anything else, **a list included**, replaces.

A list replacing whole is the format's rule and the right one here: `payload.fields` is a list you
send whole when you edit it anyway. The trap was never the list you edited; it was the list you
left alone.

Three things to know before you use it:

- **Send one form or the other, never both.** "Replace with this, and also merge that into it" has
  no reading a caller and a server would agree on, so a request carrying both is refused.
- **The merge needs something to merge into.** A type with no declaration yet is
  `RECORD_TYPE_MERGE_WITHOUT_TARGET` — declare it with the replace form first. Retracting one is
  also the replace form: `searchable: null`.
- **The MERGED document is validated, not your patch.** A patch is a fragment by nature, so it is
  accepted as-is on the wire and the result meets the same strict schema a replacement would have.
  A typo'd key is refused **by name**, and because a `null` in a merge patch DELETES, the refusal
  also lists what your patch removed — `{"content": {"stages": null}}` reads as an edit and is a
  deletion two levels down.

## Making fields filterable

A `queryable` declaration lists the fields records of this type may be **filtered** on. It is a
separate declaration from `searchable`, and that is the point: filtering has nothing to do with
embeddings, so **a type with no vectors at all can still declare fields queryable.**

One list serves both stores. A field you list here is filterable when you query records directly
and when you search by similarity — it is filterable in both, or in neither, so a filter means the
same thing wherever it runs.

Things to know before you declare one:

- **The number of fields is capped, per kind.** Each queryable field takes a fixed storage slot
  shared by every record type, so declaring one is a save rather than a schema change. You get
  thirty-two text fields, eight numbers, eight dates and four booleans — a budget wide enough that
  it is no longer the thing you design around.
- ⚠️ **Saving the list queues a rewrite of every existing record of the type.** The save itself
  returns immediately; a durable background restamp then rewrites each record's filter columns, so
  the filter you just turned on answers correctly for records that already existed, instead of only
  for ones written afterwards. Until it completes, filters answer from the **previous** declaration
  — a coherent window, never a mix of old and new columns — and a crash cannot lose the obligation:
  it is retried at startup and by any later save of the type.
- **On a searchable type, changing this list is still free.** The payload index it feeds moves
  in place in the vector store — no record's points go stale, nothing re-embeds, no credits are
  spent. The only billed change on a searchable type is moving the searchable declaration itself
  (a content slot, or the profile); see "Making a type searchable".
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
- **You do not choose the storage.** The platform assigns each field a slot when
  you save and records it on the declaration — the same way it resolves a derive
  stage's flow. Send the field; leave the slot alone.
- **Removing a field from the list removes the filter, not the data.** Records keep their values,
  so putting it back costs nothing.
- ⚠️ **`searchable.payload.fields[].filterable` is GONE.** It used to be the place you marked a
  field filterable, back when filtering was a property of having vectors. Sending it now is
  refused — the payload field takes a `source` and nothing else. **Listing the field in
  `queryable` is what makes it filterable.** A declaration you saved before the move may still
  have the key stored; it is stripped when read, so nothing you saved stops working.

Once a field is queryable, a listing step can filter on it two ways, and they compose:

- **A fixed filter** carries its own comparison — equals, before/after, at least, at most, or any
  of a list. This is where a **range** lives, and it is the only place one can: "published after
  March", "at least five views". Two fixed filters on one field bound it from both sides.
- **A filter from an upstream value** takes what an earlier step produced. Equals, or any-of when
  the value is a list. There is no range here, because a filter named by field has nowhere to put
  the comparison.

⚠️ **A field that is not on the queryable list is refused, not filtered slowly.** That is
deliberate: the alternative is a filter that quietly reads every record of the type on every
request, forever, which is exactly the cost the declaration exists to avoid. If a listing step
rejects a field, declare it queryable — do not work around it.

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

## What the platform refuses

- **Reserved field names** — the identity, status, error and timestamp fields — may not be
  declared as data fields, nor collide with a derived slot
  (`RECORD_TYPE_DERIVED_FIELD_RESERVED`). Names must be letter-led alphanumeric.
- **Removing a field from an entry while a referencing type has records**
  (`SCHEMA_ENTRY_UNSAFE_FOR_RECORD_TYPE`). Editing an entry re-validates every type referencing
  it, strictest wins.
- **Deleting an entry** while it is a record type's data shape
  (`SCHEMA_ENTRY_REFERENCED_BY_RECORD_TYPE`) or referenced by the type-relation graph
  (`SCHEMA_REFERENCED_BY_GRAPH`).
- **Deleting a record type** that has records (`RECORD_TYPE_PINNED_BY_RECORDS`), was seeded
  (`RECORD_TYPE_SEEDED_READONLY`), or carries a reserved type name
  (`RECORD_TYPE_NAME_RESERVED` — a platform-wide set, not something your project defines).
  Deleting a type removes only the descriptor; the entry outlives it.

  ⚠️ It does **not** leave the relation graph alone, and the response says what went. A record-type
  pair naming the deleted type disappears with it — so a link that applied to no other pair is now a
  link that connects nothing, cannot be produced and cannot be traversed. Those links are deleted
  too, along with every connection they had made, and their keys come back in
  `deletedRelationKinds`. A link that still applies to another pair survives untouched.
  `invalidatedJoins`, beside it, reports the OTHER record types whose `joins` declaration this
  delete voided. Both exist because you asked to remove one thing and something else changed.

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
re-bind re-derives the `processed` family and re-validates all three declarations — the searchable
one, the queryable one and the relations one — against the new signature **before the write opens at
all**, so one stale declaration refuses the whole save, including the rename that rode along with
it. (Validation precedes the transaction rather than sharing it; the effect on you is the same, and
it is why nothing partial can land.) This route is how you find
that out before you send it.

⛔ **Do not re-derive the contract yourself.** It is a pure function of the data shape's schema and
the flow's captured signature, and re-implementing it in an editor is how a declaration gets
approved against one vocabulary and indexed against another. Ask.

### And ask what the SAVE would do: `POST /v1/record-types/{id}/write-preview`

The contract preview above answers what the field vocabulary would be. This one answers what your
PATCH would DO — send it the same body you are about to save, and nothing is written.

⛔ **The two answers worth having are the two a save gives you no way to see.** A 200 that quietly
enqueues a full reindex, and a 200 that writes fewer columns than you meant. `effects.reindex` is
the expensive one (a declaration change, a re-bind, a re-point — and a RENAME, which invalidates
every stored point's payload namespace); `effects.restamp` says every row's query slots would be
re-stamped. An **empty `writes`** means your request changes nothing at all, which is otherwise
indistinguishable from a save that changed everything you intended.

- **`resolved`** is each declaration as it would be STORED, not as you sent it. `queryable` gains
  the storage slot each field resolved to and `searchable` has its per-record derive stages bound
  to concrete flow ids — the half you cannot compute yourself. Each one is a **full declaration
  document of the same shape you would send to the PATCH**, or `null` where the type would declare
  nothing, so you can diff it field by field against what you sent rather than treating it as an
  opaque blob.
- **`removes`** names the keys a `…Merge` patch would DELETE, by path. A merge patch's `null`
  removes rather than sets and the deletion is buried, so this is where you see it before you send
  it rather than in a refusal afterwards.
- **`accepted: false` comes back 200**, carrying the status the save would answer, its code and the
  platform's own sentence. The point of asking is to find out; a preview that failed the way the
  save fails would tell you nothing you could not learn by saving.
- **`staleVersion`** is reported on its own, because everything else about the plan is still true.
  It means re-read and reconcile, not that your patch is wrong.

It runs the save's own decision phase rather than a description of it, so an answer here cannot
disagree with the write. **EDITOR**, and a POST: the body is three documents, and the question is
what YOUR save would do.

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
PUT  /v1/record-types/{id}/natural-key            { "field": "externalId" }   declare
PUT  /v1/record-types/{id}/natural-key            { "field": null }           retract
POST /v1/record-types/{id}/natural-key-preview    { "fields": [...] }         ask first
```

### Declaring is a promise about the data you already have

⛔ **It is not a configuration edit, which is why it is not part of the PATCH.** Declaring verifies
every existing record, stamps them all, and persists the declaration — in ONE transaction. A record
that cannot supply the field, or a value two records share, refuses the whole thing with **409
`RECORD_TYPE_NATURAL_KEY_UNSATISFIED`**, listing the offending values so you can act on them. Nothing
partial lands.

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
  reason applied to a separator.
- **The value must be a string, and it is not coerced.** `1` and `"1"` would otherwise be the same
  record. Max 512 characters.
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

State the whole list at once. The request names the facet keys in the order the type surfaces
them, and that order is the field order the API emits; re-sending the same list changes nothing.
Sending a shorter list unlinks what you left out, and sending the same keys in a different order
is how you reorder. There is no separate attach verb and no separate detach verb, so a half-applied
change is not something the API can produce.

What it refuses: a key that is not a facet of this project, a key that repeats, and any change at
all to a seeded record type. Within a category the refusal is complete — every unknown key is named
at once, so eight bad keys are one round trip rather than eight — but the two categories are
reported separately, and a repeat is reported before an unknown.

Reading the current list is an expansion on the ordinary type read rather than an endpoint of its
own. An empty list means the type surfaces nothing — which is not the same as the project having
no facets, and the difference is the whole point of the link.

Each entry carries the facet's own label, binding, cardinality and BOTH of its admission
settings — `mint` (what a value the facet has never seen may become: `none`, `active` or
`candidate`) and `matching` (how an existing term is found: `exact` or `semantic`) — so a client
can render the list without a second call. These two replaced a single `mode` field that conflated
them; a reader that showed one word could not distinguish a fixed vocabulary matched by slug from
one searched by meaning, which are very different facets to hand a record type. See
Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) for what to choose.

Unlinking is not deletion. The term rows a record already carries survive it; the link decides what
is projected, never what is stored, so re-linking brings the same values back.

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

## How they connect to flows

- The record-creating handler names a record type **by name**, plus the slot carrying the
  submission. Flow-less types are born ready; flow-backed types start pending and are processed.
- `text.generate` does **not** carry its output schema in handler config — the shape lives on the
  skill and points at a schema entry. That is the main link between the registry and a skill.
- A reference to a record-type _instance_ names the type by name too, and is deliberately
  invisible to the id-based delete checks.

## Related

- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — the flow a record type binds.
- Embedding profiles (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`) — what a searchable declaration names.
- Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) and Relations (capability pack `relations` — `GET /v1/capability-packs/relations`) — classifying and linking records.
