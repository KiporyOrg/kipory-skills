# Which function for which job

Read this when the quickstart's example does not use the function you need: one row per catalog group, its families in order, and where the judgment for it is. The function pages say what each key takes.

To ask in your own words first, run `kipory find "<what you want to do>"`, or send `GET /v1/functions/search?q=<what you want to do>&project=<nodeId>`: it answers in two lists, Kipory's functions and your project's connections, each best first, each function with a step to paste (or a flow step or an expression helper with its snippet); or that Kipory cannot do it yet, with the nearest functions and a report to file; or that the service your ask names is not connected to the project. Read its `text`.

The deployment's catalog lists every function, not this table: `GET /v1/functions?project=<nodeId>`. Some are added as data with no release (`origin: "ability"` on the entry, its words the vendor's when `copySource: "vendor"`), so no page here describes them. Read one with `GET /v1/functions/{key}` and use it in a step like any other. When the catalog's `version` differs from the one this bundle was generated from, read it again.

<!-- generated: one row per catalog group, its families and functions, from the catalog; an edit inside this block is overwritten -->

- **Ask a model** (`ai`) — judgment: `references/models.md`
  - Answer questions: `text.decide`
  - Write text: `text.generate`
  - Rank by relevance: `text.rerank`
  - Transcribe speech: `audio.transcribe`
- **Shape values and text** (`values`) — judgment: `references/utilities.md` (`text.interpolate`), `kipory-extract`, `kipory-retrieve`
  - Reshape a value: `list.concat`, `value.build`, `value.transform`
  - Fill a template: `text.interpolate`
  - Work on text: `text.chunk`, `text.csv`, `text.detect-language`, `text.match`, `text.sanitize`
- **Web and maps** (`web`) — judgment: `kipory-gather`
  - Read a web page: `url.fetch`, `url.fetch-as-file`, `url.metadata`, `url.scrape`, `url.screenshot`
  - Search the web: `web.search`
  - Site rankings and traffic: `web.rankings`, `web.traffic`
  - Places: `location.resolve`, `place.details`, `place.reviews`, `place.search`
- **Social and channels** (`social`) — judgment: `kipory-gather`; watching a channel is `kipory-channels` (`packs/sources.md`)
  - Posts of an account: `<network>.posts` (facebook, instagram, linkedin, reddit, threads, tiktok, x, youtube)
  - One post: `<network>.post` (instagram, linkedin, reddit, threads, tiktok), `youtube.video`
  - One profile: `<network>.profile` (instagram, linkedin, threads, tiktok, x), `facebook.page`, `linkedin.company`, `youtube.channel`
  - Followers and audience: `tiktok.audience`, `tiktok.followers`, `tiktok.following`
  - Comments: `<network>.comments` (instagram, reddit, tiktok, youtube)
  - Search a network: `<network>.search` (instagram, reddit, threads, tiktok, youtube), `instagram.search-profiles`
  - Transcripts: `<network>.transcript` (instagram, tiktok, x, youtube)
  - Ad libraries: `<network>.ad` (facebook, google, linkedin), `<network>.ads` (facebook, google, linkedin, tiktok)
  - Trending: `youtube.trending`
  - Telegram channels: `source.unwatch`, `source.watch`, `telegram.resolve-channel`, `telegram.search-channels`
- **Files** (`files`) — judgment: `kipory-extract`
  - Read a file: `file.read-text`, `image.decode-qr`, `pdf.parse`
  - File details: `audio.metadata`, `file.stats`, `image.metadata`
  - Make a file: `file.copy`, `image.resize`, `pdf.screenshot`
  - Share a file: `file.download-url`
- **Records** (`records`) — judgment: `references/records-and-endpoints.md`, `record-query.md`, `queries.md`; links and history: `kipory-data`'s `references/in-flow-record-functions.md`
  - Read records: `record.query`, `record.read`
  - Count and total: `record.aggregate`, `record.count`
  - Change records: `record.append`, `record.create`, `record.delete`, `record.merge`, `record.update`
  - Links: `record.link-assert`, `record.link-counts`, `record.link-retract`, `record.links`
  - Sharing: `record.grant`, `record.revoke`, `record.shares`
  - Process again: `record.enqueue-process`
- **Vocabularies** (`vocabularies`) — judgment: `kipory-model`; finding by meaning is `kipory-retrieve`
  - Tag a record: `term.upsert`, `vocabulary.resolve`
  - Find terms: `term.search`
  - Count by term: `vocabulary.aggregate`
- **Run** (`run`) — judgment: `references/patterns.md`, `fan-out.md`; `event.emit` is `kipory-operate`
  - Call a flow: `flow.invoke`
  - Start more runs: `flow.continue`, `flow.start-per-person`
  - Tell the client: `event.emit`
  - Check the caller: `request.verify-signature`
- **Send** (`send`) — judgment: `kipory-channels`; `url.send` is `kipory-gather`
  - Message a person: `email.send`, `push.send`
  - Call a system: `url.send`
- **Your connections** (`connections`) — judgment: `kipory-gather`'s `references/connections.md`
  - your project's connected services, one family per tag or server

<!-- end of the generated group table -->

Finding by meaning is `record.query` with a `semantic` clause (records), or `term.search` (a vocabulary's terms). The platform indexes records itself from a table's `search` use; no step embeds or writes to the index.

The blocks `if`, `each`, `repeat`, `parallel` and `try` are steps, not functions; there are no fan-out, merge, loop or dispatch functions. <!-- absent-function: flow.fan-out --> <!-- absent-function: flow.merge --> <!-- absent-function: flow.loop --> <!-- absent-function: flow.loop-end --> <!-- absent-function: flow.dispatch -->

A sub-flow call is `{key: total, function: flow.invoke, with: {flow: sum-boxes, inputs: {memberId: member.id}}}`, read as `total.<output>`.
