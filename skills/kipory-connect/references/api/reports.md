<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Reports

Tell Kipory what stopped you — an unexpected error, a doc that said something untrue, a missing capability — one problem per report, and read back where each stands and Kipory's answer. Any key of the project files one, whatever its role. When to file is `SKILL.md`, "When something stops you".

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/reports`](#get-v1-reports) |  |
| `POST` | [`/v1/reports`](#post-v1-reports) |  |
| `GET` | [`/v1/reports/{id}`](#get-v1-reports-id) |  |

### `GET /v1/reports`

Your project's reports, newest first, walked on `after`/`before` — each with where it stands and Kipory's answer when there is one. Filter with `state` (`state=received&state=looking&state=planned` for the open ones). Read this at the start of a session to see what changed. File one with `POST /v1/reports`. Your project's refused requests are `GET /v1/rejected-requests`; the platform's own events about your project (failed runs, price changes) are `GET /v1/project-events`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose reports to read. Required. |
| `state` | `"received" \| "looking" \| "planned" \| "fixed" \| "answered" \| "confirmed" \| "wont-do" \| "received" \| "looking" \| "planned" \| "fixed" \| "answered" \| "confirmed" \| "wont-do"[]` | no | Only reports in this state, or in any of several. The open ones are `state=received&state=looking&state=planned`. |
| `limit` | `integer` | no | Rows per page, newest first. Defaults to 50, up to 200. Follow `nextCursor` as `after` for older rows. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `reports` | `object[]` | yes | Newest first by `createdAt`, then id. |
| `paging` | `null` | yes | Always null: no page count is given and no `page` jump is offered. Walk with `after`/`before`. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `reports`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The report's id. |
| `project` | `string` | yes | Node id of the project it belongs to. |
| `createdAt` | `string` | yes | When it was filed, as an ISO-8601 instant. |
| `updatedAt` | `string` | yes | When it last changed, as an ISO-8601 instant. |
| `state` | `"received" \| "looking" \| "planned" \| "fixed" \| "answered" \| "confirmed" \| "wont-do"` | yes | Where the report stands: `received` — filed, not yet looked at; `looking` — being looked at; `planned` — a fix is planned; `fixed` — the fix shipped; `answered` — answered without a fix; `confirmed` — the reporter confirmed the fix works (no route sets it yet); `wont-do` — it will not be changed, and `staffAnswer` says why. |
| `reporter` | `object` | yes | Who filed it — never more than the key's prefix. |
| `trying` | `string` | yes | What the reporter was trying to do. Secrets, emails and phone numbers were replaced before it was kept. |
| `happened` | `string` | yes | What happened instead. Secrets, emails and phone numbers were replaced before it was kept. |
| `expected` | `string \| null` | yes | What the reporter expected; null when not given. |
| `impact` | `"blocked" \| "worked-around" \| "annoyance"` | yes | How badly it stopped you: `blocked` — you cannot go on; `worked-around` — you found another way, at a cost; `annoyance` — minor. |
| `kind` | `"bug" \| "missing-capability" \| "docs-wrong" \| "unclear-message" \| "question" \| "praise" \| null` | yes | What kind of problem it is: `bug` — the platform did something wrong; `missing-capability` — something you need does not exist; `docs-wrong` — a doc or skill said something untrue or left out what you needed; `unclear-message` — an answer you could not act on; `question`; `praise` — something that worked well. |
| `surface` | `string \| null` | yes | Where it happened, as the reporter gave it. |
| `timeLostMinutes` | `integer \| null` | yes | About how many minutes it cost, as the reporter gave it. |
| `requestIds` | `string[]` | yes | Request ids the reporter quoted. |
| `runIds` | `string[]` | yes | Run ids the reporter quoted. |
| `skill` | `string \| null` | yes | The skill the reporter was following. |
| `agent` | `string \| null` | yes | The agent's model and host, as given. |
| `staffAnswer` | `string \| null` | yes | Kipory's answer to this report; null until there is one. |
| `changelogLine` | `string \| null` | yes | When `state` is `fixed`: the line that announced the fix; null otherwise. |

### `POST /v1/reports`

File a report: something on Kipory stopped you — an unexpected error, a doc or skill that said something untrue, a missing capability, an answer you could not act on. One problem per report. Any key of the project files one, whatever its role, and so does a signed-in member. Secrets, emails and phone numbers in the text are replaced before it is kept. The same text from the same key or person within 24 hours answers 200 with the earlier report; a key or person files at most 10 a minute and 20 in any 24 hours in one project, and the project takes at most 100 in any 24 hours from every key and person together (past it, 429 `RATE_LIMITED` with `details.scope: "project"`). Read it later at the answer's `statusUrl` (`GET /v1/reports/{id}?project=`), and your project's reports, filtered by `state`, with `GET /v1/reports`. Your project's refused requests are `GET /v1/rejected-requests`; the platform's own events about your project (failed runs, price changes) are `GET /v1/project-events`.

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project you were working on. Required. |
| `trying` | `string` | yes | What you were trying to do, in a sentence or two — the goal, not the call. 10–2000 characters. |
| `happened` | `string` | yes | What happened instead: the answer, the error code, what you tried next. One problem — file a second report for a second one. 10–4000 characters. |
| `impact` | `"blocked" \| "worked-around" \| "annoyance"` | yes | How badly it stopped you: `blocked` — you cannot go on; `worked-around` — you found another way, at a cost; `annoyance` — minor. |
| `kind` | `"bug" \| "missing-capability" \| "docs-wrong" \| "unclear-message" \| "question" \| "praise"` | no | What kind of problem it is: `bug` — the platform did something wrong; `missing-capability` — something you need does not exist; `docs-wrong` — a doc or skill said something untrue or left out what you needed; `unclear-message` — an answer you could not act on; `question`; `praise` — something that worked well. |
| `expected` | `string` | no | What you expected instead. Up to 2000 characters. |
| `surface` | `string` | no | Where it happened: a route such as `POST /v1/records/query`, or a function key such as `url.fetch`. |
| `timeLostMinutes` | `integer` | no | About how many minutes it cost you. |
| `requestIds` | `string[]` | no | Request ids from the answers that went wrong (`requestId` in an error, `x-request-id` on any answer), up to 10. Quote them: they are how the failure is found. |
| `runIds` | `string[]` | no | Run ids of runs that went wrong, up to 10. |
| `skill` | `string` | no | The skill you were following, and the skills bundle version when you know it, e.g. `kipory-connect, skills bundle 1.42.0`. |
| `agent` | `string` | no | When an agent files: its model and where it runs, e.g. `claude-sonnet-5-5 in Claude Code`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The report's id. |
| `status` | `"received" \| "looking" \| "planned" \| "fixed" \| "answered" \| "confirmed" \| "wont-do"` | yes | Where the report stands: `received` — filed, not yet looked at; `looking` — being looked at; `planned` — a fix is planned; `fixed` — the fix shipped; `answered` — answered without a fix; `confirmed` — the reporter confirmed the fix works (no route sets it yet); `wont-do` — it will not be changed, and `staffAnswer` says why. |
| `statusUrl` | `string` | yes | Where to read it later: `GET` this path with any key of the project. |
| `duplicateOf` | `string \| null` | yes | Always null when filed: a report found to be the same problem as another is joined to it later. |
| `note` | `string \| null` | yes | Something to know about this report, e.g. that it reads as several problems and each should be its own report, or that the same text was already filed and this is its id. Null otherwise. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The report's id. |
| `status` | `"received" \| "looking" \| "planned" \| "fixed" \| "answered" \| "confirmed" \| "wont-do"` | yes | Where the report stands: `received` — filed, not yet looked at; `looking` — being looked at; `planned` — a fix is planned; `fixed` — the fix shipped; `answered` — answered without a fix; `confirmed` — the reporter confirmed the fix works (no route sets it yet); `wont-do` — it will not be changed, and `staffAnswer` says why. |
| `statusUrl` | `string` | yes | Where to read it later: `GET` this path with any key of the project. |
| `duplicateOf` | `string \| null` | yes | Always null when filed: a report found to be the same problem as another is joined to it later. |
| `note` | `string \| null` | yes | Something to know about this report, e.g. that it reads as several problems and each should be its own report, or that the same text was already filed and this is its id. Null otherwise. |

### `GET /v1/reports/{id}`

One of your project's reports: what was filed, where it stands, and Kipory's answer when there is one. A report of another project answers 404. All of the project's reports are `GET /v1/reports`. Your project's refused requests are `GET /v1/rejected-requests`; the platform's own events about your project (failed runs, price changes) are `GET /v1/project-events`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The report's id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project the report belongs to. Required. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The report's id. |
| `project` | `string` | yes | Node id of the project it belongs to. |
| `createdAt` | `string` | yes | When it was filed, as an ISO-8601 instant. |
| `updatedAt` | `string` | yes | When it last changed, as an ISO-8601 instant. |
| `state` | `"received" \| "looking" \| "planned" \| "fixed" \| "answered" \| "confirmed" \| "wont-do"` | yes | Where the report stands: `received` — filed, not yet looked at; `looking` — being looked at; `planned` — a fix is planned; `fixed` — the fix shipped; `answered` — answered without a fix; `confirmed` — the reporter confirmed the fix works (no route sets it yet); `wont-do` — it will not be changed, and `staffAnswer` says why. |
| `reporter` | `object` | yes | Who filed it — never more than the key's prefix. |
| `trying` | `string` | yes | What the reporter was trying to do. Secrets, emails and phone numbers were replaced before it was kept. |
| `happened` | `string` | yes | What happened instead. Secrets, emails and phone numbers were replaced before it was kept. |
| `expected` | `string \| null` | yes | What the reporter expected; null when not given. |
| `impact` | `"blocked" \| "worked-around" \| "annoyance"` | yes | How badly it stopped you: `blocked` — you cannot go on; `worked-around` — you found another way, at a cost; `annoyance` — minor. |
| `kind` | `"bug" \| "missing-capability" \| "docs-wrong" \| "unclear-message" \| "question" \| "praise" \| null` | yes | What kind of problem it is: `bug` — the platform did something wrong; `missing-capability` — something you need does not exist; `docs-wrong` — a doc or skill said something untrue or left out what you needed; `unclear-message` — an answer you could not act on; `question`; `praise` — something that worked well. |
| `surface` | `string \| null` | yes | Where it happened, as the reporter gave it. |
| `timeLostMinutes` | `integer \| null` | yes | About how many minutes it cost, as the reporter gave it. |
| `requestIds` | `string[]` | yes | Request ids the reporter quoted. |
| `runIds` | `string[]` | yes | Run ids the reporter quoted. |
| `skill` | `string \| null` | yes | The skill the reporter was following. |
| `agent` | `string \| null` | yes | The agent's model and host, as given. |
| `staffAnswer` | `string \| null` | yes | Kipory's answer to this report; null until there is one. |
| `changelogLine` | `string \| null` | yes | When `state` is `fixed`: the line that announced the fix; null otherwise. |
