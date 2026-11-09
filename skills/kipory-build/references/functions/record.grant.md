<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `record.grant` — Share a record

Share one record with a person or a team.

Gives a person or team record read, write, delete or manage on one sharing-table record; a new grant replaces theirs.

- **Group:** records · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string, string` → `boolean`
- **Also found as:** share record, grant access, team member, permission
- **Reads:** Two slots: the record to share, then whom to share it with — a person's user id, or a team record's id. _(shape hint: `string, string`)_
- **Emits:** `true` once the grant is staged; it applies with the run's change set, so a run that fails shares nothing.
- **Inputs (`with`):** `recordId`, `principal`

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `level` | `read` \| `write` \| `delete` \| `manage` \| `member` | no | `"read"` | Their level: `read`, `write`, `delete`, `manage`, or `member` of a team. ⚠️ `member` joins a person to a team record, capped at `memberLevel`; `delete` deletes; `manage` shares onward. |
| `memberLevel` | `read` \| `write` \| `delete` \| `manage` | no | — | With `member` only: the most the team's shares give them (default: all). |
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

Shares one task with a team record, so every member reads it.

#### Shared with a team

Every person holding `member` on the team now reads the task.

Reads `mixed` → emits `boolean` · 1 in → 1 out

Step settings (`with`):

```json
{
  "level": "write"
}
```

Input:

```
{
  "recordId": "ckwx_task_7",
  "principal": "ckwx_team_design"
}
```

Output:

```
true
```
