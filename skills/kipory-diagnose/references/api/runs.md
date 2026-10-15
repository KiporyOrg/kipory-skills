<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Runs

One id space for every run — an endpoint invocation, a record-processing attempt, a bare request. The timeline is never sampled; the change set is what the run wrote.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/activity/stream`](#get-v1-activity-stream) |  |
| `GET` | [`/v1/runs`](#get-v1-runs) |  |
| `GET` | [`/v1/runs/{runId}`](#get-v1-runs-runid) |  |
| `GET` | [`/v1/runs/{runId}/change-set`](#get-v1-runs-runid-change-set) |  |
| `GET` | [`/v1/runs/{runId}/flow-snapshots`](#get-v1-runs-runid-flow-snapshots) |  |
| `POST` | [`/v1/runs/{runId}/retries`](#post-v1-runs-runid-retries) |  |
| `GET` | [`/v1/runs/{runId}/timeline`](#get-v1-runs-runid-timeline) |  |
| `GET` | [`/v1/runs/{runId}/timeline/stream`](#get-v1-runs-runid-timeline-stream) |  |
| `GET` | [`/v1/runs/{runId}/trace`](#get-v1-runs-runid-trace) |  |

### `GET /v1/activity/stream`

Server-Sent Events. Emits `open` with the project's current activity counter, `changed` when that counter advances, and `close` with a reason before closing. Frames name which page-questions moved — `eval-runs`, `flow-runs`, `schedule-runs`, `endpoint-calls`, `record-ingestion` — and carry no run, suite or record ids. Answer a frame by re-reading whatever you are showing.

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `open`, `changed`, `close`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project's node id — the same value `GET /v1/bootstrap` returns as `project.id`. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"open"` | yes | Always `open` — the first frame on every connection. ⚠️ ACT ON IT, not only on `changed`: runs start and finish while you are disconnected, and every deploy closes every connection. |
| `project` | `string` | yes | The project's NODE id — what you passed as `?project=`. Not the project's own id, which is a different value. |
| `version` | `string` | yes | The activity counter as it stands right now. Compare it with the one you hold to decide whether anything happened while you were away. |
| `sections` | `string[]` | yes | Which page-questions moved — `eval-runs`, `flow-runs`, `schedule-runs`, `endpoint-calls`, `record-ingestion`. Refetch only what you are showing. Treat an unrecognised word as a signal to refetch nothing, not as an error. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter. |

### `GET /v1/runs`

