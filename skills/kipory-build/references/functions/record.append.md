<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.append` — Add events to a record

Add one or more events to a record's history.

Writes time-stamped events to a record's stream field, not its data. A retry never writes the same event twice.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record slot + event(s)` → `string`
- **Also found as:** log event, history, timeline, add event
- **Reads:** The record id, from the slot `recordIdSlot` names, and one event object or a list of them from `eventSlot`; optionally your own event ids from `eventIdSlot`. _(shape hint: `record slot + event(s)`)_
- **Emits:** A bare string — `appended` when at least one event row was written, `unchanged` when every event already existed and the retry converged.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `eventIdSlot` | string | no | — | Your own event id, or a list; empty means one is derived. ⚠️ The same id under another time counts as a second event, not a retry. |
| `eventSlot` | string | yes | — | One event object or a list, each with its time property. ⚠️ An event with no valid time fails the action, and nothing is written. |
| `field` | string | yes | — | The stream field of that type that receives the events. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to append to. ⚠️ The record must be the user's own or the project's, of this type. |
| `tableKey` | string | yes | — | The table whose stream field receives the events. |
| `userIdSlot` | string | no | — | The slot holding the person a run for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

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
  "recordIdSlot": "events.recordId",
  "eventSlot": "events.events"
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
  "recordIdSlot": "events.recordId",
  "eventSlot": "events.events"
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
