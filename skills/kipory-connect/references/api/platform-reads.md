<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Platform reads

The three reads that need no project: the OpenAPI document, the capability-pack index and body, and the deployment's own coded-route manifest. The packs are public; the others take the key.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/capability-packs`](#get-v1-capability-packs) |  |
| `GET` | [`/v1/capability-packs/{id}`](#get-v1-capability-packs-id) |  |
| `GET` | [`/v1/coded-routes`](#get-v1-coded-routes) |  |

### `GET /v1/capability-packs`

The index of the capability packs this deployment serves: each pack's `id`, title, one-line description and size in bytes, with a `version` hash to cache on. A pack is the judgment for authoring a project — when to reach for a capability and what a wrong choice costs; no content is returned here.
Read one pack's markdown with `GET /v1/capability-packs/{id}`. What each handler reads, emits and accepts is `GET /v1/handlers`; every route and body is `GET /v1/openapi.json`.
Public: no credential needed.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | A hash of the whole served set — your cache key, and the value to compare to know a cached copy matches the deployment you are talking to. It moves when any pack changes. |
| `packs` | `object[]` | yes | Every pack this deployment serves, without their text. |

### `GET /v1/capability-packs/{id}`

One capability pack: its title, description and full markdown `content`, with the pack set's `version`. An unknown `id` is a 404 that names the ids which exist.
List the packs, without content, with `GET /v1/capability-packs`. The packs point at facts rather than restating them: handlers are `GET /v1/handlers/{key}`, routes and bodies `GET /v1/openapi.json`.
Public: no credential needed.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The capability pack's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The pack's id. |
| `title` | `string` | yes | Its title. |
| `description` | `string` | yes | Its opening paragraph. |
| `content` | `string` | yes | The pack itself, as markdown, verbatim. |
| `version` | `string` | yes | The SET's version, not this pack's. A per-pack hash would let you hold a coherent-looking mix of packs from two different deployments, which is exactly what this field exists to prevent. |

### `GET /v1/coded-routes`

Every `/v1` route the platform itself serves — method, path, group and plane — as data. An endpoint a project authors cannot live on any of these paths, whether or not the route is enabled on a given host.
It lists paths only; the full reference, with bodies and responses, is `GET /v1/openapi.json`. Whether a route group is enabled on one project is on `GET /v1/bootstrap?project=`.
Any authenticated caller; the answer is the same for everyone.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `routes` | `object[]` | yes | Every path this deployment serves under /v1, in manifest order. |
| `groups` | `object[]` | yes | Every functional group, including any this deployment currently has no routes in. |
