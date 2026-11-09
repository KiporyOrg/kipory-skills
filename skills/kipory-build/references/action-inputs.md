# Step inputs: types, reads, when a step runs, what a setting takes

<!-- field-ok: userInfo — a run-ambient value the platform fills, not a request field -->
<!-- field-ok: runInfo — a run-ambient value the platform fills, not a request field -->
<!-- field-ok: tableInfo — a run-ambient value the platform fills, not a request field -->
<!-- field-ok: projectInfo — a run-ambient value the platform fills, not a request field -->

Read this for how a step's inputs are typed and read: sections 3, 4, 5 and 7 of `action-fields.md`, which keeps the step body and its run settings. A flow is its `steps` in written order; a step reads values **by name** — a flow input, the key of a step written above it, or a name a block gives — never by slot or position.

## 3. Types

A type is named **by its key**: `{ "kind": "ref", "ref": "BookCard" }`, in a document and on the step routes alike; every save resolves the key to the type's id, and a key no type answers to is refused at save with a fix per near key. Named types match by identity, never by structure: two types with identical fields are still two types, and handing one where the other is expected is a `NOMINAL_MISMATCH`. Reuse one type. The other forms wrap one of those:

| Form                                             | Means                                                 |
| ------------------------------------------------ | ----------------------------------------------------- |
| `{ "kind": "list", "element": <ref> }`           | a list — `RecordRead[]` is `list` of `ref RecordRead` |
| `{ "kind": "optional", "inner": <ref> }`         | may be absent                                         |
| `{ "kind": "union", "members": [<ref>, <ref>] }` | one of several — on an input only, never an output    |
| `{ "kind": "record", "valueType": <ref> }`       | a string-keyed map                                    |
| `{ "kind": "recordRef", "tableKey": "<type>" }`  | one stored record's id                                |

The built-ins (`string`, `number`, `boolean`, `object`, `file`, …) and the platform's own types (`RecordRead`, `RecordPage`, `UserInfo`, `ProjectInfo`, …) are named by key like yours.

**A flow's inputs and outputs are maps by name**, each `{ "typeName": "BookCard", "isList": true, "optional": true, "description": "…" }` with only `typeName` required. A list output says `isList: true`; a flow gives its outputs only through a `return` step.

**Only `text.generate` and `text.decide` declare a type for their answer**, in `with.outputSchema`; every other function types its own value. A list type's `maxItems` is held at run: a step whose declared answer is a list past it fails `OUTPUT_TYPE_MISMATCH`, naming the count and the bound.

## 4. What a step reads

**A step's reads are written in it**: every argument in its `with` (section 7), the `{{placeholders}}` of a prompt or template, a block's `each` list, a `repeat`'s `vars` and `next`, an `out`, a `return`. Nothing is wired or listed beside them, and the save proves each one before it accepts the list (`checking.md`).

- **A read must name something above it.** A name nothing gives is refused `STEP_READS_UNKNOWN`, and a name only a step written below gives is `STEP_READS_LATER`; a value made inside a block is read after it only through the block's `out` (`BLOCK_VALUE_ESCAPES`).
- **A read the function makes by default is not seen at save.** `record.list` and `record.read` default `userId` to the run's person, so on a run with no person a read of a per-user table fails at run (`end-user-required`, 403 at an endpoint); a read of `userInfo` you write is proved like any other.
- **A prompt reading `{{projectInfo.config.<namespace>.<field>}}`** reads the project's config; `projectInfo` and `runInfo` are always there, `userInfo` and `tableInfo` only on some runs.
- **In JSONata, only a name at the top of an expression is a read**: inside `[…]` or after a `.` it is a field of each item (`$$.name` reads the value there), and a top-level `undefined` is read as a name too. `utilities.md` ("`value.transform`") has the rule, the way round it and the five refused functions.

## 5. When a step runs

- **Written order is run order.** A step runs when the walk reaches it; nothing is skipped because a value is missing.
- **A required read that finds nothing fails the step** (`STEP_INPUT_ABSENT`), and an input that must not be empty given `""`, `[]` or `{}` fails it (`STEP_INPUT_EMPTY`) — before the function runs, so nothing is charged. The save refuses most of these first (`STEP_INPUT_MAY_BE_ABSENT`, `STEP_INPUT_MAY_BE_EMPTY`), each with a ready fix.
- **The only "only when" is an `if` block.** A step carries no condition of its own. "Run only when a value is missing" is a branch whose test is `{ "not": { "has": "found" } }`; `has` holds on any value, `filled` on a value other than `""`, `[]` or `{}`, and every test is false when what it reads is nothing.
- **A test takes a path, a literal or an expression** — never `{path, optional}` or `{path, default}`. An `{ "expr": "$count(reviews.records) > 0" }` test holds when `$boolean` of its answer is true, so test a list with `$count(x) > 0`, not `x`. A test that throws fails its block; it never counts as a pass.
- **Which tests exist** is `GET /v1/flows/conditions`.
- **A run with no signed-in person has no `userInfo` at all** — a key's call, a schedule, a trigger. Guard a read of it with `if` + `{ "has": "userInfo" }`, and preview with `input.principal: "no-end-user"` to see the run a key or a schedule gets (`checking.md`).

