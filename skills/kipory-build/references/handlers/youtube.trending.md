<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `youtube.trending` — Fetch trending channels

Fetch the channels behind a region's currently trending YouTube videos.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `YoutubeTrendingChannels`
- **Reads:** One two-letter region code, like `US` or `DE` — the same shape a user's profile region uses. _(shape hint: `string`)_
- **Emits:** A `YoutubeTrendingChannels`. One flat list however much was read, so a channel trending in two categories arrives once with a higher count. Empty when the region returns nothing.
- **Suggested input streams:** `regionCode`
- **External dependency:** YouTube Data API — Reads the trending chart from the YouTube Data API (KIPORY_YOUTUBE_API_KEY). Its quota is a shared daily unit budget across every YouTube handler.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `youtube` (vendor: YouTube Data API); falls through to the platform's own key when no node holds one.
- **Rate limit:** 60 per 60000ms in bucket `youtube` — shared with `youtube.channel`, `youtube.video`
- **Queue:** 2 attempts, exponential from 2000ms; waits up to 60000ms; cache 21600000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeChannelDetails` | boolean | no | — | Also look up each channel to add its declared country and subscriber count. Off by default. ⚠️ Costs two extra quota units per 50 channels. The country is self-declared and often missing — absent means unknown, never 'not from this region', and nothing here filters on it. |
| `maxResults` | integer | no | `50` | How many trending videos to read in total before reducing them to channels. A page holds 50. ⚠️ Each page past the first costs another quota unit. The chart stops when it runs out, so a high value permits a big read rather than guaranteeing one. |
| `videoCategoryIds` | string[] | no | — | Read only these video categories — for example news, or news and sport. Leave it empty for the whole chart. ⚠️ Each category is a separate call costing one quota unit. An unfiltered chart is mostly whatever is popular that day, so name the categories you want. Ids are region-specific. |

## Worked example

Reads a region's trending chart and returns the distinct channels behind it.

Reads: region. Emits: trending channels.

#### Israel

Local channels alongside global brands — the regional signal is real, but it is not pre-filtered.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
IL
```

Output:

```
{
  "regionCode": "IL",
  "channels": [
    { "channelId": "UCFmc1S3LEovsxhK73yi6_gg", "title": "עדן חסון - Eden Hason", "videoCount": 1 },
    { "channelId": "UCKw5dh0Q1Y_SvsW4nXnLjcg", "title": "איתי לוי - הערוץ הרשמי", "videoCount": 1 },
    { "channelId": "UCvC4D8onUfXzvjTOM-dBfEA", "title": "Marvel Entertainment",      "videoCount": 1 }
  ]
}
```

#### United States

A completely different set — the two regions share no channels, which is what makes this a country signal.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
US
```

Output:

```
{
  "regionCode": "US",
  "channels": [
    { "channelId": "UCzXwjTI6c6mVn6oui_p6oiw", "title": "SMii7Y",           "videoCount": 1 },
    { "channelId": "UC7yRILFFJ2QZCykymr8LPwA", "title": "New Rockstars",    "videoCount": 1 }
  ]
}
```

#### unknown region

No chart exists for that code. A warning is recorded, the result is empty, and the run continues.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
ZZ
```

Output:

```
{}
```
