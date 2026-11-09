<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Flows & steps

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> the function keys and settings a step can use → live `GET /v1/functions`. **Always** confirm a
> function key against the live catalog, never against this pack. This pack carries judgment.

A flow is a list of steps run in the order written. Each step has a key that is also the name its
value is read by; an action step runs a function, a block (`if`, `each`, `repeat`, `parallel`, `try`)
holds steps, and `return` or `fail` ends the flow. The save proves every read before it accepts the
list, and every error it finds arrives with a ready fix you can post as it is.

## If you read one screen

- **Written order is run order.** A step reads only what a step above it gave, or a flow input. A
  read of a value given only further down is refused (`STEP_READS_LATER`). Things run at once only
  inside a `parallel` block or an `each`.
- **The save proves every read.** A required read of a value that may be nothing on some path —
  an optional input, a step inside an `if`, a function that may answer nothing, `userInfo` — is a
  save error, with `fixes` whose `edit` you post to `POST /v1/flows/{id}/steps/edit`. At run, a
  step whose required input is missing fails with a typed error; nothing is skipped silently.
- **`if` is the only "only when".** No step carries a condition of its own.
- **`try`/`catch` is the only way to survive a failure.** Without it, a failed step fails the run.
- **Preview writes unless you say otherwise.** `apply` defaults to `true`; `apply: false` is the
  dry run. → _Preview a whole flow_
- **A schedule has no user.** `userInfo` is absent on a scheduled run. A required read of it that
  you write is a save error until you guard it with `if` and `has`; a per-user table read that
  leaves its user to the run is not seen at save and fails at run (403 at an endpoint).

## What a flow is

A flow is `{key, label, description, inputs, outputs, steps}`:

- **`key`** — kebab-case (`renew-members`), fixed at create, refused (not lower-cased) in any other
  form. `label` is the display text and changes freely.
