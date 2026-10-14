# What will bite you — bringing data in from outside

Each bullet is a trap met while bringing data in from outside: what happens, and what to do about it. `SKILL.md` lists them by their first line.

- **A vendor failure about the page is a warning, and the flow keeps going; a refused key fails
  the action.** When the vendor cannot read what was asked for — a site error, a block, a timeout —
  `url.scrape` emits an empty page with a soft `SCRAPE_FAILED` warning (`RATE_LIMITED` for a 429,
  retried in-function first); the run does not fail and the empty result is not cached. An action
  skips only when **every** input it reads is absent — it runs while **any one** is present — so a
  `text.generate` reading only the empty page skips, but a transform or `record.create` that also
  reads the URL still runs and can write a record with the summary missing. Read `warnings` on the
  preview, use the plain-fetch fallback (`SKILL.md`, "A page read that must not come back empty"; `references/sources.md` has the actions), and put `slotPresent` conditions on writes.
- **A refused key or an account out of credit is not about the page, and it fails the action** —
  on every fetch-from-a-vendor function (`url.scrape`, `url.screenshot`, the search, place,
  traffic and social reads). Whose key decides what you read. With a key of your own stored
  (`kipory-secrets`) the action fails `api-key-missing` (refused) or `quota-exhausted` (your
  account is empty), and it is yours to fix. With none, the call ran on the **platform's**
  account and the action fails with `detail.phase: "platform-fault"` and a message ending "This is
  a platform fault, not a fault in the flow": the deployment's operator is alerted by the same
  failure, the failed action is **not charged**, and an endpoint over the flow answers `503
PLATFORM_DEPENDENCY_UNAVAILABLE` with `Retry-After`. Nothing in the flow fixes it; to keep
  working meanwhile, store your own key under the vendor's name as purpose and the action runs on
  your account from the next call. `GET /v1/platform-status` lists every platform account as
  `ok`, `refusing` or `unknown` with `since`: read it before spending a run to find out, and
  again to see the account come back. While an account is `refusing`, an action on it fails at
  once without calling the vendor. A function with a second vendor and `fallback` on
  (`x.posts`, `youtube.transcript`) does not fail on the platform's refused key: the next
  vendor answers, at its own price, and the result carries a `PROVIDER_FALLBACK` warning whose
  message says the platform's key was refused — the action fails `platform-fault` only when
  `fallback` is off or no vendor answers. A key of your **own** that the chosen vendor refuses
  still fails the action, fallback or not; a fallback vendor that refuses is one more miss and
  the next is tried. The YouTube Data API reads
  (`youtube.video`, `youtube.channel`, `youtube.search`, `youtube.trending`) are the exception:
  their daily quota wall fails `quota-exhausted` whoever's key it was.
  A refused scrape is **not charged** — the function bills only a
  page it got. A preview's `ingestSpend` carries two totals, `totalFirecrawlUsd` and `totalSupadataUsd` —
  what the preview was charged for those two vendors so far, read from your charges — and
  `calls[]`, which counts every ingest function's calls, cache hits and refusals included, so a
  refused call shows there at no cost. Apify, ScrapeCreators and YouTube spend is not totalled
  there; read the run's spend (`kipory-operate`). A call that timed out waiting keeps running
  and can be charged after the preview returns, so its cost may be missing from that preview's
  totals. A fetch on your own vendor key is never charged, and a platform-paid preview reports $0.
- **The cache is the design, not an optimisation.** A repeated call inside the cache window makes
  no vendor call, pays no vendor price and returns the same answer — the action still pays its
  one-second compute minimum (`kipory-operate` has the billing detail). So a flow that re-runs is
  cheap, and a source that changed inside the window is one your flow cannot see. The windows differ by an order of magnitude across
  this table: rankings hold for a month, trending for six hours.
- **"Nothing found" is saved like any answer.** A failed
  call is never saved, but a call that finished with nothing is: `web.search`, `place.details` by
  id, the ad libraries and the social reads keep an empty answer for the function's window, and the
  next run is handed it as a hit. `web.search` and `place.details` repeat the `NO_RESULTS` warning
  the first run had, so its `action-warned` row is there again beside `cacheHit: true`; an ad library
  or a social read returns an empty list and warns nothing, the first time or on a hit. For an ad library "none" is usually
  true. For `web.search` it is also what a blocked or broken results page looks like, and the two
  cannot be told apart — the same query can return ten results an hour later. A flow that would
  store "this business is not on the web" from one empty search sets a short
  `reuseResultsForMinutes` on that action (or `0`), and treats an empty search as "not known" rather
  than "none".
