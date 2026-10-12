<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `event.emit` — Send an event

Send an event, with its data, to anything listening.

The payload comes from a slot. It writes nothing back, so it can sit anywhere in the flow.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Every emission gets a new event id, so a new run publishes the event again and starts every trigger listening for it again.
- **I/O:** `event payload` → `nothing`
- **Also found as:** publish event, notify, trigger, signal, broadcast
- **Reads:** Reads the configured payload slot; its value becomes the event payload (validated against the event type's payload schema). _(shape hint: `event payload`)_
- **Emits:** Nothing — the event goes onto the live stream. The action needs no `outputSlot`; leave it out.
- **Suggested input streams:** `payload`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `category` | string | yes | — | The category of the event to send. |
| `event` | string | yes | — | Which of your project's events to send. |
| `payloadSlot` | string | no | — | The slot whose value becomes the payload; empty for none. |

## Worked example

Publishes an event other flows can listen for. Nothing comes back.

#### Event sent

The payload is published under the configured event name. The action writes no slot.

Reads `object` → emits `nothing` · 1 in → (empty)

Action settings (`functionConfig`):

```json
{
  "category": "orders",
  "event": "ready",
  "payloadSlot": "payload"
}
```

Input:

```
{
  "recordId": "ckwx0a1b2c3d",
  "status": "READY"
}
```

Output:

```

```
