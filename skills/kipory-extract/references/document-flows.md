# Document, image and audio pipelines

Three shapes. Each starts from a file reference and ends with something a record can hold.

## A PDF becomes searchable text

```
file → pdf.parse ─┬─ text present ──→ text.sanitize → text.chunk → (kipory-retrieve)
                  └─ text empty ────→ pdf.screenshot → text.generate (vision) → text.sanitize → …
```

`pdf.parse` returns the embedded text and the document's own properties. Empty text is a
**result**, not a failure: it means the pages carry no extractable text layer, and its flags say
whether the file was locked or simply scanned. Branch with `flow.dispatch`.

The scanned path is a page at a time. `pdf.screenshot` renders the 1-indexed `page` you name,
defaulting to the first, so covering a document means a fan-out over page numbers — and a page
number past the end **fails the handler** rather than returning empty, so build that list from the
page count `pdf.parse` reported rather than from a guess. Each branch is a vision model call, so
cost scales with pages rather than documents: a fifty-page scan is fifty model calls, against a
`flow.fan-out` that caps at 20 items by default.

Both paths converge on sanitized text, because both are text somebody else wrote.

## An image becomes data

```
file ─┬─ image.metadata  → dimensions, EXIF, IPTC, XMP
      ├─ image.decode-qr → whatever a code in it encodes
      └─ image.resize    → a smaller file → text.generate (vision) → a description
```

These are independent reads of the same file, not a chain — wire the ones you need in parallel and
merge. Resize before any vision step: the model bills on what it receives.

`image.metadata` distinguishes its two empty cases. An empty object means the image carried no
metadata. A failure means the file is not a readable image — worth branching on, because the second
usually means an upload went wrong.

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

The extracted text is only useful if something keeps it. Two destinations, and they are not
exclusive:

- **A record field**, via `entity.update` — the text becomes part of the record and travels with it.
- **A vector collection**, via the retrieval write half — the text becomes searchable.

Most document pipelines do both: `entity.update` for the canonical copy, then chunk and embed for
search. `kipory-retrieve` covers the second, `kipory-data` the records themselves.

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