- **`inputs` and `outputs`** — maps by name. Authored, each value is
  `{typeName, isList, optional, description}` with only `typeName` required: the name of a
  registered type (`string`, `number`, `boolean`, a library type or one of your project's). Read
  back, each carries the resolved `type`. A caller may leave out an `optional` input; a flow may
  not give an `optional` output.
- **`steps`** — the list, in written order. A step is `key` plus **exactly one kind**:

| Kind       | Shape                                                                                     | Its value                                      |
| ---------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| action     | `{key, function, with, …run settings}`                                                    | the function's answer: `<key>`, `<key>.field`  |
| `if`       | `{key, if: [{test, steps, out}], else: {steps, out}}`                                     | `<key>.<name>` from the branch that ran        |
| `each`     | `{key, each, as, maxItems, maxParallel, maxFailedBranches \| maxFailedShare, steps, out}` | the list of each run's `out`: `<key>[].<name>` |
| `repeat`   | `{key, repeat: {vars, next, until, max, onPassFail, onMax}, steps}`                       | its vars after the last pass: `<key>.<var>`    |
| `parallel` | `{key, parallel: [steps], out}`                                                           | `<key>.<name>`                                 |
| `try`      | `{key, try: {steps, out}, catch: {steps, out}}`                                           | `<key>.<name>`                                 |
| `return`   | `{key, return: {<output>: argument}}`                                                     | ends the flow with its outputs                 |
| `fail`     | `{key, fail: {code, message, status?}}`                                                   | ends the flow with an error                    |

Every object is strict. An unknown field, or two kinds on one step, is refused with
`FLOW_STEPS_INVALID`, and the message names the step's kind and the field ("A `function` step at
`tries`: …"). Blocks and actions take `enabled: false`; `return` and `fail` do not.

**Keys.** A step key is camelCase (`^[a-z][a-zA-Z0-9]*$`, at most 64 characters), unique across the
whole flow, blocks included, and different from every flow input (`STEP_KEY_TAKEN`). It is the
name its value is read by, so choose it as the noun the value is (`dueMembers` for the members due, `note` for a note).
`__proto__`, `constructor` and `prototype` are refused wherever you name something.

**An action is a step that runs a function.** "Action" names that kind of step only; the unit of a
flow is a step.

## The example: Orchard Club renews its members

An invented fruit-box club. Its flow `renew-members` takes a day, lists the members whose box renews
that day and, for each member with an email, writes a note and sends it (unless the run is a dry
run). It gives back, per member, 1 when a note went out and 0 when the member has no email. The
`Member` type marks only `name` required, so `email` may be missing.

```yaml
kipory: 11
flows:
  renew-members:
    label: Renew members
    description: Sends a renewal note to each member due on a day.
    inputs:
      day: { typeName: string, description: "The renewal day, as YYYY-MM-DD." }
      dryRun: { typeName: boolean, optional: true }
    outputs:
      notes:
        typeName: number
        isList: true
        description: Per member due, 1 when a note was sent and 0 when the member has no email.
    steps:
      - key: dueMembers
        function: record.list
        with:
          tableKey: member
          limit: 100
          fieldFilters:
            - { field: renewsOn, op: eq, value: day }
      - key: perMember
        each: dueMembers.records
        as: clubMember
        steps:
          - key: hasEmail
            if:
              - test: { filled: clubMember.email }
                steps:
                  - key: note
                    function: text.interpolate
                    with:
                      template: "Dear {{clubMember.name}}, your fruit box renews on {{day}}."
                  - key: mail
                    if:
                      - test: { not: { eq: [dryRun, true] } }
                        steps:
                          - key: send
                            function: email.send
                            with:
                              address: boxes@orchard.example
                              to: clubMember.email
                              subject: { literal: "Your fruit box renews soon" }
                              text: note
                out:
                  written: { literal: 1 }
            else:
              steps: []
              out:
                written: { literal: 0 }
        out:
          written: hasEmail.written
      - key: answer
        return:
          notes: perMember[].written
```

Read it as the run does:

<!-- field-ok: perMember — a step key of the Orchard Club example flow, project-authored -->
<!-- field-ok: dueMembers — a name in the Orchard Club example flow, project-authored -->
<!-- field-ok: hasEmail — a name in the Orchard Club example flow, project-authored -->
<!-- field-ok: clubMember — a name in the Orchard Club example flow, project-authored -->
<!-- field-ok: dryRun — an input of the Orchard Club example flow, project-authored -->

- `dueMembers` runs first; `perMember` reads `dueMembers.records`, so it comes after. Zero members due is `[]`,
  a value: `perMember` runs no element, its value is `[]`, and the flow returns `{notes: []}`.

- Inside the `each`, `clubMember` is the element. `filled` proves `clubMember.email` is there and not
  `""`, so `send` may read it as required. Reading `clubMember.email` outside that test would be a save
  error with a ready fix.
- `dryRun` is optional. `{eq: [dryRun, true]}` is false when `dryRun` is missing (every condition
  is false on nothing), so `not` makes the send run unless the caller said `true`.

- Each branch of `hasEmail` gives `written`, so `hasEmail.written` is always a value, and the
  `each` hands it out through its own `out`. `answer` reads the list of them as `perMember[].written`.
- `send` and `note` exist only inside their blocks; a step after `perMember` cannot read them
  (`BLOCK_VALUE_ESCAPES`). Only a block's `out` leaves it.

`GET /v1/flows/{id}/outline` answers the same flow as indented text:

```text
flow renew-members (day, dryRun?) → notes
  dueMembers: record.list
  perMember: each as clubMember
    hasEmail: if
      when #1
        note: text.interpolate
        mail: if
          when #1
            send: email.send
      else
  answer: return notes
```

## The sequence

```
POST /v1/flows                       create the flow: key, label, inputs, outputs (no steps)
PUT  /v1/flows/{id}/steps            check the list with validateOnly: true, then save it (send `version`)
POST /v1/flows/{id}/preview          run it on real inputs with apply: false, read what it did
bind it                              an endpoint, a schedule, a trigger or a table runs it
```

Or state the flow, steps included, in a project document and plan and apply it
(`POST /v1/projects/{nodeId}/document/plan`, then `POST /v1/projects/{nodeId}/document`) — the
better path for more than one flow, or a flow and the types and tables it reads.

A new flow is created with `steps: []`, and an endpoint, a trigger or a schedule can already name
it. A flow with no steps yet is not started: the run answers 409 `FLOW_NOT_AUTHORED` with
`details.flowKey` until its steps are written. It is the flow's own state, so it is never retried.

⚠️ **There is no activation and no flow lifecycle state.** A flow becomes reachable by being bound
to something and unreachable by not being. Nothing publishes one.

⚠️ **Health errors do not stop a run.** Preview, endpoints, triggers, schedules, record processing
and sub-flow calls run a flow whatever `GET /v1/flows/{id}/health` says. A save refuses errors in
what it saves, but a flow can still become wrong later (a type it reads changes, a flow it calls
changes): health says so, and the flow runs anyway. Read health before you bind.

<!-- absent: flows-have-no-activation-state -->

## Arguments: how a step reads a value

Wherever a step reads a value — a function's setting that takes one, an `each`'s list, a `repeat`'s
vars, an `out` or a `return` — it takes an **argument**:

| You write                                  | It means                                                            |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `"dueMembers.records"` (a bare string)     | a **required** read of that path; the step needs a value there      |
| `{path: clubMember.phone, optional: true}` | read it; when missing, pass nothing and let the step run without it |
| `{path: dryRun, default: false}`           | read it; when missing, use the default (itself an argument)         |
| `{literal: "Dear member"}`                 | a fixed value, any JSON                                             |
| `{expr: "$count(dueMembers.records)"}`     | a JSONata expression over the values in scope                       |
| `100`, `true`                              | a bare number or boolean is a fixed value                           |

⛔ **A bare string where a value is read is a PATH.** Text is `{literal: "…"}`. `subject: Renewal`
reads a value named `Renewal`, which nothing gives, and the save refuses it (`STEP_READS_UNKNOWN`,
whose fix turns it into text when the word was meant as text).

A path starts at a name in scope: a flow input, a step's key above, a name a block gives (`clubMember`
inside the `each`, a `repeat`'s vars, `error` inside a `catch`), or one of the platform's values —
`projectInfo` and `runInfo` are always there; `userInfo` and `tableInfo` only on some runs (below).

**`with` holds the function's settings.** Not every setting reads a value. A setting that **names a
thing** — `tableKey`, a template's text, a vocabulary key, the sending `address` — is a plain value
written as itself. Which settings read values is the function's `freeFormInput` on
`GET /v1/functions?project=<project id>`: there a bare string is a path and text is
`{literal: "…"}`; everywhere else a string is the setting's own value. A key the function does not
take is refused (`STEP_SETTING_UNKNOWN`) with a fix to the nearest one it does.

**A setting that names a field says `field`**, never `{path}`: a record read's
`dataNullChecks: [{field: blurb, op: isNull}]`, a filter's `{field: renewsOn, op: eq, value: day}`.
`{path}` means "read a value from the flow", so `{path: blurb}` there would read a flow value named
`blurb` — refused as `STEP_FIELD_NAME_IS_PATH`, with the fix. The `value` beside a filter's `field`
is a read: `day` above is the flow input.

**A template reads too.** `{{clubMember.name}}` in a `text.interpolate` template or a `text.generate`
prompt is a required read of `clubMember.name`, proved like any other. A placeholder that names a whole object or list (`{{order}}` where `order` is an object, `{{items}}` where it is a list) is refused at save, `INTERPOLATE_BARE_STRUCTURED_SLOT`: it would render empty. Name a field (`{{order.total}}`), write `{{order | json}}`, or loop over a list with `{{#items}}…{{/items}}`.

**An expression decides its own value.** `value.build` has no per-field `when`: write the condition
inside one expression, `{expr: "clubMember.vip ? 'Gold box'"}` — with no else it answers nothing, and
that field is left out — or put the step in an `if`.

**A function gives one value.** Its extra results are fields of that value (a `text.decide` answer's
confidence, a `text.generate` step's vocabulary fields). `with.outputSchema` declares the answer's
type on `text.generate` and `text.decide` only. Name the type by its key,
`{kind: "ref", ref: "RenewalNote"}` (nested the same way: `{kind: "list", element: {kind: "ref",
ref: "RenewalNote"}}`); every save — `PUT …/steps`, `steps/edit`, a plan, an apply — resolves the
key, and an unknown key is refused at save, with a fix per near key. The save types the step's
readers from it and the run checks the answer against it. Only then does a reader of a declared
field of the answer count as proved: with no `outputSchema`, a required read of a field of the answer needs
a guard (`if` + `has`, `optional`, `default`) like any other unproved read.

## Values and keys

- An action's value is read by its key: `note`, `dueMembers.records`.

- A block's value is what its `out` names: `hasEmail.written`. Nothing else inside it is visible
  after it (`BLOCK_VALUE_ESCAPES`, whose fix hands the value out through `out`).
- An `each`'s value is a list, one `out` object per element: `perMember[].written`.

- A `repeat`'s value is its vars after the last pass: `pageLoop.cursor`.
- An `if` with no `else`, or a branch that does not give a name, makes that name possibly nothing
  after the block. Give every branch the same `out` names when a later step needs them.

⚠️ **`userInfo` and `tableInfo` are optional values.** `userInfo` is the signed-in person; a
schedule, a key's call and most triggers have none, and it is then absent, not empty. `tableInfo`
is there only when a table's record processing runs the flow. A required read of either that you
write (`userId: userInfo.userId`) is `STEP_INPUT_MAY_BE_ABSENT`. A read of a per-user table that
leaves `userId` out acts for the run's person by default, and the save does not see that read: on a
run with no person the step fails `end-user-required`, which an endpoint answers 403 `FORBIDDEN` (a
key's call to such an endpoint is refused before the flow runs). Guard either kind:

```yaml
- key: forPerson
  if:
    - test: { has: userInfo }
      steps:
        - key: mine
          function: record.list
          with: { tableKey: box, limit: 20 }
```

or, for a read you write, `{path: userInfo.userId, optional: true}`.

<!-- field-ok: userInfo — a run-ambient value the engine provides, not a wire field a caller
     sends. It is deliberately absent from every request contract: binding it from HTTP is what
     would let a caller claim to be someone else. -->
<!-- field-ok: tableInfo — a run-ambient value present on record-processing runs, not a wire field -->
<!-- field-ok: projectInfo — a run-ambient value the engine always provides, not a wire field -->
<!-- field-ok: runInfo — a run-ambient value the engine always provides, not a wire field -->

## The blocks

### `if` — the only "only when"

`if` is a list of branches; the first whose `test` holds runs, and `else` runs when none does. A
branch's steps are proved knowing its test held: inside `{has: clubMember.email}`, `clubMember.email` is a
value; inside `{filled: …}`, it is a value other than `""`, `[]` or `{}`. A step that runs only
sometimes goes inside an `if` — there is no other way to say it.

### `each` — once per element

`each` takes an argument that answers a list (`EACH_NOT_LIST_SHAPE` otherwise) and `as`, the name each
element is read by. Its steps run once per element; its value is the list of their `out`s, in the
list's order.

- **`maxParallel`** caps how many elements run at once. Left out, elements run together when they
  cannot affect one another, one at a time otherwise. When a step inside changes or deletes a
  record, makes another lasting change, emits an event or writes run state, the elements run one at
  a time whatever `maxParallel` says, and the save warns `EACH_RUNS_ONE_AT_A_TIME` (set
  `maxParallel: 1` to say so on purpose). A write to the element's own record is fine.
- **`maxItems`** is your guard, not a cut: a run handed more fails the step with
  `EACH_OVER_MAX_ITEMS`, running no element. Past the project's `runs.each-items` limit it fails
  with `FAN_OUT_OVER_LIMIT`. To take only the first n, slice where the list is made:
  `each: {expr: "$slice(dueMembers.records, 0, 50)"}`. The save warns `EACH_MAY_PASS_LIMIT` when a read
  feeding an `each` can return more than one run may take.
- **`maxFailedBranches` or `maxFailedShare`** (one, never both): how many elements may fail before
  the block does. A failed element leaves nothing behind — none of its changes, no entry in the
  list — and the run ends `partial`. Left out, the first failure fails the block. At least one
  element must succeed: the allowance is the stated one or one fewer than the elements, whichever is
  less, so `maxFailedShare: 1` over 3 elements still fails the block when all 3 fail. A platform
  failure (its engine, a spend cap, a cancel) or a refusal is never tolerated. Refused when a step
  inside reads or writes run state (`EACH_TOLERANCE_SHARED_RUN_STATE`): a dropped element cannot take
  back what it wrote there.

### `repeat` — passes until a condition holds

```yaml
- key: pageLoop
  repeat:
    vars: { cursor: { literal: "" }, seen: { literal: 0 } }
    next:
      cursor: { path: page.nextCursor, default: { literal: "" } }
      seen: { expr: "seen + $count(page.records)" }
    until: { not: { filled: cursor } }
    max: 20
    onMax: stop
  steps:
    - key: page
      function: record.list
      with: { tableKey: member, limit: 100, cursor: cursor }
```

The first pass's `cursor` is `""`, a value, so it reads page one; once a page has no `nextCursor`,
`next` leaves `""` and `until` ends the loop. `vars` are the values of the first pass, read inside the steps by name; `next` gives their values
for the pass after, and may read the pass's steps (`page`). `until` is checked after each pass, over
the vars as `next` left them — not over the steps inside. `max` bounds the passes (the project's
`runs.loop-iterations` caps it, `REPEAT_MAX_EXCEEDED`); running all `max` passes with `until` still
false fails the block unless `onMax: stop`. A failed pass's writes are dropped with it, and it fails the block unless
`onPassFail: stop`, which ends it with the last whole pass's values (the run then ends `partial`). After
the block, the vars are read as `pageLoop.cursor`, `pageLoop.seen`. A `next` naming something not in
`vars` is `REPEAT_NEXT_UNDECLARED`. Carry one object rather than many vars — the count is limited
(`design.repeat-vars`, `REPEAT_VARS_EXCEEDED`). Inside a repeat, a step that reuses saved results
would get the first pass's answer every time: `REPEAT_BODY_CACHE_FORBIDDEN` asks for
`reuseResultsForMinutes: 0`.

- Running out of passes under `onMax: fail` is the flow's own failure, with `details` `{step, max}`:
  a `try` around the `repeat` catches it, and its `catch` reads the code in `error` as
  `REPEAT_PASSES_EXHAUSTED`.

### `parallel` — steps at the same time

Its children run at once, each from the values there before the block. None may read a sibling
(`PARALLEL_READS_SIBLING`, whose fix moves the reader after the block and reads through `out`). Two
children that may change the same record warn `PARALLEL_EFFECTS_MAY_CONFLICT`: they may land in
either order. Use `parallel` for independent fetches or model calls whose results a later step
combines; written order already runs everything else one after another.

A child that runs `request.refuse` or `request.verify-signature` starts first; the other children
start only once it ended, and start nothing when it refused. A refusal is the block's answer before
any other child's failure:

```yaml
- key: checkAndFetch
  parallel:
    - key: gate
      function: request.verify-signature
      with:
        { payload: raw, signature: sig, secret: shop.record.data.paymentSecret }
    - key: page
      function: url.fetch
      with: { url: shopUrl }
  out: { page: page }
```

A forged call is refused 401 and `page` never fetches.

- Only a direct child goes first: a refusal inside a child's own block runs beside its siblings.
  The save hints `PARALLEL_REFUSAL_NESTED` there.

### `try` — surviving a failure

`try` runs its steps; when one fails, `catch` runs instead of the run failing. Inside `catch`, `error`
is `{code, message, step}`, each always filled, so `out: {caught: error.code}` or a mail's
`subject: error.message` needs no guard. A name the block gives after it comes from `try`'s `out`, or from `catch`'s `out`
when the catch ran — give it in both, or its readers must treat it as possibly nothing.

```yaml
- key: enrichSite
  try:
    steps:
      - key: page
        function: url.fetch
        with: { url: clubMember.website }
    out: { site: page }
  catch:
    steps: []
    out: { site: { literal: "" } }
```

The `catch` gives the same name as the `try`, so `enrichSite.site` is a value after the block on both
paths. Leave `catch`'s `out` out and readers of `enrichSite.site` must say what to do without it (`optional`
or `default`).
A run whose `try` caught a failure closes `partial`, not `succeeded`, and counts it in
`closing.absorbed.steps` (a sub-flow call's in `calls`).
There is no other failure tolerance on a step: no "continue on failure", no failure value.

⛔ **`try` catches only the flow's own failures.** A platform failure (its engine, a spend cap, a
cancel) and a refusal (`request.refuse`, a failed signature check) are never caught. What the `try`
staged is still dropped, `catch` does not run, and the failure goes on up:

```yaml
- key: guarded
  try:
    steps:
      - key: deny
        function: request.refuse
        with:
          { status: 403, code: NOT_YOURS, message: { literal: "Not yours." } }
  catch:
    steps: []
```

The call is answered 403, not caught.

### `return` and `fail` — ending the flow

`return` gives the flow's outputs and ends the run; it is the only way to give them. A required
output given a value that may be nothing is `FLOW_OUTPUT_MAY_BE_NOTHING` (the fix fails the run with
NO_RESULT before the `return` when the value is missing). When the flow declares required outputs,
every path must end in a `return` or a `fail` (`FLOW_PATH_HAS_NO_END`). A `return` inside an `each`,
`repeat` or `parallel` is refused (`RETURN_IN_REPEATED_BLOCK`): hand the value out through `out` and
return after the block.

`fail` ends the run with your `code` and `message`. Behind an endpoint, the caller gets `status`
(any 4xx except 405, 408 and 426; 422 when left out) with the body `{code, message, details}`: `code` the
platform's word for that status (`NOT_FOUND` for 404; for a status with no word of its own, such
as 400 or 418, the generic word below), `message` yours, `details.reason` your `code`. With `status: 429`,
`retryAfterSeconds` adds `Retry-After`.
A failure you declare is about the request; a 5xx is the platform's, and a `fail` cannot state one:

```yaml
- key: unknownDay
  fail:
    { code: DAY_NOT_OPEN, message: "That day has no deliveries.", status: 422 }
```

The save holds a `fail` to what a caller can be answered with, each refusal with a ready fix:

- `code` is UPPER_SNAKE_CASE, `^[A-Z][A-Z0-9_]{2,63}$`, as in the example above, never kebab-case;
  otherwise `FAIL_CODE_INVALID`, whose fix writes the same words in that form.
- `message` is at most 500 characters;
  otherwise `FAIL_MESSAGE_TOO_LONG`, whose fix cuts it.
- `retryAfterSeconds` needs `status: 429` and a wait of 1 to 86400 seconds;
  otherwise `FAIL_RETRY_AFTER_INVALID`.
- A status with no word of its own is answered with the generic word
  `REQUEST_REFUSED`.
- `status` 405, 408 or 426 (or anything outside 400–499) is refused;
  that is `FAIL_STATUS_INVALID`, whose fixes answer 422 or 409.

Inside an `each` or a `repeat`, a `fail` fails that element or that pass, which the block's tolerance
then judges.

Blocks nest at most `design.block-depth` deep (`BLOCK_DEPTH_EXCEEDED`); move a part into a flow of
its own and call it.

## Calling another flow

```yaml
- key: welcome
  function: flow.invoke
  with:
    flow: send-welcome
    inputs: { email: clubMember.email, name: clubMember.name }
```

`with: {flow}` is the called flow's key; `with: {inputs}` maps its input names to arguments. The call's
value is the called flow's outputs, read as `welcome.<output>` and typed by that flow's signature;
an optional output of it may be nothing. A required input left out is `CALL_INPUT_MISSING`. At run,
the inputs are checked against the called flow's signature: a value that breaks an input's type
fails the calling step `FLOW_INPUT_INVALID`, naming `flow`, `input`, `path` and `expected`. Every
start is checked the same way — a schedule's, a trigger's, a record's, a preview's — and fails before
any step runs or is charged; an endpoint refuses the request at its door, 422 with the issues. Create a
called flow before the caller, and see Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) for two flows that call
each other.

