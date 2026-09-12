<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `youtube.video` — Fetch a YouTube video

Fetch metadata, stats, and thumbnail details for a YouTube video.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `YoutubeVideo`
- **Reads:** One string naming a video — a full URL in any of its forms, or a bare video id. Anything unrecognisable is dropped without a call. _(shape hint: `string`)_
- **Emits:** A `YoutubeVideo`. Which fields arrive depends on the parts you asked for, and every one is optional. Empty when it could not be read — missing, private, or refused.
- **Suggested input streams:** `currentUrl`
- **External dependency:** YouTube Data API — Reads video metadata and statistics from the YouTube Data API (KIPORY_YOUTUBE_API_KEY). Its quota is a shared daily unit budget across every YouTube handler.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `youtube` (vendor: YouTube Data API); falls through to the platform's own key when no node holds one.
- **Rate limit:** 60 per 60000ms in bucket `youtube` — shared with `youtube.channel`, `youtube.trending`
- **Queue:** 2 attempts, exponential from 2000ms; waits up to 60000ms; cache 604800000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `parts` | string[] | no | `["snippet","contentDetails","statistics"]` | Which parts of the video to fetch. Snippet, content details and statistics by default — enough for a cheap check. ⚠️ Each part costs one quota unit per call, against a daily pool. |

## Worked example

Turns a video URL or id into its metadata and stats — cheap enough to check before paying for a transcript.

Reads: parse + lookup. Emits: map fields.

#### by URL (snippet + contentDetails + statistics)

The default parts: identity, duration, whether captions exist, view count, and whether it is live.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Output:

```
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "channelName": "Rick Astley",
  "channelId": "UCuAXFkgsw1L7xaCfnd5JJOw",
  "thumbnails": {
    "default": "https://i.ytimg.com/vi/dQw4w9WgXcQ/default.jpg",
    "medium":  "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    "high":    "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "maxres":  "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
  },
  "publishedAt":  "2009-10-25T06:57:33Z",
  "durationSec":  213,
  "hasCaptions":  true,
  "viewCount":    1500000000,
  "isLive":       false,
  "isShort":      false
}
```

#### by bare videoId

Same video resolved from an 11-char bare videoId — produces the identical cached row as the URL variant.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
dQw4w9WgXcQ
```

Output:

```
{
  "videoId": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
  "durationSec": 213,
  "hasCaptions": true,
  ...
}
```

#### no such video

No such video — deleted, private, or a typo. The result is empty, and that empty result is cached.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
deletedAbcD
```

Output:

```
{}
```
