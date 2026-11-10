<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Flows

A flow is a named list of steps with its own typed signature. The flow write carries no diagnostics; ask `GET /v1/flows/{id}/health` or read with `expand=health`. Preview bills the payer and applies its writes unless `apply` is false.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/flows`](#get-v1-flows) |  |
| `POST` | [`/v1/flows`](#post-v1-flows) |  |
| `GET` | [`/v1/flows/{id}`](#get-v1-flows-id) |  |
| `PATCH` | [`/v1/flows/{id}`](#patch-v1-flows-id) |  |
| `DELETE` | [`/v1/flows/{id}`](#delete-v1-flows-id) |  |
| `GET` | [`/v1/flows/{id}/coverage`](#get-v1-flows-id-coverage) |  |
| `GET` | [`/v1/flows/{id}/health`](#get-v1-flows-id-health) |  |
| `GET` | [`/v1/flows/{id}/outline`](#get-v1-flows-id-outline) |  |
| `POST` | [`/v1/flows/{id}/preview`](#post-v1-flows-id-preview) |  |
| `POST` | [`/v1/flows/{id}/preview-runs`](#post-v1-flows-id-preview-runs) |  |
| `POST` | [`/v1/flows/{id}/preview/stream`](#post-v1-flows-id-preview-stream) |  |
| `GET` | [`/v1/flows/{id}/value-recording`](#get-v1-flows-id-value-recording) |  |
| `PATCH` | [`/v1/flows/{id}/value-recording`](#patch-v1-flows-id-value-recording) |  |

### `GET /v1/flows`

List one project's flows (`?project=<nodeId>`), or the platform's own with `?scope=system` (staff only). Each row carries its `version`, the lock `PATCH /v1/flows/{id}` requires, and `calls`/`calledBy`: the flows it calls and the flows that call it, one hop each way (flows that reach it through others are the bootstrap's `invokedBy`). `expand=health` folds each flow's validity into the row — the full report is `GET /v1/flows/{id}/health`. The same rows, with every other design section, come in one read from `GET /v1/bootstrap`; the project's whole configuration, every flow's steps included, is `GET /v1/projects/{nodeId}/document`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Node id of the project whose flows to list. Pass exactly one of this or `scope=system`. |
| `scope` | `"system"` | no | Pass `system` to list platform-owned flows instead of a project's. Mutually exclusive with `project`. |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: health. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flows` | `object[]` | yes | The flows in scope, unpaginated. |

Each item of `flows`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputs` | `object` | yes | What the flow takes in, by name — always an object, `{}` when it declares none. Each value's `type` is as the server resolved it; you author it as a registered type name in `inputs` on create or patch. |
| `outputs` | `object` | yes | What the flow gives back, by name — always an object, `{}` when it declares none. A `return` step gives them. |
| `stepCount` | `integer` | yes | How many steps the flow currently contains, nested ones included. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or steps bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each function step's time limit as a run applies it, keyed by step key, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The deployment's task limits and generation default move it without bumping `structureVersion`, and the bootstrap's flows section does not carry it. Null for a step whose function is not registered. |
| `calls` | `object[]` | yes | This project's flows that this flow's `flow.invoke` steps target, one entry per invoking step (switched-off ones included), sorted by flow id, then step key. Each target's own row gives its inputs and outputs. |
| `calledBy` | `object[]` | yes | This project's flows whose `flow.invoke` steps target this flow, one entry per invoking step, sorted by flow id, then step key. Flows that reach this one through others are the bootstrap's `invokedBy`. |

### `POST /v1/flows`

Create a flow — its key, label and typed signature (`inputs`, `outputs`); its steps are saved after, with `PUT /v1/flows/{id}/steps`. `scope: "system"` creates a platform flow (staff only) instead of one in `project`. With `validateOnly: true` it answers whether the create would be refused and the input and output names the signature would be stored with, writing nothing. Several flows at once, with their steps: the `flows` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`). Stored checks on a flow are eval cases, in the `evals` section of the same document.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | no | Node id of the project that will own the flow. Pass exactly one of this or `scope: "system"`. |
| `scope` | `"system"` | no | Pass `system` to create a platform-owned flow with no owning project. Mutually exclusive with `project`. |
| `label` | `string` | yes | Display text. |
| `key` | `string` | yes | The flow's key, permanent once created — pick it deliberately. Uppercase is refused, not folded. Kebab-case: lowercase letters and digits in words joined by single dashes, like `renew-members`, up to 100 characters. |
| `description` | `string \| null` | no | Optional prose about what the flow is for. Whitespace is trimmed before the length limit applies. |
| `inputs` | `object` | yes | What the flow takes in, by name, as registered type names. |
| `outputs` | `object` | yes | What the flow gives back, by name, as registered type names. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |

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
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "links-removed" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected" \| "recompute" \| "reference-policy"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `links-removed`: a dropped or re-pointed producer leaves stored links no declaration stands behind, and the link backfill removes them; `rows` counts the records whose processing (`reprocessOn` on a leave) read those links. Their computed values are recomputed, but their processing is not run again: reprocess one on purpose with `POST /v1/records/{id}/reprocess`. `records-invalid`: stored records that already did not fit their type before this change and still do not fit the changed one; nothing changes them, a write that replaces one must make it fit, and a merge is judged only on the fields it writes. A change that would make a fitting record unfit is refused (`TYPE_UNSAFE_FOR_TABLE`), never listed here. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow or an API read leaves those fields out of those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. `recompute`: Kipory computes the table's computed fields for its stored records, in the background and at no charge. `reference-policy`: the change moves what deleting a record does to the stored records naming it — a stated `onTargetDelete`, or the default it falls back to when the field becomes required, becomes the table's key or the reference becomes `scope: lifecycle`; `rows` counts the records naming such a record directly today, and the message says what the delete did and now does, and the most one record has. Records a `delete` takes in turn by their own rules are not counted. It also appears when a reference stops saying `unresolved: allow`, so a write naming a record that does not exist is refused; `rows` is what the last reference sweep counted as naming no record. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputs` | `object` | yes | What the flow takes in, by name — always an object, `{}` when it declares none. Each value's `type` is as the server resolved it; you author it as a registered type name in `inputs` on create or patch. |
| `outputs` | `object` | yes | What the flow gives back, by name — always an object, `{}` when it declares none. A `return` step gives them. |
| `stepCount` | `integer` | yes | How many steps the flow currently contains, nested ones included. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or steps bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each function step's time limit as a run applies it, keyed by step key, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The deployment's task limits and generation default move it without bumping `structureVersion`, and the bootstrap's flows section does not carry it. Null for a step whose function is not registered. |

