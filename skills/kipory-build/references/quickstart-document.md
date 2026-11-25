# Build a backend as one document

A bigger worked project than the primer's (`kipory-connect`): an invented fruit-box club — people sign in and keep their own membership and boxes, order and list them over HTTP, a total is kept for them, a model writes a packing slip, a daily job reminds members once by email — as one `kipory: 13` **project document**. Copy its shapes. Open another page only for something this one does not show (the last section says which).

## The loop

Write the document (a `.json` file, or a `.mjs` script that prints it, as most builds do), then use the `kipory` command `kipory-connect` ships: `node .claude/skills/kipory-connect/scripts/kipory.mjs <command>`, written in full in every shell call and `kipory <command>` below.

```
kipory plan app.mjs       plan it: "plan ok <planId>", or one line per error with its path
kipory apply              apply the plan you just read; prints the new version and the project's host
kipory ship app.mjs       both, when you expect a clean plan
```

Underneath, on the api host with your key: `GET /v1/projects/{nodeId}/document?section=project` (your read, `basedOn`), `POST /v1/projects/{nodeId}/document/plan?basedOn=<version>` (the document as the body), `POST /v1/projects/{nodeId}/document { "planId", "note" }`. The product's own endpoints answer on the project's host (`baseUrl` on `GET /v1/grant`).

- **A plan you mean to apply needs `basedOn`**, your read: what someone else changed after it is listed as `moved` and refuses the plan. The command keeps each file's read.
- **Gate on `ok` and on each diagnostic's `severity`.** Only `error` refuses; `warning` and `info` block nothing. A finding about steps carries `at` and ready `fixes` (step edits to make in your file) or the `decision` you must make. Fix every error of one plan in one edit, then plan again.
- **The format is 13** (`kipory: 13`), sent as YAML (`content-type: application/yaml`) or JSON. Plan the document alone, never an export's envelope `{ "version", "document" }`.
- **A document is partial and every element you state is whole.** Send the sections you change; state each row whole. An omitted row is untouched; a flow's `steps` are its whole list, so a step you leave out is removed.
- **Mail sends from the project's own address** (its name at the environment's mail domain) when a step names none, as `mail` does. Another address is claimed with `POST /v1/managed-email-addresses { "node": "<nodeId>", "localPart": "renewals", "domain": "<a domain you send from>", "grade": "relay", "displayName": "Orchard Club" }`, bound under `project.mail.senders` (`renewals: renewals@<that domain>`) and named on the step as `sender: renewals`. The plan warns `EMAIL_SEND_ADDRESS_UNAVAILABLE` when a step's address cannot send.

## The example

