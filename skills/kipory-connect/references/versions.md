<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `ed1a3ace3fb1` | `version` on `GET /v1/capability-packs` |
| functions | `055574183bb3534537aa79a9ec644b629b935c429f86104301630652babfeb86` | `version` on `GET /v1/functions` |
| api | `fd3ee267ffdf` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `f8a87b189d56` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 123 customer functions, key set `2dcaf5dce560`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `11` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
