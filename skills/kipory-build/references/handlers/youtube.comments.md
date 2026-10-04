<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.comments` — Fetch a YouTube video's comments

List the comments on a YouTube video.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialComment[]`
- **Reads:** One YouTube video link, or a bare video id. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialComment`. Empty when comments are off or the video cannot be read.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads YouTube through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many comments to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |
| `sort` | `top` \| `newest` | no | `"top"` | Most liked first, or newest first. |

## Worked example

Lists the comments on one YouTube video.

#### A video link

One entry per comment.

Reads `string` → emits `SocialComment[]` · 1 in → 1 out

Input:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Output:

```
[
  { "platform": "youtube", "text": "What a launch.",
    "author": { "handle": "StarGazer" },
    "likeCount": 31, "replyCount": 2 }
]
```
