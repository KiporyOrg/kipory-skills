<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `ac084463e684` | `version` on `GET /v1/capability-packs` |
| functions | `a0a02433484a8eea5246e6693b40a3fa9f3eaff8134fa9b3a8354febd7ee9b31` | `version` on `GET /v1/functions` |
| api | `913fc30a2ccf` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `ffa7d5e83b36` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 104 customer functions, key set `a554e0f82166`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `10` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
