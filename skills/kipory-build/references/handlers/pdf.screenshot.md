<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `pdf.screenshot` — Save a PDF page as an image

Save one page of a PDF as an image.

Draws one page of a PDF as a PNG or JPEG image. Put a `slotStartsWith currentFile.mime application/pdf` condition or a `flow.dispatch` on the file's type before it, so other files are skipped.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **I/O:** `file` → `file`
- **Reads:** One PDF file. Anything else fails, so route non-PDFs elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A file holding the rendered page. A retry on the same item reuses the previous render. An empty input gives an empty file back.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 3 min; cache no expiry — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `format` | `png` \| `jpeg` | no | `"png"` | Output image format. PNG is lossless; JPEG re-encodes and accepts a quality knob. |
| `jpegQuality` | integer, 1 to 100 | no | `85` | JPEG quality (1-100). Only used when format is jpeg; ignored for png. |
| `maxInputBytes` | integer, more than 0 | no | `50000000` | Hard cap on the input PDF size. Larger PDFs fail the handler rather than render at unbounded memory cost. |
| `maxOutputBytes` | integer, more than 0 | no | `10000000` | Hard cap on the persisted image size. Larger outputs fail rather than silently truncate. |
| `page` | integer, more than 0 | no | `1` | 1-indexed page number to rasterize. Inputs with fewer pages fail the handler with a clear error. |
| `viewportScale` | number, 0.25 to 4 | no | `2` | Render resolution multiplier (1.0 ≈ 72 DPI; 2.0 ≈ 144 DPI). Higher = sharper + larger bytes. Capped at 4 to keep memory bounded. |

## Worked example

Renders one page of a PDF as an image file.

#### An invoice

The chosen page is rendered and saved as a file, and a reference to it comes back.

Reads `file` → emits `file` · 1 in → 1 out

Input:

```
invoice.pdf (application/pdf)
```

Output:

```
{
  "key": "files/user/ckpg_user_a/invoice-p1.png",
  "name": "invoice-p1.png",
  "mime": "image/png"
}
```
