# Picking a source

## By the question you are answering

| The question                                | Reach for                                 | Note                                                |
| ------------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| "What does this page say?"                  | `url.scrape`                              | renders JS; tightest bucket, slowest step           |
| "What does this endpoint return?"           | `url.fetch`                               | no vendor, no key, 120 a minute                     |
| "What is this link, for a preview card?"    | `url.metadata`                            | head only, no render                                |
| "Give me the file behind this URL"          | `url.fetch-as-file`                       | emits a file for `kipory-extract`                   |
| "What does this page look like?"            | `url.screenshot`                          | an image file, for a vision step or an archive      |
| "Who writes about X?"                       | `web.search`                              | one SERP page, organic only                         |
| "How big is this site?"                     | `web.traffic`                             | every metric nullable for small sites               |
| "Which sites matter in this country?"       | `web.rankings`                            | cached a month; empty means failure, not absence    |
| "What is being said on X about this?"       | `x.posts`                                 | a tweet, profile or search URL                      |
| "What is this video, and what does it say?" | `youtube.video` then `youtube.transcript` | two vendors, two buckets, two credentials           |
| "Who is trending here?"                     | `youtube.trending`                        | six-hour cache — the only genuinely fast-moving one |
| "Which Telegram channels cover this?"       | `telegram.search-channels`                | discovery; subscribing is `kipory-channels`         |
| "Where is this?"                            | `location.resolve`                        | free and unkeyed, rate-limited by courtesy          |

## The three budgets

```
apify      30/min   web.search · web.rankings · web.traffic · x.posts · telegram.search-channels
youtube    60/min   youtube.video · youtube.channel · youtube.trending    + a daily unit quota
firecrawl  10/min   url.scrape · url.screenshot
supadata   30/min   youtube.transcript
```

The unkeyed handlers get their own buckets and are far wider: `url.fetch` and `url.metadata` at 120
a minute, `url.fetch-as-file` and `location.resolve` at 60.

Two consequences worth designing around:

1. **A YouTube video plus its transcript is two vendors.** The metadata comes from the YouTube Data
   API against a daily unit quota; the captions come from Supadata against a separate per-minute
   bucket. Either can be exhausted while the other is fine, so a flow that reads both fails in two
   distinct ways.
2. **Scraping does not scale by fan-out.** Ten pages a minute is the ceiling for `url.scrape` and
   `url.screenshot` together. A fan-out of twenty pages is a two-minute run at best, and it is
   sharing that budget with every other run in the project.

## Reading a source's failure

| What you see                       | Usually means                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| empty result, step succeeded       | the source genuinely had nothing — except `web.rankings`, where it is a failure |
| step failed after several minutes  | the wait ceiling; the source was slow, not wrong                                |
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

The cache is what makes this bearable. A re-run inside the window pays none of the three, which is
why the windows are long for slow-moving facts and short for fast-moving ones. Read `kipory-operate`
for what a project actually spent, rather than estimating from this page.
