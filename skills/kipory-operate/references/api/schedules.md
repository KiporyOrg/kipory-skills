<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

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
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, lastRun, timing. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |
| `windowHours` | `integer` | no | How many hours ahead `firings` looks, from the moment of the read. Read only with `expand=timing`. Defaults to 24; at most 48. |

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
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the body was coherent enough to walk it, which is not the same as `ok` — a draft that will never fire still walks. |

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
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |

### `GET /v1/schedules/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: drift, flowLabel, lastRun, timing. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |
| `windowHours` | `integer` | no | How many hours ahead `firings` looks, from the moment of the read. Read only with `expand=timing`. Defaults to 24; at most 48. |

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
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |

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
| `version` | `integer` | yes | The `version` you last read. Required here — a schedule patch is refused with 409 rather than silently overwriting a concurrent edit. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

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
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the body was coherent enough to walk it, which is not the same as `ok` — a draft that will never fire still walks. |

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
| `version` | `integer` | yes | The `version` you last read. Required — enabling or disabling is refused with 409 rather than overwriting a concurrent change. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |

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
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |

### `POST /v1/schedules/{id}/enable`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The `version` you last read. Required — enabling or disabling is refused with 409 rather than overwriting a concurrent change. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |

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
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |

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
