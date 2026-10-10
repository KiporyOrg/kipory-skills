<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.trending` — Fetch trending YouTube channels

List the channels behind a region's trending YouTube videos.

Reads a region's trending chart and returns the distinct channels behind those videos. This is what is hot right now, not what is biggest — a catalogue has to accumulate it across runs.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `YoutubeTrendingChannels`
- **Reads:** One two-letter region code, like `US` or `DE` — the same shape a user's profile region uses. _(shape hint: `string`)_
- **Emits:** A `YoutubeTrendingChannels`. One flat list however much was read, so a channel trending in two categories arrives once with a higher count. Empty when the region returns nothing.
- **Softens these failures:** `rate-limited`, `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `regionCode`
- **External dependency:** YouTube Data API — Reads the trending chart from the YouTube Data API. Its quota is a shared daily unit budget across every YouTube function. Uses a YouTube Data API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `youtube` (vendor: YouTube Data API); falls through to the platform's own key when no node holds one.
- **Charged as:** `youtube/trending` (not charged). An action makes no vendor charge; it is charged its compute only.
- **Rate limit:** 60 per min in bucket `youtube` — shared with `youtube.channel`, `youtube.video`
- **Queue:** 2 attempts, exponential from 2 s; waits up to 1 min; cache 6 hours — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeChannelDetails` | boolean | no | — | Also look up each channel to add its declared country and subscriber count. Off by default. ⚠️ Costs two extra quota units per 50 channels. The country is self-declared and often missing — absent means unknown, never 'not from this region', and nothing here filters on it. |
| `maxResults` | integer, 1 to 200 | no | `50` | How many trending videos to read in total before reducing them to channels. A page holds 50. ⚠️ Each page past the first costs another quota unit. The chart stops when it runs out, so a high value permits a big read rather than guaranteeing one. |
| `videoCategoryIds` | string[], at least 1 item | no | — | Read only these video categories — for example news, or news and sport. Leave it empty for the whole chart. ⚠️ Each category is a separate call costing one quota unit. An unfiltered chart is mostly whatever is popular that day, so name the categories you want. Ids are region-specific. |

## Worked example

Reads a region's trending chart and returns the distinct channels behind it.

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
    { "platform": "youtube", "id": "UCFmc1S3LEovsxhK73yi6_gg", "name": "עדן חסון - Eden Hason", "trendingVideoCount": 1 },
    { "platform": "youtube", "id": "UCKw5dh0Q1Y_SvsW4nXnLjcg", "name": "איתי לוי - הערוץ הרשמי", "trendingVideoCount": 1 },
    { "platform": "youtube", "id": "UCvC4D8onUfXzvjTOM-dBfEA", "name": "Marvel Entertainment", "trendingVideoCount": 1 }
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
    { "platform": "youtube", "id": "UCzXwjTI6c6mVn6oui_p6oiw", "name": "SMii7Y", "trendingVideoCount": 1 },
    { "platform": "youtube", "id": "UC7yRILFFJ2QZCykymr8LPwA", "name": "New Rockstars", "trendingVideoCount": 1 }
  ]
}
```

#### Unknown region

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
