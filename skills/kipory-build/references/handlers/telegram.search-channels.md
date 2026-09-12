<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `telegram.search-channels` — Search Telegram channels

Find public Telegram channels matching one or more search terms.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `TelegramChannelSearchResults`
- **Reads:** One string of comma-separated search terms. The terms are sorted for the cache key, so the same set in any order shares one entry. _(shape hint: `string`)_
- **Emits:** `TelegramChannelSearchResults` — candidate channels, deduped by username. A bare `{}` when nothing matches.
- **Suggested input streams:** `terms`
- **External dependency:** Apify — Runs Apify's `telegram-search` actor (KIPORY_APIFY_API_KEY). Actor runs are billed and queued by Apify, not by this platform.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per 60000ms in bucket `apify` — shared with `web.rankings`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 604800000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cacheTtlMinutes` | integer | no | — | How long to reuse a search, in minutes. Leave it unset for the 7-day default. ⚠️ A polling sweep needs a short value near its poll interval, or every pass sees the same results. A slow-changing read is fine on the default. |
| `maxChannels` | integer | no | `40` | Total channels to return across all search terms. Cost scales linearly. |
| `maxChannelsPerSearchTerm` | integer | no | `10` | Per-term ceiling, so one broad term cannot consume the whole budget and crowd out the others. |

## Worked example

Searches public Telegram channels by keyword. Its sibling `telegram.resolve-channel` goes the other way, from a known handle.

Reads: search terms. Emits: candidate channels.

#### two Hebrew terms

Discovery, not ranking. `memberCount` is often absent, and absent means unknown, not zero.

Reads `string` → emits `TelegramChannelSearchResults` · 1 in → 1 out

Input:

```
חדשות,ישראל
```

Output:

```
{
  "searchTerms": ["חדשות", "ישראל"],
  "channels": [
    { "username": "interil",       "title": "אינטרנט ישראל", "memberCount": 8536 },
    { "username": "hadashot_4you", "title": "חדשות" }
  ]
}
```
