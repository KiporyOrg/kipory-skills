<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8a31334ff890 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Projects

A project is the container everything else scopes by. Creating one needs OWNER at the parent organisation node; the design plane then addresses the project by its node id, which `GET /v1/projects/by-project-id/{projectId}` resolves from the project id the create call returned.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | [`/v1/projects`](#post-v1-projects) |  |
| `GET` | [`/v1/projects/{nodeId}`](#get-v1-projects-nodeid) |  |
| `PATCH` | [`/v1/projects/{nodeId}`](#patch-v1-projects-nodeid) |  |
| `DELETE` | [`/v1/projects/{nodeId}`](#delete-v1-projects-nodeid) |  |
| `PUT` | [`/v1/projects/{nodeId}/address`](#put-v1-projects-nodeid-address) |  |
| `GET` | [`/v1/projects/{nodeId}/deletion-preview`](#get-v1-projects-nodeid-deletion-preview) |  |
| `GET` | [`/v1/projects/{nodeId}/history`](#get-v1-projects-nodeid-history) |  |
| `GET` | [`/v1/projects/{nodeId}/history/{structureVersion}`](#get-v1-projects-nodeid-history-structureversion) |  |
| `POST` | [`/v1/projects/{nodeId}/purge`](#post-v1-projects-nodeid-purge) |  |
| `POST` | [`/v1/projects/{nodeId}/restore`](#post-v1-projects-nodeid-restore) |  |
| `GET` | [`/v1/projects/{nodeId}/settings`](#get-v1-projects-nodeid-settings) |  |
| `PATCH` | [`/v1/projects/{nodeId}/settings`](#patch-v1-projects-nodeid-settings) |  |
| `GET` | [`/v1/projects/{projectId}/feature-map`](#get-v1-projects-projectid-feature-map) |  |
| `POST` | [`/v1/projects/{projectId}/feature-map/derive`](#post-v1-projects-projectid-feature-map-derive) |  |
| `GET` | [`/v1/projects/{projectId}/handler-activity`](#get-v1-projects-projectid-handler-activity) |  |
| `GET` | [`/v1/projects/{projectId}/handlers`](#get-v1-projects-projectid-handlers) |  |
| `GET` | [`/v1/projects/address-availability`](#get-v1-projects-address-availability) |  |
| `GET` | [`/v1/projects/by-project-id/{projectId}`](#get-v1-projects-by-project-id-projectid) |  |

### `POST /v1/projects`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The project's display name. |
| `slug` | `string` | yes | The project's URL-safe short name. It must be free across the whole platform, and it decides the subdomain the project's API is served at. |
| `parentNodeId` | `string` | no | The organization node the project hangs under. Omit it and the project goes under the platform organization. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The new project's `projectId` — what the `/v1/projects/{projectId}/*` routes take. NOT the org-node id: the `{nodeId}` routes address the hosting node, which is a different value created in the same transaction and not reported here. |
| `slug` | `string` | yes | The slug the project was created with. |
| `name` | `string` | yes | The project's display name. |

### `GET /v1/projects/{nodeId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id — its address in the org tree, and what almost every `/v1/projects/{nodeId}/*` route takes. Distinct from `projectId`. |
| `projectId` | `string` | yes | The project's own id, used by the routes that say `{projectId}` and by records belonging to it. Distinct from `nodeId`, which addresses the same project's place in the tree — passing one where the other is expected resolves to nothing rather than erroring usefully. |
| `slug` | `string` | yes | The project's URL-safe short name, unique across the platform. |
| `name` | `string` | yes | The project's display name. |
| `subdomain` | `string` | yes | The host this project's own API is served at. Endpoints you author are reachable here, NOT on the design API's host. |
| `kind` | `"PRODUCT" \| "FIXTURE"` | yes | `PRODUCT` is a real tenant project; `FIXTURE` is platform scaffolding. Worth checking when you read a project by id: the LIST returns only PRODUCT, while reading one directly returns either, so an id that never appeared in a listing can still resolve here. |
| `lifecycle` | `object` | yes | Whether this project is live or retired. Grouped because the two dates are one fact — `purgeAfter` means nothing without `retiredAt`, and a live project has neither. |
| `createdAt` | `string` | yes | When the project was created (ISO). |

### `PATCH /v1/projects/{nodeId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The project's new display name. Trimmed, and NOT required to be unique — the slug is the unique identity, and it is not changed by this. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id — its address in the org tree, and what almost every `/v1/projects/{nodeId}/*` route takes. Distinct from `projectId`. |
| `projectId` | `string` | yes | The project's own id, used by the routes that say `{projectId}` and by records belonging to it. Distinct from `nodeId`, which addresses the same project's place in the tree — passing one where the other is expected resolves to nothing rather than erroring usefully. |
| `slug` | `string` | yes | The project's URL-safe short name, unique across the platform. |
| `name` | `string` | yes | The project's display name. |
| `subdomain` | `string` | yes | The host this project's own API is served at. Endpoints you author are reachable here, NOT on the design API's host. |
| `kind` | `"PRODUCT" \| "FIXTURE"` | yes | `PRODUCT` is a real tenant project; `FIXTURE` is platform scaffolding. Worth checking when you read a project by id: the LIST returns only PRODUCT, while reading one directly returns either, so an id that never appeared in a listing can still resolve here. |
| `lifecycle` | `object` | yes | Whether this project is live or retired. Grouped because the two dates are one fact — `purgeAfter` means nothing without `retiredAt`, and a live project has neither. |
| `createdAt` | `string` | yes | When the project was created (ISO). |

### `DELETE /v1/projects/{nodeId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirmSlug` | `string` | yes | The project's own slug, typed back to confirm you mean this project. Anything else is refused. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `retired` | `true` | yes | Always `true`. The project is RETIRED, not deleted — nothing has been destroyed yet and it can still be restored. |
| `nodeId` | `string` | yes | The retired project's node id. |
| `projectId` | `string` | yes | The retired project's project id. |
| `slug` | `string` | yes | The retired project's slug. |
| `purgeAfter` | `string` | yes | When this becomes irreversible. A daily sweep permanently destroys projects past this date, so restore before it. |
| `willPurge` | `object` | yes | What the eventual purge will destroy, counted by kind. A preview of the consequence, not of anything already done. |

### `PUT /v1/projects/{nodeId}/address`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `subdomain` | `string` | yes | The address to move to, e.g. "harvest". Sent raw — it is normalized (trimmed, lower-cased) server-side. Sending the project's CURRENT address is an explicit no-op: it succeeds, changes nothing, and never puts the address you kept into the reuse cooldown. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `subdomain` | `string` | yes | The project's address after the call, normalized — trimmed and lower-cased, so it may differ from what was sent. |
| `previousSubdomain` | `string \| null` | yes | The address this call freed, or null when nothing moved because you sent the address the project already had. A freed address is reserved against reuse by any OTHER project for a few minutes, and keeps resolving here for at most that long while routing caches expire — so the cutover is quick but not instantaneous everywhere. |

### `GET /v1/projects/{nodeId}/deletion-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id. |
| `projectId` | `string` | yes | The project's project id. |
| `slug` | `string` | yes | The project's slug. |
| `counts` | `object` | yes | What a purge would destroy, by kind. A PREVIEW — reading it changes nothing, and the figures move as the project keeps being used. |
| `external` | `object` | yes | What would be destroyed OUTSIDE the main database, and therefore not recoverable from a database backup. |

### `GET /v1/projects/{nodeId}/history`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page OLDER than this action — pass back the `nextCursor` you were given. Opaque: read it from a response, never build one. |
| `before` | `string` | no | The page NEWER than this action — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many ACTIONS per page, up to 100. Defaults to 25. ⚠️ Actions, not changes — one action can carry hundreds. |
| `actor` | `string` | no | Only actions applied by this principal, matched exactly as recorded — for example `key:key_7fj2q8`. Read it off an action's `actor.raw`. |
| `since` | `string` | no | Only actions applied at or after this instant. |
| `until` | `string` | no | Only actions applied at or before this instant. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `actions` | `object[]` | yes | Newest first by `structureVersion`, whichever direction the page was reached from. |
| `paging` | `"null"` | yes | Always NULL here. A page count needs a COUNT DISTINCT over a trail with no retention, paid on every click, to support a jump this route does not offer. Read `null` as `cursor walking only`, never as `not measured yet`. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the older page. Null on the oldest page. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the newer page. Null on the newest page. |
| `recordingSince` | `string \| null` | yes | When this deployment began recording configuration changes — the instant the audit migration finished. Changes applied before it were not recorded and never will be. ⛔ A client MUST show this alongside an empty result: without it, 'no changes' reads as 'this project has never changed', which is false for any project older than the trail. ⚠️ NULL means the date itself could not be established, NOT that recording never started — a client says it cannot date the start rather than omitting the caveat. |

### `GET /v1/projects/{nodeId}/history/{structureVersion}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |
| `structureVersion` | `string` | yes | The configuration version the action produced — the `structureVersion` of a row on the list response. Decimal digits only. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The changes AFTER this one — pass back the `nextCursor` you were given. |
| `before` | `string` | no | The changes BEFORE this one — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many CHANGES per page, up to 200. ⚠️ Changes here, where the list route's identically-named parameter counts ACTIONS. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `structureVersion` | `string` | yes | The project configuration version this action produced, as a decimal string. Compare for equality and display it; do not parse it to a number — it is a 64-bit value and JSON cannot carry one. |
| `at` | `string` | yes | When the action was applied. Shared by every change in it. |
| `actor` | `object` | yes | Who applied this action. Resolved the same way as on the list, and repeated here because a reader who deep-links to one action never saw the list. |
| `changes` | `object[]` | yes | Every recorded change of this action, in a stable total order (the record id, which carries a millisecond timestamp and a counter, so it approximates the order they were written in — the ORDER is a paging guarantee, the approximation is not). ⛔ Every RECORDED one: read `elidedCount` before concluding this is all of them. |
| `changeCount` | `integer` | yes | How many changes this action RECORDED, in total — NOT how many this page returned. ⛔ The two differ whenever `changes` is paged, and the truncation sentence needs the total: `247 recorded, 253 not` is only true of the action, and a client computing it from `changes.length` would report the page's size as the action's. |
| `elidedCount` | `integer \| null` | yes | How many changes this action made that were NOT recorded, or NULL when it was recorded in full. Non-null means `changes` is incomplete by this many BEYOND whatever paging has yet to return — the two shortfalls are different and a client may not add them. |
| `paging` | `"null"` | yes | Always NULL here. The total is `changes.length` plus what paging has yet to return, and neither this route nor its page offers a jump. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the next changes. Null on the last page. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the previous changes. Null on the first page. |

### `POST /v1/projects/{nodeId}/purge`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirmSlug` | `string` | yes | The project's own slug, typed back — as when retiring it. |
| `confirmForce` | `true` | yes | A SECOND, separate confirmation, required because this discards the grace period and destroys the project now. Retiring and abandoning the chance to undo it are two decisions, so one typed value does not authorise both. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `enqueued` | `boolean` | yes | Whether a purge is queued for this project as a result of this call. TRUE also covers a purge that was already in flight — the request collapsed into it, and the destruction is happening either way. FALSE means nothing was queued: an earlier attempt for this same retirement finished or failed today, so its job id is spent. The project stays due and the next daily sweep re-enqueues it, but nothing is running now. |
| `nodeId` | `string` | yes | The project's node id. |
| `projectId` | `string` | yes | The project's project id. |
| `slug` | `string` | yes | The project's slug. |

### `POST /v1/projects/{nodeId}/restore`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `restored` | `true` | yes | Always `true` — the project is live again. |
| `nodeId` | `string` | yes | The restored project's node id. |
| `projectId` | `string` | yes | The restored project's project id. |
| `slug` | `string` | yes | The restored project's slug. |
| `subdomain` | `string` | yes | The host the project's own API is served at again. |

### `GET /v1/projects/{nodeId}/settings`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `defaultRateCardId` | `string \| null` | yes | Which rate card prices this project's usage. Null uses the platform's active card. |
| `perUserSpendCapCredits` | `integer \| null` | yes | How much ONE end user may spend per `perUserSpendCapPeriod`, in credits. ⚠️ Null means NO ceiling, not 'the default' — unlike most nullable settings. A ceiling of zero is `0`, and the two are opposite outcomes. |
| `perUserSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | yes | The window the per-user ceiling is measured over. Never null — the column defaults to `LIFETIME`, so there is no unset state to confuse with 'no ceiling'. |
| `designSpendCapCredits` | `integer \| null` | yes | The ceiling on DESIGN-TIME spend — authoring and previewing, as opposed to what your end users cost. Null means no ceiling; `0` blocks all design-time work outright. |
| `designSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | yes | The window the design-time ceiling is measured over. Never null — defaults to `DAY`. |

### `PATCH /v1/projects/{nodeId}/settings`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `defaultRateCardId` | `string \| null` | no | Absent leaves it unchanged; null clears it back to the platform's active card. |
| `perUserSpendCapCredits` | `integer \| null` | no | Absent leaves it unchanged. ⚠️ Null REMOVES the ceiling entirely (unlimited); `0` blocks every billable action. The two look similar in a form and are opposites. |
| `perUserSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | no | The window a spend ceiling is measured over. The calendar windows clear themselves as the clock moves. ⚠️ `LIFETIME` never clears — it is a quota rather than a budget, so an active user eventually reaches it and is blocked permanently. |
| `designSpendCapCredits` | `integer \| null` | no | Absent leaves it unchanged. Null removes the design-time ceiling; `0` blocks all design-time work. |
| `designSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | no | The window a spend ceiling is measured over. The calendar windows clear themselves as the clock moves. ⚠️ `LIFETIME` never clears — it is a quota rather than a budget, so an active user eventually reaches it and is blocked permanently. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `defaultRateCardId` | `string \| null` | yes | Which rate card prices this project's usage. Null uses the platform's active card. |
| `perUserSpendCapCredits` | `integer \| null` | yes | How much ONE end user may spend per `perUserSpendCapPeriod`, in credits. ⚠️ Null means NO ceiling, not 'the default' — unlike most nullable settings. A ceiling of zero is `0`, and the two are opposite outcomes. |
| `perUserSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | yes | The window the per-user ceiling is measured over. Never null — the column defaults to `LIFETIME`, so there is no unset state to confuse with 'no ceiling'. |
| `designSpendCapCredits` | `integer \| null` | yes | The ceiling on DESIGN-TIME spend — authoring and previewing, as opposed to what your end users cost. Null means no ceiling; `0` blocks all design-time work outright. |
| `designSpendCapPeriod` | `"LIFETIME" \| "DAY" \| "WEEK" \| "MONTH"` | yes | The window the design-time ceiling is measured over. Never null — defaults to `DAY`. |

### `GET /v1/projects/{projectId}/feature-map`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project's own id. Not the `nodeId`, which is a different value on the same project and is what the `{nodeId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | yes | Always present, including before anything has been grouped — it is read straight from your configuration. |
| `featureSet` | `object \| null` | yes | The grouped view. NULL when this project has never completed a grouping run — `graph` and `coverage` are still usable in that case. |
| `coverage` | `object` | yes | What nothing declared reaches. Never null, and computed with or without a feature set. |
| `freshness` | `object` | yes | Whether this map still reflects your configuration. |

### `POST /v1/projects/{projectId}/feature-map/derive`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project's own id. Not the `nodeId`, which is a different value on the same project and is what the `{nodeId}` routes take. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `enqueued` | `boolean` | yes | Whether this request started a derive. False is not an error — see `reason`. |
| `reason` | `"already-queued" \| "ceiling-reached"` | no | Why nothing was started, present only when `enqueued` is false. `already-queued` means a derive is already coming, so do nothing; `ceiling-reached` means this project has used its allowance and the map stays behind until the window resets. |

### `GET /v1/projects/{projectId}/handler-activity`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project's own id. Not the `nodeId`, which is a different value on the same project and is what the `{nodeId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `windowStart` | `string` | yes | Start of the counted interval, ISO-8601 UTC. Returned rather than implied so a client renders the span the server actually read instead of subtracting from its own clock. |
| `windowEnd` | `string` | yes | End of the counted interval, ISO-8601 UTC — the moment the read was taken. |
| `rows` | `object[]` | yes | One entry per handler with at least one recorded invocation in the window. A handler absent from this array ran zero times IF it is an ingest handler, and is unmeasured if it is not — the caller already knows which from the catalog, and this read deliberately does not restate a registry fact. |

### `GET /v1/projects/{projectId}/handlers`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project's own id, whose type registry the catalog is resolved against. Not the `nodeId`, which is a different value on the same project and is what the `{nodeId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project these types were resolved against. |
| `version` | `string` | yes | Content hash of the DEPLOYMENT's catalog — the same value `GET /v1/handlers` returns. ⚠️ It does NOT cover the resolved fields, which move when the project's type registry moves. Do not use it alone as a cache key for this response. |
| `handlers` | `object[]` | yes | Every system handler, sorted by key, resolved for this project. |
| `groups` | `object[]` | yes | Every picker group, in display order, with its one-line note. |

### `GET /v1/projects/address-availability`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `candidate` | `string` | yes | The address label to test, e.g. "harvest". Sent raw — it is normalized (trimmed, lower-cased) server-side, and a malformed value is answered rather than rejected. |
| `projectId` | `string` | no | The project asking, when there is one. Omit it when creating. Pass it when renaming: the project's own current address then comes back available, and the project is excluded from every conflict lookup so re-claiming a label it just released is not a conflict. Supplying it requires VIEWER on that project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `candidate` | `string` | yes | The normalized label this answer is about — trimmed and lower-cased, so it may differ from what was sent. Key any client-side cache on this, not on the raw input. |
| `available` | `boolean` | yes | True when a project may claim this address. False covers every reason at once — already taken, reserved, or released so recently that routing caches may still point elsewhere. |
| `reason` | `string \| null` | yes | Why it is unavailable, in words safe to show a person. Non-null exactly when `available` is false. It never names another project. |
| `suggestion` | `string \| null` | yes | A free alternative the server actually checked, not a guess. ADVISORY: true when computed and claimable by someone else a moment later — the create's own conflict response stays the authority. Null when the candidate is available, when the name is reserved (a refusal is a full stop), or when no alternative in range is free. |

### `GET /v1/projects/by-project-id/{projectId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `projectId` | `string` | yes | The project's own id. This route exists so a caller holding a projectId can reach the project without first knowing its nodeId. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id — its address in the org tree, and what almost every `/v1/projects/{nodeId}/*` route takes. Distinct from `projectId`. |
| `projectId` | `string` | yes | The project's own id, used by the routes that say `{projectId}` and by records belonging to it. Distinct from `nodeId`, which addresses the same project's place in the tree — passing one where the other is expected resolves to nothing rather than erroring usefully. |
| `slug` | `string` | yes | The project's URL-safe short name, unique across the platform. |
| `name` | `string` | yes | The project's display name. |
| `subdomain` | `string` | yes | The host this project's own API is served at. Endpoints you author are reachable here, NOT on the design API's host. |
| `kind` | `"PRODUCT" \| "FIXTURE"` | yes | `PRODUCT` is a real tenant project; `FIXTURE` is platform scaffolding. Worth checking when you read a project by id: the LIST returns only PRODUCT, while reading one directly returns either, so an id that never appeared in a listing can still resolve here. |
| `lifecycle` | `object` | yes | Whether this project is live or retired. Grouped because the two dates are one fact — `purgeAfter` means nothing without `retiredAt`, and a live project has neither. |
| `createdAt` | `string` | yes | When the project was created (ISO). |