`flow.start-per-person` starts a flow once for each of a set of people:
`with: {flow, inputs, people}`, the inputs judged by that flow's signature. Its value is what it
started.

`flow.continue` starts the flow's next run from a cursor (paging a long read across runs). One per
flow (`FLOW_CONTINUE_MORE_THAN_ONE`), never inside an `each` or `repeat`
(`FLOW_CONTINUE_IN_BRANCH`); its cursor read should stop on a full page (`pages.onMore: "stop"`,
`FLOW_CONTINUE_READ_FAILS_ON_MORE`).

**Which page a read's `cursor` asks for.** Only a path read can end a list. When the path's root
is there and holds nothing at the path, the read answers an empty page and reads nothing: the
previous page ran and its `nextCursor` is nothing, or a flow input or `repeat` var is given (`{}`)
with no cursor at that path. Everything else reads page one:

- the root is absent: a first run, an optional input not given, or a step that ran and gave nothing;
- `with` has no `cursor`;
- the cursor is `""`, a fixed value, or an expression that gives nothing;
- a `default` stands in for a missing value. The default is the value given, so `default: ""` reads
  page one. A read whose `nextCursor` nothing
  reads warns `RECORD_LIST_CURSOR_UNREAD` (`details.stepKey` names it); `pages: {max: 1, onMore:
"stop"}` says one page on purpose.

