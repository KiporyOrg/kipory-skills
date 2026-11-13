<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `instagram.transcript` — Fetch an Instagram transcript

Get the words spoken in an Instagram reel or video post.

Works on clips up to two minutes long. No speech returns an empty string.

- **Origin:** `ability`
- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Also found as:** reel transcript, instagram captions, ig transcript
- **Reads:** One Instagram reel or video post link, up to two minutes of video. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** The transcript as text. An empty string when nothing is said; nothing when the post cannot be read.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the step does not fail: the run's warnings carry the code with the step's key, and the step may give nothing (`checking.md` §6).
- **Inputs (`with`):** `source`
- **External dependency:** ScrapeCreators — Reads Instagram through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and an action makes one request. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators`, counted per project — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `facebook.posts`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.search`, `instagram.search-profiles`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `tiktok.transcript`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the function's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

_No operator-tunable config._

## Worked example

Pulls the spoken words of one Instagram reel.

#### A reel link

The words spoken, as text.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://www.instagram.com/reel/CxYz/
```

Output:

```
Welcome back. Today we are looking at the new telescope images …
```
