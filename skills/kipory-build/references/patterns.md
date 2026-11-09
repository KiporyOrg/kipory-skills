# Flow patterns

<!-- field-ok: userInfo — a provider value the platform fills, not a request field -->
<!-- field-ok: pageUrl — one project's flow input name used in the examples, not a platform field -->
<!-- field-ok: perMember — a step key in the examples, not a platform field -->

A flow is its `steps`, in written order, and written order is run order. These shapes cover how most flows are built. Each shows the steps and the one rule each has that is not obvious from the step's fields. A function's settings are its own (`functions/<key>.md`); the step fields are in [action-fields.md](action-fields.md); the save's findings and their fixes in [checking.md](checking.md).

The flow and record shapes are split by topic:

| Section   | Page                            | Answers                                                                                                                                                                      |
| --------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1, §3–§5 | `patterns.md`                   | a line of steps, a sub-flow and a run for each person, repeat until done, branch / `try` / `fail` / `parallel`                                                               |
| §2, §6    | `fan-out.md`                    | the `each` and `parallel` blocks, a job longer than one run, run state across elements                                                                                       |
| —         | `utilities.md`                  | the small functions most flows use (`value.first-non-empty`, `text.interpolate`, `list.concat`, `record.read`) and `value.transform`'s JSONata habits                        |
| §7, §10   | `records-and-endpoints.md`      | a record's processing flow; a value rolled up from linked records                                                                                                            |
| §8        | `endpoint-answers.md`           | what an endpoint can answer: the body shape, rows, a 404, a 422 with your message, a 403 for a key, optional query filters, a filter on a list field, natural-key collisions |
| §9        | `record-query.md`               | `record.query`: a per-user feed, "due now", the clause grammar, and totals with `record.aggregate`                                                                           |
| §11       | `views.md`, `view-endpoints.md` | views: a read declared once, its sets, params and shapes; then `record.view` in a flow, the view endpoint that pages itself, ETag, the preview                               |

The section numbers are one sequence across these pages, so "§8" means the same section wherever it is cited. `models.md` holds which model function to use, `text.decide` questions, model bindings and prices.

The examples are one invented project, **Orchard Club**, a fruit-box subscription. Its tables and keys are illustrations, not a project anyone runs.

## The grammars, once

