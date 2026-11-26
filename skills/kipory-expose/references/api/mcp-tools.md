<!-- generated: kipory-skills references · source: the deployment's route manifest and OpenAPI document · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Tools for AI apps

Flows a project offers to AI apps over the Model Context Protocol, beside its endpoints: each a name an app calls, the flow it runs, its description and who may call it. A tool binds no inputs: an app sends the flow's own. `invokeUrl` is the project's `/mcp` address and may be null on a deployment with no derivable public host. The connected-apps read lists the AI apps people signed in from.

Fields are listed one level deep with the text the API itself carries; a response field that is a list of objects also lists the fields of each item. The full shape of every request and response is `GET /v1/openapi.json` on the deployment you are building on, and it wins if the two disagree.

## Routes

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | [`/v1/mcp-tools`](#get-v1-mcp-tools) |  |
| `POST` | [`/v1/mcp-tools`](#post-v1-mcp-tools) |  |
| `GET` | [`/v1/mcp-tools/{id}`](#get-v1-mcp-tools-id) |  |
| `PATCH` | [`/v1/mcp-tools/{id}`](#patch-v1-mcp-tools-id) |  |
| `DELETE` | [`/v1/mcp-tools/{id}`](#delete-v1-mcp-tools-id) |  |
| `GET` | [`/v1/projects/{nodeId}/connected-apps`](#get-v1-projects-nodeid-connected-apps) |  |
| `GET` | [`/v1/projects/{nodeId}/connected-apps/decisions`](#get-v1-projects-nodeid-connected-apps-decisions) |  |

### `GET /v1/mcp-tools`

List one project's tools (`?project=<nodeId>`), by key: each a flow the project offers to AI apps over the Model Context Protocol, with the `version` its PATCH takes, what its flow does (`access`) and the address AI apps connect to (`invokeUrl`). The same rows, as authored, ride `GET /v1/bootstrap` (`tools`) and the `tools` section of `GET /v1/projects/{nodeId}/document`. A project's HTTP entry points: `GET /v1/api-endpoints`.

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project whose tools to list. Required. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `tools` | `object[]` | yes | The project's tools, by key. Unpaged: a project holds at most `tools.per-project` of them. |

Each item of `tools`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the tool — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The tool's name, as AI apps call it. |
| `flowId` | `string` | yes | Id of the flow the tool runs. |
| `flowKey` | `string \| null` | yes | Key of the flow the tool runs; null when it no longer exists. |
| `flowLabel` | `string \| null` | yes | Name of the flow the tool runs; null when it no longer exists. |
| `title` | `string \| null` | yes | The tool's title, or null. |
| `description` | `string \| null` | yes | The tool's own description, or null when it is listed with its flow's. |
| `auth` | `"required" \| "none"` | yes | Who may call the tool: `required` or `none` (public). |
| `publicRpm` | `integer \| null` | yes | A public tool's calls a minute, all callers together; null when not set. |
| `access` | `object` | yes | What the tool's flow does, read from the flow as it is now. |
| `describedBy` | `"tool" \| "flow" \| null` | yes | Where the description AI apps read comes from: the tool's own (`tool`), its flow's (`flow`), or none (null). |
| `invokeUrl` | `string \| null` | yes | The address an AI app connects to for this project's tools; null where the environment has no public host. |
| `lastUsedAt` | `string \| null` | yes | When a run last started from this tool; null when none has, or when `lastUsedMeasured` is false. |
| `lastUsedMeasured` | `boolean` | yes | Whether `lastUsedAt` was measured. False when the read of the project's runs could not finish in time, or stopped at its bound before it met a run of this tool: `lastUsedAt` is then null and says nothing, never that the tool has not run. |
| `version` | `integer` | yes | The version a PATCH of this tool takes. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `createdAt` | `string` | yes | When the tool was created. |
| `updatedAt` | `string` | yes | When the tool last changed. |

### `POST /v1/mcp-tools`

Offer a flow of the project to AI apps as a tool. With no `flowId`, the flow whose key is the tool's key. Refused (422) when the flow does not exist, has a required `internal` input, or — for a public tool (`auth: "none"`) — needs a signed-in person; refused (409 `TOOL_LIMIT_REACHED`) past the project's tool limit; making a tool public whose flow calls a model or a metered vendor needs ADMIN (403). With `validateOnly: true` it answers whether the create would be refused and what it would be warned of, writing nothing. Several tools at once, beside the flows they run: the `tools` section of `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `project` | `string` | yes | Node id of the project that will offer the tool. |
| `key` | `string` | yes | The tool's name, as an AI app sees and calls it: a lowercase letter, then up to 63 lowercase letters, digits, dashes and underscores. Unique in the project. |
| `flowId` | `string` | no | The flow the tool runs. Left out, the flow whose key is the tool's key. |
| `title` | `string \| null` | no | A short name an AI app may show for the tool, up to 80 characters. |
| `description` | `string \| null` | no | What the tool does, as an AI app reads it to decide when to call it, up to 1024 characters. Left out, the tool is listed with its flow's description. |
| `auth` | `"required" \| "none"` | no | Who may call the tool. `required` (the default): an AI app signed in with a key or as a person. `none`: anyone, with no credential — the tool is PUBLIC, its run has no user and the project pays for it. A public tool's flow may not need a signed-in person. |
| `publicRpm` | `integer` | no | Only with `auth: "none"`: how many calls a minute the tool accepts from all callers together (1–600). Left out, a public tool takes the platform's default rate. |
| `validateOnly` | `boolean` | no | Check this body and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

**Response `201`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the tool — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The tool's name, as AI apps call it. |
| `flowId` | `string` | yes | Id of the flow the tool runs. |
| `flowKey` | `string \| null` | yes | Key of the flow the tool runs; null when it no longer exists. |
| `flowLabel` | `string \| null` | yes | Name of the flow the tool runs; null when it no longer exists. |
| `title` | `string \| null` | yes | The tool's title, or null. |
| `description` | `string \| null` | yes | The tool's own description, or null when it is listed with its flow's. |
| `auth` | `"required" \| "none"` | yes | Who may call the tool: `required` or `none` (public). |
| `publicRpm` | `integer \| null` | yes | A public tool's calls a minute, all callers together; null when not set. |
| `access` | `object` | yes | What the tool's flow does, read from the flow as it is now. |
| `describedBy` | `"tool" \| "flow" \| null` | yes | Where the description AI apps read comes from: the tool's own (`tool`), its flow's (`flow`), or none (null). |
| `invokeUrl` | `string \| null` | yes | The address an AI app connects to for this project's tools; null where the environment has no public host. |
| `lastUsedAt` | `string \| null` | yes | When a run last started from this tool; null when none has, or when `lastUsedMeasured` is false. |
| `lastUsedMeasured` | `boolean` | yes | Whether `lastUsedAt` was measured. False when the read of the project's runs could not finish in time, or stopped at its bound before it met a run of this tool: `lastUsedAt` is then null and says nothing, never that the tool has not run. |
| `version` | `integer` | yes | The version a PATCH of this tool takes. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `createdAt` | `string` | yes | When the tool was created. |
| `updatedAt` | `string` | yes | When the tool last changed. |

### `GET /v1/mcp-tools/{id}`

Read one tool. Every tool of a project at once: `GET /v1/mcp-tools?project=`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The tool's id, as returned when it was created or listed. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the tool — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The tool's name, as AI apps call it. |
| `flowId` | `string` | yes | Id of the flow the tool runs. |
| `flowKey` | `string \| null` | yes | Key of the flow the tool runs; null when it no longer exists. |
| `flowLabel` | `string \| null` | yes | Name of the flow the tool runs; null when it no longer exists. |
| `title` | `string \| null` | yes | The tool's title, or null. |
| `description` | `string \| null` | yes | The tool's own description, or null when it is listed with its flow's. |
| `auth` | `"required" \| "none"` | yes | Who may call the tool: `required` or `none` (public). |
| `publicRpm` | `integer \| null` | yes | A public tool's calls a minute, all callers together; null when not set. |
| `access` | `object` | yes | What the tool's flow does, read from the flow as it is now. |
| `describedBy` | `"tool" \| "flow" \| null` | yes | Where the description AI apps read comes from: the tool's own (`tool`), its flow's (`flow`), or none (null). |
| `invokeUrl` | `string \| null` | yes | The address an AI app connects to for this project's tools; null where the environment has no public host. |
| `lastUsedAt` | `string \| null` | yes | When a run last started from this tool; null when none has, or when `lastUsedMeasured` is false. |
| `lastUsedMeasured` | `boolean` | yes | Whether `lastUsedAt` was measured. False when the read of the project's runs could not finish in time, or stopped at its bound before it met a run of this tool: `lastUsedAt` is then null and says nothing, never that the tool has not run. |
| `version` | `integer` | yes | The version a PATCH of this tool takes. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `createdAt` | `string` | yes | When the tool was created. |
| `updatedAt` | `string` | yes | When the tool last changed. |

### `PATCH /v1/mcp-tools/{id}`

Change a tool — the flow it runs, its title and description, who may call it and a public tool's rate. Requires the `version` you read; a stale one is 409 `VERSION_CONFLICT`. Refused (422) as a create is; making it public, moving it while public to another flow, or raising its `publicRpm` when its flow spends needs ADMIN (403). Running another flow whose inputs or outputs differ changes what the tool's callers send or read: answered in `contractChanges`, and a breaking change is refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until `acceptBreaks` names the tool (only an admin may: 403 `CONTRACT_BREAK_FORBIDDEN`). With `validateOnly: true` it answers whether the patch would be refused and what it changes for callers, writing nothing. Several rows at once: `POST /v1/projects/{nodeId}/document` (preview it with `/plan`).

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The tool's id, as returned when it was created or listed. |

**Request body**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `flowId` | `string` | no | Run a different flow. Left out, unchanged. A flow whose inputs or outputs differ from the current one's changes what the tool's callers send or read: listed in `contractChanges`, and a breaking one is refused 409 `CONTRACT_BREAK_NOT_ACCEPTED` until `acceptBreaks` names the tool. |
| `title` | `string \| null` | no | A new title, or null to clear it. Left out, unchanged. |
| `description` | `string \| null` | no | A new description, or null to list the tool with its flow's. Left out, unchanged. |
| `auth` | `"required" \| "none"` | no | Who may call the tool. `required` (the default): an AI app signed in with a key or as a person. `none`: anyone, with no credential — the tool is PUBLIC, its run has no user and the project pays for it. A public tool's flow may not need a signed-in person. |
| `publicRpm` | `integer \| null` | no | A public tool's new rate, or null for the default. Left out, unchanged. |
| `version` | `integer` | yes | The `version` you last read. Required: a stale one is refused with 409 `VERSION_CONFLICT`. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `acceptBreaks` | `object` | no | Accept that this write breaks the callers of the endpoints, tables and tools, and the written pages, named here, by key. Needed for every row of `contractChanges` that is `breaking`; only an admin of the project may send it for one. A name whose contract this write does not break is answered in `acceptBreaksNotNeeded`, and a name the project does not have is refused. A statement about this write only, never stored. |
| `validateOnly` | `boolean` | no | Check this patch against the stored row and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE BODY, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT YOUR DRAFT rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve, a `version` the row has moved past — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `id`, `project`, `key`, `flowId`, `flowKey`, `flowLabel`, `title`, `description`, `auth`, `publicRpm`, `access`, `describedBy`, `invokeUrl`, `lastUsedAt`, `lastUsedMeasured`, `version`, `createdAt`, `updatedAt`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | Unique id of the tool — what `{id}` routes address. |
| `project` | `string` | yes | Node id of the owning project. |
| `key` | `string` | yes | The tool's name, as AI apps call it. |
| `flowId` | `string` | yes | Id of the flow the tool runs. |
| `flowKey` | `string \| null` | yes | Key of the flow the tool runs; null when it no longer exists. |
| `flowLabel` | `string \| null` | yes | Name of the flow the tool runs; null when it no longer exists. |
| `title` | `string \| null` | yes | The tool's title, or null. |
| `description` | `string \| null` | yes | The tool's own description, or null when it is listed with its flow's. |
| `auth` | `"required" \| "none"` | yes | Who may call the tool: `required` or `none` (public). |
| `publicRpm` | `integer \| null` | yes | A public tool's calls a minute, all callers together; null when not set. |
| `access` | `object` | yes | What the tool's flow does, read from the flow as it is now. |
| `describedBy` | `"tool" \| "flow" \| null` | yes | Where the description AI apps read comes from: the tool's own (`tool`), its flow's (`flow`), or none (null). |
| `invokeUrl` | `string \| null` | yes | The address an AI app connects to for this project's tools; null where the environment has no public host. |
| `lastUsedAt` | `string \| null` | yes | When a run last started from this tool; null when none has, or when `lastUsedMeasured` is false. |
| `lastUsedMeasured` | `boolean` | yes | Whether `lastUsedAt` was measured. False when the read of the project's runs could not finish in time, or stopped at its bound before it met a run of this tool: `lastUsedAt` is then null and says nothing, never that the tool has not run. |
| `version` | `integer` | yes | The version a PATCH of this tool takes. A write on another resource can move this version; the response of that write lists the rows it touched under `touched`. |
| `createdAt` | `string` | yes | When the tool was created. |
| `updatedAt` | `string` | yes | When the tool last changed. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `acceptBreaksNotNeeded` | `object` | no | Names in `acceptBreaks` that were not needed: their contract does not break. They do not refuse the write; drop them next time. |
| `brokenPages` | `string[]` | no | The written pages of the project's `ui` section that are broken in the state this write leaves: each still uses an endpoint, input or field the project no longer has, and visitors see it as unavailable until a later write makes it whole. A write that newly breaks one is refused until `acceptBreaks.pages` names it. Absent when the project has no written page. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

Shape 2, with `ok`, `diagnostics`, `complete`, `permissions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |
| `contractChanges` | `object[]` | yes | Every endpoint and table whose contract this write changes, with each change and its verdict. Empty when the write changes no caller's contract. A breaking row is saved only when an admin of the project names it in `acceptBreaks`. |
| `permissions` | `object` | yes | What the caller's role lets the write do. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

Each item of `contractChanges`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `kind` | `"endpoint" \| "table" \| "tool" \| "page"` | yes | Whether `key` names an endpoint, a table, a tool, or a written page of the `ui` section. A `page` row is breaking when the write leaves the page using what the project no longer has: each change names the place in the page (`ui.pages.<key>…`), the `UI_*` code in `keyword` and rule `not-classified`. |
| `key` | `string` | yes | The endpoint's, table's or tool's key, or the page's key. |
| `verdict` | `"safe" \| "breaking"` | yes | `breaking` when any of its changes is breaking, else `safe`. A row whose contract did not change is not listed. |
| `changes` | `object[]` | yes | Each change, ordered by side, then place, then rule, so the plan and the write list them alike. |
| `mustAccept` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` does not name it: the write is refused until it does. |
| `accepted` | `boolean` | yes | `true` when the row breaks and the write's `acceptBreaks` names it. |
| `consequences` | `object[]` | no | On a table's row: what the change does to the table's stored records, each with a count. The write carries each one out. A count never refuses the write; one consequence can: a `stream-migration` on a table whose stream is already being migrated is refused with 409 `STREAM_MIGRATING`. Absent on an endpoint's row and when nothing stored is affected. |

### `DELETE /v1/mcp-tools/{id}`

Stop offering a tool: AI apps no longer see or call it. The flow stays. Nothing refuses it. With `?validateOnly=true` it answers the verdict, writing nothing. Several at once: `POST /v1/projects/{nodeId}/document` with `delete: true`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The tool's id, as returned when it was created or listed. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `validateOnly` | `"true" \| "false"` | no | Check this delete and answer what would happen, writing nothing. 200 with a verdict — see the validate response. ⚠️ THAT IS A VERDICT ABOUT THE DELETE, NOT ABOUT EVERY FAILURE: a 4xx still answers 4xx. A refusal the platform makes ABOUT THIS DELETE rides the 200; a request it could not look at — an id that addresses nothing, a role it will not serve — answers the status it always did. Default false. |

**Response `200`**

One of 2 shapes:

Shape 1, with `deleted`, `id`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `deleted` | `true` | yes | Always `true` — the route answers 200 only on success. |
| `id` | `string` | yes | Id of the row that was removed. |

Shape 2, with `ok`, `diagnostics`, `complete`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `ok` | `boolean` | yes | Whether this body would be accepted. False exactly when some finding below has `severity: "error"`. ⚠️ TRUE IS NOT A GUARANTEE OF A SUCCESSFUL WRITE: a uniqueness rule can still refuse it when another write lands first. Read it as a snapshot, and read `complete` beside it. |
| `diagnostics` | `object[]` | yes | Every finding, errors and warnings together, worst first. An empty list with `ok: true` means every rule that could be evaluated passed. |
| `complete` | `boolean` | yes | Whether every rule ran. False means checking stopped early because an earlier finding made the later rules unanswerable — fix what is listed and validate again, because more may appear. ⚠️ A SHORTER LIST IS NOT A HEALTHIER DRAFT. |

Each item of `diagnostics`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `code` | `string` | yes | Stable identifier for the rule that produced this finding. Branch on it rather than on the message. Treat an unrecognised code as a generic finding of its stated severity, not as an error. |
| `severity` | `"error" \| "warning" \| "info"` | yes | `error` means this body will not save as it stands; `warning` is advisory and blocks nothing; `info` is a note that blocks nothing: something the platform left alone (a whole-project plan reports rows it skipped or ids it ignored this way), or a hint that a flow could be written shorter. GATE ON THIS, never on `code`. |
| `message` | `string` | yes | What is wrong, in one line, safe to show a person. Wording may change — do not parse it. |
| `field` | `string` | no | Dot path to the offending field of the body that was validated, e.g. `producer` or `declaration.produces[2].source`. Absent when the finding is about the body as a whole rather than one field. ⚠️ ABSENT MEANS NOT ADDRESSABLE, never `the first field`. |

### `GET /v1/projects/{nodeId}/connected-apps`

The AI apps people connected to this project and have not removed: `count`, and one page of who connected which app. Each person removes their own with `DELETE /v1/me/connected-apps/{id}`; removing a person from the project ends theirs.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | Connections per page, 1–100; 50 when left out. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `count` | `integer` | yes | How many apps people have connected to this project and not removed. |
| `apps` | `object[]` | yes | This page of the connected apps, oldest first. |
| `paging` | `object` | yes | Where this page sits among the project's connected apps, counted over the whole list. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `apps`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The connected app's id. |
| `person` | `object` | yes | The person who connected the app, acting as themself through it. |
| `appName` | `string` | yes | The name the app gave itself; show it beside `appHost`. |
| `appHost` | `string` | yes | The host of the address the app names itself by. |
| `clientId` | `string` | yes | The address the app names itself by. |
| `connectedAt` | `string` | yes | When the person approved it. |
| `lastUsedAt` | `string \| null` | yes | When the app last called the project, to within a few minutes; null when it never has. |

### `GET /v1/projects/{nodeId}/connected-apps/decisions`

The project's sign-in decisions, newest first: each time a person connected an AI app, declined one, or a connection ended, and each request the project's sign-in server refused. The connections themselves are `GET /v1/projects/{nodeId}/connected-apps`.

**Path parameters**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | The project's node id. |

**Query**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `limit` | `integer` | no | Decisions per page, 1–100; 50 when left out. |
| `after` | `string` | no | The page AFTER this row — pass back the `nextCursor` you were given. Refused together with `before`. |
| `before` | `string` | no | The page BEFORE this row — pass back the `prevCursor` you were given. Refused together with `after`. |

**Response `200`**

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `decisions` | `object[]` | yes | This page of the project's sign-in decisions, newest first. |
| `paging` | `object \| null` | yes | Always null: the record grows without end, so it is walked with the cursors and not counted. |
| `nextCursor` | `string \| null` | yes | Pass back as `after` for the NEXT page along the list's own ordering. NULL means there is nothing further — a short page on its own does not mean the end. |
| `prevCursor` | `string \| null` | yes | Pass back as `before` for the page BEFORE this one. NULL means this is the first page. |

Each item of `decisions`:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `id` | `string` | yes | The record's id. |
| `at` | `string` | yes | When it was decided. |
| `kind` | `"approved" \| "denied" \| "removed"` | yes | `approved`: a person connected an app; `denied`: a person declined, or the sign-in server refused an app's request; `removed`: a connected app was removed — by its person, by its app, by a spent credential used again, or because the person left the project or their account ended. |
| `actor` | `"person" \| "server" \| "system"` | yes | `person`: the person themself; `server`: the project's sign-in server, refusing or ending on its own rules; `system`: the platform, when a seat or an account ended. |
| `person` | `object \| null` | yes | Who the decision was about; null for a request refused before anyone signed in. |
| `clientId` | `string \| null` | yes | The address the app names itself by; null when the record does not name one. |
| `appHost` | `string \| null` | yes | The host of `clientId`; null with it. |
| `why` | `string \| null` | yes | Why the server or the platform decided, in a few words; null for a person's own choice. |
