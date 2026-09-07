<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `web.rankings` — Fetch top websites by country

List a country's most-visited websites, ranked.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `TopSiteRanking`
- **Reads:** One country slug, like `israel` or `worldwide`. The ranking is by where the traffic comes from, not where a site is published. _(shape hint: `string`)_
- **Emits:** `TopSiteRanking` — ranked domains with search traffic parsed to numbers. An empty ranking is treated as a SOURCE FAILURE, never cached: a country with no popular websites does not exist.
- **Suggested input streams:** `country`
- **External dependency:** Apify — Runs Apify's `top-websites` actor (KIPORY_APIFY_API_KEY). Actor runs are billed and queued by Apify, not by this platform.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per 60000ms in bucket `apify` — shared with `telegram.search-channels`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 2592000000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cacheTtlMinutes` | integer | no | — | How long to reuse a ranking, in minutes. Leave it unset for the 30-day default. ⚠️ A polling sweep needs a short value near its poll interval, or every pass sees the same ranking. |
| `category` | string | no | `"all"` | Narrow the ranking to one vertical, like news or finance. ⚠️ Filter here rather than on the category label each site comes back with — that label is unreliable, and national news often arrives as something else entirely. |
| `limit` | integer | no | `100` | How many ranked sites to return. 100 is both the floor and the default. ⚠️ The upstream refuses anything below 100, so a smaller sample is not available at any price. Cost rises with the number you ask for. |

## Worked example

Lists a country's most-visited websites — ranked by where the traffic comes from, not where a site is published.

Reads: rank country. Emits: ranked sites.

#### one country

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
