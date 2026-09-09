<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: a22b93e6cbba · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Ingest

What the async ingest workers did with a project's records and what they cached; the read to check before concluding a processing flow never ran.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | [`/v1/projects/{nodeId}/ingest/cache/bust`](#post-v1-projects-nodeid-ingest-cache-bust) |  |
| `GET` | [`/v1/projects/{nodeId}/ingest/summary`](#get-v1-projects-nodeid-ingest-summary) |  |

### `POST /v1/projects/{nodeId}/ingest/cache/bust`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `handlerKey` | `string` | no | Narrow the bust to one handler's rows in this project. OMIT to bust the project's whole cache. ⛔ The scope is never widened by this field: an unknown key deletes nothing and reports `0`, it does not fall back to everything. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `integer` | yes | How many cache rows were removed. ⭐ `0` IS A SUCCESS, not a miss: a project whose cache was already empty, or a handler with nothing stored, is the ordinary case and must not read as a failure. The caller states the number rather than announcing a bust. |

### `GET /v1/projects/{nodeId}/ingest/summary`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d"` | no | How far back the job figures reach. Defaults to `24h`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `window` | `"24h" \| "7d" \| "30d"` | yes | How far back the job figures reach. `30d` is a ceiling rather than a choice of convenience: the maintenance job prunes `IngestJobLog` on a 30-day retention by default, so a longer window would report a falling count as evidence about traffic when it is evidence about pruning. Cache figures ignore this — a stored fetch has no window. |
| `since` | `string` | yes | The instant `window` resolved to, so a reader can state the range rather than re-deriving it from a label and a clock that may differ. |
| `totals` | `object` | yes | The window's figures over every handler at once. |
| `stored` | `object` | yes | What this project has on disk right now. Unwindowed on every field, unlike everything else in this response. |
| `handlers` | `object[]` | yes | Every handler with traffic in the window OR cache rows on disk — the union, deliberately. A handler holding 800 MB and running nothing is exactly the row an operator is looking for, and a traffic-only list would omit it. |
| `quotaDay` | `object[] \| null` | yes | Shared budgets this project drew on today, or `null` when the counter could not be read. ⛔ `null` IS NOT AN EMPTY LIST: an empty list says this project touched no metered pool today, and `null` says nobody knows. |
| `recentFailures` | `object[]` | yes | The newest failures in the window, capped. `totals.failed` is the real count — this list being short does not mean the failures were. |
