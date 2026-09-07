<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `pdf.parse` — Extract text from a PDF

Extract text and document properties from a PDF file.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `file` → `PdfDocument`
- **Reads:** One PDF file. A non-PDF mime fails rather than being guessed at — route them elsewhere upstream. _(shape hint: `file`)_
- **Emits:** A `PdfDocument` — the embedded text and whatever the file's own metadata carried. Empty text means nothing was extractable; the locked flag says which.
- **Suggested input streams:** `currentFile`
- **Queue:** 1 attempt, no backoff; waits up to 180000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxPages` | integer | no | — | Limit TEXT extraction to the first N pages. Unset = all pages. Metadata (pageCount, Info-dict fields) always reflects the whole document regardless of the cap. |

## Worked example

One pass over the file gives both its text and its metadata. The variants show a text PDF, a scan, and a locked one.

Reads: download from S3. Emits: one decode → text + metadata.

#### LaTeX paper

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

#### scanned PDF

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

#### encrypted

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
