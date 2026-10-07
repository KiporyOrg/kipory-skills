<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Projects

A project is the container everything else scopes by. Creating one needs OWNER at the parent organisation node, and the `id` the create answers is the project's one id: `{nodeId}` in these paths, `?project=` on every list, `project` in every create body. The project's generated element descriptions are here too.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/descriptions`](#get-v1-descriptions) |  |
| `POST` | [`/v1/descriptions/describe`](#post-v1-descriptions-describe) |  |
| `GET` | [`/v1/descriptions/history`](#get-v1-descriptions-history) |  |
| `POST` | [`/v1/projects`](#post-v1-projects) |  |
| `GET` | [`/v1/projects/{nodeId}`](#get-v1-projects-nodeid) |  |
| `PATCH` | [`/v1/projects/{nodeId}`](#patch-v1-projects-nodeid) |  |
| `DELETE` | [`/v1/projects/{nodeId}`](#delete-v1-projects-nodeid) |  |
| `PUT` | [`/v1/projects/{nodeId}/address`](#put-v1-projects-nodeid-address) |  |
| `GET` | [`/v1/projects/{nodeId}/connections`](#get-v1-projects-nodeid-connections) |  |
| `GET` | [`/v1/projects/{nodeId}/history`](#get-v1-projects-nodeid-history) |  |
| `GET` | [`/v1/projects/{nodeId}/history/{structureVersion}`](#get-v1-projects-nodeid-history-structureversion) |  |
| `POST` | [`/v1/projects/{nodeId}/purge`](#post-v1-projects-nodeid-purge) |  |
| `POST` | [`/v1/projects/{nodeId}/restore`](#post-v1-projects-nodeid-restore) |  |
| `GET` | [`/v1/projects/{nodeId}/settings`](#get-v1-projects-nodeid-settings) |  |
| `PATCH` | [`/v1/projects/{nodeId}/settings`](#patch-v1-projects-nodeid-settings) |  |
| `GET` | [`/v1/projects/address-availability`](#get-v1-projects-address-availability) |  |

### `GET /v1/descriptions`

The newest generated description of every element of a project, with the describer's state. Answers 304 to a matching `If-None-Match`. For one element's earlier versions use `GET /v1/descriptions/history`; to ask for a run now, `POST /v1/descriptions/describe`; to switch the describer off, `describerEnabled` on `PATCH /v1/projects/{nodeId}/settings`. An element's own authored `description` is served by the element's route, not here.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project — its id, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `describer` | `object` | yes | The state of the platform's describer for this project: whether it is on, how far the configuration has been described, and how its last run ended. |
| `elements` | `object[]` | yes | The newest description of every described element. |

Each item of `elements`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"project" \| "flow" \| "step" \| "table" \| "endpoint" \| "schedule" \| "trigger" \| "vocabulary" \| "event-type"` | yes | What kind of element. |
| `elementId` | `string` | yes | The element's own id — for the project itself, the project's id (its node id). |
| `elementRef` | `string` | yes | `<kind>:<elementId>` — the key to join on, and what `GET /v1/descriptions/history` takes as `element`. The project's own is `project:<project id>`. |
| `summary` | `string` | yes | One line, for a list row. |
| `description` | `string` | yes | One to three sentences on what the element does and why. |
| `reads` | `string[]` | yes | What it takes in, in plain words. |
| `writes` | `string[]` | yes | What it creates, changes, sends or announces. |
| `external` | `string[]` | yes | Outside services and AI models it calls. |
| `when` | `string \| null` | yes | What starts it, when the configuration says; null otherwise. |
| `knobs` | `object[]` | yes | The settings that decide its behaviour, with current values. |
| `questions` | `string[]` | yes | What a reader would want to know that the configuration cannot tell — an audit list. |
| `confidence` | `"high" \| "medium" \| "low"` | yes | How sure the description is, given what the platform knew. |
| `derivedAtVersion` | `string` | yes | The structure version the description was written at. |
| `describedAt` | `string` | yes | When it was written (ISO 8601). |

### `POST /v1/descriptions/describe`

Ask the platform to describe the project's elements now instead of after its usual delay. Answers 202 whether or not a run started — `enqueued` and `reason` say which. The platform pays; there is no charge. Read the result with `GET /v1/descriptions` a few minutes later.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project — its id, as `POST /v1/projects` answered it. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `enqueued` | `boolean` | yes | Whether this request started a run. False is not an error — see `reason`. |
| `reason` | `"already-queued" \| "switched-off" \| "switched-off-platform" \| "ceiling-reached"` | no | Why nothing started, present only when `enqueued` is false. `already-queued` — a run is already coming; `switched-off` — the project's describer is off; `switched-off-platform` — the platform's describer is off for every project; `ceiling-reached` — the project spent its daily allowance of model calls. |

### `GET /v1/descriptions/history`

