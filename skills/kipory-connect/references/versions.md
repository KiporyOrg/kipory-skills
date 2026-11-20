<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `074735de1368` | `version` on `GET /v1/capability-packs` |
| functions | `95b21d566532f76379e76c6d9c38a9ca248381688d46e7c18af3cd54087e9bea` | `version` on `GET /v1/functions` |
| api | `050d3fcd450a` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `daeb038448fe` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 124 customer functions, key set `24694c47e13a`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Kipory's seeded abilities: 54 rows, set `3fecec05a5d5`; their pages say `Origin: ability`.

Document format: `11` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
