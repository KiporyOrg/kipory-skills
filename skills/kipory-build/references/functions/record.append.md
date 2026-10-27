<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.append` — Add events to a record

Add one or more events to a record's history.

Writes time-stamped events to a record's stream field, not its data. A retry never writes the same event twice.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record id + event(s)` → `string`
- **Also found as:** log event, history, timeline, add event
- **Reads:** The record id from `recordId`, and one event object or a list of them from `event`; optionally your own event ids from `eventId`. _(shape hint: `record id + event(s)`)_
- **Emits:** A bare string — `appended` when at least one event row was written, `unchanged` when every event already existed and the retry converged.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `event` | union | yes | — | One event object or a list, each with its time property. ⚠️ An event with no valid time fails the action, and nothing is written. |
| `eventId` | union | no | — | Your own event id, or a list; empty means one is derived. ⚠️ The same id under another time counts as a second event, not a retry. |
| `field` | string | yes | — | The stream field of that type that receives the events. |
| `recordId` | union | yes | — | The id of the record to append to. ⚠️ The record must be the user's own or the project's, of this type. |
| `tableKey` | string | yes | — | The table whose stream field receives the events. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `event` — one of

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

### `eventId` — one of

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

### `recordId` — one of

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

### `userId` — one of

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

## Worked example

Appends time-stamped events to a record's stream field and says whether anything new landed.

#### New events

Each event becomes one row under the record, keyed by its time. The record itself is untouched.

Reads `list` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "thread",
  "field": "activity",
  "recordId": "events.recordId",
  "event": "events.events"
}
```

Input:

```
{
  "recordId": "ckwx0a1b2c3d",
  "events": [
    { "at": "2026-09-14T09:12:00Z", "kind": "opened" },
    { "at": "2026-09-14T09:15:30Z", "kind": "replied" }
  ]
}
```

Output:

```
appended
```

#### Sent twice

A retry derives the same ids, so every row already exists and nothing is written twice.

Reads `list` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "tableKey": "thread",
  "field": "activity",
  "recordId": "events.recordId",
  "event": "events.events"
}
```

Input:

```
{
  "recordId": "ckwx0a1b2c3d",
  "events": [
    { "at": "2026-09-14T09:12:00Z", "kind": "opened" },
    { "at": "2026-09-14T09:15:30Z", "kind": "replied" }
  ]
}
```

Output:

```
unchanged
```
