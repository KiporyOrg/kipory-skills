<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.detect-language` — Detect language

Tell which language a text is written in.

Answers with a two-letter code, or nothing rather than a wrong guess. No model is called.

- **Group:** text · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Also found as:** which language, language code, identify language
- **Reads:** One string — a title, a body, a message. Links, handles and digits are stripped first: they are Latin whatever the language around them. _(shape hint: `string`)_
- **Emits:** A two-letter language code, or an empty string when it could not tell. Deprecated and placeholder codes are normalised, so a stored value is usable or honestly unknown.
- **Suggested input streams:** `text`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `minAccuracy` | number, 0 to 1 | no | `0.15` | How clearly the guess must lead its rival, from 0 to 1. ⚠️ Raising it mostly turns short text, like headlines, into unknown. |
| `minLetters` | integer, at least 0 | no | `12` | Letters needed before a guess; shorter text is usually unknown. ⚠️ Lowering it lets single words through, with wrong answers on names and brands. |
| `minMinorityScriptShare` | number, 0 to 1 | no | `0.25` | Share one non-Latin writing system needs to decide, even as a minority. ⚠️ Applies only when the text has exactly one non-Latin writing system. |
| `minScriptMargin` | number, at least 1 | no | `1.08` | How far the winner must lead languages sharing its writing system. ⚠️ It is a ratio just above 1; 1 accepts whatever ranks first. |
| `minScriptShare` | number, 0 to 1 | no | `0.6` | Share of the text one writing system needs to decide alone. ⚠️ Only writing systems used by one language decide; Cyrillic, Arabic, Devanagari and Latin never do. |

## Worked example

Guesses which language a piece of text is written in.

#### Clear text

Enough text to be sure, so the two-letter code for it comes back.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
"Der Bericht wurde gestern veroeffentlicht."
```

Output:

```
"de"
```

#### Too little text

A few characters carry no signal, so an empty string says so honestly.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
"ok"
```

Output:

```
""
```
