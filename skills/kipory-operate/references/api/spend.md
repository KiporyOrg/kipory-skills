<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Spend

What a project spent and what will stop it. `GET /v1/credits/balance` answers on the project's host; the per-run and per-project reads answer on the api host.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/ai-calls`](#get-v1-ai-calls) |  |
| `GET` | [`/v1/ai-calls/{id}`](#get-v1-ai-calls-id) |  |
| `GET` | [`/v1/ai-calls/rollup`](#get-v1-ai-calls-rollup) |  |
| `GET` | [`/v1/credits/balance`](#get-v1-credits-balance) |  |
| `GET` | [`/v1/organizations/{nodeId}/ledger`](#get-v1-organizations-nodeid-ledger) |  |
| `GET` | [`/v1/organizations/{nodeId}/quota`](#get-v1-organizations-nodeid-quota) |  |
| `GET` | [`/v1/organizations/{nodeId}/usage`](#get-v1-organizations-nodeid-usage) |  |
| `GET` | [`/v1/projects/{nodeId}/usage`](#get-v1-projects-nodeid-usage) |  |
| `GET` | [`/v1/projects/{nodeId}/usage/events`](#get-v1-projects-nodeid-usage-events) |  |
| `GET` | [`/v1/projects/{nodeId}/usage/events.csv`](#get-v1-projects-nodeid-usage-events-csv) |  |
| `GET` | [`/v1/runs/{runId}/spend`](#get-v1-runs-runid-spend) |  |

### `GET /v1/ai-calls`

A project's model calls over a window, newest first, walked on `after`/`before` — provider, model, outcome, tokens, latency, cost and the step that made each — with fourteen narrowings. The same window added up is `GET /v1/ai-calls/rollup`; one call with its stored prompt is `GET /v1/ai-calls/{id}`; what ALL billable work cost, model calls included, is `GET /v1/projects/{nodeId}/usage`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project whose calls to read — its node id: the id `GET /v1/me/projects` lists for a signed-in person, and `GET /v1/bootstrap?project={nodeId}&sections=tenancy` answers for an API key. |
| `from` | `string` | no | Only calls at or after this instant. ⚠️ `to` IS OPTIONAL and defaults to the read's own clock — a caller that wants the call list and the rollup taken over the SAME window must send it, or each read picks its own upper bound and the band can disagree with the table under it by a round trip. |
| `to` | `string` | no | Only calls STRICTLY BEFORE this instant. |
| `origins` | `string` | no | Comma-separated `AiCall.origin` values to INCLUDE, e.g. `session,projection`. Use `unset` to name the rows whose origin is null — the largest bucket in production, and unnameable otherwise — or `all` on its own to turn the filter off entirely. Omit the parameter entirely to get the default view, which hides what a human did while building (see `excludedOrigins` on the response for exactly what was applied). |
| `outcome` | `"success" \| "error"` | no | Narrow to calls that succeeded, or to calls that failed. |
| `taskKind` | `string` | no | Narrow to one kind of model work. ⚠️ NOT AN ENUM: `AiCall.taskKind` is a text column, so a row written before a member existed is still filterable. `callLogTaskKindSchema` is what the platform emits today and is the right list to OFFER; it is not the column's domain. |
| `skillId` | `string` | no | The skill that made the call — `AiCall.skillId`, an indexed column. |
| `flowId` | `string` | no | The flow the skill belongs to. `AiCall` carries NO flow column: this resolves through `Skill.flowId` to a list of skill ids, which the implementation must do in its own statement — see the module note on what a subquery costs here. ⛔⛔ IT THEREFORE REACHES THE FLOW'S CURRENT SKILL GENERATION AND NO OTHER: `replaceFlowSkillsTx` DELETES and recreates every skill of a flow with fresh ids on each whole-graph edit, and `AiCall.skillId` is a soft link with no foreign key — so calls made before the last edit are unreachable by this filter and by `q`'s skill-key arm. Nothing on a page can detect the loss: the rollup runs the same predicate, so a band and its table agree perfectly on the truncated population. The repair is a column (`CostEvent` denormalizes `skillName` beside `skillId` for exactly this reason), not a cleverer query — once the row is gone there is nothing left to map a dead id back to a name. |
| `provider` | `string` | no | The vendor, e.g. `openai`. Separate from `model` because one vendor degrading is the question this column exists to answer. |
| `model` | `string` | no | The exact model identifier. |
| `recordId` | `string` | no | The record this call was processing, when it was processing one. |
| `userId` | `string` | no | The end user the call was made on behalf of. |
| `sessionId` | `string` | no | The session the call was made inside. ⭐ THE ONE HANDLE THAT GATHERS A CONVERSATION'S CALLS, and the most populated optional dimension on the table: 73,300 of 117,211 rows carry one (production 2026-08-26) against 53,882 for `userId` and 17,706 for `recordId`. `correlationId` reads like the field for this and is not — it equals the row's own id on every production row, as its own note records. ⚠️ Served by `@@index([sessionId, createdAt(sort: Desc)])`, which is the same shape the keyset reads in, so this narrows without a scan. |
| `correlationId` | `string` | no | The call's correlation handle. ⚠️ Measured on production 2026-08-25, `correlationId` equals the row's own id on 114,862 of 114,862 rows — the `?? id` fallback in the chokepoint's call scaffold fires every time — so today this is an id lookup wearing another name, and it cannot yet gather the calls of one run. |
| `q` | `string` | no | Case-insensitive match against the row's own text — `errorCode`, `errorMessage`, `model`, `provider` — AND the key of the skill that made the call, which is resolved to skill ids first because an `AiCall` records only the id. That set is every text column a list of these draws, so a reader can search for what is in front of them. ⛔ IT MUST NOT BE WIDENED TO THE PROMPT, and the reason is size rather than taste: a prompt spills to object storage past 256 kB (production 2026-08-25: 174 rows, median 567 kB, max 10.06 MB), so a match over it cannot reach a spilled payload at all and would answer confidently about a subset with no way to say which. ⚠️ None of these columns is indexed for text, so this stays a scan within whatever the other filters already narrowed to. |
| `sort` | `"created-at" \| "latency-ms" \| "total-tokens"` | no | The column the call list is ordered by: `created-at` (the default), `latency-ms`, or `total-tokens`. Ties break on the call id, in the same direction. ⚠️ `totalTokens` is null where the provider reported no usage, and those calls sort LAST in both directions — a null is not measured, never the smallest figure. Credits are not a sort: they are summed from cost events at read time, not stored on the call. |
| `order` | `"asc" \| "desc"` | no | Which way `sort` runs. Defaults to `desc` — newest, slowest, largest first. |
| `after` | `string` | no | The NEXT page along this ordering — pass back the `nextCursor` you were given. Opaque: read it from a response, never build one. ⛔ A cursor carries the ordering it was minted in, and replaying it under a different `sort` or `order` is refused (400) rather than paged from a position that ordering does not have. |
| `before` | `string` | no | The PREVIOUS page along this ordering — pass back the `prevCursor` you were given. Refused together with `after`: the two name opposite directions from one row, so a request carrying both has not said which it wants. |
| `limit` | `integer` | no | How many calls per page, up to 100. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `calls` | `object[]` | yes | In the ordering `sort` and `order` name, whichever direction the page was reached from. |
| `sort` | `"created-at" \| "latency-ms" \| "total-tokens"` | yes | The column this page was ordered by — the one sent, or `created-at`. |
| `order` | `"asc" \| "desc"` | yes | Which way `sort` ran — the one sent, or `desc`. |
| `paging` | `null` | yes | Always NULL here. A page count needs a COUNT over an unreapered call table, paid on every click; `rollup.totals.calls` answers the same question once, for the same window. Read `null` as `cursor walking only`, never as `not measured yet`. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the next page along this ordering. Null on the last. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the previous page along this ordering. Null on the first. |
| `excludedOrigins` | `string[]` | yes | The `origin` values this request filtered OUT, so the page can say so instead of quietly under-reporting. Empty when the caller named its own `origins`. ⚠️ A statement about the FILTER, not about the data: it does not claim rows with these origins exist in the window. The count of what was dropped needs an aggregate this route does not run. |

Each item of `calls`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The `AiCall` row id. |
| `createdAt` | `string` | yes | When the call was recorded. |
| `taskKind` | `string` | yes | The kind of model work. ⚠️ A STRING, not the enum: `AiCall.taskKind` is a text column and a row written before a member existed must still render. Match against `callLogTaskKindSchema` for the kinds the platform emits today, and show anything else verbatim. |
| `origin` | `string \| null` | yes | What made the call — free text, null for the majority of rows. See `NON_PRODUCTION_ORIGINS` for why this reaches the client at all rather than being filtered away silently. |
| `provider` | `string` | yes | The vendor that served it. |
| `model` | `string` | yes | The exact model identifier. |
| `outcome` | `"success" \| "error"` | yes | Whether the call came back. |
| `errorCode` | `"rate-limit" \| "quota-exhausted" \| "transient-network" \| "provider-error" \| "schema-validation" \| "timeout" \| "unknown"` | yes | The failure bucket, null on success. An unrecognised stored code is normalised to `unknown` rather than passed through, so a client can switch on this exhaustively. |
| `skill` | `object \| null` | yes | Null for a call no skill made. |
| `flow` | `object \| null` | yes | The skill's flow. Null whenever `skill` is. |
| `record` | `object \| null` | yes | The record this call was processing, null when it was processing none. A call with no skill and no flow can be most of a busy project's traffic (`origin: projection`), and the record is the only thing that says WHAT such a call was for. ⚠️ THE NAME IS BEST-EFFORT AND MAY BE NULL: it is read from `derived.title`, then `data.title`, then a truncated `data.text`, which are CONVENTIONS a record type is free to mean something else by. A null name is not a missing record — the id is still the handle. |
| `totalTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero. Embeddings, reranks and transcriptions routinely report no usage at all. |
| `credits` | `integer \| null` | yes | What this call CHARGED, in credits — a credit is a millionth of a dollar — summed over the `CostEvent` rows linked to it. ⛔ THE CUSTOMER'S FIGURE, NOT KIPORY'S: this used to serve `providerCostMicroUsd`, which is what Kipory paid its vendor and is never shaped onto a `/v1` response. ⛔ Null means NO COST EVENT LANDED — the call was not free, it is unpriced, and a call that has just run sits here for a moment. |
| `latencyMs` | `integer` | yes | Wall time. On a timeout this is OUR deadline rather than the provider's answer, which is why it is never null. |
| `redactedPatternCount` | `integer` | yes | How many distinct redaction patterns matched before this call was stored. Zero is a measured zero here: the counts map is written on every row. |

### `GET /v1/ai-calls/{id}`

One model call in full — the list's row plus its step, flow, record, cost and redaction counts; `payload=prompt|response` also returns that stored payload. 404 for an id you cannot see.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The model call's id, as the call list sends it. Globally unique; the project it attributes to is resolved from the row. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `payload` | `"prompt" \| "response"` | no | Include one stored payload with the call. Omit it for the metadata alone — the response's `payload` is then null, meaning NOT ASKED FOR rather than absent. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The `AiCall` row id. |
| `createdAt` | `string` | yes | When the call was recorded. |
| `taskKind` | `string` | yes | The kind of model work. ⚠️ A STRING, not the enum: `AiCall.taskKind` is a text column and a row written before a member existed must still render. Match against `callLogTaskKindSchema` for the kinds the platform emits today, and show anything else verbatim. |
| `origin` | `string \| null` | yes | What made the call — free text, null for the majority of rows. See `NON_PRODUCTION_ORIGINS` for why this reaches the client at all rather than being filtered away silently. |
| `provider` | `string` | yes | The vendor that served it. |
| `model` | `string` | yes | The exact model identifier. |
| `outcome` | `"success" \| "error"` | yes | Whether the call came back. |
| `errorCode` | `"rate-limit" \| "quota-exhausted" \| "transient-network" \| "provider-error" \| "schema-validation" \| "timeout" \| "unknown"` | yes | The failure bucket, null on success. An unrecognised stored code is normalised to `unknown` rather than passed through, so a client can switch on this exhaustively. |
| `skill` | `object \| null` | yes | Null for a call no skill made. |
| `flow` | `object \| null` | yes | The skill's flow. Null whenever `skill` is. |
| `record` | `object \| null` | yes | The record this call was processing. ⛔ NO ADDRESS COMES WITH IT — unlike `flow`, which carries a key because it has a page. A record is named so a reader recognises it, and the id is what they can search on; it is not a link. |
| `totalTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero. Embeddings, reranks and transcriptions routinely report no usage at all. |
| `credits` | `integer \| null` | yes | What this call CHARGED, in credits — a credit is a millionth of a dollar — summed over the `CostEvent` rows linked to it. ⛔ THE CUSTOMER'S FIGURE, NOT KIPORY'S: this used to serve `providerCostMicroUsd`, which is what Kipory paid its vendor and is never shaped onto a `/v1` response. ⛔ Null means NO COST EVENT LANDED — the call was not free, it is unpriced, and a call that has just run sits here for a moment. |
| `latencyMs` | `integer` | yes | Wall time. On a timeout this is OUR deadline rather than the provider's answer, which is why it is never null. |
| `project` | `string` | yes | The project NODE the call belongs to (`OrgNode.id`) — the `project` `GET /v1/ai-calls` takes. A client showing the call under a project it chose compares the two. |
| `errorMessage` | `string \| null` | yes | The provider's own words, null on success. ⚠️ Free text from a vendor, so it is neither a closed set nor safe to parse — `errorCode` is the field to switch on. |
| `promptTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero — and it goes null INDEPENDENTLY of `totalTokens`: a provider can report a total with no split. |
| `completionTokens` | `integer \| null` | yes | Null for NOT MEASURED, on the same terms as `promptTokens`. |
| `cachedPromptTokens` | `integer \| null` | yes | Prompt tokens the provider served from its cache — part of `promptTokens`, not in addition to it. Null when the provider reported nothing, which is not zero cache hits. |
| `cacheWriteTokens` | `integer \| null` | yes | Prompt tokens written into the provider's cache (reported by providers that bill a cache write apart). Null when not reported. |
| `reasoningTokens` | `integer \| null` | yes | Hidden reasoning tokens — part of `completionTokens`. Null when the provider reported nothing. |
| `correlationId` | `string` | yes | ⚠️ TODAY THIS EQUALS THE CALL'S OWN ID ON EVERY ROW. It is sent because it is what the platform stored, NOT because it can yet gather the calls of one run. |
| `sessionId` | `string \| null` | yes | The end-user session, when the call was made inside one. |
| `userId` | `string \| null` | yes | The end user the call was made on behalf of. |
| `redactedPatternCounts` | `object` | yes | Pattern name → how many matches were removed before the PROMPT and the RESPONSE were stored. ⚠️ SPARSE: a pattern that matched nothing is absent rather than zero. An empty map is a MEASURED fact — the map is written on every row. ⛔ IT DOES NOT COVER `errorMessage`: the redactor runs over a provider's error text too and its counts are discarded, so a stored message may carry a `[REDACTED:…]` marker this map does not account for. |
| `stored` | `object` | yes | What was kept, how big it is, and where it went. |
| `payload` | `object` | yes | ⛔ NULL MEANS THE CALLER DID NOT ASK, which is none of the four absences inside the object. Send `payload=prompt` or `payload=response` to get one. |

### `GET /v1/ai-calls/rollup`

The same window and narrowings as `GET /v1/ai-calls`, added up: counts, failures by error code, latency spread, spend, a volume strip and one row per step. Totals exactly the rows the list pages through.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project whose calls to read — its node id: the id `GET /v1/me/projects` lists for a signed-in person, and `GET /v1/bootstrap?project={nodeId}&sections=tenancy` answers for an API key. |
| `from` | `string` | no | Only calls at or after this instant. ⚠️ `to` IS OPTIONAL and defaults to the read's own clock — a caller that wants the call list and the rollup taken over the SAME window must send it, or each read picks its own upper bound and the band can disagree with the table under it by a round trip. |
| `to` | `string` | no | Only calls STRICTLY BEFORE this instant. |
| `origins` | `string` | no | Comma-separated `AiCall.origin` values to INCLUDE, e.g. `session,projection`. Use `unset` to name the rows whose origin is null — the largest bucket in production, and unnameable otherwise — or `all` on its own to turn the filter off entirely. Omit the parameter entirely to get the default view, which hides what a human did while building (see `excludedOrigins` on the response for exactly what was applied). |
| `outcome` | `"success" \| "error"` | no | Narrow to calls that succeeded, or to calls that failed. |
| `taskKind` | `string` | no | Narrow to one kind of model work. ⚠️ NOT AN ENUM: `AiCall.taskKind` is a text column, so a row written before a member existed is still filterable. `callLogTaskKindSchema` is what the platform emits today and is the right list to OFFER; it is not the column's domain. |
| `skillId` | `string` | no | The skill that made the call — `AiCall.skillId`, an indexed column. |
| `flowId` | `string` | no | The flow the skill belongs to. `AiCall` carries NO flow column: this resolves through `Skill.flowId` to a list of skill ids, which the implementation must do in its own statement — see the module note on what a subquery costs here. ⛔⛔ IT THEREFORE REACHES THE FLOW'S CURRENT SKILL GENERATION AND NO OTHER: `replaceFlowSkillsTx` DELETES and recreates every skill of a flow with fresh ids on each whole-graph edit, and `AiCall.skillId` is a soft link with no foreign key — so calls made before the last edit are unreachable by this filter and by `q`'s skill-key arm. Nothing on a page can detect the loss: the rollup runs the same predicate, so a band and its table agree perfectly on the truncated population. The repair is a column (`CostEvent` denormalizes `skillName` beside `skillId` for exactly this reason), not a cleverer query — once the row is gone there is nothing left to map a dead id back to a name. |
| `provider` | `string` | no | The vendor, e.g. `openai`. Separate from `model` because one vendor degrading is the question this column exists to answer. |
| `model` | `string` | no | The exact model identifier. |
| `recordId` | `string` | no | The record this call was processing, when it was processing one. |
| `userId` | `string` | no | The end user the call was made on behalf of. |
| `sessionId` | `string` | no | The session the call was made inside. ⭐ THE ONE HANDLE THAT GATHERS A CONVERSATION'S CALLS, and the most populated optional dimension on the table: 73,300 of 117,211 rows carry one (production 2026-08-26) against 53,882 for `userId` and 17,706 for `recordId`. `correlationId` reads like the field for this and is not — it equals the row's own id on every production row, as its own note records. ⚠️ Served by `@@index([sessionId, createdAt(sort: Desc)])`, which is the same shape the keyset reads in, so this narrows without a scan. |
| `correlationId` | `string` | no | The call's correlation handle. ⚠️ Measured on production 2026-08-25, `correlationId` equals the row's own id on 114,862 of 114,862 rows — the `?? id` fallback in the chokepoint's call scaffold fires every time — so today this is an id lookup wearing another name, and it cannot yet gather the calls of one run. |
| `q` | `string` | no | Case-insensitive match against the row's own text — `errorCode`, `errorMessage`, `model`, `provider` — AND the key of the skill that made the call, which is resolved to skill ids first because an `AiCall` records only the id. That set is every text column a list of these draws, so a reader can search for what is in front of them. ⛔ IT MUST NOT BE WIDENED TO THE PROMPT, and the reason is size rather than taste: a prompt spills to object storage past 256 kB (production 2026-08-25: 174 rows, median 567 kB, max 10.06 MB), so a match over it cannot reach a spilled payload at all and would answer confidently about a subset with no way to say which. ⚠️ None of these columns is indexed for text, so this stays a scan within whatever the other filters already narrowed to. |
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
| `excluded` | `object` | yes | What the default origin view dropped, counted — the figure the call list deliberately cannot supply. |
| `unmeasurable` | `"failures" \| "all"` | yes | A window the platform cannot vouch for. `failures` — the calls are counted but their outcomes are not trustworthy. `all` — nothing here should be read as a measurement. `null` — these figures stand. ⛔ NOT an error: the figures beside it are the best the platform has, and this says they are a floor rather than a fact. |

Each item of `buckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The instant the bucket OPENS, UTC. Its width is `buckets`. |
| `calls` | `integer` | yes | Calls that landed inside this column. A measured zero — an empty column is present rather than omitted. |
| `failed` | `integer` | yes | A subset of `calls`, never a second total — the strip stacks it at the base of the same column rather than beside it. |

Each item of `skills`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skillId` | `string` | yes | The skill these calls were made by. |
| `skillKey` | `string \| null` | yes | The skill's key. Null when the skill has been deleted. |
| `flowId` | `string \| null` | yes | The flow that holds the skill. Null when the skill is gone, so the row can still be counted without claiming an address for it. |
| `calls` | `integer` | yes | Calls this skill made in the window, under the same filter. |
| `failed` | `integer` | yes | A subset of this skill's `calls`, never a second total. |
| `p50Ms` | `integer \| null` | yes | Null when too few calls to characterise — never zero. |
| `p95Ms` | `integer \| null` | yes | Null exactly when `p50Ms` is. The pair is decided together. |
| `answeredP50Ms` | `integer \| null` | yes | The median over this skill's calls that answered (did not fail). Null when too few answered to characterise — never zero. `p50Ms` is over every call, failed ones included. |
| `credits` | `integer` | yes | What this skill's calls CHARGED over the window, in credits. ⚠️ A FLOOR, not a total: read it beside `callsWithNoCostEvent`. |
| `callsWithNoCostEvent` | `integer` | yes | This skill's calls with no `CostEvent`. ⛔ AN ABSENT SUM IS NOT A ZERO SUM — without this figure a skill whose billing dropped reports a confident `$0.0000` and sorts as the cheapest thing in the window. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `provider` | `string` | yes | The vendor, e.g. `openai`. Free text, not an enum. |
| `model` | `string` | yes | The exact model identifier the call was made against. |
| `calls` | `integer` | yes | How many calls in the window used this pair. Always at least one — a pair with no calls is absent rather than zero. |

### `GET /v1/credits/balance`

Your own standing: the balance of the wallet that pays for you (`active`, `over-soft-cap`, `suspended`) — your own wallet in the project when it gives its members wallets (`wallet: "member"`, with `nextGrantAt`), else the one the project settles to, its own or the nearest above it, which `payer` names — and your per-user spend cap and what you have consumed of it. For a billable bearer credential only. An organization's spend is `GET /v1/organizations/{nodeId}/usage` (ADMIN); one project's is `GET /v1/projects/{nodeId}/usage`; the installation's is `GET /v1/spend` (staff).

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `creditsRemaining` | `integer` | yes | What is left in the wallet, in credits (one credit is one micro-USD). |
| `softCapCredits` | `integer` | yes | How far BELOW zero the balance may go before requests start being refused with 402 — headroom, not a second balance. |
| `status` | `"active" \| "over-soft-cap" \| "suspended"` | yes | Whether this wallet may still pay for work. `active` is fine; `over-soft-cap` means the balance has passed the agreed floor and requests are being refused with 402; `suspended` means the account is stopped for a reason other than balance. |
| `wallet` | `"member" \| "node"` | yes | Whose wallet this is: `member` is your own wallet in this project, funded by the project's grants and refused at zero; `node` is the wallet the project settles to, which `payer` names. |
| `nextGrantAt` | `string \| null` | yes | When the project's next periodic grant to your member wallet is due, or null when `wallet` is `node` or the project makes no periodic grant. |
| `payer` | `object \| null` | yes | Where the wallet is held. When `wallet` is `node`: the nearest node at or above the project that holds one — a project without its own wallet draws on its organization's, so a new project can open with a balance that is not zero. When `wallet` is `member`: this project. Null when the request names no project or no wallet resolves. |
| `perUserSpendCap` | `integer \| null` | yes | The ceiling on what YOU personally may spend, or null when the project sets none. ⚠️ NOT a second balance: it limits your share of the wallet above, and both gates must pass independently. |
| `perUserSpendConsumed` | `integer` | yes | What you have spent against that ceiling in the current window. Always present, and 0 rather than absent for a first-time caller — so 'no cap' is never confused with 'no data'. |
| `perUserSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | yes | The window `perUserSpendConsumed` covers. Without it that figure is ambiguous where it matters most: '8 of 10' is a wall about to be hit if the window is LIFETIME, and an ordinary month if it is monthly. |
| `perUserSpendWindowStart` | `string \| null` | yes | The instant the consumed figure was actually summed from, or null for a lifetime window. Read it rather than recomputing it from the period — recomputing is how a client shows a window the server did not enforce. |

### `GET /v1/organizations/{nodeId}/ledger`

The organization wallet's ledger — every credit movement (usage debits, grants, adjustments) and configuration change, newest first, walked on `after`/`before`. Requires **ADMIN**. What the charges were for is `GET /v1/organizations/{nodeId}/usage`; the per-charge statement is `GET /v1/projects/{nodeId}/usage/events`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization's OrgNode id — the same id `/v1/nodes/{nodeId}` takes. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page OLDER than this entry — pass back the `nextCursor` you were given. Omit for the newest page. |
| `before` | `string` | no | The page NEWER than this entry — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many entries per page, up to 200. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `payerNodeId` | `string` | yes | The wallet's node — always the organization itself on this route. |
| `entries` | `object[]` | yes | Newest first, whichever direction the page was walked. |
| `paging` | `null` | yes | Always `null`: the history merges two tables and a page count would be two unbounded counts per click. Walk by the cursors. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

Each item of `entries`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"movement"` | yes | Credits moved: a charge, a grant, an adjustment or a transfer. |
| `at` | `string` | yes | When the credits moved. |
| `id` | `string` | yes | The entry's id: the charge's id for a `usage-debit`, the ledger row's id for a grant or an adjustment. |
| `amount` | `integer` | yes | Signed credits: negative for a debit, positive for a grant or an adjustment that returned credits. |
| `type` | `"usage-debit" \| "grant" \| "adjustment" \| "transfer"` | yes | `usage-debit` is metered work; `grant` and `adjustment` are operator movements; `transfer` is credits moved to or from another wallet — a grant to a member's wallet, or what came back from one. |
| `causeRef` | `string` | yes | What caused the movement — the charge's id for a `usage-debit`, or an operator movement's own reference. |
| `counterparty` | `object \| null` | yes | The other wallet of a `transfer`: where the credits went (a negative amount) or came from (a positive one). Null on every other movement. |
| `actor` | `string` | yes | Who changed it — `user:<id>`, an operator email, or `system:<slug>`. |
| `actorPerson` | `object \| null` | yes | The person a `user:<id>` actor names, as their account reads now — usually a Kipory operator, since operators are who change a wallet. Shown to the organization's admins on the terms the member roster already names platform staff to them. Null for an email or `system:<slug>` actor, and for a person whose account is gone. |
| `before` | `object \| null` | yes | The fields before the change, as strings. `null` on creation. |
| `after` | `object` | yes | The fields after the change, as strings. |

### `GET /v1/organizations/{nodeId}/quota`

Today's consumption of each shared external quota pool (e.g. `youtube-data-api`) at this organization, with the per-project split (`project` is its node id), the daily allowance and when it resets. Requires a membership here. The installation-wide view is `GET /v1/ingest/quota` (staff).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization node whose quota to read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resources` | `object[]` | yes | One entry per external quota pool this organization draws on. |

Each item of `resources`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which quota pool, e.g. `youtube-data-api`. |
| `limit` | `integer \| null` | yes | Daily allowance. Null means unlimited — no policy applies. |
| `used` | `integer` | yes | Units the GOVERNING counter consumed this quota-day. With no policy row that counter is shared by every project beneath the tenant anchor — see `countedAtNodeId`. Do not render it as one project's consumption; use `projects[]` for that. `sum(projects[].used)` always equals this. |
| `countedAtNodeId` | `string` | yes | The node whose counter `used` belongs to — not necessarily the node you asked about. |
| `resetsAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `projects` | `object[]` | yes | Per-project split of `used`, summing exactly to it. |

### `GET /v1/organizations/{nodeId}/usage`

What the projects under this organization spent over a window, by kind, model, project, person or key, with the paying wallet's state, runway and the ceiling nearest to refusing work. `window=custom` takes `from`/`to` instants (`to` exclusive). Requires **ADMIN**. The wallet's movements are `GET /v1/organizations/{nodeId}/ledger`; one project's view is `GET /v1/projects/{nodeId}/usage`; your own spend is `GET /v1/credits/balance`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization's OrgNode id — the same id `/v1/nodes/{nodeId}` takes. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days rather than the 24 hours the calls page defaults to, and the difference is measured rather than stylistic: spend accrues slowly, and a 24-hour window is empty for most live projects. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "system"` | no | Whose work to count. `all` is end-user, design-time and held data — the three CHARGING actors. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | no | Narrow to one kind of work. |
| `skill` | `string` | no | Narrow to one skill, by its NAME — the key a breakdown by skill hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `handler` | `string` | no | Narrow to the paid fetches one vendor handler made. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |
| `project` | `string` | no | Narrow to one project, by its OrgNode id — the key a breakdown by project hands back. A node outside this organization's subtree is refused with a 404. |
| `by` | `"project" \| "kind" \| "skill" \| "model" \| "handler" \| "user" \| "key"` | no | Which dimension `breakdown` splits the window by. Defaults to the project, which is the split only this height can show. |
| `compare` | `"1"` | no | Pass `1` to also measure the period of the same length immediately before this window. `prior` and `priorBuckets` are null without it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually measured, echoed rather than left to the client. Both bounds range on `CostEvent.occurredAt` — when the work HAPPENED — which is the column every spend window and both cap gates use. |
| `readOn` | `"credits" \| "events"` | yes | The magnitude this figure is read on under the requested scope. `credits` wherever the scope's work can carry a charge; `events` where every charge is zero by construction — the platform's own work — so a figure drawn on credits there would be a window of zeros. |
| `totals` | `object` | yes | The subtree under the requested scope and narrowing. A FLOOR, not a ceiling, for the reason the project route gives: spend the meter could not record is invisible here. |
| `prior` | `object \| null` | yes | The period before, measured under the same scope and narrowing. `null` unless `compare=1` was passed. |
| `buckets` | `object[]` | yes | The window sliced oldest-first, quiet slices present as zeroes. |
| `priorBuckets` | `object[] \| null` | yes | The prior period sliced the same way, one per slice of `buckets`. `null` unless `compare=1` was passed. |
| `kinds` | `object[]` | yes | One row per kind of work with spend in the window, costliest first. |
| `breakdown` | `object` | yes | The window split along the dimension `by` asked for. |
| `narrowed` | `object` | yes | The narrowing the server applied, echoed so a client draws exactly the chips that are in force. |
| `models` | `object[]` | yes | Every model with calls in the window across the subtree, under the scope and narrowing, costliest first. |
| `projects` | `object[]` | yes | Every project in the subtree, by name. |
| `nearestCap` | `object \| null` | yes | The ceiling closest to refusing across every project: one already refusing first, then the highest share. Only a ceiling with something consumed against it — or one already refusing — is ranked. `null` when no such ceiling exists, whether because none is set or nothing has been consumed; `projects[].caps` says which. |
| `payer` | `object \| null` | yes | The wallet that pays for this organization's work — its own, or the ancestor's it bills up to. `null` when no wallet resolves anywhere on the chain, in which case the platform serves the work unbilled and records the fact elsewhere. |
| `hours` | `object[]` | yes | Billable events by UTC weekday and hour across the window, under the scope and narrowing — every kind of work but handler runs, which are most of the events and charge nothing. Only cells with events are listed. |

Each item of `buckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The slice's UTC start. |
| `credits` | `integer` | yes | The slice's total charge. |
| `events` | `integer` | yes | The slice's billable event COUNT. ⛔ CARRIED ON EVERY SCOPE, NOT ONLY `system`, so the series is self-describing: a client picks the magnitude its scope calls for rather than knowing which field is meaningful on which arm. On `system` it is the ONLY meaningful one — every charge there is zero by construction. |
| `byKind` | `object[]` | yes | The slice's total, split the same way `kinds` splits the window. Only kinds with activity in THIS slice appear; a client stacking a fixed set of bands reads a missing kind as zero for the slice. |

Each item of `priorBuckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The prior slice's UTC start. |
| `credits` | `integer` | yes | The prior slice's total charge. |
| `events` | `integer` | yes | The prior slice's billable event count. |

Each item of `kinds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventType` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | yes | The kind of work that was charged. |
| `credits` | `integer` | yes | What this kind cost over the window. `0` is a measured answer — the work happened and priced to nothing — and is not the same as the kind being absent from the array. |
| `events` | `integer` | yes | How many billable events produced that figure. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the handler runs, vector writes and storage ticks recorded at no charge. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `model` | `string` | yes | The model id the calls named. |
| `credits` | `integer` | yes | What its calls cost over the window. |
| `events` | `integer` | yes | Its billable events — a generation writes one per direction, so this is not the call count. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the handler runs, vector writes and storage ticks recorded at no charge. |
| `calls` | `integer` | yes | Distinct model calls those events belong to. |
| `tokens` | `integer` | yes | Tokens the calls reported, input and output together. `0` for a model priced per minute or per search unit, which reports none. |

Each item of `projects`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `name` | `string` | yes | The project's name. |
| `credits` | `integer` | yes | What it spent over the window under the scope and every narrowing but `project` — so the list keeps every project when the figure is narrowed to one. |
| `charged` | `integer` | yes | How many of its events carried a charge above zero. |
| `payer` | `object \| null` | yes | The wallet it settles to — its own, or the organization's — under the same balance rule as the organization's own payer. |
| `caps` | `object` | yes | The project's spend ceilings and how close each is. Measured on the ceilings' own windows, not the page's. |

Each item of `hours`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `weekday` | `integer` | yes | ISO weekday in UTC — 1 is Monday, 7 is Sunday. |
| `hour` | `integer` | yes | The UTC hour, 0–23. |
| `events` | `integer` | yes | Events in that weekday-hour over the whole window. |

### `GET /v1/projects/{nodeId}/usage`

What one project spent over a window, by kind of billable work — split by kind, skill, model, handler, user or key, with the prior period on `compare=1`, its caps and its payer. `window=custom` takes `from`/`to` instants (`to` exclusive). The charges behind the figure are `GET /v1/projects/{nodeId}/usage/events`; model calls alone are `GET /v1/ai-calls`; one run's cost by step is `GET /v1/runs/{runId}/spend`; the whole organization is `GET /v1/organizations/{nodeId}/usage`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, and the value `CostEvent.nodeId` actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days rather than the 24 hours the calls page defaults to, and the difference is measured rather than stylistic: spend accrues slowly, and a 24-hour window is empty for most live projects. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "system"` | no | Whose work to count. `all` is end-user, design-time and held data — the three CHARGING actors. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | no | Narrow to one kind of work. |
| `skill` | `string` | no | Narrow to one skill, by its NAME — the key a breakdown by skill hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `handler` | `string` | no | Narrow to the paid fetches one vendor handler made. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |
| `by` | `"kind" \| "skill" \| "model" \| "handler" \| "user" \| "key"` | no | Which dimension `breakdown` splits the window by. Defaults to the kind of work, which is the split the other spend pages cannot show. |
| `compare` | `"1"` | no | Pass `1` to also measure the period of the same length immediately before this window. `prior` and `priorBuckets` are null without it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually measured, echoed rather than left to the client. Both bounds range on `CostEvent.occurredAt` — when the work HAPPENED — which is the column every spend window and both cap gates use. |
| `readOn` | `"credits" \| "events"` | yes | The magnitude this figure is read on under the requested scope. `credits` wherever the scope's work can carry a charge; `events` where every charge is zero by construction — the platform's own work — so a figure drawn on credits there would be a window of zeros. |
| `totals` | `object` | yes | The window under the requested scope and narrowing. ⚠️ A FLOOR, NOT A CEILING: when the meter cannot record a charge the platform serves the work for free and writes the failure down elsewhere, so spend that never landed is invisible here. |
| `prior` | `object \| null` | yes | The period before, measured under the same scope and narrowing. `null` unless `compare=1` was passed. |
| `buckets` | `object[]` | yes | The window sliced oldest-first. ⛔ A SLICE WITH NO SPEND IS PRESENT WITH ZEROES rather than absent: a series that skipped quiet slices would compress them and misreport the shape of the spending. |
| `priorBuckets` | `object[] \| null` | yes | The prior period sliced the same way, one slice per slice of `buckets` and in the same order, so the two can be drawn side by side without alignment. `null` unless `compare=1` was passed. |
| `kinds` | `object[]` | yes | One row per kind of work with spend in the window, costliest first. Absent entirely for a window with none. Always present whatever `by` says, because the slices are stacked by kind. |
| `breakdown` | `object` | yes | The window split along the dimension `by` asked for. |
| `narrowed` | `object` | yes | The narrowing the server applied, echoed so a client draws exactly the chips that are in force and never infers them from its own URL. |
| `models` | `object[]` | yes | Every model with calls in the window under the scope and narrowing, costliest first. |
| `caps` | `object` | yes | The project's spend ceilings and how close each is. Measured on the ceilings' own windows, not the page's. |
| `payer` | `object \| null` | yes | The wallet this project's work settles to. `null` when no wallet resolves anywhere above it, in which case the work is served unbilled and the platform records the fact elsewhere. |
| `hours` | `object[]` | yes | Billable events by UTC weekday and hour across the window, under the scope and narrowing — every kind of work but handler runs, which are most of the events and charge nothing. Only cells with events are listed. |

Each item of `buckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The slice's UTC start. |
| `credits` | `integer` | yes | The slice's total charge. |
| `events` | `integer` | yes | The slice's billable event COUNT. ⛔ CARRIED ON EVERY SCOPE, NOT ONLY `system`, so the series is self-describing: a client picks the magnitude its scope calls for rather than knowing which field is meaningful on which arm. On `system` it is the ONLY meaningful one — every charge there is zero by construction. |
| `byKind` | `object[]` | yes | The slice's total, split the same way `kinds` splits the window. Only kinds with activity in THIS slice appear; a client stacking a fixed set of bands reads a missing kind as zero for the slice. |

Each item of `priorBuckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The prior slice's UTC start. |
| `credits` | `integer` | yes | The prior slice's total charge. |
| `events` | `integer` | yes | The prior slice's billable event count. |

Each item of `kinds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `eventType` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | yes | The kind of work that was charged. |
| `credits` | `integer` | yes | What this kind cost over the window. `0` is a measured answer — the work happened and priced to nothing — and is not the same as the kind being absent from the array. |
| `events` | `integer` | yes | How many billable events produced that figure. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the handler runs, vector writes and storage ticks recorded at no charge. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `model` | `string` | yes | The model id the calls named. |
| `credits` | `integer` | yes | What its calls cost over the window. |
| `events` | `integer` | yes | Its billable events — a generation writes one per direction, so this is not the call count. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the handler runs, vector writes and storage ticks recorded at no charge. |
| `calls` | `integer` | yes | Distinct model calls those events belong to. |
| `tokens` | `integer` | yes | Tokens the calls reported, input and output together. `0` for a model priced per minute or per search unit, which reports none. |

Each item of `hours`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `weekday` | `integer` | yes | ISO weekday in UTC — 1 is Monday, 7 is Sunday. |
| `hour` | `integer` | yes | The UTC hour, 0–23. |
| `events` | `integer` | yes | Events in that weekday-hour over the whole window. |

### `GET /v1/projects/{nodeId}/usage/events`

The project's statement — every charge under the same window and narrowings as `GET /v1/projects/{nodeId}/usage`, newest first, walked on `after`/`before`, each with what made it and what it cost. As a file: `GET /v1/projects/{nodeId}/usage/events.csv`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, and the value `CostEvent.nodeId` actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days rather than the 24 hours the calls page defaults to, and the difference is measured rather than stylistic: spend accrues slowly, and a 24-hour window is empty for most live projects. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "system"` | no | Whose work to count. `all` is end-user, design-time and held data — the three CHARGING actors. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | no | Narrow to one kind of work. |
| `skill` | `string` | no | Narrow to one skill, by its NAME — the key a breakdown by skill hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `handler` | `string` | no | Narrow to the paid fetches one vendor handler made. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |
| `after` | `string` | no | The page OLDER than this row — pass back the `nextCursor` you were given. Omit for the newest page. |
| `before` | `string` | no | The page NEWER than this row — pass back the `prevCursor` you were given. Refused together with `after`: they name opposite directions from one row, so a request carrying both has not said which it wants. |
| `limit` | `integer` | no | How many charges per page, up to 200. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually listed, echoed — the same frame the usage figure under the same query measures. |
| `events` | `object[]` | yes | This page of charges, newest first by `occurredAt`. |
| `paging` | `null` | yes | Always NULL here. A page count needs a COUNT over the window on every page, which grows with the window, so this route declines it and walks with `after`/`before` instead. Read `null` as `cursor walking only`, never as `not measured yet`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |

Each item of `events`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The charge's id. |
| `occurredAt` | `string` | yes | When the work happened — the instant the window ranges on and the statement is ordered by. |
| `createdAt` | `string` | yes | When the charge was recorded. Later than `occurredAt` for a retried or backfilled row. |
| `eventType` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | yes | What kind of work was charged for. |
| `actor` | `"request" \| "design" \| "system" \| "holding"` | yes | Whose work: `request` an end user's, `design` design-time, `system` the platform's own, which charges nobody; `holding` what the project stores — files and vectors — charged by the daily held tick with no end user behind it. |
| `credits` | `integer` | yes | What the project was charged for this event, in credits. `0` is a measured charge — a free or platform-actor row — not an absence. |
| `skillId` | `string \| null` | yes | The skill row that spent it, or null outside any skill. ⚠️ Ids fragment on every flow edit; `skillName` is the key that totals. |
| `skillName` | `string \| null` | yes | The skill's name, frozen at charge time; null outside any skill. |
| `model` | `string \| null` | yes | The model a priced AI call named, lifted out of `details`; null for work that named none. |
| `handler` | `string \| null` | yes | The vendor handler that made a paid fetch, lifted out of `details`; null for every other kind. |
| `userId` | `string \| null` | yes | The end user whose request caused it, or null. |
| `userLabel` | `string \| null` | yes | That user's name, else their email, else null when the user could not be resolved — never the id repeated. |
| `apiKeyId` | `string \| null` | yes | The API key that made the call, or null. |
| `apiKeyLabel` | `string \| null` | yes | That key's display name, or null when it could not be resolved. |
| `runId` | `string \| null` | yes | The run this charge belongs to: a flow run (`GET /v1/runs/{runId}`), or the eval run whose case or scorer spent it (`GET /v1/eval-runs/{id}`). Null for spend with no run — a held tick, a design-plane preview, a row written before the column. |
| `aiCallId` | `string \| null` | yes | The logged model call behind an AI charge, or null. |
| `recordId` | `string \| null` | yes | The record the work was about, or null. |
| `requestId` | `string \| null` | yes | Groups every charge from one inbound request; null for a charge with no originating request. |
| `details` | `object` | yes | The charge's own particulars, as the meter wrote them — units, the rate that priced them, the model or handler named. Shape varies by kind; a client reads what it recognises and prints nothing for the rest. |

### `GET /v1/projects/{nodeId}/usage/events.csv`

The statement of `GET /v1/projects/{nodeId}/usage/events` as CSV, newest first, capped at the export limit and saying when it cut. Page the JSON route for more.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, and the value `CostEvent.nodeId` actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days rather than the 24 hours the calls page defaults to, and the difference is measured rather than stylistic: spend accrues slowly, and a 24-hour window is empty for most live projects. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "system"` | no | Whose work to count. `all` is end-user, design-time and held data — the three CHARGING actors. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "handler-run" \| "transcription" \| "vendor-fetch" \| "rerank"` | no | Narrow to one kind of work. |
| `skill` | `string` | no | Narrow to one skill, by its NAME — the key a breakdown by skill hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `handler` | `string` | no | Narrow to the paid fetches one vendor handler made. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |

**Response `200`**

_No fields._

### `GET /v1/runs/{runId}/spend`

What one run cost, and which step spent it. `0` for a run that spent nothing; `uncharged` counts the operations the platform paid for, whose `0` is not a price. A project's spend over a window is `GET /v1/projects/{nodeId}/usage`; its model calls `GET /v1/ai-calls`.

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
| `uncharged` | `integer` | yes | How many of the run's `events` the platform paid for and charged to nobody: the sum of the entries' `uncharged`. ⚠️ When this equals `events` the whole run was platform-paid, and `credits: 0` is not what the same work costs when it is charged. A record's first processing and its reprocess are both charged; a run the platform started for its own purposes is not. |
| `bySkill` | `object[]` | yes | Descending by charge, so the expensive step is first. Each entry's `charges` says what the step was charged for, by kind — `handler-run` with the seconds of compute billed, `llm-call` per direction with its tokens. ⚠️ EMPTY is a real answer with more than one cause and this route cannot tell them apart: a run of pure transforms spent nothing, a run that failed before its first billable op spent nothing, and a run that predates per-run attribution has spend that cannot be found. A caller must not draw any of the three as `0 credits` without saying which it cannot rule out. |

Each item of `bySkill`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `skillId` | `string \| null` | yes | The skill that spent it, or `null` for spend the run made OUTSIDE any skill. ⛔ THE NULL ENTRY IS NOT A GAP: per-skill attribution comes from a child scope opened around each handler, so anything billed before the first skill or between two of them lands here — and dropping it would make these entries stop summing to `credits` while both numbers still looked right. |
| `skillName` | `string \| null` | yes | `Skill.name` FROZEN at event time, so the label outlives the row. A flow edit deletes and recreates skills with fresh ids, and this route serves runs that may be weeks old — so a caller renders this and falls back to `skillId`, never the other way round. `null` on the unattributed entry and on rows written before the column. |
| `credits` | `integer` | yes | What the customer was charged for this step, in credits (1 credit = 1 micro-USD). ⚠️ `0` is a real answer — work nobody was charged for (`uncharged` counts those) — and is NOT the same as the step being absent from this list. A cache hit is not a `0`: a step answered from a handler's input-keyed cache still pays its compute fee, one second at least, and a step answered from the step-result cache makes no charge at all. |
| `events` | `integer` | yes | How many billable operations made up that charge. Kept beside the amount because zero credits over six operations and zero credits over none are different facts, and only this tells them apart. |
| `uncharged` | `integer` | yes | How many of this step's `events` the platform paid for and charged to nobody. ⚠️ Those operations add `0` to `credits` whatever they would have cost, so `credits: 0` with `uncharged` equal to `events` means "not charged", not "costs nothing": the same step in a charged run has a price. |
| `charges` | `object[]` | yes | What the step was charged FOR: the same charge by kind, descending by credits. Its entries sum to this step's `credits` and `events`. A model step reads as one `handler-run` entry (seconds of compute) beside an `llm-call` entry per direction (tokens). |
