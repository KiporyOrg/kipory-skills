# Answers: what every build asks

Read this after `quickstart-document.md`. Each answer is the shape to copy and where the detail lives; names are the example project's (`task`, `create-task`, `notify-due`). For more, run `kipory docs <words>` (the `kipory` command in `kipory-connect`).

<!-- field-ok: readAfter — a paging input named after the step `read` -->
<!-- field-ok: readBefore — a paging input named after the step `read` -->
<!-- field-ok: readLimit — a paging input named after the step `read` -->
<!-- field-ok: userInfo — a run-ambient value, not a request field -->
<!-- field-ok: runInfo — a run-ambient value, not a request field -->

## How does an endpoint answer 404, 409, 422 or another status?

- **404:** `record.read` with `"failIfEmpty": true` answers `404 RECORD_NOT_FOUND` when the id isn't there, or belongs to another person on a per-user table: `{"key": "tasks", "function": "record.read", "with": {"tableKey": "task", "ids": {"expr": "[taskId]"}, "failIfEmpty": true}}`.
- **422 with your message:** a `fail` step, under an `if` whose test says when: `{"key": "tooLong", "fail": {"code": "TITLE_TOO_LONG", "message": "The title is too long.", "status": 422}}` answers `422 VALIDATION_FAILED` with your message and `details.reason: TITLE_TOO_LONG`.
- **409:**
  - a `record.create` whose `key` field another record holds answers `409 RECORD_NATURAL_KEY_TAKEN` (with `onKeyTaken: "refuse"`, the default);
  - a `record.update` with `"requireStatus": "READY", "failIfPreconditionUnmet": true` answers 409 when nothing matched.
- **A status you choose:** the same `fail` step with another `status`, any 4xx but 405, 408 and 426. It stops the run and keeps nothing it wrote; the caller gets the platform's word for the status (`FORBIDDEN`, `CONFLICT`, …), or `REQUEST_REFUSED` for one with no word of its own (400, 402, 418), with your `code` as `details.reason`.
- **A public endpoint** (`auth: "none"`) spends up to `publicSpendCapCredits` a UTC day, then answers `402 PUBLIC_ENDPOINT_UNAVAILABLE` (`endpoint-answers.md`).
- **Success** is `successStatus` on the endpoint: 200, 201, 202, 204 (no body) or 206; `statusOutput` names a number output to pick it per call.
- **A redirect** is `"redirect": {"location": "url"}` on `contractConfig` (302 unless `status` says 301, 303, 307 or 308), `url` being a string output. `headers` sets response headers from outputs. Both, like `statusOutput`, only on a synchronous `flow.invoke`. Detail: `kipory-expose`'s `references/packs/api-endpoints-anatomy.md`.

## How does a flow know who is calling?

- **The caller's id** is `userInfo.userId` in an expression (`$$.userInfo.userId` inside a `[…]` filter). `userInfo` holds `userId`, plus `profile` when the project has one. A key's call, a schedule and a trigger have no `userInfo`.
- **Mostly you don't need it.** `"ownerScope": "user"` on a table makes every row its creator's: reads see only the caller's rows, and another person's id reads as missing. Write no owner field and no owner filter. `"ownerScope": "project"` rows are shared by the whole project.
- **Sharing a record: use the built-in, not a table of shares.** `"sharing": true` on a `"user"` table; `record.grant` (the record id, then a person's id or a team record's id) with `"level"` `read` < `write` < `delete` < `manage` (shares onward). A team is a record its people are granted `"level": "member"` on. Reads then answer shared records too, each with `access` (`owner`, `read`, …): `record.read` with `failIfEmpty` answers a stranger 404, and an act beyond the level answers 403 by itself. Check it (404, then 403 by `access`) before records a request names (`endpoint-answers.md` §8); `whose`, `record.grants`: `kipory-data`'s `references/sharing-records.md`.

## How do I search, order and page a list?

