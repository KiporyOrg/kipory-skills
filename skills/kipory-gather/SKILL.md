---
name: kipory-gather
description: Bring data into a Kipory project from outside it, in a flow step — fetch or scrape a web page, poll a feed, call an API with or without a stored key, send a request to an outside system (`url.send`), run a web search, read YouTube, X, TikTok, Instagram, LinkedIn, Reddit and Threads profiles, posts, comments and transcripts, search the Facebook, Google, TikTok and LinkedIn ad libraries, look up a place's map listing and reviews, capture a page as an image, find Telegram channels, turn coordinates into a place. Use when a flow needs something the project does not hold, when choosing which source handler fits, when a source step is slow, empty, refused, rate-limited or returns an old answer (its cache), or when a vendor bill is larger than expected. Not for storing a vendor key or deciding whose key pays (kipory-secrets), not for subscribing to a Telegram channel (kipory-channels), not for opening a downloaded file (kipory-extract).
license: MIT
---

# Bring data in from outside

Every handler in this skill reaches a third party, and that changes what you are designing. A step
that reads the project's own database is fast, free and always available. A step in this group is
none of those: it is queued, retried, cached, rate-limited against a **shared** bucket, and billed
by somebody who is not this platform.

**The fact most people get wrong: the rate limits are shared across handlers, not per handler.**
Every Apify-backed source draws on one budget of 30 calls a minute, and every social-platform read
on one ScrapeCreators budget of 120. A flow that searches the web and reads X posts in the same
fan-out competes with itself, and the ceiling arrives at a number neither handler's own page
mentions.

## Before the first call

- **Confirm the handler's vendor and credential** with `GET /v1/handlers/{key}`. The entry names
  the credential type and the purpose it resolves under, plus the bucket it shares.
- **Decide whose key pays** before you build the step, not after the first invoice — `kipory-secrets`.
- **Every one of these runs in the ingest phase**, which means a queue, retries and a cache. Inline
  and control handlers have none of those. Whether a step is queued is a property of the handler,
  not something you configure.
- **A service with no handler of its own is reached with a keyed request.** `url.fetch` reads it and
  `url.send` writes to it, each with a stored key named in `secret`. `kipory-connect`'s
  `references/packs/limits.md` (What a flow can reach) says what such a request cannot do.

## The sources