- **"This source must answer" is a rule you put on the actions after it.** A source that found
  nothing stores no slot, so a later action can act on that in two ways, and no action setting is
  needed:
  - **Keep what you have.** Put `"condition": { "op": "slotPresent", "slot": "hits" }` on the action
    that saves, so an empty answer never overwrites a better record. The run still succeeds.
  - **Fail the run.** Add a `value.transform` that reads the source's slot beside one that is
    always there, and assert: `($assert($exists(hits), "The search returned nothing."); query)` with
    `inputStreams: ["query", "hits"]`. Both names are needed — a transform reading only the empty
    slot is skipped and never asserts. The run ends `failed`, its writes are discarded, and the
    timeline carries your sentence (a sync endpoint answers `422` with it).

  Neither tells "nothing exists" from "the source could not be read": to the flow both are an
  absent slot. The run's `action-warned` row does tell them apart, by kind (`NO_RESULTS` against a
  failure kind such as `SEARCH_FAILED`), and that row is read by a person, not by an action.

- **Polling a source needs the action's own period.** The windows in the table are each function's
  default, not a fixed property: an action sets `reuseResultsForMinutes` — `0` runs fresh every time
  and saves nothing, a number is the action's own window. A flow that polls a feed, a channel or a
  profile for what is new sets it on the fetch action, or it reads yesterday's answer for a day.
  `kipory-build`'s `references/packs/flows-and-actions.md` (How an action runs) has the rule for actions
  that share one fetch.
