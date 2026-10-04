<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `web.search` — Search the web

Search the web and return the results.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `WebSearchResults`
- **Reads:** One search query. A single page of results is one billable call, whatever `maxResults` says. _(shape hint: `string`)_
- **Emits:** A `WebSearchResults`. One page of organic results; paid ads and the other blocks on a results page are left out. A bare `{}` when the search returns nothing.
- **Suggested input streams:** `query`
- **External dependency:** Apify — Runs Apify's `google-search-scraper` actor. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `countryCode` | string | no | — | Optional 2-letter country domain (e.g. 'us', 'de', 'il'). Omit for the actor's default (US). |
| `languageCode` | string | no | — | Optional interface-language code (`hl` parameter, e.g. 'en', 'he'). Omit for the actor's default. |
| `maxResults` | integer, more than 0, at most 100 | no | `10` | How many results to return, up to 100 — one page. It also sets the page size, so cost does not change. |

## Worked example

Runs one search and returns the organic results. Ads and related-question blocks are dropped.

#### A topic search

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
