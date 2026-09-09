<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `web.traffic` — Fetch site traffic metrics

Look up one site's traffic profile — visits, ranking, and audience by country.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `SiteTrafficMetrics`
- **Reads:** One site URL, reduced to its bare domain. Numbers are monthly, so results are cached for a week by default. _(shape hint: `string`)_
- **Emits:** A `SiteTrafficMetrics`. Every metric can be null — the upstream hides data for small sites — while `domain` echoes the normalised host. Empty when the domain is unknown.
- **Suggested input streams:** `source`
- **External dependency:** Apify — Runs Apify's `similarweb-scraper` actor (KIPORY_APIFY_API_KEY). Actor runs are billed and queued by Apify, not by this platform.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per 60000ms in bucket `apify` — shared with `telegram.search-channels`, `web.rankings`, `web.search`, `x.posts`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 604800000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cacheTtlMinutes` | integer | no | — | How long to reuse a lookup, in minutes. Leave it unset for the 7-day default. ⚠️ A polling sweep needs a short value near its poll interval, or every pass sees the same numbers. |

## Worked example

Reads one domain's traffic profile. Any URL on a site reduces to the same domain and the same cached row.

Reads: look up domain. Emits: traffic metrics.

#### one domain

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
