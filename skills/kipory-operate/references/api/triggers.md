<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 5accba538b04 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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
| `POST` | [`/v1/triggers/{id}/disable`](#post-v1-triggers-id-disable) |  |
| `POST` | [`/v1/triggers/{id}/enable`](#post-v1-triggers-id-enable) |  |
| `POST` | [`/v1/triggers/{id}/replay`](#post-v1-triggers-id-replay) |  |
| `GET` | [`/v1/triggers/{id}/runs`](#get-v1-triggers-id-runs) |  |
| `GET` | [`/v1/triggers/{id}/sample`](#get-v1-triggers-id-sample) |  |

### `GET /v1/project-events`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose event log to read. Required. |
| `category` | `string` | no | Only events of this category. |
| `event` | `string` | no | Only this event within the category. Needs `category` too. |
| `limit` | `integer` | no | How many of the most recent events to return, newest first. Defaults to 50. A cap, not a page — the log is reaped after 30 days. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `events` | `object[]` | yes | Newest first. |
| `truncated` | `boolean` | yes | True when more events exist within retention than the limit. |

### `GET /v1/triggers`

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

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the trigger. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `name` | `string \| null` | no | Display name, unlike the key changeable later. Omit it or pass null and the trigger has none. |
| `category` | `string` | yes | The event category to listen to — a registry key. |
| `event` | `string` | yes | The event within that category. Its type must be active, durable and not run-scoped, or the write is refused with 422. |
| `sourceId` | `string` | no | The source to listen to (see `/v1/sources`). When given, `category` must be the provider's category and `event` one of the events it writes, or the write is refused with 422; the trigger then hears that source's events and no other's. Omit for a trigger on an event the project's own flows emit. Permanent. |
| `filter` | `object \| null` | no | A condition over `event` and `data`, or omit / null to react to every event of the type. |
| `flowId` | `string` | yes | The flow to run on each fire. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire. Every declared slot the two reserved slots `event` and `trigger` do not cover must be here — a trigger has no caller to fill gaps. |
| `overlapPolicy` | `"skip" \| "allow"` | no | What to do when an event arrives while the previous run is still in flight. Omitting it means `skip`. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this trigger. |
| `category` | `string` | yes | The event category this trigger listens to — a key in the project's event registry. |
| `event` | `string` | yes | The event within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Change it through the enable and disable endpoints rather than a patch. A trigger enabled later does not catch up on earlier events — replay one by hand. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `GET /v1/triggers/{id}`

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
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this trigger. |
| `category` | `string` | yes | The event category this trigger listens to — a key in the project's event registry. |
| `event` | `string` | yes | The event within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Change it through the enable and disable endpoints rather than a patch. A trigger enabled later does not catch up on earlier events — replay one by hand. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `PATCH /v1/triggers/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string \| null` | no | New display name. Omit to leave it alone, or pass null to clear it. |
| `category` | `string` | no | Listen to a different category. Omit to leave it alone. |
| `event` | `string` | no | Listen to a different event. Omit to leave it alone. |
| `filter` | `object \| null` | no | Replace the filter, or pass null to react to every event. Omit to leave it alone. |
| `flowId` | `string` | no | Bind a different flow. Omit to leave it alone. |
| `inputs` | `object` | no | Replace the fixed inputs entirely — this is not a merge. Omit to leave them alone. |
| `overlapPolicy` | `"skip" \| "allow"` | no | New overlap policy. Omit to leave it alone. |
| `version` | `integer` | yes | The `version` you last read. Required here — a trigger patch is refused with 409 rather than silently overwriting a concurrent edit. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this trigger. |
| `category` | `string` | yes | The event category this trigger listens to — a key in the project's event registry. |
| `event` | `string` | yes | The event within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Change it through the enable and disable endpoints rather than a patch. A trigger enabled later does not catch up on earlier events — replay one by hand. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `DELETE /v1/triggers/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `POST /v1/triggers/{id}/disable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — enabling or disabling is refused with 409 rather than overwriting a concurrent change. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this trigger. |
| `category` | `string` | yes | The event category this trigger listens to — a key in the project's event registry. |
| `event` | `string` | yes | The event within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Change it through the enable and disable endpoints rather than a patch. A trigger enabled later does not catch up on earlier events — replay one by hand. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `POST /v1/triggers/{id}/enable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — enabling or disabling is refused with 409 rather than overwriting a concurrent change. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the trigger — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this trigger within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this trigger. |
| `category` | `string` | yes | The event category this trigger listens to — a key in the project's event registry. |
| `event` | `string` | yes | The event within that category. The type it names must be durable and not run-scoped. |
| `sourceId` | `string \| null` | yes | The source this trigger listens to (see `/v1/sources`), or null for a trigger on an event the project's own flows emit. A sourced trigger hears that source's events and no other's — the match is structural, not a filter clause. Permanent. |
| `filter` | `object \| null` | yes | A condition over the recorded event, or null to react to every one. Evaluated over two slots: `event` (the envelope's own fields) and `data` (its payload). An event the filter rejects is recorded as `filtered` in the runs, never silently dropped. |
| `flowId` | `string` | yes | The flow this trigger runs. |
| `inputs` | `object` | yes | Fixed inputs merged into the flow's root slots on every fire, around the two reserved slots `event` (the envelope) and `trigger` (delivery context). |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an event is recorded while this trigger's previous run is still in flight: `skip` records the event as skipped, `allow` fires regardless. |
| `enabled` | `boolean` | yes | Whether the trigger reacts to new events. Change it through the enable and disable endpoints rather than a patch. A trigger enabled later does not catch up on earlier events — replay one by hand. |
| `createdByUserId` | `string \| null` | yes | Who set the trigger up. History only — a trigger is owned by its project and fires as its project, so nothing at fire time reads this. Null for a trigger created by a token, or once that account is gone. |
| `lastFiredAt` | `string \| null` | yes | When it last started a run, or null if it never has. |
| `lastError` | `string \| null` | yes | The most recent fire-time refusal, in plain words, or null once a later fire succeeded. The trigger carries its failure; the flow never does. |
| `lastErrorAt` | `string \| null` | yes | When `lastError` was recorded, or null. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the trigger in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that neither this trigger's stored `inputs` nor the two reserved slots supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"running" \| "succeeded" \| "failed" \| "skipped" \| "blocked" \| "filtered"` | no | How the most recent event went for this trigger, present only when you pass `expand=lastRun`. Null when no event has reached it yet. |

### `POST /v1/triggers/{id}/replay`

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

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many of the most recent decisions to return, newest first. Defaults to 50. A cap, not a page — there is no cursor. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Newest first. |
| `truncated` | `boolean` | yes | True when more decisions exist than the limit returned. Raise the limit to see further back. |

### `GET /v1/triggers/{id}/sample`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trigger's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `event` | `object \| null` | yes | The newest recorded event this trigger's selector and filter would accept, shaped exactly as the flow's `event` slot receives it — or null when no such event has been recorded yet. Hand it to `POST /v1/flows/{id}/preview` as the `event` input. |
