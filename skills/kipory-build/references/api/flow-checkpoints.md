<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Flow checkpoints

A point-in-time snapshot of one flow's steps, by value, immutable. Reads carry metadata only; the restore preview is the only way to see what a rollback would change.

Fields are listed one level deep with the text the API itself carries. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flow-checkpoints`](#get-v1-flow-checkpoints) |  |
| `POST` | [`/v1/flow-checkpoints`](#post-v1-flow-checkpoints) |  |
| `GET` | [`/v1/flow-checkpoints/{id}`](#get-v1-flow-checkpoints-id) |  |
| `PATCH` | [`/v1/flow-checkpoints/{id}`](#patch-v1-flow-checkpoints-id) |  |
| `DELETE` | [`/v1/flow-checkpoints/{id}`](#delete-v1-flow-checkpoints-id) |  |
| `POST` | [`/v1/flow-checkpoints/{id}/restore`](#post-v1-flow-checkpoints-id-restore) |  |
| `GET` | [`/v1/flow-checkpoints/{id}/restore-preview`](#get-v1-flow-checkpoints-id-restore-preview) |  |

### `GET /v1/flow-checkpoints`

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | Id of the flow whose checkpoints to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `checkpoints` | `object[]` | yes | The flow's checkpoints, automatic snapshots included, unpaginated. |

### `POST /v1/flow-checkpoints`

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | The flow to capture. |
| `name` | `string` | yes | A name for the checkpoint. Trimmed; blank is refused. |
| `description` | `string \| null` | no | An optional note on why you are taking it. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flow` | `string` | yes | The flow this checkpoint was taken from. |
| `name` | `string` | yes | The checkpoint's name. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `skillCount` | `integer` | yes | How many steps the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those steps were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key — a machine credential is shown no roster of humans. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/flow-checkpoints/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flow` | `string` | yes | The flow this checkpoint was taken from. |
| `name` | `string` | yes | The checkpoint's name. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `skillCount` | `integer` | yes | How many steps the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those steps were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key — a machine credential is shown no roster of humans. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/flow-checkpoints/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | no | Rename the checkpoint. Its captured contents never change. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flow` | `string` | yes | The flow this checkpoint was taken from. |
| `name` | `string` | yes | The checkpoint's name. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `skillCount` | `integer` | yes | How many steps the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those steps were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key — a machine credential is shown no roster of humans. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `DELETE /v1/flow-checkpoints/{id}`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

### `POST /v1/flow-checkpoints/{id}/restore`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flow` | `string` | yes | The flow whose steps were restored, so you can navigate to it. |
| `restoredSkillCount` | `integer` | yes | How many steps the flow now has — the checkpoint's count. |
| `autoCheckpointId` | `string` | yes | A checkpoint taken of the PREVIOUS state, automatically, just before this restore. Restore it to undo what you just did. |
| `outstandingIssues` | `object[]` | yes | Problems found on re-validating the restored flow. These did NOT block the restore — the steps are back either way, and these are what to fix next. |

### `GET /v1/flow-checkpoints/{id}/restore-preview`

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `checkpoint` | `object` | yes | Which checkpoint this preview is of. |
| `currentSkills` | `object[]` | yes | The flow's steps as they are NOW — the left side of the diff. |
| `payloadSkills` | `object[]` | yes | The steps the checkpoint holds — what restoring would leave you with. A restore REPLACES the current steps with these; it does not merge. |
| `warnings` | `object[]` | yes | References in the checkpoint that no longer resolve. These do not block a restore — you get the steps back and fix them afterwards — except `model-unsuited`, which the restore refuses and which is therefore also in `refusals`. Read `refusals` for what blocks. |
| `refusals` | `object[]` | yes | Every captured step a restore would refuse that the preview can see: run settings held to today's handlers, and a pinned model its call cannot use. ANY entry here means the restore fails with a 422 and changes nothing; an empty list says only that neither blocks it. |
| `signatureChanges` | `object` | yes | What a restore would change about the flow itself, beside its steps — the signature is put back exactly as captured, `null` (undeclared) included. |
