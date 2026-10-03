<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `facebook.ad` — Fetch a Facebook ad

Look up one ad in the Facebook ad library.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialAd`
- **Reads:** One Facebook ad library link, or the ad's numeric id. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A `SocialAd`. A bare `{}` when the library has no such ad.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads the Facebook ad library through ScrapeCreators (KIPORY_SCRAPECREATORS_API_KEY), or the project's own key for it.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per 60000ms in bucket `scrapecreators` — shared with `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (default-input-slot-hash) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

_No operator-tunable config._

## Worked example

Looks up one ad in the Facebook ad library.

Reads: look up ad. Emits: ad.

#### A library link

The ad's advertiser, copy and run dates.

Reads `string` → emits `SocialAd` · 1 in → 1 out

Input:

```
https://www.facebook.com/ads/library/?id=111
```

Output:

```
{
  "platform": "facebook", "id": "111",
  "advertiser": { "name": "Nike" },
  "title": "Just do it", "text": "New season",
  "startedAt": "2023-11-14T22:13:20.000Z", "active": true
}
```
