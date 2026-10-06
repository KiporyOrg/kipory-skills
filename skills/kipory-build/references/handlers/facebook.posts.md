<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `facebook.posts` — Fetch a Facebook page's posts

List the recent posts a public Facebook page has published.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialPost[]`
- **Reads:** One Facebook page handle, with or without `@`, or a page link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialPost`, newest first. Empty when the page has posted nothing or cannot be read.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Facebook through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and a step makes one request per page it reads, at most 25. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer, more than 0, at most 30 | no | `3` | How many posts to return, up to 30. Posts arrive 3 to a paid request, so 3 is one request and 30 is ten. ⚠️ Posts arrive three to a paid request, so every three posts cost one more request. |

## Worked example

Lists a public Facebook page's most recent posts.

#### A page link

One entry per post, newest first.

Reads `string` → emits `SocialPost[]` · 1 in → 1 out

Input:

```
https://www.facebook.com/harbourcycles
```

Output:

```
[
  { "platform": "facebook", "id": "1204545088344463",
    "text": "Open late this Friday",
    "url": "https://www.facebook.com/harbourcycles/posts/1204545088344463",
    "postedAt": "2024-12-18T20:19:30.000Z",
    "counts": { "likes": 133, "comments": 12 } }
]
```
