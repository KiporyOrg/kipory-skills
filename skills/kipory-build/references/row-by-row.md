# Authoring a flow step by step, and what bites

<!-- field-ok: perMember — the example flow's own step key -->

`SKILL.md` sends a new backend to `quickstart-document.md`. This page is for one flow between documents: create it, save its steps whole, change them by key, and the pitfalls.

## Before the first call

- **Read the whole function catalog** — `functions/README.md`, or `GET /v1/functions` live — not a filtered view. Confirm every key live with `GET /v1/functions/{key}` before you write a step on it.
- **A flow reaches the outside only through a function**: a vendor through its own, any other HTTP API through `url.fetch` (a read) or `url.send` (a write, delivered once after the run saves), each with a stored key named in `secret` (`kipory-gather`).
- **A yes/no, a pick from a closed list or a score is `text.decide`, not a prompt** — the cheapest model step (`models.md`).
- Know the grammars you type: a flow key is kebab-case (`renew-members`); a step key, an input, an output and every name a block gives are camelCase (`perMember`); an argument is a path, `{path, optional | default}`, `{literal}` or `{expr}` (`action-fields.md` §3); a prompt placeholder is `{{name}}`, `{{name.field}}` or `{{name[0]}}`.

## The routes

```
POST  /v1/flows                          { project, key, label, inputs, outputs } — a flow with no steps yet
PUT   /v1/flows/{id}/steps               { version, validateOnly?, steps } — the whole list, in the order it runs
POST  /v1/flows/{id}/steps/edit          { version, validateOnly?, edits } — up to 100 edits by key, all or none
GET   /v1/flows/{id}                     the flow; `steps` in written order; `?include=reads` adds each step's place and reads
GET   /v1/flows/{id}/outline             the steps as an indented outline
PATCH /v1/flows/{id}                     { version, label?, description?, inputs?, outputs? } — the signature
GET   /v1/flows/conditions               every test an `if` or a `repeat`'s `until` can use
GET   /v1/projects/{nodeId}/references?of=field:<table>.<field>   who uses a field — ask before you rename, remove or retype one
```

- **Every write takes the flow's `version`** as you read it; a stale one is `409` and saves nothing. Every write answers the next `version`.
- **A saved steps write answers** `{flowId, version, diagnostics, changes, touched}`: `diagnostics` are warnings (an error refuses the write), `changes` lists each step `added`, `removed`, `changed` or `moved` by key with the fields that changed.
- **A refused write is `422`** with the findings under `details.diagnostics`, each with `at` and its `fixes` or `decision` (`checking.md` §2).
- **A signature change** (`PATCH /v1/flows/{id}` with `inputs` or `outputs`) re-judges every step, and is `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` while an endpoint or a table holds the old one — read `kipory-evolve` first.

## The step kinds

A flow is `{key, label, description?, inputs, outputs, steps}`: a typed signature and a list of **steps**. A step is a `key` plus exactly one kind:

| Kind       | Shape                                                      | Does                                                                         |
| ---------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| action     | `{key, function, with?, …run settings}`                    | runs a function; its value is read as `<key>` or `<key>.<field>`             |
| `if`       | `{key, if: [{test, steps, out?}], else?: {steps, out?}}`   | runs the first branch whose test holds                                       |
| `each`     | `{key, each, as, steps, out?, maxItems?, maxParallel?, …}` | runs its steps once per value of a list; its value is `<key>[].<name>`       |
| `repeat`   | `{key, repeat: {vars, next, until, max}, steps}`           | runs its steps in passes until `until` holds; read `<key>.<var>` after it    |
| `parallel` | `{key, parallel: [steps], out?}`                           | runs its steps at the same time; none reads another                          |
| `try`      | `{key, try: {steps, out?}, catch: {steps, out?}}`          | survives the flow's own failure (never a refusal or the platform's)          |
| `return`   | `{key, return: {<output>: <argument>}}`                    | ends the flow and gives its outputs — the only way to give them              |
| `fail`     | `{key, fail: {code, message, status?}}`                    | ends the flow; an endpoint answers `status`, your `code` in `details.reason` |

## The whole list

`PUT /v1/flows/{id}/steps` replaces the stored list whole:

```json
{
  "version": 3,
  "steps": [
    {
      "key": "due",
      "function": "record.list",
      "with": {
        "tableKey": "member",
        "limit": 100,
        "pages": { "max": 10, "onMore": "fail" },
        "fieldFilters": [{ "field": "renewsOn", "op": "eq", "value": "day" }]
      }
    },
    {
      "key": "perMember",
      "each": "due.records",
      "as": "member",
      "maxParallel": 1,
      "steps": [
        {
          "key": "reachable",
          "if": [
            {
              "test": { "filled": "member.email" },
              "steps": [
                {
                  "key": "note",
                  "function": "text.interpolate",
                  "with": {
                    "template": "Dear {{member.name}}, your membership renews on {{day}}."
                  }
                }
              ],
              "out": { "written": { "literal": 1 } }
            }
          ],
          "else": { "steps": [], "out": { "written": { "literal": 0 } } }
        }
      ],
      "out": { "written": "reachable.written" }
    },
    { "key": "answer", "return": { "notes": "perMember[].written" } }
  ]
}
```

