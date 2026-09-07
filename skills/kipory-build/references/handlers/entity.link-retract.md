<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: 354457218db3b62b5d6c80c656c49e89d091f62d77a5a0d5ea4c102265fb04ac · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.link-retract` — Take back a stated link

Take back a curated link this flow stated earlier.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **I/O:** `string, string` → `RelationRetraction`
- **Reads:** Two slots: the record the link runs FROM, then the one it runs TO. The same pair the assert node was given, in the same order. _(shape hint: `string, string`)_
- **Emits:** A `RelationRetraction`: `retracted` when a link was expired, `not-found` when this actor had nothing to take back. Finding nothing is an ordinary answer, not a failure.
- **Suggested input streams:** `sourceRecordId`, `targetRecordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `actor` | string | yes | — | A label naming what stated the links, e.g. `citation-extractor`. This node reaches only links recorded under it. ⚠️ It decides what can be taken back: a retract node reaches ONLY links stated under the same label, and never one a person made by hand. |
| `kind` | string | yes | — | The link kind's KEY — the stable identifier chosen when the link was created, not its name. ⚠️ Only a kind whose links are stated by hand works here. One backed by an entity field or a join entity is refused exactly as an unknown kind is, so a refusal reveals nothing. |

## Worked example

Takes back one link this node's own label stated, and says whether there was one to take back.

Reads: the two record ids. Emits: RelationRetraction.

#### retracted

The link was expired rather than deleted, so who stated it and when both survive it.

Reads `mixed` → emits `RelationRetraction` · 1 in → 1 out

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

#### not-found

Nothing stood under THIS label. Somebody else's assertion looks identical from here, and cannot be retracted.

Reads `mixed` → emits `RelationRetraction` · 1 in → 1 out

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