One element's generated descriptions, newest first, one page at a time — walk it with `after` = `nextCursor`. `element` is the `elementRef` `GET /v1/descriptions` lists. For the current description of every element at once, use `GET /v1/descriptions`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project — its id, as `POST /v1/projects` answered it. |
| `element` | `string` | yes | The element's reference, `<kind>:<elementId>` — as `elementRef` reads on `GET /v1/descriptions`. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | Descriptions per page, 1–100; default 20. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `elementRef` | `string` | yes | The element asked about, `<kind>:<elementId>`. |
| `versions` | `object[]` | yes | One page of the element's stored descriptions, newest first. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |
| `paging` | `null` | yes | Always null: the history is walked by its cursors, with no page count — a drill-in view reads it page by page. |

Each item of `versions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"project" \| "flow" \| "step" \| "table" \| "endpoint" \| "schedule" \| "trigger" \| "vocabulary" \| "event-type"` | yes | What kind of element. |
| `elementId` | `string` | yes | The element's own id — for the project itself, the project's id (its node id). |
| `elementRef` | `string` | yes | `<kind>:<elementId>` — the key to join on, and what `GET /v1/descriptions/history` takes as `element`. The project's own is `project:<project id>`. |
| `summary` | `string` | yes | One line, for a list row. |
| `description` | `string` | yes | One to three sentences on what the element does and why. |
| `reads` | `string[]` | yes | What it takes in, in plain words. |
| `writes` | `string[]` | yes | What it creates, changes, sends or announces. |
| `external` | `string[]` | yes | Outside services and AI models it calls. |
| `when` | `string \| null` | yes | What starts it, when the configuration says; null otherwise. |
| `knobs` | `object[]` | yes | The settings that decide its behaviour, with current values. |
| `questions` | `string[]` | yes | What a reader would want to know that the configuration cannot tell — an audit list. |
| `confidence` | `"high" \| "medium" \| "low"` | yes | How sure the description is, given what the platform knew. |
| `derivedAtVersion` | `string` | yes | The structure version the description was written at. |
| `describedAt` | `string` | yes | When it was written (ISO 8601). |

### `POST /v1/projects`

Create a project under an organization, empty or from a template, in one transaction. The answer's `id` is the project's id everywhere: `{nodeId}` under `/v1/projects/`, `?project=` on lists, `project` in create bodies. Check the slug first with `GET /v1/projects/address-availability`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The project's display name. |
| `slug` | `string` | yes | The project's URL-safe short name. It must be free across the whole platform, and it decides the subdomain the project's API is served at. |
| `parentNodeId` | `string` | no | The organization node the project hangs under. Omit it and the project goes under the platform organization. |
| `template` | `string` | no | Slug of a project template (`GET /v1/templates`) to start the project with. Its configuration is applied in the SAME transaction that creates the project: if the platform refuses any of it, no project exists afterwards. Omit it and `document` for an empty project. The project keeps no link to the template. |
| `document` | `unknown` | no | A project document (`GET /v1/project-document/schema`) to start the project with — one of your own, or another project's export. Applied in the SAME transaction that creates the project, like a template: if the platform refuses any of it, no project exists afterwards, and the refusal carries the plan with every finding's path. The body's `name` wins over the document's `project.name`. Exclusive with `template`. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The new project's id — its node id, the one id a project has on the wire. Pass it as `{nodeId}` under `/v1/projects/`, as `?project=` on a list and as `project` in a create body. |
| `slug` | `string` | yes | The slug the project was created with. |
| `name` | `string` | yes | The project's display name. |
| `requires` | `object` | no | Present when the project was created from a template: what the project needs that a template cannot carry — the secrets to store next. Absent for an empty project. |

### `GET /v1/projects/{nodeId}`

One project: its id, slug, name, description, address label, base URL, kind and retirement state. Its settings, auth configuration, profile schema and app domain are their own reads under this path; its whole configuration is `GET /v1/projects/{nodeId}/document` or `GET /v1/bootstrap?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, the id `POST /v1/projects` answers and every `?project=` takes. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, and the one id a project has on the wire: `{nodeId}` under `/v1/projects/`, `?project=` on a list, `project` in a create body. |
| `slug` | `string` | yes | The project's URL-safe short name, unique across the platform. |
| `name` | `string` | yes | The project's display name. |
| `description` | `string` | yes | What the project is for, in its operators' own words. Empty when nobody has written one. |
| `subdomain` | `string` | yes | The project's address label: the first label of the host its own API is served at. A label, not a host and not a URL — call `baseUrl`. |
| `baseUrl` | `string \| null` | yes | The base URL this project's own API is served at, e.g. `https://<subdomain>.<installation host>`. Endpoints you author, the end-user session routes and the credit balance are reachable here, NOT on the design API's host. Read it; do not build it from `subdomain`. Null when this installation publishes no public host (a local API on `localhost`). |
| `kind` | `"product" \| "fixture"` | yes | `product` is a real tenant project; `fixture` is platform scaffolding. Worth checking when you read a project by id: the LIST returns only `product`, while reading one directly returns either, so an id that never appeared in a listing can still resolve here. |
| `lifecycle` | `object` | yes | Whether this project is live or retired. Grouped because the two dates are one fact — `purgeAfter` means nothing without `retiredAt`, and a live project has neither. |
| `createdAt` | `string` | yes | When the project was created (ISO). |

