<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.link-assert` — Link two records

Link one record to another.

Links the first input's record to the second's, under this action's label; only that label can undo it.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string, string` → `RelationAssertion`
- **Also found as:** connect records, relate, associate, add link
- **Reads:** Two slots: the record the link runs FROM, then the one it runs TO. They are read by position, so order decides which way a directed link points. _(shape hint: `string, string`)_
- **Emits:** A `RelationAssertion`: `stated` when the link stands — written, revived, or already there — and `refused` when it does not, with `reason` saying why.
- **Suggested input streams:** `sourceRecordId`, `targetRecordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `actor` | string, at most 64 characters | yes | — | A label saved on every link this action writes. ⚠️ Removing links reaches only this label's links, never ones made by hand. |
| `relationKey` | string | yes | — | The relation's key, not its name. ⚠️ Only a relation whose links are stated by hand works; others are refused. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `userId` — one of

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

States one link between two records and reports what came of it — it stands, or it was refused.

#### Linked

The link stands under this node's label — written now, revived, or already there.

Reads `mixed` → emits `RelationAssertion` · 1 in → 1 out

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
{ "outcome": "stated", "reason": null }
```

#### Missing record

One end names no record this run may read. `UNRESOLVABLE` covers every such cause as ONE answer.

Reads `mixed` → emits `RelationAssertion` · 1 in → 1 out

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
  "targetRecordId": "ckwx_gone"
}
```

Output:

```
{ "outcome": "refused", "reason": "UNRESOLVABLE" }
```
