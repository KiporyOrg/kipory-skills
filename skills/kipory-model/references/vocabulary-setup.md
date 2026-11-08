# Vocabularies and their terms

Read this when you create a vocabulary, attach one to a table, or seed and edit its terms — step 5 of `SKILL.md`'s order, in full.

A vocabulary is not a field: its values are resolved by the processing flow into the term store, so the table-to-vocabulary association is a list on the table (`uses.vocabularies`), not a use of a field. A key that is not a vocabulary of the project is `USES_VOCABULARY_UNKNOWN`; one that is also a field name of the table is `USES_VOCABULARY_SHADOWS_FIELD`.

**A vocabulary that is the parent of another must be `cardinality: one`** — a child term hangs under exactly one parent term, so the child vocabulary's create is refused `VOCABULARY_PARENT_CARDINALITY` otherwise, and a vocabulary's PATCH does not take `cardinality`. Decide it before seeding the parent's terms.

**Every term write embeds before it saves, whatever the vocabulary's `matching`.** `POST /v1/vocabularies/{id}/terms` and a relabelling `PATCH /v1/terms/{id}` embed the term's text on the platform's shared term model. When that model's provider refuses, **nothing is saved**, even on an `exact` vocabulary, and a `validateOnly` seed does not embed — so it can answer `ok` for a seed the real call refuses. `references/classification-runtime.md` has how to read that failure.

A vocabulary whose `matching` is `exact` needs no resolver. A `semantic` one created _without_ naming a `resolverFlowId` is bound to a platform default at creation and works as authored; pass an explicit `null` only to opt out and bring your own resolver later (`kipory-build`, then patch it on). A term is created under its vocabulary — `POST /v1/vocabularies/{id}/terms` takes one row as readily as many, and a key the vocabulary already holds answers `existed` rather than a conflict. After that: `PATCH /v1/terms/{id}` and `POST /v1/terms/{id}/merge` (both require the term's `version` from `GET /v1/terms`, which is paged — walk `after` with its `nextCursor`; a stale one is 409 `VERSION_CONFLICT`), `DELETE /v1/terms/{id}`.