One project's runs, in the order they started, walked on `after`/`before`; filter by `flowKey` (a sub-flow's runs included), `record` and a `window`. Every run, with no values: what started it, how it closed, its verdict. One run is `GET /v1/runs/{runId}`; its timeline `…/timeline`; the values that flowed (sampled, 7 days) `…/trace`; what it wrote `…/change-set`; what it cost `…/spend`. A flow's sampled traces are `GET /v1/flows/{id}/traces`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project NODE whose runs to list (its node id). |
| `after` | `string` | no | Read the next page along `order` — pass the `nextCursor` you were given. Opaque: read it from a response, never build one. ⛔ A cursor carries the `order` it was minted under, and one that is malformed or replayed under the other `order` is refused (400). |
| `before` | `string` | no | Read the previous page along `order` — pass the `prevCursor` you were given. ⛔ NOT VALID WITH `after`: a request carrying both is answered 400. |
| `limit` | `integer` | no | Rows per page. Defaults to 50, capped at 100. |
| `flowKey` | `string` | no | Only runs that ran the flow with this key — the flow's address, the same one `/{project}/flows/{key}` takes: runs whose own flow it is and runs that called it as a sub-flow, at any depth and on any attempt, and started at least one of its actions. A run is listed once, ranged by when it started; one that only called this flow is placed where it first called it. A key the project does not have is a 404, never an empty page. ⚠️ A run whose flow was since deleted matches nothing here. Filters inside the same ordered walk the page uses; it does not change the cursor. |
| `record` | `string` | no | Only the runs that processed this record (`source.kind: record`), its latest 500. A record this project does not hold, or one since deleted, lists nothing. Not valid with `tally` or `starters` (400). |
| `window` | `"24h" \| "7d" \| "30d"` | no | Narrow to runs STARTED in this window — the same values the calls, ingestion and usage surfaces take. ⚠️ IT FILTERS, IT DOES NOT ORDER: the page is still walked by `seq`. Counted in whole slices, as usage counts it: `24h` from the top of the hour 23 hours before the current one, `7d` and `30d` from 00:00 UTC that many days back counting today. ⛔ NOT VALID WITH `since` or `until` (400). |
| `since` | `string` | no | Only runs STARTED at or after this instant — the explicit form of `window`, for a range no preset names. Filters without changing the cursor. |
| `until` | `string` | no | Only runs started STRICTLY BEFORE this instant. Omit it for up to now. Refused (400) at or before `since`: that range is empty by construction. |
| `tally` | `"hour" \| "day"` | no | Also answer how many runs STARTED in each hour or day of the range, as `started`. ⛔ NEEDS A LOWER BOUND (`window` or `since`): refused (400) without one. Counted on the same instant and under the same `flowKey` as the list, but before `outcome` and `source`: the slices sum to every run in the range, which is `total` only when neither is sent. Not moved by the cursor. |
| `starters` | `"1"` | no | Also answer how many runs each starter began in the range, as `starters`: one row per schedule, trigger and endpoint, one for all records together and one for all eval cases together, each with its runs, how many failed and when it last began one. It is how one endpoint's calls are counted. ⛔ NEEDS A LOWER BOUND (`window` or `since`), as `tally` does. Counted under the same range and `flowKey` as the list, before `outcome` and `source`. Not moved by the cursor. |
| `outcome` | `"running" \| "failed" \| "partial" \| "warned" \| "succeeded" \| "other"` | no | Only runs that ended this way. ⛔ NEEDS A LOWER BOUND (`window` or `since`), as `tally` does: how a run ended is on its closing record, so the range is read whole and the matches paged. A range holding too many runs to read is refused (400): narrow it. Pages with the same cursors as the unfiltered list. |
| `source` | `"schedule" \| "trigger" \| "endpoint" \| "record" \| "request" \| "public" \| "preview" \| "eval" \| "unknown"` | no | Only runs this kind of starter began, as each row's `source.kind` says. ⛔ NEEDS A LOWER BOUND, and is refused (400) over too many runs, as `outcome` is. |
| `outcomes` | `"1"` | no | Also answer how many runs in the range ended each way, as `outcomes`. ⛔ NEEDS A LOWER BOUND. Counted under `flowKey` and `source` but not `outcome`, so each count says what picking that outcome would list. Not moved by the cursor. |
| `order` | `"desc" \| "asc"` | no | Which way the list runs by start (insertion `seq`): `desc` (the default) is newest first, `asc` oldest first. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | The page, in `order` by `seq`. ⛔ Ordered by insertion, not by start time — see `startedAt`. |
| `order` | `"desc" \| "asc"` | yes | Which way the runs run by `seq` — the `order` sent, or `desc` (newest first). |
| `total` | `integer` | yes | Runs matching this query's `flow` and time range, across every page — not moved by the cursor. Bounded by the run log's retention. |
| `paging` | `null` | yes | Always `null`: this route pages by cursor alone and offers no page jump — `total` answers how many runs match. Not a missing field — the route's answer. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the next page along `order`. `null` means this was the last page. Independent of anything a row says about itself. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the previous page along `order`. `null` on page one. |
| `since` | `string \| null` | yes | The lower bound the list was read from — the instant `window` resolved to, or the `since` sent — or `null` when neither was asked. |
| `until` | `string \| null` | yes | The `until` sent, or `null` for up to now. |
| `started` | `object[] \| null` | yes | Runs started per slice of the range, oldest first, when `tally` was sent, counting every run in the range before `outcome` and `source`. Every slice is PRESENT, a quiet one with zero. `null` when `tally` was not sent — never an empty list for a range that was not counted. |
| `starters` | `object[] \| null` | yes | Runs by what started them over the range, most runs first, when `starters=1` was sent, before `outcome` and `source`. A call to an endpoint is `request` (it answered in the same request), `endpoint` (it answers later) or `public` (no credential), each with the endpoint's key as `targetId`: sum the three for one endpoint's calls. Runs that processed a record are ONE row, `record` with `targetId: null`: which record is on the list's own rows; eval cases likewise, `eval` with `targetId: null`. Under `flowKey`, a failed run that only called the flow counts as failed when one of the flow's own actions failed in it. A starter that began no run in the range has NO row. `null` when `starters` was not sent, or when the count did not finish within its time budget — never an empty list for a range not counted. |
| `outcomes` | `object \| null` | yes | Runs in the range by how they ended (see `outcome`), when `outcomes=1` was sent. `null` when it was not sent, or when the range holds too many runs to read. |

