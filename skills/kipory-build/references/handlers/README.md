<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Handler catalog

112 customer handlers, one page each. A step in a flow is one of these plus its config. `GET /v1/handlers` lists 3 more, marked `run.platformOnly: true`: `description.brief`, `description.plan`, `description.write`. They run only inside the platform's own flows; a project flow naming one is refused at save, so they have no page here. Confirm the key against `GET /v1/handlers` on your deployment before you author a step — the catalog's `version` this was generated from is in kipory-connect/references/versions.md; if the live one differs, the live one wins.

## Groups

- **ai** (4) — Model calls: generate text, turn text into a vector, or rank a list.
- **text** (5) — Work on text without a model: split, match, fill a template, clean.
- **sources** (58) — Fetch data from outside — pages, videos, feeds, places. Can be slow and cost money.
- **files** (10) — Read what a file holds — metadata, text, transcripts — make a resized or rendered copy, or a download link.
- **search** (5) — Vectors: encode a value, store it, and find the nearest matches.
- **entities** (17) — Read and change the project's records and terms. Only these steps can change a record.
- **outbound** (1) — Reach a person outside the platform. Nothing is sent until the run's changes are saved.
- **flow** (9) — Steer the run: branch, loop, call another flow, keep state between steps.
- **utility** (3) — Reshape a value, or pick between values from earlier steps.

## ingest (72)

_Run in the async ingest worker: queued, retried, cached — the heavy, paid, IO-bound steps._

