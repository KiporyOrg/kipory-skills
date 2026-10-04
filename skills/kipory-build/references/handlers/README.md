<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Handler catalog

113 customer handlers, one page each, listed under the group the catalog files them in. A step in a flow is one of these plus its config. `GET /v1/handlers` lists 3 more, marked `run.platformOnly: true`: `description.brief`, `description.plan`, `description.write`. They run only inside the platform's own flows; a project flow naming one is refused at save, so they have no page here. Confirm the key against `GET /v1/handlers` on your deployment before you author a step — the catalog's `version` this was generated from is in kipory-connect/references/versions.md; if the live one differs, the live one wins.

Each line carries the handler's phase, then what a step on it spends:

- `ingest` (72) — runs in the async ingest worker: queued, retried, cached — the heavy, paid, IO-bound steps.
- `inline` (35) — runs synchronously inside the flow engine, in order.
- `control` (6) — steers the run rather than carrying data: branch, fan out, merge, call a sub-flow.
- vendor key — spends a vendor credential: the project's own from its secrets, or the platform's.
- model — calls an AI model.
- model (when it embeds) — calls an embedding model only on a run that has text to embed; the handler's page says when.

## ai (4)

_Model calls: answer typed questions (the cheapest), generate text, turn text into a vector, or rank a list._

- [`text.decide`](text.decide.md) — Answer typed questions · `ingest` · vendor key · model · `any` → `the step's outputSchema`
- [`text.embed`](text.embed.md) — Capture text meaning · `ingest` · model · `string` → `Vector`
- [`text.generate`](text.generate.md) — Generate text · `ingest` · model · `any+` → `the step's outputSchema`
- [`text.rerank`](text.rerank.md) — Rank by relevance · `ingest` · vendor key · model · `a question + documents` → `RerankHit[]`

## text (5)

_Work on text without a model: split, match, fill a template, clean._

- [`text.chunk`](text.chunk.md) — Split text into chunks · `inline` · `string` → `string[]`
- [`text.detect-language`](text.detect-language.md) — Detect language · `inline` · `string` → `string`
- [`text.extract`](text.extract.md) — Pull out matching text · `inline` · `string+` → `string[]`
- [`text.interpolate`](text.interpolate.md) — Fill a template · `inline` · `any+` → `string`
- [`text.sanitize`](text.sanitize.md) — Make text safe for a prompt · `inline` · `any+` → `object`

## sources (58)

_Fetch data from outside — pages, videos, feeds, places. Can be slow and cost money._

### facebook

- [`facebook.ad`](facebook.ad.md) — Fetch a Facebook ad · `ingest` · vendor key · `string` → `SocialAd`
- [`facebook.ads`](facebook.ads.md) — Fetch Facebook ads · `ingest` · vendor key · `string` → `SocialAd[]`

### google

- [`google.ad`](google.ad.md) — Fetch a Google ad · `ingest` · vendor key · `string` → `SocialAd`
- [`google.ads`](google.ads.md) — Fetch Google ads · `ingest` · vendor key · `string` → `SocialAd[]`

### instagram

- [`instagram.comments`](instagram.comments.md) — Fetch an Instagram post's comments · `ingest` · vendor key · `string` → `SocialComment[]`
- [`instagram.post`](instagram.post.md) — Fetch an Instagram post · `ingest` · vendor key · `string` → `SocialPost`
- [`instagram.posts`](instagram.posts.md) — Fetch an Instagram account's posts · `ingest` · vendor key · `string` → `SocialPost[]`
- [`instagram.profile`](instagram.profile.md) — Fetch an Instagram profile · `ingest` · vendor key · `string` → `SocialProfile`
- [`instagram.transcript`](instagram.transcript.md) — Fetch an Instagram transcript · `ingest` · vendor key · `string` → `string`

### linkedin

- [`linkedin.ad`](linkedin.ad.md) — Fetch a LinkedIn ad · `ingest` · vendor key · `string` → `SocialAd`
- [`linkedin.ads`](linkedin.ads.md) — Fetch LinkedIn ads · `ingest` · vendor key · `string` → `SocialAd[]`
- [`linkedin.company`](linkedin.company.md) — Fetch a LinkedIn company page · `ingest` · vendor key · `string` → `SocialProfile`
- [`linkedin.post`](linkedin.post.md) — Fetch a LinkedIn post · `ingest` · vendor key · `string` → `SocialPost`
- [`linkedin.posts`](linkedin.posts.md) — Fetch a LinkedIn company's posts · `ingest` · vendor key · `string` → `SocialPost[]`
- [`linkedin.profile`](linkedin.profile.md) — Fetch a LinkedIn profile · `ingest` · vendor key · `string` → `SocialProfile`

### location

- [`location.resolve`](location.resolve.md) — Find a place from a map point · `ingest` · `Location` → `Place`

### place

- [`place.details`](place.details.md) — Fetch a place · `ingest` · vendor key · `string` → `PlaceCard`
- [`place.reviews`](place.reviews.md) — Fetch place reviews · `ingest` · vendor key · `string` → `PlaceReviews`

### reddit

- [`reddit.comments`](reddit.comments.md) — Fetch a Reddit post's comments · `ingest` · vendor key · `string` → `SocialComment[]`
- [`reddit.post`](reddit.post.md) — Fetch a Reddit post · `ingest` · vendor key · `string` → `SocialPost`
- [`reddit.posts`](reddit.posts.md) — Fetch a subreddit's posts · `ingest` · vendor key · `string` → `SocialPost[]`
- [`reddit.search`](reddit.search.md) — Search Reddit posts · `ingest` · vendor key · `string` → `SocialPost[]`

### telegram

- [`telegram.resolve-channel`](telegram.resolve-channel.md) — Fetch a Telegram channel · `ingest` · `string` → `TelegramChannelResolution`
- [`telegram.search-channels`](telegram.search-channels.md) — Search Telegram channels · `ingest` · vendor key · `string` → `TelegramChannelSearchResults`
- [`telegram.stats`](telegram.stats.md) — Read Telegram member count · `inline` · `string` → `TelegramChannelStats`

### threads

- [`threads.post`](threads.post.md) — Fetch a Threads post · `ingest` · vendor key · `string` → `SocialPost`
- [`threads.posts`](threads.posts.md) — Fetch a Threads account's posts · `ingest` · vendor key · `string` → `SocialPost[]`
- [`threads.profile`](threads.profile.md) — Fetch a Threads profile · `ingest` · vendor key · `string` → `SocialProfile`
- [`threads.search`](threads.search.md) — Search Threads posts · `ingest` · vendor key · `string` → `SocialPost[]`

### tiktok

- [`tiktok.ad`](tiktok.ad.md) — Fetch a TikTok ad · `ingest` · vendor key · `string` → `SocialAd`
- [`tiktok.ads`](tiktok.ads.md) — Fetch TikTok ads · `ingest` · vendor key · `string` → `SocialAd[]`
- [`tiktok.audience`](tiktok.audience.md) — Fetch a TikTok account's audience · `ingest` · vendor key · `string` → `SocialAudience`
- [`tiktok.comments`](tiktok.comments.md) — Fetch a TikTok video's comments · `ingest` · vendor key · `string` → `SocialComment[]`
- [`tiktok.followers`](tiktok.followers.md) — Fetch a TikTok account's followers · `ingest` · vendor key · `string` → `SocialProfile[]`
- [`tiktok.following`](tiktok.following.md) — Fetch who a TikTok account follows · `ingest` · vendor key · `string` → `SocialProfile[]`
- [`tiktok.post`](tiktok.post.md) — Fetch a TikTok video · `ingest` · vendor key · `string` → `SocialPost`
- [`tiktok.posts`](tiktok.posts.md) — Fetch a TikTok account's videos · `ingest` · vendor key · `string` → `SocialPost[]`
- [`tiktok.profile`](tiktok.profile.md) — Fetch a TikTok profile · `ingest` · vendor key · `string` → `SocialProfile`
- [`tiktok.search`](tiktok.search.md) — Search TikTok videos · `ingest` · vendor key · `string` → `SocialPost[]`
- [`tiktok.transcript`](tiktok.transcript.md) — Fetch a TikTok transcript · `ingest` · vendor key · `string` → `string`

### url

- [`url.fetch`](url.fetch.md) — Fetch text from a web address · `ingest` · `string` → `string`
- [`url.fetch-as-file`](url.fetch-as-file.md) — Fetch a web address as a file · `ingest` · `string` → `file`
- [`url.metadata`](url.metadata.md) — Fetch a page's title and preview · `ingest` · `string` → `UrlMeta`
- [`url.scrape`](url.scrape.md) — Fetch a web page · `ingest` · vendor key · `string` → `ScrapedPage`
- [`url.screenshot`](url.screenshot.md) — Take a page screenshot · `ingest` · vendor key · `string` → `file`

### web

- [`web.rankings`](web.rankings.md) — Fetch top websites · `ingest` · vendor key · `string` → `TopSiteRanking`
- [`web.search`](web.search.md) — Search the web · `ingest` · vendor key · `string` → `WebSearchResults`
- [`web.traffic`](web.traffic.md) — Fetch website traffic · `ingest` · vendor key · `string` → `SiteTrafficMetrics`

### x

- [`x.posts`](x.posts.md) — Fetch X posts · `ingest` · vendor key · `string` → `XPost[]`
- [`x.profile`](x.profile.md) — Fetch an X profile · `ingest` · vendor key · `string` → `SocialProfile`
- [`x.transcript`](x.transcript.md) — Fetch an X transcript · `ingest` · vendor key · `string` → `string`

### youtube

- [`youtube.channel`](youtube.channel.md) — Fetch a YouTube channel · `ingest` · vendor key · `string` → `YoutubeChannel`
- [`youtube.comments`](youtube.comments.md) — Fetch a YouTube video's comments · `ingest` · vendor key · `string` → `SocialComment[]`
- [`youtube.posts`](youtube.posts.md) — Fetch a YouTube channel's videos · `ingest` · vendor key · `string` → `SocialPost[]`
- [`youtube.search`](youtube.search.md) — Search YouTube videos · `ingest` · vendor key · `string` → `SocialPost[]`
- [`youtube.transcript`](youtube.transcript.md) — Fetch a YouTube transcript · `ingest` · vendor key · `string` → `string`
- [`youtube.trending`](youtube.trending.md) — Fetch trending YouTube channels · `ingest` · vendor key · `string` → `YoutubeTrendingChannels`
- [`youtube.video`](youtube.video.md) — Fetch a YouTube video · `ingest` · vendor key · `string` → `YoutubeVideo`

## files (10)

_Read what a file holds — metadata, text, transcripts — make a resized or rendered copy, or a download link._

- [`audio.metadata`](audio.metadata.md) — Extract audio details · `ingest` · `file` → `AudioMetadata`
- [`audio.transcribe`](audio.transcribe.md) — Transcribe audio · `ingest` · model · `file` → `string`
- [`file.download-url`](file.download-url.md) — Create a download link · `inline` · `file` → `string`
- [`file.read-text`](file.read-text.md) — Read a text file · `ingest` · `file` → `string`
- [`file.stats`](file.stats.md) — Extract file details · `ingest` · `file` → `FileStats`
- [`image.decode-qr`](image.decode-qr.md) — Scan QR codes · `ingest` · `file` → `string[]`
- [`image.metadata`](image.metadata.md) — Extract image details · `ingest` · `file` → `FileMetadata`
- [`image.resize`](image.resize.md) — Resize an image · `ingest` · `file` → `file`
- [`pdf.parse`](pdf.parse.md) — Extract text from a PDF · `ingest` · `file` → `PdfDocument`
- [`pdf.screenshot`](pdf.screenshot.md) — Save a PDF page as an image · `ingest` · `file` → `file`

## search (5)

_Vectors: encode a value, store it, and find the nearest matches._

- [`text.embed-sparse`](text.embed-sparse.md) — Capture text keywords · `inline` · `string` → `SparseVector`
- [`vector.fetch`](vector.fetch.md) — Read stored search data · `inline` · `string` → `Record<string, number[]>`
- [`vector.point-id`](vector.point-id.md) — Make a search data id · `inline` · `any` → `string`
- [`vector.search`](vector.search.md) — Search by meaning · `inline` · model (when it embeds) · `any+` → `a hit list, typed by hitShape`
- [`vector.upsert`](vector.upsert.md) — Store search data · `ingest` · `any+` → `nothing`

