<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `file.read-text` — Read a text file

Read a text file and return what it says.

Reads a text file and emits its contents. Anything that is not text fails rather than being mangled — a PDF has its own action, and an image or a sound file goes straight to a model that can read it.

- **Group:** files · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `file` → `string`
- **Reads:** One text file. Anything binary fails rather than being decoded into nonsense. _(shape hint: `file`)_
- **Emits:** The file's contents as text. A file over the size cap fails before decoding — nothing is ever silently cut short. Empty when there is no file.
- **Suggested input streams:** `currentFile`
- **External dependency:** S3 / MinIO — Downloads the object's bytes from the store. S3-compatible rather than S3: the deployment runs MinIO on its own box.
- **Rate limit:** 240 per min in bucket `file.read-text`
- **Queue:** 3 attempts, exponential from 500 ms; waits up to 1 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `maxBytes` | integer, more than 0 | no | `5000000` | How large a file may be. A bigger one fails rather than being cut short. |

## Worked example

A text file's bytes come back as text. The type is checked first, so a binary file fails instead of decoding into nonsense.

#### A CSV file

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

#### A JSON file

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

#### A PDF

Non-text mime — the function throws a `mime-mismatch` FunctionFailure rather than silently mangling binary bytes. Use `pdf.parse` for PDFs.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
reports/2026-q1.pdf (application/pdf)
```

Output:

```
Error: mime-mismatch FunctionFailure
  mime: "application/pdf" is not in the text-decodable allowlist.
  Use pdf.parse for PDFs, or pass the FileRef directly to a
  multimodal LLM for images / audio / video.
```
