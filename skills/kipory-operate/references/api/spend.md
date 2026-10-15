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
| `GET` | [`/v1/projects/{nodeId}/limits`](#get-v1-projects-nodeid-limits) |  |
| `GET` | [`/v1/projects/{nodeId}/usage`](#get-v1-projects-nodeid-usage) |  |
| `GET` | [`/v1/projects/{nodeId}/usage/events`](#get-v1-projects-nodeid-usage-events) |  |
| `GET` | [`/v1/projects/{nodeId}/usage/events.csv`](#get-v1-projects-nodeid-usage-events-csv) |  |
| `GET` | [`/v1/runs/{runId}/spend`](#get-v1-runs-runid-spend) |  |

### `GET /v1/ai-calls`

A project's model calls over a window, newest first, walked on `after`/`before` — provider, model, outcome, tokens, latency, cost and the action that made each — with fourteen narrowings. The same window added up is `GET /v1/ai-calls/rollup`; one call with its stored prompt is `GET /v1/ai-calls/{id}`; what ALL billable work cost, model calls included, is `GET /v1/projects/{nodeId}/usage`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project whose calls to read — its node id: the id `GET /v1/me/projects` lists for a signed-in person, and `GET /v1/bootstrap?project={nodeId}&sections=tenancy` answers for an API key. |
| `from` | `string` | no | Only calls at or after this instant. ⚠️ `to` IS OPTIONAL and defaults to the read's own clock — a caller that wants the call list and the rollup taken over the SAME window must send it, or each read picks its own upper bound and the band can disagree with the table under it by a round trip. |
| `to` | `string` | no | Only calls STRICTLY BEFORE this instant. |
| `origins` | `string` | no | Comma-separated AI call `origin` values to INCLUDE, e.g. `session,projection`. Use `unset` to name the rows whose origin is null, or `all` on its own to turn the filter off entirely. Omit the parameter entirely to get the default view, which hides what a human did while building (see `excludedOrigins` on the response for exactly what was applied). |
| `outcome` | `"success" \| "error"` | no | Narrow to calls that succeeded, or to calls that failed. |
| `taskKind` | `string` | no | Narrow to one kind of model work. ⚠️ NOT AN ENUM: any value is accepted, and one no call carries matches nothing. |
| `actionId` | `string` | no | The action that made the call. |
| `flowId` | `string` | no | The flow the action belongs to. ⛔⛔ IT REACHES ONLY THE FLOW'S CURRENT ACTIONS: every whole-graph edit of a flow recreates its actions with fresh ids, so calls made before the last edit are unreachable by this filter and by `q`'s action-key arm, and the rollup misses them the same way. |
| `provider` | `string` | no | The vendor, e.g. `openai`. |
| `model` | `string` | no | The exact model identifier. |
| `recordId` | `string` | no | The record this call was processing, when it was processing one. |
| `userId` | `string` | no | The end user the call was made on behalf of. |
| `sessionId` | `string` | no | The session the call was made inside. ⭐ THE ONE HANDLE THAT GATHERS A CONVERSATION'S CALLS. `correlationId` reads like the field for this and is not — it equals the call's own id. ⚠️ Indexed in the order the list reads, so this narrows without a scan. |
| `correlationId` | `string` | no | The call's correlation handle. ⚠️ Today it equals the call's own id on every call, so this is an id lookup under another name, and it cannot yet gather the calls of one run. |
| `q` | `string` | no | Case-insensitive match against the call's own text — `errorCode`, `errorMessage`, `model`, `provider` — AND the key of the action that made the call. ⛔ IT DOES NOT SEARCH THE PROMPT: a prompt past 256 kB spills to object storage, where the match cannot reach it. ⚠️ None of these columns is indexed for text, so this stays a scan within whatever the other filters already narrowed to. |
| `sort` | `"created-at" \| "latency-ms" \| "total-tokens"` | no | The column the call list is ordered by: `created-at` (the default), `latency-ms`, or `total-tokens`. Ties break on the call id, in the same direction. ⚠️ `totalTokens` is null where the provider reported no usage, and those calls sort LAST in both directions — a null is not measured, never the smallest figure. Credits are not a sort. |
| `order` | `"asc" \| "desc"` | no | Which way `sort` runs. Defaults to `desc` — newest, slowest, largest first. |
| `after` | `string` | no | The NEXT page along this ordering — pass back the `nextCursor` you were given. Opaque: read it from a response, never build one. ⛔ A cursor carries the ordering it was minted in, and replaying it under a different `sort` or `order` is refused (400). |
| `before` | `string` | no | The PREVIOUS page along this ordering — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many calls per page, up to 100. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `calls` | `object[]` | yes | In the ordering `sort` and `order` name, whichever direction the page was reached from. |
| `sort` | `"created-at" \| "latency-ms" \| "total-tokens"` | yes | The column this page was ordered by — the one sent, or `created-at`. |
| `order` | `"asc" \| "desc"` | yes | Which way `sort` ran — the one sent, or `desc`. |
| `paging` | `null` | yes | Always NULL here. `rollup.totals.calls` answers the same question once, for the same window. Read `null` as `cursor walking only`, never as `not measured yet`. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the next page along this ordering. Null on the last. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the previous page along this ordering. Null on the first. |
| `excludedOrigins` | `string[]` | yes | The `origin` values this request filtered OUT. Empty when the caller named its own `origins`. ⚠️ A statement about the FILTER, not about the data: it does not claim rows with these origins exist in the window. `GET /v1/ai-calls/rollup` counts them in `excluded.calls`. |

Each item of `calls`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The AI call's id. |
| `createdAt` | `string` | yes | When the call was recorded. |
| `taskKind` | `string` | yes | The kind of model work. ⚠️ A STRING, not the enum: show a value you do not recognise verbatim. |
| `origin` | `string \| null` | yes | What made the call — free text, null for the majority of rows. |
| `provider` | `string` | yes | The vendor that served it. |
| `model` | `string` | yes | The exact model identifier. |
| `outcome` | `"success" \| "error"` | yes | Whether the call came back. |
| `errorCode` | `"rate-limit" \| "quota-exhausted" \| "transient-network" \| "provider-error" \| "schema-validation" \| "timeout" \| "unknown" \| null` | yes | The failure bucket, null on success. An unrecognised stored code is normalised to `unknown`, so a client can switch on this exhaustively. |
| `action` | `object \| null` | yes | Null for a call no action made. |
| `flow` | `object \| null` | yes | The action's flow. Null whenever `action` is. |
| `record` | `object \| null` | yes | The record this call was processing, null when it was processing none. ⚠️ THE NAME IS BEST-EFFORT AND MAY BE NULL: it is read from `derived.title`, then `data.title`, then a truncated `data.text`, which are CONVENTIONS a table is free to mean something else by. A null name is not a missing record — the id is still the handle. |
| `totalTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero. Embeddings, reranks and transcriptions routinely report no usage at all. |
| `credits` | `integer \| null` | yes | What this call CHARGED, in credits — a credit is a millionth of a dollar — summed over the charges linked to it. ⛔ THE CUSTOMER'S FIGURE, NOT KIPORY'S. ⛔ Null means NO COST EVENT LANDED — the call was not free, it is unpriced, and a call that has just run sits here for a moment. |
| `latencyMs` | `integer` | yes | Wall time. On a timeout this is OUR deadline rather than the provider's answer, which is why it is never null. |
| `redactedPatternCount` | `integer` | yes | How many distinct redaction patterns matched before this call was stored. Zero is a measured zero here: the counts map is written on every row. |

### `GET /v1/ai-calls/{id}`

One model call in full — the list's row plus its action, flow, record, cost and redaction counts; `payload=prompt|response` also returns that stored payload. 404 for an id you cannot see.

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
| `id` | `string` | yes | The AI call's id. |
| `createdAt` | `string` | yes | When the call was recorded. |
| `taskKind` | `string` | yes | The kind of model work. ⚠️ A STRING, not the enum: show a value you do not recognise verbatim. |
| `origin` | `string \| null` | yes | What made the call — free text, null for the majority of rows. |
| `provider` | `string` | yes | The vendor that served it. |
| `model` | `string` | yes | The exact model identifier. |
| `outcome` | `"success" \| "error"` | yes | Whether the call came back. |
| `errorCode` | `"rate-limit" \| "quota-exhausted" \| "transient-network" \| "provider-error" \| "schema-validation" \| "timeout" \| "unknown" \| null` | yes | The failure bucket, null on success. An unrecognised stored code is normalised to `unknown`, so a client can switch on this exhaustively. |
| `action` | `object \| null` | yes | Null for a call no action made. |
| `flow` | `object \| null` | yes | The action's flow. Null whenever `action` is. |
| `record` | `object \| null` | yes | The record this call was processing. ⛔ NO ADDRESS COMES WITH IT — unlike `flow`, which carries a key because it has a page; it is not a link. |
| `totalTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero. Embeddings, reranks and transcriptions routinely report no usage at all. |
| `credits` | `integer \| null` | yes | What this call CHARGED, in credits — a credit is a millionth of a dollar — summed over the charges linked to it. ⛔ THE CUSTOMER'S FIGURE, NOT KIPORY'S. ⛔ Null means NO COST EVENT LANDED — the call was not free, it is unpriced, and a call that has just run sits here for a moment. |
| `latencyMs` | `integer` | yes | Wall time. On a timeout this is OUR deadline rather than the provider's answer, which is why it is never null. |
| `project` | `string` | yes | The project NODE the call belongs to (its node id) — the `project` `GET /v1/ai-calls` takes. A client showing the call under a project it chose compares the two. |
| `errorMessage` | `string \| null` | yes | The provider's own words, null on success. ⚠️ Free text from a vendor, so it is neither a closed set nor safe to parse — `errorCode` is the field to switch on. |
| `promptTokens` | `integer \| null` | yes | NOT MEASURED when null, never zero — and it goes null INDEPENDENTLY of `totalTokens`: a provider can report a total with no split. |
| `completionTokens` | `integer \| null` | yes | Null for NOT MEASURED, on the same terms as `promptTokens`. |
| `cachedPromptTokens` | `integer \| null` | yes | Prompt tokens the provider served from its cache — part of `promptTokens`, not in addition to it. Null when the provider reported nothing, which is not zero cache hits. |
| `cacheWriteTokens` | `integer \| null` | yes | Prompt tokens written into the provider's cache (reported by providers that bill a cache write apart). Null when not reported. |
| `reasoningTokens` | `integer \| null` | yes | Hidden reasoning tokens — part of `completionTokens`. Null when the provider reported nothing. |
| `correlationId` | `string` | yes | ⚠️ TODAY THIS EQUALS THE CALL'S OWN ID ON EVERY ROW: it cannot yet gather the calls of one run. |
| `sessionId` | `string \| null` | yes | The end-user session, when the call was made inside one. |
| `userId` | `string \| null` | yes | The end user the call was made on behalf of. |
| `redactedPatternCounts` | `object` | yes | Pattern name → how many matches were removed before the PROMPT and the RESPONSE were stored. ⚠️ SPARSE: a pattern that matched nothing is absent rather than zero. An empty map is a MEASURED fact — the map is written on every row. ⛔ IT DOES NOT COVER `errorMessage`: the redactor runs over a provider's error text too and its counts are discarded, so a stored message may carry a `[REDACTED:…]` marker this map does not account for. |
| `stored` | `object` | yes | What was kept, how big it is, and where it went. |
| `payload` | `object \| null` | yes | ⛔ NULL MEANS THE CALLER DID NOT ASK, which is none of the four absences inside the object. Send `payload=prompt` or `payload=response` to get one. |

### `GET /v1/ai-calls/rollup`

The same window and narrowings as `GET /v1/ai-calls`, added up: counts, failures by error code, latency spread, spend, a volume strip and one row per action. Totals exactly the rows the list pages through.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | The project whose calls to read — its node id: the id `GET /v1/me/projects` lists for a signed-in person, and `GET /v1/bootstrap?project={nodeId}&sections=tenancy` answers for an API key. |
| `from` | `string` | no | Only calls at or after this instant. ⚠️ `to` IS OPTIONAL and defaults to the read's own clock — a caller that wants the call list and the rollup taken over the SAME window must send it, or each read picks its own upper bound and the band can disagree with the table under it by a round trip. |
| `to` | `string` | no | Only calls STRICTLY BEFORE this instant. |
| `origins` | `string` | no | Comma-separated AI call `origin` values to INCLUDE, e.g. `session,projection`. Use `unset` to name the rows whose origin is null, or `all` on its own to turn the filter off entirely. Omit the parameter entirely to get the default view, which hides what a human did while building (see `excludedOrigins` on the response for exactly what was applied). |
| `outcome` | `"success" \| "error"` | no | Narrow to calls that succeeded, or to calls that failed. |
| `taskKind` | `string` | no | Narrow to one kind of model work. ⚠️ NOT AN ENUM: any value is accepted, and one no call carries matches nothing. |
| `actionId` | `string` | no | The action that made the call. |
| `flowId` | `string` | no | The flow the action belongs to. ⛔⛔ IT REACHES ONLY THE FLOW'S CURRENT ACTIONS: every whole-graph edit of a flow recreates its actions with fresh ids, so calls made before the last edit are unreachable by this filter and by `q`'s action-key arm, and the rollup misses them the same way. |
| `provider` | `string` | no | The vendor, e.g. `openai`. |
| `model` | `string` | no | The exact model identifier. |
| `recordId` | `string` | no | The record this call was processing, when it was processing one. |
| `userId` | `string` | no | The end user the call was made on behalf of. |
| `sessionId` | `string` | no | The session the call was made inside. ⭐ THE ONE HANDLE THAT GATHERS A CONVERSATION'S CALLS. `correlationId` reads like the field for this and is not — it equals the call's own id. ⚠️ Indexed in the order the list reads, so this narrows without a scan. |
| `correlationId` | `string` | no | The call's correlation handle. ⚠️ Today it equals the call's own id on every call, so this is an id lookup under another name, and it cannot yet gather the calls of one run. |
| `q` | `string` | no | Case-insensitive match against the call's own text — `errorCode`, `errorMessage`, `model`, `provider` — AND the key of the action that made the call. ⛔ IT DOES NOT SEARCH THE PROMPT: a prompt past 256 kB spills to object storage, where the match cannot reach it. ⚠️ None of these columns is indexed for text, so this stays a scan within whatever the other filters already narrowed to. |
| `buckets` | `"hour" \| "day"` | no | The width of one column in `buckets`. Defaults to `hour`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The bounds these figures were taken over. `from` is null for an unbounded window — the caller asked for all time. |
| `totals` | `object` | yes | The window counted, under exactly the filter the request carried. |
| `latency` | `object \| null` | yes | Null when the window holds no call to measure. |
| `spend` | `object \| null` | yes | What the window cost, and how much of it the platform can speak for. ⛔ NULL WHEN `unmeasurable` IS `all` — over the row cap no cost query runs at all. `latency` is null on the same arm. |
| `buckets` | `object[]` | yes | The window sliced into equal columns of width `buckets`, oldest first. A slice with no calls is PRESENT with zeroes rather than absent. |
| `actions` | `object[]` | yes | One row per action that made a call in the window, so a client can place a single call against its own action's distribution. Absent entirely for a window with no calls. |
| `models` | `object[]` | yes | Every provider/model pair present in the window, with the model and provider narrowings RELEASED. Every other filter still applies. |
| `excluded` | `object` | yes | What the default origin view dropped, counted. |
| `unmeasurable` | `"failures" \| "all" \| null` | yes | A window the platform cannot vouch for. `failures` — the calls are counted but their outcomes are not trustworthy. `all` — nothing here should be read as a measurement. `null` — these figures stand. ⛔ NOT an error: the figures beside it are the best the platform has, and this says they are a floor rather than a fact. |

Each item of `buckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The instant the bucket OPENS, UTC. Its width is `buckets`. |
| `calls` | `integer` | yes | Calls that landed inside this column. A measured zero — an empty column is present rather than omitted. |
| `failed` | `integer` | yes | A subset of `calls`, never a second total. |

Each item of `actions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `actionId` | `string` | yes | The action these calls were made by. |
| `actionKey` | `string \| null` | yes | The action's key. Null when the action has been deleted. |
| `flowId` | `string \| null` | yes | The flow that holds the action. Null when the action is gone. |
| `calls` | `integer` | yes | Calls this action made in the window, under the same filter. |
| `failed` | `integer` | yes | A subset of this action's `calls`, never a second total. |
| `p50Ms` | `integer \| null` | yes | Null when too few calls to characterise — never zero. |
| `p95Ms` | `integer \| null` | yes | Null exactly when `p50Ms` is. The pair is decided together. |
| `answeredP50Ms` | `integer \| null` | yes | The median over this action's calls that answered (did not fail). Null when too few answered to characterise — never zero. `p50Ms` is over every call, failed ones included. |
| `credits` | `integer` | yes | What this action's calls CHARGED over the window, in credits. ⚠️ A FLOOR, not a total: read it beside `callsWithNoCostEvent`. |
| `callsWithNoCostEvent` | `integer` | yes | This action's calls with no charge recorded. ⛔ AN ABSENT SUM IS NOT A ZERO SUM. |

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
| `status` | `"active" \| "over-soft-cap" \| "suspended"` | yes | Whether this wallet may still pay for work. `active` is fine; `over-soft-cap` means the balance has reached the agreed floor and requests are being refused with 402; `suspended` means the account is stopped for a reason other than balance. |
| `wallet` | `"member" \| "node"` | yes | Whose wallet this is: `member` is your own wallet in this project, funded by the project's grants and refused at zero; `node` is the wallet the project settles to, which `payer` names. |
| `nextGrantAt` | `string \| null` | yes | When the project's next periodic grant to your member wallet is due, or null when `wallet` is `node` or the project makes no periodic grant. |
| `payer` | `object \| null` | yes | Where the wallet is held. When `wallet` is `node`: the nearest node at or above the project that holds one — a project without its own wallet draws on its organization's, so a new project can open with a balance that is not zero. When `wallet` is `member`: this project. Null when the request names no project or no wallet resolves. |
| `perUserSpendCap` | `integer \| null` | yes | The ceiling on what YOU personally may spend, or null when the project sets none. ⚠️ NOT a second balance: it limits your share of the wallet above, and both gates must pass independently. |
| `perUserSpendConsumed` | `integer` | yes | What you have spent against that ceiling in the current window. Always present, and 0 rather than absent for a first-time caller. |
| `perUserSpendCapPeriod` | `"lifetime" \| "day" \| "week" \| "month"` | yes | The window `perUserSpendConsumed` covers: LIFETIME is the whole history, the others the current UTC calendar period. |
| `perUserSpendWindowStart` | `string \| null` | yes | The instant the consumed figure was actually summed from, or null for a lifetime window. Read it rather than recomputing it from the period. |

### `GET /v1/organizations/{nodeId}/ledger`

The organization wallet's ledger — every credit movement (usage debits, grants, adjustments) and configuration change, newest first, walked on `after`/`before`. Requires **ADMIN**. What the charges were for is `GET /v1/organizations/{nodeId}/usage`; the per-charge statement is `GET /v1/projects/{nodeId}/usage/events`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization's node id — the same id `/v1/nodes/{nodeId}` takes. |

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
| `paging` | `null` | yes | Always `null`: walk by the cursors. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

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
| `actorPerson` | `object \| null` | yes | The person a `user:<id>` actor names, as their account reads now — usually a Kipory operator. Null for an email or `system:<slug>` actor, and for a person whose account is gone. |
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
| `used` | `integer` | yes | Units the GOVERNING counter consumed this quota-day. That counter can be shared by every project beneath an ancestor node — see `countedAtNodeId`. Do not render it as one project's consumption; use `projects[]` for that. `sum(projects[].used)` always equals this. |
| `countedAtNodeId` | `string` | yes | The node whose counter `used` belongs to — not necessarily the node you asked about. |
| `resetsAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `projects` | `object[]` | yes | Per-project split of `used`, summing exactly to it. |

### `GET /v1/organizations/{nodeId}/usage`

What the projects under this organization spent over a window, by project, kind, action, model, function, provider, end user or key, with the paying wallet's state, runway and the ceiling nearest to refusing work. `window=custom` takes `from`/`to` instants (`to` exclusive). Requires **ADMIN**. The wallet's movements are `GET /v1/organizations/{nodeId}/ledger`; one project's view is `GET /v1/projects/{nodeId}/usage`; your own spend is `GET /v1/credits/balance`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization's node id — the same id `/v1/nodes/{nodeId}` takes. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "public" \| "system"` | no | Whose work to count. `all` is end-user, public-endpoint, design-time and held data — the four CHARGING actors. `public` is the calls made to public endpoints, with no credential. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | no | Narrow to one kind of work. |
| `action` | `string` | no | Narrow to one action, by its NAME — the key a breakdown by action hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `function` | `string` | no | Narrow to the paid fetches one vendor function made. |
| `provider` | `string` | no | Narrow to one provider — who was paid for the work, by registry id (`apify`, `openai`): a fetch's vendor as the charge recorded it, or an AI call's provider from the model catalog. The key a breakdown by provider hands back. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |
| `project` | `string` | no | Narrow to one project, by its node id — the key a breakdown by project hands back. A node outside this organization's subtree is refused with a 404. |
| `by` | `"project" \| "kind" \| "action" \| "model" \| "function" \| "provider" \| "user" \| "key"` | no | Which dimension `breakdown` splits the window by. Defaults to the project. |
| `compare` | `"1"` | no | Pass `1` to also measure the period of the same length immediately before this window. `prior` and `priorBuckets` are null without it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually measured. Both bounds range on when the work HAPPENED (a charge's `occurredAt`), as the spend ceilings do. |
| `readOn` | `"credits" \| "events"` | yes | The magnitude this figure is read on under the requested scope. `credits` wherever the scope's work can carry a charge; `events` where every charge is zero by construction — the platform's own work — so a figure drawn on credits there would be a window of zeros. |
| `totals` | `object` | yes | The subtree under the requested scope and narrowing. A FLOOR, not a ceiling: spend the meter could not record is invisible here. |
| `prior` | `object \| null` | yes | The period before, measured under the same scope and narrowing. `null` unless `compare=1` was passed. |
| `buckets` | `object[]` | yes | The window sliced oldest-first, quiet slices present as zeroes. |
| `priorBuckets` | `object[] \| null` | yes | The prior period sliced the same way, one per slice of `buckets`. `null` unless `compare=1` was passed. |
| `kinds` | `object[]` | yes | One row per kind of work with spend in the window, costliest first. |
| `breakdown` | `object` | yes | The window split along the dimension `by` asked for. |
| `narrowed` | `object` | yes | The narrowing the server applied, echoed so a client draws exactly the chips that are in force. |
| `models` | `object[]` | yes | Every model with calls in the window across the subtree, under the scope and narrowing, costliest first. |
| `projects` | `object[]` | yes | Every project in the subtree, by name. |
| `nearestCap` | `object \| null` | yes | The ceiling closest to refusing across every project: one already refusing first, then the highest share. Only a ceiling with something consumed against it — or one already refusing — is ranked. `null` when no such ceiling exists, whether because none is set or nothing has been consumed; `projects[].caps` says which. |
| `payer` | `object \| null` | yes | The wallet that pays for this organization's work — its own, or the ancestor's it bills up to. `null` when no wallet resolves anywhere on the chain, in which case the platform serves the work unbilled. |
| `hours` | `object[]` | yes | Billable events by UTC weekday and hour across the window, under the scope and narrowing — every kind of work but function runs, which are most of the events and charge nothing. Only cells with events are listed. |

Each item of `buckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The slice's UTC start. |
| `credits` | `integer` | yes | The slice's total charge. |
| `events` | `integer` | yes | The slice's billable event COUNT. ⛔ CARRIED ON EVERY SCOPE, NOT ONLY `system`. On `system` it is the ONLY meaningful figure — every charge there is zero. |
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
| `eventType` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | yes | The kind of work that was charged. |
| `credits` | `integer` | yes | What this kind cost over the window. `0` is a measured answer — the work happened and priced to nothing — and is not the same as the kind being absent from the array. |
| `events` | `integer` | yes | How many billable events produced that figure. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the function runs, vector writes and storage ticks recorded at no charge. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `model` | `string` | yes | The model id the calls named. |
| `credits` | `integer` | yes | What its calls cost over the window. |
| `events` | `integer` | yes | Its billable events — a generation writes one per direction, so this is not the call count. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the function runs, vector writes and storage ticks recorded at no charge. |
| `calls` | `integer` | yes | Distinct model calls those events belong to. |
| `tokens` | `integer` | yes | Tokens the calls reported, input and output together. `0` for a model priced per minute or per search unit, which reports none. |

Each item of `projects`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id. |
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

### `GET /v1/projects/{nodeId}/limits`

Every limit the project meets, in one read: the number in force for this project (`applied`), the platform's default, what happens at it, and — where the platform counts it — how much is used now (`used`) and when the count starts again (`resetsAt`). A refusal at a limit carries its `key` as `details.limitKey`.
Spend limits are on `GET /v1/projects/{nodeId}/settings`; what the project spent is `GET /v1/projects/{nodeId}/usage`. Only Kipory changes a limit's number.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limits` | `object[]` | yes | Every limit the project meets, grouped by `section`. |

Each item of `limits`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The limit's stable key, e.g. `mail.messages-per-day`. A refusal at this limit names it as `details.limitKey`. |
| `section` | `"requests" \| "runs" \| "mail-and-push" \| "functions" \| "files" \| "kept-for" \| "design" \| "account"` | yes | The group it is listed under. |
| `title` | `string` | yes | What is limited, in a few words. |
| `description` | `string` | yes | What happens at the limit. |
| `unit` | `string` | yes | What is counted: `requests`, `messages`, `bytes`, `days`, `per-thousand-runs`, … |
| `period` | `object` | yes | The span the limit is counted over. |
| `scope` | `"key" \| "person" \| "address" \| "project" \| "organization" \| "endpoint" \| "run" \| "action" \| "process" \| "installation"` | yes | What one count is kept for. `process` means each api process counts on its own; the number is not multiplied by how many there are. |
| `atLimit` | `"refused" \| "waits" \| "cut" \| "dropped" \| "deleted"` | yes | `refused` — the call or action fails; `waits` — it waits its turn; `cut` — the excess is cut off; `dropped` — the excess is dropped; `deleted` — the thing kept is deleted. |
| `refusal` | `string` | no | The error code or run reason a refusal at this limit carries. |
| `valueNote` | `string` | no | Said beside the number where the number alone misleads. |
| `applied` | `integer \| null` | yes | The number in force; null is no limit. |
| `appliedUnknown` | `boolean` | no | True when the numbers Kipory set could not be read; `applied` is then the default. |
| `default` | `integer \| null` | yes | The standard, before Kipory sets another for the platform, an organization or this project (that one is `applied`); null is no limit until one is set. |
| `defaultDerived` | `string` | no | For a default the platform computes from its own deployment: how. `default` is then today's computed number. |
| `setAt` | `"platform" \| "organization" \| "project"` | no | Where `applied` was set, when it is not the default: for this deployment, your organization, or this project. |
| `settableBy` | `"kipory" \| "you" \| "nobody"` | yes | Who may change it: Kipory staff, you (on the element it belongs to), or nobody. |
| `used` | `integer` | no | How much of it is used now, where the platform counts it. Absent — never 0 — where nothing counts it. May pass `applied`: a refused attempt is counted too. |
| `resetsAt` | `string` | no | When the count starts again, where it does. |

### `GET /v1/projects/{nodeId}/usage`

What one project spent over a window, by kind of billable work — split by kind, action, model, function, provider, user or key, with the prior period on `compare=1`, its caps and its payer. `window=custom` takes `from`/`to` instants (`to` exclusive). The charges behind the figure are `GET /v1/projects/{nodeId}/usage/events`; model calls alone are `GET /v1/ai-calls`; one run's cost by action is `GET /v1/runs/{runId}/spend`; the whole organization is `GET /v1/organizations/{nodeId}/usage`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id — the same id `GET /v1/bootstrap` takes, and the value a charge actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "public" \| "system"` | no | Whose work to count. `all` is end-user, public-endpoint, design-time and held data — the four CHARGING actors. `public` is the calls made to public endpoints, with no credential. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | no | Narrow to one kind of work. |
| `action` | `string` | no | Narrow to one action, by its NAME — the key a breakdown by action hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `function` | `string` | no | Narrow to the paid fetches one vendor function made. |
| `provider` | `string` | no | Narrow to one provider — who was paid for the work, by registry id (`apify`, `openai`): a fetch's vendor as the charge recorded it, or an AI call's provider from the model catalog. The key a breakdown by provider hands back. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |
| `by` | `"kind" \| "action" \| "model" \| "function" \| "provider" \| "user" \| "key"` | no | Which dimension `breakdown` splits the window by. Defaults to the kind of work. |
| `compare` | `"1"` | no | Pass `1` to also measure the period of the same length immediately before this window. `prior` and `priorBuckets` are null without it. |
| `flows` | `"1"` | no | Pass `1` to also split the window's credits by the flow whose runs spent them, as `flows`. Under the same scope and narrowing as every other figure here. `flows` is null without it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually measured. Both bounds range on when the work HAPPENED (a charge's `occurredAt`), as the spend ceilings do. |
| `readOn` | `"credits" \| "events"` | yes | The magnitude this figure is read on under the requested scope. `credits` wherever the scope's work can carry a charge; `events` where every charge is zero by construction — the platform's own work — so a figure drawn on credits there would be a window of zeros. |
| `totals` | `object` | yes | The window under the requested scope and narrowing. ⚠️ A FLOOR, NOT A CEILING: when the meter cannot record a charge the platform serves the work for free and writes the failure down elsewhere, so spend that never landed is invisible here. |
| `prior` | `object \| null` | yes | The period before, measured under the same scope and narrowing. `null` unless `compare=1` was passed. |
| `buckets` | `object[]` | yes | The window sliced oldest-first. ⛔ A SLICE WITH NO SPEND IS PRESENT WITH ZEROES rather than absent. |
| `priorBuckets` | `object[] \| null` | yes | The prior period sliced the same way, one slice per slice of `buckets` and in the same order, so the two can be drawn side by side without alignment. `null` unless `compare=1` was passed. |
| `kinds` | `object[]` | yes | One row per kind of work with spend in the window, costliest first. Absent entirely for a window with none. Always present whatever `by` says. |
| `breakdown` | `object` | yes | The window split along the dimension `by` asked for. |
| `narrowed` | `object` | yes | The narrowing the server applied. |
| `models` | `object[]` | yes | Every model with calls in the window under the scope and narrowing, costliest first. |
| `caps` | `object` | yes | The project's spend ceilings and how close each is. Measured on the ceilings' own windows, not the page's. |
| `payer` | `object \| null` | yes | The wallet this project's work settles to. `null` when no wallet resolves anywhere above it, in which case the work is served unbilled. |
| `hours` | `object[]` | yes | Billable events by UTC weekday and hour across the window, under the scope and narrowing — every kind of work but function runs, which are most of the events and charge nothing. Only cells with events are listed. |
| `flows` | `object \| null` | yes | The window's credits by the flow whose runs spent them, when `flows=1` was sent. `null` when it was not sent, or when the window holds too many runs to split — never an empty split for a window that was not counted. |

Each item of `buckets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | The slice's UTC start. |
| `credits` | `integer` | yes | The slice's total charge. |
| `events` | `integer` | yes | The slice's billable event COUNT. ⛔ CARRIED ON EVERY SCOPE, NOT ONLY `system`. On `system` it is the ONLY meaningful figure — every charge there is zero. |
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
| `eventType` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | yes | The kind of work that was charged. |
| `credits` | `integer` | yes | What this kind cost over the window. `0` is a measured answer — the work happened and priced to nothing — and is not the same as the kind being absent from the array. |
| `events` | `integer` | yes | How many billable events produced that figure. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the function runs, vector writes and storage ticks recorded at no charge. |

Each item of `models`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `model` | `string` | yes | The model id the calls named. |
| `credits` | `integer` | yes | What its calls cost over the window. |
| `events` | `integer` | yes | Its billable events — a generation writes one per direction, so this is not the call count. |
| `charged` | `integer` | yes | How many of those events carried a charge above zero — the work that actually cost something, apart from the function runs, vector writes and storage ticks recorded at no charge. |
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
| `nodeId` | `string` | yes | The project's node id — the same id `GET /v1/bootstrap` takes, and the value a charge actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "public" \| "system"` | no | Whose work to count. `all` is end-user, public-endpoint, design-time and held data — the four CHARGING actors. `public` is the calls made to public endpoints, with no credential. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | no | Narrow to one kind of work. |
| `action` | `string` | no | Narrow to one action, by its NAME — the key a breakdown by action hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `function` | `string` | no | Narrow to the paid fetches one vendor function made. |
| `provider` | `string` | no | Narrow to one provider — who was paid for the work, by registry id (`apify`, `openai`): a fetch's vendor as the charge recorded it, or an AI call's provider from the model catalog. The key a breakdown by provider hands back. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |
| `after` | `string` | no | The page OLDER than this row — pass back the `nextCursor` you were given. Omit for the newest page. |
| `before` | `string` | no | The page NEWER than this row — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many charges per page, up to 200. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `object` | yes | The window actually listed, echoed — the same frame the usage figure under the same query measures. |
| `events` | `object[]` | yes | This page of charges, newest first by `occurredAt`. |
| `paging` | `null` | yes | Always NULL here: walk with `after`/`before`. Read `null` as `cursor walking only`, never as `not measured yet`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `events`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The charge's id. |
| `occurredAt` | `string` | yes | When the work happened — the instant the window ranges on and the statement is ordered by. |
| `createdAt` | `string` | yes | When the charge was recorded. Later than `occurredAt` for a retried or backfilled row. |
| `eventType` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | yes | What kind of work was charged for. |
| `actor` | `"request" \| "design" \| "system" \| "holding" \| "public"` | yes | Whose work: `request` an end user's, `public` a call to a public endpoint, made with no credential and paid by the project, `design` design-time, `system` the platform's own, which charges nobody; `holding` what the project stores — files and vectors — charged by the daily held tick with no end user behind it. |
| `credits` | `integer` | yes | What the project was charged for this event, in credits. `0` is a measured charge — a free or platform-actor row — not an absence. |
| `actionId` | `string \| null` | yes | The action row that spent it, or null outside any action. ⚠️ Ids fragment on every flow edit; `actionName` is the key that totals. |
| `actionName` | `string \| null` | yes | The action's name, frozen at charge time; null outside any action. |
| `model` | `string \| null` | yes | The model a priced AI call named, lifted out of `details`; null for work that named none. |
| `functionKey` | `string \| null` | yes | The vendor function that made a paid fetch, lifted out of `details`; null for every other kind. |
| `userId` | `string \| null` | yes | The end user whose request caused it, or null. |
| `userLabel` | `string \| null` | yes | That user's name, else their email, else null when the user could not be resolved — never the id repeated. |
| `apiKeyId` | `string \| null` | yes | The API key that made the call, or null. |
| `apiKeyLabel` | `string \| null` | yes | That key's display name, or null when it could not be resolved. |
| `runId` | `string \| null` | yes | The run this charge belongs to: a flow run (`GET /v1/runs/{runId}`), or the eval run whose case or scorer spent it (`GET /v1/eval-runs/{id}`). Null for spend with no run — a held tick, a design-plane preview. |
| `aiCallId` | `string \| null` | yes | The logged model call behind an AI charge, or null. |
| `recordId` | `string \| null` | yes | The record the work was about, or null. |
| `requestId` | `string \| null` | yes | Groups every charge from one inbound request; null for a charge with no originating request. |
| `details` | `object` | yes | The charge's own particulars, as the meter wrote them — units, the rate that priced them, the model or function named. Shape varies by kind; a client reads what it recognises and prints nothing for the rest. |

### `GET /v1/projects/{nodeId}/usage/events.csv`

The statement of `GET /v1/projects/{nodeId}/usage/events` as CSV, newest first, capped at the export limit and saying when it cut. Page the JSON route for more.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id — the same id `GET /v1/bootstrap` takes, and the value a charge actually stores. Not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d" \| "90d" \| "mtd" \| "custom"` | no | How far back to look. Defaults to 7 days. `mtd` is the current UTC month so far; `custom` takes `from` and `to`. |
| `from` | `string` | no | The instant a custom span starts, INCLUSIVE — e.g. `2026-09-01T00:00:00Z`. Only with `window=custom`, where it is required. |
| `to` | `string` | no | The instant a custom span ends, EXCLUSIVE — a charge at exactly `to` is outside it, so `from=2026-09-01T00:00:00Z&to=2026-09-08T00:00:00Z` is seven whole days. A `to` still in the future ends the window at the moment of the read. Only with `window=custom`, where it is required. A span longer than 365 days, or one that does not run forwards, is refused. |
| `scope` | `"all" \| "users" \| "design" \| "holding" \| "public" \| "system"` | no | Whose work to count. `all` is end-user, public-endpoint, design-time and held data — the four CHARGING actors. `public` is the calls made to public endpoints, with no credential. ⛔ `system` is metered platform work whose charge is forced to zero, so it is read on `events`; a client drawing it on the credits axis draws a window of zeros. |
| `kind` | `"llm-call" \| "embedding" \| "storage-upload" \| "storage-delete" \| "storage-held" \| "vector-upsert" \| "vector-held" \| "function-run" \| "transcription" \| "vendor-fetch" \| "rerank" \| "push-delivery"` | no | Narrow to one kind of work. |
| `action` | `string` | no | Narrow to one action, by its NAME — the key a breakdown by action hands back, and the one that survives a flow edit. |
| `model` | `string` | no | Narrow to the calls that named one model. |
| `function` | `string` | no | Narrow to the paid fetches one vendor function made. |
| `provider` | `string` | no | Narrow to one provider — who was paid for the work, by registry id (`apify`, `openai`): a fetch's vendor as the charge recorded it, or an AI call's provider from the model catalog. The key a breakdown by provider hands back. |
| `user` | `string` | no | Narrow to the work one end user caused, by user id. |
| `key` | `string` | no | Narrow to the work one API key made, by key id. |

**Response `200`**

_No fields._

### `GET /v1/runs/{runId}/spend`

What one run cost, and which action spent it. `0` for a run that spent nothing; `uncharged` counts the operations the platform paid for, whose `0` is not a price. A project's spend over a window is `GET /v1/projects/{nodeId}/usage`; its model calls `GET /v1/ai-calls`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run whose spend to break down. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The run this spend belongs to. The same heterogeneous id space `GET /v1/runs/{runId}/timeline`, `/change-set` and `/flow-snapshots` take — a record attempt id, a flow run's request id, or an endpoint invocation id. |
| `credits` | `integer` | yes | The run's whole charge: the sum of `byAction`. |
| `events` | `integer` | yes | Billable operations across the whole run. |
| `uncharged` | `integer` | yes | How many of the run's `events` the platform paid for and charged to nobody: the sum of the entries' `uncharged`. ⚠️ When this equals `events` the whole run was platform-paid, and `credits: 0` is not what the same work costs when it is charged. A record's first processing and its reprocess are both charged; a run the platform started for its own purposes is not. |
| `byAction` | `object[]` | yes | Descending by charge, so the expensive action is first. Each entry's `charges` says what the action was charged for, by kind — `function-run` with the milliseconds of compute billed, `llm-call` per direction with its tokens. ⚠️ EMPTY is a real answer with more than one cause and this route cannot tell them apart: a run of pure transforms spent nothing, a run that failed before its first billable op spent nothing, and a run that predates per-run attribution has spend that cannot be found. A caller must not draw any of the three as `0 credits` without saying which it cannot rule out. |
| `repeatedByPlatform` | `object` | yes | The part of this run's cost that came from the platform starting it again after one of its own failures (a worker that stopped, no worker free in time). An action's compute is charged once per run however often it is repeated, so this is model and vendor calls really made again, plus actions the first attempt never reached. Included in `credits` and `byAction`, not added to them. `{ credits: 0, lines: 0 }` on a run never started again. |

Each item of `byAction`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `actionId` | `string \| null` | yes | The action that spent it, or `null` for spend the run made OUTSIDE any action. ⛔ THE NULL ENTRY IS NOT A GAP: anything billed before the first action or between two of them lands here, and without it the entries do not sum to `credits`. |
| `actionName` | `string \| null` | yes | The action's name FROZEN at event time. Render this and fall back to `actionId`, never the other way round: a flow edit can recreate actions with fresh ids. `null` on the unattributed entry and on older charges. |
| `credits` | `integer` | yes | What the customer was charged for this action, in credits (1 credit = 1 micro-USD). ⚠️ `0` is a real answer — work nobody was charged for (`uncharged` counts those) — and is NOT the same as the action being absent from this list. A cache hit is not a `0`: an action answered from a function's input-keyed cache still pays its compute fee for the time the lookup took, and an action answered from the action-result cache makes no charge at all. |
| `events` | `integer` | yes | How many billable operations made up that charge. |
| `uncharged` | `integer` | yes | How many of this action's `events` the platform paid for and charged to nobody: operations in a run the platform pays for, and the compute of an action that failed on a platform fault (`detail.phase: "platform-fault"` in the timeline), which is waived. ⚠️ Those operations add `0` to `credits` whatever they would have cost, so `credits: 0` with `uncharged` equal to `events` means "not charged", not "costs nothing": the same action in a charged run has a price. |
| `charges` | `object[]` | yes | What the action was charged FOR: the same charge by kind, descending by credits. Its entries sum to this action's `credits` and `events`. A model action reads as one `function-run` entry (milliseconds of compute) beside an `llm-call` entry per direction (tokens). |
