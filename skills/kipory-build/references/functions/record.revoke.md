<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.revoke` — Stop sharing a record

Stop sharing one record with a person or a team.

Removes the second input's grant — a person, or a team record — on the first input's record.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string, string` → `boolean`
- **Also found as:** unshare record, revoke access, remove member
- **Reads:** Two slots: the record, then whom to stop sharing it with — a person's user id, or a team record's id. _(shape hint: `string, string`)_
- **Emits:** `true` once the revoke of an existing share is staged; `false` when the record was not shared with them (or `ifAbsent: "refuse"` stops the run with a 404).
- **Inputs (`with`):** `recordId`, `principal`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `ifAbsent` | `ignore` \| `refuse` | no | `"ignore"` | If not shared with them: `ignore` answers `false`; `refuse` answers 404. |
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

Removes a person from a team record, so they stop reading what the team shares.

#### Left the team

The person no longer reads the records shared with the team.

Reads `mixed` → emits `boolean` · 1 in → 1 out

Input:

```
{
  "recordId": "ckwx_team_design",
  "principal": "usr_dana"
}
```

Output:

```
true
```
