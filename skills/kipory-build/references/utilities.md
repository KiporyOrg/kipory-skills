# Utilities you will reach for

<!-- field-ok: pageText — one project's slot name used in the examples, not a platform field -->
<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

The small functions and expression habits most flows use. `patterns.md` has the map of every flow and record shape.

- `value.first-non-empty` — an ordered `inputs` list of slots or paths; emits the first non-empty **preserving its runtime shape**, which is what lets it coalesce a URL string and a file. `valueKind` narrows to `string` or `file`. `inputStreams` must list the root slot of every entry in `inputs`, no more and no fewer.
- `text.interpolate` — a prompt template and nothing else; makes no model call and cannot emit a list. Use it for prose with holes, and `value.transform` for computation.
- `record.read` — `ids` must hold a **list** of ids, or of objects carrying `id` (a `RecordPage`'s rows: `"page.records"`). A record search's hits carry `recordId`, not `id`: name `hits[].recordId`. Give one id as a one-item list in the setting itself, `"ids": { "expr": "[bookId]" }` — no transform.
- `list.concat` — an ordered `inputs` list of slots; flattens lists, lifts scalars to one-element lists, and joins them in the order given. `strategy` is `concat` or `dedup-concat`. It collects contributions from parallel sources **without needing a fan-out and merge pair**, which is the cheaper answer whenever the branches were never really a fan-out.
- `record.query` — the one function that joins: records matching several clauses at once (a field, a term, a link to a matching peer, a phrase by meaning), with values read from slots. `record-query.md` (§9) has the clause grammar.
- `record.view` — the same read declared once as a view and named by key; prefer it whenever the read's values are the caller's own sets or the request's params rather than something an earlier action computed (`views.md`, §11).

### `value.transform`

One JSONata `expression`; nothing else in a flow computes.

- **A read's records are typed by their table, and the save checks what you read off them.** A `record.list`, `record.read` or `record.query` knows the fields it asks for in `fields` (every field when it names none), the members its `include` adds, and its `linked` records. `GET /v1/actions/input-options` and `GET /v1/flows/{id}/scope` show each read's `rowType`. A path naming a field the record does not have — `books.records.titel`, or `linked.author.nmae` — is refused `JSONATA_FIELD_UNKNOWN` with the field's nearest name (`"did you mean title?"`); a field the table has but the read leaves out says to add it to `fields`. The same holds for an input path (`records[0].titel`) and a condition on a record field (`CONDITION_FIELD_UNKNOWN`). Only a sure miss is reported: through `$map`/`$each` results, a computed `$lookup`, `*`, `**` or a sub-flow's output nothing is checked.
- **Old actions are warned, new and changed ones are refused.** An action saved before this check, or one a table edit made wrong, is `JSONATA_FIELD_UNKNOWN_STORED` on health and never blocks a save; the error is for an action you create or whose expression, inputs or condition you change. Removing a table field that actions still read, retyping it, or dropping a processing flow's output they read is refused with one 422 `VALIDATION_FAILED`, a `TABLE_FIELD_STILL_READ` finding per reading action on `details.diagnostics`: change the readers first, or state the change and the readers together in one project document (its plan judges what both leave). A retype or a flow output change cannot be done row by row — the reader you change first is judged against the field as it still is — so use the document. To rename a type's own field, `PATCH /v1/types/{id}` with `renameFields` moves the stored values and rewrites the readers it can.
- **Pin what an expression does with `examples`.** Up to 5 per action:
  ```json
  {
    "expression": "books.records.{ \"t\": title }",
    "examples": [
      {
        "input": {
          "books": {
            "records": [
              {
                "id": "b1",
                "status": "READY",
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z",
                "title": "Dune"
              },
              {
                "id": "b2",
                "status": "READY",
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z",
                "title": "Emma"
              }
            ]
          }
        },
        "output": [{ "t": "Dune" }, { "t": "Emma" }]
      }
    ]
  }
  ```
  Every save runs them with the run's own evaluator and refuses one whose output changed (`TRANSFORM_EXAMPLE_FAILED`, naming the first place they differ); `{ "input": …, "absent": true }` pins "gives nothing". Key `input` by the names the expression reads. Write made-up values, never ones copied from a run. An input from a read is the read's whole answer: a `record.list` input is `{ "records": [...] }`, and a `record.query` input also carries `"bounded": false` and `"explanation": { "clauses": [], "pushdown": { "ids": 0, "cap": 0, "mode": "none" } }` (its `RecordQueryPage` type; `GET /v1/types?project=<nodeId>&key=RecordQueryPage`). A refusal names every member an input is missing.
- **Try one action without running the flow: `POST /v1/actions/evaluate`** with the action (`{ "id": … }` or a draft) and `slots`, or `fromRun` to use a recorded run's values. It answers the value, its time and its parts, and writes nothing:

  ```json
  {
    "project": "<project node id>",
    "action": {
      "draft": {
        "flowId": "<a saved flow's id>",
        "functionKey": "value.transform",
        "functionConfig": { "expression": "books.records.{ \"t\": title }" }
      }
    },
    "slots": {
      "books": {
        "records": [
          {
            "id": "b1",
            "status": "READY",
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z",
            "title": "Dune"
          }
        ]
      }
    }
  }
  ```
  - **A draft is not the action create body.** It takes `flowId`, `functionKey`, `functionConfig`, the wiring (`inputStreams`, `inputPaths`, `inputProjectionNames`), `promptTemplate`, `systemPrompt`, `inputSchemas`, `outputSchema`, `key`, and run settings under `run` (`timeoutMs`). No `outputSlot`, `condition` or `taskKey`: an unknown member is 422 `VALIDATION_FAILED`. Leave `inputStreams` out (or empty) and they are read from the expression, as a save does — then leave `inputPaths`, `inputProjectionNames` and `inputSchemas` out too, since they line up with it by position; `slots` is keyed by those names.
  - **The flow must already be saved**, since the draft names it by id. To try a transform before the document that creates its flow, apply the flow with its reads first, evaluate, then apply the transform.
  - **Who may call it and what it costs.** A transform, `value.first-non-empty`, `list.concat` and `text.interpolate` (exactly these four) run free at EDITOR. A record read (`record.list`, `record.read`, `record.query`) runs read-only at ADMIN and is billed as a preview; a `record.query` with a `semantic` clause is refused `ACTION_EVALUATE_UNSUPPORTED`, as is any other function — use the flow preview. A project may evaluate 120 times a minute; past that, 429 `RATE_LIMITED`.

- **Top-level identifiers are slot names**, which the save reads into `inputStreams` when you leave it out. A list you send must be exactly those names — the save refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH` (`action-fields.md`, inputs the platform derives).
- **Only a name at the top of the expression is a slot.** Inside a predicate `[...]`, after a `.` (`docs.{"id": id}`), in a group-by or a sort, a bare name is a field of each item (after a focus binding `list@$e` it reads the outer context instead), and the save does not count it as an input: `meaning.scores[score > 0.5]` reads the slot `meaning` and each score's `score`. A lambda body written at the top counts as the top: `$map(docs, function($d){ title })` reads the slot `title`.
- **To read a slot from inside a predicate or after a `.`, write `$$.name`** (or bind it first). `cached.records[expiresAt > runInfo.now]` reads `runInfo` off each record, finds nothing, and filters every item out; `cached.records[expiresAt > $$.runInfo.now]` compares with the run's clock. The plan warns `JSONATA_ITEM_FIELD_NAMED_LIKE_SLOT` when an item field there is spelled like a slot the flow has; `$.name` reads the item's field and says so.
- **Index or filter an array constructor in parentheses.** `[$filter(xs, f)][0].id` is nothing, and so is `[xs][id = 1].name` when one item matches; `([$filter(xs, f)])[0].id` is the first item's `id`. The run says nothing, so the plan warns `JSONATA_INDEXED_LIST_FIELD_READS_NOTHING`.
- **A regex is read as a regex**: a backslash escapes the next character, and inside a class `[...]` only `]` ends it, so `[^)]`, `[^"\\]` and `\\(\[|\])` all read. A regex that never ends is refused `JSONATA_SYNTAX_ERROR` naming it ("The regular expression starting `/[a(b/…` has no closing `/`"), and an invalid one with the regex engine's own sentence.
- **JSONata has no `undefined` literal.** `undefined` at the top of an expression is read as a slot name, and the save refuses it as a missing input.
- **An expression is capped at 1,000 parts.** A part is one node of the parsed expression — roughly each name, operator, literal and function call — and a save over the cap is refused `JSONATA_EXPRESSION_TOO_COMPLEX` with the count in the message ("1,006 parts, and the limit is 1,000"). A plan shows every stated expression's size on its action's row (`expressionParts`), and warns `JSONATA_EXPRESSION_NEAR_LIMIT` from 800. Split the work into two or three transforms, each with a typed `outputSchema`, the later ones reading the earlier ones' slots. An expression cannot share a function with another action: before writing a helper, look for it among the platform's expression functions (`functions/expressions.md`) — `$list`, `$indexBy`, `$hostOf`, `$htmlText`, `$fold`, `$parseDate`, `$formatDate`, `$termLabel` and more.
- **An action's inputs together are capped at 1,000,000 characters of JSON**, and over it the action fails ("JSONata input bag is … exceeding the maximum of 1000000"; the message says bytes and counts characters). The count is the JSON of every input slot the action lists, so quotes and line breaks count twice, and each slot can itself hold up to 500,000 characters: two fetched pages, or a text beside the list of its own chunks, are enough. Read one large slot per transform, reduce it there, and combine the reduced values in a second action. `"onFailure": "continue"` on a transform that reads a fetched page keeps one oversized page from failing the run.
- **`x ?? d` gives `d` when `x` is missing** (`book[0].tags ?? []`); `$default(x, d)` also replaces `null`, empty text and an empty list. Both work in every expression: a transform, an `expr` argument, a `value.build` field and a condition.
- **`$sum` over nothing is nothing, not 0.** A path that matches no value is absent, and `$sum`, `$max`, `$min` and `$average` of an absent value are absent too, so `{"total": $sum(rows.amount)}` has no `total` when `rows` is empty and an action output typed `number` then fails. Arithmetic on nothing is nothing too, so `own.count + $sum(kids.n)` loses the whole count. Give the empty case its value: `$sum([rows.amount])` is 0 for no rows, `$max(rows.amount) ?? 0` gives a default, or `$count(rows) > 0 ? $sum(rows.amount) : 0`. `$count` of nothing is 0. The plan warns `JSONATA_AGGREGATE_OF_NO_ITEMS_IS_NOTHING` when such a call reaches arithmetic, directly or through a variable; and when the output check refuses a missing field, its message names the inputs that were empty on that run (`childEvents.records`).
- **`!=` against nothing is false, not true.** Any comparison with a missing value is false, so `$type(rows[0].id) != "string" ? row` gives nothing when there is no row — a "create it when it is missing" action that never creates. Write `$not($type(rows[0].id) = "string") ? row`, which is true when the value is missing. The plan warns `JSONATA_NOT_EQUAL_ON_MISSING_IS_FALSE` for `$type(…) != …` and for a field read through an index (`rows[0].status != "done"`), unless `$exists(…) and` or a `$count(…) > 0` guards it. A record row read by `record.read`, `record.list` or `record.query` leaves a field with no value out, so `$r.flag != true` over rows is false for an unset `flag` too, and the row drops out of a filter: write `$not($r.flag = true)`. The plan warns `JSONATA_ROW_FIELD_ABSENT_NOT_NULL` on such reads of a row's field, and `$default(x, d)` gives a value for one that is missing, `null`, empty text or an empty list.
- **A filter that matches nothing is nothing, not `[]`.** `$filter(rows, function($r){ $r.kept })` and `rows[kept]` yield no value when no element matches, so the action produces nothing: no slot is stored and an action reading only that slot is skipped. Where a reader needs a list every time, wrap the expression — `[rows[kept]]` is a list for none, one or many — and remember that `[]`, though stored and visible to a transform, still counts as absent to `slotPresent` and to an action's input gate.
- **A search inside a loop reads the whole list for every item.** `$map(posts, function($p){ $filter(sources, function($s){ $s.id = $p.sourceId })[0] })` checks every source for every post: 3,000 of each is 9 million checks, about 18 s, and the 5-second limit fails the action. Build the table once — `$t := $indexBy(sources, "id")` for the first match, `$groupBy` for every match — and read it inside with `$lookup($t, $string($p.sourceId))`: 25 ms. The same holds for a list cut into groups by one position filter per group (`$i >= $k * 10 and $i < ($k + 1) * 10`): `$chunk(ids, 10)` is one pass. With the default `object` output a transform cannot answer the groups themselves (a list of lists is refused at the top of a result), so it wraps them: `[$map($chunk(ids, 10), function($g){ {"ids": $g} })]`, or `{"groups": $chunk(ids, 10)}`. The plan hints each of these (`JSONATA_USE_BUILTIN`) with the rewrite.
- **Five functions are refused**, at save and at run time, with `JSONATA_FORBIDDEN_FUNCTION`: `$now`, `$millis`, `$random` and `$shuffle` (they break caching) and `$eval` (a sandbox escape — there is no parsing a JSON string back into an object).
- **The result is checked at run time against the action's `outputSchema`.** Left at the default `object`, it must be text, an object — whose fields may nest lists and objects — or a list of text or of objects; a bare number, boolean or `null`, a mixed list or a list of lists fails the action. That latitude is the action's only: a flow output bound to a list result is declared `isList: true`, or the call fails `502 FLOW_FAILED` whenever a list arrives (from a path, whenever more than one item matches). A list `outputSchema` and an `isList: true` output each take a single item as a one-item list.
- **To emit nothing**, so a `slotPresent` guard downstream holds, write a conditional with no else — `$count(words) > 50 ? {"text": body}`. An action that produces nothing stores no slot, so every reader sees what a skipped action leaves:
  - an action reading only that slot is skipped, and a `slotPresent` condition on it is false;
  - in another `value.transform` the name is unbound — `$exists(page)` is false, a field read off `page` is nothing, and `{"a": page}` has no `a`;
  - a `flow.merge` gets no element from a fan-out branch that produced nothing;
  - a setting that reads it (a `fieldFilters` value, `ids`) sees a missing slot.
- **`{}` and an empty file are "nothing" from any action**, not only from a transform: a literal `{}` an expression returns, an object action that answered `{}`, and a file action whose vendor refused (`url.screenshot`, `url.fetch-as-file`) all store no slot. `""` and `[]` are different: they are stored, a transform sees them as an empty string and an empty list, and they still count as absent to `slotPresent` and to an action's inputs.
- An empty result skips the `outputSchema` check; a literal `{}` is checked against `outputSchema` first (and refused by a type with required fields). This holds whatever the declared type: an action declared `string` whose expression gives nothing (`$join` over no items, a path that matches nothing) stores no text, and a `{{name}}` reading it in a prompt leaves its place empty. Where a prompt needs the text every time, give the expression a fallback (`$exists(x) ? x : ""`).
- **A result that should be a list must be built as one.** JSONata returns a one-item sequence as the bare item, so a path, `$filter` or `$map` that matches exactly one element yields an object. Give the action a list `outputSchema` and bind it to an `isList: true` flow output: both take that single item as a one-item list. Absent stays absent — a path that matches nothing gives no value, not `[]`. Wrapping the expression in `[ … ]` makes a list for none, one or many: `[$filter(hits, function($h){ $h.score > 0.5 })]`.
- **A flow output bound to a slot whose action produced nothing is not set.** An optional output is left out of the response; a required one fails the run. Have the expression return a real value on every path, or mark the output optional. An empty list is a value: an output bound to a list that came back empty answers `[]`, and the run succeeds. Health warns `FLOW_REQUIRED_OUTPUT_MAY_BE_MISSING` when every action writing a required output may write nothing: it has a condition, answers a test with no `else`, is a dispatch branch or switched off, or is skipped — it reads only slots that may each be missing or an empty list, or a setting it needs (a query's operand, a loop's seed) may be missing. When it reads only possibly-empty slots, have it also read `runInfo` and it runs either way.
- **Preview both branches of any conditional before trusting it**: these result shapes are judged only when a run produces them.
- **`$assert(condition, "message")` refuses the call with your words** — a `422 VALIDATION_FAILED` (`endpoint-answers.md`, §8).
