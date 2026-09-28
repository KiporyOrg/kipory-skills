<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Handler catalog

71 system handlers, one page each. A step in a flow is one of these plus its config. Confirm the key against `GET /v1/handlers` on your deployment before you author a step — the catalog's `version` this was generated from is in kipory-connect/references/versions.md; if the live one differs, the live one wins.

## Groups

- **AI** (4) — Model calls: generate text, turn text into a vector, or rank a list.
- **Text** (5) — Work on text without a model: split, match, fill a template, clean.
- **Sources** (17) — Fetch data from outside — pages, videos, feeds, places. Can be slow and cost money.
- **Files** (10) — Read what a file holds — metadata, text, transcripts — make a resized or rendered copy, or a download link.
- **Search** (5) — Vectors: encode a value, store it, and find the nearest matches.
- **Entities** (17) — Read and change the project's records and terms. Only these steps can change a record.
- **Outbound** (1) — Reach a person outside the platform. Nothing is sent until the run's changes are saved.
- **Flow** (9) — Steer the run: branch, loop, call another flow, keep state between steps.
- **Utility** (3) — Reshape a value, or pick between values from earlier steps.

## ingest (31)

_Run in the async ingest worker: queued, retried, cached — the heavy, paid, IO-bound steps._

- [`audio.metadata`](audio.metadata.md) — Extract audio details · Files · `file` → `AudioMetadata`
- [`audio.transcribe`](audio.transcribe.md) — Transcribe audio · Files · `file` → `string`
- [`file.read-text`](file.read-text.md) — Read a text file · Files · `file` → `string`
- [`file.stats`](file.stats.md) — Extract file details · Files · `file` → `FileStats`
- [`image.decode-qr`](image.decode-qr.md) — Scan QR codes · Files · `file` → `string[]`
- [`image.metadata`](image.metadata.md) — Extract image details · Files · `file` → `FileMetadata`
- [`image.resize`](image.resize.md) — Resize an image · Files · `file` → `file`
- [`location.resolve`](location.resolve.md) — Find a place from a map point · Sources · `Location` → `Place`
- [`pdf.parse`](pdf.parse.md) — Extract text from a PDF · Files · `file` → `PdfDocument`
- [`pdf.screenshot`](pdf.screenshot.md) — Save a PDF page as an image · Files · `file` → `file`
- [`telegram.resolve-channel`](telegram.resolve-channel.md) — Fetch a Telegram channel · Sources · `string` → `TelegramChannelResolution`
- [`telegram.search-channels`](telegram.search-channels.md) — Search Telegram channels · Sources · `string` → `TelegramChannelSearchResults`
- [`term.upsert`](term.upsert.md) — Save terms · Entities · `1` → `nothing`
- [`text.decide`](text.decide.md) — Answer typed questions · AI · `any` → `nothing`
- [`text.embed`](text.embed.md) — Capture text meaning · AI · `string` → `Vector`
- [`text.generate`](text.generate.md) — Generate text · AI · `any+` → `nothing`
- [`text.rerank`](text.rerank.md) — Rank by relevance · AI · `slot map` → `RerankHit[]`
- [`url.fetch`](url.fetch.md) — Fetch text from a web address · Sources · `string` → `string`
- [`url.fetch-as-file`](url.fetch-as-file.md) — Fetch a web address as a file · Sources · `string` → `file`
- [`url.metadata`](url.metadata.md) — Fetch a page's title and preview · Sources · `string` → `UrlMeta`
- [`url.scrape`](url.scrape.md) — Fetch a web page · Sources · `string` → `ScrapedPage`
- [`url.screenshot`](url.screenshot.md) — Take a page screenshot · Sources · `string` → `file`
- [`vector.upsert`](vector.upsert.md) — Store search data · Search · `any+` → `nothing`
- [`web.rankings`](web.rankings.md) — Fetch top websites · Sources · `string` → `TopSiteRanking`
- [`web.search`](web.search.md) — Search the web · Sources · `string` → `WebSearchResults`
- [`web.traffic`](web.traffic.md) — Fetch website traffic · Sources · `string` → `SiteTrafficMetrics`
- [`x.posts`](x.posts.md) — Fetch X posts · Sources · `string` → `ScrapedPage`
- [`youtube.channel`](youtube.channel.md) — Fetch a YouTube channel · Sources · `string` → `YoutubeChannel`
- [`youtube.transcript`](youtube.transcript.md) — Fetch a YouTube transcript · Sources · `string` → `string`
- [`youtube.trending`](youtube.trending.md) — Fetch trending YouTube channels · Sources · `string` → `YoutubeTrendingChannels`
- [`youtube.video`](youtube.video.md) — Fetch a YouTube video · Sources · `string` → `YoutubeVideo`

