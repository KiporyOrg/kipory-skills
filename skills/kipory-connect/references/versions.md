<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `c06462fbda96` | `version` on `GET /v1/capability-packs` |
| functions | `71ca2ee3aa86d5bf48588018e560efc1368ce99c55119a2b224364b3700e34b0` | `version` on `GET /v1/functions` |
| api | `6e7527b29ce6` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `94ccf42fdadd` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 124 customer functions, key set `24694c47e13a`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Kipory's seeded abilities: 54 rows, set `3fecec05a5d5`; their pages say `Origin: ability`.

Document format: `11` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
