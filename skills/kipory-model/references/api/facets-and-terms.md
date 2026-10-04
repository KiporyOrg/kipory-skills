<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Facets and terms

A facet is a classification kind; a term is one value in it. Two write paths reach terms — through the facet, and directly — and `version` is required on every facet patch.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/facets`](#get-v1-facets) |  |
| `POST` | [`/v1/facets`](#post-v1-facets) |  |
| `GET` | [`/v1/facets/{id}`](#get-v1-facets-id) |  |
| `PATCH` | [`/v1/facets/{id}`](#patch-v1-facets-id) |  |
| `DELETE` | [`/v1/facets/{id}`](#delete-v1-facets-id) |  |
| `POST` | [`/v1/facets/{id}/terms`](#post-v1-facets-id-terms) |  |
| `GET` | [`/v1/facets/resolvers`](#get-v1-facets-resolvers) |  |
| `GET` | [`/v1/terms`](#get-v1-terms) |  |
| `PATCH` | [`/v1/terms/{id}`](#patch-v1-terms-id) |  |
| `DELETE` | [`/v1/terms/{id}`](#delete-v1-terms-id) |  |
| `POST` | [`/v1/terms/{id}/merge`](#post-v1-terms-id-merge) |  |

### `GET /v1/facets`

List a project's facets — the classification dimensions its records carry — optionally one by `key`, each with the `version` its PATCH takes. `expand` adds per-facet `stats`, `samples`, `readiness` and `wiring`, or the whole substrate's `validator` verdict. The same rows ride `GET /v1/bootstrap`; the authored configuration, terms included, is the facets section of `GET /v1/projects/{nodeId}/document`. A facet's terms: `GET /v1/terms?facetKey=`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose facets to list. Required. |
| `key` | `string` | no | Return only the facet with this exact key. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: stats, samples, validator, readiness, wiring. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `facets` | `object[]` | yes | The project's facets, unpaginated. |
| `validator` | `object \| null` | no | A consistency check across the whole vocabulary, present only when you pass `expand=validator`. **Null means the check could not run — that is `unknown`, not `healthy`.** |

Each item of `facets`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the facet — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The facet's key within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Display text. Editable — changing it touches nothing but this string, because `key` is the identity. |
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

### `POST /v1/facets`

Create one facet. With `validateOnly: true` it answers whether the facet would be created and the readiness it would be born in, writing nothing. Add its vocabulary with `POST /v1/facets/{id}/terms`. Several facets at once, with their terms: the facets section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the facet. |
| `key` | `string` | yes | The facet's key, unique within the project. Permanent — it cannot be changed later. camelCase letters and digits starting with a lowercase letter, like `personRole`, up to 64 characters. |
| `label` | `string` | yes | Display text. Editable later with PATCH; the rest of a facet's shape is fixed at creation. |
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

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the facet — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The facet's key within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Display text. Editable — changing it touches nothing but this string, because `key` is the identity. |
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

Each item of `wiring`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow the node belongs to. |
| `flowKey` | `string` | yes | That flow's key within the project. |
| `flowLabel` | `string` | yes | That flow's label (display text). |
| `skillId` | `string` | yes | Id of the node (step) that feeds the facet. |
| `skillKey` | `string` | yes | The node's key within its flow. |
| `kind` | `"extracted" \| "proposed" \| "fed"` | yes | How this node feeds the facet. `extracted` — a `text.generate` step lists the facet in `facetFields`, so its value rides that step's structured answer. `proposed` — a `facet.resolve` step lists it in `facetKeys` with no slot feeding it, so the step's own model call proposes values. `fed` — a `facet.resolve` step reads its candidates from a slot (`deterministicSlots`) and makes no model call for it. |
| `field` | `string \| null` | yes | For `extracted`: the response field that carries the facet's value. Null for the other kinds. |
| `slot` | `string \| null` | yes | For `fed`: the slot the candidates are read from. Null for the other kinds. |
| `declaredOnly` | `boolean` | yes | True when the node's response TYPE marks this facet but the node's stored `facetFields` does not carry it yet — declared, not extracted. Nothing reaches the facet from this row until the node's config is re-derived from its type. Always false for `proposed` and `fed`. |
| `drift` | `string \| null` | yes | Set when this `extracted` node's stored `facetFields` no longer matches the `$facet` markers on its response type: one sentence naming what differs. The same sentence the save-time `LLM_GENERATE_FACET_FIELDS_DRIFTED` warning carries. Null when they agree, when the type carries no markers, and for `proposed` and `fed`. |

### `GET /v1/facets/{id}`

Read one facet by id, with the `version` its PATCH takes; `expand` adds its `stats`, `samples`, `readiness` and `wiring`. Every facet of a project: `GET /v1/facets?project=` or `GET /v1/bootstrap`. Its terms: `GET /v1/terms?facetKey=`.

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
| `key` | `string` | yes | The facet's key within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Display text. Editable — changing it touches nothing but this string, because `key` is the identity. |
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

Each item of `wiring`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow the node belongs to. |
| `flowKey` | `string` | yes | That flow's key within the project. |
| `flowLabel` | `string` | yes | That flow's label (display text). |
| `skillId` | `string` | yes | Id of the node (step) that feeds the facet. |
| `skillKey` | `string` | yes | The node's key within its flow. |
| `kind` | `"extracted" \| "proposed" \| "fed"` | yes | How this node feeds the facet. `extracted` — a `text.generate` step lists the facet in `facetFields`, so its value rides that step's structured answer. `proposed` — a `facet.resolve` step lists it in `facetKeys` with no slot feeding it, so the step's own model call proposes values. `fed` — a `facet.resolve` step reads its candidates from a slot (`deterministicSlots`) and makes no model call for it. |
| `field` | `string \| null` | yes | For `extracted`: the response field that carries the facet's value. Null for the other kinds. |
| `slot` | `string \| null` | yes | For `fed`: the slot the candidates are read from. Null for the other kinds. |
| `declaredOnly` | `boolean` | yes | True when the node's response TYPE marks this facet but the node's stored `facetFields` does not carry it yet — declared, not extracted. Nothing reaches the facet from this row until the node's config is re-derived from its type. Always false for `proposed` and `fed`. |
| `drift` | `string \| null` | yes | Set when this `extracted` node's stored `facetFields` no longer matches the `$facet` markers on its response type: one sentence naming what differs. The same sentence the save-time `LLM_GENERATE_FACET_FIELDS_DRIFTED` warning carries. Null when they agree, when the type carries no markers, and for `proposed` and `fed`. |

### `PATCH /v1/facets/{id}`

Rename a facet or change how it admits values (`mint`, `matching`, `proposal`, the resolver binding). Requires the `version` you last read; a stale one answers 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be accepted, writing nothing. Its terms are written through `POST /v1/facets/{id}/terms` and `/v1/terms/{id}`; several facets at once, through the facets section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New display text for the facet. Display only — `key` is the identity, so no term, link or stored resolution moves. Not nullable: a facet always has a label. |
| `mint` | `"none" \| "active" \| "candidate"` | no | Change what a value this facet has never seen may become. |
| `matching` | `"exact" \| "semantic"` | no | Change how this facet finds a term you already have. Switching to `semantic` needs a resolver flow bound. |
| `proposal` | `object \| null` | no | Change how ingest may propose new terms. |
| `resolverFlowId` | `string \| null` | no | Bind a different resolver flow, or pass null to unbind. This is what `matching: semantic` dispatches to, and unbinding a semantic facet leaves it unable to resolve at all. It does NOT change `mint` — the flow reports what it found, and `mint` decides what may be done about a miss. |
| `resolutionParams` | `object \| null` | no | Change the parameters passed to that resolver flow. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the facet — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The facet's key within its project, unique there. Set at creation and not editable. |
| `label` | `string` | yes | Display text. Editable — changing it touches nothing but this string, because `key` is the identity. |
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
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `wiring`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow the node belongs to. |
| `flowKey` | `string` | yes | That flow's key within the project. |
| `flowLabel` | `string` | yes | That flow's label (display text). |
| `skillId` | `string` | yes | Id of the node (step) that feeds the facet. |
| `skillKey` | `string` | yes | The node's key within its flow. |
| `kind` | `"extracted" \| "proposed" \| "fed"` | yes | How this node feeds the facet. `extracted` — a `text.generate` step lists the facet in `facetFields`, so its value rides that step's structured answer. `proposed` — a `facet.resolve` step lists it in `facetKeys` with no slot feeding it, so the step's own model call proposes values. `fed` — a `facet.resolve` step reads its candidates from a slot (`deterministicSlots`) and makes no model call for it. |
| `field` | `string \| null` | yes | For `extracted`: the response field that carries the facet's value. Null for the other kinds. |
| `slot` | `string \| null` | yes | For `fed`: the slot the candidates are read from. Null for the other kinds. |
| `declaredOnly` | `boolean` | yes | True when the node's response TYPE marks this facet but the node's stored `facetFields` does not carry it yet — declared, not extracted. Nothing reaches the facet from this row until the node's config is re-derived from its type. Always false for `proposed` and `fed`. |
| `drift` | `string \| null` | yes | Set when this `extracted` node's stored `facetFields` no longer matches the `$facet` markers on its response type: one sentence naming what differs. The same sentence the save-time `LLM_GENERATE_FACET_FIELDS_DRIFTED` warning carries. Null when they agree, when the type carries no markers, and for `proposed` and `fed`. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `DELETE /v1/facets/{id}`

Delete one facet and its vocabulary. Refused (409) while another facet nests under it, until `confirm=true` when anything would be destroyed, and until `assignedTerms` says what happens to terms records carry. With `?validateOnly=true` it answers whether it would be, and how far it reaches, writing nothing. Several facets at once: the facets section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The facet's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `confirm` | `"true" \| "false"` | no | Pass `true` to actually delete. Without it a destructive delete is refused with a 409 rather than performed — the gate is server-side, so a direct caller cannot wipe a vocabulary by accident either. ⭐ TO SEE WHAT WOULD BE DESTROYED, send `validateOnly=true` (below) with the same options you intend to delete with: that answers a 200 verdict plus the blast radius and writes nothing. |
| `assignedTerms` | `"delete" \| "archive"` | no | What to do with terms that records already carry. Required once any term is assigned — there is no default, because both answers destroy something different. Ask `validateOnly=true` to find out whether this delete needs one. |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/delete-preflight`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `key` | `string` | yes | Key of the facet that was deleted. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `unlinkedRecordTypes` | `integer` | yes | How many record types stopped surfacing it. |
| `deletedTerms` | `integer` | yes | Terms removed outright. |
| `archivedTerms` | `integer` | yes | Terms archived rather than removed, keeping the labels on existing records. Always zero if you chose to delete them instead. |
| `removedAssignments` | `integer` | yes | Labels taken off real records. Always zero if you chose to archive instead. |
| `qdrantWarning` | `string \| null` | yes | Set when the rows are gone but their vector-store points outlived the sweep. Harmless — a background pass collects them — and reported rather than hidden, because the database is the authority and silence here would be a lie. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the delete would reach — the same numbers `GET /:id/delete-preflight` used to answer on its own. Present on both arms of a verdict: a refusal is about a facet that exists, and its counts are what explain the refusal. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `record-types`, `schema-entries`, `relation-kinds`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `POST /v1/facets/{id}/terms`

