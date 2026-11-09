# Answers: what every build asks

Read this right after `quickstart-document.md`. Each answer is the shape to copy and where the detail lives; names are the example project's (`task`, `create-task`, `notify-due`). For anything else, run `kipory docs <words>` (the `kipory` command in `kipory-connect`).

<!-- field-ok: readAfter — the paging input a flow declares for its `record.view` action `read`, named after the action -->
<!-- field-ok: readBefore — the paging input a flow declares for its `record.view` action `read`, named after the action -->
<!-- field-ok: readLimit — the paging input a flow declares for its `record.view` action `read`, named after the action -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

## How does an endpoint answer 404, 409, 422 or another status?

- **404:** `record.read` with `"failIfEmpty": true` answers `404 RECORD_NOT_FOUND` when the id isn't there, or belongs to another person on a per-user table: `{"functionKey": "record.read", "functionConfig": {"tableKey": "task", "ids": {"expr": "[taskId]"}, "failIfEmpty": true}, "outputSlot": "tasks"}`.
- **422 with your message:** `$assert(condition, "message")` in a `value.transform` answers `422 VALIDATION_FAILED` carrying the message. To pass the value on: `($assert($length(title) <= 200, "title is too long"); title)`.
- **409:**
  - a `record.create` whose `key` field another record holds answers `409 RECORD_NATURAL_KEY_TAKEN` (with `onKeyTaken: "refuse"`, the default);
  - a `record.update` with `"requireStatus": "READY", "failIfPreconditionUnmet": true` answers 409 when nothing matched.
- **A status you choose** (401, 403, 404, 409, 410, 413, 415, 422, 429): a `request.refuse` action with a `condition`. It stops the run, keeps nothing it wrote, and needs no `outputSlot`; the caller gets that status with your `code` as `details.reason`: `{"functionKey": "request.refuse", "functionConfig": {"status": 409, "code": "THING_LOCKED", "message": {"literal": "Unlock it first."}}, "condition": {"op": "slotEquals", "slot": "locked", "value": true}}`. Fixed text is `{"literal": …}`; a bare string would be read as a slot.
- **A public endpoint** (`auth: "none"`) spends up to the project's `publicSpendCapCredits` a UTC day; spent, each public call answers `402 PUBLIC_ENDPOINT_UNAVAILABLE` until midnight. Size it for a day of calls and tests (`endpoint-answers.md`).
- **Success** is `successStatus` on the endpoint: 200, 201, 202, 204 (no body) or 206; `statusOutput` names a number output to pick it per call.
- **A redirect** is `"redirect": {"location": "url"}` on `contractConfig` (302 unless `status` says 301, 303, 307 or 308), `url` being a string output. `headers` sets response headers from outputs. Both, like `statusOutput`, only on a synchronous `flow.invoke`. Detail: `kipory-expose`'s `references/packs/api-endpoints-anatomy.md`.

## How does a flow know who is calling?

- **The caller's id** is `userInfo.userId` in an expression (`$$.userInfo.userId` inside a `[…]` filter). `userInfo` holds `userId`, plus `profile` when the project has one. A key's call, a schedule and a trigger have no `userInfo`.
- **Mostly you don't need it.** `"ownerScope": "user"` on a table makes every row its creator's: reads see only the caller's rows, and another person's id reads as missing. Write no owner field and no owner filter. `"ownerScope": "project"` rows are shared by everyone in the project.
- **Sharing a record: use the built-in, not a table of shares.** `"sharing": true` on a `"user"` table; `record.grant` (the record id, then a person's id or a team record's id) with `"level"` `read` < `write` < `delete` < `manage` (shares onward). A team is a record its people are granted `"level": "member"` on. Reads then answer shared records too, each with `access` (`owner`, `read`, …): `record.read` with `failIfEmpty` answers a stranger 404, and an act beyond the level answers 403 by itself. Check it (404, then 403 by `access`) before records a request names (`endpoint-answers.md` §8); `whose`, `record.grants`: `kipory-data`'s `references/sharing-records.md`.

## How do I search, order and page a list?

- **A list endpoint is a view.** `views.openTasks` is the read; `list-open-tasks` is one `record.view` action; its `GET` endpoint declares only its path. The query takes the view's params (`?projectId=`, optional: absent reads everything) and pages by `?after=` / `?limit=`. The flow declares the paging inputs `readAfter`, `readBefore`, `readLimit` (named after the action `read`). A view's fixed text is `{ "literal": … }`; it reads no slot and no clock, so "due after now" is a flow (`notify-due`), not a view. **A view orders by `created`, meaning, or a field with a `filter` use**: a date, number, true/false, or text with `maxLength` of at most 500 (`QUERY_ORDER_TEXT_UNBOUNDED` otherwise). For "highest first" on a number, order the view: `{ "by": "field", "field": "total", "direction": "desc" }`.
- **A view endpoint answers** `{ items, nextCursor, prevCursor, paging: null }`; walk forward with `?after=<nextCursor>`. **A view's cursor belongs to the params it was read with**: the next page sends the same params, or it is `400 VIEW_CURSOR_INVALID`. So never feed a view a param that changes between pages: "upcoming from now" is a flow with `record.query`, a `gte` clause on `runInfo.now`, an `order`, and its `cursor` setting taken from the caller's `?cursor=` (answer its `nextCursor`). And keep one read per list: a cursor from one read never pages another, and a `cursor` set to another read's `nextCursor` answers an empty page once that list ends (a flow input left empty is page one); still, read once with `limit` × `pages.max`. A view param is never named `after`, `before` or `limit`.
- **Text search** is a `contains` clause, which ignores case and needs at least 3 characters (shorter is refused): on a view, `{"kind": "field", "field": "name", "op": "contains", "param": "q"}`; in a flow, `record.query` with `"clauses": [{"kind": "field", "field": "name", "op": "contains", "value": "q"}]`. The field needs a `filter` use. The other operators are `eq`, `lt`, `lte`, `gt`, `gte`, `in`, `not-in`.
- **A list stays a list only when you say so.** JSONata turns an empty result into no value and a one-item list into the item: a record field typed `array` then refuses the write (`RECORD_DATA_INVALID`, "expected array, received string"), and a required output left with no value refuses the whole call (`422 FLOW_OUTPUT_MISSING`). Wrap every list an expression builds in `$list(…)`, for a record's field or an output; and give an output list an object around it (`{'items': $list(…)}`, the flow output typed `object`). Try it with one item and with none.

