<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `file.read-text` — Read a text file

Read a text-like file and return its UTF-8 contents.

- **Group:** Files · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `file` → `string`
- **Reads:** One text file. Anything binary fails rather than being decoded into nonsense. _(shape hint: `file`)_
- **Emits:** The file's contents as text. A file over the size cap fails before decoding — nothing is ever silently cut short. Empty when there is no file.
- **Suggested input streams:** `currentFile`
- **External dependency:** S3 / MinIO — Downloads the object's bytes from the store. S3-compatible rather than S3: the deployment runs MinIO on its own box.
- **Rate limit:** 240 per 60000ms in bucket `file.read-text`
- **Queue:** 3 attempts, exponential from 500ms; waits up to 60000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxBytes` | integer | no | `5000000` | How large a file may be. A bigger one fails rather than being cut short. |

## Worked example

A text file's bytes come back as text. The type is checked first, so a binary file fails instead of decoding into nonsense.

Reads: download from S3. Emits: UTF-8 decode.

#### CSV

`text/csv` — passes the mime gate; bytes decoded as UTF-8 verbatim.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
exports/q2-headcount.csv (text/csv)
```

Output:

```
team,engineers,slack_capacity
ingestion,4,0.5
search,3,1.0
storage,2,0.0
platform,5,0.25
```

#### JSON

`application/json` — text-decodable application type; allowed by the allowlist (`*+json` patterns also pass).

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
configs/feature-flags.json (application/json)
```

Output:

```
{
  "flags": {
    "new_search_ranker": true,
    "tabbed_workspace_v2": true,
    "ai_call_audit_v3": false
  },
  "rolloutWindow": "2026-Q2"
}
```

#### PDF (rejected)

Non-text mime — the handler throws a `mime-mismatch` HandlerFailure rather than silently mangling binary bytes. Use `pdf.parse` for PDFs.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
reports/2026-q1.pdf (application/pdf)
```

Output:

```
Error: mime-mismatch HandlerFailure
  mime: "application/pdf" is not in the text-decodable allowlist.
  Use pdf.parse for PDFs, or pass the FileRef directly to a
  multimodal LLM for images / audio / video.
```
