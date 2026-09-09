<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 93e75142d106 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Bootstrap

One read for a project's whole authored configuration, versioned, plus a stream that says when it moves. The first call to make after connecting to a project that already exists.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/bootstrap`](#get-v1-bootstrap) |  |
| `GET` | [`/v1/bootstrap/stream`](#get-v1-bootstrap-stream) |  |

### `GET /v1/bootstrap`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to snapshot. Required. |
| `sections` | `unknown \| string` | no | Comma-separated section names to return; omit for all nine. A name that is not a section is refused with 422 rather than dropped — a typo would otherwise look like a section that never changes. |
| `since` | `string` | no | Return only the sections that changed after this version — pass back the `structureVersion` you already hold. A value equal to the current one returns no section content and is not an error. A value ABOVE it returns everything, because that means the version moved backwards (a restore or rollback) and answering `nothing changed` would leave you stale forever. Digits only; anything else is a 422. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `structureVersion` | `string` | yes | Version of the project's configuration at the moment this snapshot was taken. It is read in the same transaction as the content, so it describes exactly what you were given. A string because the number can exceed a JavaScript integer. |
| `tenancyVersion` | `string` | yes | Separate version for the `tenancy` section. It is a digest rather than a counter, because what you can see of the tree depends on who you are — one project-wide number could not describe it. |
| `capturedAt` | `string` | yes | When this snapshot was taken (ISO-8601). |
| `sections` | `object` | yes | The current version of every section, including ones this response did not return. That is what lets a client asking for a subset still discover that something else moved. |
| `project` | `object` | no | Project-level settings, route enablement and model bindings. Absent when unchanged since `?since=` or not requested. |
| `schema` | `object` | no | Record types, schema entries and facet definitions. Absent when unchanged or not requested. |
| `relations` | `object` | no | Relation kinds and the record-type pairs each may connect. Absent when unchanged or not requested. |
| `events` | `object` | no | Event categories and event types. Absent when unchanged or not requested. |
| `flows` | `object` | no | Flows, their skills and their test cases — the highest-churn section, which is why it stands alone. Absent when unchanged or not requested. |
| `surfaces` | `object` | no | Dynamic API endpoints and schedules — the things that expose or drive the project. Absent when unchanged or not requested. |
| `vectors` | `object` | no | Embedding profiles and the collections they minted. Absent when unchanged or not requested. |
| `evals` | `object` | no | Eval suites and cases. Absent when unchanged or not requested. |
| `tenancy` | `object` | no | The project's identity and your slice of the ownership tree. Versioned separately by `tenancyVersion`. Absent when unchanged or not requested. |

### `GET /v1/bootstrap/stream`

Server-Sent Events. Emits `open` with the project's current structure version, `changed` when that version advances, and `bye` with a reason before closing. Frames carry a version and section names only — never configuration. Answer a frame with `GET /v1/bootstrap?since=<version>`.

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `open`, `changed`, `close`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project to snapshot. Required. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"open"` | yes | Always `open` — the first frame on every connection. ⚠️ ACT ON IT, not only on `changed`: configuration moves while you are disconnected, and every deploy closes every connection, so a client that ignores this is silently stale after each release. |
| `project` | `string` | yes | The project's NODE id — what you passed as `?project=`, and what to pass back when refetching. Not the project's own id, which is a different value. |
| `version` | `string` | yes | The configuration version in force right now. Compare it with the one you hold to decide whether to refetch. |
| `sections` | `string[]` | yes | Which parts of the configuration moved. Refetch naming only these — an unfiltered refetch drags work onto every signal. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter — that is the only default safe in both directions, since it neither abandons a live subject nor hammers a dead one. |