There are no fan-out, merge, loop or dispatch functions: `each`, `repeat` and `if` are how a flow
repeats and branches, and a merge is an `out`.

## Conditions

An `if` test and a `repeat`'s `until` are conditions. Each is an object with one key:

| Condition                                    | Holds when                                            |
| -------------------------------------------- | ----------------------------------------------------- |
| `{has: x}`                                   | `x` is a value, an empty one included                 |
| `{filled: x}`                                | `x` is a value other than `""`, `[]` or `{}`          |
| `{eq: [a, b]}`, `{in: [a, list]}`            | equal; `a` is one of the list                         |
| `{gt: …}`, `{lt: …}`, `{gte: …}`, `{lte: …}` | number comparisons                                    |
| `{before: [a, b]}`, `{after: [a, b]}`        | instant comparisons                                   |
| `{startsWith: [a, b]}`, `{contains: [a, b]}` | text starts with; text or list contains               |
| `{matches: [x, "^[A-Z]{2}\\d+$"]}`           | text matches the regular expression (written as text) |
| `{expr: "…"}`                                | the JSONata answer is true by `$boolean`              |
| `{and: [...]}`, `{or: [...]}`, `{not: …}`    | combine                                               |

A pair is the value tested, then the one it is compared with; a bare string is a path, so text is
`{literal: "paid"}`: `{eq: [charge.body.status, {literal: paid}]}`. `GET /v1/flows/conditions` lists
them live with what each takes — treat that list as open.

