# Build a backend as one document

This page is the way in for a new backend, and for most changes to one. It is one complete project — people sign in and keep their own data, create and list it over HTTP, a total is kept for them, a model writes a sentence, a daily job notifies once by email — as one **project document** that this deployment planned, applied and ran. Copy its shapes. Open another page only for something this one does not show (the last section says which).

## The loop

Every call below is on the **api host** with `Authorization: Bearer <key>`; the product's own endpoints answer on the **project host** (`baseUrl` from `GET /v1/grant`).

```
GET  /v1/grant                                          the project's id (node.id) and its baseUrl
GET  /v1/projects/{nodeId}/document?section=project     basedOn: "<nodeId>@<version>" — your read
POST /v1/projects/{nodeId}/document/plan?basedOn=<version>&label=<yours>   body: the document → ok, planId, diagnostics
POST /v1/projects/{nodeId}/document  { "planId": "…", "note": "why", "label": "<yours>" }   apply the plan you read
```

- **A plan you mean to apply needs `basedOn`** — your read — once the project holds anything; on an empty one the plan takes the version it was built from. After an apply, the answer's `basedOn` is your next read.
- **Gate on `ok` and on each diagnostic's `severity`.** Only `error` refuses; `warning` and `info` block nothing. Fix every error a plan lists in one edit, then plan again.
- **Plan the `document` alone, never an export's envelope** `{ "version", "document" }`. The format is 10 (`"kipory": 10`).
- **A document is partial and every element you state is whole.** Send the sections you change; state each row you send completely (an export states them all). An omitted row is untouched — absence never deletes.
- **Sending mail needs an address first**: `POST /v1/managed-email-addresses { "node": "<nodeId>", "localPart": "tasks", "domain": "<a domain you send from>", "grade": "relay", "displayName": "Tasks" }`. The plan warns `EMAIL_SEND_ADDRESS_UNAVAILABLE` until it exists.

## The example

