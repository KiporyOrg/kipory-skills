<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Authoring order

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack states which row must exist before which, when a project is authored one call at a
> time. It is the dependency graph the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) resolves for you in
> one apply; read it when you are calling the row-level API by hand, or when a create is refused
> because something it names does not exist yet.

## Read this first

Every design row is addressed by its `key` within its project, and a reference names what it holds
by its suffix — `<kind>Key` for a key, `<kind>Id` for a row id. Five kinds of reference carry an
**id**:

- a **flow** — an endpoint's, a trigger's or a schedule's target, a vocabulary's resolver, an
  eval suite's subject and scorers, the target of a `flow.invoke` action, a table's processing flow;
- a **type** — a table's shape, an event type's payload, a relation's properties, a config
  namespace's shape, a schema reference inside an action;
- a **source** — a trigger's `sourceId`;
- an **eval suite** — a case's `suiteId`;
- an **embedding profile** — a table's `search` use, as `profileId`.

An id exists only after its row is created, so those are the references that force an order.

Two more facts shape the order and are easy to miss:

- **A compound create moves rows you did not address.** `POST /v1/relations` with a `declaration`
  writes the declaration into the table's own row, and with `generate` adds a field to that table's
  type — both rows' `version` moves. The response lists them under `touched` with the version each
  row holds now; update the copies you hold, or the next PATCH you send with the old version is
  refused with `VERSION_CONFLICT`.
- **Two cycles exist, and each is resolved by ordering the halves.** A table's `uses` may name a
  relation that does not exist yet, and that relation's pairings name the table. A flow's
  `flow.invoke` action names a flow that may itself invoke the first. Both are below.

## To create X you need Y first

| To create…                        | You need first…                                                               | Because                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| a table                           | its shape: a type (`POST /v1/types`)                                          | the create takes `dataTypeId`; a shape cannot be declared inline on the row API             |
| a table with `uses.vocabularies`  | every vocabulary it names (`POST /v1/vocabularies`)                           | refused with `USES_VOCABULARY_UNKNOWN`                                                      |
| a table with a `link` use         | the relation it names — see the cycle below                                   | refused with `USES_RELATION_UNKNOWN`                                                        |
| a table with a `search` use       | its embedding profile (`POST /v1/embedding-profiles`)                         | the use carries `profileId`                                                                 |
| a table bound to a flow           | the flow (`POST /v1/flows`)                                                   | the binding carries `flowId`                                                                |
| a relation                        | every table its `pairings` name (`POST /v1/tables`)                           | the pairings are seeded in the create's transaction; a table they name must exist           |
| a relation with `properties`      | the type for link properties                                                  | the create takes `propertiesDataTypeId`; refused with `TYPE_NOT_FOUND`                      |
| a relation pairing                | the relation and both tables                                                  | `relationKey`, `fromTableKey` and `toTableKey` name all three                               |
| a child vocabulary                | its parent vocabulary                                                         | the create takes `parentVocabularyKey`                                                      |
| a vocabulary with a resolver      | the resolving flow                                                            | the create takes `resolverFlowId`                                                           |
| a vocabulary's terms              | the vocabulary, and a parent term before its children                         | `POST /v1/vocabularies/{id}/terms` seeds a tree top-down                                    |
| an event type                     | its payload type, if typed — its namespace is a key it carries, not a row     | the create takes `categoryKey` and `payloadDataTypeId`                                      |
| an action                         | its flow                                                                      | the create takes `flowId`; every action belongs to one flow                                 |
| a consumer action                 | the producer action whose output it reads                                     | an action names its inputs by the producer's output slot; author producers before consumers |
| a `flow.invoke` action            | the flow it invokes — see the cycle below                                     | the action's config carries `targetFlowId`                                                  |
| an action with a schema reference | the type it references                                                        | a schema reference inside an action names a type by id                                      |
| an endpoint                       | the flow its target runs (`POST /v1/flows`)                                   | the target names the flow by id                                                             |
| a trigger                         | its flow, its source (`POST /v1/sources`) when it has one, and its event type | the create takes `flowId` and `sourceId`; the event is `categoryKey` + `eventKey`           |
| a schedule                        | its flow                                                                      | the create takes `flowId`                                                                   |
| a source                          | nothing of yours                                                              | a source seeds its own event vocabulary; a trigger on it comes after                        |
| an eval suite                     | its subject flow and every scorer flow                                        | the create takes `flowId` and `scorerFlowIds`                                               |
| an eval case                      | its suite (`POST /v1/eval-suites`)                                            | the create takes `suiteId`                                                                  |
| a config namespace with a shape   | the type that gives its shape                                                 | the create takes `dataTypeId`                                                               |
| an embedding profile              | nothing of yours                                                              | a table's search use names the profile afterwards                                           |

## The two cycles

**Table ↔ relation.** A `link` use on a table names a relation; the relation's pairings name the
table. Create the table WITHOUT the `link` use, create the relation with its pairings (optionally
with the `declaration` that writes the use for you), then — if you did not use the declaration —
PATCH the table to add the use, with the `version` the relation's `touched` list gave you. The
project document does this in one apply: tables are written with link uses stripped, relations are
written, then the tables are written whole.

**Flow ↔ flow.** Two flows that invoke each other cannot both name the other at creation. Create
both flows first (a flow row needs no actions), then add the `flow.invoke` actions: an action names its
target by id, and both ids exist by then. Author actions after every flow row exists, always.

## What this order is not

It is not a rule about what a project MAY contain — a table with no vocabularies, a flow nobody
invokes and a relation with one pairing are all complete. It is the order in which the row-level API
can accept them. The project document exists so that you need not know it: state the whole project
by key, and `plan` tells you what is unresolved, in one answer.

## Related

- The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the whole project as one file, resolved in this
  order for you.
- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — the shape a table needs first.
- Relations & links (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`) — the declaration that rides on the table.
- Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`) — producers before consumers.
- Vocabularies (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`) — parents before children, terms after the vocabulary.
