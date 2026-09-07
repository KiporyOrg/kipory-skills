<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.generate` — Generate text

Call an LLM with a prompt and return text or structured output.

- **Group:** AI · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `any+` → `nothing`
- **Reads:** Any slots you wire in. Text fills the placeholders in the prompt, and a file is attached to it. _(shape hint: `any+`)_
- **Emits:** The model's answer — text, or a structured value when the step declares an output shape.
- **External dependency:** Model provider — Whichever provider hosts the model this step is set to. The call goes through the `@kipory/ai-provider` chokepoint and the key is resolved per model.
- **Rate limit:** 60 per 60000ms in bucket `text.generate`
- **Queue:** 2 attempts, exponential from 1000ms; waits up to 120000ms; cache 86400000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `facetFields` | object[] | no | — | Which fields of the answer are facet values, so they can be resolved into terms. Press Adopt to re-read them from the type. |
| `modelSlot` | string | no | — | Names a slot holding the model to use, picked while the flow runs. Leave it empty to use the model set on this step. ⚠️ The model named while the flow runs has to be one that is enabled and can generate text. An unknown or disabled one fails the run — nothing falls back to the step's own model. |
| `outputs` | object[] | no | — | Extra slots this step writes besides its main answer. Set from the fields above; you do not fill it in by hand. |
| `reasoningEffort` | `low` \| `medium` \| `high` | no | — | How much thinking to buy on models that reason before answering. More of it costs time and tokens. Models that do not reason ignore this. ⚠️ Also part of the cache key, and higher settings are what dominate both the time and the token bill on models that reason. |
| `temperature` | number | no | — | How much the model may vary its answer. Low values keep the same input on the same answer; leave it empty for the model's default. ⚠️ It is part of the cache key, so changing it discards every answer already cached for the same prompt. |

## Worked example

A prompt goes out, an answer comes back. The variants show prose, a declared output shape, and a file attached to the prompt.

Reads: interpolate prompt. Emits: decode response.

#### text

No output shape declared, so the answer comes back as text. This is the usual case.

Reads `object` → emits `string` · 1 in → 1 out

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

#### structured output

The step declares an output shape, so the answer is parsed into it rather than returned as prose.

Reads `object` → emits `string[]` · 1 in → 1 out

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

#### multimodal

A file wired in is attached to the prompt without being named in it. The model has to read images.

Reads `file` → emits `string` · 1 in → 1 out

Input:

```
design/playground-tabs-mock.png (image/png)
```

Output:

```
A mockup of a kept-mount tab workspace with three pinned tabs across the top — "graph/abc-123", "calls.log", and "queue/" — and an active panel showing a flow editor's right-rail. The bottom of the screen carries a status bar with a live ⌘J shortcut hint and a connection indicator.
```
