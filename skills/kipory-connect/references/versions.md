<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `8fdc61a59a9f` | `version` on `GET /v1/capability-packs` |
| functions | `86603f0268eb08293e1bf567cc68f0982d8535e15deb8d17f762cc4f2c6da76a` | `version` on `GET /v1/functions` |
| api | `82cfe0814c38` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `b6a58e14a898` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 122 customer functions, key set `c8bd68dcf5aa`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `9` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
