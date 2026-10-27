<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `place.search` — Search for places

Find the places a map lists for a query, like a category in a town.

Each place comes with address, coordinates, category, rating, phone, website and status. Each place read is charged.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `PlaceCard[]`
- **Also found as:** places nearby, nearby, near me, local businesses, find businesses
- **Reads:** One text query that says what and where, like a category and a town. With `location` set, it says where and the text only what. _(shape hint: `string`)_
- **Emits:** A list of `PlaceCard`, each with the place ID other place actions take. Empty when the map lists nothing; a `TRUNCATED` warning means more places may exist.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `query`
- **External dependency:** Apify — Runs an Apify actor that searches the map. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Charged as:** `apify/maps-search-place` per item — a place the search returned. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 30 per min in bucket `apify`, counted per project — shared with `place.details`, `place.reviews`, `telegram.search-channels`, `web.rankings`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `detail` | `summary` \| `full` | no | `"summary"` | How much of each listing to read; `full` reads more, slower. |
| `includeClosed` | boolean | no | `true` | Keep places the map marks temporarily or permanently closed. ⚠️ A place left out is still charged, and changing this searches again. |
| `language` | string, at least 2 characters | no | `"en"` | Language for names, addresses and hours, like `en` or `de`. ⚠️ Changing the language changes the cache key, so the next run searches again. |
| `location` | union | no | — | A circle `{lat, lng, radiusMeters}`; empty lets the query say where. ⚠️ Places read outside the circle are left out and still charged: the map searches a wider rectangle than the radius. |
| `maxItems` | integer, 1 to 200 | no | `20` | How many places to return; at most 200, or 60 on `full`. ⚠️ Each place read is charged; a large search with no area wanders to nearby towns. |

### `location` — one of

- `string`, at most 512 characters
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Finds the places a map lists for a query, one card per place.

#### A category in a town

One card per place; feed a place ID to the reviews action to read what people wrote.

Reads `string` → emits `PlaceCard[]` · 1 in → 1 out

Action settings (`functionConfig`):

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