### `PATCH /v1/projects/{nodeId}`

Rename a project or change its description. The slug never changes; the address is `PUT /v1/projects/{nodeId}/address`, and spend ceilings are `PATCH /v1/projects/{nodeId}/settings`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, the id `POST /v1/projects` answers and every `?project=` takes. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | The project's new display name. Trimmed, and NOT required to be unique — the slug is the unique identity, and it is not changed by this. Absent = unchanged. |
| `description` | `string` | no | What the project is for, in your own words. Trimmed; an empty string clears it. Absent = unchanged. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, and the one id a project has on the wire: `{nodeId}` under `/v1/projects/`, `?project=` on a list, `project` in a create body. |
| `slug` | `string` | yes | The project's URL-safe short name, unique across the platform. |
| `name` | `string` | yes | The project's display name. |
| `description` | `string` | yes | What the project is for, in its operators' own words. Empty when nobody has written one. |
| `subdomain` | `string` | yes | The project's address label: the first label of the host its own API is served at. A label, not a host and not a URL — call `baseUrl`. |
| `baseUrl` | `string \| null` | yes | The base URL this project's own API is served at, e.g. `https://<subdomain>.<installation host>`. Endpoints you author, the end-user session routes and the credit balance are reachable here, NOT on the design API's host. Read it; do not build it from `subdomain`. Null when this installation publishes no public host (a local API on `localhost`). |
| `kind` | `"product" \| "fixture"` | yes | `product` is a real tenant project; `fixture` is platform scaffolding. Worth checking when you read a project by id: the LIST returns only `product`, while reading one directly returns either, so an id that never appeared in a listing can still resolve here. |
| `lifecycle` | `object` | yes | Whether this project is live or retired. Grouped because the two dates are one fact — `purgeAfter` means nothing without `retiredAt`, and a live project has neither. |
| `createdAt` | `string` | yes | When the project was created (ISO). |

### `DELETE /v1/projects/{nodeId}`

Retire a project: its node is suspended, its API keys, schedules and sources are held, and a daily sweep destroys it after `purgeAfter` unless it is restored first (`POST /v1/projects/{nodeId}/restore`). Send `confirmSlug`. Ask `validateOnly=true` first to see what a purge would destroy — the same route, writing nothing. To destroy a retired project now instead of waiting, `POST /v1/projects/{nodeId}/purge`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check retiring this project and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a fixture project — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/v1/projects/{nodeId}/deletion-preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirmSlug` | `string` | no | The project's own slug, typed back to confirm you mean this project. Required to retire; optional with `validateOnly=true`, where a wrong one is reported in the verdict. Anything else is refused. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `slug` | `string` | yes | The retired project's slug. |
| `purgeAfter` | `string` | yes | When this becomes irreversible. A daily sweep permanently destroys projects past this date, so restore before it (`POST /v1/projects/{nodeId}/restore`). |
| `willPurge` | `object` | yes | What the eventual purge will destroy, counted by kind. A preview of the consequence, not of anything already done. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `graceDays` | `integer` | yes | How many days a retire started now would keep the project restorable before it is destroyed. A project already retired keeps the deadline it was given — `purgeAfter`. |
| `counts` | `object` | yes | What a purge would destroy, by kind. A PREVIEW — reading it changes nothing, and the figures move as the project keeps being used. |
| `external` | `object` | yes | What would be destroyed OUTSIDE the main database, and therefore not recoverable from a database backup. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `PUT /v1/projects/{nodeId}/address`

Move the project to a new address (its subdomain); the slug never changes. The old address is reserved for a few minutes. Ask `GET /v1/projects/address-availability?candidate=&project=` first: `candidate` is the new subdomain, `project` this project's id.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `subdomain` | `string` | yes | The address to move to, e.g. "harvest". Sent raw — it is normalized (trimmed, lower-cased) server-side. Sending the project's CURRENT address is an explicit no-op: it succeeds, changes nothing, and never puts the address you kept into the reuse cooldown. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `subdomain` | `string` | yes | The project's address after the call, normalized — trimmed and lower-cased, so it may differ from what was sent. |
| `previousSubdomain` | `string \| null` | yes | The address this call freed, or null when nothing moved because you sent the address the project already had. A freed address is reserved against reuse by any OTHER project for a few minutes, and keeps resolving here for at most that long while routing caches expire — so the cutover is quick but not instantaneous everywhere. |

### `GET /v1/projects/{nodeId}/connections`

Every element of the project — flows, steps, tables, endpoints, schedules, triggers, vocabularies, event types — with every relation between two of them (what starts what, which records a step reads or writes, what it tags and announces) and every model, outside service and mail call a step makes, computed from the configuration when read. Revalidate with `If-None-Match`: an unchanged project answers 304. For the configuration itself, read `GET /v1/projects/{nodeId}/document` instead.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | The structure version the connections were computed at. |
| `elements` | `object[]` | yes | Every element of the project, plus each platform flow a relation reaches. |
| `relations` | `object[]` | yes | Every relation between two elements. |
| `calls` | `object[]` | yes | Every model, outside service and mail call a step makes. A flow calls what its steps call. |

Each item of `elements`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ref` | `string` | yes | `<kind>:<id>` — the element's reference, the same `elementRef` the element descriptions use. An opaque identifier: its prefix keeps the descriptions' spelling (`table:`, `eventType:`), so read an element's kind from `kind`, never from the prefix. |
| `kind` | `"flow" \| "step" \| "table" \| "endpoint" \| "schedule" \| "trigger" \| "vocabulary" \| "event-type"` | yes | What kind of element. |
| `label` | `string` | yes | The element's display text. A step's own key; its flow is `flowRef`. |
| `flowRef` | `string \| null` | yes | Steps only: the reference of the flow the step is part of. |
| `order` | `integer \| null` | yes | Steps only: the step's position in its flow, 1-based. |
| `enabled` | `boolean` | yes | False for a step, schedule or trigger that is switched off; true otherwise. |
| `platform` | `boolean` | yes | True for a platform (SYSTEM) flow the project uses — named here because a project relation reaches it, never one of the project's own. |
| `handlerUnknown` | `boolean` | yes | Steps only: the step names a handler the platform no longer knows, so its data relations and calls cannot be stated. |
| `startedByNothing` | `boolean` | yes | Flows only: nothing in the project starts it — no endpoint, schedule, trigger, table, vocabulary, flow or evaluation suite. |

