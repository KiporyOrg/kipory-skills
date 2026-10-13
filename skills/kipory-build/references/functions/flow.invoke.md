<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.invoke` — Run another flow

Run another flow, passing values in and taking results back.

Only the slots you map cross between the two flows, in and out.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the parent slots its inputs name` → `nothing`
- **Also found as:** call a flow, subflow, reuse a flow, run flow
- **Reads:** Reads the parent slots its `inputs` rows name. A save fills `inputStreams` from them. _(shape hint: `the parent slots its inputs name`)_
- **Emits:** Whatever `outputs` copies back from the sub-flow, into the parent slots it names. The action writes no slot of its own.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | union[] | no | `[]` | Parent slots to pass in, and where each one lands. |
| `outputs` | object[] | no | `[]` | Sub-flow outputs to copy back, and the parent slots receiving them. ⚠️ Each row's `derivedShape` is filled in on every save, so never set it. |
| `targetFlowId` | string | yes | — | The saved flow to run, never this flow itself. |

### `inputs` — each item is one of

**`kind: slot`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `slot` | yes | — | Pass a parent slot's value into the sub-flow. |
| `parentSlot` | string | yes | — | The parent slot to read. |
| `subFlowSlot` | string | yes | — | The sub-flow input slot the value lands in. |
| `path` | object | no | — | A path into the parent slot's value, to pass part of it. |

`path`:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `segments` | union[] | yes | — | Parts applied in order; an empty list takes the whole value. |

`path` › `segments` — each item is one of:

**`path` › `segments` › `kind: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `field` | yes | — | Step into a named property of an object. |
| `name` | string | yes | — | The property to read. |

**`path` › `segments` › `kind: first`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `first` | yes | — | Take the first element of a list. |

**`path` › `segments` › `kind: last`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `last` | yes | — | Take the last element of a list. |

**`path` › `segments` › `kind: index`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `index` | yes | — | Take one element of a list by position. |
| `index` | integer, at least 0 | yes | — | Zero-based position to take. |

**`path` › `segments` › `kind: pluck`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `pluck` | yes | — | Read one property from every item of a list. |
| `name` | string | yes | — | Property to read from each element. |

**`path` › `segments` › `kind: wrap`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `wrap` | yes | — | Wrap the current value in a single-element list. |

**`kind: literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `literal` | yes | — | Pass a fixed text into the sub-flow. |
| `subFlowSlot` | string | yes | — | The sub-flow input slot the text lands in. |
| `value` | string | yes | — | The text to pass. |

### `outputs` — each item

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `subFlowSlot` | string | yes | — | The sub-flow slot to copy back. |
| `parentSlot` | string | yes | — | The parent slot it is written to. |
| `derivedShape` | union | no | — | The copied value's type, filled in on save; leave it out. |

`derivedShape` — one of:

**`derivedShape` › `kind: ref`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `ref` | yes | — | A named shape from the project's types, by id. |
| `dataTypeId` | string | yes | — | The id of an existing type this points at. |

**`derivedShape` › `kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | An array of values. |
| `element` | any `derivedShape` alternative | yes | — | The shape at this position, one level in. |

**`derivedShape` › `kind: optional`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `optional` | yes | — | A value that may be absent altogether. |
| `inner` | any `derivedShape` alternative | yes | — | The shape at this position, one level in. |

**`derivedShape` › `kind: union`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `union` | yes | — | One of several shapes; an action writes only one. |
| `members` | a list of `derivedShape` alternatives, at least 2 items | yes | — | The alternatives, at least two. |

**`derivedShape` › `kind: record`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `record` | yes | — | A map from text keys to values of one type. |
| `valueType` | any `derivedShape` alternative | yes | — | The shape at this position, one level in. |

**`derivedShape` › `kind: recordRef`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `recordRef` | yes | — | One stored record, given by its id. |
| `tableKey` | string | yes | — | Which table the id refers to. |

## Worked example

Runs another saved flow inline. Only the mapped slots cross in, and only the mapped outputs come back.

#### In and out

The sub-flow run here: Article scrape & summarize.

Reads `mapped slots` → emits `mapped slots` · 2→2 slots mapped

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_a1b2c3",
  "inputs": [
    {
      "kind": "slot",
      "parentSlot": "currentUrl",
      "subFlowSlot": "entryUrl"
    },
    {
      "kind": "slot",
      "parentSlot": "dateRange",
      "subFlowSlot": "window"
    }
  ],
  "outputs": [
    {
      "subFlowSlot": "summary",
      "parentSlot": "articleSummary"
    },
    {
      "subFlowSlot": "qualityScore",
      "parentSlot": "articleScore"
    }
  ]
}
```

Input:

- `currentUrl → entryUrl` — into the sub-flow
- `dateRange → window` — into the sub-flow

Back to the parent:

- `summary → articleSummary`
- `qualityScore → articleScore`

#### Pass in only

The sub-flow run here: Save the article & tag it.

Reads `mapped slots` → emits `nothing` · 2→0 slots mapped

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_d4e5f6",
  "inputs": [
    {
      "kind": "slot",
      "parentSlot": "currentArticle",
      "subFlowSlot": "article"
    },
    {
      "kind": "slot",
      "parentSlot": "sourceUrl",
      "subFlowSlot": "url"
    }
  ],
  "outputs": []
}
```

Input:

- `currentArticle → article` — into the sub-flow
- `sourceUrl → url` — into the sub-flow

Back to the parent:

- nothing comes back — side effects only

#### Get back only

The sub-flow run here: List active users this week.

Reads `mapped slots` → emits `mapped slots` · 0→2 slots mapped

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_g7h8i9",
  "inputs": [],
  "outputs": [
    {
      "subFlowSlot": "users",
      "parentSlot": "activeUsers"
    },
    {
      "subFlowSlot": "count",
      "parentSlot": "activeUserCount"
    }
  ]
}
```

Input:

- nothing goes in — the sub-flow starts from its own state

Back to the parent:

- `users → activeUsers`
- `count → activeUserCount`
