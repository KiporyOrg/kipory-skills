<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Flow test cases

Stored inputs and assertions replayed through the preview engine. `POST /v1/flows/{id}/test` runs them and answers with the results.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flow-test-cases`](#get-v1-flow-test-cases) |  |
| `POST` | [`/v1/flow-test-cases`](#post-v1-flow-test-cases) |  |
| `GET` | [`/v1/flow-test-cases/{id}`](#get-v1-flow-test-cases-id) |  |
| `PATCH` | [`/v1/flow-test-cases/{id}`](#patch-v1-flow-test-cases-id) |  |
| `DELETE` | [`/v1/flow-test-cases/{id}`](#delete-v1-flow-test-cases-id) |  |
| `POST` | [`/v1/flows/{id}/test`](#post-v1-flows-id-test) |  |

### `GET /v1/flow-test-cases`

List one flow's test cases (`?flowId=`) — each an input bag and the assertions that must hold after the run, pass or fail. Run them with `POST /v1/flows/{id}/test`. Test cases check that a flow does what it must; eval cases (`/v1/eval-cases`) are scored against expectations by scorer flows in an asynchronous suite run. A flow's cases also ride its section of `GET /v1/projects/{nodeId}/document` as `tests`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow whose test cases to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `testCases` | `object[]` | yes | The flow's test cases, disabled ones included, unpaginated. |

### `POST /v1/flow-test-cases`

Add a test case to a flow: the inputs to run it with and the assertions that must hold afterwards (a jsonata assertion is checked at save, so one the runner would refuse never saves). Its key is yours to choose, unique in the flow. With `validateOnly: true` it answers whether the create would be refused (a taken key, an unsafe assertion), writing nothing. Run the cases with `POST /v1/flows/{id}/test`. A scored case with expectations and labels is an eval case (`POST /v1/eval-cases`). Several at once: a flow's `tests` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose — unique in its flow and what the project document names it by. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `label` | `string` | yes | A display label for the case. |
| `description` | `string \| null` | no | An optional note on what this case checks. |
| `inputs` | `object` | no | The inputs to replay, keyed by input-slot name. Defaults to empty. |
| `assertions` | `object[]` | yes | What must hold after the run. |
| `enabled` | `boolean` | no | Whether plain suite runs include it. Defaults to enabled. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Test-case id — the address for read, patch, delete. |
| `flowId` | `string` | yes | Id of the flow this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose — unique in its flow and what the project document names it by. |
| `label` | `string` | yes | The case's display label. |
| `description` | `string \| null` | yes | What this case is checking, or null. |
| `inputs` | `object` | yes | The inputs replayed into the flow, keyed by input-slot name — the same payload a preview takes. |
| `assertions` | `object[]` | yes | What must hold after the run. These constrain SHAPE and STRUCTURE, never generated wording — a flow ending in a model produces different words each run, so there is deliberately no content-equality check. |
| `enabled` | `boolean` | yes | Whether a plain suite run includes this case. Disabling parks a known-broken case without deleting it; naming its id explicitly runs it anyway. |
| `createdById` | `string \| null` | yes | Who wrote this case. Null when it was written by a token, or when that account is gone. |
| `createdByEmail` | `string \| null` | yes | The author's email, stored for display. A copy taken when the case was written, so it does not follow a later address change. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/flow-test-cases/{id}`

Read one flow test case — its inputs, assertions, whether plain suite runs include it, and its `version` (the lock its PATCH requires). Every case of a flow: `GET /v1/flow-test-cases?flowId=`. Run them: `POST /v1/flows/{id}/test`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The test case's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Test-case id — the address for read, patch, delete. |
| `flowId` | `string` | yes | Id of the flow this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose — unique in its flow and what the project document names it by. |
| `label` | `string` | yes | The case's display label. |
| `description` | `string \| null` | yes | What this case is checking, or null. |
| `inputs` | `object` | yes | The inputs replayed into the flow, keyed by input-slot name — the same payload a preview takes. |
| `assertions` | `object[]` | yes | What must hold after the run. These constrain SHAPE and STRUCTURE, never generated wording — a flow ending in a model produces different words each run, so there is deliberately no content-equality check. |
| `enabled` | `boolean` | yes | Whether a plain suite run includes this case. Disabling parks a known-broken case without deleting it; naming its id explicitly runs it anyway. |
| `createdById` | `string \| null` | yes | Who wrote this case. Null when it was written by a token, or when that account is gone. |
| `createdByEmail` | `string \| null` | yes | The author's email, stored for display. A copy taken when the case was written, so it does not follow a later address change. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/flow-test-cases/{id}`

