<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.teardown` — Clear generated data

Clear a record's generated files and terms so it can be processed again.

Submitted inputs are untouched, and running it twice does no harm.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `record id` → `object`
- **Also found as:** reset record, clear derived data, clean up record
- **Reads:** The record id, from `recordId`. The owner comes from the run, so a record owned by anyone else matches nothing. _(shape hint: `record id`)_
- **Emits:** One count per target actually run. A target you did not ask for is absent, so a reader can tell 'not asked' from 'nothing to delete'.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `recordId` | union | yes | — | The id of the record to strip. |
| `targets` | string[], at least 1 item | no | `["files","terms"]` | Which to clear: generated files, term assignments, or both (default). ⚠️ The search index is kept; the record is indexed again when it next turns ready. |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `recordId` — one of

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

Strips what a processing run produced for a record, so the next run starts clean.

#### Files and terms

Both stores are cleared and each reports its own count. Files you submitted are untouched.

Reads `object` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordId": "record.recordId",
  "targets": [
    "files",
    "terms"
  ]
}
```

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

#### Nothing to clear

The record has no derived state yet. Counts come back zero rather than as an error.

Reads `object` → emits `object` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recordId": "record.recordId",
  "targets": [
    "files",
    "terms"
  ]
}
```

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
