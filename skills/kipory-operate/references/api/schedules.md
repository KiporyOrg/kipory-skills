<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 87ba7606f60b · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Schedules

Run a flow on a cron in a timezone. Enable recomputes the next run from now; the run history carries the occurrence, its outcome, and the failing step.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/schedules`](#get-v1-schedules) |  |
| `POST` | [`/v1/schedules`](#post-v1-schedules) |  |
| `GET` | [`/v1/schedules/{id}`](#get-v1-schedules-id) |  |
| `PATCH` | [`/v1/schedules/{id}`](#patch-v1-schedules-id) |  |
| `DELETE` | [`/v1/schedules/{id}`](#delete-v1-schedules-id) |  |
| `POST` | [`/v1/schedules/{id}/disable`](#post-v1-schedules-id-disable) |  |
| `POST` | [`/v1/schedules/{id}/enable`](#post-v1-schedules-id-enable) |  |
| `GET` | [`/v1/schedules/{id}/runs`](#get-v1-schedules-id-runs) |  |

### `GET /v1/schedules`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose schedules to list. Required. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, lastRun. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schedules` | `object[]` | yes | The project's schedules, unpaginated. |

### `POST /v1/schedules`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the schedule. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |
| `name` | `string \| null` | no | Display name, unlike the key changeable later. Omit it or pass null and the schedule has none. |
| `flowId` | `string` | yes | The flow to run on each firing. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow every time. A schedule has no caller, so whatever the flow needs must be here. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in — this decides what happens across daylight-saving changes. |
| `startsAt` | `string \| null` | no | Do not fire before this instant. Pass null to clear the bound. |
| `endsAt` | `string \| null` | no | Do not fire after this instant. Pass null to clear the bound. |
| `maxRuns` | `integer \| null` | no | Stop after this many firings. Pass null for no limit. Counted against `runCount`, which a patch does not reset. |
| `overlapPolicy` | `"skip" \| "allow"` | no | What to do when an occurrence comes due while the previous one is still running. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the schedule — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Change it through the enable and disable endpoints rather than a patch. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |

### `GET /v1/schedules/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, lastRun. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the schedule — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Change it through the enable and disable endpoints rather than a patch. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |

### `PATCH /v1/schedules/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string \| null` | no | New display name. Omit to leave it alone, or pass null to clear it. |
| `flowId` | `string` | no | Bind a different flow. Omit to leave it alone. |
| `inputs` | `object` | no | Replace the fixed inputs entirely — this is not a merge. Omit to leave them alone. |
| `cronPattern` | `string` | no | New cron pattern. Omit to leave it alone. |
| `tz` | `string` | no | New timezone. Omit to leave it alone. |
| `startsAt` | `string \| null` | no | Do not fire before this instant. Pass null to clear the bound. |
| `endsAt` | `string \| null` | no | Do not fire after this instant. Pass null to clear the bound. |
| `maxRuns` | `integer \| null` | no | Stop after this many firings. Pass null for no limit. Counted against `runCount`, which a patch does not reset. |
| `overlapPolicy` | `"skip" \| "allow"` | no | What to do when an occurrence comes due while the previous one is still running. |
| `version` | `integer` | yes | The `version` you last read. Required here — a schedule patch is refused with 409 rather than silently overwriting a concurrent edit. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the schedule — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Change it through the enable and disable endpoints rather than a patch. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |

### `DELETE /v1/schedules/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `POST /v1/schedules/{id}/disable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — enabling or disabling is refused with 409 rather than overwriting a concurrent change. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the schedule — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Change it through the enable and disable endpoints rather than a patch. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |

### `POST /v1/schedules/{id}/enable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — enabling or disabling is refused with 409 rather than overwriting a concurrent change. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the schedule — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch cannot change it. |
| `name` | `string \| null` | yes | Display name, editable at any time — or null when nobody has named this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Change it through the enable and disable endpoints rather than a patch. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch, enable or disable to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow declares that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |

### `GET /v1/schedules/{id}/runs`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | How many recent occurrences to return, newest first. Up to 200. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Recent occurrences, newest first. |
| `truncated` | `boolean` | yes | True when older occurrences exist beyond this window. STATED rather than left to be inferred: a window that came back FULL is not evidence of anything, and there is no cursor here to ask for the rest — `limit` is a ceiling, not a page. |
