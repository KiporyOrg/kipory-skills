<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.link-counts` — Count a record's links

Count how many links reach each record, from everyone.

Counts one relation's current links reaching each record, across everyone's records. Returns numbers only, for records this run may write.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record ids` → `RecordLinkCount[]`
- **Also found as:** count followers, how many links, link count
- **Reads:** The record ids, from `recordIds`: one id or a list of up to 200. More than 200 fails the action. _(shape hint: `record ids`)_
- **Emits:** A `RecordLinkCount` per record this run may write, with how many current links of the relation reach it. A record no link reaches counts 0.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `direction` | `incoming` \| `outgoing` \| `either` | no | `"incoming"` | Links pointing at the record (`incoming`), from it (`outgoing`), or both. |
| `recordIds` | union | yes | — | One record id or a list of up to 200. ⚠️ A count says how many link here, never whose; on a niche record a small one can still hint. |
| `relationKey` | string | yes | — | The relation whose links are counted, by key. |

### `recordIds` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

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
  "recordIds": "page.channelIds"
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
