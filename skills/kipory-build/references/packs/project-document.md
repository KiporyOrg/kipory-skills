<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — The project document

> **Source of truth for facts:** the document's JSON Schema → live `GET /v1/project-document/schema`;
> endpoint paths & request shapes → live `GET /v1/openapi.json`. This pack carries judgment: what the
> document is for, how a whole project is read as one, and what travels in it and what does not.

## What it is

A project's whole configuration — its shapes, record types, relations, facets, events, flows,
entry points and eval suites — as ONE nested document addressed by key. Nesting expresses
ownership: a flow's steps sit under the flow, a facet's terms under the facet, a suite's cases under
the suite. Ids are optional; the platform fills
them in on export and matches by them on apply. The document you write is the document the
platform hands back.

Read it before authoring anything larger than one row. The row-by-row API has an order — a record
type needs its shape first, a relation kind its record types, a trigger its flow — and the
Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) page states it. The document exists so that you need not
know it: state the whole project by key, and the platform resolves the order.

## Read a project as one document

`GET /v1/projects/{nodeId}/document` answers the project as a document, with the `version` the
project stands at — the lock an apply presents later. It is the same read as `GET /v1/bootstrap`,
in the same transaction, so it carries the same `ETag`: send it back as `If-None-Match` and an
unchanged project answers `304`.

- `?section=schema,flows` narrows to those sections, each complete (`section`, singular — the
  bootstrap read's parameter is `sections`, and each read refuses the other's spelling with a
  `422`). A partial read carries no `ETag` — a validator claims you hold the whole thing.
- `Accept: application/yaml` answers the document ALONE as YAML — the file form, first line
  `kipory: 2`, saved as `<name>.kipory.yaml` and sent back to plan as it is (a document that
  states any other format version, `kipory: 1` included, is refused with
  `DOCUMENT_VERSION_UNSUPPORTED` — export again to get the current form). The wire is JSON,
  and JSON answers the `{ version, document }` envelope. The YAML form carries no `version`: the
  `ETag` is an opaque validator, so the version an apply needs is taken from the PLAN, which
  answers it.
- The floor is VIEWER, like the bootstrap read.

## Learn the format

`GET /v1/project-document/schema` publishes the document's JSON Schema with a content-hash
`version`, and `GET /v1/project-document/example` one complete document to learn from. Both are
public: documentation, byte-identical for every caller.

The schema is COMPOSED from the design surfaces' own create bodies, never restated: each row is
the surface's create body minus the addressing the document supplies by position (`project` and
the element's `key`), the request-only `validateOnly` flag, and every field that holds an id of another
row. So a field a surface grows appears in the document the same day, spelled the same way — an
endpoint's `contractConfig.responseBody` (one flow output sent as the whole body) is written here
as on `POST /v1/api-endpoints`, a
record type's `ownerScope` is `user` or `project` here as on `POST /v1/record-types` and on a
record (the stored `USER` / `PROJECT` is refused, in a document as on the row), and a relation
kind's `producer` / `cardinality` are `join-record`, `many-to-one`, … as on
`POST /v1/relation-kinds` (the camelCase `joinRecord` / `manyToOne` is refused; `producer` is
required on every relation row, as on the create), and an eval
suite's `coverageMode` is `strict` or `report-only` as on `POST /v1/eval-suites`, its `scoreRules`
the same list under the same bounds, with `direction` in kebab (`higher-is-better`). A suite's
`applyWrites` rides along too: an export always states it, and `false` means the suite's runs
discard what the flow writes (eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)).

## Three reference forms

Every element is addressed by its `key` — the one the platform already enforces as unique within
a project, and the key each section's map is keyed by. An event type is `<categoryKey>/<key>` —
the prefix is its namespace, and nothing has to exist before it — a source `<provider>/<key>`. A
type in a source provider's namespace (`telegram/…`) is written by that provider's source: a plan
reports it as `derived` and never writes or prunes it, so an export from a project with a source
applies cleanly to one without, whose own source then seeds it. A row's display text, where it has one, is `label`. A few references
are ids on the row API and keys in the document — flows, shapes, sources, and a search profile:

