<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.chunk` — Split text into chunks

Split long text into token-sized chunks with overlap.

- **Group:** Text · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `string[]`
- **Reads:** One long string — usually a page or a document body. Empty or non-text input emits nothing without running the chunker. _(shape hint: `string`)_
- **Emits:** An ordered list of chunks, each within `chunkTokens` and sharing `overlapTokens` with its neighbour. Stops at `maxChunks`, warning when the tail is dropped.
- **Suggested input streams:** `inputText`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `chunkTokens` | integer | no | `2000` | Tokens per emitted chunk. Default 2000. |
| `encoding` | `cl100k_base` \| `o200k_base` \| `p50k_base` \| `p50k_edit` \| `r50k_base` \| `gpt2` | no | `"cl100k_base"` | Tiktoken encoding used for token-boundary computation. Default cl100k_base — matches GPT-4 / text-embedding-3 tokenization. |
| `maxChunks` | integer | no | `30` | Hard cap on emitted chunk count. When hit the trailing tail is dropped and a chunk-cap-hit warning is logged. Default 30. |
| `overlapTokens` | integer | no | `200` | Tokens of overlap between adjacent chunks. Must be strictly less than chunkTokens; the handler throws at runtime otherwise. Default 200. |

## Worked example

A fixed-size window slides across the text, and neighbouring chunks share their boundary. The overlap is where the highlight colours blend.

Reads: tokenize. Emits: sliding window.

#### Example

Reads `string` → emits `string[]` · 3 chunks · 50 tok · overlap 10

Input:

```
Programmers chunk text into overlapping pieces so that long inputs fit a model's context window without losing continuity.
```

Output:

- {"index":0,"value":"Programmers chunk text into overlapping pieces so "}
- {"index":1,"value":"pieces so that long inputs fit a model's context w"}
- {"index":2,"value":" context window without losing continuity."}
