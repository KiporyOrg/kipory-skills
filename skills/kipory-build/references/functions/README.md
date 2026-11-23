<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Function catalog

115 customer functions, one page each, listed under the group the catalog files them in. An action in a flow is one of these plus its config. `GET /v1/functions` lists 4 more, marked `run.platformOnly: true`: `description.brief`, `description.plan`, `description.write`, `term.threshold-gate`. They run only inside the platform's own flows; a project flow naming one is refused at save, so they have no page here. Confirm the key against `GET /v1/functions` on your deployment before you author an action — the catalog's `version` this was generated from is in kipory-connect/references/versions.md; if the live one differs, the live one wins.

Each line carries the function's phase, then what an action on it spends:

- `ingest` (75) — the heavy, paid, IO-bound actions: cached, retried, and run inside the run that waits on them.
- `inline` (39) — runs synchronously inside the flow engine, in order.
- `control` (1) — steers the run rather than carrying data: branch, fan out, merge, call a sub-flow.
- vendor key — spends a vendor credential: the project's own from its secrets, or the platform's.
- model — calls an AI model.
- model (when it embeds) — calls an embedding model only on a run that has text to embed; the function's page says when.

## Ask a model (`ai`, 4)

_Model calls. Paid; the answer is cached unless told not to._

- [`text.decide`](text.decide.md) — Answer typed questions · `ingest` · vendor key · model · `any` → `the step's outputSchema`
- [`text.generate`](text.generate.md) — Generate text · `ingest` · model · `any+` → `the step's outputSchema`
- [`text.rerank`](text.rerank.md) — Rank by relevance · `ingest` · vendor key · model · `a question + documents` → `RerankHit[]`
- [`audio.transcribe`](audio.transcribe.md) — Transcribe audio · `ingest` · model · `file` → `string`

## Shape values and text (`values`, 9)

_No model and no outside call. Most value logic is an expression in any setting._

- **Reshape a value** — One expression (transform), one expression per field (build), or join lists
  - [`list.concat`](list.concat.md) — Join into one list · `inline` · `list+` → `a list of the first input's element type`
  - [`value.build`](value.build.md) — Build a value field by field · `inline` · `any+` → `object`
  - [`value.transform`](value.transform.md) — Reshape values · `inline` · `any+` → `object`
- [`text.interpolate`](text.interpolate.md) — Fill a template · `inline` · `any+` → `string`
- **Work on text** — Split, match a pattern, detect the language, make safe for a prompt, make CSV
  - [`text.chunk`](text.chunk.md) — Split text into chunks · `inline` · `string` → `string[]`
  - [`text.csv`](text.csv.md) — Make CSV text · `inline` · `list` → `CSV text`
  - [`text.detect-language`](text.detect-language.md) — Detect language · `inline` · `string` → `string`
  - [`text.match`](text.match.md) — Pull out matching text · `inline` · `string+` → `string[]`
  - [`text.sanitize`](text.sanitize.md) — Make text safe for a prompt · `inline` · `any+` → `object`

## Web and maps (`web`, 12)

_Read public pages, search the web, look up places. Can be slow and cost money._

- **Read a web page** — Raw JSON, text or a feed (fetch); a page rendered in a browser (scrape); its head (metadata); a picture; its file
  - [`url.fetch`](url.fetch.md) — Fetch text from a web address · `ingest` · `string` → `string`
  - [`url.fetch-as-file`](url.fetch-as-file.md) — Fetch a web address as a file · `ingest` · `string` → `file`
  - [`url.metadata`](url.metadata.md) — Fetch a page's title and preview · `ingest` · `string` → `UrlMeta`
  - [`url.scrape`](url.scrape.md) — Fetch a web page · `ingest` · vendor key · `string` → `ScrapedPage`
  - [`url.screenshot`](url.screenshot.md) — Take a page screenshot · `ingest` · vendor key · `string` → `file`
- [`web.search`](web.search.md) — Search the web · `ingest` · vendor key · `string` → `WebSearchResults`
- **Site rankings and traffic** — A country's top sites; a site's visits
  - [`web.rankings`](web.rankings.md) — Fetch top websites · `ingest` · vendor key · `string` → `TopSiteRanking`
  - [`web.traffic`](web.traffic.md) — Fetch website traffic · `ingest` · vendor key · `string` → `SiteTrafficMetrics`
