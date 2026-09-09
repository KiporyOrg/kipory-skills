<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `image.resize` — Resize an image

Resize an image and return the smaller file.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `file` → `file`
- **Reads:** One image file. A non-image input throws, so route those elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A file holding the resized image. A retry on the same item reuses the previous encode. An empty input gives an empty file back.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 120000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `autoOrient` | boolean | no | `true` | Apply the rotation recorded in the file's metadata before resizing. Phone photos usually need this. |
| `fit` | `inside` \| `cover` \| `contain` | no | `"inside"` | How the image meets the box. `inside` keeps the aspect ratio, `cover` crops to fill, `contain` letterboxes to fill. |
| `format` | `preserve` \| `jpeg` \| `webp` \| `png` | no | `"preserve"` | What to encode the output as. `preserve` keeps the input's format where it can, and otherwise converts. |
| `maxHeight` | integer | no | `256` | Maximum output height in pixels. |
| `maxInputBytes` | integer | no | `50000000` | Hard cap on the input file size before decoding. Prevents OOM on hostile or accidental huge uploads. |
| `maxInputPixels` | integer | no | `50000000` | How big a source image may be before it is refused, counted as width times height. ⚠️ It bails BEFORE decoding, which is the point — raise it for real panoramas, lower it to keep a hostile file from being opened. |
| `maxWidth` | integer | no | `256` | Maximum output width in pixels. |
| `quality` | integer | no | `80` | Encoder quality (1-100). Applies to jpeg + webp output formats; ignored for png (lossless). |

## Worked example

The image is rotated if its metadata says so, resized to fit the box, and re-encoded. It never scales up.

Reads: decode + resize. Emits: attachFile → FileRef.

#### JPEG photo → 256px

Default config (256×256 box, fit:inside, format:preserve, quality:80). The input keeps its JPEG encoding and shrinks proportionally.

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
vacation-2026-04-12.jpg (image/jpeg)
```

Output:

```
{
  "key": "files/user/usr_ck.../2026/05/vacation-2026-04-12-resized.jpg",
  "name": "vacation-2026-04-12-resized.jpg",
  "mime": "image/jpeg"
}
```

#### PNG screenshot → WebP

`format: webp` forces a WebP re-encode (smaller bytes than the source PNG at equal visual quality).

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
screenshot-2026-05-09.png (image/png)
```

Output:

```
{
  "key": "files/user/usr_ck.../2026/05/screenshot-2026-05-09-resized.webp",
  "name": "screenshot-2026-05-09-resized.webp",
  "mime": "image/webp"
}
```

#### non-image (skipped)

With a mime condition wired upstream the step is skipped. Without one it throws, so the missing routing shows up.

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
report.pdf (application/pdf)
```

Output:

```
(skipped — condition gate filtered the row before run())
```
