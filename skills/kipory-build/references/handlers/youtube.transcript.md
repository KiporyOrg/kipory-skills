<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.transcript` — Fetch a YouTube transcript

Get the words spoken in a YouTube video.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Reads:** One bare video id. A full URL is refused — parse it with `youtube.video` first. Anything else is dropped without a call. _(shape hint: `string`)_
- **Emits:** The transcript as text — plain prose, or lines prefixed with timestamps when you ask for them. An empty string when the video has no captions.
- **Suggested input streams:** `youtubeVideoId`
- **External dependency:** Supadata or ScrapeCreators — Each step picks its vendor (`provider`): Supadata, the default, or ScrapeCreators. Each vendor uses its own API key: the project's own, stored in its secrets, or Kipory's. With `fallback` on — the default — a vendor that fails hands the video to the other; a video with no captions is an answer and is not retried elsewhere, and a key the chosen vendor refuses fails the step.
- **Credential:** one per vendor the step's `provider` names, each resolved from the secrets vault and falling through to the platform's own key when no node holds one: `supadata` (the default) — type `api_key`, purpose `supadata`; `scrapecreators` — type `api_key`, purpose `scrapecreators`.
- **Charged as:** with `provider: "supadata"` (the default): `supadata/transcript` per call · with `provider: "scrapecreators"`: `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and a step makes one request. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; a step spending a stored vendor key is not charged it. A step answered by another vendor through `fallback` is charged that vendor's rows, not its chosen one's.
- **Rate limit:** 30 per min in bucket `supadata`
- **Queue:** 2 attempts, exponential from 2 s; waits up to 2 min; cache 1 day — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `fallback` | boolean | no | `true` | If the chosen vendor errors, is rate-limited or has no key, try the others in turn. An empty answer does not fall back. ⚠️ A fallback is billed by the vendor that answered — a step whose chosen vendor runs on your own key can be charged for the other vendor on the platform's. |
| `includeTimestamps` | boolean | no | `false` | When true, prefix each line with its start timestamp; otherwise return prose. |
| `lang` | string | no | — | ISO language code (e.g. 'en', 'es'). Unset = the provider picks the default track. |
| `provider` | `supadata` \| `scrapecreators` | no | `"supadata"` | Which vendor does the work: supadata or scrapecreators. Each spends its own key and bills at its own rate. "supadata" when left unset. |

## Worked example

Pulls a video's transcript from its bare id. Wire the id from a `youtube.video` step.

#### As plain text

Default: transcript joined into flowing prose (one space between segments).

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
dQw4w9WgXcQ
```

Output:

```
Hey everyone welcome back to the channel. Today we're diving into something I've been meaning to cover for a while which is how the new ingest pipeline actually handles back-pressure. Before we get into the details I want to thank everyone who suggested this topic in the comments last week. Let's start with the basic problem...
```

#### With timestamps

The same video, each segment prefixed with its start offset.

Reads `string` → emits `string` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "includeTimestamps": true
}
```

Input:

```
dQw4w9WgXcQ
```

Output:

```
[00:00] Hey everyone welcome back to the channel.
[00:04] Today we're diving into something I've been
[00:07] meaning to cover for a while which is how
[00:11] the new ingest pipeline actually handles
[00:14] back-pressure. Before we get into the details
[00:18] I want to thank everyone who suggested this
```

#### No captions

No captions on this video, so the result is an empty string. That empty result is cached.

Reads `string` → emits `string` · 1 in → (empty)

Input:

```
privateAbc1
```

Output:

```

```