| The row API spells        | The document spells   | Meaning                                                         |
| ------------------------- | --------------------- | --------------------------------------------------------------- |
| `dataEntryId`             | `shape`               | a record type's shape, by entry key                             |
| `payloadEntryId`          | `payload`             | an event type's payload, by entry key                           |
| `propertiesEntryId`       | `properties`          | a relation kind's edge properties, by entry key                 |
| `schemaEntryId`           | `shape`               | a config namespace's shape, by entry key                        |
| `flowId`                  | `flow`                | a record type's, trigger's, schedule's or eval suite's flow     |
| `sourceId`                | `source`              | a trigger's source, as `<provider>/<key>`                       |
| `actionConfig.flow.id`    | `actionConfig.flow`   | an endpoint action's flow, by key                               |
| `resolverFlowId`          | `resolver`            | a facet's resolving flow, by key                                |
| `scorerFlowIds`           | `scorers`             | an eval suite's scorer flows, by key                            |
| `uses.search.profileId`   | `uses.search.profile` | a record type's embedding profile, by key — its live generation |
| `targetFlowId`            | `target`              | a `flow.invoke` step's target, by key                           |
| `entryId` in a schema ref | `ref`                 | a step's schema reference, by entry key                         |

Not every nested reference is re-spelled: a record type's `uses.join` names its relation kind as
`kindKey`, exactly as the record-type API does, because the document passes that object to the same
create body unchanged.

A facet's proposal examples are worked examples, each a term `key` and its `label`; the key is
checked like a real term's (lowercase segments joined by `-`, at most 128 characters). A bare flow
key always means this project's flow. A library or system flow — one that belongs to
no project — is `system:<key>`. A facet's `resolver` is the one reference with a default: omit it
on a new facet and the platform binds a semantic facet to its default resolver where it holds one,
so "none" is stated as `resolver: null` — which is how an unbound facet exports, and why that export
re-applies as unbound rather than picking up a resolver on the way back in. A relation kind's
`properties` follows the same reading on an update: omit it and the kind keeps the entry it holds,
state `properties: null` and the kind carries none. An export leaves the field out when there is
none, so it re-applies without touching what a project already holds. A facet states no
`binding`: a term attaches to the whole record, an export carries no such field, and a document
that states one breaks the schema on that facet's path. A shape is always stated under
`schema`, and a record type names it by key.

Editing a shape and the `uses` of a record type shaped by it in the same document is ONE change:
when the type's row states `uses`, its search and link declarations are judged against those uses
and the new shape together, so removing a field along with the uses that name it plans clean. With
`uses` left out, the stored declarations are judged against the new shape, and a field they still
name cannot be removed. Every other record type shaped by the same entry is judged on its stored
declarations either way. A record type's `uses` names each field's use as the record-type API does — `filter`,
`key`, `search`, `link`, `stream`. A field reference's `family` is `submission`, `processed` or `system`, and
`uses.search` carries no `stages`: a search slot reads exactly one field the record stores, and a
profile under `vectors` defaults only `defaultChunking`.

## Plan a document before applying it

`POST /v1/projects/{nodeId}/document/plan` takes the document itself as the body — JSON, or YAML
with `content-type: application/yaml` — and answers what applying it would do. It writes
nothing, so its floor is VIEWER. A plan is not a simulation: the platform applies the document
through every row's own write, in one transaction, and rolls the transaction back. What a plan
refuses is exactly what an apply would refuse.

⭐ **A plan judges the state the document leaves, not only the rows it writes.** Every flow the
document can move — the ones it writes, the ones invoking them, the ones reading a shape or a table
it changes — is judged with the rules `GET /v1/flows/{id}/health` runs, once before the writes and
once after, and so are the schedules, triggers and endpoints that start those flows, by the rules
their own saves run. A finding the document causes carries `introduced: true`; one already there
carries `introduced: false`. Only an introduced error makes `ok` false and refuses the apply, so an
`ok` plan leaves no flow with an error it did not name, and a broken project can be repaired one
document at a time.

