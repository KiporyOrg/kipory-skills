<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.chunk` — Split text into chunks

Split long text into smaller pieces, to handle one at a time.

For actions that handle one part at a time. Neighbouring parts can share text; same input, same parts.

- **Group:** text · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string[]`
- **Also found as:** split text, chunks, paragraphs, break up text
- **Reads:** One long string — usually a page or a document body. Empty or non-text input emits nothing without running the chunker. _(shape hint: `string`)_
- **Emits:** An ordered list of chunks, each within `chunkTokens` and sharing `overlapTokens` with its neighbour. Stops at `maxChunks`, warning when the tail is dropped.
- **Suggested input streams:** `inputText`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `chunkTokens` | integer, more than 0 | no | `2000` | Tokens per chunk; default 2000. |
| `encoding` | `cl100k_base` \| `o200k_base` \| `p50k_base` \| `p50k_edit` \| `r50k_base` \| `gpt2` | no | `"cl100k_base"` | The encoding that counts tokens; default `cl100k_base`. |
| `maxChunks` | integer, more than 0 | no | `30` | Most chunks to return, default 30; text past it is dropped. |
| `overlapTokens` | integer, at least 0 | no | `200` | Tokens shared by neighbouring chunks, less than `chunkTokens`; default 200. |

## Worked example

A fixed-size window slides across the text, and neighbouring chunks share their boundary. The overlap is where the highlight colours blend.

#### Example

Reads `string` → emits `string[]` · 3 chunks · 50 tok · overlap 10

Input:

```
Programmers chunk text into overlapping pieces so that long inputs fit a model's context window without losing continuity.
```

Output:

- Programmers chunk text into overlapping pieces so
- pieces so that long inputs fit a model's context w
- context window without losing continuity.
