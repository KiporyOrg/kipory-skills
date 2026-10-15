<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `a1cf14f78254` | `version` on `GET /v1/capability-packs` |
| functions | `882df75b81978683692a705506221b834c970ab0a2e2779bf8edf9c6e0bddd4c` | `version` on `GET /v1/functions` |
| api | `61caf3123a0c` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `747b502cb385` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 119 customer functions, key set `245016404d14`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.
