<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `place.details` — Fetch a place

Read a place's map listing: address, hours, rating, and contact.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `PlaceCard`
- **Reads:** One place: a place ID, a full map link, or a name with its city. A name returns the best match only. _(shape hint: `string`)_
- **Emits:** `PlaceCard` — one place's listing. A place the map does not know comes back empty, and that answer is cached.
- **Suggested input streams:** `place`
- **External dependency:** Apify — Runs an Apify actor that reads the map listing. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.reviews`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 7 days — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `language` | string, at least 2 characters | no | `"en"` | Language for the place's name, hours and descriptions, as a code like `en` or `de`. ⚠️ Changing the language changes the cache key, so the next run fetches every place again. |
| `maxImages` | integer, 0 to 20 | no | `0` | How many photo links to include, up to 20. 0 includes none. |

## Worked example

Reads one place's listing — where it is, when it is open, and how it is rated.

#### A restaurant by name

A name returns the best match, so add the city to keep it unambiguous.

Reads `string` → emits `PlaceCard` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "language": "en",
  "maxImages": 0
}
```

Input:

```
Blue Door Cafe, Lisbon
```

Output:

```
{
  "placeId": "ChIJx0000000000000000000000",
  "name": "Blue Door Cafe",
  "address": "Rua das Flores 12, 1200-195 Lisboa, Portugal",
  "location": { "lat": 38.7107, "lng": -9.1436 },
  "primaryCategory": "Cafe",
  "rating": 4.6,
  "reviewCount": 812,
  "status": "open",
  "openingHours": [{ "day": "Monday", "hours": "8 AM-6 PM" }]
}
```
