<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `fd694d8d38cd` | `version` on `GET /v1/capability-packs` |
| functions | `616033539a918fd3e261c9f573afa7af5168a4617ce2fb00ed2704be49d6c4f6` | `version` on `GET /v1/functions` |
| api | `94a94dc0dc1d` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `21dd8f063195` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 119 customer functions, key set `245016404d14`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `7` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
