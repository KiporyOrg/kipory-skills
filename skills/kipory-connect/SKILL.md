---
name: kipory-connect
description: Start here for any work on a Kipory project — the primer that holds what a build needs before its first plan, in one read - the project document's format with a complete example, the rules that keep a plan from being refused, every function in one line with its settings, and the `kipory` command that ships a document and checks it as test users in single calls. Use at the beginning of any work on a Kipory project, when the user hands over a base URL and an API key, when a call returns 401, 403 or 404 and the cause is unclear, or when you need to know which id, host or role a call wants. Every other kipory skill is a deeper reference this page points to.
license: MIT
---

<!-- field-ok: noteId — the example project's own type field -->
<!-- field-ok: list-notes — the example project's own flow key -->
<!-- field-ok: bodyText — a key of the kipory command's check file, not an API field -->
<!-- field-ok: bodyFile — a key of the kipory command's check file, not an API field -->
<!-- field-ok: userInfo — a run-ambient value an expression reads, not a request field -->

# Kipory: the primer

Kipory is a platform for a product's backend. A product on Kipory is a **project**, and a project is not code: its types, tables, flows, HTTP endpoints, views and schedules are configuration, written as one **project document** (YAML or JSON), planned, then applied. **Plan first.** This page holds what a first document needs: write it, `ship` it, and open a reference only for what a refusal or a failed check names (`kipory docs <words or CODE>` returns that one section).

**Two hosts.** The design API answers on the api host with your API key. The product's own endpoints answer on the project's host (`baseUrl` on `GET /v1/grant`) with a person's session. `.env` holds `KIPORY_BASE_URL`, `KIPORY_API_KEY` and `KIPORY_PROJECT_ID`; never print the key or write it into a file you keep.

## The `kipory` command

This skill's `scripts/kipory.mjs` does the plumbing: write no HTTP client of your own. From the folder holding `.env`, the first call is `node .claude/skills/kipory-connect/scripts/kipory.mjs connect`: it writes `./kipory`, this command for every later call (`./kipory ship app.mjs`), proves the key and prints what the project holds. The shell is zsh: it does not split a variable holding a command (`K="node …"; $K` fails), and macOS `sed -i` needs `''`, so edit files with your edit tool or a script. Below, `kipory <command>` is `./kipory <command>`.

```
kipory connect                          first call: writes ./kipory, proves the key, names the host, one line per element
kipory summary                          what the project holds, again
kipory ship app.mjs --check checks.json plan, apply when clean, then run every check: the whole loop in one call
kipory plan app.mjs                     plan only: "plan ok <planId>", or one line per error with its path and a fix
kipory check checks.json                run the checks again, without a plan
kipory call alice GET "/v1/app/notes"   one request as test user alice (- for no one); -H 'name: value', --pages, --times 5, --out f, --body-file f --type t
kipory preview <flow> --as alice        run one flow in the sandbox as alice; one line per write; nothing kept unless --apply
kipory preview --schedule daily         run a schedule's flow the way it fires: as nobody, with its inputs
kipory find "sign a webhook"            can Kipory do it? the functions that do, or an honest cannot (--report files it)
kipory docs record query cursor         the best-matching section of the deeper skills
```

**app.mjs** is a script that prints the document as JSON; a `.json` or `.yaml` file works too. Exit 1 means refused or a check failed, 2 a usage problem; `--json` prints the raw answer. If a plan surprises you, `node .claude/skills/kipory-connect/scripts/sync.mjs` compares these skills with the deployment.

## Check: prove it as people, in one call

A check file lists requests sent to the project's host as test users, in order, with what each should answer. Test users are made once and remembered in `.kipory/`. A project holds 20; for more, `PATCH /v1/projects/{nodeId}/settings {"testUserLimit": 50}` (up to 100) once, before making them.

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
- **Running**: in order; `{"parallel": [...]}` runs its requests at once; `times: n` sends one request n times at once (races, idempotency, quotas); `{"wait": 2000}` pauses; `pages: true` follows `nextCursor` with `?after=` and joins the list as `items` (a view's `items`, or the `records` of a flow returning a `record.query` page; `{"param": "cursor"}` for that flow's own cursor input), up to 20 pages; `eventually: ms` asks a GET again each second until the answer holds. `{{timestamp}}` is the time in seconds. Redirects are not followed.
- **What it should answer**: `status` (a number, a list, or `"4xx"`; a 2xx when left out), `statuses` (counts across `times`), `body` (a subset: each key given must match, a list item by item), `has` and `absent` (paths), `count` (`{path: n}`), `includes` (`{path: {fields}}`: the list holds an item like it), `unique` and `sorted` (`{path: "field"}`, `"-field"` for descending), `contains` (text in the raw body), `headers` (each must contain the text), `bytes`, `type`. With `times`, what a body holds is asked of the 2xx answers.
- **Repeatable**: test users and what they wrote persist between runs, so assert what this run made: a saved id (`has`, `body`), `includes`, values carrying `{{nonce}}`; never a `count` over a remembered user's whole list.
- It prints one line per failure (what came, what was expected, the body), one `skip` line for the requests that needed what a failed one did not save, and a tally. Keep the file beside the document and pass it to every `ship`, so each change is proved with everything before it.

