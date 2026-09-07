---
name: kipory-gather
description: Bring data into a Kipory project from outside it — fetch and scrape web pages, run a web search, read YouTube videos, channels and transcripts, pull X posts, capture a page as an image, find Telegram channels, and turn coordinates into a place. Use when a flow needs something the project does not already hold, when a source handler is slow, refused or rate-limited, when a vendor bill is larger than expected, or when deciding whether the project's own key or the platform's should pay for a source.
license: MIT
---

# Bring data in from outside

Every handler in this skill reaches a third party, and that changes what you are designing. A step
that reads the project's own database is fast, free and always available. A step in this group is
none of those: it is queued, retried, cached, rate-limited against a **shared** bucket, and billed
by somebody who is not this platform.

**The fact most people get wrong: the rate limits are shared across handlers, not per handler.**
Five different sources draw on one Apify budget of 30 calls a minute. A flow that searches the web
and reads X posts in the same fan-out competes with itself, and the ceiling arrives at a number
neither handler's own page mentions.

## Before the first call

- **Confirm the handler's vendor and credential** with `GET /v1/handlers/{key}`. The entry names
  the credential type and the purpose it resolves under, plus the bucket it shares.
- **Decide whose key pays** before you build the step, not after the first invoice — `kipory-secrets`.
- **Every one of these runs in the ingest phase**, which means a queue, retries and a cache. Inline
  and control handlers have none of those. Whether a step is queued is a property of the handler,
  not something you configure.

## The sources

| Handler                    | Brings back                                    | Vendor        | Bucket              | Cached |
| -------------------------- | ---------------------------------------------- | ------------- | ------------------- | ------ |
| `url.fetch`                | raw text or JSON, nothing rendered             | the site      | `url.fetch`         | 24h    |
| `url.fetch-as-file`        | the bytes, saved as a file                     | the site      | `url.fetch-as-file` | 24h    |
| `url.metadata`             | title, description, icon, social preview       | the site      | `url.metadata`      | 24h    |
| `url.scrape`               | the rendered page as clean markdown            | Firecrawl     | `firecrawl`         | 24h    |
| `url.screenshot`           | a full-page image file                         | Firecrawl     | `firecrawl`         | 24h    |
| `web.search`               | one page of organic search results             | Apify         | `apify`             | 24h    |
| `web.rankings`             | a country's most-visited sites, ranked         | Apify         | `apify`             | 30d    |
| `web.traffic`              | one site's visits, ranking and audience        | Apify         | `apify`             | 7d     |
| `x.posts`                  | a tweet, profile or search URL as posts        | Apify         | `apify`             | 24h    |
| `telegram.search-channels` | public channels matching search terms          | Apify         | `apify`             | 7d     |
| `youtube.video`            | a video's metadata and stats                   | YouTube       | `youtube`           | 7d     |
| `youtube.channel`          | a channel's metadata and stats                 | YouTube       | `youtube`           | 7d     |
| `youtube.trending`         | the channels behind a region's trending videos | YouTube       | `youtube`           | 6h     |
| `youtube.transcript`       | a video's captions as text                     | Supadata      | `supadata`          | 24h    |
| `location.resolve`         | a place from latitude and longitude            | OpenStreetMap | `location.resolve`  | 7d     |

Five handlers share `apify` at 30 a minute. Three share `youtube` at 60 a minute **and a single
daily quota measured in units, not calls** — a heavy day of channel reads can exhaust what a later
video read needed. `url.scrape` and `url.screenshot` share `firecrawl` at **10 a minute**, the
tightest budget here by a wide margin, and both are the slow kind of step: they render a page in a
real browser.

## Choosing between the four ways to read a page

- **`url.fetch`** when the URL returns data — an API, a JSON feed, a text file. It renders nothing
  and re-encodes nothing. No vendor, no key.
- **`url.metadata`** when you only need the head: title, description, icon. It reads the page's head
  over plain HTTP with no JS render, so it is cheap and it is wrong about pages that build their
  own title in the browser.
- **`url.scrape`** when you need the readable body of a modern page. It renders JavaScript, which is
  why it costs a vendor call and sits in the tightest bucket.
- **`url.fetch-as-file`** when you want the bytes rather than the text — a PDF, an image, an
  archive. It stores them and emits a file reference for `kipory-extract` to open.

`url.fetch`, `url.fetch-as-file` and `url.metadata` go through an SSRF guard: they reach the open
web, not the deployment's own network.

## What will bite you

- **The cache is the design, not an optimisation.** A repeated call inside the cache window costs
  nothing and returns the same answer, so a flow that re-runs is cheap — and a source that changed
  inside the window is one your flow cannot see. The windows differ by an order of magnitude across
  this table: rankings hold for a month, trending for six hours.
- **A vendor bills you even though the platform queued the call.** Apify actor runs are billed and
  queued by Apify. The platform's own per-invocation compute fee is charged on top, and bringing
  your own key removes the vendor pass-through but not that fee.
- **Falling through to the platform's key is silent and it succeeds.** When no node in the chain
  holds a credential for the vendor, the call runs on the platform's key at the platform's price.
  You do not get an error; you get a charge. `kipory-secrets` explains the resolution order.
- **An empty result and a failure are not the same thing, and they differ per handler.**
  `web.search` returns a bare object when a search genuinely found nothing. `web.rankings` treats an
  empty ranking as a **source failure** and refuses to cache it, because a country with no popular
  websites does not exist. `location.resolve` returns empty when the provider found nothing but
  **throws** when the provider itself failed. Read each one's contract before you branch on empty.
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
- **Retries are already configured and they are not free.** Most of these make three attempts with
  exponential backoff and wait up to five minutes. A step that looks hung is usually a source that
  is slow, and the wait ceiling is the handler's, not something the flow overrides.

## References

| File                    | What it answers                                                    |
| ----------------------- | ------------------------------------------------------------------ |
| `references/sources.md` | picking a source per question, and what each one costs in practice |

Per-handler config tables live with the handler catalog in `kipory-build`.

## Then

`kipory-extract` when what came back is a file rather than text — a PDF, an image, audio.
`kipory-retrieve` to index the text you gathered so the product can search it, and to sanitize it
before any model reads it. `kipory-secrets` to put the project's own vendor key in place.
`kipory-build` for the flow, the fan-out and the caching behaviour these steps sit inside.
`kipory-channels` when the source is a Telegram channel you want to subscribe to rather than search
once. `kipory-operate` for what a month of these actually cost.