### `GET /v1/flows/{id}`

Read one flow: its signature, its steps in the order they run, its `version` (the lock every write of it requires), and `calls`/`calledBy`, the flows it calls and the flows that call it, one hop each way. `include=reads` adds every step's place and the paths it reads; `include=expressions` adds every expression the steps hold, by where it sits, as TypeScript and as Python, for reading; `expand=timeLimits` adds each function step's time limit as a run applies it. Change its steps with `PUT /v1/flows/{id}/steps` (the whole list) or `POST /v1/flows/{id}/steps/edit` (a few edits); its signature with `PATCH /v1/flows/{id}`. To check an edited expression before saving it, send it as `typescript` or `python` on `PUT /v1/flows/{id}/steps` with `validateOnly: true`. What still holds the flow, and would refuse its delete, is `DELETE /v1/flows/{id}?validateOnly=true`. Every flow of a project at once is `GET /v1/bootstrap`, and the whole project as one editable document is `GET /v1/projects/{nodeId}/document`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `expand` | `string` | no | Optional expansions, comma-separated. One or more of: timeLimits. Each adds a computed field to the response and may cost extra queries, so ask only for what you will read. |
| `include` | `string` | no | Fields to add, comma-separated, each answered only when asked for. `reads` adds `reads`: every step's place and the paths it reads, what a reference or impact view walks. `expressions` adds `expressions`: every expression the steps hold, as TypeScript and as Python. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputs` | `object` | yes | What the flow takes in, by name — always an object, `{}` when it declares none. Each value's `type` is as the server resolved it; you author it as a registered type name in `inputs` on create or patch. |
| `outputs` | `object` | yes | What the flow gives back, by name — always an object, `{}` when it declares none. A `return` step gives them. |
| `stepCount` | `integer` | yes | How many steps the flow currently contains, nested ones included. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or steps bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each function step's time limit as a run applies it, keyed by step key, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The deployment's task limits and generation default move it without bumping `structureVersion`, and the bootstrap's flows section does not carry it. Null for a step whose function is not registered. |
| `calls` | `object[]` | yes | This project's flows that this flow's `flow.invoke` steps target, one entry per invoking step (switched-off ones included), sorted by flow id, then step key. Each target's own row gives its inputs and outputs. |
| `calledBy` | `object[]` | yes | This project's flows whose `flow.invoke` steps target this flow, one entry per invoking step, sorted by flow id, then step key. Flows that reach this one through others are the bootstrap's `invokedBy`. |
| `steps` | `object[]` | yes | The flow's steps in the order they run, as you wrote them. Save a whole new list with `PUT /v1/flows/{id}/steps`, or change a few with `POST /v1/flows/{id}/steps/edit`. |
| `reads` | `object[]` | no | Present only with `include=reads`: one entry per step, nested ones included, with its place and the paths it reads. |
| `expressions` | `object[]` | no | Present only with `include=expressions`: one entry per expression the saved steps hold, in written order, each step's function expressions first, with where it sits and its TypeScript and Python. For reading only; to check an edit of one, send it as `typescript` or `python` on a steps write with `validateOnly: true`. |

Each item of `calls`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The other flow's id. |
| `stepKey` | `string` | yes | The key of the `flow.invoke` step that makes the call, in the calling flow. |

Each item of `calledBy`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The other flow's id. |
| `stepKey` | `string` | yes | The key of the `flow.invoke` step that makes the call, in the calling flow. |

