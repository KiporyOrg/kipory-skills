<!-- generated: kipory-skills references · source: the content hashes every generated reference page was built from · regenerated on every publish, so an edit here is overwritten -->

# Reference versions

Every page under `references/api/`, `references/functions/` and `references/packs/` across these skills, and `references/refusal-codes.md` in this one, was generated from the sources below. The deployment serves each hash live; `scripts/sync.mjs` in this skill compares them and, from the per-item hashes in `manifest.json` beside this file, names the packs, functions, routes and pages to read live instead. **When they differ, the deployment wins.**

| Source | Version | Served live as |
| --- | --- | --- |
| packs | `cea0222096de` | `version` on `GET /v1/capability-packs` |
| functions | `3013b76395c96649359d229a55a2666960e26a0f602a4cc83391844283f4ea5c` | `version` on `GET /v1/functions` |
| api | `462daad0bce4` | `info["x-kipory-surface-version"]` on `GET /v1/openapi.json` |
| codes | `a344d7f19068` | `info["x-kipory-refusal-codes-version"]` on `GET /v1/openapi.json` |

Function pages: 123 customer functions, key set `2dcaf5dce560`; platform-only, listed live and not documented: `description.brief`, `description.plan`, `description.write`.

Document format: `11` — the `kipory:` version these skills write. The deployment serves the one it reads as `documentFormat.version` on `GET /v1/platform-status`; when they differ, every document in this bundle's format is refused with `DOCUMENT_VERSION_UNSUPPORTED`.