## 7. What a setting takes: a path, a fixed value or an expression

Every setting that reads a value — a function's `ids`, `data`, `to`, `userId`, a `fields` entry, a `flow.invoke` input, a `record.query` operand, a `fieldFilters` value — takes an **argument**:

| Written                                         | Is                                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `"book.title"`, `"page.records[].id"`           | a **required** read of that path: a name, then `.field` and brackets                |
| `{ "path": "book.subtitle", "optional": true }` | read it; when missing, pass nothing and let the step run without it                 |
| `{ "path": "pounds", "default": 10 }`           | read it; when missing, use the default (itself an argument)                         |
| `{ "literal": "neutral" }`, `5`, `true`         | a fixed value. `literal` holds any JSON — text, a list, an object, `null`           |
| `{ "expr": "$count(page.records)" }`            | an expression: JSONata over the values in scope, evaluated before the function runs |

- **A bare string is always a path.** Text is `{ "literal": "…" }`; `subject: Renewal` reads a value named `Renewal`, and the save refuses it (`STEP_READS_UNKNOWN`, with a fix that turns it into text when the word was meant as text).
- **Brackets**: `[]` every item (`records[].id`), `[0]` / `[first]` / `[last]` one item, `[distinct]` the list with repeats dropped (`reviews.records[].readerId[distinct]`), `[compact]` the list with absent and `null` items dropped.
- **An index read needs a test before it.** `found.records[0].id` is refused (`STEP_INPUT_MAY_BE_ABSENT`) even after `has`, since a list may be `[]`: `{ "filled": "found.records" }` proves `[0]`, `[first]` and `[last]`; `[1]` and beyond need `{ "has": "found.records[1]" }`.
- **A path never reads through a list.** A `.field` read off a list is refused `CONFIG_SLOT_PATH_CROSSES_LIST`: a `record.read` gives a list even for one id, so its title is `book[0].title`, not `book.title`. Name the item or every item (`book[].title`). JSONata is the other way round: in an `expr`, `book.title` maps over the list.
- **`[]`, `[distinct]` and `[compact]` over no items give `[]`**, a value: the step runs with an empty list (a `record.read` given no ids answers `[]`; with `failIfEmpty`, a 404).
- **A bare number, `true` or `false` is the same as `{ "literal": … }`.** Only text needs the wrapper.
- **A one-item list is an expression**: `"ids": { "expr": "[bookId]" }` hands a list-taking setting one id — no transform.
- **`default` and `$default(x, y)` fill only nothing; `$ifEmpty(x, y)` fills nothing or empty.**
- **Each argument is checked at save** against what the setting expects (`ARGUMENT_TYPE_MISMATCH`); an object that is not exactly one of the forms is `ARGUMENT_MALFORMED`; a key the function does not take is `STEP_SETTING_UNKNOWN`, with a fix to the nearest one. An expression that fails at run fails the step, naming the setting.
- **A setting that names a thing is a plain value**, not an argument: `tableKey`, a template's text, a vocabulary key, the sending `address`. A setting that names a field says `field` (`{ "field": "renewsOn", "op": "eq", "value": "day" }`), never `{path}`.

`record.create` and `record.update` take the record's fields either whole or one by one — `data` (an argument naming the object) or `fields`, never both:

```json
{
  "tableKey": "review",
  "fields": {
    "bookId": "book.id",
    "rating": 5,
    "status": { "literal": "draft" },
    "readers": "club.members[].userId[distinct]",
    "title": { "expr": "$uppercase(book.title)" },
    "note": { "path": "draft.note", "optional": true }
  }
}
```

Each `fields` key is a field of the table, checked at save with the nearest name suggested; an entry that comes out absent is left off the record (on an update in merge mode, the field is untouched).

- **A value built field by field is a `value.build`.** Its `fields` map each field of the value to a JSONata expression — **a bare string there is an expression, not a path**, the one place a bare string is not a path (`"stars": "$round(avg, 1)"`, or the same as `{"expr": "…"}`); a field whose expression gives nothing is left out. There is no `when`: a field set only when something holds is one expression, `"topReview": "$count(reviews) > 0 ? reviews[0].text"` — JSONata's `cond ? x` with no else gives nothing when `cond` is false, so the field is left out (or put the step in an `if` block). It declares no output type: a field whose expression always gives a value is proved present to every step after it; a `cond ? x` field may be left out, so read it with a tolerance (`{"path": "card.topReview", "optional": true}`), inside an `if` block testing `{"has": "card.topReview"}`, through `$default(card.topReview, …)`, or behind a truthiness test in the expression: `{"expr": "card.topReview ? $uppercase(card.topReview) : 'none'"}` (`card.topReview != null ? … : …` works too; only the true branch counts). `$exists(p)` is not a guard: it is true when `p` is `null`, and `null` counts as nothing. Use `value.transform` for logic over the whole value.
- **Save hints where a transform could go** (severity `info`, never blocking): `TRANSFORM_FEEDS_ONE_INPUT` when one input of one other step is all that reads a `value.transform`'s value — write the expression there as `{"expr": …}` — and `TRANSFORM_IS_ONE_OBJECT` when a transform builds one object, which a `value.build` can say.