Create terms under this facet — one or up to 500 — operator-authored and embedded for search, under one `parentTermId` when the facet nests under another. A `key` you send is honoured; omitted, it is derived from the label. A key the facet already holds is reused and reported `existed` with the label and status it carries (a seed never relabels or revives it), so re-sending a grown list is safe. With `validateOnly: true` it answers each row's key and outcome, writing and embedding nothing. To rename, archive, merge or delete one term: `/v1/terms/{id}`. To state the facet's WHOLE vocabulary, removals included: its `terms` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

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

Each item of `results`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The term's key. |
| `label` | `string` | yes | The label the term carries: the one sent when `created`, the stored one when `existed` — which may differ from what was sent (a seed never relabels; `PATCH /v1/terms/{id}` does). |
| `status` | `"active" \| "candidate" \| "archived"` | yes | The status the term carries: `active` when `created`; when `existed`, the stored one — an `archived` term was not revived by the seed (`PATCH /v1/terms/{id}` with `status: "active"` restores it). |
| `termId` | `string` | yes | Id of the term, whether created now or reused. |
| `outcome` | `"created" \| "existed"` | yes | `created` means this call inserted it; `existed` means the key was already there and was reused. `existed` is a normal success, not a partial failure. |
| `qdrantError` | `string \| null` | yes | Why this particular term has no vector yet, or null when it landed. The row is live and authoritative either way, but it will not turn up in a vector search until a backfill runs. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `GET /v1/facets/resolvers`

