<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Authoring order

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack states which row must exist before which, when a project is authored one call at a
> time. It is the dependency graph the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) resolves for you in
> one apply; read it when you are calling the row-level API by hand, or when a create is refused
> because something it names does not exist yet.

## Read this first

Every design row is addressed by a name within its project — a record type by its name, a flow by
its slug, a facet by its key — except two kinds of reference that carry an **id**: a **flow** (an
endpoint's action, a trigger's or schedule's target, a facet's resolver, an eval suite's subject and
scorers, and the target of a `flow.invoke` step) and a **schema entry** (a record type's shape, an
event type's payload, a relation kind's properties, a config namespace's shape, and a schema
reference inside a step). An id exists only after its row is created, so those two are the
references that force an order.

Two more facts shape the order and are easy to miss:

- **A compound create moves rows you did not address.** `POST /v1/relation-kinds` with a
  `declaration` writes the declaration into the record type's own row, and with `generate` adds a
  field to that type's schema entry — both rows' `version` moves. The response lists them under
  `touched` with the version each row holds now; update the copies you hold, or the next PATCH
  you send with the old version is refused with `VERSION_CONFLICT`.
- **Two cycles exist, and each is resolved by ordering the halves.** A record type's `uses` may
  name a relation kind that does not exist yet, and that kind's pairings name the record type. A
  flow's `flow.invoke` step names a flow that may itself invoke the first. Both are below.

## To create X you need Y first

| To create…                        | You need first…                                                                    | Because                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| a record type                     | its shape: a schema entry (`POST /v1/schema-entries`)                              | the create takes `dataEntryId`; a shape cannot be declared inline on the row API         |
| a record type with `uses.facets`  | every facet it names (`POST /v1/facets`)                                           | refused with `USES_FACET_UNKNOWN`                                                        |
| a record type with a `link` use   | the relation kind it names — see the cycle below                                   | refused with `USES_RELATION_UNKNOWN`                                                     |
| a record type bound to a flow     | the flow (`POST /v1/flows`)                                                        | the binding carries `flowId`                                                             |
| a relation kind                   | every record type its `pairings` name (`POST /v1/record-types`)                    | the pairings are seeded in the create's transaction; a type they name must exist         |
| a relation kind with `properties` | the schema entry for edge properties                                               | the create takes `propertiesEntryId`; refused with `SCHEMA_ENTRY_NOT_FOUND`              |
| a relation-kind pairing           | the kind and both record types                                                     | `POST /v1/relation-kind-pairings` names all three                                        |
| a child facet                     | its parent facet                                                                   | the create takes `parentFacetKey`                                                        |
| a facet with a resolver           | the resolving flow                                                                 | the create takes `resolverFlowId`                                                        |
| a facet's terms                   | the facet, and a parent term before its children                                   | `POST /v1/facets/{id}/terms` seeds a tree top-down                                       |
| an event type                     | its category (`POST /v1/event-categories`) and, if typed, its payload schema entry | the create takes the category's id and `payloadEntryId`                                  |
| a skill (step)                    | its flow                                                                           | every step belongs to one flow                                                           |
| a consumer step                   | the producer step whose output it reads                                            | a step names its inputs by the producer's output slot; author producers before consumers |
| a `flow.invoke` step              | the flow it invokes — see the cycle below                                          | the step's config carries `targetFlowId`                                                 |
| a step with a schema reference    | the schema entry it references                                                     | a schema reference inside a step names an entry by id                                    |
| an endpoint                       | the flow its action runs (`POST /v1/flows`)                                        | the action names the flow by id                                                          |
| a trigger                         | its flow, its source (`POST /v1/sources`) when it has one, and its event type      | the create takes `flowId` and `sourceId`; the event is named by category and key         |
| a schedule                        | its flow                                                                           | the create takes `flowId`                                                                |
| a source                          | nothing of yours                                                                   | a source seeds its own event vocabulary; a trigger on it comes after                     |
| an eval suite                     | its subject flow and every scorer flow                                             | the create takes `flow` (an id) and `scorerFlowIds`                                      |
| an eval case                      | its suite (`POST /v1/eval-suites`)                                                 | a case belongs to one suite                                                              |
| a config namespace with a shape   | the schema entry that types it                                                     | the create takes `schemaEntryId`                                                         |
| an embedding profile              | nothing of yours                                                                   | a record type's search use names the profile afterwards                                  |

## The two cycles

**Record type ↔ relation kind.** A `link` use on a record type names a kind; the kind's pairings
name the type. Create the record type WITHOUT the `link` use, create the kind with its pairings
(optionally with the `declaration` that writes the use for you), then — if you did not use the
declaration — PATCH the type to add the use, with the `version` the kind's `touched` list gave
you. The project document does this in one apply: record types are written with link uses
stripped, kinds are written, then the types are written whole.

**Flow ↔ flow.** Two flows that invoke each other cannot both name the other at creation. Create
both flows first (a flow row needs no steps), then add the `flow.invoke` steps: a step names its
target by id, and both ids exist by then. Author skills after every flow row exists, always.

## What this order is not

It is not a rule about what a project MAY contain — a record type with no facets, a flow nobody
invokes and a kind with one pairing are all complete. It is the order in which the row-level API
can accept them. The project document exists so that you need not know it: state the whole project
by name, and `plan` tells you what is unresolved, in one answer.

## Related

- The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the whole project as one file, resolved in this
  order for you.
- Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) — the shape a record type
  needs first.
- Relations (capability pack `relations` — `GET /v1/capability-packs/relations`) — the declaration that rides on the record type.
- Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) — producers before consumers.
- Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) — parents before children, terms after the facet.
