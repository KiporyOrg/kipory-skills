<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `web.search` — Search the web

Run a web search query and return the organic results.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `WebSearchResults`
- **Reads:** One search query. A single page of results is one billable call, whatever `maxResults` says. _(shape hint: `string`)_
- **Emits:** A `WebSearchResults`. One SERP page of organic results; paid ads and other SERP furniture are dropped at the handler boundary. A bare `{}` when the search returns nothing.
- **Suggested input streams:** `query`
- **External dependency:** Apify — Runs Apify's `google-search-scraper` actor (KIPORY_APIFY_API_KEY). Actor runs are billed and queued by Apify, not by this platform.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per 60000ms in bucket `apify` — shared with `telegram.search-channels`, `web.rankings`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cacheTtlMinutes` | integer | no | — | How long to reuse a search, in minutes. Leave it unset for the one-day default. ⚠️ A polling sweep needs a short value near its poll interval, or every pass sees the same results. |
| `countryCode` | string | no | — | Optional 2-letter country domain (e.g. 'us', 'de', 'il'). Omit for the actor's default (US). |
| `languageCode` | string | no | — | Optional interface-language code (`hl` parameter, e.g. 'en', 'he'). Omit for the actor's default. |
| `maxResults` | integer | no | `10` | How many results to return, up to 100 — one page. It also sets the page size, so cost does not change. |

## Worked example

Runs one search and returns the organic results. Ads and related-question blocks are dropped.

Reads: run query. Emits: organic results.

#### typical query

One page of results, one billable call. The list is bounded by `maxResults`, ten by default.

Reads `string` → emits `WebSearchResults` · 1 in → 1 out

Input:

```
artemis program launch schedule
```

Output:

```
{
  "query": "artemis program launch schedule",
  "results": [
    { "title": "Artemis — NASA", "url": "https://nasa.gov/artemis", "snippet": "…", "position": 1 }
  ]
}
```
