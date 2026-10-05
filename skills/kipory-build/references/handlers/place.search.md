<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `place.search` — Search for places

Find the places a map lists for a query, like a category in a town.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `PlaceCard[]`
- **Reads:** One text query that says what and where, like a category and a town. With `locationSlot` set, the slot says where and the text only what. _(shape hint: `string`)_
- **Emits:** A list of `PlaceCard`, each with the place ID other place steps take. Empty when the map lists nothing; a `TRUNCATED` warning means more places may exist.
- **Suggested input streams:** `query`
- **External dependency:** Apify — Runs an Apify actor that searches the map. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.reviews`, `telegram.search-channels`, `web.rankings`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `detail` | `summary` \| `full` | no | `"summary"` | How much of each listing to read. `full` adds usual busyness, whether the listing is claimed and the rest of one place's read. Slower. |
| `includeClosed` | boolean | no | `true` | Keep places the map marks temporarily or permanently closed. Off leaves them out. ⚠️ A place left out was still read and is still charged, and changing this searches again. A closed place appears only while the map lists it. |
| `language` | string, at least 2 characters | no | `"en"` | Language for names, addresses and hours, as a code like `en` or `de`. ⚠️ Changing the language changes the cache key, so the next run searches again. |
| `locationSlot` | string, at most 512 characters | no | — | A slot holding `{ lat, lng, radiusMeters }` that bounds the search to a circle. Unset, the query text says where. ⚠️ Places read outside the circle are left out and still charged: the map searches a wider rectangle than the radius. |
| `maxItems` | integer, 1 to 200 | no | `20` | The most places to return, up to 200, or 60 when `detail` is `full`. ⚠️ Each place the search reads is charged, so a higher bound costs more. A large search with no area wanders to nearby towns. |

## Worked example

Finds the places a map lists for a query, one card per place.

#### A category in a town

One card per place; feed a place ID to the reviews step to read what people wrote.

Reads `string` → emits `PlaceCard[]` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "maxItems": 20,
  "language": "en",
  "includeClosed": true,
  "detail": "summary"
}
```

Input:

```
bicycle repair, Delft
```

Output:

```
[
  {
    "placeId": "ChIJx0000000000000000000000",
    "name": "Canal Cycle Works",
    "address": "Oude Delft 12, 2611 CD Delft, Netherlands",
    "location": { "lat": 52.0116, "lng": 4.3571 },
    "primaryCategory": "Bicycle repair shop",
    "phone": "+31 15 000 0000",
    "rating": 4.7,
    "reviewCount": 212,
    "status": "open"
  }
]
```
