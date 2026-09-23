<!-- generated: kipory-skills references · source: the deployment's route manifest · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Routes an API key cannot call

A key is a machine principal: it carries a grant (one node, one role) and no user. Every route below refuses a key regardless of the grant, for the reason given. Do not prescribe them, and do not read a refusal from one of them as a broken key.

## installation-wide operational conditions with no project to scope them by — an API key is NEVER platform staff, and there is no per-tenant equivalent to redirect to yet

Gate: `assertPlatformStaffActor`

- `DELETE /v1/alerts/silences/{…}`
- `DELETE /v1/alerts/{…}/acknowledge`
- `GET /v1/alerts`
- `GET /v1/alerts/catalog`
- `GET /v1/alerts/episodes`
- `GET /v1/alerts/silences`
- `POST /v1/alerts/{…}/acknowledge`
- `POST /v1/alerts/{…}/silence`

## what this installation could recover and whether a restore has ever been demonstrated — an API key is NEVER platform staff, and a backup artifact spans every tenant, so there is no per-tenant equivalent to point a customer at

Gate: `assertPlatformStaffActor`

- `GET /v1/backups`
- `GET /v1/backups/drills/{…}`

## the charges the platform could not bill — OUR failures to write a CostEvent, named by the chokepoint that caught them. `BillingEmitFailure` has no tenant column, so there is nothing a key could be scoped to, and a staff-mode hub never resolves a presented key in the first place. What a payer may read is their own charges (GET /v1/credits/events); a charge that never landed is not one of them

Gate: `assertPlatformStaffActor`

- `GET /v1/billing-failures`
- `POST /v1/billing-failures/acknowledge`
- `POST /v1/billing-failures/unacknowledge`

## every machine this installation runs on, its volumes, its stacks and the host operations an operator may ask for — an API key is NEVER platform staff, and there is no per-tenant equivalent: a customer has no question about our hardware

Gate: `assertPlatformStaffActor`

- `GET /v1/boxes`
- `GET /v1/boxes/{…}`
- `GET /v1/boxes/{…}/commands`
- `POST /v1/boxes/{…}/commands`

## the ledger scopes to a person and an API key has none — `request.user` is assigned only on the two session branches of the auth middleware, so a key-authenticated caller is answered 401 from inside the handler. Per-run attribution for machine callers is GET /v1/runs/{runId}/spend; the wallet is GET /v1/credits/balance, which a key CAN read

Gate: `inline `request.user` requirement (401 from the handler body)`

- `GET /v1/credits/events`

## Kipory's own database schema and per-table row counts — an API key is NEVER platform staff, and there is no per-tenant equivalent because the subject is the platform's storage rather than tenant data

Gate: `assertPlatformStaffActor`

- `GET /v1/datamodel`
- `GET /v1/datamodel/stats`

## installation-wide prune counts and cross-tenant quota attribution — an API key is NEVER platform staff; the per-tenant equivalents are `stored` on GET /v1/projects/{nodeId}/ingest/summary and GET /v1/organizations/{nodeId}/quota

Gate: `assertPlatformStaffActor`

- `GET /v1/ingest/maintenance`
- `GET /v1/ingest/quota`
- `POST /v1/ingest/maintenance/runs`

## key management is session-cookie only — a leaked key must not mint siblings that outlive revoking the original. Only a signed-in human can do this

Gate: `assertSessionAuth`

- `DELETE /v1/keys/{…}`
- `GET /v1/keys`
- `GET /v1/keys/spend`
- `POST /v1/keys`
- `POST /v1/keys/{…}/remove`

## the keys a PERSON minted, at the nodes they still administer. A presented key has no MINTER, so the honest answer to one is a refusal rather than an empty list — and a leaked key able to enumerate what its holder's victim minted would be handed the inventory step of compromising the rest. The customer-key equivalent is GET /v1/keys?node=, which is the node's inventory and is itself session-only

Gate: `assertSessionAuth`

- `GET /v1/keys/mine`

## a per-user surface; a key is a machine principal with no person, so it 401s. There is no `me` for a key. The projects listing is scoped by MEMBERSHIP specifically, and a key holds none — its reach is the grant it was minted at, which is a different question with a different answer

Gate: `requireUser`

- `DELETE /v1/me`
- `DELETE /v1/me/identities/{…}`
- `GET /v1/me`
- `GET /v1/me/identities`
- `GET /v1/me/projects`
- `GET /v1/me/stats`
- `PATCH /v1/me`

## the caller's visible platform conditions, scoped by MEMBERSHIP. A key is a machine principal with no person and therefore no memberships — `listRoleBearingNodeIds` would return [] for it, so the route would answer with installation-wide facts under a name that promises a personal scope. The staff-wide view is GET /v1/alerts

Gate: `requireUser`

- `GET /v1/me/alerts`

## same per-user surface as /v1/me

Gate: `requireUser`

- `GET /v1/me/profile`
- `PATCH /v1/me/profile`