Read it top down: `due` lists the members renewing on the input `day`; `perMember` runs once per member; inside, `reachable` writes a note only for a member with an email, and each branch gives `written` through its `out`; the `each` gives `written` per member; `answer` returns the list `perMember[].written`.

## Edits by key

`POST /v1/flows/{id}/steps/edit` changes some steps and leaves the rest:

```json
{
  "version": 4,
  "edits": [
    {
      "insert": {
        "key": "count",
        "function": "value.transform",
        "with": { "expression": "$count(due.records)" }
      },
      "after": "due"
    },
    { "set": "due", "field": "with.limit", "value": 50 },
    { "wrap": ["note"], "in": { "try": {} }, "key": "noteSafe" }
  ]
}
```

| Edit     | Shape                                                                                        | Notes                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `insert` | `{insert: <step>, after: key}`, `{…, before: key}` or `{…, into: {block?, branch?, at?}}`    | `into` with no `block` is the flow's top list; `branch` is an `if`'s index or `else`, or `try` / `catch`; `at` defaults to the end |
| `move`   | `{move: key, after \| before \| into}`                                                       | keeps the step's value and its readers                                                                                             |
| `set`    | `{set: key, field: "with.to", value}`                                                        | `field` is a dotted path (`with.to`, `if[0].test`); `value: null` removes an optional field, never a list element                  |
| `remove` | `{remove: key}`                                                                              | refused while a step still reads it, unless the same batch changes that reader                                                     |
| `wrap`   | `{wrap: [keys], in: {if: {test}} \| {try: {}} \| {parallel: {}} \| {each, as}, key: newKey}` | the keys must sit next to each other in one list; the new block takes their place                                                  |
| `unwrap` | `{unwrap: key}`                                                                              | a single-branch `if`, a `try` whose `catch` is empty, or a `parallel`                                                              |

- **A batch is all or none**, applied in order against `version`, at most 100 edits; a bigger change is a whole-list `PUT`. A refused edit is `STEP_EDIT_REFUSED`, naming it by `editIndex`.
- **A finding's fix is a batch of these edits**: post its `edit` as `edits` (`checking.md` §2).
- **`validateOnly: true`** judges the batch against the stored steps and saves nothing.

## What will bite you

<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: userInfo — an ambient value the platform fills, not a request field -->

- **Working around a problem in silence.** When something on Kipory stops you — an unexpected error, a doc that said something untrue, a missing capability — file a report: `kipory-connect`, "When something stops you".
- **Written order is run order.** A step that reads what a later step gives is `STEP_READS_LATER`; its fix moves the giver up. Steps run together only in `parallel` (whose children cannot read each other) or across an `each`'s values.
- **A value made inside a block stays there.** Read after the block through its `out`, as `<block>.<name>`; an `each`'s as `<each>[].<name>`, a list with one entry per value. `BLOCK_VALUE_ESCAPES` otherwise.
- **A bare string is a path.** `subject: Renewal` reads a value named `Renewal`; text is `{literal: "Renewal"}`. A setting that names a thing — `tableKey`, `address`, a template — is a plain value.
- **A run with no signed-in person has no `userInfo`** — a key's call, a schedule, a trigger. A required read of `userInfo.userId` you write is refused at save until you guard it with `if` + `{has: userInfo}` or read it `optional`. A per-user table read that leaves `userId` to the run is not seen at save: with no person it fails at run, 403 at an endpoint. Preview a scheduled flow with `input.principal: "no-end-user"`.
- **Nothing is skipped at run time.** A step whose required input is missing fails the run with a typed error; a step given `[]` runs with `[]`. To go on past a failure, wrap the steps in `try` and say in `catch` what happens; inside `catch`, `error` is `{code, message, step}`.
- **An endpoint's error is a `fail` step**: `{key: refuse, fail: {code: TOO_HEAVY, message: "A box holds at most 20 lb.", status: 422}}` ends the flow and answers that status (any 4xx except 405, 408 and 426; 422 when left out): `code` `VALIDATION_FAILED`, your message, `details.reason` `TOO_HEAVY`. A status with no word of its own, such as 400, 402 or 418, answers `code` `REQUEST_REFUSED`.
- **Only `return` gives outputs.** A flow with required outputs and a path that ends without `return` or `fail` is refused `FLOW_PATH_HAS_NO_END`.
- **A list read is one page.** `record.list` and `record.query` read one page unless `pages` says more; `onMore: "fail"` fails the run when rows remain instead of dropping them. The save warns `RECORD_LIST_CURSOR_UNREAD` when nothing reads the next page. A read's `cursor` bound in `with` to a path whose root ran or was given (another read's page) with nothing at the path (that page's `nextCursor` after its last page) means the list ended, and it answers an empty page; the root absent (the first run, an optional input left out), or no `cursor` bound, reads page one. `""` is a value, so page one too.
- **An `each` runs one value at a time when its steps change something another value could meet** (`EACH_RUNS_ONE_AT_A_TIME`, a warning). Say `maxParallel: 1` to mean it.
- ⛔ **Preview costs money and writes.** `apply` defaults to true; `apply: false` still runs every step and every model call. `checking.md` §6.
- **Pinning `modelId` takes one step out of the project's model choice, silently.** `models.md`.
- **A model call can fail on the provider, not on you.** `models.md` has what to do when a provider account is exhausted.
- **A flow with no steps yet does not start** (`FLOW_NOT_AUTHORED`). A new flow is created with `steps: []`; step 2 writes them.
