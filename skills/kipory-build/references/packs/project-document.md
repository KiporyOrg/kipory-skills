<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — The project document

> **Source of truth for facts:** the document's JSON Schema → live `GET /v1/project-document/schema`;
> endpoint paths & request shapes → live `GET /v1/openapi.json`. This pack carries judgment: what the
> document is for, how a whole project is read as one, and what travels in it and what does not.

## What it is

A project's whole configuration — its types, tables, relations, vocabularies, views and shapes,
events, flows, entry points and eval suites — as ONE nested document addressed by key. Nesting expresses
ownership: a flow's steps sit under the flow, a vocabulary's terms under the vocabulary, a suite's
cases under the suite. Ids are optional; the platform fills
them in on export and matches by them on apply. The document you write is the document the
platform hands back.

Read it before authoring anything larger than one row. The row-by-row API has an order — a
table needs its type first, a relation its tables, a trigger its flow — and the
Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) page states it. The document exists so that you need not
know it: state the whole project by key, and the platform resolves the order.

## Read a project as one document

`GET /v1/projects/{nodeId}/document` answers the project as a document, with the `version` the
project stands at. The document itself carries the read as a top-level `basedOn`:
`<nodeId>@<version>`, the project it was read from and its version then — the read your change is
made on. Keep it in the file: a plan binds to it. It is the same read as `GET /v1/bootstrap`,
in the same transaction, so it carries the same `ETag`: send it back as `If-None-Match` and an
unchanged project answers `304`.

- `?section=types,flows` narrows to those sections, each complete (`section`, singular — the
  bootstrap read's parameter is `sections`, and each read refuses the other's spelling with a
  `422`). A partial read carries no `ETag` — a validator claims you hold the whole thing.
- `Accept: application/yaml` answers the document ALONE as YAML — the file form, first line
  `kipory: 11`, saved as `<name>.kipory.yaml` and sent back to plan as it is (a document that
  states any other format version, `kipory: 1` included, is refused with
  `DOCUMENT_VERSION_UNSUPPORTED` — export again to get the current form). The wire is JSON,
  and JSON answers the `{ version, document }` envelope. The YAML form carries the read as
  `basedOn` inside the document, whole or by section, so a file edited for hours still names it.
- In the YAML form each flow is preceded by its outline as comment lines
  (`# outline (format 10), derived at export; plan ignores it`, then the lines
  `GET /v1/flows/{id}/outline` answers). A plan ignores comments, so the file plans back
  unchanged; edit the steps, never the outline.
- A value saved before a rule that now refuses it is exported as stored, never as an error.
  The JSON answer adds `warnings`, one `STORED_VALUE_REFUSED_ON_APPLY` per value, naming its
  `field` and the value; the YAML form says the same in a comment above the value. A plan of
  that document refuses the value, so change it (to what the warning's message allows) before
  you apply.
- The floor is VIEWER, like the bootstrap read.

**What a project holds, in a few KB:** `GET /v1/projects/{nodeId}/document/summary` answers the
same read as `{ version, lines }`, one line per element in document order. A type lists its
fields (`name:type`, `*` when required); a table its owner, type and the fields it keys, filters
and links; a flow `(inputs) → outputs` and its function steps (`key:function`, at any depth, after `steps`); an endpoint its method, path,
auth, target and success status; a schedule its cron, flow and whether it runs. The platform's
own event types are left out. Read it first when a session starts on a project that already
holds something, and the whole document only for the rows you will change. The floor is VIEWER.

## Learn the format

`GET /v1/project-document/schema` publishes the document's JSON Schema with a content-hash
`version`, and `GET /v1/project-document/example` one complete document to learn from. Both are
public: documentation, byte-identical for every caller.

The schema is COMPOSED from the design surfaces' own create bodies, never restated: each row is
the surface's create body minus the addressing the document supplies by position (`project` and
the element's `key`), the request-only `validateOnly` flag, and every field that holds an id of
another row. So a field a surface grows appears in the document the same day, spelled the same way —
an endpoint's `contractConfig.responseBody` (one flow output sent as the whole body), `redirect`,
`statusOutput` and `headers`, and an input bound `from: "header.<name>"` or `"rawBody"`, are written
here as on `POST /v1/api-endpoints`, a
table's `ownerScope` is `user` or `project` here as on `POST /v1/tables` and on a
record (the stored `USER` / `PROJECT` is refused, in a document as on the row) — with
`sharing: true` beside it on a `user` table whose records are shared by grants — and a
relation's `producer` / `cardinality` are `join-record`, `many-to-one`, … as on
`POST /v1/relations` (the camelCase `joinRecord` / `manyToOne` is refused; `producer` is
required on every relation row, as on the create), and an eval
suite's `coverageMode` is `strict` or `report-only` as on `POST /v1/eval-suites`, its `scoreRules`
the same list under the same bounds, with `direction` in kebab (`higher-is-better`). A suite's
`applyWrites` rides along too: an export always states it, and `false` means the suite's runs
discard what the flow writes (eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)).

## Views and shapes

**A read is a view; a flow only when it computes.** `views` holds the project's named reads: a
view states one read — its table (or a base view it `extends`), its conditions under `where`, its
`params`, its `order` and `pageSize`, and the `shape` its rows take — and a flow reads it by key
with one `record.view` step. A `GET` endpoint over that flow declares only its path: its typed
query, paging and `ETag` come from the view (anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)).
Write an inline `record.list` or `record.query` only when a value comes from an earlier step.

