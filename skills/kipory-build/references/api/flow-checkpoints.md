<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · version: 8f1c60e82a35 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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
| `createdById` | `string \| null` | yes | Who took it. Null for an automatic snapshot, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email, copied at capture time, so it does not follow a later address change. |
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
| `createdById` | `string \| null` | yes | Who took it. Null for an automatic snapshot, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email, copied at capture time, so it does not follow a later address change. |
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
| `createdById` | `string \| null` | yes | Who took it. Null for an automatic snapshot, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email, copied at capture time, so it does not follow a later address change. |
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
| `warnings` | `object[]` | yes | References in the checkpoint that no longer resolve. These NEVER block a restore — you get the steps back and fix them afterwards — so an empty list is the only thing that means a clean restore. |
