<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.comments` — Fetch a YouTube video's comments

List the comments on a YouTube video.

Top-level comments, most liked or newest first. Each has its text, author, likes, reply count and rough time.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialComment[]`
- **Also found as:** youtube replies, video comments, comment section
- **Reads:** One YouTube video link, or a bare video id. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialComment`. Empty when comments are off or the video cannot be read.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads YouTube through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and an action makes one request per page it reads, at most 25. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators`, counted per project — shared with `facebook.ads`, `facebook.page`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.search`, `instagram.search-profiles`, `reddit.search`, `tiktok.comments`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `x.posts`, `x.profile`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer, more than 0, at most 100 | no | `20` | How many comments to return, up to 100. ⚠️ Each page read is a separate paid request, so a higher bound costs more. |
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
