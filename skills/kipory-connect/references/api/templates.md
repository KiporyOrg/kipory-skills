<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Templates

The project documents a new project can be created from, shipped with the platform. Both reads are public; `POST /v1/projects` and a first project's `POST /v1/me/projects` take the slug as `template` and apply it inside the transaction that creates the project. Naming none creates an empty project; `starter` marks the one to suggest to somebody new.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/templates`](#get-v1-templates) |  |
| `GET` | [`/v1/templates/{slug}`](#get-v1-templates-slug) |  |

### `GET /v1/templates`

Every project template this build ships: each one's `slug`, name, description, what it `requires` that it cannot carry (secrets to store), and which one is the `starter`, with a `version` hash to cache on.
Read the document a template applies with `GET /v1/templates/{slug}`. To create a project from one, pass its slug as `template` on `POST /v1/projects` (or `POST /v1/me/projects` for a first project).
Public: no credential needed.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the shipped templates — moves when, and only when, a template file changed. |
| `templates` | `object[]` | yes | The templates, ordered by slug. |

Each item of `templates`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `slug` | `string` | yes | The template's slug, as `GET /v1/templates` lists it: lowercase words joined by hyphens. |
| `name` | `string` | yes | The template's name, for a person. |
| `description` | `string` | yes | What a project made from it is. |
| `starter` | `boolean` | yes | True on exactly one template: the STARTER, the one to suggest to somebody new. Nothing applies it on its own — every creation, `POST /v1/projects` and a first project's `POST /v1/me/projects` alike, starts from the template it names, a document, or nothing. |
| `requires` | `object` | yes |  |

### `GET /v1/templates/{slug}`

One project template, with the project `document` it applies — exactly what a project created from it will hold. An unknown slug is a 404 that names the slugs this build ships.
Create a project from it by passing the slug as `template` on `POST /v1/projects` (or `POST /v1/me/projects`). To add it to a project that already exists, plan its `document` with `POST /v1/projects/{nodeId}/document/plan`. Every template, without documents, is `GET /v1/templates`.
Public: no credential needed.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `slug` | `string` | yes | The template's slug. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `slug` | `string` | yes | The template's slug, as `GET /v1/templates` lists it: lowercase words joined by hyphens. |
| `name` | `string` | yes | The template's name, for a person. |
| `description` | `string` | yes | What a project made from it is. |
| `starter` | `boolean` | yes | True on exactly one template: the STARTER, the one to suggest to somebody new. Nothing applies it on its own — every creation, `POST /v1/projects` and a first project's `POST /v1/me/projects` alike, starts from the template it names, a document, or nothing. |
| `requires` | `object` | yes |  |
| `document` | `object` | yes | The project document the template applies — read it to see exactly what a project created from this template will hold. Plan it against an existing project to see what it would add there. |
