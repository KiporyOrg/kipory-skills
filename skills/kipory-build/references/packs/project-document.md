<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — The project document

> **Source of truth for facts:** the document's JSON Schema → live `GET /v1/project-document/schema`;
> endpoint paths & request shapes → live `GET /v1/openapi.json`. This pack carries judgment: what the
> document is for, how a whole project is read as one, and what travels in it and what does not.
>
> **Format 12 names:** a table says `owner` (it was `ownerScope`), a vocabulary `parent` (it was `parentVocabularyKey`), a flow value `type` and `list` (they were `typeName` and `isList`), and a query's clauses name `vocabulary` and `likeTable` (they were vocabularyKey and likeTableKey).

## What it is

A project's whole configuration — its settings, types, tables (with their queries and
selections), relations, vocabularies, events, flows, entry points and eval suites — as ONE nested
document addressed by key. Nesting expresses ownership: a flow's steps sit under the flow, a
table's queries under the table, a vocabulary's terms under the vocabulary, a suite's cases under
the suite. Ids are optional; the platform fills them in on export and matches by them on apply.
The document you write is the document the platform hands back.

The sections, in order: `kipory: 12` (first, required), `basedOn` (the bound form only),
`project`, `requires`, `types`, `tables`, `relations`, `vocabularies`, `events`, `flows`,
`endpoints`, `triggers`, `schedules`, `evals`.

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
  `kipory: 12`, saved as `<name>.kipory.yaml` and sent back to plan as it is (a document that
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

**One document, layers on request.** The default read is the **bound** form: `basedOn` and an `id`
on every row. `?form=plain` drops both — the portable file, for another project or a template.
`&fingerprints=show` turns each `requires.connections.<slug>.operations` list into a map of
operation to its contract hash. `&defaults=show` writes the fixed defaults as values, and inherited
values as YAML comments (beside a JSON document, as `inherited: [{ path, value, from }]`).

⭐ **Every form is sparse** unless defaults are asked for: a field equal to its fixed default, an
unset inherited value, an empty section and an empty owned collection are left out. A
kept-when-omitted field is always shown when it holds a value. `off` and `false` are the same value
wherever a switch is written, and an export writes `off`; `google:` and `google: {}` are the same,
and an export writes the bare key. Apply accepts every form: ids are matched when present,
fingerprints compared when present (a mismatch is a warning naming the operation), and a stated
default is no change.

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
an endpoint's `responseBody` (one flow output sent as the whole body), `status`, `auth` and
`publicRpm`, and an input bound `from: "header.<name>"`, `"rawBody"` or `"patch"`, are written
here as on `POST /v1/api-endpoints`, a
table's `owner` is `user` or `project` here as on `POST /v1/tables` and on a
record (the stored `USER` / `PROJECT` is refused, in a document as on the row) — with
`sharing: true` beside it on a `user` table whose records are shared by grants — and a
relation's `producer` / `cardinality` are `join-record`, `many-to-one`, … as on
`POST /v1/relations` (the camelCase `joinRecord` / `manyToOne` is refused), and an eval
suite's `coverageMode` is `strict` or `report-only` as on `POST /v1/eval-suites`, its `scoreRules`
the same list under the same bounds, with `direction` in kebab (`higher-is-better`). A suite's
`applyWrites` rides along too: `off` means the suite's runs discard what the flow writes
(eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)). One row reads differently: a type row in the document IS
its JSON Schema (`Pounds: { type: number, minimum: 0 }`, its note the schema's own
`description`), where the types row API wraps the same schema in `definition`.

## The `project` section and `requires`

`project` holds the project's own settings:

