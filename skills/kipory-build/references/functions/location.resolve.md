<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `location.resolve` — Find a place from a map point

Turn a map point into a place: city, region, and country.

Turns one pair of coordinates into a place — city, region, country. A coordinate the provider cannot place comes back empty. Answers are cached per coordinate, so repeats are free.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `Location` → `Place`
- **Reads:** One `Location` — a latitude and a longitude, and nothing else. Coordinates it cannot use come back empty without a call. _(shape hint: `object`)_
- **Emits:** A `Place`, with every field optional because coverage varies. Empty when the provider found nothing. A provider failure throws instead, so the action fails rather than reporting a blank.
- **External dependency:** OpenStreetMap — Reverse-geocodes through Nominatim, the public OpenStreetMap endpoint. Free, unkeyed and rate-limited by courtesy — answers are cached per coordinate so repeats cost nothing.
- **Rate limit:** 60 per min in bucket `location.resolve`
- **Queue:** 2 attempts, exponential from 5 s; waits up to 1 min; cache 7 days — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `language` | string, at least 2 characters | no | `"en"` | Preferred language for place names. A single tag like `en`, or a priority list. `en` by default. ⚠️ The provider falls back to the local name when it has no translation. Changing this changes the cache key, so the next run re-fetches everything. |
| `provider` | `osm` \| `mapbox` \| `google` | no | `"osm"` | Reverse-geocoding provider. Only "osm" is implemented in v1; "mapbox" and "google" are reserved enum slots that throw when selected. |

## Worked example

Turns one pair of coordinates into a place. Repeated coordinates are answered from cache.

#### A city

Urban coordinate — provider returns the full quartet (city, region, country, formatted address).

Reads `Location` → emits `Place` · 1 in → 1 out

Input:

```
{
  "lat": 37.8199,
  "lng": -122.4783
}
```

Output:

```
{
  "city": "San Francisco",
  "region": "California",
  "country": "US",
  "formatted": "Golden Gate Bridge, San Francisco, CA, USA"
}
```

#### A remote spot

A remote coordinate with no city or region known — only the country and a formatted name come back.

Reads `Location` → emits `Place` · 1 in → 1 out

Input:

```
{
  "lat": -75.2509,
  "lng": -0.0714
}
```

Output:

```
{
  "country": "AQ",
  "formatted": "Antarctica"
}
```