- **Places** — Find places, a listing, its reviews; coordinates to a city
  - [`location.resolve`](location.resolve.md) — Find a place from a map point · `ingest` · `Location` → `Place`
  - [`place.details`](place.details.md) — Fetch a place · `ingest` · vendor key · `string` → `PlaceCard`
  - [`place.reviews`](place.reviews.md) — Fetch place reviews · `ingest` · vendor key · `string` → `PlaceReviews`
  - [`place.search`](place.search.md) — Search for places · `ingest` · vendor key · `string` → `PlaceCard[]`

## Social and channels (`social`, 51)

_Public accounts, posts, comments and ads on a network. Paid, cached. Pick the family, then the network._

- **Posts of an account** — Recent posts of one account, page or channel
  - [`facebook.posts`](facebook.posts.md) — Fetch a Facebook page's posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`instagram.posts`](instagram.posts.md) — Fetch an Instagram account's posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`linkedin.posts`](linkedin.posts.md) — Fetch a LinkedIn company's posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`reddit.posts`](reddit.posts.md) — Fetch a subreddit's posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`threads.posts`](threads.posts.md) — Fetch a Threads account's posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`tiktok.posts`](tiktok.posts.md) — Fetch a TikTok account's videos · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`x.posts`](x.posts.md) — Fetch X posts · `ingest` · vendor key · `string` → `XPost[]`
  - [`youtube.posts`](youtube.posts.md) — Fetch a YouTube channel's videos · `ingest` · vendor key · `string` → `SocialPost[]`
- **One post** — One post, reel or video by its link
  - [`instagram.post`](instagram.post.md) — Fetch an Instagram post · `ingest` · vendor key · `string` → `SocialPost`
  - [`linkedin.post`](linkedin.post.md) — Fetch a LinkedIn post · `ingest` · vendor key · `string` → `SocialPost`
  - [`reddit.post`](reddit.post.md) — Fetch a Reddit post · `ingest` · vendor key · `string` → `SocialPost`
  - [`threads.post`](threads.post.md) — Fetch a Threads post · `ingest` · vendor key · `string` → `SocialPost`
  - [`tiktok.post`](tiktok.post.md) — Fetch a TikTok video · `ingest` · vendor key · `string` → `SocialPost`
  - [`youtube.video`](youtube.video.md) — Fetch a YouTube video · `ingest` · vendor key · `string` → `YoutubeVideo`
- **One profile** — Account details and counts
  - [`facebook.page`](facebook.page.md) — Fetch a Facebook page · `ingest` · vendor key · `string` → `FacebookPage`
  - [`instagram.profile`](instagram.profile.md) — Fetch an Instagram profile · `ingest` · vendor key · `string` → `SocialProfile`
  - [`linkedin.company`](linkedin.company.md) — Fetch a LinkedIn company page · `ingest` · vendor key · `string` → `SocialProfile`
  - [`linkedin.profile`](linkedin.profile.md) — Fetch a LinkedIn profile · `ingest` · vendor key · `string` → `SocialProfile`
  - [`threads.profile`](threads.profile.md) — Fetch a Threads profile · `ingest` · vendor key · `string` → `SocialProfile`
  - [`tiktok.profile`](tiktok.profile.md) — Fetch a TikTok profile · `ingest` · vendor key · `string` → `SocialProfile`
  - [`x.profile`](x.profile.md) — Fetch an X profile · `ingest` · vendor key · `string` → `SocialProfile`
  - [`youtube.channel`](youtube.channel.md) — Fetch a YouTube channel · `ingest` · vendor key · `string` → `YoutubeChannel`
- **Followers and audience** — Who follows, whom it follows, where its audience is
  - [`tiktok.audience`](tiktok.audience.md) — Fetch a TikTok account's audience · `ingest` · vendor key · `string` → `SocialAudience`
  - [`tiktok.followers`](tiktok.followers.md) — Fetch a TikTok account's followers · `ingest` · vendor key · `string` → `SocialProfile[]`
  - [`tiktok.following`](tiktok.following.md) — Fetch who a TikTok account follows · `ingest` · vendor key · `string` → `SocialProfile[]`
- **Comments** — Comments on a post or video
  - [`instagram.comments`](instagram.comments.md) — Fetch an Instagram post's comments · `ingest` · vendor key · `string` → `SocialComment[]`
  - [`reddit.comments`](reddit.comments.md) — Fetch a Reddit post's comments · `ingest` · vendor key · `string` → `SocialComment[]`
  - [`tiktok.comments`](tiktok.comments.md) — Fetch a TikTok video's comments · `ingest` · vendor key · `string` → `SocialComment[]`
  - [`youtube.comments`](youtube.comments.md) — Fetch a YouTube video's comments · `ingest` · vendor key · `string` → `SocialComment[]`