- **A list endpoint is a view.** `views.openTasks` reads; `list-open-tasks` is one `record.view` step; its `GET` endpoint declares only its path. The query takes the view's params (`?projectId=`, optional: absent reads everything) and pages by `?after=` / `?limit=`. The flow declares the paging inputs `readAfter`, `readBefore`, `readLimit` (named after the step `read`). A view's fixed text is `{ "literal": … }`; it reads no flow value and no clock, so "due after now" is a flow (`notify-due`), not a view. **A view orders by `created`, meaning, or a field with a `filter` use**: a date, number, true/false, or text with `maxLength` of at most 500 (`QUERY_ORDER_TEXT_UNBOUNDED` otherwise). For "highest first" on a number, order the view: `{ "by": "field", "field": "total", "direction": "desc" }`.
- **A view endpoint answers** `{ items, nextCursor, prevCursor, paging: null }`; walk forward with `?after=<nextCursor>`. **A view's cursor belongs to the params it was read with**: the next page sends the same params, or it is `400 VIEW_CURSOR_INVALID`. So never feed a view a param that changes between pages: "upcoming from now" is a flow with `record.query`, a `gte` clause on `runInfo.now`, an `order`, and its `cursor` setting taken from the caller's `?cursor=` (answer its `nextCursor`). And keep one read per list: a cursor from one read never pages another, and a `cursor` set to another read's `nextCursor` answers an empty page once that list ends (a flow input left empty is page one); still, read once with `limit` × `pages.max`. A view param is never named `after`, `before` or `limit`.
- **Text search** is a `contains` clause, which ignores case and needs at least 3 characters (shorter is refused): on a view, `{"kind": "field", "field": "name", "op": "contains", "param": "q"}`; in a flow, `record.query` with `"clauses": [{"kind": "field", "field": "name", "op": "contains", "value": "q"}]`. The field needs a `filter` use. The other operators are `eq`, `lt`, `lte`, `gt`, `gte`, `in`, `not-in`.
- **A list stays a list only when you say so.** JSONata turns an empty result into no value and a one-item list into the item: a record field typed `array` then refuses the write (`RECORD_DATA_INVALID`, "expected array, received string"), and a `return` that gives a required output nothing fails the call (`502 FLOW_FAILED`, `OUTPUT_TYPE_MISMATCH`). Wrap every list an expression builds in `$list(…)`, for a record's field or an output; and give an output list an object around it (`{'items': $list(…)}`, the flow output typed `object`).

## How does an endpoint pass the request to the flow?

- **`inputs`** maps each flow input to `{"from": "body"}` (the body field of the same name), `{"from": "path.id"}`, `{"from": "query"}` (the query parameter named like the input) or `{"from": "query.q"}`. Every query parameter is declared in `params` too, or the plan refuses the binding (`ENDPOINT_INPUT_UNSATISFIED`): `"params": {"limit": {"in": "query", "type": "string", "required": false}}`. `{"from": "header.x-signature"}` and `{"from": "rawBody"}` feed `request.verify-signature` for a signed webhook.
- **A path parameter is declared and required:** `"params": {"id": {"in": "path", "type": "string", "required": true}}`. A param's `type` is always `"string"`; the input it feeds types the value.
- **Params go where the contract says:** `{id}` in the path, a GET's rest in the query.
- **A query or path value takes the type of the input it feeds.** An input's `typeName` is `string`, `number`, `boolean`, `file`, `object`, `probability`, a library or project type (no `integer`; a list is `isList: true`). Fed to a `number` input, `?limit=20` is `20`; a value that isn't that type (`?limit=x`) is a 422 before the run, and so is one outside its type's bounds.

## How do I write something once, or count safely?

