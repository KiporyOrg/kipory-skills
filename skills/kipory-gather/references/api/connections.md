<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Organization connections

An outside API an organization connects from its OpenAPI link: one vendor on one host, a function per reading operation, tested on connect and run on the organization's own key. Every write is ADMIN at the organization node; the routes answer at an organization, never a project. The connection's source is re-read daily, and a change that breaks a function marks it drifted.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/nodes/{nodeId}/connections`](#get-v1-nodes-nodeid-connections) |  |
| `POST` | [`/v1/nodes/{nodeId}/connections`](#post-v1-nodes-nodeid-connections) |  |
| `GET` | [`/v1/nodes/{nodeId}/connections/{slug}`](#get-v1-nodes-nodeid-connections-slug) |  |
| `PATCH` | [`/v1/nodes/{nodeId}/connections/{slug}`](#patch-v1-nodes-nodeid-connections-slug) |  |
| `DELETE` | [`/v1/nodes/{nodeId}/connections/{slug}`](#delete-v1-nodes-nodeid-connections-slug) |  |
| `PATCH` | [`/v1/nodes/{nodeId}/connections/{slug}/abilities/{operation}`](#patch-v1-nodes-nodeid-connections-slug-abilities-operation) |  |
| `POST` | [`/v1/nodes/{nodeId}/connections/{slug}/checks`](#post-v1-nodes-nodeid-connections-slug-checks) |  |
| `PATCH` | [`/v1/nodes/{nodeId}/connections/{slug}/daily-tests`](#patch-v1-nodes-nodeid-connections-slug-daily-tests) |  |
| `POST` | [`/v1/nodes/{nodeId}/connections/{slug}/refresh`](#post-v1-nodes-nodeid-connections-slug-refresh) |  |

### `GET /v1/nodes/{nodeId}/connections`

An organization's connections by slug, paged on `after` and `before`: each with its operations (served or not, and why), its host, its functions and their status, and when its source was last checked. At a project, its organization's. One connection is `GET /v1/nodes/{nodeId}/connections/{slug}`. VIEWER at the node.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | Connections per page, 50 by default. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connections` | `object[]` | yes | This page, by slug. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |
| `paging` | `object` | yes | Where this page sits among the organization's connections. |

