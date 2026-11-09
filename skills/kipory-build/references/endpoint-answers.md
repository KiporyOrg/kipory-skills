# What an endpoint answers

<!-- field-ok: userInfo — a provider value the platform fills, not a request field -->
<!-- field-ok: isDesign — one project's example field name, not a platform field -->
<!-- field-ok: isTech — one project's example field name, not a platform field -->
<!-- field-ok: genre — one project's example field name, not a platform field -->

§8 of the flow and record shapes (`patterns.md` has the map of every section). A function's settings are its own — `functions/<key>.md` has each table.

## 8. Answer, refuse or miss from an endpoint

A flow behind an endpoint reads its inputs (bound from the request), gives its outputs only by `return`, and answers an error by ending with `fail` or a refusing step. Nothing else reaches the caller.

- **The body is the flow's outputs, keyed by output name** — what its `return` gave. A flow with one output named `result` answers `{ "result": { … } }`. To answer the bare value instead, set `responseBody` on the endpoint's `contractConfig` to the name of one required output (`"responseBody": "result"`). `statusOutput` (a required number output) sets the success status per call, `headers` sets response headers from outputs, and `redirect` answers a redirect to an output's address — each only on a synchronous `flow.invoke` (`kipory-expose`). An output a `return` leaves out (an optional one that was nothing) is left out of the body, never `null`.
- **Every path gives the required outputs, proved at save.** A path that reaches the end with no `return` is `FLOW_PATH_HAS_NO_END`; a `return` of a required output that may be nothing is `FLOW_OUTPUT_MAY_BE_NOTHING`. Both fixes end the empty path with `fail` (`NO_RESULT`). A flow whose honest answer can be "nothing" returns that value (`0`, `[]`) or declares the output optional.
- **A body that breaks the flow's inputs never starts a run.** A `flow.invoke` endpoint checks the request against its flow's `inputs` first: a body that breaks them answers `422 VALIDATION_FAILED` with its `issues`, and `details.reason` `FLOW_INPUT_INVALID` naming the `flow`, the `input`, the `path` in it and what its type `expected`. A `flow.invoke` step, or a schedule's start, that passes a value its flow's input cannot take fails with the same code and fields.

- **Rows.** `record.list` (under `records`) and `record.read` give each row as the record's submitted **and processed** fields at the top level — `derived.body` is `$r.body` — beside `id`, `status`, `createdAt` and `updatedAt`, which a content field of the same name never overwrites. A vocabulary the table surfaces sits on the row under the vocabulary's key as `{ id, slug, label, parentSlug }` (a list of them for a `many` vocabulary); `slug` is the term's key, and `id` is the field to compare on. Both also carry the term's `labels` (by language) and `attributes` when it has them; `$termLabel(term, lang)` picks the label in a language.
  - **A field with no value is left out of the row, never `null`.** A field never written, or cleared — a PATCH `merge` or a `record.update` merge with `null` deletes it — is not on the row, and neither is a vocabulary with no term filed. `0`, `false`, `""` and `[]` are values and arrive as stored. So a step reading `row.pollMinutes` as required where the type marks it optional is `STEP_INPUT_FIELD_MAY_BE_ABSENT`; read it `{path: row.pollMinutes, default: 60}`. In JSONata, `$r.pollMinutes ?? 60` gives the default, `x = null` and `x != "a"` are false for it (write `$not(x = "a")`), `$count(x)` is 0 and `"Hi " & x` is `"Hi "`; the save warns `JSONATA_ROW_FIELD_ABSENT_NOT_NULL` on such reads. Records stored without a required field are listed by `GET /v1/tables/{id}?expand=diagnostics` (`RECORDS_MISSING_REQUIRED_FIELD`). A `record.update` merge whose patch copies an unset field leaves the target's field as it was — write `x ?? null` to clear it. A total over such rows has its own trap: `$sum` of no values is nothing, not 0 ([utilities.md](utilities.md), `value.transform`).
- **404** comes from `record.read` with `failIfEmpty: true`, when nothing resolves — an empty id list included: `404 RECORD_NOT_FOUND`, with a generic message. For a lookup by a field rather than an id, chain `record.list` (filtered on the field) into `record.read` with `ids: found.records` and `failIfEmpty`. A `record.list` alone answers `200` with an empty page.
- **An error with your message: `fail`.** End the path with `{key, fail: {code, message, status?}}`, usually in an `if` branch that tests the request:

  ```yaml
  - key: check
    if:
      - test: { expr: "$length(text) < 200" }
        steps:
          - key: tooShort
            fail:
              {
                code: NO_RESULT,
                message: "The page has too little text to summarise.",
                status: 422,
              }
  ```

  The caller gets `status` (any 4xx except 405, 408 and 426; 422 when left out) with the body `{code, message, details}`: `code` the platform's word for that status (`NOT_FOUND` for 404; `REQUEST_REFUSED` for a status with no word of its own, such as 400, 402 or 418), `message` yours, `details.reason` your `code`, and the run's writes are discarded. `$assert(condition, "message")` inside a `value.transform` answers `422 VALIDATION_FAILED` with your message.