Each item of `relations`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `from` | `string` | yes | The reference of the element the relation starts at. An evaluation suite, which has no element of its own here, is `evalSuite:<id>`. |
| `to` | `string \| null` | yes | The reference of the element the relation ends at; null when the configuration does not resolve it (see `unresolved`). |
| `verb` | `"runs" \| "processes" \| "resolves" \| "invokes" \| "evaluates" \| "scores" \| "creates" \| "reads" \| "updates" \| "deletes" \| "appends" \| "queues" \| "strips" \| "links" \| "unlinks" \| "searches" \| "counts" \| "aggregates" \| "writes" \| "tags" \| "extracts" \| "matches" \| "groups" \| "filters" \| "uses" \| "declares" \| "nests" \| "emits" \| "listens" \| "streams" \| "contains"` | yes | What the relation says `from` does to `to`. |
| `via` | `string \| null` | yes | The reference of the step that carries the relation, when `from` is a flow and a step of it is what acts — an invoke, for one. |
| `through` | `string \| null` | yes | Set when the relation is reached through a sub-flow: the reference of the flow invoked on the way. The relation belongs to that sub-flow, not to the flow that invokes it. |
| `switchedOff` | `boolean` | yes | True when the step, schedule, trigger or evaluation suite behind the relation is switched off. |
| `detail` | `string \| null` | yes | A short fact the verb needs, when it has one: a schedule's cron and time zone, an endpoint's mode (sync, queued, streamed), an evaluation suite's name — or, on a relation to something that no longer exists, the name the configuration still uses for it. |
| `unresolved` | `"missing-element" \| "type-not-stated"` | yes | Why `to` is null: `missing-element` — the configuration names something that no longer exists; `type-not-stated` — the step acts on record ids whose type the configuration does not state. Null when resolved. |