| Handler                                                        | Brings back                                                                                 | Vendor         | Bucket             | Cached |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------- | ------------------ | ------ |
| `url.fetch`                                                    | raw text or JSON, nothing rendered                                                          | the site       | `outbound-request` | 24h    |
| `url.fetch-as-file`                                            | the bytes, saved as a file                                                                  | the site       | `outbound-request` | 24h    |
| `url.metadata`                                                 | title, description, icon, social preview                                                    | the site       | `url.metadata`     | 24h    |
| `url.scrape`                                                   | the rendered page as clean markdown                                                         | Firecrawl      | `firecrawl`        | 24h    |
| `url.screenshot`                                               | a full-page image file                                                                      | Firecrawl      | `firecrawl`        | 24h    |
| `web.search`                                                   | organic search results, ten to a page                                                       | Apify          | `apify`            | 24h    |
| `web.rankings`                                                 | a country's most-visited sites, ranked                                                      | Apify          | `apify`            | 30d    |
| `web.traffic`                                                  | one site's visits, ranking and audience                                                     | Apify          | `apify`            | 7d     |
| `x.posts`                                                      | a tweet, profile or search URL as posts                                                     | Apify ¹        | `apify` ¹          | 24h    |
| `telegram.search-channels`                                     | public channels matching search terms                                                       | Apify          | `apify`            | 7d     |
| `telegram.resolve-channel`                                     | one public channel by handle: name, members, description, picture                           | the platform   | none               | 6h     |
| `place.details`                                                | one place's map listing: address, hours, rating                                             | Apify          | `apify`            | 7d     |
| `place.reviews`                                                | what people wrote about one place                                                           | Apify          | `apify`            | 24h    |
| `place.search`                                                 | the places a map lists for a query, each as the card `place.details` returns                | Apify          | `apify`            | 24h    |
| `youtube.video`                                                | a video's metadata and stats                                                                | YouTube        | `youtube`          | 7d     |
| `youtube.channel`                                              | a channel's metadata and stats                                                              | YouTube        | `youtube`          | 7d     |
| `youtube.trending`                                             | the channels behind a region's trending videos                                              | YouTube        | `youtube`          | 6h     |
| `youtube.transcript`                                           | a video's captions as text                                                                  | Supadata ²     | `supadata` ²       | 24h    |
| `youtube.posts` · `youtube.comments` · `youtube.search`        | a channel's videos, a video's comments, a video search                                      | ScrapeCreators | `scrapecreators`   | 24h    |
| `x.profile` · `x.transcript`                                   | an X account; the words spoken in a video post                                              | ScrapeCreators | `scrapecreators`   | 24h    |
| `tiktok.*` (11 <!-- count: handlers-in-family-tiktok -->)      | profile, posts, post, transcript, comments, search, followers, following, audience, ads, ad | ScrapeCreators | `scrapecreators`   | 24h    |
| `instagram.*` (7 <!-- count: handlers-in-family-instagram -->) | profile, posts, post, transcript, comments, search, search-profiles                         | ScrapeCreators | `scrapecreators`   | 24h    |
| `linkedin.*` (6 <!-- count: handlers-in-family-linkedin -->)   | profile, company, posts, post, ads, ad                                                      | ScrapeCreators | `scrapecreators`   | 24h    |
| `reddit.*` (4 <!-- count: handlers-in-family-reddit -->)       | posts, post, comments, search                                                               | ScrapeCreators | `scrapecreators`   | 24h    |
| `threads.*` (4 <!-- count: handlers-in-family-threads -->)     | profile, posts, post, search                                                                | ScrapeCreators | `scrapecreators`   | 24h    |
| `facebook.page` · `facebook.posts`                             | a public Facebook page; its recent posts, three to a paid request                           | ScrapeCreators | `scrapecreators`   | 24h    |
| `facebook.ads` · `facebook.ad` · `google.ads` · `google.ad`    | ads from a platform's public ad library                                                     | ScrapeCreators | `scrapecreators`   | 24h    |
| `location.resolve`                                             | a place from latitude and longitude                                                         | OpenStreetMap  | `location.resolve` | 7d     |

¹ `x.posts` runs on Apify by default; a step may choose twitterapi.io
(`provider: "twitterapi"`, key purpose `twitterapi`) or ScrapeCreators
(`provider: "scrapecreators"`), which reads a post or a profile but not a search —
and its profile read is about a hundred of the account's most popular posts, not
its latest. With `fallback` on — the default — a failed vendor hands the URL to
the next, and each post's `provider` says which one answered. A key the
chosen vendor refuses fails the step instead. A fallback is billed by the vendor
that answered: with your own key for one vendor only, a failure there spends the
platform's key for the next. Store a key for each vendor, or set `fallback: false`.

² `youtube.transcript` runs on Supadata by default; a step may choose
ScrapeCreators (`provider: "scrapecreators"`). With `fallback` on — the default —
a vendor that fails hands the video to the other; a key the chosen vendor refuses
fails the step instead. A video with no captions is an
answer, and is not retried on the second vendor. The fallback is billed as in ¹:
your own Supadata key does not stop the platform's ScrapeCreators key being spent
unless you store both or set `fallback: false`.

The social-platform reads return shared shapes — `SocialProfile`, `SocialPost`,
`SocialComment`, `SocialAd`, `SocialAudience` — whichever platform they read, so
a flow built for one platform is re-pointed at another by changing the step's
handler. `x.posts`, `youtube.video`, `youtube.channel` and `facebook.page` return those
shapes with typed fields of their own added (`XPost`, `YoutubeVideo`, `YoutubeChannel`,
`FacebookPage`): a
path over a shared field carries across platforms, a path over an added one does
not. The transcript reads return text. Every list read takes a `maxItems`
bound; on a read that pages, each page is one paid request.

A time on a shared shape — `postedAt` on a post or a comment, `createdAt` on a
profile, `startedAt` and `endedAt` on an ad — is an ISO 8601 time in UTC, like
`2026-03-13T08:00:00.000Z`, whichever platform it came from. It is absent when the platform gave no time that can be read as one;
on YouTube's list reads it is approximate, worked out from "2 years ago". The
text of an X post arrives as plain text (`->`, `&`), with no `&gt;` or `&amp;`
to undo.

