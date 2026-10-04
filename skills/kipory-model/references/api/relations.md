<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Relation kinds and pairings

The vocabulary of typed record-to-record edges: a kind, and the (typeA, typeB) pairs it admits. A pairing has no update; re-target by deleting and recreating.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/relation-kind-pairings`](#get-v1-relation-kind-pairings) |  |
| `POST` | [`/v1/relation-kind-pairings`](#post-v1-relation-kind-pairings) |  |
| `GET` | [`/v1/relation-kind-pairings/{id}`](#get-v1-relation-kind-pairings-id) |  |
| `DELETE` | [`/v1/relation-kind-pairings/{id}`](#delete-v1-relation-kind-pairings-id) |  |
| `GET` | [`/v1/relation-kinds`](#get-v1-relation-kinds) |  |
| `POST` | [`/v1/relation-kinds`](#post-v1-relation-kinds) |  |
| `GET` | [`/v1/relation-kinds/{id}`](#get-v1-relation-kinds-id) |  |
| `PATCH` | [`/v1/relation-kinds/{id}`](#patch-v1-relation-kinds-id) |  |
| `DELETE` | [`/v1/relation-kinds/{id}`](#delete-v1-relation-kinds-id) |  |

### `GET /v1/relation-kind-pairings`

List a project's pairings — which record-type pairs each relation kind connects — optionally only those with `recordTypeKey` at either end. The same rows ride `GET /v1/bootstrap`; one kind's pairs, each with the verdict its delete would reach, ride `GET /v1/relation-kinds/{id}?expand=pairings`; the authored form is each kind's `pairings` in the `relations` section of `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose pairings to list. |
| `recordTypeKey` | `string` | no | Key of a record type: keep only pairings where it appears at EITHER end. Omit for all pairings in the project. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relationKindPairings` | `object[]` | yes | Which record-type pairs each relation kind may link. |

Each item of `relationKindPairings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `kindKey` | `string` | yes | Key of the relation kind this pairing applies to. |
| `fromRecordTypeKey` | `string` | yes | Key of the record type at the source end, for a directional kind. |
| `toRecordTypeKey` | `string` | yes | Key of the record type at the target end, for a directional kind. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/relation-kind-pairings`

Add one record-type pair to an existing relation kind. The kind and both record types must exist (else 422); a pair already standing is 409 `CONFLICT`; a `join-record` kind takes exactly one pair (409 `RELATION_JOIN_PAIRING_AMBIGUOUS`). With `validateOnly: true` it answers whether the pair would be added, writing nothing (200; an added pair is 201). A kind's first pairs are seeded by `POST /v1/relation-kinds` itself; there is no PATCH — re-target by deleting and adding. A kind's whole pair list at once: its `pairings` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the owning project. |
| `kindKey` | `string` | yes | Key of an existing relation kind in this project. |
| `fromRecordTypeKey` | `string` | yes | Key of an existing record type — the source end. |
| `toRecordTypeKey` | `string` | yes | Key of an existing record type — the target end. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
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

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `kindKey` | `string` | yes | Key of the relation kind this pairing applies to. |
| `fromRecordTypeKey` | `string` | yes | Key of the record type at the source end, for a directional kind. |
| `toRecordTypeKey` | `string` | yes | Key of the record type at the target end, for a directional kind. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/relation-kind-pairings/{id}`

