<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `web.search` — Search the web

Search the web and return the results.

Runs one search-engine query and returns its organic results. A search costs one billable results page, and a page holds about ten results whatever `maxResults` says; no setting reads a second page. Reads its query from its first input.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `WebSearchResults`
- **Reads:** One search query. A single page of results is one billable call, whatever `maxResults` says. _(shape hint: `string`)_
- **Emits:** A `WebSearchResults`: one page of organic results, about ten. Nothing, with a `NO_RESULTS` warning, when the search finds none; `SEARCH_FAILED` when it could not be made.
- **Suggested input streams:** `query`
- **External dependency:** Apify — Runs Apify's `google-search-scraper` actor. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Charged as:** `apify/web-search` per item — a result the vendor bills for. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `countryCode` | string | no | — | Optional 2-letter country domain (e.g. 'us', 'de', 'il'). Omit for the actor's default (US). |
| `languageCode` | string | no | — | Optional interface-language code (`hl`), such as 'en' or 'iw'. Omit for the actor's default. ⚠️ The vendor's own list, not ISO codes: Hebrew is `iw`, and `he` is refused with a `SEARCH_FAILED` warning. |
| `maxResults` | integer, more than 0, at most 100 | no | `10` | The most results to keep from the one page a search reads, which holds about ten. ⚠️ A page holds about ten results, sometimes fewer, so a value above 10 returns no more and nothing warns. An empty answer is saved for the cache period, and a blocked page looks the same. |

## Worked example

Runs one search and returns the organic results. Ads and related-question blocks are dropped.

#### A topic search

One page of results, one billable call: about ten, and never more than `maxResults`.

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
