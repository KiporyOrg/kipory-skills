# Sharing a record with a person or a team

A record of a person-owned table (`ownerScope: "user"`) is read only by the person who owns it. Turn
`sharing` on for the table and each record can also be shared: with another person of the project, or
with a team. The record stays its owner's; sharing decides who else reaches it.

## Turn it on

`sharing: true` on the table, in `POST /v1/tables` or `PATCH /v1/tables/{id}` (or the project
document). Only a `user` table shares — a `project` table's records are everyone's already, and the
save refuses `TABLE_SHARING_NEEDS_PERSON_OWNER`. It can be turned on for a table that already has
records; nothing is shared until a record is granted. A project document that restates the table without
`sharing` keeps it as it is. Turning it off makes every grant on the table
inert: owners read their own again, nobody writes or links through a share of it, and a team record of
it makes no members any more. The grants stay and come back if sharing is turned on again.

## A team is a record

There is no separate team object. A team is a record of a sharing table (say `team`), and a person
joins it by being granted `member` on that record. Share a record with the team record and every
member reads it. One level only: a team granted to another team does not pass the second team's
records on — share with each team, or with its people.

## The levels

| Level    | What the person, or every member of the team, may do                         |
| -------- | ---------------------------------------------------------------------------- |
| `read`   | read the record, wherever it is read: list, query, count, views, links       |
| `write`  | also update it, append to its streams, link and unlink it                    |
| `manage` | also share it onward and take a share back (`record.grant`, `record.revoke`) |
| `member` | on a team record only: the person joins the team                             |

A person or a team holds one level on a record: a second grant to them sets the level, lower or
higher, in place of the first. So on a team record `member` and `manage` cannot both stand for one
person — the later grant wins. Let a team record's manager be a member by owning the record, or
manage it from a run that acts for nobody.

A `write` never deletes or merges another person's record: those stay its owner's. A record written
through a share takes no files from the writer (`RECORD_SHARED_NO_FILES`).

## Granting and revoking, inside a flow

`record.grant` takes the record, then whom to share it with (a person's user id or a team record's
id), with `level` in its config; `record.revoke` takes the same two and removes that share. Both
apply with the run's change set, so a run that fails shares nothing. Each record a run shares or
unshares also stages one change for its search index, once per record however many shares, and that
change counts toward the run's limit of changes (`runs.change-set-effects`). The record's owner may grant,
and so may anyone holding `manage` on it. A run that acts for nobody (a schedule, a trigger, a key's
call) acts for the project and may grant on any record of a sharing table. Each function's page is in
`kipory-build` under `references/functions/` (`record.grant.md`, `record.revoke.md`).

```json
{ "functionKey": "record.grant", "functionConfig": { "level": "member" } }
```

with the team record id first and the person's user id second, joins a person to a team.

## What a person reads, then

Every read of a sharing table as a person — `record.read`, `record.list`, `record.count`,
`record.query`, `record.aggregate`, linked reads and a view endpoint called by that person — answers
their own records and every record shared with them or with a team they are a member of. A search
(`semantic` clause) reaches the same set. A share or a revoke counts on the next read: a view's ETag
and a live view move with it. A search finds a newly shared record by meaning once its search index learns the new reader,
normally seconds after the run that shared it. While many shares of one record keep landing, the
index catches up a few times and then leaves the rest to the next reconcile: the daily one, unless
a save that changes what the project indexes starts one sooner. A revoked record is never answered,
even before that.

## What is refused

| Code                              | When                                                                                                                                                                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RECORD_GRANT_NOT_SHARING`        | the record's table does not share                                                                                                                                                                                                                        |
| `RECORD_GRANT_NOT_ALLOWED`        | the run's person neither owns the record nor holds `manage` on it (an absent record reads the same)                                                                                                                                                      |
| `RECORD_GRANT_PRINCIPAL_INVALID`  | `to` is neither a person of the project nor a record of a sharing table; or `member` given to a team                                                                                                                                                     |
| `VIEW_SCOPE_PROJECT_READS_PEOPLE` | a `project`-scope view reads a sharing table — a view reads it as its caller only                                                                                                                                                                        |
| `QUERY_COUNT_REACHES_SHARED`      | a count-only link clause, or `record.link-counts`, reaches a sharing table: the count would include records the run may not read. Filter the far records of a query instead (a `where` or a peer clause reads only what is shared with the run's person) |
| `RECORD_SHARED_NO_FILES`          | an update through a share tries to attach files                                                                                                                                                                                                          |

## When a person leaves

This is the current default, not yet a settled rule, and may change. When a person is erased —
their whole account, or their account in one project — their records on a sharing table pass to the
project instead of being deleted: the content and every share stay, so whoever the records were
shared with keeps reading them. The records no longer have an owner (and lose a natural key, which
was one per person), and neither do their stream events, including ones appended later through a
share; files the person uploaded onto them are erased with the person, and so is every share naming
the person. When the person leaves only one project and is seated in it again, what they made and
what was shared with them since stays theirs. A run that acts for nobody manages those records from
then on.

## Undo and rewind

Shares are not part of a run's history. An undo or a rewind does not take back a share or a revoke,
and a shared record it puts back comes back shared with no one: `notReversed` counts the shares lost
(`record.grants.removed`). See `undo-and-rewind.md`.
