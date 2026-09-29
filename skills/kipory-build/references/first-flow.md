# Your first flow, end to end

The smallest complete build: one flow, `summarise`, that takes a string `text`, runs one `text.generate` step, returns a string `summary`, and is served as a synchronous endpoint your product calls. Every request body below is complete and copyable — replace only the `<angle-bracket>` values. Responses are abbreviated to the fields you act on.

Two ways to author it, same result:

- **Row by row** (sections 1–7) — one call per row. Good for learning what each row is.
- **One document** (section 8) — the whole project stated once, planned, then applied. This is the path `kipory-plan` recommends once a plan exists.

## Hosts and roles

Everything except the last call goes to the **api host** (the base URL you were given) with `Authorization: Bearer <key>`. The product call goes to the **project host**, whose URL the endpoint read hands you as `invokeUrl`.

| Step | Call                                       | Host    | Role                                           |
| ---- | ------------------------------------------ | ------- | ---------------------------------------------- |
| 1    | `POST /v1/flows`                           | api     | EDITOR                                         |
| 2    | `POST /v1/skills`                          | api     | EDITOR                                         |
| 3    | `PATCH /v1/flows/{id}`                     | api     | EDITOR                                         |
| 4    | `GET /v1/flows/{id}/health`                | api     | VIEWER                                         |
| 5    | `POST /v1/flows/{id}/preview`              | api     | **ADMIN** — it runs the model and bills        |
| 6    | `POST /v1/api-endpoints`                   | api     | EDITOR                                         |
| 7    | the endpoint's `invokeUrl`                 | project | any key that reaches the project; see `access` |
| 8    | `POST /v1/projects/{nodeId}/document/plan` | api     | VIEWER                                         |
| 8    | `POST /v1/projects/{nodeId}/document`      | api     | EDITOR (ADMIN if it removes anything)          |

`<nodeId>` is the project's node id, not its project id (`kipory-connect`).

## 1. Create the flow with its signature

```
POST /v1/flows
```

```json
{
  "project": "<nodeId>",
  "label": "Summarise",
  "key": "summarise",
  "inputTypeNames": [{ "slot": "text", "typeName": "string" }],
  "outputTypeNames": [
    { "slot": "summary", "typeName": "string", "required": true }
  ]
}
```

`201` with the flow. Keep `id`, and look at `inputSlots`:

```json
{
  "id": "<flowId>",
  "key": "summarise",
  "inputSlots": [
    { "slot": "text", "type": { "kind": "ref", "entryId": "<stringEntryId>" } }
  ],
  "outputSlots": [
    {
      "slot": "summary",
      "type": { "kind": "ref", "entryId": "<stringEntryId>" },
      "required": true
    }
  ],
  "outputBinding": null
}
```

- A signature entry is an object — `{ typeName, slot?, isList?, required? }` — never a bare string, and the body is strict. `typeName` is a registered type's key; `string`, `number`, `boolean` and the other built-ins resolve without being declared. An unknown key is a 422.
- `slot` omitted derives one from the type name. Name it: slot names are letters and digits, starting with a letter.
- An input is required unless you say `"required": false` (and then its `type` arrives wrapped as `{ "kind": "optional", … }`). An output is **not** required unless you say `"required": true` — and only a required output makes preview report it missing, so say it.
- `key` is permanent — lower-case kebab, refused (never folded) otherwise; `label` is display text you can change any time. `outputBinding` is accepted here too, but only its shape is checked while the flow has no steps; step 3 binds it once the step exists.
- `validateOnly: true` on the same body answers a verdict with the slot names it would store, and writes nothing.

## 2. Add the step

A step's `inputSchemas` (and `outputSchema`) hold **schema references**, not type names: `{ "kind": "ref", "entryId": "<id>" }`, where the id is the built-in `string` entry's id in _this_ project. Copy it from the flow you just made — `inputSlots[0].type` above is exactly the reference to send for an input that reads the flow's `text` slot. `GET /v1/schema-entries?project={nodeId}&key=string` answers the same id as `entries[0].id`. It is per project; do not reuse one from another project's export by hand.

```
POST /v1/skills
```

