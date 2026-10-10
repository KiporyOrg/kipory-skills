<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.invoke` — Run another flow

Run another flow, passing values in and taking results back.

Runs another saved flow inside this one. The input slots you map are handed to the sub-flow as its starting values, and the output slots you map come back to this flow. Nothing else crosses between the two.

- **Group:** flow · **Phase:** `control` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `the parent slots its inputs name` → `nothing`
- **Reads:** Reads the parent slots its `inputs` rows name. A save fills `inputStreams` from them. _(shape hint: `the parent slots its inputs name`)_
- **Emits:** Whatever `outputs` copies back from the sub-flow, into the parent slots it names. The action writes no slot of its own.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | union[] | no | `[]` | Which parent slots to pass into the sub-flow, and where each one lands. Only these cross the boundary. |
| `outputs` | object[] | no | `[]` | Which sub-flow outputs to copy back, and into which parent slots. Leave it empty for side effects only. ⚠️ Each row also carries `derivedShape`, the sub-flow output's type. The platform derives it on every save — a single action save and a project document alike — so never state it. |
| `targetFlowId` | string | yes | — | The saved flow this action runs, never its own flow. A project document names it `target`, by key. |

### `inputs` — each item is one of

**`kind: slot`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `slot` | yes | — | Pass a parent slot's value into the sub-flow. |
| `parentSlot` | string | yes | — | The parent slot to read. |
| `subFlowSlot` | string | yes | — | The sub-flow input slot the value lands in. |
| `path` | object | no | — | A path into the parent slot's value, to pass one part of it. |

`path`:

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `segments` | union[] | yes | — | Steps applied in order, each operating on the result of the last. An empty list takes the value whole. |

`path` › `segments` — each item is one of:

**`path` › `segments` › `kind: field`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `field` | yes | — | Step into a named property of an object. |
| `name` | string | yes | — | Property to read. May also name a dynamic key, so dots and hyphens are allowed after the first character. |

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
| `kind` | `pluck` | yes | — | Read one property from EVERY element of a list, producing a list of those values rather than a single one. |
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
| `derivedShape` | union | no | — | The type of the copied value. A save fills it from the sub-flow; leave it out. |

`derivedShape` — one of:

**`derivedShape` › `kind: ref`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `ref` | yes | — | A named shape, defined once in the project's types and reused by id. |
| `dataTypeId` | string | yes | — | Id of the type this points at. It has to already exist, and one that something still points at cannot be deleted. |

**`derivedShape` › `kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | An array of values. |
| `element` | any `derivedShape` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`derivedShape` › `kind: optional`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `optional` | yes | — | A value that may be absent altogether. |
| `inner` | any `derivedShape` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`derivedShape` › `kind: union`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `union` | yes | — | One of several alternative shapes. An action may READ a union; what it writes has to be one concrete shape. |
| `members` | a list of `derivedShape` alternatives, at least 2 items | yes | — | The alternatives — at least two, since a single-member union is just that member. |

**`derivedShape` › `kind: record`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `record` | yes | — | A map from string keys to values. Only the values are typed; the keys are always strings and are not constrained. |
| `valueType` | any `derivedShape` alternative | yes | — | The shape at this position — the same set of shapes, one level in. |

**`derivedShape` › `kind: recordRef`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `recordRef` | yes | — | A pointer to one stored record. The value on the wire is that record's id. |
| `tableKey` | string | yes | — | Which table the id refers to. Makes the reference filterable. The target is never checked, so a deleted record leaves it pointing at nothing. |

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

The sub-flow run here: Embed & store in vector DB.

Reads `mapped slots` → emits `nothing` · 2→0 slots mapped

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_d4e5f6",
  "inputs": [
    {
      "kind": "slot",
      "parentSlot": "currentChunk",
      "subFlowSlot": "text"
    },
    {
      "kind": "slot",
      "parentSlot": "collectionId",
      "subFlowSlot": "namespace"
    }
  ],
  "outputs": []
}
```

Input:

- `currentChunk → text` — into the sub-flow
- `collectionId → namespace` — into the sub-flow

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
