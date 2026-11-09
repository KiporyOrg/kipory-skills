<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Steps

A flow's steps, in the order they run, saved whole with `PUT` or changed by key with the edit batch. A refused save is 422 with `details.diagnostics`; a finding's `fixes[].edit` is a list of edits to post as they are. One step can be tried alone: interpolate its text, evaluate its expressions, or preview it.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `PUT` | [`/v1/flows/{id}/steps`](#put-v1-flows-id-steps) |  |
| `POST` | [`/v1/flows/{id}/steps/{key}/evaluate`](#post-v1-flows-id-steps-key-evaluate) |  |
| `POST` | [`/v1/flows/{id}/steps/{key}/interpolate`](#post-v1-flows-id-steps-key-interpolate) |  |
| `POST` | [`/v1/flows/{id}/steps/{key}/preview`](#post-v1-flows-id-steps-key-preview) |  |
| `POST` | [`/v1/flows/{id}/steps/edit`](#post-v1-flows-id-steps-edit) |  |
| `GET` | [`/v1/flows/conditions`](#get-v1-flows-conditions) |  |

### `PUT /v1/flows/{id}/steps`

Replace the flow's whole steps list, against the `version` you read. Every step is checked before anything is written: each value it reads must be there when it runs, keys unique, settings known. A refused save writes nothing and answers 422 `VALIDATION_FAILED` with every finding in `details.diagnostics`, each with where it sits (`at`) and ready `fixes` or the `decision` it needs; a stale `version` answers 409. `validateOnly: true` answers the same check as a verdict and writes nothing, with every expression the steps hold printed as TypeScript (`expressions`); on it, `typescript` or `python` sends expressions written as TypeScript or Python, read back as the JSONata `fromTypeScript` or `fromPython` answers and judged in place. To change a few steps, `POST /v1/flows/{id}/steps/edit` is shorter; the current list is `GET /v1/flows/{id}`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The flow's version as you read it; any other answers 409 and saves nothing. |
| `validateOnly` | `boolean` | no | Check this list against the flow and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a stale `version` — answers the status it always did. Default false. |
| `steps` | `object[]` | yes | Every step of the flow, in the order it runs. It replaces the stored list whole; to change a few steps, post edits to `POST /v1/flows/{id}/steps/edit` instead. |
| `typescript` | `object[]` | no | Expressions given as TypeScript instead of JSONata, read with `validateOnly: true` only (a save refuses this field): each place once, and not also in the other language. Nothing saves TypeScript: save the JSONata `fromTypeScript` answers in the step. |
| `python` | `object[]` | no | Expressions given as Python instead of JSONata, read with `validateOnly: true` only (a save refuses this field): each place once, and not also in the other language. Nothing saves Python: save the JSONata `fromPython` answers in the step. |

**Response `200`**

One of 2 shapes:

Shape 1, with `flowId`, `version`, `changes`, `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow's id. |
| `version` | `integer` | yes | The flow's version after this write; send it with the next. |
| `diagnostics` | `object[]` | yes | Warnings about the saved steps; a write with an error is refused instead. |
| `changes` | `object[]` | yes | Each step the write added, removed, changed or moved, by key. Empty when the list saved as it stood. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `at` | `string` | yes | Where the finding sits, as a key path from the flow: `steps[perMember].steps[settle].else.steps[notify].with.to`. Steps are named by key, never by position. |
| `fixes` | `object[]` | yes | The ready fixes, best first. Empty exactly when `decision` says what you must decide instead. |
| `decision` | `string \| null` | yes | When no edit clears this finding without changing what you wrote: the step, the field and what you must decide. Null exactly when `fixes` is not empty. |
| `editIndex` | `integer` | no | The 0-based index in `edits` of the edit refused; absent on a whole-list save. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | The step's key. |
| `change` | `"added" \| "removed" \| "changed" \| "moved"` | yes | What the write did to the step. `moved` means only its place changed: its parent block, branch or position. |
| `fields` | `object[]` | yes | Each field that changed, from and to. A move's fields sit under `place`. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Shape 2, with `ok`, `complete`, `expressions`, `pathExpressions`, `fromTypeScript`, `fromPython`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, each with where it sits and its fixes or the decision it needs. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `expressions` | `object[]` | yes | One entry per JSONata expression the steps hold, in written order, each step's function expressions first. Empty when the list does not parse. |
| `pathExpressions` | `object[]` | yes | Each path the steps read at a place that may hold an expression instead, with the expression that reads the same. |
| `fromTypeScript` | `object[]` | yes | One entry per `typescript` the request sent, in its order; empty when it sent none. |
| `fromPython` | `object[]` | yes | One entry per `python` the request sent, in its order; empty when it sent none. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `at` | `string` | yes | Where the finding sits, as a key path from the flow: `steps[perMember].steps[settle].else.steps[notify].with.to`. Steps are named by key, never by position. |
| `fixes` | `object[]` | yes | The ready fixes, best first. Empty exactly when `decision` says what you must decide instead. |
| `decision` | `string \| null` | yes | When no edit clears this finding without changing what you wrote: the step, the field and what you must decide. Null exactly when `fixes` is not empty. |
| `editIndex` | `integer` | no | The 0-based index in `edits` of the edit refused; absent on a whole-list save. |

Each item of `expressions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `typescript` | `string \| null` | yes | The expression as TypeScript: statements ending in `return`, with TypeScript's own spelling where it has one (`if`, loops, `.map`, `.filter`, `.startsWith`, templates) and JSONata's functions, and the platform's, called by name without the `$` (`round(x, 1)`), with nothing imported or defined. It means what the JSONata means: the engine runs the JSONata, and this text, edited and sent back as `typescript`, reads back to it. For reading and editing only: it is not saved. Null when the expression does not parse or uses a part with no TypeScript form, for example a function called on each item of a path (`xs.$string()`), a computed function call, `@`, `#`, grouping, a variable named like one of its inputs, or `or` / `and` with a literal on its right (`a or "y"`, always true), which TypeScript would read as a default. |
| `python` | `string \| null` | yes | The same expression as Python: statements ending in `return`, with Python's own spelling where it has one (`if`, loops, comprehensions, f-strings) and JSONata's functions, and the platform's, called by name (`round(x, 1)`; one Python names itself, such as `list`, is `list_`). It means what the JSONata means and, edited and sent back as `python`, reads back to it. Null whenever `typescript` is null for the expression itself, and also when a part has a TypeScript form but no Python one. |
| `formatted` | `string \| null` | yes | The same JSONata laid out the platform's way: each statement of a block on its own line, a call, list or object broken across lines only when it does not fit 80 columns, two spaces per level, every comment kept. It parses to exactly the expression the step holds — save it in its place to adopt the layout. Null when the expression does not parse. |
| `library` | `object[]` | yes | Each function the expression calls (JSONata's and the platform's), as the TypeScript names it, with its one line; empty when it calls none or `typescript` is null. |
| `pythonLibrary` | `object[]` | yes | The same functions as `library`, as the Python names them; empty when it calls none or `python` is null. |
| `path` | `string \| null` | yes | For an `{expr}` argument: the path that reads the same value, to write in its place as a bare string (`page.title`); null when no path does, and for a function's own expression or a test. |

Each item of `pathExpressions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the path is read, as a key path from the flow (`steps[mail].with.to`, `steps[perMember].each`). |
| `expression` | `string \| null` | yes | The JSONata expression that reads the same value, to write there as `{expr}`; null when the path has parts JSONata reads otherwise (`.first`, an index, `[distinct]`). |

Each item of `fromTypeScript`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `jsonata` | `string \| null` | yes | The JSONata the TypeScript reads back to, or null when it was refused. Every statement the edit left unchanged keeps the step's JSONata text there byte for byte, so an unedited text answers the expression itself. |
| `refusal` | `object \| null` | yes | Why there is no JSONata, with what to write instead; null when read back. The text does not parse; it reaches outside the expression (a request, files, the console, timers, the environment, async, a class, `try` / `except`, a callback changing an outer name); it uses a construct this function does not support or one that would run with another meaning (`==` in TypeScript, `x \|\| "default"` / `x or "default"`); it calls a function by an unknown name or with the wrong number of arguments; or its place holds no expression, or was sent twice, or in both languages. |

Each item of `fromPython`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `jsonata` | `string \| null` | yes | The JSONata the Python reads back to, or null when it was refused. Every statement the edit left unchanged keeps the step's JSONata text there byte for byte, so an unedited text answers the expression itself. |
| `refusal` | `object \| null` | yes | Why there is no JSONata, with what to write instead; null when read back. The text does not parse; it reaches outside the expression (a request, files, the console, timers, the environment, async, a class, `try` / `except`, a callback changing an outer name); it uses a construct this function does not support or one that would run with another meaning (`==` in TypeScript, `x \|\| "default"` / `x or "default"`); it calls a function by an unknown name or with the wrong number of arguments; or its place holds no expression, or was sent twice, or in both languages. |

### `POST /v1/flows/{id}/steps/{key}/evaluate`

Run one step's function on values you give in `values` or that a past run recorded (`fromRun`), and answer what it gives, how long it took and, for a transform, its size. The step is the saved one with this key, or the draft you send as `step`. Nothing is written and no vendor or model is called. Functions that read only their inputs run free at EDITOR; record reads (`record.list`, `record.read`, `record.query` without a meaning search) see the project's saved records, are billed as design-time work and need ADMIN; any other function is refused. A failure answers 200 with `ok: false`; a platform too busy to run the step answers 503 `STEP_EVALUATE_BUSY` with `Retry-After`, and the same request goes through later. A step of a platform flow is not evaluated. Render a prompt instead: `POST /v1/flows/{id}/steps/{key}/interpolate` (free) or `POST /v1/flows/{id}/steps/{key}/preview` (calls the model). Run the whole flow: `POST /v1/flows/{id}/preview`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id. |
| `key` | `string` | yes | The step's key in that flow. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `step` | `object` | no | The step as you are writing it, tried in place of the saved one — for a step you have not saved yet, or an edit you have not saved. Its `key` must be the key in the path. Leave it out to try the saved step. |
| `values` | `object` | no | The values to run the step on, keyed by the names it reads. Each must be a name the step reads, and a value for a flow input is checked against its declared type first. Send this or `fromRun`, not both. |
| `fromRun` | `string` | no | A past run of this flow whose recorded values to use instead of `values`. The run must have recorded its values, and none the step reads may have been cut short. |

**Response `200`**

One of 3 shapes:

Shape 1, with `value`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `true` | yes | The step ran and gave an answer. |
| `value` | `unknown` | yes | What the step gives: the value later steps read by its key. |
| `timeMs` | `integer` | yes | How long the evaluation took, in milliseconds. |
| `parts` | `integer` | no | For a transform: how many parts its expression has, counted against the limit on one expression. |

Shape 2, with `absent`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `true` | yes | The step ran and gave an answer. |
| `absent` | `true` | yes | The step gives nothing on these values. |
| `timeMs` | `integer` | yes | How long the evaluation took, in milliseconds. |
| `parts` | `integer` | no | For a transform: how many parts its expression has, counted against the limit on one expression. |

Shape 3, with `failure`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `false` | yes | The step failed on these values. |
| `failure` | `object` | yes | How the step failed, as a run would fail on these values. |
| `timeMs` | `integer` | yes | How long the evaluation took, in milliseconds. |

### `POST /v1/flows/{id}/steps/{key}/interpolate`

Render one step's prompt on values you give, with no model call: free, at EDITOR. The step is the saved one with this key, or the draft you send as `step`. The same render calling the model: `POST /v1/flows/{id}/steps/{key}/preview`. Run the step's function instead: `POST /v1/flows/{id}/steps/{key}/evaluate`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id. |
| `key` | `string` | yes | The step's key in that flow. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `step` | `object` | no | The step as you are writing it, tried in place of the saved one — for a step you have not saved yet, or an edit you have not saved. Its `key` must be the key in the path. Leave it out to try the saved step. |
| `values` | `object` | no | The values the step reads, keyed by name: a flow input, an earlier step's key, or a name a block gives. Unvalidated here: supply whatever the step would be given. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The step's prompt after interpolation, exactly what the model would receive. |
| `latencyMs` | `number` | yes | How long the render took, in milliseconds. |

### `POST /v1/flows/{id}/steps/{key}/preview`

Render one step's prompt on values you give and, when its function calls a model, call it once: billed, at ADMIN. Nothing else runs and nothing is saved. A step of a platform flow names the project it previews as in `project`. The free render: `POST /v1/flows/{id}/steps/{key}/interpolate`. The whole flow against real inputs: `POST /v1/flows/{id}/preview`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id. |
| `key` | `string` | yes | The step's key in that flow. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `step` | `object` | no | The step as you are writing it, tried in place of the saved one — for a step you have not saved yet, or an edit you have not saved. Its `key` must be the key in the path. Leave it out to try the saved step. |
| `project` | `string` | no | For a step of a platform flow: the node id of the project it previews as, which is required there, and the platform pays for the call. Refused for a step of a project's own flow. Requires EDITOR on that project. |
| `values` | `object` | no | The values the step reads, keyed by name: a flow input, an earlier step's key, or a name a block gives. Unvalidated here: supply whatever the step would be given. |
| `attachments` | `object` | no | Files to give the model beside the prompt, keyed by the name the step reads them under. Each value is the ids of files this project holds, in order — never storage keys. At most 12 files in all. |
| `modelId` | `string \| null` | no | Try a specific model instead of the one the step would use. Null or omitted uses the step's own `modelId`, else the default. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `interpolatedPrompt` | `string` | yes | The step's prompt after interpolation, exactly what the model receives. |
| `response` | `string \| null` | yes | What the model said. For a step whose function calls no model, the interpolated prompt instead. |
| `tokensIn` | `number \| null` | yes | Tokens sent. Null means no model was called, which is not a call that used zero. |
| `tokensOut` | `number \| null` | yes | Tokens returned. Null when no model was called. |
| `latencyMs` | `number` | yes | How long the preview took, in milliseconds. |

### `POST /v1/flows/{id}/steps/edit`

Apply a batch of edits to the flow's steps as one change, against the `version` you read: insert, move, set a field, remove, wrap steps in a block or unwrap one. All of them save or none. The result is checked as a whole list would be; a refusal answers 422 `VALIDATION_FAILED` with every finding in `details.diagnostics`, an edit that cannot apply naming its `editIndex`; a stale `version` answers 409, since edits are not idempotent. The `fixes` a finding carries are batches for this route. `validateOnly: true` answers the verdict and writes nothing, with the steps' expressions as TypeScript, and reads back any `typescript` or `python` sent. To replace the whole list: `PUT /v1/flows/{id}/steps`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The flow's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `version` | `integer` | yes | The flow's version as you read it; a batch against any other answers 409, since edits are not idempotent. |
| `validateOnly` | `boolean` | no | Check this batch against the stored steps and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a stale `version` — answers the status it always did. Default false. |
| `edits` | `object[]` | yes | The edits, applied in order as one batch: all of them save or none. At most 100; a bigger change is a whole-list `PUT …/steps`. A refusal names the edit by its index. |
| `typescript` | `object[]` | no | Expressions given as TypeScript instead of JSONata, read with `validateOnly: true` only (a save refuses this field): each place once, and not also in the other language. Nothing saves TypeScript: save the JSONata `fromTypeScript` answers in the step. |
| `python` | `object[]` | no | Expressions given as Python instead of JSONata, read with `validateOnly: true` only (a save refuses this field): each place once, and not also in the other language. Nothing saves Python: save the JSONata `fromPython` answers in the step. |

**Response `200`**

One of 2 shapes:

Shape 1, with `flowId`, `version`, `changes`, `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | yes | The flow's id. |
| `version` | `integer` | yes | The flow's version after this write; send it with the next. |
| `diagnostics` | `object[]` | yes | Warnings about the saved steps; a write with an error is refused instead. |
| `changes` | `object[]` | yes | Each step the write added, removed, changed or moved, by key. Empty when the list saved as it stood. |
| `touched` | `object[]` | yes | Rows of OTHER resources whose `version` this write moved, with the version each holds now. Empty when the write moved only the resource it addressed. Update the copies you hold before their next PATCH. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `at` | `string` | yes | Where the finding sits, as a key path from the flow: `steps[perMember].steps[settle].else.steps[notify].with.to`. Steps are named by key, never by position. |
| `fixes` | `object[]` | yes | The ready fixes, best first. Empty exactly when `decision` says what you must decide instead. |
| `decision` | `string \| null` | yes | When no edit clears this finding without changing what you wrote: the step, the field and what you must decide. Null exactly when `fixes` is not empty. |
| `editIndex` | `integer` | no | The 0-based index in `edits` of the edit refused; absent on a whole-list save. |

Each item of `changes`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `stepKey` | `string` | yes | The step's key. |
| `change` | `"added" \| "removed" \| "changed" \| "moved"` | yes | What the write did to the step. `moved` means only its place changed: its parent block, branch or position. |
| `fields` | `object[]` | yes | Each field that changed, from and to. A move's fields sit under `place`. |

Each item of `touched`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `resource` | `string` | yes | Which design resource the row belongs to, spelled as the bootstrap read spells its sections — `tables`, `types`, `relations`, … — or, for `terms`, which the bootstrap does not carry, as its route does (`/v1/terms/{id}`). |
| `id` | `string` | yes | The row's id. |
| `version` | `integer` | yes | The row's optimistic-lock version AFTER this write. Replace the version you cached for this row with it; a PATCH sent with the old one is refused with 409. |

Shape 2, with `ok`, `complete`, `expressions`, `pathExpressions`, `fromTypeScript`, `fromPython`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, each with where it sits and its fixes or the decision it needs. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `expressions` | `object[]` | yes | One entry per JSONata expression the steps hold, in written order, each step's function expressions first. Empty when the list does not parse. |
| `pathExpressions` | `object[]` | yes | Each path the steps read at a place that may hold an expression instead, with the expression that reads the same. |
| `fromTypeScript` | `object[]` | yes | One entry per `typescript` the request sent, in its order; empty when it sent none. |
| `fromPython` | `object[]` | yes | One entry per `python` the request sent, in its order; empty when it sent none. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |
| `at` | `string` | yes | Where the finding sits, as a key path from the flow: `steps[perMember].steps[settle].else.steps[notify].with.to`. Steps are named by key, never by position. |
| `fixes` | `object[]` | yes | The ready fixes, best first. Empty exactly when `decision` says what you must decide instead. |
| `decision` | `string \| null` | yes | When no edit clears this finding without changing what you wrote: the step, the field and what you must decide. Null exactly when `fixes` is not empty. |
| `editIndex` | `integer` | no | The 0-based index in `edits` of the edit refused; absent on a whole-list save. |

Each item of `expressions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `typescript` | `string \| null` | yes | The expression as TypeScript: statements ending in `return`, with TypeScript's own spelling where it has one (`if`, loops, `.map`, `.filter`, `.startsWith`, templates) and JSONata's functions, and the platform's, called by name without the `$` (`round(x, 1)`), with nothing imported or defined. It means what the JSONata means: the engine runs the JSONata, and this text, edited and sent back as `typescript`, reads back to it. For reading and editing only: it is not saved. Null when the expression does not parse or uses a part with no TypeScript form, for example a function called on each item of a path (`xs.$string()`), a computed function call, `@`, `#`, grouping, a variable named like one of its inputs, or `or` / `and` with a literal on its right (`a or "y"`, always true), which TypeScript would read as a default. |
| `python` | `string \| null` | yes | The same expression as Python: statements ending in `return`, with Python's own spelling where it has one (`if`, loops, comprehensions, f-strings) and JSONata's functions, and the platform's, called by name (`round(x, 1)`; one Python names itself, such as `list`, is `list_`). It means what the JSONata means and, edited and sent back as `python`, reads back to it. Null whenever `typescript` is null for the expression itself, and also when a part has a TypeScript form but no Python one. |
| `formatted` | `string \| null` | yes | The same JSONata laid out the platform's way: each statement of a block on its own line, a call, list or object broken across lines only when it does not fit 80 columns, two spaces per level, every comment kept. It parses to exactly the expression the step holds — save it in its place to adopt the layout. Null when the expression does not parse. |
| `library` | `object[]` | yes | Each function the expression calls (JSONata's and the platform's), as the TypeScript names it, with its one line; empty when it calls none or `typescript` is null. |
| `pythonLibrary` | `object[]` | yes | The same functions as `library`, as the Python names them; empty when it calls none or `python` is null. |
| `path` | `string \| null` | yes | For an `{expr}` argument: the path that reads the same value, to write in its place as a bare string (`page.title`); null when no path does, and for a function's own expression or a test. |

Each item of `pathExpressions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the path is read, as a key path from the flow (`steps[mail].with.to`, `steps[perMember].each`). |
| `expression` | `string \| null` | yes | The JSONata expression that reads the same value, to write there as `{expr}`; null when the path has parts JSONata reads otherwise (`.first`, an index, `[distinct]`). |

Each item of `fromTypeScript`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `jsonata` | `string \| null` | yes | The JSONata the TypeScript reads back to, or null when it was refused. Every statement the edit left unchanged keeps the step's JSONata text there byte for byte, so an unedited text answers the expression itself. |
| `refusal` | `object \| null` | yes | Why there is no JSONata, with what to write instead; null when read back. The text does not parse; it reaches outside the expression (a request, files, the console, timers, the environment, async, a class, `try` / `except`, a callback changing an outer name); it uses a construct this function does not support or one that would run with another meaning (`==` in TypeScript, `x \|\| "default"` / `x or "default"`); it calls a function by an unknown name or with the wrong number of arguments; or its place holds no expression, or was sent twice, or in both languages. |

Each item of `fromPython`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `at` | `string` | yes | Where the expression sits, as a key path from the flow, the way a finding's `at` names it: a function's own expression (`steps[shape].with.expression`, `steps[make].with.fields.title`), an `{expr}` argument (`steps[mail].with.to`, `steps[perMember].each`, `steps[done].return.total`), or an expression test (`steps[check].if[0].test.and[1].expr`). |
| `jsonata` | `string \| null` | yes | The JSONata the Python reads back to, or null when it was refused. Every statement the edit left unchanged keeps the step's JSONata text there byte for byte, so an unedited text answers the expression itself. |
| `refusal` | `object \| null` | yes | Why there is no JSONata, with what to write instead; null when read back. The text does not parse; it reaches outside the expression (a request, files, the console, timers, the environment, async, a class, `try` / `except`, a callback changing an outer name); it uses a construct this function does not support or one that would run with another meaning (`==` in TypeScript, `x \|\| "default"` / `x or "default"`); it calls a function by an unknown name or with the wrong number of arguments; or its place holds no expression, or was sent twice, or in both languages. |

### `GET /v1/flows/conditions`

Every condition an `if` branch or a `repeat`'s `until` can test, and what each takes. The same for every caller of a deployment. A flow's steps, which hold the conditions: `GET /v1/flows/{id}`.

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `conditions` | `object[]` | yes | Every condition an `if` branch or a `repeat`'s `until` can test. Every one that reads a value is false when that value is missing; `not` turns that around. |

Each item of `conditions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | `string` | yes | The condition's name: the one key of its object, as in `{eq: [a, b]}`. Treat the list as open: a newer deployment may add one. |
| `takes` | `"value" \| "value-pair" \| "value-and-pattern" \| "expression" \| "conditions" \| "condition"` | yes | What follows the name: `value` one argument; `value-pair` the value tested, then the one it is compared with; `value-and-pattern` a value, then a regular expression as text; `expression` a JSONata expression; `conditions` a list of conditions; `condition` one condition. |
| `holds` | `string` | yes | When it holds, in one line safe to show a person. |