```yaml
kipory: 13
project:
  name: Orchard Club
types:
  Pounds: { type: number, minimum: 0, maximum: 20 }
  Member:
    type: object
    required: [name, renewsOn]
    properties:
      name: { type: string, minLength: 1, maxLength: 200 }
      email: { type: string, maxLength: 320 }
      renewsOn: { type: string, maxLength: 10 }
  Box:
    type: object
    required: [memberId, week, fruit, state]
    properties:
      memberId: { type: string, maxLength: 64 }
      week: { type: string, maxLength: 10 }
      fruit: { type: string, enum: [apples, pears, plums] }
      pounds: { type: number, minimum: 0 }
      state: { type: string, enum: [planned, packed] }
      slip: { type: string }
  RenewalNote:
    type: object
    required: [noteKey]
    properties:
      noteKey: { type: string, maxLength: 100 }
tables:
  member:
    owner: user
    type: Member
    uses:
      filter: [renewsOn]
    computed:
      poundsOrdered:
        rollup: { relation: of-member, sum: pounds }
  box:
    owner: user
    type: Box
    uses:
      filter: [memberId, pounds, week]
    queries:
      mine:
        description: The signed-in member's boxes.
        pageSize: { default: 50, max: 50 }
  renewalNote:
    owner: user
    type: RenewalNote
    uses:
      key: noteKey
relations:
  of-member:
    label: Of member
    description: A box belongs to one member
    from: box.memberId # the field that makes the link
    to: member
    cardinality: many-to-one
flows:
  join-club:
    label: Join the club
    inputs:
      name: string
      email: string?
      renewsOn: { type: string, description: "YYYY-MM-DD" }
    outputs: { memberId: string }
    steps:
      - key: join
        function: record.create
        with:
          table: member
          fields:
            name: name
            email: { path: email, optional: true }
            renewsOn: renewsOn
      - key: done
        return:
          memberId: join.recordId
  order-box:
    label: Order a box
    inputs: { memberId: string, week: string, fruit: string, pounds: Pounds? }
    outputs: { boxId: string }
    steps:
      - key: owner
        function: record.read
        with:
          table: member
          ids: { expr: "[memberId]" }
          failIfEmpty: true
      - key: save
        function: record.create
        with:
          table: box
          fields:
            memberId: memberId
            week: week
            fruit: fruit
            pounds: { path: pounds, default: 10 }
            state: { literal: planned }
      - key: done
        return:
          boxId: save.recordId
  list-boxes:
    label: List my boxes
    inputs: { boxesAfter: string?, boxesBefore: string?, boxesLimit: number? }
    outputs: { page: object }
    steps:
      - key: boxes
        function: record.query
        with: { query: box.mine }
      - key: done
        return:
          page: boxes
  pack-box:
    label: Pack a box
    inputs: { boxId: string }
    outputs: { slip: string }
    steps:
      - key: found
        function: record.read
        with:
          table: box
          ids: { expr: "[boxId]" }
          failIfEmpty: true
      - key: write
        try:
          steps:
            - key: line
              function: text.generate
              with:
                prompt: "Write one friendly line for the packing slip of this fruit box: {{found | json}}. Output only the line."
          out:
            slip: line
        catch:
          steps: []
          out:
            slip: { literal: "Packed with care by the Orchard Club." }
      - key: save
        function: record.update
        with:
          recordId: boxId
          fields:
            state: { literal: packed }
            slip: write.slip
      - key: done
        return:
          slip: write.slip
  remind-everyone:
    label: Start each member's renewal reminder
    inputs: {}
    outputs: {}
    steps:
      - key: start
        function: flow.start-per-person
        with:
          flow: remind-renewal
          inputs: {}
          people: { kind: project }
  remind-renewal:
    label: Remind a member whose membership renews tomorrow
    inputs: {}
    outputs: {}
    steps:
      - key: due
        function: record.query
        with:
          table: member
          limit: 100
          pages: { max: 10, onMore: fail }
          clauses:
            - kind: field
              field: renewsOn
              op: eq
              value:
                expr: "$substring($fromMillis($toMillis(runInfo.now) + 86400000), 0, 10)"
      - key: perMember
        each: due.records
        as: member
        maxParallel: 1
        steps:
          - key: reachable
            if:
              - test: { filled: member.email }
                steps:
                  - key: note
                    function: record.create
                    with:
                      table: renewalNote
                      onKeyTaken: skip
                      fields:
                        noteKey: { expr: "member.id & '@' & member.renewsOn" }
                  - key: fresh
                    if:
                      - test: { not: { eq: [note.keyTaken, true] } }
                        steps:
                          - key: mail
                            function: email.send # no sender: the project's own address
                            with:
                              to: member.email
                              subject:
                                literal: Your Orchard Club membership renews tomorrow
                              text:
                                expr: "'Dear ' & member.name & ', your membership renews on ' & member.renewsOn & '.'"
endpoints:
  join-club: { POST: /v1/club/members, status: 201, flow: join-club } # no inputs: each binds by its name, from the body
  order-box: { POST: /v1/club/boxes, status: 201, flow: order-box }
  list-boxes: { GET: /v1/club/boxes, flow: list-boxes }
  pack-box:
    POST: /v1/club/boxes/{id}/pack
    flow: pack-box
    timeoutMs: 120000
    inputs: { boxId: { from: path.id } }
schedules:
  daily-renewals:
    label: Daily renewal reminders
    flow: remind-everyone
    cron: "0 7 * * *"
    tz: UTC
    overlapPolicy: skip
    failurePolicy: pause
    enabled: true
    inputs: {}
```

## What each part is doing

<!-- field-ok: perMember — the example flow's own step key -->
<!-- field-ok: noteKey — the example project's own type field -->
<!-- field-ok: renewalNote — the example project's own table key -->
<!-- field-ok: poundsOrdered — the example project's own computed field -->

