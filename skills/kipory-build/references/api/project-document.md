<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# The project document

A project's whole configuration as one name-addressed document: export it (it carries `basedOn`, your read), edit it, plan it (the apply, rolled back — writes nothing, and answers what changes field by field, what someone else changed since your read, and every finding and consequence), then apply the kept plan by its `planId` with a note. One transaction, one version, one history entry. The format and a complete example are public reads.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/project-document/example`](#get-v1-project-document-example) |  |
| `GET` | [`/v1/project-document/schema`](#get-v1-project-document-schema) |  |
| `GET` | [`/v1/projects/{nodeId}/document`](#get-v1-projects-nodeid-document) |  |
| `POST` | [`/v1/projects/{nodeId}/document`](#post-v1-projects-nodeid-document) |  |
| `POST` | [`/v1/projects/{nodeId}/document/plan`](#post-v1-projects-nodeid-document-plan) |  |
| `GET` | [`/v1/projects/{nodeId}/document/plans/{planId}`](#get-v1-projects-nodeid-document-plans-planid) |  |

### `GET /v1/project-document/example`

One complete project document, valid against `GET /v1/project-document/schema`, to learn the format from. It belongs to no project.
A project's own document is `GET /v1/projects/{nodeId}/document`; plan a changed one with `POST /v1/projects/{nodeId}/document/plan` and apply it with `POST /v1/projects/{nodeId}/document`. Documents a new project can start from are `GET /v1/templates/{slug}`.
Public: no credential needed.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kipory` | `8` | yes | The document format version. Required, first. A version this build does not read is refused with `DOCUMENT_VERSION_UNSUPPORTED`. |
| `basedOn` | `string` | no | The read this document was made from: `<nodeId>@<version>`, the project it was exported from and that project's version then. The export writes it; keep it in the file. A plan with no `basedOn` query reads it here, so a change made after your read is never overwritten silently. Planned on another project it is refused (422, `BASED_ON_OTHER_PROJECT`): to apply the file there, plan it with that project's current version as `?basedOn=<version>`. |
| `project` | `object` | no | The project's own settings. Optional in a partial document. |
| `types` | `object` | no | Types, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `tables` | `object` | no | Tables, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `relations` | `object` | no | Relations, with their pairings, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `vocabularies` | `object` | no | Vocabularies, with their terms, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `events` | `object` | no | The event registry. |
| `vectors` | `object` | no | Vector spaces. |
| `flows` | `object` | no | Flows keyed by key, each with its actions, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `surfaces` | `object` | no | Entry points. |
| `evals` | `object` | no | Eval suites keyed by key, each with its cases, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |

### `GET /v1/project-document/schema`

The JSON Schema of the project document format — one project's whole configuration addressed by key — with a `version` hash that moves whenever the format does. This describes the format, not any project's content.
One complete document to learn from is `GET /v1/project-document/example`. A project's own document is `GET /v1/projects/{nodeId}/document`; plan a changed one with `POST /v1/projects/{nodeId}/document/plan` and apply it with `POST /v1/projects/{nodeId}/document`.
Public: no credential needed.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the schema — a stable cache key that moves whenever any surface's create body moves. |
| `schema` | `object` | yes | The document's JSON Schema (draft 7), self-contained. |

### `GET /v1/projects/{nodeId}/document`

The project's whole configuration as one document addressed by key — flows with their actions, tables, vocabularies, endpoints, schedules, triggers, evals. Edit it and send it back through `POST …/document/plan` (what would change) and `POST …/document` (apply). To read or change one row, its own route is simpler (`GET /v1/flows/{id}`, `GET /v1/actions?flowId=`, …); this is for the whole project at once — a copy, a diff, a template. The same configuration by id, with a live stream, is `GET /v1/bootstrap?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `section` | `string` | no | Comma-separated section names to include (`types,flows`). Omit for the whole document. Each named section is complete. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | The project's structure version the document was read at — written into the document as `basedOn: <nodeId>@<version>`. A plan reads the document's `basedOn`; changes after it in what you state are listed as `moved`. |
| `document` | `object` | yes | A project's whole configuration as one name-addressed document. Every section is optional; an absent section is untouched on apply. |

### `POST /v1/projects/{nodeId}/document`

Apply a kept plan: `{planId, note}`, the plan from `POST …/document/plan` with `basedOn`. Every row it changes is created, changed or removed through that row's own write, as one history action carrying your note. Refused, nothing changes: 409 `VERSION_CONFLICT` when someone else changed an element the plan changes after your read (`details.moved` says who and what — read again, plan again); 409 `PLAN_STALE` when the plan no longer says what applying it would do; 404 `PLAN_UNKNOWN` for a plan applied, expired or unknown; 422 `VALIDATION_FAILED` with the plan under `details.plan` when the re-plan finds an error it introduces. The answer carries no document: read it with `GET …/document`, and plan your next change from the answered `basedOn`. For one row, call its own write instead (`PATCH /v1/flows/{id}`, `POST /v1/actions`, …).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `planId` | `string` | yes | The `planId` a plan answered (`POST …/document/plan` with `basedOn`). Read the plan before you apply it. |
| `note` | `string` | yes | Why this change is made, in a sentence a person reads in the project's history: "Shorten the reminder copy". 1–500 characters. |
| `label` | `string` | no | A short name for your session, e.g. `agent-docs`, shown in history beside your key's name. Defaults to the plan's label. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `planId` | `string \| null` | no | The id to apply this plan by (`POST …/document` with `{planId, note}`), kept for 24 hours. Null when the plan was asked not to be kept (`keep=false`), when you may not apply on this project, or when the document did not parse. |
| `basedOn` | `string` | yes | The read to plan your next change from, as `<nodeId>@<version>`: `appliedVersion` when nobody else changed the project in between, else your earlier read. Send it as the next plan's `basedOn`. |
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error` this document introduces — an error with `introduced: false` was already in the project, is reported, and does not gate. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | The rows that change, in the document's own order, then any row a delete takes along. Rows the document states that already say this are only counted, under `counts.unchanged`. Not the order an apply writes them: an apply writes creates and updates kind by kind, then deletes in reverse. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding this document introduces, and every finding about the document itself, plus a `PLATFORM_NOTICE` warning for each open notice of a breaking change that reaches the project (it decides nothing). Findings the project already had are counted under `health`. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `moved` | `object[]` | no | Elements this document states or changes that someone else changed after your read (`basedOn`), with who, when, why and what. Any here makes `ok` false and the apply would be refused: read the project again, make your change on what it says now, and plan again. Absent when none moved. |
| `health` | `object` | no | How the change moves the health of the flows it can reach: errors and warnings before and after, what it adds and what it fixes. |
| `contracts` | `object` | no | On a plan: the contract each table the document CREATES would have, by the table's key — its field vocabulary, with each field's index type and what it may be used for. The same contract `derived.contract` answers on `PATCH /v1/tables/{id}` with `validateOnly`, for a table that has no row to ask yet. Absent when the document creates no table, and on an apply. |
| `supportedUses` | `"filter" \| "key" \| "search" \| "link" \| "stream"[]` | no | On a plan, beside `contracts`: the use kinds this deployment has a reader for — what `expand=uses` answers as `supported` on a table that exists. A kind absent here saves but nothing reads it yet, so an editor must not offer it. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |
| `renames` | `object[]` | no | Every rename the document states — a table, relation or vocabulary under a new key, or a type's `renameFields` — with what it rewrites and what callers see move. On a plan and on an apply answer. Absent when the document renames nothing. |
| `permissions` | `object` | no | What the caller's role lets an apply of this document do. |
| `applied` | `true` | yes | The plan is now the project's configuration. Also true when it changed nothing — nothing was written, and the project already says what the document says. |
| `appliedVersion` | `string` | yes | The project's structure version after the apply: one higher than `version` when anything moved, equal to it when nothing did. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | Where the row stands in the document, e.g. `tables.Member` or `flows.intake.actions.classify`. |
| `kind` | `"create" \| "update" \| "delete" \| "unchanged" \| "derived" \| "skipped"` | yes | What applying the document does to this row. `unchanged`: the row already says what the document says. `derived`: the platform derives this row and a document never writes it. `skipped`: not attempted, because a row it depends on was refused — see `because`. |
| `resource` | `"project-settings" \| "project-config" \| "route-enablement" \| "types" \| "embedding-profiles" \| "flows" \| "actions" \| "vocabularies" \| "terms" \| "tables" \| "relations" \| "relation-pairings" \| "event-types" \| "api-endpoints" \| "sources" \| "triggers" \| "schedules" \| "eval-suites" \| "eval-cases"` | yes | The kind of row. |
| `key` | `string` | yes | The row's key. |
| `id` | `string \| null` | yes | The row's id: known for an existing row, filled in for a create once it has been written, null for a create that was not reached. On a plan, a create's id comes from the rehearsal the plan rolls back, so it is not the id an apply gives the row — read those from the apply's `document`. |
| `because` | `string` | no | On `skipped`: the document path of the refused row this one depends on. On a `delete` you did not state: `cascade` — a row your document removes takes this one along. |
| `expressionParts` | `object` | no | On an action whose function takes a JSONata expression (`value.transform`): the size of each expression the document states, in parts, by its `functionConfig` field. An expression may have at most 1,000 parts; from 800 the plan also warns `JSONATA_EXPRESSION_NEAR_LIMIT`. Absent on other rows and on an expression that does not parse. |
| `fields` | `object[]` | no | On an `update`: what changes in the row, field by field, with the value before and after. Text over several lines also carries a line diff. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow reading one gets `null` for those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the action this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on action; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `moved`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The element someone else changed after your read. |
| `version` | `string` | yes | The project version of the newest change to it. |
| `actor` | `object \| null` | yes | Who made that change; null when the history no longer says. |
| `at` | `string \| null` | yes | When that change was made. |
| `note` | `string \| null` | yes | Why, as its author wrote it; null when it carried no note. |
| `label` | `string \| null` | yes | The session that made it, when it named itself. |
| `fields` | `object[]` | yes | What changed in it since your read: per field, the earliest value after your read and the value now. Empty when it was changed and changed back. |

Each item of `ignoredIds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The row that carried the id. |
| `id` | `string` | yes | The id that belongs to no row here. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary"` | yes | What is renamed. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type. |
| `to` | `string` | yes | The new key; for a field, its new path. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |

### `POST /v1/projects/{nodeId}/document/plan`

What applying this document would change — the rows that change, each update field by field — and how the health of the flows it reaches moves; nothing in the project is written. It binds to the read you made the document from: `basedOn` from the query, else the `basedOn` the export wrote into the document as `<nodeId>@<version>` (a plan you mean to apply needs one, or it is a 422). A document read from another project is refused 422 `BASED_ON_OTHER_PROJECT`, naming both projects; to apply it here, plan it with this project's current version as `?basedOn=<version>`. Elements it changes that someone else changed after that read are listed under `moved`, with who, why and what, and make `ok` false. The answer's `planId` is what you apply with `POST /v1/projects/{nodeId}/document`, and `GET …/document/plans/{planId}` reads it back. `keep=false` plans a preview and keeps nothing. A read older than the history the project keeps is 409 `PLAN_STALE`. To change one row, its own write is simpler (`PATCH /v1/flows/{id}`, `POST /v1/actions`, …), and each takes `validateOnly` for the same kind of dry run on that one row; pick this when several rows must change together and be judged as one.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `basedOn` | `string` | no | The read to plan against, overriding the document's own `basedOn`: a read token (`<nodeId>@<version>`, as the export and the last apply answer it) or a bare version of THIS project. A plan you mean to apply needs one here or in the document. A file exported from another project is refused until you send this project's current version here, which plans it against this project as it is now. |
| `keep` | `"true" \| "false"` | no | `false` for a preview you will not apply: no plan is kept and `planId` is null. Default `true`. |
| `label` | `string` | no | A short name for the session planning, e.g. `agent-docs`, so two sessions on one key are told apart. |

**Request body**

_No fields._

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `planId` | `string \| null` | no | The id to apply this plan by (`POST …/document` with `{planId, note}`), kept for 24 hours. Null when the plan was asked not to be kept (`keep=false`), when you may not apply on this project, or when the document did not parse. |
| `basedOn` | `string` | no | The read the plan was bound to, as `<nodeId>@<version>`: this project, and the version the document was read at. |
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error` this document introduces — an error with `introduced: false` was already in the project, is reported, and does not gate. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | The rows that change, in the document's own order, then any row a delete takes along. Rows the document states that already say this are only counted, under `counts.unchanged`. Not the order an apply writes them: an apply writes creates and updates kind by kind, then deletes in reverse. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding this document introduces, and every finding about the document itself, plus a `PLATFORM_NOTICE` warning for each open notice of a breaking change that reaches the project (it decides nothing). Findings the project already had are counted under `health`. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `moved` | `object[]` | no | Elements this document states or changes that someone else changed after your read (`basedOn`), with who, when, why and what. Any here makes `ok` false and the apply would be refused: read the project again, make your change on what it says now, and plan again. Absent when none moved. |
| `health` | `object` | no | How the change moves the health of the flows it can reach: errors and warnings before and after, what it adds and what it fixes. |
| `contracts` | `object` | no | On a plan: the contract each table the document CREATES would have, by the table's key — its field vocabulary, with each field's index type and what it may be used for. The same contract `derived.contract` answers on `PATCH /v1/tables/{id}` with `validateOnly`, for a table that has no row to ask yet. Absent when the document creates no table, and on an apply. |
| `supportedUses` | `"filter" \| "key" \| "search" \| "link" \| "stream"[]` | no | On a plan, beside `contracts`: the use kinds this deployment has a reader for — what `expand=uses` answers as `supported` on a table that exists. A kind absent here saves but nothing reads it yet, so an editor must not offer it. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |
| `renames` | `object[]` | no | Every rename the document states — a table, relation or vocabulary under a new key, or a type's `renameFields` — with what it rewrites and what callers see move. On a plan and on an apply answer. Absent when the document renames nothing. |
| `permissions` | `object` | no | What the caller's role lets an apply of this document do. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | Where the row stands in the document, e.g. `tables.Member` or `flows.intake.actions.classify`. |
| `kind` | `"create" \| "update" \| "delete" \| "unchanged" \| "derived" \| "skipped"` | yes | What applying the document does to this row. `unchanged`: the row already says what the document says. `derived`: the platform derives this row and a document never writes it. `skipped`: not attempted, because a row it depends on was refused — see `because`. |
| `resource` | `"project-settings" \| "project-config" \| "route-enablement" \| "types" \| "embedding-profiles" \| "flows" \| "actions" \| "vocabularies" \| "terms" \| "tables" \| "relations" \| "relation-pairings" \| "event-types" \| "api-endpoints" \| "sources" \| "triggers" \| "schedules" \| "eval-suites" \| "eval-cases"` | yes | The kind of row. |
| `key` | `string` | yes | The row's key. |
| `id` | `string \| null` | yes | The row's id: known for an existing row, filled in for a create once it has been written, null for a create that was not reached. On a plan, a create's id comes from the rehearsal the plan rolls back, so it is not the id an apply gives the row — read those from the apply's `document`. |
| `because` | `string` | no | On `skipped`: the document path of the refused row this one depends on. On a `delete` you did not state: `cascade` — a row your document removes takes this one along. |
| `expressionParts` | `object` | no | On an action whose function takes a JSONata expression (`value.transform`): the size of each expression the document states, in parts, by its `functionConfig` field. An expression may have at most 1,000 parts; from 800 the plan also warns `JSONATA_EXPRESSION_NEAR_LIMIT`. Absent on other rows and on an expression that does not parse. |
| `fields` | `object[]` | no | On an `update`: what changes in the row, field by field, with the value before and after. Text over several lines also carries a line diff. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow reading one gets `null` for those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the action this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on action; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `moved`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The element someone else changed after your read. |
| `version` | `string` | yes | The project version of the newest change to it. |
| `actor` | `object \| null` | yes | Who made that change; null when the history no longer says. |
| `at` | `string \| null` | yes | When that change was made. |
| `note` | `string \| null` | yes | Why, as its author wrote it; null when it carried no note. |
| `label` | `string \| null` | yes | The session that made it, when it named itself. |
| `fields` | `object[]` | yes | What changed in it since your read: per field, the earliest value after your read and the value now. Empty when it was changed and changed back. |

Each item of `ignoredIds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The row that carried the id. |
| `id` | `string` | yes | The id that belongs to no row here. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary"` | yes | What is renamed. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type. |
| `to` | `string` | yes | The new key; for a field, its new path. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |

### `GET /v1/projects/{nodeId}/document/plans/{planId}`

A plan kept by `POST …/document/plan`, as it answered, with whether it was applied and when it expires — for a reviewer reading what an agent planned. Apply it with `POST /v1/projects/{nodeId}/document` and its `planId`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |
| `planId` | `string` | yes | The plan's id, as the plan answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `planId` | `string \| null` | no | The id to apply this plan by (`POST …/document` with `{planId, note}`), kept for 24 hours. Null when the plan was asked not to be kept (`keep=false`), when you may not apply on this project, or when the document did not parse. |
| `basedOn` | `string` | no | The read the plan was bound to, as `<nodeId>@<version>`: this project, and the version the document was read at. |
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error` this document introduces — an error with `introduced: false` was already in the project, is reported, and does not gate. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | The rows that change, in the document's own order, then any row a delete takes along. Rows the document states that already say this are only counted, under `counts.unchanged`. Not the order an apply writes them: an apply writes creates and updates kind by kind, then deletes in reverse. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding this document introduces, and every finding about the document itself, plus a `PLATFORM_NOTICE` warning for each open notice of a breaking change that reaches the project (it decides nothing). Findings the project already had are counted under `health`. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `moved` | `object[]` | no | Elements this document states or changes that someone else changed after your read (`basedOn`), with who, when, why and what. Any here makes `ok` false and the apply would be refused: read the project again, make your change on what it says now, and plan again. Absent when none moved. |
| `health` | `object` | no | How the change moves the health of the flows it can reach: errors and warnings before and after, what it adds and what it fixes. |
| `contracts` | `object` | no | On a plan: the contract each table the document CREATES would have, by the table's key — its field vocabulary, with each field's index type and what it may be used for. The same contract `derived.contract` answers on `PATCH /v1/tables/{id}` with `validateOnly`, for a table that has no row to ask yet. Absent when the document creates no table, and on an apply. |
| `supportedUses` | `"filter" \| "key" \| "search" \| "link" \| "stream"[]` | no | On a plan, beside `contracts`: the use kinds this deployment has a reader for — what `expand=uses` answers as `supported` on a table that exists. A kind absent here saves but nothing reads it yet, so an editor must not offer it. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |
| `renames` | `object[]` | no | Every rename the document states — a table, relation or vocabulary under a new key, or a type's `renameFields` — with what it rewrites and what callers see move. On a plan and on an apply answer. Absent when the document renames nothing. |
| `permissions` | `object` | no | What the caller's role lets an apply of this document do. |
| `state` | `"open" \| "applied"` | yes | `open` until it is applied; an applied plan cannot be applied again. |
| `plannedBy` | `string` | yes | Who planned it: `user:<id>`, `key:<id>`. |
| `label` | `string \| null` | yes | The planning session's label. |
| `expiresAt` | `string` | yes | When it can no longer be applied. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | Where the row stands in the document, e.g. `tables.Member` or `flows.intake.actions.classify`. |
| `kind` | `"create" \| "update" \| "delete" \| "unchanged" \| "derived" \| "skipped"` | yes | What applying the document does to this row. `unchanged`: the row already says what the document says. `derived`: the platform derives this row and a document never writes it. `skipped`: not attempted, because a row it depends on was refused — see `because`. |
| `resource` | `"project-settings" \| "project-config" \| "route-enablement" \| "types" \| "embedding-profiles" \| "flows" \| "actions" \| "vocabularies" \| "terms" \| "tables" \| "relations" \| "relation-pairings" \| "event-types" \| "api-endpoints" \| "sources" \| "triggers" \| "schedules" \| "eval-suites" \| "eval-cases"` | yes | The kind of row. |
| `key` | `string` | yes | The row's key. |
| `id` | `string \| null` | yes | The row's id: known for an existing row, filled in for a create once it has been written, null for a create that was not reached. On a plan, a create's id comes from the rehearsal the plan rolls back, so it is not the id an apply gives the row — read those from the apply's `document`. |
| `because` | `string` | no | On `skipped`: the document path of the refused row this one depends on. On a `delete` you did not state: `cascade` — a row your document removes takes this one along. |
| `expressionParts` | `object` | no | On an action whose function takes a JSONata expression (`value.transform`): the size of each expression the document states, in parts, by its `functionConfig` field. An expression may have at most 1,000 parts; from 800 the plan also warns `JSONATA_EXPRESSION_NEAR_LIMIT`. Absent on other rows and on an expression that does not parse. |
| `fields` | `object[]` | no | On an `update`: what changes in the row, field by field, with the value before and after. Text over several lines also carries a line diff. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow reading one gets `null` for those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the action this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on action; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `moved`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The element someone else changed after your read. |
| `version` | `string` | yes | The project version of the newest change to it. |
| `actor` | `object \| null` | yes | Who made that change; null when the history no longer says. |
| `at` | `string \| null` | yes | When that change was made. |
| `note` | `string \| null` | yes | Why, as its author wrote it; null when it carried no note. |
| `label` | `string \| null` | yes | The session that made it, when it named itself. |
| `fields` | `object[]` | yes | What changed in it since your read: per field, the earliest value after your read and the value now. Empty when it was changed and changed back. |

Each item of `ignoredIds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The row that carried the id. |
| `id` | `string` | yes | The id that belongs to no row here. |

Each item of `renames`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"table" \| "field" \| "relation" \| "vocabulary"` | yes | What is renamed. |
| `path` | `string` | yes | The document path of the row that states the rename. |
| `from` | `string` | yes | The old key; for a field, its old path in the type. |
| `to` | `string` | yes | The new key; for a field, its new path. |
| `tables` | `string[]` | yes | Keys of the tables the rename reaches; for a field, every table whose shape reaches the type. |
| `references` | `object[]` | yes | Configuration positions the rename rewrites, by document path. |
| `candidates` | `object[]` | yes | Places in expressions and templates where the old word MAY mean this rename. Free text, so each is settled by name rather than guessed. |
| `exposures` | `object[]` | yes | What callers of this project see change. Every kind that applies is listed, on the plan and on the apply answer. |
| `pauseMs` | `integer` | yes | The expected pause, in milliseconds, while the rename holds runs at the fence: the wait cap plus an apply estimate scaled from the rows to rewrite. |
| `cost` | `object` | yes | What the rename spends. Its records, links and terms move by `UPDATE`: no model call, and no embedding unless `reembedRecords` says otherwise. |