Each item of `connections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The connection's id. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |
| `sourceKind` | `"openapi" \| "mcp"` | yes | What the link points at: an `openapi` document (3.0 or 3.1) or a remote `mcp` server. |
| `sourceUrl` | `string` | yes | The link it was made from. |
| `snapshotHash` | `string` | yes | A fingerprint of the source as last read. |
| `operations` | `object[]` | yes | Every operation or tool of the source, served or not. |
| `status` | `"active" \| "drifted" \| "checking-failed"` | yes | How the connection stands: `active`; `drifted` when the source changed in a way that breaks a function; `checking-failed` when the source could not be read for three days. |
| `driftCheckedAt` | `string \| null` | yes | When the source was last read; `null` before the first check. |
| `driftNotCheckedSince` | `string \| null` | yes | Since when reading the source has failed; `null` while it reads. |
| `createdBy` | `string` | yes | Who made the connection. |
| `createdAt` | `string` | yes | When it was made. |
| `updatedAt` | `string` | yes | When it last changed; send it back to change it. |
| `updatedBy` | `string` | yes | Who last changed it. |
| `hosts` | `string[]` | yes | The one host its functions call. |
| `dailyTests` | `boolean` | yes | Whether its functions are called once a day to check them. |
| `abilities` | `object[]` | yes | Its functions, newest version of each, by key. |

### `POST /v1/nodes/{nodeId}/connections`

Connect an OpenAPI 3.0 or 3.1 document to your organization with a credential: each reading operation becomes a function every project under it can use, named `<slug>.<operation>`. One test call per operation is made on your credential; an operation whose test fails stays hidden, and when every one fails nothing is kept (424, each failure named). An operation that sends is listed as not served. `validateOnly` reads the document and answers what would be added, with no call made and nothing kept. 409 for a slug that is one of Kipory's function subjects, one a connection of the organization holds (a deleted connection's is free), or the organization at its connection limit; 422 for a link that cannot be read (its host named), a document too large or with too many operations, OpenAPI 2.0, or nothing that can be served. Read connections with `GET /v1/nodes/{nodeId}/connections`. ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |
| `sourceKind` | `"openapi" \| "mcp"` | yes | What the link points at: an `openapi` document (3.0 or 3.1) or a remote `mcp` server. |
| `sourceUrl` | `string` | yes | The link to the OpenAPI document or the MCP server. Its host is the only host the connection may call. |
| `credential` | `object` | yes | How Kipory signs requests to this source. Kept in your organization's vault; never shown again. |
| `operations` | `string[]` | no | The operations or tools to add, by name or as `"GET /parcels/{id}"`; absent, every one that can be served. |
| `include` | `object` | no | Narrows which operations of the document are considered. |
| `validateOnly` | `boolean` | no | When true, reads the source and answers what would be added, with nothing written. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `operations` | `object[]` | yes | Every operation or tool read, served or not. |
| `types` | `object[]` | yes | The output types it would add. |
| `hosts` | `string[]` | yes | The hosts its functions would call: one. |
| `warnings` | `string[]` | yes | What to know before connecting. |

Each item of `operations`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The operation's name in the connection's functions: `get-parcel` in `parcel-desk.get-parcel`. |
| `operationRef` | `string` | yes | Where it is in the source: `"GET /parcels/{id}"` in a document, or the tool's name. |
| `hash` | `string` | yes | A fingerprint of the operation as read; a change to it is how the daily check sees the source move. |
| `served` | `boolean` | yes | Whether it became a function. |
| `reason` | `string` | no | Why it is not served, or why its function is hidden. |
| `effect` | `"read" \| "send"` | yes | Whether it only reads, or sends something to the source. |
| `abilityId` | `string` | no | The function version it became, when served. |
| `drift` | `"additive" \| "breaking"` | no | How the source last moved for it: `additive` (a new version waits), or `breaking` (its function keeps the old shape until you act). |
| `functionName` | `string` | no | Its function's name when it is not the operation's: `get-parcel-2` in `parcel-desk.get-parcel-2`, once a breaking change's new function took over from the old one. |
| `newShape` | `object` | no | The operation changed in a way that breaks its function, so its new shape is a new function beside the old one. The old one keeps serving its old shape: move your steps to the new one, then drop the old one. |

Each item of `types`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The type's name. |
| `inferred` | `boolean` | yes | Whether it would be inferred from a test answer, the source giving no schema. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |

### `GET /v1/nodes/{nodeId}/connections/{slug}`

One connection: its status, every operation (served or not, why, whether it reads or sends, how its source last moved), its host, its last check, and its functions with their status and locks. Never its credential. At a project, its organization's. The list is `GET /v1/nodes/{nodeId}/connections`. VIEWER at the node.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |

### `PATCH /v1/nodes/{nodeId}/connections/{slug}`

Change which operations a connection serves, or replace its credential, with its lock. An operation left out of `operations` stops being served and its function retires (409 while a step in a project of the organization uses it, each named); a new one is tested and added — one of the source as it was last read: an operation new in it since is added after `POST …/connections/{slug}/refresh`. A new credential is tested on every function first: when every test fails it is not kept (424). A function's status is `PATCH …/connections/{slug}/abilities/{operation}`. ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `operations` | `string[]` | no | Every operation to serve from now on, by name or as `"GET /parcels/{id}"`: one left out stops being served and its function retires; a new one is tested and added. Where a breaking change put a new function beside the old one, name the functions to keep: leaving the old one's name out (`get-carrier`, keeping `get-carrier-2`) drops it, and the new one takes the operation over. |
| `credential` | `object` | no | A new credential: every function is tested on it again before it is kept. Never shown again. |
| `version` | `string` | yes | The `lock` you last read. A write against an older one answers 409 `VERSION_CONFLICT`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |

### `DELETE /v1/nodes/{nodeId}/connections/{slug}`

Delete a connection: its functions stop being served, its credential is removed from your organization's vault, and its slug is free again: a new connection may take it, and its functions the same names. Past runs keep their history. 409 while a step in a project of the organization uses one of its functions, each named. `validateOnly=true` judges it and removes nothing. Stopping one operation is `PATCH …/connections/{slug}`. ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | `true` judges the delete and removes nothing. |

**Response `200`**

One of 2 shapes:

Shape 1:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The connection's id. |
| `deleted` | `true` | yes | The connection is gone. |
| `validateOnly` | `false` | yes | This was no dry run. |
| `retired` | `string[]` | yes | The functions that stopped (or would stop) being served. |

Shape 2:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The connection's id. |
| `deleted` | `false` | yes | Nothing was removed: a dry run. |
| `validateOnly` | `true` | yes | This was a dry run. |
| `retired` | `string[]` | yes | The functions that stopped (or would stop) being served. |

### `PATCH /v1/nodes/{nodeId}/connections/{slug}/abilities/{operation}`

Show a hidden function once a fresh test call on the stored credential passes (424 when it fails), with the function's lock. A shown function is never hidden again: stop serving its operation with `PATCH …/connections/{slug}` to retire it (409). ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |
| `operation` | `string` | yes | The operation's name in the connection, `get-parcel`. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `status` | `"shown" \| "hidden"` | yes | `shown` lists a hidden function once a fresh test call passes; a shown function cannot go back to hidden. |
| `version` | `string` | yes | The function's lock. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |

### `POST /v1/nodes/{nodeId}/connections/{slug}/checks`

Check the connection's source now, as the daily check does: it is read again and compared with what was connected, and nothing is called or spent. Answers 202 at once; the result is on `GET /v1/nodes/{nodeId}/connections/{slug}`. ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `queued` | `true` | yes | The check is on its way. |

### `PATCH /v1/nodes/{nodeId}/connections/{slug}/daily-tests`

Switch the connection's daily tests on or off, with its lock: once a day each reading function is called on your own account at the source, and a change in its answer is shown on the connection. Off until you turn them on; a function that sends is never tested (422). ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `enabled` | `boolean` | yes | Whether each reading function is called once a day, on your own account at the source. |
| `input` | `object` | no | Per operation, what its daily call sends; absent, what its first test sent. |
| `version` | `string` | yes | The `lock` you last read. A write against an older one answers 409 `VERSION_CONFLICT`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |

### `POST /v1/nodes/{nodeId}/connections/{slug}/refresh`

Read the connection's source again and pin it as it is now, with the connection's lock: how a drifted connection is accepted, and how an operation new in the source becomes one you can add. Each served function that changed without breaking is tested on the stored credential and serves its new version once the test passes; one whose test fails waits hidden while its earlier version keeps serving. One whose change would break it keeps serving its old shape, and its new shape is offered as a new function beside it, named with a number (`get-carrier-2`), tested and shown as a connect would: move the steps to it, then drop the old one with `PATCH …/connections/{slug}`; the connection stays drifted until then. A function the source no longer serves retires — unless a step still runs it: then it keeps serving and is named. `validateOnly` answers what would change, with no call made. The daily comparison alone is `POST …/connections/{slug}/checks`. 422 for a source that cannot be read or has too many operations. ADMIN at the organization.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The organization. A project's id reads its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `boolean` | no | `true` reads the source and answers what would change, with no call made and nothing kept. |
| `version` | `string` | yes | The `lock` you last read. A write against an older one answers 409 `VERSION_CONFLICT`. |

**Response `200`**

One of 2 shapes:

Shape 1:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `true` | yes | A dry run: nothing was kept. |
| `refresh` | `object` | yes | What the refresh did, or would do. |
| `warnings` | `string[]` | yes | What to know about the source. |

Shape 2, with `connection`, `lock`, `changeIds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |
| `validateOnly` | `false` | yes | The refresh was kept. |
| `refresh` | `object` | yes | What the refresh did, or would do. |
