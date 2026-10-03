<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `threads.posts` — Fetch a Threads account's posts

List the recent posts a Threads account has published.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialPost[]`
- **Reads:** One Threads handle, with or without `@`, or a profile link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A list of `SocialPost`, in the order the platform lists them. Empty when the account has posted nothing or cannot be read.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads Threads through ScrapeCreators (KIPORY_SCRAPECREATORS_API_KEY), or the project's own key for it.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per 60000ms in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (default-input-slot-hash) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxItems` | integer | no | `20` | The most posts to return, up to 30. This read is one request whatever the bound. |

## Worked example

Lists a public Threads account's recent posts.

Reads: list posts. Emits: posts.

#### A handle

One entry per post, in the order the platform lists them.

Reads `string` → emits `SocialPost[]` · 1 in → 1 out

Input:

```
@zuck
```

Output:

```
[
  { "platform": "threads", "id": "3400", "text": "Shipping today",
    "author": { "handle": "zuck", "verified": true },
    "counts": { "likes": 900, "comments": 40 } }
]
```
