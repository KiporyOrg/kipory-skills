<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `image.decode-qr` — Decode QR codes

Decode any QR codes found in an image and return their contents.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `file` → `string[]`
- **Reads:** One image — JPEG, PNG, WebP, HEIC, TIFF and the rest. Something that is not an image comes back empty rather than failing the step. _(shape hint: `file`)_
- **Emits:** What a QR code in the image encodes — web links only, unless you turn `requireUrl` off. Empty when there was no code or the image could not be read.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 60000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `requireUrl` | boolean | no | `true` | Keep only payloads that are web links. A QR code can also hold wifi details, a contact card, or plain text. |

## Worked example

Reads any QR codes in an image and returns what they say.

Reads: an image. Emits: the decoded text.

#### one code

The image carries a single QR code, and the text encoded in it comes back.

Reads `file` → emits `string[]` · 1 in → 1 out

Input:

```
ticket.png (image/png)
```

Output:

```
["https://example.com/t/9f2a1c"]
```

#### no code in the image

Nothing in the image decodes, so an empty list comes back rather than an error.

Reads `file` → emits `string[]` · 1 in → 1 out

Input:

```
receipt-photo.jpg (image/jpeg)
```

Output:

```
[]
```
