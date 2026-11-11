# Checking a flow: the save's proof, dry runs, trying a step, preview

<!-- field-ok: userInfo — an ambient value every flow can read, not a request field -->
<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: record-owner — an enum VALUE of the preview's principal, not a property -->
<!-- field-ok: end-user — an enum VALUE of the preview's principal, not a property -->

Questions to ask about a flow before a caller does, cheapest first:

| Question                                   | Ask                                                                                    | Role                                        | Costs                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------- |
| Would these steps save, and what is wrong? | `validateOnly: true` on `PUT /v1/flows/{id}/steps` or `POST /v1/flows/{id}/steps/edit` | EDITOR                                      | nothing                     |
| What does this prompt become?              | `POST /v1/flows/{id}/steps/{key}/interpolate`                                          | EDITOR                                      | nothing                     |
| What does this step give on these values?  | `POST /v1/flows/{id}/steps/{key}/evaluate`                                             | EDITOR; ADMIN for a step that reads records | what the function costs     |
| What does the flow do, step by step?       | `GET /v1/flows/{id}/outline`                                                           | VIEWER                                      | nothing                     |
| Is the whole flow sound now?               | `GET /v1/flows/{id}/health`                                                            | VIEWER                                      | nothing                     |
| What does one model call answer?           | `POST /v1/flows/{id}/steps/{key}/preview`                                              | ADMIN                                       | one model call              |
| What does a run produce?                   | `POST /v1/flows/{id}/preview`, or `…/preview-runs` to keep the run                     | ADMIN                                       | everything a live run costs |

## 1. The save proves the flow

Every write of steps — `PUT /v1/flows/{id}/steps`, `POST /v1/flows/{id}/steps/edit`, a document plan — judges the whole flow before it saves. An **error refuses the save** (`422`, the findings under `details.diagnostics`); a **warning** saves and comes back in `diagnostics`.

What it proves:

