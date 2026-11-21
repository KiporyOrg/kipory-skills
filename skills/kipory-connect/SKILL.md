---
name: kipory-connect
description: Start here for any work on a Kipory project — the primer that holds what a build needs before its first plan, in one read - the project document's format with a complete example, the rules that keep a plan from being refused, every function in one line, the most used with each setting's shape, and the `kipory` command that ships a document and checks it as test users in single calls. Load it and, in the same turn, run its first call from the folder holding `.env`, `node .claude/skills/kipory-connect/scripts/kipory.mjs connect`. Use at the beginning of any work on a Kipory project, when the user hands over a base URL and an API key, when a call returns 401, 403 or 404 and the cause is unclear, or when you need to know which id, host or role a call wants. Every other kipory skill is a deeper reference this page points to.
license: MIT
---

<!-- field-ok: noteId — the example's own field -->
<!-- field-ok: list-notes — the example's flow key -->
<!-- field-ok: bodyText — a check-file key -->
<!-- field-ok: bodyFile — a check-file key -->
<!-- field-ok: userInfo — a run value an expression reads -->
<!-- field-ok: ownerId — a row's owner, not a request field -->

# Kipory: the primer

Kipory is a platform for a product's backend. A product on Kipory is a **project**, and a project is not code: its types, tables (with the queries that read them), flows, HTTP endpoints and schedules are configuration, written as one **project document** (YAML or JSON), planned, then applied. **Plan first.** This page holds what a first document needs: write it, `ship` it, and open a reference only for what a refusal or a failed check names.

**Two hosts.** The design API answers on the api host with your API key. The product's own endpoints answer on the project's host (`baseUrl` on `GET /v1/grant`) with a person's session. `.env` holds `KIPORY_BASE_URL`, `KIPORY_API_KEY` and `KIPORY_PROJECT_ID`; never print the key or write it into a file you keep.

## The `kipory` command

This skill's `scripts/kipory.mjs` does the plumbing: write no HTTP client of your own. From the folder holding `.env`, the first call is `node .claude/skills/kipory-connect/scripts/kipory.mjs connect`; every later one is `./kipory <command>`, which it writes. Edit files with your edit tool or a script, not `sed -i` (macOS). Below that is `kipory <command>`.

```
kipory connect                          first call: writes ./kipory, proves the key, names the host, one line per element
kipory summary                          what the project holds, again
kipory pull                             the project now → project.kipory.yaml, with its read: edit, ship
kipory ship app.mjs --check checks.json plan, apply when clean, then run every check: the whole loop in one call
kipory plan app.mjs                     plan only: "plan ok <planId>", or one line per error with its path and a fix
kipory check checks.json                run the checks again, without a plan
kipory call alice GET "/v1/app/notes"   one request as test user alice (- for no one); -H 'name: value', --pages, --times 5, --out f, --body-file f --type t
kipory preview <flow> --as alice        run one flow in the sandbox as alice; one line per write; nothing kept unless --apply
kipory preview --schedule daily         run a schedule's flow the way it fires: as nobody, with its inputs
kipory find "sign a webhook"            can Kipory do it? the functions that do, or an honest cannot (--report files it)
kipory docs record query cursor         the best-matching section of the deeper skills
```

**app.mjs** is a script that prints the document as JSON; a `.json` or `.yaml` file works too. Exit 1: refused or a check failed, 2: usage; `--json` prints the raw answer.

**A plan never undoes someone else's edit unseen.** Each file is bound to its read (its `basedOn`, else its last apply's); an element changed since is `moved`, refusing the plan with each field's old and new value. Take those in (or keep yours), then run the `--seen <version>` line it prints. On a project you did not build, start with `kipory pull`. Limits: an element added under a taken name updates it; a file with no `basedOn`, restored, plans at its last read.

## Check: prove it as people, in one call

A check file lists requests sent to the project's host as test users, in order, with what each should answer. Test users are made once and remembered in `.kipory/`. A project holds 20; the refusal past that says how to raise it.

<!-- prettier-ignore -->
```json
{ "requests": [
  { "as": "alice", "POST": "/v1/app/notes", "body": { "title": "first {{nonce}}" },
    "expect": { "status": 201, "has": ["noteId"] }, "save": { "note": "noteId" } },
  { "parallel": [
    { "as": "alice", "GET": "/v1/app/notes/{{note}}", "expect": { "body": { "note": { "title": "first {{nonce}}" } } } },
    { "as": "bob",   "GET": "/v1/app/notes/{{note}}", "expect": { "status": 404 } },
    { "as": "-",     "GET": "/v1/app/notes", "expect": { "status": 401 } } ] },
  { "as": "alice", "POST": "/v1/app/notes", "body": { "title": "burst {{i}}" }, "headers": { "x-trace": "{{nonce}}" },
    "times": 3, "expect": { "statuses": { "201": 3 } } },
  { "as": "alice", "GET": "/v1/app/notes", "pages": true, "eventually": 5000,
    "expect": { "has": ["items[3].id"], "unique": { "items": "id" } } }
] }
```

- **A request**: `as`, the method as a key with the path, then `headers`, `body` (JSON), `bodyText`, or `bodyFile` with `contentType`; `sign: {"header", "secret", "value": "sha256={{signature}}"}` adds an HMAC of the exact body sent. `{{name}}` reads a value an earlier request saved (`save` takes a dotted path into its answer, as `items[0].id`), `{{user.bob.id}}` a test user's id, `{{nonce}}` a value new to each run, `{{i}}` the index inside `times`.
- **Running**: in order; `{"parallel": [...]}` runs its requests at once; `times: n` sends one request n times at once (races, idempotency, quotas); `{"wait": 2000}` pauses; `pages: true` follows `nextCursor` with `?after=` and joins the list as `items` (a named query's `items`, or the `records` of a flow returning a `record.query` page; `{"param": "cursor"}` for that flow's own cursor input), up to 20 pages; `eventually: ms` asks a GET again each second until the answer holds. `{{timestamp}}` is the time in seconds; redirects are not followed.
- **What it should answer**: `status` (a number, a list, or `"4xx"`; a 2xx when left out), `statuses` (counts across `times`), `body` (a subset: each key given must match, a list item by item), `has` and `absent` (paths), `count` (`{path: n}`), `includes` (`{path: {fields}}`: the list holds an item like it), `unique` and `sorted` (`{path: "field"}`, `"-field"` for descending), `contains` (text in the raw body), `headers` (each must contain the text), `bytes`, `type`. With `times`, what a body holds is asked of the 2xx answers.
- **Repeatable**: test users and what they wrote persist between runs, so assert what this run made: a saved id (`has`, `body`), `includes`, values carrying `{{nonce}}`; never a `count` over a remembered user's whole list.
- Keep the file beside the document and pass it to every `ship`, so each change is proved with everything before it.