```yaml
project:
  name: Club # required on create; kept when omitted
  description: Members and meets
  builtInRoutes: { docs: off } # only what is off; a group not named is on
  identity:
    providers: { google } # declared = on; `apple: off` switches one off
    appDomain: https://club.example.com
  ai:
    models: { summarization: { model: <model id>, effort: low } }
    defaultEmbedding: default # omitted = the embedding keyed `default`
    embeddings:
      default: { model: <model id>, matchExactWords: true, chunking: whole }
  credits:
    userLimit: { credits: 200, per: day }
    publicEndpointsLimit: off # off (the default) = public endpoints are unlimited
  mail:
    senders: { support: support@club.example.com }
  config: … # namespaced runtime tunables
```

- ⛔ **In `identity` and `credits` a setting left out is KEPT**, not reset: only an explicit value
  such as `off` clears it, and the plan lists each setting the project holds that the document
  does not state as `kept`. Changing either needs ADMIN. `ai.defaultEmbedding` is kept the same
  way: `ai` stated without it keeps the pointer, and `defaultEmbedding: default` moves it back.
  Everywhere else a left-out field is its default.
- `builtInRoutes`, `ai.models`, `mail.senders` and `config` are owned collections: omitted,
  untouched; stated, whole. `ai.embeddings` is a map of rows, with `delete: true` and `prune: true`.
  `ai.models` refuses `embedding` and `rerank`: an embedding is chosen under `ai.embeddings`, a
  rerank by the step's own `model`.
- A table that declares `search` and names no embedding uses the default one. `default` is a
  reserved key that always resolves: naming it, or naming none, on a project without it creates
  `default` from the inherited embedding model, with `matchExactWords: true` and `chunking: whole`;
  it is pinned from then on. The export prints the `default` row, and a table's `embedding` line,
  only once they differ from what the platform would create now; stating them as that default
  changes nothing in a plan, and `prune` never deletes the hidden row.
- **Mail goes out from the project's default address** (`<project>@<its domain>`) unless a step
  names a sender: `sender: support` names a key of `mail.senders`, bound to an address the
  project's node or an ancestor owns.
- Not in the document: the project's address (subdomain, custom domain), trace rates, the design
  spend cap, test-user settings, the wallet, billing, the payer, secret values, members and keys.

`requires` states what the project needs from outside it. The export derives it; a plan checks it;
an apply ignores it.

```yaml kipory:request=project-document
kipory: 12
requires:
  connections:
    crm:
      {
        source: openapi,
        url: https://crm.example.com/openapi.json,
        operations: [list-contacts],
      }
  secrets: [http_credential/crm]
  emailAddresses: [support@club.example.com]
```

`connections` come from steps whose function is `<slug>.<operation>`, `secrets` from steps that name
a stored vault purpose, `emailAddresses` from the addresses bound in `project.mail.senders` to the
senders steps name (a sender no step names adds nothing; the default address is never listed).
A plan answers one error per connection the organization lacks, naming the call that creates it,
and one per listed operation a connection lacks. A missing secret is a warning naming what to
store; a listed address the project may not send as (not owned and switched on by it or an
organization above) is `REQUIRES_EMAIL_ADDRESS_MISSING`, naming the call that makes it. A
hand-written entry nothing uses — a connection, an operation, a secret, or an address no step's
sender is bound to — is `REQUIRES_UNUSED`; an export writes only what the steps use. What the platform supplies itself — Telegram,
functions on a platform key, sign-in keys — is never listed.

## Queries and selections

**A read is a query; a flow only when it computes.** A table's `queries` hold its named reads: a
query states one read — its conditions under `where` (or a base query it `extends`), its `params`,
its `order` and `pageSize`, and the selection its rows take under `select` — and a flow reads it with
one `record.query` step, `with: { query: book.myShelf }`. A step is outside every table, so it always
names the query as `<table>.<key>`. A `GET` endpoint over that flow declares only its path: its typed
query, paging and `ETag` come from the query (anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)).
Write the clauses in place in a `record.list` or `record.query` step only when a value comes from an
earlier step. A table's `selections` hold its named answer shapes.

<!-- field-ok: authorId — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: publishedOn — one project's example field name, not a platform field -->
<!-- field-ok: visibleBooks — one project's example query key, not a platform field -->

