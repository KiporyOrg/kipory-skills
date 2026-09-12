<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.interpolate` — Fill a template

Fill a template with slot values without calling an LLM.

- **Group:** Text · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `any+` → `string`
- **Reads:** Any slots you wire in — text verbatim, a list joined with commas, an object's fields via `{{slot.field}}`. A slot nothing has written yet fills in as empty. _(shape hint: `any+`)_
- **Emits:** The interpolated prompt template. Every `{{slot}}` reference is replaced by the slot bag's current value; the result is written to the skill's output slot verbatim.

## Config

_No operator-tunable config._

## Worked example

Every `{{slot}}` in the template is replaced with its value. No model, no network — the same slots always give the same string.

Reads: read slot bag. Emits: interpolate template.

#### single slot

One slot, no surrounding prose. Use it to rename or repackage an upstream value.

Reads `object` → emits `string` · 1 in → 1 out

Input:

```
{
  "title": "Q2 retro"
}
```

Output:

```
Q2 retro
```

#### multi-slot weave

Newlines in the template survive. The usual use is assembling one string out of several slots.

Reads `object` → emits `string` · 1 in → 1 out

Input:

```
{
  "title": "Q2 ingestion stats",
  "summary": "Throughput up 18%; cache hit rate steady at 91%."
}
```

Output:

```
Article: Q2 ingestion stats

Throughput up 18%; cache hit rate steady at 91%.
```

#### list slot joins

A list referenced bare is joined with commas. Use it to flatten a list back into prose.

Reads `object` → emits `string` · 1 in → 1 out

Input:

```
{
  "tags": ["#engineering", "#metrics", "#q2"]
}
```

Output:

```
Tags: #engineering, #metrics, #q2
```

#### projection accessor

`length`, `first` and `last` project on a list; `{{slot[N]}}` reaches any position.

Reads `object` → emits `string` · 1 in → 1 out

Input:

```
{
  "tags": ["#engineering", "#metrics", "#q2"]
}
```

Output:

```
Top tag: #engineering (out of 3)
```