Each item of `runs`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. The same id space every other `/v1/runs/{runId}/…` route takes. |
| `seq` | `string` | yes | The opening frame's sequence, and this row's paging cursor — on a `flowKey` list, for a run that only called the flow, the sequence of its first call instead. A STRING because it is a 64-bit key and JSON numbers are not. |
| `startedAt` | `string` | yes | When the opening frame was WRITTEN. ⚠️ Not exactly when the run started: insertion order and start order differ by up to one batch. The list is ordered by `seq`; sorting these timestamps client-side would reorder runs against the cursor that pages them. |
| `attempt` | `integer` | yes | The attempt of the opening record this row is built from: 1, the run's first. A run the platform started again is still one row; `attempts` says how many times it ran. |
| `attempts` | `integer` | yes | How many times this run was attempted — a COUNT, never an attempt NUMBER. More than 1 when the platform started the run again after one of its own failures; `closing.attempt` is the attempt that ended it. |
| `flowId` | `string \| null` | yes | The root flow, where named. |
| `flow` | `object \| null` | yes | The named flow as it stands NOW — a live read, not what the run saw. ⚠️ A flow relabelled since the run reports its NEW label here; `GET /v1/runs/{runId}/flow-snapshots` is the surface that answers what the graph looked like when it ran. ⛔ `null` means the flow is GONE, never that the run named none — `flowId` beside it is what separates the two. |
| `trigger` | `object \| null` | yes | What caused a run, in the stored vocabulary. |
| `source` | `object` | yes | What started a run, translated from the stored `trigger`. |
| `mode` | `string \| null` | yes | `full` \| `from_cache`, where the surface distinguishes them. |
| `declaredActions` | `integer \| null` | yes | How many ENABLED actions the root flow declared — the `y` of a run's `x / y`. ⛔ A FLOOR, NOT A TOTAL: a fan-out runs one action PER BRANCH and sub-flows are not counted, so `actionsStarted` can exceed it and a reader must degrade to a bare count where it does. `null` on every run that started before the field existed. |
| `actionsStarted` | `integer` | yes | The `x`: how many actions this run has been observed to START. Counted from the log, so it is what HAPPENED — never a plan. |
| `lifecycle` | `"in-flight" \| "settled" \| "unknown"` | yes | Whether the run is still going. ⛔ Read it here, not from the timeline: a run with no closing frame may be in flight, dead or reaped. A synchronous call or a preview is `settled` once it has a closing frame (`closing` non-null) and `unknown` until then. ⚠️ `unknown` is ordinary rather than an error; a lifecycle state the platform has grown but this reader has not been taught resolves to it as well. It means `no outcome recorded`, never `finished`. |
| `closing` | `object \| null` | yes | How a run ended, where that has been observed. |
| `waiting` | `object \| null` | yes | Set while the platform waits to start the run again after one of its own failures. Such a run is `in-flight` and has no `closing`: the attempt that failed was not the run's end. Null otherwise. |

