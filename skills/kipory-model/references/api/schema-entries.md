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
| `POST` | [`/v1/schema-entries/{id}/keywords-preview`](#post-v1-schema-entries-id-keywords-preview) |  |
| `POST` | [`/v1/schema-entries/{id}/promote`](#post-v1-schema-entries-id-promote) |  |
| `POST` | [`/v1/schema-entries/keywords-preview`](#post-v1-schema-entries-keywords-preview) |  |
| `POST` | [`/v1/schema-entries/seed`](#post-v1-schema-entries-seed) |  |

### `GET /v1/schema-entries`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to read. |
| `provenance` | `string` | no | Comma-separated tiers to include, e.g. `operator,library`. Omit for all. |
| `name` | `string` | no | Exact name to look up. Matches exactly, not as a search, so it returns at most one entry. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: graph, keywords. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The types in scope, across every tier unless you filtered by `provenance`. |
| `graph` | `object` | no | The project's type-relation graph. Present only with `expand=graph`, because building it costs the whole graph. |

### `POST /v1/schema-entries`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the type. |
| `name` | `string` | yes | A name for the type. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `definition` | `object` | yes | The type, as a JSON Schema document with an object at the top. Checked against the project's other types when you save, so a reference to something that does not exist is refused. |
| `description` | `string \| null` | no | An optional note about what this type is for. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a name another type in this project already holds, or addresses (409) — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/schema-entries/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/schema-entries/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | Rename the type. References resolve by id, so nothing breaks — but the name is this type's ADDRESS in the app, so the charset rule applies to a rename exactly as it does to a create. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `definition` | `object` | no | REPLACES the definition wholesale rather than merging into it. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `adoptSnapshots` | `boolean` | no | Permission to re-snapshot everything this edit re-shapes. Endpoints, schedules and record types FREEZE the types they bind, so editing this one leaves their stored copy behind; such an edit is refused with 409 (listing them) unless you set this. ⚠️ Not a formality — adopting re-publishes an endpoint's request and response contract to whoever already calls that route. |
| `validateOnly` | `boolean` | no | Check this patch against the stored type and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, an edit that re-shapes bound snapshots without `adoptSnapshots` (409), a new name another type in this project already holds, or addresses (409) — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
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

### `DELETE /v1/schema-entries/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/delete-preflight`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `name` | `string` | yes | The deleted type's name, echoed back. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | Everything that points at this entry, counted from the same read the refusal was decided from. Every one of these at zero (and `boundAsProfile` false) is exactly when the delete is allowed. |

### `POST /v1/schema-entries/{id}/keywords-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `definition` | `object` | yes | The type as you are editing it — the whole JSON Schema document, exactly as a PATCH would send it. Nothing is saved or checked against the registry; the answer only says what each keyword in it would do. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `keywordVerdicts` | `object[]` | yes | What each keyword in the definition you sent would do — the rows `GET /v1/schema-entries?expand=keywords` returns for this type once that definition is saved, judged against what binds the type now (its config namespaces and whether it is the project's end-user profile). The definition's structural keywords and its labels carry no row, as on the read. |

### `POST /v1/schema-entries/{id}/promote`

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
| `id` | `string` | yes | Entry id — the address for read, patch, delete, and the stable handle other schemas reference. `name` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `name` | `string` | yes | The type's name, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `slug` | `string` | yes | The type's address in the app — its name folded to lowercase with dashes, e.g. `RecordPage` becomes `record-page`. Derived from the name, so a rename moves it; references resolve by id and are unaffected. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/schema-entries/keywords-preview`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project the type is being created in. |
| `definition` | `object` | yes | The type as you are drafting it — the whole JSON Schema document, exactly as the create would send it. Nothing is saved or checked against the registry; the answer only says what each keyword in it would do. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `keywordVerdicts` | `object[]` | yes | What each keyword in the definition you sent would do — the rows `GET /v1/schema-entries?expand=keywords` would return for a type with that definition that nothing binds yet (no config namespace, not the end-user profile). The definition's structural keywords and its labels carry no row, as on the read. |

### `POST /v1/schema-entries/seed`

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
