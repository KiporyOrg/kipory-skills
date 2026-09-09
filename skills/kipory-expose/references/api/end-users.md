<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: a22b93e6cbba · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# End users of the product

Who calls a project's endpoints: sign-in providers, the profile shape end users carry, the operator's view over them, and their standing and credits at the project node.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/projects/{nodeId}/auth-config`](#get-v1-projects-nodeid-auth-config) |  |
| `PUT` | [`/v1/projects/{nodeId}/auth-config`](#put-v1-projects-nodeid-auth-config) |  |
| `GET` | [`/v1/projects/{nodeId}/members`](#get-v1-projects-nodeid-members) |  |
| `POST` | [`/v1/projects/{nodeId}/members/{userId}/account-deletion`](#post-v1-projects-nodeid-members-userid-account-deletion) |  |
| `POST` | [`/v1/projects/{nodeId}/members/{userId}/credits`](#post-v1-projects-nodeid-members-userid-credits) |  |
| `GET` | [`/v1/projects/{nodeId}/members/{userId}/deletion-preview`](#get-v1-projects-nodeid-members-userid-deletion-preview) |  |
| `GET` | [`/v1/projects/{nodeId}/members/{userId}/deletion-preview/external`](#get-v1-projects-nodeid-members-userid-deletion-preview-external) |  |
| `PUT` | [`/v1/projects/{nodeId}/members/{userId}/standing`](#put-v1-projects-nodeid-members-userid-standing) |  |
| `GET` | [`/v1/projects/{nodeId}/profile-schema`](#get-v1-projects-nodeid-profile-schema) |  |
| `PUT` | [`/v1/projects/{nodeId}/profile-schema`](#put-v1-projects-nodeid-profile-schema) |  |
| `DELETE` | [`/v1/projects/{nodeId}/profile-schema`](#delete-v1-projects-nodeid-profile-schema) |  |
| `POST` | [`/v1/projects/{nodeId}/profile-schema/starter`](#post-v1-projects-nodeid-profile-schema-starter) |  |
| `GET` | [`/v1/users`](#get-v1-users) |  |
| `GET` | [`/v1/users/{userId}/profile`](#get-v1-users-userid-profile) |  |
| `PATCH` | [`/v1/users/{userId}/profile`](#patch-v1-users-userid-profile) |  |

### `GET /v1/projects/{nodeId}/auth-config`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stored` | `object \| null` | yes | What you saved, verbatim. Null when this project has never set a config — and ALSO null when what it saved failed to parse, so null alone does not distinguish never-set from broken. Read `malformed` to tell them apart. |
| `effective` | `object` | yes | What is actually in force right now. Equal to `stored` when that is valid, and the platform default otherwise. This is the one to read when asking how sign-in currently behaves. |
| `malformed` | `boolean` | yes | True when a config was stored but could not be parsed, so `effective` is the platform fallback rather than what you intended. ⚠️ TREAT THIS AS URGENT: the fallback ENABLES Google sign-in, so a project that deliberately turned Google OFF has it back on while this is true. Nothing else reports it — sign-in keeps working, which is exactly why the change goes unnoticed. |

### `PUT /v1/projects/{nodeId}/auth-config`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `authConfig` | `object \| null` | yes | The whole document, REPLACING whatever is stored — this is not a merge, so a provider you omit becomes disabled. Send null to clear the config and go back to the platform default. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stored` | `object \| null` | yes | What you saved, verbatim. Null when this project has never set a config — and ALSO null when what it saved failed to parse, so null alone does not distinguish never-set from broken. Read `malformed` to tell them apart. |
| `effective` | `object` | yes | What is actually in force right now. Equal to `stored` when that is valid, and the platform default otherwise. This is the one to read when asking how sign-in currently behaves. |
| `malformed` | `boolean` | yes | True when a config was stored but could not be parsed, so `effective` is the platform fallback rather than what you intended. ⚠️ TREAT THIS AS URGENT: the fallback ENABLES Google sign-in, so a project that deliberately turned Google OFF has it back on while this is true. Nothing else reports it — sign-in keeps working, which is exactly why the change goes unnoticed. |

