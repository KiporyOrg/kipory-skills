---
name: kipory-gather
description: Bring data into a Kipory project from outside it, in a flow action — fetch or scrape a web page, poll a feed, call an API with or without a stored key, send a request to an outside system (`url.send`), run a web search, read YouTube, X, TikTok and Instagram profiles, posts and comments and YouTube transcripts, search Reddit, search the Facebook and Google ad libraries, look up a place's map listing and reviews, capture a page as an image, find Telegram channels, turn coordinates into a place. Use when a flow needs something the project does not hold, when choosing which source function fits, when a source action is slow, empty, refused, rate-limited or returns an old answer (its cache), or when a vendor bill is larger than expected. Not for storing a vendor key or deciding whose key pays (kipory-secrets), not for subscribing to a Telegram channel (kipory-channels), not for opening a downloaded file (kipory-extract).
license: MIT
---

# Bring data in from outside

Every function in this skill reaches a third party, and that changes what you are designing. An action
that reads the project's own database is fast, free and always available. An action in this group is
none of those: it is queued, retried, cached, rate-limited against a **shared** bucket, and billed
by somebody who is not this platform.

**The fact most people get wrong: the rate limits are shared across functions, not per function.**
Every Apify-backed source draws on your project's one budget of 30 calls a minute, and every social-platform read
on one ScrapeCreators budget of 120. A flow that searches the web and reads X posts in the same
fan-out competes with itself, and the ceiling arrives at a number neither function's own page
mentions.

## Before the first call

- **Confirm the function's vendor and credential** with `GET /v1/functions/{key}`. The entry names
  the credential type and the purpose it resolves under, plus the bucket it shares.
- **Decide whose key pays** before you build the action, not after the first invoice — `kipory-secrets`.
- **Every one of these runs in the ingest phase**, which means a queue, retries and a cache. Inline
  and control functions have none of those. Whether an action is queued is a property of the function,
  not something you configure.
- **A service with no function of its own is reached with a keyed request.** `url.fetch` reads it and
  `url.send` writes to it, each with a stored key named in `secret`. `kipory-connect`'s
  `references/packs/limits.md` (What a flow can reach) says what such a request cannot do.

## The sources

| Function                                                        | Brings back                                                                  | Vendor         | Bucket             | Cached |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- | ------------------ | ------ |
| `url.fetch`                                                     | raw text or JSON, nothing rendered                                           | the site       | `outbound-request` | 24h    |
| `url.fetch-as-file`                                             | the bytes, saved as a file                                                   | the site       | `outbound-request` | 24h    |
| `url.metadata`                                                  | title, description, icon, social preview                                     | the site       | `url.metadata`     | 24h    |
| `url.scrape`                                                    | the rendered page as clean markdown                                          | Firecrawl      | `firecrawl`        | 24h    |
| `url.screenshot`                                                | a full-page image file                                                       | Firecrawl      | `firecrawl`        | 24h    |
| `web.search`                                                    | organic search results, ten to a page                                        | Apify          | `apify`            | 24h    |
| `web.rankings`                                                  | a country's most-visited sites, ranked                                       | Apify          | `apify`            | 30d    |
| `web.traffic`                                                   | one site's visits, ranking and audience                                      | Apify          | `apify`            | 7d     |
| `x.posts`                                                       | a tweet, profile or search URL as posts                                      | Apify ¹        | `apify` ¹          | 24h    |
| `telegram.search-channels`                                      | public channels matching search terms                                        | Apify          | `apify`            | 7d     |
| `telegram.resolve-channel`                                      | one public channel by handle: name, members, description, picture            | the platform   | none               | 6h     |
| `place.details`                                                 | one place's map listing: address, hours, rating                              | Apify          | `apify`            | 7d     |
| `place.reviews`                                                 | what people wrote about one place                                            | Apify          | `apify`            | 24h    |
| `place.search`                                                  | the places a map lists for a query, each as the card `place.details` returns | Apify          | `apify`            | 24h    |
| `youtube.video`                                                 | a video's metadata and stats                                                 | YouTube        | `youtube`          | 7d     |
| `youtube.channel`                                               | a channel's metadata and stats                                               | YouTube        | `youtube`          | 7d     |
| `youtube.trending`                                              | the channels behind a region's trending videos                               | YouTube        | `youtube`          | 6h     |
| `youtube.transcript`                                            | a video's captions as text                                                   | Supadata ²     | `supadata` ²       | 24h    |
| `youtube.posts` · `youtube.comments` · `youtube.search`         | a channel's videos, a video's comments, a video search                       | ScrapeCreators | `scrapecreators`   | 24h    |
| `x.profile`                                                     | an X account                                                                 | ScrapeCreators | `scrapecreators`   | 24h    |
| `tiktok.*` (4 <!-- count: functions-in-family-tiktok -->)       | profile, posts, comments, search                                             | ScrapeCreators | `scrapecreators`   | 24h    |
| `instagram.*` (6 <!-- count: functions-in-family-instagram -->) | profile, posts, post, comments, search, search-profiles                      | ScrapeCreators | `scrapecreators`   | 24h    |
| `reddit.search`                                                 | search posts                                                                 | ScrapeCreators | `scrapecreators`   | 24h    |
| `facebook.page`                                                 | a public Facebook page                                                       | ScrapeCreators | `scrapecreators`   | 24h    |
| `facebook.ads` · `google.ads`                                   | ads from a platform's public ad library                                      | ScrapeCreators | `scrapecreators`   | 24h    |
| `location.resolve`                                              | a place from latitude and longitude                                          | OpenStreetMap  | `location.resolve` | 7d     |

