<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `tiktok.transcript` — Fetch a TikTok transcript

Get the words spoken in a TikTok video.

Reads the captions of one public TikTok video from its link, as text. A video with no captions returns an empty string, unless the fallback is on: it transcribes videos up to two minutes long, at a higher cost.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Reads:** One TikTok video link. Results are cached for a day. _(shape hint: `string`)_
- **Emits:** The transcript as text. An empty string when the video has no captions.
- **Softens these failures:** `vendor-refused`, `rate-limited`, `not-found`, `error` — the step still finishes with a warning, and a `failureSlot` on it then holds the code (`step-fields.md` §6).
- **Suggested input streams:** `source`
- **External dependency:** ScrapeCreators — Reads TikTok through ScrapeCreators. Uses a ScrapeCreators API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `scrapecreators` (vendor: ScrapeCreators); falls through to the platform's own key when no node holds one.
- **Charged as:** `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1 (up to 11 with `aiFallback`, only on a video it has to transcribe), and a step makes one request. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it.
- **Rate limit:** 120 per min in bucket `scrapecreators` — shared with `facebook.ad`, `facebook.ads`, `facebook.page`, `facebook.posts`, `google.ad`, `google.ads`, `instagram.comments`, `instagram.post`, `instagram.posts`, `instagram.profile`, `instagram.related-profiles`, `instagram.search`, `instagram.search-profiles`, `instagram.transcript`, `linkedin.ad`, `linkedin.ads`, `linkedin.company`, `linkedin.post`, `linkedin.posts`, `linkedin.profile`, `reddit.comments`, `reddit.post`, `reddit.posts`, `reddit.search`, `threads.post`, `threads.posts`, `threads.profile`, `threads.search`, `tiktok.ad`, `tiktok.ads`, `tiktok.audience`, `tiktok.comments`, `tiktok.followers`, `tiktok.following`, `tiktok.post`, `tiktok.posts`, `tiktok.profile`, `tiktok.search`, `x.posts`, `x.profile`, `x.transcript`, `youtube.comments`, `youtube.posts`, `youtube.search`, `youtube.transcript`
- **Queue:** 3 attempts, exponential from 2 s; waits up to 5 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `aiFallback` | boolean | no | `false` | Transcribe the audio when the video has no captions. Videos up to two minutes only. ⚠️ Costs 10 extra vendor credits on each video it has to transcribe. |
| `language` | string | no | — | Two-letter language code of the captions to fetch, like en or es. Unset takes the video's own. |

## Worked example

Pulls the spoken words of one TikTok video.

#### A video link

The captions joined into text.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://www.tiktok.com/@nasa/video/7301
```

Output:

```
Three, two, one — and liftoff. The rocket clears the tower and heads downrange …
```