Each item of `started`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The slice's first instant: the top of a UTC hour, or 00:00 UTC. |
| `runs` | `integer` | yes | Runs that started in this slice. |

Each item of `starters`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `source` | `object` | yes | What started a run, translated from the stored `trigger`. |
| `runs` | `integer` | yes | Runs this starter began in the range. A run retried under one run id is one run. |
| `failedRuns` | `integer` | yes | Of those, the runs that finished and failed. A run still going or aborted is in `runs` and not here. |
| `lastStartedAt` | `string` | yes | When its newest run in the range began. |

### `GET /v1/runs/{runId}`

Which run this is — the project it belongs to (`project`, its node id), the flow it ran, how it was triggered, how it closed, and its retry attempts. Each sibling answers one aspect: `…/timeline` (what executed, no values), `…/trace` (the values, when sampled), `…/change-set` (what it wrote), `…/flow-snapshots` (the flow as it ran), `…/spend` (what it cost). `failedInputs` is what each failed action of a record run received, kept with the run's attempt whatever the sampling. `messages` counts the messages the run committed to send and how many of them were refused, failed or bounced; a message's delivery never changes how the run closed. List them at `GET /v1/mail-messages?project=&run=`. 404 for an id you cannot see.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run to describe. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string \| null` | yes | The project the run belongs to, as its node id. `null` when the project could not be resolved. |
| `run` | `object` | yes | The run, in the listing's own row shape, built from its EARLIEST opening frame. ⚠️ `seq` is still its paging cursor in the listing, and is published here so a caller can open the listing at this run rather than at the top. |
| `messages` | `object` | yes | The run's messages, counted. List them at `GET /v1/mail-messages?project=&run=`. |
| `adjacent` | `object` | yes | The runs of the same root flow either side of this one, in the listing's order. Both `null` on a run that names no flow. |
| `failedInputs` | `object[]` | yes | What each failed action of a record run received, exactly as it ran — kept with the run's attempt whatever the sampling, unlike `…/trace`; an earlier attempt of a retried run ages out. Empty for a request or scheduled run, and for an action that failed before its function was called. |

Each item of `failedInputs`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `actionId` | `string` | yes | The action that failed. |
| `branchId` | `string \| null` | yes | The fan-out branch it failed in; `null` outside one. |
| `values` | `object` | yes | Each output name the action read → the value it received. Long values are cut and secret-named fields read `[redacted]`; `__omitted` counts fields dropped for size. |

### `GET /v1/runs/{runId}/change-set`

What a run CHANGED — every write it staged and how each resolved (applied, rejected, discarded, captured), never the values written. An action that wrote nothing is invisible here; read `GET /v1/runs/{runId}/timeline` for it.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose recorded changes to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run this set belongs to. Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. |
| `state` | `"captured" \| "applied" \| "rejected" \| "discarded"` | yes | What became of the run's staged changes. `captured` — the writes went straight to the database and the set only recorded them (the pass-through mode; only an older set reads `captured`); `applied` — the set was applied whole, inside one transaction; `rejected` — a precondition failed or the transaction was refused, and NOTHING was written; `discarded` — the run failed, so the set was dropped unapplied. |
| `effects` | `object[]` | yes | Every change the run staged, in `seq` order. |
| `bound` | `object` | yes | The run's effect cap and its usage. Exceeding the cap rejects the whole set rather than truncating it. |
| `rejection` | `object` | no | Present only when the change set was rejected. |
| `createdAt` | `string` | yes | When the set was resolved. |

Each item of `effects`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `integer` | yes | Position within the change set, and the apply order. NOT an array index — a discarded fan-out branch leaves gaps. |
| `kind` | `string` | yes | What the effect does — `record.update`, `record.terms.set`, `event.publish`, and so on. |
| `tier` | `string` | yes | `transactional` for effects the database can roll back, `post-commit` for the ones it cannot (vectors, queue jobs, published events). |
| `target` | `object` | yes | What the effect acts on. Identifiers and configuration keys ONLY — never record contents. |
| `actionId` | `string` | yes | The action that produced the effect. |
| `branchId` | `string \| null` | yes | The fan-out branch, or null at the trunk. |

### `GET /v1/runs/{runId}/flow-snapshots`

What the flows a run executed LOOKED LIKE when it ran them — each action's function, configuration and prompt, by content digest — even after the flow was edited. The current flow is `GET /v1/flows/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose executed flow bodies to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these snapshots belong to. The same heterogeneous id space `GET /v1/runs/{runId}/timeline` and `/change-set` take — a record attempt id, a flow run's request id, or an endpoint invocation id. |
| `snapshots` | `object[]` | yes | One entry per flow the run loaded and stored, ordered by `flowId`. ⚠️ May be SHORTER than the run's `flowVersions` map, and the gap is meaningful: a system flow contributes a digest and no body, and a snapshot reaped past its window leaves the same shape. `missing` lists the difference. At most 200 flows are resolved per response; a larger map is cut there, and the rest are neither here nor in `missing`. |
| `missing` | `string[]` | yes | Flow ids the run loaded that this response carries no body for: a platform-owned flow (its body is never stored here), a snapshot reaped past its window, a best-effort snapshot write that was dropped, or a stored body that no longer parses. Every run path's log names only the flows the run loaded — a sub-flow behind an action that did not fire is in neither list. One exception, until it ages out of run history: an older record run's log named every flow its actions could invoke, so it can list here a sub-flow it never executed. ⛔ NOT an error and NOT an empty graph: a reader that silently drew only `snapshots` would report a run as having executed fewer flows than it did. |