The Apify handlers share `apify` at 30 a minute. Three <!-- count: handlers-in-bucket-youtube --> share `youtube` at 60 a minute **and a single
daily quota measured in units, not calls** — a heavy day of channel reads can exhaust what a later
video read needed. `url.scrape` and `url.screenshot` share `firecrawl` at **10 a minute**, the
tightest budget here by a wide margin, and both are the slow kind of step: they render a page in a
real browser.

## Choosing between the four ways to read a page

- **`url.fetch`** when the URL returns data — an API, a JSON or RSS feed, a text file. It renders nothing
  and re-encodes nothing. No vendor. A plain GET needs no config; an API that needs more takes
  `query`, `headers`, a POST `bodySlot` and a stored key named in `secret` (the `kipory-secrets`
  skill says how to store one). Set `responseAs` to `json` to address an object's fields, or to `json-list` for an API that returns
  a list of objects, which a fan-out can then walk. It is a
  read: it may be sent several times and is cached, so a POST here must change nothing.
  <!-- field-ok: bodySlot — a `url.fetch` config field, listed on the handler's reference page -->
- **`url.metadata`** when you only need the head: title, description, icon. It reads the page's head
  over plain HTTP with no JS render, so it is cheap and it is wrong about pages that build their
  own title in the browser. It is also the liveness check: a site that cannot be reached does not
  fail the step. The output carries `failure.code` instead of `httpStatus`, one of
  `dns-not-found` (the name has no address), `connection-refused` (the host answered that nothing
  listens there), `tls-failed` (the certificate or handshake was refused), `redirect-limit` (more
  redirects than `maxRedirects`, or one that names no target), `timeout` (no answer within
  `timeoutMs`), `connection-reset` (the connection was dropped mid-request) and `unreachable`
  (anything else). Wire `failure.code` to store why; a step wired to `httpStatus` is skipped when
  the site never answered. To stop a flow on a dead site, put a condition on `failure`: the step
  itself no longer fails. An HTTP error such as 404 is an answer: it has `httpStatus` and no
  `failure`. A live page often reads `206`, not `200`, because the handler asks for the head of the
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
work, and `references/sources.md` (Scrape with a plain-fetch fallback) has the steps, the
tag-stripping expression and the no-vendor variant:

- coalesce text with text — `page.content` against the stripped fetch, never the bare objects;
- set `"onFailure": "continue"` on the `fetch` step, because `url.fetch` fails the step on a 4xx
  or an unresolvable address and one failed step fails the run;
- guard every step that reads the body beside another slot with a `slotPresent` condition, model
  steps included — a step runs while any one input is present.

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
  name an `idempotencyKeySlot` so the receiving system can recognise that repeat too.
  <!-- field-ok: idempotencyKeySlot — a `url.send` config field, listed on the handler's reference page -->
- **In a preview or an eval run the step fails rather than sending.** To preview the rest of the
  flow, guard the step with a condition over a slot the preview's inputs leave empty;
  `"onFailure": "continue"` is refused on it (`RUN_CONTINUE_NOT_ALLOWED`), as on any step that may
  write. Prove the send with one live run.
- **Nothing reports the delivery.** The step's `true` means staged. No run read, step log or
  spend read says whether the request left or what it was answered: a wrong host, a private
  address, a credential that does not list the host, a credential removed since and a 4xx all
  look like success in the run. Confirm on the receiving system, with one live run, before
  relying on it.