- **Search a network** — Posts or accounts matching words
  - [`instagram.search`](instagram.search.md) — Search Instagram posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`instagram.search-profiles`](instagram.search-profiles.md) — Search Instagram accounts · `ingest` · vendor key · `string` → `SocialProfile[]`
  - [`reddit.search`](reddit.search.md) — Search Reddit posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`threads.search`](threads.search.md) — Search Threads posts · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`tiktok.search`](tiktok.search.md) — Search TikTok videos · `ingest` · vendor key · `string` → `SocialPost[]`
  - [`youtube.search`](youtube.search.md) — Search YouTube videos · `ingest` · vendor key · `string` → `SocialPost[]`
- **Transcripts** — Spoken words in a video
  - [`instagram.transcript`](instagram.transcript.md) — Fetch an Instagram transcript · `ingest` · vendor key · `string` → `string`
  - [`tiktok.transcript`](tiktok.transcript.md) — Fetch a TikTok transcript · `ingest` · vendor key · `string` → `string`
  - [`x.transcript`](x.transcript.md) — Fetch an X transcript · `ingest` · vendor key · `string` → `string`
  - [`youtube.transcript`](youtube.transcript.md) — Fetch a YouTube transcript · `ingest` · vendor key · `string` → `string`
- **Ad libraries** — A company's or a keyword's ads, or one ad
  - [`facebook.ad`](facebook.ad.md) — Fetch a Facebook ad · `ingest` · vendor key · `string` → `SocialAd`
  - [`facebook.ads`](facebook.ads.md) — Fetch Facebook ads · `ingest` · vendor key · `string` → `SocialAd[]`
  - [`google.ad`](google.ad.md) — Fetch a Google ad · `ingest` · vendor key · `string` → `SocialAd`
  - [`google.ads`](google.ads.md) — Fetch Google ads · `ingest` · vendor key · `string` → `SocialAd[]`
  - [`linkedin.ad`](linkedin.ad.md) — Fetch a LinkedIn ad · `ingest` · vendor key · `string` → `SocialAd`
  - [`linkedin.ads`](linkedin.ads.md) — Fetch LinkedIn ads · `ingest` · vendor key · `string` → `SocialAd[]`
  - [`tiktok.ads`](tiktok.ads.md) — Fetch TikTok ads · `ingest` · vendor key · `string` → `SocialAd[]`
- [`youtube.trending`](youtube.trending.md) — Fetch trending YouTube channels · `ingest` · vendor key · `string` → `YoutubeTrendingChannels`
- **Telegram channels** — Find channels, look one up, watch it or stop watching
  - [`source.unwatch`](source.unwatch.md) — Stop watching a source · `inline` · `channel and holder` → `SourceUnwatch`
  - [`source.watch`](source.watch.md) — Watch a source · `inline` · `channel and holder` → `SourceWatch`
  - [`telegram.resolve-channel`](telegram.resolve-channel.md) — Fetch a Telegram channel · `ingest` · `string` → `TelegramChannelResolution`
  - [`telegram.search-channels`](telegram.search-channels.md) — Search Telegram channels · `ingest` · vendor key · `string` → `TelegramChannelSearchResults`

## Files (`files`, 10)

_What a file holds, a new file made from it, or a link to it._

- **Read a file** — The text of a text file or a PDF; QR codes in an image
  - [`file.read-text`](file.read-text.md) — Read a text file · `ingest` · `file` → `string`
  - [`image.decode-qr`](image.decode-qr.md) — Scan QR codes · `ingest` · `file` → `string[]`
  - [`pdf.parse`](pdf.parse.md) — Extract text from a PDF · `ingest` · `file` → `PdfDocument`
- **File details** — Size, hash, dates; image size and EXIF; audio length and tags
  - [`audio.metadata`](audio.metadata.md) — Extract audio details · `ingest` · `file` → `AudioMetadata`
  - [`file.stats`](file.stats.md) — Extract file details · `ingest` · `file` → `FileStats`
  - [`image.metadata`](image.metadata.md) — Extract image details · `ingest` · `file` → `FileMetadata`
- **Make a file** — A smaller image, a PDF page as an image, a copy
  - [`file.copy`](file.copy.md) — Copy a file · `ingest` · `file` → `file`
  - [`image.resize`](image.resize.md) — Resize an image · `ingest` · `file` → `file`
  - [`pdf.screenshot`](pdf.screenshot.md) — Save a PDF page as an image · `ingest` · `file` → `file`