- **403, 404, 410, 429…: `request.refuse`.** A step running `request.refuse` with `status`, `code` (your word, in capitals) and `message` stops the run and answers that status, with your code as `details.reason`. Put it in the `if` branch that decides. Redirects, 204, headers: `kipory-expose`.
- **Keep each parameter where the contract puts it.** In an operation table, `{accountId}` in braces is a path segment; any other parameter of a GET or DELETE (`month`, `limit`, a filter) is a query value: `"month": {"in": "query", …}` with its input `{"from": "query"}`. Moved into the path (`/statements/{month}`), a client following the contract never reaches the endpoint, and a missing `month` can no longer be refused. The plan warns `ENDPOINT_PATH_PARAM_LOOKS_LIKE_QUERY` for a path segment named like a query value.
- **Refuse in the contract's order: the record acted on, then what it points to.** A flow that changes a record reads it first (`record.read`, `failIfEmpty`: 404 for someone who cannot see it), refuses on its `access` or owner (`request.refuse` 403), and reads the records the request names (a folder, a parent, a target account) only after. Each of those answers 404 when it is not the caller's. The other order answers 404 to a caller the contract refuses 403: the editor of a shared note cannot see the owner's folder.
- **403 for a key on a per-user read or write.** A step that reads or writes a table owned by its users (`record.list`, `record.read`, `record.count`, `record.query`, `record.aggregate`, `record.create`, `record.append`; `vocabulary.aggregate` and `record.teardown` whatever the table) needs a signed-in user. An API key acts as the project and has none, so the call is refused `403 FORBIDDEN` before the flow runs. The endpoint read says so beforehand: `access.requiresUser`, with the functions in `access.requiresUserBy`. A step counts wherever it sits — inside an `if` branch a key's call would not take, or inside a `try` — so a key needs a flow of its own. What does not count: a read whose `userId` reads something other than `userInfo` (a path parameter, for a key reading on a user's behalf), and a step with `enabled: false`. Three ways to serve more than one kind of caller:
  - **Shared data with a personal extra** (a catalog item plus "do I follow it") is two endpoints over two flows. One reads only project-owned tables, so its endpoint reads `requiresUser: false` and takes a key and a signed-in user alike; the other adds the per-user step. Share the common steps by putting them in a flow both call with `flow.invoke`.
  - **Anonymous visitors and signed-in users** are two endpoints for the same reason, the first one public (`contractConfig.auth: "none"`, `kipory-expose`). A public endpoint ignores a session sent along, so its run never has a user; a public endpoint over a flow that needs a user is refused at the save (`PUBLIC_ENDPOINT_NEEDS_USER`).
    - **A public endpoint spends the project's public spend cap.** The save refuses one until `publicSpendCapCredits` is set (`PATCH /v1/projects/{nodeId}/settings`): the most its calls may spend per UTC day. Every call spends what its flow costs, a model call most of all, and test calls spend it too. Once spent, every public call answers `402 PUBLIC_ENDPOINT_UNAVAILABLE` until 00:00 UTC, whatever the request. So size it for a day of real calls plus every test run, not the few calls you try by hand, and read `publicSpend.consumed` on `GET /v1/projects/{nodeId}/settings` after a test run to see what a day costs.
  - **A key acting for a named user** reads that user's records through a flow input: declare an input (`userId`), bind it from a path parameter (`{ "userId": { "from": "path.userId" } }`), and set `userId: userId` on the read. The endpoint reads `requiresUser: false`. Whoever holds the key can then read any user's records of that table, so hand it only to your own server. A signed-in user's call through it acts for them: a path naming anyone else fails `422 VALIDATION_FAILED` with `details.reason` `PERSON_NOT_THE_RUNS`.