Read one pairing by id. Every pairing of a project: `GET /v1/relation-kind-pairings?project=`; one kind's, with each pair's delete verdict: `GET /v1/relation-kinds/{id}?expand=pairings`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The pairing's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Row id — the address for a delete. |
| `project` | `string` | yes | Node id of the owning project. |
| `kindKey` | `string` | yes | Key of the relation kind this pairing applies to. |
| `fromRecordTypeKey` | `string` | yes | Key of the record type at the source end, for a directional kind. |
| `toRecordTypeKey` | `string` | yes | Key of the record type at the target end, for a directional kind. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/relation-kind-pairings/{id}`

Remove one pair from its relation kind; nothing cascades. Refused (409) while live links stand on the pair or it is the kind's last — delete the kind itself with `DELETE /v1/relation-kinds/{id}` — and (422 `RELATION_KIND_INVALID`) when a record type's declaration of the kind could not stand without it. A read of the kind publishes that verdict per pair as `deleteRefusal` (`GET /v1/relation-kinds/{id}?expand=pairings`); with `?validateOnly=true` this answers it now, writing nothing. A kind's whole pair list at once: its `pairings` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The pairing's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `GET /v1/relation-kinds/{id}?expand=pairings`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
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

### `GET /v1/relation-kinds`

List a project's relation kinds — the named links its records can carry between record types — each with the `version` its PATCH takes. `expand` adds `relationCount`, `liveRelationCount`, `pairings` (without per-pair delete verdicts) and `readiness`. The same rows ride `GET /v1/bootstrap` (by id, live); the authored form, pairings included, is the `relations` section of `GET /v1/projects/{nodeId}/document` (by key). The edges themselves: `GET /v1/records/{id}/relations/{kind}` and `GET /v1/projects/{nodeId}/relations`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose relation kinds to list. Required. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: relationCount, liveRelationCount, pairings, readiness. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `relationKinds` | `object[]` | yes | The project's relation kinds, unpaginated. |

Each item of `relationKinds`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The kind's key, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(fromRecordTypeKey, toRecordTypeKey)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "join-record" \| "curated"` | yes | How edges of this kind come into existence — derived from a field (`field`), carried by a join record (`join-record`), or stated by hand (`curated`). |
| `cardinality` | `"many-to-one" \| "many-to-many"` | yes | How many edges of this kind one record may have — `many-to-one` or `many-to-many`. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `join-record` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `edgeFilters` | `object \| null` | yes | Which element properties edges of this kind can be filtered on, and the edge column each is stamped into — derived from the declaring record types' link uses (`element.filters`), read-only here. Null when no type declares a filter on this kind. |
| `edgeRestampPending` | `boolean` | yes | True while live edges are being restamped after `edgeFilters` changed. Reads resolve `where`/`count` clauses against `stampedEdgeFilters` until it clears. |
| `stampedEdgeFilters` | `object \| null` | yes | The map the edge rows are currently stamped for. Equals `edgeFilters` once a restamp has converged; the one clauses are resolved against meanwhile. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present when you pass `expand=relationCount` — and on the create's echo, and on an update's echo that passes no `expand`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present when you pass `expand=pairings` — and always on the create's echo. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. Each pair carries its id, and — on a read of one kind — `deleteRefusal`. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |

### `POST /v1/relation-kinds`