Each item of `steps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `key` | `string` | yes | The step's key, unique in the flow, and the name its value is read by. camelCase, like `renewMembers`. |
| `function` | `string` | no | The function the step runs. |
| `with` | `object` | no | The function's settings; each one the function reads as a value takes an argument. |
| `timeoutMs` | `integer` | no | The most time the step may take, in milliseconds; left out, the function's own limit applies. |
| `tries` | `integer` | no | How many times the step is tried in all, the first included: 1 to 5. Left out, it is tried once. |
| `tryDelayMs` | `integer` | no | How long to wait between tries, in milliseconds, at most a minute. |
| `vendor` | `object` | no | Which vendor serves the step first, and when it may move to the next one. |
| `onTransient` | `"fail" \| "retry-later"` | no | What a vendor's passing failure does to a run a schedule or trigger started: `fail` ends the run (the default), `retry-later` runs it again later. |
| `reuseResultsForMinutes` | `integer` | no | How long, in minutes, a result for the same settings is reused instead of running the step again; at most sixty days. `0` always runs it fresh. |
| `onOversize` | `"cut" \| "fail"` | no | What a result too big to keep does: `cut` keeps a text's start or a list's first items, `fail` fails the step. Left out, the platform's default applies. |
| `modelId` | `string` | no | The AI model the step uses, for a function that calls one; left out, the default model for its task. |
| `description` | `string` | no | A note on what the step is for, shown to people reading the flow. It changes nothing the step does. |
| `enabled` | `boolean` | no | `false` switches the step off: it does not run. |
| `if` | `object[]` | no | The branches in order; the first whose test holds runs. |
| `else` | `object` | no | Runs when no branch's test held. |
| `each` | `string \| number \| boolean \| object \| object` | no | The list; the steps run once per value in it. |
| `as` | `string` | no | The name each value is read by inside the block. |
| `maxItems` | `integer` | no | The most values the steps run for; values past it are left out, and the run says so. |
| `maxParallel` | `integer` | no | The most values run at once. Left out, values run together when they cannot affect one another, and one after another otherwise. |
| `maxFailedBranches` | `integer` | no | How many values may fail before the block fails. A failed value leaves nothing behind and the run ends `partial`. Left out, the first failure fails the block. Give this or `maxFailedShare`, not both. |
| `maxFailedShare` | `number` | no | The share of the values, 0 to 1, that may fail before the block fails, like `maxFailedBranches` as a fraction. Give this or `maxFailedBranches`, not both. |
| `steps` | `object[]` | no | The block's steps, in the order they run. |
| `out` | `object` | no | What the block gives, read as `<key>.<name>`. |
| `repeat` | `object` | no | The values carried from pass to pass, how each pass changes them, and when to stop. |
| `parallel` | `object[]` | no | The steps run at once. None reads another; each starts from the values there before the block. |
| `try` | `object` | no | The steps tried; a failure in them runs `catch`. |
| `catch` | `object` | no | Runs when a step in `try` fails; `error` says why. |
| `return` | `object` | no | The flow's outputs. |
| `fail` | `object` | no | The error the flow ends with. |

Each item of `reads`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | The step's key. |
| `path` | `string` | yes | The step's key path from the flow, enclosing blocks first: `perMember.settle.notify`. |
| `parentKey` | `string \| null` | yes | The key of the block the step sits in; null at the top. |
| `branch` | `string \| null` | yes | Which list of that block holds it: `0`, `1`, … or `else` under `if`, `try` or `catch` under `try`; null elsewhere. |
| `position` | `integer` | yes | Its 0-based place in that list. |
| `reads` | `object[]` | yes | Every path the step reads, in written order. |
| `gives` | `string[]` | yes | The names a block gives to the steps after it; empty for a function step, whose value is read by its key. |
| `enabled` | `boolean` | yes | False when the step or a block around it is switched off. |

Each item of `expressions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `typescript` | `string \| null` | yes | The expression as TypeScript: statements ending in `return`, with TypeScript's own spelling where it has one (`if`, loops, `.map`, `.filter`, `.startsWith`, templates) and JSONata's functions, and the platform's, called by name without the `$` (`round(x, 1)`), with nothing imported or defined. It means what the JSONata means: the engine runs the JSONata, and this text, edited and sent back as `typescript`, reads back to it. For reading and editing only: it is not saved. Null when the expression does not parse or uses a part with no TypeScript form, for example a function called on each item of a path (`xs.$string()`), a computed function call, `@`, `#`, grouping, a variable named like one of its inputs, or `or` / `and` with a literal on its right (`a or "y"`, always true), which TypeScript would read as a default. |
| `python` | `string \| null` | yes | The same expression as Python: statements ending in `return`, with Python's own spelling where it has one (`if`, loops, comprehensions, f-strings) and JSONata's functions, and the platform's, called by name (`round(x, 1)`; one Python names itself, such as `list`, is `list_`). It means what the JSONata means and, edited and sent back as `python`, reads back to it. Null whenever `typescript` is null for the expression itself, and also when a part has a TypeScript form but no Python one. |

### `PATCH /v1/flows/{id}`

Change a flow's label, description, signature (`inputs` or `outputs`, either side alone); its key is permanent. Its steps are `PUT /v1/flows/{id}/steps`. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. A signature change another row froze a copy of is refused unless `adoptSnapshots: true`. With `validateOnly: true` it answers whether the patch would be refused and rehearses it — what it would leave behind in this flow and the flows that call it — writing nothing; that is a dry run of a WRITE, where `POST /v1/flows/{id}/preview` RUNS the flow. Several flows at once, with their steps: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `label` | `string` | no | New display text. Omit to leave it alone. |
| `description` | `string \| null` | no | Three distinct states: omit to leave the description alone, pass null (or an empty string) to clear it, pass text to replace it. |
| `inputs` | `object` | no | Replacement inputs, by name. Omit to leave them alone — they may be sent without `outputs`, and the outputs then stay as stored. Changing them re-validates every step in the flow. |
| `outputs` | `object` | no | Replacement outputs, by name. Omit to leave them alone — they may be sent without `inputs`, and the inputs then stay as stored. Changing them re-validates the whole flow. |
| `adoptSnapshots` | `boolean` | no | Opt in to re-publishing the request and response contract of any live endpoint this flow serves — it changes what a running route promises its callers. Off by default. |
| `version` | `integer` | yes | The flow's `version` as you last read it. REQUIRED: the patch is refused with 409 `VERSION_CONFLICT` if the flow changed since — another patch, a checkpoint restore, or a project document apply — so a concurrent edit is never silently overwritten. |
| `validateOnly` | `boolean` | no | Check this patch against the stored flow and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `id`, `scope`, `project`, `label`, `key`, `description`, `inputs`, `outputs`, `stepCount`, `version`, `createdAt`, `updatedAt`, `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the flow — what `{id}` routes address. |
| `scope` | `"project" \| "system"` | yes | `project` for a flow a project owns, `system` for a platform-owned one. A `system` flow has no owning project, so exactly one of these two facts is always set. |
| `project` | `string \| null` | yes | Node id of the owning project, or null for a platform-owned flow. |
| `label` | `string` | yes | Display text, editable at any time. |
| `key` | `string` | yes | The flow's key, fixed when the flow is created. It cannot be changed afterwards — change the display text through `label`. |
| `description` | `string \| null` | yes | Free prose about what the flow is for, or null when none was written. Documentation only — nothing at runtime reads it. |
| `inputs` | `object` | yes | What the flow takes in, by name — always an object, `{}` when it declares none. Each value's `type` is as the server resolved it; you author it as a registered type name in `inputs` on create or patch. |
| `outputs` | `object` | yes | What the flow gives back, by name — always an object, `{}` when it declares none. A `return` step gives them. |
| `stepCount` | `integer` | yes | How many steps the flow currently contains, nested ones included. |
| `version` | `integer` | yes | The flow's optimistic-lock version. Send it back as `version` on `PATCH /v1/flows/{id}`; every write that changes the flow's label, description, signature or steps bumps it, including a checkpoint restore and the project document's apply. |
| `createdAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `updatedAt` | `string` | yes | An ISO-8601 instant. Responses always carry UTC with a `Z` suffix (e.g. 2026-08-15T12:34:56.789Z); requests may use any valid offset. |
| `health` | `object` | no | Whether the flow can run, present only when you pass `expand=health`. Folded from the same report `GET /v1/flows/{id}/health` returns in full. Absent means not requested, or that this flow could not be measured — never that it is healthy. |
| `timeLimits` | `object` | no | Each function step's time limit as a run applies it, keyed by step key, present only when you pass `expand=timeLimits` to `GET /v1/flows/{id}`. The deployment's task limits and generation default move it without bumping `structureVersion`, and the bootstrap's flows section does not carry it. Null for a step whose function is not registered. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |
| `warnings` | `object[]` | no | Present when the write removed something a use the platform only guessed may still read (`REMOVED_MAY_BE_USED`): each names the user and where. The write went through; check each by hand. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Each item of `warnings`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this change would be accepted: false when the row would be refused (a finding in `diagnostics` that stops the save), AND when the change would leave an error it introduces around the row (`leavesBehind` with `severity: "error"` and `introduced: true`) — exactly when a project-document plan of the same change answers `ok: false`. An error that was already there (`introduced: false`) is reported and does not make it false: fix it when you choose. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE — a database constraint another write reaches first can still refuse it; read it as a snapshot. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `leavesBehind` | `object[]` | no | What the change would leave BROKEN AROUND this row, found by rehearsing the write and rolling it back — a flow a shape change breaks, a schedule whose stored inputs a narrowed shape now refuses. Each carries `introduced`: `true` if this change causes it, `false` if it was already there. The same findings a project-document plan stating only this row reports, judged by the same gate: an introduced error makes `ok` false. Absent when the dry run did not rehearse — a draft its planner refused, or a stale `version`. |
| `consequences` | `object[]` | no | What this change would do to stored DATA, measured by rehearsing the write and rolling it back — the same list a project-document plan stating only this row reports (records a narrowed shape would leave invalid, links a delete takes along, …). Absent when the dry run did not rehearse. |

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
| `outlinePath` | `string` | no | Where the step this finding is about sits in the flow's outline, as the change leaves it, such as `each-member › send-note`. Present on a flow finding that names a switched-on step; see `GET /v1/flows/{id}/outline`. |
| `introduced` | `boolean` | no | Present on findings about the STATE a change leaves behind (a flow's health, a schedule's inputs against its flow), judged before and after the change. `true`: this change introduced it. `false`: it was already there, and it does not make `ok` false — fix it when you choose. Absent on a finding about the body itself, which always counts as introduced. |

