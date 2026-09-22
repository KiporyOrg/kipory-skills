<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — The project document

> **Source of truth for facts:** the document's JSON Schema → live `GET /v1/project-document/schema`;
> endpoint paths & request shapes → live `GET /v1/openapi.json`. This pack carries judgment: what the
> document is for, how a whole project is read as one, and what travels in it and what does not.

## What it is

A project's whole configuration — its shapes, record types, relations, facets, events, flows,
entry points and eval suites — as ONE nested document addressed by name. Nesting expresses
ownership: a flow's steps sit under the flow, a facet's terms under the facet, a suite's cases under
the suite, a record type's own shape under the record type. Ids are optional; the platform fills
them in on export and matches by them on apply. The document you write is the document the
platform hands back.

Read it before authoring anything larger than one row. The row-by-row API has an order — a record
type needs its shape first, a relation kind its record types, a trigger its flow — and the
Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) page states it. The document exists so that you need not
know it: state the whole project by name, and the platform resolves the order.

## Read a project as one document

`GET /v1/projects/{nodeId}/document` answers the project as a document, with the `version` the
project stands at — the lock an apply presents later. It is the same read the operator UI's
bootstrap performs, in the same transaction, so it carries the same `ETag`: send it back as
`If-None-Match` and an unchanged project answers `304`.

- `?section=schema,flows` narrows to those sections, each complete. A partial read carries no
  `ETag` — a validator claims you hold the whole thing.
- `Accept: application/yaml` answers the document ALONE as YAML — the file form, first line
  `kipory: 1`, saved as `<name>.kipory.yaml` and sent back to plan as it is. The wire is JSON,
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
the natural key), the request-only `validateOnly` flag, and every field that holds an id of another
row. So a field a surface grows appears in the document the same day, spelled the same way.

## Three reference forms

Everything is addressed by the name the platform already enforces as unique within a project — a
record type by name, a flow by slug, a facet by key, an endpoint by its own key, an event type by
`<category>/<key>`, a source by `<provider>/<key>`. A few references are ids on the row API and
names in the document — flows, shapes, sources, and a search profile:

| The row API spells        | The document spells   | Meaning                                                       |
| ------------------------- | --------------------- | ------------------------------------------------------------- |
| `dataEntryId`             | `shape`               | a record type's shape, by entry name                          |
| `payloadEntryId`          | `payload`             | an event type's payload, by entry name                        |
| `propertiesEntryId`       | `properties`          | a relation kind's edge properties, by name                    |
| `schemaEntryId`           | `shape`               | a config namespace's shape, by entry name                     |
| `flowId`                  | `flow`                | a record type's, a trigger's or a schedule's flow, by slug    |
| `sourceId`                | `source`              | a trigger's source, as `<provider>/<key>`                     |
| `actionConfig.flow.id`    | `actionConfig.flow`   | an endpoint action's flow, by slug                            |
| `flow`                    | `flow`                | an eval suite's subject — an id on the row API, a slug here   |
| `resolverFlowId`          | `resolver`            | a facet's resolving flow, by slug                             |
| `scorerFlowIds`           | `scorers`             | an eval suite's scorer flows, by slug                         |
| `uses.search.profileId`   | `uses.search.profile` | a record type's embedding profile, by name — its live version |
| `targetFlowId`            | `target`              | a `flow.invoke` step's target, by slug                        |
| `entryId` in a schema ref | `ref`                 | a step's schema reference, by entry name                      |

A bare flow slug always means this project's flow. A library or system flow — one that belongs to
no project — is `system:<slug>`. A facet's `resolver` is the one reference with a default: omit it
on a new facet and the platform binds a semantic facet to its default resolver where it holds one,
so "none" is stated as `resolver: null` — which is how an unbound facet exports, and why that export
re-applies as unbound rather than picking up a resolver on the way back in. A shape may be stated
inline under the record type that uses it,
in which case that record type OWNS it: the shape is edited only through the type, and every
other consumer is refused until it is promoted to a shared entry.

## Plan a document before applying it

`POST /v1/projects/{nodeId}/document/plan` takes the document itself as the body — JSON, or YAML
with `content-type: application/yaml` — and answers what applying it would do. It writes
nothing, so its floor is VIEWER. A plan is not a simulation: the platform applies the document
through every row's own write, in one transaction, and rolls the transaction back. What a plan
refuses is exactly what an apply would refuse.

