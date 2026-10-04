<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `telegram.search-channels` — Search Telegram channels

Find public Telegram channels that match your search words.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `TelegramChannelSearchResults`
- **Reads:** One string of comma-separated search terms. The terms are sorted for the cache key, so the same set in any order shares one entry. _(shape hint: `string`)_
- **Emits:** `TelegramChannelSearchResults` — candidate channels, deduped by username. A bare `{}` when nothing matches.
- **Suggested input streams:** `terms`
- **External dependency:** Apify — Runs Apify's `telegram-search` actor. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `web.rankings`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 7 days — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxChannels` | integer, 1 to 200 | no | `40` | Total channels to return across all search terms. Cost scales linearly. |
| `maxChannelsPerSearchTerm` | integer, 1 to 100 | no | `10` | Per-term ceiling, so one broad term cannot consume the whole budget and crowd out the others. |

## Worked example

Searches public Telegram channels by keyword. Its sibling `telegram.resolve-channel` goes the other way, from a known handle.

#### Two Hebrew terms

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
