<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `8949f0e1c1c8` | `version` on `GET /v1/capability-packs` |
| functions | `5f41b05c9a0206df4485fc19ad05cfc4bddae4b9ca72ca98c2ca4139d4163e15` | `version` on `GET /v1/functions` |
| api | `6669c8d76fe7` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `779541b3e6b6` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 103 customer functions, key set `258ab2f512f2`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `10` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
