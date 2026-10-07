<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `pdf.parse` — Extract text from a PDF

Pull the text and document details out of a PDF.

Reads a PDF once and returns both its embedded text and whatever its own metadata carried. A scan has no text layer, so its text is empty; a locked file says so with a flag. Anything that is not a PDF fails.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `file` → `PdfDocument`
- **Reads:** One PDF file. A non-PDF mime fails rather than being guessed at — route them elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A `PdfDocument`. Empty text: with `pageCount`, a scan; with `isEncrypted`, locked; with neither, unreadable or missing — warns `PDF_PARSE_FAILED`, uncached. No file named: empty, no warning.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 3 min; cache no expiry — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxPages` | integer, more than 0 | no | — | Limit TEXT extraction to the first N pages. Unset = all pages. Metadata (pageCount, Info-dict fields) always reflects the whole document regardless of the cap. |

## Worked example

One pass over the file gives both its text and its metadata. The variants show a text PDF, a scan, and a locked one.

#### A research paper

A PDF with a real text layer: the prose, the page count and the metadata come out of one pass.

Reads `file` → emits `PdfDocument` · 1 in → 1 out

Input:

```
papers/attention-is-all-you-need.pdf (application/pdf)
```

Output:

```
{
  "text": "Attention Is All You Need\n\nAbstract\nThe dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
  "pageCount": 15,
  "pdfTitle": "Attention Is All You Need",
  "pdfAuthor": "Ashish Vaswani et al.",
  "pdfSubject": "Neural Information Processing Systems",
  "pdfKeywords": ["attention", "transformer", "sequence-to-sequence"],
  "pdfCreator": "LaTeX with hyperref",
  "pdfProducer": "pdfTeX-1.40.21",
  "pdfCreatedAt": "2017-06-12T18:43:00.000Z",
  "pdfModifiedAt": "2023-08-02T14:01:11.000Z",
  "pdfVersion": "1.5"
}
```

#### A scanned PDF

A scan has no text layer, so the text is empty — the page count and metadata still come through.

Reads `file` → emits `PdfDocument` · 1 in → 1 out

Input:

```
scans/legal/contract-2024-signed.pdf (application/pdf)
```

Output:

```
{
  "text": "",
  "pageCount": 12,
  "pdfProducer": "Canon iR-ADV C5560"
}
```

#### A locked PDF

A locked file cannot be read. The flag distinguishes that from an ordinary empty result.

Reads `file` → emits `PdfDocument` · 1 in → 1 out

Input:

```
contracts/nda-locked.pdf (application/pdf)
```

Output:

```
{
  "text": "",
  "isEncrypted": true
}
```
