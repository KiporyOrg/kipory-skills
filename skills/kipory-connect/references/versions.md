<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `e654d2870d21` | `version` on `GET /v1/capability-packs` |
| functions | `187e5548928374d1c63392b4aa842a7d10853ba8b4dcf798b6c06454deb1c5f0` | `version` on `GET /v1/functions` |
| api | `6946135c2cb3` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `65fe0e3fa041` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 123 customer functions, key set `2dcaf5dce560`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `11` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
