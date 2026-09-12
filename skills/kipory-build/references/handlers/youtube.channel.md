<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `youtube.channel` — Fetch a YouTube channel

Fetch metadata and stats for a YouTube channel.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `YoutubeChannel`
- **Reads:** One string naming a channel — a full URL, a handle, or a raw channel id. All three normalise to the same cache entry. _(shape hint: `string`)_
- **Emits:** A `YoutubeChannel`. Which fields arrive depends on the parts you asked for, and every one is optional. Empty when it could not be read — missing, private, or refused.
- **Suggested input streams:** `currentUrl`
- **External dependency:** YouTube Data API — Reads channel metadata and statistics from the YouTube Data API (KIPORY_YOUTUBE_API_KEY). Its quota is a shared daily unit budget across every YouTube handler.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `youtube` (vendor: YouTube Data API); falls through to the platform's own key when no node holds one.
- **Rate limit:** 60 per 60000ms in bucket `youtube` — shared with `youtube.trending`, `youtube.video`
- **Queue:** 2 attempts, exponential from 2000ms; waits up to 60000ms; cache 604800000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `cacheTtlMinutes` | integer | no | — | How long to reuse a fetch of this channel, in minutes. Leave it unset for the 7-day default. ⚠️ A sweep that lists uploads needs a short value near its poll interval, or every sweep sees the same uploads. A statistics read is fine on the default. |
| `listUploads` | boolean | no | `false` | Also list the channel's most recent uploads. ⚠️ Costs one extra quota unit, because it takes a second call to the uploads playlist. |
| `parts` | string[] | no | `["snippet","statistics"]` | Which parts of the channel to fetch. Snippet and statistics by default. ⚠️ Each part costs one quota unit per call, against a daily pool. Branding and localizations are rarely read and make the cached row much bigger. |
| `uploadsLimit` | integer | no | `20` | How many recent uploads to list (1–50, single playlistItems page). Only used when listUploads is on. |

## Worked example

Turns a channel URL, handle, or id into the channel's metadata and stats.

Reads: parse + lookup. Emits: map fields.

#### by URL (snippet + statistics)

Default `parts: ['snippet','statistics']` — identity fields + view / subscriber / video counts (parsed from API strings to JS numbers).

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://www.youtube.com/@mkbhd
```

Output:

```
{
  "channelId": "UCBJycsmduvYEL83R_U4JriQ",
  "title": "Marques Brownlee",
  "description": "MKBHD: Quality Tech Videos",
  "handle": "mkbhd",
  "publishedAt": "2008-03-21T15:24:33Z",
  "country": "US",
  "thumbnails": {
    "default": "https://yt3.ggpht.com/.../default.jpg",
    "medium":  "https://yt3.ggpht.com/.../medium.jpg",
    "high":    "https://yt3.ggpht.com/.../high.jpg"
  },
  "viewCount":       4567890123,
  "subscriberCount": 19500000,
  "hiddenSubscriberCount": false,
  "videoCount":      1750
}
```

#### by bare handle

Same channel resolved from a bare handle — produces the identical cached row as the URL variant.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@mkbhd
```

Output:

```
{
  "channelId": "UCBJycsmduvYEL83R_U4JriQ",
  "title": "Marques Brownlee",
  "handle": "mkbhd",
  ...
}
```

#### with uploads listing

Listing uploads adds a second call and fills `uploads[]` with the most recent ones.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://www.youtube.com/@mkbhd
```

Output:

```
{
  "channelId": "UCBJycsmduvYEL83R_U4JriQ",
  "title": "Marques Brownlee",
  "uploadsPlaylistId": "UUBJycsmduvYEL83R_U4JriQ",
  ...
  "uploads": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "The Newest Flagship, Reviewed",
      "publishedAt": "2026-07-18T14:00:07Z",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    ...
  ]
}
```

#### no such channel

No such channel. The result is empty, and the empty result is cached so a re-run costs nothing.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@channel-that-does-not-exist
```

Output:

```
{}
```