Each item of `consequences`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `path` | `string` | yes | The document path of the row that causes it. |
| `kind` | `"restamp" \| "reindex" \| "stream-migration" \| "records-invalid" \| "link-restamp" \| "links-deleted" \| "links-removed" \| "reembed" \| "fields-unset" \| "rename" \| "flows-affected" \| "recompute" \| "reference-policy"` | yes | What happens to DATA when this configuration change lands. `restamp`: stored records are re-stamped with new queryable columns. `reindex`: a vector-index reconcile is queued, which may redo nothing or rewrite payloads only. `stream-migration`: stream events move. `link-restamp`: stored links are re-stamped. `links-deleted`: deleting a relation deletes every stored link of it, retracted ones included. `links-removed`: a dropped or re-pointed producer leaves stored links no declaration stands behind, and the link backfill removes them; `rows` counts the records whose processing (`reprocessOn` on a leave) read those links. Their computed values are recomputed, but their processing is not run again: reprocess one on purpose with `POST /v1/records/{id}/reprocess`. `records-invalid`: stored records that already did not fit their type before this change and still do not fit the changed one; nothing changes them, a write that replaces one must make it fit, and a merge is judged only on the fields it writes. A change that would make a fitting record unfit is refused (`TYPE_UNSAFE_FOR_TABLE`), never listed here. `reembed` (a plan's only): the reconcile re-embeds this table's stored records, which spends credits on embedding usage (billed by tokens), because what its search indexes moved. `fields-unset`: the change adds fields the table's stored records do not hold, so a flow or an API read leaves those fields out of those records until each is written. `rename`: stored rows a rename rewrites in place; ids, embeddings and stamps are kept. `flows-affected`: the change moves a type that flows this document does not state read or write, so they read and write the new shape too; the message names each one. `recompute`: Kipory computes the table's computed fields for its stored records, in the background and at no charge. `reference-policy`: the change moves what deleting a record does to the stored records naming it — a stated `onTargetDelete`, or the default it falls back to when the field becomes required, becomes the table's key or the reference becomes `scope: lifecycle`; `rows` counts the records naming such a record directly today, and the message says what the delete did and now does, and the most one record has. Records a `delete` takes in turn by their own rules are not counted. It also appears when a reference stops saying `unresolved: allow`, so a write naming a record that does not exist is refused; `rows` is what the last reference sweep counted as naming no record. |
| `rows` | `integer` | yes | How many stored rows are affected; on `flows-affected`, how many flows. |
| `lowerBound` | `boolean` | no | `true` when `rows` was counted from a sample that stopped at its cap, so at least this many are affected. Absent when `rows` is exact. |
| `message` | `string` | yes | One line, safe to show a person. |

### `DELETE /v1/flows/{id}`

Delete a flow and every step in it (`deletedStepCount` says how many); its checkpoints go with it, and so does its `<flowKey>-contract` eval suite with that suite's cases and runs (`deletedContractSuiteCount`; for a platform flow, every project's). Other eval suites over it stay, and their runs fail until they name another flow. Refused (409 `FLOW_HAS_DEPENDENTS`) while anything holds it — an endpoint, schedule, trigger, table, vocabulary resolver, platform job, or another flow that calls it. With `?validateOnly=true` it answers whether the delete would be refused, and `derived.dependents` counts what holds the flow and the contract suites that would go with it (`refuses: false`), writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`) with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `deleted`, `id`, `deletedStepCount`, `deletedContractSuiteCount`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |
| `deletedStepCount` | `integer` | yes | How many steps went with the flow, nested ones included. Deleting a flow deletes everything inside it. |
| `deletedContractSuiteCount` | `integer` | yes | How many `<flowKey>-contract` eval suites went with the flow, with their cases and runs. For a platform flow, this counts the contract suites over it in every project. Other eval suites over the flow are kept; their runs fail until they name another flow. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `derived` | `object` | no | What the delete would find, from the reads it decides on. Nothing here has happened. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `GET /v1/flows/{id}/coverage`

Which steps in this flow (and the flows it calls) actually ran, across the record-processing attempts since its steps last changed — no test needed. An aggregate over a SAMPLE of at most `attemptLimit` recent attempts (default 500), with `truncated` when more exist: a report, not a log, so it takes no cursor, and a larger `attemptLimit` widens the sample. It measures execution, not correctness: whether each step's value is right is what an eval suite over the flow judges (`POST /v1/eval-suites/{id}/run`; `wait: true` answers in the same call). The attempts' traces: `GET /v1/flows/{id}/traces`; are the steps themselves sound: `GET /v1/flows/{id}/health`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `attemptLimit` | `integer` | no | Cap on how many recent attempts to read. The response echoes it and sets `truncated` when more exist. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `evidence` | `"execution-only" \| "execution-and-slots"` | yes | How much this report could measure. `execution-and-slots` means what each step emitted was captured too, so the `vacuity` axis is meaningful; `execution-only` means only whether steps ran. |
| `vacuity` | `object \| null` | yes | Whether steps actually emitted anything when they ran. **Null means nobody captured that — an absence of evidence, not a clean bill of health.** |
| `coldUnclassifiable` | `boolean` | yes | True when some step never ran and the evidence cannot say whether that is expected. Worth looking at; not a failure. |
| `rootFlowId` | `string` | yes | The flow this report is rooted at. |
| `attemptCount` | `integer` | yes | How many runs were examined. |
| `traceCount` | `integer` | yes | How many of those runs carried captured output. Compare against `attemptCount` to see how thin the sample behind `vacuity` is. |
| `flowIds` | `string[]` | yes | Every flow covered, including ones the root flow invokes. |
| `steps` | `object[]` | yes | Per-step results on the did-it-run axis. |
| `coldUnconditionalCount` | `integer` | yes | How many steps never ran despite having no condition — the ones worth investigating. |
| `coldGatedCount` | `integer` | yes | How many steps never ran but have a condition, so being cold is expected. |
| `unknownStepIds` | `string[]` | yes | Steps seen in the run history that are no longer in the flow — usually the trace of an edit. |
| `verdict` | `"measured" \| "not-measured"` | yes | Whether this report measured anything at all. `not-measured` is not a pass — see `reason`. |
| `reason` | `"no-attempts" \| "vacuous-steps" \| null` | yes | Why the verdict is `not-measured`, or null when it is `measured`. |
| `tableKeys` | `string[]` | yes | Keys of the tables the covered flows touch. |
| `graphChangedAt` | `string \| null` | yes | When the flow last changed. Runs from before this are excluded. |
| `truncated` | `boolean` | yes | True when the read hit `attemptLimit` and covers only the most recent attempts. A truncated report is a sample, so read its counts as such. |
| `attemptLimit` | `integer` | yes | The cap that was applied, echoed back. |

Each item of `steps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this step belongs to. |
| `flowLabel` | `string` | yes | That flow's label (display text). |
| `stepKey` | `string` | yes | The step's key in that flow. |
| `functionKey` | `string` | yes | Which function the step runs. |
| `gated` | `boolean` | yes | True when the step sits under an `if` branch or a `catch`, so never running is expected rather than suspicious. |
| `ranCount` | `integer` | yes | How many of the observed attempts reached this step. |
| `rate` | `number` | yes | `ranCount` over the attempts observed. |
| `verdict` | `"covered" \| "cold-gated" \| "cold-unconditional"` | yes | The summary judgement for this step, already accounting for whether it is gated. |