## inline (34)

_Run synchronously inside the flow engine, in order._

- [`email.send`](email.send.md) — Send an email · Outbound · `recipient, subject, body` → `boolean`
- [`entity.append`](entity.append.md) — Add events to a record · Entities · `record slot + event(s)` → `string`
- [`entity.count`](entity.count.md) — Count records · Entities · `user id` → `number`
- [`entity.create`](entity.create.md) — Create a record · Entities · `submission object` → `RecordCreate`
- [`entity.delete`](entity.delete.md) — Delete records · Entities · `record id list` → `boolean`
- [`entity.enqueue-process`](entity.enqueue-process.md) — Queue for processing · Entities · `record id` → `boolean`
- [`entity.link-assert`](entity.link-assert.md) — Link two records · Entities · `string, string` → `RelationAssertion`
- [`entity.link-retract`](entity.link-retract.md) — Remove a link · Entities · `string, string` → `RelationRetraction`
- [`entity.links`](entity.links.md) — Read a record's links · Entities · `string` → `RecordLink[]`
- [`entity.list`](entity.list.md) — List records · Entities · `user id + cursor` → `RecordPage`
- [`entity.query`](entity.query.md) — Query records · Entities · `cursor + user slots` → `RecordQueryPage`
- [`entity.read`](entity.read.md) — Read records · Entities · `any+` → `RecordRead[]`
- [`entity.teardown`](entity.teardown.md) — Clear generated data · Entities · `slot map` → `object`
- [`entity.update`](entity.update.md) — Update a record · Entities · `record slot + data/derived patches` → `boolean`
- [`event.emit`](event.emit.md) — Send an event · Flow · `event payload` → `nothing`
- [`facet.resolve`](facet.resolve.md) — Pick terms for a record · Entities · `record context` → `TermResolution[]`
- [`file.download-url`](file.download-url.md) — Create a download link · Files · `file` → `string`
- [`list.concat`](list.concat.md) — Join into one list · Utility · `list+` → `nothing`
- [`state.read`](state.read.md) — Recall a saved value · Flow · `none` → `string`
- [`state.write`](state.write.md) — Save a value for later · Flow · `any` → `string`
- [`taxonomy.aggregate`](taxonomy.aggregate.md) — Count records by term · Entities · `string` → `TaxonomyAggregate`
- [`telegram.stats`](telegram.stats.md) — Read Telegram member count · Sources · `string` → `TelegramChannelStats`
- [`term.threshold-gate`](term.threshold-gate.md) — Decide: match or new term · Entities · `candidates + thresholds + proposal` → `GateDecision`
- [`text.chunk`](text.chunk.md) — Split text into chunks · Text · `string` → `string[]`
- [`text.detect-language`](text.detect-language.md) — Detect language · Text · `string` → `string`
- [`text.embed-sparse`](text.embed-sparse.md) — Capture text keywords · Search · `string` → `SparseVector`
- [`text.extract`](text.extract.md) — Pull out matching text · Text · `string+` → `string[]`
- [`text.interpolate`](text.interpolate.md) — Fill a template · Text · `any+` → `string`
- [`text.sanitize`](text.sanitize.md) — Make text safe for a prompt · Text · `any+` → `object`
- [`value.first-non-empty`](value.first-non-empty.md) — Take the first filled value · Utility · `any+` → `nothing`
- [`value.transform`](value.transform.md) — Reshape values · Utility · `any+` → `object`
- [`vector.fetch`](vector.fetch.md) — Read stored search data · Search · `string` → `Record<string, number[]>`
- [`vector.point-id`](vector.point-id.md) — Make a search data id · Search · `any` → `string`
- [`vector.search`](vector.search.md) — Search by meaning · Search · `any+` → `TermHit[]`

## control (6)

_Steer the run rather than carry data: branch, fan out, merge, call a sub-flow._

- [`flow.dispatch`](flow.dispatch.md) — Pick a branch · Flow · `string | file | object` → `string`
- [`flow.fan-out`](flow.fan-out.md) — Run once per item · Flow · `T[]` → `T`
- [`flow.invoke`](flow.invoke.md) — Run another flow · Flow · `slot map` → `nothing`
- [`flow.loop`](flow.loop.md) — Start a loop · Flow · `seed` → `string`
- [`flow.loop-end`](flow.loop-end.md) — End a loop · Flow · `body outputs` → `nothing`
- [`flow.merge`](flow.merge.md) — Gather branch results · Flow · `T[]+` → `T[]`