### `GET /v1/projects/{nodeId}/members`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id — the same id `GET /v1/bootstrap` takes, not `projectId`, which is a different value on the same project. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `standing` | `"active" \| "suspended" \| "former"` | no | Show only seats in this standing. Omitted means every standing — an unfiltered roster, not just the healthy part of it. |
| `q` | `string` | no | Case-insensitive substring over the member's email and name. A member who set no name is matched on their email alone. |
| `limit` | `integer` | no | Rows per page. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an OFFSET and therefore approximate while rows are arriving — walking with `after`/`before` is exact and is what the response's cursors are for. Past the last page it CLAMPS to the last one rather than answering empty: an out-of-range page is a URL somebody typed, and an empty list reads as an empty collection. Refused together with `after` or `before`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `members` | `object[]` | yes | This page of seats. |
| `paging` | `object` | yes | Where this page sits in the whole roster. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page of members who joined BEFORE these. NULL means there is nothing further; a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page of members who joined AFTER these. NULL means this is the first page — measured, never inferred from whether the request carried a cursor. |
| `standingCounts` | `object` | yes | How many seats each standing holds, across the WHOLE roster rather than this page — the filter chips' counts. They sum to the unfiltered total; a chip whose count came from the filtered page would report the narrowing it is offering to apply. |

### `POST /v1/projects/{nodeId}/members/{userId}/account-deletion`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirmation` | `string` | yes | The member's email, typed back. Compared trimmed and case-insensitively; a mismatch refuses the request. |
| `eraseContent` | `boolean` | yes | Whether to erase what they created. ⚠️ A SEPARATE DECISION from ending the account: false ends the account and KEEPS the records, which leaves rows in this project owned by somebody who holds no seat on it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `changed` | `boolean` | yes | False when the account was already deleted — the call is idempotent, not an error, and a client should not report a second deletion as a failed one. |
| `deletedMemberships` | `integer` | yes | Seats ended across the WHOLE platform, not only this project. Ending an account ends it everywhere. |
| `revokedApiKeys` | `integer` | yes | API keys this person had minted, now revoked. |
| `walletWrittenOff` | `integer` | yes | Credits written off to settle the account's own wallet, if it had one. |
| `erasureEnqueued` | `boolean` | yes | Whether content erasure was scheduled by THIS call. False on an opt-out and on an idempotent re-run; the daily sweep enqueues any deleted account that still owns content regardless, so false does not mean the content stays. |

### `POST /v1/projects/{nodeId}/members/{userId}/credits`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `amountCredits` | `integer` | yes | How many credits to add to this member's own wallet. |
| `reason` | `string` | yes | Why. REQUIRED by the writer beneath, and written into the ledger entry — it is the only record of why the balance moved. |
| `idempotencyKey` | `string` | no | Makes a double-submit resolve to the existing grant instead of a second one. Omitted, every call is a fresh grant. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `balanceCredits` | `integer` | yes | The member's wallet balance after the grant. |

### `GET /v1/projects/{nodeId}/members/{userId}/deletion-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `email` | `string` | yes | The address the operator must type back to confirm. Compared trimmed and case-insensitively — they are proving intent, not transcription. |
| `records` | `integer` | yes | Records this member owns in this project. |
| `profile` | `integer` | yes | Profiles this member holds (0 or 1). |
| `retainedNote` | `string` | yes | What SURVIVES the deletion, in words. Sent by the platform rather than composed by each client, so every surface makes the same promise. |

### `GET /v1/projects/{nodeId}/members/{userId}/deletion-preview/external`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `files` | `integer` | yes | Files this member uploaded, counted by listing object storage. |
| `vectorPoints` | `integer` | yes | Vector points derived from their content, counted per collection the project declares. |

### `PUT /v1/projects/{nodeId}/members/{userId}/standing`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `standing` | `"active" \| "suspended"` | yes | The standing to move this seat to. `suspended` withholds it; `active` reinstates a suspended one. `former` is deliberately not settable here — withdrawing a seat is its own route. |
| `reason` | `string` | no | Why, for the audit trail. Optional and never gating — it is recorded on the `membership.status_changed` event when given and omitted entirely when not, so an empty reason is never stored as one. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `standing` | `"active" \| "suspended" \| "former"` | yes | The seat's standing after the call — which is its standing BEFORE the call whenever `changed` is false. |
| `changed` | `boolean` | yes | Whether this call moved the seat. False when it already held that standing, and when the seat is `former` — which this route will not reinstate. Idempotent, never an error. ⚠️ NOT `false` for a seat that does not exist: that is a 404, raised before the write is attempted. |

