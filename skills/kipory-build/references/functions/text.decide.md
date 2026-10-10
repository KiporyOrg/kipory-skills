<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.decide` — Answer typed questions

Answer typed questions about a value: yes/no, pick one, or score.

The cheapest model action: its model returns values, not text, and one call answers every question. Each field of the output type is one question: a probability (yes/no), one of a set, or a number with levels. Plain text and yes/no fields are refused.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any` → `the action's outputSchema`
- **Reads:** The value to judge — text, or a JSON object or list. Every question is answered against the same value.
- **Emits:** The action's output type, each field answered: a chance of yes, a chosen option, or a score. Optionally a `DecisionConfidence` too. Empty when the input was empty.
- **Suggested input streams:** `state`
- **External dependency:** TypeSafe AI — Answers through TypeSafe's decision model, Jev. Uses a TypeSafe AI API key: the project's own, stored in its secrets, or Kipory's.
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `typesafe` (vendor: TypeSafe AI); falls through to the platform's own key when no node holds one.
- **Rate limit:** 600 per min in bucket `typesafe`
- **Queue:** 2 attempts, exponential from 1 s; waits up to 1 min; cache 1 day — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | string | no | `"typesafe/jev-latest"` | Which decision model answers, by its catalog id (creator/slug, as GET /v1/ai-models lists it). ⚠️ Only a decision model can answer. A chat model is refused when the action saves. |
| `outputs` | object[] | no | — | One extra slot for how sure the model was of each answer. Type it DecisionConfidence; leave it out to write the answers alone. ⚠️ Every question gets an answer: an option such as `unknown` is one more option, not a refusal to answer. To catch a guess, compare this slot's `lowest` in a later action's condition. |

### `outputs` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `slot` | string | yes | — | The slot the extra value is written to. A later action reads it by this name. |
| `schema` | union | yes | — | The type of the value in that slot, as a schema reference. |

`schema` — one of:

**`schema` › `kind: ref`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `ref` | yes | — | A named shape, defined once in the project's types and reused by id. |
| `dataTypeId` | string | yes | — | Id of the type this points at. It has to already exist, and one that something still points at cannot be deleted. |

**`schema` › `kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | An array of values. |
| `element` | any `schema` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`schema` › `kind: optional`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `optional` | yes | — | A value that may be absent altogether. |
| `inner` | any `schema` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`schema` › `kind: union`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `union` | yes | — | One of several alternative shapes. An action may READ a union; what it writes has to be one concrete shape. |
| `members` | a list of `schema` alternatives, at least 2 items | yes | — | The alternatives — at least two, since a single-member union is just that member. |

**`schema` › `kind: record`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `record` | yes | — | A map from string keys to values. Only the values are typed; the keys are always strings and are not constrained. |
| `valueType` | any `schema` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`schema` › `kind: recordRef`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `recordRef` | yes | — | A pointer to one stored record. The value on the wire is that record's id. |
| `tableKey` | string | yes | — | Which table the id refers to. Makes the reference filterable. The target is never checked, so a deleted record leaves it pointing at nothing. |

## Worked example

A support message goes in; the action's output type asks three questions of it, and each field comes back answered.

The output type `TicketTriage`, whose definition decides what the action does:

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
    }
  }
}
```

#### ticket triage

`team` is a choice, `refund` a chance of yes, `urgency` a score. A later action can branch on each.

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
  "urgency": 1.43
}
```

#### an input with no answer

Every field is still answered. `sureness.lowest` comes back near 0.4, so a later action's condition can catch the guess.

Reads `string` → emits `TicketTriage` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "outputs": [
    {
      "slot": "sureness",
      "schema": {
        "kind": "ref",
        "dataTypeId": "<DecisionConfidence entry id>"
      }
    }
  ]
}
```

Input:

```
"asdf https://example.com/x1 @someone"
```

Output:

```
{
  "team": "billing",
  "refund": 0.41,
  "urgency": 0.87
}

and, in the slot "sureness":

{
  "lowest": 0.41,
  "answers": [
    { "question": "team", "type": "choice", "confidence": 0.41, "probabilities": { "billing": 0.41, "tech": 0.33, "sales": 0.26 } },
    { "question": "refund", "type": "noul", "confidence": 0.59, "probabilities": { "true": 0.41, "false": 0.59 } },
    { "question": "urgency", "type": "score", "confidence": 0.42, "probabilities": { "0": 0.42, "1": 0.29, "2": 0.29 } }
  ]
}
```