<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: publishedOn — one project's example field name, not a platform field -->
<!-- field-ok: visibleBooks — one project's example view key, not a platform field -->

```json
"shapes": {
  "authorChip": { "table": "author", "properties": { "name": "name" } },
  "bookCard": {
    "table": "book",
    "properties": { "title": "title", "publishedOn": "publishedOn", "genre": "genre" },
    "linked": { "author": { "relation": "written-by", "shape": "authorChip" } }
  }
},
"views": {
  "followedAuthors": { "table": "follow", "fields": ["authorId"] },
  "hiddenAuthors": { "table": "hide", "fields": ["authorId"] },
  "visibleBooks": {
    "table": "book",
    "where": [{ "kind": "field", "field": "authorId", "op": "not-in", "set": { "view": "hiddenAuthors", "field": "authorId" } }]
  },
  "myShelf": {
    "extends": "visibleBooks",
    "params": { "genre": { "type": "string", "optional": true } },
    "where": [
      { "kind": "field", "field": "authorId", "op": "in", "set": { "view": "followedAuthors", "field": "authorId" } },
      { "kind": "field", "field": "genre", "op": "eq", "param": "genre" }
    ],
    "order": { "by": "field", "field": "publishedOn", "direction": "desc" },
    "pageSize": { "default": 20, "max": 50 },
    "shape": "bookCard"
  },
  "poetryShelf": {
    "extends": "visibleBooks",
    "where": [{ "kind": "field", "field": "genre", "op": "eq", "value": { "literal": "poetry" } }]
  }
}
```

What no schema says:

- **`where` is `record.query`'s clause grammar written as values** — a view reads no step's value. A
  `field` clause takes exactly one operand: a fixed `value`; a `param`, one of the view's params; or a `set` (the
  values of a field across another view's rows, `id` by default, under `in` or `not-in`).
- ⛔ **A view's fixed text is `{ "literal": … }`.** Write `"value": { "literal": "poetry" }`, a list
  for `in` / `not-in` as `{ "literal": ["novel", "poetry"] }`; a bare number or `true`/`false` stays
  as it is. A bare text is refused (in a step a bare string is a path read, and a view reads no
  step's value), and so is an `{ "expr": … }`; a value the reader gives is a `param`.
  The same holds at every operand of a view's clause: a `term`'s `slug`, a `semantic` `text` or
  `likeRecordId`, a `link` or `stream` `where` entry's `value`, a stream `window`'s `from` / `to`,
  and a `peer` field clause's `value`.
- **A set is a sub-read, not a list.** It runs in the same statement as the view, as the same
  caller, with no member cap; an empty set matches nothing under `in` and everything under
  `not-in`, and `not-in` keeps a record with no value at all. A set view holds only `field` clauses
  and sets, two levels deep at most, and no view with a `semantic` clause uses one.
- **`contains` yes, `any` no.** A view's field clause takes `contains` (text anywhere, ignoring
  case, at least 3 characters with a word in them, not signs alone — a param that does not hold
  that is refused when the view is read, and a param of another type at save). A view
  holding an `any` clause is refused at save, `VIEW_ANY_UNSUPPORTED`: OR one field's values with
  `in`, or ask the OR in a `record.query` step. A view's `order` may name a number, true/false or
  text field with a `filter` use; a text field needs the type's `maxLength` of at most 500
  (`QUERY_ORDER_TEXT_UNBOUNDED`).
- **The exclusion runs before the page is cut**, so a base view that drops what the caller hid
  (`visibleBooks`) gives every view that extends it full pages. `extends` takes the base's table,
  scope and `where` and adds its own clauses; its `order`, `pageSize`, `shape` replace the base's.
  One level.
- **An absent param never widens the read.** It takes its `default`; with `optional: true` only the
  clauses naming it are left out; with neither the read fails `VIEW_PARAM_MISSING` before reading.
  A bad value fails `VIEW_PARAM_INVALID`. A param of a set or a base needs a `default`: nothing
  passes it one. This is how an optional filter is written — one step, not a branch per case.
- **A linked read the reader asks for.** A view's linked read (either level) takes `when`: `true`,
  `false`, or `{ "param": "withAuthor" }` naming a boolean param of the view. It is read only when
  that is `true`; `false`, or an optional param left out, leaves it out (each row's `linked` then
  lacks its name). Its far table, when the relation reaches several, is `peerTable`. A view's
  `when` reads no step's value, so it is never `{ "expr": … }` or a bare text.
