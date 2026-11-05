<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `908ea5833e82` | `version` on `GET /v1/capability-packs` |
| functions | `45245b23bf45feedc8e67f68c0a70ca2858b2b4b775ac256dca13a7007ff0bae` | `version` on `GET /v1/functions` |
| api | `c5857ed863e4` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `85efb3234f30` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 101 customer functions, key set `7a6fd8509c26`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `10` — the `kipory:` version `scripts/upgrade-document.mjs` in this skill converts to and these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