- **With a `secret`, the address must be `https` on the default port**, or the step fails before
  anything is staged (`kipory-secrets` has the credential's own rules).

`url.fetch`, `url.fetch-as-file` and `url.send` share one budget, `outbound-request`: 60 requests a
minute **per project and per host**. Two projects never share it, and two hosts are two budgets. A
read in a fan-out wider than that over one host is delayed, but only up to the handler's wait
ceiling — a minute for `url.fetch`, a minute and a half for `url.fetch-as-file`; a call still
waiting then fails its step, so bound the fan-out or set `maxParallelBranches`. A `url.send`
delivery over the budget is put back and sent later. The service's own limit is its 429, which a
read waits out once when the wait is short.

## What will bite you

- **A vendor failure about the page is a warning, and the flow keeps going; a refused key fails
  the step.** When the vendor cannot read what was asked for — a site error, a block, a timeout —
  `url.scrape` emits an empty page with a soft `SCRAPE_FAILED` warning (`RATE_LIMITED` for a 429,
  retried in-handler first); the run does not fail and the empty result is not cached. A step
  skips only when **every** input it reads is absent — it runs while **any one** is present — so a
  `text.generate` reading only the empty page skips, but a transform or `record.create` that also
  reads the URL still runs and can write a record with the summary missing. Read `warnings` on the
  preview, use the fallback above, and put `slotPresent` conditions on writes.
- **A refused key or an account out of credit is not about the page, and it fails the step** —
  on every fetch-from-a-vendor function (`url.scrape`, `url.screenshot`, the search, place,
  traffic and social reads). Whose key decides what you read. With a key of your own stored
  (`kipory-secrets`) the step fails `api-key-missing` (refused) or `quota-exhausted` (your
  account is empty), and it is yours to fix. With none, the call ran on the **platform's**
  account and the step fails with `detail.phase: "platform-fault"` and a message ending "This is
  a platform fault, not a fault in the flow": the deployment's operator is alerted by the same
  failure, the failed step is **not charged**, and an endpoint over the flow answers `503
PLATFORM_DEPENDENCY_UNAVAILABLE` with `Retry-After`. Nothing in the flow fixes it; to keep
  working meanwhile, store your own key under the vendor's name as purpose and the step runs on
  your account from the next call. `GET /v1/platform-status` lists every platform account as
  `ok`, `refusing` or `unknown` with `since`: read it before spending a run to find out, and
  again to see the account come back. While an account is `refusing`, a step on it fails at
  once without calling the vendor. A function with a second vendor and `fallback` on
  (`x.posts`, `youtube.transcript`) does not fail on the platform's refused key: the next
  vendor answers, at its own price, and the result carries a `PROVIDER_FALLBACK` warning whose
  message says the platform's key was refused — the step fails `platform-fault` only when
  `fallback` is off or no vendor answers. A key of your **own** that the chosen vendor refuses
  still fails the step, fallback or not; a fallback vendor that refuses is one more miss and
  the next is tried. The YouTube Data API reads
  (`youtube.video`, `youtube.channel`, `youtube.search`, `youtube.trending`) are the exception:
  their daily quota wall fails `quota-exhausted` whoever's key it was.
  A refused scrape is **not charged** — the handler bills only a
  page it got. A preview's `ingestSpend` carries two totals, `totalFirecrawlUsd` and `totalSupadataUsd` —
  what the preview was charged for those two vendors so far, read from your charges — and
  `calls[]`, which counts every ingest handler's calls, cache hits and refusals included, so a
  refused call shows there at no cost. Apify, ScrapeCreators and YouTube spend is not totalled
  there; read the run's spend (`kipory-operate`). A call that timed out waiting keeps running
  and can be charged after the preview returns, so its cost may be missing from that preview's
  totals. A fetch on your own vendor key is never charged, and a platform-paid preview reports $0.
- **The cache is the design, not an optimisation.** A repeated call inside the cache window makes
  no vendor call, pays no vendor price and returns the same answer — the step still pays its
  one-second compute minimum (`kipory-operate` has the billing detail). So a flow that re-runs is
  cheap, and a source that changed inside the window is one your flow cannot see. The windows differ by an order of magnitude across
  this table: rankings hold for a month, trending for six hours.
- **"Nothing found" is saved like any answer.** A failed
  call is never saved, but a call that finished with nothing is: `web.search`, `place.details` by
  id, the ad libraries and the social reads keep an empty answer for the handler's window, and the
  next run is handed it as a hit. `web.search` and `place.details` repeat the `NO_RESULTS` warning
  the first run had, so its `step-warned` row is there again beside `cacheHit: true`; an ad library
  or a social read returns an empty list and warns nothing, the first time or on a hit. For an ad library "none" is usually
  true. For `web.search` it is also what a blocked or broken results page looks like, and the two
  cannot be told apart — the same query can return ten results an hour later. A flow that would
  store "this business is not on the web" from one empty search sets a short
  `reuseResultsForMinutes` on that step (or `0`), and treats an empty search as "not known" rather
  than "none".
- **"This source must answer" is a rule you put on the steps after it.** A source that found
  nothing stores no slot, so a later step can act on that in two ways, and no step setting is
  needed:
  - **Keep what you have.** Put `"condition": { "op": "slotPresent", "slot": "hits" }` on the step
    that saves, so an empty answer never overwrites a better record. The run still succeeds.
  - **Fail the run.** Add a `value.transform` that reads the source's slot beside one that is
    always there, and assert: `($assert($exists(hits), "The search returned nothing."); query)` with
    `inputStreams: ["query", "hits"]`. Both names are needed — a transform reading only the empty
    slot is skipped and never asserts. The run ends `failed`, its writes are discarded, and the
    step log carries your sentence (a sync endpoint answers `422` with it).

  Neither tells "nothing exists" from "the source could not be read": to the flow both are an
  absent slot. The run's `step-warned` row does tell them apart, by kind (`NO_RESULTS` against a
  failure kind such as `SEARCH_FAILED`), and that row is read by a person, not by a step.