## entities (17)

_Read and change the project's records and terms. Only these steps can change a record._

- [`entity.append`](entity.append.md) — Add events to a record · `inline` · `record slot + event(s)` → `string`
- [`entity.count`](entity.count.md) — Count records · `inline` · `user id` → `number`
- [`entity.create`](entity.create.md) — Create a record · `inline` · `submission object` → `RecordCreate`
- [`entity.delete`](entity.delete.md) — Delete records · `inline` · `record id list` → `boolean`
- [`entity.enqueue-process`](entity.enqueue-process.md) — Queue for processing · `inline` · `record id` → `boolean`
- [`entity.link-assert`](entity.link-assert.md) — Link two records · `inline` · `string, string` → `RelationAssertion`
- [`entity.link-retract`](entity.link-retract.md) — Remove a link · `inline` · `string, string` → `RelationRetraction`
- [`entity.links`](entity.links.md) — Read a record's links · `inline` · `string` → `RecordLink[]`
- [`entity.list`](entity.list.md) — List records · `inline` · `user id + cursor` → `RecordPage`
- [`entity.query`](entity.query.md) — Query records · `inline` · model (when it embeds) · `the slots its clauses name` → `RecordQueryPage`
- [`entity.read`](entity.read.md) — Read records · `inline` · `any+` → `RecordRead[]`
- [`entity.teardown`](entity.teardown.md) — Clear generated data · `inline` · `record id` → `object`
- [`entity.update`](entity.update.md) — Update a record · `inline` · `record slot + data/derived patches` → `boolean`
- [`facet.resolve`](facet.resolve.md) — Pick terms for a record · `inline` · model · `record context` → `TermResolution[]`
- [`taxonomy.aggregate`](taxonomy.aggregate.md) — Count records by term · `inline` · `string` → `TaxonomyAggregate`
- [`term.threshold-gate`](term.threshold-gate.md) — Decide: match or new term · `inline` · `candidates + thresholds + proposal` → `GateDecision`
- [`term.upsert`](term.upsert.md) — Save terms · `ingest` · model (when it embeds) · `TermResolution[]` → `nothing`

## outbound (2)

_Reach a person or a system outside the platform. Nothing is sent until the run's changes are saved._

- [`email.send`](email.send.md) — Send an email · `inline` · `recipient, subject, body` → `boolean`
- [`url.send`](url.send.md) — Send a request · `inline` · `string` → `boolean`

## flow (9)

_Steer the run: branch, loop, call another flow, keep state between steps._

- [`event.emit`](event.emit.md) — Send an event · `inline` · `event payload` → `nothing`
- [`flow.dispatch`](flow.dispatch.md) — Pick a branch · `control` · `string | file | object` → `the input, unchanged`
- [`flow.fan-out`](flow.fan-out.md) — Run once per item · `control` · `T[]` → `T`
- [`flow.invoke`](flow.invoke.md) — Run another flow · `control` · `the parent slots its inputs name` → `nothing`
- [`flow.loop`](flow.loop.md) — Start a loop · `control` · `the starting values` → `string`
- [`flow.loop-end`](flow.loop-end.md) — End a loop · `control` · `the loop's own slots` → `nothing`
- [`flow.merge`](flow.merge.md) — Gather branch results · `control` · `T[]+` → `T[]`
- [`state.read`](state.read.md) — Recall a saved value · `inline` · `none` → `string, or string[] for an append or union cell`
- [`state.write`](state.write.md) — Save a value for later · `inline` · `any` → `string`

## utility (3)

_Reshape a value, or pick between values from earlier steps._

- [`list.concat`](list.concat.md) — Join into one list · `inline` · `list+` → `a list of the first input's element type`
- [`value.first-non-empty`](value.first-non-empty.md) — Take the first filled value · `inline` · `any+` → `the first input's type`
- [`value.transform`](value.transform.md) — Reshape values · `inline` · `any+` → `object`