```yaml
tables:
  author:
    type: Author
    selections:
      chip: { properties: { name: name } }
  follow:
    type: Follow
    queries:
      followedAuthors: { fields: [authorId] }
  hide:
    type: Hide
    queries:
      hiddenAuthors: { fields: [authorId] }
  book:
    type: Book
    selections:
      card:
        properties: { title: title, publishedOn: publishedOn, genre: genre }
        linked: { author: { relation: written-by, select: author.chip } }
    queries:
      visibleBooks:
        where:
          - {
              kind: field,
              field: authorId,
              op: not-in,
              set: { query: hide.hiddenAuthors, field: authorId },
            }
      myShelf:
        extends: visibleBooks
        params: { genre: { type: string, optional: true } }
        where:
          - {
              kind: field,
              field: authorId,
              op: in,
              set: { query: follow.followedAuthors, field: authorId },
            }
          - { kind: field, field: genre, op: eq, param: genre }
        order: { by: field, field: publishedOn, direction: desc }
        pageSize: { default: 20, max: 50 }
        select: card
      poetryShelf:
        extends: visibleBooks
        where:
          [{ kind: field, field: genre, op: eq, value: { literal: poetry } }]
```

What no schema says:

- **A query has no `table:`** — its table is the row it sits under. Inside its own table another
  query or selection is named by its bare key (`select: card`, `extends: visibleBooks`); another
  table's is `<table>.<key>` (author.chip, `hide.hiddenAuthors`).
- **`select` names a selection or writes one in place**: `select: { properties: {…}, linked: {…} }`.
  The plain `fields: [...]` projection stays for "these fields", never beside `select`.
- **`where` is `record.query`'s clause grammar written as values** — a query reads no step's value. A
  `field` clause takes exactly one operand: a fixed `value`; a `param`, one of the query's params; or a `set` (the
  values of a field across another query's rows, `id` by default, under `in` or `not-in`).
- ⛔ **A query's fixed text is `{ literal: … }`.** Write `value: { literal: poetry }`, a list
  for `in` / `not-in` as `{ literal: [novel, poetry] }`; a bare number or `true`/`false` stays
  as it is. A bare text is refused (in a step a bare string is a path read, and a query reads no
  step's value), and so is an `{ expr: … }`; a value the reader gives is a `param`.
  The same holds at every operand of a query's clause: a `term`'s `slug`, a `semantic` `text` or
  `likeRecordId`, a `link` or `stream` `where` entry's `value`, a stream `window`'s `from` / `to`,
  and a `peer` field clause's `value`.
- **A set is a sub-read, not a list.** It runs in the same statement as the query, as the same
  caller, with no member cap; an empty set matches nothing under `in` and everything under
  `not-in`, and `not-in` keeps a record with no value at all. A set query holds only `field` clauses
  and sets, two levels deep at most, and no query with a `semantic` clause uses one.
- **`contains` yes, `any` no.** A query's field clause takes `contains` (text anywhere, ignoring
  case, at least 3 characters with a word in them, not signs alone — a param that does not hold
  that is refused when the query is read, and a param of another type at save). A query
  holding an `any` clause is refused at save, `QUERY_ANY_UNSUPPORTED`: OR one field's values with
  `in`, or ask the OR in a `record.query` step written in place. A query's `order` may be
  `{ by: created, direction: asc }` for oldest created first (newest first is the
  default), or name a number, true/false or text field with a `filter` use; a text field needs
  the type's `maxLength` of at most 500
  (`QUERY_ORDER_TEXT_UNBOUNDED`).
- **The exclusion runs before the page is cut**, so a base query that drops what the caller hid
  (`visibleBooks`) gives every query that extends it full pages. `extends` takes the base's table,
  scope and `where` and adds its own clauses; its `order`, `pageSize`, `select` replace the base's.
  One level.