Each item of `calls`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepRef` | `string` | yes | The reference of the step that makes the call. |
| `kind` | `"model" \| "service" \| "mail"` | yes | `model` — it calls a language or embedding model; `service` — it reaches an outside vendor; `mail` — it sends mail. |
| `task` | `string \| null` | yes | Model calls: the task the step names, when it names one. |
| `model` | `string \| null` | yes | Model calls: the model the step pins or configures, when it names one. |
| `vendor` | `string \| null` | yes | Service calls: the vendor the step reaches. |
| `switchedOff` | `boolean` | yes | True when the step that makes the call is switched off, so the call does not happen. |

### `GET /v1/projects/{nodeId}/history`

The applied changes to the project's configuration, newest first, one action per entry (one action may change many rows). For one action's full change list, `GET /v1/projects/{nodeId}/history/{structureVersion}`. A record of what happened, not something to go back to: to keep a flow as it is and restore it later, take a checkpoint (`/v1/flow-checkpoints?flowId=`). For runs and calls, the runs routes.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The next page along `order` — pass back the `nextCursor` you were given. Opaque: read it from a response, never build one. |
| `before` | `string` | no | The previous page along `order` — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many ACTIONS per page, up to 100. Defaults to 25. ⚠️ Actions, not changes — one action can carry hundreds. |
| `actor` | `string` | no | Only actions applied by this principal, matched exactly as recorded — for example `key:key_7fj2q8`. Read it off an action's `actor.raw`. |
| `since` | `string` | no | Only actions applied at or after this instant. |
| `until` | `string` | no | Only actions applied at or before this instant. |
| `order` | `"desc" \| "asc"` | no | Which way the list runs by configuration version: `desc` (the default) is newest first, `asc` oldest first. ⚠️ A cursor is read back only under the order it was issued in — change the order and start from the first page. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `actions` | `object[]` | yes | In `order` by `structureVersion`, whichever direction the page was reached from. |
| `order` | `"desc" \| "asc"` | yes | Which way the actions run by `structureVersion` — the `order` sent, or `desc` (newest first). |
| `total` | `integer` | yes | Actions matching this query's `actor`, `since` and `until`, across every page — not the size of the whole trail, and not moved by the cursor. |
| `paging` | `null` | yes | Always NULL here: this route walks by cursor and offers no page jump. The number of matching actions is `total`. |
| `nextCursor` | `string \| null` | yes | Pass as `after`, with the same `order`, for the next page along `order` — older under `desc`, newer under `asc`. Null on the last page. |
| `prevCursor` | `string \| null` | yes | Pass as `before`, with the same `order`, for the previous page along `order`. Null on the first page. |
| `recordingSince` | `string \| null` | yes | When this deployment began recording configuration changes — the instant the audit migration finished. Changes applied before it were not recorded and never will be. ⛔ A client MUST show this alongside an empty result: without it, 'no changes' reads as 'this project has never changed', which is false for any project older than the trail. ⚠️ NULL means the date itself could not be established, NOT that recording never started — a client says it cannot date the start rather than omitting the caveat. |

Each item of `actions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `structureVersion` | `string` | yes | The project configuration version this action produced, as a decimal string. Compare for equality and display it; do not parse it to a number — it is a 64-bit value and JSON cannot carry one. |
| `at` | `string` | yes | When the action was applied. ⛔ NOT an ordering key — every change of one action shares it. Order on `structureVersion`. |
| `actor` | `object` | yes | Who applied this action — a person, an API key, or the platform. One action has exactly one principal, guaranteed by the write path: `withDesignWrite` takes the actor as a required parameter, so every change of a transaction carries the same value. |
| `changeCount` | `integer` | yes | How many changes this action RECORDED. Excludes anything elided — see `elidedCount`, which is a separate number on purpose. |
| `elidedCount` | `integer \| null` | yes | How many changes were NOT recorded, when the action exceeded the per-transaction detail cap. NULL means the action was recorded in full. ⛔ Never 0: a summary that elided nothing would not exist. A client MUST surface a non-null value — the recorded subset is not the whole action. |
| `resources` | `string[]` | yes | The distinct resources this action touched, for summarising it. ⛔ A summary derived from these may name KINDS and COUNTS and nothing else. No column records what the operator did, so a title like 'restored a checkpoint' asserts more than the trail holds. |
| `preview` | `object[]` | yes | The first few changes, for the row's own line. Bounded by the route; read `changeCount` for the real total and the detail route for all of them. |
| `document` | `object \| null` | yes | Set when this action was ONE project-document apply: what the document's plan counted. NULL for every other action. ⭐ The one place the trail records what the operator DID rather than only which objects moved — so a title may say 'document applied' here, and nowhere else may it name an operation. |

### `GET /v1/projects/{nodeId}/history/{structureVersion}`