## The document

<!-- prettier-ignore -->
```yaml
kipory: 12
project:
  name: Notes
types:
  Title: { type: string, minLength: 1, maxLength: 200 }
  Note:
    type: object
    required: [title, state]
    properties:
      title: { type: string, minLength: 1, maxLength: 200 }
      state: { type: string, enum: [open, done] }
      dueOn: { type: string, maxLength: 10 }
      summary: { type: string, maxLength: 200 }
  Notice:
    type: object
    required: [text, endsOn]
    properties:
      text: { type: string, maxLength: 500 }
      endsOn: { type: string, maxLength: 10 }
tables:
  notice:
    owner: project                # one shared set of rows
    type: Notice
    uses:
      filter: [endsOn]
  note:
    owner: user                   # every row is its creator's; others read it as missing
    type: Note
    uses:
      filter: [dueOn]             # filter: may be queried, ordered, compared; key: unique
    queries:
      mine: { description: The caller's notes., pageSize: { default: 50, max: 50 } }
flows:
  create-note:
    label: Create a note
    caller: user
    inputs: { title: Title, dueOn: string? }
    outputs: { noteId: string }
    steps:
      - key: save
        function: record.create
        with:
          table: note
          fields:
            title: title                          # a bare string is a path to a value
            state: { literal: open }              # text is a literal
            dueOn: { path: dueOn, optional: true } # an optional input is read with its tolerance
      - key: done
        return: { noteId: save.recordId }
  get-note:
    label: Read one note
    caller: user
    inputs: { noteId: string }
    outputs: { note: Note }
    steps:
      - key: found
        function: record.read
        with: { table: note, ids: { expr: "[noteId]" }, failIfEmpty: true }   # 404 when missing or another person's; proves found[0]
      - key: done
        return: { note: "found[0]" }
  list-notes:
    label: List my notes
    caller: user
    inputs: { notesAfter: string?, notesBefore: string?, notesLimit: number? }
    outputs: { page: object }
    steps:
      - key: notes
        function: record.query
        with: { query: note.mine }
      - key: done
        return: { page: notes }
  expire-notices:
    label: Delete the notices that ended
    inputs: {}
    outputs: {}
    steps:
      - key: ended
        function: record.query
        with:
          table: notice
          clauses: [{ kind: field, field: endsOn, op: lt, value: { expr: "$substring(runInfo.now, 0, 10)" } }]
          limit: 100
          pages: { max: 10, onMore: fail }
      - key: some
        if:
          - test: { filled: ended.records }
            steps:
              - key: drop
                function: record.delete
                with: { ids: { expr: "$list(ended.records.id)" } }
  close-overdue:
    label: Close my overdue notes, each with a summary
    caller: user
    inputs: { before: string }
    outputs: { closed: number }
    steps:
      - key: due
        function: record.query
        with:
          table: note
          clauses: [{ kind: field, field: dueOn, op: lt, value: before }]
          order: { by: field, field: dueOn, direction: asc }
          limit: 50
          pages: { max: 1, onMore: stop }
      - key: perNote
        each: due.records                    # a pass per row
        as: item
        steps:
          - key: isOpen
            if:
              - test: { eq: [item.state, { literal: open }] }
                steps:
                  - key: brief
                    try:                     # a failed step runs `catch` instead
                      steps:
                        - key: draft
                          function: text.generate
                          with: { prompt: "Summarise in one line: {{item.title}}" }
                        - key: trim
                          repeat:            # vars → steps → next → until, at most max passes
                            vars: { text: draft }
                            next: { text: shorter }
                            until: { lte: [{ expr: "$length(text)" }, 200] }
                            max: 3
                            onMax: stop
                          steps:
                            - key: shorter
                              function: text.generate
                              reuseResultsForMinutes: 0
                              with: { prompt: "Shorten to under 200 characters: {{text}}" }
                      out: { text: { expr: "$substring(trim.text, 0, 200)" } }
                    catch:                   # reads error.code, error.message
                      steps: []
                      out: { text: item.title }
                  - key: close
                    function: record.update
                    with: { recordId: item.id, fields: { state: { literal: done }, summary: { path: brief.text, optional: true } } }
                out: { closed: { literal: 1 } }
            else:
              steps: []
              out: { closed: { literal: 0 } }
        out: { closed: isOpen.closed }
      - key: done
        return: { closed: { expr: "$default($sum(perNote.closed), 0)" } }
endpoints:
  create-note: { POST: /v1/app/notes, status: 201, flow: create-note }   # no inputs: bound by name
  get-note: { GET: "/v1/app/notes/{id}", flow: get-note, inputs: { noteId: { from: path.id } } }   # a name differs
  list-notes: { GET: /v1/app/notes, flow: list-notes }
  close-overdue:
    POST: /v1/app/notes/close-overdue
    status: 202
    params: { before: { in: query } }
    flow: close-overdue
    async: true                            # 202 { id, status, statusPath }
    inputs: { before: { from: query.before } }
schedules:
  daily:
    label: Nightly clean-up
    flow: expire-notices
    cron: "0 7 * * *"
    tz: UTC
    overlapPolicy: skip
    failurePolicy: pause
    enabled: true
    inputs: {}
```

