---
name: kipory-gather
description: Bring data into a Kipory project from outside it, in a flow step — fetch or scrape a web page, poll a feed, call an API with or without a stored key, send a request to an outside system (`url.send`), run a web search, read social profiles, posts, comments and video transcripts (YouTube, X, TikTok, Instagram, LinkedIn, Threads, Reddit), search Reddit, Threads and four ad libraries, look up a place's map listing and reviews, capture a page as an image, find Telegram channels, turn coordinates into a place. Use when a flow needs something the project does not hold, when choosing which source function fits, when a source step is slow, empty, refused, rate-limited or returns an old answer (its cache), or when a vendor bill is larger than expected. Not for storing a vendor key or deciding whose key pays (kipory-secrets), not for subscribing to a Telegram channel (kipory-channels), not for opening a downloaded file (kipory-extract).
license: MIT
---

# Bring data in from outside

Every function in this skill reaches a third party, and that changes what you are designing. A step
that reads the project's own database is fast, free and always available. A step in this group is
none of those: it is queued, retried, cached, rate-limited against a **shared** bucket, and billed
by somebody who is not this platform.

**The fact most people get wrong: the rate limits are shared across functions, not per function.**
Every Apify-backed source draws on your project's one budget of 30 calls a minute, and every social-platform read
on one ScrapeCreators budget of 120. A flow that searches the web and reads X posts in the same
`each` competes with itself, and the ceiling arrives at a number neither function's own page
mentions.

## Before the first call

- **Confirm the function's vendor and credential** with `GET /v1/functions/{key}`. The entry names
  the credential type and the purpose it resolves under, plus the bucket it shares.
- **Decide whose key pays** before you build the step, not after the first invoice — `kipory-secrets`.
- **Every one of these runs in the ingest phase**, which means a queue, retries and a cache. Inline
  and control functions have none of those. Whether a step is queued is a property of the function,
  not something you configure.
- **A service with no function of its own is reached with a keyed request.** `url.fetch` reads it and
  `url.send` writes to it, each with a stored key named in `secret`. An OpenAPI one, or an MCP
  server's link, can be connected instead: `references/connections.md`. `kipory-connect`'s
  `references/packs/limits.md` (What a flow can reach) says what such a request cannot do.

## The sources