One applied action and every row it changed. The list is `GET /v1/projects/{nodeId}/history`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |
| `structureVersion` | `string` | yes | The configuration version the action produced — the `structureVersion` of a row on the list response. Decimal digits only. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The changes AFTER this one — pass back the `nextCursor` you were given. |
| `before` | `string` | no | The changes BEFORE this one — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many CHANGES per page, up to 200. ⚠️ Changes here, where the list route's identically-named parameter counts ACTIONS. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `structureVersion` | `string` | yes | The project configuration version this action produced, as a decimal string. Compare for equality and display it; do not parse it to a number — it is a 64-bit value and JSON cannot carry one. |
| `document` | `object \| null` | yes | Set when this action was ONE project-document apply: what the document's plan counted. NULL for every other action. ⭐ The one place the trail records what the operator DID rather than only which objects moved — so a title may say 'document applied' here, and nowhere else may it name an operation. |
| `at` | `string` | yes | When the action was applied. Shared by every change in it. |
| `actor` | `object` | yes | Who applied this action. Resolved the same way as on the list, and repeated here because a reader who deep-links to one action never saw the list. |
| `changes` | `object[]` | yes | Every recorded change of this action, in a stable total order (the record id, which carries a millisecond timestamp and a counter, so it approximates the order they were written in — the ORDER is a paging guarantee, the approximation is not). ⛔ Every RECORDED one: read `elidedCount` before concluding this is all of them. |
| `changeCount` | `integer` | yes | How many changes this action RECORDED, in total — NOT how many this page returned. ⛔ The two differ whenever `changes` is paged, and the truncation sentence needs the total: `247 recorded, 253 not` is only true of the action, and a client computing it from `changes.length` would report the page's size as the action's. |
| `elidedCount` | `integer \| null` | yes | How many changes this action made that were NOT recorded, or NULL when it was recorded in full. Non-null means `changes` is incomplete by this many BEYOND whatever paging has yet to return — the two shortfalls are different and a client may not add them. |
| `paging` | `null` | yes | Always NULL here. The total is `changes.length` plus what paging has yet to return, and neither this route nor its page offers a jump. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the next changes. Null on the last page. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the previous changes. Null on the first page. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The audit record's own id. |
| `resource` | `string` | yes | The design resource, one of the 23 in use — `vocabularies`, `flows`, `tables` — or, on a record written before a resource was retired, its old name (`flow-test-cases`). A string rather than an enum so a new resource needs no migration, matching the stored column. |
| `section` | `string` | yes | The bootstrap section the resource maps to. |
| `operation` | `"create" \| "update" \| "delete"` | yes | What happened to this object. |
| `targetModel` | `string` | yes | The Prisma model the mutated row belongs to. |
| `targetId` | `string` | yes | The row's primary key. Globally unique, and NOT a substitute for `targetKey` — nor the reverse. |
| `targetKey` | `string \| null` | yes | The object's name in the reader's own words — a vocabulary key, a flow slug. NULL when the model carries no such field, which is a property of the model rather than a gap in the record. |
| `priorState` | `"versioned" \| "not-applicable" \| "created" \| "deleted"` | yes | Why `fromVersion`/`toVersion` are absent when they are. `versioned` — both present. `not-applicable` — this kind carries no version column at all. `created` / `deleted` — one end of the pair does not exist. ⛔ A client MUST render these differently: 'has no version' and 'we failed to capture one' are the same two nulls without this field. |
| `fromVersion` | `integer \| null` | yes | The version this change replaced. NULL unless `priorState` says otherwise. |
| `toVersion` | `integer \| null` | yes | The version this change produced. NULL unless `priorState` says otherwise. |

### `POST /v1/projects/{nodeId}/purge`

Destroy a retired project now instead of waiting for its `purgeAfter`. Send the slug and `confirmForce: true`. Retire first with `DELETE /v1/projects/{nodeId}`; undo a retire with `POST …/restore`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirmSlug` | `string` | yes | The project's own slug, typed back — as when retiring it. |
| `confirmForce` | `true` | yes | A SECOND, separate confirmation, required because this discards the grace period and destroys the project now. Retiring and abandoning the chance to undo it are two decisions, so one typed value does not authorise both. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `enqueued` | `boolean` | yes | Whether a purge is queued for this project as a result of this call. TRUE also covers a purge that was already in flight — the request collapsed into it, and the destruction is happening either way. FALSE means nothing was queued: an earlier attempt for this same retirement finished or failed today, so its job id is spent. The project stays due and the next daily sweep re-enqueues it, but nothing is running now. |
| `nodeId` | `string` | yes | The project's id (its node id). |
| `slug` | `string` | yes | The project's slug. |

### `POST /v1/projects/{nodeId}/restore`

Bring a retired project back before its `purgeAfter`: its node, keys, schedules and sources come back as they were. Retire with `DELETE /v1/projects/{nodeId}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `restored` | `true` | yes | Always `true` — the project is live again. |
| `nodeId` | `string` | yes | The restored project's id (its node id). |
| `slug` | `string` | yes | The restored project's slug. |
| `subdomain` | `string` | yes | The address label the project's own API is served under again. A label, not a host — its URL is `baseUrl` on `GET /v1/projects/{nodeId}`. |

### `GET /v1/projects/{nodeId}/settings`

