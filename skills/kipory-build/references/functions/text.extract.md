<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.extract` — Pull out matching text

Pull every piece of text that matches a pattern.

Duplicates are removed by default. Use a capture group to keep only part of each match, such as an id.

- **Group:** text · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string+` → `string[]`
- **Also found as:** regex, find emails, find links, pattern match, extract
- **Reads:** Reads any number of `string` slots — every configured stream is concatenated and scanned by the configured regex. _(shape hint: `string+`)_
- **Emits:** An ordered, optionally deduped list of regex matches (or a configured capturing group) drawn from the concatenation of every wired text input stream.
- **Suggested input streams:** `inputText`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `dedupe` | boolean | no | `true` | When true (default), repeat matches are dropped while preserving the first-occurrence order. |
| `flags` | string[] | no | `["i"]` | Regular expression flags, such as `i` to ignore case. |
| `group` | integer, at least 0 | no | `0` | Which capture group to take; 0 takes the whole match. |
| `pattern` | string | no | `"[\\s\\S]+"` | The regular expression, in RE2 syntax, run over all wired-in text. |

## Worked example

Every match of the pattern is pulled out of the input, deduped, in the order first seen. Here it picks hex colours out of prose.

#### Example

Reads `string` → emits `string[]` · 4 → 3 unique

Input:

```
The brand red is #FF0033, with accents #00ccaa and #ffaa00 — and yes, #FF0033 again later in the text.
```

Output:

- `#FF0033`
- `#00ccaa`
- `#ffaa00`
