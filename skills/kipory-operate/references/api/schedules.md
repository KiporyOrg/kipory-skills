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
| `GET` | [`/v1/schedules/{id}/runs`](#get-v1-schedules-id-runs) |  |

### `GET /v1/schedules`

List one project's schedules (`?project=<nodeId>`), each with the `version` its PATCH takes. `expand=timing` adds when each fires next and the occurrences ahead (`windowHours` sizes the window), `expand=lastRun` how the last run went, `expand=drift` the flow inputs no longer supplied, `expand=flowLabel` the bound flow's name. The same rows, as authored, ride `GET /v1/bootstrap` and the `surfaces.schedules` section of `GET /v1/projects/{nodeId}/document`; run timings and counts are only here.

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

Create a schedule: a flow run on a five-field cron pattern in a timezone, with fixed inputs and optional bounds (`startsAt`, `endsAt`, `maxRuns`). It is created switched on; a pattern and bounds that can never fire are refused (422). With `validateOnly: true` it answers whether the create would be refused and the occurrences it would fire (`derived.upcoming`), writing nothing. Several schedules at once, beside the flows they run: the `surfaces.schedules` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the schedule. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch will not change it, so pick it deliberately. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `label` | `string \| null` | no | Display text, unlike the key changeable later. Omit it or pass null and the schedule has none. |
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
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Switch it with `PATCH /v1/schedules/{id}` `{enabled, version}`: switching on re-arms `nextRunAt` from now, switching off clears it. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow requires (every declared slot not typed `optional`) that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |

### `GET /v1/schedules/{id}`

Read one schedule. `expand` takes the list's keys (`timing`, `lastRun`, `drift`, `flowLabel`); `expand=timing` always answers here, where a list may run out of time. Its runs: `GET /v1/schedules/{id}/runs`. Every schedule at once: `GET /v1/schedules?project=`.

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
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Switch it with `PATCH /v1/schedules/{id}` `{enabled, version}`: switching on re-arms `nextRunAt` from now, switching off clears it. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow requires (every declared slot not typed `optional`) that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
| `flowLabel` | `object \| null` | no | Identity of the bound flow, present only when you pass `expand=flowLabel`. Null when the flow no longer exists. |
| `lastRunStatus` | `"succeeded" \| "failed" \| "running" \| "skipped" \| "blocked"` | no | How the most recent firing went, present only when you pass `expand=lastRun`. Null when it has never fired. |
| `nextRun` | `object \| null` | no | Whether this schedule has another occurrence ahead, judged at the moment of the read from its pattern, timezone and every bound — the judgement the scheduler makes when it advances a fired schedule, and the one enabling it would get. An occurrence already due that the scheduler has not fired yet counts as ahead. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled` otherwise: a disabled schedule fires nothing whatever this says. |
| `upcoming` | `object \| null` | no | The occurrences ahead, walked the way the scheduler advances: an occurrence already due and not yet fired comes first, `startsAt` opens the walk, `endsAt` closes it, and each occurrence spends one of `maxRuns`. Present only when you pass `expand=timing`. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It assumes every occurrence fires — one that is skipped or blocked spends no run, so a schedule near its limit can fire later than this list ends. It also assumes the scheduler is on time: it checks once a minute, and a late check moves the schedule to the first occurrence after that check, so an occurrence listed in between may not fire. A pattern stored with a seconds field lists every instant it names, though the scheduler fires it at most once a check. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |
| `firings` | `object \| null` | no | Every occurrence inside a window that opens at the moment of the read, walked the same way as `upcoming` and with the same assumptions — for laying schedules side by side on one clock. Present only when you pass `expand=timing`; `windowHours` sizes the window. Null when a list read ran out of the time it spends on timing before it reached this schedule: not measured, and no answer about its occurrences — `GET /v1/schedules/{id}?expand=timing` always answers. It does not read `enabled`, except that an occurrence already due is listed only while the schedule is enabled. |

### `PATCH /v1/schedules/{id}`

Change a schedule — its flow and inputs, pattern, timezone, bounds, name, overlap policy — or switch it on or off with `enabled`. Switching on re-arms the next run from now and is refused (422) when the bounds are spent; switching off clears it. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused and the occurrences it would leave (`derived.upcoming`), writing nothing. On a retired project only `{enabled: false, version}` is accepted. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string \| null` | no | New display text. Omit to leave it alone, or pass null to clear it. |
| `flowId` | `string` | no | Bind a different flow. Omit to leave it alone. |
| `inputs` | `object` | no | Replace the fixed inputs entirely — this is not a merge. Omit to leave them alone. |
| `cronPattern` | `string` | no | New cron pattern. Omit to leave it alone. |
| `tz` | `string` | no | New timezone. Omit to leave it alone. |
| `startsAt` | `string \| null` | no | Do not fire before this instant. Pass null to clear the bound. |
| `endsAt` | `string \| null` | no | Do not fire after this instant. Pass null to clear the bound. |
| `maxRuns` | `integer \| null` | no | Stop after this many firings. Pass null for no limit. Counted against `runCount`, which a patch does not reset. |
| `overlapPolicy` | `"skip" \| "allow"` | no | What to do when an occurrence comes due while the previous one is still running. |
| `enabled` | `boolean` | no | Switch the schedule on or off. Omit to leave it alone. Switching on re-arms `nextRunAt` forward from now through the schedule's bounds — after this patch's own timing edits — and is refused with 422 when those bounds are spent (`maxRuns` reached, `endsAt` passed). Switching off clears `nextRunAt` and never judges timing, so a spent schedule can always be stopped. On a retired project, a patch whose only change is `enabled: false` is still accepted; every other patch is refused with 409. |
| `version` | `integer` | yes | The `version` you last read. Required here — a schedule patch is refused with 409 rather than silently overwriting a concurrent edit. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/preview`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the schedule — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | Your identifier for this schedule within the project. Permanent — a patch cannot change it. |
| `label` | `string \| null` | yes | Display text, editable at any time — or null when nobody has labelled this schedule. |
| `flowId` | `string` | yes | The flow this schedule runs. |
| `inputs` | `object` | yes | Fixed inputs handed to the flow on every firing. A schedule has no caller, so these are the only inputs it ever gets. |
| `cronPattern` | `string` | yes | Five-field cron pattern deciding when it fires. |
| `tz` | `string` | yes | IANA timezone the pattern is read in. This is what decides behaviour across daylight-saving changes, so it is not cosmetic. |
| `enabled` | `boolean` | yes | Whether the schedule is currently firing. Switch it with `PATCH /v1/schedules/{id}` `{enabled, version}`: switching on re-arms `nextRunAt` from now, switching off clears it. |
| `startsAt` | `string \| null` | yes | Nothing fires before this instant, or null for no start bound. |
| `endsAt` | `string \| null` | yes | Nothing fires after this instant, or null for no end bound. |
| `maxRuns` | `integer \| null` | yes | Stop after this many firings, or null for no limit. Compared against `runCount`. |
| `overlapPolicy` | `"skip" \| "allow"` | yes | What happens when an occurrence comes due while the previous one is still running. |
| `createdByUserId` | `string \| null` | yes | Who set the schedule up. History only — a schedule is owned by its project and fires as its project, so nothing at fire time reads this. Null for a schedule created by a token, or once that account is gone. |
| `nextRunAt` | `string \| null` | yes | When it next fires, or null when it is disabled, outside its window, or has hit `maxRuns`. |
| `lastRunAt` | `string \| null` | yes | When it last actually fired, or null if it never has. |
| `runCount` | `integer` | yes | How many times it has fired. Counted against `maxRuns`. |
| `version` | `integer` | yes | Increments on every write. Send it back on a patch — switching `enabled` included — to be refused with 409 if someone changed the schedule in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `uncoveredInputSlots` | `string[] \| null` | no | Input slots the bound flow requires (every declared slot not typed `optional`) that this schedule's stored `inputs` do not supply, present only when you pass `expand=drift`. An empty array means it can still fire. **Null means the answer could not be determined — the flow is missing or belongs to another project — and reading that as healthy is the one wrong conclusion this field invites.** |
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

Delete one schedule and its run history; it stops firing at once. Nothing refuses it. With `?validateOnly=true` it answers the verdict, writing nothing. To stop it but keep it: `PATCH /v1/schedules/{id}` with `enabled: false`. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

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

### `GET /v1/schedules/{id}/runs`

One schedule's occurrences, newest first, walked on `after`/`before` — fired, skipped or blocked, and for a fired one its invocation's status, timing, failure and cost. The run it started is `GET /v1/runs/{runId}` via `invocation`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The schedule's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Occurrences, newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: a count is not paid on every page of a growing log, so no page count is given and no `page` jump is offered. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |
