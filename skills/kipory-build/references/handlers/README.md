<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Handler catalog

68 system handlers, one page each. A step in a flow is one of these plus its config. Confirm the key against `GET /v1/handlers` on your deployment before you author a step — the catalog's `version` is in the stamp above; if the live one differs, the live one wins.

## Groups

- **AI** (3) — Nodes whose whole job is a model call — strip the model and there is no node left. What comes back is text, a vector, or a ranking.
- **Text** (5) — Working on text that is already in hand, with no model involved: splitting it, matching it, filling it into a template, and cleaning it before it reaches a prompt.
- **Sources** (17) — Where a project gets data it did not already have — pages, videos, feeds, places. These are the handlers that cross the network, so they are the ones that cost money, that can be slow, and that cache what they bring back.
- **Files** (10) — Reading what a file already contains, rather than fetching it — metadata, text, frames and transcripts — plus the few that write a derived file back.
- **Search** (5) — Vectors and the collections they live in: encoding a value, writing a point, and finding the nearest ones to it.
- **Entities** (15) — Reading and changing the records a project holds, and the terms they are filed under. Every handler that can rewrite a record is here, and each one says so.
- **Outbound** (1) — Steps that reach a person outside the platform. A message that leaves is the one thing a run cannot take back, so nothing here delivers until the run's writes have committed.
- **Flow** (9) — Steps that steer the run rather than carry data — branching, looping, calling a sub-flow — and the run state that outlives a single step.
- **Utility** (3) — Plumbing with no domain of its own: reshaping a value, or picking between values that came from somewhere else.

## ingest (30)

_Run in the async ingest worker: queued, retried, cached — the heavy, paid, IO-bound steps._

- [`audio.metadata`](audio.metadata.md) — Extract audio metadata · Files · `file` → `AudioMetadata`
- [`audio.transcribe`](audio.transcribe.md) — Transcribe audio · Files · `file` → `string`
- [`file.read-text`](file.read-text.md) — Read a text file · Files · `file` → `string`
- [`file.stats`](file.stats.md) — Extract file stats · Files · `file` → `FileStats`
- [`image.decode-qr`](image.decode-qr.md) — Decode QR codes · Files · `file` → `string[]`
- [`image.metadata`](image.metadata.md) — Extract image metadata · Files · `file` → `FileMetadata`
- [`image.resize`](image.resize.md) — Resize an image · Files · `file` → `file`
- [`location.resolve`](location.resolve.md) — Reverse-geocode coordinates · Sources · `Location` → `Place`
- [`pdf.parse`](pdf.parse.md) — Extract text from a PDF · Files · `file` → `PdfDocument`
- [`pdf.screenshot`](pdf.screenshot.md) — Render a PDF page · Files · `file` → `file`
- [`telegram.resolve-channel`](telegram.resolve-channel.md) — Resolve a Telegram channel · Sources · `string` → `TelegramChannelResolution`
- [`telegram.search-channels`](telegram.search-channels.md) — Search Telegram channels · Sources · `string` → `TelegramChannelSearchResults`
- [`term.upsert`](term.upsert.md) — Upsert terms · Entities · `1` → `nothing`
- [`text.embed`](text.embed.md) — Embed text · AI · `string` → `Vector`
- [`text.generate`](text.generate.md) — Generate text · AI · `any+` → `nothing`
- [`text.rerank`](text.rerank.md) — Re-rank documents · AI · `slot map` → `RerankHit[]`
- [`url.fetch`](url.fetch.md) — Fetch raw URL content · Sources · `string` → `string`
- [`url.fetch-as-file`](url.fetch-as-file.md) — Fetch URL as file · Sources · `string` → `file`
- [`url.metadata`](url.metadata.md) — Fetch page metadata · Sources · `string` → `UrlMeta`
- [`url.scrape`](url.scrape.md) — Scrape a web page · Sources · `string` → `ScrapedPage`
- [`url.screenshot`](url.screenshot.md) — Capture a page screenshot · Sources · `string` → `file`
- [`vector.upsert`](vector.upsert.md) — Write vectors to a collection · Search · `any+` → `nothing`
- [`web.rankings`](web.rankings.md) — Fetch top websites by country · Sources · `string` → `TopSiteRanking`
- [`web.search`](web.search.md) — Search the web · Sources · `string` → `WebSearchResults`
- [`web.traffic`](web.traffic.md) — Fetch site traffic metrics · Sources · `string` → `SiteTrafficMetrics`
- [`x.posts`](x.posts.md) — Scrape X posts · Sources · `string` → `ScrapedPage`
- [`youtube.channel`](youtube.channel.md) — Fetch a YouTube channel · Sources · `string` → `YoutubeChannel`
- [`youtube.transcript`](youtube.transcript.md) — Fetch a YouTube transcript · Sources · `string` → `string`
- [`youtube.trending`](youtube.trending.md) — Fetch trending channels · Sources · `string` → `YoutubeTrendingChannels`
- [`youtube.video`](youtube.video.md) — Fetch a YouTube video · Sources · `string` → `YoutubeVideo`

