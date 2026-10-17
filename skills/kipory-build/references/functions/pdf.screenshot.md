<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `pdf.screenshot` — Save a PDF page as an image

Save one page of a PDF as an image.

Check the file's type first, so files that are not PDFs are skipped.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — A new run that keeps the record's files saves this file again under the new attempt's key.
- **Not undone when a run fails:** `file` — The file's bytes are stored while the action runs. A later attempt of the run stores them again under its own key; a file no record keeps is removed by the platform later. Doing it twice is not harmless; a failed run lists it in `closing.unstagedEffects`.
- **I/O:** `file` → `file`
- **Also found as:** screenshot, pdf to image, pdf page image, pdf preview
- **Reads:** One PDF file. Anything else fails, so route non-PDFs elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A file holding the rendered page. A retry on the same item reuses the previous render. An empty input gives an empty file back.
- **Softens these failures:** `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 3 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `format` | `png` \| `jpeg` | no | `"png"` | Output image format: PNG, or JPEG with a quality setting. |
| `jpegQuality` | integer, 1 to 100 | no | `85` | JPEG quality from 1 to 100; ignored for PNG. |
| `maxInputBytes` | integer, more than 0, at most 100000000 | no | `50000000` | Largest PDF to accept, in bytes; bigger ones fail. |
| `maxOutputBytes` | integer, more than 0, at most 100000000 | no | `10000000` | Largest image to save, in bytes; bigger ones fail. |
| `page` | integer, more than 0 | no | `1` | Page number to draw, starting at 1. |
| `viewportScale` | number, 0.25 to 4 | no | `2` | Resolution multiplier, where 1 is about 72 DPI; at most 4. |

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