### `GET /v1/projects/{nodeId}/profile-schema`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaEntryId` | `string \| null` | yes | Schema entry the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryName` | `string \| null` | yes | Name of the connected schema entry; null when unconnected. |
| `version` | `integer \| null` | yes | The connected entry's version, for optimistic locking when editing it on the schema-entries resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected entry's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different entry is refused with 409, because stored profiles were seeded from the current one. |

### `PUT /v1/projects/{nodeId}/profile-schema`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaEntryId` | `string` | yes | Schema entry to connect as the project's end-user profile shape. Must be an operator-owned, profile-eligible entry (else 422), and must match the current one once profiles exist (else 409). |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaEntryId` | `string \| null` | yes | Schema entry the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryName` | `string \| null` | yes | Name of the connected schema entry; null when unconnected. |
| `version` | `integer \| null` | yes | The connected entry's version, for optimistic locking when editing it on the schema-entries resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected entry's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different entry is refused with 409, because stored profiles were seeded from the current one. |

### `DELETE /v1/projects/{nodeId}/profile-schema`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaEntryId` | `string \| null` | yes | Schema entry the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryName` | `string \| null` | yes | Name of the connected schema entry; null when unconnected. |
| `version` | `integer \| null` | yes | The connected entry's version, for optimistic locking when editing it on the schema-entries resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected entry's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different entry is refused with 409, because stored profiles were seeded from the current one. |

### `POST /v1/projects/{nodeId}/profile-schema/starter`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's NODE id — its address in the org tree. Not the `projectId`, which is a different value on the same project and is what the `{projectId}` routes take. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | A name for the new type. Omit it and the platform names it `user_profile` (or the first free suffix). Letters, digits, dots, dashes and underscores only, starting with a letter or digit, up to 64 characters. It is used as an address, so it may not contain slashes, spaces or braces. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `schemaEntryId` | `string \| null` | yes | Schema entry the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryName` | `string \| null` | yes | Name of the connected schema entry; null when unconnected. |
| `version` | `integer \| null` | yes | The connected entry's version, for optimistic locking when editing it on the schema-entries resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected entry's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different entry is refused with 409, because stored profiles were seeded from the current one. |

### `GET /v1/users`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Which project's end users to list, as its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `users` | `object[]` | yes | The project's END USERS — the people who use what you built, not your team. |

### `GET /v1/users/{userId}/profile`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `userId` | `string` | yes | The end user whose profile this is — one of the project's users, not a member of your team. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Which project's profile to read, as its node id. REQUIRED: a profile belongs to a (user, project) pair, so one person can hold several and asking for 'their profile' without naming a project has no answer. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `user` | `object` | yes | Who this profile belongs to. |
| `configured` | `boolean` | yes | Whether the project has a profile shape at all. False means there is nothing to fill in. |
| `data` | `object \| null` | yes | The user's current values. When nothing has been saved this is the defaults — use `hasRow` to tell which you are looking at. |
| `defaults` | `object \| null` | yes | What each field defaults to, so a form can show which values the user actually chose and which merely fell back. |
| `schemaVersion` | `integer \| null` | yes | Which version of the profile shape `data` matches. |
| `drift` | `object \| null` | yes | Present only when the stored profile is behind the current schema. The data is still returned — this says it was written against an older shape, not that it is unusable. |
| `shape` | `object[] \| null` | yes | The fields to render. Null when unconfigured. |
| `hasRow` | `boolean` | yes | Whether this user has ever saved a profile. FALSE with a non-null `data` is the ordinary case for someone who has not filled it in — the values you are seeing are defaults, not their answers. |

### `PATCH /v1/users/{userId}/profile`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `userId` | `string` | yes | The end user whose profile this is — one of the project's users, not a member of your team. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Which project's profile to read, as its node id. REQUIRED: a profile belongs to a (user, project) pair, so one person can hold several and asking for 'their profile' without naming a project has no answer. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `data` | `object` | yes | The values to write. Checked against the project's profile shape when it arrives, so an unknown key or a wrong type is refused rather than stored. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `data` | `object` | yes | The profile as it now stands, saved. |
| `schemaVersion` | `integer` | yes | The schema version it was written against. |
