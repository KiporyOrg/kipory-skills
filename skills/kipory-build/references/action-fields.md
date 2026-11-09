# A function step's fields

<!-- field-ok: userInfo — an ambient value every flow can read, not a request field -->
<!-- field-ok: tableInfo — an ambient value every flow can read, not a request field -->
<!-- field-ok: projectInfo — an ambient value every flow can read, not a request field -->
<!-- field-ok: runInfo — an ambient value every flow can read, not a request field -->

An **action** is the kind of step that runs a function. This page has every field it takes, what `with` holds, the forms an argument takes, and the run settings. The blocks (`if`, `each`, `repeat`, `parallel`, `try`) and the terminals (`return`, `fail`) are in `patterns.md`; the save that judges a step is `checking.md`.

## 1. The step

```yaml
- key: line
  function: text.generate
  with:
    prompt: "Write one friendly line for the packing slip of this box: {{found | json}}. Output only the line."
  tries: 2
  description: The packing slip's line.
```

| Field                    | Takes                                                                                                                    | Left out                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `key`                    | camelCase, unique in the whole flow; the name the step's value is read by                                                | required                       |
| `function`               | a function key from the catalog (`functions/README.md`)                                                                  | required                       |
| `with`                   | the function's settings, by name (§2)                                                                                    | the function's defaults        |
| `timeoutMs`              | the most time the step may take, in milliseconds                                                                         | the function's own limit       |
| `tries`, `tryDelayMs`    | how many times the step is tried in all (1 to 5), and the wait between tries (at most a minute)                          | tried once                     |
| `vendor`                 | `{use?, switch?}`: the vendor asked first; `switch` is `never`, `when-kipory-account-fails` or `when-vendor-fails`       | the platform's order, `never`  |
| `onTransient`            | for a run a schedule or trigger started: `fail` ends it on a vendor's passing failure, `retry-later` runs it again later | `fail`                         |
| `reuseResultsForMinutes` | how long a result for the same settings is reused instead of running again; `0` always runs fresh; at most sixty days    | the function's own cache       |
| `onOversize`             | a result too big to keep: `cut` keeps a text's start or a list's first items, `fail` fails the step                      | the platform's default         |
| `modelId`                | the AI model the step uses, for a function that calls one                                                                | the default model for its task |
| `description`            | a note for people reading the flow; it changes nothing the step does                                                     | none                           |
| `enabled`                | `false` switches the step off: it does not run                                                                           | runs                           |

- **The object is strict.** A field it does not know, or a second kind on one step (`function` beside `if`), is refused `FLOW_STEPS_INVALID`, and the message names the kind and the field: ``A `function` step at `tries`: …``.
- **Run settings fit the function.** `tries` and `tryDelayMs` are for a function the platform queues — a model call, a fetch from outside; a function that runs inside the flow is never retried, and setting them is refused `RUN_TRIES_NOT_SUPPORTED`. `timeoutMs` above the function's own budget is refused `RUN_TIME_LIMIT_ABOVE_BUDGET`; `reuseResultsForMinutes` on a function that saves no result, `RUN_REUSE_NOT_SUPPORTED`. The function's page says which phase it runs in.
- **Pinning `modelId` takes this one step out of the project's model choice.** Leave it out to follow it (`models.md`).
- **`vendor` is accepted on every function whose vendors the platform routes between** — every function whose page lists `servedBy`, such as `url.scrape`, the social reads, `x.posts` and `youtube.transcript`; on any other the save is refused `STEP_VENDOR_SETTING_UNUSED`. `GET /v1/functions/{key}` names the vendors under `servedBy`, in routing order, each with what it keeps of a step's settings (`keeps`, `why`). `vendor.use` takes a vendor's name as that page gives it, a vendor added since the last release included; a vendor `servedBy` does not list, or one that cannot keep the step's settings, is refused at save `VENDOR_DOES_NOT_COVER` (a step already stored that way keeps running, with the `VENDOR_DOES_NOT_COVER_STORED` warning).
- **`GET /v1/flows/{id}?expand=timeLimits`** shows each function step's effective time limit and which layer decided it.

## 2. `with`

`with` holds, by name:

- **the function's settings** — the config table on its page (`functions/<key>.md`): `tableKey`, `limit`, `fieldFilters`, `onKeyTaken`, …;
- **the values it reads** — the inputs its page names (`url.fetch` reads `url`, `text.decide` reads `message`, `audio.transcribe` reads `audio`), each an argument (§3);
- **a model step's prompt** — `text.generate` takes `prompt` and `system`, `text.interpolate` takes `template`: plain text. A placeholder is `{{name}}`, `{{name.field}}` or `{{name[0]}}`, and the save reads it like any other read. One item's field (`{{found[0].fruit}}`) is not a placeholder (`TEMPLATE_PLACEHOLDER_UNREAD`): compute it in a step first and write `{{thatStep}}`. A placeholder that names a whole object or list (`{{order}}` where `order` is an object, `{{items}}` where it is a list) is refused at save, `INTERPOLATE_BARE_STRUCTURED_SLOT`: it would render empty. Name a field (`{{order.total}}`), write `{{order | json}}`, or loop over a list with `{{#items}}…{{/items}}`.

A key the function does not take is refused `STEP_SETTING_UNKNOWN`, with a fix that renames it to the nearest one it does take. A misspelt argument (`{path: x, optinal: true}`) is refused where it stands, never handed to the function.

