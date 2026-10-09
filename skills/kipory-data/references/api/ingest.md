<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Ingest

What the async ingest workers did with a project's records and what they cached; the read to check before concluding a processing flow never ran.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | [`/v1/projects/{nodeId}/ingest/cache/bust`](#post-v1-projects-nodeid-ingest-cache-bust) |  |
| `GET` | [`/v1/projects/{nodeId}/ingest/summary`](#get-v1-projects-nodeid-ingest-summary) |  |

### `POST /v1/projects/{nodeId}/ingest/cache/bust`

Throw away the project's cached fetches, for one function or all, so the next run fetches again — against a vendor budget, which is why this is ADMIN. See what the cache holds with `GET /v1/projects/{nodeId}/ingest/summary`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `functionKey` | `string` | no | Narrow the bust to one function's rows in this project. OMIT to bust the project's whole cache. ⛔ The scope is never widened by this field: an unknown key deletes nothing and reports `0`, it does not fall back to everything. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `integer` | yes | How many cache rows were removed. ⭐ `0` IS A SUCCESS, not a miss: a project whose cache was already empty, or a function with nothing stored, is the ordinary case and must not read as a failure. The caller states the number rather than announcing a bust. |

### `GET /v1/projects/{nodeId}/ingest/summary`

What the project fetched from outside over a window (`24h`, `7d`, `30d`): per ingest function its invocations, cache hits and fetches, shared quota pools, and recent failures. Per-function calls and successes over the last day are this at `window=24h`. To throw a cached fetch away, `POST …/ingest/cache/bust`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d"` | no | How far back the job figures reach. Defaults to `24h`. Counted in whole slices, as usage counts it: `24h` from the top of the hour 23 hours before the current one, `7d` and `30d` from 00:00 UTC that many days back counting today — the response's `since` carries the instant. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d"` | yes | How far back the job figures reach. `30d` is a ceiling rather than a choice of convenience: the maintenance job prunes `IngestJobLog` on a 30-day retention by default, so a longer window would report a falling count as evidence about traffic when it is evidence about pruning. Cache figures ignore this — a stored fetch has no window. Counted in whole slices, as usage counts it: `24h` from the top of the hour 23 hours before the current one, `7d` and `30d` from 00:00 UTC that many days back counting today — `since` carries the instant. |
| `since` | `string` | yes | The instant `window` resolved to, so a reader can state the range rather than re-deriving it from a label and a clock that may differ. |
| `totals` | `object` | yes | The window's figures over every function at once. |
| `stored` | `object` | yes | What this project has on disk right now. Unwindowed on every field, unlike everything else in this response. |
| `functions` | `object[]` | yes | Every function with traffic in the window OR cache rows on disk — the union, deliberately. A function holding 800 MB and running nothing is exactly the row an operator is looking for, and a traffic-only list would omit it. |
| `quotaDay` | `object[] \| null` | yes | Shared budgets this project drew on today, or `null` when the counter could not be read. ⛔ `null` IS NOT AN EMPTY LIST: an empty list says this project touched no metered pool today, and `null` says nobody knows. |
| `recentFailures` | `object[]` | yes | The newest failures in the window, capped. `totals.failed` is the real count — this list being short does not mean the failures were. |

Each item of `functions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `functionKey` | `string` | yes | The function key — `url.scrape`, `youtube.video`. |
| `jobs` | `integer` | yes | Invocations in the window. |
| `servedFromCache` | `integer` | yes | Of `jobs`, the ones this function answered from the cache. |
| `fetched` | `integer` | yes | Of `jobs`, the misses that came back with content. What this function actually cost in vendor calls. |
| `failed` | `integer` | yes | `miss-failure` + `wait-timeout` + `rejected-input`, on the same reading as `totals.failed`. |
| `hitRate` | `number \| null` | yes | `null` when this function ran nothing in the window — which is how a function that holds cache rows but has gone quiet is distinguished from one that is missing every time. |
| `cachedEntries` | `integer` | yes | Stored fetches this project holds for this function, ALL of them — not windowed. A cache entry outlives the window that created it. |
| `cachedBytes` | `integer` | yes | What those entries occupy. |
| `quotaUnits` | `integer \| null` | yes | Shared external quota this function's fetches recorded in the window — HISTORY, not the enforcement counter; see this module's header for why the two must not be added. `null` for every function that draws on no metered budget, which is most of them, and for a window in which none was recorded. Never `0` for either. |

Each item of `quotaDay`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Pool identity, from the function descriptor's `ingest.externalQuota.resource`. One pool is shared by every function declaring it, which is why this is not reported per function: the three YouTube Data API v3 functions draw on ONE budget, and `youtube.transcript` shares the subject but not the pool. |
| `unitsUsed` | `integer` | yes | What THIS project has drawn in the current quota-day, from the enforcement counter rather than from the job log. Exact, and a measured `0` — a project that has spent nothing is a known quantity, not an absence. |
| `resetsAt` | `string` | yes | When the pool's day rolls over, in the PROVIDER's zone. Carried because the window is not UTC and a reader assuming it is will misread a full budget as a spent one for up to eight hours. |

Each item of `recentFailures`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The `IngestJobLog` row id. |
| `at` | `string` | yes | When the invocation was logged. |
| `functionKey` | `string` | yes | The function that failed — a key in `functions` above. |
| `outcome` | `"hit" \| "miss-success" \| "miss-failure" \| "wait-timeout" \| "rejected-input"` | yes | Which KIND of failure. Always one of `miss-failure`, `wait-timeout` or `rejected-input`; a `hit` or a `miss-success` never appears here. |
| `attempts` | `integer` | yes | How many times the wrapper tried before giving up. `1` on a `rejected-input`, which never reached the queue at all. |
| `durationMs` | `integer` | yes | Wall time this invocation spent. On a `wait-timeout` it is mostly the wait, not the work. |
| `sourceHashPrefix` | `string` | yes | First 16 characters of the source hash. TRUNCATED ON PURPOSE: the full hash identifies a customer's source and nothing on this surface needs to, since the cache is addressed by the whole triple and no caller can look one up from here. |
| `errorMessage` | `string \| null` | yes | What the function said, verbatim, or `null` — which a `rejected-input` row always is, because nothing threw. |
