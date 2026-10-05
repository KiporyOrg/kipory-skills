<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `google.ads` — Fetch Google ads

List the ads a company runs, from the Google ad library.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialAd[]`
- **Reads:** One website domain, like `nike.com`, or a link on that site. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialAd`. Empty when the library has no ads for the domain.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads the Google ad library through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `facebook.posts`, `google.ad`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `country` | string | no | — | Two-letter country code to limit the ads to, like US or DE. Unset reads all countries. |
| `details` | boolean | no | `false` | Also return each ad's image, and its text and destination where the library gives them. ⚠️ Costs 25 vendor credits per request instead of 1. |
| `format` | `text` \| `image` \| `video` | no | — | Return only ads of one format. Unset returns all. |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many ads to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |

## Worked example

Lists the ads an advertiser runs across Google.

#### A domain

One entry per ad.

Reads `string` → emits `SocialAd[]` · 1 in → 1 out

Input:

```
nike.com
```

Output:

```
[
  { "platform": "google", "id": "CR02",
    "advertiser": { "id": "AR01", "name": "Nike, Inc." },
    "format": "video",
    "startedAt": "2026-03-01T00:00:00.000Z" }
]
```
