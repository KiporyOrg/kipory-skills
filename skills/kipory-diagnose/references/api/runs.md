<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Runs

One id space for every run — an endpoint invocation, a record-processing attempt, a bare request. The step log is never sampled; the change set is what the run wrote.

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
| `GET` | [`/v1/runs/{runId}/steps`](#get-v1-runs-runid-steps) |  |
| `GET` | [`/v1/runs/{runId}/steps/stream`](#get-v1-runs-runid-steps-stream) |  |
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
| `sections` | `string[]` | yes | Which page-questions moved — `eval-runs`, `flow-runs`, `schedule-runs`, `endpoint-calls`, `record-ingestion`. Refetch only what you are showing. Treat an unrecognised word as a signal to refetch nothing rather than as an error: a newer deployment may name domains this client predates. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter — that is the only default safe in both directions, since it neither abandons a live subject nor hammers a dead one. |

### `GET /v1/runs`

One project's runs, in the order they started, walked on `after`/`before`; filter by `flowKey` and a `window`. Every run, with no values: what started it, how it closed, its verdict. One run is `GET /v1/runs/{runId}`; its steps `…/steps`; the values that flowed (sampled, 7 days) `…/trace`; what it wrote `…/change-set`; what it cost `…/spend`. A flow's sampled traces are `GET /v1/flows/{id}/traces`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project NODE whose runs to list (`OrgNode.id`). |
| `after` | `string` | no | Read the next page along `order` — pass the `nextCursor` you were given. Opaque: read it from a response, never build one. ⛔ A cursor carries the `order` it was minted under, and one that is malformed or replayed under the other `order` is refused (400) rather than paged from a place that ordering does not have. |
| `before` | `string` | no | Read the previous page along `order` — pass the `prevCursor` you were given. ⛔ NOT VALID WITH `after`: the two name opposite ways from one row, so a request carrying both is a client bug and is answered 400 rather than resolved by precedence — a page picked silently would look plausible and hide the fault. |
| `limit` | `integer` | no | Rows per page. Defaults to 50, capped at 100. |
| `flowKey` | `string` | no | Only runs whose ROOT flow has this key — the flow's address, the same one `/{project}/flows/{key}` takes. A key the project does not have is a 404, never an empty page: an empty page would say the flow has not run, which is a different claim. ⚠️ A run whose flow was since deleted matches nothing here, since it has no key to match. Filters inside the same ordered walk the page uses; it does not change the cursor. |
| `window` | `"24h" \| "7d" \| "30d"` | no | Narrow to runs STARTED in this window. ⭐ THE SAME VOCABULARY the calls, ingestion and usage surfaces take, so a drill-through from one of them carries its window across without a translation table and a reader who narrowed there is never silently re-widened here. ⚠️ IT FILTERS, IT DOES NOT ORDER: the page is still a keyset on `seq`, and a bound on `at` does not change which column the cursor walks. Ranges on the OPENER's `at` — when the run started — which is what a reader means by a run being 'in' a window. Counted in whole slices, as usage counts it: `24h` from the top of the hour 23 hours before the current one, `7d` and `30d` from 00:00 UTC that many days back counting today. ⛔ NOT VALID WITH `since` or `until` (400): a preset and an explicit range are two answers to one question. |
| `since` | `string` | no | Only runs STARTED at or after this instant — the explicit form of `window`, for a range no preset names. Ranges on the opener's `at`, like `window`, and filters without changing the cursor. |
| `until` | `string` | no | Only runs started STRICTLY BEFORE this instant. Omit it for up to now. Refused (400) at or before `since`: that range is empty by construction. |
| `tally` | `"hour" \| "day"` | no | Also answer how many runs STARTED in each hour or day of the range, as `started`. ⛔ NEEDS A LOWER BOUND (`window` or `since`): refused (400) without one, since an unbounded range has no first slice. Counted on the same instant and under the same `flowKey` as the list, so the slices sum to `total`. Not moved by the cursor. |
| `order` | `"desc" \| "asc"` | no | Which way the list runs by start (insertion `seq`): `desc` (the default) is newest first, `asc` oldest first. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runs` | `object[]` | yes | The page, in `order` by `seq`. ⛔ Ordered by insertion, not by start time — see `startedAt`. |
| `order` | `"desc" \| "asc"` | yes | Which way the runs run by `seq` — the `order` sent, or `desc` (newest first). |
| `total` | `integer` | yes | Runs matching this query's `flow` and time range, across every page — not moved by the cursor. Bounded by the run log's retention, which is what makes it affordable on every read. |
| `paging` | `null` | yes | Always `null`: this route pages by cursor alone and offers no page jump — `total` answers how many runs match. Not a missing field — the route's answer (API-12). |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the next page along `order`. `null` means this was the last page. Independent of anything a row says about itself. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the previous page along `order`. `null` on page one. ⛔ MEASURED, NEVER INFERRED FROM THE REQUEST. It was once taken from `after !== undefined` — 'a caller that passed a cursor came from somewhere' — which is true of a caller who walked here and false of every other way of arriving, and is the reasoning `/files` shipped and withdrew after it drew the newer control inert on every jumped page. It is an existence probe now, in both directions. |
| `since` | `string \| null` | yes | The lower bound the list was read from — the instant `window` resolved to, or the `since` sent — or `null` when neither was asked, so a reader states the range the list was read over rather than re-deriving it from a label and a clock that may differ. |
| `until` | `string \| null` | yes | The `until` sent, or `null` for up to now. |
| `started` | `object[] \| null` | yes | Runs started per slice of the range, oldest first, when `tally` was sent. Every slice is PRESENT, a quiet one with zero, so the shape is not compressed. `null` when `tally` was not sent, or when the range holds too many runs to tally — never an empty list for a range that was not counted. |

Each item of `runs`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. The same id space every other `/v1/runs/{runId}/…` route takes. |
| `seq` | `string` | yes | The opening frame's sequence, and this row's paging cursor. A STRING because it is a 64-bit key and JSON numbers are not. |
| `startedAt` | `string` | yes | When the opening frame was WRITTEN. ⚠️ Not exactly when the run started: the step-log writer buffers, so insertion order and start order differ by up to one batch. The list is ordered by `seq` because it is the only column monotonic with insertion — sorting these timestamps client-side would reorder runs against the cursor that pages them. |
| `attempt` | `integer` | yes | Which attempt within the run. A streaming runner retries the whole flow under ONE run id and owns the counter. |
| `flowId` | `string \| null` | yes | The root flow, where named. |
| `flow` | `object \| null` | yes | The named flow as it stands NOW — a live read, not what the run saw. ⚠️ A flow relabelled since the run reports its NEW label here; `GET /v1/runs/{runId}/flow-snapshots` is the surface that answers what the graph looked like when it ran. ⛔ `null` means the flow is GONE, never that the run named none — `flowId` beside it is what separates the two, and a run outliving its flow is ordinary on any project that has been edited. |
| `trigger` | `object \| null` | yes | What caused a run, in the stored vocabulary. |
| `source` | `object` | yes | What started a run, translated from the stored `trigger`. |
| `mode` | `string \| null` | yes | `full` \| `from_cache`, where the surface distinguishes them. |
| `declaredSteps` | `integer \| null` | yes | How many ENABLED skills the root flow declared — the `y` of a run's `x / y`. ⛔ A FLOOR, NOT A TOTAL: a fan-out runs one step PER BRANCH and sub-flows are not counted, so `stepsStarted` can exceed it and a reader must degrade to a bare count where it does. `null` on every run that started before the field existed. |
| `stepsStarted` | `integer` | yes | The `x`: how many steps this run has been observed to START. Counted from the log, so it is what HAPPENED — never a plan. |
| `lifecycle` | `"in-flight" \| "settled" \| "unknown"` | yes | Whether the run is still going. ⛔ NOT from the step log, which cannot answer it — a run with no closing frame is three facts at once (in flight, dead with its buffer, reaped). It comes from whichever row the run id belongs to: an endpoint run's INVOCATION status, or a record-processing ATTEMPT's terminal marker. ⭐ ON THE ROW rather than on the single-run response, because BOTH screens draw it: while it lived on only one, the listing said `no end recorded` about a run the run page called `running`. A run with no row in either table — a synchronous call, a preview — is `settled` once it has a closing frame (`closing` non-null) and `unknown` until then. ⚠️ `unknown` is ordinary rather than an error; a lifecycle state the platform has grown but this reader has not been taught resolves to it as well. It means `no outcome recorded`, never `finished`. |
| `closing` | `object \| null` | yes | How a run ended, where that has been observed. |

Each item of `started`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The slice's first instant: the top of a UTC hour, or 00:00 UTC. |
| `runs` | `integer` | yes | Runs that started in this slice. |

### `GET /v1/runs/{runId}`

Which run this is — the flow it ran, how it was triggered, how it closed, and its retry attempts. Each sibling answers one aspect: `…/steps` (what executed, no values), `…/trace` (the values, when sampled), `…/change-set` (what it wrote), `…/flow-snapshots` (the flow as it ran), `…/spend` (what it cost). 404 for an id you cannot see.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run to describe. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `run` | `object` | yes | The run, in the listing's own row shape, built from its EARLIEST opening frame. ⚠️ `seq` is still its paging cursor in the listing, and is published here so a caller can open the listing at this run rather than at the top. |
| `attempts` | `integer` | yes | How many times this run was attempted — a COUNT, never an attempt NUMBER. ⛔ A retried run writes one opening frame PER ATTEMPT, so the listing draws it as several rows and every one of them addresses THIS route. Publishing one attempt's number would contradict whichever row the caller clicked; `run.attempt` is the earliest frame's and is 1 on every retried run, which is why it cannot answer this on its own. |

### `GET /v1/runs/{runId}/change-set`

What a run CHANGED — every write it staged and how each resolved (applied, rejected, discarded, captured), never the values written. A step that wrote nothing is invisible here; read `GET /v1/runs/{runId}/steps` for it.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose recorded changes to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run this set belongs to. Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. |
| `state` | `"captured" \| "applied" \| "rejected" \| "discarded"` | yes | What became of the run's staged changes. `captured` — the writes went straight to Postgres and the set only recorded them (the pass-through mode; every production runner defers its writes now, so only a set written before that reads `captured`); `applied` — the set was applied whole, inside one transaction; `rejected` — a precondition failed or the transaction was refused, and NOTHING was written; `discarded` — the run failed, so the set was dropped unapplied. |
| `effects` | `object[]` | yes | Every change the run staged, in `seq` order. |
| `bound` | `object` | yes | The run's effect cap and its usage. Exceeding the cap rejects the whole set rather than truncating it — a truncated change set is a partial commit wearing a different hat. |
| `rejection` | `object` | no | Present only when the change set was rejected. |
| `createdAt` | `string` | yes | When the set was resolved. |

Each item of `effects`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `integer` | yes | Position within the change set, and the apply order. NOT an array index — a discarded fan-out branch leaves gaps. |
| `kind` | `string` | yes | What the effect does — `record.update`, `record.terms.set`, `event.publish`, and so on. |
| `tier` | `string` | yes | `transactional` for effects Postgres can roll back, `post-commit` for the ones it cannot (vectors, queue jobs, published events). |
| `target` | `object` | yes | What the effect acts on. Identifiers and configuration keys ONLY — never record contents. |
| `skillId` | `string` | yes | The step that produced the effect. |
| `branchId` | `string \| null` | yes | The fan-out branch, or null at the trunk. |

### `GET /v1/runs/{runId}/flow-snapshots`

What the flows a run executed LOOKED LIKE when it ran them — each step's handler, configuration and prompt, by content digest — even after the flow was edited. The current flow is `GET /v1/flows/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose executed flow bodies to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these snapshots belong to. The same heterogeneous id space `GET /v1/runs/{runId}/steps` and `/change-set` take — a record attempt id, a flow run's request id, or an endpoint invocation id. |
| `snapshots` | `object[]` | yes | One entry per flow the run loaded and stored, ordered by `flowId`. ⚠️ May be SHORTER than the run's `flowVersions` map, and the gap is meaningful: a system flow contributes a digest and no body, and a snapshot reaped past its window leaves the same shape. `missing` reports the difference rather than leaving it to be inferred. At most 200 flows are resolved per response; a larger map is cut there, and the rest are neither here nor in `missing`. |
| `missing` | `string[]` | yes | Flow ids the run loaded that this response carries no body for: a platform-owned flow (its body is never stored here), a snapshot reaped past its window, a best-effort snapshot write that was dropped, or a stored body that no longer parses. Every run path's log names only the flows the run loaded — a sub-flow behind a step that did not fire is in neither list. One exception, until it ages out of run history: an older record run's log named every flow its steps could invoke, so it can list here a sub-flow it never executed. ⛔ NOT an error and NOT an empty graph: a reader that silently drew only `snapshots` would report a run as having executed fewer flows than it did. |

Each item of `snapshots`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this snapshot is of. A SOFT reference: a snapshot outlives the flow it describes, which is the point of provenance, so this id may name a row that no longer exists. |
| `digest` | `string` | yes | The content address — a digest over each skill's `(id, version, enabled)` and the flow's own signature (`inputSlots`, `outputSlots`, `outputBinding`). A skill's `version` moves on every write, so an edit to any of them is a new digest. Opaque: compare it, never parse it. ⭐ The same value `run-started.flowVersions` and `run-finished.flowVersions` publish, so a reader can tell WHICH entry in that map this row answers without matching on anything else. |
| `capturedAt` | `string` | yes | When this graph version was FIRST captured — NOT when the run being read executed it. ⚠️ A snapshot is shared by every run that used the same graph, so this is usually older than the run, and a reader must not present it as the run's own timestamp. |
| `label` | `string` | yes | The flow's display text as it was at capture. |
| `key` | `string` | yes | The flow's key as it was at capture. |
| `skills` | `object[]` | yes | Every skill in the flow, by value, in capture order. ⛔ This is the CONFIGURATION that ran — handler keys, handler config, prompts, schema refs — and never anything the run PROCESSED. A caller wanting values reads the flow trace, where they live behind their own sampling and TTL. |

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

### `GET /v1/runs/{runId}/steps`

A run's execution record — one row per run and step event (`run-started`, `step-applied`, `step-failed`…), in order, walked on `after`/`before` or `page`, with no slot values. Follow it live with `GET /v1/runs/{runId}/steps/stream`; the values that flowed are `GET /v1/runs/{runId}/trace`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose step timeline to read. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page LATER in the run than this step — pass back the `nextCursor` you were given. An unparseable cursor is treated as absent and returns the first page, rather than as a bound of zero. |
| `before` | `string` | no | The page EARLIER in the run than this step — pass back the `prevCursor` you were given. Refused together with `after`. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an OFFSET, so it is the weaker motion — but a run's log is append-only and a finished run's never changes at all, which makes the drift a live run's tail and nothing else. Past the last page it CLAMPS. Refused together with a cursor. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these steps belong to. Heterogeneous by construction — a record-processing attempt id, a flow run's request id, or an endpoint invocation id, depending on which surface ran the flow. The same id space `GET /v1/runs/{runId}/change-set` takes. |
| `steps` | `object[]` | yes | The run's timeline, in `seq` order. |
| `truncated` | `boolean` | yes | True when the RUN exceeded the per-run step cap, so events exist that were never recorded at all — the timeline is INCOMPLETE rather than short. ⛔ NOT a paging flag: it answers for the whole run and reads the same on every page. Whether more pages exist is `nextCursor`, and the two are independent — a complete timeline can span ten pages, and a truncated one can fit inside half of one. |
| `paging` | `object` | yes | Where this page sits in the recorded log: its size, its 1-based index, how many pages there are and how many steps were recorded. ⛔ `total` counts RECORDED steps — a run that outran the writer's cap has more that were never written, which is what `truncated` says. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page LATER in the run. NULL means this was the last page. The value is a `seq`, which is unique and monotonic, so a resume needs no tiebreaker and can neither skip nor repeat a row. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page EARLIER in the run. NULL means this is the first page — measured against the log, so it is still right on a page reached by a `page` jump, where nothing about the request says where the reader came from. |

Each item of `steps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `string` | yes | Total order within the run, as a STRING — the column is a 64-bit sequence and JSON numbers lose precision above 2^53. Sort on it; do not do arithmetic with it. |
| `kind` | `"run-started" \| "run-finished" \| "run-aborted" \| "step-started" \| "step-applied" \| "step-no-op" \| "step-skipped" \| "step-not-reached" \| "step-failed" \| "step-warned" \| "cache-hit" \| "cache-miss" \| "log-truncated"` | yes | What this row records. Run-level: `run-started` (opens before the first step, so a run that crashes immediately still has a row), `run-finished`, `run-aborted` (ended from OUTSIDE — a deadline, a disconnected client, the worker shutting down under it, the stuck-records watchdog, or recovery from a crashed worker — which is NOT a failure of the flow). Step-level: `step-started`, then one of `step-applied`, `step-no-op`, `step-skipped` (a gate or projection miss stopped it, or a record retry skipped a step an earlier attempt applied), `step-not-reached` (its enclosing branch never materialized) or `step-failed`. `step-warned` carries a non-fatal warning: a step whose handler was refused by its vendor still ends `step-applied`, and this row is what says so. `cache-hit` / `cache-miss` distinguish a replayed step from a fast one, which `durationMs` alone cannot. `log-truncated` means the run exceeded the per-run step cap and rows after it were dropped — read it as an incomplete timeline, never as a short one. |
| `at` | `string` | yes | When the event was emitted. NOT the order key — two events can share a millisecond, which is why `seq` exists. |
| `attempt` | `integer` | yes | Which attempt within this run. ⚠️ This means different things on different surfaces: a streaming run retries the whole flow under ONE run id, so its retries are attempts 2, 3…; a record retry allocates a new run id entirely and is always attempt 1. Do not aggregate across surfaces without knowing which produced the run. |
| `flowId` | `string \| null` | yes | The flow this step belongs to. A `flow.invoke` runs a sub-flow's steps under the PARENT's run id, so without this a nested run reads as one flat list from flows a reader cannot tell apart. |
| `skillId` | `string \| null` | yes | The step, for step-level rows. Null on run-level rows. |
| `skillName` | `string \| null` | yes | The step's name AS IT WAS when the run happened. Carried beside the id because a skill can be DELETED, after which the id alone is a dangling reference and this is what keeps the timeline readable. |
| `branchId` | `string \| null` | yes | The fan-out branch, or null at the trunk. |
| `branchPathIds` | `object[] \| null` | yes | Fan-out / loop ancestry. `branchId` alone cannot express NESTING — a fan-out inside a fan-out yields two unrelated ids. |
| `durationMs` | `integer \| null` | yes | Engine-measured wall clock for the step. ⚠️ INCLUDES any time spent queuing for a rate-limit token — see `rateLimitWaitMs` in `detail`, which is a COMPONENT of this number and not a sibling of it. Null where the outcome carries no duration (a skipped step). |
| `detail` | `object \| null` | yes | Kind-specific extras: identifiers, configuration keys, counts and closed enums, never a slot bag or branch value. A `step-failed` row names its `phase` and carries the step's error `message`, and a `step-warned` row a handler warning's `message`, each cut to 500 characters — handler text that can quote what the step was processing. |

### `GET /v1/runs/{runId}/steps/stream`

Server-Sent Events. Emits `steps` with whatever the caller missed (empty when it is already current, which is also how it learns the run exists), then `steps` again as rows are appended, then `close` with a reason. `close { terminal }` means the run finished or was aborted. Resume with `?after=<the last frame's through>`. The same rows, paged, are `GET /v1/runs/{runId}/steps`; step kinds are kebab-case (`step-failed`).

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `steps`, `close`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose step timeline to follow. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The position the caller already holds — a `seq` from the paged endpoint or from a previous frame's `through`. Rows at or before it are not re-sent. ⭐ OMITTED MEANS FROM THE START of the recorded log, which is what a client with nothing on screen wants; a page that has already rendered a timeline should always send it, or it pays for the whole backlog a second time. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run these steps belong to. Heterogeneous by construction — an endpoint invocation id, a record-processing attempt id or a flow run's request id — exactly the id space `GET /v1/runs/{runId}/steps` takes. |
| `steps` | `object[]` | yes | Rows appended since the position the client asked from, in `seq` order. ⛔ MAY BE EMPTY, and an empty batch is not a defect: it is how a caller that is already current is told so at connect time, which is also what tells it the run exists at all. |
| `through` | `string` | yes | The `seq` of the last row in this frame, or the client's own position when the frame is empty. Pass it back as `after` on a reconnect. ⚠️ A STRING because `seq` is a 64-bit sequence and JSON numbers lose precision above 2^53 — the same reason the paged endpoint stringifies it. Compare as a BigInt, never as a string: `"9" > "10"` holds for the first nine rows of every run and is wrong ever after. |
| `truncated` | `boolean` | yes | True once the RUN has outrun the writer's per-run cap, so events occurred that were never recorded at all. ⛔ It does NOT end the stream and it is not a paging flag — the run continues and still finishes. Read it as: this timeline is INCOMPLETE rather than short. |
| `type` | `"close"` | yes | Always `close`. The server is ending the stream deliberately — this is an orderly goodbye, not a fault. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter — that is the only default safe in both directions, since it neither abandons a live subject nor hammers a dead one. |

Each item of `steps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `seq` | `string` | yes | Total order within the run, as a STRING — the column is a 64-bit sequence and JSON numbers lose precision above 2^53. Sort on it; do not do arithmetic with it. |
| `kind` | `"run-started" \| "run-finished" \| "run-aborted" \| "step-started" \| "step-applied" \| "step-no-op" \| "step-skipped" \| "step-not-reached" \| "step-failed" \| "step-warned" \| "cache-hit" \| "cache-miss" \| "log-truncated"` | yes | What this row records. Run-level: `run-started` (opens before the first step, so a run that crashes immediately still has a row), `run-finished`, `run-aborted` (ended from OUTSIDE — a deadline, a disconnected client, the worker shutting down under it, the stuck-records watchdog, or recovery from a crashed worker — which is NOT a failure of the flow). Step-level: `step-started`, then one of `step-applied`, `step-no-op`, `step-skipped` (a gate or projection miss stopped it, or a record retry skipped a step an earlier attempt applied), `step-not-reached` (its enclosing branch never materialized) or `step-failed`. `step-warned` carries a non-fatal warning: a step whose handler was refused by its vendor still ends `step-applied`, and this row is what says so. `cache-hit` / `cache-miss` distinguish a replayed step from a fast one, which `durationMs` alone cannot. `log-truncated` means the run exceeded the per-run step cap and rows after it were dropped — read it as an incomplete timeline, never as a short one. |
| `at` | `string` | yes | When the event was emitted. NOT the order key — two events can share a millisecond, which is why `seq` exists. |
| `attempt` | `integer` | yes | Which attempt within this run. ⚠️ This means different things on different surfaces: a streaming run retries the whole flow under ONE run id, so its retries are attempts 2, 3…; a record retry allocates a new run id entirely and is always attempt 1. Do not aggregate across surfaces without knowing which produced the run. |
| `flowId` | `string \| null` | yes | The flow this step belongs to. A `flow.invoke` runs a sub-flow's steps under the PARENT's run id, so without this a nested run reads as one flat list from flows a reader cannot tell apart. |
| `skillId` | `string \| null` | yes | The step, for step-level rows. Null on run-level rows. |
| `skillName` | `string \| null` | yes | The step's name AS IT WAS when the run happened. Carried beside the id because a skill can be DELETED, after which the id alone is a dangling reference and this is what keeps the timeline readable. |
| `branchId` | `string \| null` | yes | The fan-out branch, or null at the trunk. |
| `branchPathIds` | `object[] \| null` | yes | Fan-out / loop ancestry. `branchId` alone cannot express NESTING — a fan-out inside a fan-out yields two unrelated ids. |
| `durationMs` | `integer \| null` | yes | Engine-measured wall clock for the step. ⚠️ INCLUDES any time spent queuing for a rate-limit token — see `rateLimitWaitMs` in `detail`, which is a COMPONENT of this number and not a sibling of it. Null where the outcome carries no duration (a skipped step). |
| `detail` | `object \| null` | yes | Kind-specific extras: identifiers, configuration keys, counts and closed enums, never a slot bag or branch value. A `step-failed` row names its `phase` and carries the step's error `message`, and a `step-warned` row a handler warning's `message`, each cut to 500 characters — handler text that can quote what the step was processing. |

### `GET /v1/runs/{runId}/trace`

The VALUES half of one run — flow inputs and output, slot outputs and each step's output or error — when the run wrote a trace: production runs are sampled and traces expire (default 7 days), so 404 is an ordinary answer. The execution record every run has is `GET /v1/runs/{runId}/steps`; a flow's traces are `GET /v1/flows/{id}/traces`.

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
| `runId` | `string \| null` | yes | The run that wrote this trace — its steps, change set and spend answer under `/v1/runs/{runId}`. Null for a trace written without one. |
| `inputs` | `unknown` | no | What the run received. |
| `output` | `unknown` | no | What the run produced. There is no status field on a trace — a failure shows up HERE and in `slotOutputs`, not as a verdict. |
| `slotOutputs` | `object` | yes | What the run wrote, keyed by OUTPUT SLOT — one level, not nested by step. The payload that matters for a diagnosis: it separates a slot that was written from one that was not. Truncated when it was written. A step whose output slot is empty contributes no key. |
| `stepOutputs` | `object \| null` | yes | What each STEP wrote, for the writes a slot name cannot name. Null when the writer recorded no steps. |
| `durationMs` | `integer \| null` | yes | How long the run took, in milliseconds. ⚠️ NULL MEANS UNTIMED, not instant — an old row, or a run that crashed before it got going. Render the difference. |
| `createdAt` | `string` | yes | When the run happened. |
| `expiresAt` | `string` | yes | When this trace will be deleted. Reading it after this point returns 404 by design, not because the reference is broken. |
