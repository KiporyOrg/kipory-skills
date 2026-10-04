# Your first flow, end to end

The smallest complete build: one flow, `summarise`, that takes a string `text`, runs one `text.generate` step, returns a string `summary`, and is served as a synchronous endpoint your product calls. Every request body below is complete and copyable — replace only the `<angle-bracket>` values. Responses are abbreviated to the fields you act on.

Two ways to author it, same result:

- **Row by row** (sections 1–7) — one call per row. Good for learning what each row is.
- **One document** (section 8) — the whole project stated once, planned, then applied. This is the path `kipory-plan` recommends once a plan exists.

## Hosts and roles

Everything except the last call goes to the **api host** (the base URL you were given) with `Authorization: Bearer <key>`. The product call goes to the **project host**: the endpoint read hands you the full URL as `invokeUrl`, and before any endpoint exists the project's `baseUrl` names the host (`kipory-connect`'s `references/conventions.md`).

| Step | Call                                       | Host    | Role                                           |
| ---- | ------------------------------------------ | ------- | ---------------------------------------------- |
| 1    | `POST /v1/flows`                           | api     | EDITOR                                         |
| 2    | `POST /v1/steps`                           | api     | EDITOR                                         |
| 3    | `PATCH /v1/flows/{id}`                     | api     | EDITOR                                         |
| 4    | `GET /v1/flows/{id}/health`                | api     | VIEWER                                         |
| 5    | `POST /v1/flows/{id}/preview`              | api     | **ADMIN** — it runs the model and bills        |
| 6    | `POST /v1/api-endpoints`                   | api     | EDITOR                                         |
| 7    | the endpoint's `invokeUrl`                 | project | any key that reaches the project; see `access` |
| 8    | `POST /v1/projects/{nodeId}/document/plan` | api     | VIEWER                                         |
| 8    | `POST /v1/projects/{nodeId}/document`      | api     | EDITOR (ADMIN if it removes anything)          |

`<nodeId>` is the project's id — the one `GET /v1/grant` lists for your key, or `POST /v1/projects` answered (`kipory-connect`).

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
  "outputBinding": {}
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
POST /v1/steps
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

