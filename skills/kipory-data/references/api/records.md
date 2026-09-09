<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: a22b93e6cbba · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Records and relations

The project's own data: listing records, reading and stating a record's typed edges one hop at a time, and watching a record's processing as it happens.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/projects/{nodeId}/records`](#get-v1-projects-nodeid-records) |  |
| `GET` | [`/v1/projects/{nodeId}/relations`](#get-v1-projects-nodeid-relations) |  |
| `GET` | [`/v1/records/{id}/processing-stream`](#get-v1-records-id-processing-stream) | SSE |
| `GET` | [`/v1/records/{id}/relations/{kind}`](#get-v1-records-id-relations-kind) |  |
| `POST` | [`/v1/records/{id}/relations/{kind}`](#post-v1-records-id-relations-kind) |  |
| `DELETE` | [`/v1/records/{id}/relations/{kind}/{peerRecordId}`](#delete-v1-records-id-relations-kind-peerrecordid) |  |

### `GET /v1/projects/{nodeId}/records`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `string` | no | The record type this query is ABOUT. Omitted, the route chooses the type holding the most records and says so (`chosenByDefault`) — a page has to open on something, and the largest type is the one a reader most likely came for. To ask across EVERY type, send `subject=any`; absence cannot mean both. |
| `subject` | `"any"` | no | Send `any` to ask across every record type. ⛔ IT IS A SEPARATE PARAMETER RATHER THAN A RESERVED `type` VALUE, because the two namespaces genuinely collide: a project may declare a record type called `any`, and a sentinel sharing that string would mean the sweep or that type depending on who was asking — the same collision `RecordSort` splits into arms for. Refused BESIDE `type`, which names two subjects for one query. A typeless query drops the declared columns and declared conditions (a declared field belongs to one type's contract, and a sweep has no declaration to resolve it against) and is ordered by ARRIVAL, which the response says. |
| `mode` | `"exact" \| "semantic"` | no | `semantic` ranks by resemblance instead of matching literally, and is refused for a type that declares no meaning index. It returns a BOUNDED, UNPAGED ranking: no cursors, no page numbers. |
| `q` | `string` | no | With `mode=exact`, matched against the natural key and the type's declared TEXT fields, case-insensitively. ⛔ It is NOT matched against the record's submitted content: there is deliberately no index on that column, so a predicate there reads every row of the type. With `mode=semantic`, the phrase to resemble. |
| `field` | `string \| string[]` | no | A condition on a declared field, as `name:operator:value`. Repeat for more than one; they are combined with AND. Split on the FIRST TWO colons — the value is everything after the second, so a timestamp keeps its own. Refused, by name, when the field is not declared queryable, when the operator does not belong to its family, or when it has no resolved storage behind it. |
| `term` | `string \| string[]` | no | A vocabulary condition, as `facet:slug`. Repeat for more than one. |
| `owner` | `string` | no | Narrow to the records ONE end-user owns, by their user id. Omitted, the list reads across every owner in the project — which is what it has always done, and is now a choice the caller makes rather than one the route makes for them. ⚠️ Records owned by the PROJECT rather than a person are excluded when this is set: they have no owner to match. |
| `status` | `"PENDING" \| "PROCESSING" \| "READY" \| "FAILED"` | no | Narrow to one processing state. |
| `createdAfter` | `string` | no | Inclusive lower bound on when the record arrived, regardless of how the result is ordered. |
| `createdBefore` | `string` | no | Inclusive upper bound on when the record arrived. |
| `sort` | `string` | no | WHICH VALUE IS ACCEPTED DEPENDS ON THE MODE, and in two of the three the default is refused — so a caller that sends nothing must send something. Within one type: `createdAt`, `updatedAt`, or `declared:<name>`. Under `subject=any`: `id`, and ONLY `id`. Under `mode=semantic`: `closeness`, and ONLY `closeness`. ⛔ THE TWO NARROW CASES ARE REQUIRED, NOT MERELY PERMITTED. A cross-type ordering by time has no index to walk — every timestamp index on this table leads with `(projectId, recordType, …)` — so it would sort the whole project before the limit applied; a typeless page is ordered by arrival and has to say so rather than be silently reinterpreted. A ranking is ordered by resemblance and nothing else. In both, the sent word is what distinguishes a caller who MEANT that ordering from one carrying this field's default by accident, which is why neither is inferred. ⚠️ `id` is refused within one type and `createdAt` is refused under a sweep — the accepted sets do not overlap. ⚠️ A declared sort is accepted ONLY for a field whose family is `date`: the keyset reads its boundary back in the slot's own type and the port refuses every other family. Any other family is a refusal naming the field, not a silent fallback. |
| `order` | `"asc" \| "desc"` | no | Which way the `sort` runs. Refused as `asc` on a ranking: closeness has one direction and reversing it asks for the least similar. |
| `limit` | `integer` | no | Rows per page. Ignored by a meaning-based result, which is bounded by the ranking rather than by a page size. |
| `after` | `string` | no | The page after this row — pass back the `nextCursor` you were given. |
| `before` | `string` | no | The page before this row. Refused together with `after`: they name opposite directions from one row. |
| `record` | `string` | no | Open this record's detail beside the result. It travels in the query rather than in a path because a record has no page of its own: the reader is still looking at the list, and the address has to carry BOTH — the query and which row is open — so that sharing it reproduces the screen rather than one half of it. |
| `page` | `integer` | no | Jump to this page, 1-based, resolved as an OFFSET and therefore approximate while records are arriving. Ignored when this route declines to count, because a page number it did not measure is a number it must not honour. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `contract` | `object \| null` | yes | Null on a typeless query — there is no one declaration to state. |
| `columns` | `object[]` | yes | The type's DECLARED columns, in declaration order. Empty on a typeless query, and the universal spine is drawn whatever this holds. |
| `records` | `object[]` | yes | The page, in `ordering`. |
| `ordering` | `"newest-first" \| "oldest-first" \| "arrival" \| "closeness"` | yes | What the rows are actually in. ⚠️ `arrival` is the typeless view's honest answer: only `(projectId, id)` serves it, so ordering by `createdAt` would sort the whole project before the limit applies. `closeness` is a ranking and cannot be walked. |
| `paging` | `object \| null` | yes | Null when this route DECLINED to count — an unnarrowed corpus over `PROJECT_RECORDS_COUNT_THRESHOLD`, or any meaning-based result. Null is a statement, not an omission: the page says so and falls back to step controls. It is never computed by the client. |
| `declinedCountReason` | `"corpus-too-large" \| "ranking-has-no-position"` | yes | Why `paging` is null, when it is. ⛔ THEY ARE NOT THE SAME ABSENCE: the first is a number this route could compute and declined to, the second is a number that does not exist. A client drawing both the same way would offer to retry one of them. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page, which is the only honest way for a client to know it is at the start: it cannot infer that from a full page. |
| `record` | `object \| null` | yes | The record `?record=` named, opened beside the result. Null when none was asked for AND when the one asked for is gone — a reader whose bookmark outlived a record is told so, with the list intact (FR-034); the page tells the two apart from its own address. |
| `ranking` | `object \| null` | yes | Present only for a meaning-based result. The bound is stated so a reader who suspects the answer is further down knows there is no further down and must narrow instead. |

### `GET /v1/projects/{nodeId}/relations`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `link` | `string` | no | Narrow to these link keys — the `key` of a relation kind, not its id. Comma-separated; an unknown member narrows to nothing rather than being ignored, so a stale bookmark shows an empty result and not a wider one. |
| `producer` | `string` | no | Narrow to these producers — a `field:<type>.<field>` path, or a curated actor's key. Comma-separated; an unknown member narrows to nothing rather than being ignored, so a stale bookmark shows an empty result and not a wider one. |
| `validity` | `"live" \| "retracted" \| "all"` | no | Which edges to include. `live` is the default because a retracted edge is history: it is still readable, and it is not what the graph says now. ⚠️ Only a CURATED link can have any — a field producer rewrites by deleting, so `retracted` over a field-only corpus is correctly empty rather than broken. |
| `record` | `string` | no | Anchor the result on one record: only edges with this record at either end. Cheap — both endpoint columns are indexed — and it is what makes `direction` meaningful. |
| `direction` | `"outgoing" \| "incoming" \| "either"` | no | Which way the edges point RELATIVE TO `record`. Refused without it, because there is no anchor for it to be relative to. IGNORED for a symmetric link — see the schema's own note. |
| `relation` | `string` | no | Open this edge beside the result. An edge has no page of its own, so which one is open is part of the query rather than a second address. |
| `limit` | `integer` | no | Rows per page. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relations` | `object[]` | yes | The page, newest first. |
| `elsewhere` | `object[]` | yes | Links this sweep cannot answer for. See the member's own note. |
| `links` | `object[]` | yes | The link vocabulary, so a picker can be drawn without a second call. Every link the project has, including the join-backed ones this sweep excludes — a picker that could not offer them would hide the existence of relations that are merely somewhere else. |
| `paging` | `object \| null` | yes | Null when this route declined to count — see `declinedCountReason`. Never computed by the client: a cursor names a row, so nothing on the far side knows which page it is on. |
| `declinedCountReason` | `"corpus-too-large"` | yes | Why `paging` is null, when it is. One arm today, and it stays an enum rather than a boolean because the records list has two and the second has no remedy — a client drawing 'narrow the view for a total' over the wrong one offers a control that cannot work. |
| `detail` | `object \| null` | yes | The edge `?relation=` named, or null. ⚠️ NULL IS TWO STATES AND THE CLIENT ALREADY KNOWS WHICH: it asked for none, or the id names no edge of this project — a stale bookmark, or one from another tenant, which are answered identically and on purpose. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the next page of OLDER rows, or null at the end. Minted from this page's LAST row and sent only where a row beyond it was measured. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the previous page of NEWER rows, or null at the start. ⛔ MINTED FROM THIS PAGE'S FIRST ROW, never from the cursor the caller arrived on — that address reproduces the page they are already reading, which is a control that goes nowhere. |

### `GET /v1/records/{id}/processing-stream`

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `snapshot`, `status`, `error`, `close`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id, as returned when it was created or listed. |

**Response `200`** (first frame shape, when declared)

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `recordId` | `string` | yes | The record being watched. |
| `status` | `"PENDING" \| "PROCESSING" \| "READY" \| "FAILED" \| "DELETING"` | yes | Where the record stood WHEN YOU CONNECTED — the starting point, not a live tick. |
| `statusError` | `string \| null` | yes | Why it failed, when it has. Null in every other state. |
| `statusUpdatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `at` | `integer` | yes | When the server emitted this frame, in unix milliseconds. For correlating logs, not for ordering. |
| `skill` | `string` | no | The step now starting. Present only while processing is under way. |
| `error` | `string` | no | Why it failed. Present only on the failing frame. |
| `requestId` | `string` | yes | The request that started this processing run, for correlation. |
| `code` | `"CLIENT_TOO_SLOW" \| "INTERNAL"` | yes | A TRANSPORT fault, not a record failure — the connection broke. `CLIENT_TOO_SLOW` means you were not reading fast enough. Reconnect and take the snapshot again. |
| `message` | `string` | yes | What went wrong, in prose. |
| `type` | `"close"` | yes | Always `close`. The server is ending the stream deliberately — this is an orderly goodbye, not a fault. |
| `reason` | `"lifetime" \| "transport-unavailable" \| "revoked" \| "terminal" \| "too-slow"` | yes | Why the stream is ending. ⚠️ If you do not recognise the value, treat it as `lifetime` and reconnect with jitter — that is the only default safe in both directions, since it neither abandons a live subject nor hammers a dead one. |

### `GET /v1/records/{id}/relations/{kind}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record whose relations to read. |
| `kind` | `string` | yes | The relation kind's KEY, not its id — relations are addressed by the stable key you chose when creating the kind. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `direction` | `"outgoing" \| "incoming" \| "either"` | no | Which way the edges point, relative to this record. IGNORED for a symmetric kind, where the stored direction is an implementation detail rather than a fact about the relation. |
| `limit` | `integer` | no | How many edges to return, 50 by default and at most 500. Check `truncated` to see whether the answer was cut short. |
| `includeExpired` | `boolean` | no | Include edges that have since been retracted. Off by default, so a plain read is the CURRENT state rather than the whole history. |
| `orderBy` | `string` | no | Order by one of the kind's declared edge properties. IGNORED when the kind declares none — read `orderedBy` on the response to see which ordering actually ran, so an ignored request is visible rather than silent. |
| `orderDirection` | `"asc" \| "desc"` | no | Which way to sort. Only meaningful alongside `orderBy`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `string` | yes | The relation kind these edges belong to. |
| `edges` | `object[]` | yes | The record's edges of that kind. |
| `truncated` | `boolean` | yes | True when a limit cut this answer short. STATED rather than left to be inferred: you cannot tell a full page from a cut one by counting, and a silently truncated traversal reads as a complete answer. |
| `orderedBy` | `object` | yes | Which ordering ACTUALLY ran, so an ignored `orderBy` is visible. |

### `POST /v1/records/{id}/relations/{kind}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record the relation is being asserted FROM. |
| `kind` | `string` | yes | The relation kind's KEY, not its id — relations are addressed by the stable key you chose when creating the kind. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `targetRecordId` | `string` | yes | The record at the other end of the edge being asserted. |
| `properties` | `object` | no | The edge's properties, matching what the relation kind declares. Sending any at all is refused outright when the kind declares none. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `edgeId` | `string` | yes | The edge that now stands. |
| `outcome` | `"asserted" \| "unchanged"` | yes | `asserted` — a new edge, or a retracted one stated again. `unchanged` — it already stood, so nothing moved and its start time was deliberately left alone. |
| `revived` | `boolean` | yes | True when this brought back an edge that had been retracted. It gets a NEW validity window rather than reopening the old one. |

### `DELETE /v1/records/{id}/relations/{kind}/{peerRecordId}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record the relation is being asserted FROM. |
| `kind` | `string` | yes | The relation kind's KEY, not its id — relations are addressed by the stable key you chose when creating the kind. |
| `peerRecordId` | `string` | yes | The record at the OTHER end of the relation to retract. Retracting removes one edge, not every relation of this kind on the record. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `edgeId` | `string` | yes | The edge that was retracted. |
| `retracted` | `true` | yes | Always `true`. The edge is EXPIRED, not deleted — who asserted it and when both survive, and it can be read again with `includeExpired`. |
