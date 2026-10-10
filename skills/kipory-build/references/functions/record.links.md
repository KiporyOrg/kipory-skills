<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.links` — Read a record's links

Read a record's links, grouped by relation.

Returns the links a record carries: what is on the other end, which way each points, and any properties its relation declares. Reads current state, with no model call and no queue.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `RecordLink[]`
- **Reads:** One slot carrying the record id to read links for. An empty or non-text slot gives an empty list rather than an error. _(shape hint: `string`)_
- **Emits:** A `RecordLink` per link, with the far end, the relation, the direction, and any declared properties. A record with no links gives an empty list.
- **Suggested input streams:** `recordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeExpired` | boolean | no | `false` | Include links that have been retracted. A link is retracted by expiry rather than deletion, so history is readable — but never by accident. |
| `kind` | string | no | — | Return only links of this one relation. Leave it unset for every relation the project declares. ⚠️ A link whose far end this run may not read is left out rather than blanked. |
| `limit` | integer, more than 0 | no | `100` | Maximum links returned across the whole read, applied after a deterministic ordering (most recently valid first). |

## Worked example

Reads the links a record carries, with what is on the other end of each.

#### Two links

Each link names the far end, the relation, and which way it points from this record.

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

#### No links

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
