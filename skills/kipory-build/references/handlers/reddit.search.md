<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `reddit.search` — Search Reddit posts

Find Reddit posts that match a search.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialPost[]`
- **Reads:** One search phrase. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialPost`. Empty when nothing matches.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Reddit through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per 60000ms in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (default-input-slot-hash) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer | no | `20` | How many posts to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |
| `sort` | `relevance` \| `new` \| `top` \| `comment_count` | no | `"relevance"` | How to order the matches. |
| `timeframe` | `all` \| `day` \| `week` \| `month` \| `year` | no | `"all"` | How far back to search. |

## Worked example

Finds Reddit posts that match a phrase.

Reads: search posts. Emits: posts.

#### A phrase

One entry per matching post.

Reads `string` → emits `SocialPost[]` · 1 in → 1 out

Input:

```
rocket launch
```

Output:

```
[
  { "platform": "reddit", "id": "abc123", "title": "Launch thread",
    "counts": { "likes": 120, "comments": 44 },
    "data": { "subreddit": "space" } }
]
```