List the resolver flows a facet in this project may bind — the project's own and the platform's — with the parameter shape each takes. Bind one with `resolverFlowId` on `POST /v1/facets` or `PATCH /v1/facets/{id}`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose bindable resolvers you want. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resolvers` | `object[]` | yes | Every flow this project may bind as a facet resolver, platform offerings first, then your own by name. |

Each item of `resolvers`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id — what you send as `resolverFlowId` when binding it. |
| `label` | `string` | yes | The flow's display text, for the picker. |
| `key` | `string` | yes | The flow's key within its scope. |
| `scope` | `"project" \| "system"` | yes | `project` is one of your own flows and you can edit it. `system` is a platform offering — bindable by anyone, editable by nobody outside the platform. |
| `paramsSchema` | `unknown` | no | The JSON Schema of this resolver's `params` input — what a `resolutionParams` bag for it must look like. Null when the resolver declares no parameters at all. |
| `paramsKind` | `"thresholds" \| "reuse"` | yes | What this resolver does with a value that is close to a term but not exact, read from the type its `params` input declares. `thresholds` — a `FacetThresholds` bag: at or above the high threshold the top term is reused, at or below the low one a new term is added, and the band between them is handed to a model. `reuse` — a `FacetReuseParams` bag: one threshold, reuse at or above it and add a new term below it, with no model call. Both kinds' parameters are similarity scores between 0 and 1. Null when the resolver declares no parameters, or parameters of any other type — the platform has no reading of those and no default for them. |
| `paramsDefaults` | `object \| null` | yes | The `resolutionParams` bag the platform itself would store when binding this resolver, or null when it has no default of its own — bind it and you must supply the values. |
| `platformDefault` | `boolean` | yes | True for the platform flow the platform itself binds for this kind of resolver when you do not choose one — its marked default, or the only platform flow that fits. False for every other row, including every one of your own flows, and false for all of them when two platform flows fit and none is marked. |

### `GET /v1/terms`

List a project's terms — every facet's, or one facet's with `facetKey` — archived ones and merge aliases included, each with the `version` its PATCH and merge take. `expand=usage` adds how much points at each term and `deleteRefusal`, why `DELETE /v1/terms/{id}` would refuse it; `expand=findings` adds what is wrong with the vocabulary. Terms are not in `GET /v1/bootstrap`: a vocabulary grows with ingest, so it is read here, on demand. A facet's authored vocabulary as configuration: its `terms` in `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose terms to list. |
| `facetKey` | `string` | no | Key of a facet: keep only terms belonging to it — one facet's vocabulary. Omit for every term in the project. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: usage, findings. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `terms` | `object[]` | yes | The project's terms, including archived ones and merge aliases — filter on `status` and `aliasOfId` if you want only live canonical terms. |
| `findings` | `object[]` | no | `expand=findings` — what is wrong with the vocabulary, most severe kind first. Computed over EVERY term of the project, whatever `facet` narrows `terms` to — a parent or canonical term in another facet is still held — and then narrowed to that facet. Absent unless asked for; an empty list means the check ran and found nothing. |

