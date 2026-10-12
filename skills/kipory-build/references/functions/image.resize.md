<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `image.resize` — Resize an image

Make an image smaller and return the new file.

Fits within the maximum width and height. A file that is not an image fails, so check the type first.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **Not undone when a run fails:** `file` — The file's bytes are stored while the action runs. A later attempt of the run stores them again under its own key; a file no record keeps is removed by the platform later. Doing it twice is not harmless; a failed run lists it in `closing.unstagedEffects`.
- **I/O:** `file` → `file`
- **Also found as:** thumbnail, shrink, smaller image, compress image
- **Reads:** One image file. A non-image input throws, so route those elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A file holding the resized image. A retry on the same item reuses the previous encode. An empty input gives an empty file back.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 2 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `autoOrient` | boolean | no | `true` | Apply the photo's recorded rotation before resizing. |
| `fit` | `inside` \| `cover` \| `contain` | no | `"inside"` | How the image fits the box: keep ratio, crop, or letterbox. |
| `format` | `preserve` \| `jpeg` \| `webp` \| `png` | no | `"preserve"` | Output format; `preserve` keeps the input's format where it can. |
| `maxHeight` | integer, more than 0 | no | `256` | Maximum output height in pixels. |
| `maxInputBytes` | integer, more than 0 | no | `50000000` | Largest input file to accept, in bytes. |
| `maxInputPixels` | integer, more than 0 | no | `50000000` | Largest source image allowed, as width times height. ⚠️ Checked before decoding; raise it for real panoramas, lower it to block hostile files. |
| `maxWidth` | integer, more than 0 | no | `256` | Maximum output width in pixels. |
| `quality` | integer, 1 to 100 | no | `80` | Quality from 1 to 100 for jpeg and webp; png ignores it. |

## Worked example

The image is rotated if its metadata says so, resized to fit the box, and re-encoded. It never scales up.

#### A photo

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

#### A screenshot

Re-encoded as WebP: smaller bytes than the source PNG at equal visual quality.

Reads `file` → emits `file` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "format": "webp"
}
```

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

#### Not an image

With a mime condition wired upstream the action is skipped. Without one it throws, so the missing routing shows up.

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
report.pdf (application/pdf)
```

Output:

```
(skipped — condition gate filtered the row before run())
```
