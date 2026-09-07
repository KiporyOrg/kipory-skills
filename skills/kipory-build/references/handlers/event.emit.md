<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `event.emit` — Emit an event

Emit a registered event (with a payload) onto the live stream from within a flow.

- **Group:** Flow · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `event payload` → `nothing`
- **Reads:** Reads the configured payload slot; its value becomes the event payload (validated against the event type's payload schema). _(shape hint: `event payload`)_
- **Emits:** Nothing — the node emits the configured event onto the live stream and produces no output, so it sits transparently anywhere in the graph.
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

#### an event goes out

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