- **Every read has a giver above it.** A name nothing gives is `STEP_READS_UNKNOWN`; a value only a step below gives is `STEP_READS_LATER`; a value made inside a block, read outside it, is `BLOCK_VALUE_ESCAPES` (hand it out through the block's `out`); a `parallel` child reading a sibling is `PARALLEL_READS_SIBLING`.
- **Every required read is there on every path.** A value that may be nothing — an optional input, a step inside an `if` read after it, a function that may answer nothing, `userInfo` (a schedule has no person) — read as required is `STEP_INPUT_MAY_BE_ABSENT`; a field the type marks optional, `STEP_INPUT_FIELD_MAY_BE_ABSENT`; a field of a value nothing types is the warning `STEP_INPUT_FIELD_UNTYPED`.
- **No input that must not be empty is fed an empty value.** `STEP_INPUT_MAY_BE_EMPTY`; guard with `{filled: x}`, or declare `minLength` ≥ 1 (text) or `minItems` ≥ 1 (a list) on the value's type — a `default` never covers `""`, `[]` or `{}`.
- **Every path ends right.** A `return` of a required output that may be nothing is `FLOW_OUTPUT_MAY_BE_NOTHING`; a path that reaches the end without `return` or `fail` while outputs are required is `FLOW_PATH_HAS_NO_END`; a `return` inside `each`, `repeat` or `parallel` is `RETURN_IN_REPEATED_BLOCK`.
- **Every step has its kind's shape and its function's settings.** A field the kind does not take is `FLOW_STEPS_INVALID`; a `with` key the function does not take, `STEP_SETTING_UNKNOWN`; a test against `{literal: null}`, `CONDITION_EQUALS_NULL` (write `{not: {has: x}}`); two steps sharing a key, `STEP_KEY_TAKEN`.

At run time nothing is skipped: a step whose required input is missing fails with a typed error, and an empty value where one is refused fails `STEP_INPUT_EMPTY`.

## 2. A finding and its fix

A finding about steps carries where it is and what to do:

```json
{
  "code": "STEP_INPUT_MAY_BE_ABSENT",
  "severity": "error",
  "message": "`save` reads `userInfo.userId` at `with.fields.owner` as required, and it may have no value.",
  "at": "steps[save].with.fields.owner",
  "fixes": [
    {
      "title": "Run save only when userInfo.userId has a value",
      "edit": [
        {
          "wrap": ["save"],
          "in": { "if": { "test": { "has": "userInfo.userId" } } },
          "key": "saveGuard"
        }
      ]
    },
    {
      "title": "Let save run without userInfo.userId",
      "edit": [
        {
          "set": "save",
          "field": "with.fields.owner",
          "value": { "path": "userInfo.userId", "optional": true }
        }
      ]
    }
  ],
  "decision": null
}
```

- **`at` is a key path from the flow**, never a position: `steps[perMember].steps[reachable].if[0].steps[note].with.fields.noteKey`. In a document plan the same finding's `field` starts `flows.<flow>.`.
- **`fixes` are ready step edits, best first.** Pick one and post its `edit` as is: `POST /v1/flows/{id}/steps/edit { "version": <the flow's version>, "edits": <the fix's edit> }`. In a document, make the same change in your file and plan again. A fix raises no finding the flow did not already have.
- **A fix may change a type instead:** `{title, typeEdit: {type, key, declare}}` declares `minLength` or `minItems` on a field of a type the flow reads; send `declare` to `PATCH /v1/types/{id}` (`type` is the id) with the type's version. It changes the type for every reader. A type new in the same document has no id yet, so `type` is absent: declare the keyword on that field under `types.<key>` in the document.
- **`decision` replaces `fixes` when no edit clears the finding without changing what you meant** — it names the step, the field and what to choose (`Wrap it in $default(…, <value>), or guard the names it reads with if has`). Exactly one of the two is set.
- **Fix every error of one answer in one edit, then save again.**
- A refused edit batch names the edit: `STEP_EDIT_REFUSED` with `editIndex`, the 0-based place of the edit in `edits`.

## 3. Dry runs

`validateOnly: true` on `PUT /v1/flows/{id}/steps` or `POST /v1/flows/{id}/steps/edit` runs the same judgement, writes nothing, and answers the verdict:

- `ok` — false when the write would be refused;
- `diagnostics` — every finding, errors and warnings, each with `at` and its `fixes` or `decision`;
- `expressions` — each JSONata expression the steps hold, as TypeScript (`typescript`), laid out (`formatted`), and as a plain path when one reads the same;
- `pathExpressions` — each path read where an expression could stand, with the expression that reads the same.

Send `typescript: [{at, text}]` beside `validateOnly` to write an expression as TypeScript: the dry run reads it back as JSONata (`fromTypeScript`) and judges that in its place. Save the JSONata it answers; nothing saves TypeScript.

## 4. Try one step

Each route addresses a step by the flow's id and the step's key. Send `step` to try a draft under that key instead of the saved one.

- **`POST /v1/flows/{id}/steps/{key}/interpolate` `{ step?, values }`** renders a model step's prompt with the `values` you give — names the step reads: a flow input, an earlier step's key, a name a block gives — and calls nothing. EDITOR.
- **`POST /v1/flows/{id}/steps/{key}/preview` `{ step?, values, attachments?, modelId? }`** renders it and calls the model once: `response`, `tokensIn`, `tokensOut`. ADMIN, billed. It is not a flow run.
- **`POST /v1/flows/{id}/steps/{key}/evaluate` `{ step?, values }` or `{ step?, fromRun }`** runs the step's function on those values, or on the values a past run recorded, and answers `{ok: true, value}`, `{ok: true, absent: true}` when the step gives nothing, or `{ok: false, failure: {code, message, location?}}` as a run would fail. Each value must be a name the step reads; a flow input's is checked against its type first. EDITOR, or ADMIN for a step whose function reads records.

## 5. Health and the outline

`GET /v1/flows/{id}/health` judges the flow as it stands, with everything it reaches: the types it reads, the flows it calls, the endpoints and schedules that start it. It can turn red without an edit to this flow, when one of those changes; a document plan runs the same rules on every flow it can move, so `/health` after an `ok` apply is a confirmation. `GET /v1/flows?project={nodeId}&expand=health` gives each flow a summary with its `firstErrorCode`. `GET /v1/flows/{id}/outline` draws the steps as an indented outline. What still holds a flow is its delete's dry run, `DELETE /v1/flows/{id}?validateOnly=true`.

## 6. Preview

`POST /v1/flows/{id}/preview` runs the saved steps on values you send: `{ "input": { "kind": "slots", "inputs": { … } }, "apply": false }`, or `"kind": "record"` with a `recordId`. `graph: { "kind": "draft", "steps": [ … ] }` runs steps you have not saved, judged by the save's rules first.

- **It costs what a live run costs, and it writes.** `apply` defaults to true. `apply: false` still runs every step and every model call, then discards the change set — readable at `GET /v1/runs/{runId}/change-set`, where the run id is the response's `previewSessionId`.
- **A step that sends checks and does not send.** `email.send`, `url.send`, `push.send` and `flow.start-per-person` run every check a live run makes and answer as a live run would, with a `PREVIEWED_NOT_SENT` warning saying what would have gone. Prove the delivery itself with one live run.
- **`missingRequiredOutput` is non-null exactly when a live call would be refused.**
- **Who the run acts as is `principal`.** On `slots`: `operator` (you, the default), `no-end-user` (how a schedule or a trigger runs — `userInfo` is absent; `kipory preview <flow> --as nobody`, or `--schedule <key>` for a schedule's flow with its inputs), `end-user` with `runAsUserId` (that person's own call; needs `apply: false`). On `record`: `operator` or `record-owner`.
- **An `each` is capped at 5 values per preview** (`fanOutCap` sets the cap, a number or `"uncapped"`, never above the step's own `maxItems`); the wall clock is 180 seconds.

**To see each step's value, queue the preview.** `POST /v1/flows/{id}/preview-runs` takes the same body and answers `202 { runId }`; a worker runs it, read like any run:

```
GET /v1/runs/{runId}            finished when `run.closing` is non-null: `succeeded`, `partial` or `failed`
GET /v1/runs/{runId}/trace      the flow's inputs and each step's value, by key
GET /v1/runs/{runId}/timeline   the timeline
GET /v1/runs/{runId}/spend      what it cost
GET /v1/runs/{runId}/change-set what it wrote, or would have
```

**`succeeded` does not mean every step got an answer.** A vendor that refused a search or a page read leaves a `step-warned` row in `GET /v1/runs/{runId}/timeline` with `detail.warningKind` (`SEARCH_FAILED`, `SCRAPE_FAILED`, …) and the vendor's reason in `detail.message`, and `run.closing.warnings` counts them — check it on every run you trust. **`partial`** is a run that finished past failures it was told to carry on past — a `try` caught, an `each` tolerated (`maxFailedBranches`, `maxFailedShare`), a `repeat` stopped at — and `run.closing.absorbed` counts them: what failed left nothing behind. **A failed preview tells nobody**; what a live failure does is `kipory-operate`. `kipory-diagnose` reads a trace.

## 7. What needs ADMIN

Preview, its stream, `POST /v1/flows/{id}/preview-runs` and `POST /v1/flows/{id}/steps/{key}/preview` are ADMIN, and so are running an eval suite (`POST /v1/eval-suites/{id}/run`, unless `validateOnly`), every delete and the checkpoint restore. An EDITOR key can author a whole flow, dry-run every write, render a prompt and evaluate a step, and cannot preview the flow.

## 8. Checkpoints

Before a risky edit: `POST /v1/flow-checkpoints { flowId, label }`. Before a rollback, the restore with `validateOnly: true` rehearses it and shows the current and captured steps side by side. The restore itself — `POST /v1/flow-checkpoints/{id}/restore { version }`, ADMIN — puts back the whole step list and signature, and checkpoints the state it replaces first. `packs/flow-checkpoints.md` has the rest.