## The document

<!-- prettier-ignore -->
```yaml
kipory: 11
types:
  Note:
    definition:
      type: object
      required: [title, state]
      properties:
        title: { type: string, minLength: 1, maxLength: 200 }
        state: { type: string, enum: [open, done] }
        dueOn: { type: string, maxLength: 10 }
  Notice:
    definition:
      type: object
      required: [text, endsOn]
      properties:
        text: { type: string, maxLength: 500 }
        endsOn: { type: string, maxLength: 10 }
tables:
  notice:
    ownerScope: project           # one shared set of rows; a job running as nobody reads them all
    type: Notice
    uses:
      fields:
        - source: { family: submission, field: endsOn }
          uses: [filter]
  note:
    ownerScope: user              # every row is its creator's; others read it as missing
    type: Note
    uses:
      fields:
        - source: { family: submission, field: dueOn }
          uses: [filter]          # filter: may be queried, ordered, compared; key: unique
views:
  myNotes: { description: The caller's notes., table: note, pageSize: { default: 50, max: 50 } }
flows:
  create-note:
    label: Create a note
    inputs:
      title: { typeName: string }
      dueOn: { typeName: string, optional: true }
    outputs:
      noteId: { typeName: string }
    steps:
      - key: tooLong
        if:
          - test: { gt: [{ expr: "$length(title)" }, 200] }
            steps:
              - key: refuse
                fail: { code: TITLE_TOO_LONG, message: The title is too long., status: 422 }
      - key: save
        function: record.create
        with:
          tableKey: note
          fields:
            title: title                          # a bare string is a path to a value
            state: { literal: open }              # text is a literal
            dueOn: { path: dueOn, optional: true } # an optional input is read with its tolerance
      - key: saved
        if:
          - test: { not: { has: save.recordId } }
            steps:
              - key: noNote
                fail: { code: NO_RESULT, message: The note was not saved., status: 409 }
      - key: done
        return: { noteId: save.recordId }
  get-note:
    label: Read one note
    inputs: { noteId: { typeName: string } }
    outputs: { note: { typeName: Note } }
    steps:
      - key: found
        function: record.read
        with: { tableKey: note, ids: { expr: "[noteId]" }, failIfEmpty: true }   # 404 when missing or another person's
      - key: one
        if:
          - test: { not: { filled: found } }   # proves found[0] for the save
            steps:
              - key: none
                fail: { code: NOT_FOUND, message: No such note., status: 404 }
      - key: done
        return: { note: "found[0]" }
  list-notes:
    label: List my notes
    inputs:
      notesAfter: { typeName: string, optional: true }
      notesBefore: { typeName: string, optional: true }
      notesLimit: { typeName: number, optional: true }
    outputs: { page: { typeName: object } }
    steps:
      - key: notes
        function: record.view
        with: { view: myNotes }
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
          tableKey: notice
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
surfaces:
  endpoints:
    create-note:
      contractConfig: { method: POST, path: /v1/app/notes, successStatus: 201, auth: required, params: {} }
      targetConfig: { kind: flow.invoke, execution: sync, flow: create-note, inputs: { title: { from: body }, dueOn: { from: body } } }
    get-note:
      contractConfig: { method: GET, path: "/v1/app/notes/{id}", successStatus: 200, auth: required, params: { id: { in: path, type: string, required: true } } }
      targetConfig: { kind: flow.invoke, execution: sync, flow: get-note, inputs: { noteId: { from: path.id } } }
    list-notes:
      contractConfig: { method: GET, path: /v1/app/notes, successStatus: 200, auth: required, params: {} }
      targetConfig: { kind: flow.invoke, execution: sync, flow: list-notes, inputs: {} }
  schedules:
    daily:
      label: Nightly clean-up
      flow: expire-notices
      cronPattern: "0 7 * * *"
      tz: UTC
      overlapPolicy: skip
      failurePolicy: pause
      enabled: true
      inputs: {}
```

