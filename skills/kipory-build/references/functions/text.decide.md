<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.decide` — Answer typed questions

Answer typed questions about a value: yes/no, pick one, or score.

One call answers every output field as a probability, an option or a number. Text and yes/no fields are refused.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any` → `the step's outputSchema`
- **Also found as:** classify, categorize, categorise, answer a question, yes or no, label, score, sentiment, spam check, detect
- **Reads:** The value to judge — text, or a JSON object or list. Every question is answered against the same value.
- **Emits:** The step's output type, each field answered: a chance of yes, a chosen option, or a score. Optionally a `DecisionConfidence` too. Empty when the input was empty.
- **Inputs (`with`):** `message`
- **External dependency:** TypeSafe AI — Answers through TypeSafe's decision model, Jev. Uses a TypeSafe AI API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `typesafe` (vendor: TypeSafe AI); falls through to the platform's own key when no node holds one.
- **Rate limit:** 600 per min in bucket `typesafe`, counted per project
- **Queue:** 2 attempts, exponential from 1 s; waits up to 1 min; cache 1 day — the function's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | string | no | `"typesafe/jev-latest"` | Which decision model answers, by its catalog id. ⚠️ Only a decision model can answer; a chat model is refused on save. |
| `outputSchema` | union | no | — | The answer's type: one question per field. ⚠️ Add a `DecisionConfidence` field; check its `lowest` to catch guesses. |

### `outputSchema` — one of

**`kind: ref`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `ref` | yes | — | A named shape from the project's types, by key. |
| `ref` | string | yes | — | The key of an existing type this points at. |

**`kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | An array of values. |
| `element` | any `outputSchema` alternative | yes | — | The shape at this position, one level in. |

**`kind: optional`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `optional` | yes | — | A value that may be absent altogether. |
| `inner` | any `outputSchema` alternative | yes | — | The shape at this position, one level in. |

**`kind: union`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `union` | yes | — | One of several shapes; a step writes only one. |
| `members` | a list of `outputSchema` alternatives, at least 2 items | yes | — | The alternatives, at least two. |

**`kind: record`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `record` | yes | — | A map from text keys to values of one type. |
| `valueType` | any `outputSchema` alternative | yes | — | The shape at this position, one level in. |

**`kind: recordRef`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `recordRef` | yes | — | One stored record, given by its id. |
| `tableKey` | string | yes | — | Which table the id refers to. |

## Worked example

A support message goes in; the step's output type asks three questions of it, and each field comes back answered.

The output type `TicketTriage`, whose definition decides what the step does:

```json
{
  "type": "object",
  "properties": {
    "team": {
      "enum": [
        "billing",
        "tech",
        "sales"
      ],
      "description": "Which team should answer this message?"
    },
    "refund": {
      "$ref": "#/$defs/<probability entry id>",
      "description": "Is the customer asking for money back?",
      "x-criteria": {
        "true": "They ask for a refund or to reverse a charge.",
        "false": "They ask about anything else."
      }
    },
    "urgency": {
      "type": "number",
      "minimum": 0,
      "maximum": 2,
      "x-levels": [
        "can wait",
        "today",
        "now"
      ],
      "description": "How urgent is it?"
    },
    "sureness": {
      "$ref": "#/$defs/<DecisionConfidence entry id>"
    }
  }
}
```

#### ticket triage

`team` is a choice, `refund` a chance of yes, `urgency` a score, `sureness` how sure the model was.

Reads `string` → emits `TicketTriage` · 1 in → 1 out

Input:

```
"My card was charged twice for order A-104 and I need the second charge back today."
```

Output:

```
{
  "team": "billing",
  "refund": 0.99,
  "urgency": 1.43,
  "sureness": { "lowest": 0.93, "answers": [ … ] }
}
```

#### an input with no answer

Every field is still answered. `sureness.lowest` comes back near 0.4, so a later step's condition can catch the guess.

Reads `string` → emits `TicketTriage` · 1 in → 1 out

Input:

```
"asdf https://example.com/x1 @someone"
```

Output:

```
{
  "team": "billing",
  "refund": 0.41,
  "urgency": 0.87,
  "sureness": {
    "lowest": 0.41,
    "answers": [
      { "question": "team", "type": "choice", "confidence": 0.41, "probabilities": { "billing": 0.41, "tech": 0.33, "sales": 0.26 } },
      { "question": "refund", "type": "noul", "confidence": 0.59, "probabilities": { "true": 0.41, "false": 0.59 } },
      { "question": "urgency", "type": "score", "confidence": 0.42, "probabilities": { "0": 0.42, "1": 0.29, "2": 0.29 } }
    ]
  }
}
```