## How does an endpoint pass the request to the flow?

- **`inputs`** maps each flow input to `{"from": "body"}` (the body field of the same name), `{"from": "path.id"}`, `{"from": "query"}` (the query parameter named like the input) or `{"from": "query.q"}`. `{"from": "header.x-signature"}` and `{"from": "rawBody"}` feed `request.verify-signature` for a signed webhook.
- **A path parameter is declared and required:** `"params": {"id": {"in": "path", "type": "string", "required": true}}`.
- **Params go where the contract says:** `{id}` in the path, a GET's rest in the query.
- **A query or path value takes the type of the input it feeds.** Bound to a `number`, `integer` or `boolean` input, `?limit=20` arrives as `20`; a value that doesn't read as that type (`?limit=x`) is refused 422 before the run, and so is one outside its type's bounds.

## How do I write something once, or count safely?

- **On a project-wide table (`"ownerScope": "project"`), identical data is one record.** A `record.create` there is keyed by its content as first written: two creates with the same fields give one record. Rows of the people who sign in belong on `"ownerScope": "user"` tables, which keep them apart (a run for nobody writes them only for a person named in `userId`). Other rows that may repeat carry a field that tells them apart: `'ref': runInfo.nonce` differs per run, not per create.
- **Once:** give the field a `key` use (`{"source": {"family": "submission", "field": "taskId"}, "uses": ["key"]}`), then `record.create` with `"onKeyTaken": "skip"`. When the record already exists (another record holds the key, or, on a project-wide table, the same data was already written), the create adds nothing and answers `keyTaken: true` with that record's `recordId`. Gate a mail on it: `$not($exists(created.keyTaken) and created.keyTaken) ? {…}`. Two runs of a job at once send once too: the later save is refused, and that run starts again and answers `keyTaken`. Two identical items in one fan-out can both send: keep items distinct.
- **Calls at once on one record:** read it and update it. A save that another call's change refused waits its turn and runs again, so parallel calls apply one by one (`409` with `Retry-After` once its time or 4 runs are spent); write no lock or retry. A find-or-create two calls race creates with `"onKeyTaken": "skip"`, then updates: a plain create answers a final `409 RECORD_NATURAL_KEY_TAKEN`.
- **A counter:** `record.update` with `"add": {"views": {"literal": 1}}` adds inside the save, so two runs at once both count without waiting.

## What can an expression read about the run?

`runInfo.now` (an ISO time), `runInfo.nonce` and `runInfo.requestId`, always; `runInfo.recordId` and `runInfo.tableKey` on a record's processing run. JSONata's `$now()` and `$random()` are refused.

## How do I try a scheduled job, or a flow as a person?

`kipory preview notify-due --as alice` runs the flow in the sandbox as that test user, saving nothing, and prints what each action wrote: how a daily job is rehearsed (a schedule never runs as a test user).

## How does one flow call another, or a model?

- **A sub-flow:** `flow.invoke` with `"functionConfig": {"target": "write-brief", "inputs": {"points": "allPoints"}, "outputs": [{"subFlowSlot": "brief", "parentSlot": "draft"}]}` (`patterns.md`, sub-flow).
- **A model:** `text.generate` takes `taskKey`, `promptTemplate` and `outputSchema` on the action itself, not in `functionConfig`. A yes/no or a pick is `text.decide`.

## What about inputs, fan-outs and changing what an endpoint serves?

- **Leave `inputStreams` out** everywhere but on `flow.fan-out`: the save derives each action's inputs from what its settings, expression or prompt read. A fan-out states its one input as stream and path (`"inputStreams": ["found.records"]` is read that way).
- **One run fans out over at most 1,000 items** (the project's `runs.fan-out-items`). Handed more, the fan-out runs none and fails with `FAN_OUT_OVER_LIMIT`; the plan warns `FANOUT_MAY_PASS_LIMIT` when a read can return more. Size the read (`limit` × `pages.max`) to the limit; a longer job continues page by page with `flow.continue` (`fan-out.md`): one per flow, after the fan-out's `flow.merge`, in a flow a schedule or trigger starts directly — it refuses a run that acts for a person, so not under `flow.start-per-person` (`START_NEEDS_NO_PERSON`), and refuses inside a sub-flow. Leave `maxItems` out unless you mean to cut the list: items past it are dropped.
- **Changing a type or a flow that an endpoint serves**: a change that only adds optional fields is adopted by the plan for every endpoint serving it (`DOCUMENT_ADOPTED_ADDITIVE`). Any other change — a field removed, retyped or made required — is refused `TYPE_RESHAPES_BOUND_SNAPSHOTS` / `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` until the row you change carries `"adoptSnapshots": true`.
- **A type that names another type** uses `{"$ref": "#/$defs/<the type's id>"}`, an id, not a key: create the named type first. A list field in a type is JSON Schema's `"type": "array"`; a list flow input is `"isList": true`.
