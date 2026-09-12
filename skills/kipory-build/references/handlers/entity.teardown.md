<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `entity.teardown` — Tear down a record's derived state

Strip a record's generated files and/or term links before a reprocess.

- **Group:** Entities · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **I/O:** `slot map` → `object`
- **Reads:** The record id, from the slot `recordIdSlot` names. The owner comes from the run, so a record owned by anyone else matches nothing. _(shape hint: `slot map`)_
- **Emits:** One count per target actually run. A target you did not ask for is absent, so a reader can tell 'not asked' from 'nothing to delete'.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `recordIdSlot` | string | yes | — | The slot holding the id of the record to strip. |
| `targets` | string[] | no | `["files","terms"]` | Which stores to clear: generated files, term assignments, or both. Both by default. ⚠️ Files you submitted are never touched, only ones a run generated. Search vectors are not a target — the record is re-projected when it next turns ready. |

## Worked example

Strips what a processing run produced for a record, so the next run starts clean.

Reads: the record id. Emits: what was cleared.

#### files and terms

Both stores are cleared and each reports its own count. Files you submitted are untouched.

Reads `object` → emits `object` · 1 in → 1 out

Input:

```
{ "recordId": "ckwx0a1b2c3d" }
```

Output:

```
{
  "recordId": "ckwx0a1b2c3d",
  "deleted": { "files": 3, "terms": 7 }
}
```

#### nothing to strip

The record has no derived state yet. Counts come back zero rather than as an error.

Reads `object` → emits `object` · 1 in → 1 out

Input:

```
{ "recordId": "ckwx_fresh" }
```

Output:

```
{
  "recordId": "ckwx_fresh",
  "deleted": { "files": 0, "terms": 0 }
}
```
