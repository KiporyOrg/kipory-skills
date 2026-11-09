# A view in a flow, and its endpoint

<!-- field-ok: shelfLimit — an example of a step-named paging input, a project-authored name -->
<!-- field-ok: genre — one project's example field name, not a platform field -->
<!-- field-ok: myShelf — one project's example view key, not a platform field -->

The rest of §11: `views.md` declares the view; this page reads it from a flow and serves it from an endpoint.

### `record.view` in a flow

<!-- field-ok: readAfter — a flow input a project names, after its `record.view` step `read` -->
<!-- field-ok: readBefore — a flow input a project names, after its `record.view` step `read` -->
<!-- field-ok: readLimit — a flow input a project names, after its `record.view` step `read` -->
<!-- field-ok: readShelfAfter — a flow input a project names, after its `record.view` step `readShelf` -->
<!-- field-ok: readShelf — a step key a project names, not a platform field -->

`with` is `{ view: <key> }`. The step reads the flow's inputs named like the view's params, and its own paging inputs, named after the step's key: for the step `read`, `readAfter` (or `readBefore`) and `readLimit` (1 to `pageSize.max`); for `readShelf`, `readShelfAfter` and so on. So two `record.view` steps in one flow page independently, each by its own cursor. The flow declares an optional input of each of those names it exposes; the step runs even when every one of them is absent. A view's params come only from the flow's inputs: a param named like a step's key is refused at the save (`VIEW_PARAM_FROM_ACTION`; filter by a computed value with an inline `record.query`), and so is a param with no `default` that is not `optional` when the flow has no input of its name (`VIEW_PARAM_NO_INPUT`). The inputs named like the view's params count as read: removing one, or renaming it, is refused while the view reads it (`REMOVED_STILL_USED`). A paging input is optional: removing it only warns, and the step then pages by the view's `pageSize.default`. A step key named like a paging input (`shelfLimit` for the step `shelf`) is refused the same way. An `optional` param that no input of the flow feeds is saved with a warning (`VIEW_PARAM_OPTIONAL_NO_INPUT`): the read never narrows by it. Rename a param in the view and the flow's input together. The step's value is `{ records, nextCursor?, prevCursor? }`, or `{ record? }` for a `one` view; type the flow output that carries the whole page `object`, and one that carries only `read.records` a list, `isList: true`. It reads with `record.query`'s engine and is billed as one step. Read the page in a later step as you would `record.query`'s (`read.records`) — a flow that computes over the page is still a flow; it is just not a view endpoint (below).

**Who it reads as.** A `scope: "caller"` view reaching a person-owned table needs a signed-in person. The plan refuses `VIEW_CALLER_WITHOUT_PERSON`, naming the start, the flow, the view and the table, when a flow that reads such a view — directly, through `flow.invoke`, or inside an `if` branch — can start with no person: a schedule, a trigger, processing of a project-owned table, an eval suite with no run-as member. Processing of a person-owned table (it runs as the record's owner), `flow.start-per-person` and a credentialed endpoint called with a session start with one. An `auth: "none"` endpoint over such a flow is refused `PUBLIC_ENDPOINT_NEEDS_USER`, naming the view; serve the public part from a `scope: "project"` view. An API key calling a credentialed endpoint over it gets `403` before any read, as for any per-user read ([endpoint-answers.md](endpoint-answers.md), §8).

### A view endpoint: declare the path, nothing else

A `GET`, synchronous `flow.invoke` endpoint whose answer — `responseBody`, or the flow's only output — is a `record.view` page returned unchanged is a **view endpoint**. Its contract is derived from the view at save:

- **Declare no query params and no `inputs`.** The query takes the view's params, typed and bounded as declared, plus `after`, `before` and `limit`. A param binds the flow input of the same name; `after`, `before` and `limit` bind the answering step's own paging inputs (`readAfter`, `readBefore`, `readLimit` for the step `read`). A path parameter (`{id}` above) is declared as today and feeds the param of its name. A flow input typed otherwise than the view gives it is refused `VIEW_INPUT_TYPE`.
- **Never declare `after`, `before` or `limit` in the contract.** An endpoint that does — or an asynchronous one — is not a view endpoint: it keeps the contract it declares, and the plan warns `VIEW_ENDPOINT_NOT_DERIVED` naming why.
- **The answer** is `{ items, nextCursor, prevCursor, paging: null }`, cursors `string | null`: walk forward with `?after=<nextCursor>` and back with `?before=<prevCursor>`. A view ranked by meaning takes no cursor and answers both `null`. A `one` view answers the record itself, and the same `404 NOT_FOUND` for a record that does not exist and one the caller may not read.
- **Refusals**: an unknown query key, a value of the wrong type, out of bounds or missing, `?limit=` past `pageSize.max` — `422 VALIDATION_FAILED` naming it. A cursor from another view, another person or other params — `400 VIEW_CURSOR_INVALID`, never another read's rows.
- **A view, shape or flow edit** re-derives the endpoint in the same apply; the plan lists it as an `update` of `surfaces.endpoints.<key>`, with `published.query.<param>` for a param renamed, retyped, added or removed.
- **An endpoint whose flow edits the page** (a transform counting or reshaping it) is an ordinary endpoint and answers exactly what its flow outputs.

**ETag.** A view endpoint whose flow is exactly one enabled `record.view` step and its `return`, every input from the request, over a view that reads only fields and links — no `term`, `stream` or `semantic` clause anywhere in it, its sets, base or linked reads, no vocabularies, no file field — answers an `ETag`. Send it back as `If-None-Match`: while nothing the answer depends on changed (the records and links of every table the view reads, the project's configuration, the caller, the params, the page), the answer is `304` with no body, no run and no charge. Add a guard or any other step and the endpoint still pages by the view but answers no ETag. Every view-endpoint answer carries `Vary: Authorization, Cookie, Accept` (`Accept: text/event-stream` asks for a live stream instead); a `200` or a `304` also carries `Cache-Control: private, no-cache` and the `ETag`; a refusal carries neither. The project's OpenAPI document says which operations answer `304`.

### Try a view before a flow uses it

`POST /v1/views/{key}/preview?project=<id>` with `{ "asUserId": <a member>, "params": { "genre": "poetry" }, "limit": 5 }` reads an applied view as that member — `asUserId` is left out for a view reaching no person's records — and answers the page (`items`, `nextCursor`, `prevCursor`, `paging: null`) beside `itemSchema` (one row's JSON Schema), `tables` (every table the read reaches: `book`, `follow`, `hide` for `myShelf`) and `clauses` (what it ran, base and params merged in). It needs the viewer role and writes, charges and runs nothing. An unknown key is `404`; a caller view with no `asUserId`, `422`. It reads applied views: plan and apply the view first.

### What a view cannot say yet

Write these as a flow step after `record.view` (the endpoint then answers what the flow computes, with no derived paging), or inline:

- **OR across clauses** — a view's clauses are all required; "followed authors' books, or anything tagged featured" is two reads.
- **Order by a linked record's value** ("collections by their newest item") — keep that value on the record ([records-and-endpoints.md](records-and-endpoints.md), §10) and order by it.
- **A set over `link` or `term` clauses** — a set holds `field` clauses and sets only.
- **A value the run computes** — a view reads no flow value; a filter built by an earlier step is an inline `record.query` ([record-query.md](record-query.md), §9).
- **Computed answer properties** — a shape renames and links; a `value.transform` after the read computes.
