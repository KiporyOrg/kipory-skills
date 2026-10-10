<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `instagram.search` — Search Instagram posts

Find popular Instagram posts on a topic.

Reads the popular posts and reels Instagram shows a signed-out visitor for a topic, up to the bound you set, each with its caption, author, link and play count. It is Instagram's own pick for the topic, not every post that mentions the words.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialPost[]`
- **Reads:** One topic or phrase. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialPost`. Empty when nothing matches.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Instagram through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and an action makes one request per page it reads, at most 25. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `facebook.posts`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.search-profiles`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many posts to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |

## Worked example

Finds the posts Instagram shows for a topic.

#### A topic

One entry per post.

Reads `string` → emits `SocialPost[]` · 1 in → 1 out

Input:

```
basketball
```

Output:

```
[
  { "platform": "instagram", "id": "3892957342260916992",
    "url": "https://www.instagram.com/reel/DYGkBO3NfMA/",
    "author": { "handle": "lukaceo" }, "counts": { "views": 11993988 } }
]
```
