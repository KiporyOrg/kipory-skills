<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Triggers and the event log

Run a flow every time a matching durable event is recorded. A trigger binds a selector, an optional filter, a flow and its fixed inputs; every decision it takes is a ledger row, any decision can be replayed, and the log itself is readable per project.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/project-events`](#get-v1-project-events) |  |
| `GET` | [`/v1/triggers`](#get-v1-triggers) |  |
| `POST` | [`/v1/triggers`](#post-v1-triggers) |  |
| `GET` | [`/v1/triggers/{id}`](#get-v1-triggers-id) |  |
| `PATCH` | [`/v1/triggers/{id}`](#patch-v1-triggers-id) |  |
| `DELETE` | [`/v1/triggers/{id}`](#delete-v1-triggers-id) |  |
| `POST` | [`/v1/triggers/{id}/replay`](#post-v1-triggers-id-replay) |  |
| `GET` | [`/v1/triggers/{id}/runs`](#get-v1-triggers-id-runs) |  |
| `GET` | [`/v1/triggers/{id}/sample`](#get-v1-triggers-id-sample) |  |

### `GET /v1/project-events`

The project's durable event log — every recorded emission a trigger can react to or replay — newest first by when it was recorded, walked on `after`/`before`; filter by `categoryKey` (+ `eventKey`) or by `sourceId` for one source's deliveries. Kept 30 days. What a trigger did with each event is `GET /v1/triggers/{id}/runs`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose event log to read. Required. |
| `categoryKey` | `string` | no | Key of an event category: only events of it. |
| `eventKey` | `string` | no | Key of an event type: only this event within the category. Needs `categoryKey` too. |
| `sourceId` | `string` | no | Id of the trigger provider (source) whose deliveries to list: only events it wrote. A source this project does not hold matches nothing. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. The log is reaped after 30 days. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `events` | `object[]` | yes | Events, newest first by `recordedAt`, then id. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, so no page count is given and no `page` jump is offered. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

### `GET /v1/triggers`

List one project's triggers (`?project=<nodeId>`), each with the `version` its PATCH takes. `expand=lastRun` adds how the newest event went, `expand=drift` the flow inputs no longer supplied, `expand=flowLabel` the bound flow's name. The same rows, as authored, ride `GET /v1/bootstrap` and the `surfaces.triggers` section of `GET /v1/projects/{nodeId}/document`; the last fire and last error are only here.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose triggers to list. Required. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, lastRun. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `triggers` | `object[]` | yes | The project's triggers, unpaginated. |

### `POST /v1/triggers`

Create a trigger: a flow run on every recorded event of one type (`categoryKey`/`eventKey`) that its `filter` accepts — from a source (`sourceId`, or `newSource` to create one in the same write) or from the project's own flows. It is created switched on. With `validateOnly: true` it answers whether the create would be refused, writing nothing. The events a project has recorded: `GET /v1/project-events?project=`. Several triggers at once: the `surfaces.triggers` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the trigger. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `label` | `string \| null` | no | Display text, unlike the key changeable later. Omit it or pass null and the trigger has none. |
| `categoryKey` | `string` | yes | Key of the event category to listen to, in the registry. |
| `eventKey` | `string` | yes | The event within that category. Its type must be active, durable and not run-scoped, or the write is refused with 422. |
| `sourceId` | `string` | no | The source to listen to (see `/v1/sources`). When given, `categoryKey` must be the provider's category and `eventKey` one of the events it writes, or the write is refused with 422; the trigger then hears that source's events and no other's. Omit for a trigger on an event the project's own flows emit. Permanent. |
| `newSource` | `object` | no | A source this project does not have yet — a channel to start watching — created by THIS write, in the same transaction as the trigger: both land or neither does, so a trigger the platform refuses leaves no source behind. It is judged exactly as `POST /v1/sources` judges a create (the provider's config, a taken key, a channel already watched — point `sourceId` at that one instead), and the trigger is then judged against it as against `sourceId`. `validateOnly: true` judges both halves and keeps neither. Send `newSource` or `sourceId`, never both (422). Permanent, like `sourceId`. |
| `filter` | `object \| null` | no | A condition over `event` and `data`, or omit / null to react to every event of the type. |
| `flowId` | `string` | yes | The flow to run on each fire. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire. Every declared slot the two reserved slots `event` and `trigger` do not cover must be here — a trigger has no caller to fill gaps. |
| `overlapPolicy` | `"skip" \| "allow"` | no | What to do when an event arrives while the previous run is still in flight. Omitting it means the source provider's `overlapDefault` (see `/v1/sources/providers`) for a trigger on a source, and `skip` for a trigger on the project's own events. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this trigger. |
| `categoryKey` | `string` | yes | Key of the event category this trigger listens to, in the project's event registry. |
| `eventKey` | `string` | yes | Key of the event type within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. A stored filter that is no longer a valid condition is returned as stored and matches no event. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Switch it with `PATCH /v1/triggers/{id}` `{enabled, version}`. A trigger switched on later does not catch up on events recorded while it was off, and `POST /v1/triggers/{id}/replay` cannot recover them either — it re-runs only an event this trigger already decided. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow requires (every declared slot not typed `optional`) that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `GET /v1/triggers/{id}`

Read one trigger. `expand` takes the list's keys (`lastRun`, `drift`, `flowLabel`). Its decisions, event by event: `GET /v1/triggers/{id}/runs`. Every trigger at once: `GET /v1/triggers?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, lastRun. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this trigger. |
| `categoryKey` | `string` | yes | Key of the event category this trigger listens to, in the project's event registry. |
| `eventKey` | `string` | yes | Key of the event type within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. A stored filter that is no longer a valid condition is returned as stored and matches no event. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Switch it with `PATCH /v1/triggers/{id}` `{enabled, version}`. A trigger switched on later does not catch up on events recorded while it was off, and `POST /v1/triggers/{id}/replay` cannot recover them either — it re-runs only an event this trigger already decided. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow requires (every declared slot not typed `optional`) that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `PATCH /v1/triggers/{id}`

