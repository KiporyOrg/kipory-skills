<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `8da40eada3d8` | `version` on `GET /v1/capability-packs` |
| functions | `10f6f05d9b5ea06fd3d48ac5cb9f10543a3499ac046771e1cc453b35ae7a74ee` | `version` on `GET /v1/functions` |
| api | `c16f5d7edc94` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `fad93e3a1e09` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 123 customer functions, key set `92a9544ced11`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `9` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
