<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `6c6f3bdfcd58` | `version` on `GET /v1/capability-packs` |
| functions | `16eef6e52c0a8002588234039463517feeedf1cd8270627c423bad079315d1bd` | `version` on `GET /v1/functions` |
| api | `17bb36883542` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `5640d823fb6d` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 120 customer functions, key set `e8b46ad6e9cd`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `8` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
