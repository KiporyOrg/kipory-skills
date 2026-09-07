<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.validate-citations` — Validate citations + derive spans

Check cited quotes against the allowed source items and return exact answer spans or clear validation errors.

- **Group:** Text · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `answer + citations + candidates + source texts` → `CitationValidationResult`
- **Reads:** Reads the answer text, the LLM-emitted `{ recordId, quote }` citations, the citable-source allow-list, and the per-source text the quote must be a substring of. _(shape hint: `answer + citations + candidates + source texts`)_
- **Emits:** A `CitationValidationResult`: either the citations enriched with server-derived span offsets, or a structured error list naming every citation that failed the allow-list, verbatim-substring or unique-in-answer invariant.
- **Suggested input streams:** `answerText`, `citations`, `citableSourceIds`, `citableSourceTexts`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `answerTextSlot` | string | no | — | Slot path containing the model output's `answerText` — the full answer body the quote must appear in exactly once. |
| `citableSourceIdsSlot` | string | no | — | Slot path containing the context-assembly step's allow-list of citable `public.ProjectRecord.id` values. ProjectRecord-only per K8. |
| `citableSourceTextsSlot` | string | no | — | Slot path containing the context-assembly step's `Record<recordId, sourceText>` map. The quote must be a verbatim substring of `citableSourceTexts[recordId]`. |
| `citationsSlot` | string | no | — | Slot path containing the model output's `citations` — a list of `{ recordId, quote }` pairs awaiting validation and span derivation. |

## Worked example

Checks that every citation in an answer really points at the source text it claims.

Reads: the answer and its sources. Emits: the verdict.

#### all of them hold

Each citation was found in the source it names, and comes back with the exact span.

Reads `object` → emits `CitationValidationResult` · 1 in → 1 out

Input:

```
{
  "answer": "Groceries came to $112.00.",
  "citations": [{ "recordId": "ckwx0a", "quote": "$112.00" }]
}
```

Output:

```
{
  "kind": "ok",
  "citations": [{ "recordId": "ckwx0a", "quote": "$112.00",
    "spanStart": 18, "spanEnd": 25 }]
}
```

#### one does not

A quote appears in no source, so the whole set fails and a retry re-prompts against all of it.

Reads `object` → emits `CitationValidationResult` · 1 in → 1 out

Input:

```
{
  "answer": "Groceries came to $150.00.",
  "citations": [{ "recordId": "ckwx0a", "quote": "$150.00" }]
}
```

Output:

```
{
  "kind": "violation",
  "errors": [{ "citation": { "recordId": "ckwx0a", "quote": "$150.00" },
    "code": "QUOTE_NOT_IN_SOURCE",
    "detail": "Quote not found in the cited record's text." }]
}
```