Change a test case's key, label, note, inputs or assertions (inputs and assertions are replaced whole), or park it with `enabled: false`. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused, writing nothing. Several at once: a flow's `tests` in `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The test case's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | no | The case's new key. Omit to leave it alone. Letters, digits, dots, dashes and underscores only, starting with a letter or digit; it is used as an address, so it may not contain slashes, spaces or braces, up to 64 characters. |
| `label` | `string` | no | New display label. Omit to leave it alone. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |
| `inputs` | `object` | no | REPLACES the inputs wholesale rather than merging into them. |
| `assertions` | `object[]` | no | REPLACES the assertion list wholesale. |
| `enabled` | `boolean` | no | Park the case, or bring it back into plain suite runs. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `validateOnly` | `boolean` | no | Check this patch against the stored test case and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING `/validate`: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Test-case id — the address for read, patch, delete. |
| `flowId` | `string` | yes | Id of the flow this case belongs to. |
| `key` | `string` | yes | The case's key, which you choose — unique in its flow and what the project document names it by. |
| `label` | `string` | yes | The case's display label. |
| `description` | `string \| null` | yes | What this case is checking, or null. |
| `inputs` | `object` | yes | The inputs replayed into the flow, keyed by input-slot name — the same payload a preview takes. |
| `assertions` | `object[]` | yes | What must hold after the run. These constrain SHAPE and STRUCTURE, never generated wording — a flow ending in a model produces different words each run, so there is deliberately no content-equality check. |
| `enabled` | `boolean` | yes | Whether a plain suite run includes this case. Disabling parks a known-broken case without deleting it; naming its id explicitly runs it anyway. |
| `createdById` | `string \| null` | yes | Who wrote this case. Null when it was written by a token, or when that account is gone. |
| `createdByEmail` | `string \| null` | yes | The author's email, stored for display. A copy taken when the case was written, so it does not follow a later address change. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `DELETE /v1/flow-test-cases/{id}`

Delete one test case. Nothing refers to a case, so nothing refuses it; its flow's delete takes every case with it. With `?validateOnly=true` it answers whether the delete would go through, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The test case's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did, because telling you your draft is wrong when nothing read it is the one answer a dry run must not give. ⛔ A FLAG ON THE REAL ROUTE, NOT A SIBLING ROUTE: one route means one set of rules, so a check that passes and a save that refuses cannot come apart. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE. Some rules are database constraints the write learns about by attempting them — uniqueness above all — so this answers only that nothing refuses this body as of now, which another write landing first can change. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

### `POST /v1/flows/{id}/test`

Run the flow's stored test cases (`/v1/flow-test-cases`) through the preview engine and answer each case's pass or fail, with the assertion that failed. Deterministic assertions, answered in the response, spending what the previews spend. Test cases check a flow does what it must; an eval suite (`/v1/eval-suites`, cases at `/v1/eval-cases`) SCORES outputs against expectations with scorer flows, runs asynchronously (`POST /v1/eval-suites/{id}/run`) and keeps the scores. One ad-hoc run: `POST /v1/flows/{id}/preview`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `testCaseIds` | `string[]` | no | Which cases to run, up to 100. NAMING IDS RUNS THEM EVEN IF THEY ARE DISABLED. Omit to run every enabled case on the flow. |
| `includeDisabled` | `boolean` | no | Include disabled cases in an unnamed run. Ignored when you name ids — those run regardless. |
| `project` | `string` | no | Run every case against this project's config, records and facets (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Required for a platform flow, which belongs to no project; the platform pays for its cases. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow that was tested. |
| `results` | `object[]` | yes | One result per requested case. EVERY requested case appears, including ones the budget cut short — nothing is silently dropped. |
| `passed` | `integer` | yes | How many cases passed. |
| `failed` | `integer` | yes | How many ran and failed. |
| `invalid` | `integer` | yes | How many could not run because their inputs no longer match the flow. Worth reading as failures: the suite is not covering what it claims. |
| `notRun` | `integer` | yes | How many the run budget cut. Non-zero means this was a PARTIAL run, so `passed` is not a statement about the whole suite. |
| `totalTokensIn` | `number` | yes | Tokens consumed across the run. |
| `totalTokensOut` | `number` | yes | Tokens produced across the run. |
| `latencyMs` | `number` | yes | How long the whole run took. |