⛔ **Every condition that reads a value is false when that value is nothing; `not` turns that
round.** So `{eq: [x, {literal: null}]}` never holds (`CONDITION_EQUALS_NULL`): to ask "is it
missing", write `{not: {has: x}}`; to ask "is it there", `{has: x}`. A test takes a path, a
literal or an expression, never `{path, optional}` or `{path, default}`: on nothing it is already
false. A condition that errors (an `expr` that throws) fails its block; it never counts as a pass.

## Nothing and empty

`null` and a missing value are **nothing**, everywhere: in records, flow inputs and outputs, sub-flow
calls, endpoint fields. `""`, `[]` and `{}` are **values**:

- A step given `[]` runs with `[]`. A list read that matched nothing answers `[]`. An `each` over
  `[]` gives `[]`.
- `{path, default}` and `$default(x, y)` fill only nothing. `$ifEmpty(x, y)` fills nothing **or**
  empty.
- **An index read needs a test before it.** `found.records[0].id` is refused
  (`STEP_INPUT_MAY_BE_ABSENT`) even after `has`, since a list may be `[]`: guard it with
  `{filled: found.records}`, which proves `[0]`, `[first]` and `[last]`. `[1]` and beyond need
  `{has: found.records[1]}`.

  ```yaml
  - key: firstHit
    if:
      - test: { filled: found.records }
        steps:
          - key: markSeen
            function: record.update
            with:
              recordId: "found.records[0].id"
              fields: { seen: { literal: true } }
  ```

- A function input that must not be empty (`email.send`'s `to`, `text.generate`'s prompt) fed a
  value that may be empty is the save error `STEP_INPUT_MAY_BE_EMPTY`. A value whose type declares
  `minLength` of 1 or more (text) or `minItems` of 1 or more (a list) counts as non-empty and needs no
  guard. The fix offers a `filled` guard or declaring that bound; a `default` never covers it. With
  `Member.email` a plain string:

  ```yaml
  - key: mailable
    if:
      - test: { filled: clubMember.email }
        steps:
          - key: send
            function: email.send
            with:
              address: boxes@orchard.example
              to: clubMember.email
              subject: { literal: "Renewal" }
              text: note
  ```

  Declare `email` with `minLength: 1` on the `Member` type instead and `send` needs no `if`. If an
  empty value reaches such an input at run anyway, the step fails with `STEP_INPUT_EMPTY`.

## The save proves every read

Every save — `PUT /v1/flows/{id}/steps`, `POST /v1/flows/{id}/steps/edit`, a document plan — runs one
decision over the whole list. It walks the steps in written order and, for every required read,
proves the value is there on every path that reaches it.