**`with.outputSchema` is the declared answer of `text.generate` and `text.decide`, and only theirs.** It names the type by its key, `{kind: "ref", ref: "TicketTriage"}` (a list of them: `{kind: "list", element: {kind: "ref", ref: "TicketTriage"}}`); every save resolves the key, and an unknown key is refused at save, with a fix per near key. Left out, `text.generate` answers text; given a type, it answers a value of that type, and the run checks the answer against it. A `text.decide` type is an object whose fields are its questions (`models.md`). Every other function types its own value: there is no `outputSchema` to give it.

**A sub-flow call** names the flow by key and gives its inputs by name; its value is the called flow's outputs:

```yaml
- key: total
  function: flow.invoke
  with:
    flow: sum-boxes
    inputs:
      memberId: member.id
```

A required input of the called flow left out is refused `CALL_INPUT_MISSING`. `flow.start-per-person` takes the same `flow` and `inputs`, plus `people`.

## 3. Arguments

Wherever a step reads a value, it takes an argument:

| Form                                       | Means                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `member.email`                             | a path, read as **required**: the save must prove it is there on every path (`checking.md`)         |
| `{path: member.email, optional: true}`     | passes nothing when the value is missing; the function then runs without it                         |
| `{path: pounds, default: 10}`              | uses the default only when the value is missing; the default is an argument too                     |
| `{path: state, default: {literal: "new"}}` | a text default is a `literal`: `default: new` would read a value named `new` (`STEP_READS_UNKNOWN`) |
| `{literal: "Dear member"}`                 | a fixed value of any JSON: text, a list, an object                                                  |
| `10`, `true`                               | a bare number or boolean is a fixed value                                                           |
| `{expr: "$count(due.records)"}`            | a JSONata expression over the values the step can see                                               |

- **A bare string is a path.** Text is `{literal: "…"}`; `subject: Renewal` reads a value named `Renewal`, and the save says nothing gives it (`STEP_READS_UNKNOWN`, with a fix that makes it a literal).
- **`{path}` always carries `optional: true` or `default`**; a plain read is the bare string. An object holding `path`, `literal` or `expr` and anything else is refused where it stands.
- **In YAML, quote a path with `[` inside `{ … }`**: `{ out: "perMember[].written" }`. Unquoted, the document does not parse.
- **What a step can see**: the flow's inputs, every step written above it in its own list or an enclosing one (by key), a block's `out` after the block (`<block>.<name>`), an `each`'s `as` and a `repeat`'s vars inside them, `error` inside a `catch`, and the ambient values `userInfo` (the signed-in person), `tableInfo`, `projectInfo` and `runInfo`. `userInfo` and `tableInfo` are optional: a schedule has no person, so a required read of `userInfo.userId` is refused until it is guarded.
- **A path never reads through a list.** Say which item: `found[0].fruit`, `found[last].fruit`, or `due.records[].email` for the field of every item; `[distinct]` drops repeats.
- **An expression's top-level names are reads too**, judged like paths. Inside `[…]` a bare name is the item's field. `$default(x, y)` fills only nothing; `$ifEmpty(x, y)` fills nothing or `""`, `[]`, `{}`. `functions/expressions.md` lists the functions an expression may call.
- **An `{expr}` has no `when`.** A value that exists only sometimes is `cond ? x` inside the expression — with no else it answers nothing, and `value.build` leaves that field out — or a step inside an `if`.
- **A setting that names a thing is a plain value**: `tableKey: box`, `address: renewals@example.test`, a template's text, a vocabulary key. The function's page shows which settings take an argument.

## 4. A setting that names a field says `field`

A filter, a sort or a check names a field of the records it reads by its plain name under `field`, never as a read:

```yaml
with:
  tableKey: member
  dataNullChecks: [{ field: email, op: isNull }]
  fieldFilters: [{ field: renewsOn, op: eq, value: day }]
```

`field` is a name; `value` is an argument (here a path to the flow's input `day`). A read where a field name belongs (`field: {path: email, optional: true}`) is refused `STEP_FIELD_NAME_IS_PATH`, with a fix that writes the name itself.

## 5. The step's value

A step has one value, read by its key: `save.recordId`, `boxes.records`, `line`. A function's extra results are fields of that value — `record.create` answers `recordId` (and `keyTaken` under `onKeyTaken: skip`), `record.list` answers `records` and `nextCursor`, `record.read` a list of records.

**Some values may be nothing, and the save knows which**: the value of `record.create`, `text.decide`, `url.fetch`, `url.scrape`, `url.metadata`, `web.search`, `place.details`, `youtube.video`, `file.stats`, `image.metadata`, the social profile and post reads and others; a field the type marks optional; an expression it cannot prove answers a value. A step that reads such a value as required is refused `STEP_INPUT_MAY_BE_ABSENT` (a field: `STEP_INPUT_FIELD_MAY_BE_ABSENT`); a `return` of a required output, `FLOW_OUTPUT_MAY_BE_NOTHING`. Read it inside `if: [{test: {has: x}, …}]`, as `{path: x, optional: true}` or `{path: x, default: …}`, wrap an expression in `$default(…, …)`, or fail first when it is missing — each finding carries the fix.

**A function input that must not be empty** (a list to read ids from, a text to chunk) fed a value that may be `""`, `[]` or `{}` is refused `STEP_INPUT_MAY_BE_EMPTY`: guard it with `{filled: x}`, or give the value a type that declares `minLength` ≥ 1 (text) or `minItems` ≥ 1 (a list), which counts as non-empty. A default never covers empty. At run time an empty value there fails the step `STEP_INPUT_EMPTY`.

Types (§3), what a step reads (§4), when a step runs (§5) and what a setting takes, a path, a fixed value or an expression (§7), are in `action-inputs.md`.
