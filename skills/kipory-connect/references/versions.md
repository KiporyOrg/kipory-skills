<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `070ab68f3425` | `version` on `GET /v1/capability-packs` |
| functions | `6c0389af0b99ec444ba47f2aaf70d78eb326d445d70f535c0c3625354cb9e8ac` | `version` on `GET /v1/functions` |
| api | `6f93b35772b7` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `d4f7c090af82` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 124 customer functions, key set `24694c47e13a`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Kipory's seeded abilities: 54 rows, set `3fecec05a5d5`; their pages say `Origin: ability`.

Document format: `11` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