Send a PARTIAL document freely: a section you leave out is untouched, and so is every row you do
not name. A ROW is stated whole — it is that row's create body, so its required fields are
required here too (one row asks for more than its create: an `evals` suite must state `scorers`,
`[]` for a contract suite) — but of its optional fields only the ones you state are compared and written;
one you omit keeps its value. The simplest edit is the exported row with one field changed. A
field the row's own PATCH does not take — a facet's `cardinality`, a profile's `modelId`, a
trigger's `source` — is set when the row is created and permanent afterwards: stated unchanged
it is fine (an export states everything), stated CHANGED it is refused on its own path, never
dropped. To change one, state the row under a new key without the `id` and remove the old one.
The exception is the owned collections (a flow's `skills`, a suite's `cases`, a kind's `pairings`
— each `{ fromRecordTypeKey, toRecordTypeKey }`, as the kind's create takes them — a
facet's `terms`): each is stated whole, so when present it replaces the owner's collection — and a
member the project holds that the collection no longer names is REMOVED, which makes that
document one that removes something, with the ADMIN floor an apply that removes has.
A shape or a flow may also carry `adoptSnapshots: true`. Endpoints, and record types through their
processing flow, FREEZE the types they bind (schedules and triggers freeze nothing), so an edit that re-shapes one is refused by the row's own write,
naming what it would leave behind, unless you grant this. A document does not get to assume it:
adopting re-publishes an endpoint's request and response contract to whoever already calls that
route. It is a statement about this apply, like `delete` — never part of the row, never exported.

A schedule, a trigger and a source carry `enabled`, which their create bodies do not: the row API
switches it with a `PATCH` (`{enabled, version}`), and the document writes it through that same
patch after the row. Export always states it. Omitted, a new row is created enabled and an existing
one keeps its state — so a disabled schedule, trigger or source re-created from its export comes
back disabled.

Removal is always explicit — `delete: true` on a row, or `prune: true` on a map to remove every
row of that map you did not name. Absence alone never deletes. A `delete: true` row states nothing
but its `id`; any other field beside it is refused `DOCUMENT_DELETE_WITH_FIELDS` on the row's path.

The answer holds the `version` the project was read at — the lock an apply presents —
`ignoredIds`, three lists, their `counts` and a verdict:

- `changes` — every row you stated, as `create`, `update`, `delete`, `unchanged`, `derived` or
  `skipped`, in your document's order, followed by any row a delete takes along. That is not the
  order an apply writes them: it writes creates and updates kind by kind (shapes first), then
  deletes in reverse. It is complete even when a refusal stopped the attempt early, because it
  comes from comparing your document with the project, not from the attempt. A create's `id` in a
  plan comes from the attempt the plan rolls back, so it is not the id the apply will give the row:
  take ids from the apply's `document`.
- `diagnostics` — every finding, each with a `field` that is a path in YOUR document
  (`records.member.shape`), never a path in some row's request body. Gate on `severity` and
  `introduced`: a finding about the state the document leaves carries `introduced` — `false` when
  it was already in the project, which reports it without gating.
- `consequences` — what the change does to stored data, with counts measured in the planning
  transaction: records re-stamped, a vector reconcile queued, stream fields moved, edges
  re-stamped, `edges-deleted` — every stored edge a relation-kind delete takes along, including a
  kind a record-type delete removes with it — and `records-invalid` — stored records that do not fit a shape you changed. That last one is found by
  reach, not by name: change a shape and every record type whose shape is it, or reaches it
  through a reference, has its stored records checked, whether or not your document mentions the
  type. The count is of records that do not fit, not only newly broken ones; past 5 000 records
  of one type it is a floor and says so (`lowerBound: true`). A consequence is never a refusal — the platform tells
  you, and lets you.
  `reembed` is the one that costs money: this type's stored records are re-embedded for search,
  which spends credits on embedding usage (billed by tokens, so it grows with the records and the
  text each holds), because what its search indexes moved. It is per type, a plan reports it (an
  apply's answer does not repeat it), and it is the one to ask a person about before applying.
  `reindex` is not that: it says a reconcile is queued, which may find nothing to redo. A `filter`
  use added, removed or moved reports `restamp` — every record's filter columns are rewritten — and
  on a searchable type it also queues a `reindex` that embeds nothing.
- `ok` — true exactly when no `error` the document introduces remains; an error carrying
  `introduced: false` was already in the project and does not gate. An apply of the same document
  commits exactly when this is true.

A plan that CREATES a record type also answers that type's contract under `contracts`, by the
type's key: its fields, each with the index type a filter on it would get, and what the bound flow
would add. It is what `derived.contract` answers on `PATCH /v1/record-types/{id}` with
`validateOnly`, for a type that has no row to ask yet — read it to decide a new type's `uses`
before the apply. `supportedUses` rides beside it: the use kinds this deployment reads, so offer a
new type no other. A type the document only restates is not listed, and an apply carries neither.

A row is `skipped` when something it names was refused; `because` holds the path of the refused
row. Fix that row and plan again — the skipped rows were never judged, so they may still hold
findings of their own.

A removal can take along rows you never named: deleting a record type takes the relation kinds
that pair it, deleting a facet takes its terms. That is the row's own delete working as
designed, and the plan says so rather than leaving it to be discovered — each such row is in
`changes` as a `delete` with `because: "cascade"`, is counted under `delete` in `counts`, and carries a
`warning`, `DOCUMENT_DELETE_CASCADED`, on its own path. Read a plan's `delete` list before
applying it; it is the true list, not only yours. A record-type delete also carries its reach on
its own path, whether or not the delete goes through: a `DOCUMENT_DELETE_CASCADED` warning names
the relation kinds and the joins it would take along, so a delete the plan refuses (a type its
records pin) still says what it would have removed. A row your document still STATES is reported
the same way: an edited full export that deletes a record type and still names the relation kind
pairing it has that kind's change on `relations.<kind>` as the cascade, not as `unchanged` — the
document says keep it, the delete takes it anyway, and the warning says which won.

Rows are matched by `id` when the project holds a row of that kind with that id. For a shape, a
record type (while it holds no records and no step's config names it), a skill, an eval suite and
an eval case, keeping the `id` under a new key is a RENAME — one update of the
same row, and everything that named it follows; the row API renames exactly the same kinds. Every
other key is permanent (a facet, a flow, an endpoint: other rows or stored data are linked to it
by key), so the same move is refused on the row;
state the new key without the `id` and remove the old one with `delete: true`. An `id` that belongs to no row here — the usual
case when a document exported from one project is planned against another — is ignored, listed
under `ignoredIds`, and the row is matched by its key instead. It is never a refusal. Two stated
rows that resolve to one current row — one by its id, one by its key — are two statements about
one thing, and are refused on both paths: state it once.

A key that resolves to nothing is `DOCUMENT_KEY_UNRESOLVED` on the path that spelled it. When
exactly one key of the same kind is within two edits, the message offers it; when two are equally
close, it offers none rather than guess. Forward references need no care: a flow may be named by a
row that appears before it, because the platform writes in a fixed order, not yours.

A document is at most 2 MiB and 2 000 rows; past either it is refused with `413` before the
project is read. A body that is not parseable YAML — including a YAML map that states one key
twice — is the only `422` this route answers; a body sent as JSON that is not JSON is the
platform's ordinary `400`. A document that parses but breaks its schema is a `200` plan whose
diagnostics name every broken path.

## Apply a document

`POST /v1/projects/{nodeId}/document` takes `{ version, document }` and makes the document the
project's configuration. `version` is the one the export or the plan gave you; it is required, and
it is the body's envelope — the plan takes the document itself, this route takes the document and
its lock. If the project has moved since, the answer is `409 VERSION_CONFLICT` with the current
document as `current` in the error's `details` — re-base your change on it rather than resending,
because someone else's work is in it. The lock holds to the last statement: an apply whose project
moves while it runs is the same `409`, never a second commit over the first.

An apply is the plan, kept. It commits only when the plan holds no `error`, and then all at once:
one transaction, one project version, one entry in the project's history, however many rows moved.
A refused apply answers `422` with the PLAN as its body and has written nothing — not the rows
before the refused one either. A document that changes nothing answers `applied: true` and leaves
the version where it was, so re-applying what you exported is always safe. What the platform fills in
on a write is not a change: a `flow.invoke` or `flow.merge` `derivedShape`, a `flow.dispatch`
`outputSlot` of `""`, the carry slots a `flow.loop-end` adds to its `inputStreams`, `handlerConfig: {}`
against a stored `null`, and the `x-record-ref` a `link` use stamps on a field. Planning the same
document again, or its export, reports every row `unchanged`, and a step it leaves alone keeps its
`version` and the results cached under it.

The answer is the plan plus `applied`, `appliedVersion` — present that on your next apply if nothing else wrote since — and
`document`, the project as it now stands with every id filled in. Any other write to the project —
a row edit, a task-model binding — moves the version as well, so present the version of your most
recent read or plan, not of your last apply. The answer's `appliedVersion` and `document` are both read inside the
apply's own transaction, so they are this apply's, whatever lands after it.

Authoring needs EDITOR. A document that REMOVES anything — a `delete: true` row, or a `prune: true`
map that finds something to remove — needs ADMIN, and is refused with `403` before the first write
when the caller holds less. The plan says so first: a caller below EDITOR gets
`DOCUMENT_APPLY_FORBIDDEN`, and one below ADMIN gets `DOCUMENT_DELETE_FORBIDDEN` on each row that
removes something, so `ok` is false. Every removal still goes through that row's own delete, so whatever
protects the row there (a flow a schedule still binds, a source something still listens to)
protects it here, and surfaces as a finding on the row's path.

A facet's `terms` are stated whole, like every owned collection: an active term the document does
not name is REMOVED, inside the apply, through the term's own delete. A term a record still
carries — or one that is canonical for an alias — refuses that, and so refuses the apply, with a
finding on `facets.<key>.terms` naming the term; state it to keep it. Aliases and archived terms
are not configuration: they are never exported and never removed this way. The terms the document
DOES name are checked with everything else and SEEDED AFTER the commit, because seeding embeds
each term. The rest of the apply does not wait on it and is not undone by it. If that seed
— or any other work owed after the commit — fails, the apply still answers `200` and
`applied: true`, with a `warning` diagnostic `DOCUMENT_EFFECT_FAILED` on the path that owed it
(`facets.topic.terms`). Read the diagnostics of a successful apply, not only its status: apply the
same document again to retry, and only what is still missing is attempted.
An apply whose only change is a facet's terms is still a change: it moves the version, and its
seed runs after the commit like any other.

A flow's `skills` are matched by `id`, then by key. A step's key is a step name, the one format
every step write takes (lower-case kebab, optionally grouped with dots); a key outside it refuses
that step on its own path. A step the document leaves as it is is not
written; one it changes is updated in place, keeps its `id` and moves its `version`; a new key is
created; a key the map omits is deleted. So a step id held across an apply stays good — a step
renamed by keeping its `id` under the new key keeps it too; only one restated under a new key
without its `id` gets a new one. What a single step save works out, the apply works out too: each
`flow.invoke` output row's `derivedShape` is typed from the flow it calls (never state it — and a
document that rewrites a sub-flow's steps re-types every step calling it, restated or not), and a
flow whose signature changes is judged against the steps the document LEAVES, so retyping an input
and replacing the step that read it is one apply. A step leaves out what a single create lets it
leave out: `inputStreams` for a handler that names its inputs in its settings, prompt or
`flow.invoke` input rows (derived, as the save derives them), `inputSchemas` (each input typed from
what feeds it, a step of the same document included, and typed again when what feeds it changes),
`promptTemplate` and `taskKey`, `outputSlot` on a handler that writes no named result,
`description`, `condition`, `enabled` and `outputSchema`. Left out of a step the flow already holds,
each keeps its value; a new step starts on `""`, `extraction`, no slot, no description, no
condition, enabled, and the type its handler emits (`entity.create` → `RecordCreate`,
`value.transform` → `object`), worked out once what feeds it is typed. An `outputSchema` of `null`
is stated: no constraint. A step the flow already holds keeps its
`outputSchema` when the entry leaves it out — unless the entry moves what its handler emits: a new
`handlerKey`, or a setting the handler's type depends on, stores the new type, and a move to a
handler with no type of its own (`text.generate`) stores none, as a step PATCH does. A list the step does state is written as stated. A step field the write
refuses is named on the step's own path (`flows.<flow>.skills.<step>.outputSchema`), never the
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

Keep the export you took before a change: applying it again, with the project's CURRENT
`version`, puts its rows back. A row deleted since returns as a new row with a new id, and a row
added since stays unless the document says `prune`. Deleting a record type does not delete
the schema entry it took its shape from.

## Make a project equal a document

Absence never deletes, so applying another project's export to this one adds and updates what it
names and leaves every other row standing. To make the project EQUAL the document, state
`prune: true` on every map of rows: the four top-level maps (`schema`, `records`, `relations`,
`facets`), the one under `events` (types), the one under `vectors` (profiles), the
`flows` map, the four under `surfaces` (endpoints, sources, triggers, schedules) and `evals` —
twelve in all, including the maps the document does not carry, since an absent section then
means "none of these". Plan it first: the plan lists every delete, and an apply that removes
anything needs ADMIN.

## What does not travel

No secret value — a secret is always a reference by purpose. No `version`, no timestamp, no
count, no health, no run, no record, no member, no credential. A vector collection is DERIVED
from a profile and a record type's search use, so it appears under `vectors` for reading and is
never applied. A term that is an alias or archived is not configuration and is not exported.
Tenancy — who may open the project — is not in the document by decision.

## A document written for an older format

A document you kept from an earlier export, or wrote from an older example, can state things the
current format refuses. Each is refused on its own path, so the plan names it; the fixes are:

- **A format version other than `kipory: 2`** — `DOCUMENT_VERSION_UNSUPPORTED`. Export again.
- **A step's `onFailure` spelled `FAIL_RUN` / `CONTINUE`** — it is `fail-run` or `continue`,
  lower-case. Change the two values.
- **A `file` use, a `derived` field family, or projection `stages`** on a record type or as a
  profile default — none exists. Remove them; a search slot reads one stored field.
- **A facet `binding`** — a term attaches to the whole record. Remove the field.
- **A flow's own `tests`** — `DOCUMENT_FLOW_TESTS_MOVED`. A flow's cases live under
  `evals.<suite>.cases`.

## Related

- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — what must exist before what, when you author row by row.
- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — the walk from idea to a document.
- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — the shape a record type
  needs, and what owning one means.
