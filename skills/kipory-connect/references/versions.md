<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `b3db31743c01` | `version` on `GET /v1/capability-packs` |
| functions | `b1640f17292cd428df3f63f1ae0bfac07ffdcf9977edd1558d87dcd4c8db5c0c` | `version` on `GET /v1/functions` |
| api | `96a1ea2a4b04` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `973f00510f5e` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 122 customer functions, key set `c8bd68dcf5aa`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `9` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
