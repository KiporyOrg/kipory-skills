<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.grants` — List a record's shares

List whom one record is shared with, and at which level.

Lists whom a record is shared with: each person or team, the level, a member's level, and when.

- **Group:** records · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `RecordShare[]`
- **Also found as:** list shares, shared with, who has access, members
- **Reads:** One slot: the record whose shares to list. _(shape hint: `string`)_
- **Emits:** A list of `RecordShare`, oldest share first; empty when the record is shared with no one.
- **Inputs (`with`):** `recordId`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `userId` | union | no | — | The person a run that acts for nobody writes for. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

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

Lists whom a note is shared with, for its owner's share panel.

#### Two people

One entry per person the note is shared with.

Reads `mixed` → emits `list` · 1 in → 1 out

Input:

```
"ckwx_note_7"
```

Output:

```
[
  { "principal": "usr_eli", "principalKind": "person", "level": "write", "memberLevel": null, "grantedAt": "2026-11-05T10:00:00.000Z" },
  { "principal": "usr_fay", "principalKind": "person", "level": "read", "memberLevel": null, "grantedAt": "2026-11-05T10:05:00.000Z" }
]
```
