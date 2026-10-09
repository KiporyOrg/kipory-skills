<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Platform reads

The three reads that need no project: the OpenAPI document, the capability-pack index and body, and the deployment's own coded-route manifest. The packs are public; the others take the key.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/capability-packs`](#get-v1-capability-packs) |  |
| `GET` | [`/v1/capability-packs/{id}`](#get-v1-capability-packs-id) |  |
| `GET` | [`/v1/coded-routes`](#get-v1-coded-routes) |  |

### `GET /v1/capability-packs`

The index of the capability packs this deployment serves: each pack's `id`, title, one-line description, size in bytes and content `hash`, with a `version` hash of the whole set to cache on. A pack is the judgment for authoring a project — when to reach for a capability and what a wrong choice costs; no content is returned here.
Read one pack's markdown with `GET /v1/capability-packs/{id}`. What each function reads, emits and accepts is `GET /v1/functions`; every route and body is `GET /v1/openapi.json`.
Public: no credential needed.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | A hash of the whole served set — your cache key, and the value to compare to know a cached copy matches the deployment you are talking to. It moves when any pack changes. |
| `packs` | `object[]` | yes | Every pack this deployment serves, without their text. |

Each item of `packs`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The pack's id — what you fetch it by. |
| `title` | `string` | yes | Its title. |
| `description` | `string` | yes | Its opening paragraph — enough to choose without fetching it. |
| `bytes` | `integer` | yes | How large the pack is, in bytes, so an agent can budget its context before asking for it. |
| `hash` | `string` | yes | A hash of this pack's text alone. It moves only when this pack changes, so a cached copy of one pack can be checked without re-reading the rest. |

### `GET /v1/capability-packs/{id}`

One capability pack: its title, description and full markdown `content`, with the pack set's `version`. An unknown `id` is a 404 that names the ids which exist.
List the packs, without content, with `GET /v1/capability-packs`. The packs point at facts rather than restating them: functions are `GET /v1/functions/{key}`, routes and bodies `GET /v1/openapi.json`.
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

Each item of `routes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `method` | `"GET" \| "POST" \| "PATCH" \| "DELETE" \| "PUT"` | yes | The HTTP method the platform serves on this path. |
| `path` | `string` | yes | The full path template under /v1, using the same {param} grammar as a dynamic endpoint's path, so the two are directly comparable. |
| `group` | `"auth" \| "account" \| "keys" \| "usage" \| "files" \| "docs" \| "management" \| "platform"` | yes | The functional group the route belongs to — the unit a project enables or disables, not the raw path segment. |
| `plane` | `"platform" \| "management" \| "project" \| "both"` | yes | Who this route is served to — its group's plane, unless the route declares its own: the project file library, attach and detach on `/v1/files` are served to operators only ("management") inside a "both" group. |
| `streaming` | `boolean` | yes | True when the success response is Server-Sent Events rather than JSON. |

Each item of `groups`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `group` | `"auth" \| "account" \| "keys" \| "usage" \| "files" \| "docs" \| "management" \| "platform"` | yes | The functional group the route belongs to — the unit a project enables or disables, not the raw path segment. |
| `label` | `string` | yes | Display name for the group. |
| `description` | `string` | yes | One line on what the group exposes. |
| `plane` | `"platform" \| "management" \| "project" \| "both"` | yes | Who the group is written for: "project" (an end user of your product), "management" (you, building on Kipory), "platform" (Kipory staff), or "both". |
| `alwaysOn` | `boolean` | yes | True when the group is infrastructure that is served unconditionally and carries no per-project toggle. |
| `criticalToDisable` | `boolean` | yes | True when turning the group off breaks a core flow such as sign-in or billing. Advisory: the group can still be disabled. |
