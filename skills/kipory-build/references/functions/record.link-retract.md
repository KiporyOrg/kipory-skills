<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.link-retract` — Remove a link

Remove a link this flow made earlier.

Takes back the link of the relation you name between the record in the first input and the record in the second. The link is expired, not deleted, so who stated it and when both survive.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string, string` → `RelationRetraction`
- **Reads:** Two slots: the record the link runs FROM, then the one it runs TO. The same pair the assert node was given, in the same order. _(shape hint: `string, string`)_
- **Emits:** A `RelationRetraction`: `retracted` when a link was expired, `not-found` when this actor had nothing to take back. Finding nothing is an ordinary answer, not a failure.
- **Suggested input streams:** `sourceRecordId`, `targetRecordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `actor` | string, at most 64 characters | yes | — | A label naming what stated the links, e.g. `citation-extractor`. This node reaches only links recorded under it. ⚠️ It decides what can be taken back: a retract node reaches ONLY links stated under the same label, and never one a person made by hand. |
| `kind` | string | yes | — | The relation's KEY — the stable identifier chosen when the link was created, not its name. ⚠️ Only a relation whose links are stated by hand works here. One backed by a record field or a join record is refused exactly as an unknown relation is, so a refusal reveals nothing. |

## Worked example

Takes back one link this node's own label stated, and says whether there was one to take back.

#### Link removed

The link was expired rather than deleted, so who stated it and when both survive it.

Reads `mixed` → emits `RelationRetraction` · 1 in → 1 out

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
{ "outcome": "retracted" }
```

#### Someone else's link

Nothing stood under THIS label. Somebody else's assertion looks identical from here, and cannot be retracted.

Reads `mixed` → emits `RelationRetraction` · 1 in → 1 out

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
  "targetRecordId": "ckwx_source_9"
}
```

Output:

```
{ "outcome": "not-found" }
```