The project's spend ceilings — per end user, design-time, and the public spend cap that bounds what calls to its public endpoints may cost per UTC day — the warning threshold, its member-wallet settings (whether members hold their own wallets, and the joining and periodic grants), the describer switch, what design-time work has cost in the current window, and what public calls have cost today. Change them with `PATCH` on this path.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `perUserSpendCapCredits` | `integer \| null` | yes | How much ONE end user may spend per `perUserSpendCapPeriod`, in credits. ⚠️ Null means NO ceiling, not 'the default' — unlike most nullable settings. A ceiling of zero is `0`, and the two are opposite outcomes. |
| `perUserSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | yes | The window the per-user ceiling is measured over. Never null — the column defaults to `lifetime`, so there is no unset state to confuse with 'no ceiling'. |
| `designSpendCapCredits` | `integer \| null` | yes | The ceiling on DESIGN-TIME spend — authoring and previewing, as opposed to what your end users cost. Null means no ceiling; `0` blocks all design-time work outright. |
| `publicSpendCapCredits` | `integer \| null` | yes | The ceiling on what calls to the project's PUBLIC endpoints may spend per UTC day, in credits. A public endpoint (`auth: "none"` on its contract) is called by anyone with no credential and paid from the project's wallet; this bounds that. Null means it has not been set, and while it is null no endpoint can be saved public. `0` is a real ceiling: every public call answers 402 `PUBLIC_ENDPOINT_UNAVAILABLE`, which makes it the one switch for all of the project's public traffic. The window is always the UTC day; there is no period to choose. |
| `designSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | yes | The window the design-time ceiling is measured over. Never null — defaults to `day`. |
| `spendCapWarnPercent` | `integer \| null` | yes | Warn the project's operators when design-time spend passes this share of the build ceiling (`designSpendCapCredits`), in whole percent. Null = no warning. It watches the build ceiling only — the per-user ceiling raises no warning. The ceilings refuse at 100% regardless. |
| `memberWallets` | `boolean` | yes | Whether each member of the project holds their own wallet in it. On: a signed-in member's usage is paid from their wallet and refused when it is empty, and the per-user ceiling above is not applied to them. Off: every member's usage is paid from the wallet the project is paid from. |
| `memberJoinGrantCredits` | `integer \| null` | yes | Credits moved into a member's wallet once, when they join, out of the wallet the project is paid from. Null means no joining grant. Paid only to members who join after member wallets were turned on. |
| `memberPeriodicGrantCredits` | `integer \| null` | yes | Credits moved into each member's wallet every `memberGrantPeriod`. Null means no periodic grant. What is left of one period's grant returns to the paying wallet when the next period begins. |
| `memberGrantPeriod` | `"day" \| "week" \| "month"` | yes | How often the periodic grant is made, on UTC calendar boundaries. What is left of one period's grant expires when the next begins. |
| `describerEnabled` | `boolean` | yes | Whether the platform keeps this project's element descriptions current (`GET /v1/descriptions`). Off keeps what exists and adds nothing. The platform pays for descriptions, so this is not a spend setting — it is here because it is a decision about the project. Defaults on. |
| `designSpend` | `object \| null` | yes | What design-time work has already cost in the current `designSpendCapPeriod` window — the figure the design ceiling is enforced against, measured whether or not a ceiling is set. Null when the measurement could not be read this time; the settings themselves are still current. |
| `publicSpend` | `object \| null` | yes | What calls to the project's public endpoints have cost since 00:00 UTC today — the figure `publicSpendCapCredits` is enforced against, measured whether or not a cap is set. Null when the measurement could not be read this time; the settings themselves are still current. |

### `PATCH /v1/projects/{nodeId}/settings`

