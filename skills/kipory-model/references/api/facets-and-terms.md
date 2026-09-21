<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 216f491414a3 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Facets and terms

A facet is a classification kind; a term is one value in it. Two write paths reach terms — through the facet, and directly — and `version` is required on every facet patch.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/facets`](#get-v1-facets) |  |
| `POST` | [`/v1/facets`](#post-v1-facets) |  |
| `GET` | [`/v1/facets/{id}`](#get-v1-facets-id) |  |
| `PATCH` | [`/v1/facets/{id}`](#patch-v1-facets-id) |  |
| `DELETE` | [`/v1/facets/{id}`](#delete-v1-facets-id) |  |
| `GET` | [`/v1/facets/{id}/delete-preflight`](#get-v1-facets-id-delete-preflight) |  |
| `POST` | [`/v1/facets/{id}/terms`](#post-v1-facets-id-terms) |  |
| `GET` | [`/v1/facets/resolvers`](#get-v1-facets-resolvers) |  |
| `GET` | [`/v1/terms`](#get-v1-terms) |  |
| `POST` | [`/v1/terms`](#post-v1-terms) |  |
| `PATCH` | [`/v1/terms/{id}`](#patch-v1-terms-id) |  |
| `DELETE` | [`/v1/terms/{id}`](#delete-v1-terms-id) |  |
| `POST` | [`/v1/terms/{id}/merge`](#post-v1-terms-id-merge) |  |

### `GET /v1/facets`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose facets to list. Required. |
| `facetKey` | `string` | no | Return only the facet with this exact key. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: stats, samples, validator, readiness, wiring. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facets` | `object[]` | yes | The project's facets, unpaginated. |
| `validator` | `object \| null` | no | A consistency check across the whole vocabulary, present only when you pass `expand=validator`. **Null means the check could not run — that is `unknown`, not `healthy`.** |

### `POST /v1/facets`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the facet. |
| `facetKey` | `string` | yes | Stable key for the facet, unique within the project. Permanent — it cannot be changed later. |
| `label` | `string` | yes | Human-readable name. Editable later with PATCH; the rest of a facet's shape is fixed at creation. |
| `binding` | `"record"` | no | Defaults to `record` when omitted, and `record` is the only value. |
| `cardinality` | `"one" \| "many"` | yes | How many terms one record may carry on this facet — exactly one, or any number. Fixed when the facet is created. |
| `parentFacetKey` | `string \| null` | no | Key of a facet to nest this one under. Omit or pass null for a top-level facet. Permanent. |
| `mint` | `"none" \| "active" \| "candidate"` | no | Defaults to `active` when omitted. |
| `matching` | `"exact" \| "semantic"` | no | Defaults to `semantic` when omitted. |
| `proposal` | `object \| null` | no | How ingest may propose new terms for this facet. Omit for the default behaviour. |
| `resolverFlowId` | `string \| null` | no | The flow that searches this facet for a term matching a proposed value. Three distinct choices: OMIT and a `matching: semantic` facet is bound to the platform's default resolver for you; pass null to create it unbound; pass a flow id to bind that one. The id is not checked here — the resolver validates its own inputs when it runs. |
| `resolutionParams` | `object \| null` | no | Parameters for the resolver flow. Ignored unless you named one explicitly. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the create WOULD have computed. Present whenever the draft was accepted; absent when it was refused. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the facet — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `facetKey` | `string` | yes | Stable key for the facet within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Human-readable name. Editable — renaming touches nothing but this string, because `facetKey` is the identity. |
| `binding` | `"record" \| "sub-entity"` | yes | What a term on this facet attaches to. `record` tags the whole record. `sub-entity` tagged something inside it and is RETRACTED — it cannot be created any more, because the subject half of the pairing was never stored; it appears here only so an existing facet can still be read. |
| `cardinality` | `"one" \| "many"` | yes | How many terms one record may carry on this facet — exactly one, or any number. Fixed when the facet is created. |
| `parentFacetKey` | `string \| null` | yes | Key of the facet this one nests under, or null when it stands alone. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this facet has never seen. `none` drops it and reports it unresolved. `active` mints a term you can match against immediately. `candidate` mints one that stays attached to the record that proposed it but out of the vocabulary until you activate it. |
| `matching` | `"exact" \| "semantic"` | yes | How this facet finds a term you already have. `exact` matches the slugified value and nothing else. `semantic` searches the facet's own terms by meaning, so `ML` can find `machine-learning`; it needs a resolver flow bound. |
| `proposal` | `unknown` | no | Settings for how new terms are proposed during ingest. |
| `resolverFlowId` | `string \| null` | yes | The flow that searches this facet for a matching term, or null when none is bound. Required by `matching: semantic` and unused by `exact`; a semantic facet is bound to a platform default at creation. Binding one does NOT change `mint` — the flow reports what it found, and `mint` decides what may be done about a miss. |
| `resolutionParams` | `unknown` | no | Parameters passed to that resolver flow, if any. |
| `createdBy` | `string` | yes | Who created the facet. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone else edited the facet in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `lastResolvedAt` | `string \| null` | yes | When a value for this facet was last written to a record. **Null means never observed, which is not the same as never used** — a facet that predates this being recorded reads null however busy it has been, and fills in on its first resolution after that. A preview run does not count: this tracks values that actually landed. |
| `stats` | `object` | no | Term counts, present only when you pass `expand=stats`. Derived from the terms themselves, not stored on the facet. |
| `samples` | `string[]` | no | Up to four example term labels, present only when you pass `expand=samples`. |
| `readiness` | `object` | no | Whether the facet is actually working, present only when you pass `expand=readiness`. Costs two extra queries for the whole list, not per facet. |
| `wiring` | `object[]` | no | Every flow node in this project that feeds the facet, present only when you pass `expand=wiring`. An EMPTY list means no node's configuration names this facet — which is weaker than "nothing fills it": a `facet.resolve` step can still pick the facet up from a slot it discovers at run time, and that path names no facet to scan for. A node whose configuration does not parse contributes nothing. |

