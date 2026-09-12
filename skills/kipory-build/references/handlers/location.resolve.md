<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `location.resolve` — Reverse-geocode coordinates

Convert latitude and longitude into a city, region, country, or formatted place.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `Location` → `Place`
- **Reads:** One `Location` — a latitude and a longitude, and nothing else. Coordinates it cannot use come back empty without a call. _(shape hint: `object`)_
- **Emits:** A `Place`, with every field optional because coverage varies. Empty when the provider found nothing. A provider failure throws instead, so the step fails rather than reporting a blank.
- **External dependency:** OpenStreetMap — Reverse-geocodes through Nominatim, the public OpenStreetMap endpoint. Free, unkeyed and rate-limited by courtesy — answers are cached per coordinate so repeats cost nothing.
- **Rate limit:** 60 per 60000ms in bucket `location.resolve`
- **Queue:** 2 attempts, exponential from 5000ms; waits up to 60000ms; cache 604800000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `language` | string | no | `"en"` | Preferred language for place names. A single tag like `en`, or a priority list. `en` by default. ⚠️ The provider falls back to the local name when it has no translation. Changing this changes the cache key, so the next run re-fetches everything. |
| `provider` | `osm` \| `mapbox` \| `google` | no | `"osm"` | Reverse-geocoding provider. Only "osm" is implemented in v1; "mapbox" and "google" are reserved enum slots that throw when selected. |

## Worked example

Turns one pair of coordinates into a place. Repeated coordinates are answered from cache.

Reads: round to 4dp · cache key. Emits: provider lookup.

#### typical

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

#### sparse coverage

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
