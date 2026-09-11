<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8a31334ff890 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | Id of the flow whose test cases to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `testCases` | `object[]` | yes | The flow's test cases, disabled ones included, unpaginated. |

### `POST /v1/flow-test-cases`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | The flow this case belongs to. |
| `name` | `string` | yes | A name for the case. |
| `description` | `string \| null` | no | An optional note on what this case checks. |
| `inputs` | `object` | no | The inputs to replay, keyed by input-slot name. Defaults to empty. |
| `assertions` | `object[]` | yes | What must hold after the run. |
| `enabled` | `boolean` | no | Whether plain suite runs include it. Defaults to enabled. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Test-case id — the address for read, patch, delete. |
| `flow` | `string` | yes | The flow this case belongs to. |
| `name` | `string` | yes | The case's name. |
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

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The test case's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Test-case id — the address for read, patch, delete. |
| `flow` | `string` | yes | The flow this case belongs to. |
| `name` | `string` | yes | The case's name. |
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

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The test case's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | Rename the case. Omit to leave it alone. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |
| `inputs` | `object` | no | REPLACES the inputs wholesale rather than merging into them. |
| `assertions` | `object[]` | no | REPLACES the assertion list wholesale. |
| `enabled` | `boolean` | no | Park the case, or bring it back into plain suite runs. |
| `version` | `integer` | yes | The version you last read. REQUIRED: without it a concurrent edit is overwritten and both callers are told the write succeeded. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Test-case id — the address for read, patch, delete. |
| `flow` | `string` | yes | The flow this case belongs to. |
| `name` | `string` | yes | The case's name. |
| `description` | `string \| null` | yes | What this case is checking, or null. |
| `inputs` | `object` | yes | The inputs replayed into the flow, keyed by input-slot name — the same payload a preview takes. |
| `assertions` | `object[]` | yes | What must hold after the run. These constrain SHAPE and STRUCTURE, never generated wording — a flow ending in a model produces different words each run, so there is deliberately no content-equality check. |
| `enabled` | `boolean` | yes | Whether a plain suite run includes this case. Disabling parks a known-broken case without deleting it; naming its id explicitly runs it anyway. |
| `createdById` | `string \| null` | yes | Who wrote this case. Null when it was written by a token, or when that account is gone. |
| `createdByEmail` | `string \| null` | yes | The author's email, stored for display. A copy taken when the case was written, so it does not follow a later address change. |
| `version` | `integer` | yes | Optimistic-lock version; pass it back on the next write. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/flow-test-cases/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The test case's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `POST /v1/flows/{id}/test`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `testCaseIds` | `string[]` | no | Which cases to run, up to 100. NAMING IDS RUNS THEM EVEN IF THEY ARE DISABLED. Omit to run every enabled case on the flow. |
| `includeDisabled` | `boolean` | no | Include disabled cases in an unnamed run. Ignored when you name ids — those run regardless. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | The flow that was tested. |
| `results` | `object[]` | yes | One result per requested case. EVERY requested case appears, including ones the budget cut short — nothing is silently dropped. |
| `passed` | `integer` | yes | How many cases passed. |
| `failed` | `integer` | yes | How many ran and failed. |
| `invalid` | `integer` | yes | How many could not run because their inputs no longer match the flow. Worth reading as failures: the suite is not covering what it claims. |
| `notRun` | `integer` | yes | How many the run budget cut. Non-zero means this was a PARTIAL run, so `passed` is not a statement about the whole suite. |
| `totalTokensIn` | `number` | yes | Tokens consumed across the run. |
| `totalTokensOut` | `number` | yes | Tokens produced across the run. |
| `latencyMs` | `number` | yes | How long the whole run took. |
