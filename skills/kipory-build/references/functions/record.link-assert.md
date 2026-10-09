<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.link-assert` — Link two records

Link one record to another.

Writes one link of the relation you name, from the record in the first input to the record in the second. The link is stated under the label you give this action, and only an action with the same label can take it back.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string, string` → `RelationAssertion`
- **Reads:** Two slots: the record the link runs FROM, then the one it runs TO. They are read by position, so order decides which way a directed link points. _(shape hint: `string, string`)_
- **Emits:** A `RelationAssertion`: `stated` when the link stands — written, revived, or already there — and `refused` when it does not, with `reason` saying why.
- **Suggested input streams:** `sourceRecordId`, `targetRecordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `actor` | string, at most 64 characters | yes | — | A label naming what is doing the stating, e.g. `citation-extractor`. It is recorded on every link this node writes. ⚠️ It decides what can be taken back: a retract node reaches ONLY links stated under the same label, and never one a person made by hand. |
| `kind` | string | yes | — | The relation's KEY — the stable identifier chosen when the link was created, not its name. ⚠️ Only a relation whose links are stated by hand works here. One backed by a record field or a join record is refused exactly as an unknown relation is, so a refusal reveals nothing. |

## Worked example

States one link between two records and reports what came of it — it stands, or it was refused.

#### Linked

The link stands under this node's label — written now, revived, or already there.

Reads `mixed` → emits `RelationAssertion` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "kind": "cites",
  "actor": "citation-linker"
}
```

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

#### Missing record

One end names no record this run may read. `UNRESOLVABLE` covers every such cause as ONE answer.

Reads `mixed` → emits `RelationAssertion` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "kind": "cites",
  "actor": "citation-linker"
}
```

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
