<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `value.transform` — Reshape values

Reshape or combine values with a short expression.

- **Group:** Utility · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `object`
- **Reads:** Every slot the expression names, and the step's inputs must list exactly those. A name inside a projection counts too, so reach into items through `$map` and a variable. _(shape hint: `any+`)_
- **Emits:** Whatever the expression evaluates to — usually an object built from several slots, a list zipped from parallel lists, or a copy of a slot with fields added.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expression` | string | yes | — | The expression to evaluate. Bare names refer to slots; dotted paths reach into an object slot. $humanDate and the other template filters are available. ⚠️ The result must fit the output type; under the default object, text, an object (fields may nest) or a list of either. `$now`, `$millis`, `$random`, `$shuffle`, `$eval` are refused. An else-less conditional emits nothing. |

## Worked example

A JSONata expression runs against the slots. The variants zip two lists, build an object from several slots, and add fields to an existing one.

Reads: read referenced slots. Emits: evaluate expression.

#### Pair up lists

Reads `mixed` → emits `object` · 1 in → 1 out

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
