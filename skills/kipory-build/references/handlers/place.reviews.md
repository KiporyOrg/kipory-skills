<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `place.reviews` — Fetch place reviews

Read what people wrote about a place on the map.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `PlaceReviews`
- **Reads:** One place: a place ID or a full map link. A name alone returns nothing, with a warning. _(shape hint: `string`)_
- **Emits:** `PlaceReviews` — the place and its reviews. A place with no reviews comes back empty, and that answer is cached.
- **Suggested input streams:** `place`
- **External dependency:** Apify — Runs an Apify actor that reads the place's reviews. Actor runs are billed and queued by Apify, not by this platform. Uses an Apify API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `apify` (vendor: Apify); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per min in bucket `apify` — shared with `place.details`, `place.search`, `telegram.search-channels`, `web.rankings`, `web.search`, `web.traffic`, `x.posts`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeReviewerDetails` | boolean | no | `false` | Include each reviewer's name, profile link and photo, and the review's own link. ⚠️ A reviewer's name, profile and photo are personal data. Turn this on only when the project has a lawful reason to hold them. |
| `language` | string, at least 2 characters | no | `"en"` | Language for translated review text, as a code like `en` or `de`. |
| `maxReviews` | integer, 1 to 1000 | no | `100` | How many reviews to return, up to 1000. Each one is charged. ⚠️ Every review returned is charged, and a larger pull takes longer. Ask for what the flow will read. |
| `origin` | `all` \| `google` | no | `"all"` | `all` includes reviews the map shows from other review sites; `google` keeps only its own. |
| `since` | string | no | — | Return only reviews published on or after this date, like `2026-09-01`. |
| `sort` | `newest` \| `most-relevant` \| `highest` \| `lowest` | no | `"newest"` | Which reviews come first: the newest, the most relevant, or the highest or lowest rated. |

## Worked example

Reads the latest reviews of one place, without saying who wrote them.

#### The 20 newest reviews

Reviewer names and profiles are left out unless the step asks for them.

Reads `string` → emits `PlaceReviews` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "maxReviews": 20,
  "sort": "newest"
}
```

Input:

```
ChIJx0000000000000000000000
```

Output:

```
{
  "place": { "placeId": "ChIJx0000000000000000000000", "name": "Blue Door Cafe", "rating": 4.6, "reviewCount": 812 },
  "reviews": [
    { "reviewId": "r1", "stars": 5, "text": "Best pastel de nata on the street.", "publishedAt": "2026-09-28T09:14:00.000Z", "likesCount": 2 },
    { "reviewId": "r2", "stars": 3, "text": "Good coffee, slow service.", "publishedAt": "2026-09-27T16:40:00.000Z", "likesCount": 0 }
  ]
}
```
