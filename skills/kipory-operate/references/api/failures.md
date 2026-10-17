<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Failed runs and the platform's events

What the platform tells a project about its unattended runs. A failure trigger is an ordinary trigger on an event of the `platform` category; the test call proves it before anything fails. The failed-runs list is what a failure summary points at, and the alerts read lists every schedule, trigger, table or endpoint that is failing, quiet, about to be paused or paused.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/failed-runs`](#get-v1-failed-runs) |  |
| `POST` | [`/v1/platform-events/test`](#post-v1-platform-events-test) |  |
| `GET` | [`/v1/projects/{nodeId}/alerts`](#get-v1-projects-nodeid-alerts) |  |

### `GET /v1/failed-runs`

List one project's runs whose latest close is `failed` or `partial` (`?project=<nodeId>`), newest first: scheduled runs, trigger runs, asynchronous endpoint calls and record processing. Each row names the run, what it ran for (`subject`), and how it failed and whose failure it was. Filter by `subjectKind` and `subjectKey`, by failure `class`, by `verdict`, by when the run closed (`from` inclusive, `to` exclusive), by when the platform reported it (`reportedFrom`, `reportedTo`), and by whether a `platform` event started it (`causedByPlatform`). A run the platform is about to start again is not listed, nor is one a person cancelled. A `platform/run.failures` or `run.partial` event carries this address as `failedRunsPath`, filtered to exactly the runs it counted: its subject and verdict, its window by report time, and no run a `platform` event started. Walk with `after`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose failed runs to list. Required. |
| `subjectKind` | `"schedule" \| "trigger" \| "table" \| "endpoint"` | no | Only runs of this kind of subject. |
| `subjectKey` | `string` | no | Only runs of the subject with this key. Read together with `subjectKind`, and ignored without it. |
| `class` | `"logic" \| "definition" \| "limit" \| "vendor" \| "platform-busy" \| "platform-interrupted" \| "platform-fault" \| "cancelled"` | no | Only runs whose failure has this class. |
| `verdict` | `"failed" \| "partial"` | no | `failed`: the run failed and applied nothing. `partial`: it finished and applied its changes, having carried on past a failure it was told to tolerate. |
| `from` | `string` | no | Only runs closed at or after this. An instant, RFC 3339. |
| `to` | `string` | no | Only runs closed BEFORE this: the bound is exclusive. An instant, RFC 3339. |
| `reportedFrom` | `string` | no | Only runs the platform reported at or after this. A run is reported when it closes, or — when its worker was lost — up to a few minutes later; a summary event counts its runs by this time. An instant, RFC 3339. |
| `reportedTo` | `string` | no | Only runs the platform reported BEFORE this: the bound is exclusive. An instant, RFC 3339. |
| `causedByPlatform` | `"true" \| "false"` | no | `false`: leave out the runs a `platform` event started, directly or further up their chain — a failure trigger's own runs, which no summary event counts. `true`: only those. Omitted, both. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | Runs, newest first by `closedAt`, then id. |
| `paging` | `null` | yes | Always null: no page count is given. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `runs`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run. Read it at `GET /v1/runs/{runId}`; its actions at `GET /v1/runs/{runId}/timeline`. |
| `subject` | `object` | yes | What the run ran for. |
| `verdict` | `"failed" \| "partial"` | yes | `failed`: the run failed and applied nothing. `partial`: it finished and applied its changes, having carried on past a failure it was told to tolerate. |
| `closing` | `object` | yes | How the run closed, from its closing record. |
| `closedAt` | `string` | yes | When the run closed for good, RFC 3339. |

### `POST /v1/platform-events/test`

Record one of the platform's own events by hand, to see your failure trigger run before anything fails. `type` is a type of the `platform` category (`run.failed`, `health.paused`, `flow-health.failing`, …), and `subject` names what the type is about, by its key: a schedule, trigger, table or endpoint of the project for a `run.*` or `health.*` type, one of its flows (`kind: "flow"`) for a `flow-health.*` type, whose event then carries that flow's id, key and health path. `mail.failed`, `price.changed` and `member.left` name no subject: leave it out. The event's data is an example of that type with `test: true`; every enabled trigger on the type fires as on a real one, and the flows they start are ordinary, charged runs. Recording the event costs nothing, changes no health and lists no failed run. Answers how many triggers listen: zero means nothing ran. Refused (422) for a type the platform does not have, a subject the project does not have, a subject of the wrong kind for the type, a missing one where the type names one, and one stated for a type that names none.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to record the event in. Required. |
| `type` | `string` | yes | The event type inside the `platform` category, as `GET /v1/event-types` lists it: `run.failed`, `run.failures`, `run.partial`, `health.failing`, `health.recovered`, `health.quiet`, `health.pause-warned`, `health.paused`, `mail.failed`, `price.changed`, `member.left`, `flow-health.failing` or `flow-health.recovered`. |
| `subject` | `object` | no | What the event names, and it must exist in the project. A `run.*` or `health.*` type names a schedule, trigger, table or endpoint; a `flow-health.*` type names a flow (`kind: "flow"`), and the event carries that flow's id, key and health path. `mail.failed` (about a message), `price.changed` (about the project's prices) and `member.left` (about a person) name none: leave it out, and one stated is refused. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventId` | `string` | yes | The recorded event's id; it begins `platform-test:`. |
| `type` | `string` | yes | The event type that was recorded. |
| `listeningTriggers` | `integer` | yes | How many enabled triggers in the project listen to this type. Zero means nothing will run. |

### `GET /v1/projects/{nodeId}/alerts`