- **A flow is its steps, in the order they run.** `order-box` reads the member, saves the box, returns its id — top to bottom. A step's key names its value: `save.recordId` is the id `save` created. A flow gives its outputs only through a `return` step.
- **A setting reads a value by its path**: `memberId: memberId`, `to: member.email`. Text is `{ literal: "…" }` — a bare string is always a path. An expression is `{ expr: "[boxId]" }`. A setting that names a thing — `table`, `sender`, a prompt — is a plain value. `action-fields.md` has every form.
- **An optional input is read with its tolerance.** `email` may be left out, so `join-club` reads it `{ path: email, optional: true }` (the field is then not written), and `order-box` reads `pounds` with `default: 10`. A text default is a literal: `default: { literal: apples }`. A plain `email` would be refused at plan: the save proves every required read is there on every path (`STEP_INPUT_MAY_BE_ABSENT`).
- **A required output must be proved too** (`FLOW_OUTPUT_MAY_BE_NOTHING`), like any required read: a value that may be nothing, such as `userInfo.userId`, is returned only after a step that fails the run when it is missing. `record.create`'s receipt always holds `recordId`, so `save.recordId` is returned as it is, with no guard. `fail` with `status` is how an endpoint answers an error of your own.
- **An input's limits go on its type.** `pounds` is a `Pounds`, so no step checks the weight: the endpoint refuses over 20 lb before any step runs (422, `details.reason` `FLOW_INPUT_INVALID`). A flow another flow, a schedule or a trigger starts is checked only for a non-empty rule (`minLength: 1`).
- **Ownership is a table setting, not a filter.** `owner: user` makes every row the signed-in person's: their reads see only their rows, and `record.read` of another person's id finds nothing — with `failIfEmpty: true` that fails the call (`order-box` › `owner`), so a later step may read `owner[0]` with no test before it (unless the read says `onOversize: cut`). Write no owner field and no owner filter.
- **A total that must stay right is `computed`, not a read-time sum.** `member.poundsOrdered` is a `rollup` over the relation `of-member`; the platform recomputes it a few seconds after any box is created, changed or deleted. It needs the relation, which names the field that makes the link (`from: box.memberId`). `rollup` also takes `count`, `avg`, `min`, `max`, `latest`.
- **A model step is `text.generate` with its `prompt`.** A placeholder is `{{name}}`, `{{name.field}}` or `{{name[0]}}`; one item's field (`{{found[0].fruit}}`) is not one, so `line` reads the whole `found`. A placeholder naming a whole object or list is refused at save (`INTERPOLATE_BARE_STRUCTURED_SLOT`): name a field, write `{{name | json}}`, or loop with a section. With no `outputSchema` it answers text.
- **`try` is the only way past a failure.** If the model call fails, `write`'s `catch` gives a fixed slip instead; both lists give `slip` through `out`, read after the block as `write.slip`. A value made inside a block is read outside only through its `out`.
- **`each` runs its steps once per value.** `perMember` runs per member due; inside, `member` is the value. Its steps change records and send mail, so it runs them one member at a time — `maxParallel: 1` says so.
- **`if` guards what may be missing.** The `Member` type marks `email` optional; inside `reachable`, whose test is `{ filled: member.email }`, the save knows it is there, so `to: member.email` is accepted. A test is false on a missing value; `{ not: { has: x } }` holds when `x` is missing.
- **Never twice, by the platform**: `renewalNote.noteKey` has the `key` use, and `record.create` with `onKeyTaken: skip` answers `keyTaken` instead of a second row. `fresh` mails only when it is not set, so a re-run of the job, overlapping or not, sends nothing twice.
- **A daily job for each person**: the schedule starts `remind-everyone`, whose `flow.start-per-person` runs `remind-renewal` once per member of the project, as that person — so its reads see that person's rows. `with.flow` names the flow it starts by key.
- **Read every page, loudly.** `record.query` reads one page unless `pages` says more; `onMore: fail` fails the run when rows remain instead of dropping them (the plan warns `RECORD_CURSOR_UNREAD` otherwise).
- **A list over HTTP is a named query.** `box.mine` sits under the table it reads; `list-boxes` reads it with `record.query` and `query: box.mine`, so its endpoint pages, publishes the item's schema and answers 304 with no run; a `record.query` with clauses written in place there is warned `ENDPOINT_IS_A_QUERY`. Its default `scope: caller` reads only the member's boxes. Paging inputs are the step's key plus `After`, `Before`, `Limit`; walk with `?after=<nextCursor>`. An endpoint declaring `after`, `before` or `limit` is no query endpoint (`QUERY_ENDPOINT_NOT_DERIVED`): `query-endpoints.md`.
- **YAML**: quote a path that holds `[` inside `{ … }` (`"perMember[].written"`), and a text with `: ` or `{{` in it.