Each item of `terms`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Term id — the address for every single-term verb. |
| `project` | `string` | yes | Node id of the owning project. |
| `facetKey` | `string` | yes | Key of the facet this term is a value of. |
| `key` | `string` | yes | The term's key. IMMUTABLE — a rename changes `label`, never this, so references stay valid. |
| `label` | `string` | yes | Display label — the only field a rename changes. |
| `parentId` | `string \| null` | yes | Parent term, for a hierarchical facet. Null for a top-level facet or for a root term. |
| `parentKey` | `string \| null` | yes | Parent's key, hydrated on the LIST read only. Null on single-term mutation responses even when `parentId` is set — absence here does not mean the term has no parent. |
| `parentLabel` | `string \| null` | yes | Parent's label, hydrated on the LIST read only. See `parentKey`. |
| `aliasOfId` | `string \| null` | yes | Set when this term was MERGED into another: it survives as an alias pointing at the canonical term, its records moved onto that term. Null for a normal term. |
| `aliasOfKey` | `string \| null` | yes | Canonical term's key, hydrated on the LIST read only. |
| `aliasOfLabel` | `string \| null` | yes | Canonical term's label, hydrated on the LIST read only. |
| `version` | `integer` | yes | The term's optimistic lock. Send it back on `PATCH /v1/terms/{id}` and `POST /v1/terms/{id}/merge`; a write that changed the term since answers 409 `VERSION_CONFLICT`. Bumped by every author write to the label, status, parent or alias — never by ingest matching the term. |
| `status` | `"active" \| "candidate" \| "archived"` | yes | `active` when the term is part of the facet's vocabulary; `candidate` when ingest minted it onto the record that proposed it but it is NOT yet in the vocabulary (patch it to `active` to admit it); `archived` when withdrawn from use without being deleted. |
| `createdBy` | `"llm" \| "operator" \| "user"` | yes | Who introduced the term: an operator, an end user, or the model during ingest. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `assignmentCount` | `integer` | no | `expand=usage` — records assigned this term, live and archived. Absent unless asked for. |
| `childCount` | `integer` | no | `expand=usage` — terms directly beneath this one. Absent unless asked for. |
| `aliasedByCount` | `integer` | no | `expand=usage` — terms merged INTO this one, i.e. aliases pointing here. Absent unless asked for. |
| `deleteRefusal` | `object \| null` | no | `expand=usage` — why `DELETE /v1/terms/{id}` would refuse this term right now, decided by the same check the delete runs; null when it would be accepted — though the delete also needs the ADMIN role and a project that is not retired. Absent unless asked for — absent is NOT deletable. A reference landing between this read and the delete still refuses it, as `TERM_DELETE_RACE`. |

