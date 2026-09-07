<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `text.embed` — Embed text

Turn text into a dense vector for semantic search or matching.

- **Group:** AI · **Phase:** `ingest` · **Effect class:** `read`
- **I/O:** `string` → `Vector`
- **Reads:** One string. Empty or missing returns an empty vector without calling the model; anything that is not a string is a shape error. _(shape hint: `string`)_
- **Emits:** A `Vector`. Empty when the input was empty, which is how a later write leaves that vector alone. The same text and model hit the cache.
- **Suggested input streams:** `inputText`
- **External dependency:** Model provider — Whichever provider hosts the embedding model this step is set to. The call goes through the `@kipory/ai-provider` chokepoint and the key is resolved per model.
- **Rate limit:** 300 per 60000ms in bucket `ai-embed` — shared with `vector.search`
- **Queue:** 2 attempts, exponential from 1500ms; waits up to 60000ms; cache no expiry (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | string | no | `""` | Which model to embed with. Leave empty to use the project's embedding default, which supplies the provider too. ⚠️ The model decides how long the vector is, and that length has to match the room the search index reserves for it. Changing the model means embedding everything again and rebuilding the index. |
| `provider` | `openai` \| `google` | no | `"openai"` | Which service computes the embedding. The model id must be one of theirs. ⚠️ A different provider produces different vectors, and usually a different length. It costs the same as changing the model: everything already embedded has to be embedded again. |

## Worked example

One string in, one vector out. The variants show two phrasings of the same thing embedded separately, and an empty input, which costs nothing.

Reads: read string slot. Emits: embed via model.

#### a description

A plain description of the thing. Its vector answers searches worded the same way.

Reads `object` → emits `Vector` · 1 in → 1 out

Input:

```
{
  "inputText": "Copper-bottomed 24cm frying pan, stainless steel, oven-safe to 260C. Bought 2026-04-12. Even heat, no hot spots; needs hand washing."
}
```

Output:

```
{
  "vector": [0.01234, -0.04567, 0.07890, 0.00321, -0.01098, 0.04432, ..., 0.00418]
}
```

#### how someone asks for it

The same thing in the words a person would search with. Embedded separately, it finds what the description misses.

Reads `object` → emits `Vector` · 1 in → 1 out

Input:

```
{
  "inputText": "The good frying pan I got in April - the heavy one that can go in the oven. The one I have to wash by hand."
}
```

Output:

```
{
  "vector": [-0.02345, 0.05432, 0.01987, -0.03210, 0.07654, -0.00871, ..., 0.02156]
}
```

#### no text

Nothing to embed, so no call is made and nothing is charged. A later write leaves that vector untouched.

Reads `object` → emits `Vector` · 1 in → 1 out

Input:

```
{
  "inputText": ""
}
```

Output:

```
{}
```
