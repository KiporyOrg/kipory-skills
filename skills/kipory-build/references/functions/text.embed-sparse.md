<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.embed-sparse` — Capture text keywords

Turn text into numbers that capture its keywords, for keyword search.

Empty text gives an empty vector. No model is called; the same text and settings always give the same vector.

- **Group:** search · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `SparseVector`
- **Also found as:** keyword vector, sparse embedding, bm25, keywords
- **Reads:** One string — usually the same text you embed densely, or any text whose exact words matter. Empty or missing returns an empty vector without doing any work. _(shape hint: `string`)_
- **Emits:** A `SparseVector` of term weights. The search index supplies the rest of the score at query time. Empty when the input was empty.
- **Suggested input streams:** `inputText`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `language` | string, at least 2 characters, at most 8 characters | no | `"en"` | The text's language; today it does not change the result. ⚠️ It is part of the cache key, so changing it changes how terms map to dimensions. |
| `tokenizer` | `naive-bm25` | no | `"naive-bm25"` | How text is split into terms; only word boundaries today. |

## Worked example

One string in, a sparse vector out — a dimension per word. The variants show an exact identifier, a repeated word, and no text.

#### An exact ID

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

#### Repeated word

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

#### No text

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
