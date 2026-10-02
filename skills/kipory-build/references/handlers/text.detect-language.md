<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.detect-language` — Detect language

Tell which language a text is written in.

- **Group:** text · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `string`
- **Reads:** One string — a title, a body, a message. Links, handles and digits are stripped first: they are Latin whatever the language around them. _(shape hint: `string`)_
- **Emits:** A two-letter language code, or an empty string when it could not tell. Deprecated and placeholder codes are normalised, so a stored value is usable or honestly unknown.
- **Suggested input streams:** `text`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `minAccuracy` | number | no | `0.15` | How clearly the statistical guess must lead the next most likely language, from 0 (any lead) to 1 (no rival). ⚠️ A headline leads by less than a paragraph does, so raising this mostly turns short inputs into unknowns. It does not apply where the writing system already answered or narrowed the choice. |
| `minLetters` | integer | no | `12` | How many letters the text needs before a statistical guess is made. Shorter text is unknown unless its writing system answers. ⚠️ A single word reads as several languages at once. Lower it only for text where one or two words are all there is, and expect wrong answers on names and brands. |
| `minMinorityScriptShare` | number | no | `0.25` | How much of the text one non-Latin writing system needs to answer on its own, even without dominating. ⚠️ It exists for titles a Latin brand name drags down — a Hebrew outlet whose name ends in Latin is still Hebrew. Only applies when exactly one non-Latin script is present. |
| `minScriptMargin` | number | no | `1.08` | How far ahead of the runner-up the winner must be, when the writing system has narrowed the language to a family. ⚠️ Languages sharing a writing system score close together, so the bar is a ratio just above 1. Set it to 1 to accept whatever ranks first. |
| `minScriptShare` | number | no | `0.6` | How much of the text must be in one writing system before that alone decides the language. Counted after links and handles are stripped. ⚠️ Only writing systems used by essentially one language can decide this way. Cyrillic, Arabic, Devanagari and Latin always fall through to the statistical guess. |

## Worked example

Guesses which language a piece of text is written in.

Reads: the text. Emits: a language code.

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
