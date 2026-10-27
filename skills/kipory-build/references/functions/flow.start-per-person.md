<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `flow.start-per-person` — Start a flow for each person

Run a flow once for each person, as that person.

Each run acts for its person; the project pays. They start once this run saves; a failed run starts nobody.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own start, so a new run starts everyone's runs again.
- **I/O:** `people and inputs` → `PeopleStartResult`
- **Also found as:** for each person, run for everyone, per user, start flow for people, everyone's own run
- **Reads:** The people, from `people`, and what every run starts with, from `inputs`. A run that acts for a person, or a set over the limit, fails the action. _(shape hint: `people and inputs`)_
- **Emits:** A `PeopleStartResult` — how many people the start named. A preview starts nobody and says how many it would have.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `inputs` | object | no | `{}` | Each input's value: a slot path, fixed value or expression. |
| `people` | union | yes | — | Whose runs to start. ⚠️ Only from a run that acts for nobody — a schedule, trigger or API key; started runs cannot start more. |
| `targetFlowId` | string | yes | — | The flow each person's run runs. ⚠️ A project document names it `target`, by key. |

### `people` — one of

**`kind: project`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `project` | yes | — | Everyone who belongs to the project. |

**`kind: linked`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `linked` | yes | — | The people who own a record linked to one record. |
| `relationId` | string | yes | — | The relation from the people's records, its near end, to the record. |
| `recordId` | string | yes | — | The id of the record the people link to. |

**`kind: list`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `list` | yes | — | A list of people an earlier action produced. |
| `userIds` | string | yes | — | A list of person ids; ids outside the project are dropped. |

## Worked example

Every morning a schedule starts the digest flow once for each person, so each person's digest is their own record.

#### Everyone in the project

Three people, so three runs start once this run is saved.

Reads `object` → emits `PeopleStartResult` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "targetFlowId": "flow_daily_digest",
  "inputs": {
    "firedAt": "schedule.firedAt"
  },
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
  "inputs": {
    "feed": "feed"
  },
  "people": {
    "kind": "linked",
    "relationId": "rel_follows",
    "recordId": "feed.recordId"
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