Change a trigger — the event it listens to, its filter, flow and inputs, name, overlap policy — or switch it on or off with `enabled`. Switching on re-checks the event type and is refused (422) when it was retired or made ephemeral; a trigger switched on does not catch up on events recorded while it was off, and those cannot be replayed either (`POST /v1/triggers/{id}/replay` re-runs only an event this trigger already decided). Its source is permanent. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. On a retired project only `{enabled: false, version}` is accepted. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string \| null` | no | New display text. Omit to leave it alone, or pass null to clear it. |
| `categoryKey` | `string` | no | Key of a different category to listen to. Omit to leave it alone. |
| `eventKey` | `string` | no | Key of a different event type to listen to. Omit to leave it alone. |
| `filter` | `object \| null` | no | Replace the filter, or pass null to react to every event. Omit to leave it alone. |
| `flowId` | `string` | no | Bind a different flow. Omit to leave it alone. |
| `inputs` | `object` | no | Replace the fixed inputs entirely — this is not a merge. Omit to leave them alone. |
| `overlapPolicy` | `"skip" \| "allow"` | no | New overlap policy. Omit to leave it alone. |
| `enabled` | `boolean` | no | Switch the trigger on or off. Omit to leave it alone. Switching on re-checks the event it listens to and is refused with 422 when that type has been retired or made ephemeral since — a trigger that could never fire is not switched on. Switching off asks nothing. A trigger switched on does not catch up on events recorded while it was off. On a retired project, a patch whose only change is `enabled: false` is still accepted; every other patch is refused with 409. |
| `version` | `integer` | yes | The `version` you last read. Required here — a trigger patch is refused with 409 rather than silently overwriting a concurrent edit. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored trigger and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this trigger. |
| `categoryKey` | `string` | yes | Key of the event category this trigger listens to, in the project's event registry. |
| `eventKey` | `string` | yes | Key of the event type within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. A stored filter that is no longer a valid condition is returned as stored and matches no event. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Switch it with `PATCH /v1/triggers/{id}` `{enabled, version}`. A trigger switched on later does not catch up on events recorded while it was off, and `POST /v1/triggers/{id}/replay` cannot recover them either — it re-runs only an event this trigger already decided. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow requires (every declared slot not typed `optional`) that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `DELETE /v1/triggers/{id}`

Delete one trigger and its decision history; it stops reacting at once. Nothing refuses it. With `?validateOnly=true` it answers the verdict, writing nothing. To stop it but keep it: `PATCH /v1/triggers/{id}` with `enabled: false`. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

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

### `POST /v1/triggers/{id}/replay`

Re-run this trigger's decision about one event it already decided (`eventId`, from `GET /v1/triggers/{id}/runs`) as a new attempt — filter, overlap and admission judged as on a live fire; the original decision is kept. Answers 202 once queued. Refused (422) for an event the trigger never decided, a trigger switched off, or a selector that no longer resolves: replay is no backfill. A new event runs it by itself; to try the flow without firing anything, feed `GET /v1/triggers/{id}/sample` to `POST /v1/flows/{id}/preview`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventId` | `string` | yes | The recorded event to run this trigger against again. It must be one this trigger has already decided — the replay re-runs that decision as a new attempt, leaving the original row untouched. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `accepted` | `true` | yes | The replay is queued. Its decision lands in the runs list as a new attempt with `replayOf` set. |
| `replayOf` | `string` | yes | The earlier decision this replay re-runs. |

### `GET /v1/triggers/{id}/runs`

One trigger's decisions, newest first, walked on `after`/`before` — fired, skipped, blocked or filtered, per event, with the invocation a fire started. The events themselves are `GET /v1/project-events`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Decisions, newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, so no page count is given and no `page` jump is offered. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

### `GET /v1/triggers/{id}/sample`

The newest recorded event this trigger's selector and filter would accept, shaped exactly as the flow's `event` slot receives it — the input to hand `POST /v1/flows/{id}/preview` to try the flow without firing. Null when none is among the newest events of the type scanned. Nothing runs. To re-run a real decision instead: `POST /v1/triggers/{id}/replay`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `event` | `object \| null` | yes | The newest recorded event this trigger's selector and filter would accept, shaped exactly as the flow's `event` slot receives it — or null when no such event has been recorded yet. Hand it to `POST /v1/flows/{id}/preview` as the `event` input. |
