<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `audio.metadata` — Extract audio metadata

Extract duration, codec, and tag metadata from an audio file.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `file` → `AudioMetadata`
- **Reads:** One audio file. A non-audio mime fails rather than being guessed at. _(shape hint: `file`)_
- **Emits:** An `AudioMetadata`. Every field is independently optional, so a file with no tags still returns its length and format. An empty object means nothing was readable.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 60000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `duration` | boolean | no | `true` | Scan further into the file for its length when the header does not carry one. It costs a little more work on those formats. |

## Worked example

An audio file's header and tags, read in one pass. The variants show a tagged track, an untagged recording, and an unreadable file.

Reads: music-metadata.parseBuffer. Emits: project to AudioMetadata.

#### podcast episode

MP3 with ID3v2 tags. Title / artist / album / genre / year populate alongside the codec and bitrate.

Reads `file` → emits `AudioMetadata` · 1 in → 1 out

Input:

```
podcasts/exponent-ep-203.mp3 (audio/mpeg)
```

Output:

```
{
  "durationSec": 4521.8,
  "audioTitle": "Ep. 203 — The Aggregator's Dilemma",
  "audioArtist": "Ben Thompson",
  "audioAlbum": "Exponent",
  "audioGenre": "Podcast",
  "audioYear": 2026,
  "audioTrackNumber": 203,
  "bitrate": 128000,
  "sampleRate": 44100,
  "channelCount": 2,
  "codec": "MPEG 1 Layer 3",
  "container": "MPEG"
}
```

#### voice memo

Tagless m4a from iOS Voice Memos — no ID3 tags. Only the technical fields survive.

Reads `file` → emits `AudioMetadata` · 1 in → 1 out

Input:

```
voice-memos/2026-05-12-grocery-list.m4a (audio/mp4)
```

Output:

```
{
  "durationSec": 18.4,
  "bitrate": 64000,
  "sampleRate": 44100,
  "channelCount": 1,
  "codec": "MPEG-4/AAC",
  "container": "M4A/isom/mp42"
}
```

#### corrupt file

Unparseable bytes (truncated upload, unknown codec). `music-metadata` rejects; we degrade to the empty `AudioMetadata` sentinel.

Reads `file` → emits `AudioMetadata` · 1 in → 1 out

Input:

```
uploads/broken.mp3 (audio/mpeg)
```

Output:

```
{}
```