| Function                                                        | Brings back                                                                             | Vendor         | Bucket             | Cached |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------- | ------------------ | ------ |
| `url.fetch`                                                     | raw text or JSON, nothing rendered                                                      | the site       | `outbound-request` | 24h    |
| `url.fetch-as-file`                                             | the bytes, saved as a file                                                              | the site       | `outbound-request` | 24h    |
| `url.metadata`                                                  | title, description, icon, social preview                                                | the site       | `url.metadata`     | 24h    |
| `url.scrape`                                                    | the rendered page as clean markdown                                                     | Firecrawl      | `firecrawl`        | 24h    |
| `url.screenshot`                                                | a full-page image file                                                                  | Firecrawl      | `firecrawl`        | 24h    |
| `web.search`                                                    | organic search results, ten to a page                                                   | Apify          | `apify`            | 24h    |
| `web.rankings`                                                  | a country's most-visited sites, ranked                                                  | Apify          | `apify`            | 30d    |
| `web.traffic`                                                   | one site's visits, ranking and audience                                                 | Apify          | `apify`            | 7d     |
| `x.posts`                                                       | a tweet, profile or search URL as posts                                                 | several ¹      | each vendor's ¹    | 24h    |
| `telegram.search-channels`                                      | public channels matching search terms                                                   | Apify          | `apify`            | 7d     |
| `telegram.resolve-channel`                                      | one public channel by handle: name, members, description, picture                       | the platform   | none               | 6h     |
| `place.details`                                                 | one place's map listing: address, hours, rating                                         | Apify          | `apify`            | 7d     |
| `place.reviews`                                                 | what people wrote about one place                                                       | Apify          | `apify`            | 24h    |
| `place.search`                                                  | the places a map lists for a query, each as the card `place.details` returns            | Apify          | `apify`            | 24h    |
| `youtube.video`                                                 | a video's metadata and stats                                                            | YouTube        | `youtube`          | 7d     |
| `youtube.channel`                                               | a channel's metadata and stats                                                          | YouTube        | `youtube`          | 7d     |
| `youtube.trending`                                              | the channels behind a region's trending videos                                          | YouTube        | `youtube`          | 6h     |
| `youtube.transcript`                                            | a video's captions as text                                                              | Supadata ²     | `supadata` ²       | 24h    |
| `youtube.posts` · `youtube.comments` · `youtube.search`         | a channel's videos, a video's comments, a video search                                  | ScrapeCreators | `scrapecreators`   | 24h    |
| `x.profile` · `x.transcript`                                    | an X account; a video post's transcript                                                 | ScrapeCreators | `scrapecreators`   | 24h    |
| `tiktok.*` (10 <!-- count: functions-in-family-tiktok -->)      | profile, posts, post, comments, search, followers, following, audience, transcript, ads | ScrapeCreators | `scrapecreators`   | 24h    |
| `instagram.*` (7 <!-- count: functions-in-family-instagram -->) | profile, posts, post, comments, search, search-profiles, transcript                     | ScrapeCreators | `scrapecreators`   | 24h    |
| `linkedin.*` (6 <!-- count: functions-in-family-linkedin -->)   | profile, company, posts, post, ad, ads                                                  | ScrapeCreators | `scrapecreators`   | 24h    |
| `reddit.*` (4 <!-- count: functions-in-family-reddit -->)       | a subreddit's posts, one post, comments, search                                         | ScrapeCreators | `scrapecreators`   | 24h    |
| `threads.*` (4 <!-- count: functions-in-family-threads -->)     | profile, posts, post, search                                                            | ScrapeCreators | `scrapecreators`   | 24h    |
| `facebook.page` · `facebook.posts`                              | a public Facebook page; its recent posts                                                | ScrapeCreators | `scrapecreators`   | 24h    |
| `facebook.ad(s)` · `google.ad(s)`                               | ads from a platform's public ad library; one ad                                         | ScrapeCreators | `scrapecreators`   | 24h    |
| `location.resolve`                                              | a place from latitude and longitude                                                     | OpenStreetMap  | `location.resolve` | 7d     |

¹ `x.posts` is served by more than one vendor, and which ones, in what order and
reading what, change without a release: `servedBy` on `GET /v1/functions/{key}` (key
`x.posts`) lists the vendors serving it in this deployment, in the platform's order, and
what each keeps of a step's settings (`keeps`, `why`). Read it before you choose. A
step may name one in its `vendor.use`; a vendor that cannot keep the step's settings
(a search it does not run, an order it does not read) is refused at save with
`VENDOR_DOES_NOT_COVER`. `vendor.switch` says when the step may
move to the next vendor: `never` (the default) — the chosen vendor's answer is the
step's; `when-kipory-account-fails` — only when every one of Kipory's accounts at
that vendor failed (out of credit, key refused); `when-vendor-fails` — also when the
vendor itself fails. Nothing moves on an answer about the thing asked for (a post
not found). Each post's `provider` says which vendor answered. A key of your own
the chosen vendor refuses fails the step. A switched step is billed by the
vendor that answered: with your own key for one vendor only, a switch spends
Kipory's key at the next. Store a key for each vendor you allow, or leave
`vendor.switch` at `never`.

² `youtube.transcript` runs on Supadata unless a step names ScrapeCreators
(`vendor.use: "scrapecreators"`). With `vendor.switch` other than `never`, a vendor
that fails hands the video to the other; a key of your own the chosen vendor
refuses fails the step instead. A video with no captions is an answer, and is
not retried on the second vendor. A switch is billed as in ¹.

The social-platform reads return shared types — `SocialProfile`, `SocialPost`,
`SocialComment`, `SocialAd`, `SocialAudience` — whichever platform they read, so
a flow built for one platform is re-pointed at another by changing the step's
function. `x.posts`, `youtube.video`, `youtube.channel` and `facebook.page` return those
types with typed fields of their own added (`XPost`, `YoutubeVideo`, `YoutubeChannel`,
`FacebookPage`): a
path over a shared field carries across platforms, a path over an added one does
not. The transcript reads return text. Every list read takes a `maxItems`
bound; on a read that pages, each page is one paid request.