| Where                                            | Grammar                                                                                                                                           | Example                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| A step key                                       | camelCase, `^[a-z][a-zA-Z0-9]*$`, unique in the whole flow; it is the name the step's value is read by                                            | `due`, `perMember`                       |
| A value a setting reads (an argument)            | a bare path (required), `{path, optional: true}`, `{path, default: …}`, `{literal: …}` (a bare number or `true`/`false` too) or `{expr: "…"}`     | `due.records`, `{literal: "paid"}`       |
| A prompt or template (`prompt`, `template`)      | `{{name}}`, `{{name.field}}`, sections `{{#list}}…{{/list}}`, filters `{{name\|truncate:200}}`                                                    | `Dear {{member.name}}`                   |
| A condition (an `if` test, a `repeat`'s `until`) | one leaf: `has`, `filled`, `eq`, `in`, `gt`, `lt`, `gte`, `lte`, `before`, `after`, `startsWith`, `contains`, `matches`, `expr`; `and`/`or`/`not` | `{eq: [member.plan, {literal: yearly}]}` |
| A computation                                    | JSONata, in `value.transform`, in an `{expr}` argument, in every `value.build` field and in an `expr` condition                                   | `$count(due.records)`                    |

**A bare string where a value is read is a path, never text.** Text is `{literal: "neutral"}`. A setting that names a thing (`tableKey`, a template's text, a view, a vocabulary key) is a plain value, and a setting that names a field says `field` (`{field: "email", op: "isNull"}`), never `{path}` (`STEP_FIELD_NAME_IS_PATH`). The function's page says which settings take an argument.

**Nothing and empty are different.** `null` and a missing value are nothing; `""`, `[]` and `{}` are values. A step given `[]` runs with `[]`, a read that matched nothing answers `[]`, and an `each` over `[]` gives `[]`. `default` and `$default(x, y)` fill only nothing; `$ifEmpty(x, y)` fills nothing or empty. Nothing is ever skipped in silence: a step whose required value is missing at run fails with a typed error.

**The save proves every read.** A required read of a value that may be nothing on some path — an optional flow input, a step inside an `if` read outside it, a function whose value may be nothing (`url.fetch`, `text.decide`, `web.search`, `value.transform`, …), `userInfo` — is the save error `STEP_INPUT_MAY_BE_ABSENT`, with a ready fix. Guard it with `if` + `{has: x}`, or read `{path: x, optional: true}` / `{path: x, default: …}`. A function input that must not be empty, fed a value that may be empty, is `STEP_INPUT_MAY_BE_EMPTY`: guard with `filled`, since a default never covers empty.

## 1. A line of steps

**Shape:** a source → text functions → a writer, then `return`.

A whole flow, as it sits under `flows:` in a project document (its key is the map key, and `label` is required):

```yaml
kipory: 11
flows:
  summarise-page:
    label: Summarise a page
    inputs:
      pageUrl: { typeName: string }
    outputs:
      summary: { typeName: string }
    steps:
      - key: page
        function: url.scrape
        with: { url: pageUrl }
      - key: found
        if:
          - test: { filled: page.content }
            steps:
              - key: summary
                function: text.generate
                with:
                  {
                    prompt: "Summarise in three sentences:\n\n{{page.content}}",
                  }
              - key: done
                return: { summary: summary }
        else:
          steps:
            - key: noText
              fail:
                {
                  code: NO_RESULT,
                  message: "The page has no text to summarise.",
                }
```

- **`url.scrape` may answer nothing**, so `summary` reads it inside `if filled`; read outside the test it is `STEP_INPUT_MAY_BE_ABSENT`. A value given inside a block leaves it only through the block's `out` (`found.<name>`); reading `summary` after the block is `BLOCK_VALUE_ESCAPES`.
- **Every path ends in `return` or `fail`** when the flow has required outputs (`FLOW_PATH_HAS_NO_END` otherwise), and a `return` of a required output that may be nothing is `FLOW_OUTPUT_MAY_BE_NOTHING`. A `return` may stand inside an `if` branch; `fail` ends the other path.
- **Ingest-phase functions** (`url.scrape`, `text.generate`, …) run in the async worker with retries, a wait ceiling and a cache keyed on their input; `reuseResultsForMinutes` on the step replaces the cache period (`0` always runs fresh). `text.generate`'s `temperature` and `reasoningEffort` are part of the cache key.
- **One failed step fails the run**, its writes discarded. To carry on past a failure, put the step in a `try` (§5).
- **Two steps write a record.** `record.update` patches one by `recordId`, with `data` or `fields`; `record.create` makes one with `tableKey`, `data` or `fields`, and `fileIds`. With a processing flow the new record is pending until that flow runs, and a record a flow created is queued for it only by `record.enqueue-process` ([records-and-endpoints.md](records-and-endpoints.md) §7).
- **A fallback** — try one source, then another — is a `try` whose `catch` runs the second, both handing the page out through the same `out` name (§5). `kipory-gather` owns the page-fetching recipes.

**§2, each item of a list** (the `each` and `parallel` blocks, and a job longer than one run with `flow.continue`) and **§6, run state across elements**, are in [fan-out.md](fan-out.md). A `text.decide` inside the `each`, not one `text.generate` reading the whole list, is the cheap shape for judging a list ([models.md](models.md) §1).

## 3. A sub-flow, and a run for each person

**Shape:** a step running `flow.invoke`, with `flow` (the called flow's key) and `inputs`; its value is the called flow's outputs, read as `<key>.<output>`.

```yaml
- key: brief
  function: flow.invoke
  with:
    flow: write-brief
    inputs:
      points: allPoints
      tone: { literal: neutral }
- key: done
  return: { brief: brief.text }
```

- **`inputs` maps each input of the called flow to an argument**, checked against that input's type at save. Only mapped inputs cross; a required one left out is `CALL_INPUT_MISSING`. One value may feed several inputs (`{title: book.title, author: book.author}`).
- **The called flow gives only what its `return` gives.** An output it declares optional may be nothing, so a required read of `brief.<it>` needs `if has` or `optional`/`default`, as for any value.
- **The call is all or nothing.** When the called flow fails, everything it staged is dropped and the call fails like any step. To carry on, put the call in a `try` (§5). A sub-flow that failed for the platform's own reasons, a spend cap or a cancel still fails the run.
- The save refuses a cycle, a depth over the limit and a flow of another project.
- **Nesting past the project's `design.block-depth`** is `BLOCK_DEPTH_EXCEEDED`: move part of it into a flow of its own and call it.

### A run for each person

A run that acts for nobody — a schedule, a trigger, an API key — cannot write a person's own records. To do something for each person, start a flow once per person with `flow.start-per-person`: `flow`, the same `inputs` map, and `people`:

- `{ kind: project }` — everyone in the project;
- `{ kind: linked, relationId, recordId }` — the people who own a record linked to one record (the followers of a feed), each once;
- `{ kind: list, userIds }` — ids an earlier step gave; ids not in the project are dropped.

Each run acts for its person, so the called flow writes that person's records, and the project pays. The runs start once the starting run saves, so a failed run starts nobody, and a start replayed after a crash starts nobody twice. The step's value is a `PeopleStartResult` — how many, never who. A preview starts nobody. It is refused in a run that already acts for a person (`START_NEEDS_NO_PERSON`) and for a set over the limit (`PEOPLE_SET_TOO_LARGE`).

**A few named people, without a run each.** `record.create`, `record.update`, `record.delete`, `record.append`, `record.teardown`, `record.enqueue-process`, `record.link-assert`, `record.link-retract`, `source.watch` and `source.unwatch` take an optional `userId`. In a run that acts for nobody the write then acts for that person; a person who is not an active member fails the step `PERSON_NOT_IN_PROJECT`. In a run that acts for a person, `userId` may name only that person (`PERSON_NOT_THE_RUNS`). A flow a schedule or trigger runs that writes a person's record with no `userId` carries the warning `NO_PERSON_WRITES_PERSON_RECORDS`: that write fails every time.

**A morning digest** is two flows: a schedule runs `morning`, which starts `digest` once per follower with `flow.start-per-person` and `people: {kind: linked, …}`; `digest` runs as that person, reads what is new for them, writes their `alert` records, and ends with `push.send`.

## 4. Repeat until done

**Shape:** a `repeat` carries `vars` from pass to pass: `vars` are the first pass's values, `next` the values the next pass starts with, `until` is checked after each pass, `max` is the most passes. After it, its vars are its value, `<key>.<var>`.

```yaml
- key: first
  function: text.generate
  with: { prompt: "Describe this month's box:\n\n{{box | json}}" }
- key: refine
  repeat:
    vars: { draft: first, words: { expr: "$count($split(first, ' '))" } }
    next: { draft: shorter, words: { expr: "$count($split(shorter, ' '))" } }
    until: { lte: [words, 80] }
    max: 3
    onMax: stop
  steps:
    - key: shorter
      function: text.generate
      reuseResultsForMinutes: 0
      with: { prompt: "Shorten to under 80 words:\n\n{{draft}}" }
- key: done
  return: { text: refine.draft }
```

- **Do not repeat to page a record read.** `record.list`, and a `record.query` with no phrase over one table, take `pages: {max: N}` and read every page in the one step, each record once. Records left after the last page fail the step `RECORD_READ_HAS_MORE` unless `onMore: stop`, which answers what was read and a `nextCursor`. A read whose `nextCursor` nothing reads warns `RECORD_LIST_CURSOR_UNREAD`; `pages: {max: 1, onMore: stop}` says one page is what you meant (`kipory-data`). A read's `cursor` bound in `with` to a path whose root ran or was given (another read's page) with nothing at the path (that page's `nextCursor` after its last page) means the list ended, and it answers an empty page; the root absent (the first run, an optional input left out), or no `cursor` bound, reads page one. `""` is a value, so page one too.
- **A repeat that pages something else** (a vendor's cursor) carries the cursor as a var: `vars: {cursor: {literal: null}, items: {literal: []}}`, `next: {cursor: {path: page.nextCursor, optional: true}, items: {expr: "$append(items, page.items)"}}`, `until: {not: {has: cursor}}`.
- **`until` reads the vars, after `next` gave them.** Every pass runs at least once.
- **`onMax`** is `fail` by default: a repeat that runs all `max` passes with `until` still false fails `REPEAT_PASSES_EXHAUSTED`, with `details` `{step, max}`; it is the flow's own failure, so a `try` around the `repeat` catches it and `catch` reads its code as `error.code`. For a bounded refine ("at most three times") set `onMax: stop`, which keeps the last pass's vars. `max` is held to the project's `runs.loop-iterations` (`REPEAT_MAX_EXCEEDED`).
- **A failed pass** fails the block, unless `onPassFail: stop`, which keeps the vars of the last whole pass. A failed pass's writes are discarded.
- **`next` names only `vars`** (`REPEAT_NEXT_UNDECLARED`), and a repeat carries at most the project's `design.repeat-vars` (`REPEAT_VARS_EXCEEDED`): carry one object with several fields instead.
- **A model step inside sets `reuseResultsForMinutes: 0`**, or every pass gets the first answer; the save flags it `REPEAT_BODY_CACHE_FORBIDDEN` until it does.
- A `return` inside an `each`, a `repeat` or a `parallel` is refused (`RETURN_IN_REPEATED_BLOCK`): give the value out and `return` after the block.

## 5. Branch, survive a failure, run at once

### `if` / `else`

```yaml
- key: settle
  if:
    - test: { eq: [member.plan, { literal: yearly }] }
      steps:
        - key: renewYear
          function: record.update
          with: { recordId: member.id, fields: { renewsOn: member.nextYear } }
      out: { outcome: { literal: renewed } }
  else:
    steps:
      - key: lapse
        function: record.update
        with: { recordId: member.id, fields: { state: { literal: lapsed } } }
      - key: tell
        if:
          - test: { filled: member.email }
            steps:
              - key: notify
                function: email.send
                with:
                  address: renewals@orchard.example
                  to: member.email
                  subject: { literal: "Your box is paused" }
                  text:
                    {
                      literal: "Your plan has lapsed. Reply to pick a new one.",
                    }
    out: { outcome: { literal: lapsed } }
```

- **The first branch whose test holds runs**, or `else`; with no `else` and no branch holding, nothing in the block runs. Its value is the `out` of the branch that ran: `settle.outcome`. A name given by only some branches may be nothing after the block.
- **A test's operands are a path, a fixed value** (`{literal}`, or a bare number or boolean) **or an `{expr}`.** A `default` is an expression: `{gte: [i, {expr: "$default(rounds, 5)"}]}`, not `{gte: [i, {path: rounds, default: 5}]}`.
- **Every leaf is false on nothing.** `{eq: [x, {literal: null}]}` never holds (`CONDITION_EQUALS_NULL`): write `{not: {has: x}}`. `has` holds on any value, empty included; `filled` on a value other than `""`, `[]` or `{}`. `matches` takes a value and a regex as text, `[member.postcode, "^[A-Z]{2}"]`; `expr` holds when `$boolean` of its JSONata answer is true. The leaves are listed at `GET /v1/flows/conditions`.
- **A test proves what it tests**: `has` proves a value is there, `filled` that it is there and not empty. `email.send`'s `to` must not be empty, so `notify` sits inside `if filled member.email`; under `has` it is refused `STEP_INPUT_MAY_BE_EMPTY` unless the field's type declares `minLength: 1`, which proves a present email is not empty. The record field is `state`, not `status`: `status` is a system field a table cannot declare.
- **A probability is not a truth value**: compare it with a threshold, `{gte: [verdict.spam, 0.5]}` ([models.md](models.md) §3).
- **Branch on a file's type** with `{matches: [upload.mime, "^application/pdf$"]}` in one branch and the other reader in `else`; each branch gives its text out under one name.

### `try` / `catch`: the one way to survive a failure

```yaml
- key: mail
  try:
    steps:
      - key: send
        function: email.send
        with:
          address: renewals@orchard.example
          to: member.email
          subject: { literal: "Renewed" }
          text: { literal: "Thank you for another year." }
    out: { sent: { literal: true } }
  catch:
    steps: []
    out: { sent: { literal: false } }
```

- This example assumes `member.email` is required and non-empty on the member's type (`minLength: 1`); with an optional `email` the read is refused `STEP_INPUT_FIELD_MAY_BE_ABSENT`, and you would guard it with `if filled` as in the `if` example.
- When a step in `try` fails, what `try` staged is dropped and `catch` runs; the run carries on and closes `partial`. Inside `catch`, `error` is `{code, message, step}`, each always filled: `out: {caught: error.code}`, or `subject: error.message` on a mail step, saves as it is. Branch on `error.code`, or end with `fail`.
- `try.out` and `catch.out` giving the same names make the value always there (`mail.sent`); a name only `try` gives may be nothing after the block.
- A `fail` inside `try` is caught like any failure. A refusal (`request.refuse`, a failed signature check) and the platform's own failure (its engine, a spend cap, a cancel) are never caught: what `try` staged is dropped, `catch` does not run, and the failure goes on up.

### `fail`: end the flow with your error

`{key, fail: {code, message, status?}}` ends the flow. `code` is the word a caller can branch on, `message` the sentence it reads; behind an endpoint the caller gets `status` (any 4xx except 405, 408 and 426; 422 when left out) with the platform's word for it as `code` (`NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `VALIDATION_FAILED`, …) — `REQUEST_REFUSED` for a status with no word of its own, such as 400, 402 or 418 — and your `code` as `details.reason` ([endpoint-answers.md](endpoint-answers.md) §8). Inside an `each` or a `repeat` it fails that item or pass, which the block's tolerance may let go.

### `parallel`: steps at the same time

`{key, parallel: [steps], out?}` runs its children at once. None reads another (`PARALLEL_READS_SIBLING`); each starts from the values there before the block, and a later step reads them through `out`. Two children that may change the same record are warned `PARALLEL_EFFECTS_MAY_CONFLICT`: write them in order instead if order matters. Use it for slow independent reads — two vendor lookups of one company. A child running `request.refuse` or `request.verify-signature` starts before its siblings, which start nothing once it refused ([packs/flows-and-actions.md](packs/flows-and-actions.md)).
