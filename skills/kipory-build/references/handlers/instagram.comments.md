<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `instagram.comments` — Fetch an Instagram post's comments

List the comments on an Instagram post or reel.

Reads the comments on one public Instagram post or reel from its link, up to the bound you set. Each comes back with its text, author, time and like count. Replies are left out unless you ask for them, which costs far more per request.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialComment[]`
- **Reads:** One Instagram post or reel link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialComment`. Empty when the post has no comments or cannot be read.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the step still finishes with a warning, and a `failureSlot` on it then holds the code (`step-fields.md` §6).
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Instagram through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1 (15 with `includeReplies`), and a step makes one request per page it reads, at most 25. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `facebook.posts`, `google.ad`, `google.ads`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeReplies` | boolean | no | `false` | Also return the first replies under each comment. Slower. ⚠️ Costs 15 vendor credits per request instead of 1, whether or not any replies come back. |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many comments to return, up to 100. Each page read is one request, and a list stops after 25 pages. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |

## Worked example

Lists the comments on one Instagram post.

#### A post link

One entry per comment.

Reads `string` → emits `SocialComment[]` · 1 in → 1 out

Input:

```
https://www.instagram.com/p/CxYz/
```

Output:

```
[
  { "platform": "instagram", "text": "Stunning",
    "author": { "handle": "fan" }, "likeCount": 4, "replyCount": 0 }
]
```