Each item of `snapshots`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this snapshot is of. A SOFT reference: a snapshot outlives the flow it describes, so this id may name a flow that no longer exists. |
| `digest` | `string` | yes | The content address — a digest over each action's `(id, version, enabled)` and the flow's own signature (`inputSlots`, `outputSlots`, `outputBinding`). An action's `version` moves on every write, so an edit to any of them is a new digest. Opaque: compare it, never parse it. ⭐ The same value `run-started.flowVersions` and `run-finished.flowVersions` publish. |
| `capturedAt` | `string` | yes | When this graph version was FIRST captured — NOT when the run being read executed it. ⚠️ A snapshot is shared by every run that used the same graph, so this is usually older than the run, and a reader must not present it as the run's own timestamp. |
| `label` | `string` | yes | The flow's display text as it was at capture. |
| `key` | `string` | yes | The flow's key as it was at capture. |
| `actions` | `object[]` | yes | Every action in the flow, by value, in capture order. ⛔ This is the CONFIGURATION that ran — function keys, function config, prompts, schema refs — and never anything the run PROCESSED. A caller wanting values reads the flow trace. |

### `POST /v1/runs/{runId}/retries`

Run an endpoint invocation again, as a NEW run with the same endpoint and inputs, owned by the caller; answers 202 with the new `runId`. ADMIN. 409 for a run that is not an endpoint invocation (re-process a record instead) or one still going.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The endpoint run to run again. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The NEW run's id — an invocation id, so `GET /v1/runs/{runId}` and its siblings answer for it once its opening frame is written. |

### `GET /v1/runs/{runId}/timeline`

