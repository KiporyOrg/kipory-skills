<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 93e75142d106 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Spend

What a project spent and what will stop it. `GET /v1/credits/balance` answers on the project's host; the per-run and per-project reads answer on the api host.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/credits/balance`](#get-v1-credits-balance) |  |
| `GET` | [`/v1/organizations/{nodeId}/quota`](#get-v1-organizations-nodeid-quota) |  |
| `GET` | [`/v1/projects/{nodeId}/ai-calls`](#get-v1-projects-nodeid-ai-calls) |  |
| `GET` | [`/v1/projects/{nodeId}/ai-calls/{callId}`](#get-v1-projects-nodeid-ai-calls-callid) |  |
| `GET` | [`/v1/projects/{nodeId}/ai-calls/rollup`](#get-v1-projects-nodeid-ai-calls-rollup) |  |
| `GET` | [`/v1/projects/{nodeId}/usage`](#get-v1-projects-nodeid-usage) |  |
| `GET` | [`/v1/runs/{runId}/spend`](#get-v1-runs-runid-spend) |  |

### `GET /v1/credits/balance`

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `creditsRemaining` | `integer` | yes | What is left in the wallet, in credits (one credit is one micro-USD). |
| `softCapCredits` | `integer` | yes | How far BELOW zero the balance may go before requests start being refused with 402 — headroom, not a second balance. |
| `status` | `"active" \| "over_soft_cap" \| "suspended"` | yes | Whether this wallet may still pay for work. `active` is fine; `over_soft_cap` means the balance has passed the agreed floor and requests are being refused with 402; `suspended` means the account is stopped for a reason other than balance. |
| `perUserSpendCap` | `integer \| null` | yes | The ceiling on what YOU personally may spend, or null when the project sets none. ⚠️ NOT a second balance: it limits your share of the wallet above, and both gates must pass independently. |
| `perUserSpendConsumed` | `integer` | yes | What you have spent against that ceiling in the current window. Always present, and 0 rather than absent for a first-time caller — so 'no cap' is never confused with 'no data'. |
| `perUserSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | yes | The window `perUserSpendConsumed` covers. Without it that figure is ambiguous where it matters most: '8 of 10' is a wall about to be hit if the window is LIFETIME, and an ordinary month if it is monthly. |
| `perUserSpendWindowStart` | `string \| null` | yes | The instant the consumed figure was actually summed from, or null for a lifetime window. Read it rather than recomputing it from the period — recomputing is how a client shows a window the server did not enforce. |

### `GET /v1/organizations/{nodeId}/quota`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization node whose quota to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resources` | `object[]` | yes | One entry per external quota pool this organization draws on. |

### `GET /v1/projects/{nodeId}/ai-calls`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `from` | `string` | no | Only calls at or after this instant. ⚠️ `to` IS OPTIONAL and defaults to the read's own clock — a caller that wants the ledger and the rollup taken over the SAME window must send it, or each read picks its own upper bound and the band can disagree with the table under it by a round trip. |
| `to` | `string` | no | Only calls STRICTLY BEFORE this instant. |
| `origins` | `string` | no | Comma-separated `AiCall.origin` values to INCLUDE, e.g. `session,projection`. Use `unset` to name the rows whose origin is null — the largest bucket in production, and unnameable otherwise — or `all` on its own to turn the filter off entirely. Omit the parameter entirely to get the default view, which hides what a human did while building (see `excludedOrigins` on the response for exactly what was applied). |
| `outcome` | `"success" \| "error"` | no | Narrow to calls that succeeded, or to calls that failed. |
| `taskKind` | `string` | no | Narrow to one kind of model work. ⚠️ NOT AN ENUM: `AiCall.taskKind` is a text column, so a row written before a member existed is still filterable. `callLogTaskKindSchema` is what the platform emits today and is the right list to OFFER; it is not the column's domain. |
| `skillId` | `string` | no | The skill that made the call — `AiCall.skillId`, an indexed column. |
| `flowId` | `string` | no | The flow the skill belongs to. `AiCall` carries NO flow column: this resolves through `Skill.flowId` to a list of skill ids, which the implementation must do in its own statement — see the module note on what a subquery costs here. ⛔⛔ IT THEREFORE REACHES THE FLOW'S CURRENT SKILL GENERATION AND NO OTHER: `replaceFlowSkillsTx` DELETES and recreates every skill of a flow with fresh ids on each whole-graph edit, and `AiCall.skillId` is a soft link with no foreign key — so calls made before the last edit are unreachable by this filter and by `q`'s skill-name arm. Nothing on a page can detect the loss: the rollup runs the same predicate, so a band and its table agree perfectly on the truncated population. The repair is a column (`CostEvent` denormalizes `skillName` beside `skillId` for exactly this reason), not a cleverer query — once the row is gone there is nothing left to map a dead id back to a name. |
| `provider` | `string` | no | The vendor, e.g. `openai`. Separate from `model` because one vendor degrading is the question this column exists to answer. |
| `model` | `string` | no | The exact model identifier. |
| `recordId` | `string` | no | The record this call was processing, when it was processing one. |
| `userId` | `string` | no | The end user the call was made on behalf of. |
| `sessionId` | `string` | no | The session the call was made inside. ⭐ THE ONE HANDLE THAT GATHERS A CONVERSATION'S CALLS, and the most populated optional dimension on the table: 73,300 of 117,211 rows carry one (production 2026-08-26) against 53,882 for `userId` and 17,706 for `recordId`. `correlationId` reads like the field for this and is not — it equals the row's own id on every production row, as its own note records. ⚠️ Served by `@@index([sessionId, createdAt(sort: Desc)])`, which is the same shape the keyset reads in, so this narrows without a scan. |
| `correlationId` | `string` | no | The call's correlation handle. ⚠️ Measured on production 2026-08-25, `correlationId` equals the row's own id on 114,862 of 114,862 rows — the `?? id` fallback in the chokepoint's call scaffold fires every time — so today this is an id lookup wearing another name, and it cannot yet gather the calls of one run. |
| `q` | `string` | no | Case-insensitive match against the row's own text — `errorCode`, `errorMessage`, `model`, `provider` — AND the name of the skill that made the call, which is resolved to skill ids first because an `AiCall` records only the id. That set is every text column a ledger of these draws, so a reader can search for what is in front of them. ⛔ IT MUST NOT BE WIDENED TO THE PROMPT, and the reason is size rather than taste: a prompt spills to object storage past 256 kB (production 2026-08-25: 174 rows, median 567 kB, max 10.06 MB), so a match over it cannot reach a spilled payload at all and would answer confidently about a subset with no way to say which. ⚠️ None of these columns is indexed for text, so this stays a scan within whatever the other filters already narrowed to. |
| `after` | `string` | no | The page OLDER than this row — pass back the `nextCursor` you were given. Opaque: read it from a response, never build one. |
| `before` | `string` | no | The page NEWER than this row — pass back the `prevCursor` you were given. Refused together with `after`: the two name opposite directions from one row, so a request carrying both has not said which it wants. |
| `limit` | `integer` | no | How many calls per page, up to 100. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `calls` | `object[]` | yes | Newest first, whichever direction the page was reached from. |
| `paging` | `"null"` | yes | Always NULL here. A page count needs a COUNT over an unreapered ledger, paid on every click; `rollup.totals.calls` answers the same question once, for the same window. Read `null` as `cursor walking only`, never as `not measured yet`. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the older page. Null on the oldest page. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the newer page. Null on the newest page. |
| `excludedOrigins` | `string[]` | yes | The `origin` values this request filtered OUT, so the page can say so instead of quietly under-reporting. Empty when the caller named its own `origins`. ⚠️ A statement about the FILTER, not about the data: it does not claim rows with these origins exist in the window. The count of what was dropped needs an aggregate this route does not run. |

### `GET /v1/projects/{nodeId}/ai-calls/{callId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |
| `callId` | `string` | yes | The `AiCall` row id, as the ledger sends it. Globally unique, but read under the node in the path — a call belonging to another project answers 404 here rather than being returned. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `payload` | `"prompt" \| "response"` | no | Include one stored payload with the call. Omit it for the metadata alone — the response's `payload` is then null, meaning NOT ASKED FOR rather than absent. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The `AiCall` row id. |
| `createdAt` | `string` | yes | When the call was recorded. |
| `taskKind` | `string` | yes | The kind of model work. ⚠️ A STRING, not the enum: `AiCall.taskKind` is a text column and a row written before a member existed must still render. Match against `callLogTaskKindSchema` for the six the platform emits today, and show anything else verbatim. |
| `origin` | `string \| null` | yes | What made the call — free text, null for the majority of rows. See `NON_PRODUCTION_ORIGINS` for why this reaches the client at all rather than being filtered away silently. |
| `provider` | `string` | yes | The vendor that served it. |
| `model` | `string` | yes | The exact model identifier. |
| `outcome` | `"success" \| "error"` | yes | Whether the call came back. |
| `errorCode` | `"error:rate_limit" \| "error:quota_exhausted" \| "error:transient_network" \| "error:provider_error" \| "error:schema_validation" \| "error:timeout" \| "error:unknown"` | yes | The failure bucket, null on success. An unrecognised stored code is normalised to `error:unknown` rather than passed through, so a client can switch on this exhaustively. |
| `skill` | `object \| null` | yes | Null for a call no skill made. |
| `flow` | `object \| null` | yes | The skill's flow. Null whenever `skill` is. |
| `totalTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero. Embeddings, reranks and transcriptions routinely report no usage at all. |
| `credits` | `integer \| null` | yes | What this call CHARGED, in credits — a credit is a millionth of a dollar — summed over the `CostEvent` rows linked to it. ⛔ THE CUSTOMER'S FIGURE, NOT KIPORY'S: this used to serve `providerCostMicroUsd`, which is what Kipory paid its vendor and is never shaped onto a `/v1` response. ⛔ Null means NO COST EVENT LANDED — the call was not free, it is unpriced, and a call that has just run sits here for a moment. |
| `latencyMs` | `integer` | yes | Wall time. On a timeout this is OUR deadline rather than the provider's answer, which is why it is never null. |
| `errorMessage` | `string \| null` | yes | The provider's own words, null on success. ⚠️ Free text from a vendor, so it is neither a closed set nor safe to parse — `errorCode` is the field to switch on. |
| `promptTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero — and it goes null INDEPENDENTLY of `totalTokens`: a provider can report a total with no split. |
| `completionTokens` | `integer \| null` | yes | Null for NOT MEASURED, on the same terms as `promptTokens`. |
| `correlationId` | `string` | yes | ⚠️ TODAY THIS EQUALS THE CALL'S OWN ID ON EVERY ROW — 114,862 of 114,862 measured on production 2026-08-25 — because the chokepoint's `?? id` fallback fires every time. It is sent because it is what the platform stored, NOT because it can yet gather the calls of one run. |
| `sessionId` | `string \| null` | yes | The end-user session, when the call was made inside one. |
| `userId` | `string \| null` | yes | The end user the call was made on behalf of. |
| `record` | `object \| null` | yes | The record this call was processing. ⛔ NO ADDRESS COMES WITH IT — unlike `flow`, which carries a slug because it has a page. A record is named so a reader recognises it, and the id is what they can search on; it is not a link. |
| `redactedPatternCounts` | `object` | yes | Pattern name → how many matches were removed before the PROMPT and the RESPONSE were stored. ⚠️ SPARSE: a pattern that matched nothing is absent rather than zero. An empty map is a MEASURED fact — the map is written on every row. ⛔ IT DOES NOT COVER `errorMessage`: the redactor runs over a provider's error text too and its counts are discarded, so a stored message may carry a `[REDACTED:…]` marker this map does not account for. |
| `stored` | `object` | yes | What was kept, how big it is, and where it went. |
| `payload` | `object` | yes | ⛔ NULL MEANS THE CALLER DID NOT ASK, which is none of the four absences inside the object. Send `payload=prompt` or `payload=response` to get one. |

### `GET /v1/projects/{nodeId}/ai-calls/rollup`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `from` | `string` | no | Only calls at or after this instant. ⚠️ `to` IS OPTIONAL and defaults to the read's own clock — a caller that wants the ledger and the rollup taken over the SAME window must send it, or each read picks its own upper bound and the band can disagree with the table under it by a round trip. |
| `to` | `string` | no | Only calls STRICTLY BEFORE this instant. |
| `origins` | `string` | no | Comma-separated `AiCall.origin` values to INCLUDE, e.g. `session,projection`. Use `unset` to name the rows whose origin is null — the largest bucket in production, and unnameable otherwise — or `all` on its own to turn the filter off entirely. Omit the parameter entirely to get the default view, which hides what a human did while building (see `excludedOrigins` on the response for exactly what was applied). |
| `outcome` | `"success" \| "error"` | no | Narrow to calls that succeeded, or to calls that failed. |
| `taskKind` | `string` | no | Narrow to one kind of model work. ⚠️ NOT AN ENUM: `AiCall.taskKind` is a text column, so a row written before a member existed is still filterable. `callLogTaskKindSchema` is what the platform emits today and is the right list to OFFER; it is not the column's domain. |
| `skillId` | `string` | no | The skill that made the call — `AiCall.skillId`, an indexed column. |
| `flowId` | `string` | no | The flow the skill belongs to. `AiCall` carries NO flow column: this resolves through `Skill.flowId` to a list of skill ids, which the implementation must do in its own statement — see the module note on what a subquery costs here. ⛔⛔ IT THEREFORE REACHES THE FLOW'S CURRENT SKILL GENERATION AND NO OTHER: `replaceFlowSkillsTx` DELETES and recreates every skill of a flow with fresh ids on each whole-graph edit, and `AiCall.skillId` is a soft link with no foreign key — so calls made before the last edit are unreachable by this filter and by `q`'s skill-name arm. Nothing on a page can detect the loss: the rollup runs the same predicate, so a band and its table agree perfectly on the truncated population. The repair is a column (`CostEvent` denormalizes `skillName` beside `skillId` for exactly this reason), not a cleverer query — once the row is gone there is nothing left to map a dead id back to a name. |
| `provider` | `string` | no | The vendor, e.g. `openai`. Separate from `model` because one vendor degrading is the question this column exists to answer. |
| `model` | `string` | no | The exact model identifier. |
| `recordId` | `string` | no | The record this call was processing, when it was processing one. |
| `userId` | `string` | no | The end user the call was made on behalf of. |
| `sessionId` | `string` | no | The session the call was made inside. ⭐ THE ONE HANDLE THAT GATHERS A CONVERSATION'S CALLS, and the most populated optional dimension on the table: 73,300 of 117,211 rows carry one (production 2026-08-26) against 53,882 for `userId` and 17,706 for `recordId`. `correlationId` reads like the field for this and is not — it equals the row's own id on every production row, as its own note records. ⚠️ Served by `@@index([sessionId, createdAt(sort: Desc)])`, which is the same shape the keyset reads in, so this narrows without a scan. |
| `correlationId` | `string` | no | The call's correlation handle. ⚠️ Measured on production 2026-08-25, `correlationId` equals the row's own id on 114,862 of 114,862 rows — the `?? id` fallback in the chokepoint's call scaffold fires every time — so today this is an id lookup wearing another name, and it cannot yet gather the calls of one run. |
| `q` | `string` | no | Case-insensitive match against the row's own text — `errorCode`, `errorMessage`, `model`, `provider` — AND the name of the skill that made the call, which is resolved to skill ids first because an `AiCall` records only the id. That set is every text column a ledger of these draws, so a reader can search for what is in front of them. ⛔ IT MUST NOT BE WIDENED TO THE PROMPT, and the reason is size rather than taste: a prompt spills to object storage past 256 kB (production 2026-08-25: 174 rows, median 567 kB, max 10.06 MB), so a match over it cannot reach a spilled payload at all and would answer confidently about a subset with no way to say which. ⚠️ None of these columns is indexed for text, so this stays a scan within whatever the other filters already narrowed to. |
| `buckets` | `"hour" \| "day"` | no | The width of one column in `buckets`. Defaults to `hour`, which is what the 24-hour strip draws. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The bounds these figures were taken over. `from` is null for an unbounded window — the caller asked for all time, and the platform will not invent a start date for a table with no reaper. |
| `totals` | `object` | yes | The window counted, under exactly the filter the request carried. |
| `latency` | `object \| null` | yes | Null when the window holds no call to measure. |
| `spend` | `object \| null` | yes | What the window cost, and how much of it the platform can speak for. ⛔ NULL WHEN `unmeasurable` IS `all` — over the row cap no cost query runs at all, and a zero here would be a positive claim that nothing was spent. `latency` is null on the same arm for the same reason. |
| `buckets` | `object[]` | yes | The window sliced into equal columns of width `buckets`, oldest first. A slice with no calls is PRESENT with zeroes rather than absent — a strip that skipped empty columns would compress quiet hours and misreport the shape of the traffic. |
| `skills` | `object[]` | yes | One row per skill that made a call in the window, so a client can place a single call against its own skill's distribution without a read per row. Absent entirely for a window with no calls. |
| `models` | `object[]` | yes | Every provider/model pair present in the window, with the model and provider narrowings RELEASED so the control that applied one can still undo it. Every other filter still applies. |
| `excluded` | `object` | yes | What the default origin view dropped, counted — the figure the ledger route deliberately cannot supply. |
| `unmeasurable` | `"failures" \| "all"` | yes | A window the platform cannot vouch for. `failures` — the calls are counted but their outcomes are not trustworthy. `all` — nothing here should be read as a measurement. `null` — these figures stand. ⛔ NOT an error: the figures beside it are the best the platform has, and this says they are a floor rather than a fact. |

### `GET /v1/projects/{nodeId}/usage`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, and the value `CostEvent.nodeId` actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d"` | no | How far back to look. Defaults to 7 days rather than the 24 hours the calls page defaults to, and the difference is measured rather than stylistic: spend accrues slowly, and a 24-hour window is empty for most live projects. |
| `scope` | `"all" \| "users" \| "design" \| "system"` | no | Whose work to count. `all` is end-user plus design-time — the two CHARGING actors. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually measured, echoed rather than left to the client. Both bounds range on `CostEvent.occurredAt` — when the work HAPPENED — which is the column every spend window and both cap gates use. |
| `totals` | `object` | yes | The window under the requested scope. ⚠️ A FLOOR, NOT A CEILING: when the meter cannot record a charge the platform serves the work for free and writes the failure down elsewhere, so spend that never landed is invisible here. |
| `buckets` | `object[]` | yes | The window sliced oldest-first. ⛔ A SLICE WITH NO SPEND IS PRESENT WITH ZEROES rather than absent: a series that skipped quiet slices would compress them and misreport the shape of the spending. |
| `kinds` | `object[]` | yes | One row per kind of work with spend in the window, costliest first. Absent entirely for a window with none. |
| `skills` | `object[]` | yes | One row per skill with spend in the window, costliest first, with the unattributed bucket among them. |

### `GET /v1/runs/{runId}/spend`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose spend to break down. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run this spend belongs to. The same heterogeneous id space `GET /v1/runs/{runId}/steps`, `/change-set` and `/flow-snapshots` take — a record attempt id, a flow run's request id, or an endpoint invocation id. |
| `credits` | `integer` | yes | The run's whole charge. ⭐ Computed from the SAME rows as `bySkill`, not by a second query, so the total and its parts cannot disagree. |
| `events` | `integer` | yes | Billable operations across the whole run. |
| `bySkill` | `object[]` | yes | Descending by charge, so the expensive step is first. ⚠️ EMPTY is a real answer with more than one cause and this route cannot tell them apart: a run of pure transforms spent nothing, a run that failed before its first billable op spent nothing, and a run that predates per-run attribution has spend that cannot be found. A caller must not draw any of the three as `0 credits` without saying which it cannot rule out. |