## Names and fields that refuse a plan

- **Reserved field names**: `id`, `status`, `statusError`, `createdAt`, `updatedAt`, `processing` — every record already has them. Call yours `state` or `phase`.
- **Keys**: **step keys are camelCase** — a table key, a step key and a flow's input or output name are letters and digits, starting with a lower-case letter (`renewalNote`, `perMember`). Type keys are written like `Member`. Flow and relation keys are lowercase words joined by `-` (`order-box`). Endpoint, schedule and trigger keys are letters, digits, `.`, `-` and `_`. Two steps of one flow never share a key, at any depth.
- **Endpoint paths start with `/v1/`**, and a path whose first word a platform route uses is refused (`ENDPOINT_PATH_RESERVED_WORD`, `ENDPOINT_PATH_CONFLICT`) — `/v1/boxes` is one; `/v1/club/boxes` is not. `GET /v1/coded-routes` lists them.
- **A flow states `label`, `inputs` and `outputs`** (`{}` for none). A list value is `Type[]` (`string[]`), never `object`; the endpoint publishes the type you declare.
- **An expression names record fields exactly as the type has them**; a field the record lacks is refused `JSONATA_FIELD_UNKNOWN`. Inside a filter `[…]` a bare name is the item's field.
- **A document in another format** is refused whole with `DOCUMENT_VERSION_UNSUPPORTED`, and nothing converts it: state `"kipory": 13`.

## Try it as a person, then change it

- **Prove it in one call**: `kipory ship app.mjs --check checks.json` plans, applies and runs the check file's requests as test users; `kipory call alice GET "/v1/club/boxes"` sends one (`POST /v1/test-users { "project": "<nodeId>", "name": "alice" }` makes alice); a second user proves isolation.
- **A start for everyone skips test users until you say so.** `flow.start-per-person` with `people: {"kind": "project"}` starts real people only and answers `testUsersLeftOut`; set `"testUsersInStarts": true` with `PATCH /v1/projects/{nodeId}/settings` while you test, and `false` before launch. To rehearse one person's run: `kipory preview remind-renewal --as alice` (`POST /v1/flows/{id}/preview-runs` with `principal: "end-user"` and `runAsUserId`, then `GET /v1/runs/{runId}/trace`).
- **A project holds 20 test users**; need more, set `"testUserLimit": 50` (up to 100) the same way.
- **Change one flow's steps without a document**: `POST /v1/flows/{id}/steps/edit` with edits by key (`row-by-row.md`).
- **Changing a type or a flow that an endpoint serves**: a safe change (a new optional field on `Box`, an optional input to `order-box`, a new output, a new `description`) applies unasked. The plan's `contractChanges` lists any other: each endpoint and table whose callers would meet it, each change and its verdict. A breaking one is refused `CONTRACT_BREAK_NOT_ACCEPTED` until an admin of the project names each such row, by key, in the document's top-level `"acceptBreaks": { "endpoints": ["order-box"] }`; an editor key is refused `CONTRACT_BREAK_FORBIDDEN` whatever `acceptBreaks` names.

## When to open another page

- A function this example does not use: `functions/README.md` (one line each), then that function's page.
- A step's fields and argument forms: `action-fields.md`.
- A finding, its fixes, trying one step: `checking.md`.
- A refusal you cannot read: `kipory-connect`'s `references/refusal-codes.md`, by code.
- A project that already holds records you will reshape: `kipory-evolve`.
- What a project already holds, in a few KB: `kipory summary` (`GET /v1/projects/{nodeId}/document/summary`).
- A question this page does not answer: `answers.md`, then `kipory docs <words>`.
- Search by meaning, files, outside APIs: `kipory-retrieve`, `kipory-extract`, `kipory-gather`.
- Every rule of the document: `document.md`.
