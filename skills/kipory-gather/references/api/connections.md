<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Connections

An outside API connected from its OpenAPI link or MCP server, at a project (its functions serve that project) or at an organization (they serve every project under it): one vendor on one host, a function per operation, tested on connect and run on the key kept where it is held. A project uses its own connections and its organization's. Every write is ADMIN where the connection is held — a project key granted ADMIN at its project included; the routes answer at a project or an organization. The connection's source is re-read daily, and a change that breaks a function marks it drifted. A server that signs in with OAuth connects in two steps: the create answers `waiting-for-sign-in` with a `signIn.url` — give it to a person, who signs in at the connection's page in the app; the server's functions are added once they have. An API key cannot sign in.

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
| `POST` | [`/v1/nodes/{nodeId}/connections/{slug}/authorizations`](#post-v1-nodes-nodeid-connections-slug-authorizations) |  |
| `POST` | [`/v1/nodes/{nodeId}/connections/{slug}/checks`](#post-v1-nodes-nodeid-connections-slug-checks) |  |
| `PATCH` | [`/v1/nodes/{nodeId}/connections/{slug}/daily-tests`](#patch-v1-nodes-nodeid-connections-slug-daily-tests) |  |
| `POST` | [`/v1/nodes/{nodeId}/connections/{slug}/refresh`](#post-v1-nodes-nodeid-connections-slug-refresh) |  |
| `GET` | [`/v1/oauth/callback`](#get-v1-oauth-callback) |  |
| `GET` | [`/v1/oauth/client-metadata.json`](#get-v1-oauth-client-metadata-json) |  |

### `GET /v1/nodes/{nodeId}/connections`

The connections a node uses, by slug, paged on `after` and `before`: at a project its own and its organization's, at an organization its own — each with where it is held (`heldAt`), its operations (served or not, and why), its host, its functions and their status, and when its source was last checked. One connection is `GET /v1/nodes/{nodeId}/connections/{slug}`. VIEWER at the node.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |

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
| `paging` | `object` | yes | Where this page sits among the connections the node uses. |

Each item of `connections`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The connection's id. |
| `heldAt` | `object` | yes | Where the connection is held: the project or organization it was created at. A project uses its own connections and its organization's; one is changed and signed in to where it is held. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |
| `sourceKind` | `"openapi" \| "mcp"` | yes | What the link points at: an `openapi` document (3.0 or 3.1) or a remote `mcp` server. |
| `sourceUrl` | `string` | yes | The link it was made from. |
| `snapshotHash` | `string \| null` | yes | A fingerprint of the source as last read; `null` until a connection that signs in has read it once. |
| `operations` | `object[]` | yes | Every operation or tool of the source, served or not. |
| `status` | `"active" \| "drifted" \| "checking-failed" \| "waiting-for-sign-in" \| "needs-reconnect" \| "needs-more-access" \| "sign-in-unreachable"` | yes | How the connection stands: `active`; `drifted` when the source changed in a way that breaks a function; `checking-failed` when the source could not be read for three days. A connection that signs in with OAuth may also be: `waiting-for-sign-in` until a person signs in once (give them `signIn.url`); `needs-reconnect` when the server refused the saved sign-in, so its functions fail until someone signs in again; `needs-more-access` when a step needs permissions the sign-in did not give (`signIn.scopes` lists what the next sign-in asks for); `sign-in-unreachable` when the server's sign-in is not answering — Kipory keeps trying, and flows run while the current sign-in lasts. |
| `statusReason` | `string \| null` | no | A short sentence behind a sign-in status ("Linear refused the saved sign-in on 11 Nov"), or what the first read after a sign-in found: why it failed, or an operation named at create that the server does not have. `null` or absent otherwise. |
| `signIn` | `object` | no | What a person must do: sign in once at the connection's page. Present while the connection is `waiting-for-sign-in`, `needs-reconnect` or `needs-more-access`. |
| `signedIn` | `object` | no | Who signed the connection in, and what the server granted. Never a token. |
| `driftCheckedAt` | `string \| null` | yes | When the source was last read; `null` before the first check. |
| `driftNotCheckedSince` | `string \| null` | yes | Since when reading the source has failed; `null` while it reads. |
| `createdBy` | `string` | yes | Who made the connection. |
| `createdAt` | `string` | yes | When it was made. |
| `updatedAt` | `string` | yes | When it last changed; send it back to change it. |
| `updatedBy` | `string` | yes | Who last changed it. |
| `hosts` | `string[]` | yes | The one host its functions call. |
| `dailyTests` | `boolean` | yes | Whether its functions are called once a day to check them. |
| `keyProven` | `boolean` | yes | Whether a call on its key has been answered. `false` (key not yet proven) when every operation it serves sends: nothing is called when it is connected, and the first send its API answers proves the key. A key the API refuses on a send raises the sends-failing alert where it is held. Always `true` for a connection with no credential: there is no key to prove. |
| `signsWith` | `"none" \| "api-key" \| "bearer" \| "basic" \| "oauth2"` | yes | How it signs its requests — the credential kind it was connected with: `none` (no credential: nothing kept, nothing sent), `api-key`, `bearer`, `basic` or `oauth2` (a person's sign-in or a client's own credentials). Never the credential itself. |
| `abilities` | `object[]` | yes | Its functions, newest version of each, by key. |

### `POST /v1/nodes/{nodeId}/connections`

Connect an OpenAPI 3.0 or 3.1 document or an MCP server with a credential, at a project (its functions serve that project) or an organization (they serve every project under it): each operation becomes a function, named `<slug>.<operation>`. Only reads are called, at most five, each once on your credential; a read whose call fails stays hidden. An operation that sends is never called: it is served once its shape checks, and shown. A read left untested is shown, not run, and counts neither way: the source gives no value for a setting it needs (`testNeeds`), it is past the five, or the service could not judge it (it did not answer, asked to slow down, or its account is out of credit or quota). Name an operation in `sends` to keep it from ever being called. When every read that was called fails, nothing is kept (424, each failure named). When no read was called, the sends' shape checks decide: every one failing is still 424, and otherwise the connection is kept with its key not yet proven (`keyProven: false`), as it is when there is no send either. `validateOnly` reads the document and answers what would be added, with no call made and nothing kept. 409 for a slug that is one of Kipory's function subjects, one a connection holds anywhere in the organization — at it or at any of its projects (a deleted connection's is free), or the organization at its connection limit, which counts its projects' connections too; 422 for a link that cannot be read (its host named), a document too large or with too many operations, OpenAPI 2.0, or nothing that can be served. Read connections with `GET /v1/nodes/{nodeId}/connections`. ADMIN at the node.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |
| `sourceKind` | `"openapi" \| "mcp"` | yes | What the link points at: an `openapi` document (3.0 or 3.1) or a remote `mcp` server. |
| `sourceUrl` | `string` | yes | The link to the OpenAPI document or the MCP server. Its host is the only host the connection may call. |
| `credential` | `object` | yes | How Kipory signs requests to this source: `none` for a public server, else kept in the vault where the connection is held and never shown again. |
| `operations` | `string[]` | no | The operations or tools to add, by name, as `"GET /parcels/{id}"`, or by the document's `operationId`; absent, every one that can be served. |
| `reads` | `string[]` | no | Operations or tools that only read, though the source says they send — a search sent as a `POST`, say — by name, as `"POST /search"` or by its `operationId` in the document. Each is tested and served as a read. Absent: every `GET` or `HEAD` operation, and every tool marked read-only, is a read; every other one sends. |
| `sends` | `string[]` | no | Operations or tools that change something, though the source says they only read — a `GET /logout`, say — by name, as `"GET /logout"` or by its `operationId`. Each is served as a send: never called by a test, sent once per run after the run is saved. An operation is named in `reads` or `sends`, not both. |
| `include` | `object` | no | Narrows which operations of the document are considered. |
| `validateOnly` | `boolean` | no | When true, reads the source and answers what would be added, with nothing written. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `operations` | `object[]` | yes | Every operation or tool read, served or not. |
| `types` | `object[]` | yes | The output types it would add. |
| `hosts` | `string[]` | yes | The hosts its functions would call: one. |
| `warnings` | `string[]` | yes | What to know before connecting. |
| `signIn` | `object` | no | For a connection that signs in: what the sign-in would ask once it is created. Nothing behind the sign-in is read before then; an OpenAPI document, read with no credential, is. |

Each item of `operations`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The operation's name in the connection's functions: `get-parcel` in `parcel-desk.get-parcel`. |
| `operationRef` | `string` | yes | Where it is in the source: `"GET /parcels/{id}"` in a document, or the tool's name. |
| `hash` | `string` | yes | A fingerprint of the operation as read; a change to it is how the daily check sees the source move. |
| `served` | `boolean` | yes | Whether it became a function. |
| `reason` | `string` | no | Why it is not served, why its function is hidden, or why its test was not run. |
| `effect` | `"read" \| "send"` | yes | Whether it only reads, or sends something to the source. A function that sends is sent once per run, after the run is saved, and is never tested daily. |
| `unsupported` | `true` | no | Not served because Kipory cannot serve it yet (a file upload, a setting that takes a list), not because it was left out; `reason` says what. Absent otherwise. |
| `markedRead` | `true` | no | You marked it a read when connecting (`reads`): the source says it sends, and it is served as a read. |
| `failingHidden` | `object` | no | Hidden by the daily check because most of its calls failed: steps already using it keep running, no new step may. Test it from its page to show it again. |
| `markedSend` | `true` | no | You marked it as sending when connecting (`sends`): the source says it only reads, and it is served as a send, never called by a test. |
| `abilityId` | `string` | no | The function version it became, when served. |
| `testNeeds` | `object[]` | no | The settings its test call had no value for — the source gives no example or default — so its test was not run and its function is shown, marked Not run. Test it with a value for each: `PATCH …/connections/{slug}/abilities/{operation}` with `input`. Absent when nothing is missing. |
| `testInput` | `object` | no | The values you gave when testing it (`input` when showing it), and only those: each test call and daily test sends the source's current examples and defaults with these laid over them. Absent: the source's examples and defaults alone. |
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

One connection: its status, every operation (served or not, why, whether it reads or sends, how its source last moved), its host, its last check, its functions with their status and locks, and how each function's calls are going (its latest test, and its answered and failed requests in the last 24 hours across the projects it serves). Never its credential. At a project, its own connection of that slug, else its organization's. The list is `GET /v1/nodes/{nodeId}/connections`. VIEWER at the node.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `health` | `object[]` | yes | Each function's latest test and its last 24 hours of calls across every project it serves, by key. |

Each item of `health`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The ability's function key, two lower-kebab words joined by a dot: `reddit.user-comments`, or a connection's `parcel-desk.get-parcel`. |
| `lastTest` | `object \| null` | yes | Its latest test. `null`: never tested by a call — a function that sends is checked by its shape, and nothing is sent. |
| `answered` | `integer` | yes | Requests your runs made in the last 24 hours that the API answered, with data or with nothing. |
| `failed` | `integer` | yes | Requests your runs made in the last 24 hours that ended any other way: refused, not found, rate limited, an error, or no answer. |

### `PATCH /v1/nodes/{nodeId}/connections/{slug}`

Change which operations a connection serves, or replace its credential, with its lock. An operation left out of `operations` stops being served and its function retires (409 while a step in a project it serves uses it, each named); a new one is tested and added — one of the source as it was last read: an operation new in it since is added after `POST …/connections/{slug}/refresh`. A new credential is tested on every function first: when every test fails it is not kept (424). A function's status is `PATCH …/connections/{slug}/abilities/{operation}`. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `operations` | `string[]` | no | Every operation to serve from now on, by name, as `"GET /parcels/{id}"`, or by the document's `operationId`: one left out stops being served and its function retires; a new one is tested and added. Where a breaking change put a new function beside the old one, name the functions to keep: leaving the old one's name out (`get-carrier`, keeping `get-carrier-2`) drops it, and the new one takes the operation over. |
| `credential` | `object` | no | A new credential: a key, on which every function is tested again before it is kept; or, for a connection that signs in, your own app at its server (`kind: "oauth2"`), saved for that server and used by the next sign-in. Never shown again. |
| `version` | `string` | yes | The `lock` you last read. A write against an older one answers 409 `VERSION_CONFLICT`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |

### `DELETE /v1/nodes/{nodeId}/connections/{slug}`

Delete a connection: its functions stop being served, its credential is removed from the vault where it is held, and its slug is free again: a new connection may take it, and its functions the same names. Past runs keep their history. 409 while a step in a project it serves uses one of its functions, each named. `validateOnly=true` judges it and removes nothing. Stopping one operation is `PATCH …/connections/{slug}`. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
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
| `revoked` | `boolean \| null` | yes | For a connection that signs in: whether its sign-in was revoked at the server, so the token Kipory held stops working there. `null` when it held none, the server offers no revocation, or this was a dry run. |

Shape 2:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The connection's id. |
| `deleted` | `false` | yes | Nothing was removed: a dry run. |
| `validateOnly` | `true` | yes | This was a dry run. |
| `retired` | `string[]` | yes | The functions that stopped (or would stop) being served. |
| `revoked` | `boolean \| null` | yes | For a connection that signs in: whether its sign-in was revoked at the server, so the token Kipory held stops working there. `null` when it held none, the server offers no revocation, or this was a dry run. |

### `PATCH /v1/nodes/{nodeId}/connections/{slug}/abilities/{operation}`

Show a hidden function once a fresh test call on the stored credential passes, with the function's lock; `input` gives the settings to test it with (a value for each of its operation's `testNeeds`), kept as its `testInput` once it passes. Given `input`, a read already shown is tested again on it, and its values kept when it passes. The answer says the test passed (`test`), and carries no `test` when none ran; a test that fails is 424 `CONNECTION_TEST_FAILED` naming why, and nothing is kept (a hidden function stays hidden). 422 when `input` names something that is not a setting of the operation, or is over 32 KB, or is given for a function that sends: its test checks its shape and calls nothing, so it takes no input. The kept values are shown to anyone who can read the connection: settings, not secrets. A shown function cannot be hidden through this route — the daily connection check hides one whose calls keep failing (`failingHidden`); to stop using one, stop serving its operation with `PATCH …/connections/{slug}` to retire it (409). 404 for a function the connection does not serve. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |
| `operation` | `string` | yes | The operation's name in the connection, `get-parcel`. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `status` | `"shown" \| "hidden"` | yes | `shown` lists a hidden function once a fresh test call passes. A shown function cannot be hidden through this route; the daily connection check hides one that keeps failing in use. |
| `input` | `object` | no | Settings to test it with, by name — a value for each of its operation's `testNeeds`, say (`{ "petId": 1 }`). Each must be one of its operation's settings (422 naming the others), at most 32 KB in all. Laid over what its test would send; given, a read is tested on them even when it is already shown; a function that sends takes none (422). Once the test passes they are kept as its `testInput`, so its later test calls and daily tests send them too, and anyone who can read the connection sees them: they are settings, not secrets — a credential goes in `credential`. |
| `version` | `string` | yes | The function's lock. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `connection` | `object` | yes | A connection. Its credential is never part of it. |
| `lock` | `string` | yes | The connection's lock: send it as `version` to change it. |
| `changeIds` | `string[]` | yes | The change rows the write appended, in order. |
| `warnings` | `string[]` | yes | What to know: an operation whose test call failed stays hidden, with why. |
| `test` | `object` | no | How the test call went; absent when no test ran (the function already had the status asked, and no `input` was given). |

### `POST /v1/nodes/{nodeId}/connections/{slug}/authorizations`

Start a sign-in on a connection that signs in with OAuth (`waiting-for-sign-in`, `needs-reconnect`, `needs-more-access`, or to sign in again): answers the server's sign-in URL for the person's browser, asking for the permissions the server names (and the missing ones a step needed). Only a person signed in to Kipory with ADMIN where the connection is held (the project or organization in its `heldAt`): an API key is refused (403 `sign-in-needs-a-person`) — give a person the connection's `signIn.url`. 409 `needs-own-app` when the server takes no client Kipory can register (save your own app with `PATCH …/connections/{slug}`), 409 `not-oauth` for a connection on a key or on client credentials, 422 when the server no longer passes discovery (`no-s256`, `issuer-mismatch`); 503 `sign-in-server-unavailable` when the server could not register Kipory's client just now — nothing was saved, try again later. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connection of that slug, else its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `returnTo` | `string` | no | The app page to come back to after the sign-in, as a path (`/acme/services/linear`); absent, the connection's page under its organization. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `authorizeUrl` | `string` | yes | Where the person's browser goes next: the server's sign-in page, asking for the permissions it names. It comes back to Kipory's callback, then to `returnTo` when given, else the connection's page. |
| `expiresAt` | `string` | yes | When the sign-in must be finished by: ten minutes from now. |

### `POST /v1/nodes/{nodeId}/connections/{slug}/checks`

Check the connection's source now, as the daily check does: it is read again and compared with what was connected, and each shown function that failed most of its calls in the last 7 days is hidden (`failingHidden`); nothing is called or spent. Answers 202 at once; the result is on `GET /v1/nodes/{nodeId}/connections/{slug}`. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
| `slug` | `string` | yes | The connection's name, lower-kebab: the first word of every function it adds (`parcel-desk.get-parcel`). |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `queued` | `true` | yes | The check is on its way. |

### `PATCH /v1/nodes/{nodeId}/connections/{slug}/daily-tests`

Switch the connection's daily tests on or off, with its lock: once a day each reading function is called on your own account at the source, and a change in its answer is shown on the connection. Off until you turn them on; a function that sends is never tested. 422 when `input` names a function that sends or one the connection does not serve, on or off; turning them on is also refused (422) when nothing would be tested. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
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

Read the connection's source again and pin it as it is now, with the connection's lock: how a drifted connection is accepted, and how an operation new in the source becomes one you can add. Each served function that changed without breaking is tested on the stored credential and serves its new version once the test passes; one whose test fails waits hidden while its earlier version keeps serving. One whose change would break it keeps serving its old shape, and its new shape is offered as a new function beside it, named with a number (`get-carrier-2`), tested and shown as a connect would: move the steps to it, then drop the old one with `PATCH …/connections/{slug}`; the connection stays drifted until then. A function the source no longer serves retires — unless a step still runs it: then it keeps serving and is named. `validateOnly` answers what would change, with no call made. The daily comparison alone is `POST …/connections/{slug}/checks`. 422 for a source that cannot be read or has too many operations. ADMIN where the connection is held.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project or organization. At a project, its own connections and its organization's. |
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

### `GET /v1/oauth/callback`

Where a connection's sign-in server sends the person back. Kipory checks the sign-in was started by this same signed-in person within ten minutes and came from the server it went to, redeems the code, keeps the sign-in in the organization's vault, then adds the server's functions, and redirects to the connection's page in the app with `?signed-in=1` (`&changed=1` when it now acts as another account, `&cleared=1` when the organization's alert for it closes) or `?error=<code>`: `access-denied`, `expired`, `other-user`, `wrong-server`, `no-refresh`, `token-refused`, `not-admin`, `save-failed`, `import-failed` (`&reason=`), `server-error`. Nothing is kept on an error but `import-failed`'s sign-in. Not called by an agent: a sign-in starts at `POST /v1/nodes/{nodeId}/connections/{slug}/authorizations`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `state` | `string` | no | The pending sign-in, as Kipory sent it to the server. |
| `code` | `string` | no | The authorization code, on success. |
| `iss` | `string` | no | The server's issuer (RFC 9207): it must be the one the sign-in went to. |
| `error` | `string` | no | The server's OAuth error, when it did not sign in. |

### `GET /v1/oauth/client-metadata.json`

Kipory's OAuth client, as a Client ID Metadata Document: a sign-in server that takes one reads it to learn who Kipory is and where it may send a person back. Public and the same for every caller.

**Response `200`**

_No fields._