A run's execution record — one row per run and action event (`run-started`, `action-applied`, `action-failed`…), in order, walked on `after`/`before` or `page`, with no slot values. Follow it live with `GET /v1/runs/{runId}/timeline/stream`; the values that flowed are `GET /v1/runs/{runId}/trace`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose timeline to read. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page LATER in the run than this action — pass back the `nextCursor` you were given. An unparseable cursor is treated as absent and returns the first page. |
| `before` | `string` | no | The page EARLIER in the run than this action — pass back the `prevCursor` you were given. Refused together with `after`. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an offset: only a live run's pages can shift. Past the last page it CLAMPS. Refused together with a cursor. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these rows belong to. Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. The same id space `GET /v1/runs/{runId}/change-set` takes. |
| `timeline` | `object[]` | yes | The run's timeline, in `seq` order. |
| `truncated` | `boolean` | yes | True when the RUN exceeded the per-run action cap, so events exist that were never recorded at all — the timeline is INCOMPLETE rather than short. ⛔ NOT a paging flag: it answers for the whole run and reads the same on every page. Whether more pages exist is `nextCursor`, and the two are independent. |
| `paging` | `object` | yes | Where this page sits in the recorded log: its size, its 1-based index, how many pages there are and how many rows were recorded. ⛔ `total` counts RECORDED rows — a run that outran the writer's cap has more that were never written, which is what `truncated` says. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page LATER in the run. NULL means this was the last page. A resume can neither skip nor repeat a row. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page EARLIER in the run. NULL means this is the first page, also on a page reached by a `page` jump. |

Each item of `timeline`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `string` | yes | Total order within the run, as a STRING — the column is a 64-bit sequence and JSON numbers lose precision above 2^53. Sort on it; do not do arithmetic with it. |
| `kind` | `"run-started" \| "run-finished" \| "run-aborted" \| "action-started" \| "action-applied" \| "action-no-op" \| "action-skipped" \| "action-not-reached" \| "action-failed" \| "action-warned" \| "cache-hit" \| "cache-miss" \| "log-truncated"` | yes | What this row records. Run-level: `run-started` (opens before the first action, so a run that crashes immediately still has a row), `run-finished`, `run-aborted` (ended from OUTSIDE — a deadline, a disconnected client, the worker shutting down under it, the stuck-records watchdog, or recovery from a crashed worker — which is NOT a failure of the flow). Action-level: `action-started`, then one of `action-applied`, `action-no-op`, `action-skipped` (a gate or projection miss stopped it, or a record retry skipped an action an earlier attempt applied), `action-not-reached` (its enclosing branch never materialized) or `action-failed`. `action-warned` carries a non-fatal warning: an action whose function was refused by its vendor still ends `action-applied`, and this row is what says so. `cache-hit` / `cache-miss` distinguish a replayed action from a fast one, which `durationMs` alone cannot. `log-truncated` means the run exceeded the per-run action cap and rows after it were dropped — read it as an incomplete timeline, never as a short one. |
| `at` | `string` | yes | When the event was emitted. NOT the order key — two events can share a millisecond; order on `seq`. |
| `attempt` | `integer` | yes | Which attempt within this run. ⚠️ This means different things on different surfaces: a streaming run retries the whole flow under ONE run id, so its retries are attempts 2, 3…; a record retry allocates a new run id entirely and is always attempt 1. Do not aggregate across surfaces without knowing which produced the run. |
| `flowId` | `string \| null` | yes | The flow this action belongs to. A `flow.invoke` runs a sub-flow's actions under the PARENT's run id. |
| `actionId` | `string \| null` | yes | The action, for action-level rows. Null on run-level rows. |
| `actionName` | `string \| null` | yes | The action's name AS IT WAS when the run happened. Still there after the action is DELETED. |
| `branchId` | `string \| null` | yes | The fan-out branch, or null at the trunk. |
| `branchPathIds` | `object[] \| null` | yes | Fan-out / loop ancestry, outermost first, on each action row of a branch (a cache row carries only `branchId`) — the rows of a flow it calls with `flow.invoke` included — and null at the trunk. `branchId` alone cannot express NESTING — a fan-out inside a fan-out yields two unrelated ids — and each level's `index` names the item the branch ran for. |
| `durationMs` | `integer \| null` | yes | Engine-measured wall clock for the action. ⚠️ INCLUDES any time spent queuing for a rate-limit token — see `rateLimitWaitMs` in `detail`, which is a COMPONENT of this number and not a sibling of it. Null where the outcome carries no duration (a skipped action). |
| `detail` | `object \| null` | yes | Kind-specific extras: identifiers, configuration keys, counts and closed enums, never a slot bag or branch value. A `action-failed` row names its `phase` and carries the action's error `message`, and a `action-warned` row a function warning's `message`, each cut to 500 characters — function text that can quote what the action was processing. |

