<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `web.traffic` — Fetch website traffic

Look up a website's visits, ranking, and audience by country.

Looks up one site's traffic profile. The URL is reduced to its bare domain, which is echoed back. The audience breakdown says where a site's visitors are — a different question from `web.rankings`.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SiteTrafficMetrics`
- **Reads:** One site URL, reduced to its bare domain. Numbers are monthly, so results are cached for a week by default. _(shape hint: `string`)_
- **Emits:** A `SiteTrafficMetrics`. Every metric can be null — the upstream hides data for small sites — while `domain` echoes the normalised host. Empty when the domain is unknown.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `source`
- **External dependency:** Apify — Runs Apify's `similarweb-scraper` actor. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Charged as:** `apify/similarweb` per item — a result the vendor bills for. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.search`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 7 days — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

_No operator-tunable config._

## Worked example

Reads one domain's traffic profile. Any URL on a site reduces to the same domain and the same cached row.

#### A news site

Every metric can be null rather than missing, so a consumer branches on `null` without checking the key exists.

Reads `string` → emits `SiteTrafficMetrics` · 1 in → 1 out

Input:

```
https://www.nytimes.com
```

Output:

```
{
  "domain":        "nytimes.com",
  "monthlyVisits": 512400000,
  "globalRank":    118,
  "category":      "news_and_media_publishers/news",
  "countryRank":   41,
  "topCountries":  [ { "country": "US", "visitsShare": 0.6412 },
                     { "country": "GB", "visitsShare": 0.0538 } ]
}
```