| Code                             | Severity | What it says                                                                                                                                        |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STEP_READS_UNKNOWN`             | error    | nothing gives that name                                                                                                                             |
| `STEP_READS_LATER`               | error    | only a step written below gives it                                                                                                                  |
| `BLOCK_VALUE_ESCAPES`            | error    | it is given only inside a block the reader is not in                                                                                                |
| `STEP_INPUT_MAY_BE_ABSENT`       | error    | the value may be nothing: an optional input, a step inside an `if`, a function that may answer nothing, a switched-off step, `userInfo`/`tableInfo` |
| `STEP_INPUT_FIELD_MAY_BE_ABSENT` | error    | the value's type marks that field optional                                                                                                          |
| `STEP_INPUT_FIELD_UNTYPED`       | warning  | nothing declares the value's type, so the field cannot be proved; if it is missing at run, the step fails                                           |
| `STEP_INPUT_MAY_BE_EMPTY`        | error    | a non-empty input may get `""`, `[]` or `{}`                                                                                                        |
| `FLOW_OUTPUT_MAY_BE_NOTHING`     | error    | a `return` gives a required output a value that may be nothing                                                                                      |
| `FLOW_PATH_HAS_NO_END`           | error    | a path ends without `return` or `fail` while outputs are required                                                                                   |
| `CALL_INPUT_MISSING`             | error    | a `flow.invoke` leaves out a required input of the called flow                                                                                      |
| `CONDITION_EQUALS_NULL`          | error    | a test compares with `{literal: null}`                                                                                                              |

Three ways clear a may-be-nothing read: put the step inside `if` with `{has: x}` (or `{filled: x}`),
read it `{path: x, optional: true}` (the step runs without it), or read it `{path: x, default: …}`.
Choose by what the step should do without the value: not run, run without, or run with a stand-in.

**Functions whose value may be nothing.** Fetches and lookups that can find nothing —
`url.fetch`, `url.scrape`, `url.metadata`, `web.search`, `place.details`, `location.resolve`,
`text.decide`, `value.first-non-empty`, the social profile, post and transcript reads, file and image
metadata among them. Some may only under some settings: `url.fetch` answers text (`""` at worst)
by default and may answer nothing with `responseAs: json`. The finding names the step that gives the
value and why. For `value.transform`
and `value.build` the save judges the expression itself: one that always answers a value gives a
value.

### What a finding carries

```json
{
  "code": "STEP_INPUT_FIELD_MAY_BE_ABSENT",
  "severity": "error",
  "message": "…",
  "at": "steps[perMember].steps[send].with.to",
  "fixes": [
    {
      "title": "Run send only when clubMember.email has a value",
      "edit": [
        {
          "wrap": ["send"],
          "in": { "if": { "test": { "has": "clubMember.email" } } },
          "key": "sendGuard"
        }
      ]
    },
    {
      "title": "Let send run without clubMember.email",
      "edit": [
        {
          "set": "send",
          "field": "with.to",
          "value": { "path": "clubMember.email", "optional": true }
        }
      ]
    }
  ],
  "decision": null
}
```

- **`at`** — where it sits, as a key path from the flow. Steps are named by key, never position.
- **`fixes`** — best first. Each `edit` is a list of step edits that clears this finding and raises
  none the flow did not have. Post it as it stands to `POST /v1/flows/{id}/steps/edit` with the flow's
  `version`, or apply it to your document. A fix may instead be `{title, typeEdit: {type, key,
declare}}`: one keyword (`minLength` or `minItems`) declared on a field of a type the flow reads.
  Send `declare` to `PATCH /v1/types/{id}` (`type` is that id) with the type's version; it changes the
  type for every reader, and a table's stored records must already fit it. A type new in the same
  document has no id yet, so `type` is absent: declare the keyword on that field under
  `types.<key>` in the document instead.
- **`decision`** — set exactly when `fixes` is empty: no edit clears it without changing what you
  meant, and the sentence says what to choose.
- **`editIndex`** — on an edit batch, which edit was refused.

Read a fix's `title` before you take it. The first fix is the safest, not always the one you want:
"run only when it is there" and "run without it" are different flows.

## Writing steps

### Edit by key — `POST /v1/flows/{id}/steps/edit`

```json
{
  "version": 7,
  "edits": [
    {
      "insert": {
        "key": "countDue",
        "function": "value.transform",
        "with": { "expression": "$count(dueMembers.records)" }
      },
      "after": "dueMembers"
    },
    {
      "set": "send",
      "field": "with.subject",
      "value": { "literal": "Your box renews tomorrow" }
    }
  ]
}
```

| Edit     | Shape                                                                                         | Notes                                                                                         |
| -------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `insert` | `{insert: step, after: key}`, `{…, before: key}` or `{…, into: {block, branch, at}}`          | `into` without `block` is the top list; `branch` is an `if`'s index, `else`, `try` or `catch` |
| `move`   | `{move: key, after}`, `{…, before}` or `{…, into}`                                            | keeps the step's value and the paths that read it                                             |
| `set`    | `{set: key, field: "with.to", value}`                                                         | `value: null` removes an optional field (never a list element)                                |
| `remove` | `{remove: key}`                                                                               | a reader left behind makes the batch fail its proof; change the readers in the same batch     |
| `wrap`   | `{wrap: [adjacent keys], in: {if: {test}} \| {try: {}} \| {parallel: {}} \| {each, as}, key}` | builds the block around them                                                                  |
| `unwrap` | `{unwrap: key}`                                                                               | a one-branch `if`, a `try` with an empty `catch`, or a `parallel`                             |

A batch holds at most 100 edits and is all or nothing. An edit that cannot apply (a key that names
no step, steps to wrap that are not adjacent) refuses the batch with `STEP_EDIT_REFUSED`, naming the
edit by its index. **Rename a step with `{set: oldKey, field: "key", value: newKey}`**: every read of
it in the flow moves to the new key in the same write.

### The whole list — `PUT /v1/flows/{id}/steps`

`{version, steps}` replaces the stored list whole. Use it to author a flow first, or for a change
bigger than a batch of edits.

### What a write answers

- **Saved** (200): `{flowId, version, diagnostics, changes, touched}` — the new `version` for your
  next write, warnings only, and `changes`: each step `added`, `removed`, `changed` or `moved`, by
  key, with the fields that changed.
- **Refused** (422): the errors in `details.diagnostics`, each a finding as above. Nothing saved.
- **Stale** (409 `VERSION_CONFLICT`): the flow changed since you read its `version` — another edit,
  a checkpoint restore, a document apply. Re-read the flow, re-apply your change to what is there
  now, send the new `version`. Do not retry blind: edits are not idempotent.

The flow's label, description and signature change with `PATCH /v1/flows/{id}` (also with its
`version`). Changing the inputs or outputs re-proves every step; a signature an endpoint or schedule
froze is refused unless you send `adoptSnapshots: true`, which re-publishes that endpoint's contract.

### Check before you save — `validateOnly: true`

Both routes take `validateOnly: true`. Nothing is written; the answer is the verdict
`{ok, diagnostics, complete}` — every finding, errors and warnings together — plus the expressions
read back:

- **`expressions`** — each JSONata expression the steps hold, at its `at`, printed as TypeScript
  (`typescript`) and as Python (`python`), with the functions each calls (`library`,
  `pythonLibrary`), laid out the platform's way (`formatted`), and, for an `{expr}` that is only a
  path, the bare `path` to write instead. Both mean what the JSONata means: the engine runs the
  JSONata. Each language uses its own spelling where it has one, and JSONata's and the platform's
  functions are called by name without the `$` (`round(x, 1)`; in Python a name Python keeps, such
  as `list`, is `list_`). Nothing is imported or defined.
- **`pathExpressions`** — each path read where an expression could stand, with the expression that
  reads the same.
- **`typescript` / `python`** (request) — expressions you write in either language, `[{at, text}]`,
  each place once and in one language. The dry run reads each back as JSONata (`fromTypeScript` /
  `fromPython`: `jsonata`, keeping the stored text of every statement you did not change, or a
  `refusal` with `start`/`end` saying what to write instead) and judges that JSONata in its place.
  Refused: anything reaching outside the expression (a request, files, the console, timers, the
  environment, `async`, a class, `try`, a callback changing an outer name), and a construct that
  would run with another meaning (`==` in TypeScript, `x || "default"`, `x or "default"`). A text
  holds at most `design.expression-characters` characters, as an expression does; past it the
  request is refused, and a stored expression past it is never read or printed: the dry run
  answers `EXPRESSION_TOO_LONG` first. A save refuses both fields: save the JSONata they answered.

`complete: false` means checking stopped early; fix what is listed and check again — a shorter list
is not a healthier flow. `ok: true` is a snapshot, not a promise: another write can land first.

## Reading a flow

- `GET /v1/flows/{id}` — the flow with `steps` in written order and its `version`.
  `?include=reads` adds `reads`: every step's place (`path`, `parentKey`, `branch`, `position`), each
  path it reads with its tolerance (`required`, `optional`, `default`, `expr`), and the names a block
  gives. It is how to find every reader of a step before you change it. `?include=expressions`
  adds `expressions`: each expression the saved steps hold, `{at, typescript, python}`, the same
  prints the dry run answers, for reading (an entry is part of the flow item, not a shape of its own); to check an edit of one, send it on a steps write with
  `validateOnly: true`. Ask for both with `?include=reads,expressions`. `?expand=timeLimits` adds
  each action step's time limit as a run applies it.
- `GET /v1/flows/{id}/outline` — the indented outline above: `lines` (each line with its `depth`,
  its `kind`, its `key` and its `path`), the same as `text`, and `plan` (the flow's size: `steps`, `topLevelSteps`, `depth`, `longestChain`). A switched-off step's line
  starts `off `. Health findings carry the same `path` text as `outlinePath`.
- `GET /v1/flows/{id}/health` — every finding about the flow as stored now, with `counts`.

## Trying one step

Three routes run one step, saved or not, on values you give. Send `step` to try a draft (its `key`
must be the key in the path); leave it out to try the saved one. `values` are keyed by the names the
step reads: a flow input, an earlier step's key, a name a block gives.

| Route                                         | What it does                                                        | Cost          |
| --------------------------------------------- | ------------------------------------------------------------------- | ------------- |
| `POST /v1/flows/{id}/steps/{key}/interpolate` | renders the step's prompt or template: `interpolatedPrompt`         | free          |
| `POST /v1/flows/{id}/steps/{key}/preview`     | renders it and calls the model: `response`, `tokensIn`, `tokensOut` | billed; ADMIN |
| `POST /v1/flows/{id}/steps/{key}/evaluate`    | runs the step's function, calling no vendor or model                | see below     |

```json
{
  "step": {
    "key": "note",
    "function": "text.interpolate",
    "with": {
      "template": "Dear {{clubMember.name}}, your fruit box renews on {{day}}."
    }
  },
  "values": { "clubMember": { "name": "Ada" }, "day": "2026-11-14" }
}
```

`evaluate` takes `values` or `fromRun` (a past run of this flow whose recorded values to use), never
both, and answers one of three: `{ok: true, value}`, `{ok: true, absent: true}` (the step gives
nothing on these values), or `{ok: false, failure: {code, message, location}}` — the failure a run
would meet, `location` naming the binding or field of an expression where it failed. It is the
quickest way to see what a `value.transform` answers before saving it. A function that reads only
its inputs (`value.transform`, `value.first-non-empty`, `list.concat`, `text.interpolate`) runs free
at EDITOR; a record read (`record.list`, `record.read`, `record.query` without a meaning search) is
billed as design-time work and needs ADMIN; any other function is refused
(`STEP_EVALUATE_UNSUPPORTED`): preview the flow. The preview route takes `attachments`, a map from
the name the step reads to a list of file ids (at most 12 files in all), and `modelId` to try
another model.

## Preview a whole flow — run it for real, in a sandbox

`POST /v1/flows/{id}/preview` runs the flow on the same machinery a live call uses.

```json
{
  "input": {
    "kind": "slots",
    "inputs": { "day": "2026-11-14", "dryRun": true }
  },
  "apply": false
}
```

The body:

- **`graph`** — `{kind: "persisted"}` (the default) runs the saved steps; `{kind: "draft", steps}`
  runs a list you send, after the same decision a save makes (steps a save would refuse are refused
  here, with the same findings, before anything runs).
- **`input`** — `kind` is required. `slots` gives `inputs` by the flow's input names (unknown and
  missing required ones are refused before the run). `record` seeds the inputs from a `recordId` of
  a table this flow processes: each input reads the same-named field of the record.
- **`apply`** — ⚠️ defaults to `true`. `false` runs the flow in full and throws its writes away;
  read what it would have written at `GET /v1/runs/{runId}/change-set`. A dry run costs exactly what
  an applying one does: it does the same work.
- **`project`** — resolve project-scoped context against another project; required for a platform
  flow.
- **`fanOutCap`** — how many elements any `each` runs in this preview (default 5, at most 1000, or
  `"uncapped"`). It only narrows. A capped run proves the wiring and each element's behaviour, not
  the whole population; `fanOutCaps` on the answer says what was cut.

⚠️ **Preview costs money and writes records.** It charges the project's payer as a real run does,
and refuses a suspended or over-cap payer before running. Model calls are tagged as preview and
files land in a sandbox prefix, but a record a preview creates or updates **is really written**
unless `apply: false`. There is no `apply` switch on your live endpoints; to rehearse, preview.
What a preview's outside fetches cost so far is its answer's `ingestSpend.vendors[]` — one total per
vendor charged (`vendor`, `vendorName`, `usd`), any vendor, none listed at zero — beside `calls[]`,
which counts every fetch function's calls, cache hits and refusals.

**Whose run it is** — `input: {principal}`:

<!-- field-ok: record-owner — a VALUE of the preview body's `principal` enum, not a field name -->

- `operator` (default) runs as you: `userInfo` is yours.
- `no-end-user` resolves nobody, which is how a schedule fires: `userInfo` is absent. Preview a
  scheduled flow this way to see the path its guards take.
- `end-user` with `runAsUserId` runs as one of your app's people. It must be sent with
  `apply: false`; nothing is written in their name.
- With `input.kind: "record"`, `record-owner` runs as the record's own user (needs EDITOR on the
  record's project; refused for a record with no owner).

A preview from an API key or as you owns none of your end users' records, so a read of a per-user
table answers `[]` — a value, not an error — and every step after it works on an empty list. Judge
such a flow as the person it serves.

**Read the body, not the status.** A flow that breaks still answers 200. The answer carries:

- `flowOutput` — the outputs the run gave; nothing is filled in.
- `missingRequiredOutput` — non-null means a live call would be refused `FLOW_OUTPUT_MISSING` and
  write nothing, so the preview discarded its writes too. It is a backstop: a `return` that gives
  nothing for a required output already fails the run `OUTPUT_TYPE_MISMATCH` (a 502 live).

- `transcript` — one entry per reached step, named by its key (`stepKey`), with `outcome`:
  `applied` (it ran; `answeredNothing: true` when it gave nothing), `failed` (with `error`), or
  `not-run` (reached and not run; `notRun` says why: its branch was not taken, it is switched off, a
  `return` came first, its block failed, a `try` caught a failure before it, an earlier attempt of
  a retried record applied it, or the run was cancelled).
- `errors` — each failure, the first being the one a live call answers with: its `status` and `code`, a
  `reason` when the function named the rule that refused, `limitKey` when a limit stopped the run, and
  `details.flowKey` on `FLOW_NOT_AUTHORED`, naming the flow with no steps as a live call does.
- `branches` and `warnings`; `fanOutCaps`; token totals, `latencyMs` and `pipelineMs` (the flow's own
  time — compare this across runs).

`POST /v1/flows/{id}/preview-runs` takes the same body and answers 202 `{runId}`: a worker runs it,
and you read it as any run (`GET /v1/runs/{runId}`, `/timeline`, `/trace`, `/change-set`). The run
routes answer 404 until the worker writes its first frame, so poll. `POST /v1/flows/{id}/preview/stream`
streams the same run as it goes: a `step-started` frame when a function step begins and a `step-ended` frame
with the same `stepKey`, `outcome`, `notRun` and `answeredNothing`; an `each`'s own `step-ended`
carries `each` (how many elements it was handed and how many it ran). A `step-failed` row on the
timeline carries its `phase` and a `message` cut to 500 characters — the function's own error text,
which can quote what it was processing.

Preview proves one run. Which steps real runs have exercised since the flow last changed is
`GET /v1/flows/{id}/coverage`; the values sampled runs actually carried (inputs, outputs, each step's value; kept 7 days) are
`GET /v1/flows/{id}/traces`. `GET /v1/flows/{id}/recent-records` lists the records the flow ran on
lately — the ones most worth previewing with `input.kind: "record"`.

## Choosing a function

`GET /v1/functions` is the deployment's catalog — identical for every caller, the one to confirm a key
against. `GET /v1/functions/{key}` is one function in full: its settings, what each takes, its
`servedBy` vendors, its run facts. A step's `with` takes three kinds of name, all on that page: the
function's named inputs, its `config` settings, and, for a function that calls a model with a
template you write, its prompt fields.

`GET /v1/functions?project=<project id>` adds, for your project:

| Field                 | What it tells you                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `freeFormInput`       | which settings of `with` read values: there a bare string is a path and text is `{literal: "…"}`         |
| `configDefaults`      | what a step gets for a setting it leaves out                                                             |
| `configDefaultsValid` | false when a setting is required and has no default — a step must state it                               |
| `contractUnresolved`  | the function's types could not be resolved against your project — a platform defect, not "no constraint" |

⚠️ The catalog's `version` hashes the deployment's catalog; it does not move when your types do, so
it is not a cache key for the project read.

The catalog does not type a step's value for you: the save does, from the step's `with`, and proves
every read of it. To see a value before saving, `evaluate` the step.

**Matching a customer's words.** Each function carries `searchWords` (the tasks and everyday terms a
customer uses: "summarize", "followers", "scrape") and `searchProductNames` (other products' names a
customer may type: "chatgpt", "zapier"). Match a request against both, then the title; never repeat a
product name back. `askAi.functionKey` names the function that takes a free instruction as its
prompt — the fallback when nothing fits. A setting naming a table, flow or vocabulary may carry
`offerAs`, how the function reads with one object ("Save to {table}"); word a choice with it. The one
setting with `suggestOnMatchingType` (`record.create`'s `tableKey`) is the natural next step for a
value whose type is a table's type: saving it there.

## How an action step runs

These settings sit on the action step beside `function` and `with`. All are optional; a step that
sets none runs with the function's own behaviour.

- **`enabled: false`** — the step stays in the flow and never runs; a block switched off takes its
  steps with it. Its value is nothing, so every required read of it becomes
  `STEP_INPUT_MAY_BE_ABSENT` — the save tells you what switching it off breaks, before it saves.
- **`timeoutMs`** — the most time the step may take. What it bounds depends on the function; the
  catalog's `run.timeLimit` says which: each AI call, the queued job's run across every try, or the
  wait in the flow. Do not work out the fallback yourself: `GET /v1/flows/{id}?expand=timeLimits`
  answers the limit a run applies, the layer that decided it, and `whenUnset`. A limit above the
  function's own budget can never fire (`RUN_TIME_LIMIT_ABOVE_BUDGET`); on a control function
  (`flow.invoke`, `flow.continue`) none is read (`RUN_TIME_LIMIT_NOT_READ`).
- **`tries`, `tryDelayMs`** — tries in all, the first included (1 to 5), and a fixed wait between them
  (at most a minute). They apply to functions that run as queued jobs — fetches, file readers, model
  calls — and replace the function's own attempts. On a step that runs in the flow itself, or a
  control function, they are refused (`RUN_TRIES_NOT_SUPPORTED`), as is a wait with `tries: 1`. Only a
  failure a second try can fix is tried again — never a missing key, a refused address or bad input.
  ⚠️ Each try's model or vendor call is charged.
- **`vendor`** — on a function whose vendors the platform routes between (`servedBy` lists them, such as `url.scrape`,
  `x.posts` and `youtube.transcript`): `use`, the vendor asked
  first (null: the platform's order), and `switch`, when the step may move to the next:
  `never` (the default), `when-kipory-account-fails` or `when-vendor-fails`. A vendor that cannot keep
  the step's settings is refused (`VENDOR_DOES_NOT_COVER`); on a function whose vendors the platform does
  not route between the setting is refused (`STEP_VENDOR_SETTING_UNUSED`).
- **`onTransient`** — `fail` | `retry-later`: what a vendor's passing failure (a timeout, a rate limit,
  a vendor down) does. `retry-later` runs it again later; it acts only on a run a schedule or trigger
  started — an endpoint's caller is waiting, so that run fails at once.
- **`reuseResultsForMinutes`** — how long a saved result for the same settings is reused instead of
  running again, up to sixty days. `0` always runs fresh — what polling a source needs. Steps whose
  fetch is identical share one saved result, kept for the longest period any asked for. Refused on a
  function that saves none (`RUN_REUSE_NOT_SUPPORTED`).
- **`onOversize`** — `cut` | `fail`: what a result over the value limit does. `cut` keeps a text's start or
  a list's first elements and warns; `fail` fails the step. Left out, a text is cut and a list fails.
  ⚠️ A total or ranking computed over a cut list is computed on the rows kept — narrow the read
  instead where you can.
- **`modelId`** — the AI model, for a function that calls one; left out, the model the project's
  routing gives the step's task. A model the deployment does not have is refused at save. A
  `text.generate` step names the AI task it runs as in its `task` setting instead of pinning a model; left
  out, it is the function's default task, `extraction`. A task the routing has none of is refused at
  save, with a fix to the nearest task:
  `STEP_TASK_UNKNOWN` — the tasks a step may name are those `GET /v1/nodes/{nodeId}/task-models`
  marks `assignableToStep`.
- **`description`** — a note for people reading the flow; it changes nothing.

## Copying a flow — through the project document

```
GET   /v1/projects/{nodeId}/document          the source project's configuration, flows included
POST  /v1/projects/{nodeId}/document/plan     what applying it to the target would do
POST  /v1/projects/{nodeId}/document          apply it to the target
```

The document is `kipory: 11`, and each flow sits under `flows.<key>` with its `steps` in written order,
stated whole: a step the list leaves out is removed. Everything is addressed by key, so nothing in it
is a source-project id. The plan names each step by flow and key; a step whose list or position
changed is a move. A document in an older format is refused at plan (`DOCUMENT_VERSION_UNSUPPORTED`).
See the Project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) pack.

There is no per-flow export: the document is the portable form. A type your source project defined
is copied only when the document states it too; a missing one is named by the plan and refused at
apply. A step's run settings travel with it.

## What will bite you

- **A bare string is a path.** `{literal: "…"}` for text, in `with`, in conditions, in `out` and
  `return`.
- **`maxItems` fails, it does not cut.** Slice where the list is made.
- **An `if` without `else` makes its `out` possibly nothing.** Give `else` the same names, or read
  the block's value with `optional`/`default`.
- **`default` does not cover empty.** Use `filled` or `$ifEmpty` when `""` or `[]` must not pass.
- **`{eq: [x, {literal: null}]}` never holds.** `{not: {has: x}}`.
- **A step after a block cannot see inside it.** Only `out` leaves a block.
- **Preview writes by default.** `apply: false`.
- **A version is per flow.** Every saved write answers the next `version`; send it back.
- **A per-user read in a scheduled flow** runs with no `userInfo`. Guard it, and preview it with
  `principal: "no-end-user"`.
- **Renaming a key moves its reads** only within the flow. A flow key is permanent; a step key
  renamed with `set` is safe, and callers of the flow name it by its flow key, not its step keys.

## Related

- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — exposing a flow over HTTP, and what a
  `fail` step's `status` answers.
- Project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — planning and applying flows with the rest of a project.
- Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`) — snapshot before a risky edit.
- Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`) — make "it works" a stored, replayable claim with a contract suite.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — the project limits named here (`runs.each-items`, `design.block-depth`).
- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — producers before consumers, and two flows that call each
  other.
