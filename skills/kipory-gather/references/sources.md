# Picking a source

## By the question you are answering

| The question                                    | Reach for                                                                       | Note                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "What does this page say?"                      | `url.scrape`                                                                    | renders JS; tightest bucket, slowest step                                                                                                                                                                                                                                                                                          |
| "What does this endpoint return?"               | `url.fetch`                                                                     | no vendor; takes query, headers, a body and a stored key (`secret`); 60 a minute per project and host                                                                                                                                                                                                                              |
| "What is new in this feed?"                     | `url.fetch` then `text.extract` and `value.transform`                           | no feed function exists <!-- absent-function: feed.* -->: fetch the XML with the step's own `reuseResultsForMinutes`, cut the items by regex, run an `each` over them, look each up — recipe in `recipes.md`                                                                                                                       |
| "What is this link, for a preview card?"        | `url.metadata`                                                                  | head only, no render                                                                                                                                                                                                                                                                                                               |
| "Is this site alive, and if not, why?"          | `url.metadata`                                                                  | never fails on a dead site: read `failure.code` when it did not answer and `httpStatus` (often 206 for a live page) when it did; in a wide `each` one value's run can still fail on the function's thirty-second wait when the queue is busy                                                                                       |
| "Give me the file behind this URL"              | `url.fetch-as-file`                                                             | emits a file for `kipory-extract`                                                                                                                                                                                                                                                                                                  |
| "What does this page look like?"                | `url.screenshot`                                                                | an image file, for a vision step or an archive                                                                                                                                                                                                                                                                                     |
| "Who writes about X?"                           | `web.search`                                                                    | organic results, about ten a page, each page charged; `maxResults` up to 50; `sites` and `excludeUrlContains` narrow by address; codes from a closed list (`he`, `il`)                                                                                                                                                             |
| "How big is this site?"                         | `web.traffic`                                                                   | every metric nullable for small sites                                                                                                                                                                                                                                                                                              |
| "Which sites matter in this country?"           | `web.rankings`                                                                  | cached a month; empty means failure, not absence                                                                                                                                                                                                                                                                                   |
| "What is being said on X about this?"           | `x.posts`                                                                       | a tweet, profile or search URL; text is plain, `postedAt` is ISO 8601 in UTC                                                                                                                                                                                                                                                       |
| "What is being said about this elsewhere?"      | `tiktok.search`, `reddit.search`, `threads.search`                              | a platform's own search, as posts in the shared post type; `instagram.search` is the same for the popular posts Instagram shows for a topic; `youtube.search` is the same for videos                                                                                                                                               |
| "What does this one post say?"                  | `reddit.post`, `threads.post`, `linkedin.post`, `tiktok.post`, `instagram.post` | one post by its link, in the shared post type                                                                                                                                                                                                                                                                                      |
| "Which Instagram accounts are about X?"         | `instagram.search-profiles`                                                     | accounts in the shared profile type, by a name or phrase, in Instagram's order; bio and counts on the first ten only; one request                                                                                                                                                                                                  |
| "What is this video, and what does it say?"     | `youtube.video` then `youtube.transcript`                                       | pass `youtube.video`'s `id` to the transcript step — it takes a bare id and drops a URL without a call; two vendors, two buckets, two credentials                                                                                                                                                                                  |
| "What does this social video say?"              | `tiktok.transcript`, `instagram.transcript`, `x.transcript`                     | one video post's spoken words as text; a post with no video answers empty                                                                                                                                                                                                                                                          |
| "Who is trending here?"                         | `youtube.trending`                                                              | six-hour cache — the only genuinely fast-moving one                                                                                                                                                                                                                                                                                |
| "What has this channel published?"              | `youtube.posts`                                                                 | videos or shorts; `youtube.comments` and `youtube.search` are its siblings                                                                                                                                                                                                                                                         |
| "Who is this account, and what do they post?"   | `<platform>.profile` then `<platform>.posts`                                    | `tiktok`, `instagram`, `threads`, `linkedin`, `x`; `linkedin.company` and `reddit.posts` take a company page or a subreddit; which profile fields each read fills: [Social profiles and pages](#social-profiles-and-pages)                                                                                                         |
| "What is this Facebook page, and is it active?" | `facebook.page` then `facebook.posts`                                           | a page handle or link, not a post or group link; posts arrive three to a paid request, so `maxItems` defaults to 3 and stops at 30; more in [Social profiles and pages](#social-profiles-and-pages)                                                                                                                                |
| "Who follows this account, and from where?"     | `tiktok.followers`, `tiktok.following`, `tiktok.audience`                       | TikTok only: the accounts that follow it, the accounts it follows, the countries its audience is in                                                                                                                                                                                                                                |
| "What ads is this company running?"             | `facebook.ads`, `google.ads`, `linkedin.ads`, `tiktok.ads`                      | one ad type for both libraries; a name matches every advertiser that shares it — for one business, pass `facebook.page`'s `adLibraryId` to `facebook.ads` with `by: "page"`; `facebook.ad`, `google.ad` and `linkedin.ad` read one ad                                                                                              |
| "Which Telegram channels cover this?"           | `telegram.search-channels`                                                      | discovery; subscribing is `kipory-channels`                                                                                                                                                                                                                                                                                        |
| "What is this Telegram channel?"                | `telegram.resolve-channel`                                                      | one public handle or `t.me` link → name, members, description, picture; an invite link cannot be resolved                                                                                                                                                                                                                          |
| "Where is this?"                                | `location.resolve`                                                              | free and unkeyed, rate-limited by courtesy                                                                                                                                                                                                                                                                                         |
| "Which places match this query?"                | `place.search`                                                                  | a category and a town in one text; up to 200 places, 60 with `detail: "full"`; every place the search READS is charged, with a floor of ten per search, including places `location` or `includeClosed` then leave out; a `TRUNCATED` warning means it stopped at `maxItems`, and a cached replay repeats it                        |
| "What is this place, and when is it open?"      | `place.details`                                                                 | a place ID, a full map link, or "name, city"; a name returns the best match only; the card says whether the owner `claimed` the listing and gives `phoneE164` (a `+` and digits) beside `phone`, with `menuUrl` and `bookingUrls` when the source returns them — a summary `place.search` card has `phoneE164` and never `claimed` |
| "What do people say about this place?"          | `place.details` then `place.reviews`                                            | reviews need a place ID or map link, not a name — pass the card's `placeId`; each review is charged; reviewer names stay out unless the step asks                                                                                                                                                                                  |

## Social profiles and pages

- A profile carries `lastPostAt` where its own read shows a post (`instagram.profile`, `linkedin.company`), so dating an account does not need `.posts`.
- The other typed profile fields are filled only where the platform's read has them: `isPrivate` by `instagram`, `tiktok`, `threads` and `facebook.page`; `website` by those and `x.profile`, `linkedin.company`; `email` and `phone` (a business's public contact, as the platform shows it, not normalised) by `instagram.profile` and `facebook.page`. An absent one means the read does not say.
- `facebook.page`: `withLastPost` dates the page in one step for a second request; a private page comes back with `isPrivate` set; a person's own profile comes back without `email`, `phone` or `address`; beyond the shared profile fields a page has `address`, `likeCount`, `rating`, `priceRange`, `coverUrl`, `adLibraryId` and `runsAds`. A post's `counts.likes` is every reaction.
- Avatar, cover and video links from `facebook.*` are signed and stop working within hours, so copy a file the flow means to keep.

## The budgets

```
apify      30/min   web.search · web.rankings · web.traffic · telegram.search-channels
                    · place.details · place.reviews · place.search
youtube    60/min   youtube.video · youtube.channel · youtube.trending    + a daily unit quota
firecrawl  10/min   url.scrape · url.screenshot
supadata   30/min   youtube.transcript
scrapecreators 120/min   every tiktok.*, instagram.*, linkedin.*, reddit.*, threads.*, facebook.*, google.* read;
                    x.profile · x.transcript · youtube.posts · youtube.comments · youtube.search;
                    youtube.transcript when ScrapeCreators serves it
```

`x.posts` spends the budget of the vendor that serves the call; which vendors those are is
`servedBy` on `GET /v1/functions/{key}` (key `x.posts`).

The functions with no vendor are far wider. `url.metadata` has its own bucket at 120 a minute and
`location.resolve` its own at 60. `url.fetch`, `url.fetch-as-file` and `url.send` share one budget,
`outbound-request`: 60 a minute **per project and per host**, so two hosts are two budgets and no
other project can spend yours.

Two consequences worth designing around:

1. **A YouTube video plus its transcript is two vendors.** The metadata comes from the YouTube Data
   API against a daily unit quota; the captions come from Supadata against a separate per-minute
   bucket, or from ScrapeCreators when the step names it in `vendor.use`, or when Supadata fails and the step's `vendor.switch` is not `never`. Either can be
   exhausted while the other is fine, so a flow that reads both fails in two distinct ways.
2. **Scraping does not scale by `each`.** Ten pages a minute is the ceiling for `url.scrape` and
   `url.screenshot` together. An `each` over twenty pages is a two-minute run at best, and it is
   sharing that budget with every other run in the project.

## Reading a source's failure

| What you see                       | Usually means                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| empty result, step succeeded       | the source genuinely had nothing — except `web.rankings`, where it is a failure  |
| step failed after its wait ceiling | the source was slow, not wrong — each function page's Queue line has the ceiling |
| works, then stops working at scale | a shared bucket, not this function's own limit                                   |
| succeeded but the bill grew        | falling through to the platform's key, or an `each` multiplying the vendor call  |
| a field you relied on is missing   | every field on these results is independently optional                           |

## Cost, honestly

Three separate charges stack on one source step:

1. **The vendor's own price** — Apify bills actor runs, Firecrawl bills renders, YouTube spends
   quota units. Paid by whoever's key resolved.
2. **The platform's compute fee** — one charge per function invocation, metered in milliseconds.
   Charged whichever key paid the vendor.
3. **Everything downstream** — a scrape that feeds chunking, embedding and a model call has bought
   the model call too.

A social list read (`<platform>.posts`, `.comments`, `.search`, the ad libraries) pays per request,
not per item, and the page size is the source's: most return twenty or so. Read the function page's `maxItems` line before raising it. The map reads are
priced the other way, per place and per review.

What each of these costs is a read, not a measurement: a function's page lists the operations a
step is charged under, per vendor, in its **Charged as** line, and
`GET /v1/nodes/{nodeId}/vendor-prices` prices every one in credits per call or per item, with the
units a call includes and the fewest it bills. Where a function offers more than one vendor,
compare them there before the first run; the default is not always the cheapest for a small read.

The cache is what makes this bearable. A re-run inside the window makes no vendor call and pays no
vendor price; the step still pays compute for the milliseconds it ran, and whatever runs downstream of
it is charged on its own terms. That is why the windows are long for slow-moving facts and short
for fast-moving ones. `kipory-operate` owns the billing detail and the read of what a project
actually spent — use it rather than estimating from this page.