<!-- prettier-ignore -->
```json
{
  "kipory": 10,
  "types": {
    "Project": {"definition": {"type": "object", "required": ["name"], "properties": {"name": {"type": "string", "minLength": 1, "maxLength": 200}, "watcherEmail": {"type": "string", "maxLength": 320}}}},
    "Task": {"definition": {"type": "object", "required": ["projectId", "title", "state"], "properties": {"projectId": {"type": "string", "maxLength": 64}, "title": {"type": "string", "minLength": 1, "maxLength": 200}, "dueAt": {"type": "string", "format": "date-time"}, "hours": {"type": "number", "minimum": 0}, "state": {"type": "string", "enum": ["open", "done"]}, "summary": {"type": "string"}}}},
    "DueNotice": {"definition": {"type": "object", "required": ["taskId", "day"], "properties": {"taskId": {"type": "string", "maxLength": 64}, "day": {"type": "string", "maxLength": 10}}}},
    "Window": {"definition": {"type": "object", "required": ["from", "to", "day"], "properties": {"from": {"type": "string"}, "to": {"type": "string"}, "day": {"type": "string"}}}},
    "Mail": {"definition": {"type": "object", "required": ["to", "subject", "text"], "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "text": {"type": "string"}}}}
  },
  "tables": {
    "project": {"ownerScope": "user", "type": "Project", "uses": {"fields": []}, "computed": {"hoursDone": {"rollup": {"relation": "in-project", "where": [{"kind": "field", "field": "state", "op": "eq", "value": "done"}], "sum": "hours"}}}},
    "task": {"ownerScope": "user", "type": "Task", "uses": {"fields": [{"source": {"family": "submission", "field": "projectId"}, "uses": [{"kind": "link", "relation": "in-project"}, "filter"]}, {"source": {"family": "submission", "field": "state"}, "uses": ["filter"]}, {"source": {"family": "submission", "field": "dueAt"}, "uses": ["filter"]}, {"source": {"family": "submission", "field": "hours"}, "uses": ["filter"]}]}},
    "dueNotice": {"ownerScope": "user", "type": "DueNotice", "uses": {"fields": [{"source": {"family": "submission", "field": "taskId"}, "uses": ["key"]}]}}
  },
  "relations": {
    "in-project": {"label": "In project", "direction": "directed", "producer": "field", "cardinality": "many-to-one", "pairings": [{"fromTableKey": "task", "toTableKey": "project"}], "description": "A task belongs to one project"}
  },
  "views": {
    "openTasks": {"description": "The signed-in person's open tasks, soonest due first; ?projectId= narrows it.", "table": "task", "params": {"projectId": {"type": "string", "optional": true}}, "where": [{"kind": "field", "field": "state", "op": "eq", "value": {"literal": "open"}}, {"kind": "field", "field": "projectId", "op": "eq", "param": "projectId"}], "order": {"by": "field", "field": "dueAt", "direction": "asc"}, "pageSize": {"default": 50, "max": 100}},
    "myProjects": {"description": "The signed-in person's projects, each with its computed hoursDone.", "table": "project", "pageSize": {"default": 50, "max": 100}}
  },
  "flows": {
    "create-project": {
      "label": "Create project",
      "inputTypeNames": [{"slot": "name", "typeName": "string"}, {"slot": "watcherEmail", "typeName": "string", "required": false}],
      "outputTypeNames": [{"slot": "projectId", "typeName": "string", "required": true}],
      "outputBinding": {"projectId": {"fromSlot": "created", "path": {"segments": [{"kind": "field", "name": "recordId"}]}}},
      "actions": {
        "save": {"functionKey": "record.create", "functionConfig": {"tableKey": "project", "data": {"expr": "{'name': name, 'watcherEmail': watcherEmail}"}}, "outputSlot": "created"}
      }
    },
    "create-task": {
      "label": "Create task",
      "inputTypeNames": [{"slot": "projectId", "typeName": "string"}, {"slot": "title", "typeName": "string"}, {"slot": "dueAt", "typeName": "string", "required": false}, {"slot": "hours", "typeName": "number", "required": false}],
      "outputTypeNames": [{"slot": "taskId", "typeName": "string", "required": true}],
      "outputBinding": {"taskId": {"fromSlot": "created", "path": {"segments": [{"kind": "field", "name": "recordId"}]}}},
      "actions": {
        "own-project": {"functionKey": "record.read", "functionConfig": {"tableKey": "project", "ids": {"expr": "[projectId]"}, "failIfEmpty": true}, "outputSlot": "found"},
        "save": {"functionKey": "record.create", "functionConfig": {"tableKey": "task", "data": {"expr": "{'projectId': found[0].id, 'title': title, 'dueAt': dueAt, 'hours': hours, 'state': 'open'}"}}, "outputSlot": "created"}
      }
    },
    "list-open-tasks": {
      "label": "List open tasks",
      "inputTypeNames": [{"slot": "projectId", "typeName": "string", "required": false}, {"slot": "readAfter", "typeName": "string", "required": false}, {"slot": "readBefore", "typeName": "string", "required": false}, {"slot": "readLimit", "typeName": "number", "required": false}],
      "outputTypeNames": [{"slot": "tasks", "typeName": "object", "required": true}],
      "outputBinding": {"tasks": {"fromSlot": "page"}},
      "actions": {
        "read": {"functionKey": "record.view", "functionConfig": {"view": "openTasks"}, "outputSlot": "page"}
      }
    },
    "list-projects": {
      "label": "List projects",
      "inputTypeNames": [{"slot": "readAfter", "typeName": "string", "required": false}, {"slot": "readBefore", "typeName": "string", "required": false}, {"slot": "readLimit", "typeName": "number", "required": false}],
      "outputTypeNames": [{"slot": "projects", "typeName": "object", "required": true}],
      "outputBinding": {"projects": {"fromSlot": "page"}},
      "actions": {
        "read": {"functionKey": "record.view", "functionConfig": {"view": "myProjects"}, "outputSlot": "page"}
      }
    },
    "complete-task": {
      "label": "Complete task",
      "inputTypeNames": [{"slot": "taskId", "typeName": "string"}],
      "outputTypeNames": [{"slot": "summary", "typeName": "string", "required": true}],
      "outputBinding": {"summary": {"fromSlot": "written"}},
      "actions": {
        "read": {"functionKey": "record.read", "functionConfig": {"tableKey": "task", "ids": {"expr": "[taskId]"}, "failIfEmpty": true}, "outputSlot": "tasks"},
        "title": {"functionKey": "value.transform", "functionConfig": {"expression": "tasks[0].title"}, "outputSchema": {"kind": "ref", "ref": "string"}, "outputSlot": "title"},
        "write": {"functionKey": "text.generate", "taskKey": "summarization", "promptTemplate": "In one sentence, say what finishing the task \"{{title}}\" achieved. Output only the sentence.", "outputSlot": "written", "functionConfig": {}, "outputSchema": {"kind": "ref", "ref": "string"}},
        "save": {"functionKey": "record.update", "functionConfig": {"recordId": "taskId", "fields": {"state": {"literal": "done"}, "summary": "written"}}, "outputSlot": "updated"}
      }
    },
    "notify-everyone": {
      "label": "Start each person's due notices",
      "inputTypeNames": [],
      "outputTypeNames": [],
      "outputBinding": {},
      "actions": {
        "start": {"functionKey": "flow.start-per-person", "functionConfig": {"people": {"kind": "project"}, "target": "notify-due"}, "outputSlot": "started"}
      }
    },
    "notify-due": {
      "label": "Notify once about tasks due tomorrow",
      "inputTypeNames": [],
      "outputTypeNames": [],
      "outputBinding": {},
      "actions": {
        "window": {"functionKey": "value.transform", "functionConfig": {"expression": "($d := $floor($toMillis(runInfo.now) / 86400000) * 86400000; {'from': $fromMillis($d + 86400000), 'to': $fromMillis($d + 172800000), 'day': $substring($fromMillis($d + 86400000), 0, 10)})"}, "outputSchema": {"kind": "ref", "ref": "Window"}, "outputSlot": "win"},
        "due": {"functionKey": "record.query", "functionConfig": {"tableKey": "task", "clauses": [{"kind": "field", "field": "state", "op": "eq", "value": {"literal": "open"}}, {"kind": "field", "field": "dueAt", "op": "gte", "value": "win.from"}, {"kind": "field", "field": "dueAt", "op": "lt", "value": "win.to"}], "limit": 100, "pages": {"max": 10, "onMore": "fail"}}, "outputSlot": "found"},
        "each": {"functionKey": "flow.fan-out", "functionConfig": {"maxParallelBranches": 1}, "inputStreams": ["found"], "inputPaths": [{"segments": [{"kind": "field", "name": "records"}]}], "inputProjectionNames": ["found__records"], "outputSlot": "task"},
        "notice": {"functionKey": "record.create", "functionConfig": {"tableKey": "dueNotice", "onKeyTaken": "skip", "data": {"expr": "{'taskId': task.id, 'day': win.day}"}}, "outputSlot": "created"},
        "project": {"functionKey": "record.read", "functionConfig": {"tableKey": "project", "ids": {"expr": "[task.projectId]"}, "fields": ["watcherEmail"]}, "outputSlot": "projects"},
        "mail": {"functionKey": "value.transform", "functionConfig": {"expression": "($exists(projects[0].watcherEmail) and $not($exists(created.keyTaken) and created.keyTaken)) ? {'to': projects[0].watcherEmail, 'subject': 'Due tomorrow: ' & task.title, 'text': task.title & ' is due ' & $formatDate(task.dueAt, 'yyyy-MM-dd HH:mm')}"}, "outputSchema": {"kind": "ref", "ref": "Mail"}, "outputSlot": "message"},
        "send": {"functionKey": "email.send", "functionConfig": {"address": "tasks@example.test", "to": "message.to", "subject": "message.subject", "text": "message.text"}, "outputSlot": "sent"}
      }
    }
  },
  "surfaces": {
    "endpoints": {
      "create-project": {"contractConfig": {"method": "POST", "path": "/v1/projects-of-mine", "successStatus": 201, "auth": "required", "params": {}}, "targetConfig": {"kind": "flow.invoke", "execution": "sync", "flow": "create-project", "inputs": {"name": {"from": "body"}, "watcherEmail": {"from": "body"}}}},
      "list-projects": {"contractConfig": {"method": "GET", "path": "/v1/projects-of-mine", "successStatus": 200, "auth": "required", "params": {}}, "targetConfig": {"kind": "flow.invoke", "execution": "sync", "flow": "list-projects", "inputs": {}}},
      "create-task": {"contractConfig": {"method": "POST", "path": "/v1/tasks", "successStatus": 201, "auth": "required", "params": {}}, "targetConfig": {"kind": "flow.invoke", "execution": "sync", "flow": "create-task", "inputs": {"projectId": {"from": "body"}, "title": {"from": "body"}, "dueAt": {"from": "body"}, "hours": {"from": "body"}}}},
      "list-open-tasks": {"contractConfig": {"method": "GET", "path": "/v1/tasks", "successStatus": 200, "auth": "required", "params": {}}, "targetConfig": {"kind": "flow.invoke", "execution": "sync", "flow": "list-open-tasks", "inputs": {}}},
      "complete-task": {"contractConfig": {"method": "POST", "path": "/v1/tasks/{id}/complete", "params": {"id": {"in": "path", "type": "string", "required": true}}, "successStatus": 200, "auth": "required"}, "targetConfig": {"kind": "flow.invoke", "execution": "sync", "flow": "complete-task", "inputs": {"taskId": {"from": "path.id"}}}}
    },
    "schedules": {"daily-due-notices": {"label": "Daily due notices", "flow": "notify-everyone", "cronPattern": "0 7 * * *", "tz": "UTC", "overlapPolicy": "skip", "failurePolicy": "pause", "enabled": true, "inputs": {}}}
  }
}
```

