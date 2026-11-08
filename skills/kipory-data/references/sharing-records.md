# Sharing a record with a person or a team

<!-- field-ok: ownerId — a member of a flow's record row read through a share (423-record-sharing-gaps), not a wire field -->
<!-- field-ok: sharedAt — a member of a flow's record row read through a share (423-record-sharing-gaps), not a wire field -->

A record of a person-owned table (`ownerScope: "user"`) is read only by the person who owns it. Turn
`sharing` on for the table and each record can also be shared: with another person of the project, or
with a team. The record stays its owner's; sharing decides who else reaches it, and at which level.

Build sharing on these built-ins rather than on a table of your own: a read tells you what the person
may do, and the writes answer 403 and 404 by themselves.

## Turn it on

`sharing: true` on the table, in `POST /v1/tables` or `PATCH /v1/tables/{id}` (or the project
document). Only a `user` table shares — a `project` table's records are everyone's already, and the
save refuses `TABLE_SHARING_NEEDS_PERSON_OWNER`. It can be turned on for a table that already has
records; nothing is shared until a record is granted. A project document that restates the table without
`sharing` keeps it as it is.

Turning it off is refused while a flow still lists the table's `whose: "own"` or `"shared"` records, or
reads `access`, `ownerId` or `sharedAt` (`TABLE_FIELD_STILL_READ`, naming each reader); change those
first, or both in one project document. Once off, every grant on the table is inert: owners read their
own again, nobody writes or links through a share of it, and a team record of it makes no members any
more. It applies to runs that start after the save; a run already going finishes as it began. The grants
stay and come back if sharing is turned on again.

A sharing table's records carry `access`, `ownerId` and `sharedAt` when a person reads them, so the
table may not declare a field of those names (`TABLE_FIELD_RESERVED_BY_SHARING`). A table that shared
before this rule keeps a field of those names it already had; a person's read shows the sharing members
in their place.

## The levels

| Level    | What the person, or every member of the team, may do                   |
| -------- | ---------------------------------------------------------------------- |
| `read`   | read the record, wherever it is read: list, query, count, views, links |
| `write`  | also update it, append to its streams, link and unlink it              |
| `delete` | also delete it                                                         |
| `manage` | also share it onward, take a share back and list its shares            |
| `member` | on a team record only: the person joins the team                       |

Of `read`, `write`, `delete` and `manage`, each includes the ones above it. A person or a team holds one level on a record: a second grant to
them sets the level, lower or higher, and the share's time, in place of the first.

A record written through a share takes no files from the writer (`RECORD_SHARED_NO_FILES`).

## A team is a record

There is no separate team object. A team is a record of a sharing table (say `space`), and a person
joins it by being granted `member` on that record, with `memberLevel` saying the most the team's shares
give them. Share a record with the team record and every member reaches it at the lower of the two:

```json
{
  "functionKey": "record.grant",
  "functionConfig": { "level": "member", "memberLevel": "read" }
}
```

with the team record id first and the person's user id second, makes them a reading member. A page
shared with the space at `delete` is then read by that member, and updated and deleted by a member
whose `memberLevel` is `delete`. A `member` grant without `memberLevel` gives them whatever the team
holds. One level only: a team granted to another team does not pass the second team's records on.

A person shares with a team they can see: their own team record, one they are a member of, or one
shared with them. Any other team answers as an id that does not exist. A run that acts for nobody (a
schedule, a trigger) may share with any team of the project.

## What a read tells you

