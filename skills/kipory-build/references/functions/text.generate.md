<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.generate` — Generate text

Send your prompt to an AI model and return its answer.

Returns text, or a structured value when the step declares an output shape. Wired-in files need an image-reading model.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `any+` → `the step's outputSchema`
- **Also found as:** summarize, summarise, summary, translate, rewrite, write, draft, reply, ask ai, prompt, ai, shorten, simplify, paraphrase
- **Reads:** Any values the prompt names. Text fills its placeholder, and a file named in the prompt is attached to it. _(shape hint: `any+`)_
- **Emits:** The model's answer: text, or a value of the declared shape. A misfit is never repaired: the model is asked once more, and a second miss fails the try.
- **External dependency:** a model provider — Whichever provider hosts the model this step is set to. The key is resolved per model.
- **Rate limit:** 60 per min in bucket `text.generate`, counted per project
- **Queue:** 2 attempts, exponential from 1 s; waits up to 2 min; cache 1 day — the function's default; a step replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | union | no | — | The model to use; empty uses this step's model. ⚠️ An unknown or disabled model fails the run; nothing falls back to this step's model. |
| `outputSchema` | union | no | — | The answer's type; empty means the answer is text. |
| `reasoningEffort` | `none` \| `low` \| `medium` \| `high` | no | — | How hard the model thinks first; `none` where it allows. ⚠️ Reasoning is billed as output; left out, the model runs at its own default effort. |
| `task` | string | no | — | The AI task whose model answers; empty uses `extraction`. |
| `temperature` | number, 0 to 2 | no | — | How much the answer may vary; empty uses the model's own. ⚠️ It is part of the cache key, so changing it discards every answer already cached for the same prompt. |
| `vocabularyFields` | object[] | no | — | Which answer fields hold vocabulary values to resolve into terms. |

### `model` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

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

### `vocabularyFields` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `field` | string | yes | — | The field of the answer that holds the vocabulary's value. |
| `vocabularyKey` | string | yes | — | The vocabulary, by key. |

## Worked example

A prompt goes out, an answer comes back. The variants show prose, a declared output shape, and a file the prompt names, attached to it.

#### Summary

No output shape declared, so the answer comes back as text. This is the usual case.

Reads `object` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "prompt": "Summarize in three sentences:\n\n{{article}}"
}
```

Input:

```
{
  "article": "The ingestion pipeline was rewired this quarter to land every record through a unified handler registry. Throughput rose 18%, the cache hit rate held at 91%, and the operator-facing playground replaced four separate one-off harnesses. Adoption was bumpy in week 1 (handler-key drift surfaced two save-time validator gaps), then settled."
}
```

Output:

```
The ingestion pipeline was rewired this quarter onto a unified handler registry, lifting throughput by 18% while holding the cache hit rate at 91%. The operator-facing playground replaced four separate one-off harnesses. Week-1 adoption surfaced two save-time validator gaps; the system stabilized after.
```

#### List of tasks

The step declares an output shape, so the answer is parsed into it rather than returned as prose.

Reads `object` → emits `string[]` · 1 in → 1 out

Step settings (`with`):

```json
{
  "prompt": "Extract the action items from:\n\n{{transcript}}",
  "outputSchema": {
    "kind": "list",
    "element": {
      "kind": "ref",
      "ref": "string"
    }
  }
}
```

Input:

```
{
  "transcript": "ANTON: ok so for Friday we need the migration scheduled. MAYA: I'll handle that. JAY: also the runbook needs the new env var. MAYA: noted, I'll do both. ANTON: and someone has to loop in legal on the consent flow before next sprint. JAY: I can take that one."
}
```

Output:

```
[
  "Maya: schedule the migration for Friday",
  "Maya: update the runbook with the new env var",
  "Jay: loop in legal on the consent flow before next sprint"
]
```

#### Describe an image

Only a file the prompt names is attached to it. The model must read images.

Reads `file` → emits `string` · 1 in → 1 out

Step settings (`with`):

```json
{
  "prompt": "Describe this UI mockup: its tabs, the active panel, and the status bar.\n\n{{screenshot}}"
}
```

Input:

```
design/playground-tabs-mock.png (image/png)
```

Output:

```
A mockup of a kept-mount tab workspace with three pinned tabs across the top — "graph/abc-123", "calls.log", and "queue/" — and an active panel showing a flow editor's right-rail. The bottom of the screen carries a status bar with a live ⌘J shortcut hint and a connection indicator.
```