### `GET /v1/flows/{id}/health`

The full validation report for the flow as saved: every diagnostic, what it is about (a step or the flow) and whose it is. A report, not a gate — a flow with errors still runs, and gets them wrong. The one-line summary rides each row of `GET /v1/flows?expand=health`. What a change WOULD leave behind is the change's own dry run (`validateOnly: true` on `PATCH /v1/flows/{id}` or a steps write), which rehearses it and reports the findings it introduces; what actually ran is `GET /v1/flows/{id}/coverage`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this report is about. |
| `diagnostics` | `object[]` | yes | Every diagnostic: errors, warnings and hints together. An empty array means the flow is healthy — it is a real answer, not a missing one. |
| `counts` | `object` | yes | Summary counts. |
| `plan` | `object` | yes | The flow's size and shape, from its configuration alone. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this diagnostic. Branch on it rather than on the message. Treat an unrecognised code as a generic diagnostic instead of an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means the flow is not valid as it stands; `warning` is advisory and does not stop anything; `info` is a hint that the flow could be written shorter (an input can hold an expression, a value can be built field by field) and is never a problem. |
| `message` | `string` | yes | What is wrong, in one line, safe to show to a person. Wording may change — do not parse it; read `segments` instead when you want the objects it names. |
| `segments` | `object[]` | yes | `message` in pieces, for a consumer that can draw the objects it names as references. The two are folded from one list by the producer and cannot disagree about the words — but they are not the same characters: `message` quotes what a segment names and backticks what it spells as configuration, where a segment's `text` is the bare word. |
| `remedy` | `string \| null` | yes | What to do about it, in one line. Null is a real answer: some findings have no action a person can take from here. |
| `remedySegments` | `object[]` | yes | `remedy` in pieces. Empty exactly when `remedy` is null. |
| `target` | `"step" \| "edge" \| "flow"` | yes | What the diagnostic is about — the whole flow, one step, or one connection. This is what decides where to render it, and it is independent of `attribution`. |
| `attribution` | `object` | yes | Where to point the reader, which is not the same as `target`: a flow-level diagnostic can still name the step that caused it. |
| `details` | `unknown` | no | Extra context whose shape depends on `code`. Read it only after matching the code. |
| `outlinePath` | `string` | no | Where the step this is about sits in the flow's outline, such as `each-member › send-note`: the keys of the fan-outs and loops around it, then its own key. Present when the diagnostic names a switched-on step; see `GET /v1/flows/{id}/outline`. |

### `GET /v1/flows/{id}/outline`

