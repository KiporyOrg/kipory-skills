# Utilities you will reach for

<!-- field-ok: userInfo — a provider value the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider value the platform fills, not a request field -->

The small functions and expression habits most flows use. A function's settings are its own (`functions/<key>.md`); `patterns.md` has the map of every section.

- `value.first-non-empty` — an ordered `inputs` list of values; gives the first that is not nothing or empty, keeping its shape, so it coalesces a URL and a file. Its value may be nothing.
- `text.interpolate` — a `template` and nothing else; no model call. Prose with holes; `value.transform` for computation.
- `record.read` — `ids` holds a **list** of ids, or of objects carrying `id` (`page.records`). A search's hits carry `recordId`: name `hits[].recordId`. One id is `ids: {expr: "[bookId]"}`.
- `list.concat` — an ordered `inputs` list; flattens lists, lifts single values, joins in order (`concat` or `dedup-concat`).
- `record.query` — records matching several clauses at once (a field, a term, a link, a phrase by meaning) ([record-query.md](record-query.md), §9).
- `record.view` — the same read declared once as a view and named by key; prefer it whenever the read's values are the caller's own sets or the request's params ([views.md](views.md), §11).
- `value.build` — an object whose every field is a JSONata expression. A field that should be there only sometimes is `cond ? x` (no else: the field is left out); there is no per-field `when`.

### `value.transform`

One JSONata `expression`; nothing else in a flow computes. Its value may be nothing, so a required reader needs a guard, and a field of its value is untyped (`STEP_INPUT_FIELD_UNTYPED`, a warning): return the field you need as the whole value, or read it `optional`.

- **The names at the top of the expression are values the flow has**: flow inputs, step keys, an `each`'s `as`, a `repeat`'s vars, `userInfo`, `runInfo`. A name the step cannot see is `STEP_READS_UNKNOWN`, one given only by a step written below is `STEP_READS_LATER`.
- **Inside a predicate `[...]`, after a `.`, in a group-by or a sort, a bare name is a field of each item.** To read a flow value there write `$$.name`: `cached.records[expiresAt > $$.runInfo.now]`. The save warns `JSONATA_ITEM_FIELD_NAMED_LIKE_SLOT` when an item field there is spelled like a value the flow has.
- **A read's records are typed by their table.** A path naming a field the record does not have — `due.records.emial` — is refused `JSONATA_FIELD_UNKNOWN` with the nearest name; a field the read leaves out of `fields` says to add it.
- **Pin what it does with `examples`**, up to 5: `{input: {<name>: …}, output: …}`, or `{input, absent: true}` for "gives nothing". Key `input` by the names the expression reads; an input from a read is the read's whole answer (`{records: [...]}`). Every save runs them and refuses one whose output changed (`TRANSFORM_EXAMPLE_FAILED`).
- **Try it without running the flow**: `POST /v1/flows/{id}/steps/{key}/evaluate` with `values` keyed by the names the step reads (or `fromRun`, a past run's values), and `step` to try a draft not yet saved. It answers `{ok, value}`, `{ok, absent: true}` or the failure a run would meet, and writes nothing. `value.transform`, `value.first-non-empty`, `list.concat` and `text.interpolate` run free at EDITOR; `record.list`, `record.read` and `record.query` run read-only at ADMIN and are billed; any other function is `STEP_EVALUATE_UNSUPPORTED` — preview the flow.
- **An expression is capped at 1,000 parts** (`JSONATA_EXPRESSION_TOO_COMPLEX`; warned from 800, `JSONATA_EXPRESSION_NEAR_LIMIT`). Split it across steps. Before writing a helper, look among the platform's expression functions (`functions/expressions.md`): `$list`, `$indexBy`, `$hostOf`, `$htmlText`, `$fold`, `$parseDate`, `$formatDate`, `$termLabel` and more.
- **A step's inputs together are capped at 1,000,000 characters of JSON**, and each value at about 500,000. Read one large value per transform, reduce it there, and combine the reduced values in a second step.
- **Missing values in JSONata:**
  - `x ?? d` gives `d` when `x` is missing; `$default(x, d)` fills nothing; `$ifEmpty(x, d)` fills nothing or empty.
  - `$sum`, `$max`, `$min`, `$average` of nothing are nothing, and arithmetic on nothing is nothing: `$sum([rows.amount])` is 0 for no rows (`JSONATA_AGGREGATE_OF_NO_ITEMS_IS_NOTHING`). `$count` of nothing is 0.
  - `!=` against nothing is false: write `$not(x = "done")` (`JSONATA_NOT_EQUAL_ON_MISSING_IS_FALSE`). A record row leaves an unset field out, so `$r.flag != true` drops an unset row too (`JSONATA_ROW_FIELD_ABSENT_NOT_NULL`).
  - A filter that matches nothing is nothing, not `[]`, and one match is the bare item: wrap it, `[rows[kept]]`, for a list every time.
  - `[xs][0].id` is nothing: index an array constructor in parentheses, `([$filter(xs, f)])[0].id` (`JSONATA_INDEXED_LIST_FIELD_READS_NOTHING`).
- **A search inside a loop reads the whole list for every item**: build the index once (`$indexBy`, `$groupBy`) and `$lookup` inside; `$chunk(ids, 10)` cuts a list in one pass. The save hints these (`JSONATA_USE_BUILTIN`).
- **Five functions are refused** (`JSONATA_FORBIDDEN_FUNCTION`): `$now`, `$millis`, `$random` and `$shuffle` (they break caching; read `runInfo.now`), and `$eval`.
- **A regex is read as a regex**; one that never ends is refused `JSONATA_SYNTAX_ERROR` naming it.
- **To refuse an endpoint call with your words**, end the flow with `fail` ([endpoint-answers.md](endpoint-answers.md), §8).
