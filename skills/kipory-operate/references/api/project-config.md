<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Project config

Namespaced runtime tunables a flow reads, typed by a bound shape. The write is an upsert on (project, namespace); a stale `version` is refused.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/project-config`](#get-v1-project-config) |  |
| `POST` | [`/v1/project-config`](#post-v1-project-config) |  |
| `DELETE` | [`/v1/project-config/{id}`](#delete-v1-project-config-id) |  |

### `GET /v1/project-config`

List one project's config namespaces (`?project=<nodeId>`) — runtime tunables a flow reads as `projectInfo.config.<namespace>` — each with its stored overrides (`data`), its type's `defaults`, the `effective` values a run sees, and the `version` a later write takes. Not for secrets: those live in the vault (`/v1/secrets`), whose values never travel. A namespace's shape is a type (`GET /v1/types?project=`). The same namespaces ride `GET /v1/bootstrap` and the `project.config` section of `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose config to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `namespaces` | `object[]` | yes | Every configured namespace for the project, one entry each. |

Each item of `namespaces`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `namespace` | `string` | yes | The namespace these settings belong to, e.g. `ranking`. |
| `dataTypeId` | `string` | yes | Type that shapes this namespace and supplies each field's default. A soft reference: if the type is deleted, reads keep working and the next write is refused with 422 naming it. |
| `data` | `object` | yes | Your explicit overrides ONLY. A key's absence means “use the default”, so this is usually much smaller than `effective`. |
| `defaults` | `object` | yes | The defaults the bound type declares, one key per top-level field that carries a `default` — the half of `effective` that `data` did not supply. A field absent here has no default: with no override it is absent from what flows read, not null. Nested defaults are not lifted. Empty when the type is gone. Computed per request, like `effective`. |
| `effective` | `object` | yes | Defaults overlaid with `data` — what flows actually read. Computed per request and never stored, so editing a default in the type takes effect here immediately. Overlay is per top-level field: an override replaces the whole field rather than merging into it. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/project-config`

Set one config namespace — an upsert by `(project, namespace)`. Creating it takes `dataTypeId`, the type that types it (`/v1/types`); updating it takes the `version` you read (a stale one is 409 `VERSION_CONFLICT`) and may re-bind the type. `data` holds overrides only and replaces what was stored; the effective object (the type's defaults under the overrides) must satisfy the type. Not for secrets: store those in the vault (`/v1/secrets`). With `validateOnly: true` it answers whether the write would be refused, writing nothing. Several namespaces at once: the `project.config` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the owning project. |
| `namespace` | `string` | yes | Namespace to set. Together with the project this is the natural key — the write is an idempotent upsert, not a create. |
| `data` | `object` | yes | Explicit overrides, replacing whatever was stored. Serialized size is capped at 32768 bytes: this map is seeded into every flow run, so anything larger is content and belongs in a record. |
| `dataTypeId` | `string` | no | Type to shape this namespace by. Required when creating the namespace; on update, omit to keep the current binding or pass a different id to re-bind. |
| `version` | `integer` | no | The version you last read. Required when the namespace already exists — a stale value is refused with 409. Ignored on create. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this upsert against the namespace as stored and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `namespace` | `string` | yes | The namespace these settings belong to, e.g. `ranking`. |
| `dataTypeId` | `string` | yes | Type that shapes this namespace and supplies each field's default. A soft reference: if the type is deleted, reads keep working and the next write is refused with 422 naming it. |
| `data` | `object` | yes | Your explicit overrides ONLY. A key's absence means “use the default”, so this is usually much smaller than `effective`. |
| `defaults` | `object` | yes | The defaults the bound type declares, one key per top-level field that carries a `default` — the half of `effective` that `data` did not supply. A field absent here has no default: with no override it is absent from what flows read, not null. Nested defaults are not lifted. Empty when the type is gone. Computed per request, like `effective`. |
| `effective` | `object` | yes | Defaults overlaid with `data` — what flows actually read. Computed per request and never stored, so editing a default in the type takes effect here immediately. Overlay is per top-level field: an override replaces the whole field rather than merging into it. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `DELETE /v1/project-config/{id}`

Delete one config namespace; flows stop seeing it under `projectInfo.config` on their next run. The type that typed it stays. Nothing refuses it. With `?validateOnly=true` it answers the verdict, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The config namespace's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
