<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# End users of the product

Who calls a project's endpoints: sign-in providers, the domain the project's app is served from and the DNS proof that it owns it, the profile shape end users carry, the operator's view over them, and their standing and credits at the project node.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/projects/{nodeId}/app-domain`](#get-v1-projects-nodeid-app-domain) |  |
| `PUT` | [`/v1/projects/{nodeId}/app-domain`](#put-v1-projects-nodeid-app-domain) |  |
| `DELETE` | [`/v1/projects/{nodeId}/app-domain`](#delete-v1-projects-nodeid-app-domain) |  |
| `POST` | [`/v1/projects/{nodeId}/app-domain/verify`](#post-v1-projects-nodeid-app-domain-verify) |  |
| `GET` | [`/v1/projects/{nodeId}/auth-config`](#get-v1-projects-nodeid-auth-config) |  |
| `PUT` | [`/v1/projects/{nodeId}/auth-config`](#put-v1-projects-nodeid-auth-config) |  |
| `GET` | [`/v1/projects/{nodeId}/members`](#get-v1-projects-nodeid-members) |  |
| `POST` | [`/v1/projects/{nodeId}/members/{userId}/credits`](#post-v1-projects-nodeid-members-userid-credits) |  |
| `GET` | [`/v1/projects/{nodeId}/members/{userId}/ledger`](#get-v1-projects-nodeid-members-userid-ledger) |  |
| `GET` | [`/v1/projects/{nodeId}/profile-schema`](#get-v1-projects-nodeid-profile-schema) |  |
| `PUT` | [`/v1/projects/{nodeId}/profile-schema`](#put-v1-projects-nodeid-profile-schema) |  |
| `DELETE` | [`/v1/projects/{nodeId}/profile-schema`](#delete-v1-projects-nodeid-profile-schema) |  |
| `POST` | [`/v1/projects/{nodeId}/profile-schema/starter`](#post-v1-projects-nodeid-profile-schema-starter) |  |
| `GET` | [`/v1/users`](#get-v1-users) |  |
| `GET` | [`/v1/users/{userId}/profile`](#get-v1-users-userid-profile) |  |
| `PATCH` | [`/v1/users/{userId}/profile`](#patch-v1-users-userid-profile) |  |

### `GET /v1/projects/{nodeId}/app-domain`

The project's claim to its own app domain, and whether its DNS proof has been seen — or none. To claim one, `PUT` this path; to check the TXT record, `POST …/app-domain/verify`; to give it up, `DELETE`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `claim` | `object \| null` | yes | This project's claim, or null when it has claimed no domain. |
| `baseDomain` | `string \| null` | yes | The platform's base domain in this environment. A host under it needs no claim, because the session cookie already reaches it. Null where there is none (local development), and then every host is reachable. |

### `PUT /v1/projects/{nodeId}/app-domain`

Claim a host outside the base domain as the project's app domain, or replace the claim. Answers the TXT record to publish; the claim counts once `POST /v1/projects/{nodeId}/app-domain/verify` has seen it.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `host` | `string` | yes | The domain your app is served from, such as `app.acme.com`. A full URL is accepted and reduced to its host. Claiming a different host replaces the current claim and starts its proof over. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `claim` | `object \| null` | yes | This project's claim, or null when it has claimed no domain. |
| `baseDomain` | `string \| null` | yes | The platform's base domain in this environment. A host under it needs no claim, because the session cookie already reaches it. Null where there is none (local development), and then every host is reachable. |

### `DELETE /v1/projects/{nodeId}/app-domain`

Release the project's claim to its own app domain. Answers what went away and the claim as it stands now (none). To claim a domain, `PUT /v1/projects/{nodeId}/app-domain`; to prove it by DNS, `POST …/app-domain/verify`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The project whose app-domain claim was released (its id). |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `appDomain` | `object` | yes | The project's app-domain claim after the release — what `GET …/app-domain` now answers. |

### `POST /v1/projects/{nodeId}/app-domain/verify`

Look for the claimed app domain's TXT record now and mark the claim verified when it is there. Answers the claim as it stands. Claim with `PUT /v1/projects/{nodeId}/app-domain` first.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `claim` | `object` | yes | A project's claim to its own app domain. |
| `found` | `boolean` | yes | Whether this check saw the TXT record. False is normal for a while after publishing it, while DNS catches up; the claim stays pending until a check sees it. |

### `GET /v1/projects/{nodeId}/auth-config`

How the project's end users sign in: which providers are on, the redirect allowlist, and per provider whether a credential resolves and what a sign-in does right now. No secret is returned. Change it with `PUT` on this path; store a provider credential with the secrets routes.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stored` | `object \| null` | yes | What you saved, verbatim. Null when this project has never set a config — and ALSO null when what it saved failed to parse, so null alone does not distinguish never-set from broken. Read `malformed` to tell them apart. |
| `effective` | `object` | yes | What is actually in force right now. Equal to `stored` when that is valid, and the platform default otherwise. This is the one to read when asking how sign-in currently behaves. |
| `malformed` | `boolean` | yes | True when a config was stored but could not be parsed, so `effective` is the platform fallback rather than what you intended. ⚠️ TREAT THIS AS URGENT: the fallback ENABLES Google sign-in, so a project that deliberately turned Google OFF has it back on while this is true. Nothing else reports it — sign-in keeps working, which is exactly why the change goes unnoticed. |
| `providerStatus` | `object[]` | yes | Every sign-in provider this platform supports, with how its own credential resolves for this project and what a sign-in through it does under `effective`. One entry per provider, whether or not it is enabled. |

Each item of `providerStatus`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `provider` | `string` | yes | The provider's id, as it is keyed in `providers`. |
| `credential` | `object` | yes | How this provider's own credential resolves for this project, by the same walk sign-in uses. Metadata only; nothing is decrypted. |
| `signIn` | `"shared-app" \| "own-app" \| "refused"` | yes | What a sign-in through this provider does right now. `shared-app`: it goes through Kipory's application. `own-app`: through yours. `refused`: every one is turned away — the provider is off, Apple has no bundle id, or Google is set to your own application and no active credential resolves for it (it never falls back to Kipory's). Apple set to your own application still signs people in without its key; the key is what lets Kipory capture and later revoke the Apple grant. |
| `refusal` | `"provider-off" \| "no-bundle-id" \| "no-credential"` | yes | Why `signIn` is `refused`; null whenever it is not. `provider-off`: the provider is switched off for this project. `no-bundle-id`: Apple has no bundle id to verify an identity token against. `no-credential`: the provider is set to your own application and no active credential for it resolves. |

### `PUT /v1/projects/{nodeId}/auth-config`

Replace the project's end-user auth configuration; `null` clears it to the platform's default. Answers what `GET` on this path answers. Provider credentials are secrets, stored with the secrets routes, not here.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `authConfig` | `object \| null` | yes | The whole document, REPLACING whatever is stored — this is not a merge, so a provider you omit becomes disabled. Send null to clear the config and go back to the platform default. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stored` | `object \| null` | yes | What you saved, verbatim. Null when this project has never set a config — and ALSO null when what it saved failed to parse, so null alone does not distinguish never-set from broken. Read `malformed` to tell them apart. |
| `effective` | `object` | yes | What is actually in force right now. Equal to `stored` when that is valid, and the platform default otherwise. This is the one to read when asking how sign-in currently behaves. |
| `malformed` | `boolean` | yes | True when a config was stored but could not be parsed, so `effective` is the platform fallback rather than what you intended. ⚠️ TREAT THIS AS URGENT: the fallback ENABLES Google sign-in, so a project that deliberately turned Google OFF has it back on while this is true. Nothing else reports it — sign-in keeps working, which is exactly why the change goes unnoticed. |
| `providerStatus` | `object[]` | yes | Every sign-in provider this platform supports, with how its own credential resolves for this project and what a sign-in through it does under `effective`. One entry per provider, whether or not it is enabled. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the document was accepted; absent when it was refused, and absent when the body clears the config. |

Each item of `providerStatus`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `provider` | `string` | yes | The provider's id, as it is keyed in `providers`. |
| `credential` | `object` | yes | How this provider's own credential resolves for this project, by the same walk sign-in uses. Metadata only; nothing is decrypted. |
| `signIn` | `"shared-app" \| "own-app" \| "refused"` | yes | What a sign-in through this provider does right now. `shared-app`: it goes through Kipory's application. `own-app`: through yours. `refused`: every one is turned away — the provider is off, Apple has no bundle id, or Google is set to your own application and no active credential resolves for it (it never falls back to Kipory's). Apple set to your own application still signs people in without its key; the key is what lets Kipory capture and later revoke the Apple grant. |
| `refusal` | `"provider-off" \| "no-bundle-id" \| "no-credential"` | yes | Why `signIn` is `refused`; null whenever it is not. `provider-off`: the provider is switched off for this project. `no-bundle-id`: Apple has no bundle id to verify an identity token against. `no-credential`: the provider is set to your own application and no active credential for it resolves. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `GET /v1/projects/{nodeId}/members`

One page of the people who use the project — its end users — with their standing, spend and what they hold. The organization's operators are `GET /v1/nodes/{nodeId}/members`, a different population.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `standing` | `"active" \| "suspended"` | no | Show only seats in this standing. Omitted means every standing — an unfiltered roster, not just the healthy part of it. |
| `q` | `string` | no | Case-insensitive substring over the member's email and name. A member who set no name is matched on their email alone. |
| `sort` | `"joined-at" \| "name" \| "last-seen-at"` | no | The ordering. Omitted is `joined-at` — when the seat was created. `name` and `last-seen-at` are the person's and may be null: a member with none sits LAST in both directions. The response echoes it. |
| `order` | `"asc" \| "desc"` | no | Which way `sort` runs. Omitted is `desc`. A cursor is bound to the `sort` and `order` it was minted under: replayed under another it is refused with a 400, never reinterpreted. |
| `limit` | `integer` | no | Rows per page. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |
| `page` | `integer` | no | Jump to this page, 1-based. Resolved as an OFFSET and therefore approximate while rows are arriving — walking with `after`/`before` is exact and is what the response's cursors are for. Past the last page it CLAMPS to the last one rather than answering empty: an out-of-range page is a URL somebody typed, and an empty list reads as an empty collection. Refused together with `after` or `before`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `members` | `object[]` | yes | This page of seats. |
| `paging` | `object` | yes | Where this page sits in the whole roster. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the page that follows these in the ordering (with the same `sort` and `order`). NULL means there is nothing further; a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page that precedes these in the ordering (with the same `sort` and `order`). NULL means this is the first page — measured, never inferred from whether the request carried a cursor. |
| `sort` | `"joined-at" \| "name" \| "last-seen-at"` | yes | The ordering this page was read with — the `sort` sent, or `joined-at`. |
| `order` | `"asc" \| "desc"` | yes | Which way it ran — the `order` sent, or `desc`. |
| `atCeiling` | `integer \| null` | yes | Seats across the WHOLE roster, every standing, whose spend in the current window has reached the project's per-person ceiling — the members the spend gate is refusing now. Null when the project sets no ceiling, which is not the same as nobody at it. |
| `standingCounts` | `object` | yes | How many seats each standing holds, across the WHOLE roster rather than this page — the filter chips' counts. They sum to the unfiltered total; a chip whose count came from the filtered page would report the narrowing it is offering to apply. |

Each item of `members`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `user` | `object` | yes | The person on the seat. |
| `role` | `"viewer" \| "editor" \| "admin" \| "owner"` | yes | The seat's role. ⚠️ Effectively a constant on a project node: every end-user seat is `editor` by O-001, so a roster that draws this as a column draws one value. |
| `billing` | `"node" \| "self"` | yes | The seat's billing flag. `node` is the default. Every member's usage settles to the project's payer whatever this says: no member has a wallet of their own. |
| `standing` | `"active" \| "suspended"` | yes | What this member's SEAT is doing. Their account's own status is `user.status`. |
| `joinedAt` | `string` | yes | When the seat was created. The list's default ordering key. |
| `spend` | `object` | yes | What this member has spent against the project's per-person ceiling, and the window it was measured over. While the project gives its members wallets the ceiling is not applied and reads null; the figure spent is still measured. |
| `wallet` | `object \| null` | yes | The member's own wallet in this project. Null when the project has member wallets off, and for a member whose wallet is not open yet (a suspended seat that never had one). |
| `records` | `integer` | yes | Records in this project owned by this member. Removing their seat does not remove these. |
| `files` | `integer` | yes | Files in this project this member HOLDS — the ones stored under their own owner prefix, which is the population account deletion erases and the one `GET …/files?owner=<userId>` lists. ⚠️ NOT the files they UPLOADED (`uploadedByUserId` is written only by the presign route and is null on every function-produced file) and NOT the files that landed on their records. The three come apart routinely. |
| `profileVersion` | `integer \| null` | yes | The schema version this member's profile was written against, or null when they hold no profile. Drift from the current shape is reported, never enforced. |

### `POST /v1/projects/{nodeId}/members/{userId}/credits`

Grant a member credits in their wallet in this project, moved out of the wallet the project is paid from, with a reason for the ledger. Idempotent on `idempotencyKey`. Refused while member wallets are off (`PATCH /v1/projects/{nodeId}/settings` turns them on, and sets the automatic joining and periodic grants), and when the paying wallet cannot cover it. Each member's balance is on `GET …/members`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `amountCredits` | `integer` | yes | How many credits to move into this member's wallet in the project, out of the wallet the project is paid from. |
| `reason` | `string` | yes | Why. Written on both ledger entries of the transfer — the only record of why the two balances moved. |
| `idempotencyKey` | `string` | no | Makes a double-submit resolve to the existing grant instead of a second one. Omitted, every call is a fresh grant. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `balanceCredits` | `integer` | yes | The member's wallet balance after the grant. |

### `GET /v1/projects/{nodeId}/members/{userId}/ledger`

One member's wallet in this project: its balance and its history, newest first, walked on `after`/`before` — the member's charges, and each grant, expiry and return with the wallet on the other side. Answers for a closed wallet too (a member who left). Requires **ADMIN**. Every member's balance at once is `GET …/members`; the paying wallet's own history is `GET /v1/organizations/{nodeId}/ledger`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's OrgNode id. |
| `userId` | `string` | yes | The member's user id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `after` | `string` | no | The page OLDER than this entry — pass back the `nextCursor` you were given. Omit for the newest page. |
| `before` | `string` | no | The page NEWER than this entry — pass back the `prevCursor` you were given. Refused together with `after`. |
| `limit` | `integer` | no | How many entries per page, up to 200. Defaults to 50. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `balanceCredits` | `integer` | yes | What the wallet holds now, in credits. Can be below zero by the overshoot of the last charge. |
| `open` | `boolean` | yes | Whether the wallet is open. A closed wallet belonged to a member who left, or to a project that turned member wallets off: its balance went back and its history stays. |
| `entries` | `object[]` | yes | Newest first: the member's charges (`usage-debit`), and the grants, expiries and returns (`transfer`, each naming the wallet on the other side). |
| `paging` | `null` | yes | Always null: the walk is on the cursors, which are exact and measured. |
| `nextCursor` | `string \| null` | yes | Pass as `after` for the next older page; null at the end. |
| `prevCursor` | `string \| null` | yes | Pass as `before` for the next newer page; null at the start. |

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

### `GET /v1/projects/{nodeId}/profile-schema`

The type that shapes the project's end-user profiles, or none. Connect one with `PUT` on this path, create one from the starter with `POST …/profile-schema/starter`, disconnect with `DELETE`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `dataTypeId` | `string \| null` | yes | Type the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryKey` | `string \| null` | yes | Key of the connected type; null when unconnected. |
| `version` | `integer \| null` | yes | The connected type's version, for optimistic locking when editing it on the types resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected type's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `seedDefaults` | `object \| null` | yes | What a newly-registered end user's profile starts as: the defaults the connected type's schema declares, as the platform collects them — a top-level field's own `default` taken whole, and an object field without one assembled from its properties' defaults. A `default` anywhere else (a list's items, a `$ref` target, a union branch) seeds nothing and is not here. Empty when nothing seeds; null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different type is refused with 409, because stored profiles were seeded from the current one. |

### `PUT /v1/projects/{nodeId}/profile-schema`

Connect a type as the project's end-user profile type, or re-point to another (refused once profiles exist). To create a new type from the platform's starter shape instead, `POST /v1/projects/{nodeId}/profile-schema/starter`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `dataTypeId` | `string` | yes | Type to connect as the project's end-user profile shape. Must be an operator-owned, profile-eligible type (else 422), and must match the current one once profiles exist (else 409). |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `dataTypeId` | `string \| null` | yes | Type the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryKey` | `string \| null` | yes | Key of the connected type; null when unconnected. |
| `version` | `integer \| null` | yes | The connected type's version, for optimistic locking when editing it on the types resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected type's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `seedDefaults` | `object \| null` | yes | What a newly-registered end user's profile starts as: the defaults the connected type's schema declares, as the platform collects them — a top-level field's own `default` taken whole, and an object field without one assembled from its properties' defaults. A `default` anywhere else (a list's items, a `$ref` target, a union branch) seeds nothing and is not here. Empty when nothing seeds; null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different type is refused with 409, because stored profiles were seeded from the current one. |

### `DELETE /v1/projects/{nodeId}/profile-schema`

Disconnect the project's end-user profile type — the type itself is kept, and new end users stop getting a seeded profile. Answers what went away and the profile schema as it stands now. To re-point it instead, `PUT /v1/projects/{nodeId}/profile-schema`; to start from the platform's suggestion, `POST …/profile-schema/starter`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The project whose profile type was disconnected (its id). |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `profileSchema` | `object` | yes | The project's profile schema after the disconnect — what `GET …/profile-schema` now answers. |

### `POST /v1/projects/{nodeId}/profile-schema/starter`

Create a new profile type from the platform's starter shape under the name you give, and connect it. To connect a type you already have, `PUT /v1/projects/{nodeId}/profile-schema`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's id — its node in the org tree, as `POST /v1/projects` answered it. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The new type's key. Required: the platform no longer picks one for you. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `dataTypeId` | `string \| null` | yes | Type the profile is connected to. Null means the project has no end-user profile shape — every field below is null too. |
| `entryKey` | `string \| null` | yes | Key of the connected type; null when unconnected. |
| `version` | `integer \| null` | yes | The connected type's version, for optimistic locking when editing it on the types resource. Null when unconnected. |
| `definition` | `unknown` | no | The connected type's JSON Schema, verbatim. Its `default` keywords seed each new end user's profile. Null when unconnected. |
| `seedDefaults` | `object \| null` | yes | What a newly-registered end user's profile starts as: the defaults the connected type's schema declares, as the platform collects them — a top-level field's own `default` taken whole, and an object field without one assembled from its properties' defaults. A `default` anywhere else (a list's items, a `$ref` target, a union branch) seeds nothing and is not here. Empty when nothing seeds; null when unconnected. |
| `hasUserProfiles` | `boolean` | yes | Whether end-user profiles already exist. When true the connection is PINNED: connecting a different type is refused with 409, because stored profiles were seeded from the current one. |

### `GET /v1/users`

A project's end users (`?project=`) — the people who have signed in to its app — as `id`, `name` and `email`, for pickers. Requires **VIEWER**.

Not its operators: seats at a node are `GET /v1/nodes/{nodeId}/members`. The same end users with their standing, spend and wallets are `GET /v1/projects/{nodeId}/members`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Which project's end users to list, as its node id. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `users` | `object[]` | yes | The project's END USERS — the people who use what you built, not your team. |

Each item of `users`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The end user's id. |
| `name` | `string \| null` | yes | Their name, or null if unset. |
| `email` | `string` | yes | Their email address. |

### `GET /v1/users/{userId}/profile`

One end user's profile in a project (`?project=`), with the shape it is validated against and any drift from it. Requires **VIEWER**. The person reads their own with `GET /v1/me/profile`.

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
| `drift` | `object \| null` | yes | Present when the stored profile was written against a different schema version than the one in force — usually an older one, but a restored or rolled-back schema can leave a row AHEAD. Compare the two versions rather than assuming a direction. The data is still returned; this says it was written against another shape, not that it is unusable. |
| `shape` | `object[] \| null` | yes | The fields to render. Null when unconfigured. |
| `hasRow` | `boolean` | yes | Whether this user has ever saved a profile. FALSE with a non-null `data` is the ordinary case for someone who has not filled it in — the values you are seeing are defaults, not their answers. |

Each item of `shape`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The field's key, as it appears in `data`. |
| `type` | `"string" \| "number" \| "boolean" \| "enum" \| "object" \| "array" \| "unknown"` | yes | What kind of value this field holds, so a client can pick a control. `unknown` means the shape could not be reduced to one of the others — render the raw value rather than treating it as absent. |
| `enumValues` | `string[]` | no | For an `enum` field, the values it accepts. |
| `default` | `unknown` | no | The value this field takes when the user has not set one. Compare it with the value in `data` to tell a real answer from a default. |
| `fields` | `object[]` | no |  |
| `items` | `object` | no |  |

### `PATCH /v1/users/{userId}/profile`

Change fields of one end user's profile in a project (`?project=`), validated against the project's profile schema. Requires **EDITOR**. The person edits their own with `PATCH /v1/me/profile`.

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
