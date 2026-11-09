<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `57dcd12bfa85` | `version` on `GET /v1/capability-packs` |
| functions | `b27546511c3904d2003d11327b65bb5a359566e051f82c68d070ff82526550ed` | `version` on `GET /v1/functions` |
| api | `fe4238c9f09c` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `ffa7d5e83b36` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 118 customer functions, key set `0df2e3854a23`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `10` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