- **A flow is its steps, in the order they run.** A step is a function (`function` + `with`), or a block: `if` (a list of `test` + `steps`), `each` (a list, `as`, `steps`), `repeat`, `parallel`, `try` (`steps`, `catch`, each giving values through `out`), `return`, `fail`. A step's key names its value (`save.recordId`); a value made inside a block is read outside only through the block's `out`. A flow gives outputs only through `return`.
- **An argument** is exactly one of: a path (`title`, `rows.records`), `{ literal: … }`, `{ expr: "<JSONata>" }`, `{ path: x, optional: true }`, `{ path: x, default: … }`. Never mix their keys: a default for an expression goes inside it, `{ expr: "$default(limit, 20)" }`. A setting that names a thing (`tableKey`, `view`, `flow`) is a plain value. A test is one of `has`, `filled`, `eq`, `in`, `gt`, `gte`, `lt`, `lte`, `before`, `after`, `startsWith`, `contains`, `matches`, `expr`, combined with `and`, `or`, `not`. An expression reads `runInfo.now`, `runInfo.nonce`, and `userInfo.userId` (the caller; nothing on a schedule); `$now()` and `$random()` are refused.
- **An endpoint answers its flow's outputs by name** (`{ "note": {…} }`); `contractConfig.responseBody: note` answers that one output bare, `redirect: { location: url }` answers a redirect to an output.
- **A list over HTTP is a view**: one `record.view` step; the flow declares `<step>After`, `<step>Before`, `<step>Limit`; the endpoint answers `{ items, nextCursor }` and pages by `?after=`. A view orders by `created`, or by a field with a `filter` use (a text one needs `maxLength` ≤ 500). A list whose filter changes per call (from now on, by a search word) is a flow with `record.query` and a `cursor` input instead.
- **People's data** lives on `ownerScope: user` tables: reads see only the caller's rows, so write no owner field or filter. Sharing is `sharing: true` on the table plus `record.grant`. `ownerScope: project` rows are shared by everyone, and identical data there is one record: give a row that may repeat a field that tells it apart, such as `ref: { expr: "runInfo.nonce" }`.
- **Once, by the platform**: a field with the `key` use, then `record.create` with `onKeyTaken: skip` answers `keyTaken: true` instead of a second row. A counter is `record.update` with `add: { views: { literal: 1 } }`. Calls at once on one record apply in turn: a save another call's change refused runs again (`record.update`'s `ifChangedMeanwhile`), so add no lock or retry; a quota counted with `record.count` holds.
- **`null` at an endpoint.** An answer carries every field its declared type marks optional, `null` when it has no value — so type a record output with its table's own type (`outputs: {link: {typeName: Link}}`), never plain `object` (a record straight from `record.read` in an `object` output gets nothing filled). An optional input sent as `null` means not sent. To clear vs keep on an update, bind one object input `{"from": "patch"}` — its type's fields all optional, e.g. a `LinkChanges` type beside the table's — and pass it to `record.update` as `data`: a field sent `null` is removed, one left out is kept; `$exists(changes.x)` is true when `x` was sent.
- **CSV.** Build the text with a `text.csv` step (`rows`, `columns`), return it as a required text output, and set the endpoint's `contractConfig` `responseBody` to it plus `responseType: "text/csv"`; errors stay JSON.
- **A daily job runs as nobody**: `expire-notices` sees every project row. A start for everyone (`flow.start-per-person`, `people: { kind: project }`) starts real people only and answers `testUsersLeftOut`: while you test, `PATCH /v1/projects/{nodeId}/settings {"testUsersInStarts": true}`, off before real people use it. Rehearse a job with `kipory preview --schedule <key>`, one person's run with `kipory preview <flow> --as alice`.
- **Mail needs an address first**: read `sendableDomains` from `GET /v1/managed-email-addresses?node=<nodeId>`, then `POST /v1/managed-email-addresses { node, localPart, domain, grade: "relay" }` once; `email.send`'s `address` names it. A test user receives no mail. A model call is `text.generate` (a `prompt`, `outputSchema` for a typed answer) or `text.decide` for yes/no, a pick or a score (`kipory-build`'s `references/models.md`).

## Rules that keep the first plan clean

