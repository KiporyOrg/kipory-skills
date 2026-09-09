<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.embed-sparse` — Embed text as a sparse vector

Turn text into a sparse vector for keyword-style retrieval.

- **Group:** Search · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `SparseVector`
- **Reads:** One string — usually the same text you embed densely, or any text whose exact words matter. Empty or missing returns an empty vector without doing any work. _(shape hint: `string`)_
- **Emits:** A `SparseVector` of term weights. The search index supplies the rest of the score at query time. Empty when the input was empty.
- **Suggested input streams:** `inputText`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `language` | string | no | `"en"` | Which language's rules to tokenise by. Today's tokeniser reads the tag without branching on it; future ones will. ⚠️ It is part of the cache key, so changing it changes how terms map to dimensions. |
| `tokenizer` | `naive-bm25` | no | `"naive-bm25"` | How the text is cut into terms and weighted. Today there is one mode: split on word boundaries, lowercase, weight by frequency. |

## Worked example

One string in, a sparse vector out — a dimension per word. The variants show an exact identifier, a repeated word, and no text.

Reads: read string slot. Emits: tokenize + BM25.

#### an exact identifier

Each word gets its own dimension. A dense vector blurs a proper name; this keeps it exact.

Reads `object` → emits `SparseVector` · 1 in → 1 out

Input:

```
{
  "inputText": "Invoice INV-2026-0412 covers the April kitchen order."
}
```

Output:

```
{
  "indices": [963100, 2009079, 2702739, 2887831, 5266438, 9462032, 12503689, 15095599, 15301432],
  "values": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
}
```

#### a repeated word

A word repeated five times weighs under twice a single one, so common words cannot dominate the vector.

Reads `object` → emits `SparseVector` · 1 in → 1 out

Input:

```
{
  "inputText": "Copper copper copper copper — the pan is copper-bottomed."
}
```

Output:

```
{
  "indices": [963100, 3706645, 5631724, 7106747, 11716692],
  "values": [1.0, 1.0, 1.0, 1.0, 1.774]
}
```

#### no text

Nothing to weigh, so nothing is computed. A later write leaves that sparse vector as it was.

Reads `object` → emits `SparseVector` · 1 in → 1 out

Input:

```
{
  "inputText": ""
}
```

Output:

```
{}
```