The flow as an indented outline: one line per step in the order it runs, each step inside the block that holds it, with its key, its function, the settings that matter and when it is skipped. Read it before the flow's steps. Each line's `path` is the `outlinePath` that `GET /v1/flows/{id}/health` puts on a diagnostic; the steps themselves are `GET /v1/flows/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow this outline is about. |
| `flowKey` | `string` | yes | The flow's key. |
| `structureVersion` | `string \| null` | yes | The project's configuration version the outline was read at, as a decimal string. Null for a platform flow. |
| `outlineFormat` | `integer` | yes | The outline's format number. Lines read the same until it changes; a change is announced. |
| `lines` | `object[]` | yes | The outline, one entry per line, in reading order. |
| `text` | `string` | yes | The same lines as one text, each indented two spaces per `depth` and joined by newlines. |
| `plan` | `object` | yes | The flow's size and shape, from its configuration alone. |

Each item of `lines`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `depth` | `integer` | yes | How far the line is indented: 0 for the flow's header, 1 for its top-level steps, one more inside each block and under each of an `if`'s or a `try`'s branches. |
| `kind` | `"header" \| "function" \| "invoke" \| "if" \| "branch" \| "each" \| "repeat" \| "parallel" \| "try" \| "return" \| "fail"` | yes | What the line is: the flow's `header`; a function step (`function`) or a sub-flow call (`invoke`); a block (`if`, `each`, `repeat`, `parallel`, `try`); one `branch` of an `if` (`when …`, `else`) or a `try` (`try`, `catch`); a `return` or a `fail`. A switched-off step's line starts `off `. New kinds come only with a new `outlineFormat`. |
| `key` | `string` | no | The step's key. Present on every line that is one step; absent on the header and on a `branch` line. |
| `path` | `string` | no | Where the step sits: the keys of the blocks around it, then its own key, joined by ` › `. Present exactly when `key` is; health diagnostics carry the same text as `outlinePath`. |
| `text` | `string` | yes | The line itself, without its indentation. |

### `POST /v1/flows/{id}/preview`

Run the flow now, in a sandbox, and answer what happened: every step's transcript, its failures, and the declared outputs. Seed it from `input` values or an existing record; it runs the saved steps (a draft `graph` is checked first, and runs only when it equals them). It bills the project for its model calls and applies the writes its steps make unless you pass `apply: false` (then the change set is recorded and discarded) — a preview EXECUTES the flow, where `validateOnly: true` on a write judges the write without running anything. The same run reported as it happens: `POST /v1/flows/{id}/preview/stream`; queued, with a run log: `POST /v1/flows/{id}/preview-runs`. Stored cases with assertions: an eval suite over the flow (`GET /v1/eval-suites?project=<nodeId>&flowId=`), run with `POST /v1/eval-suites/{id}/run`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved steps, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `project` | `string` | no | Resolve project-scoped context — relations, project config, vocabularies, the caller's profile — against this project (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. Required for a platform flow, which belongs to no project: it runs as this one with the platform's vendor keys, the platform pays, and no trace is written. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowOutput` | `object` | yes | The flow's declared output slots, exactly as the run produced them. A slot the run did not produce stays absent; nothing is filled in, here or live. |
| `missingRequiredOutput` | `string \| null` | yes | First required output slot the run failed to produce, or null. Non-null means a live invocation of this run would be refused (422 `FLOW_OUTPUT_MISSING`) and write nothing — so this preview discarded its writes too, even with `apply`. |
| `transcript` | `object[]` | yes | What each step did, in execution order. |
| `errors` | `object[]` | yes | Failures, one entry per step and branch that errored. The first is the one a live call answers with. |
| `warnings` | `unknown[]` | yes | Non-fatal problems the engine noticed. The run still completed. |
| `fanOutCaps` | `object[]` | yes | Every `each` whose element list was truncated, and by which limit. Empty when nothing was dropped — check this before reading a branch count as the whole population. |
| `branches` | `unknown[]` | yes | Full per-branch results — inputs, outputs, usage and failures — for deep inspection. |
| `runState` | `object` | yes | The shared run state as it stood when the run ended. |
| `ingestSpend` | `object` | no | Paid third-party ingest spend for this run. Absent when no ingest function ran, which is different from having spent zero. |
| `previewSessionId` | `string` | yes | Identifies this run. Every model call and ingest job it produced is tagged with it, so it is the key for looking the run up afterwards. |
| `traceId` | `string \| null` | yes | The persisted trace for this run, or null when none was written — either because none was requested, or because it was requested and skipped. If you asked for one and get null, `traceSkipped` says why; treat the run as having left no evidence rather than as having produced an empty one. |
| `traceSkipped` | `object \| null` | yes | Why `traceId` is null despite a trace being requested. Null both when a trace was written and when none was asked for. |
| `totalTokensIn` | `number` | yes | Input tokens across every model call in this run. |
| `totalTokensOut` | `number` | yes | Output tokens across every model call in this run. |
| `latencyMs` | `number` | yes | How long the whole call took, end to end, including preparation. |
| `pipelineMs` | `number` | yes | How long the flow itself took. Compare this rather than `latencyMs` when measuring a flow across runs — `latencyMs` also spans platform preparation, so it moves when something outside the flow gets slower. `0` when the run failed before reaching the flow. |
| `timings` | `object` | yes | Full breakdown of where the run's wall clock went. |

Each item of `transcript`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | Key of the step this entry reports. |
| `flowId` | `string` | no | The flow that holds the step, when it is a called flow's. |
| `outcome` | `"applied" \| "failed" \| "not-run"` | yes | `applied` — it ran (see `answeredNothing`). `failed` — it ran and errored; see `error`. `not-run` — it was reached and did not run; see `notRun`. |
| `notRun` | `"branch-not-taken" \| "disabled" \| "flow-returned" \| "block-failed" \| "caught" \| "applied-earlier" \| "run-cancelled"` | no | Why the step did not run. Present when `outcome` is `not-run`: `branch-not-taken`, `disabled`, `flow-returned`, `block-failed`, `caught`, `applied-earlier` or `run-cancelled`. |
| `answeredNothing` | `true` | no | The step ran and gave nothing; its readers see nothing. Present only when true. |
| `durationMs` | `number` | yes | Wall-clock time this step took. |
| `error` | `string` | no | Failure message. Present when `outcome` is `failed`. |