Each item of `findings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"dangling-alias" \| "orphan-parent" \| "unattached" \| "duplicate"` | yes | `dangling-alias` — a merged term whose canonical term this project does not hold, so it redirects to nothing. `orphan-parent` — a term whose `parentId` names a term this project does not hold. `unattached` — a term on a facet that nests under another, standing under no parent (no design write can produce it). `duplicate` — canonical terms of one facet and one parent whose labels slugify to the same value, the platform's own label identity. |
| `facetKey` | `string` | yes | Key of the facet the named terms belong to. |
| `termIds` | `string[]` | yes | The terms this finding names. A `duplicate` finding is ONE colliding group — every id in it slugifies alike — so a facet with two colliding pairs sends two findings. Every other kind is one finding per facet. |

### `PATCH /v1/terms/{id}`

Rename a term (`label`, which re-embeds it for search), archive it (`status: archived`), or restore or admit it (`status: active`) — both in one call is one write. Requires the `version` you last read; a stale one answers 409 `VERSION_CONFLICT`. Restoring a merged alias is refused (409). With `validateOnly: true` it answers whether the patch would be accepted, writing and embedding nothing. To fold one term into another use `POST /v1/terms/{id}/merge`; to remove an unused one, `DELETE /v1/terms/{id}`; to state a facet's whole vocabulary, its `terms` in `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The term's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | Rename the term. A rename re-embeds it for search; a status change alone does not. |
| `status` | `"active" \| "archived"` | no | Change the term's status. `active` both RESTORES an archived term and ADMITS a candidate one into the vocabulary; `archived` withdraws it. `candidate` is not settable — it is where minting puts a term, not a state you move one into. Does not touch the search vector. |
| `version` | `integer` | yes | The term's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the term changed since, so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored term and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `term` | `object` | yes | The term as it now stands. |
| `reembedWarning` | `string \| null` | yes | Non-null when the term was SAVED but its search vector could not be updated. The write succeeded — the row is authoritative — but search will find this term by its old wording until it is re-embedded. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `DELETE /v1/terms/{id}`

Delete one unused term. Refused (409) while records carry it, other terms nest under it, or merged aliases point at it — `GET /v1/terms?expand=usage` publishes that refusal per term as `deleteRefusal`. With `?validateOnly=true` it answers whether it would be, writing nothing. To withdraw a term records still carry, archive it with `PATCH /v1/terms/{id}`; to drop several from a facet, state its `terms` in `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The term's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `qdrantWarning` | `string \| null` | yes | Non-null when the term was DELETED but its search vector was left behind. The deletion stands and the leftover is harmless — nothing assigns it, because assignment checks the database first — but nothing collects it either. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `POST /v1/terms/{id}/merge`

Merge this term INTO `targetTermId`: it survives as an alias of the target, its text still resolving — to the target. Every record that carries this term carries the target instead, moved in the same write, so the alias is left with no assignments. Keep it while any record's source value, or any caller's `term=` filter, still spells its key: that text reaches the target only through the alias row, and once the alias is deleted it resolves to nothing. The target must be an active, canonical term of the same facet and parent. Requires this term's `version` as you last read it; a stale one answers 409 `VERSION_CONFLICT`. There is no undo. To rename instead use `PATCH /v1/terms/{id}`; to remove an unused term, `DELETE /v1/terms/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The term's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `targetTermId` | `string` | yes | The term to merge INTO — the one that survives. It must be active, canonical, and in the same facet, parent and project. |
| `version` | `integer` | yes | The MERGED (absorbed) term's `version` as you last read it. REQUIRED: the merge is refused with 409 `VERSION_CONFLICT` if that term changed since. The target's version is not checked and does not move. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `term` | `object` | yes | The absorbed term — it now points at the one it was merged into. |
| `reembedWarning` | `string \| null` | yes | Non-null when the merge was SAVED but the search vector was not updated. ⚠️ The absorbed term then keeps winning searches against the term that absorbed it, so the merge is invisible to search until a later write touches it. |
