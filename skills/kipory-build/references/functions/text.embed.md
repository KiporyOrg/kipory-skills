<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `text.embed` — Capture text meaning

Turn text into numbers that capture its meaning, for search by meaning.

Runs one string through an embedding model and returns the vector. Text that arrives empty is skipped without a call, so an action that only sometimes has something to embed costs nothing when it does not. The same text and model return a cached vector.

- **Group:** ai · **Phase:** `ingest` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `Vector`
- **Reads:** One string. Empty or missing returns an empty vector without calling the model; anything that is not a string is a shape error. _(shape hint: `string`)_
- **Emits:** A `Vector`. Empty when the input was empty, which is how a later write leaves that vector alone. The same text and model hit the cache.
- **Softens these failures:** `error` — the action still finishes with a warning, and a `failureSlot` on it then holds the code (`action-fields.md` §6).
- **Suggested input streams:** `inputText`
- **External dependency:** a model provider — Whichever provider hosts the embedding model this action is set to. The key is resolved per model.
- **Rate limit:** 300 per min in bucket `ai-embed` — shared with `term.search`, `vector.search`
- **Queue:** 2 attempts, exponential from 1 s 500 ms; waits up to 1 min; cache no expiry — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `model` | string | no | `""` | The model to embed with, by catalog id (e.g. openai/text-embedding-3-large). Leave empty for the project's embedding default. ⚠️ The model decides how long the vector is, and that length has to match the room the search index reserves for it. Changing the model means embedding everything again and rebuilding the index. |

## Worked example

One string in, one vector out. The variants show two phrasings of the same thing embedded separately, and an empty input, which costs nothing.

#### A description

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

#### A search question

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

#### No text

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