Each item of `errors`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | Key of the step that failed, or `__runner__` for a failure of the run itself. |
| `branchId` | `string \| null` | yes | Branch it failed in, or null when the step is not inside an `each`. |
| `phase` | `string` | yes | Stage of execution the failure happened in. |
| `message` | `string` | yes | What went wrong. |
| `status` | `integer \| null` | yes | The HTTP status a live call of this flow (an endpoint) would answer for this failure when it is the first. Null when the runner itself crashed. |
| `code` | `string \| null` | yes | The error code that answer would carry, e.g. `VALIDATION_FAILED` for an `$assert` refusal. Null when the runner itself crashed. |
| `reason` | `string` | no | The rule that refused, when the failing function named one — a code the refusal-codes page lists, such as `RECORD_READ_HAS_MORE`. A live call answers it as `details.reason`. |
| `limitKey` | `string` | no | The limit that stopped the run, when one did (phase `limit-reached`) — a key of `GET /v1/projects/{nodeId}/limits`. |
| `details` | `object` | no | On `FLOW_NOT_AUTHORED`: the flow a live call's answer names in its `details`. |

Each item of `fanOutCaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | Key of the `each` step a limit cut. |
| `branches` | `integer` | yes | Branches actually spawned. |
| `requested` | `integer` | yes | Elements the node would have spawned, after de-duplication and before the limit applied. |
| `cappedBy` | `"preview"` | yes | Which limit truncated the list: `preview` — this request's `fanOutCap`. |

### `POST /v1/flows/{id}/preview-runs`

Queue the same sandboxed run as `POST /v1/flows/{id}/preview` and answer 202 with its run id; the worker runs the SAVED steps (a draft `graph` is refused) and writes a timeline, read like any run at `GET /v1/runs/{runId}` and its `/timeline`. The id is 404 there until the worker starts. A preview EXECUTES the flow; to judge a write without running anything, send it with `validateOnly: true`. The answer in the response instead: `POST /v1/flows/{id}/preview`, or as it happens: `/preview/stream`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved steps, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `project` | `string` | no | Resolve project-scoped context — relations, project config, vocabularies, the caller's profile — against this project (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. Required for a platform flow, which belongs to no project: it runs as this one with the platform's vendor keys, the platform pays, and no trace is written. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `202`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `runId` | `string` | yes | The queued run's id. It appears at GET /v1/runs/{runId} — and on /timeline, /timeline/stream, /spend, /change-set, /flow-snapshots and /trace — once the worker writes its opening frame; until then those routes answer 404. Poll the run, then follow its timeline stream. |

### `POST /v1/flows/{id}/preview/stream`

The same sandboxed run as `POST /v1/flows/{id}/preview` — same body, same authorization, same spend — reported as server-sent events while it happens: each step as it starts and ends, then the outcome. A preview EXECUTES the flow; to judge a write without running anything, send it with `validateOnly: true`. Queued instead, with a run log you can read later: `POST /v1/flows/{id}/preview-runs`.

**Streams.** The success response is `text/event-stream`, not JSON. Event names: `preview-started`, `step-started`, `step-ended`, `preview-complete`, `preview-error`, `error`, `done`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `graph` | `object` | no | Which graph to run: the flow's saved steps, or a draft supplied here. Defaults to the saved graph. |
| `input` | `object` | yes | Where the run's inputs come from: values in this request, or an existing record. |
| `project` | `string` | no | Resolve project-scoped context — relations, project config, vocabularies, the caller's profile — against this project (its id, as `POST /v1/projects` answered it) instead of the flow's own. Requires EDITOR on it. Omit to use the flow's project. Required for a platform flow, which belongs to no project: it runs as this one with the platform's vendor keys, the platform pays, and no trace is written. |
| `fanOutCap` | `integer \| "uncapped"` | no | Ceiling on branches any fan-out in this run may spawn. Omit for the default, give a number for that ceiling, or `"uncapped"` to let the flow's own limits apply. Narrowing only — it can never raise a node's configured maximum. A capped run still proves wiring, schemas and per-branch behaviour; it does not prove how a merge folds over the full population, and anything truncated is reported in `fanOutCaps`. |
| `apply` | `boolean` | no | Whether this preview applies the writes it stages. Defaults to true. Pass false for a dry run: the flow executes in full and the change set is recorded and then discarded, readable at GET /v1/runs/{runId}/change-set. |

**Response `200`** (first frame shape, when declared)

One of 5 shapes:

Shape 1, with `previewSessionId`, `flowId`, `fanOutBranchCap`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"preview-started"` | yes | The run is about to execute. |
| `previewSessionId` | `string` | yes | Identifies this run, delivered up front so a run that later times out or crashes can still be looked up. Every model call and ingest job it produces carries it. |
| `flowId` | `string` | yes | Flow being previewed. |
| `fanOutBranchCap` | `integer \| null` | yes | Branch ceiling in force for this run, or null if uncapped. |
| `ts` | `string` | yes | When the run started. |

Shape 2, with `stepKey`, `branchId`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"step-started"` | yes | A step began running. |
| `stepKey` | `string` | yes | Key of the step this frame is about. |
| `flowId` | `string` | no | Flow the step belongs to, when the frame carries it. |
| `branchId` | `string \| null` | yes | Branch the step ran in, or null when it is not inside a fan-out. |
| `branchPath` | `unknown[]` | no | Position within nested fan-outs, outermost first. |
| `ts` | `string` | yes | When this frame was emitted. |

Shape 3, with `stepKey`, `branchId`, `outcome`, `durationMs`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"step-ended"` | yes | A step ended, in any outcome. A step that fails does not end the stream — the run continues and completes normally. |
| `stepKey` | `string` | yes | Key of the step this frame is about. |
| `flowId` | `string` | no | Flow the step belongs to, when the frame carries it. |
| `branchId` | `string \| null` | yes | Branch the step ran in, or null when it is not inside a fan-out. |
| `branchPath` | `unknown[]` | no | Position within nested fan-outs, outermost first. |
| `ts` | `string` | yes | When this frame was emitted. |
| `outcome` | `"applied" \| "failed" \| "not-run"` | yes | `applied` — it ran (see `answeredNothing`). `failed` — it ran and errored. `not-run` — it was reached and did not run; see `notRun`. |
| `durationMs` | `number` | yes | Wall-clock time this step took. |
| `slotBag` | `object` | no | The step's value, under its key, when it gave one. |
| `runState` | `object` | no | Shared run state as of this frame. |
| `notRun` | `"branch-not-taken" \| "disabled" \| "flow-returned" \| "block-failed" \| "caught" \| "applied-earlier" \| "run-cancelled"` | no | Why the step did not run, when `outcome` is `not-run`. |
| `answeredNothing` | `true` | no | The step ran and gave nothing. Present only when true. |
| `error` | `string` | no | Failure message, when `outcome` is `failed`. |
| `cacheHit` | `true` | no | A cache answered this step and its function never ran. Present only when true. |
| `each` | `object` | no | An `each`'s own end only: how its list was split. |

