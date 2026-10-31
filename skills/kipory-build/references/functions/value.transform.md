<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `value.transform` — Reshape values

Reshape or combine values with a short expression.

No fetch, no model call; besides JSONata's functions it may call the platform's (`expressionFunctions`). For prose, use Fill a template.

- **Group:** utility · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `object`
- **Also found as:** pick a field, map fields, compute, format value, calculate, convert
- **Reads:** Every slot named at the top of the expression; the inputs list exactly those. Inside `[…]` or after a `.` a name is an item's field; `$$.name` reads a slot. _(shape hint: `any+`)_
- **Emits:** An object, a list or text; a flow output carrying a list is `isList: true`. When it gives nothing, nothing is stored and later actions see it missing.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `examples` | union[] | no | — | Made-up inputs and the outputs each save must still give. |
| `expression` | string | yes | — | The expression to run; a name at its top is a slot. ⚠️ The result must fit the output type; `$now`, `$millis`, `$random`, `$shuffle` and `$eval` are refused. |

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

A JSONata expression runs against the slots. The variants zip two lists, build an object from several slots, and add fields to an existing one.

#### Pair up lists

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "expression": "$zip(ytHashtags, ytUrls).{\"tag\": $[0], \"url\": $[1]}",
  "examples": [
    {
      "input": {
        "ytHashtags": [
          "#a",
          "#b"
        ],
        "ytUrls": [
          "u1",
          "u2"
        ]
      },
      "output": [
        {
          "tag": "#a",
          "url": "u1"
        },
        {
          "tag": "#b",
          "url": "u2"
        }
      ]
    }
  ]
}
```

Input:

```
{
  "ytHashtags": ["#react", "#hooks", "#typescript"],
  "ytUrls":     ["https://x.com/a", "https://x.com/b", "https://x.com/c"]
}
```

Output:

```
[
  { "tag": "#react",      "url": "https://x.com/a" },
  { "tag": "#hooks",      "url": "https://x.com/b" },
  { "tag": "#typescript", "url": "https://x.com/c" }
]
```

#### Build an object

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "expression": "{\"title\": ytTitle, \"host\": ytMetadata.host, \"tagCount\": $count(ytHashtags)}"
}
```

Input:

```
{
  "ytTitle":    "Building with React 19",
  "ytMetadata": { "host": "youtube.com", "duration": 1234 },
  "ytHashtags": ["#react", "#hooks", "#typescript"]
}
```

Output:

```
{
  "title":    "Building with React 19",
  "host":     "youtube.com",
  "tagCount": 3
}
```

#### Add fields

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "expression": "$merge([sourceMeta, {\"kind\": \"video\", \"ingested\": true}])"
}
```

Input:

```
{
  "sourceMeta": { "host": "youtube.com", "title": "Building with React 19" }
}
```

Output:

```
{
  "host":     "youtube.com",
  "title":    "Building with React 19",
  "kind":     "video",
  "ingested": true
}
```

#### Fill in what is missing

Reads `mixed` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "expression": "{\"brief\": $default(post.brief, post.text), \"tags\": $default(post.tags, [\"untagged\"])}"
}
```

Input:

```
{
  "post": { "id": "rec_1", "text": "Building with React 19", "tags": [] }
}
```

Output:

```
{
  "brief": "Building with React 19",
  "tags":  ["untagged"]
}
```