1. **`kipory: 11`** at the top; send the document alone, never an export's `{ version, document }` envelope. A document is partial: an element you leave out is untouched, but each element you state is whole, and a flow's `steps` are its whole list. Removal is `delete: true` on the element.
2. **Every required read is proved present.** An optional input or `userInfo` (nothing on a schedule): read it `{ path: x, optional: true }` (the setting is then left out) or `{ path: x, default: … }`, or put the step under an `if` whose test is `{ filled: x }`. An item of a list read (`rows.records[0]`, `found[0]`) needs an `if` that fails when it is missing first, as `get-note` does (`STEP_INPUT_MAY_BE_ABSENT`). At a required read write `{ path: x, default: … }` or `$default(x, …)`, not a conditional on `$exists`, which the plan cannot prove.
3. **A required output from a receipt is guarded**: before `return { noteId: save.recordId }`, an `if` on `{ not: { has: save.recordId } }` that fails (`FLOW_OUTPUT_MAY_BE_NOTHING`).
4. **`fail.status` is 400–499**, but not 405, 408 or 426 (left out, 422); there is no 5xx of your own (`FAIL_STATUS_INVALID`). `fail.code` is capitals, digits and underscores, starting with a capital (`TITLE_TOO_LONG`); the caller gets it as `details.reason`.
5. **Text is `{ literal: … }`**: a bare string is always a path, and an unknown one is `STEP_READS_UNKNOWN`.
6. **A function's settings are its own**: the catalog line below lists what `with` takes (`*` required). A caller's page size is `limit: { path: limit, default: 50 }` (1–100, else 50). `record.delete` takes `ids`, not `tableKey`. Settings a function does not take are `STEP_SETTING_UNKNOWN`.
7. **Queried, ordered or totalled fields carry a `filter` use** on the table; on a table that already holds records, apply the new use before planning the steps that read it. An expression names a record's fields exactly as its type has them (`JSONATA_FIELD_UNKNOWN`). `record.list`, `record.count` and `record.aggregate` compare text only with `eq` or `in`; a range on text is `record.query`'s.
8. **Expressions**: wrap a list one builds in `$list(…)` (JSONata gives one item as the item, none as nothing); `x != "v"` is false when `x` is missing, so write `$not(x = "v")`; a yes/no pattern test is `$contains(s, /re/)`, not `$match`; read a `cursor` from the previous page's `nextCursor` or an input, never a value step.
9. **Keys**: step, table and input keys are camelCase, and no two steps of a flow share a key at any depth (`STEP_KEY_TAKEN`); flow and relation keys are kebab-case; type keys are PascalCase. Record fields never use `id`, `status`, `createdAt`, `updatedAt`, `processing` or `statusError`.
10. **Blocks nest at most 4 deep** (move the inside to a flow and `flow.invoke` it); `repeat.max` is at most 50; a schedule's `failurePolicy` is `pause` or `keep-running`. A credential an outside call needs is stored and named in `url.send`'s or `url.fetch`'s `secret`, never written into its `headers`.
11. **Endpoints**: method GET, POST, PATCH or DELETE (no PUT); a path starts `/v1/<a word of yours>/` (`/v1/boxes` collides with a platform route, `/v1/app/boxes` does not); every query parameter an input reads is declared in `params`, and one feeding a required input is `required: true` (`ENDPOINT_INPUT_UNSATISFIED`); `successStatus` is 200, 201, 202, 204 or 206. A public endpoint (`auth: none`) is refused until the project's `publicSpendCapCredits` is set with `PATCH /v1/projects/{nodeId}/settings`.
12. **Changing a flow or a type an endpoint already serves**: adding optional fields is adopted by itself; any other change needs `adoptSnapshots: true` on the element you change (`FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS`, `TYPE_RESHAPES_BOUND_SNAPSHOTS`).

**A refused plan** prints one line per error with its path and, mostly, a `fix:` (step `edit`s, or `set` at document paths): apply the first fix of every error in one edit, an equal fix once per flow, then ship again. Only `error` refuses, but read every warning the plan prints: one naming a slot inside `[…]` (`JSONATA_ITEM_FIELD_NAMED_LIKE_SLOT`) means an expression reads another value than you meant — fix it. `kipory docs <CODE>` explains any code; `409 VERSION_CONFLICT` means someone changed the project since your read, so plan again.

## Every function, one line

`name — title · what with takes (* required; a function's first words are the values it reads) → what it gives`. Write a step from its line; open a function's page (`kipory docs <key>`) only when a refusal names one of its settings. The deployment's catalog (`GET /v1/functions`) may hold functions added since this was written.

