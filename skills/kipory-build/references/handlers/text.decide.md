<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.decide` — Answer typed questions

Answer typed questions about a value: yes/no, pick one, or score.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any` → `the step's outputSchema`
- **Reads:** The value to judge — text, or a JSON object or list. Every question is answered against the same value.
- **Emits:** The step's output type, each field answered: a chance of yes, a chosen option, or a score. Optionally a `DecisionConfidence` too. Empty when the input was empty.
- **Suggested input streams:** `state`
- **External dependency:** TypeSafe AI — Answers through TypeSafe's decision model, Jev (KIPORY_TYPESAFE_API_KEY).
- **Credential:** resolved from the secrets vault as type `api_key`, purpose `typesafe` (vendor: TypeSafe AI); falls through to the platform's own key when no node holds one.
- **Rate limit:** 600 per 60000ms in bucket `typesafe`
- **Queue:** 2 attempts, exponential from 1000ms; waits up to 60000ms; cache 86400000ms (custom-derive-source) — the handler's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | string | no | `"typesafe/jev-latest"` | Which decision model answers, by its catalog id (creator/slug, as GET /v1/ai-models lists it). ⚠️ Only a decision model can answer. A chat model is refused when the step saves. |
| `outputs` | object[] | no | — | One extra slot for how sure the model was of each answer. Type it DecisionConfidence; leave it out to write the answers alone. ⚠️ Every question gets an answer: an option such as `unknown` is one more option, not a refusal to answer. To catch a guess, compare this slot's `lowest` in a later step's condition. |

### `outputs` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `slot` | string | yes | — | The slot the extra value is written to. A later step reads it by this name. |
| `schema` | union | yes | — | The type of the value in that slot, as a schema reference. |

## Worked example

A support message goes in; the step's output type asks three questions of it, and each field comes back answered.

Reads: read the message. Emits: answer each field.

#### ticket triage

`team` is a choice, `refund` a chance of yes, `urgency` a score. A later step can branch on each.

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

Every field is still answered. `sureness.lowest` comes back near 0.4, so a later step's condition can catch the guess.

Reads `string` → emits `TicketTriage` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "outputs": [
    {
      "slot": "sureness",
      "schema": {
        "kind": "ref",
        "entryId": "DecisionConfidence"
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
```
