# Your first flow, end to end

The smallest complete build, for an invented fruit-box club: one flow, `write-slip`, that takes the box's `fruit`, asks a model for one line for its packing slip, returns it as `slip`, and is served as a synchronous endpoint your product calls. Every request body below is complete — replace only the `<angle-bracket>` values. Responses are cut to the fields you act on.

Two ways to author it, same result:

- **Step routes** (sections 1–7) — create the flow, then save its steps. Good for learning what each part is.
- **One document** (section 8) — the whole project stated once, planned, then applied. The way for a new backend.

## Hosts and roles

Everything except the last call goes to the **api host** with `Authorization: Bearer <key>`. The product call goes to the **project host**: the endpoint read hands you the full URL as `invokeUrl` (`kipory-connect`'s `references/conventions.md`).

| Step | Call                                                                                   | Role                                               |
| ---- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1    | `POST /v1/flows`                                                                       | EDITOR                                             |
| 2    | `PUT /v1/flows/{id}/steps`                                                             | EDITOR                                             |
| 3    | `GET /v1/flows/{id}/health`                                                            | VIEWER                                             |
| 4    | `POST /v1/flows/{id}/steps/{key}/interpolate`                                          | EDITOR                                             |
| 5    | `POST /v1/flows/{id}/preview`                                                          | **ADMIN** — it runs the model and bills            |
| 6    | `POST /v1/api-endpoints`                                                               | EDITOR                                             |
| 7    | the endpoint's `invokeUrl`                                                             | any key that reaches the project; see `access`     |
| 8    | `POST /v1/projects/{nodeId}/document/plan`, then `POST /v1/projects/{nodeId}/document` | VIEWER, then EDITOR (ADMIN if it removes anything) |

`<nodeId>` is the project's id — the one `GET /v1/grant` lists for your key.

## 1. Create the flow with its signature

```
POST /v1/flows
```

```json
{
  "project": "<nodeId>",
  "key": "write-slip",
  "label": "Write a packing slip",
  "inputs": { "fruit": { "typeName": "string" } },
  "outputs": { "slip": { "typeName": "string" } }
}
```

`201` with the flow. Keep `id` and `version`:

```json
{
  "id": "<flowId>",
  "key": "write-slip",
  "stepCount": 0,
  "version": 1
}
```

- **`inputs` and `outputs` are maps by name**, both required (`{}` declares none). Each value is `{typeName, isList?, optional?, description?}`; `typeName` is a registered type's key, and `string`, `number`, `boolean`, `object` resolve without being declared. Read back, each carries the resolved `type`.
- **A value is required unless it says `optional: true`.** An optional input may be left out by a caller; an optional output may be left out by the flow. A list is `isList: true`.
- **`key` is permanent and kebab-case**; `label` is display text you can change any time.
- **A flow with no steps does not start**: a call answers `FLOW_NOT_AUTHORED`. Step 2 gives it steps.

## 2. Save its steps

```
PUT /v1/flows/{id}/steps
```

```json
{
  "version": 1,
  "steps": [
    {
      "key": "line",
      "function": "text.generate",
      "with": {
        "prompt": "Write one friendly line for the packing slip of a box of {{fruit}}. Output only the line."
      }
    },
    { "key": "done", "return": { "slip": "line" } }
  ]
}
```

`200`:

```json
{
  "flowId": "<flowId>",
  "version": 2,
  "diagnostics": [],
  "changes": [
    { "stepKey": "line", "change": "added" },
    { "stepKey": "done", "change": "added" }
  ],
  "touched": []
}
```

- **The list is the whole flow, in the order it runs.** `line` runs first and its value is read by its key; `done` ends the flow and gives `slip`. A flow gives its outputs only through `return`.
- **`with.prompt` is the prompt's text**; `{{fruit}}` reads the flow's input. `text.generate` answers text unless `with.outputSchema` names a type (`action-fields.md`).
- **`version` is the flow's, as you read it**: a stale one answers `409`, and every write answers the next one.
- **The save proves the flow.** A step that reads a name nothing gives, a value that may be missing, a required output a path never gives — each is refused `422` with `details.diagnostics`, every finding carrying `at` and its ready `fixes` or a `decision` (`checking.md`). `diagnostics` on a saved write are warnings.
- **Add `"validateOnly": true` to ask first**: the same judgement, nothing saved, and each expression's TypeScript reading.
- To change a few steps later, post edits by key to `POST /v1/flows/{id}/steps/edit` instead of the whole list (`row-by-row.md`).

## 3. Check the whole flow

```
GET /v1/flows/{id}/health
```

```json
{
  "flowId": "<flowId>",
  "counts": {
    "errors": 0,
    "warnings": 0,
    "byTarget": { "step": 0, "edge": 0, "flow": 0 }
  },
  "diagnostics": []
}
```

`counts.errors: 0` is the answer. Health also judges what the flow reaches — the types it reads, the flows it calls — so it can turn red when one of those changes, without an edit to this flow. `GET /v1/flows/{id}/outline` draws the steps as an indented outline.

## 4. Try the step

Free, EDITOR: render the prompt the model would receive. `{key}` is the step's key, `line`.

```
POST /v1/flows/{id}/steps/{key}/interpolate
```

```json
{ "values": { "fruit": "plums" } }
```

```json
{
  "interpolatedPrompt": "Write one friendly line for the packing slip of a box of plums. Output only the line.",
  "latencyMs": 2
}
```

`POST /v1/flows/{id}/steps/{key}/preview` with the same body also calls the model (ADMIN, billed). Send `"step": { … }` to try a draft you have not saved, under the same key.

## 5. Preview it

ADMIN, and it spends: the model call is real and billed.

```
POST /v1/flows/{id}/preview
```

```json
{
  "input": { "kind": "slots", "inputs": { "fruit": "plums" } },
  "apply": false
}
```

```json
{
  "flowOutput": { "slip": "<one line>" },
  "missingRequiredOutput": null,
  "previewSessionId": "<runId>"
}
```

- `input.inputs` is keyed by the flow's input names; an unknown name or a missing required one is refused before the run. `kind: "record"` with `recordId` seeds from a stored record of a table this flow processes.
- `apply` defaults to `true`. This flow writes nothing, so `false` changes nothing here — send it anyway; it is the habit that saves you on a flow that writes.
- **A provider out of quota** reads `… provider account exhausted (quota/billing)` in the errors. It is the provider's account, not your flow: `models.md` has what to do.
- To see each step's value, queue the same body with `POST /v1/flows/{id}/preview-runs` (`202 { runId }`) and read `GET /v1/runs/{runId}/trace` (`checking.md`).

## 6. Put it on HTTP

Check the path is free first: `GET /v1/coded-routes` lists every path the platform itself serves, and a coded route always wins (`kipory-expose`).

```
POST /v1/api-endpoints
```

```json
{
  "project": "<nodeId>",
  "key": "write-slip",
  "contractConfig": {
    "method": "POST",
    "path": "/v1/club/slips",
    "params": {}
  },
  "targetConfig": {
    "kind": "flow.invoke",
    "flow": { "id": "<flowId>" },
    "inputs": { "fruit": { "from": "body" } },
    "execution": "sync",
    "syncTimeoutMs": 120000
  }
}
```

`201` with the endpoint. Keep `invokeUrl` and read `access`.

- `params` is required even when empty. `inputs.fruit.from: "body"` is the request-body field named `fruit`; every required input must be bound. `execution` has no default.
- A sync call past `syncTimeoutMs` (30 seconds by default) answers `504`; a model step waits its turn on the platform's worker, so give it room or make the endpoint `async`.
- `access` is derived, never set. Call the endpoint at `invokeUrl` as answered.

## 7. Call it from the product

On the **project host**, with a key or a signed-in user's session that reaches the project:

```bash
curl -sS -X POST "$INVOKE_URL" \
  -H "Authorization: Bearer $PRODUCT_KEY" \
  -H "content-type: application/json" \
  -d '{"fruit": "plums"}'
```

`200 {"slip": "<one line>"}` — the flow's outputs, nothing else. The body is checked against the flow's inputs; an unknown field is a `422`. The `x-request-id` response header is the run id: `GET /v1/runs/{runId}/timeline` reads it. The rest of the caller's side is `kipory-expose`.

## 8. The same project as one document

State sections 1, 2 and 6 as one document. Inside a document everything is addressed by **key**: the flow is keyed under `flows`, and the endpoint's `flow` is the flow's key.

```yaml
kipory: 11
flows:
  write-slip:
    label: Write a packing slip
    inputs:
      fruit: { typeName: string }
    outputs:
      slip: { typeName: string }
    steps:
      - key: line
        function: text.generate
        with:
          prompt: "Write one friendly line for the packing slip of a box of {{fruit}}. Output only the line."
      - key: done
        return:
          slip: line
surfaces:
  endpoints:
    write-slip:
      contractConfig:
        { method: POST, path: /v1/club/slips, params: {}, successStatus: 200 }
      targetConfig:
        kind: flow.invoke
        flow: write-slip
        inputs: { fruit: { from: body } }
        execution: sync
        syncTimeoutMs: 120000
```

**Plan it** — the body is the document itself, sent as `content-type: application/yaml` or as JSON; it writes nothing:

```
POST /v1/projects/{nodeId}/document/plan?basedOn=<version>
```

Read `ok`, then `changes` (the flow, its two steps by key, the endpoint), `diagnostics` (each on a path in your document, such as `flows.write-slip.steps[line].with.prompt`, a step finding with its `at` and `fixes`), `health`, `consequences` and any `delete` rows. Keep `planId`.

**Apply it:**

```
POST /v1/projects/{nodeId}/document
```

```json
{
  "planId": "<planId from the plan>",
  "note": "Add the packing-slip flow and its endpoint"
}
```

`200` with `applied: true`, `appliedVersion` and `basedOn` — the read to plan your next change from. Read the project again (`GET /v1/projects/{nodeId}/document?section=flows,surfaces`) for the ids: `flows.write-slip.id` for preview, `surfaces.endpoints.write-slip.id` to read `invokeUrl` with `GET /v1/api-endpoints/{id}`. `document.md` has the rest.

## What this page does not fix

What depends on your deployment — the model a task binds to, the project host, prices — is read from the responses, not from this page.