<!-- generated: the function catalog, one line each, from the deployment's catalog; regenerated on every publish, so an edit inside this block is overwritten -->

**ai** — Model calls: answer typed questions (the cheapest), generate text, or rank a list.

- text.decide — Answer typed questions · message* model outputSchema → the step's outputSchema
- text.generate — Generate text · prompt* system model outputSchema reasoningEffort task temperature vocabularyFields → the step's outputSchema
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

- term.search — Search terms by meaning · text* minScore parentTermId status topK vocabulary vocabularyKey → TermHit[]

**records** — Read and change the project's records and terms. Only these steps can change a record.

- record.aggregate — Total records · measures* tableKey* clauses groupBy limit order timeZone userId → RecordAggregate
- record.append — Add events to a record · event* field* recordId* tableKey* eventId userId → string
- record.count — Count records · tableKey* createdAfter createdBefore fieldFilters linkFilters statuses userId vocabularyFilter → number
- record.create — Create a record · tableKey* data fields fileIds onKeyTaken userId → RecordCreate
- record.delete — Delete records · ids* userId → boolean
- record.enqueue-process — Queue for processing · recordId* mode replay userId → boolean
- record.grant — Share a record · recordId* principal* level memberLevel userId → boolean
- record.grants — List a record's shares · recordId* userId → RecordShare[]
- record.link-assert — Link two records · sourceRecordId* targetRecordId* actor* relationKey* userId → RelationAssertion
- record.link-counts — Count a record's links · recordIds* relationKey* direction → RecordLinkCount[]
- record.link-retract — Remove a link · sourceRecordId* targetRecordId* actor* relationKey* userId → RelationRetraction
- record.links — Read a record's links · recordId* includeExpired limit relationKey → RecordLink[]
- record.list — List records · tableKey* createdAfter createdBefore cursor dataContains dataContainsPath dataEquals dataEqualsPath dataNullChecks fieldFilters fields include limit linkFilters linked order pages scalars sort sortField statuses userId vocabularyFilter whose (dataEqualsPath+dataEquals together; dataContainsPath+dataContains together) → RecordPage
- record.merge — Merge records · keep* merge* userId → RecordMerge
- record.query — Query records · clauses* cursor fields limit linked order pages tableKey tableKeys userId → RecordQueryPage
- record.read — Read records · ids* tableKey* dataNullChecks failIfEmpty fields include linked redirect scalars userId → RecordRead[]
- record.revoke — Stop sharing a record · recordId* principal* ifAbsent userId → boolean
- record.teardown — Clear generated data · recordId* targets userId → object
- record.update — Update a record · recordId* add clearDerived data derived failIfPreconditionUnmet fields fileIds ifChangedMeanwhile mode requireStatus setStatus userId → boolean
- record.view — Read a view · view* → object
- term.threshold-gate — Decide: match or new term · candidates parentTermId proposalLabel proposalSlug thresholds vocabulary vocabularyKey → GateDecision
- term.upsert — Save terms · resolutions* → nothing
- vocabulary.aggregate — Count records by term · maxEntriesPerVocabulary shape userId vocabularies → VocabularyAggregate
- vocabulary.resolve — Pick terms for a record · context deterministic extractedVocabularies maxValues model vocabularyKeys → TermResolution[]

**outbound** — Reach a person or a system outside the platform. Nothing is sent until the run's changes are saved.

- email.send — Send an email · address* subject* text* to* html replyTo → string
- push.send — Send a push notification · badge body collapseKey data expiresIn kind recipient sound threadId title urgency → PushSendResult
- url.send — Send a request · url* body bodyAs contentType headers idempotencyKey method query secret sign timeoutMs → boolean

**flow** — Steer the run: branch, loop, call another flow, keep state between steps.

- event.emit — Send an event · category* event* payload → nothing
- flow.continue — Continue with the next page · cursor* cursorInput* inputs → ContinueResult
- flow.invoke — Run another flow · flow* inputs → the called flow's outputs
- flow.start-per-person — Start a flow for each person · flow* people* inputs → PeopleStartResult
- request.refuse — Refuse the call · code* status* message retryAfterSeconds → nothing
- request.verify-signature — Check a call's signature · payload* signature* algorithm encoding format messageId onMismatch prefix secret storedSecret timestamp toleranceSeconds (one of secret|storedSecret) → boolean
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