```json
{
  "flowId": "<flowId>",
  "key": "write-summary",
  "handlerKey": "text.generate",
  "handlerConfig": {},
  "inputStreams": ["text"],
  "inputSchemas": [{ "kind": "ref", "entryId": "<stringEntryId>" }],
  "outputSlot": "summary",
  "outputSchema": { "kind": "ref", "entryId": "<stringEntryId>" },
  "promptTemplate": "Summarise the following text in two sentences.\n\n{{text}}",
  "taskKey": "summarization"
}
```

`201 { skill, outstandingIssues }`. `outstandingIssues` carries one warning here, and it is expected: `OUTPUT_SLOT_UNBOUND` — the flow promises `summary` and no step's output is bound to it yet. Step 3 clears it.

- `inputStreams` names the slots this step reads — here the flow's own input slot. `inputSchemas` is positional and **must be the same length**; a mismatch is refused before anything else is checked.
- `promptTemplate` fills `{{text}}` from the slot of that name.
- `outputSchema` set to the built-in `string` makes `text.generate` return plain text. Any other shape switches it to structured output parsed into that shape. `text.generate` derives no output shape of its own, so state it.
- `handlerConfig` for `text.generate` is optional throughout (`temperature`, `reasoningEffort`, `modelSlot`, …); `{}` takes the defaults. See `handlers/text.generate.md`.
- `taskKey` decides the model: this step runs on whatever model the project binds to `summarization` (`GET /v1/projects/{projectId}/task-models`, which takes the project id). It is one of `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak`; omitted, a single create starts the step on `extraction`. Do not set `modelId` unless you mean to pin this one step.
- `promptTemplate` is a string on every step. A step whose handler sends no prompt — `value.transform`, `entity.create`, `url.fetch` — sends `""`, never `null`.
- `key` is the step's name: lower-case kebab, dots allowed. `outputSlot` is a slot name — no hyphens, no underscores.
- Add `"validateOnly": true` to ask for the verdict first; it runs every rule the write runs and writes nothing.

## 3. Bind the output

Without this the flow returns nothing: a live call 502s or answers an empty value.

```
PATCH /v1/flows/{id}
```

```json
{
  "outputBinding": {
    "summary": { "fromSlot": "summary" }
  }
}
```

The binding maps each declared output slot to `{ fromSlot, path? }` — `fromSlot` is a step's `outputSlot`, `path` (omitted or `null`) takes the whole value. To return one field of a step's output instead, `path` is an object of segments, never a string:

```json
{
  "outputBinding": {
    "id": {
      "fromSlot": "created",
      "path": { "segments": [{ "kind": "field", "name": "recordId" }] }
    }
  }
}
```

