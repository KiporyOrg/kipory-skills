<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `web.rankings` — Fetch top websites

List a country's most visited websites, in order.

Returns the most-visited websites for one country. This ranks where the traffic comes from, not where a site is published. National rankings move slowly, so results are cached for a month.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `TopSiteRanking`
- **Reads:** One country slug, like `israel` or `worldwide`. The ranking is by where the traffic comes from, not where a site is published. _(shape hint: `string`)_
- **Emits:** `TopSiteRanking` — ranked domains with search traffic parsed to numbers. An empty ranking is treated as a SOURCE FAILURE, never cached: a country with no popular websites does not exist.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `country`
- **External dependency:** Apify — Runs Apify's `top-websites` actor. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Charged as:** `apify/top-websites` per item — a result the vendor bills for. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `place.search`, `telegram.search-channels`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 30 days — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `category` | string | no | `"all"` | Narrow the ranking to one vertical, like news or finance. ⚠️ Filter here rather than on the category label each site comes back with — that label is unreliable, and national news often arrives as something else entirely. |
| `limit` | integer, at least 100 | no | `100` | How many ranked sites to return. 100 is both the floor and the default. ⚠️ The upstream refuses anything below 100, so a smaller sample is not available at any price. Cost rises with the number you ask for. |

## Worked example

Lists a country's most-visited websites — ranked by where the traffic comes from, not where a site is published.

#### Sites in Israel

Local publishers and global platforms mix together, so a catalogue has to filter the platforms out.

Reads `string` → emits `TopSiteRanking` · 1 in → 1 out

Input:

```
israel
```

Output:

```
{
  "country": "israel",
  "sites": [
    { "rank": 1, "domain": "mako.co.il", "category": "Entertainment", "searchTraffic": 6900000 },
    { "rank": 2, "domain": "ynet.co.il", "category": "News",          "searchTraffic": 5300000 }
  ]
}
```