- `inputStreams` names the slots this step reads — here the flow's own input slot. `inputSchemas` is optional: left out, each input is typed from what feeds it (here the flow's `text` slot). Sent, it is positional and must be the same length; a mismatch is refused before anything else is checked. For a prompt step you may leave `inputStreams` out too — the save reads `{{text}}` from the prompt. Typing from what feeds an input needs the feeder to have a type, so state `outputSchema` on every step a later step reads — `text.generate` and `text.decide` derive none of their own. A feeder whose `outputSchema` is `null` still feeds its readers: they read it as `object`, nothing checks what they take from it, and the plan and health warn `PRODUCER_OUTPUT_UNTYPED` on that step.
- `promptTemplate` fills `{{text}}` from the slot of that name.
- `outputSchema` set to the built-in `string` makes `text.generate` return plain text. Any other shape switches it to structured output parsed into that shape. `text.generate` derives no output shape of its own, so state it.
- `handlerConfig` for `text.generate` is optional throughout (`temperature`, `reasoningEffort`, `modelSlot`, …); `{}` takes the defaults. See `handlers/text.generate.md`.
- `taskKey` decides the model: this step runs on whatever model the project binds to `summarization` (`GET /v1/nodes/{nodeId}/task-models` at the project's id). It is one of `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak`; omitted, a single create starts the step on `extraction`. Do not set `modelId` unless you mean to pin this one step.
- A step whose handler sends no prompt — `value.transform`, `entity.create`, `url.fetch` — leaves `promptTemplate` out; it is stored as `""`.
- `key` is the step's name: lower-case kebab, dots allowed. `outputSlot` is a slot name — no hyphens, no underscores.
- Add `"validateOnly": true` to ask for the verdict first; it runs every rule the write runs and writes nothing.

## 3. Bind the output

Without this the flow returns nothing: every live call is refused `422 FLOW_OUTPUT_MISSING` and writes nothing — and is still charged for the model call it made (`x-credits-charged` on the refusal says how much).

```
PATCH /v1/flows/{id}
```

```json
{
  "outputBinding": {
    "summary": { "fromSlot": "summary" }
  },
  "version": 1
}
```

`version` is the flow's, as the create answered it: every flow PATCH requires it, and a stale one is
`409 VERSION_CONFLICT` — re-read the flow and send the new one.

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

The segment kinds are `field`, `first`, `last`, `index`, `pluck` and `wrap` (`step-fields.md` §2 lists what each does). A `field` segment needs the step's `outputSchema` to be a shape that declares that field; into the builtin `object` it is refused. The record and search handlers type their own output: leave `outputSchema` out and the new step takes that type, or state the same type yourself. On `POST /v1/steps` a `null` is filled the same way; in a document a `null` is a stated "no type" and stays one, so leave the key out there. The types: `entity.create` → `RecordCreate` (with `recordId`), `entity.read` → a list of `RecordRead`, `entity.list` → `RecordPage`, `vector.search` → a list of the hit its `hitShape` names (`RecordHit` for `record`). `text.generate` and `text.decide` type nothing of their own, so state theirs. Every key must be a declared output slot; a stray one is a 422. The map is strict: no other keys per entry. This PATCH requires the flow's `version`, as above; the whole graph is re-validated before it saves.

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

`counts.errors: 0` is the answer; `diagnostics` name the step and edge at fault. An error does not stop the flow from running — it says what the run will get wrong, so fix it before you bind the flow. A clean write in steps 2–3 is not this — health, a document plan and a flow PATCH's `validateOnly` run the whole graph; a step write does not.

## 5. Preview it

ADMIN, and it spends: the model call is real and billed, in credits — one credit is one micro-USD.

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
- `flowOutput` is the declared outputs exactly as the run produced them, with nothing filled in. `missingRequiredOutput` non-null means the flow never produced that slot; a live call is then refused `422 FLOW_OUTPUT_MISSING` and writes nothing, and this preview discarded its writes too, reporting it as an `errors` entry with `skillId: "__runner__"` and `phase: "output-missing"`. That entry is the refusal, not its cause. Read the other `errors` first: a step that failed — a model provider out of quota, a refused config — leaves the output unfed just as a missing binding does, and `errors[].message` says which. Only when that entry is the only one is step 3 the cause.
- **A provider out of quota** reads `… provider account exhausted (quota/billing)` in `errors[].message`. It is the provider's account, not your flow: bind the task (`summarization` here) to a model from another creator and preview again. `models.md` §5 has the three calls, why that beats pinning `modelId`, and what a routing policy's `failover` does and does not do.
- The synchronous preview's response is its whole record. `transcript` carries each step's outcome and timing, not what it wrote; `previewSessionId` reads the change set (`GET /v1/runs/{runId}/change-set`) and nothing else, because an inline preview writes no step log and no trace. To see every slot's value, queue the same body with `POST /v1/flows/{id}/preview-runs` (`202 { runId }`) and read `GET /v1/runs/{runId}/trace` (`checking.md` §3).

## 6. Put it on HTTP

Check the path is free first: `GET /v1/coded-routes` (api host, with your key — any role) lists every path the platform itself occupies, and a coded route always wins. Keep your path's first word off every word those rows start with — the save refuses `/v1/docs/add` as `ENDPOINT_PATH_RESERVED_WORD`, and a path a coded route itself serves, such as a GET on `/v1/records/mine`, first as `409 CONFLICT` (`kipory-expose`).

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

- `params` is required even when empty. It is a map keyed by parameter name — `{ "id": { "in": "path", "type": "string", "required": true } }` for a path `/v1/notes/{id}` — and an input takes one with `"from": "path.id"` (or `"query.<name>"`); `kipory-expose` has the rest. `successStatus` defaults to `200`; an `async` endpoint needs `202`.
- `flow` is `{ id }` only. The server fills the flow's `key` and the signature snapshot; sending either is a 422.
- `inputs.text.from: "body"` means the request-body field named `text` — the slot's name, no rename. Every required input slot must be bound. `execution` has no default.
- `access` is derived, never set. A sync `flow.invoke` on a flow whose steps only read, like this one, comes back `viewers: true`, so a VIEWER key may call it.
- Call the endpoint at `invokeUrl` as answered: read the field, never build the address from the URL you call. What a `null` there means is in `kipory-connect`'s `references/conventions.md`.

## 7. Call it from the product

On the **project host**, with a key (or a signed-in user's session) that reaches the project — never the api host.

```bash
curl -sS -X POST "$INVOKE_URL" \
  -H "Authorization: Bearer $PRODUCT_KEY" \
  -H "content-type: application/json" \
  -d '{"text": "<a paragraph to summarise>"}'
```

`200 {"summary": "<two sentences>"}` — the bound outputs, keyed by output slot, nothing else. The body is validated against the flow's inputs with no extra fields allowed — an unknown field is a 422. The `x-request-id` response header is the run id: `GET /v1/runs/{runId}/steps` on the api host reads its step log, and the run lists in `GET /v1/runs?project={nodeId}` with `lifecycle: "settled"` and its `closing.verdict`. A run past 30 seconds (the default `syncTimeoutMs`) is a 504 — and a `text.generate` step waits its turn on the platform's worker, so the wait counts too. For an endpoint over a model step, set `"syncTimeoutMs": 120000` in `actionConfig` or make it `async`. The rest of the caller's side is `kipory-expose`'s `references/consumer.md`.

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

A document step is filled as a single create is. `handlerKey` and `handlerConfig` are required (`null` or `{}` where a handler takes no settings). `description`, `condition`, `enabled` and `outputSchema` may be left out: a new step starts on `null`, `null`, `true` and the type its handler emits, and a held step keeps its own. Leaving `outputSchema` out is not the same as stating `null`. A stated `null` is saved as "no type": once another step reads that slot the plan and health warn `PRODUCER_OUTPUT_UNTYPED`, and on a `flow.merge` step — whose type the save always derives from what it merges — a stated `null` re-plans as an `update` every time. The rest: `inputSchemas` typed from what feeds each input, `inputStreams` from the settings or prompt of a handler that names its inputs, `promptTemplate` and `taskKey` left out keep a held step's values (a new step starts on `""` and `extraction`), and `outputSlot` needed by every handler except `event.emit`, `vector.upsert` and the control handlers whose outputs live in config (`term.upsert` needs one too, though its slot holds only an empty marker). The flow's `skills` map is stated whole — a step you leave out of it is removed.

An **exported** document states every step's `outputSchema` and `inputSchemas`, and a stated `inputSchemas` is kept and checked, not re-typed. So giving a type to a step that had none also means removing `inputSchemas` from each step that reads its slot (or restating it): a reader that still states `object` for that input is refused `NOMINAL_MISMATCH`.

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

`200` with `applied: true`, `appliedVersion` (present it on your next apply) and `document` — the project as it now stands with every `id` filled in. `document.flows.summarise.id` is the flow id for health and preview (step 5 — preview — is still yours; step 4's health checks the plan already ran for every flow it touched, so `/health` after an apply confirms what the plan said); `document.surfaces.endpoints.summarise.id` is the endpoint to read `invokeUrl` from with `GET /v1/api-endpoints/{id}`. A refused apply answers `422` with the plan as its body; a stale `version` answers `409` with the current document under `details`. The rest of the format is `packs/project-document.md`.

## What this page does not fix

What depends on your deployment — the model a task binds to, the project host, prices — is read from the responses, not from this page.