What needs attention in one project. `subjects` lists, read live, every schedule, trigger, table or endpoint that is failing, quiet, about to be paused or paused, each with its `health` — and a failing trigger on a `platform` event is marked `failureTrigger: true`, because while it fails the project is not being told about anything else. `alerts` are the platform's durable conditions scoped to this project (a spend cap reached, a wallet that cannot pay); read `degraded`, `evaluatedAt` and `neverEvaluated` before treating an empty `alerts` as healthy. The platform sends no mail about a subject's health: bind a trigger to a `platform` event to be told, and call this to ask. A paused row comes back only with `POST /v1/schedules/{id}/resume` or `POST /v1/triggers/{id}/resume`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Node id of the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `alerts` | `object[]` | yes | The conditions currently firing. ⚠️ AN EMPTY LIST IS NOT 'HEALTHY' ON ITS OWN — check `degraded`, `neverEvaluated` and `evaluatedAt` before reading it that way, or a blind monitor renders as a green one. |
| `evaluatedAt` | `string \| null` | yes | When the last sweep FINISHED. The sweep runs every couple of minutes, so a much older timestamp means it has stopped — not that nothing has happened. |
| `neverEvaluated` | `boolean` | yes | True when no sweep has ever completed: a fresh install, or a worker that has never come up. Nothing here is evidence of health yet. |
| `stale` | `boolean` | yes | True when the last sweep finished more than 15 minutes ago, or none ever has — the point at which the platform's own monitoring treats the sweep as stopped. The list is then an old answer, not a current one: an empty `alerts` alongside this is unknown, not clear. |
| `sources` | `object[]` | yes | How each source fared on the last sweep. |
| `degraded` | `boolean` | yes | True when a source you can see failed to evaluate, so this list is INCOMPLETE. An empty `alerts` alongside this is unknown, not clear. |
| `subjects` | `object[]` | yes | One entry per schedule, trigger, table or endpoint of the project that is failing, quiet, about to be paused or paused — read live, so it is current to this call whatever `evaluatedAt` says. Empty when every one is healthy. |

Each item of `alerts`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fingerprint` | `string` | yes | The condition's stable identity, and the id every mutation takes. It survives restarts and re-fires — two evaluations of one condition are the same alert, and two tenants' occurrences of one condition stay separate. |
| `conditionKey` | `string` | yes | Which condition this is an occurrence of: the `conditionKey` the catalog lists it under. Every alert of one condition shares it — whichever organization it concerns, and for a condition that fires once per subject (such as per provider), whichever subject fired. A condition the catalog no longer declares keeps a key that matches no catalog entry. |
| `severity` | `"warn" \| "critical"` | yes | How serious this condition is. |
| `title` | `string` | yes | A one-line statement of what is wrong. |
| `count` | `integer` | no | How many things the condition counted, when it counts something. Absent for a condition that is simply true or false. |
| `href` | `string \| null` | yes | The page that owns this condition. ⚠️ A path in the Kipory app's routing, or null when no page shows what this condition is about. Carried opaquely — treat it as a hint, and NEVER infer permission from it. |
| `source` | `string` | yes | Which subsystem evaluated this condition. |
| `audience` | `"customer" \| "system"` | yes | Who this KIND of condition is for. Distinct from `scopeNodeId`, which says whose it is — a reader needs both, and neither is an authorization decision on its own. |
| `scopeNodeId` | `string \| null` | yes | Which node this condition concerns, or null when it is installation-wide. |
| `firstSeenAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `lastSeenAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `occurrences` | `integer` | yes | How many sweeps have seen the condition still true since `firstSeenAt`. A proxy for how long it has lasted, NOT a count of distinct events. |
| `acknowledgedAt` | `string \| null` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `acknowledgedBy` | `string \| null` | yes | Who acknowledged it, or null if nobody has. Acknowledging records that someone is on it; it does not silence or resolve the alert. |
| `silencedUntil` | `string \| null` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `silenceId` | `string \| null` | yes | The active silence's id, so it can be lifted without a second call. Null when the alert is not silenced. |
| `inhibitedBy` | `string \| null` | yes | The fingerprint of the alert suppressing this one, when that is why it is suppressed — a root cause hiding its symptoms. Null otherwise. |
| `suppressedBy` | `"inhibited" \| "silenced" \| "acknowledged" \| null` | yes | The ONE reason this alert is not demanding attention, or null when it is. A suppressed alert is still firing — it is hidden, not resolved. |
| `scope` | `object \| null` | yes | The node `scopeNodeId` names, resolved to its name, or null when the condition is installation-wide. |

Each item of `sources`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The source's id. |
| `ok` | `boolean` | yes | False when this source failed to evaluate, which means ITS ALERTS ARE MISSING from the list rather than absent because all is well. |
| `skipped` | `boolean` | yes | True when this source was not evaluated for you at all. Not a failure — it simply does not apply to your audience. |
| `audience` | `"customer" \| "system"` | yes | Who this source reports for. |

Each item of `subjects`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"schedule" \| "trigger" \| "table" \| "endpoint"` | yes | What a run ran for: the `schedule` or `trigger` that fired it, the `endpoint` that was called, or — for a record's processing — the record's `table`. |
| `key` | `string` | yes | The subject's own key. |
| `id` | `string \| null` | yes | The row's id for a schedule or a trigger — what `GET /v1/schedules/{id}` and `POST /v1/schedules/{id}/resume` take. Null for a table or an endpoint, which are read by key. |
| `failureTrigger` | `boolean` | yes | True for a trigger on one of the platform's own events — a failure trigger. When it is the one failing, the project is not being told about its other failures. |
| `health` | `object` | yes | How its recent runs went. Read live; it is not part of the row's configuration and never moves its `version`. |
| `pausedAt` | `string \| null` | yes | When the platform paused it, or null. |
| `pauseReason` | `string \| null` | yes | Why it was paused: `failing` or `mostly-failing`. Null when it is not. |
