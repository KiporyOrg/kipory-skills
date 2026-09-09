<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.links` — Read a record's links

Read a record's declared links, grouped by kind.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `RecordLink[]`
- **Reads:** One slot carrying the record id to read links for. An empty or non-text slot gives an empty list rather than an error. _(shape hint: `string`)_
- **Emits:** A `RecordLink` per edge, with the far end, the kind, the direction, and any declared properties. A record with no links gives an empty list.
- **Suggested input streams:** `recordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeExpired` | boolean | no | `false` | Include edges that have been retracted. An edge is retracted by expiry rather than deletion, so history is readable — but never by accident. |
| `kind` | string | no | — | Return only links of this one kind. Leave it unset for every kind the project declares. ⚠️ A kind the project marks hidden is never returned, whether or not you name it, and a link whose far end this run may not read is left out rather than blanked. |
| `limit` | integer | no | `100` | Maximum edges returned across the whole read, applied after a deterministic ordering (most recently valid first). |

## Worked example

Reads the links a record carries, with what is on the other end of each.

Reads: the record id. Emits: RecordLink[].

#### two links

Each link names the far end, the kind, and which way it points from this record.

Reads `string` → emits `RecordLink[]` · 1 in → 1 out

Input:

```
"ckwx0a1b2c3d"
```

Output:

```
[
  { "peerRecordId": "ckwx_9z", "kind": "cites", "direction": "outgoing",
    "properties": null },
  { "peerRecordId": "ckwx_4k", "kind": "cites", "direction": "incoming",
    "properties": null }
]
```

#### no links

The record links to nothing, so an empty list comes back rather than an error.

Reads `string` → emits `RecordLink[]` · 1 in → 1 out

Input:

```
"ckwx_fresh"
```

Output:

```
[]
```
