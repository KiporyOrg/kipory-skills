<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.extract` — Extract text by regex

Extract matching text with a JavaScript regex.

- **Group:** Text · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string+` → `string[]`
- **Reads:** Reads any number of `string` slots — every configured stream is concatenated and scanned by the configured regex. _(shape hint: `string+`)_
- **Emits:** An ordered, optionally deduped list of regex matches (or a configured capturing group) drawn from the concatenation of every wired text input stream.
- **Suggested input streams:** `inputText`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dedupe` | boolean | no | `true` | When true (default), repeat matches are dropped while preserving the first-occurrence order. |
| `flags` | string | no | `"gi"` | Regex flags. Default `gi` (global + case-insensitive). The handler enforces the `g` flag at runtime — without it `.match()` returns at most one result. |
| `group` | integer | no | `0` | Which capturing group to take from each match. 0 takes the whole match. A match missing that group is skipped. |
| `pattern` | string | no | `"[\\s\\S]+"` | JavaScript regex source applied to the concatenated input text. The `g` flag is added implicitly when missing — the handler always extracts all matches. |

## Worked example

Every match of the pattern is pulled out of the input, deduped, in the order first seen. Here it picks hex colours out of prose.

Reads: regex match. Emits: dedup · preserve order.

#### Example

Reads `string` → emits `string[]` · 4 → 3 unique

Input:

```
The brand red is #FF0033, with accents #00ccaa and #ffaa00 — and yes, #FF0033 again later in the text.
```

Output:

- {"index":0,"value":"#FF0033"}
- {"index":1,"value":"#00ccaa"}
- {"index":2,"value":"#ffaa00"}