- **A flow is its steps, in the order they run.** A step is a function (`function` + `with`), `return`, `fail`, or a block: `if`/`else`, `each`, `repeat`, `try`/`catch` (all in `close-overdue`) and `parallel` (steps at once, none reading another). A step's key names its value (`save.recordId`); a value made inside a block is read outside only through the block's `out` (a `repeat`'s is its `vars`), and an `each` gives the list of its passes' `out`. A flow gives outputs only through `return`, never inside an `each`, `repeat` or `parallel`.
- **What steps give.** A row (from `record.read`, `record.list`, `record.query`) is its fields at the top level plus `id`, `status`, `createdAt`, `updatedAt` (ISO times), `processing` (and `ownerId` on a per-user table), none of which makes a project row new (below); a field with no value is left out. `record.list` gives `{ records, nextCursor }` (`nextCursor` while more remain), `record.query` the same plus `bounded` and `explanation`, `record.read` a list of rows, `record.create` `{ recordId, table, keyTaken }`, `record.update` `true`, or `false` when nothing matched.
- **A run is all or nothing**: its writes are saved together when it ends, and a failed step or a `fail` keeps none of them; mail and requests leave only after the save. So a `record.list` or `record.query` later in the run does not see the rows it created; a `record.read` by id does. A failure inside `try`, a `fail` too, drops what `try` staged and runs `catch`; a failed `each` pass fails the block unless `maxFailedBranches` or `maxFailedShare` lets it go, and gives no `out`.
- **Endpoint inputs.** Leave `inputs` out and each flow input binds by its name: one named like a `{part}` of the path reads it; any other reads the query on GET and DELETE and the body on POST and PATCH; an input the flow gains later binds too. An object or list never comes from the query. State `inputs` only when a name differs or the value comes from elsewhere, each `{ from: … }`: `path.<p>`, `query.<p>` (declared in `params`), `header.<name>` (lower case, an optional text input), `rawBody` (the exact text, for `request.verify-signature`), `patch`, `body`. Stated, an input not listed is not bound. A value takes its input's type. An input's type is `string`, `number`, `boolean`, `object`, `file`, `probability`, a library type (`RecordRead`) or a type of yours: `title: Title`, `dueOn: string?` (optional), `tags: string[]` (a list); the long form is `{ type, list, optional, description }`; there is no `integer`.
- **An input's limits go on its type.** `minLength`, `maxLength`, `minimum`, `maximum`, `pattern` and `enum` on the type an input names (`Title`; never beside the input) are checked at the endpoint before any step runs: `422 VALIDATION_FAILED`, `details.reason` `FLOW_INPUT_INVALID`. Write no step that only checks an input. A start by another flow, a schedule or a trigger checks only a non-empty rule (`minLength: 1`).
- **An argument** is exactly one of: a path (`title`, `rows.records`), `{ literal: … }`, `{ expr: "<JSONata>" }`, `{ path: x, optional: true }`, `{ path: x, default: … }`. Never mix their keys: a default for an expression goes inside it, `{ expr: "$default(limit, 20)" }`. A setting that names a thing (`table`, `query`, `flow`) is a plain value. A test is one of `has`, `filled`, `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `before`, `after`, `startsWith`, `contains`, `matches`, `expr`, combined with `and`, `or`, `not`. An expression reads `runInfo.now`, `runInfo.nonce`, and `userInfo.userId` (the caller); `$now()` and `$random()` are refused.
- **An endpoint answers its flow's outputs by name** (`{ "note": {…} }`); `responseBody: note` on the endpoint answers that one output bare, `redirect: { location: url }` answers a redirect to an output.
- **A list over HTTP is a named query**: written under its table (`tables.note.queries.mine`) and read by one `record.query` step with `query: note.mine`; the flow declares `<step>After`, `<step>Before`, `<step>Limit`; the endpoint answers `{ items, nextCursor }` and pages by `?after=`. A query orders by `created`, or by a field with a `filter` use (a text one needs `maxLength` ≤ 500). Any other list a caller pages is `record.list` (`limit: { path: limit, default: 50 }`; `order: asc` is oldest first by `createdAt`). Use `record.query` with its clauses written in place for a text range, meaning, or a text or number order; there `order: { by: created, direction: asc }` is oldest first (newest is the default), and `createdAt` is never a `by: field`.
- **People's data** lives on `owner: user` tables, no owner field or check: a person's run sees their rows, a run for nobody (schedule, trigger, public endpoint) all. Sharing is `sharing: true` on the table plus `record.grant`. On `owner: project` identical data is one record (two equal transfers at once share one id): give a row that may repeat a field telling it apart, `ref: { expr: "runInfo.nonce" }`. A once-only row uses `key`, next.
- **Once, by the platform**: a field with the `key` use, then `record.create` with `onKeyTaken: skip` answers `keyTaken: true` instead of a second row. A counter is `record.update` with `add: { views: { literal: 1 } }`. Calls at once apply in turn (a refused save, or a create a racing call beat, runs again): add no lock or retry; a `record.count` quota holds; on `keyTaken`, answer that `recordId` (a replay succeeds, not a 409). Unique across people: `{ "kind": "key", "scope": "project" }`.
- **`null` at an endpoint.** An answer carries every field its declared type marks optional, `null` when it has no value — so type a record output with its table's own type (`outputs: { link: Link }`), never plain `object`. An optional input sent as `null` means not sent. To clear vs keep on an update, bind one object input `{"from": "patch"}` (its type's fields all optional) and pass it to `record.update` as `data`: a field sent `null` is removed, one left out is kept; `$exists(changes.x)` is true when `x` was sent. In a flow, clear a field with `{literal: null}` in `record.update`'s `fields` (a merge removes it; under `mode: replace`, leave it out).
- **CSV**: return a `text.csv` step's text (`rows`, `columns`) as a required output, named in the endpoint's `responseBody` with `responseType: "text/csv"`; errors stay JSON.
- **A daily job runs as nobody**: `expire-notices` sees every row, people's too (`clauses: []`: all). A start for everyone (`flow.start-per-person`, `people: { kind: project }`) starts real people only and answers `testUsersLeftOut`: while you test, `PATCH /v1/projects/{nodeId}/settings {"testUsersInStarts": true}`, off before real people use it.
- **Mail sends from the project's own address**, its name at the environment's mail domain, when `email.send` names none. Another is claimed once with `POST /v1/managed-email-addresses { node, localPart, domain, grade: "relay" }`, bound in `project.mail.senders` (`support: support@example.com`) and named as `sender: support`. A test user receives no mail. A model call is `text.generate` (a `prompt`, `outputSchema` for a typed answer) or `text.decide` for yes/no, a pick or a score (`kipory-build`'s `references/models.md`).
- **`project`** holds settings (`builtInRoutes`, `identity`, `ai`, `credits`, `mail.senders`, `config`); `requires` what it needs from outside: planned, never applied. An export leaves defaults out.

## Rules that keep the first plan clean

1. **`kipory: 12`** at the top; send the document alone, never an export's `{ version, document }` envelope. A document is partial: an element you leave out is untouched, but each element you state is whole, and a flow's `steps` are its whole list. Removal is `delete: true` on the element. Two exceptions keep what you leave out: in `project.identity` and `project.credits` a setting you do not state is unchanged (the plan lists it as `kept`), and only an explicit `off` clears it. `off` and `false` mean the same, and so do `google:` and `google: {}`.
2. **Every required read is proved present.** A signed-in-only flow states `caller: user`: a run with no user is refused, so `userInfo.userId` is always there (a schedule on it is refused). An optional input, or `userInfo` in a flow without it: fail first with your own code (`if` on `{ not: { has: x } }`), run the step under `{ filled: x }`, or read it `{ path: x, optional: true }` (the setting is left out). An item of a list or query result (`rows.records[0]`) needs an `if` on `{ not: { filled: rows.records } }` that fails first (`STEP_INPUT_MAY_BE_ABSENT`); a `record.read` with `failIfEmpty: true` proves its first row (not under `onOversize: cut`), as `get-note` reads `found[0]`. A default only for a real fallback (`[]`, 0, a label), never an id, owner, amount or status; `x ?? …` and `$exists(x) ? x : …` keep a `null` and are refused.
3. **A required output is proved like a required read** (`FLOW_OUTPUT_MAY_BE_NOTHING`). A create's `recordId` is always there: `return { noteId: save.recordId }` needs no guard.
4. **`fail.status` is 400–499**, but not 405, 408 or 426 (left out, 422); there is no 5xx of your own (`FAIL_STATUS_INVALID`). `fail.code` is capitals, digits and underscores, starting with a capital (`BOX_PACKED`); the caller gets it as `details.reason`.
5. **Text is `{ literal: … }`**: a bare string is always a path, and an unknown one is `STEP_READS_UNKNOWN`.
6. **A function's settings are its own** (its catalog lines below): one it does not take is `STEP_SETTING_UNKNOWN`; `record.delete` takes `ids`, not `table`.
7. **Queried, ordered or totalled fields carry a `filter` use** on the table; on a table that already holds records, apply the new use before planning the steps that read it. An expression names a record's fields exactly as its type has them (`JSONATA_FIELD_UNKNOWN`). `record.list`, `record.count` and `record.aggregate` compare text only with `eq` or `in`; a range on text is `record.query`'s.
8. **Expressions**: wrap a list one builds in `$list(…)` (JSONata gives one item as the item, none as nothing); `x != "v"` is false when `x` is missing, so write `$not(x = "v")`; a yes/no pattern test is `$contains(s, /re/)`, not `$match`; read a `cursor` from the previous page's `nextCursor` or an input, never a value step.
9. **Keys**: step, table and input keys are camelCase, and no two steps of a flow share a key at any depth (`STEP_KEY_TAKEN`); flow and relation keys are kebab-case; type keys are PascalCase. Record fields never use `id`, `status`, `createdAt`, `updatedAt`, `processing` or `statusError`.
10. **Blocks nest at most 4 deep** (move the inside to a flow and `flow.invoke` it); `repeat.max` is at most 50; a schedule's `failurePolicy` is `pause` or `keep-running`. A credential goes in `url.send`'s or `url.fetch`'s `secret`, never in `headers`.
11. **Endpoints**: method GET, POST, PATCH or DELETE (no PUT); a path starts `/v1/<a word of yours>/` (`/v1/app/boxes`; `/v1/boxes` is a platform route); a parameter is `{ in: path }` or `{ in: query }`, and a stated `inputs` reads only declared ones (`ENDPOINT_INPUT_UNSATISFIED`); `status` is 200, 201, 202, 204 or 206. A public endpoint (`auth: none`) is unlimited unless `project.credits.publicEndpointsLimit` sets credits a day (1 = 1 µUSD; `1000000` = $1); if its flow calls a model or vendor, the plan warns its worst day and what bounds it.
12. **Changing a flow or a type an endpoint already serves**: a safe change applies unasked; a break needs an admin to name every breaking row (the 409's fix names them) in the top-level `acceptBreaks` (an editor key: `CONTRACT_BREAK_FORBIDDEN`).

**A refused plan** prints one line per error with its path and, mostly, a `fix:` (step `edit`s, or `set` at document paths): apply each error's first fix in one edit, then ship again. Only `error` refuses, but read every warning: one naming a slot inside `[…]` (`JSONATA_ITEM_FIELD_NAMED_LIKE_SLOT`) means an expression reads the wrong value. `kipory docs <CODE>` explains any code.

## Every function, one line

`name — title · what with takes (* required; a function's first words are the values it reads) → what it gives`. The functions most steps use name their inputs and prompt on the line and each setting below it, with its shape: `*` required, `= x` a default, `a|b` values, `{a*: t}` an object's members (deeper, only its `kind`, then `…`), `‹name›` a key you choose, `[…]` or `t[]` a list, `x or y` alternatives, `1–100`, `≥1`, `<5` bounds, in `items` or `chars` for a size, `value` an argument (a path, `{ literal }`, `{ expr }`), `⚠` what tells values apart; then what it `gives` and a worked `with`. Write a step from its lines; open a function's page (`kipory docs <key>`) only when a refusal names one of its settings.

<!-- generated: the function catalog, one line each, from the deployment's catalog; regenerated on every publish, so an edit inside this block is overwritten -->

**ai** — Model calls: answer typed questions (the cheapest), generate text, or rank a list.

- text.decide — Answer typed questions · message* model outputSchema → the step's outputSchema
- text.generate — Generate text · prompt* system → the step's outputSchema
  - `model: value` — The model to use; empty uses this step's model.
  - `outputSchema: {kind*: ref, ref*: string} or {kind*: list, element*: …} or {kind*: optional, inner*: …} or {kind*: union, members*: … ≥2 items} or {kind*: record, valueType*: …} or {kind*: recordRef, table*: string}` — The answer's type; empty means the answer is text.
  - `reasoningEffort: none|low|medium|high` — How hard the model thinks first; `none` where it allows. ⚠ Reasoning is billed as output; left out, the model runs at its own default effort.
  - `task: string` — The AI task whose model answers; empty uses `extraction`.
  - `temperature: number 0–2` — How much the answer may vary; empty uses the model's own.
  - `vocabularyFields: [{field*: string, vocabulary*: string}]` — Which answer fields hold vocabulary values to resolve into terms.
  - gives: The model's answer: text, or a value of the declared shape. A misfit is never repaired: the model is asked once more, and a second miss fails the try.
  - e.g. `with: {"prompt":"Summarize in three sentences:\n\n{{article}}"}`
- text.rerank — Rank by relevance · documentItems* queryStreams* maxDocumentChars maxDocuments model topN → RerankHit[]

**text** — Work on text without a model: split, match, fill a template, clean.

- text.chunk — Split text into chunks · text* chunkTokens encoding maxChunks overlapTokens → string[]
- text.csv — Make CSV text · columns* rows* bom defuseFormulas → CSV text
- text.detect-language — Detect language · text* minAccuracy minLetters minMinorityScriptShare minScriptMargin minScriptShare → string
- text.extract — Pull out matching text · text* dedupe flags group pattern → string[]
- text.interpolate — Fill a template · template* → string
- text.sanitize — Make text safe for a prompt · items* idField maxCharsPerItem nonce outputShape textField truncationMarker → object

**sources** — Fetch data from outside — pages, videos, feeds, places. Can be slow and cost money.

- facebook.ad — Fetch a Facebook ad · source* → SocialAd
- facebook.ads — Fetch Facebook ads · source* activeOnly by country maxItems → SocialAd[]
- facebook.page — Fetch a Facebook page · source* withLastPost → FacebookPage
- facebook.posts — Fetch a Facebook page's posts · source* maxItems → SocialPost[]
- google.ad — Fetch a Google ad · source* → SocialAd
- google.ads — Fetch Google ads · source* country details format maxItems → SocialAd[]
- instagram.comments — Fetch an Instagram post's comments · source* includeReplies maxItems → SocialComment[]
- instagram.post — Fetch an Instagram post · source* → SocialPost
- instagram.posts — Fetch an Instagram account's posts · source* maxItems → SocialPost[]
- instagram.profile — Fetch an Instagram profile · source* → SocialProfile
- instagram.search — Search Instagram posts · source* maxItems → SocialPost[]
- instagram.search-profiles — Search Instagram accounts · source* maxItems → SocialProfile[]
- instagram.transcript — Fetch an Instagram transcript · source* → string
- linkedin.ad — Fetch a LinkedIn ad · source* → SocialAd
- linkedin.ads — Fetch LinkedIn ads · source* by maxItems → SocialAd[]
- linkedin.company — Fetch a LinkedIn company page · source* → SocialProfile
- linkedin.post — Fetch a LinkedIn post · source* → SocialPost
- linkedin.posts — Fetch a LinkedIn company's posts · source* maxItems → SocialPost[]
- linkedin.profile — Fetch a LinkedIn profile · source* → SocialProfile
- location.resolve — Find a place from a map point · location* language → Place
- place.details — Fetch a place · place* language maxImages → PlaceCard
- place.reviews — Fetch place reviews · place* includeReviewerDetails language maxReviews origin since sort → PlaceReviews
- place.search — Search for places · query* detail includeClosed language location maxItems → PlaceCard[]
- reddit.comments — Fetch a Reddit post's comments · source* maxItems → SocialComment[]
- reddit.post — Fetch a Reddit post · source* → SocialPost
- reddit.posts — Fetch a subreddit's posts · source* maxItems sort timeframe → SocialPost[]
- reddit.search — Search Reddit posts · source* maxItems sort timeframe → SocialPost[]
- source.unwatch — Stop watching a source · channel* holder* provider* userId → SourceUnwatch
- source.watch — Watch a source · channel* holder* provider* userId → SourceWatch
- telegram.resolve-channel — Fetch a Telegram channel · handle* freshnessMinutes maxWaitMs pollIntervalMs → TelegramChannelResolution
- telegram.search-channels — Search Telegram channels · terms* maxChannels maxChannelsPerSearchTerm minMembers skipScam → TelegramChannelSearchResults
- telegram.stats — Read Telegram member count · channel* → TelegramChannelStats
- threads.post — Fetch a Threads post · source* → SocialPost
- threads.posts — Fetch a Threads account's posts · source* maxItems → SocialPost[]
- threads.profile — Fetch a Threads profile · source* → SocialProfile
- threads.search — Search Threads posts · source* maxItems → SocialPost[]
- tiktok.ads — Fetch TikTok ads · source* by maxItems → SocialAd[]
- tiktok.audience — Fetch a TikTok account's audience · source* → SocialAudience
- tiktok.comments — Fetch a TikTok video's comments · source* maxItems → SocialComment[]
- tiktok.followers — Fetch a TikTok account's followers · source* maxItems → SocialProfile[]
- tiktok.following — Fetch who a TikTok account follows · source* maxItems → SocialProfile[]
- tiktok.post — Fetch a TikTok video · source* → SocialPost
- tiktok.posts — Fetch a TikTok account's videos · source* maxItems region → SocialPost[]
- tiktok.profile — Fetch a TikTok profile · source* → SocialProfile
- tiktok.search — Search TikTok videos · source* maxItems → SocialPost[]
- tiktok.transcript — Fetch a TikTok transcript · source* aiFallback language → string
- url.fetch — Fetch text from a web address · url* body bodyAs contentType headers maxBytes maxRedirects method query responseAs secret timeoutMs userAgent → string
- url.fetch-as-file — Fetch a web address as a file · url* allowedMimePatterns body bodyAs contentType failureMode headers maxBytes maxRedirects method query secret timeoutMs userAgent → file
- url.metadata — Fetch a page's title and preview · url* maxBytes maxRedirects timeoutMs userAgent → UrlMeta
- url.scrape — Fetch a web page · url* excludeTags includeTags mainContentFallbackMinChars onlyMainContent timeoutMs → ScrapedPage
- url.screenshot — Take a page screenshot · url* failureMode format jpegQuality maxBytes timeoutMs viewportWidth → file
- web.rankings — Fetch top websites · country* category limit → TopSiteRanking
- web.search — Search the web · query* after before countryCode excludeSites excludeUrlContains includeUrlContains languageCode maxPages maxResults resultsLanguage since sites → WebSearchResults
- web.traffic — Fetch website traffic · source* → SiteTrafficMetrics
- x.posts — Fetch X posts · source* maxItems sort → XPost[]
- x.profile — Fetch an X profile · source* → SocialProfile
- x.transcript — Fetch an X transcript · source* → string
- youtube.channel — Fetch a YouTube channel · channel* listUploads parts uploadsLimit → YoutubeChannel
- youtube.comments — Fetch a YouTube video's comments · source* maxItems sort → SocialComment[]
- youtube.posts — Fetch a YouTube channel's videos · source* content maxItems sort → SocialPost[]
- youtube.search — Search YouTube videos · source* maxItems sort uploaded → SocialPost[]
- youtube.transcript — Fetch a YouTube transcript · video* includeTimestamps lang → string
- youtube.trending — Fetch trending YouTube channels · region* includeChannelDetails maxResults videoCategoryIds → YoutubeTrendingChannels
- youtube.video — Fetch a YouTube video · url* parts → YoutubeVideo

**files** — Read what a file holds — metadata, text, transcripts — make a resized or rendered copy, or a download link.

- audio.metadata — Extract audio details · audio* duration → AudioMetadata
- audio.transcribe — Transcribe audio · audio* language maxBytes model → string
- file.copy — Copy a file · file* maxBytes → file
- file.download-url — Create a download link · file* neverExpires ttlSeconds → string
- file.read-text — Read a text file · file* maxBytes → string
- file.stats — Extract file details · file* → FileStats
- image.decode-qr — Scan QR codes · image* requireUrl → string[]
- image.metadata — Extract image details · image* includeRawDebug segments → FileMetadata
- image.resize — Resize an image · image* autoOrient fit format maxHeight maxInputBytes maxInputPixels maxWidth quality → file
- pdf.parse — Extract text from a PDF · file* maxPages → PdfDocument
- pdf.screenshot — Save a PDF page as an image · file* format jpegQuality maxInputBytes maxOutputBytes page viewportScale → file

**search** — Find the terms of a vocabulary closest in meaning to a phrase.

- term.search — Search terms by meaning · text* vocabulary* minScore parentTermId status topK → TermHit[]

**records** — Read and change the project's records and terms. Only these steps can change a record.

- record.aggregate — Total records · measures* table* clauses groupBy limit order timeZone userId → RecordAggregate
- record.append — Add events to a record · event* field* recordId* table* eventId userId → string
- record.count — Count records · table* createdAfter createdBefore fieldFilters linkFilters statuses userId vocabularyFilter → number
- record.create — Create a record → RecordCreate
  - `table*: string` — The table to create a record in.
  - `data: value` — The new record's data object, whole; or use `fields`.
  - `fields: object` — The new record's fields, each a slot path, fixed value or expression.
  - `fileIds: value` — The uploaded file ids to attach to the new record.
  - `onKeyTaken: refuse|skip` — What to do when another record already holds the natural key. ⚠ With `skip`, a key another record holds adds nothing and answers `keyTaken`; two payloads claiming one key fail.
  - `userId: value` — The person a run that acts for nobody writes for.
  - gives: A `RecordCreate`: the new record's id, reused on a retry under the same key. With `userId` or `skip`, a `RecordCreateForPerson`, whose id may be absent.
  - e.g. `with: {"table":"item","data":"submission"}`
- record.delete — Delete records · ids* userId → boolean
- record.enqueue-process — Queue for processing · recordId* mode replay userId → boolean
- record.grant — Share a record · recordId* principal* level memberLevel userId → boolean
- record.grants — List a record's shares · recordId* userId → RecordShare[]
- record.link-assert — Link two records · sourceRecordId* targetRecordId* actor* relationKey* userId → RelationAssertion
- record.link-counts — Count a record's links · recordIds* relationKey* direction → RecordLinkCount[]
- record.link-retract — Remove a link · sourceRecordId* targetRecordId* actor* relationKey* userId → RelationRetraction
- record.links — Read a record's links · recordId* includeExpired limit relationKey → RecordLink[]
- record.list — List records (dataEqualsPath+dataEquals together; dataContainsPath+dataContains together) → RecordPage
  - `table*: string` — The table to list.
  - `createdAfter: string` — Keep only rows created at or after this fixed ISO-8601 date.
  - `createdBefore: string` — Keep only rows created at or before this date.
  - `cursor: value` — A previous page's cursor; empty for the first page.
  - `dataContains: value` — The object to look for in that list.
  - `dataContainsPath: string` — Keep only rows whose list at this `data` path contains `dataContains`.
  - `dataEquals: value` — The value to compare: text, number or true/false.
  - `dataEqualsPath: string` — Keep only rows whose value at this `data` path equals `dataEquals`.
  - `dataNullChecks: [{field*: string, op*: isNull|isNotNull}] ≥1 item` — Keep rows by whether a field inside `data` is empty or filled.
  - `fieldFilters: [{field*: string, op*: eq|lt|lte|gt|gte|in, value*: value}] ≥1 item` — Filters on the table's queryable fields, including ranges.
  - `fields: string[]` — Which fields each row carries; empty means all of them.
  - `include: {vocabularies: boolean = true, links: boolean, files: boolean, cost: boolean}` — Extra details per row; terms come by default, the rest opt-in.
  - `limit: value` — Rows per page, 1 to 100; otherwise 50.
  - `linkFilters: [{relationKey*: string, peerRecordId: value}] ≥1 item` — Keep only rows carrying a link of these relations.
  - `linked: {‹name›: {relation*: string, direction: outgoing|incoming = outgoing, peerTable: string, fields: string[], include: {…}, limit: integer 1–100, sortField: string, order: desc|asc, onMore: fail|stop, when: value, linked: {‹name›: {…}}}}` — Linked records each record carries, under `linked.<name>`.
  - `order: asc|desc = desc` — Sort direction: `desc` (default, newest first) or `asc`.
  - `pages: {max*: integer 1–500, onMore: fail|stop = fail}` — Read every page, from `cursor` if set; unset reads one page.
  - `scalars: {statusError: boolean, fileCount: boolean}` — Extra values per row: failure summary and file count.
  - `sort: createdAt|updatedAt = createdAt` — Order by when a row was created (default) or last changed.
  - `sortField: string` — Order by one of the table's queryable fields instead of `sort`.
  - `statuses: [PENDING|PROCESSING|READY|FAILED|DELETING|MERGED] ≥1 item` — Keep only rows with these statuses; omit it for every status.
  - `userId: value` — The person whose records to read; empty reads as the run.
  - `vocabularyFilter: [{vocabulary*: string, slug*: string, parentSlug: string}] ≥1 item` — Keep only rows tagged with all of these vocabulary terms.
  - `whose: all|own|shared = all` — Sharing tables: `all` (default), `own`, or `shared` (newest share first).
  - gives: A `RecordPage`: the rows, newest first, each record's fields flattened to the top level, and a cursor when more remain — with `pages`, only under `onMore: "stop"`.
  - e.g. `with: {"table":"item","userId":"userInfo.userId","limit":50}`
- record.merge — Merge records · keep* merge* userId → RecordMerge
- record.query — Query records → RecordQueryPage
  - `clauses: [{kind*: field, field*: string, op*: eq|lt|lte|gt|gte|in|not-in|contains, value*: value} or {kind*: term, vocabulary*: string, slug*: value} or {kind*: link, relation*: string, direction: outgoing|incoming|either, where: [{…}] 1–16 items, count: {…}, peer: [{kind: field, …} or {kind: term, …} or {kind: semantic, …}] 1–16 items} or {kind*: stream, field*: string, window: {…}, where: [{…}] 1–16 items, count: {…} or exists or none} or {kind*: semantic, field: string, text: value, likeRecordId: value, likeTable: string, topK: integer 1–200, minScore: number -1–1, passage: boolean} or {kind*: any, of*: [{kind: field, …} or {kind: term, …} or {kind: link, …} or {kind: stream, …}] 2–8 items}] ≤16 items` — Clauses every record must match; none matches every record the run reaches.
  - `cursor: value` — A prior answer's cursor; empty for the first page.
  - `fields: string[]` — Which fields each row carries; empty means all of them.
  - `limit: value` — Rows per page, 1 to 100; otherwise 50.
  - `linked: {‹name›: {relation*: string, direction: outgoing|incoming = outgoing, peerTable: string, fields: string[], include: {…}, limit: integer 1–100, sortField: string, order: desc|asc, onMore: fail|stop, when: value, linked: {‹name›: {…}}}}` — Linked records each record carries, under `linked.<name>`.
  - `order: {by*: created, direction: asc|desc} or {by*: meaning} or {by*: field, field*: string, direction: asc|desc = desc}` — `created` (newest first; `direction: asc`, oldest), `meaning`, or a filterable field.
  - `pages: {max*: integer 1–500, onMore: fail|stop = fail}` — Read every page of an exact question, from `cursor` if set.
  - `query: string` — A table's query to read instead of clauses, as `<table>.<key>`.
  - `table: string` — The table to query; set exactly one of this and `tables`.
  - `tables: string[] 2–8 items` — 2 to 8 tables ranked in one answer, in place of `table`.
  - `userId: value` — The person whose records to query; empty means the signed-in user.
  - gives: A `RecordQueryPage`: the records satisfying every clause, a `nextCursor` when an exact-only query has more, and `bounded` plus `explanation` on every answer.
  - e.g. `with: {"table":"person","userId":"userInfo.userId","clauses":[{"kind":"term","vocabulary":"language","slug":{"literal":"hebrew"}},{"kind":"link","relation":"friend-of","where":[{"property":"tag","op":"eq","value":{"literal":"close"}}]},{"kind":"semantic","text":{"literal":"loves hiking"}}]}`
- record.read — Read records → RecordRead[]
  - `ids*: value` — A list of ids, or a path like `hits[].recordId`.
  - `table*: string` — The table to read.
  - `dataNullChecks: [{field*: string, op*: isNull|isNotNull}] ≥1 item` — Keep rows by whether a field inside `data` is empty or filled.
  - `failIfEmpty: boolean` — Fail when nothing is found instead of returning an empty list.
  - `fields: string[]` — Which fields each row carries; empty means all of them.
  - `include: {vocabularies: boolean = true, links: boolean, files: boolean, cost: boolean}` — Extra details per row; terms come by default, the rest opt-in.
  - `linked: {‹name›: {relation*: string, direction: outgoing|incoming = outgoing, peerTable: string, fields: string[], include: {…}, limit: integer 1–100, sortField: string, order: desc|asc, onMore: fail|stop, when: value, linked: {‹name›: {…}}}}` — Linked records each record carries, under `linked.<name>`.
  - `redirect: follow|report = follow` — A merged id: `follow` reads its survivor; `report` fails the read. ⚠ With `follow`, two ids merged into one record read as that record once.
  - `scalars: {statusError: boolean, fileCount: boolean}` — Extra values per row: failure summary and file count.
  - `userId: value` — The person whose records to read; empty reads as the run.
  - gives: A `RecordRead` per record, its fields flattened to the top level, in the order asked and deduplicated; unresolved ids drop, and a merged id reads its survivor.
  - e.g. `with: {"ids":"candidates","table":"item"}`
- record.revoke — Stop sharing a record · recordId* principal* ifAbsent userId → boolean
- record.teardown — Clear generated data · recordId* targets userId → object
- record.update — Update a record → boolean
  - `recordId*: value` — The id of the record to patch.
  - `add: object` — Numbers to add to declared number fields, not fixed lists; negative subtracts.
  - `clearDerived: boolean` — Empty the record's derived output in the same write.
  - `data: value` — The new fields as one object, or use `fields`; empty changes nothing.
  - `derived: value` — The new derived output; empty leaves it alone.
  - `failIfPreconditionUnmet: boolean` — Fail with a conflict when nothing matched, instead of reporting no change.
  - `fields: object` — The fields to write, each a slot path, fixed value or expression.
  - `fileIds: value` — The file ids to attach to the record.
  - `ifChangedMeanwhile: start-again|apply` — When another run changed the record since this run read it. ⚠ On a conflict `start-again` writes nothing, while `apply` (merge only) overwrites what another run wrote to these fields meanwhile.
  - `mode: merge|replace = merge` — `merge` (default) merges over existing values; `replace` overwrites them. ⚠ In `merge`, a key set to `null` is removed from the record.
  - `requireStatus: PENDING|PROCESSING|READY|FAILED` — Only write when the record currently has this status.
  - `setStatus: PENDING|PROCESSING|READY|FAILED` — Set the record to this status, clearing any earlier error. ⚠ Setting it to pending does not start processing on its own — a separate `record.enqueue-process` step does that.
  - `userId: value` — The person a run that acts for nobody writes for.
  - gives: A bare boolean — `true` iff a row was patched, `false` when the record was absent, foreign, or failed the status precondition (mirrors `record.delete`).
  - e.g. `with: {"recordId":"patch.recordId","data":"patch.data","mode":"merge"}`
- term.threshold-gate — Decide: match or new term · candidates parentTermId proposalLabel proposalSlug thresholds vocabulary → GateDecision
- term.upsert — Save terms · resolutions* → nothing
- vocabulary.aggregate — Count records by term · maxEntriesPerVocabulary shape userId vocabularies → VocabularyAggregate
- vocabulary.resolve — Pick terms for a record · context deterministic extractedVocabularies maxValues model vocabularies → TermResolution[]

**outbound** — Reach a person or a system outside the platform. Nothing is sent until the run's changes are saved.

- email.send — Send an email → string
  - `subject*: value` — The subject line.
  - `text*: value` — The plain-text body, required even with HTML.
  - `to*: value` — The address to send to.
  - `html: value` — Optional HTML version of the message.
  - `replyTo: string` — Optional address replies go to, instead of the sending address.
  - `sender: string` — One of the project's senders; left out, its default address.
  - gives: The message's id — not a receipt: it leaves only if the run finishes and saves. Past the project's daily mail cap the step fails (`project-mail-cap-reached`).
  - e.g. `with: {"sender":"digest","to":"draft.to","subject":"draft.subject","text":"draft.body"}`
- push.send — Send a push notification · badge body collapseKey data expiresIn kind recipient sound threadId title urgency → PushSendResult
- url.send — Send a request · url* → boolean
  - `body: value` — The request body, usually built by an earlier step.
  - `bodyAs: json|form|text` — How to send the body: `json` (default), `form` or `text`. ⚠ Under `json` a string is sent quoted; for your own text use `text` and `contentType`.
  - `contentType: string ≤128 chars` — The content type of a `text` body.
  - `headers: object` — Headers by name; an empty value omits one; credentials go in `secret`.
  - `idempotencyKey: value` — A repeat key, sent as the `Idempotency-Key` header.
  - `method: POST|PUT|PATCH|DELETE = POST` — The request method.
  - `query: object` — Query parameters for the address by name; an empty value omits one.
  - `secret: string ≤128 chars` — The name of a stored request credential to send.
  - `sign: {header: string ≤128 chars, secret: value, storedSecret: string ≤128 chars, algorithm: sha256|sha1|sha512, encoding: hex|base64, prefix: string, format: plain|timestamped|standard}` — Sign the body sent with a shared secret.
  - `timeoutMs: integer >0 ≤60000 = 15000` — How long one delivery attempt waits for an answer.
  - gives: `true` once queued, not a receipt; it leaves after the run saves. No flow reads the answer: to act on one, the receiver calls an endpoint back.
  - e.g. `with: {"url":"targetUrl","method":"POST","body":"notice","secret":"harbour-office","idempotencyKey":"notice.id","timeoutMs":15000}`

**flow** — Steer the run: branch, loop, call another flow, keep state between steps.

- event.emit — Send an event · category* event* payload → nothing
- flow.continue — Continue with the next page · cursor* cursorInput* inputs → ContinueResult
- flow.invoke — Run another flow → the called flow's outputs
  - `flow*: string` — The key of another saved flow to run, like `score-article`.
  - `as: project` — `project` runs the called flow as the project, acting for no one. ⚠ The called flow reaches every person's records; pass it the caller's id as an input if it needs one.
  - `inputs: object` — Each input of the called flow: a path, fixed value or expression.
  - gives: What the called flow's `return` gives, one field per output of its signature; `{}` when it returns nothing.
  - e.g. `with: {"flow":"article-scrape-summarize","inputs":{"entryUrl":"currentUrl","window":"dateRange"}}`
- flow.start-per-person — Start a flow for each person · flow* people* inputs → PeopleStartResult
- request.refuse — Refuse the call · code* status* message retryAfterSeconds → nothing
- request.verify-signature — Check a call's signature (one of secret|storedSecret) → boolean
  - `payload*: value` — The text that was signed, usually the call's raw body.
  - `signature*: value` — The signature the caller sent, usually from a header.
  - `algorithm: sha256|sha1|sha512` — The hash: sha256 (the default), sha1 or sha512.
  - `encoding: hex|base64` — How the signature is written: hex (the default) or base64.
  - `format: plain|timestamped|standard` — `plain` (the default), `timestamped` for `t=…,v1=…` signatures, or `standard` for Standard Webhooks.
  - `messageId: value` — Standard Webhooks only: the `webhook-id` header the caller sent.
  - `onMismatch: refuse|output` — `refuse` (the default) answers 401; `output` gives the flow true or false.
  - `prefix: string ≤32 chars` — Text before the signature to remove, such as `sha256=`.
  - `secret: value` — The shared secret, such as a field of the call's record.
  - `storedSecret: string ≤128 chars` — Or the name of a signing secret stored on the Secrets page.
  - `timestamp: value` — Standard Webhooks only: the `webhook-timestamp` header the caller sent.
  - `toleranceSeconds: integer 1–86400` — How old a timed signature may be, in seconds; 300 unless set.
  - gives: A `boolean`: `true` when the signature matches. A wrong or missing one answers 401 `SIGNATURE_INVALID` and stops the run (the default), or gives `false` with `onMismatch: output`.
  - e.g. `with: {"payload":"raw","signature":"sig","secret":"shop.record.data.paymentSecret"}`
- state.read — Recall a saved value · key* → string, or string[] for an append or union cell
- state.write — Save a value for later · value* key* op* → string

**utility** — Reshape a value, or pick between values from earlier steps.

- list.concat — Join into one list · inputs* strategy → a list of the first input's element type
- value.build — Build a value field by field · fields* examples → object
- value.first-non-empty — Take the first filled value · inputs* mimePrefixes valueKind → the first input's type
- value.transform — Reshape values · expression* examples → object

<!-- end of the generated function catalog -->

## When a refusal or a check names something this page does not settle

`kipory docs <words or CODE>` first; then the skill named for the subject: `kipory-build`, `kipory-expose` (endpoints, webhooks, sign-in), `kipory-model`, `kipory-evolve` (changing what holds records), `kipory-data`, `kipory-operate` (schedules, triggers, spend), `kipory-diagnose`, `kipory-gather`, `kipory-extract`, `kipory-retrieve`, `kipory-secrets`, `kipory-channels`, `kipory-prove`, `kipory-plan`. Here: `references/refusal-codes.md`, `references/packs/limits.md` (what Kipory cannot do).

**401** is a missing or dead key (ask the human for a live one); **403** names `details.requiredRole` against your key's role; **404** is the path, then the host, then an id your key cannot see; **402** is out of credits or at a ceiling. When something is broken or missing, file `POST /v1/reports { project, trying, happened, impact }` (`impact`: `blocked`, `worked-around` or `annoyance`) and carry on.
