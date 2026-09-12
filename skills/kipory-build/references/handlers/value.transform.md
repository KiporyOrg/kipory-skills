<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `value.transform` — Transform with JSONata

Transform slot values with a JSONata expression.

- **Group:** Utility · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any+` → `object`
- **Reads:** Every slot your expression names. They are read out of the expression when you save, so you do not declare them separately. _(shape hint: `any+`)_
- **Emits:** Whatever the expression evaluates to — usually an object built from several slots, a list zipped from parallel lists, or a copy of a slot with fields added.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expression` | string | yes | — | The expression to evaluate. Bare names refer to slots; dotted paths reach into an object slot. $humanDate and the other template filters are available. ⚠️ The result must be a shape a slot can hold: text, a file, a flat object, or a list of those. `$now`, `$millis`, `$random` and `$shuffle` are refused — they break caching. |

## Worked example

A JSONata expression runs against the slots. The variants zip two lists, build an object from several slots, and add fields to an existing one.

Reads: read referenced slots. Emits: evaluate expression.

#### zip two lists → list of objects

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

#### compose object from inputs

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

#### extend existing object with static keys

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