Change the project's spend ceilings, warning threshold, member-wallet settings or describer switch; absent keys stay as they are. Answers what `GET` on this path answers. `publicSpendCapCredits` must be set before any endpoint can be saved public (`contractConfig.auth` on `/v1/api-endpoints`); clearing it while one is public is 422 with the issue code `PUBLIC_SPEND_CAP_REQUIRED`, and `0` refuses every public call. A change to a member-wallet setting is applied to the members' wallets moments after the save, by a queued run: turning `memberWallets` off returns every member's balance to the wallet the project is paid from and closes the wallets; one member's grant is `POST …/members/{userId}/credits`. The descriptions the describer writes are `GET /v1/descriptions?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `perUserSpendCapCredits` | `integer \| null` | no | Absent leaves it unchanged. ⚠️ Null REMOVES the ceiling entirely (unlimited); `0` blocks every billable action. The two look similar in a form and are opposites. |
| `perUserSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | no | The window a spend ceiling is measured over. The calendar windows clear themselves as the clock moves. ⚠️ `lifetime` never clears — it is a quota rather than a budget, so an active user eventually reaches it and is blocked permanently. |
| `designSpendCapCredits` | `integer \| null` | no | Absent leaves it unchanged. Null removes the design-time ceiling; `0` blocks all design-time work. |
| `designSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | no | The window a spend ceiling is measured over. The calendar windows clear themselves as the clock moves. ⚠️ `lifetime` never clears — it is a quota rather than a budget, so an active user eventually reaches it and is blocked permanently. |
| `publicSpendCapCredits` | `integer \| null` | no | Absent leaves it unchanged. A number sets the most that calls to public endpoints may spend per UTC day; `0` refuses every public call. Null clears it, and is refused with 422 and the issue code `PUBLIC_SPEND_CAP_REQUIRED` while any endpoint of the project is public — make those endpoints private first, or set `0`. |
| `spendCapWarnPercent` | `integer \| null` | no | Absent leaves it unchanged; null turns the warning off. Whole percent of a ceiling, 1–100. |
| `memberWallets` | `boolean` | no | Absent leaves it unchanged. Turning it off returns every member wallet's balance to the wallet the project is paid from and closes the wallets; the two grant settings keep their values. |
| `memberJoinGrantCredits` | `integer \| null` | no | Absent leaves it unchanged; null stops the joining grant. At least 1. |
| `memberPeriodicGrantCredits` | `integer \| null` | no | Absent leaves it unchanged; null stops the periodic grant. At least 1. |
| `memberGrantPeriod` | `"day" \| "week" \| "month"` | no | How often the periodic grant is made, on UTC calendar boundaries. What is left of one period's grant expires when the next begins. |
| `describerEnabled` | `boolean` | no | Absent leaves it unchanged. Turn the platform's describer on or off for this project — what `GET /v1/descriptions` reads. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `perUserSpendCapCredits` | `integer \| null` | yes | How much ONE end user may spend per `perUserSpendCapPeriod`, in credits. ⚠️ Null means NO ceiling, not 'the default' — unlike most nullable settings. A ceiling of zero is `0`, and the two are opposite outcomes. |
| `perUserSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | yes | The window the per-user ceiling is measured over. Never null — the column defaults to `lifetime`, so there is no unset state to confuse with 'no ceiling'. |
| `designSpendCapCredits` | `integer \| null` | yes | The ceiling on DESIGN-TIME spend — authoring and previewing, as opposed to what your end users cost. Null means no ceiling; `0` blocks all design-time work outright. |
| `publicSpendCapCredits` | `integer \| null` | yes | The ceiling on what calls to the project's PUBLIC endpoints may spend per UTC day, in credits. A public endpoint (`auth: "none"` on its contract) is called by anyone with no credential and paid from the project's wallet; this bounds that. Null means it has not been set, and while it is null no endpoint can be saved public. `0` is a real ceiling: every public call answers 402 `PUBLIC_ENDPOINT_UNAVAILABLE`, which makes it the one switch for all of the project's public traffic. The window is always the UTC day; there is no period to choose. |
| `designSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | yes | The window the design-time ceiling is measured over. Never null — defaults to `day`. |
| `spendCapWarnPercent` | `integer \| null` | yes | Warn the project's operators when design-time spend passes this share of the build ceiling (`designSpendCapCredits`), in whole percent. Null = no warning. It watches the build ceiling only — the per-user ceiling raises no warning. The ceilings refuse at 100% regardless. |
| `memberWallets` | `boolean` | yes | Whether each member of the project holds their own wallet in it. On: a signed-in member's usage is paid from their wallet and refused when it is empty, and the per-user ceiling above is not applied to them. Off: every member's usage is paid from the wallet the project is paid from. |
| `memberJoinGrantCredits` | `integer \| null` | yes | Credits moved into a member's wallet once, when they join, out of the wallet the project is paid from. Null means no joining grant. Paid only to members who join after member wallets were turned on. |
| `memberPeriodicGrantCredits` | `integer \| null` | yes | Credits moved into each member's wallet every `memberGrantPeriod`. Null means no periodic grant. What is left of one period's grant returns to the paying wallet when the next period begins. |
| `memberGrantPeriod` | `"day" \| "week" \| "month"` | yes | How often the periodic grant is made, on UTC calendar boundaries. What is left of one period's grant expires when the next begins. |
| `describerEnabled` | `boolean` | yes | Whether the platform keeps this project's element descriptions current (`GET /v1/descriptions`). Off keeps what exists and adds nothing. The platform pays for descriptions, so this is not a spend setting — it is here because it is a decision about the project. Defaults on. |
| `designSpend` | `object \| null` | yes | What design-time work has already cost in the current `designSpendCapPeriod` window — the figure the design ceiling is enforced against, measured whether or not a ceiling is set. Null when the measurement could not be read this time; the settings themselves are still current. |
| `publicSpend` | `object \| null` | yes | What calls to the project's public endpoints have cost since 00:00 UTC today — the figure `publicSpendCapCredits` is enforced against, measured whether or not a cap is set. Null when the measurement could not be read this time; the settings themselves are still current. |

### `GET /v1/projects/address-availability`

Whether a project address (the subdomain label) is free, and a checked alternative when it is not. Omit `project` when creating (`POST /v1/projects`); pass it when renaming (`PUT /v1/projects/{nodeId}/address`), so the project's own address answers available.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `candidate` | `string` | yes | The address label to test, e.g. "harvest". Sent raw — it is normalized (trimmed, lower-cased) server-side, and a malformed value is answered rather than rejected. |
| `project` | `string` | no | The project asking (its id, as `POST /v1/projects` answered it), when there is one. Omit it when creating. Pass it when renaming: the project's own current address then comes back available, and the project is excluded from every conflict lookup so re-claiming a label it just released is not a conflict. Supplying it requires VIEWER on that project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `candidate` | `string` | yes | The normalized label this answer is about — trimmed and lower-cased, so it may differ from what was sent. Key any client-side cache on this, not on the raw input. |
| `available` | `boolean` | yes | True when a project may claim this address. False covers every reason at once — already taken, reserved, or released so recently that routing caches may still point elsewhere. |
| `reason` | `string \| null` | yes | Why it is unavailable, in words safe to show a person. Non-null exactly when `available` is false. It never names another project. |
| `suggestion` | `string \| null` | yes | A free alternative the server actually checked, not a guess — offered for a taken, recently released, reserved or malformed name alike (a reserved `app` gets `app-2`). ADVISORY: true when computed and claimable by someone else a moment later — the create's own conflict response stays the authority. Null when the candidate is available, when no alternative in range is free, when the name contains one of the platform's own brand names (no numbered form of it is allowed), or when the candidate is too malformed to derive an alternative from. |