### `GET /v1/runs/{runId}/timeline/stream`

Server-Sent Events. Emits `timeline` with whatever the caller missed (empty when it is already current, which is also how it learns the run exists), then `timeline` again as rows are appended, then `close` with a reason. `close { terminal }` means the run finished or was aborted. Resume with `?after=<the last frame's through>`. The same rows, paged, are `GET /v1/runs/{runId}/timeline`; event kinds are kebab-case (`action-failed`).

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `timeline`, `close`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose timeline to follow. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The position the caller already holds — a `seq` from the paged endpoint or from a previous frame's `through`. Rows at or before it are not re-sent. ⭐ OMITTED MEANS FROM THE START of the recorded log; a page that has already rendered a timeline should always send it, or it pays for the whole backlog a second time. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these rows belong to. Heterogeneous by construction — an endpoint invocation id, a record-processing attempt id or a flow run's request id — exactly the id space `GET /v1/runs/{runId}/timeline` takes. |
| `timeline` | `object[]` | yes | Rows appended since the position the client asked from, in `seq` order. ⛔ MAY BE EMPTY, and an empty batch is not a defect: it is how a caller that is already current is told so at connect time, which is also what tells it the run exists at all. |
| `through` | `string` | yes | The `seq` of the last row in this frame, or the client's own position when the frame is empty. Pass it back as `after` on a reconnect. ⚠️ A STRING because `seq` is a 64-bit sequence and JSON numbers lose precision above 2^53. Compare as a BigInt, never as a string: `"9" > "10"` holds for the first nine rows of every run and is wrong ever after. |
| `truncated` | `boolean` | yes | True once the RUN has outrun the writer's per-run cap, so events occurred that were never recorded at all. ⛔ It does NOT end the stream and it is not a paging flag — the run continues and still finishes. Read it as: this timeline is INCOMPLETE rather than short. |
| `type` | `"close"` | yes | Always `close`. The server is ending the stream deliberately — this is an orderly goodbye, not a fault. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter. |

Each item of `timeline`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `string` | yes | Total order within the run, as a STRING — the column is a 64-bit sequence and JSON numbers lose precision above 2^53. Sort on it; do not do arithmetic with it. |
| `kind` | `"run-started" \| "run-finished" \| "run-aborted" \| "action-started" \| "action-applied" \| "action-no-op" \| "action-skipped" \| "action-not-reached" \| "action-failed" \| "action-warned" \| "cache-hit" \| "cache-miss" \| "log-truncated"` | yes | What this row records. Run-level: `run-started` (opens before the first action, so a run that crashes immediately still has a row), `run-finished`, `run-aborted` (ended from OUTSIDE — a deadline, a disconnected client, the worker shutting down under it, the stuck-records watchdog, or recovery from a crashed worker — which is NOT a failure of the flow). Action-level: `action-started`, then one of `action-applied`, `action-no-op`, `action-skipped` (a gate or projection miss stopped it, or a record retry skipped an action an earlier attempt applied), `action-not-reached` (its enclosing branch never materialized) or `action-failed`. `action-warned` carries a non-fatal warning: an action whose function was refused by its vendor still ends `action-applied`, and this row is what says so. `cache-hit` / `cache-miss` distinguish a replayed action from a fast one, which `durationMs` alone cannot. `log-truncated` means the run exceeded the per-run action cap and rows after it were dropped — read it as an incomplete timeline, never as a short one. |
| `at` | `string` | yes | When the event was emitted. NOT the order key — two events can share a millisecond; order on `seq`. |
| `attempt` | `integer` | yes | Which attempt within this run. ⚠️ This means different things on different surfaces: a streaming run retries the whole flow under ONE run id, so its retries are attempts 2, 3…; a record retry allocates a new run id entirely and is always attempt 1. Do not aggregate across surfaces without knowing which produced the run. |
| `flowId` | `string \| null` | yes | The flow this action belongs to. A `flow.invoke` runs a sub-flow's actions under the PARENT's run id. |
| `actionId` | `string \| null` | yes | The action, for action-level rows. Null on run-level rows. |
| `actionName` | `string \| null` | yes | The action's name AS IT WAS when the run happened. Still there after the action is DELETED. |
| `branchId` | `string \| null` | yes | The fan-out branch, or null at the trunk. |
| `branchPathIds` | `object[] \| null` | yes | Fan-out / loop ancestry, outermost first, on each action row of a branch (a cache row carries only `branchId`) — the rows of a flow it calls with `flow.invoke` included — and null at the trunk. `branchId` alone cannot express NESTING — a fan-out inside a fan-out yields two unrelated ids — and each level's `index` names the item the branch ran for. |
| `durationMs` | `integer \| null` | yes | Engine-measured wall clock for the action. ⚠️ INCLUDES any time spent queuing for a rate-limit token — see `rateLimitWaitMs` in `detail`, which is a COMPONENT of this number and not a sibling of it. Null where the outcome carries no duration (a skipped action). |
| `detail` | `object \| null` | yes | Kind-specific extras: identifiers, configuration keys, counts and closed enums, never a slot bag or branch value. A `action-failed` row names its `phase` and carries the action's error `message`, and a `action-warned` row a function warning's `message`, each cut to 500 characters — function text that can quote what the action was processing. |

