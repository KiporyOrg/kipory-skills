<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `a2cb61619d84` | `version` on `GET /v1/capability-packs` |
| functions | `7203250deab7d2f985a583c5f1a782454a2ded5821b544e915869e84f84c29b4` | `version` on `GET /v1/functions` |
| api | `874f37d288fd` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `c2e5a7c467bd` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 98 customer functions, key set `58eee608dd00`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `9` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