## where a PERSON is signed in, and ending one of those sessions — session-cookie only, for the reason key management is. A bearer key holds no session, so the listing would be empty and the revoke would name a row the key's holder has no other way to learn about; worse, a leaked key that could end a person's sessions could lock them out while it went on working. There is no customer-key equivalent because there is no machine session to manage: a key IS the credential, and DELETE /v1/keys/{} is how one is ended

Gate: `assertSessionAuth`

- `DELETE /v1/me/sessions/{…}`
- `GET /v1/me/sessions`

## the catalog's own prices against the registries and the writes that change them — an API key is NEVER platform staff, and the customer-facing catalog is `GET /v1/ai-models`, which publishes no price

Gate: `assertPlatformStaffActor`

- `DELETE /v1/model-registry/models/{…}`
- `GET /v1/model-registry`
- `GET /v1/model-registry/changes`
- `PATCH /v1/model-registry/models/{…}`
- `POST /v1/model-registry/apply`
- `POST /v1/model-registry/refresh`

## administering the tenancy tree is not a workload act, and `StructuralEvent` has no honest actor string for a key — attributing one as `system:api` would name the platform's own token for a customer's action

Gate: `structural key refusal`

- `DELETE /v1/nodes/{…}`
- `GET /v1/nodes/{…}`
- `PATCH /v1/nodes/{…}`
- `PATCH /v1/nodes/{…}/status`

## a roster of people is not workload data — one call on a least-privilege key would return the id, email and display name of everyone with an active membership on the system root, and on a project node every end user who ever signed in. The three WRITES are refused for the invites' reason rather than the roster's: membership management decides who ELSE may act, and a credential that can seat or unseat a person is a credential that can mint a human path around its own revocation. `POST` is the newest of the three (2026-09-09) and is the most literal case of it: it seats a named user outright, with no invite for anybody to accept

Gate: `structural key refusal`

- `DELETE /v1/nodes/{…}/members/{…}`
- `GET /v1/nodes/{…}/members`
- `PATCH /v1/nodes/{…}/members/{…}`
- `POST /v1/nodes/{…}/members`

## everyone with an account on the installation and where they belong — an API key is NEVER platform staff, and there is no per-tenant equivalent because a person belongs to many nodes across every tenant rather than to a project

Gate: `assertPlatformStaffActor`

- `GET /v1/people`
- `GET /v1/people/{…}/deletion-preview`
- `PATCH /v1/people/{…}/status`
- `POST /v1/people/{…}/account-deletion`
- `POST /v1/people/{…}/impersonate`
- `POST /v1/people/{…}/sessions/revoke`

## one processing attempt's ledger across every project — an API key is NEVER platform staff, and the per-tenant equivalent is the customer-plane stream `GET /v1/records/{id}/processing-stream`, floored on the record's own project

Gate: `assertPlatformStaffActor`

- `GET /v1/processing/attempts/{…}`

## lists every project on the installation — an API key is NEVER platform staff. Resolve a node id with GET /v1/projects/by-project-id/{projectId}, which floors on the project instead

Gate: `assertPlatformStaffActor`

- `GET /v1/projects`

## which rate card prices the project, stored on the project row — an API key is NEVER platform staff. What a customer may read of their own spend is GET /v1/runs/{runId}/spend and GET /v1/projects/{nodeId}/usage; the price per unit is not theirs to read or set

Gate: `assertPlatformStaffActor`

- `GET /v1/projects/{…}/rate-card`
- `PATCH /v1/projects/{…}/rate-card`

## Kipory's own diagnostic sampling rates, stored on the project row — an API key is NEVER platform staff. A customer reads what WAS traced on their flows (GET /v1/flows/{id}/traces); how much gets traced is not theirs to set

Gate: `assertPlatformStaffActor`

- `GET /v1/projects/{…}/trace-settings`
- `PATCH /v1/projects/{…}/trace-settings`

## every tenant's jobs on one queue and every worker's heartbeat — an API key is NEVER platform staff; the per-tenant equivalent is the run ledger on GET /v1/runs?project=…, floored at the caller's own project

Gate: `assertPlatformStaffActor`

- `DELETE /v1/queues/{…}/failed`
- `DELETE /v1/queues/{…}/pause`
- `DELETE /v1/queues/{…}/pending`
- `GET /v1/queues`
- `GET /v1/queues/{…}`
- `GET /v1/queues/{…}/jobs`
- `GET /v1/queues/{…}/jobs/{…}`
- `POST /v1/queues/{…}/pause`
- `POST /v1/queues/{…}/retries`
- `POST /v1/queues/{…}/runs`

## the platform's GLOBAL pricing catalog — one active row for the whole installation, no tenant column. Platform staff only, reads included (since 2026-09-07; the reads admitted any organization member before). On a staff-mode hub a presented key is never resolved — the hook has no key branch, so it 401s like any non-matching bearer — and the per-route assert would refuse a key actor by name as a second line. What a customer may read of their own spend is GET /v1/runs/{runId}/spend and GET /v1/projects/{nodeId}/usage on this host, and GET /v1/credits/balance on the project's own host — NOT GET /v1/credits/events, which is listed in this same table because it 401s a key