The segment kinds are `field`, `first`, `last`, `index`, `pluck` and `wrap` (`kipory-build`'s SKILL.md lists what each does). A `field` segment needs the step's `outputSchema` to be a shape that declares that field; into the builtin `object` it is refused. Every key must be a declared output slot; a stray one is a 422. The map is strict: no other keys per entry. This PATCH takes no version; the whole graph is re-validated before it saves.

## 4. Check the whole flow

```
GET /v1/flows/{id}/health
```

```json
{
  "flowId": "<flowId>",
  "counts": {
    "errors": 0,
    "warnings": 0,
    "byTarget": { "skill": 0, "edge": 0, "flow": 0 }
  },
  "diagnostics": [],
  "danglingReads": []
}
```

`counts.errors: 0` is the answer; `diagnostics` name the step and edge at fault. An error does not stop the flow from running — it says what the run will get wrong, so fix it before you bind the flow. A clean write in steps 2–3 is not this — only health runs the whole graph.

## 5. Preview it

ADMIN, and it spends: the model call is real and billed.

```
POST /v1/flows/{id}/preview
```

```json
{
  "input": {
    "kind": "slots",
    "inputs": { "text": "<a paragraph to summarise>" }
  },
  "apply": false
}
```

```json
{
  "flowOutput": { "summary": "<two sentences>" },
  "missingRequiredOutput": null,
  "transcript": [],
  "previewSessionId": "<runId>"
}
```

- `input.kind: "slots"` supplies values keyed by the flow's input slot names; an unknown key or a missing required slot is refused before the run. The other arm, `kind: "record"` with `recordId`, seeds from a stored record of a type this flow processes.
- `apply` defaults to `true`. This flow writes nothing, so `false` changes nothing here — send it anyway; it is the habit that saves you on a flow that does write.
- `flowOutput` is the declared outputs exactly as the run produced them, with nothing filled in. `missingRequiredOutput` non-null means the flow never produced that slot; a live call then either 502s or answers 200 with the type's empty value (`""`, `0`, `false`, `[]`, `{}`), so treat it as broken either way. Read `errors` first: a step that failed — a model provider out of quota, a refused config — leaves the output unfed just as a missing binding does, and `errors[].message` says which. Only when `errors` is empty is step 3 the cause.
- **A provider out of quota** reads `… provider account exhausted (quota/billing)` in `errors[].message`. It is the provider's account, not your flow: bind the task to a model from another creator and preview again — `GET /v1/ai-models?type=chat` for one — every row listed is served (a disabled model is absent, not flagged); take one whose `status` is `active` rather than `deprecated`, whose `modelId` prefix (the creator) differs, and whose `offers[].provider` is not the exhausted account — then `PUT /v1/nodes/{nodeId}/task-models/{task} { "modelId": "<creator/slug>" }` with `{task}` = `summarization` (ADMIN, on the project node). `GET /v1/projects/{projectId}/task-models` then shows `source: node` for that task. `kipory-build`'s SKILL.md says why this beats pinning `modelId`, and what the routing policy's `failover` does and does not do.
- The preview's own response is its whole record. `previewSessionId` reads the change set (`GET /v1/runs/{runId}/change-set`) and nothing else: an inline preview writes no step log and no trace.

## 6. Put it on HTTP

Check the path is free first: `GET /v1/coded-routes` (api host, with your key — any role) lists every path the platform itself occupies, and a coded route always wins. Keep your path's first word off every word those rows start with — `/v1/docs/add` saves cleanly and is served only while the project's docs group is on; under a design-API word such as `records` it never answers (`kipory-expose`).

```
POST /v1/api-endpoints
```

```json
{
  "project": "<nodeId>",
  "key": "summarise",
  "contractConfig": {
    "method": "POST",
    "path": "/v1/summarise",
    "params": {}
  },
  "actionConfig": {
    "kind": "flow.invoke",
    "flow": { "id": "<flowId>" },
    "inputs": { "text": { "from": "body" } },
    "execution": "sync"
  }
}
```

`201` with the endpoint. Keep `invokeUrl` and read `access`:

```json
{
  "id": "<endpointId>",
  "invokeUrl": "https://<project-host>/v1/summarise",
  "access": { "viewers": true, "decidedBy": "flow", "writes": [] }
}
```

- `params` is required even when empty. `successStatus` defaults to `200`; an `async` endpoint needs `202`.
- `flow` is `{ id }` only. The server fills the flow's `key` and the signature snapshot; sending either is a 422.
- `inputs.text.from: "body"` means the request-body field named `text` — the slot's name, no rename. Every required input slot must be bound. `execution` has no default.
- `access` is derived, never set. A sync `flow.invoke` on a flow whose steps only read, like this one, comes back `viewers: true`, so a VIEWER key may call it.
- `invokeUrl` is `null` on a deployment with no public host — a local stack, for one. Never hardcode a host; ask the human for the project host, or, on a bare `localhost`, call the api's own port with the header `x-kipory-project-slug: <project slug>`.

## 7. Call it from the product

On the **project host**, with a key (or a signed-in user's session) that reaches the project — never the api host.

```bash
curl -sS -X POST "$INVOKE_URL" \
  -H "Authorization: Bearer $PRODUCT_KEY" \
  -H "content-type: application/json" \
  -d '{"text": "<a paragraph to summarise>"}'
```

`200 {"summary": "<two sentences>"}` — the bound outputs, keyed by output slot, nothing else. The body is validated against the flow's inputs with no extra fields allowed — an unknown field is a 422. The `x-request-id` response header is the run id: `GET /v1/runs/{runId}/steps` on the api host reads its step log, and the run lists in `GET /v1/runs?project={nodeId}` with `lifecycle: "unknown"` — a synchronous run has no queue row to report one — and its `closing.verdict`. A run past 30 seconds (the default `syncTimeoutMs`) is a 504 — and a `text.generate` step waits its turn on the platform's worker, so the wait counts too. For an endpoint over a model step, set `"syncTimeoutMs": 120000` in `actionConfig` or make it `async`. The rest of the caller's side is `kipory-expose`'s `references/consumer.md`.

## 8. The same project as one document

State steps 1, 2, 3 and 6 as one document. Inside a document everything is addressed by **key**: a schema reference is `{ "kind": "ref", "ref": "string" }` instead of an entry id, a step is keyed by its key, and the endpoint's `flow` is the flow's key.

```json
{
  "kipory": 2,
  "flows": {
    "summarise": {
      "label": "Summarise",
      "inputTypeNames": [{ "slot": "text", "typeName": "string" }],
      "outputTypeNames": [
        { "slot": "summary", "typeName": "string", "required": true }
      ],
      "outputBinding": { "summary": { "fromSlot": "summary" } },
      "skills": {
        "write-summary": {
          "description": null,
          "handlerKey": "text.generate",
          "handlerConfig": {},
          "condition": null,
          "inputStreams": ["text"],
          "inputSchemas": [{ "kind": "ref", "ref": "string" }],
          "outputSlot": "summary",
          "outputSchema": { "kind": "ref", "ref": "string" },
          "promptTemplate": "Summarise the following text in two sentences.\n\n{{text}}",
          "taskKey": "summarization",
          "enabled": true
        }
      }
    }
  },
  "surfaces": {
    "endpoints": {
      "summarise": {
        "contractConfig": {
          "method": "POST",
          "path": "/v1/summarise",
          "params": {},
          "successStatus": 200
        },
        "actionConfig": {
          "kind": "flow.invoke",
          "flow": "summarise",
          "inputs": { "text": { "from": "body" } },
          "execution": "sync"
        }
      }
    }
  }
}
```

A document step is the whole-graph step row, so it states more than a single create does: `description`, `handlerConfig`, `condition`, `outputSchema` and `enabled` are all **required** here (`null` where there is nothing), `promptTemplate` is required as a string (`""` for a handler that sends no prompt — `null` is refused), and `taskKey` has no default, even on a step that makes no model call. The flow's `skills` map is stated whole — a step you leave out of it is removed.

**Plan it.** The body is the document itself, not an envelope. It writes nothing.

```
POST /v1/projects/{nodeId}/document/plan
```

Read `ok`, then `diagnostics` (each on a path in your document, such as `flows.summarise.skills.write-summary.inputSchemas` — gate on `severity`), `consequences`, and any `delete` rows in `changes`. Keep `version`.

**Apply it.**

```
POST /v1/projects/{nodeId}/document   { version, document }
```

```json
{
  "version": "<version from the plan>",
  "document": {
    "kipory": 2,
    "flows": { "summarise": { "…": "…" } },
    "surfaces": { "…": "…" }
  }
}
```

`200` with `applied: true`, `appliedVersion` (present it on your next apply) and `document` — the project as it now stands with every `id` filled in. `document.flows.summarise.id` is the flow id for health and preview (steps 4–5, which a document does not do for you — **a plan and an apply do not run the whole-flow health check**, so `ok: true` can still leave a flow with errors; call health for every flow the document touched); `document.surfaces.endpoints.summarise.id` is the endpoint to read `invokeUrl` from with `GET /v1/api-endpoints/{id}`. A refused apply answers `422` with the plan as its body; a stale `version` answers `409` with the current document under `details`. The rest of the format is `packs/project-document.md`.

## How this page was checked

Sections 1–7 were run as written, with an ADMIN key on a fresh project: every status, the step-2 warning, the health answer, the preview output, the endpoint's `access`, and the product call's body and headers. Of section 8, the document was planned against that project and a second project was created from it in one call (`POST /v1/projects` with `document`); the separate apply route was not exercised. What depends on your deployment — the model a task binds to, the project host, prices — is read from the responses, not from this page.
