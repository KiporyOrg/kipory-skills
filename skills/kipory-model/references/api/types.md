<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Schema entries

Reusable typed shapes a record type or a flow output refers to. Builtin and library shapes are synthesized on read and have no rows; the seed call materialises the flow-provider entries and is idempotent.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/types`](#get-v1-types) |  |
| `POST` | [`/v1/types`](#post-v1-types) |  |
| `GET` | [`/v1/types/{id}`](#get-v1-types-id) |  |
| `PATCH` | [`/v1/types/{id}`](#patch-v1-types-id) |  |
| `DELETE` | [`/v1/types/{id}`](#delete-v1-types-id) |  |
| `POST` | [`/v1/types/seed`](#post-v1-types-seed) |  |

### `GET /v1/types`

Read a project's type registry: the platform's builtin and library types and the project's own types, filtered by tier or key, with `expand=graph` for the type-relation graph and `expand=keywords` for what each keyword does. `GET /v1/bootstrap` carries the registry in one snapshot with the rest of the project; `GET /v1/projects/{nodeId}/document` carries the project's own types by key (`schema`, and each table's inline `shape`).

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to read. |
| `provenance` | `string` | no | Comma-separated tiers to include, e.g. `operator,library`. Omit for all. |
| `key` | `string` | no | Exact key to look up. Matches exactly, not as a search, so it returns at most one type. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: graph, keywords. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `entries` | `object[]` | yes | The types in scope, across every tier unless you filtered by `provenance`. |
| `graph` | `object` | no | The project's type-relation graph. Present only with `expand=graph`, because building it costs the whole graph. |

Each item of `entries`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Type id — the stable handle references resolve by. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key. |
| `provenance` | `"builtin" \| "library" \| "infrastructure" \| "operator"` | yes | Which tier this type comes from. Only `operator` types are yours to edit or delete; the rest are supplied by the platform and appear here so references resolve. |
| `version` | `integer \| null` | yes | Optimistic-lock version, REQUIRED on a PATCH. Null on the `builtin` and `library` tiers, which are synthesized from the platform catalog and have no row — and which no PATCH accepts anyway. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document. |
| `description` | `string \| null` | yes | The note recorded against this type, or null. |
| `declaredBy` | `string \| null` | yes | For a library type, the function that declares it — e.g. `audio.metadata`. Null on every other tier: nothing else here is declared by a function. |
| `profileEligible` | `boolean` | yes | Whether this type can be used as the project's end-user profile. Decided by the server — do not re-derive it. Always false for tiers you did not author. |
| `tableEligible` | `boolean` | yes | Whether this type can be used as a table's data shape. Decided by the server — do not re-derive it. Always false for tiers you did not author. |
| `vocabularyExtractable` | `boolean` | yes | Whether a `$vocabularyKey` marker on one of this type's fields would be read: true when a `text.generate` action in this project answers with exactly this type, so its markers become that action's vocabulary extraction. False when no such action does — a marker there saves and extracts nothing — and always false for tiers you did not author. Decided by the server; do not re-derive it. |
| `usedAsProfile` | `boolean` | yes | Whether this project uses this type as its end-user profile. |
| `usedByTables` | `string[]` | yes | Tables whose data shape is this type. |
| `usedByEventTypes` | `string[]` | yes | Event types whose payload is this type, RETIRED ones included — deletion blocks on those too, so a list that skipped them would disagree with what delete actually does. |
| `usedByConfigNamespaces` | `string[]` | yes | Project-config namespaces declared with this type. |
| `usedByRelations` | `string[]` | yes | Relations whose link properties this type describes. Deletion blocks on these, so a list that omitted them would disagree with what delete actually does. |
| `usedByGraph` | `integer` | no | How many flows, actions, functions or sibling types reference this one. ⚠️ Present ONLY with `expand=graph`; ABSENT MEANS NOT ASKED, never zero — do not read a missing count as safe to delete. Sum this with the four lists above and you have exactly what deletion refuses on. |
| `keywordVerdicts` | `object[]` | no | What each keyword in `definition` does — one row per keyword per fragment, keyed by `pointer`. The keywords that are the definition's structure (`type`, `$ref`, `properties`, `required`, `items`, `additionalProperties`, `x-field-order`) and its labels (`title`, `description`) carry no row. A `$ref` target's keywords are that type's own rows. ⚠️ Present ONLY with `expand=keywords`; absent means not asked. |
| `usedByGraphRefs` | `object[]` | no | What `usedByGraph` counts, one reference each — its length equals that count. DIRECT references only: a flow taking a type that `$ref`s this one is listed under that type, and that type is listed here. ⚠️ Present ONLY with `expand=graph`, like `usedByGraph`; absent means not asked, never none. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/types`

Create a type — a JSON Schema document other rows (tables, event types, config namespaces, relations, flow slots) may reference. With `validateOnly: true` it answers whether the create would be refused, writing nothing, and what each keyword of the definition would do (`derived.keywordVerdicts`). A type together with the table shaped by it, or several types at once, is one call to `POST /v1/projects/{nodeId}/document`.

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
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write would compute. Present whenever the dry run could read the definition, refused or not. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Type id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/types/{id}`

Read one of a project's own types by id. What references it, whether it can be a table's shape or the end-user profile, and its keyword verdicts are on the registry read, `GET /v1/types`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The type's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Type id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/types/{id}`