A time on a shared type — `postedAt` on a post or a comment, `createdAt` on a
profile, `startedAt` and `endedAt` on an ad — is an ISO 8601 time in UTC, like
`2026-03-13T08:00:00.000Z`, whichever platform it came from. It is absent when the platform gave no time that can be read as one;
on YouTube's list reads it is approximate, worked out from "2 years ago". The
text of an X post arrives as plain text (`->`, `&`), with no `&gt;` or `&amp;`
to undo.

Each budget is counted per project. The Apify functions share `apify` at 30 a minute. Three <!-- count: functions-in-bucket-youtube --> share `youtube` at 60 a minute **and a single
daily quota measured in units, not calls** — a heavy day of channel reads can exhaust what a later
video read needed. `url.scrape` and `url.screenshot` share `firecrawl` at **10 a minute**, the
tightest budget here by a wide margin, and both are the slow kind of step: they render a page in a
real browser.

## Choosing between the four ways to read a page

**Choosing between the four ways to read a page** — `url.fetch`, `url.metadata`, `url.scrape` or `url.fetch-as-file`, a page read that must not come back empty, and the SSRF guard: `references/reading-a-page.md`.

## Telling an outside system something: `url.send`

**Telling an outside system something: `url.send`** — a write, not a read: staged once per run, possibly seen twice, unreported, on the `outbound-request` budget. No flow branches on its answer: the system calls back an endpoint settling a keyed attempt: `references/url-send.md`.

## What will bite you

Each of these is a trap with its explanation and remedy in [references/pitfalls.md](references/pitfalls.md). Read the entry before you build on the thing it names:

- Working around a problem in silence.
- A vendor failure about the page is a warning, and the flow keeps going; a refused key fails the step.
- A refused key or an account out of credit is not about the page, and it fails the step
- The cache is the design, not an optimisation.
- "Nothing found" is saved like any answer.
- "This source must answer" is a rule you put on the steps after it.
- Polling a source needs the step's own period.
- A listing is paid for on every poll, new items or not.
- A read billed in the vendor's own credits states how many a request takes.
- The vendors serving `x.posts` bill differently: compare them for your poll size.
- A screenshot is the full page, and a long page is a very large image.
- To carry on past a screenshot that fails, set `failureMode: "soft"` or wrap it in `try`.
- There is no feed reader, and no upsert.
- A vendor bills you even though the platform queued the call.
- Falling through to the platform's key is silent and it succeeds.
- A site that answers 403 to Kipory may answer a browser.
- A step that stops waiting does not stop the vendor.
- `web.search` charges by the page of results, and a page holds about ten.
- `web.search` takes only a language and a country its search engine knows.
- An empty result and a failure are not the same thing, and they differ per function.
- Every field on a scraped or looked-up object is optional.
- Fetched text is untrusted input.
- An `each` multiplies the vendor call, not just the step.
- Retries are already configured and they are not free.

## References

| File                           | What it answers                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `references/sources.md`        | a source per question, the shared budgets, what a source costs                          |
| `references/reading-a-page.md` | the four ways to read a page, a page read that must not come back empty, the SSRF guard |
| `references/recipes.md`        | the scrape-with-fallback and feed recipes                                               |
| `references/url-send.md`       | `url.send`: a write to an outside system, and the shared `outbound-request` budget      |
| `references/pitfalls.md`       | each trap of bringing data in, with what happens and what to do                         |

Per-function config tables live with the function catalog in `kipory-build`.

## Then

`kipory-extract` when what came back is a file rather than text — a PDF, an image, audio.
`kipory-retrieve` to index the text you gathered so the product can search it, and to sanitize it
before any model reads it. `kipory-secrets` to put the project's own vendor key in place.
`kipory-build` for the flow, the `each` blocks and the caching behaviour these steps sit inside.
`kipory-channels` when the source is a Telegram channel you want to subscribe to rather than search
once. `kipory-operate` for what a month of these actually cost.
