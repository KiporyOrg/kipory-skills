<!-- generated: kipory-skills references · source: the deployment's route manifest · version: 5accba538b04 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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
- `GET /v1/rate-cards/active`
- `GET /v1/rate-cards/coverage`
- `GET /v1/rate-cards/{…}`
- `GET /v1/rate-cards/{…}/prices`
- `POST /v1/rate-cards`
- `POST /v1/rate-cards/quote`
- `POST /v1/rate-cards/{…}/activate`

## the installation's credential roster and who holds each key — an API key is NEVER platform staff, and the rest of this hub stays reachable to one

Gate: `assertPlatformStaffActor`

- `GET /v1/secrets/coverage`

## who is signed in to the installation — an API key is NEVER platform staff, and there is no per-tenant equivalent because a session belongs to a person across every tenant rather than to a project

Gate: `assertPlatformStaffActor`

- `DELETE /v1/sessions/{…}`
- `GET /v1/sessions`

## the installation's supplier roster and its spend — an API key is NEVER platform staff, and there is no per-tenant equivalent because the subject is not tenant data

Gate: `assertPlatformStaffActor`

- `GET /v1/vendors`
- `GET /v1/vendors/{…}`
- `POST /v1/vendors/{…}/probe`

## owner-scoped file operations resolve the acting USER; a key has none. (GET /v1/files/raw/{token} is deliberately public — the HMAC is the credential — and is NOT listed here)

Gate: `requireUser`

- `DELETE /v1/files/{…}`
- `GET /v1/files/{…}/download-url`
- `POST /v1/files/upload-url`
- `POST /v1/files/{…}/confirm`

## the first-project create path, for an account that holds no memberships. A key is a machine principal with no person and therefore no memberships to lack — it would satisfy the zero-membership gate for the wrong reason, so the per-user gate refuses it before that can be asked

Gate: `requireUser`

- `POST /v1/me/projects`
