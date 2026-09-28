<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `event.emit` — Send an event

Send an event, with its data, to anything listening.

- **Group:** Flow · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Every emission gets a new event id, so a new run publishes the event again and starts every trigger listening for it again.
- **I/O:** `event payload` → `nothing`
- **Reads:** Reads the configured payload slot; its value becomes the event payload (validated against the event type's payload schema). _(shape hint: `event payload`)_
- **Emits:** Nothing — the event goes onto the live stream and the step's own slot holds an empty object. Name any unused slot as its output.
- **Suggested input streams:** `payload`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `category` | string | yes | — | The event category key (from the project's event registry). Half of the `{category}/{event}` reference this node emits. |
| `event` | string | yes | — | The event key within the category. The referenced event type must exist in the project's registry (validated at publish; unknown at runtime throws). |
| `payloadSlot` | string | no | — | The slot whose value becomes the event payload. Leave it empty for an event type that carries none. |

## Worked example

Publishes an event other flows can listen for. Nothing comes back.

Reads: the payload. Emits: nothing.

#### Event sent

The payload is published under the configured event name. The step writes no slot.

Reads `object` → emits `nothing` · 1 in → (empty)

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