### `GET /v1/facets/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: stats, samples, validator, readiness, wiring. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the facet — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `facetKey` | `string` | yes | Stable key for the facet within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Human-readable name. Editable — renaming touches nothing but this string, because `facetKey` is the identity. |
| `binding` | `"record" \| "sub-entity"` | yes | What a term on this facet attaches to. `record` tags the whole record. `sub-entity` tagged something inside it and is RETRACTED — it cannot be created any more, because the subject half of the pairing was never stored; it appears here only so an existing facet can still be read. |
| `cardinality` | `"one" \| "many"` | yes | How many terms one record may carry on this facet — exactly one, or any number. Fixed when the facet is created. |
| `parentFacetKey` | `string \| null` | yes | Key of the facet this one nests under, or null when it stands alone. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this facet has never seen. `none` drops it and reports it unresolved. `active` mints a term you can match against immediately. `candidate` mints one that stays attached to the record that proposed it but out of the vocabulary until you activate it. |
| `matching` | `"exact" \| "semantic"` | yes | How this facet finds a term you already have. `exact` matches the slugified value and nothing else. `semantic` searches the facet's own terms by meaning, so `ML` can find `machine-learning`; it needs a resolver flow bound. |
| `proposal` | `unknown` | no | Settings for how new terms are proposed during ingest. |
| `resolverFlowId` | `string \| null` | yes | The flow that searches this facet for a matching term, or null when none is bound. Required by `matching: semantic` and unused by `exact`; a semantic facet is bound to a platform default at creation. Binding one does NOT change `mint` — the flow reports what it found, and `mint` decides what may be done about a miss. |
| `resolutionParams` | `unknown` | no | Parameters passed to that resolver flow, if any. |
| `createdBy` | `string` | yes | Who created the facet. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone else edited the facet in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `lastResolvedAt` | `string \| null` | yes | When a value for this facet was last written to a record. **Null means never observed, which is not the same as never used** — a facet that predates this being recorded reads null however busy it has been, and fills in on its first resolution after that. A preview run does not count: this tracks values that actually landed. |
| `stats` | `object` | no | Term counts, present only when you pass `expand=stats`. Derived from the terms themselves, not stored on the facet. |
| `samples` | `string[]` | no | Up to four example term labels, present only when you pass `expand=samples`. |
| `readiness` | `object` | no | Whether the facet is actually working, present only when you pass `expand=readiness`. Costs two extra queries for the whole list, not per facet. |
| `wiring` | `object[]` | no | Every flow node in this project that feeds the facet, present only when you pass `expand=wiring`. An EMPTY list means no node's configuration names this facet — which is weaker than "nothing fills it": a `facet.resolve` step can still pick the facet up from a slot it discovers at run time, and that path names no facet to scan for. A node whose configuration does not parse contributes nothing. |

