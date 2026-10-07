# Picking a source

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->

## By the question you are answering

| The question                                    | Reach for                                                   | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "What does this page say?"                      | `url.scrape`                                                | renders JS; tightest bucket, slowest step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| "What does this endpoint return?"               | `url.fetch`                                                 | no vendor; takes query, headers, a body and a stored key (`secret`); 60 a minute per project and host                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| "What is new in this feed?"                     | `url.fetch` then `text.extract` and `value.transform`       | no feed handler exists <!-- absent-handler: feed.* -->: fetch the XML with the step's own `reuseResultsForMinutes`, cut the items by regex, fan out, look each up — recipe below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| "What is this link, for a preview card?"        | `url.metadata`                                              | head only, no render                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| "Is this site alive, and if not, why?"          | `url.metadata`                                              | never fails on a dead site: read `failure.code` when it did not answer and `httpStatus` (often 206 for a live page) when it did; in a wide fan-out a branch can still fail on the handler's thirty-second wait when the queue is busy                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| "Give me the file behind this URL"              | `url.fetch-as-file`                                         | emits a file for `kipory-extract`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| "What does this page look like?"                | `url.screenshot`                                            | an image file, for a vision step or an archive                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| "Who writes about X?"                           | `web.search`                                                | organic results, about ten a page, each page charged; `maxResults` up to 50; `sites` and `excludeUrlContains` narrow by address; codes from a closed list (`he`, `il`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| "How big is this site?"                         | `web.traffic`                                               | every metric nullable for small sites                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| "Which sites matter in this country?"           | `web.rankings`                                              | cached a month; empty means failure, not absence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| "What is being said on X about this?"           | `x.posts`                                                   | a tweet, profile or search URL; text is plain, `postedAt` is ISO 8601 in UTC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| "What is being said about this elsewhere?"      | `tiktok.search`, `reddit.search`, `threads.search`          | a platform's own search, as posts in the shared post shape; `instagram.search` is the same for the popular posts Instagram shows for a topic; `youtube.search` is the same for videos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| "Which Instagram accounts are about X?"         | `instagram.search-profiles`, `instagram.related-profiles`   | accounts in the shared profile shape: the first by a name or phrase, in Instagram's order, bio and counts on the first ten only; the second the accounts Instagram suggests beside one handle, identity only, often none; one request each                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| "What is this video, and what does it say?"     | `youtube.video` then `youtube.transcript`                   | wire `youtube.video`'s `id` into the transcript step — it takes a bare id and drops a URL without a call; two vendors, two buckets, two credentials                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| "Who is trending here?"                         | `youtube.trending`                                          | six-hour cache — the only genuinely fast-moving one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| "What has this channel published?"              | `youtube.posts`                                             | videos or shorts; `youtube.comments` and `youtube.search` are its siblings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| "Who is this account, and what do they post?"   | `<platform>.profile` then `<platform>.posts`                | `tiktok`, `instagram`, `threads`, `linkedin`, `x`; `linkedin.company` and `reddit.posts` take a company page or a subreddit; a profile carries `lastPostAt` where its own read shows a post (`instagram.profile`, `linkedin.company`), so dating an account does not need `.posts`; the other typed profile fields are filled only where the platform's read has them — `isPrivate` by `instagram`, `tiktok`, `threads` and `facebook.page`; `website` by those and `x.profile`, `linkedin.company`; `email` and `phone` (a business's public contact, as the platform shows it, not normalised) by `instagram.profile` and `facebook.page` — and an absent one means the read does not say |
| "What is this Facebook page, and is it active?" | `facebook.page` then `facebook.posts`                       | a page handle or link, not a post or group link; posts arrive three to a paid request, so `maxItems` defaults to 3 and stops at 30; `withLastPost` on the page step dates the page in one step for a second request; a private page comes back with `isPrivate` set; a post's `counts.likes` is every reaction; a person's own profile comes back without `email`, `phone` or `address`; beyond the shared profile fields a page has `address`, `likeCount`, `rating`, `priceRange`, `coverUrl`, `adLibraryId` and `runsAds`; its avatar, cover and video links are signed and stop working within hours, so copy a file the flow means to keep                                             |
| "Who follows this account, and from where?"     | `tiktok.followers`, `tiktok.following`, `tiktok.audience`   | TikTok only: the accounts that follow it, the accounts it follows, the countries its audience is in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| "What was said in this video?"                  | `tiktok.transcript`, `instagram.transcript`, `x.transcript` | text out; empty when nothing is said                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| "What ads is this company running?"             | `facebook.ads`, `google.ads`, `tiktok.ads`, `linkedin.ads`  | one ad shape for all four libraries; a name matches every advertiser that shares it — for one business, wire `facebook.page`'s `adLibraryId` into `facebook.ads` with `by: "page"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| "Which Telegram channels cover this?"           | `telegram.search-channels`                                  | discovery; subscribing is `kipory-channels`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| "What is this Telegram channel?"                | `telegram.resolve-channel`                                  | one public handle or `t.me` link → name, members, description, picture; an invite link cannot be resolved                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| "Where is this?"                                | `location.resolve`                                          | free and unkeyed, rate-limited by courtesy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| "Which places match this query?"                | `place.search`                                              | a category and a town in one text; up to 200 places, 60 with `detail: "full"`; every place the search READS is charged, with a floor of ten per search, including places `locationSlot` or `includeClosed` then leave out; a `TRUNCATED` warning means it stopped at `maxItems`, and a cached replay repeats it                                                                                                                                                                                                                                                                                                                                                                             |
| "What is this place, and when is it open?"      | `place.details`                                             | a place ID, a full map link, or "name, city"; a name returns the best match only; the card says whether the owner `claimed` the listing and gives `phoneE164` (a `+` and digits) beside `phone`, with `menuUrl` and `bookingUrls` when the source returns them — a summary `place.search` card has `phoneE164` and never `claimed`                                                                                                                                                                                                                                                                                                                                                          |
| "What do people say about this place?"          | `place.details` then `place.reviews`                        | reviews need a place ID or map link, not a name — wire the card's `placeId` in; each review is charged; reviewer names stay out unless the step asks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## The budgets

```
apify      30/min   web.search · web.rankings · web.traffic · x.posts · telegram.search-channels
                    · place.details · place.reviews · place.search
youtube    60/min   youtube.video · youtube.channel · youtube.trending    + a daily unit quota
firecrawl  10/min   url.scrape · url.screenshot
supadata   30/min   youtube.transcript
twitterapi 60/min   x.posts, on a step that chose twitterapi.io
scrapecreators 120/min   every tiktok.*, instagram.*, linkedin.*, reddit.*, threads.*, facebook.*, google.* read;
                    x.profile · x.transcript · youtube.posts · youtube.comments · youtube.search;
                    x.posts and youtube.transcript on a step that chose it
```

The handlers with no vendor are far wider. `url.metadata` has its own bucket at 120 a minute and
`location.resolve` its own at 60. `url.fetch`, `url.fetch-as-file` and `url.send` share one budget,
`outbound-request`: 60 a minute **per project and per host**, so two hosts are two budgets and no
other project can spend yours.

Two consequences worth designing around:

1. **A YouTube video plus its transcript is two vendors.** The metadata comes from the YouTube Data
   API against a daily unit quota; the captions come from Supadata against a separate per-minute
   bucket, or from ScrapeCreators when Supadata fails and the step's `fallback` is on. Either can be
   exhausted while the other is fine, so a flow that reads both fails in two distinct ways.
2. **Scraping does not scale by fan-out.** Ten pages a minute is the ceiling for `url.scrape` and
   `url.screenshot` together. A fan-out of twenty pages is a two-minute run at best, and it is
   sharing that budget with every other run in the project.

## Scrape with a plain-fetch fallback

A page read that must not come back empty. Run the two sources side by side off the same `url`
slot and keep whichever filled:

```
scrape   url.scrape                  url → page            (page.content: rendered markdown, or "")
fetch    url.fetch                   url → raw             (the raw HTML/text, no vendor)
strip    value.transform             raw → plain           (tags stripped, below)
body     value.first-non-empty       { "inputs": ["page.content", "plain"], "valueKind": "string" } → body
```

1. **Coalesce text with text.** The two sources emit different types — `url.scrape` a
   `ScrapedPage` object, `url.fetch` the raw body as one string — so the `body` step reads
   `page.content` (the scraped markdown) against `plain`, never the bare `page` against `raw`. It
   lists every root it reads in `inputStreams` (`page`, `plain`), types them `ScrapedPage` and
   `string` in `inputSchemas`, and states `outputSchema` `string`.
2. **Strip the tags in `strip`.** The expression (in a JSON document every `\` doubles):

   ```
   $trim($replace($replace($replace(raw, /<(script|style)[\s\S]*?<\/(script|style)>/i, " "), /<[^>]+>/, " "), /\s+/, " "))
   ```

3. **Set `"onFailure": "continue"` on the `fetch` step.** The two sources fail differently.
   `url.scrape` turns a vendor refusal into a warning and an empty page. `url.fetch` fails the step
   on a 4xx page, on an address that does not resolve and on a refused one — and one failed step
   fails the whole run, even when the scrape beside it worked: a sync endpoint answers `502`
   (`details.phase: "handler-error"`, or `"target-unreachable"` for a name that does not resolve),
   or `400` "blocked network request" for a private address. Only a 5xx from the site comes back as an empty value with a `FETCH_FAILED`
   warning. With `continue` a failed fetch is a warning, its readers skip, and `body` takes the
   scrape.
4. **Guard every step that reads `body` beside another slot** with
   `condition: { "op": "slotPresent", "slot": "body" }` — model steps included, not only writes. A
   step runs while any one input is present: a key-point `text.generate` that also reads `url` (to
   cite it) runs on the URL alone when every read failed, and the model invents a page. Guard the
   writes the same way on the slot they store, so such a run writes nothing instead of a half-empty
   record.

**With no vendor at all** — no Firecrawl key, or its credit spent — drop `scrape` and read
`url.fetch` → `strip` as the body, and take the title from `url.metadata` on the same `url` (its
`title`, from the page's `<title>` or `og:title`; also `onFailure: continue`). A page that builds
its text in the browser comes back nearly empty this way; a `$assert` on the length turns that into
a clear refusal (`kipory-build`'s `references/records-and-endpoints.md`, endpoint answers and
refusals).

## Reading an RSS or Atom feed

No handler parses a feed. <!-- absent-handler: feed.* --> The working shape is a fetch, a regex
cut and a fan-out; each branch looks its item up, then creates or updates it:

```
fetch    url.fetch          feedUrl → xml         "reuseResultsForMinutes": 0, or the polling period
items    text.extract       xml → blocks          { "pattern": "<item[\\s\\S]*?</item>", "flags": ["i"] }
each     flow.fan-out       blocks → one block per branch
fields   value.transform    block → item          { title, link, published } — $match on each tag, below
found    record.list        item → found          { "tableKey": "<type>", "fieldFilterSlots": { "link": "item.link" }, "limit": 1 }
create   record.create      item                  { "tableKey": "<type>", "dataSlot": "item" } — when nothing was found
update   record.update      item, found           "recordIdSlot": "found.records[0].id", "dataSlot": "item" — when one was
```

- **`url.fetch` returns the feed as one string**, whatever content type the server names, so
  `text.extract` reads the XML as text. Leave `responseAs` unset: `json` on XML fails the step.
- **Two size limits.** A body over the step's `maxBytes` (5,000,000 by default) fails the step. A
  body under it but over the slot cap (500,000 characters unless the deployment set another) is
  cut to fit and ends in `[TRUNCATED]`, with only a `slot-truncated` warning on the run — so a
  large feed loses its last items, and the cut can land inside one.
- **A feed server that wants its own `Accept`.** `url.fetch` asks for JSON, XML and text, which a
  feed server accepts. For one that wants a different value, set the step's `headers` to
  `{ "Accept": "…" }`; a header the step names replaces the default.
- **Set the fetch step's own cache.** `url.fetch` reuses an answer for 24 hours by default, so a
  poll that leaves `reuseResultsForMinutes` alone reads the same XML all day.
- **The cut is by tag.** RSS wraps an item in `<item>`, Atom in `<entry>` — use
  `<entry[\\s\\S]*?</entry>` there. `text.extract` returns every match as a list of strings.
- **Read a field with `$match`.** In the `fields` step, `$match(block, /<title>([\s\S]*?)<\/title>/)[0].groups[0]`
  is the title; the link is `<link>…</link>` in RSS and the `href` attribute of `<link …/>` in
  Atom. Wrap a value in `$trim`, and strip `<![CDATA[` … `]]>` where the feed uses it.
- **Look the link up before you write.** There is no upsert step, and a `key` use does not turn
  a create into an update. What `record.create` alone does with an item an earlier poll wrote:
  - **Unchanged item, project-wide table**: the record's id comes from its data, so
    `record.create` lands on the record that is already there and adds nothing.
  - **Changed item** (an edited title, a new date): with no `key` use it becomes a second
    record; with a `key` use on the link it is different data under a held key, the create is
    refused `RECORD_NATURAL_KEY_TAKEN`, and the whole poll writes nothing.
  - So match on the link first. Give the link field a `filter` use (`kipory-model`) so `found`
    can filter on it, and guard the two writes on what it returned:
    `create` with `{ "op": "listEmpty", "slot": "found", "path": "records" }`, `update` with
    that condition inside `{ "op": "not", "inner": … }`.
    `record.update` merges the new fields over the stored ones. `listEmpty` also holds when
    `found` is absent, and `found` is skipped for an item with no link — so if the feed can
    omit one, add `{ "op": "slotPresent", "slot": "item", "path": "link" }` to the `create`
    guard under an `and`.
  - Leave `inputStreams` out of all three steps and the save derives them from each step's
    config: `update` reads `item` and `found`, `found` reads `item` and, like every
    `record.list`, `userInfo`, and `create` reads `item` alone. `create`'s condition names
    `found`, and that alone runs it after the lookup; listing `found` among `create`'s inputs
    is refused `FREE_FORM_INPUT_STREAMS_MISMATCH`.
  - A `key` use beside the `filter` use (`"uses": ["key", "filter"]`) is a backstop that
    refuses a second record under one link; it is never the update.
  - Store the items in a project-wide table. A scheduled poll has no end user, so a per-user
    table refuses there; and inside a fan-out a per-user record gets a new id on every run.
  - Match on the link, not on the feed's `<guid>`, which is not always stable between fetches.

  `kipory-build`'s `references/records-and-endpoints.md` (§8, natural-key collisions) has the
  refusal's details.

- **A feed is untrusted text** like any fetched page: `text.sanitize` it before a model reads it.

## Reading a source's failure

| What you see                       | Usually means                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| empty result, step succeeded       | the source genuinely had nothing — except `web.rankings`, where it is a failure |
| step failed after its wait ceiling | the source was slow, not wrong — each handler page's Queue line has the ceiling |
| works, then stops working at scale | a shared bucket, not this handler's own limit                                   |
| succeeded but the bill grew        | falling through to the platform's key, or a fan-out multiplying the vendor call |
| a field you relied on is missing   | every field on these results is independently optional                          |

## Cost, honestly

Three separate charges stack on one source step:

1. **The vendor's own price** — Apify bills actor runs, Firecrawl bills renders, YouTube spends
   quota units. Paid by whoever's key resolved.
2. **The platform's compute fee** — one charge per handler invocation, metered in whole seconds.
   Charged whichever key paid the vendor.
3. **Everything downstream** — a scrape that feeds chunking, embedding and a model call has bought
   the model call too.

A social list read (`<platform>.posts`, `.comments`, `.search`, the ad libraries) pays per request,
not per item, and the page size is the source's: most return twenty or so, `facebook.posts`
returns three. Read the handler page's `maxItems` line before raising it. The map reads are
priced the other way, per place and per review.

What each of these costs is a read, not a measurement: a handler's page lists the operations a
step is charged under, per vendor, in its **Charged as** line, and
`GET /v1/nodes/{nodeId}/vendor-prices` prices every one in credits per call or per item, with the
units a call includes and the fewest it bills. Where a handler offers more than one vendor,
compare them there before the first run; the default is not always the cheapest for a small read.

The cache is what makes this bearable. A re-run inside the window makes no vendor call and pays no
vendor price; the step still pays its one-second compute minimum, and whatever runs downstream of
it is charged on its own terms. That is why the windows are long for slow-moving facts and short
for fast-moving ones. `kipory-operate` owns the billing detail and the read of what a project
actually spent — use it rather than estimating from this page.