Send a PARTIAL document freely: a section you leave out is untouched, and so is every row you do
not name. A ROW is stated whole — it is that row's create body, so its required fields are
required here too — but of its optional fields only the ones you state are compared and written;
one you omit keeps its value. The simplest edit is the exported row with one field changed. The
exception is the owned collections (a flow's `skills` and `tests`, a suite's `cases`, a kind's `pairings`, a
facet's `terms`): each is stated whole, so when present it replaces the owner's collection.
A shape or a flow may also carry `adoptSnapshots: true`. Endpoints, schedules and record types
FREEZE the types they bind, so an edit that re-shapes one is refused by the row's own write,
naming what it would leave behind, unless you grant this. A document does not get to assume it:
adopting re-publishes an endpoint's request and response contract to whoever already calls that
route. It is a statement about this apply, like `delete` — never part of the row, never exported.

Removal is always explicit — `delete: true` on a row, or `prune: true` on a map to remove every
row of that map you did not name. Absence alone never deletes.

The answer holds the `version` the project was read at — the lock an apply presents —
`ignoredIds`, three lists, their `counts` and a verdict:

- `changes` — every row you stated, as `create`, `update`, `delete`, `unchanged`, `derived` or
  `skipped`, in the order an apply writes them. It is complete even when a refusal stopped the
  attempt early, because it comes from comparing your document with the project, not from the
  attempt.
- `diagnostics` — every finding, each with a `field` that is a path in YOUR document
  (`records.member.shape`), never a path in some row's request body. Gate on `severity`.
- `consequences` — what the change does to stored data, with counts measured in the planning
  transaction: records re-stamped, vectors re-indexed, stream fields moved, edges re-stamped, and
  `records-invalid` — stored records that do not fit a shape you changed. That last one is found by
  reach, not by name: change a shape and every record type whose shape is it, or reaches it
  through a reference, has its stored records checked, whether or not your document mentions the
  type. The count is of records that do not fit, not only newly broken ones; past 5 000 records
  of one type it is a floor and says so. A consequence is never a refusal — the platform tells
  you, and lets you.
- `ok` — true exactly when no diagnostic is an `error`. An apply of the same document commits
  exactly when this is true.

A row is `skipped` when something it names was refused; `because` holds the path of the refused
row. Fix that row and plan again — the skipped rows were never judged, so they may still hold
findings of their own.

A removal can take along rows you never named: deleting a record type takes the relation kinds
that pair it, deleting an event category takes its types. That is the row's own delete working as
designed, and the plan says so rather than leaving it to be discovered — each such row is in
`changes` as a `delete` with `because: "cascade"`, is counted under `delete` in `counts`, and carries a
`warning`, `DOCUMENT_DELETE_CASCADED`, on its own path. Read a plan's `delete` list before
applying it; it is the true list, not only yours.

Rows are matched by `id` when the project holds a row of that kind with that id. For a shape, a
record type and an eval suite, keeping the `id` under a new name is a RENAME — one update of the
same row, and everything that named it follows. Every other key is permanent (a facet key, a flow
slug, an endpoint key: other rows are linked to it by key), so the same move is refused on the row;
state the new key without the `id` and remove the old one with `delete: true`. An `id` that belongs to no row here — the usual
case when a document exported from one project is planned against another — is ignored, listed
under `ignoredIds`, and the row is matched by its key instead. It is never a refusal.

A name that resolves to nothing is `DOCUMENT_NAME_UNRESOLVED` on the path that spelled it. When
exactly one name of the same kind is within two edits, the message offers it; when two are equally
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
the version where it was, so re-applying what you exported is always safe.

The answer is the plan plus `applied`, `appliedVersion` — present that on your next apply — and
`document`, the project as it now stands with every id filled in: both read inside the apply's own
transaction, so they are this apply's, whatever lands after it.

Authoring needs EDITOR. A document that REMOVES anything — a `delete: true` row, or a `prune: true`
map that finds something to remove — needs ADMIN, and is refused with `403` before the first write
when the caller holds less. Every removal still goes through that row's own delete, so whatever
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
its ids are ignored and its names are the content.

## Make a project equal a document

Absence never deletes, so applying another project's export to this one adds and updates what it
names and leaves every other row standing. To make the project EQUAL the document, state
`prune: true` on every map of rows: the four top-level maps (`schema`, `records`, `relations`,
`facets`), the two under `events` (categories and types), the one under `vectors` (profiles), the
`flows` map, the four under `surfaces` (endpoints, sources, triggers, schedules) and `evals` —
thirteen in all, including the maps the document does not carry, since an absent section then
means "none of these". Plan it first: the plan lists every delete, and an apply that removes
anything needs ADMIN.

## What does not travel

No secret value — a secret is always a reference by purpose. No `version`, no timestamp, no
count, no health, no run, no record, no member, no credential. A vector collection is DERIVED
from a profile and a record type's search use, so it appears under `vectors` for reading and is
never applied. A term that is an alias or archived is not configuration and is not exported.
Tenancy — who may open the project — is not in the document by decision.

## Related

- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — what must exist before what, when you author row by row.
- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — the walk from idea to a document.
- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — the shape a record type
  needs, and what owning one means.
