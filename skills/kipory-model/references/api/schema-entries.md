<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Schema entries

Reusable typed shapes a record type or a flow output refers to. Builtin and library shapes are synthesized on read and have no rows; the seed call materialises the flow-provider entries and is idempotent.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/schema-entries`](#get-v1-schema-entries) |  |
| `POST` | [`/v1/schema-entries`](#post-v1-schema-entries) |  |
| `GET` | [`/v1/schema-entries/{id}`](#get-v1-schema-entries-id) |  |
| `PATCH` | [`/v1/schema-entries/{id}`](#patch-v1-schema-entries-id) |  |
| `DELETE` | [`/v1/schema-entries/{id}`](#delete-v1-schema-entries-id) |  |
| `POST` | [`/v1/schema-entries/{id}/promote`](#post-v1-schema-entries-id-promote) |  |
| `POST` | [`/v1/schema-entries/seed`](#post-v1-schema-entries-seed) |  |

### `GET /v1/schema-entries`

Read a project's type registry: the platform's builtin and library types and the project's own entries, filtered by tier or key, with `expand=graph` for the type-relation graph and `expand=keywords` for what each keyword does. `GET /v1/bootstrap` carries the registry in one snapshot with the rest of the project; `GET /v1/projects/{nodeId}/document` carries the project's own entries by key (`schema`, and each record type's inline `shape`).

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to read. |
| `provenance` | `string` | no | Comma-separated tiers to include, e.g. `operator,library`. Omit for all. |
| `key` | `string` | no | Exact key to look up. Matches exactly, not as a search, so it returns at most one entry. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: graph, keywords. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The types in scope, across every tier unless you filtered by `provenance`. |
| `graph` | `object` | no | The project's type-relation graph. Present only with `expand=graph`, because building it costs the whole graph. |

### `POST /v1/schema-entries`

Create a shared type — a JSON Schema document other rows (record types, event types, config namespaces, relation kinds, flow slots) may reference. With `validateOnly: true` it answers whether the create would be refused, writing nothing, and what each keyword of the definition would do (`derived.keywordVerdicts`). A record type's OWN shape is created with it in a project document (`records.<name>.shape`, `POST /v1/projects/{nodeId}/document`), which also creates several types at once.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the type. |
| `key` | `string` | yes | The type's key. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `definition` | `object` | yes | The type, as a JSON Schema document with an object at the top. Checked against the project's other types when you save, so a reference to something that does not exist is refused. |
| `description` | `string \| null` | no | An optional note about what this type is for. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports. ⚠️ THEY DO NOT DECIDE `ok`: `ok` is whether THIS ROW would save, and a row saves while what it leaves is broken (a step saves while its flow is half-wired). Absent when the dry run did not rehearse — a create, or a draft its planner refused. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write would compute. Present whenever the dry run could read the definition, refused or not. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/schema-entries/{id}`

Read one of a project's own types by id. What references it, whether it can be a record type's shape or the end-user profile, and its keyword verdicts are on the registry read, `GET /v1/schema-entries`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/schema-entries/{id}`

Update one shared type's key, description or definition. An edit that re-shapes a flow signature a row has captured is refused (409) unless `adoptSnapshots` is set. With `validateOnly: true` it rehearses the edit and answers the verdict, what it would leave broken and which stored records would stop fitting, and what each keyword of the definition would do (`derived.keywordVerdicts`), writing nothing. A record type's own shape is edited with `PATCH /v1/record-types/{id}` (`definition`); several rows at once go through `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | The type's new key. References resolve by id, so nothing breaks — but the key is this type's ADDRESS in the app, so the charset rule applies to a rename exactly as it does to a create. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `definition` | `object` | no | REPLACES the definition wholesale rather than merging into it. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `adoptSnapshots` | `boolean` | no | Permission to re-snapshot everything this edit re-shapes. Endpoints, schedules and record types FREEZE the types they bind, so editing this one leaves their stored copy behind; such an edit is refused with 409 (listing them) unless you set this. ⚠️ Not a formality — adopting re-publishes an endpoint's request and response contract to whoever already calls that route. |
| `validateOnly` | `boolean` | no | Check this patch against the stored type and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past (409) — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports. ⚠️ THEY DO NOT DECIDE `ok`: `ok` is whether THIS ROW would save, and a row saves while what it leaves is broken (a step saves while its flow is half-wired). Absent when the dry run did not rehearse — a create, or a draft its planner refused. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write would compute. Present whenever the dry run could read the definition, refused or not. |

### `DELETE /v1/schema-entries/{id}`

Delete one shared type. Refused (409) while anything references it — a record type's shape, an event type's payload, a config namespace, a relation kind, the end-user profile, or a flow, step or type in the project's type-relation graph. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing, with the count of each kind of reference (`derived`). Several rows at once: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `key` | `string` | yes | The deleted type's key, echoed back. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | Everything that points at this entry, counted from the same read the refusal was decided from. Every one of these at zero (and `boundAsProfile` false) is exactly when the delete is allowed. |

### `POST /v1/schema-entries/{id}/promote`

Make a record type's own shape a shared type, so other rows may reference it and `PATCH /v1/schema-entries/{id}` may edit it. One way: nothing makes a shared type owned again. Its shape is unchanged; until promoted it is edited through its owner, `PATCH /v1/record-types/{id}` with `definition`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The entry's `version` as you last read it. Required. Refused with 409 VERSION_CONFLICT when the entry moved since — or was promoted by someone else in the meantime. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/schema-entries/seed`

Store the platform-provided types a project's flows need (idempotent), then answer the registry read `GET /v1/schema-entries` would give. A repair for a project whose seeded types are missing or out of date; a project is seeded when it is created.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to materialise and then read. |
| `expand` | `"graph" \| "keywords"[]` | no | Extra response sections to include, e.g. `["graph"]`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The types in scope, across every tier unless you filtered by `provenance`. |
| `graph` | `object` | no | The project's type-relation graph. Present only with `expand=graph`, because building it costs the whole graph. |
