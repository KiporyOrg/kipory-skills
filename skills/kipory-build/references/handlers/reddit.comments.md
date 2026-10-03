<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `reddit.comments` — Fetch a Reddit post's comments

List the comments on a Reddit post.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialComment[]`
- **Reads:** One Reddit post link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialComment`. Empty when the post has no comments or cannot be read.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Reddit through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per 60000ms in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (default-input-slot-hash) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer | no | `20` | How many comments to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |

## Worked example

Lists the comments on one Reddit post.

Reads: list comments. Emits: comments.

#### A post link

One entry per top-level comment.

Reads `string` → emits `SocialComment[]` · 1 in → 1 out

Input:

```
https://www.reddit.com/r/space/comments/abc123/launch_thread/
```

Output:

```
[
  { "platform": "reddit", "text": "What a launch.",
    "author": { "handle": "stargazer" }, "likeCount": 31,
    "replies": [ { "text": "Agreed." } ] }
]
```
