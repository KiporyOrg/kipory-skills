<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `4a4efe6a1df5` | `version` on `GET /v1/capability-packs` |
| functions | `84f6406778f7fcd4d736299d7c2bbb0ab47a1972f7917008141e9fd94a102f08` | `version` on `GET /v1/functions` |
| api | `7ecad55539b3` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `1f5939dae3db` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 123 customer functions, key set `92a9544ced11`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `9` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