- **An absent param never widens the read.** It takes its `default`; with `optional: true` only the
  clauses naming it are left out; with neither the read fails `QUERY_PARAM_MISSING` before reading.
  A bad value fails `QUERY_PARAM_INVALID`. A param of a set or a base needs a `default`: nothing
  passes it one. This is how an optional filter is written — one step, not a branch per case.
- **A linked read the reader asks for.** A query's linked read (either level) takes `when`: `true`,
  `false`, or `{ param: withAuthor }` naming a boolean param of the query. It is read only when
  that is `true`; `false`, or an optional param left out, leaves it out (each row's `linked` then
  lacks its name). Its far table, when the relation reaches several, is `peerTable`. A query's
  `when` reads no step's value, so it is never `{ expr: … }` or a bare text.
- **Who it reads as is the query's `scope`.** `caller`, the default, reads a person-owned table as
  the signed-in person — the identity is never wired. A flow that can start with no person (a
  schedule, a trigger, a project table's processing) and reaches such a query is refused at plan,
  `QUERY_CALLER_WITHOUT_PERSON`; `project` reads as the project: every person's records of a
  person-owned table (the plan warns `PROJECT_QUERY_READS_PEOPLE` when a signed-in endpoint
  serves it).
- **A selection is the answer's type.** A selected row carries `id` and exactly the named properties; a
  linked one-record property is absent when nothing is linked. The step's value, the endpoint's
  answer and the OpenAPI component (`BookCard`) are derived from it, so they cannot disagree.
- **What a query cannot say yet** — OR across clauses, an order by a linked record's value, a set
  over `link` or `term` clauses, a computed property — stays a flow step after the `record.query`.

`queries` and `selections` are maps of rows under their table, with `delete: true` and
`prune: true` like every other map of rows. A query names only keys, so its rows carry no id but
their own. A query is judged when it is planned, against the document as it leaves it: a query may
be listed before the set or base it names. Deleting a table deletes its queries and selections; it
is refused while another table's query or selection, a step or an endpoint still names one of them.

To see what an applied query answers before a flow uses it, preview it:
`POST /v1/tables/{id}/queries/{key}/preview?project=<id>` with `asUserId` (the member to read as;
none for a query that reads no person's records), the `params`, a cursor (`after` to page on,
`before` to page back) and `limit`. It answers the page as
`items`, `nextCursor`, `prevCursor` and `paging: null`, beside `itemSchema` (one row's JSON Schema),
`tables` (every table the read reaches) and `clauses` (what it ran, params and base merged in). It
needs the viewer role, and writes, charges and runs nothing. `GET /v1/tables/{id}/queries` and
`GET /v1/tables/{id}/selections` list a table's rows. A plan steers reads to queries: clauses
written in place in a `record.list` or `record.query` step equal to a declared query warn
`READ_REPEATS_QUERY`, and a `GET` endpoint whose flow is only one such read warns
`ENDPOINT_IS_A_QUERY`; neither refuses.

## Three reference forms

Every element is addressed by its `key` — the one the platform already enforces as unique within
a project, and the key each section's map is keyed by. An event type is `<category>/<key>` —
the prefix is its namespace, and nothing has to exist before it. A query or a selection is
`<table>.<key>`, or its bare key inside its own table; a relation's source field is
`<table>.<field>`. A type in a provider's namespace (`telegram/…`) is written by the platform when
a trigger first watches that provider: a plan reports it as `derived` and never writes or prunes
it, so an export from a project that watches a channel applies cleanly to one that does not yet.
A row's display text, where it has one, is `label`. A few references are ids on the row API and
keys in the document — flows, types, and an embedding:

| The row API spells      | The document spells     | Meaning                                               |
| ----------------------- | ----------------------- | ----------------------------------------------------- |
| `dataTypeId`            | `type`                  | a table's type, by key                                |
| `payloadDataTypeId`     | `payload`               | an event type's payload, by type key                  |
| `propertiesDataTypeId`  | `properties`            | a relation's link properties, by type key             |
| `dataTypeId`            | `type`                  | a config namespace's type, by key                     |
| `flowId`                | `flow`                  | a table's, trigger's, schedule's or eval suite's flow |
| `resolverFlowId`        | `resolver`              | a vocabulary's resolving flow, by key                 |
| `scorerFlowIds`         | `scorers`               | an eval suite's scorer flows, by key                  |
| `uses.search.profileId` | `uses.search.embedding` | a table's embedding, by key — its live generation     |

A flow's steps hold no id to re-spell: they are written the same way in the document and in
`PUT /v1/flows/{id}/steps`, and a `flow.invoke` step names the flow it calls by key, as `flow` in its `with`.

An endpoint states only what cannot be worked out, here as on the row API: a parameter is
`{ in: path }` or `{ in: query }` (its `type` is `string`; its `required` follows the path and the
flow's inputs), a `{part}` of the path needs no entry at all, and `inputs` left out binds every input of the flow by its name. Such
an endpoint stays bound by name: the export states it with `inputsByName: true`, no `inputs` and
only the parameters you stated, and each apply binds it again against the flow's inputs as they are — never one marked
`internal: true`. When that makes the endpoint accept an input it did not, the plan warns
`ENDPOINT_ACCEPTS_NEW_INPUT`, naming the endpoint, who may call it and where the value is read.
A plan says each value it worked out as an `info` finding, `DOCUMENT_FORM_READ`. An endpoint whose
`inputs` were written is exported whole and keeps them when the document leaves them out
(anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)).

An endpoint states who may call it beside its method and path. `auth: none` makes the endpoint
public — callable with no key and no session — and `publicRpm` sets its requests per minute; see
api-endpoints-anatomy (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`). A public endpoint is unlimited by default: the
project's cap on what its public endpoints may spend is `project.credits.publicEndpointsLimit`
(`{ credits, per: day }`, or `off` for none), and like every `credits` setting it is kept when the
document leaves it out.

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
declarations either way. A table's `uses` is grouped by use: `key: <field>` (one field), `filter:
[…]` (its order carries no meaning), `search: [<field>, …]` or `{ fields, embedding?, chunking?,
indexWhen? }`, `stream: { <field>: { at, filters?, retainDays? } }`, `vocabularies: […]` and `join`.
A field the record does not take from its submission is `{ field, family: processed }` (or
`computed`). There is no `link` use: a link is stated once, on the relation, as
`from: <table>.<field>` and `to: <table>`, and the table's link is derived from it. A table's
`search` fields are indexed in the order the document lists them, at most the embedding's
`searchFieldsPerTable` of them. An embedding under `project.ai.embeddings` states its `model`,
`matchExactWords` (whether exact words are indexed too) and `chunking`, and nothing else about the
index: no slot name, no collection. `chunking` has one spelling everywhere, on an embedding and on a
table's `uses.search` alike: `whole` or `{ tokens, overlap }`.

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
you mean to apply without a read is a `422` naming `basedOn` — unless the project is still as
created, its export stating nothing but its own name, description and routes, where the plan binds
to the version it was planned on; `?keep=false` plans a preview that
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
what it adds, what it fixes) — over the flows the document can reach. One kind of finding the
project already had is listed too: a warning or a note on a step this document changes, marked
`introduced: false`. It was there before your change and does not make `ok` false; it is shown
because you are editing that step.

⛔ **`moved`: what someone else changed after your read.** Every element the document states or
changes — and every key it would create — that another person, key or session changed after
`basedOn` is listed with who, when, their note and label, and what they changed. Any here makes
`ok` false: read the project again, make your change on what it says now, plan again. Elements
the document does not touch never stop it, so two authors working on different flows never refuse
each other. Nor does an element changed and changed back: a pause switched on and off again, or a
schedule's cron moved and restored, leaves it as you read it, and it is not listed. A read older than the history the project keeps is `409 PLAN_STALE` `read-too-old`.

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
that step as already stored. A step whose `description` alone changes is not changed: words are
free, and its stored error stays counted as already there.

Send a PARTIAL document freely: a section you leave out is untouched, and so is every row you do
not name. A ROW is stated whole — it is that row's create body, so its required fields are
required here too (one row asks for more than its create: an `evals` suite must state `scorers`,
`[]` for a contract suite).

⭐ **A stated element is whole.** An element you state — a flow, a table, a
trigger — is the whole element: an own optional field you leave out goes back to its default, as
it would on a create (`description` left out clears it). The plan shows each reset as a field going to its default, with a
`FIELD_RESET_TO_DEFAULT` warning naming the value held now, so nothing resets unseen. State a field
to keep it; the export leaves out only what equals its default, so the simplest edit is still the
exported element with one field changed. Four kinds of field are not reset by leaving them out:

- **owned collections** — a flow's `steps`, a suite's `cases`, a vocabulary's `terms`, a table's
  `uses`, `computed` and `reprocessOn`, and the project's `config`, `builtInRoutes`, `ai.models`
  and `mail.senders`: left out, untouched; stated, whole (a member you leave out of a stated one
  IS removed). A table's `queries` and `selections` are maps of rows, not owned collections;
- **what the platform chooses** — a vocabulary's `resolver` and `resolutionParams` keep the
  binding the project chose;
- **what is kept when omitted** — a table's `sharing`, a vocabulary's `parent` (stated with
  another value, refused as permanent), and every setting under `project.identity` and
  `project.credits`;
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
A field the row's own PATCH does not take — a vocabulary's `cardinality`, an embedding's `model` —
is set when the row is created and permanent afterwards: stated unchanged
it is fine, stated CHANGED it is refused on its own path, never
dropped. To change one, state the row under a new key without the `id` and remove the old one.
The exception is the owned collections (a flow's `steps`, a suite's `cases`, a
vocabulary's `terms`): each is stated whole, so when present it replaces the owner's collection —
and a member the project holds that the collection no longer names is REMOVED, which makes that
document one that removes something, with the ADMIN floor an apply that removes has.
The document may carry `acceptBreaks: { endpoints: [...], tables: [...] }` once, at its top level
beside `kipory`, never on a row. The plan compares every endpoint and flow-backed table the document
reaches before and after the whole document, and answers `contractChanges`: each one whose
contract moves, by key, its `verdict` (`safe` or `breaking`), each change and `mustAccept`. A
document that breaks an endpoint and repairs it in the same apply is no change. A safe change
applies unasked; a breaking one is an error finding until `acceptBreaks` names that endpoint or
table, because accepting re-publishes its request and response contract to whoever already calls
it. Only an admin of the project may accept: the plan answers `permissions.mayAcceptBreaks`, and a
breaking document planned below admin carries `CONTRACT_BREAK_FORBIDDEN` (an admin may still apply
that plan). An admin's plan that does not name a breaking row carries `CONTRACT_BREAK_NOT_ACCEPTED`;
a name that is no row is `VALIDATION_FAILED` on its path; a name the document does not break is
listed in `acceptBreaksNotNeeded`. Like `delete`, it is a statement about this apply — never
stored, never exported.

A type's row may carry `renameFields` (`{"<old path>": "<new name>"}`) beside its schema as it
reads after the rename, `keepExpressions`, the steps whose expressions or templates keep the
old name as written, and `rewriteExpressions`, the steps whose expressions or templates take the
text the plan proposes. All three are statements about this apply, like `acceptBreaks`: never
stored, never exported. The plan answers `renames[]`: what moves, the expression candidates to settle, the
callers it breaks, and `cost` — a rename calls no model and is not charged, and embeds nothing unless
`reembedRecords` says a table's search text names its own key. A swap or a chain (`a`→`b` with
`b`→`a`) in one document is refused: rename one word to a free name first. The tables pack has the
whole rule.

A flow's row may state `caller: user`: the flow runs only for a signed-in user. A run with none
is refused before any step, however it was started, so its steps read `userInfo.userId` with no
guard step. A plan refuses what starts such a flow with nobody signed in: an enabled schedule or
trigger, a project table's processing, a vocabulary's resolver or an eval suite with no run-as
member (`FLOW_CALLER_NEVER_SIGNED_IN`), and a public endpoint (`PUBLIC_ENDPOINT_NEEDS_USER`). A
flow you restate without `caller` no longer states it; an export writes it only where it is set.

A flow's row may carry `renameInputs` and `renameOutputs` (`{"<old name>": "<new name>"}`) beside
its `inputs` and `outputs` as they read after the rename. The apply moves every place that names
the input or output: the reads in the flow's own steps and the keys of its `return` steps, the
`inputs` key of each call and each read of `<call>.<output>` in the flows that call it, the
bindings and settings of the endpoints bound to it, the stored `inputs` of its schedules and
triggers, its eval cases, and the checkpoints of the flow and of its callers. A row you restate
under the old name is moved too; a row you change is written in the words you state. An endpoint
whose callers meet the old name breaks, so the document's `acceptBreaks` names it.
Where a calling flow passes the call's whole value on, an occurrence of an output's old name left
in an expression, a template or a path of that flow is a candidate: change it in the document, or
name its step in the flow row's `keepExpressions` or (an expression or a template)
`rewriteExpressions`. Refused: a flow a table processes its records with
(`RENAME_FLOW_PROCESSES_TABLE`), a flow the document creates, and an input the platform fills by
its name, such as a query's parameter or a trigger's `event` (`RENAME_NAME_TAKEN`). Needs ADMIN;
never stored, never exported.

A table's row may carry `renameComputed` (`{"<old>": "<new>"}`) beside a `computed` that declares
the field under its new name: its kept values, stamps and filter move, and every other table's
computed field reading it reads the new name, without a recompute. Like `renameFields`, it is a
statement about this apply — never stored, never exported. Plans list a `recompute` consequence
when a table's stored records get computed values.

A schedule and a trigger carry `enabled`, which their create bodies do not: the row API
switches it with a `PATCH` (`{enabled, version}`), and the document writes it through that same
patch after the row. An export states it when it is off (`enabled: off`), so a disabled schedule or
trigger re-created from its export comes back disabled. Omitted, it is on, like any field a stated
element leaves out: a new row is created enabled, and an existing disabled one is switched back ON,
with a `FIELD_RESET_TO_DEFAULT` warning on its path. State `enabled: off` to keep a row off.

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
  `decision` it needs from you. Any other finding may carry `fixes` too, each
  `{title, set: [{field, value}]}`: set each `value` at its `field` — a path in your document, in
  the same form as the finding's own `field`; `value: null` removes it — and plan again. A break
  not accepted carries `set acceptBreaks → {endpoints, tables}` naming every breaking row, which
  re-publishes those contracts to their callers: read `contractChanges` first. A required flow input bound to an
  optional query parameter carries `set …params.<name>.required → true`. A finding with no `fixes`
  says in its message what to decide.
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
  on a searchable table it also queues a `reindex` that embeds nothing. ⚠️ A change to a flow-backed
  table's processed fields is not in this list: its `shape-behind` (the records not on the new
  shape, brought to it together by `POST /v1/record-reprocesses` or one by
  `POST /v1/records/{id}/reprocess`) and `field-values-hidden` (the
  records holding a value a read no longer answers: every value of a removed field, and for a
  retyped field the values of a kind the new type does not allow) are on that
  table's row in `contractChanges`, in its own `consequences`.
- `contractChanges` — every endpoint and table whose callers would meet a change, with each change
  (its side, path, before and after, verdict, rule and message), the row's `verdict` and
  `mustAccept`; beside it `acceptBreaksNotNeeded` and `permissions.mayAcceptBreaks`. A row marked
  `mustAccept` refuses the apply until the top-level `acceptBreaks` names it.
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
the same way: an edited full export that deletes a table and still names the relation's
end on it has that relation's change on `relations.<kind>` as the cascade, not as `unchanged` — the
document says keep it, the delete takes it anyway, and the warning says which won.

Rows are matched by `id` when the project holds a row of that kind with that id. For a type, a
table, a relation, a vocabulary, a query, a selection, an eval suite and an eval case, keeping the `id` under a new key is a
RENAME — one update of the same row, and everything that named it follows; the row API renames
the same kinds, bar queries and selections, which only a document writes. A query renamed this way is
renamed in every query that extends it or reads it as a set and in every `record.query` step naming it;
a selection, in every query and selection answering in it. A table renamed this way takes its records with it, a relation its
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
version where it was. What the platform fills in on a write is not a change: the `x-record-ref` a relation's source field
has stamped on it. Planning the same document again, or its export, changes nothing, and a step it leaves
alone keeps the results cached under it.

The answer is the plan plus `applied`, `appliedVersion` and `basedOn` — no document; read it with
`GET …/document`. `basedOn` is the read your next part binds to: `appliedVersion` when nobody else
changed the project in between, or only changed rows your document states and changed them back,
else your earlier read. With a `label`, your own applies and row
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
protects the row there (a flow a schedule still binds)
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
has none; the rest of that section (`builtInRoutes`, `identity`, `ai`, `credits`, `mail`,
`config`) applies. `template` and `document` together
are refused before anything is made. Another project's export is a fine document to start from —
its ids are ignored and its keys are the content.

## Roll back to an export

Keep the export you took before a change. Its `basedOn` is the read it was made at, so planned
as it is, every element changed since is listed under `moved` (or, past the history the project
keeps, it is `409 PLAN_STALE` `read-too-old`). Plan it against the project as it is now instead:
`POST …/document/plan?basedOn=<the project's current version>` — the `version` a fresh
`GET …/document` answers. `moved` is then empty, `changes` are the rollback, and applying that
plan's `planId` with a note puts its rows back. An export in another format is refused ([below](#a-document-in-another-format)). A row deleted since returns as a new row with a new id, and a row
added since stays unless the document says `prune`. Deleting a table does not delete
the type it took its fields from.

## Make a project equal a document

Absence never deletes, so applying another project's export to this one adds and updates what it
names and leaves every other row standing. To make the project EQUAL the document, state
`prune: true` on every map of rows: `types`, `tables`, `relations`, `vocabularies`, `events`,
`project.ai.embeddings`, `flows`, `endpoints`, `triggers`, `schedules` and `evals`, and each
table's `queries` and `selections` — including the maps the document does not carry, since an
absent section then means "none of these". Plan it first: the plan lists every delete, and an apply that removes
anything needs ADMIN.

## What does not travel

No secret value — a secret is always a reference by purpose. No `version`, no timestamp, no
count, no health, no run, no record, no member, no credential. The event types of the `platform`
category are every project's and are shown on export as they are; a document neither creates nor
prunes them. Where a table's search index
is held is the platform's own bookkeeping: `project.ai.embeddings` carries the embeddings and
nothing else, an export names no collection and no slot. A watched source is not a row of the
document: the trigger that watches it holds it. A term that is an alias or archived is not configuration and is not exported.
Tenancy — who may open the project — is not in the document by decision. An eval suite's
`runAsUserId` is a person, not configuration: an export leaves it out, a document that states it is
refused, and it is set on the suite after the apply (`PATCH /v1/eval-suites/{id}`).

## A document in another format

`kipory: 12` is the only format a plan reads. A document stating any other version is refused,
`DOCUMENT_VERSION_UNSUPPORTED`, and nothing converts it: export the project again and make the
change there. A flow with no steps yet is not started (`FLOW_NOT_AUTHORED`).

## Related

- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — what must exist before what, when you author row by row.
- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — the walk from idea to a document.
- Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`) — the type a table
  needs, and what owning one means.