### `GET /v1/runs/{runId}/trace`

The VALUES half of one run — flow inputs and output, slot outputs and each action's output or error — when the run wrote a trace: production runs are sampled and traces expire (default 7 days), so 404 is an ordinary answer. The execution record every run has is `GET /v1/runs/{runId}/timeline`; a flow's traces are `GET /v1/flows/{id}/traces`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose trace to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The trace's id. |
| `subject` | `string` | yes | What kind of thing the flow was invoked for: `request` when it ran with an input bag (an endpoint or a search), `record` when it ran to process one record. Those are the only two values. |
| `source` | `string` | yes | Where the run came from: `production` is real traffic, while `eval` and `manual` are runs someone deliberately provoked. |
| `tag` | `string \| null` | yes | A label attached to the run, or null. |
| `platformFlowRun` | `boolean` | yes | True when the flow that ran is a platform flow, run by one of this project's eval suites: the trace is filed under this project, which ran it, but the flow is not one of the project's own. |
| `flowId` | `string \| null` | yes | The flow that ran. |
| `recordId` | `string \| null` | yes | The record being processed, when `subject` is `record`. Null otherwise. |
| `runId` | `string \| null` | yes | The run that wrote this trace — its timeline, change set and spend answer under `/v1/runs/{runId}`. Null for a trace written without one. |
| `inputs` | `unknown` | no | What the run received. |
| `output` | `unknown` | no | What the run produced. There is no status field on a trace — a failure shows up HERE and in `slotOutputs`, not as a verdict. |
| `slotOutputs` | `object` | yes | What the run wrote, keyed by OUTPUT SLOT — one level, not nested by action. The payload that matters for a diagnosis: it separates a slot that was written from one that was not. Truncated when it was written. An action whose output slot is empty contributes no key. |
| `actionOutputs` | `object \| null` | yes | What each ACTION wrote, for the writes a slot name cannot name. Null when the writer recorded no actions. |
| `durationMs` | `integer \| null` | yes | How long the run took, in milliseconds. ⚠️ NULL MEANS UNTIMED, not instant — an old row, or a run that crashed before it got going. Render the difference. |
| `createdAt` | `string` | yes | When the run happened. |
| `expiresAt` | `string` | yes | When this trace will be deleted. Reading it after this point returns 404 by design, not because the reference is broken. |
