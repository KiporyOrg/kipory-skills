<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `tiktok.profile` — Fetch a TikTok profile

Look up a TikTok account's details and numbers.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SocialProfile`
- **Reads:** One TikTok handle, with or without `@`, or a profile link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** A `SocialProfile`. A bare `{}` when the account does not exist.
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads TikTok through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Rate limit:** 120 per 60000ms in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2000ms; waits up to 300000ms; cache 86400000ms (default-input-slot-hash) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

_No operator-tunable config._

## Worked example

Looks up one public TikTok account from its handle.

Reads: look up account. Emits: profile.

#### A handle

The account's identity and its audience counts.

Reads `string` → emits `SocialProfile` · 1 in → 1 out

Input:

```
@nasa
```

Output:

```
{
  "platform":       "tiktok",
  "handle":         "nasa",
  "name":           "NASA",
  "url":            "https://www.tiktok.com/@nasa",
  "bio":            "Exploring the universe …",
  "verified":       true,
  "followerCount":  4100000,
  "followingCount": 74,
  "postCount":      2017
}
```
