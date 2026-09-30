<!-- generated: kipory-skills references · source: the deployment's route manifest · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Routes an API key cannot call

A key is a machine principal: it carries a grant (one node, one role) and no person. Every route below is in your API reference and refuses a key whatever its grant. Do not prescribe them, and do not read a refusal from one of them as a broken key.

## Routes that need a signed-in person

Your own charges belong to a signed-in person. Read a run's cost at `GET /v1/runs/{runId}/spend` and a project's at `GET /v1/projects/{nodeId}/usage`.

- `GET /v1/credits/events`

Key management needs a signed-in person, so a leaked key cannot mint siblings that outlive revoking it. The human mints your key and tells you its node, role and expiry.

- `DELETE /v1/keys/{…}`
- `GET /v1/keys`
- `GET /v1/keys/spend`
- `PATCH /v1/keys/{…}`
- `POST /v1/keys`

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

A person's first-project path. A key creates a project with `POST /v1/projects` and an explicit `parentNodeId`.

- `POST /v1/me/projects`

Seating a person is a human act: a credential that could invite someone could build a way around its own revocation.

- `DELETE /v1/nodes/{…}/invites/{…}`
- `GET /v1/nodes/{…}/invites`
- `POST /v1/nodes/{…}/invites`

Suspending a member or erasing their account is a human act, refused to a key for the same reason as invites.

- `POST /v1/projects/{…}/members/{…}/account-deletion`
- `PUT /v1/projects/{…}/members/{…}/standing`
