<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `linkedin.ads` — Fetch LinkedIn ads

List the ads a company runs, or ads that match a keyword, from the LinkedIn ad library.

Reads the public LinkedIn ad library. Give it a company name to list that company's ads, or switch it to keyword search. Each ad comes back with its advertiser, copy, image, destination and run dates.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialAd[]`
- **Reads:** One company name, or one keyword when the step searches by keyword. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialAd`. Empty when the library has no matching ads.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads the LinkedIn ad library through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and a step makes one request per page it reads, at most 25. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `facebook.posts`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `by` | `company` \| `keyword` | no | `"company"` | Whether the input is a company whose ads to list, or a keyword to search ad copy for. |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many ads to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |

## Worked example

Lists the ads a company runs on LinkedIn.

#### A company name

One entry per ad.

Reads `string` → emits `SocialAd[]` · 1 in → 1 out

Input:

```
Microsoft
```

Output:

```
[
  { "platform": "linkedin", "id": "655",
    "advertiser": { "name": "Microsoft" },
    "text": "Build with us", "format": "Single Image Ad",
    "startedAt": "2026-03-01T00:00:00.000Z" }
]
```
