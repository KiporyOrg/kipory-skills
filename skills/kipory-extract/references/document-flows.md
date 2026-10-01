# Document, image and audio pipelines

Three shapes. Each starts from a file reference and ends with something a record can hold.

## A PDF becomes searchable text

```
file → pdf.parse ─┬─ text present ──→ text.chunk (reads `text`) → (kipory-retrieve)
                  └─ text empty ────→ pdf.screenshot → text.generate (vision) → …
```

`pdf.parse` emits a `PdfDocument` object: `text`, `pageCount`, the file's own `pdf*` properties,
and `isEncrypted`. `text.chunk` reads one string, so wire the step's input to the `text` field
(an `inputPaths` projection, `kipory-build`) rather than to the whole object. Empty `text` is a
**result**, not a failure: `isEncrypted: true` means the file was locked; empty `text` with no
flag means the pages carry no text layer — a scan. Branch with `flow.dispatch`.

The scanned path is a page at a time. `pdf.screenshot` renders the 1-indexed `page` set in its
config, defaulting to the first — it is static, no slot can set it, so a fan-out over page numbers
renders the same page in every branch. Covering several pages means one `pdf.screenshot` step per
page, and a page past the end **fails the handler** rather than returning empty, so check
`pageCount` before adding steps you cannot be sure the file has. Each page is a vision model call,
so cost scales with pages rather than documents.

Sanitize before the text reaches a prompt, not before chunking. `text.sanitize` reads
`itemsSlot` as a **list** of `{ id, text }` objects and returns `[]` without an error when handed
anything else — a bare string included. Its default output is a list of `{ id, sanitizedText }`
(`outputShape: "joined"` gives one string instead), which `text.chunk` cannot read. So shape the
chunks or the vision output into `{ id, text }` items with `value.transform` and sanitize those
where the prompt is assembled.

## An image becomes data

```
file ─┬─ image.metadata  → dimensions, EXIF, IPTC, XMP
      ├─ image.decode-qr → whatever a code in it encodes
      └─ image.resize    → a smaller file → text.generate (vision) → a description
```

These are independent reads of the same file, not a chain — wire the ones you need in parallel and
merge. Resize before any vision step: the model bills on what it receives.

`image.metadata` does not fail on a file it downloaded. A valid image with no EXIF still returns
`dimensions`, `format` and `byteSize`; a file that is not a readable image returns `{ byteSize }`
alone; an empty object means the file could not be loaded at all. Branch on `dimensions` — its
absence usually means an upload went wrong.

## Audio becomes text

```
file ─┬─ audio.metadata   → duration, codec, tags       (fast, no model)
      └─ audio.transcribe → the spoken words            (slow, a model call)
```

Read the metadata first when the duration decides anything. `audio.transcribe` waits up to ten
minutes and cannot go behind a synchronous endpoint; `kipory-expose` covers the asynchronous and
streaming shapes, and `kipory-operate` covers running it on a schedule instead.

The transcript is cached on the file, the model and the language together, so a re-run is free and
a changed language hint is a fresh bill.

## Where these attach

The extracted text is only useful if something keeps it. The usual route needs no write step at
all: make the extraction the record type's **processing flow**. Its declared output (`body`, say)
becomes the record's processed field, and a `search` use on `{ "family": "processed", "field":
"body" }` has the platform chunk, embed and index it — `kipory-build`'s `references/patterns.md` §7
has the whole document, file in and searchable text out.

Reach past that only when the route does not fit:

- **`entity.update`** writes the text onto a record the flow did not get as its input.
- **The hand-built chain** (`text.chunk` → `text.embed` → `vector.upsert`) writes points the
  declaration does not — `kipory-retrieve` covers it, and its limits.

## Costs worth knowing before you build

| Step                                    | What it costs                                               |
| --------------------------------------- | ----------------------------------------------------------- |
| `pdf.parse`, `*.metadata`, `file.stats` | compute only — no model, no vendor                          |
| `file.stats`                            | plus a full read of the object, because it hashes the bytes |
| `pdf.screenshot`, `image.resize`        | compute, then whatever the model that reads the image costs |
| `audio.transcribe`                      | a model call sized by the recording's length                |
| `text.extract`, `text.detect-language`  | deterministic — no model call at all                        |

The deterministic handlers are the ones to reach for first. A regex that finds invoice numbers is
free, repeatable and never hallucinates; asking a model the same question costs money on every run
and has to be evaluated (`kipory-prove`) to be trusted.
