<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `pdf.screenshot` — Render a PDF page

Render one page of a PDF as an image file for downstream vision steps.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `file` → `file`
- **Reads:** One PDF file. Anything else fails, so route non-PDFs elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A file holding the rendered page. A retry on the same item reuses the previous render. An empty input gives an empty file back.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 180000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `format` | `png` \| `jpeg` | no | `"png"` | Output image format. PNG is lossless; JPEG re-encodes and accepts a quality knob. |
| `jpegQuality` | integer | no | `85` | JPEG quality (1-100). Only used when format is jpeg; ignored for png. |
| `maxInputBytes` | integer | no | `50000000` | Hard cap on the input PDF size. Larger PDFs fail the handler rather than render at unbounded memory cost. |
| `maxOutputBytes` | integer | no | `10000000` | Hard cap on the persisted image size. Larger outputs fail rather than silently truncate. |
| `page` | integer | no | `1` | 1-indexed page number to rasterize. Inputs with fewer pages fail the handler with a clear error. |
| `viewportScale` | number | no | `2` | Render resolution multiplier (1.0 ≈ 72 DPI; 2.0 ≈ 144 DPI). Higher = sharper + larger bytes. Capped at 4 to keep memory bounded. |

## Worked example

Renders one page of a PDF as an image file.

Reads: a PDF. Emits: an image file.

#### the first page

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
