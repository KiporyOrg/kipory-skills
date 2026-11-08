# Action inputs: schema references, derived inputs, when an action runs, what a setting takes

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->

Read this for how an action's inputs are typed and wired: sections 3, 4, 5 and 7 of `action-fields.md`, which keeps the action body (§1), output binding (§2) and the failure slot (§6).

## 3. Schema references

What `inputSchemas[]` and `outputSchema` hold. On the row API a named type is `{ "kind": "ref", "dataTypeId": "<id>" }`; inside a document it is `{ "kind": "ref", "ref": "<type key>" }`. Named types match by identity, never by structure: two types with identical fields are still two types, and wiring one where the other is expected is a `NOMINAL_MISMATCH`. Reuse one type. The other forms wrap one of those:

| Form                                             | Means                                                                                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `{ "kind": "list", "element": <ref> }`           | a list — `RecordRead[]` is `list` of `ref RecordRead`                                                                         |
| `{ "kind": "optional", "inner": <ref> }`         | may be absent — an optional flow input arrives this way, and an action reading one must type it so (`endpoint-answers.md` §8) |
| `{ "kind": "union", "members": [<ref>, <ref>] }` | one of several — on an input only, never an output                                                                            |
| `{ "kind": "record", "valueType": <ref> }`       | a string-keyed map                                                                                                            |
| `{ "kind": "recordRef", "tableKey": "<type>" }`  | one stored record's id                                                                                                        |

The built-ins (`string`, `number`, `boolean`, `object`, `file`, …) and the platform's own types (`RecordRead`, `RecordPage`, `UserInfo`, `ProjectInfo`, …) work like yours: in a document name them by key; on the row API read the id with `GET /v1/types?project={nodeId}&key=<Key>`. `GET /v1/flows/{id}/scope` lists every slot an action may read, already typed.

**A list on a flow output is `isList: true`.** `object` covers a list only in an action's `outputSchema`. A flow output carrying a list is declared `{ "slot": "books", "typeName": "BookCard", "isList": true }`. A single item arriving there is taken as a one-item list, and a missing value stays missing: a path such as `books.records.{…}` gives a bare object when the page holds one record, and the output still answers a one-item list. Typed `object` alone, the output fails the call with `502 FLOW_FAILED` whenever a list arrives — from a path, whenever more than one item matches — so it passes on one-record pages and fails on the first fuller one. The plan refuses a certain list bound to a non-list output (`OUTPUT_BINDING_TYPE_MISMATCH`): a list `outputSchema`, or a transform whose expression's form plainly makes one (`[…]`, or a plain path through a list such as `books.records.{…}`). It reads the expression's form, not a run's result; a list it cannot tell from the form still fails at run time, and so does an output bound by a `path` that reaches into a list, which the plan does not check: declare that output `isList: true` too. The action feeding it declares a list `outputSchema` too (`{ "kind": "list", "element": { "kind": "ref", "ref": "BookCard" } }`): a single item is then taken as a one-item list at both, the action and the flow output. A named list type (one whose definition is an array) counts as a list output too.

**A list type's `maxItems` is held at run.** An action whose declared output type is a list with `maxItems` and which returns more items fails, naming the slot, the count and the bound; return fewer, or raise the type's `maxItems`. The save counts the reads that slot feeds at that bound, so the run holds it too.

## 4. Inputs the platform derives

**An action whose settings or prompt name its inputs gets them from the platform** — `value.transform`, `value.first-non-empty`, `record.list`, `record.read`, `text.generate` and the other config- or template-driven functions.