## What each part is doing

<!-- field-ok: readAfter — the paging input a flow declares for its `record.view` action `read`, named after the action -->
<!-- field-ok: readBefore — the paging input a flow declares for its `record.view` action `read`, named after the action -->
<!-- field-ok: readLimit — the paging input a flow declares for its `record.view` action `read`, named after the action -->
<!-- field-ok: dueNotice — the example project's own table key -->

- **Ownership is a table setting, not a filter.** `ownerScope: "user"` makes every row the signed-in person's: their reads see only their rows, and `record.read` of another person's id finds nothing — with `failIfEmpty: true` that is a `404` (`create-task` › `own-project`). Write no owner field and no owner filter.
- **A total that must stay right is `computed`, not a read-time sum.** `project.hoursDone` is a `rollup` over the relation `in-project`; the platform recomputes it a few seconds after any task is created, changed or deleted, and no writer can set it. It needs the relation (`relations.in-project`) and a `link` use on the field that holds the parent's id (`task.projectId`). `rollup` also takes `count`, `avg`, `min`, `max`, `latest`; a `formula` (JSONata over the row) and a `lookup` (a field of the linked row) are the other two kinds.
- **A list endpoint is a view.** `views.openTasks` is the read; `list-open-tasks` is one `record.view` action; its `GET` endpoint declares only its path. The query takes the view's params (`?projectId=`, optional: absent reads everything) and pages by `?after=` / `?limit=`. The flow declares the paging inputs `readAfter`, `readBefore`, `readLimit` (named after the action `read`). A view's fixed text is `{ "literal": … }`; it reads no slot and no clock, so "due after now" is a flow (`notify-due`), not a view. **A view orders by `created`, meaning, or a field with a `filter` use**: a date, number, true/false, or text with `maxLength` of at most 500 (`QUERY_ORDER_TEXT_UNBOUNDED` otherwise). For "highest first" on a number, order the view: `{ "by": "field", "field": "total", "direction": "desc" }`.
- **A setting reads a slot by its path**: `"recordId": "taskId"`, `"to": "message.to"`. A fixed value is `{ "literal": "done" }`; an expression is `{ "expr": "[projectId]" }` (JSONata over the slots). A read result is a list: the first record is `found[0]` in an expression. A prompt reads `{{slot}}`, `{{slot.field}}` or `{{slot[0]}}` (a whole text item, no field below it); compute any other value in a `value.transform` first, as `complete-task` › `title` does.
- **A list you return stays a list when it is empty or holds one item.** JSONata turns an empty result into no value and a one-item list into the item, and a required output left with no value refuses the whole call (`422 FLOW_OUTPUT_MISSING`). Return a list an expression builds inside an object, wrapped: `{'items': $list(…)}`, with the flow output typed `object` — `[]` and `[x]` then come back as lists.
- **Leave `inputStreams` out** everywhere but on `flow.fan-out`: the save derives each action's inputs from what its settings, expression or prompt read. In a document, a stated list that differs is replaced by that set, with a `DOCUMENT_INPUTS_REPLACED` warning. A fan-out states its one input as stream and path (`"inputStreams": ["found.records"]` is read that way, and the plan says so with `DOCUMENT_FORM_READ`).
- **Give a model action and an object-building transform an `outputSchema`** (`text.generate` → `{ "kind": "ref", "ref": "string" }`; `window` and `mail` → a named type), or the plan warns that nothing checks what reads it.
- **`record.update` names no table**: it takes `recordId` and the fields to write (`fields`, or `data` as one object; `add` for numbers) — the record knows its table. In a document a `tableKey` there is dropped, said as `DOCUMENT_FORM_READ`.
- **Never once, by the platform**: `dueNotice.taskId` has the `key` use, and `record.create` with `onKeyTaken: "skip"` answers `keyTaken` instead of a second row. Gate the mail on it (`mail`): a re-run of the job creates and sends nothing twice.
- **A daily job for each person**: the schedule starts `notify-everyone`, whose `flow.start-per-person` runs `notify-due` once per project member, as that member — so its reads see that member's rows.
- **Read every page, loudly.** `record.query` reads one page unless `pages` says more; `onMore: "fail"` fails the run when rows remain instead of dropping them in silence (`"stop"` drops them).
- **One run fans out over at most 1,000 items** (the project's `runs.fan-out-items`). Handed more, the fan-out runs none and fails with `FAN_OUT_OVER_LIMIT`; the plan warns `FANOUT_MAY_PASS_LIMIT` when a read can return more. Size the read (`limit` × `pages.max`) to the limit; a longer job continues page by page with `flow.continue` (`patterns.md`): one per flow, after the fan-out's `flow.merge`, in a flow a schedule or trigger starts directly — it refuses a run that acts for a person, so not under `flow.start-per-person` (`START_NEEDS_NO_PERSON`), and refuses inside a sub-flow. Leave `maxItems` out unless you mean to cut the list: items past it are dropped.

## Names and fields that refuse a plan

- **Reserved field names**: `id`, `status`, `statusError`, `createdAt`, `updatedAt`, `processing` — every record already has them. Call yours `state` or `phase`.
- **Keys**: a table key and a slot name are letters and digits, starting with a letter — no `-` or `_` (`dueNotice`, not `due-notice`). Type keys are written like `Task`. Flow and relation keys are lowercase words joined by `-` (`notify-due`); endpoint and schedule keys may use `-`.
- **Filled in when left out** (each said as `DOCUMENT_FORM_READ`): a prompt action's `functionConfig`, an endpoint's `params` (its path's own parameters) and `inputs`, a schedule's `inputs`, a relation's `description` — on a row the project already holds, with the value it holds. A flow's `inputTypeNames` and `outputTypeNames` are still required (`[]` for a flow nobody calls).
- **An expression names record fields exactly as the type has them**; a field the record lacks is refused `JSONATA_FIELD_UNKNOWN`. Inside a filter `[…]` a bare name is the item's field: write `$$.slot` for a flow slot.
- **A list input is a list**: `{ "slot": "tags", "typeName": "string", "isList": true }`, never `object` — the endpoint publishes the type you declare. **"Left out" is `$not($exists(tag))`**: `$not(tag)` of an absent input is nothing, not true.
- **`record.aggregate` totals only fields with a `filter` use.** For a per-record total prefer `computed`.

## Try it as a person, then change it

- **Test users** sign in for you: `POST /v1/test-users { "project": "<nodeId>", "name": "alice" }` answers a `session`; call the project host with `Authorization: Bearer <session>`. A second user proves isolation.
- **A schedule never starts a run for a test user** (test memberships are not the project's people). Rehearse the per-person flow instead: `POST /v1/flows/{id}/preview-runs { "input": { "kind": "slots", "inputs": {}, "principal": "end-user", "runAsUserId": "<test user id>" }, "apply": false }`, then `GET /v1/runs/{runId}/trace`.
- **Changing a type or a flow that an endpoint serves**: a change that only adds optional fields (a new optional field on `Project`, an optional input to `create-task`, a new output) is adopted by the plan for every endpoint serving it (`DOCUMENT_ADOPTED_ADDITIVE`). Any other change — a field removed, retyped or made required — is refused `TYPE_RESHAPES_BOUND_SNAPSHOTS` / `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` until the row you change carries `"adoptSnapshots": true`.
- **Adding a field**: state the type whole with the new field optional; add a `filter` use if a view, a query or a total reads it.

## When to open another page

| You need                                              | Read                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| a function this example does not use                  | `functions/README.md` (one line each), then that function's page |
| a refusal you cannot read                             | `kipory-connect`'s `references/refusal-codes.md`, by code        |
| a project that already holds records you will reshape | `kipory-evolve`                                                  |
| search by meaning, files, outside APIs                | `kipory-retrieve`, `kipory-extract`, `kipory-gather`             |
| every rule of the document                            | `document.md`                                                    |