- **A function's own refusal names its rule as `details.reason`.** When a step's function refuses with a rule of its own — `record.list` with records left past `pages.max` (`RECORD_READ_HAS_MORE`), a linked read over its `limit` (`RECORD_LINKED_HAS_MORE`), a stream event with no time (`STREAM_EVENT_NO_TIME`) — the caller gets `422 VALIDATION_FAILED` with the function's message and that code as `details.reason`. A refusal over the run's state rather than its input — `STREAM_MIGRATING`, `QUERY_LIKE_RECORD_NOT_INDEXED`, and a value a filter, a `record.query` clause or a `term.search` reads that the run did not have (`FILTER_VALUE_ABSENT`, `QUERY_OPERAND_ABSENT`, `TERM_SEARCH_VOCABULARY_ABSENT`) — answers `409 CONFLICT` with a generic message and the code as `details.reason`. Look each code up in `kipory-connect`'s `references/refusal-codes.md`.
- **422 for a bad `cursor`.** A `cursor` that is not a `nextCursor` a previous page answered is refused `422 VALIDATION_FAILED`, by `record.list` and `record.query` alike. Which page a `cursor` asks for: when its source says there is no more — the previous page ran and its `nextCursor` is nothing — the read answers an empty page and reads nothing; when there is no previous page (a first run, an optional input not given), with no `cursor` in `with`, or with `""` (a value), it reads page one. The same `422` answers an id list past the cap (200, for `record.read` and `record.delete`) and a `record.create` whose data lacks the table's `key` field or holds a non-string there.
- **Optional query filters are a view's `optional` params** ([views.md](views.md), §11): `?genre=` absent reads every row, present narrows it, in one `record.view` step, and the view endpoint types and bounds the parameter itself. An inline read is different: a filter value it reads (a `fieldFilters` entry's `value`, `dataEquals`, a `linkFilters` peer, a `record.query` `value`) must be there — a missing value never widens the answer. An optional flow input read there as required is `STEP_INPUT_MAY_BE_ABSENT`; read `{path: genre, optional: true}` and the step fails `FILTER_VALUE_ABSENT` (409) when it is missing, or put the read in `if has genre` with an unfiltered read in `else`, each branch giving its page out under one name.
  - **An empty query value is absent.** `?category=` reaches the flow as no `category` at all; a required parameter sent empty is refused `422` as missing.
  - **An empty LIST is a value.** A filter reading `[]` runs and matches nothing — an empty page, a count of zero — which is what "the caller follows nobody" should answer.
- **Filtering on one element of a list field** (`?tag=design` over a record's `tags`). A `filter` use is refused on a list (`USES_ILLEGAL_FOR_SHAPE`), and a `fieldFilters` entry with `op: "eq"` reads a list _value_ as "any of these" against a one-value field, not "the record's list holds this". `dataContainsPath` + `dataContains` matches only an **object** element; a string fails the step. Three ways that work:
  - **Post-filter one page.** `record.list` (up to 100 rows, newest first) → `value.transform` `$filter(page.records, function($r){ $$.tag in $r.tags })`. Exact, but it sees one page only.
  - **Project the value into fields.** For a small closed vocabulary, store one boolean field per value (`isDesign`, `isTech`) with a `filter` use — at most four: a table may declare 4 boolean fields as queryable (32 text, 8 number, 8 datetime), and a fifth is refused `TABLE_QUERYABLE_INVALID`. Filter `{ field: isDesign, op: eq, value: { literal: true } }` in one `if` branch per value.
  - **File the values as vocabulary terms** (`kipory-model`). `record.list`'s `vocabularyFilter` takes fixed `{ vocabularyKey, slug }` pairs, not a value, so a parameter needs one read per term, each in its own `if` branch; a `record.query` `term` clause takes the slug from a value (`slug`, [record-query.md](record-query.md), §9).
- **Natural-key collisions fail the whole run.** A flow's `record.create` on a project-wide table is keyed by its content, so writing identical data again converges on the same record. Writing _different_ data under a `key` field another record already holds is a `409 RECORD_NATURAL_KEY_TAKEN`, and the run is all-or-nothing: no other row it wrote is kept. There is no upsert function. <!-- absent-function: record.upsert --> The refusal names the refused write's `seq`, the step that staged it and the table; `details.refusedRecordId` — the refused write's own id; and, for a create or an update, `details.holderRecordId` — the record that holds the key.

  For an importer: look the key up first, then branch:

  ```yaml
  - key: found
    function: record.list
    with:
      tableKey: product
      limit: 1
      pages: { max: 1, onMore: stop }
      fieldFilters: [{ field: sku, op: eq, value: row.sku }]
  - key: write
    if:
      - test: { filled: found.records }
        steps:
          - key: change
            function: record.update
            with: { recordId: { expr: "found.records[0].id" }, data: row }
    else:
      steps:
        - key: add
          function: record.create
          with: { tableKey: product, data: row }
  ```
