<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.link-assert` — State a link between two records

State a curated link from one record to another.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **I/O:** `string, string` → `RelationAssertion`
- **Reads:** Two slots: the record the link runs FROM, then the one it runs TO. They are read by position, so order decides which way a directed link points. _(shape hint: `string, string`)_
- **Emits:** A `RelationAssertion`: `stated` when the link stands — written, revived, or already there — and `refused` when it does not, with `reason` saying why.
- **Suggested input streams:** `sourceRecordId`, `targetRecordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `actor` | string | yes | — | A label naming what is doing the stating, e.g. `citation-extractor`. It is recorded on every link this node writes. ⚠️ It decides what can be taken back: a retract node reaches ONLY links stated under the same label, and never one a person made by hand. |
| `kind` | string | yes | — | The link kind's KEY — the stable identifier chosen when the link was created, not its name. ⚠️ Only a kind whose links are stated by hand works here. One backed by an entity field or a join entity is refused exactly as an unknown kind is, so a refusal reveals nothing. |

## Worked example

States one link between two records and reports what came of it — it stands, or it was refused.

Reads: the two record ids. Emits: RelationAssertion.

#### stated

The link stands under this node's label — written now, revived, or already there.

Reads `mixed` → emits `RelationAssertion` · 1 in → 1 out

Input:

```
{
  "sourceRecordId": "ckwx_article_7",
  "targetRecordId": "ckwx_source_2"
}
```

Output:

```
{ "outcome": "stated", "reason": null }
```

#### refused

One end names no record this run may read. `UNRESOLVABLE` covers every such cause as ONE answer.

Reads `mixed` → emits `RelationAssertion` · 1 in → 1 out

Input:

```
{
  "sourceRecordId": "ckwx_article_7",
  "targetRecordId": "ckwx_gone"
}
```

Output:

```
{ "outcome": "refused", "reason": "UNRESOLVABLE" }
```
