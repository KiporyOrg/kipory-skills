<!-- generated: kipory-skills references · source: the deployment's route manifest · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Routes an API key cannot call

A key is a machine principal: it carries a grant (one node, one role) and no person. Every route below refuses a key whatever its grant. Do not prescribe them, and do not read a refusal from one of them as a broken key.

## Routes that need a signed-in person

The spend ledger belongs to a signed-in person. Read a run's cost at `GET /v1/runs/{runId}/spend` and a project's at `GET /v1/projects/{nodeId}/usage`.

- `GET /v1/credits/events`

Key management needs a signed-in person, so a leaked key cannot mint siblings that outlive revoking it. The human mints your key and tells you its node, role and expiry.

- `DELETE /v1/keys/{…}`
- `GET /v1/keys`
- `GET /v1/keys/spend`
- `POST /v1/keys`
- `POST /v1/keys/{…}/remove`

The keys a person minted. A key has no minter.

- `GET /v1/keys/mine`

`/v1/me` is the signed-in person, and a key has no person.

- `DELETE /v1/me`
- `DELETE /v1/me/identities/{…}`
- `GET /v1/me`
- `GET /v1/me/identities`
- `GET /v1/me/projects`
- `GET /v1/me/stats`
- `PATCH /v1/me`

A signed-in person's alerts; a key has no person.

- `GET /v1/me/alerts`

A signed-in person's profile; a key has no person.

- `GET /v1/me/profile`
- `PATCH /v1/me/profile`

Sessions belong to a signed-in person; a key holds none.

- `DELETE /v1/me/sessions/{…}`
- `GET /v1/me/sessions`

Reading or changing the organisation tree is a signed-in person's surface. Your own reach is in the bootstrap's `tenancy` section.

- `DELETE /v1/nodes/{…}`
- `GET /v1/nodes/{…}`
- `PATCH /v1/nodes/{…}`
- `PATCH /v1/nodes/{…}/status`

A node's member roster lists people, which is a signed-in person's surface. Your own reach is in the bootstrap's `tenancy` section.

- `DELETE /v1/nodes/{…}/members/{…}`
- `GET /v1/nodes/{…}/members`
- `PATCH /v1/nodes/{…}/members/{…}`
- `POST /v1/nodes/{…}/members`

These file routes act as the signed-in user. A key uses the project's own file routes under `/v1/projects/{nodeId}/files/`.

- `DELETE /v1/files/{…}`
- `GET /v1/files/{…}/download-url`
- `POST /v1/files/upload-url`
- `POST /v1/files/{…}/confirm`

A person's first-project path. A key creates a project with `POST /v1/projects` and an explicit `parentNodeId`.

- `POST /v1/me/projects`

Seating a person is a human act: a credential that could invite someone could build a way around its own revocation.

- `DELETE /v1/nodes/{…}/invites/{…}`
- `GET /v1/nodes/{…}/invites`
- `POST /v1/nodes/{…}/invites`

Suspending a member or erasing their account is a human act, refused to a key for the same reason as invites.

- `POST /v1/projects/{…}/members/{…}/account-deletion`
- `PUT /v1/projects/{…}/members/{…}/standing`

## The platform's own operations

These serve the people who run the installation — every tenant at once — and a key is never one of them. None has a per-project form to reach for instead.

- `DELETE /v1/alerts/silences/{…}`
- `DELETE /v1/alerts/{…}/acknowledge`
- `DELETE /v1/guard-signals/acknowledge`
- `DELETE /v1/organizations/{…}/quota/{…}`
- `DELETE /v1/pricing/rules/{…}`
- `DELETE /v1/queues/{…}/failed`
- `DELETE /v1/queues/{…}/pause`
- `DELETE /v1/queues/{…}/pending`
- `DELETE /v1/sessions/{…}`
- `DELETE /v1/system-flows/defaults/{…}`
- `GET /v1/alerts`
- `GET /v1/alerts/catalog`
- `GET /v1/alerts/episodes`
- `GET /v1/alerts/silences`
- `GET /v1/backups`
- `GET /v1/backups/drills/{…}`
- `GET /v1/billing-failures`
- `GET /v1/boxes`
- `GET /v1/boxes/{…}`
- `GET /v1/boxes/{…}/commands`
- `GET /v1/datamodel`
- `GET /v1/datamodel/stats`
- `GET /v1/ingest/maintenance`
- `GET /v1/ingest/quota`
- `GET /v1/model-registry`
- `GET /v1/model-registry/changes`
- `GET /v1/model-registry/models/{…}/bindings`
- `GET /v1/people`
- `GET /v1/people/{…}/deletion-preview`
- `GET /v1/pricing/coverage`
- `GET /v1/pricing/effective`
- `GET /v1/pricing/rules`
- `GET /v1/processing/attempts/{…}`
- `GET /v1/projects`
- `GET /v1/projects/{…}/trace-settings`
- `GET /v1/queues`
- `GET /v1/queues/{…}`
- `GET /v1/queues/{…}/jobs`
- `GET /v1/queues/{…}/jobs/{…}`
- `GET /v1/secrets/coverage`
- `GET /v1/sessions`
- `GET /v1/spend`
- `GET /v1/spend/events`
- `GET /v1/system-flows/handlers`
- `GET /v1/system-flows/jobs`
- `GET /v1/system-flows/schema-entries`
- `GET /v1/system-flows/task-models`
- `GET /v1/system-flows/{…}/used-by`
- `GET /v1/vendors`
- `GET /v1/vendors/{…}`
- `GET /v1/wallets`
- `GET /v1/wallets/starter-grant`
- `PATCH /v1/model-registry/models/{…}`
- `PATCH /v1/people/{…}/status`
- `PATCH /v1/pricing/rules/{…}`
- `PATCH /v1/projects/{…}/trace-settings`
- `POST /v1/alerts/{…}/acknowledge`
- `POST /v1/alerts/{…}/silence`
- `POST /v1/billing-failures/acknowledge`
- `POST /v1/billing-failures/unacknowledge`
- `POST /v1/boxes/{…}/commands`
- `POST /v1/guard-signals/acknowledge`
- `POST /v1/ingest/maintenance/runs`
- `POST /v1/model-registry/apply`
- `POST /v1/model-registry/refresh`
- `POST /v1/people/{…}/account-deletion`
- `POST /v1/people/{…}/impersonate`
- `POST /v1/people/{…}/sessions/revoke`
- `POST /v1/pricing/rules`
- `POST /v1/queues/{…}/pause`
- `POST /v1/queues/{…}/retries`
- `POST /v1/queues/{…}/runs`
- `POST /v1/spend/reprice`
- `POST /v1/vendors/{…}/probe`
- `POST /v1/wallets/{…}/grants`
- `PUT /v1/model-registry/models/{…}/lifecycle`
- `PUT /v1/organizations/{…}/quota/{…}`
- `PUT /v1/system-flows/defaults/{…}`
- `PUT /v1/wallets/starter-grant`