- Omit `inputStreams` (or send `[]`) and the save stores the names the settings or prompt read, each typed from what feeds it.
- A PATCH that changes the settings or prompt without `inputStreams` re-derives them.
- A list you DO send must be exactly those names (plus any file a prompt action attaches): the save compares the two as sets and refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH`, whose message names what is missing or extra.
- `flow.invoke` and `flow.merge` go further: their inputs are mirrored from config — the roots an invoke's `inputs` map reads, a merge's lane sources — and a list you state is replaced (`fan-out.md` §2, `patterns.md` §3).

Two things catch people:

- **Provider slots count.** `record.list` and `record.read` default `userId` to `userInfo.userId`, so the save adds `userInfo` to their inputs itself, even on a project-wide table a key calls — leave `inputStreams` out, or include it in a list you send. A prompt reading `{{projectInfo.config.<namespace>.<field>}}` needs `projectInfo` (schema `ProjectInfo`).
- **In JSONata, only a name at the top of an expression is read as a slot**: inside `[…]` or after a `.` it is a field of each item (`$$.name` reads the slot there), and a top-level `undefined` is a slot too. `utilities.md` ("`value.transform`") has the rule, the way round it and the five refused functions.

## 5. When an action runs

- **An action runs while any one of its inputs is present** (`patterns.md` §1). "Present" means non-empty.
- **A run with no signed-in user has no `userInfo` at all** — a key's call, a schedule, a trigger.
  - An action whose only inputs are provider slots still runs: a project-wide read ignores the missing user, and a per-user table refuses.
  - An action reading `userInfo` beside a real slot (a cursor, an optional query filter) waits for that slot, and is skipped when it never arrives. An optional filter is a view's `optional` param instead (`views.md` §11); `record.view` runs whichever of its inputs arrive.
  - Preview with `input.principal: "no-end-user"` to see the run a key or a schedule gets (`checking.md`).
- **A condition is judged before the inputs, and it may name any slot of the flow.** The slot does not have to be one of the action's inputs, and the action is ordered after whatever writes it. An action whose condition fails is skipped whatever its inputs hold.
- **"Run only when a slot is absent" is `not` around `slotPresent`, on the action itself**: `"condition": { "op": "not", "inner": { "op": "slotPresent", "slot": "found" } }`. There is no separate operator for absence — `not` wraps any clause (`inner`), and `and` and `or` take a list (`all`, `any`). Put it on the action that should run — the `record.create` reading its data slot — and name the slot that decides in the condition only. A helper action that turns "absent" into a marker is not needed, and would not work: a transform reading only the absent slot is skipped with it.
- **A condition that fails is a skip, not a failure.** A condition that throws is different: the action fails with `condition-error`.
- **A condition can be a JSONata expression**: `{ "op": "expr", "expr": "$count(reviews.records) > 0" }`, with no `slot`. It works in an action's `condition` and a `flow.loop`'s `until`, alone or inside `and`/`or`/`not`; a trigger's filter refuses it. It holds when the value is true by JavaScript's rule: an expression that gives nothing, `false`, `0`, `""` or `null` fails, and anything else holds — `[]` and `{}` included, so test a list with `$count(x) > 0`, not `x`. Its top-level names are slots like any expression's. An expression that throws does not skip the action: it fails it with `condition-error`.
- **Which operator tests which kind of value** is `GET /v1/actions/condition-operators` — the table a `condition` is checked against at save and evaluated by at run time.
- **`flow.dispatch` with no `default` silently skips an unmatched input**, and so does every action below the unwritten branch slot whose inputs all trace back to it. An action that also reads another present slot still runs, so guard a branch action on its branch slot with `slotPresent`.

## 7. What a setting takes: a slot, a fixed value or an expression

Every setting that reads a value from the run — a function's `ids`, `data`, `to`, `userId`, a `fields` entry, a `flow.invoke` input, a `flow.loop` seed, a `record.query` operand, a `fieldFilters` value — takes an **argument**, in one of three forms:

| Written                                 | Is                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `"book.title"`, `"page.records[].id"`   | a slot path: the slot, then `.field` and brackets. A bare string is always a path          |
| `{ "literal": "neutral" }`, `5`, `true` | a fixed value. `literal` holds any JSON — text, a list, an object, `null`                  |
| `{ "expr": "$count(page.records)" }`    | an expression: JSONata, evaluated before the function runs, over the slots the action sees |

- **Brackets**: `[]` every item (`records[].id`), `[0]` / `[first]` / `[last]` one item, `[distinct]` the list with repeats dropped (`reviews.records[].readerId[distinct]`), `[compact]` the list with absent and `null` items dropped. `[distinct]` and `[compact]` after a value that is not a list are refused at save.
- **A path never reads through a list.** A `.field` read off a list reads nothing and is refused `CONFIG_SLOT_PATH_CROSSES_LIST`: a `record.read` gives a list even for one id, so its title is `book[0].title`, not `book.title`. Name the item (`[0]`, `[first]`, `[last]`) or every item (`book[].title`). JSONata is the other way round: in an `expr`, `book.title` maps over the list, giving the one title for a one-item list.
- **`[]`, `[distinct]` and `[compact]` over no items give `[]`**, a value, not an absent argument: the action still runs and gets an empty list (a `record.read` given no ids reads nothing and answers `[]`; with `failIfEmpty`, a 404). Only `[0]`, `[first]`, `[last]` on an empty list, or a missing field, come out absent.
- **A bare number, `true` or `false` is the same as `{ "literal": … }`**: `"urgent": false` and `"urgent": { "literal": false }` are one value. Only text needs the wrapper, because a bare string is a path.
- **A one-item list is an expression**: `"ids": { "expr": "[bookId]" }` hands a list-taking setting one id — no transform. A path has no such form.
- **A path's root and an expression's top-level names are the action's inputs**: leave `inputStreams` out and the save derives them (section 4). A fixed value reads nothing.
- **An argument that comes out absent** is not given: the action behaves as with an absent slot. An expression that fails fails the action, naming the setting.
- **Each argument is checked at plan** against what the setting expects (`ARGUMENT_TYPE_MISMATCH`); a path naming no slot is `ARGUMENT_PATH_NAMES_NO_SLOT`, an object that is not exactly `{literal}` or `{expr}` is `ARGUMENT_MALFORMED`.
- **A setting is named for what it holds.** `ids`, `data`, `userId`, `to`, `headers`, `seed` — a setting an action reads carries no `Slot` suffix; where a fixed field and a slot field once sat side by side (`limit`, `headers`, a clause's `value`), the one field takes either. A write holding a retired name is refused with the new one named, and `kipory-connect`'s upgrade script converts a format-8 document.

`record.create` and `record.update` take the record's fields either whole or one by one — `data` (an argument naming the object) or `fields`, never both:

```json
{
  "tableKey": "review",
  "fields": {
    "bookId": "book.id",
    "rating": 5,
    "status": { "literal": "draft" },
    "readers": "club.members[].userId[distinct]",
    "title": { "expr": "$uppercase(book.title)" }
  }
}
```

Each `fields` key is a field of the table, checked at plan with the nearest name suggested; an entry that comes out absent is left off the record (on an update in merge mode, the field is untouched).

- **A typed value built field by field is a `value.build`.** Its `fields` map each field of the action's declared `outputSchema` to a JSONata expression — **a bare string there is an expression, not a slot path**, the one place a bare string is not a path (`"stars": "$round(avg, 1)"`, or `{"expr": "…", "when": "…"}` to set the field only when `when` holds); every name and type is checked at plan, and it needs a declared output type. Use `value.transform` for a value with no type of its own.
- **A condition can be an expression**: `{"op": "expr", "expr": "$count(page.records) > 0"}` in an action's `condition` or a loop's `until`, alone or inside `and`/`or`/`not` (section 5).
- **Health hints where a transform could go** (severity `info`, never blocking): `TRANSFORM_FEEDS_ONE_INPUT` when one input of one other action is all that reads a `value.transform`'s slot — write the expression there as `{"expr": …}` — and `TRANSFORM_IS_ONE_OBJECT` when a transform builds one object, which a `value.build` can say.