- [`audio.metadata`](audio.metadata.md) — Extract audio details · files · `file` → `AudioMetadata`
- [`audio.transcribe`](audio.transcribe.md) — Transcribe audio · files · `file` → `string`
- [`facebook.ad`](facebook.ad.md) — Fetch a Facebook ad · sources · `string` → `SocialAd`
- [`facebook.ads`](facebook.ads.md) — Fetch Facebook ads · sources · `string` → `SocialAd[]`
- [`file.read-text`](file.read-text.md) — Read a text file · files · `file` → `string`
- [`file.stats`](file.stats.md) — Extract file details · files · `file` → `FileStats`
- [`google.ad`](google.ad.md) — Fetch a Google ad · sources · `string` → `SocialAd`
- [`google.ads`](google.ads.md) — Fetch Google ads · sources · `string` → `SocialAd[]`
- [`image.decode-qr`](image.decode-qr.md) — Scan QR codes · files · `file` → `string[]`
- [`image.metadata`](image.metadata.md) — Extract image details · files · `file` → `FileMetadata`
- [`image.resize`](image.resize.md) — Resize an image · files · `file` → `file`
- [`instagram.comments`](instagram.comments.md) — Fetch an Instagram post's comments · sources · `string` → `SocialComment[]`
- [`instagram.post`](instagram.post.md) — Fetch an Instagram post · sources · `string` → `SocialPost`
- [`instagram.posts`](instagram.posts.md) — Fetch an Instagram account's posts · sources · `string` → `SocialPost[]`
- [`instagram.profile`](instagram.profile.md) — Fetch an Instagram profile · sources · `string` → `SocialProfile`
- [`instagram.transcript`](instagram.transcript.md) — Fetch an Instagram transcript · sources · `string` → `string`
- [`linkedin.ad`](linkedin.ad.md) — Fetch a LinkedIn ad · sources · `string` → `SocialAd`
- [`linkedin.ads`](linkedin.ads.md) — Fetch LinkedIn ads · sources · `string` → `SocialAd[]`
- [`linkedin.company`](linkedin.company.md) — Fetch a LinkedIn company page · sources · `string` → `SocialProfile`
- [`linkedin.post`](linkedin.post.md) — Fetch a LinkedIn post · sources · `string` → `SocialPost`
- [`linkedin.posts`](linkedin.posts.md) — Fetch a LinkedIn company's posts · sources · `string` → `SocialPost[]`
- [`linkedin.profile`](linkedin.profile.md) — Fetch a LinkedIn profile · sources · `string` → `SocialProfile`
- [`location.resolve`](location.resolve.md) — Find a place from a map point · sources · `Location` → `Place`
- [`pdf.parse`](pdf.parse.md) — Extract text from a PDF · files · `file` → `PdfDocument`
- [`pdf.screenshot`](pdf.screenshot.md) — Save a PDF page as an image · files · `file` → `file`
- [`place.details`](place.details.md) — Fetch a place · sources · `string` → `PlaceCard`
- [`place.reviews`](place.reviews.md) — Fetch place reviews · sources · `string` → `PlaceReviews`
- [`reddit.comments`](reddit.comments.md) — Fetch a Reddit post's comments · sources · `string` → `SocialComment[]`
- [`reddit.post`](reddit.post.md) — Fetch a Reddit post · sources · `string` → `SocialPost`
- [`reddit.posts`](reddit.posts.md) — Fetch a subreddit's posts · sources · `string` → `SocialPost[]`
- [`reddit.search`](reddit.search.md) — Search Reddit posts · sources · `string` → `SocialPost[]`
- [`telegram.resolve-channel`](telegram.resolve-channel.md) — Fetch a Telegram channel · sources · `string` → `TelegramChannelResolution`
- [`telegram.search-channels`](telegram.search-channels.md) — Search Telegram channels · sources · `string` → `TelegramChannelSearchResults`
- [`term.upsert`](term.upsert.md) — Save terms · entities · `1` → `nothing`
- [`text.decide`](text.decide.md) — Answer typed questions · ai · `any` → `the step's outputSchema`
- [`text.embed`](text.embed.md) — Capture text meaning · ai · `string` → `Vector`
- [`text.generate`](text.generate.md) — Generate text · ai · `any+` → `the step's outputSchema`
- [`text.rerank`](text.rerank.md) — Rank by relevance · ai · `slot map` → `RerankHit[]`
- [`threads.post`](threads.post.md) — Fetch a Threads post · sources · `string` → `SocialPost`
- [`threads.posts`](threads.posts.md) — Fetch a Threads account's posts · sources · `string` → `SocialPost[]`
- [`threads.profile`](threads.profile.md) — Fetch a Threads profile · sources · `string` → `SocialProfile`
- [`threads.search`](threads.search.md) — Search Threads posts · sources · `string` → `SocialPost[]`
- [`tiktok.ad`](tiktok.ad.md) — Fetch a TikTok ad · sources · `string` → `SocialAd`
- [`tiktok.ads`](tiktok.ads.md) — Fetch TikTok ads · sources · `string` → `SocialAd[]`
- [`tiktok.audience`](tiktok.audience.md) — Fetch a TikTok account's audience · sources · `string` → `SocialAudience`
- [`tiktok.comments`](tiktok.comments.md) — Fetch a TikTok video's comments · sources · `string` → `SocialComment[]`
- [`tiktok.followers`](tiktok.followers.md) — Fetch a TikTok account's followers · sources · `string` → `SocialProfile[]`
- [`tiktok.following`](tiktok.following.md) — Fetch who a TikTok account follows · sources · `string` → `SocialProfile[]`
- [`tiktok.post`](tiktok.post.md) — Fetch a TikTok video · sources · `string` → `SocialPost`
- [`tiktok.posts`](tiktok.posts.md) — Fetch a TikTok account's videos · sources · `string` → `SocialPost[]`
- [`tiktok.profile`](tiktok.profile.md) — Fetch a TikTok profile · sources · `string` → `SocialProfile`
- [`tiktok.search`](tiktok.search.md) — Search TikTok videos · sources · `string` → `SocialPost[]`
- [`tiktok.transcript`](tiktok.transcript.md) — Fetch a TikTok transcript · sources · `string` → `string`
- [`url.fetch`](url.fetch.md) — Fetch text from a web address · sources · `string` → `string`
- [`url.fetch-as-file`](url.fetch-as-file.md) — Fetch a web address as a file · sources · `string` → `file`
- [`url.metadata`](url.metadata.md) — Fetch a page's title and preview · sources · `string` → `UrlMeta`
- [`url.scrape`](url.scrape.md) — Fetch a web page · sources · `string` → `ScrapedPage`
- [`url.screenshot`](url.screenshot.md) — Take a page screenshot · sources · `string` → `file`
- [`vector.upsert`](vector.upsert.md) — Store search data · search · `any+` → `nothing`
- [`web.rankings`](web.rankings.md) — Fetch top websites · sources · `string` → `TopSiteRanking`
- [`web.search`](web.search.md) — Search the web · sources · `string` → `WebSearchResults`
- [`web.traffic`](web.traffic.md) — Fetch website traffic · sources · `string` → `SiteTrafficMetrics`
- [`x.posts`](x.posts.md) — Fetch X posts · sources · `string` → `ScrapedPage`
- [`x.profile`](x.profile.md) — Fetch an X profile · sources · `string` → `SocialProfile`
- [`x.transcript`](x.transcript.md) — Fetch an X transcript · sources · `string` → `string`
- [`youtube.channel`](youtube.channel.md) — Fetch a YouTube channel · sources · `string` → `YoutubeChannel`
- [`youtube.comments`](youtube.comments.md) — Fetch a YouTube video's comments · sources · `string` → `SocialComment[]`
- [`youtube.posts`](youtube.posts.md) — Fetch a YouTube channel's videos · sources · `string` → `SocialPost[]`
- [`youtube.search`](youtube.search.md) — Search YouTube videos · sources · `string` → `SocialPost[]`
- [`youtube.transcript`](youtube.transcript.md) — Fetch a YouTube transcript · sources · `string` → `string`
- [`youtube.trending`](youtube.trending.md) — Fetch trending YouTube channels · sources · `string` → `YoutubeTrendingChannels`
- [`youtube.video`](youtube.video.md) — Fetch a YouTube video · sources · `string` → `YoutubeVideo`

