<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.interpolate` — Fill a template

Fill a text template with values from earlier steps.

No model is called. To walk, sort, filter or reshape a list, use Reshape values.

- **Group:** values · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `string`
- **Also found as:** template, format text, combine text, message text
- **Reads:** The values `with.template` names: text as written, a list of text joined with commas, an object's field as `{{name.field}}`. A bare object is refused at save. _(shape hint: `any+`)_
- **Emits:** The template filled in: each `{{name}}` replaced by the value it names, the rest of the text kept as written.

## Config

_No operator-tunable config._

## Worked example

Every `{{name}}` in the template is replaced with its value. No model, no network — the same values always give the same text.

#### One value

One value, no surrounding prose. Use it to rename or repackage an upstream value.

Reads `object` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "template": "{{title}}"
}
```

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

#### Several values

Newlines in the template survive. The usual use is assembling one string out of several values.

Reads `object` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "template": "Article: {{title}}\n\n{{summary}}"
}
```

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

#### A list

A list referenced bare is joined with commas. Use it to flatten a list back into prose.

Reads `object` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "template": "Tags: {{tags}}"
}
```

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

#### Item and count

`length`, `first` and `last` project on a list; `{{name[N]}}` reaches any position.

Reads `object` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "template": "Top tag: {{tags.first}} (out of {{tags.length}})"
}
```

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