Create one relation kind together with its first record-type `pairings` and, optionally, the producing `declaration` (or a generated field), in one transaction. With `validateOnly: true` it answers whether the kind would be created and the `readiness` it would be born in, writing nothing (200; a created kind is 201). More pairs later: `POST /v1/relation-kind-pairings`. Several kinds at once: the `relations` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will own the kind. |
| `key` | `string` | yes | The kind's key, unique within the project. Permanent once created — pairings link to it by key. Lowercase letters and digits in words joined by single dashes, like `rock-pool`, up to 64 characters. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. Required and non-empty — `null` or a blank string is refused, in a project document's `relations` too. |
| `minConfidence` | `number \| null` | no | Reserved; has no effect today. |
| `direction` | `"directed" \| "symmetric"` | no | Whether the two ends mean different things. Choose deliberately — it decides whether `(fromRecordTypeKey, toRecordTypeKey)` order is meaningful. |
| `producer` | `"field" \| "join-record" \| "curated"` | yes | How edges of this kind come into existence: `field`, `join-record` or `curated`. Required, with no default, because each producer validates the rest of the kind differently. It cannot change once the kind exists. |
| `cardinality` | `"many-to-one" \| "many-to-many"` | no | How many edges of this kind one record may have: `many-to-one` or `many-to-many`. Leave unset for a curated kind, where it does not apply. |
| `propertiesEntryId` | `string \| null` | no | Schema entry describing properties edges may carry. Omit for edges with none. |
| `sortOrder` | `integer` | no | Position among the project's relation kinds. |
| `pairings` | `object[]` | yes | Record-type pairs to apply the kind to, created in the same transaction, each `{ fromRecordTypeKey, toRecordTypeKey }` naming record types by key — e.g. `[{ "fromRecordTypeKey": "recipe", "toRecordTypeKey": "ingredient" }]`. At least one is required — a kind that applies to no pair can connect nothing. Every type named must already exist. |
| `declaration` | `object` | no | The producer's own declaration, spliced into `recordType.relations` in the same transaction as the kind. Omit to declare it later. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the write WOULD have computed. Present whenever the body was coherent enough to derive it, which is not the same as `ok` — a draft with a warning still derives. |

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
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The kind's key, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(fromRecordTypeKey, toRecordTypeKey)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "join-record" \| "curated"` | yes | How edges of this kind come into existence — derived from a field (`field`), carried by a join record (`join-record`), or stated by hand (`curated`). |
| `cardinality` | `"many-to-one" \| "many-to-many"` | yes | How many edges of this kind one record may have — `many-to-one` or `many-to-many`. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `join-record` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `edgeFilters` | `object \| null` | yes | Which element properties edges of this kind can be filtered on, and the edge column each is stamped into — derived from the declaring record types' link uses (`element.filters`), read-only here. Null when no type declares a filter on this kind. |
| `edgeRestampPending` | `boolean` | yes | True while live edges are being restamped after `edgeFilters` changed. Reads resolve `where`/`count` clauses against `stampedEdgeFilters` until it clears. |
| `stampedEdgeFilters` | `object \| null` | yes | The map the edge rows are currently stamped for. Equals `edgeFilters` once a restamp has converged; the one clauses are resolved against meanwhile. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present when you pass `expand=relationCount` — and on the create's echo, and on an update's echo that passes no `expand`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present when you pass `expand=pairings` — and always on the create's echo. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. Each pair carries its id, and — on a read of one kind — `deleteRefusal`. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `pairings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fromRecordTypeKey` | `string` | yes | Key of the record type an edge starts at. On a `symmetric` kind the order carries no meaning and the endpoints are sorted for you. |
| `toRecordTypeKey` | `string` | yes | Key of the record type an edge ends at. |
| `id` | `string` | yes | The pairing's own id — what `DELETE /v1/relation-kind-pairings/{id}` takes. |
| `deleteRefusal` | `object \| null` | no | Why removing this pair would be refused right now, in the words the delete would use; `null` when nothing about the pair stands in the way — the delete also needs the ADMIN role and a project that is not retired. Present on a read of one kind — `GET /v1/relation-kinds/{id}?expand=pairings`, the create's echo, and an update's echo when it passes `expand=pairings`; absent on the list, which would have to count every live link in the project to say it. The live links are counted when you read, so a link written afterwards can still make the delete refuse — with this same sentence. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `record-types`, `schema-entries`, `relation-kinds`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

### `GET /v1/relation-kinds/{id}`

Read one relation kind by id, with the `version` its PATCH takes. `expand=pairings` here carries each pair's `deleteRefusal` — the answer `DELETE /v1/relation-kind-pairings/{id}` would give; `expand` also adds `relationCount`, `liveRelationCount` and the full `readiness`. Every kind of a project: `GET /v1/relation-kinds?project=` or `GET /v1/bootstrap`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The relation kind's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: relationCount, liveRelationCount, pairings, readiness. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The kind's key, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(fromRecordTypeKey, toRecordTypeKey)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "join-record" \| "curated"` | yes | How edges of this kind come into existence — derived from a field (`field`), carried by a join record (`join-record`), or stated by hand (`curated`). |
| `cardinality` | `"many-to-one" \| "many-to-many"` | yes | How many edges of this kind one record may have — `many-to-one` or `many-to-many`. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `join-record` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `edgeFilters` | `object \| null` | yes | Which element properties edges of this kind can be filtered on, and the edge column each is stamped into — derived from the declaring record types' link uses (`element.filters`), read-only here. Null when no type declares a filter on this kind. |
| `edgeRestampPending` | `boolean` | yes | True while live edges are being restamped after `edgeFilters` changed. Reads resolve `where`/`count` clauses against `stampedEdgeFilters` until it clears. |
| `stampedEdgeFilters` | `object \| null` | yes | The map the edge rows are currently stamped for. Equals `edgeFilters` once a restamp has converged; the one clauses are resolved against meanwhile. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present when you pass `expand=relationCount` — and on the create's echo, and on an update's echo that passes no `expand`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present when you pass `expand=pairings` — and always on the create's echo. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. Each pair carries its id, and — on a read of one kind — `deleteRefusal`. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |

Each item of `pairings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fromRecordTypeKey` | `string` | yes | Key of the record type an edge starts at. On a `symmetric` kind the order carries no meaning and the endpoints are sorted for you. |
| `toRecordTypeKey` | `string` | yes | Key of the record type an edge ends at. |
| `id` | `string` | yes | The pairing's own id — what `DELETE /v1/relation-kind-pairings/{id}` takes. |
| `deleteRefusal` | `object \| null` | no | Why removing this pair would be refused right now, in the words the delete would use; `null` when nothing about the pair stands in the way — the delete also needs the ADMIN role and a project that is not retired. Present on a read of one kind — `GET /v1/relation-kinds/{id}?expand=pairings`, the create's echo, and an update's echo when it passes `expand=pairings`; absent on the list, which would have to count every live link in the project to say it. The live links are counted when you read, so a link written afterwards can still make the delete refuse — with this same sentence. |

### `PATCH /v1/relation-kinds/{id}`

Change one relation kind's own attributes — label, description, direction, cardinality, properties entry, sort order; `key` and `producer` are permanent. Requires the `version` you last read; a stale one answers 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be accepted — the link rules over every declaration of the kind included — writing nothing. The kind's pairs are added and removed through `/v1/relation-kind-pairings`, its producing declaration through the record type. Several kinds at once, pairings included: the `relations` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The relation kind's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: relationCount, liveRelationCount, pairings, readiness. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New name. Omit to leave it alone. |
| `description` | `string` | no | New description. Omit to leave it alone. |
| `minConfidence` | `number \| null` | no | Reserved; has no effect today. |
| `direction` | `"directed" \| "symmetric"` | no | Change whether the two ends mean different things. Existing edges are not rewritten, so switching this re-interprets data that is already stored. |
| `producer` | `"field" \| "join-record" \| "curated"` | no | How edges of this kind come into existence. Permanent: sending a different one is refused (409 `RELATION_PRODUCER_IMMUTABLE`). |
| `cardinality` | `"many-to-one" \| "many-to-many"` | no | Change how many edges one record may have. Existing edges that now exceed it are not removed. |
| `propertiesEntryId` | `string \| null` | no | Point at a different schema entry for edge properties, or null for none. |
| `sortOrder` | `integer` | no | Change the position. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the relation kind — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The kind's key, unique within the project. Permanent — pairings are linked to it by key, so it cannot be renamed. |
| `label` | `string` | yes | Human-readable name. |
| `description` | `string` | yes | What this relationship means. |
| `minConfidence` | `number \| null` | yes | Reserved. Nothing currently produces a confidence score, so this has no effect today. |
| `direction` | `"directed" \| "symmetric"` | yes | Whether an edge's two ends mean different things. `directed` keeps `(fromRecordTypeKey, toRecordTypeKey)` as an ordered pair; `symmetric` treats them as interchangeable — store a pairing in whichever order you like and reads accept either, and edges of the kind are stored in one canonical order so a pair is never recorded twice. |
| `producer` | `"field" \| "join-record" \| "curated"` | yes | How edges of this kind come into existence — derived from a field (`field`), carried by a join record (`join-record`), or stated by hand (`curated`). |
| `cardinality` | `"many-to-one" \| "many-to-many"` | yes | How many edges of this kind one record may have — `many-to-one` or `many-to-many`. Null when it was never declared, and always null for a curated kind. |
| `propertiesEntryId` | `string \| null` | yes | Schema entry describing the properties an edge of this kind may carry, or null when edges carry none. On a `join-record` kind it validates nothing — a join edge carries the join record's own data whatever this says — and only permits ordering a traversal by a property. |
| `sortOrder` | `integer` | yes | Position among the project's relation kinds, ascending. |
| `edgeFilters` | `object \| null` | yes | Which element properties edges of this kind can be filtered on, and the edge column each is stamped into — derived from the declaring record types' link uses (`element.filters`), read-only here. Null when no type declares a filter on this kind. |
| `edgeRestampPending` | `boolean` | yes | True while live edges are being restamped after `edgeFilters` changed. Reads resolve `where`/`count` clauses against `stampedEdgeFilters` until it clears. |
| `stampedEdgeFilters` | `object \| null` | yes | The map the edge rows are currently stamped for. Equals `edgeFilters` once a restamp has converged; the one clauses are resolved against meanwhile. |
| `version` | `integer` | yes | Increments on every write. Send it back on a PATCH to be refused with 409 if someone edited the kind in the meantime. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `relationCount` | `integer` | no | How many edges of this kind exist, present when you pass `expand=relationCount` — and on the create's echo, and on an update's echo that passes no `expand`. Deleting the kind deletes all of them, so this is the blast radius. |
| `liveRelationCount` | `integer` | no | How many edges of this kind are currently valid, present only when you pass `expand=liveRelationCount`. NOT `relationCount`, which also counts retracted edges — retraction is by expiry, not deletion, so the two diverge as a producer rewrites its edges. This is the number that matches what a read of the edges returns. |
| `pairings` | `object[]` | no | Which record-type pairs this kind connects, present when you pass `expand=pairings` — and always on the create's echo. Never empty — a kind must apply to at least one pair, and the last one cannot be removed. Each pair carries its id, and — on a read of one kind — `deleteRefusal`. |
| `readiness` | `object` | no | Whether this kind is doing anything and why not, present only when you pass `expand=readiness`. `blocked` cannot produce an edge; `inert` is wired to nothing; `unproven` is wired and has produced nothing; `ready` is carrying edges. NOT derivable from the counts — an unpaired kind and a kind declared a minute ago both report zero. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `pairings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `fromRecordTypeKey` | `string` | yes | Key of the record type an edge starts at. On a `symmetric` kind the order carries no meaning and the endpoints are sorted for you. |
| `toRecordTypeKey` | `string` | yes | Key of the record type an edge ends at. |
| `id` | `string` | yes | The pairing's own id — what `DELETE /v1/relation-kind-pairings/{id}` takes. |
| `deleteRefusal` | `object \| null` | no | Why removing this pair would be refused right now, in the words the delete would use; `null` when nothing about the pair stands in the way — the delete also needs the ADMIN role and a project that is not retired. Present on a read of one kind — `GET /v1/relation-kinds/{id}?expand=pairings`, the create's echo, and an update's echo when it passes `expand=pairings`; absent on the list, which would have to count every live link in the project to say it. The live links are counted when you read, so a link written afterwards can still make the delete refuse — with this same sentence. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

### `DELETE /v1/relation-kinds/{id}`

Delete one relation kind, and with it every edge of the kind — curated ones included — and all its pairings; declarations naming it are cleared from the record types. It is never refused, so read what it takes first: with `?validateOnly=true` it rehearses the delete and answers the verdict with `consequences` (the edges it would take), writing nothing. To stop one pair instead: `DELETE /v1/relation-kind-pairings/{id}`. Several kinds at once: the `relations` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The relation kind's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `GET /v1/relation-kinds/{id}?expand=relationCount`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedCounts` | `object` | yes | What the deletion took with it. Deleting a kind cascades — read this before, not after. |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, edges a delete takes along, …). Absent when the dry run did not rehearse. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Deliberately an open string — a newer server may report a rule this build has never heard of, so treat an unrecognised code as a generic finding of its stated severity rather than as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note about something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way) and is not a finding about your body at all. GATE ON THIS, never on `code` — a rule added tomorrow arrives with a code you do not know and a severity you do. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field` — a form that falls back to highlighting something has invented a claim. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "edge-restamp" \| "edges-deleted" \| "reembed"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `edge-restamp`: stored edges are re-stamped. `edges-deleted`: deleting a relation kind deletes every stored edge of it, retracted ones included. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this type's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. |
| `rows` | `integer` | yes | How many stored rows are affected, measured in the planning transaction. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |
