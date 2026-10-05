---
name: kipory-extract
description: Turn a file a Kipory project holds into something a flow can use — PDF text, a rendered page image a vision step reads (OCR for a scanned document), image dimensions and EXIF, a decoded QR code, an audio transcript (speech to text), a text file's contents, a signed download link, or size and hash. Also detecting a text's language and pulling regex matches out of it. Use when a flow receives a document, image or recording rather than text, when a scanned PDF yields no text, when a transcript is slow or empty, or when extracted text has to be made safe for a prompt. Not for uploading or attaching the file (kipory-data), downloading one (kipory-gather), or chunking and indexing the text (kipory-model, kipory-retrieve).
license: MIT
---

# Turn a file into something a flow can use

A file arrives as a reference, not as content — from an upload (`kipory-data`), from
`url.fetch-as-file` (`kipory-gather`), or attached to a record. Every handler here takes that
reference and produces text, data or another file. None of them read a file the project does not
already hold.

**The fact most people get wrong: `pdf.parse` extracts _embedded_ text, and a scanned document has
none.** It returns a `PdfDocument` whose `text` is `""`, and a flow that treats empty as "no
content" throws away every scanned page it will ever be given. The answer is to render the page and let a
vision model read it — which is the whole reason `pdf.screenshot` exists.

## Before the first call

- **A file reference comes from somewhere.** Upload and attachment live in `kipory-data`; downloading
  from the web is `url.fetch-as-file` in `kipory-gather`.
- **Confirm each handler's config live** with `GET /v1/handlers/{key}`.
- **The file handlers run in the ingest phase** — queued and cached on the input — with
  `file.download-url` the exception, which is inline because signing a link calls nothing. How
  many attempts each makes is on its handler page (the PDF, metadata and stats handlers make one).
  The cache has **no expiry by default**: the same file and settings return the previous result
  indefinitely, with no model or vendor call — the step still pays its compute fee
  (`kipory-operate`). Set the step's `reuseResultsForMinutes` to bound it; `0` always runs fresh.
  An eval run of a suite with `subjectUncached: true` (the default) looks nothing up and still
  stores its result (`kipory-prove`).
  The text handlers further down are inline, so they have neither a queue nor a cache.

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
pdf.parse → text?  ── yes ──→ the flow's `body` output            (a generated PDF)
                 └─ no  ──→ pdf.screenshot → text.generate with a vision model → the same output
```

The platform chunks and indexes that output itself once the record type gives it a `search` use
(`kipory-model`); the flow has no chunking or embedding step.

`pdf.parse` tells you which case you are in rather than erroring. `text` empty with `pageCount`
set is a scan; `text` empty with `isEncrypted: true` is a locked file; `text` empty with neither
means the parser could not read the file — the step warns `PDF_PARSE_FAILED`, and the empty result
is not cached, so a later run reads the file again. The warning does not fail the step: in a record's
processing flow the record still goes `ready`, with an empty body and no `statusError`, and the only
trace is a `step-warned` row in that run's step log (`GET /v1/runs/{runId}/steps`), whose
`detail.message` says what the parser reported. To fail the
record with a reason instead, `$assert` on the extracted text in the step that picks the body
(`kipory-build`'s `references/records-and-endpoints.md`). Branch on that (`flow.dispatch`, see `kipory-build`) instead of assuming either shape.
`pdf.screenshot` renders **one page**, and that page is the static config field `page` — no slot
sets it, so fanning out over page numbers renders the same page in every branch. A multi-page scan
needs one `pdf.screenshot` step per page you want, each a separate vision call with a separate bill.

Both PDF handlers make a single attempt and wait up to three minutes. They do not retry, because a
PDF that failed to parse will fail again identically.

## Shaping what comes out

Three text handlers matter more than their size suggests:

- **`text.sanitize`** wraps each body in a `<doc>` block carrying a nonce, so a prompt can tell the
  model that everything inside is data and not instruction. **Extracted text is untrusted** — a PDF
  someone uploaded can contain a paragraph addressed to your model. Run it through this before it
  reaches a prompt. It takes a **list** of `{ id, text }` items, not a string, and cuts each body
  at 4 000 characters unless `maxCharsPerItem` is raised — `kipory-retrieve` owns the contract,
  the nonce included.
- **`text.extract`** pulls regex matches out of the concatenation of every wired text stream,
  ordered and optionally deduped. It is the cheap, deterministic alternative to asking a model for
  the invoice numbers.
- **`text.detect-language`** returns an ISO 639-1 code with no model call at all, or an empty string
  when it cannot tell — under 12 letters, or when no language leads the next clearly (`minLetters`,
  `minAccuracy`). Store the empty string honestly rather than defaulting to English. It emits no
  score, and a short, name-heavy headline can come back confidently wrong: where a wrong language
  is costly, ask a `text.decide` enum field the same question and keep the detector's answer only
  when both agree.

`text.chunk` cuts a long text into pieces for a step that handles one at a time; indexing needs
none — the platform chunks a `search` field itself (`kipory-model`).

## What will bite you

- **`file.download-url` signs a link that does not expire by default.** It grants read access to the
  object's bytes for as long as it lives, and nothing is called to create it — the link is signed
  locally, so it exists the moment the step runs. Bind its lifetime — `neverExpires: false`, and
  `ttlSeconds` (5 minutes when unset, 7 days at most) — whenever the link leaves your own system.
- **A file a step produces outside a record's processing flow is a working file.** In a run an
  endpoint, a schedule or a trigger started, `url.screenshot`, `url.fetch-as-file`, `pdf.screenshot`
  and `image.resize` hand their file to the steps after them, and the file is removed when the run
  ends. The step that produced it then carries a `step-warned` row in the run's step log
  (`detail.kind: "file-not-kept"`); it is a statement, not a failure. The one way to take the file
  out of the run is a `file.download-url` step in the same run: a file a link was made to stays for
  at least 7 days from the moment it was produced and is then removed on a daily pass, whatever the
  link's own lifetime. The step's default link never expires, so on such a file the default link is
  the one that breaks: set `neverExpires: false` and a `ttlSeconds` of 7 days or less. To remove the
  file sooner, find its id in `GET /v1/files?project=<node>` and `DELETE /v1/files/{id}`. A record
  write (`fileIdsSlot`) does not take it: it is a flow's output, not an input. The file belongs to the signed-in person the run acts for, and to
  the project when there is none (an API key, a public endpoint, a schedule, a trigger). A failed
  run keeps none of its files. To keep a file for good, produce it in a record type's processing
  flow: it stays with the record. A preview's files live 7 days.
- **`file.read-text` fails on a file over the size cap rather than truncating it.** That is the
  intended behaviour: a silently shortened document is a wrong answer with no symptom. Check the
  size with `file.stats` first if the input is unbounded.
- **`file.stats` downloads the object to hash it.** It is not a metadata peek; it costs a read of the
  whole file. Use it when the hash is the point, not as a cheap existence check.
- **`image.metadata` does not fail on a corrupt image.** It comes back with `byteSize` and nothing
  else, while a valid image with no EXIF still reports `dimensions`, `format` and `byteSize`. Branch
  on `dimensions` being present to tell "not a readable image" from "no camera metadata".
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
already holds. `kipory-gather` when the file has to be downloaded first. `kipory-model` to make the
extracted text searchable (a `search` use on the processed field), then `kipory-retrieve` to answer
from it. `kipory-build` for the flow, and for the branch that decides which extraction path a file
takes. `kipory-operate` for what a vision or transcription step cost. `kipory-diagnose` when a step produced empty output and you need
to see what it actually emitted.
