<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# The project document

A project's whole configuration as one name-addressed document: export it, edit it, plan it (the apply, rolled back — writes nothing, and answers every finding and every consequence for stored data), then apply it with the version the export gave you. One transaction, one version, one history entry. The format and a complete example are public reads.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/project-document/example`](#get-v1-project-document-example) |  |
| `GET` | [`/v1/project-document/schema`](#get-v1-project-document-schema) |  |
| `GET` | [`/v1/projects/{nodeId}/document`](#get-v1-projects-nodeid-document) |  |
| `POST` | [`/v1/projects/{nodeId}/document`](#post-v1-projects-nodeid-document) |  |
| `POST` | [`/v1/projects/{nodeId}/document/plan`](#post-v1-projects-nodeid-document-plan) |  |

### `GET /v1/project-document/example`

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kipory` | `1` | yes | The document format version. Required, first. A version this build does not read is refused with `DOCUMENT_VERSION_UNSUPPORTED`. |
| `project` | `object` | no | The project's own settings. Optional in a partial document. |
| `schema` | `object` | no | Shared shapes, keyed by natural key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `records` | `object` | no | Record types, keyed by natural key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `relations` | `object` | no | Relation kinds, with their pairings, keyed by natural key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `facets` | `object` | no | Facets, with their terms, keyed by natural key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `events` | `object` | no | The event registry. |
| `vectors` | `object` | no | Vector spaces. |
| `flows` | `object` | no | Flows keyed by slug, each with its steps and tests, keyed by natural key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |
| `surfaces` | `object` | no | Entry points. |
| `evals` | `object` | no | Eval suites keyed by name, each with its cases, keyed by natural key. The reserved key `prune: true` removes every row of this map the document does not name; absence alone never deletes. |

### `GET /v1/project-document/schema`

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the schema — a stable cache key that moves whenever any surface's create body moves. |
| `schema` | `object` | yes | The document's JSON Schema (draft 7), self-contained. |

### `GET /v1/projects/{nodeId}/document`

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
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error`. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | Every row the document states, in the order an apply writes them. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |
| `applied` | `true` | yes | The document is now the project's configuration. Also true when it changed nothing — nothing was written, and the project already says what the document says. |
| `appliedVersion` | `string` | yes | The project's structure version after the apply: one higher than `version` when anything moved, equal to it when nothing did. Present it on your next apply. |
| `document` | `object` | yes | The project as it now stands, with every id filled in. |

### `POST /v1/projects/{nodeId}/document/plan`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Request body**

_No fields._

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | True when `diagnostics` holds no `error`. An apply of this document would commit exactly when this is true. |
| `version` | `string` | yes | The project's structure version the plan was computed against. |
| `changes` | `object[]` | yes | Every row the document states, in the order an apply writes them. Complete whether or not a refusal stopped the attempt early. |
| `consequences` | `object[]` | yes | What the changes do to stored data, with measured counts. |
| `diagnostics` | `object[]` | yes | Every finding. `field` is a DOCUMENT path — a refusal a row's own write raised is re-addressed from that write's body onto the document. |
| `ignoredIds` | `object[]` | yes | Ids the document carried that belong to no row of this project. Each row was matched by its key instead; none is a refusal. |
| `counts` | `object` | yes | `changes` counted by kind. |
