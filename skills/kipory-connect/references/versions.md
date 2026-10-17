<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `8becf21c3c27` | `version` on `GET /v1/capability-packs` |
| functions | `519ea9a84364b5f93e763a67ed28429aa49878f3ad08e1f08ca472fa92032598` | `version` on `GET /v1/functions` |
| api | `2ae59ac4409a` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `7b8338ef9a55` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 119 customer functions, key set `245016404d14`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.
