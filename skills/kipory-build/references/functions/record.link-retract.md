<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.link-retract` — Remove a link

Remove a link this flow made earlier.

Expires the link between the first and second inputs' records, keeping who stated it and when.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string, string` → `RelationRetraction`
- **Also found as:** unlink, disconnect records, delete link
- **Reads:** Two slots: the record the link runs FROM, then the one it runs TO. The same pair the assert node was given, in the same order. _(shape hint: `string, string`)_
- **Emits:** A `RelationRetraction`: `retracted` when a link was expired, `not-found` when this actor had nothing to take back. Finding nothing is an ordinary answer, not a failure.
- **Suggested input streams:** `sourceRecordId`, `targetRecordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `actor` | string, at most 64 characters | yes | — | The label the links were saved under; only those are removed. ⚠️ Removing links reaches only this label's links, never ones made by hand. |
| `relationKey` | string | yes | — | The relation's key, not its name. ⚠️ Only a relation whose links are stated by hand works; others are refused. |
| `userIdSlot` | string | no | — | The slot holding the person a run for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

## Worked example

Takes back one link this node's own label stated, and says whether there was one to take back.

#### Link removed

The link was expired rather than deleted, so who stated it and when both survive it.

Reads `mixed` → emits `RelationRetraction` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "relationKey": "cites",
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
  "relationKey": "cites",
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
