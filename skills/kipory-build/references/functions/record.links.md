<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.links` — Read a record's links

Read a record's links, grouped by relation.

Shows the record on the other end, the direction, and the relation's properties.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `RecordLink[]`
- **Also found as:** related records, linked records, what links here
- **Reads:** One slot carrying the record id to read links for. An empty or non-text slot gives an empty list rather than an error. _(shape hint: `string`)_
- **Emits:** A `RecordLink` per link, with the far end, the relation, the direction, and any declared properties. A record with no links gives an empty list.
- **Suggested input streams:** `recordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `includeExpired` | boolean | no | `false` | Include links that have been retracted. |
| `limit` | integer, more than 0 | no | `100` | Most links returned, most recently valid first. |
| `relationKey` | string | no | — | Return only links of this relation; empty means every relation. ⚠️ A link whose far end this run may not read is left out rather than blanked. |

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
  { "peerRecordId": "ckwx_9z", "relationKey": "cites", "direction": "outgoing",
    "properties": null },
  { "peerRecordId": "ckwx_4k", "relationKey": "cites", "direction": "incoming",
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
