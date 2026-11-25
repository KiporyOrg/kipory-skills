<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `8b7dabca081f` | `version` on `GET /v1/capability-packs` |
| functions | `6fee973fe331302487a22e47cbd0dad5779818b80f29a5545313ab506cece6c1` | `version` on `GET /v1/functions` |
| api | `0182004790ea` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `709fe2c07911` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 115 customer functions, key set `5a667025f392`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`, `term.threshold-gate`.

Kipory's seeded abilities: 54 rows, set `f74669b748d5`; their pages say `Origin: ability`.

Document format: `13` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
