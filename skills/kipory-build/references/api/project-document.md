<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# The project document

A project's whole configuration as one name-addressed document: export it, edit it, plan it (the apply, rolled back — writes nothing, and answers every finding and every consequence for stored data), then apply it with the version the export gave you. One transaction, one version, one history entry. The format and a complete example are public reads.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/project-document/example`](#get-v1-project-document-example) |  |
| `GET` | [`/v1/project-document/schema`](#get-v1-project-document-schema) |  |
| `GET` | [`/v1/projects/{nodeId}/document`](#get-v1-projects-nodeid-document) |  |
| `POST` | [`/v1/projects/{nodeId}/document`](#post-v1-projects-nodeid-document) |  |
| `POST` | [`/v1/projects/{nodeId}/document/plan`](#post-v1-projects-nodeid-document-plan) |  |

### `GET /v1/project-document/example`

One complete project document, valid against `GET /v1/project-document/schema`, to learn the format from. It belongs to no project.
A project's own document is `GET /v1/projects/{nodeId}/document`; plan a changed one with `POST /v1/projects/{nodeId}/document/plan` and apply it with `POST /v1/projects/{nodeId}/document`. Documents a new project can start from are `GET /v1/templates/{slug}`.
Public: no credential needed.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kipory` | `4` | yes | The document format version. Required, first. A version this build does not read is refused with `DOCUMENT_VERSION_UNSUPPORTED`. |
| `project` | `object` | no | The project's own settings. Optional in a partial document. |
| `schema` | `object` | no | Shapes, keyed by key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
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
| `section` | `string` | no | Comma-separated section names to include (`schema,flows`). Omit for the whole document. Each named section is complete. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | The project's structure version the document was read at. Present it as `version` on apply; a stale one is refused with 409 and the current document. |
| `document` | `object` | yes | A project's whole configuration as one name-addressed document. Every section is optional; an absent section is untouched on apply. |

### `POST /v1/projects/{nodeId}/document`

Apply a project document: every row it names is created, changed or removed through that row's own write, in one planned change. Ask `POST …/document/plan` first; read the result back with `GET …/document`. For one row, call its own write instead (`PATCH /v1/flows/{id}`, `POST /v1/actions`, …, each with `validateOnly` for a dry run); pick this when several rows change together, as one history action.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | The project's structure version you read the document at — `version` from the export. Required. A stale one is refused with 409 and the current document, so two authors cannot silently overwrite each other. |
| `document` | `unknown` | no | The project document. Validated by the apply itself, so every broken path is reported at once rather than the first one. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error` this document introduces — an error with `introduced: false` was already in the project, is reported, and does not gate. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | Every row the document states, in the document's own order, then any row a delete takes along. Not the order an apply writes them: an apply writes creates and updates kind by kind, then deletes in reverse. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `contracts` | `object` | no | On a plan: the contract each table the document CREATES would have, by the table's key — its field vocabulary, with each field's index type and what it may be used for. The same shape `derived.contract` answers on `PATCH /v1/tables/{id}` with `validateOnly`, for a table that has no row to ask yet. Absent when the document creates no table, and on an apply. |
| `supportedUses` | `"filter" \| "key" \| "search" \| "link" \| "stream"[]` | no | On a plan, beside `contracts`: the use kinds this deployment has a reader for — what `expand=uses` answers as `supported` on a table that exists. A kind absent here saves but nothing reads it yet, so an editor must not offer it. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |
| `applied` | `true` | yes | The document is now the project's configuration. Also true when it changed nothing — nothing was written, and the project already says what the document says. |
| `appliedVersion` | `string` | yes | The project's structure version after the apply: one higher than `version` when anything moved, equal to it when nothing did. Present it on your next apply. |
| `document` | `object` | yes | The project as it now stands, with every id filled in. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | Where the row stands in the document, e.g. `tables.Member` or `flows.intake.actions.classify`. |
| `kind` | `"create" \| "update" \| "delete" \| "unchanged" \| "derived" \| "skipped"` | yes | What applying the document does to this row. `unchanged`: the row already says what the document says. `derived`: the platform derives this row and a document never writes it. `skipped`: not attempted, because a row it depends on was refused — see `because`. |
| `resource` | `"project-settings" \| "project-config" \| "route-enablement" \| "types" \| "embedding-profiles" \| "derived-collections" \| "flows" \| "actions" \| "vocabularies" \| "terms" \| "tables" \| "relations" \| "relation-pairings" \| "event-types" \| "api-endpoints" \| "sources" \| "triggers" \| "schedules" \| "eval-suites" \| "eval-cases"` | yes | The kind of row. |
| `key` | `string` | yes | The row's key. |
| `id` | `string \| null` | yes | The row's id: known for an existing row, filled in for a create once it has been written, null for a create that was not reached. On a plan, a create's id comes from the rehearsal the plan rolls back, so it is not the id an apply gives the row — read those from the apply's `document`. |
| `because` | `string` | no | On `skipped`: the document path of the refused row this one depends on. On a `delete` you did not state: `cascade` — a row your document removes takes this one along. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `ignoredIds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The row that carried the id. |
| `id` | `string` | yes | The id that belongs to no row here. |

### `POST /v1/projects/{nodeId}/document/plan`

What applying this document would change, row by row, and whether the result would be healthy — nothing is written. Apply it with `POST /v1/projects/{nodeId}/document`. To change one row, its own write is simpler (`PATCH /v1/flows/{id}`, `POST /v1/actions`, …), and each takes `validateOnly` for the same kind of dry run on that one row; pick this when several rows must change together and be judged as one.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Request body**

_No fields._

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error` this document introduces — an error with `introduced: false` was already in the project, is reported, and does not gate. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | Every row the document states, in the document's own order, then any row a delete takes along. Not the order an apply writes them: an apply writes creates and updates kind by kind, then deletes in reverse. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `contracts` | `object` | no | On a plan: the contract each table the document CREATES would have, by the table's key — its field vocabulary, with each field's index type and what it may be used for. The same shape `derived.contract` answers on `PATCH /v1/tables/{id}` with `validateOnly`, for a table that has no row to ask yet. Absent when the document creates no table, and on an apply. |
| `supportedUses` | `"filter" \| "key" \| "search" \| "link" \| "stream"[]` | no | On a plan, beside `contracts`: the use kinds this deployment has a reader for — what `expand=uses` answers as `supported` on a table that exists. A kind absent here saves but nothing reads it yet, so an editor must not offer it. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | Where the row stands in the document, e.g. `tables.Member` or `flows.intake.actions.classify`. |
| `kind` | `"create" \| "update" \| "delete" \| "unchanged" \| "derived" \| "skipped"` | yes | What applying the document does to this row. `unchanged`: the row already says what the document says. `derived`: the platform derives this row and a document never writes it. `skipped`: not attempted, because a row it depends on was refused — see `because`. |
| `resource` | `"project-settings" \| "project-config" \| "route-enablement" \| "types" \| "embedding-profiles" \| "derived-collections" \| "flows" \| "actions" \| "vocabularies" \| "terms" \| "tables" \| "relations" \| "relation-pairings" \| "event-types" \| "api-endpoints" \| "sources" \| "triggers" \| "schedules" \| "eval-suites" \| "eval-cases"` | yes | The kind of row. |
| `key` | `string` | yes | The row's key. |
| `id` | `string \| null` | yes | The row's id: known for an existing row, filled in for a create once it has been written, null for a create that was not reached. On a plan, a create's id comes from the rehearsal the plan rolls back, so it is not the id an apply gives the row — read those from the apply's `document`. |
| `because` | `string` | no | On `skipped`: the document path of the refused row this one depends on. On a `delete` you did not state: `cascade` — a row your document removes takes this one along. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `ignoredIds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The row that carried the id. |
| `id` | `string` | yes | The id that belongs to no row here. |
