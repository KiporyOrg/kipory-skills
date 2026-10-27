<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `value.build` — Build a value field by field

Give each field of a typed value its own short expression.

Nothing is fetched and no model is called. For logic over the whole value, use Reshape values.

- **Group:** utility · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `object`
- **Also found as:** build an object, shape result, map fields, field by field, response shape, assemble
- **Reads:** Every slot named at the top of a field's formula or condition; the inputs list exactly those. _(shape hint: `any+`)_
- **Emits:** A value of the declared type, built from its fields. A field whose formula gives nothing, or whose condition is not true, is left out.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `examples` | union[] | no | — | Made-up inputs and the outputs each save must still give. |
| `fields` | object | yes | — | Each field's expression; a bare string is an expression, not a path. ⚠️ Each name must be a field of the output type; `$now`, `$millis`, `$random`, `$shuffle` and `$eval` are refused. |

### `examples` — each item is one of

**An object with `input`, `output`, `note`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `input` | object | yes | — | The values the expression reads, keyed by its input names. |
| `output` | any | yes | — | What the expression must give for that input. |
| `note` | string | no | — | What the example shows, for the next reader. |

**An object with `input`, `absent`, `note`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `input` | object | yes | — | The values the expression reads, keyed by its input names. |
| `absent` | boolean | yes | — | The expression must give nothing for that input. |
| `note` | string | no | — | What the example shows, for the next reader. |

## Worked example

Each field of the declared type gets its own expression over the slots. A field with a condition is set only when it holds.

#### Build a card

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "fields": {
    "id": "book.id",
    "title": "book.title",
    "stars": "$round($average(reviews.records.stars), 1)",
    "reviewCount": "$count(reviews.records)",
    "topReview": {
      "expr": "reviews.records[0].text",
      "when": "$count(reviews.records) > 0"
    }
  }
}
```

Input:

```
{
  "book":    [{ "id": "rec_1", "title": "Dune", "tags": ["sf"] }],
  "reviews": { "records": [{ "stars": 5, "text": "Vast." }, { "stars": 4, "text": "Slow." }] }
}
```

Output:

```
{
  "id":          "rec_1",
  "title":       "Dune",
  "stars":       4.5,
  "reviewCount": 2,
  "topReview":   "Vast."
}
```