### `PATCH /v1/facets/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | Rename the facet. Display only — `facetKey` is the identity, so no term, link or stored resolution moves. Not nullable: a facet always has a name. |
| `mint` | `"none" \| "active" \| "candidate"` | no | Change what a value this facet has never seen may become. |
| `matching` | `"exact" \| "semantic"` | no | Change how this facet finds a term you already have. Switching to `semantic` needs a resolver flow bound. |
| `proposal` | `object \| null` | no | Change how ingest may propose new terms. |
| `resolverFlowId` | `string \| null` | no | Bind a different resolver flow, or pass null to unbind. This is what `matching: semantic` dispatches to, and unbinding a semantic facet leaves it unable to resolve at all. It does NOT change `mint` — the flow reports what it found, and `mint` decides what may be done about a miss. |
| `resolutionParams` | `object \| null` | no | Change the parameters passed to that resolver flow. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the facet — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `facetKey` | `string` | yes | Stable key for the facet within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Human-readable name. Editable — renaming touches nothing but this string, because `facetKey` is the identity. |
| `binding` | `"record" \| "sub-entity"` | yes | What a term on this facet attaches to. `record` tags the whole record. `sub-entity` tagged something inside it and is RETRACTED — it cannot be created any more, because the subject half of the pairing was never stored; it appears here only so an existing facet can still be read. |
| `cardinality` | `"one" \| "many"` | yes | How many terms one record may carry on this facet — exactly one, or any number. Fixed when the facet is created. |
| `parentFacetKey` | `string \| null` | yes | Key of the facet this one nests under, or null when it stands alone. |
| `mint` | `"none" \| "active" \| "candidate"` | yes | What happens to a value this facet has never seen. `none` drops it and reports it unresolved. `active` mints a term you can match against immediately. `candidate` mints one that stays attached to the record that proposed it but out of the vocabulary until you activate it. |
| `matching` | `"exact" \| "semantic"` | yes | How this facet finds a term you already have. `exact` matches the slugified value and nothing else. `semantic` searches the facet's own terms by meaning, so `ML` can find `machine-learning`; it needs a resolver flow bound. |
| `proposal` | `unknown` | no | Settings for how new terms are proposed during ingest. |
| `resolverFlowId` | `string \| null` | yes | The flow that searches this facet for a matching term, or null when none is bound. Required by `matching: semantic` and unused by `exact`; a semantic facet is bound to a platform default at creation. Binding one does NOT change `mint` — the flow reports what it found, and `mint` decides what may be done about a miss. |
| `resolutionParams` | `unknown` | no | Parameters passed to that resolver flow, if any. |
| `createdBy` | `string` | yes | Who created the facet. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone else edited the facet in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `lastResolvedAt` | `string \| null` | yes | When a value for this facet was last written to a record. **Null means never observed, which is not the same as never used** — a facet that predates this being recorded reads null however busy it has been, and fills in on its first resolution after that. A preview run does not count: this tracks values that actually landed. |
| `stats` | `object` | no | Term counts, present only when you pass `expand=stats`. Derived from the terms themselves, not stored on the facet. |
| `samples` | `string[]` | no | Up to four example term labels, present only when you pass `expand=samples`. |
| `readiness` | `object` | no | Whether the facet is actually working, present only when you pass `expand=readiness`. Costs two extra queries for the whole list, not per facet. |
| `wiring` | `object[]` | no | Every flow node in this project that feeds the facet, present only when you pass `expand=wiring`. An EMPTY list means no node's configuration names this facet — which is weaker than "nothing fills it": a `facet.resolve` step can still pick the facet up from a slot it discovers at run time, and that path names no facet to scan for. A node whose configuration does not parse contributes nothing. |

### `DELETE /v1/facets/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirm` | `"true" \| "false"` | no | Pass `true` to actually delete. Without it the call returns the preflight instead, so you can see what would be destroyed before committing to it. |
| `assignedTerms` | `"delete" \| "archive"` | no | What to do with terms that records already carry. Required once the preflight reports any — there is no default, because both answers destroy something different. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `facetKey` | `string` | yes | The facet that was deleted. |
| `unlinkedRecordTypes` | `integer` | yes | How many record types stopped surfacing it. |
| `deletedTerms` | `integer` | yes | Terms removed outright. |
| `archivedTerms` | `integer` | yes | Terms archived rather than removed, keeping the labels on existing records. Always zero if you chose to delete them instead. |
| `removedAssignments` | `integer` | yes | Labels taken off real records. Always zero if you chose to archive instead. |
| `qdrantWarning` | `string \| null` | yes | Set when the rows are gone but their vector-store points outlived the sweep. Harmless — a background pass collects them — and reported rather than hidden, because the database is the authority and silence here would be a lie. |