Every read of a sharing table as a person — `record.read`, `record.list`, `record.query`,
`record.aggregate` and `record.count`, linked reads, a search (a `record.query` semantic clause), and a
view endpoint called by that person — answers their own records and every record shared with them or with a team they are a
member of. Each record `record.read`, `record.list`, `record.query` (its search hits included), a linked read or
a view without a shape answers them carries (a view with a shape answers its shape's properties only):

- `access` — what they may do: `owner`, `read`, `write`, `delete` or `manage` (their best path, a
  team's share capped at their member level);
- `ownerId` — the owner's user id.

So one `record.read` with `failIfEmpty` answers "may this person see it" (a 404 when not) and "what may
they do" — no lookup of your own. Branch on `access` to hide a button, to refuse an owner-only field
(`request.refuse` with 403), or to leave a field out of the answer. A read made for nobody (a schedule,
a trigger) carries neither field.

A share or a revoke counts on the next read: a view's ETag and a live view move with it. A search finds
a newly shared record by meaning once its search index learns the new reader, normally seconds after
the run that shared it. While many shares of one record keep landing, the index catches up a few times
and then leaves the rest to the next reconcile: the daily one, unless a save that changes what the
project indexes starts one sooner. A revoked record is never answered, even before that.

`record.list` takes `whose`:

| `whose`  | Answers                                                                                |
| -------- | -------------------------------------------------------------------------------------- |
| `all`    | the default: their own and what is shared with them                                    |
| `own`    | only their own records                                                                 |
| `shared` | only what is shared with them and not theirs, newest share first, each with `sharedAt` |

`shared` pages by cursor like any list and takes `statuses` and `limit`; it takes no other sort or
filter. A share made again moves the record to the front, so a walk already past the front does not
meet it again.

## Granting, revoking and listing, inside a flow

`record.grant` takes the record, then whom to share it with (a person's user id or a team record's
id), with `level` in its config. `record.revoke` takes the same two and removes that share: it answers
`true` when it removed one and `false` when there was none — or, with `ifAbsent: "refuse"`, a 404. Both
apply with the run's change set, so a run that fails shares nothing. Each record a run shares or unshares also
stages one change for its search index, once per record however many shares, and that change counts
toward the run's limit of changes (`runs.change-set-effects`). The run's later actions still read the shares as
they were when it began: share a record and write to it as the new sharee in two runs, not one. `record.grants` lists a record's
shares: whom, the level, a member's own level and when, oldest first. The record's owner may do all
three, and so may anyone holding `manage` on it. A run that acts for nobody (a schedule, a trigger, a
key's call) acts for the project and may on any record of a sharing table. Each function's page is in
`kipory-build` under `references/functions/` (`record.grant.md`, `record.revoke.md`, `record.grants.md`).

## What is refused

A person a record is **not** shared with gets exactly the answer a record that does not exist gets: a
read leaves it out (`failIfEmpty` answers 404), a write finds nothing to change, and a share, revoke or
list of shares answers 404. Nobody learns that it exists. A person it **is** shared with, but below the
level the act needs, is refused **403**:

| Code                              | Status | When                                                                                                                                                                        |
| --------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RECORD_SHARE_LEVEL_TOO_LOW`      | 403    | updating, appending to, linking or unlinking below `write`; deleting below `delete`                                                                                         |
| `RECORD_GRANT_NOT_ALLOWED`        | 403    | sharing, revoking or listing shares, by someone who sees the record but holds no `manage`                                                                                   |
| `RECORD_GRANT_ABSENT`             | 404    | `record.revoke` with `ifAbsent: "refuse"`, and the record is not shared with them                                                                                           |
| `RECORD_GRANT_NOT_SHARING`        | 422    | the record's table does not share (`record.grant`, `record.revoke`, `record.grants`, asked by its owner or the project's automation; anyone else gets the 404)              |
| `RECORD_GRANT_PRINCIPAL_INVALID`  | 422    | whom you share with (`record.grant`'s second input) is neither a person of the project nor a team record (of a sharing table) they can see; or `member` given to a team     |
| `RECORD_LIST_WHOSE_NOT_SHARING`   | save   | `whose` other than `all` on a table that does not share                                                                                                                     |
| `VIEW_SCOPE_PROJECT_READS_PEOPLE` | save   | a `project`-scope view reads a sharing table — a view reads it as its caller only                                                                                           |
| `QUERY_COUNT_REACHES_SHARED`      | 422    | a count-only link clause, or `record.link-counts`, reaches a sharing table: the count would include records the run may not read. Filter the far records of a query instead |
| `RECORD_SHARED_NO_FILES`          | 422    | an update through a share tries to attach files                                                                                                                             |

A `record.delete` of several ids, one of which the person reaches below `delete`, deletes none of them.
A merge stays the owner's: no level lets a person merge someone else's record.

A refusal's own code rides as `details.reason` beside the status's envelope code (`FORBIDDEN`,
`NOT_FOUND`); `QUERY_COUNT_REACHES_SHARED` is the envelope's `code` itself. A save-time refusal answers 422 `VALIDATION_FAILED` and names its code in the message: a table's leads
it (`TABLE_FIELD_RESERVED_BY_SHARING: …`), an action's follows the action's name (`list: RECORD_LIST_WHOSE_NOT_SHARING: …`).
When your product wants a 404 where the built-in answers 403 (say, "anyone but the recipient gets 404"),
check `access` first and answer with `request.refuse`.

## When a person leaves

When a person is erased — their whole account, or their account in one project — their records on a
sharing table are deleted with them, like their other records: whoever they were shared with no longer
reads them, and every share on them goes too. The edits the person made on other people's records,
through a share, stay as made; the shares naming the person go.

## Undo and rewind

Shares are not part of a run's history. An undo or a rewind does not take back a share or a revoke,
and a shared record it puts back comes back shared with no one: `notReversed` counts the shares lost
(`record.grants.removed`). See `undo-and-rewind.md`.
