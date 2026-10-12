<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.start-per-person` — Start a flow for each person

Run a flow once for each person, as that person.

Starts one run of another flow per person: everyone in the project, the people linked to a record, or a list. Each run acts for its person and the project pays. Runs start once this run saves, so a failed run starts nobody.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own start, so a new run starts everyone's runs again.
- **I/O:** `people and inputs` → `PeopleStartResult`
- **Reads:** The people, from `people`, and what every run starts with, from `inputs`. A run that acts for a person, or a set over the limit, fails the action. _(shape hint: `people and inputs`)_
- **Emits:** A `PeopleStartResult` — how many people the start named. A preview starts nobody and says how many it would have.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | union[] | no | `[]` | What every person's run starts with: slots of this run, or fixed text, each landing in an input of the target flow. |
| `people` | union | yes | — | Whose runs to start. ⚠️ Only from a run that acts for nobody — a schedule, a trigger, an API key. Started runs act for one person each, and cannot start more. |
| `targetFlowId` | string | yes | — | The flow each person's run runs. A project document names it `target`, by key. |

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

### `people` — one of

**`kind: project`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `project` | yes | — | Everyone who belongs to the project. |

**`kind: linked`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `linked` | yes | — | The people who own a record linked to one record. |
| `relationId` | string | yes | — | The relation whose links name the people: their records sit at its near end, the record at its far end. |
| `recordIdSlot` | string | yes | — | Slot PATH to the id of the record the people are linked to. |

**`kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | A list of people an earlier action produced. |
| `userIdsSlot` | string | yes | — | Slot PATH to a list of person ids. Ids that do not belong to the project are dropped. |

## Worked example

Every morning a schedule starts the digest flow once for each person, so each person's digest is their own record.

#### Everyone in the project

Three people, so three runs start once this run is saved.

Reads `object` → emits `PeopleStartResult` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_daily_digest",
  "inputs": [
    {
      "kind": "literal",
      "subFlowSlot": "edition",
      "value": "morning"
    }
  ],
  "people": {
    "kind": "project"
  }
}
```

Input:

```
{
  "firedAt": "2026-10-12T07:00:00Z"
}
```

Output:

```
{
  "people": 3
}
```

#### The followers of a feed

Two people follow the feed, so two runs start.

Reads `object` → emits `PeopleStartResult` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_new_item_alert",
  "inputs": [
    {
      "kind": "slot",
      "parentSlot": "feed",
      "subFlowSlot": "feed"
    }
  ],
  "people": {
    "kind": "linked",
    "relationId": "rel_follows",
    "recordIdSlot": "feed.recordId"
  }
}
```

Input:

```
{
  "recordId": "f81c2a9d0e44"
}
```

Output:

```
{
  "people": 2
}
```