¹ `x.posts` runs on Apify by default; an action may choose twitterapi.io
(`provider: "twitterapi"`, key purpose `twitterapi`) or ScrapeCreators
(`provider: "scrapecreators"`), which reads a post or a profile but not a search —
and its profile read is about a hundred of the account's most popular posts, not
its latest. With `fallback` on — the default — a failed vendor hands the URL to
the next, and each post's `provider` says which one answered. A key the
chosen vendor refuses fails the action instead. A fallback is billed by the vendor
that answered: with your own key for one vendor only, a failure there spends the
platform's key for the next. Store a key for each vendor, or set `fallback: false`.

² `youtube.transcript` runs on Supadata by default; an action may choose
ScrapeCreators (`provider: "scrapecreators"`). With `fallback` on — the default —
a vendor that fails hands the video to the other; a key the chosen vendor refuses
fails the action instead. A video with no captions is an
answer, and is not retried on the second vendor. The fallback is billed as in ¹:
your own Supadata key does not stop the platform's ScrapeCreators key being spent
unless you store both or set `fallback: false`.

The social-platform reads return shared types — `SocialProfile`, `SocialPost`,
`SocialComment`, `SocialAd`, `SocialAudience` — whichever platform they read, so
a flow built for one platform is re-pointed at another by changing the action's
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
tightest budget here by a wide margin, and both are the slow kind of action: they render a page in a
real browser.

## Choosing between the four ways to read a page

- **`url.fetch`** when the URL returns data — an API, a JSON or RSS feed, a text file. It renders nothing
  and re-encodes nothing. No vendor. A plain GET needs no config; an API that needs more takes
  `query`, `headers`, a POST `body` and a stored key named in `secret` (the `kipory-secrets`
  skill says how to store one). Set `responseAs` to `json` to address an object's fields, or to `json-list` for an API that returns
  a list of objects, which a fan-out can then walk. It is a
  read: it may be sent several times and is cached, so a POST here must change nothing.
  <!-- field-ok: body — a `url.fetch` config field, listed on the function's reference page -->
- **`url.metadata`** when you only need the head: title, description, icon. It reads the page's head
  over plain HTTP with no JS render, so it is cheap and it is wrong about pages that build their
  own title in the browser. It is also the liveness check: a site that cannot be reached does not
  fail the action. The output carries `failure.code` instead of `httpStatus`, one of
  `dns-not-found` (the name has no address), `connection-refused` (the host answered that nothing
  listens there), `tls-failed` (the certificate or handshake was refused), `redirect-limit` (more
  redirects than `maxRedirects`, or one that names no target), `timeout` (no answer within
  `timeoutMs`), `connection-reset` (the connection was dropped mid-request) and `unreachable`
  (anything else). Wire `failure.code` to store why; an action wired to `httpStatus` is skipped when
  the site never answered. To stop a flow on a dead site, put a condition on `failure`: the action
  itself no longer fails. An HTTP error such as 404 is an answer: it has `httpStatus` and no
  `failure`. A live page often reads `206`, not `200`, because the function asks for the head of the
  page only: test for a status below 400, or for `failure` being absent, never for `200`. A
  `flow.dispatch` that matches on `contentType` sends a dead site to its `default` branch, since
  the field is absent: branch on `failure` first. Only a missing name and a redirect dead end are
  remembered for the cache period; every other failure is read afresh next time.
- **`url.scrape`** when you need the readable body of a modern page. It renders JavaScript, which is
  why it costs a vendor call and sits in the tightest bucket.
- **`url.fetch-as-file`** when you want the bytes rather than the text — a PDF, an image, an
  archive. It stores them and emits a file reference for `kipory-extract` to open.

`url.send` is not a fifth way to read: it writes to an outside system, and has its own section
below.

**A page read that must not come back empty** runs `url.scrape` and `url.fetch` side by side off
the same `url` slot and keeps whichever filled, with `value.first-non-empty`. Three things make it
work, and `references/sources.md` (Scrape with a plain-fetch fallback) has the actions, the
tag-stripping expression and the no-vendor variant:

- coalesce text with text — `page.content` against the stripped fetch, never the bare objects;
- set `"onFailure": "continue"` on the `fetch` action, because `url.fetch` fails the action on a 4xx
  or an unresolvable address and one failed action fails the run; its `failureSlot` then says which,
  with `httpStatus` — 403 is a site refusing the fetch, 404 a page that is not there;
