<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 520b926651160e3a59c0ea86af3cc06c9db8572a500fe748477b12b9eda11162 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.append` — Append to a stream

Append one event, or a list of them, to a record's stream field.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `record-mutation`
- **I/O:** `record slot + event(s)` → `string`
- **Reads:** The record id, from the slot `recordIdSlot` names, and one event object or a list of them from `eventSlot`; optionally your own event ids from `eventIdSlot`. _(shape hint: `record slot + event(s)`)_
- **Emits:** A bare string — `appended` when at least one event row was written, `unchanged` when every event already existed and the retry converged.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `eventIdSlot` | string | no | — | Your own event id: one string, or a list matching the event list. Unset, the id is derived from the event. ⚠️ The identity is the record, the time AND the id: one id under another time is a second event, not a retry. Left unset, the id hashes record, time and payload, so a retry converges. |
| `eventSlot` | string | yes | — | The slot holding one event object, or a list of them. Each carries its time under the property the stream declares. ⚠️ An event with no time under the declared property, or one that is not a datetime, fails the step. Nothing is written for the batch. |
| `field` | string | yes | — | The field of that type declared as a stream. The events land there, never in the record's data. |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to append to. ⚠️ The record has to be one this run can reach — the signed-in user's own, or the project's shared pool — and of the configured type. Anything else fails the step. |
| `recordType` | string | yes | — | The record type whose stream field receives the events. |

## Worked example

Appends time-stamped events to a record's stream field and says whether anything new landed.

Reads: the record id and the events. Emits: appended?.

#### new events

Each event becomes one row under the record, keyed by its time. The record itself is untouched.

Reads `list` → emits `string` · 1 in → 1 out

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

#### the same events again

A retry derives the same ids, so every row already exists and nothing is written twice.

Reads `list` → emits `string` · 1 in → 1 out

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
