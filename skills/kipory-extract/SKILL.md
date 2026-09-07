---
name: kipory-extract
description: Turn a file a Kipory project holds into something a flow can use — PDF text, a rendered page image for a vision step, image dimensions and EXIF, a decoded QR code, an audio transcript, a text file's contents, a signed download link, or size and hash. Also the text-shaping handlers that clean, cut and inspect what comes out. Use when a flow receives a document, image or recording rather than text, when a PDF yields no text, when a transcript is slow or empty, or when extracted text has to be made safe for a prompt.
license: MIT
---

# Turn a file into something a flow can use

A file arrives as a reference, not as content — from an upload (`kipory-data`), from
`url.fetch-as-file` (`kipory-gather`), or attached to a record. Every handler here takes that
reference and produces text, data or another file. None of them read a file the project does not
already hold.

**The fact most people get wrong: `pdf.parse` extracts _embedded_ text, and a scanned document has
none.** It returns empty text and a flag saying why, and a flow that treats empty as "no content"
throws away every scanned page it will ever be given. The answer is to render the page and let a
vision model read it — which is the whole reason `pdf.screenshot` exists.

## Before the first call

- **A file reference comes from somewhere.** Upload and attachment live in `kipory-data`; downloading
  from the web is `url.fetch-as-file` in `kipory-gather`.
- **Confirm each handler's config live** with `GET /v1/handlers/{key}`.
- **The file handlers run in the ingest phase** — queued, retried, cached on the input — with
  `file.download-url` the exception, which is inline because signing a link calls nothing. Their
  caches have **no expiry**: the same file and settings return the previous result indefinitely,
  which is what makes re-running a document pipeline cheap. The text handlers further down are
  inline, so they have neither a queue nor a cache.

## What each one is for

| Handler             | Takes    | Gives back                                | Reach for it when                          |
| ------------------- | -------- | ----------------------------------------- | ------------------------------------------ |
| `pdf.parse`         | a PDF    | embedded text + the document's properties | the PDF was generated, not scanned         |
| `pdf.screenshot`    | a PDF    | one page rendered as an image file        | the text is in the pixels                  |
| `file.read-text`    | any file | UTF-8 contents                            | it is text already                         |
| `audio.transcribe`  | audio    | the spoken words                          | a recording has to become searchable       |
| `audio.metadata`    | audio    | duration, codec, tags                     | you need length or format without decoding |
| `image.metadata`    | an image | dimensions, EXIF, IPTC, XMP               | when and where a photo was taken           |
| `image.resize`      | an image | a smaller image file                      | before a vision model, or before storing   |
| `image.decode-qr`   | an image | what the code encodes                     | a ticket, a label, a scanned link          |
| `file.stats`        | any file | size, content hash, last-modified         | de-duplicating, or detecting a change      |
| `file.download-url` | any file | a signed link                             | a client has to fetch the bytes itself     |

## Reading a document

The decision is one question — **is the text in the file, or in the picture?**

```
pdf.parse → text?  ── yes ──→ text.chunk → …            (a generated PDF)
                 └─ no  ──→ pdf.screenshot → text.generate with a vision model → …
```

`pdf.parse` tells you which case you are in: empty text plus its own flags, rather than an error.
Branch on that (`flow.dispatch`, see `kipory-build`) instead of assuming either shape. `pdf.screenshot`
renders **one page**, so a multi-page scan is a fan-out over page numbers, and every page is a
separate vision call with a separate bill.

Both PDF handlers make a single attempt with no backoff and wait up to three minutes. They do not
retry, because a PDF that failed to parse will fail again identically.

## Shaping what comes out

Three text handlers matter more than their size suggests:

- **`text.sanitize`** wraps each body in a `<doc>` block carrying a nonce, so a prompt can tell the
  model that everything inside is data and not instruction. **Extracted text is untrusted** — a PDF
  someone uploaded can contain a paragraph addressed to your model. Run it through this before it
  reaches a prompt. `kipory-retrieve` does the same for every retrieved body.
- **`text.extract`** pulls regex matches out of the concatenation of every wired text stream,
  ordered and optionally deduped. It is the cheap, deterministic alternative to asking a model for
  the invoice numbers.
- **`text.detect-language`** returns an ISO 639-1 code with no model call at all, or an empty string
  when it cannot tell. Store the empty string honestly rather than defaulting to English.

`text.chunk` belongs to the retrieval chain and is documented in `kipory-retrieve`.

## What will bite you

- **`file.download-url` signs a link that does not expire by default.** It grants read access to the
  object's bytes for as long as it lives, and nothing is called to create it — the link is signed
  locally, so it exists the moment the step runs. Bind its lifetime deliberately whenever the link
  leaves your own system.
- **`file.read-text` fails on a file over the size cap rather than truncating it.** That is the
  intended behaviour: a silently shortened document is a wrong answer with no symptom. Check the
  size with `file.stats` first if the input is unbounded.
- **`file.stats` downloads the object to hash it.** It is not a metadata peek; it costs a read of the
  whole file. Use it when the hash is the point, not as a cheap existence check.
- **`image.metadata` fails on a corrupt image instead of returning empty**, while a valid image with
  no EXIF returns an empty object. Empty means "no metadata"; an error means "not an image".
- **`audio.transcribe` waits up to ten minutes.** It is the longest-running handler here by a wide
  margin, and a synchronous endpoint sitting in front of it will time out long before it finishes.
  Put transcription behind an asynchronous endpoint or a schedule — see `kipory-expose`.
- **A transcript is cached on the file, the model and the language together.** Changing the language
  hint re-transcribes from scratch and bills again.
- **`image.decode-qr` returns only web links unless `requireUrl` is turned off.** A QR code carrying
  a plain payload — a ticket id, a serial — comes back empty until you say so.
- **Every metadata handler returns independently optional fields.** An audio file with no tags still
  reports its length; a photo stripped of EXIF still reports its dimensions. Branch on the field you
  need, never on the object being non-empty.
- **Resize before a vision model, not after.** The model bills on what you send it, and a phone
  photo is several times larger than any vision step needs.

## References

| File                           | What it answers                                                  |
| ------------------------------ | ---------------------------------------------------------------- |
| `references/document-flows.md` | the PDF, image and audio pipelines end to end, with the branches |

Per-handler config tables live with the handler catalog in `kipory-build`.

## Then

`kipory-data` for how a file got here — uploading, attaching to a record, and what the project
already holds. `kipory-gather` when the file has to be downloaded first. `kipory-retrieve` to chunk,
embed and index the text you extracted. `kipory-build` for the flow, and for the branch that decides
which extraction path a file takes. `kipory-diagnose` when a step produced empty output and you need
to see what it actually emitted.