- **A listing is paid for on every poll, new items or not.** A profile, channel or search read
  that reaches the vendor is charged in full when it returns the same items as last time, so on a
  quiet source the listing is the whole cost of the poll, and the polling period decides the bill
  far more than the work done per new item. Poll no more often than the source changes, keep
  `maxItems` at what one period can produce, and store each source's own period as data rather
  than polling every source on one schedule. Price one poll before choosing the period: the
  function's page names the operations it is charged under (**Charged as**) and
  `GET /v1/nodes/{nodeId}/vendor-prices` gives each one's credits, included units and floor
  (`kipory-operate`'s `references/spend.md` reads the row). Then confirm it on one run's spend.
- **A read billed in the vendor's own credits states how many a request takes.** Most take one;
  a few reads, and a few options on others, take many times that, and a list pays the
  per-request figure once per page it reads. The function's **Charged as** line gives the count, the option that raises it and
  the most requests an action makes, and `GET /v1/functions/{key}` carries the same as
  `charges.vendorCredits`. Multiply by the `scrapecreators/credit` row of
  `GET /v1/nodes/{nodeId}/vendor-prices` for the most one action can be charged.
- **`x.posts` on its default vendor charges a flat fee per call, large beside a small profile.**
  The default vendor bills each call a fixed amount that already covers a few dozen posts, then
  each post beyond them. `provider: "twitterapi"` bills per post returned plus a small account
  lookup, so for a profile read of a few posts it costs far less. The figures are the
  deployment's: read them from `GET /v1/nodes/{nodeId}/vendor-prices` and compare the vendors for
  the number of posts one poll returns. Set `provider` on the action, and
  `fallback: false` if a failure there should not be answered — and billed — by the default
  vendor (footnote ¹).
- **A screenshot is the full page, and a long page is a very large image.** `url.screenshot`
  always captures the whole page at the width you set; it has no height limit. A vision action
  reading it (`text.generate` with the file attached) is slower and dearer the larger the image,
  and a long page can run the model call into its time limit. Make the capture smaller — a
  narrower `viewportWidth`, `format: "jpeg"` with a lower `jpegQuality` — give the model action
  `"timeoutMs": 120000` (the most an action takes) and `"tries": 2`, and screenshot only the pages
  whose look is the question. `maxBytes` does not trim: a capture over it fails the action. Outside a
  record's processing flow the image is a working file, removed when the run ends
  (`kipory-extract`, "What will bite you").
- **There is no feed reader, and no upsert.** An RSS or Atom feed is `url.fetch` with its own
  period, a regex cut into items and a fan-out that looks each item up by its link, then creates
  or updates it — a `key` use on the link does not make a re-poll update the item, it makes a
  changed item fail the run. `references/sources.md` (Reading an RSS or Atom feed) has the actions.
- **A vendor bills you even though the platform queued the call.** Apify actor runs are billed and
  queued by Apify. The platform's own per-invocation compute fee is charged on top, and bringing
  your own key removes the vendor pass-through but not that fee.
- **Falling through to the platform's key is silent and it succeeds.** When no node in the chain
  holds a credential for the vendor, the call runs on the platform's key at the platform's price.
  You do not get an error; you get a charge. `kipory-secrets` explains the resolution order.
- **A site that answers 403 to Kipory may answer a browser.** `url.fetch`, `url.fetch-as-file` and
  `url.metadata` name Kipory in their User-Agent; some news sites refuse that and serve a browser.
  Set `userAgent: "browser"` on that action before reaching for `url.scrape`, which costs far more.
  `headers` cannot set User-Agent.
- **An action that stops waiting does not stop the vendor.** When an action's wait runs out, the call
  goes on, is charged when it finishes, and its answer is saved: the failure says so, and the same
  request asked again is charged compute only.
- **`web.search` charges by the page of results, and a page holds about ten.** `maxResults` (up to 50) is how many results you want, and a search reads pages until it has them
  or is within a few of them, each page charged at the `apify/web-search` row of the price list.
  A page often holds seven to nine, so 20 results is two pages or three; a search reads at most
  two pages more than one per ten results, and never buys a page for the last few (fewer than
  five missing is the answer). Pages are read one after another and one can take a minute or
  more. A search that runs out of time, or reads its last allowed page while five or more are
  still missing, returns what it read with a `TRUNCATED` warning, charged for those pages. `hasMore` says whether further results exist;
  there is no setting to read "page 3 only". `maxPages` caps the pages read — `maxPages: 1` reads one
  page and no more, whatever `maxResults` says. A search that finds nothing is charged its one page.
  `excludeSites`, and `sites` with several hosts, are asked of the search engine itself, as far
  as the query's 32 words allow, so a left-out host does not buy a page.
  A search that finds nothing is kept 30 minutes, not a day: a blocked results page looks the same.
  Past its last real match the search engine pads a page with unrelated results (popular
  accounts, help pages). A page after the first whose results mostly share no word with your
  query ends the search there: its off-topic results are left out and counted in `dropped`, and
  `hasMore` is false. A result shares a word when its title, snippet or address holds a query
  word of three letters or more (a long word matches by its stem).
  For "profiles, not posts" on one site, set `sites` and `excludeUrlContains` (`/p/`, `/reel/`)
  and raise `maxResults`: results left out were read and are charged, and `dropped` counts them.
  A search limited to one site shows no `relatedSearches`.
- **`web.search` takes only a language and a country its search engine knows.** `languageCode` and
  `countryCode` are closed lists, on the function's page, and a save or a plan refuses any other
  value. Write Hebrew as `he` (the older `iw` is taken too), and name the variant for Chinese and
  Portuguese: `zh-CN`, `zh-TW`, `pt-BR`, `pt-PT`.
- **An empty result and a failure are not the same thing, and they differ per function.**
  `web.search` stores nothing and warns `NO_RESULTS` when a search found nothing. `web.rankings` treats an
  empty ranking as a **source failure** and refuses to cache it, because a country with no popular
  websites does not exist. `location.resolve` returns empty when the provider found nothing but
  **throws** when the provider itself failed. `url.fetch` returns empty on a site's 5xx and fails
  the action on any other non-2xx. Read each one's contract before you branch on empty.
- **Every field on a scraped or looked-up object is optional.** `web.traffic` nulls every metric for
  a site too small to profile; `youtube.video` returns only the parts you asked for and any of them
  may be absent; `url.metadata` leaves unset whatever the page never declared. A flow that assumes a
  field arrived will fail on the first source that omits it.
- **Fetched text is untrusted input.** It is a stranger's writing, and it is about to be put in
  front of a model. Run it through `text.sanitize` before it reaches a prompt — see `kipory-retrieve`,
  which does this on every retrieved body for the same reason.
- **A fan-out multiplies the vendor call, not just the action.** `flow.fan-out` defaults to 20 items,
  and twenty branches each making an Apify call is most of a minute's budget in one run. Set
  `maxParallelBranches` deliberately when the branch body reaches a shared bucket.
- **Retries are already configured and they are not free.** They differ per function — each function
  page's **Queue** line in `kipory-build` has the numbers. The Apify functions and `url.scrape`
  make three attempts with exponential backoff and wait up to five minutes; `url.screenshot` waits
  up to two minutes; `url.fetch` and `url.fetch-as-file` make three attempts within one and
  one-and-a-half minutes; `url.metadata` looks twice, inside its own `timeoutMs`, before it reports a refused or
  dropped connection, and never fails on a site it cannot reach; an action with its own tries reads a
  timed-out site again, and each try gets half the function's thirty-second wait, so keep
  `timeoutMs` under about twelve seconds when you set tries; `youtube.video`,
  `youtube.channel` and `youtube.trending` make two, waiting up to a minute; `youtube.transcript`
  makes two, waiting up to two minutes; the social-platform reads make three, waiting up to five
  minutes; `location.resolve` makes two within a minute. An action that
  looks hung is usually a source that is slow, and the wait ceiling is the function's, not something
  the flow overrides.
