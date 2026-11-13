<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `youtube.transcript` — Fetch a YouTube transcript

Get the words spoken in a YouTube video.

Takes an 11-character video id, not a link. Reads automatic and manual captions.

- **Origin:** `ability`
- **Group:** sources · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Also found as:** youtube captions, subtitles, what was said
- **Reads:** One bare video id. A full URL is refused — parse it with `youtube.video` first. Anything else is dropped without a call. _(shape hint: `string`)_
- **Emits:** The transcript as text — plain prose, or lines prefixed with timestamps when you ask for them. An empty string when the video has no captions.
- **Softens these failures:** `rate-limited`, `not-found`, `error` — the step does not fail: the run's warnings carry the code with the step's key, and the step may give nothing (`checking.md` §6).
- **Inputs (`with`):** `video`
- **External dependency:** Supadata or ScrapeCreators — Each step may name its vendor (`vendor.use`): Supadata, the default, or ScrapeCreators, and say when it may move to the other (`vendor.switch`, never by default). Each vendor uses its own API key: the project's own, stored in its secrets, or Kipory's. A video with no captions is an answer and is not retried elsewhere, and a key of your own the chosen vendor refuses fails the step.
- **Credential:** one per vendor the step's `vendor.use` names, each resolved from the secrets vault and falling through to Kipory's own accounts when no node holds one: `supadata` (the default) — type `api_key`, purpose `supadata`; `scrapecreators` — type `api_key`, purpose `scrapecreators`.
- **Vendor settings:** a step may name its vendor in `vendor.use` (`supadata`, the default; `scrapecreators`) and say when it may move to the other in `vendor.switch` (`never`, the default; `when-kipory-account-fails`; `when-vendor-fails`) — `action-fields.md` §1. `onTransient` is refused here: this function's vendors are not routed by the platform.
- **Charged as:** with `vendor.use: "supadata"` (the default): `supadata/transcript` per call · with `vendor.use: "scrapecreators"`: `scrapecreators/credit` per item — one of the vendor's own credits, as each response reports them — an answer served from the vendor's cache takes none; a request takes 1, and an action makes one request. Each is a row of `GET /v1/nodes/{nodeId}/vendor-prices`, which gives its price in credits and any included units or floor; an action spending a stored vendor key is not charged it. An action its `vendor.switch` moved to another vendor is charged that vendor's rows, not its chosen one's.
- **Rate limit:** 30 per min in bucket `supadata`, counted per project
- **Queue:** 2 attempts, exponential from 2 s; waits up to 2 min; cache 1 day — the function's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeTimestamps` | boolean | no | `false` | When true, prefix each line with its start timestamp; otherwise return prose. |
| `lang` | string | no | — | Caption language code, like `en`; empty takes the default track. |

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

Step settings (`with`):

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