Update one type's key, description or definition. An edit that re-shapes a flow signature a row has captured is refused (409) unless `adoptSnapshots` is set. With `validateOnly: true` it rehearses the edit and answers the verdict, what it would leave broken and which stored records would stop fitting, and what each keyword of the definition would do (`derived.keywordVerdicts`), writing nothing. A table's shape can also be edited together with the type, with `PATCH /v1/tables/{id}` (`definition`); several rows at once go through `POST /v1/projects/{nodeId}/document`.

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
| `adoptSnapshots` | `boolean` | no | Permission to re-snapshot everything this edit re-shapes. Endpoints and flow-backed tables FREEZE the types they bind, so editing this one leaves their stored copy behind; such an edit is refused with 409 (listing them) unless you set this. Schedules and triggers freeze nothing: one whose stored inputs the edit no longer fits is listed in `leavesBehind` instead. ⚠️ Not a formality — adopting re-publishes an endpoint's request and response contract to whoever already calls that route. |
| `validateOnly` | `boolean` | no | Check this patch against the stored type and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past (409) — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Type id — the address for read, patch, delete, and the stable handle other schemas reference. `key` is editable; this is not. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key, as you see it in the editor. Editable — references resolve by id, so renaming breaks nothing. |
| `provenance` | `"operator"` | yes | Always `operator` here: this route only writes types you authored. The read endpoint returns platform-supplied tiers too. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document with an object at the top. |
| `description` | `string \| null` | yes | Your note about what this type is for. Null when unset. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this edit moved, with the version each holds now: the actions whose types it re-shapes (`actions` — every action reading or writing the shape), the event types whose payload contract it reaches, and the endpoints and tables whose adopted snapshot it refreshed. Replace the versions you hold for them before their next PATCH. Empty when the edit moved only this type. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | no | What the write would compute. Present whenever the dry run could read the definition, refused or not. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

### `DELETE /v1/types/{id}`

Delete one type. Refused (409) while anything references it — a table's shape, an event type's payload, a config namespace, a relation, the end-user profile, or a flow, action or type in the project's type-relation graph. With `?validateOnly=true` it answers whether the delete would be refused, writing nothing, with the count of each kind of reference (`derived`). Several rows at once: `POST /v1/projects/{nodeId}/document` with `delete: true`.

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
| `derived` | `object` | no | Everything that points at this type, counted from the same read the refusal was decided from. Every one of these at zero (and `boundAsProfile` false) is exactly when the delete is allowed. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `POST /v1/types/seed`

Store the platform-provided types a project's flows need (idempotent), then answer the registry read `GET /v1/types` would give. A repair for a project whose seeded types are missing or out of date; a project is seeded when it is created.

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

Each item of `entries`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Type id — the stable handle references resolve by. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The type's key. |
| `provenance` | `"builtin" \| "library" \| "infrastructure" \| "operator"` | yes | Which tier this type comes from. Only `operator` types are yours to edit or delete; the rest are supplied by the platform and appear here so references resolve. |
| `version` | `integer \| null` | yes | Optimistic-lock version, REQUIRED on a PATCH. Null on the `builtin` and `library` tiers, which are synthesized from the platform catalog and have no row — and which no PATCH accepts anyway. |
| `definition` | `unknown` | no | The type itself, as a JSON Schema document. |
| `description` | `string \| null` | yes | The note recorded against this type, or null. |
| `declaredBy` | `string \| null` | yes | For a library type, the function that declares it — e.g. `audio.metadata`. Null on every other tier: nothing else here is declared by a function. |
| `profileEligible` | `boolean` | yes | Whether this type can be used as the project's end-user profile. Decided by the server — do not re-derive it. Always false for tiers you did not author. |
| `tableEligible` | `boolean` | yes | Whether this type can be used as a table's data shape. Decided by the server — do not re-derive it. Always false for tiers you did not author. |
| `vocabularyExtractable` | `boolean` | yes | Whether a `$vocabularyKey` marker on one of this type's fields would be read: true when a `text.generate` action in this project answers with exactly this type, so its markers become that action's vocabulary extraction. False when no such action does — a marker there saves and extracts nothing — and always false for tiers you did not author. Decided by the server; do not re-derive it. |
| `usedAsProfile` | `boolean` | yes | Whether this project uses this type as its end-user profile. |
| `usedByTables` | `string[]` | yes | Tables whose data shape is this type. |
| `usedByEventTypes` | `string[]` | yes | Event types whose payload is this type, RETIRED ones included — deletion blocks on those too, so a list that skipped them would disagree with what delete actually does. |
| `usedByConfigNamespaces` | `string[]` | yes | Project-config namespaces declared with this type. |
| `usedByRelations` | `string[]` | yes | Relations whose link properties this type describes. Deletion blocks on these, so a list that omitted them would disagree with what delete actually does. |
| `usedByGraph` | `integer` | no | How many flows, actions, functions or sibling types reference this one. ⚠️ Present ONLY with `expand=graph`; ABSENT MEANS NOT ASKED, never zero — do not read a missing count as safe to delete. Sum this with the four lists above and you have exactly what deletion refuses on. |
| `keywordVerdicts` | `object[]` | no | What each keyword in `definition` does — one row per keyword per fragment, keyed by `pointer`. The keywords that are the definition's structure (`type`, `$ref`, `properties`, `required`, `items`, `additionalProperties`, `x-field-order`) and its labels (`title`, `description`) carry no row. A `$ref` target's keywords are that type's own rows. ⚠️ Present ONLY with `expand=keywords`; absent means not asked. |
| `usedByGraphRefs` | `object[]` | no | What `usedByGraph` counts, one reference each — its length equals that count. DIRECT references only: a flow taking a type that `$ref`s this one is listed under that type, and that type is listed here. ⚠️ Present ONLY with `expand=graph`, like `usedByGraph`; absent means not asked, never none. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