Shape 4, with `branches`, `totals`, `fanOutCaps`, `timings`, `previewSessionId`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"preview-complete"` | yes | The run finished. |
| `branches` | `unknown[]` | yes | Full per-branch results, as on the non-streaming response. |
| `flowOutput` | `object` | no | The flow's declared output slots, as a live invocation would return them. |
| `runState` | `object` | no | Shared run state as it stood when the run ended. |
| `outputValidation` | `object` | no | Whether the run produced everything the flow declares. |
| `totals` | `object` | yes | Token usage for the whole run. |
| `ingestSpend` | `object` | no | Paid third-party ingest spend. Absent when no ingest function ran. |
| `fanOutCaps` | `object[]` | yes | Every `each` whose element list was truncated. Empty when nothing was dropped. |
| `timings` | `object` | yes | Full breakdown of where the run's wall clock went. |
| `previewSessionId` | `string` | yes | Identifies this run, the same value `preview-started` carried. |
| `ts` | `string` | yes | When the run finished. |

Each item of `fanOutCaps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | Key of the `each` step a limit cut. |
| `branches` | `integer` | yes | Branches actually spawned. |
| `requested` | `integer` | yes | Elements the node would have spawned, after de-duplication and before the limit applied. |
| `cappedBy` | `"preview"` | yes | Which limit truncated the list: `preview` — this request's `fanOutCap`. |

Shape 5, with `error`, `phase`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `type` | `"preview-error"` | yes | The run could not proceed. This is the run's error channel — a step that merely fails arrives as `step-ended` instead, and the run continues. |
| `error` | `string` | yes | What went wrong. |
| `phase` | `string` | yes | Where it went wrong — admission, validation, loading record files, or the run itself. |
| `status` | `integer \| null` | no | For a run refused as a whole (a required output missing, the writes refused): the HTTP status a live call would answer, as on the JSON preview's `errors`. Null for a runner crash; absent before the run. |
| `code` | `string \| null` | no | The error code a live call would answer beside `status`. Null for a runner crash; absent before the run. |
| `diagnostics` | `unknown[]` | no | Per-problem detail for a draft graph that failed validation. These are the same diagnostics saving that graph would return. |
| `ts` | `string` | yes | When the failure was emitted. |

### `GET /v1/flows/{id}/value-recording`

Whether every run this flow starts records its values (inputs, each step's value, the result), and until when. A run of this flow called from another flow (`flow.invoke`) records them only when its caller's run does; outside a window a production run records them only when sampled. No run records them while this project's recording is turned off by Kipory staff (`blockedByProject`). A change reaches runs this api serves at once, and scheduled, async and record runs within 30 seconds. Set it with `PATCH /v1/flows/{id}/value-recording`; a run's values are `GET /v1/runs/{runId}/trace`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `until` | `string \| null` | yes | Every run this flow starts records its values until this instant, unless `blockedByProject` says otherwise; `null` when the sampling decides. |
| `maxDays` | `number` | yes | How far ahead `until` may be, in days: how long recorded values are kept (`kept-for.trace-days`). |
| `blockedByProject` | `"all" \| "request-runs" \| "record-runs" \| null` | yes | Runs that record nothing whatever `until` says, because Kipory staff turned recording off for this project: `all`; `request-runs`, the runs a call, a schedule or a trigger starts; `record-runs`, the runs a record change starts. `null` when none. |

### `PATCH /v1/flows/{id}/value-recording`

Record the values of every run this flow starts until `until`, or stop with `null`. `until` is at most as far ahead as recorded values are kept (`kept-for.trace-days`); a time a few minutes past that is cut to it, a later one is 422. A run of this flow called from another flow (`flow.invoke`) records them only when its caller's run does; outside a window a production run records them only when sampled. No run records them while this project's recording is turned off by Kipory staff (`blockedByProject`). A change reaches runs this api serves at once, and scheduled, async and record runs within 30 seconds. The answer is the stored window, `blockedByProject` included. Takes no `version`: one field, and the last setting is the intent. Changes no run's outcome and does not count as an edit of the flow; the project's History records who changed it, for which flow and until when (`GET /v1/projects/{nodeId}/history`, `valueRecording`). A change moves the project's `structureVersion`, so a project document read before it is refused (409) on apply until it is read again. Read it with `GET /v1/flows/{id}/value-recording`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `until` | `string \| null` | yes | Record the values of every run this flow starts until this instant (an ISO 8601 time; an offset is taken and the answer is in UTC): later than now and at most as far ahead as values are kept (`kept-for.trace-days`). `null` stops. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `until` | `string \| null` | yes | Every run this flow starts records its values until this instant, unless `blockedByProject` says otherwise; `null` when the sampling decides. |
| `maxDays` | `number` | yes | How far ahead `until` may be, in days: how long recorded values are kept (`kept-for.trace-days`). |
| `blockedByProject` | `"all" \| "request-runs" \| "record-runs" \| null` | yes | Runs that record nothing whatever `until` says, because Kipory staff turned recording off for this project: `all`; `request-runs`, the runs a call, a schedule or a trigger starts; `record-runs`, the runs a record change starts. `null` when none. |