- [`file.download-url`](file.download-url.md) — Create a download link · `inline` · `file` → `string`

## Records (`records`, 17)

_Read and change the project's records: their fields, links and shares. Tagging one with terms is in Vocabularies._

- **Read records** — By id (read), or by fields, terms, links, meaning or a table's query (query)
  - [`record.query`](record.query.md) — Query records · `inline` · model (when it embeds) · `the values its clauses compare against` → `RecordQueryPage`
  - [`record.read`](record.read.md) — Read records · `inline` · `any+` → `RecordRead[]`
- **Count and total** — Count, sum, average, group by
  - [`record.aggregate`](record.aggregate.md) — Total records · `inline` · `the values its clauses compare against` → `RecordAggregate`
  - [`record.count`](record.count.md) — Count records · `inline` · `user id` → `number`
- **Change records** — Create, update, delete, add history events, merge a duplicate
  - [`record.append`](record.append.md) — Add events to a record · `inline` · `record id + event(s)` → `string`
  - [`record.create`](record.create.md) — Create a record · `inline` · `submission object` → `RecordCreate`
  - [`record.delete`](record.delete.md) — Delete records · `inline` · `record id list` → `boolean`
  - [`record.merge`](record.merge.md) — Merge records · `inline` · `two record ids` → `RecordMerge`
  - [`record.update`](record.update.md) — Update a record · `inline` · `record slot + data/derived patches` → `boolean`
- **Links** — Link, unlink, read links, count links
  - [`record.link-assert`](record.link-assert.md) — Link two records · `inline` · `string, string` → `RelationAssertion`
  - [`record.link-counts`](record.link-counts.md) — Count a record's links · `inline` · `record ids` → `RecordLinkCount[]`
  - [`record.link-retract`](record.link-retract.md) — Remove a link · `inline` · `string, string` → `RelationRetraction`
  - [`record.links`](record.links.md) — Read a record's links · `inline` · `string` → `RecordLink[]`
- **Sharing** — Share, list shares, stop sharing
  - [`record.grant`](record.grant.md) — Share a record · `inline` · `string, string` → `boolean`
  - [`record.revoke`](record.revoke.md) — Stop sharing a record · `inline` · `string, string` → `boolean`
  - [`record.shares`](record.shares.md) — List a record's shares · `inline` · `string` → `RecordShare[]`
- [`record.enqueue-process`](record.enqueue-process.md) — Queue for processing · `inline` · `record id` → `boolean`

## Vocabularies (`vocabularies`, 4)

_Tag records with terms and read by them._

- **Tag a record** — Pick terms for a record, then save them
  - [`term.upsert`](term.upsert.md) — Save terms · `ingest` · model (when it embeds) · `TermResolution[]` → `nothing`
  - [`vocabulary.resolve`](vocabulary.resolve.md) — Pick terms for a record · `inline` · model · `record context` → `TermResolution[]`
- [`term.search`](term.search.md) — Search terms by meaning · `inline` · model (when it embeds) · `phrase + vocabulary` → `TermHit[]`
- [`vocabulary.aggregate`](vocabulary.aggregate.md) — Count records by term · `inline` · `string` → `VocabularyAggregate`

## Run (`run`, 5)

_Call another flow, start more runs, tell the client, check the caller. Branching and loops are steps._

- [`flow.invoke`](flow.invoke.md) — Run another flow · `control` · `the values its inputs read` → `the called flow's outputs`
- **Start more runs** — The next page in a new run; one run per person
  - [`flow.continue`](flow.continue.md) — Continue with the next page · `inline` · `cursor and inputs` → `ContinueResult`
  - [`flow.start-per-person`](flow.start-per-person.md) — Start a flow for each person · `inline` · `people and inputs` → `PeopleStartResult`
- [`event.emit`](event.emit.md) — Send an event · `inline` · `event payload` → `nothing`
- [`request.verify-signature`](request.verify-signature.md) — Check a call's signature · `inline` · `signed text` → `boolean`

## Send (`send`, 3)

_Reach a person or a system. Nothing leaves until the run is saved._

- **Message a person** — An email or a phone notification
  - [`email.send`](email.send.md) — Send an email · `inline` · `recipient, subject, body` → `string`
  - [`push.send`](push.send.md) — Send a push notification · `inline` · `people and text` → `PushSendResult`
- [`url.send`](url.send.md) — Send a request · `inline` · `string` → `boolean`