- **Who it reads as is the view's `scope`.** `"caller"`, the default, reads a person-owned table as
  the signed-in person — the identity is never wired. A flow that can start with no person (a
  schedule, a trigger, a project table's processing) and reaches such a view is refused at plan,
  `VIEW_CALLER_WITHOUT_PERSON`; `"project"` reads as the project and may reach no person-owned
  table.
- **A shape is the answer's type.** A shaped row carries `id` and exactly the named properties; a
  linked one-record property is absent when nothing is linked. The step's value, the endpoint's
  answer and the OpenAPI component (`BookCard`) are derived from it, so they cannot disagree.
- **What a view cannot say yet** — OR across clauses, an order by a linked record's value, a set
  over `link` or `term` clauses, a computed property — stays a flow step after `record.view`.

Both sections are maps keyed by the view's or shape's key, with `delete: true` and `prune: true` as
every other section. A view names only keys, so its rows carry no id but their own. A view is
judged when it is planned, against the section as the document leaves it: a view may be listed
before the set or base it names. A view or a shape is removed before the tables it reads, so a
document may remove both together.

To see what an applied view answers before a flow uses it, preview it:
`POST /v1/views/{key}/preview?project=<id>` with `asUserId` (the member to read as; none for a view
that reads no person's records), the `params`, a cursor (`after` to page on, `before` to page back)
and `limit`. It answers the page as
`items`, `nextCursor`, `prevCursor` and `paging: null`, beside `itemSchema` (one row's JSON Schema),
`tables` (every table the read reaches) and `clauses` (what it ran, params and base merged in). It
needs the viewer role, and writes, charges and runs nothing. A plan steers reads to views: an
inline `record.list` or `record.query` equal to a declared view warns `READ_REPEATS_VIEW`, and a
`GET` endpoint whose flow is only one such read warns `ENDPOINT_IS_A_VIEW`; neither refuses.

## Three reference forms

Every element is addressed by its `key` — the one the platform already enforces as unique within
a project, and the key each section's map is keyed by. An event type is `<categoryKey>/<key>` —
the prefix is its namespace, and nothing has to exist before it — a source `<provider>/<key>`. A
type in a source provider's namespace (`telegram/…`) is written by that provider's source: a plan
reports it as `derived` and never writes or prunes it, so an export from a project with a source
applies cleanly to one without, whose own source then seeds it. A row's display text, where it has one, is `label`. A few references
are ids on the row API and keys in the document — flows, types, sources, and a search profile:

| The row API spells      | The document spells   | Meaning                                                   |
| ----------------------- | --------------------- | --------------------------------------------------------- |
| `dataTypeId`            | `type`                | a table's type, by key                                    |
| `payloadDataTypeId`     | `payload`             | an event type's payload, by type key                      |
| `propertiesDataTypeId`  | `properties`          | a relation's link properties, by type key                 |
| `dataTypeId`            | `type`                | a config namespace's type, by key                         |
| `flowId`                | `flow`                | a table's, trigger's, schedule's or eval suite's flow     |
| `sourceId`              | `source`              | a trigger's source, as `<provider>/<key>`                 |
| `targetConfig.flow.id`  | `targetConfig.flow`   | an endpoint target's flow, by key                         |
| `resolverFlowId`        | `resolver`            | a vocabulary's resolving flow, by key                     |
| `scorerFlowIds`         | `scorers`             | an eval suite's scorer flows, by key                      |
| `uses.search.profileId` | `uses.search.profile` | a table's embedding profile, by key — its live generation |

A flow's steps hold no id to re-spell: they are written the same way in the document and in
`PUT /v1/flows/{id}/steps`, and a `flow.invoke` step names the flow it calls by key, as `flow` in its `with`.

An endpoint's `contractConfig` is the row API's, whole: who may call it is stated there too.
`auth: "none"` makes the endpoint public — callable with no key and no session — and `publicRpm`
sets its requests per minute; see api-endpoints-anatomy (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`). The project's
public spend cap is a project **setting**, not part of the document, and a public endpoint needs it
first: an apply that makes an endpoint public in a project with no cap is refused
(`PUBLIC_SPEND_CAP_REQUIRED`). Set `publicSpendCapCredits` with
`PATCH /v1/projects/{nodeId}/settings`, then apply.

Not every nested reference is re-spelled: a table's `uses.join` names its relation as
`relationKey`, exactly as the table API does, because the document passes that object to the same
create body unchanged.

A vocabulary's proposal examples are worked examples, each a term `key` and its `label`; the key is
checked like a real term's (lowercase segments joined by `-`, at most 128 characters). A bare flow
key always means this project's flow. A library or system flow — one that belongs to
no project — is `system:<key>`. A vocabulary's `resolver` is the one reference with a default: omit
it on a new vocabulary and the platform binds a semantic vocabulary to its default resolver where it
holds one, so "none" is stated as `resolver: null` — which is how an unbound vocabulary exports, and
why that export re-applies as unbound rather than picking up a resolver on the way back in. A relation's `properties` has no such default: on an update, left out or stated `null`, the relation carries none (a stated element is whole). An export leaves the field out only when there is none, so it re-applies unchanged. A vocabulary
states no `binding`: a term attaches to the whole record, an export carries no such field, and a
document that states one breaks the schema on that vocabulary's path. A type is always stated under
`types`, and a table names it by key with `type`.

Editing a type and the `uses` of a table of that type in the same document is ONE change:
when the table's row states `uses`, its search and link declarations are judged against those uses
and the new type together, so removing a field along with the uses that name it plans clean. With
`uses` left out, the stored declarations are judged against the new type, and a field they still
name cannot be removed. Every other table of the same type is judged on its stored
declarations either way. A table's `uses` names each field's use as the table API does — `filter`,
`key`, `search`, `link`, `stream`. A field reference's `family` is `submission`, `processed` or `system`, and
`uses.search` carries no `stages`: a `search` use is `{ "kind": "search" }`, reads exactly one field
the record stores and takes no `role` — a table's `search` fields are indexed in the order the
document marks them, at most the profile's `searchFieldsPerTable` of them. A profile under
`vectors` states its `modelId`, `keywords` (whether exact words are indexed too) and
`defaultChunking`, and nothing else about the index: no slot name, no collection.

A table may also state `computed`: fields Kipory keeps from related records (a `rollup` over a
relation, such as `{ "relation": "review-of", "count": true }`). They are judged once the whole
document is in place, so the relation, the related table and the `filter` uses a rollup reads may
arrive in the same document. Declaring one adds a `recompute` consequence that counts the stored
records it is computed for; values follow later changes within seconds and are read from
`computedAt`, never `updatedAt`. A field reference's `family` may then be `computed` too. A `min`,
`max` or `latest` rollup may state `ifNone` (`"createdAt"` or `{ "value": … }`), its value when it has
none (tables-and-types pack).

## Plan a document before applying it

`POST /v1/projects/{nodeId}/document/plan` takes the document itself as the body — JSON, or YAML
with `content-type: application/yaml` — and answers what applying it would do. It writes
nothing, so its floor is VIEWER. A plan is not a simulation: the platform applies the document
through every row's own write, in one transaction, and rolls the transaction back. What a plan
refuses is exactly what an apply would refuse.

⭐ **A plan is made from your read, and kept for its apply.** The read is the `basedOn` the export
wrote into the document, or `?basedOn=`, which overrides it: a read token (`<nodeId>@<version>`)
or a bare version of THIS project. The answer's `planId` is what you apply (kept 24 hours;
`GET …/document/plans/{planId}` reads it back), and `basedOn` echoes the read as a token. A plan
you mean to apply without a read is a `422` naming `basedOn`; `?keep=false` plans a preview that
keeps nothing. `?label=agent-docs` names your session, so two sessions on one key are told apart.
A plan gives way to real work: when a row it rehearses stays held by another write for more than
a second, or the project already has two plans being worked out, it answers `409 DESIGN_BUSY`
with `Retry-After` — not `PLAN_STALE`; your read is still good, so send the same plan again after it.

⛔ **A file read from another project is refused, never bound.** Exported from a dev project and
planned on another, its `basedOn` names the dev project, whose versions say nothing about this
one's history: the plan is a `422` with `details.reason: "BASED_ON_OTHER_PROJECT"`, naming both
projects and this project's current `version`. To apply the file here, plan it against this
project as it is now: `?basedOn=<that version>`.

The answer lists only rows that change — `create`, `update`, `move`, `delete` — and counts the rest
under `counts.unchanged`. A flow's steps are rows of their own (`resource: "steps"`, at
`flows.<flow>.steps.<key>`), named by key: a step whose list or place changed, its value kept, is
one `move` (counted as `move` in `counts`), never a delete and a create. Each `update` says what changes field by field under `fields` — each field's
path, its value before and its value after; text over several lines also as a line diff. `diagnostics` lists what this document introduces;
what the project already had is counted under `health` (errors and warnings before and after,
what it adds, what it fixes) — over the flows the document can reach.

⛔ **`moved`: what someone else changed after your read.** Every element the document states or
changes — and every key it would create — that another person, key or session changed after
`basedOn` is listed with who, when, their note and label, and what they changed. Any here makes
`ok` false: read the project again, make your change on what it says now, plan again. Elements
the document does not touch never stop it, so two authors working on different flows never refuse
each other. A read older than the history the project keeps is `409 PLAN_STALE` `read-too-old`.

Your own writes after a read are not moves only when they carry your session's label: an apply
takes `label` (the plan's by default), and a row save — a `PATCH /v1/flows/{id}`, a
`PUT /v1/flows/{id}/steps`, any design row's own write — takes the header `Kipory-Session-Label` (1–64
characters), beside `Kipory-Change-Note` (1–500), the sentence history shows for that save. Text
outside ASCII goes percent-encoded. Send the same label, from the same key, on every plan, apply
and row save of one working session; a save without it is listed under `moved` like anyone
else's, and the apply it stops answers `409 VERSION_CONFLICT`.

⭐ **A plan judges the state the document leaves, not only the rows it writes.** Every flow the
document can move — the ones it writes, the ones invoking them, the ones reading a type or a table
it changes — is judged with the rules `GET /v1/flows/{id}/health` runs, once before the writes and
once after, and so are the schedules, triggers and endpoints that start those flows, by the rules
their own saves run. A finding the document causes carries `introduced: true`; one already there
carries `introduced: false`. Only an introduced error makes `ok` false and refuses the apply, so an
`ok` plan leaves no flow with an error it did not name, and a broken project can be repaired one
document at a time. That holds inside a flow the document writes too: only the steps it changes
are judged by the write, so a step it leaves as stored is never refused for an error it already
had (a rule a release added included); a step it does change is refused for one, said once at
that step as already stored.

Send a PARTIAL document freely: a section you leave out is untouched, and so is every row you do
not name. A ROW is stated whole — it is that row's create body, so its required fields are
required here too (one row asks for more than its create: an `evals` suite must state `scorers`,
`[]` for a contract suite).

⭐ **A stated element is whole (since format 8).** An element you state — a flow, a table, a
trigger — is the whole element: an own optional field you leave out goes back to its default, as
it would on a create (`description` left out clears it). The plan shows each reset as a field going to its default, with a
`FIELD_RESET_TO_DEFAULT` warning naming the value held now, so nothing resets unseen. State a field
to keep it; the export states every field, so the simplest edit is still the exported element with
one field changed. Four kinds of field are not reset by leaving them out:

- **owned collections** — a flow's `steps`, a suite's `cases`, a vocabulary's `terms`, a
  relation's `pairings`, the project's `config` and `routes`, a table's `uses`: left out,
  untouched; stated, whole (a member you leave out of a stated one IS removed);
- **what the platform chooses** — a vocabulary's `resolver` and `resolutionParams` keep the
  binding the project chose;
- **what only a create sets** — a trigger's `source` and a vocabulary's `parentVocabularyKey`
  (stated with another value, each is refused as permanent);
- **the project's own `name`** (its `description` resets to `""`).

A flow's `steps` is a list in written order, and the list you state is the flow's list: each step
is saved as you wrote it, its `with`, its run settings and the blocks nested in it, and a step the
list leaves out is removed. A reference left out is cleared too: a table's `flow` unbinds, and an event type's `payload`
and a suite's `regression` go. A config namespace always states its `type` (`type: null` is
refused), and an eval case's `inputs` is required on an update.

A field's value is whole too: a stated `with` replaces the stored one, it is not merged
key by key.
The simplest edit is the
exported row with one field changed.
A field the row's own PATCH does not take — a vocabulary's `cardinality`, a profile's `modelId`, a
trigger's `source` — is set when the row is created and permanent afterwards: stated unchanged
it is fine (an export states everything), stated CHANGED it is refused on its own path, never
dropped. To change one, state the row under a new key without the `id` and remove the old one.
The exception is the owned collections (a flow's `steps`, a suite's `cases`, a relation's
`pairings` — each `{ fromTableKey, toTableKey }`, as the relation's create takes them — a
vocabulary's `terms`): each is stated whole, so when present it replaces the owner's collection —
and a member the project holds that the collection no longer names is REMOVED, which makes that
document one that removes something, with the ADMIN floor an apply that removes has.
A type or a flow may also carry `adoptSnapshots: true`. Endpoints, and tables through their
processing flow, FREEZE the types they bind (schedules and triggers freeze nothing), so an edit that
changes one is refused by the row's own write, naming what it would leave behind, unless you grant
this. A document does not get to assume it: adopting re-publishes an endpoint's request and response
contract to whoever already calls that route. It is a statement about this apply, like `delete` —
never part of the row, never exported.

A type's row may carry `renameFields` (`{"<old path>": "<new name>"}`) beside its definition as it
reads after the rename, and `keepExpressions`, the steps whose expressions or templates keep the
old name as written. Both are statements about this apply, like `adoptSnapshots`: never stored,
never exported. The plan answers `renames[]`: what moves, the expression candidates to settle, the
callers it breaks, and `cost` — a rename calls no model and is not charged, and embeds nothing unless
`reembedRecords` says a table's search text names its own key. A swap or a chain (`a`→`b` with
`b`→`a`) in one document is refused: rename one word to a free name first. The tables pack has the
whole rule.

A table's row may carry `renameComputed` (`{"<old>": "<new>"}`) beside a `computed` that declares
the field under its new name: its kept values, stamps and filter move, and every other table's
computed field reading it reads the new name, without a recompute. Like `renameFields`, it is a
statement about this apply — never stored, never exported. Plans list a `recompute` consequence
when a table's stored records get computed values.

A schedule, a trigger and a source carry `enabled`, which their create bodies do not: the row API
switches it with a `PATCH` (`{enabled, version}`), and the document writes it through that same
patch after the row. Export always states it, so a disabled schedule, trigger or source re-created
from its export comes back disabled. Omitted, it is `true`, like any field a stated element leaves
out: a new row is created enabled, and an existing disabled one is switched back ON, with a
`FIELD_RESET_TO_DEFAULT` warning on its path. State `enabled: false` to keep a row off.

A schedule and a trigger also carry `failurePolicy` (`pause` or `keep-running`), an ordinary
field, and — on export only — `paused: { at, reason }` when the platform has paused the row
because its runs kept failing. `paused` is read-only: it is never planned and never applied. A
document that states it, changes it or leaves it out changes nothing, and `enabled: true` does not
resume a paused row; only `POST /v1/schedules/{id}/resume` or `POST /v1/triggers/{id}/resume`
does. A row re-created from an export in another project starts unpaused.

Removal is always explicit — `delete: true` on a row, or `prune: true` on a map to remove every
row of that map you did not name. Absence alone never deletes. A `delete: true` row states nothing
but its `id`; any other field beside it is refused `DOCUMENT_DELETE_WITH_FIELDS` on the row's path.
A config namespace is removed the same way, `<namespace>: { delete: true }` under `project`'s
`config`, with nothing beside it (it has no `id`); that map takes no `prune` (a `prune: true` there is
refused).

One document can remove what depends on what. A type that drops a config key is judged against the
values the same document writes to that namespace, so the key and its stored value go in one
apply; a type and the namespace it shapes can be deleted together; and a flow is deleted after
every flow the same document deletes that calls it. A caller that stays refuses the called flow's
row with `FLOW_HAS_DEPENDENTS`, naming the caller by key.

A config namespace's `values` are its whole override map, and in them `null` and a key left out
say different things: a key left out removes that override, so the field reads its default; `null`
is a value, and the field reads `null`. Writing `null` does not clear an override — leave the key out.

The answer holds the `version` the plan was computed against, its `planId` and `basedOn`,
`ignoredIds`, three lists, their `counts` and a verdict:

- `changes` — every row you stated, as `create`, `update`, `move`, `delete`, `unchanged`, `derived`
  or `skipped`, in your document's order, followed by any row a delete takes along. That is not the
  order an apply writes them: it writes creates and updates kind by kind (types first), then
  deletes in reverse. It is complete even when a refusal stopped the attempt early, because it
  comes from comparing your document with the project, not from the attempt. A create's `id` in a
  plan comes from the attempt the plan rolls back, so it is not the id the apply will give the row:
  take ids from the apply's `document`. A step row whose function takes a JSONata expression
  carries `expressionParts`: each stated expression's size in parts, beside the 1,000-part limit
  (`JSONATA_EXPRESSION_NEAR_LIMIT` warns from 800).
- `diagnostics` — every finding, each with a `field` that is a path in YOUR document
  (`tables.member.type`), never a path in some row's request body. Gate on `severity` and
  `introduced`: a finding about the state the document leaves carries `introduced` — `false` when
  it was already in the project, which reports it without gating. A finding about a flow's steps
  also carries `at`, the key path of the step it is about, and its remedy: `fixes`, each a list of
  step edits that clears it (apply them to the flow's `steps` in your document, or with
  `POST /v1/flows/{id}/steps/edit` once the flow exists), or, when there is no ready fix, the
  `decision` it needs from you.
- `consequences` — what the change does to stored data, with counts measured in the planning
  transaction: records re-stamped, a vector reconcile queued, stream fields moved, links
  re-stamped, and `links-deleted` — every stored link a relation delete takes along, including a
  relation a table delete removes with it. A consequence is never a refusal — the platform tells
  you, and lets you. ⛔ A type change that stored records would break is not a consequence: a
  table's stored records always fit its type, so any tightening they break (a field made required,
  a narrower type, a new `minLength`, `enum`, `maxLength`, …) is refused 422
  `TYPE_UNSAFE_FOR_TABLE`, judged by reach — every table whose type it is, or reaches it through a
  reference, is checked whether or not your document names it — and a table too big to check in
  time is refused with `details.reason` `RECORDS_CHECK_TOO_SLOW`. Tighten in order: widen (add the
  field optional), backfill the records, then narrow.
  `reembed` is the one that costs money: this table's stored records are re-embedded for search,
  which spends credits on embedding usage (billed by tokens, so it grows with the records and the
  text each holds), because what its search indexes moved. It is per table, a plan reports it (an
  apply's answer does not repeat it), and it is the one to ask a person about before applying.
  `reindex` is not that: it says a reconcile is queued, which may find nothing to redo.
  `links-removed` comes from a link field you dropped or pointed at another field: its stored links
  are removed, and `rows` counts the records whose processing (`reprocessOn` on a leave) read them.
  Their computed values are recomputed, but their processing is not run again — reprocess one on
  purpose with `POST /v1/records/{id}/reprocess` if it should be. `rename`
  counts the stored rows a rename rewrites in place, per store; ids, embeddings and stamps are kept,
  and the plan's `renames[]` says what else moves and what it breaks. A `filter`
  use added, removed or moved reports `restamp` — every record's filter columns are rewritten — and
  on a searchable table it also queues a `reindex` that embeds nothing.
- `ok` — true exactly when no `error` the document introduces remains; an error carrying
  `introduced: false` was already in the project and does not gate. An apply of the same document
  commits exactly when this is true.

A plan that CREATES a table also answers that table's contract under `contracts`, by the
table's key: its fields, each with the index type a filter on it would get, and what the bound flow
would add. It is what `derived.contract` answers on `PATCH /v1/tables/{id}` with
`validateOnly`, for a table that has no row to ask yet — read it to decide a new table's `uses`
before the apply. `supportedUses` rides beside it: the use kinds this deployment reads, so offer a
new table no other. A table the document only restates is not listed, and an apply carries neither.

A row is `skipped` when something it names was refused; `because` holds the path of the refused
row. Fix that row and plan again — the skipped rows were never judged, so they may still hold
findings of their own.

A removal can take along rows you never named: deleting a table takes the relations
that pair it, deleting a vocabulary takes its terms. That is the row's own delete working as
designed, and the plan says so rather than leaving it to be discovered — each such row is in
`changes` as a `delete` with `because: "cascade"`, is counted under `delete` in `counts`, and
carries a `warning`, `DOCUMENT_DELETE_CASCADED`, on its own path. Read a plan's `delete` list before
applying it; it is the true list, not only yours. A table delete also carries its reach on
its own path, whether or not the delete goes through: a `DOCUMENT_DELETE_CASCADED` warning names
the relations and the joins it would take along, so a delete the plan refuses (a table its
records pin) still says what it would have removed. A row your document still STATES is reported
the same way: an edited full export that deletes a table and still names the relation
pairing it has that relation's change on `relations.<kind>` as the cascade, not as `unchanged` — the
document says keep it, the delete takes it anyway, and the warning says which won.

Rows are matched by `id` when the project holds a row of that kind with that id. For a type, a
table, a relation, a vocabulary, a view, a shape, an eval suite and an eval case, keeping the `id` under a new key is a
RENAME — one update of the same row, and everything that named it follows; the row API renames
the same kinds, bar views and shapes, which only a document writes. A view renamed this way is
renamed in every view that extends it or reads it as a set and in every `record.view` naming it;
a shape, in every view and shape answering in it. A table renamed this way takes its records with it, a relation its
links and a vocabulary its terms; like a type's `renameFields`, each needs ADMIN
(`permissions.mayRename`) and answers `renames[]`. Every
other key is permanent (a flow, an endpoint: other rows or stored data are linked to
it by key), so the same move is refused on the row;
state the new key without the `id` and remove the old one with `delete: true`. An `id` that belongs
to no row here — the usual case when a document exported from one project is planned against another
— is ignored, listed under `ignoredIds`, and the row is matched by its key instead. It is never a
refusal. Two stated rows that resolve to one current row — one by its id, one by its key — are two
statements about one thing, and are refused on both paths: state it once.

A key that resolves to nothing is `DOCUMENT_KEY_UNRESOLVED` on the path that spelled it. When
exactly one key of the same kind is within two edits, the message offers it; when two are equally
close, it offers none rather than guess. Forward references need no care: a flow may be named by a
row that appears before it, because the platform writes in a fixed order, not yours.

A document is at most 8 MiB and 6 000 rows; past either it is refused with `413` before the
project is read. A body that is not parseable YAML — including a YAML map that states one key
twice — is the only `422` this route answers; a body sent as JSON that is not JSON is the
platform's ordinary `400`. A document that parses but breaks its schema is a `200` plan whose
diagnostics name every broken path.

A plan's `consequences` include `reference-policy` when a reference newly says `onTargetDelete: delete`: `rows` counts the records holding it today, and the message names the most one deleted record would take with it. They include `fields-unset`: fields the document adds to a type that stored records already use, with the count of records holding no value for one of them, to 5,000 (reads leave them out until each record is written). They include `flows-affected` too: a type the document changes that flows it does not state read or write, directly or through a type that references it. A flow uses a type when its inputs, outputs or a step's `with.outputSchema` name it, when a `record.*` step names a table of that type, or when such a table runs it on its records. Type names are project-wide, so a document that states a type of the same name as another document's updates that type, and its flows with it. The message names the type, the fields that change, and each such flow by key, with whether it reads or writes the type (the first ten, then a count); `rows` counts those flows. A change no flow can feel says nothing: optional fields added, or a `description` changed. It is a warning, not a refusal. If the type is another document's, give yours its own name. The platform does not record which document created a type, so it cannot tell you whose it is.

## Apply a document

`POST /v1/projects/{nodeId}/document` takes `{ planId, note }` — the plan you read, and why, in a
sentence a person reads in the project's history (1–500 characters, required); `label` (1–64)
names your session and defaults to the plan's. The document is the plan's: never send it again.
Under the project's design lock the platform plans the kept document once more against the
project as it now stands, then:

- someone else changed an element it changes after your read → `409 VERSION_CONFLICT`, each in
  `details.moved` with who and what; nothing written. Read again, plan again, apply the new plan;
- the plan no longer says what applying it would do (rows, fields, or what a removal takes along
  changed) → `409 PLAN_STALE` `changed`. Plan again;
- the plan was applied already (with the version it became and who applied it), is over 24 hours
  old, was pushed out by the same planner's newer plans, or never existed here → `404
PLAN_UNKNOWN`, with `details.reason` saying which (`GET …/plans/{id}` of a plan an earlier
  release made answers `outdated`);
- the re-plan finds an error the document introduces → `422 VALIDATION_FAILED`,
  `details.reason: "DOCUMENT_APPLY_FAILED"`, the whole plan under `details.plan` and one entry in
  `details.issues` per refusing finding at its document path;
- another write holds the project for more than 3 seconds, or a row this write needs for more than 10 → `409 DESIGN_BUSY` with `Retry-After`: nothing was written; send the same request again after it. A plan and a row save can answer it too.

An apply commits all at once: one transaction, one project version, one entry in the project's
history carrying your note and label. Seeding and relabelling a vocabulary's terms run after that
commit as writes of their own (below), each moving the version again under the same note and
label, so `appliedVersion` can be several above the plan's `version`. A refusal has written nothing, and like every error it is
JSON whatever `Accept` asks. A plan that changes nothing answers `applied: true` and leaves the
version where it was. What the platform fills in on a write is not a change: the `x-record-ref` a `link` use stamps on
a field. Planning the same document again, or its export, changes nothing, and a step it leaves
alone keeps the results cached under it.

The answer is the plan plus `applied`, `appliedVersion` and `basedOn` — no document; read it with
`GET …/document`. `basedOn` is the read your next part binds to: `appliedVersion` when nobody else
changed the project in between, else your earlier read. With a `label`, your own applies and row
saves after a read never count as moves for your later parts. Without one, nothing tells your
writes from anyone else's: when the answered `basedOn` is still your earlier read (someone else
wrote in between), your own earlier parts are listed under `moved` too — export again before the
next part. Send a label.

Authoring needs EDITOR. A document that REMOVES anything — a `delete: true` row, or a `prune: true`
map that finds something to remove — needs ADMIN, and is refused with `403` before the first write
when the caller holds less. The plan says so first: a caller below EDITOR gets
`DOCUMENT_APPLY_FORBIDDEN`, and one below ADMIN gets `DOCUMENT_DELETE_FORBIDDEN` on each row that
removes something, so `ok` is false. A plan for a caller below EDITOR lists what the document would
change and is not rehearsed: it carries no `health`, no `consequences` and no findings about the
change itself. Every removal still goes through that row's own delete, so whatever
protects the row there (a flow a schedule still binds, a source something still listens to)
protects it here, and surfaces as a finding on the row's path.

A term in `terms` may carry `labels` (by language) and `attributes` (the values the vocabulary's
`termAttributes` declares); the export leaves out empty ones, and a stated term with none holds none.
Changes to them on a term that already exists land with the post-commit relabel.

A vocabulary's `terms` are stated whole, like every owned collection: an active term the document
does not name is REMOVED, inside the apply, through the term's own delete. A term a record still
carries — or one that is canonical for an alias — refuses that, and so refuses the apply, with a
finding on `vocabularies.<key>.terms` naming the term; state it to keep it. Aliases and archived
terms are not configuration: they are never exported and never removed this way. The terms the
document DOES name are checked with everything else and SEEDED AFTER the commit, because seeding
embeds each term. The rest of the apply does not wait on it and is not undone by it. If that seed
— or any other work owed after the commit — fails, the apply still answers `200` and
`applied: true`, with a `warning` diagnostic `DOCUMENT_EFFECT_FAILED` on the path that owed it
(`vocabularies.topic.terms`). Read the diagnostics of a successful apply, not only its status: plan
the same document again and apply the new plan to retry, and only what is still missing is attempted.
An apply whose only change is a vocabulary's terms is still a change: it moves the version, and its
seed runs after the commit like any other.

<!-- field-ok: renewMembers — an example step key an author chooses, not a platform field -->

A flow's `steps` are matched by key. A step's key is also the name its value is read by, unique in
the flow and camelCase (`renewMembers`); a key outside that format, or a reserved name, refuses the
step on its own path. A step the document leaves as it is is not written; one it changes is updated;
a new key is created; a key the list no longer holds is removed; and a step that only changed list
or place is a `move`. Steps carry no id of their own: the flow's `version` moves when any of them
changes. What a steps save works out, the apply works out too: a flow whose signature changes is
judged against the steps the document LEAVES, so retyping an input and rewriting the step that read
it is one apply, and a document that rewrites a called flow judges every flow calling it, restated
or not. A step the write refuses is named on its own path (`flows.<flow>.steps.<key>`), never the
flow's.

In the project's history an apply is ONE entry, titled as a document apply with the three counts
its plan reported — not forty entries, and not "40 changes across six kinds".

## Start a project from one

`POST /v1/projects` takes an optional `document` — a whole document, in place of a `template`
slug — and applies it in the SAME transaction that creates the project. If the platform refuses
any row, the answer is `422` with `details.reason: "DOCUMENT_APPLY_FAILED"` and the plan as
`plan` beside it, every finding with its path in the document, and no project exists afterwards:
no node, and the address is still free. The body's `name` wins over the name the
document's `project` section states, and its `description` is dropped with it — the create body
has none; the rest of that section (routes, config) applies. `template` and `document` together
are refused before anything is made. Another project's export is a fine document to start from —
its ids are ignored and its keys are the content.

## Roll back to an export

Keep the export you took before a change. Its `basedOn` is the read it was made at, so planned
as it is, every element changed since is listed under `moved` (or, past the history the project
keeps, it is `409 PLAN_STALE` `read-too-old`). Plan it against the project as it is now instead:
`POST …/document/plan?basedOn=<the project's current version>` — the `version` a fresh
`GET …/document` answers. `moved` is then empty, `changes` are the rollback, and applying that
plan's `planId` with a note puts its rows back. An export in an older format is refused ([below](#a-document-written-for-an-older-format)). A row deleted since returns as a new row with a new id, and a row
added since stays unless the document says `prune`. Deleting a table does not delete
the type it took its fields from.

## Make a project equal a document

Absence never deletes, so applying another project's export to this one adds and updates what it
names and leaves every other row standing. To make the project EQUAL the document, state
`prune: true` on every map of rows: the four top-level maps (`types`, `tables`, `relations`,
`vocabularies`), the one under `events` (types), the one under `vectors` (profiles), the
`flows` map, the four under `surfaces` (endpoints, sources, triggers, schedules) and `evals` —
twelve in all, including the maps the document does not carry, since an absent section then
means "none of these". Plan it first: the plan lists every delete, and an apply that removes
anything needs ADMIN.

## What does not travel

No secret value — a secret is always a reference by purpose. No `version`, no timestamp, no
count, no health, no run, no record, no member, no credential. The event types of the `platform`
category are every project's and are shown on export as they are; a document neither creates nor
prunes them. Where a table's search index
is held is the platform's own bookkeeping: `vectors` carries profiles and nothing else, an export
names no collection and no slot, and a `collections` map there is refused as an unknown
member. A term that is an alias or archived is not configuration and is not exported.
Tenancy — who may open the project — is not in the document by decision. An eval suite's
`runAsUserId` is a person, not configuration: an export leaves it out, a document that states it is
refused, and it is set on the suite after the apply (`PATCH /v1/eval-suites/{id}`).

## A document written for an older format

`kipory: 11` is the only format a plan reads. A document stating any other version is refused,
`DOCUMENT_VERSION_UNSUPPORTED`: export again. Nothing converts a file you hold in an older format;
write its flows as steps in format 11. A flow with no steps yet is not started
(`FLOW_NOT_AUTHORED`).

A current document is also refused, each on its own path, for:

- **`schema`, or a table's or config namespace's `shape`** — `DOCUMENT_KEY_RENAMED`. Rename them to
  `types` and `type`.
- **A `file` use, a `derived` field family, or projection `stages`** on a table or as a
  profile default — none exists. Remove them; a `search` use reads one stored field.
- **A profile's slot names, a `search` use's `role`, or a `collections` map under `vectors`** —
  unknown members. On the profile, state `keywords`: `true` where it named a sparse slot, `false`
  where it named none. Remove `role`, keeping the table's `search` fields in their order, and
  remove the `collections` map whole.
- **A vocabulary `binding`** — a term attaches to the whole record. Remove the field.
- **A flow's own `tests`** — `DOCUMENT_FLOW_TESTS_MOVED`. A flow's cases live under
  `evals.<suite>.cases`.

## Related

- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — what must exist before what, when you author row by row.
- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — the walk from idea to a document.
- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — the type a table
  needs, and what owning one means.
