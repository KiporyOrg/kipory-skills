<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.invoke` — Run another flow

Run another flow, passing values in and taking results back.

It hands the other flow its inputs and reads back what that flow returns.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the values its inputs read` → `the called flow's outputs`
- **Also found as:** call a flow, subflow, reuse a flow, run flow
- **Reads:** Reads the values its `inputs` arguments name: a path's root, or an expression's. _(shape hint: `the values its inputs read`)_
- **Emits:** What the called flow's `return` gives, one field per output of its signature; `{}` when it returns nothing.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `flow` | string | yes | — | The key of another saved flow to run, like `score-article`. |
| `inputs` | object | no | `{}` | Each input of the called flow: a path, fixed value or expression. |

## Worked example

Runs another saved flow inline. Only its inputs cross in, and only what it returns comes back.

#### In and out

The sub-flow run here: Article scrape & summarize.

Reads `the flow's inputs` → emits `the flow's outputs` · 2 in → 2 back

Step settings (`with`):

```json
{
  "flow": "article-scrape-summarize",
  "inputs": {
    "entryUrl": "currentUrl",
    "window": "dateRange"
  }
}
```

Input:

- `currentUrl → entryUrl` — into the sub-flow
- `dateRange → window` — into the sub-flow

The step's value:

- `summary` — read as <step key>.summary
- `qualityScore` — read as <step key>.qualityScore

#### Pass in only

The sub-flow run here: Save the article & tag it.

Reads `the flow's inputs` → emits `nothing` · 2 in → 0 back

Step settings (`with`):

```json
{
  "flow": "save-article-and-tag",
  "inputs": {
    "article": "currentArticle",
    "url": "sourceUrl"
  }
}
```

Input:

- `currentArticle → article` — into the sub-flow
- `sourceUrl → url` — into the sub-flow

The step's value:

- nothing comes back — side effects only

#### Get back only

The sub-flow run here: List active users this week.

Reads `the flow's inputs` → emits `the flow's outputs` · 0 in → 2 back

Step settings (`with`):

```json
{
  "flow": "active-users-this-week",
  "inputs": {}
}
```

Input:

- nothing goes in — the sub-flow starts from its own state

The step's value:

- `users` — read as <step key>.users
- `count` — read as <step key>.count
