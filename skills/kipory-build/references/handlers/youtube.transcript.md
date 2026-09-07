<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `youtube.transcript` — Fetch a YouTube transcript

Fetch the transcript for a YouTube video.

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `string`
- **Reads:** One bare video id. A full URL is refused — parse it with `youtube.video` first. Anything else is dropped without a call. _(shape hint: `string`)_
- **Emits:** The transcript as text — plain prose, or lines prefixed with timestamps when you ask for them. An empty string when the video has no captions.
- **Suggested input streams:** `youtubeVideoId`
- **External dependency:** Supadata — Pulls YouTube transcripts via Supadata (KIPORY_SUPADATA_API_KEY).
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `supadata` (vendor: Supadata); falls through to the platform's own key when no node holds one.
- **Rate limit:** 30 per 60000ms in bucket `supadata`
- **Queue:** 2 attempts, exponential from 2000ms; waits up to 120000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeTimestamps` | boolean | no | `false` | When true, prefix each line with its start timestamp; otherwise return prose. |
| `lang` | string | no | — | ISO language code (e.g. 'en', 'es'). Unset = the provider picks the default track. |

## Worked example

Pulls a video's transcript from its bare id. Wire the id from a `youtube.video` step.

Reads: fetch transcript. Emits: join segments.

#### prose

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

#### timestamped

With `includeTimestamps: true`: each segment prefixed with its start offset.

Reads `string` → emits `string` · 1 in → 1 out

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

#### no transcript

No captions on this video, so the result is an empty string. That empty result is cached.

Reads `string` → emits `string` · 1 in → (empty)

Input:

```
privateAbc1
```

Output:

```

```