- **Polling a source needs the step's own period.** The windows in the table are each handler's
  default, not a fixed property: a step sets `reuseResultsForMinutes` — `0` runs fresh every time
  and saves nothing, a number is the step's own window. A flow that polls a feed, a channel or a
  profile for what is new sets it on the fetch step, or it reads yesterday's answer for a day.
  `kipory-build`'s `references/packs/flows-and-skills.md` (How a step runs) has the rule for steps
  that share one fetch.
- **A listing is paid for on every poll, new items or not.** A profile, channel or search read
  that reaches the vendor is charged in full when it returns the same items as last time, so on a
  quiet source the listing is the whole cost of the poll, and the polling period decides the bill
  far more than the work done per new item. Poll no more often than the source changes, keep
  `maxItems` at what one period can produce, and store each source's own period as data rather
  than polling every source on one schedule. Price one poll before choosing the period: the
  handler's page names the operations it is charged under (**Charged as**) and
  `GET /v1/nodes/{nodeId}/vendor-prices` gives each one's credits, included units and floor
  (`kipory-operate`'s `references/spend.md` reads the row). Then confirm it on one run's spend.
- **A read billed in the vendor's own credits states how many a request takes.** Most take one;
  a few reads, and a few options on others, take many times that, and a list pays the
  per-request figure once per page it reads. The handler's **Charged as** line gives the count, the option that raises it and
  the most requests a step makes, and `GET /v1/handlers/{key}` carries the same as
  `charges.vendorCredits`. Multiply by the `scrapecreators/credit` row of
  `GET /v1/nodes/{nodeId}/vendor-prices` for the most one step can be charged.
- **`x.posts` on its default vendor charges a flat fee per call, large beside a small profile.**
  The default vendor bills each call a fixed amount that already covers a few dozen posts, then
  each post beyond them. `provider: "twitterapi"` bills per post returned plus a small account
  lookup, so for a profile read of a few posts it costs far less. The figures are the
  deployment's: read them from `GET /v1/nodes/{nodeId}/vendor-prices` and compare the vendors for
  the number of posts one poll returns. Set `provider` on the step, and
  `fallback: false` if a failure there should not be answered — and billed — by the default
  vendor (footnote ¹).
- **A screenshot is the full page, and a long page is a very large image.** `url.screenshot`
  always captures the whole page at the width you set; it has no height limit. A vision step
  reading it (`text.generate` with the file attached) is slower and dearer the larger the image,
  and a long page can run the model call into its time limit. Make the capture smaller — a
  narrower `viewportWidth`, `format: "jpeg"` with a lower `jpegQuality` — give the model step
  `"timeoutMs": 120000` (the most a step takes) and `"tries": 2`, and screenshot only the pages
  whose look is the question. `maxBytes` does not trim: a capture over it fails the step. Outside a
  record's processing flow the image is a working file, removed when the run ends
  (`kipory-extract`, "What will bite you").
- **There is no feed reader, and no upsert.** An RSS or Atom feed is `url.fetch` with its own
  period, a regex cut into items and a fan-out that looks each item up by its link, then creates
  or updates it — a `key` use on the link does not make a re-poll update the item, it makes a
  changed item fail the run. `references/sources.md` (Reading an RSS or Atom feed) has the steps.
- **A vendor bills you even though the platform queued the call.** Apify actor runs are billed and
  queued by Apify. The platform's own per-invocation compute fee is charged on top, and bringing
  your own key removes the vendor pass-through but not that fee.
- **Falling through to the platform's key is silent and it succeeds.** When no node in the chain
  holds a credential for the vendor, the call runs on the platform's key at the platform's price.
  You do not get an error; you get a charge. `kipory-secrets` explains the resolution order.
- **`web.search` charges by the page of results, and a page holds about ten.** `maxResults` (up to 50) is how many results you want, and a search reads pages until it has them
  or is within a few of them, each page charged at the `apify/web-search` row of the price list.
  A page often holds seven to nine, so 20 results is two pages or three; a search reads at most
  two pages more than one per ten results, and never buys a page for the last few (fewer than
  five missing is the answer). Pages are read one after another and one can take a minute or
  more. A search that runs out of time, or reads its last allowed page while five or more are
  still missing, returns what it read with a `TRUNCATED` warning, charged for those pages. `hasMore` says whether further results exist;
  there is no setting to read "page 3 only". A search that finds nothing is charged its one page.
  For "profiles, not posts" on one site, set `sites` and `excludeUrlContains` (`/p/`, `/reel/`)
  and raise `maxResults`: results left out were read and are charged, and `dropped` counts them.
  A search limited to one site shows no `relatedSearches`.
- **`web.search` takes only a language and a country its search engine knows.** `languageCode` and
  `countryCode` are closed lists, on the handler's page, and a save or a plan refuses any other
  value. Write Hebrew as `he` (the older `iw` is taken too), and name the variant for Chinese and
  Portuguese: `zh-CN`, `zh-TW`, `pt-BR`, `pt-PT`.
- **An empty result and a failure are not the same thing, and they differ per handler.**
  `web.search` stores nothing and warns `NO_RESULTS` when a search found nothing. `web.rankings` treats an
  empty ranking as a **source failure** and refuses to cache it, because a country with no popular
  websites does not exist. `location.resolve` returns empty when the provider found nothing but
  **throws** when the provider itself failed. `url.fetch` returns empty on a site's 5xx and fails
  the step on any other non-2xx. Read each one's contract before you branch on empty.
- **Every field on a scraped or looked-up object is optional.** `web.traffic` nulls every metric for
  a site too small to profile; `youtube.video` returns only the parts you asked for and any of them
  may be absent; `url.metadata` leaves unset whatever the page never declared. A flow that assumes a
  field arrived will fail on the first source that omits it.
- **Fetched text is untrusted input.** It is a stranger's writing, and it is about to be put in
  front of a model. Run it through `text.sanitize` before it reaches a prompt — see `kipory-retrieve`,
  which does this on every retrieved body for the same reason.
- **A fan-out multiplies the vendor call, not just the step.** `flow.fan-out` defaults to 20 items,
  and twenty branches each making an Apify call is most of a minute's budget in one run. Set
  `maxParallelBranches` deliberately when the branch body reaches a shared bucket.
- **Retries are already configured and they are not free.** They differ per handler — each handler
  page's **Queue** line in `kipory-build` has the numbers. The Apify handlers and `url.scrape`
  make three attempts with exponential backoff and wait up to five minutes; `url.screenshot` waits
  up to two minutes; `url.fetch` and `url.fetch-as-file` make three attempts within one and
  one-and-a-half minutes; `url.metadata` looks twice, inside its own `timeoutMs`, before it reports a refused or
  dropped connection, and never fails on a site it cannot reach; a step with its own tries reads a
  timed-out site again, and each try gets half the handler's thirty-second wait, so keep
  `timeoutMs` under about twelve seconds when you set tries; `youtube.video`,
  `youtube.channel` and `youtube.trending` make two, waiting up to a minute; `youtube.transcript`
  makes two, waiting up to two minutes; the social-platform reads make three, waiting up to five
  minutes; `location.resolve` makes two within a minute. A step that
  looks hung is usually a source that is slow, and the wait ceiling is the handler's, not something
  the flow overrides.

## References

| File                    | What it answers                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `references/sources.md` | a source per question, the shared budgets, the scrape-with-fallback and feed recipes, what a source costs |

Per-handler config tables live with the handler catalog in `kipory-build`.

## Then

`kipory-extract` when what came back is a file rather than text — a PDF, an image, audio.
`kipory-retrieve` to index the text you gathered so the product can search it, and to sanitize it
before any model reads it. `kipory-secrets` to put the project's own vendor key in place.
`kipory-build` for the flow, the fan-out and the caching behaviour these steps sit inside.
`kipory-channels` when the source is a Telegram channel you want to subscribe to rather than search
once. `kipory-operate` for what a month of these actually cost.
