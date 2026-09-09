<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `audio.transcribe` — Transcribe audio

Transcribe an audio file into text.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `file` → `string`
- **Reads:** One audio file. A non-audio mime fails, and a file over the size cap is refused before anything is sent. _(shape hint: `file`)_
- **Emits:** The spoken words as plain text. Empty when there is no file. The same file, model and language reuse the previous transcript.
- **Suggested input streams:** `currentFile`
- **External dependency:** Model provider — Whichever provider hosts the transcription model this step is set to. `whisper-1` is the seed, not the contract — the call goes through the `@kipory/ai-provider` chokepoint and the key is resolved per model.
- **Rate limit:** 50 per 60000ms in bucket `audio.transcribe`
- **Queue:** 2 attempts, exponential from 2000ms; waits up to 600000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `language` | string | no | — | ISO 639-1 language hint (e.g. 'en', 'es'). Auto-detect when omitted; setting explicitly improves accuracy on short clips. |
| `maxBytes` | integer | no | `25000000` | Reject files larger than this before calling the provider. Default 25 MB matches OpenAI's hard cap on Whisper requests; tune down for cost ceilings. |
| `model` | string | no | `""` | Which model transcribes. Leave it empty to use the project's transcription setting. |

## Worked example

Audio in, text out. Video has to be converted first. A missing file or a non-audio one gives an empty result.

Reads: read the file. Emits: transcribe.

#### voice memo

A short personal recording. The language is detected for you.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
memos/2026-05-09-followup.m4a (audio/mp4)
```

Output:

```
Quick note before I forget — call Sasha back about the Tuesday slot,
ping the design team about the new onboarding flow, and book the
flight to Berlin for the conference. That's it.
```

#### podcast clip

A recording with two speakers. Both are transcribed; telling them apart is a later step's job.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
podcasts/episode-42-clip.mp3 (audio/mpeg)
```

Output:

```
So the question I keep coming back to is: are we measuring the
right thing? Because if you optimize for engagement and your engaged
users are the addicted ones, you've built a slot machine, not a
product. Right, and that's the trap a lot of teams fall into early...
```