Gate: `assertPlatformStaffActor`

- `GET /v1/rate-cards`
- `GET /v1/rate-cards/{…}`
- `GET /v1/rate-cards/{…}/prices`
- `POST /v1/rate-cards`
- `POST /v1/rate-cards/{…}/activate`

## the installation's credential roster and who holds each key — an API key is NEVER platform staff, and the rest of this hub stays reachable to one

Gate: `assertPlatformStaffActor`

- `GET /v1/secrets/coverage`

## who is signed in to the installation — an API key is NEVER platform staff, and there is no per-tenant equivalent because a session belongs to a person across every tenant rather than to a project

Gate: `assertPlatformStaffActor`

- `DELETE /v1/sessions/{…}`
- `GET /v1/sessions`

## the installation's spend over every tenant, with what Kipory paid upstream beside what was charged — an API key is NEVER platform staff, and a staff-mode hub never resolves a presented key in the first place. The per-tenant equivalents are GET /v1/projects/{nodeId}/usage and GET /v1/organizations/{nodeId}/usage, which carry the charges and never the vendor column; the reprice has no customer equivalent because it moves other tenants' wallets

Gate: `assertPlatformStaffActor`

- `GET /v1/spend`
- `GET /v1/spend/events`
- `POST /v1/spend/reprice`

## the platform's own flows: an installation-wide choice of which one every project binds next, and an editor's reads that name other tenants' projects — an API key is NEVER platform staff, and no project owns a platform flow

Gate: `assertPlatformStaffActor`

- `DELETE /v1/system-flows/defaults/{…}`
- `GET /v1/system-flows/defaults`
- `GET /v1/system-flows/handlers`
- `GET /v1/system-flows/schema-entries`
- `GET /v1/system-flows/task-models`
- `GET /v1/system-flows/{…}/used-by`
- `PUT /v1/system-flows/defaults/{…}`

## the installation's supplier roster and its spend — an API key is NEVER platform staff, and there is no per-tenant equivalent because the subject is not tenant data

Gate: `assertPlatformStaffActor`

- `GET /v1/vendors`
- `GET /v1/vendors/{…}`
- `POST /v1/vendors/{…}/probe`

## every wallet in the installation — each tenant's balance, overdraft and runway, and every person's own wallet — an API key is NEVER platform staff, and a staff-mode hub never resolves a presented key in the first place. A customer reads its own payer on GET /v1/projects/{nodeId}/usage and GET /v1/organizations/{nodeId}/usage, with the balance only for an admin of the wallet's holder

Gate: `assertPlatformStaffActor`

- `GET /v1/wallets`

## owner-scoped file operations resolve the acting USER; a key has none. (GET /v1/files/raw/{token} is deliberately public — the HMAC is the credential — and is NOT listed here)

Gate: `requireUser`

- `DELETE /v1/files/{…}`
- `GET /v1/files/{…}/download-url`
- `POST /v1/files/upload-url`
- `POST /v1/files/{…}/confirm`

## a GuardSignal is evidence ABOUT a guard — an identity resolver that failed closed, a payer that would not resolve — and its `details` name the principal under investigation. An API key is never platform staff, and letting the subject of the record mark its own evidence reviewed is the one outcome this surface exists to prevent. The alert it answers is read at GET /v1/alerts, which is staff for the same reason

Gate: `assertPlatformStaffActor`

- `DELETE /v1/guard-signals/acknowledge`
- `POST /v1/guard-signals/acknowledge`

## the first-project create path, for an account that holds no memberships. A key is a machine principal with no person and therefore no memberships to lack — it would satisfy the zero-membership gate for the wrong reason, so the per-user gate refuses it before that can be asked

Gate: `requireUser`

- `POST /v1/me/projects`

## an invite decides who ELSE may act — a credential that can seat a person is a credential that can mint a human path around its own revocation, which is why the `/v1/nodes` member writes refuse a key too

Gate: `membershipPrincipal (a person or the internal token)`

- `DELETE /v1/nodes/{…}/invites/{…}`
- `GET /v1/nodes/{…}/invites`
- `POST /v1/nodes/{…}/invites`

## an ExternalQuotaPolicy governs a pool SHARED by the whole installation — the three YouTube Data API handlers draw on one budget — so raising your own allowance spends everyone else's, and an API key is never platform staff. ⚠️ Only the WRITES are listed: GET /v1/organizations/{nodeId}/quota is MEMBER-level on the node and a document may prescribe it, because seeing the cap that will fail your ingest is a legitimate interest of any member

Gate: `assertPlatformStaffActor`

- `DELETE /v1/organizations/{…}/quota/{…}`
- `PUT /v1/organizations/{…}/quota/{…}`

## suspending a person's seat or erasing their account is person governance, not workload — refused to a key for the invites' reason. POST /v1/projects/{nodeId}/members/{userId}/credits stays open to a key

Gate: `membershipPrincipal (a person or the internal token)`

- `POST /v1/projects/{…}/members/{…}/account-deletion`
- `PUT /v1/projects/{…}/members/{…}/standing`