- **On a project-wide table (`"ownerScope": "project"`), identical data is one record.** A `record.create` there is keyed by its content as first written: two creates with the same fields give one record. People's rows belong on `"ownerScope": "user"` tables, which keep them apart (a run for nobody writes them only for a person named in `userId`). Other rows that may repeat carry a field that tells them apart: `'ref': runInfo.nonce` differs per run, not per create.
- **Once:** give the field a `key` use (`{"source": {"family": "submission", "field": "taskId"}, "uses": ["key"]}`), then `record.create` with `"onKeyTaken": "skip"`. When the record already exists (another record holds the key, or, on a project-wide table, the same data was already written), the create adds nothing and answers `keyTaken: true` with that record's `recordId`. Put the mail in an `if` whose test is `{"not": {"eq": ["created.keyTaken", true]}}` (a test on nothing is false, so `not` holds without `keyTaken`). Two runs of a job at once send once too: the later save is refused, and that run starts again and answers `keyTaken`. Two identical elements in one `each` can both send: keep the list distinct.
- **Calls at once on one record:** read and update it. A save another call's change refused waits its turn and runs again, so parallel calls apply in turn (`409` + `Retry-After` past its time or 4 runs); add no lock or retry. A quota by `record.count` or `record.aggregate` holds. A losing find-or-create runs again and updates; one with no lookup answers a final `409 RECORD_NATURAL_KEY_TAKEN`.
- **A counter:** `record.update` with `"add": {"views": {"literal": 1}}` adds inside the save, so two runs at once both count.

## What can an expression read about the run?

`runInfo.now` (an ISO time), `runInfo.nonce` and `runInfo.requestId`, always; `runInfo.recordId` and `runInfo.tableKey` on a record's processing run. `$now()` and `$random()` are refused: use those.

## How do I try a scheduled job, or a flow as a person?

`kipory preview notify-due --as alice` runs the flow as that test user, printing each write; it keeps none unless `--apply` and sends no mail or `url.send`: how a daily job is rehearsed (a schedule never runs as a test user).

## How does one flow call another, or a model?

- **A sub-flow:** a `flow.invoke` step, `{"key": "draft", "function": "flow.invoke", "with": {"flow": "write-brief", "inputs": {"points": "allPoints"}}}`: `flow` is the called flow's key, `inputs` maps its input names to arguments, and its outputs are read as `draft.<output>` (`patterns.md`, sub-flow).
- **A model:** a `text.generate` step's `with` holds `prompt` (and `system`), `task` — the AI task it runs as, whose model the project's routing picks (left out, `extraction`) — and, for a typed answer, `outputSchema` naming a type by key (`models.md`). A yes/no or a pick is `text.decide`.

## What about long lists and changing what an endpoint serves?

- **One `each` goes through at most 1,000 elements** (the project's `runs.each-items`). Handed more, it runs none and fails with `FAN_OUT_OVER_LIMIT`; the plan warns `EACH_MAY_PASS_LIMIT` when a read can return more. Size the read (`limit` × `pages.max`) to the limit; a longer job continues page by page with `flow.continue` (`fan-out.md`): one per flow, after the `each`, never inside an `each` or `repeat`, in a flow a schedule or trigger starts directly — it refuses a run that acts for a person, so not under `flow.start-per-person` (`START_NEEDS_NO_PERSON`), and refuses inside a sub-flow. `maxItems` is a guard, not a cut: a longer list fails `EACH_OVER_MAX_ITEMS`; to take the first n, slice where the list is made (`$slice(found.records, 0, 50)`).
- **Changing a type or a flow that an endpoint serves**: a change that only adds optional fields is adopted by the plan for every endpoint serving it (`DOCUMENT_ADOPTED_ADDITIVE`). Any other change — a field removed, retyped or made required — is refused `TYPE_RESHAPES_BOUND_SNAPSHOTS` / `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` until the row you change carries `"adoptSnapshots": true`.
- **A type that names another type** uses `{"$ref": "#/$defs/<the type's id>"}`, an id, not a key: create the named type first. A list field in a type is JSON Schema's `"type": "array"`; a list flow input is `"isList": true`.
