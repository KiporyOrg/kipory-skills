<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.merge` — Merge records

Fold a duplicate record into the one that stays.

Records naming the duplicate then name the kept record; the duplicate stays only as a redirect.

- **Group:** records · **Phase:** `inline` · **Effect class:** `record-mutation`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `two record ids` → `RecordMerge`
- **Also found as:** deduplicate, combine duplicates, fold twin
- **Reads:** Two record ids of one table: `keep`, the one that stays, and `merge`, its duplicate. _(shape hint: `two record ids`)_
- **Emits:** A `RecordMerge`: the kept record, its folded twin, and `merged` once every record naming the twin names the kept one — or `moving`, with how many still move.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `keep` | union | yes | — | The id of the record that stays. |
| `merge` | union | yes | — | The id of the record folded into it. ⚠️ Fails, changing nothing, when the two differ in table or owner, or would clash on a key. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `keep` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `merge` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `userId` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Folds a twin story into the one that stays.

#### Two twins

Every post naming the twin now names the story that stays; the twin is a redirect.

Reads `{ keep, merge }` → emits `RecordMerge` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "keep": "twins.keep",
  "merge": "twins.merge"
}
```

Input:

```
{ "keep": "ckwx_story_1", "merge": "ckwx_story_2" }
```

Output:

```
{ "keep": "ckwx_story_1", "merged": "ckwx_story_2", "outcome": "merged", "moved": 12, "remaining": 0 }
```
