<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `c9eac5079141` | `version` on `GET /v1/capability-packs` |
| functions | `a949ba780d3f36d5c959c836b93784aae68c885786ad5d1ddf4f1ca769cc4abe` | `version` on `GET /v1/functions` |
| api | `a82976596117` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `933e2cbc1b80` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 119 customer functions, key set `245016404d14`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `7` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