### `GET /v1/facets/{id}/delete-preflight`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facetKey` | `string` | yes | The facet this preflight is about. |
| `childFacetKeys` | `string[]` | yes | Facets nested under this one. If this is not empty the delete is refused outright — re-parent or delete them first. |
| `recordTypeLinks` | `integer` | yes | How many record types surface this facet. Those attachments go with it, and that cannot be undone. |
| `terms` | `integer` | yes | Every term on this facet. All of them go, one way or another. |
| `assignedTerms` | `integer` | yes | How many of those terms are actually applied to a record. **If this is not zero you must choose what happens to them** — they cannot simply be deleted while records still carry them. |
| `assignments` | `integer` | yes | How many individual labels are at stake across all records. |
| `recordsAffected` | `integer` | yes | How many distinct records lose at least one label. This is the number that tells you how far the deletion actually reaches — the others count rows, this one counts consequences. |
| `blocked` | `boolean` | yes | True when the delete is refused no matter what you confirm — currently only because other facets are nested under this one. |

### `POST /v1/facets/{id}/terms`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `parentTermId` | `string \| null` | no | Parent term for every row in this batch. Required when the facet nests under another; must be absent for a top-level facet — a stray parent is refused rather than ignored. |
| `terms` | `object[]` | yes | The terms to create, up to 500 per call. Seed a larger vocabulary in successive calls — this endpoint is idempotent, so re-sending a list you have grown is safe. |
| `validateOnly` | `boolean` | no | Check this batch and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facetKey` | `string` | yes | The facet the terms were seeded into. |
| `parentTermId` | `string \| null` | yes | The parent they were nested under, or null for top-level. |
| `results` | `object[]` | yes | One entry per submitted term, in the order you sent them. |
| `created` | `integer` | yes | How many terms were newly inserted. |
| `existed` | `integer` | yes | How many already existed and were reused. |
| `qdrantUpsertFailures` | `integer` | yes | How many seeded terms have no vector yet. They are saved and authoritative, but will not appear in a vector search until a backfill runs — so a non-zero value here means the seed succeeded and is not yet fully usable. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the batch was coherent enough to derive it, which is not the same as `ok`. |

### `GET /v1/facets/resolvers`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose bindable resolvers you want. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resolvers` | `object[]` | yes | Every flow this project may bind as a facet resolver, platform offerings first, then your own by name. |

### `GET /v1/terms`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose terms to list. |
| `facet` | `string` | no | Keep only terms belonging to this facet — one facet's vocabulary. Omit for every term in the project. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: usage. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `terms` | `object[]` | yes | The project's terms, including archived ones and merge aliases — filter on `status` and `aliasOfId` if you want only live canonical terms. |

### `POST /v1/terms`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the owning project. |
| `facet` | `string` | yes | Key of an existing facet in this project. |
| `slug` | `string` | yes | Kebab-case identity slug. Validated as-is and never slugified for you — send the exact slug you want, because it is immutable. |
| `label` | `string` | yes | Display label. |
| `parentTermId` | `string \| null` | no | Parent term id. Required when the facet is hierarchical, and REFUSED for a flat one — sending a parent to a facet that takes none is a 422, not a value quietly dropped on the way to a 201. The bulk seed answers this the same way. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `term` | `object` | yes | The term that was created. |
| `reembedWarning` | `string \| null` | yes | Non-null when the term was SAVED but its search vector could not be updated. The write succeeded — the row is authoritative — but search will find this term by its old wording until it is re-embedded. |

### `PATCH /v1/terms/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The term's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | Rename the term. A rename re-embeds it for search; a status change alone does not. |
| `status` | `"active" \| "archived"` | no | Change the term's status. `active` both RESTORES an archived term and ADMITS a candidate one into the vocabulary; `archived` withdraws it. `candidate` is not settable — it is where minting puts a term, not a state you move one into. Does not touch the search vector. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `term` | `object` | yes | The term as it now stands. |
| `reembedWarning` | `string \| null` | yes | Non-null when the term was SAVED but its search vector could not be updated. The write succeeded — the row is authoritative — but search will find this term by its old wording until it is re-embedded. |

### `DELETE /v1/terms/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The term's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `qdrantWarning` | `string \| null` | yes | Non-null when the term was DELETED but its search vector was left behind. The deletion stands and the leftover is harmless — nothing assigns it, because assignment checks the database first — but nothing collects it either. |

### `POST /v1/terms/{id}/merge`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The term's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `targetTermId` | `string` | yes | The term to merge INTO — the one that survives. It must be active, canonical, and in the same facet, parent and project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `term` | `object` | yes | The absorbed term — it now points at the one it was merged into. |
| `reembedWarning` | `string \| null` | yes | Non-null when the merge was SAVED but the search vector was not updated. ⚠️ The absorbed term then keeps winning searches against the term that absorbed it, so the merge is invisible to search until a later write touches it. |