- guard every action that reads the body beside another slot with a `slotPresent` condition, model
  actions included — an action runs while any one input is present.

`url.fetch`, `url.fetch-as-file` and `url.metadata` go through an SSRF guard: they reach the open
web, not the deployment's own network. On `url.fetch` a host name that does not resolve is refused
by the same guard, so a typo in a URL reaches the caller as `400 BAD_REQUEST` "The flow attempted a
blocked network request.", not as a network error. `url.metadata` reports it as a value
(`failure.code: "dns-not-found"`), and `url.fetch-as-file` softens it when its `failureMode` is
`soft`. A private address is refused by all three, always.

## Telling an outside system something: `url.send`

`url.send` is not a read. It sends a POST, PUT, PATCH or DELETE to an outside system; never reach
for `url.fetch` to do that, because a read is cached and may be sent several times.

- **Staged once per run, delivered after the run has saved everything else.** A run that fails
  sends nothing, and the flow never sees the answer.
- **The receiver may see a request twice.** A transient failure — no answer, a 5xx, a 429 — is
  retried for about ten minutes, every attempt with the same `Idempotency-Key` header. A 3xx or
  4xx is final: a redirect is not followed. A new run of the same input stages a new request;
  name an `idempotencyKey` so the receiving system can recognise that repeat too.
  <!-- field-ok: idempotencyKey — a `url.send` config field, listed on the function's reference page -->
- **In a preview or an eval run the action checks and does not send.** It answers `true` with a
  `PREVIEWED_NOT_SENT` warning naming the method and host, and the rest of the flow runs. A secret
  that is not stored fails it as `api-key-missing`, and an address outside the secret's hosts fails
  it as the delivery would. Prove the delivery with one live run.
- **Nothing reports the delivery.** The action's `true` means staged. No run read, timeline or
  spend read says whether the request left or what it was answered: a wrong host, a private
  address, a credential that does not list the host, a credential removed since and a 4xx all
  look like success in the run. Confirm on the receiving system, with one live run, before
  relying on it.
- **With a `secret`, the address must be `https` on the default port**, or the action fails before
  anything is staged (`kipory-secrets` has the credential's own rules).

`url.fetch`, `url.fetch-as-file` and `url.send` share one budget, `outbound-request`: 60 requests a
minute **per project and per host**. Two projects never share it, and two hosts are two budgets. A
read in a fan-out wider than that over one host is delayed, but only up to the function's wait
ceiling — a minute for `url.fetch`, a minute and a half for `url.fetch-as-file`; a call still
waiting then fails its action, so bound the fan-out or set `maxParallelBranches`. A `url.send`
delivery over the budget is put back and sent later. The service's own limit is its 429, which a
read waits out once when the wait is short.

## What will bite you

Each of these is a trap with its explanation and remedy in [references/pitfalls.md](references/pitfalls.md). Read the entry before you build on the thing it names:

- Working around a problem in silence.
- A vendor failure about the page is a warning, and the flow keeps going; a refused key fails the action.
- A refused key or an account out of credit is not about the page, and it fails the action
- The cache is the design, not an optimisation.
- "Nothing found" is saved like any answer.
- "This source must answer" is a rule you put on the actions after it.
- Polling a source needs the action's own period.
- A listing is paid for on every poll, new items or not.
- A read billed in the vendor's own credits states how many a request takes.
- `x.posts` on its default vendor charges a flat fee per call, large beside a small profile.
- A screenshot is the full page, and a long page is a very large image.
- There is no feed reader, and no upsert.
- A vendor bills you even though the platform queued the call.
- Falling through to the platform's key is silent and it succeeds.
- A site that answers 403 to Kipory may answer a browser.
- An action that stops waiting does not stop the vendor.
- `web.search` charges by the page of results, and a page holds about ten.
- `web.search` takes only a language and a country its search engine knows.
- An empty result and a failure are not the same thing, and they differ per function.
- Every field on a scraped or looked-up object is optional.
- Fetched text is untrusted input.
- A fan-out multiplies the vendor call, not just the action.
- Retries are already configured and they are not free.

## References

| File                     | What it answers                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `references/sources.md`  | a source per question, the shared budgets, the scrape-with-fallback and feed recipes, what a source costs |
| `references/pitfalls.md` | each trap of bringing data in, with what happens and what to do                                           |

Per-function config tables live with the function catalog in `kipory-build`.

## Then

`kipory-extract` when what came back is a file rather than text — a PDF, an image, audio.
`kipory-retrieve` to index the text you gathered so the product can search it, and to sanitize it
before any model reads it. `kipory-secrets` to put the project's own vendor key in place.
`kipory-build` for the flow, the fan-out and the caching behaviour these actions sit inside.
`kipory-channels` when the source is a Telegram channel you want to subscribe to rather than search
once. `kipory-operate` for what a month of these actually cost.
