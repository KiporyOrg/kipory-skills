<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Templates

The project documents a new project can be created from, shipped with the platform. Both reads are public; `POST /v1/projects` takes the slug as `template` and applies it inside the transaction that creates the project. A new account's first project is always the one marked `starter`.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/templates`](#get-v1-templates) |  |
| `GET` | [`/v1/templates/{slug}`](#get-v1-templates-slug) |  |

### `GET /v1/templates`

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `string` | yes | Content hash of the shipped templates — moves when, and only when, a template file changed. |
| `templates` | `object[]` | yes | The templates, ordered by slug. |

### `GET /v1/templates/{slug}`

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
| `starter` | `boolean` | yes | True on exactly one template: the STARTER, which a new account's first project is always created from (`POST /v1/me/projects` takes no `template`). Every other creation — `POST /v1/projects` — starts from the template it names, or from nothing. |
| `requires` | `object` | yes |  |
| `document` | `object` | yes | The project document the template applies — read it to see exactly what a project created from this template will hold. Plan it against an existing project to see what it would add there. |
