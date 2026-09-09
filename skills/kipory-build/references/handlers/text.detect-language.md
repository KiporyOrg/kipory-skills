<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.detect-language` — Detect language

Detect the ISO 639-1 language code of text (deterministic, no LLM).

- **Group:** Text · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `string`
- **Reads:** One string — a title, a body, a message. Links, handles and digits are stripped first: they are Latin whatever the language around them. _(shape hint: `string`)_
- **Emits:** A two-letter language code, or an empty string when it could not tell. Deprecated and placeholder codes are normalised, so a stored value is usable or honestly unknown.
- **Suggested input streams:** `text`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `minAccuracy` | number | no | `0.5` | How sure the statistical guess must be before it is accepted. Below this the answer is unknown. ⚠️ Long text scores near 1 and a headline scores low, so raising this mostly turns short inputs into unknowns. It does not apply where the writing system already answered. |
| `minMinorityScriptShare` | number | no | `0.25` | How much of the text one non-Latin writing system needs to answer on its own, even without dominating. ⚠️ It exists for titles a Latin brand name drags down — a Hebrew outlet whose name ends in Latin is still Hebrew. Only applies when exactly one non-Latin script is present. |
| `minScriptMargin` | number | no | `2` | How far ahead of the runner-up the winner must be, when the writing system has narrowed the language to a family. ⚠️ Absolute confidence cannot answer this — the same language scores anywhere from 0.21 to 0.75 depending on punctuation. Set it to 1 to accept whatever ranks first. |
| `minScriptShare` | number | no | `0.6` | How much of the text must be in one writing system before that alone decides the language. Counted after links and handles are stripped. ⚠️ Only writing systems used by essentially one language can decide this way. Cyrillic, Arabic, Devanagari and Latin always fall through to the statistical guess. |

## Worked example

Guesses which language a piece of text is written in.

Reads: the text. Emits: a language code.

#### recognisable text

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

#### too little to tell

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
