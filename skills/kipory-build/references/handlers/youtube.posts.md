<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.posts` — Fetch a YouTube channel's videos

List the videos or shorts a YouTube channel has published.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialPost[]`
- **Reads:** One YouTube channel handle (with or without `@`), channel id (`UC…`), or a `/@handle` or `/channel/UC…` link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialPost`. Empty when the channel has published nothing or cannot be read.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads YouTube through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per 60000ms in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (default-input-slot-hash) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `content` | `videos` \| `shorts` | no | `"videos"` | Which of the channel's uploads to list. |
| `maxItems` | integer | no | `20` | How many videos to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |
| `sort` | `latest` \| `popular` | no | `"latest"` | Newest first, or most viewed first. |

## Worked example

Lists a YouTube channel's recent videos.

Reads: list videos. Emits: videos.

#### A handle

One entry per video, newest first.

Reads `string` → emits `SocialPost[]` · 1 in → 1 out

Input:

```
@NASA
```

Output:

```
[
  { "platform": "youtube", "id": "dQw4w9WgXcQ", "title": "Launch day",
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "durationSec": 213, "counts": { "views": 1200 } }
]
```
