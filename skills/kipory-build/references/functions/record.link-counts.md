<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.link-counts` — Count a record's links

Count how many links reach each record, from everyone.

Counts the current links of one relation that reach each record, across everyone's records, and returns numbers only. Use it for "how many people follow this". Records this run may not write are left out.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record ids` → `RecordLinkCount[]`
- **Reads:** The record ids, from the slot `recordIdsSlot` names: one id or a list of up to 200. More than 200 fails the action. _(shape hint: `record ids`)_
- **Emits:** A `RecordLinkCount` per record this run may write, with how many current links of the relation reach it. A record no link reaches counts 0.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `direction` | `incoming` \| `outgoing` \| `either` | no | `"incoming"` | Count links pointing at the record (`incoming`), from it (`outgoing`), or both. |
| `recordIdsSlot` | string | yes | — | Slot PATH (e.g. `page.creatorIds`) that resolves to one record id or a list of up to 200. ⚠️ A count says how many people's records link here, never whose. A small number on a niche record can still hint at who; show it only where that is fine. |
| `relationKey` | string | yes | — | The relation whose links are counted, by key. |

## Worked example

A page of channels shows how many people follow each, without anyone's follows being read.

#### Two channels

Each channel gets the number of follow links reaching it, from everyone.

Reads `object` → emits `RecordLinkCount[]` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "relationKey": "follows",
  "direction": "incoming",
  "recordIdsSlot": "page.channelIds"
}
```

Input:

```
{
  "channelIds": ["ch_harbour", "ch_quayside"]
}
```

Output:

```
[
  { "recordId": "ch_harbour", "count": 12 },
  { "recordId": "ch_quayside", "count": 0 }
]
```
