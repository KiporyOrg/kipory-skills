<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Flow checkpoints

A point-in-time snapshot of one flow's actions, by value, immutable. Reads carry metadata only; to see what a rollback would change, send the restore with `validateOnly: true` (ADMIN, like the restore) — it rehearses the restore and answers `derived.restore`.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flow-checkpoints`](#get-v1-flow-checkpoints) |  |
| `POST` | [`/v1/flow-checkpoints`](#post-v1-flow-checkpoints) |  |
| `GET` | [`/v1/flow-checkpoints/{id}`](#get-v1-flow-checkpoints-id) |  |
| `PATCH` | [`/v1/flow-checkpoints/{id}`](#patch-v1-flow-checkpoints-id) |  |
| `DELETE` | [`/v1/flow-checkpoints/{id}`](#delete-v1-flow-checkpoints-id) |  |
| `POST` | [`/v1/flow-checkpoints/{id}/restore`](#post-v1-flow-checkpoints-id-restore) |  |

### `GET /v1/flow-checkpoints`

List one flow's checkpoints (`?flowId=`), newest first, automatic ones included — metadata only, never the captured actions. A checkpoint is a saved version of ONE flow's actions and signature that you can restore (`POST /v1/flow-checkpoints/{id}/restore`). It is not the project's history: `GET /v1/projects/{nodeId}/history` is the audit of every design write, and the project document (`GET /v1/projects/{nodeId}/document`) is the whole project as authorable configuration.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow whose checkpoints to list. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `checkpoints` | `object[]` | yes | The flow's checkpoints, automatic snapshots included, unpaginated. |

Each item of `checkpoints`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flowId` | `string` | yes | Id of the flow this checkpoint was taken from. |
| `label` | `string` | yes | The checkpoint's display text. An automatic snapshot's reads `auto: …` followed by why it was taken. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `version` | `integer` | yes | The checkpoint's optimistic-lock version. Send it back as `version` on `PATCH /v1/flow-checkpoints/{id}`; a rename or a note change bumps it. |
| `actionCount` | `integer` | yes | How many actions the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those actions were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `POST /v1/flow-checkpoints`

Save a flow's actions and signature as they are now, under a label — a checkpoint you can restore later (`POST /v1/flow-checkpoints/{id}/restore`). Take one before a risky edit; a restore takes one of its own automatically first. With `validateOnly: true` it answers whether the save would be refused (a blank label), writing nothing. The audit of every design write is `GET /v1/projects/{nodeId}/history`; the whole project as authorable configuration is `GET /v1/projects/{nodeId}/document`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow to capture. |
| `label` | `string` | yes | Display text for the checkpoint. Trimmed; blank is refused. |
| `description` | `string \| null` | no | An optional note on why you are taking it. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flowId` | `string` | yes | Id of the flow this checkpoint was taken from. |
| `label` | `string` | yes | The checkpoint's display text. An automatic snapshot's reads `auto: …` followed by why it was taken. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `version` | `integer` | yes | The checkpoint's optimistic-lock version. Send it back as `version` on `PATCH /v1/flow-checkpoints/{id}`; a rename or a note change bumps it. |
| `actionCount` | `integer` | yes | How many actions the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those actions were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `GET /v1/flow-checkpoints/{id}`

Read one checkpoint's metadata — its label, note, who took it, how many actions it captured, and its `version` (the lock its PATCH requires). What restoring it would change: `POST /v1/flow-checkpoints/{id}/restore` with `validateOnly: true`. A flow's checkpoints: `GET /v1/flow-checkpoints?flowId=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flowId` | `string` | yes | Id of the flow this checkpoint was taken from. |
| `label` | `string` | yes | The checkpoint's display text. An automatic snapshot's reads `auto: …` followed by why it was taken. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `version` | `integer` | yes | The checkpoint's optimistic-lock version. Send it back as `version` on `PATCH /v1/flow-checkpoints/{id}`; a rename or a note change bumps it. |
| `actionCount` | `integer` | yes | How many actions the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those actions were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

### `PATCH /v1/flow-checkpoints/{id}`

Rename a checkpoint or change its note; what it captured never changes — to capture the flow as it is now, take a new one with `POST /v1/flow-checkpoints`. Requires the checkpoint's `version`; a stale one is 409 `VERSION_CONFLICT`. With `validateOnly: true` it answers whether the patch would be refused (a blank label), writing nothing.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New display text for the checkpoint. Its captured contents never change. |
| `description` | `string \| null` | no | Change the note, or pass null to clear it. |
| `version` | `integer` | yes | The checkpoint's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the checkpoint changed since, so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored checkpoint and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `id`, `flowId`, `label`, `description`, `version`, `actionCount`, `enabledCount`, `isAutoSnapshot`, `createdById`, `createdByEmail`, `createdByName`, `createdByImage`, `createdAt`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Checkpoint id — the address for read, patch, delete, restore. |
| `flowId` | `string` | yes | Id of the flow this checkpoint was taken from. |
| `label` | `string` | yes | The checkpoint's display text. An automatic snapshot's reads `auto: …` followed by why it was taken. |
| `description` | `string \| null` | yes | Your note about why it was taken, or null. |
| `version` | `integer` | yes | The checkpoint's optimistic-lock version. Send it back as `version` on `PATCH /v1/flow-checkpoints/{id}`; a rename or a note change bumps it. |
| `actionCount` | `integer` | yes | How many actions the checkpoint captured. |
| `enabledCount` | `integer` | yes | How many of those actions were enabled at capture time. A restore brings back the disabled ones too, still disabled. |
| `isAutoSnapshot` | `boolean` | yes | True when the platform took this automatically before a destructive operation, rather than you taking it deliberately. |
| `createdById` | `string \| null` | yes | Who took it — for the checkpoint a restore takes first, whoever restored. Null when nobody is recorded: a snapshot the platform took before a write to one of its own flows, a token, or a departed account. |
| `createdByEmail` | `string \| null` | yes | Their email as the account holds it now. Null whenever `createdById` is, for an account that has been deleted, and whenever the caller is an API key. |
| `createdByName` | `string \| null` | yes | Their display name as the account holds it now. Null when they never set one (or only spaces), and wherever `createdByEmail` is null. |
| `createdByImage` | `string \| null` | yes | Their avatar URL from the sign-in provider, or null when there is none, and wherever `createdByEmail` is null. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `DELETE /v1/flow-checkpoints/{id}`

Delete one checkpoint, automatic or not. Nothing refers to a checkpoint, so nothing refuses it — and nothing brings it back. With `?validateOnly=true` it answers whether the delete would go through, writing nothing. The flow itself is untouched; deleting the flow (`DELETE /v1/flows/{id}`) removes all of its checkpoints with it.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `deleted`, `id`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `POST /v1/flow-checkpoints/{id}/restore`

Restore a checkpoint: replace its flow's actions and signature with the captured ones, in one transaction. Requires the FLOW's `version` (the checkpoint itself is unchanged); a flow edited since is 409 `VERSION_CONFLICT`. The restore first takes an automatic checkpoint of the flow as it was — `autoCheckpointId` in the reply; restore that to undo. Refused (409) when the captured signature would break what is bound to the flow, and (422) when the restored actions have a blocking error; either way nothing changes. With `validateOnly: true` it rehearses the restore and rolls it back, answering the restore's own verdict plus `derived.restore` — both action lists, references that no longer resolve, and the signature changes. A checkpoint covers ONE flow: what changed across the project is `GET /v1/projects/{nodeId}/history` (a read, it restores nothing), and the whole project is authored through `POST /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The checkpoint's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The FLOW's `version` as you last read it (the flow row, `GET /v1/flows/{id}`) — the flow a restore overwrites; the checkpoint itself is unchanged. REQUIRED: the lock guards the flow row, so a flow whose own row changed since (its label, description or signature — a patch, another restore, a document apply) is refused with 409 `VERSION_CONFLICT`. ⚠️ An action edit does not move the flow's `version` (`PATCH /v1/actions/{id}` moves the action's own), so action edits made since you read the flow are REPLACED by the checkpoint's actions — they are not lost: the restore first takes an automatic checkpoint of the flow as it stands (`autoCheckpointId` in the response), and restoring that one brings them back. |
| `validateOnly` | `boolean` | no | Check this restore against the flow as it is now and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a flow `version` the flow has moved past — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `flowId`, `restoredActionCount`, `autoCheckpointId`, `outstandingIssues`, `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | Id of the flow whose actions were restored. |
| `restoredActionCount` | `integer` | yes | How many actions the flow now has — the checkpoint's count. |
| `autoCheckpointId` | `string` | yes | A checkpoint taken of the PREVIOUS state, automatically, just before this restore. Restore it to undo what you just did. |
| `outstandingIssues` | `object[]` | yes | Problems found on re-validating the restored flow. These did NOT block the restore — the actions are back either way, and these are what to fix next. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `outstandingIssues`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable code identifying the kind of problem. |
| `message` | `string` | yes | What is wrong, in prose. |
| `severity` | `"error" \| "warning"` | yes | `error` blocks the save — there is NO override, and no field on this body grants one; `warning` does not block. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Shape 2, with `ok`, `diagnostics`, `complete`, `derived`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |
| `derived` | `object` | yes | What the restore WOULD do, answered whether or not it is refused — a refused restore still shows what it would have changed. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `leavesBehind`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the action this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on action; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "links-removed" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected" \| "recompute" \| "reference-policy"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `links-removed`: a dropped or re-pointed producer leaves stored links no declaration stands behind, and the link backfill removes them; `rows` counts the records whose processing (`reprocessOn` on a leave) read those links. Their computed values are recomputed, but their processing is not run again: reprocess one on purpose with `POST /v1/records/{id}/reprocess`. `records-invalid`: stored records would no longer validate against the changed shape. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow or an API read leaves those fields out of those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. `recompute`: Kipory computes the table's computed fields for its stored records, in the background and at no charge. `reference-policy`: the change moves what deleting a record does to the stored records naming it — a stated `onTargetDelete`, or the default it falls back to when the field becomes required, becomes the table's key or the reference becomes `scope: lifecycle`; `rows` counts the records naming such a record directly today, and the message says what the delete did and now does, and the most one record has. Records a `delete` takes in turn by their own rules are not counted. It also appears when a reference stops saying `unresolved: allow`, so a write naming a record that does not exist is refused; `rows` is what the last reference sweep counted as naming no record. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |
