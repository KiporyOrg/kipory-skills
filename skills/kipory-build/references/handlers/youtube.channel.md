<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.channel` — Fetch a YouTube channel

Look up a YouTube channel's details and numbers.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `YoutubeChannel`
- **Reads:** One string naming a channel — a full URL, a handle, or a raw channel id. All three normalise to the same cache entry. _(shape hint: `string`)_
- **Emits:** A `YoutubeChannel`. Which fields arrive depends on the parts you asked for, and every one is optional. Empty when it could not be read — missing, private, or refused.
- **Suggested input streams:** `currentUrl`
- **External dependency:** YouTube Data API — Reads channel metadata and statistics from the YouTube Data API. Its quota is a shared daily unit budget across every YouTube handler. Uses a YouTube Data API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `youtube` (vendor: YouTube Data API); falls through to the platform's own key when no node holds one.
- **Rate limit:** 60 per min in bucket `youtube` — shared with `youtube.trending`, `youtube.video`
- **Queue:** 2 attempts, exponential from 2 s; waits up to 1 min; cache 7 days — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `listUploads` | boolean | no | `false` | Also list the channel's most recent uploads, and set lastPostAt to the newest. ⚠️ Costs one extra quota unit, because it takes a second call to the uploads playlist. |
| `parts` | string[], at least 1 item | no | `["snippet","statistics"]` | Which parts of the channel to fetch. Snippet and statistics by default. ⚠️ Each part costs one quota unit per call, against a daily pool. Branding and localizations are rarely read and make the cached row much bigger. |
| `uploadsLimit` | integer, 1 to 50 | no | `20` | How many recent uploads to list (1–50, single playlistItems page). Only used when listUploads is on. |

## Worked example

Turns a channel URL, handle, or id into the channel's metadata and stats.

#### From a link

Default `parts: ['snippet','statistics']` — the shared account fields plus the view count.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
https://www.youtube.com/@mkbhd
```

Output:

```
{
  "platform": "youtube",
  "id": "UCBJycsmduvYEL83R_U4JriQ",
  "url": "https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ",
  "name": "Marques Brownlee",
  "bio": "MKBHD: Quality Tech Videos",
  "handle": "mkbhd",
  "createdAt": "2008-03-21T15:24:33Z",
  "country": "US",
  "avatarUrl": "https://yt3.ggpht.com/.../high.jpg",
  "followerCount": 19500000,
  "postCount":     1750,
  "viewCount":     4567890123,
  "hiddenSubscriberCount": false
}
```

#### From a handle

Same channel resolved from a bare handle — produces the identical cached row as the URL variant.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@mkbhd
```

Output:

```
{
  "platform": "youtube",
  "id": "UCBJycsmduvYEL83R_U4JriQ",
  "name": "Marques Brownlee",
  "handle": "mkbhd",
  ...
}
```

#### With recent uploads

A second call fills `uploads[]` with the channel's most recent videos, and `lastPostAt` with the newest one's time.

Reads `string` → emits `string` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "listUploads": true
}
```

Input:

```
https://www.youtube.com/@mkbhd
```

Output:

```
{
  "platform": "youtube",
  "id": "UCBJycsmduvYEL83R_U4JriQ",
  "name": "Marques Brownlee",
  "uploadsPlaylistId": "UUBJycsmduvYEL83R_U4JriQ",
  "lastPostAt": "2026-07-18T14:00:07.000Z",
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

#### No such channel

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