## inline (34)

_Run synchronously inside the flow engine, in order._

- [`email.send`](email.send.md) — Send an email · outbound · `recipient, subject, body` → `boolean`
- [`entity.append`](entity.append.md) — Add events to a record · entities · `record slot + event(s)` → `string`
- [`entity.count`](entity.count.md) — Count records · entities · `user id` → `number`
- [`entity.create`](entity.create.md) — Create a record · entities · `submission object` → `RecordCreate`
- [`entity.delete`](entity.delete.md) — Delete records · entities · `record id list` → `boolean`
- [`entity.enqueue-process`](entity.enqueue-process.md) — Queue for processing · entities · `record id` → `boolean`
- [`entity.link-assert`](entity.link-assert.md) — Link two records · entities · `string, string` → `RelationAssertion`
- [`entity.link-retract`](entity.link-retract.md) — Remove a link · entities · `string, string` → `RelationRetraction`
- [`entity.links`](entity.links.md) — Read a record's links · entities · `string` → `RecordLink[]`
- [`entity.list`](entity.list.md) — List records · entities · `user id + cursor` → `RecordPage`
- [`entity.query`](entity.query.md) — Query records · entities · `clause values + cursor + user slots` → `RecordQueryPage`
- [`entity.read`](entity.read.md) — Read records · entities · `any+` → `RecordRead[]`
- [`entity.teardown`](entity.teardown.md) — Clear generated data · entities · `slot map` → `object`
- [`entity.update`](entity.update.md) — Update a record · entities · `record slot + data/derived patches` → `boolean`
- [`event.emit`](event.emit.md) — Send an event · flow · `event payload` → `nothing`
- [`facet.resolve`](facet.resolve.md) — Pick terms for a record · entities · `record context` → `TermResolution[]`
- [`file.download-url`](file.download-url.md) — Create a download link · files · `file` → `string`
- [`list.concat`](list.concat.md) — Join into one list · utility · `list+` → `nothing`
- [`state.read`](state.read.md) — Recall a saved value · flow · `none` → `string`
- [`state.write`](state.write.md) — Save a value for later · flow · `any` → `string`
- [`taxonomy.aggregate`](taxonomy.aggregate.md) — Count records by term · entities · `string` → `TaxonomyAggregate`
- [`telegram.stats`](telegram.stats.md) — Read Telegram member count · sources · `string` → `TelegramChannelStats`
- [`term.threshold-gate`](term.threshold-gate.md) — Decide: match or new term · entities · `candidates + thresholds + proposal` → `GateDecision`
- [`text.chunk`](text.chunk.md) — Split text into chunks · text · `string` → `string[]`
- [`text.detect-language`](text.detect-language.md) — Detect language · text · `string` → `string`
- [`text.embed-sparse`](text.embed-sparse.md) — Capture text keywords · search · `string` → `SparseVector`
- [`text.extract`](text.extract.md) — Pull out matching text · text · `string+` → `string[]`
- [`text.interpolate`](text.interpolate.md) — Fill a template · text · `any+` → `string`
- [`text.sanitize`](text.sanitize.md) — Make text safe for a prompt · text · `any+` → `object`
- [`value.first-non-empty`](value.first-non-empty.md) — Take the first filled value · utility · `any+` → `nothing`
- [`value.transform`](value.transform.md) — Reshape values · utility · `any+` → `object`
- [`vector.fetch`](vector.fetch.md) — Read stored search data · search · `string` → `Record<string, number[]>`
- [`vector.point-id`](vector.point-id.md) — Make a search data id · search · `any` → `string`
- [`vector.search`](vector.search.md) — Search by meaning · search · `any+` → `TermHit[]`

## control (6)

_Steer the run rather than carry data: branch, fan out, merge, call a sub-flow._

- [`flow.dispatch`](flow.dispatch.md) — Pick a branch · flow · `string | file | object` → `string`
- [`flow.fan-out`](flow.fan-out.md) — Run once per item · flow · `T[]` → `T`
- [`flow.invoke`](flow.invoke.md) — Run another flow · flow · `slot map` → `nothing`
- [`flow.loop`](flow.loop.md) — Start a loop · flow · `seed` → `string`
- [`flow.loop-end`](flow.loop-end.md) — End a loop · flow · `body outputs` → `nothing`
- [`flow.merge`](flow.merge.md) — Gather branch results · flow · `T[]+` → `T[]`