## inline (32)

_Run synchronously inside the flow engine, in order._

- [`email.send`](email.send.md) — Send an email · Outbound · `recipient, subject, body` → `boolean`
- [`entity.count`](entity.count.md) — Count records · Entities · `user id` → `number`
- [`entity.create`](entity.create.md) — Create a record · Entities · `submission object` → `RecordCreate`
- [`entity.delete`](entity.delete.md) — Delete records · Entities · `record id list` → `boolean`
- [`entity.enqueue-process`](entity.enqueue-process.md) — Enqueue record processing · Entities · `record id` → `boolean`
- [`entity.link-assert`](entity.link-assert.md) — State a link between two records · Entities · `string, string` → `RelationAssertion`
- [`entity.link-retract`](entity.link-retract.md) — Take back a stated link · Entities · `string, string` → `RelationRetraction`
- [`entity.links`](entity.links.md) — Read a record's links · Entities · `string` → `RecordLink[]`
- [`entity.list`](entity.list.md) — List records · Entities · `user id + cursor` → `RecordPage`
- [`entity.read`](entity.read.md) — Read records by ID · Entities · `any+` → `RecordRead[]`
- [`entity.teardown`](entity.teardown.md) — Tear down a record's derived state · Entities · `slot map` → `object`
- [`entity.update`](entity.update.md) — Update a record · Entities · `record slot + data/derived patches` → `boolean`
- [`event.emit`](event.emit.md) — Emit an event · Flow · `event payload` → `nothing`
- [`facet.resolve`](facet.resolve.md) — Resolve facets · Entities · `record context` → `TermResolution[]`
- [`file.download-url`](file.download-url.md) — Create a download link · Files · `file` → `string`
- [`list.concat`](list.concat.md) — Concatenate lists · Utility · `list+` → `nothing`
- [`state.read`](state.read.md) — Read run state · Flow · `none` → `string`
- [`state.write`](state.write.md) — Write run state · Flow · `any` → `string`
- [`taxonomy.aggregate`](taxonomy.aggregate.md) — Aggregate term catalog · Entities · `string` → `TaxonomyAggregate`
- [`telegram.stats`](telegram.stats.md) — Read Telegram channel stats · Sources · `string` → `TelegramChannelStats`
- [`term.threshold-gate`](term.threshold-gate.md) — Threshold-gate term resolution · Entities · `candidates + thresholds + proposal` → `GateDecision`
- [`text.chunk`](text.chunk.md) — Split text into chunks · Text · `string` → `string[]`
- [`text.detect-language`](text.detect-language.md) — Detect language · Text · `string` → `string`
- [`text.embed-sparse`](text.embed-sparse.md) — Embed text as a sparse vector · Search · `string` → `SparseVector`
- [`text.extract`](text.extract.md) — Extract text by regex · Text · `string+` → `string[]`
- [`text.interpolate`](text.interpolate.md) — Fill a template · Text · `any+` → `string`
- [`text.sanitize`](text.sanitize.md) — Sanitize text for a prompt · Text · `any+` → `object`
- [`value.first-non-empty`](value.first-non-empty.md) — Pick the first non-empty value · Utility · `any+` → `nothing`
- [`value.transform`](value.transform.md) — Transform with JSONata · Utility · `any+` → `object`
- [`vector.fetch`](vector.fetch.md) — Read stored vectors · Search · `string` → `Record<string, number[]>`
- [`vector.point-id`](vector.point-id.md) — Derive a vector point id · Search · `any` → `string`
- [`vector.search`](vector.search.md) — Search vectors · Search · `any+` → `TermHit[]`

## control (6)

_Steer the run rather than carry data: branch, fan out, merge, call a sub-flow._

- [`flow.dispatch`](flow.dispatch.md) — Dispatch by pattern · Flow · `string | file | object` → `string`
- [`flow.fan-out`](flow.fan-out.md) — Fan out over a list · Flow · `T[]` → `T`
- [`flow.invoke`](flow.invoke.md) — Invoke a sub-flow · Flow · `slot map` → `nothing`
- [`flow.loop`](flow.loop.md) — Loop (start) · Flow · `seed` → `string`
- [`flow.loop-end`](flow.loop-end.md) — Loop (end) · Flow · `body outputs` → `nothing`
- [`flow.merge`](flow.merge.md) — Merge fan-out branches · Flow · `T[]+` → `T[]`
