# A step's fields, types and inputs

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: no-end-user — an enum VALUE of the preview's principal, not a property -->

What a step body carries, how a type is referenced, how an output is bound, and which inputs the platform works out for you. `api/skills.md` and `api/flows.md` have every field's wire type; this page has the rules between them.

## 1. The step body

`POST /v1/steps` and each entry of a document's `skills` map take the same fields. `POST /v1/steps` requires `flowId`, `key` and `handlerKey`; a document step requires `handlerKey` and `handlerConfig`. Everything else has a default or is derived:

| Field                                                                     | Holds                                                                                                    | Left out                                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `flowId`                                                                  | the flow the step belongs to (the row API only; a document nests the step under its flow)                | required                                                                                    |
| `key`                                                                     | the step's name: lower-case kebab, dots allowed; renameable                                              | required                                                                                    |
| `handlerKey`                                                              | which handler runs                                                                                       | required                                                                                    |
| `description`                                                             | a note for people                                                                                        | `null`                                                                                      |
| `handlerConfig`                                                           | that handler's settings                                                                                  | `{}` takes the handler's defaults                                                           |
| `inputStreams`                                                            | the slots the step reads                                                                                 | derived for a handler whose settings or prompt name its inputs (section 4)                  |
| `inputSchemas`                                                            | each input's type, positional with `inputStreams`                                                        | each input is typed from what feeds it; a list you send is kept and must be the same length |
| `inputPaths`, `inputProjectionNames`                                      | a projection per input — a path object or `null` — and its name; both positional with `inputStreams`     | nothing is projected                                                                        |
| `outputSlot`                                                              | the slot the step writes                                                                                 | refused as missing only on a handler that writes a result                                   |
| `outputSchema`                                                            | the type of what it writes                                                                               | the type its handler emits; `text.generate` and `text.decide` derive none, so state theirs  |
| `promptTemplate`                                                          | the prompt, for `text.generate` and `text.interpolate`                                                   | `""` (absent and `null` are the same)                                                       |
| `systemPrompt`                                                            | the system prompt, read by `text.generate`; its placeholders name inputs as the prompt's do              | none                                                                                        |
| `taskKey`                                                                 | which task's model the step follows: `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak` | a new step starts on `extraction`; a document step the flow already holds keeps its own     |
| `modelId`                                                                 | one pinned model                                                                                         | the step follows its task's binding (`models.md`)                                           |
| `condition`                                                               | a clause that must hold for the step to run                                                              | the step runs whenever an input is present                                                  |
| `enabled`                                                                 | `false` keeps the step in the flow and never runs it                                                     | `true`                                                                                      |
| `timeoutMs`, `tries`, `tryDelayMs`, `onFailure`, `reuseResultsForMinutes` | how the step runs; `onFailure` is `fail-run` (the default) or `continue`                                 | the handler's own (`packs/flows-and-skills.md`, "How a step runs")                          |

- **There is no position field**: execution order is derived from slot edges.
- **A PATCH requires `version`.**
- **A feeder with no type is read as `object`.** A step whose `outputSchema` is absent and whose handler types nothing feeds its readers as `object`, with a `PRODUCER_OUTPUT_UNTYPED` warning on it.
- **Leave out what the handler does not read.** `promptTemplate` is needed only by `text.generate` and `text.interpolate`. `outputSlot` is not needed by `event.emit`, `vector.upsert`, `flow.merge`, `flow.invoke`, `flow.loop-end` and `flow.dispatch`. `term.upsert` does need one, though nothing reads it: name any unused slot.
- **`taskKey` outside the five is a 422** listing them. `extraction` is right for a step that makes no model call.
- **For merge, invoke, dispatch and loop-end the row's `outputSlot` is a mirror**, not the truth: their real outputs are in config — lanes, output maps, branches, escape slots. `flow.invoke` writes no primary slot at all.

A flow's `inputTypeNames` and `outputTypeNames` entries are objects `{ typeName, slot?, isList?, required? }`, not bare names.

**A signature change states the side it changes.** A `PATCH /v1/flows/{id}` carrying only `outputTypeNames` changes the outputs and keeps the inputs as stored (and the reverse). The stored binding is carried, pruned to the outputs that remain, unless you send `outputBinding`. While an endpoint or a flow-backed record type holds a snapshot of the old signature the PATCH is `409 FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` (under `validateOnly`, an `ok: false` verdict with that code) unless it adds `adoptSnapshots: true`, which re-publishes those endpoints' contracts to their callers — read `kipory-evolve` first.

## 2. Output binding and path objects

`outputBinding` maps each flow output slot to `{ fromSlot, path? }`. `path` is omitted or `null` to take the whole value, and otherwise an **object, never a string**. The same object is what `inputPaths[i]` holds: `[{ "segments": [{ "kind": "first" }] }]`.

```json
{
  "outputBinding": {
    "id": {
      "fromSlot": "created",
      "path": { "segments": [{ "kind": "field", "name": "recordId" }] }
    },
    "first": {
      "fromSlot": "rows",
      "path": {
        "segments": [
          { "kind": "field", "name": "records" },
          { "kind": "first" }
        ]
      }
    }
  }
}
```

| Segment                           | Takes                                  |
| --------------------------------- | -------------------------------------- |
| `{ "kind": "field", "name": … }`  | one property                           |
| `{ "kind": "first" }`             | a list's first item                    |
| `{ "kind": "last" }`              | its last                               |
| `{ "kind": "index", "index": … }` | the item at a position                 |
| `{ "kind": "pluck", "name": … }`  | that property from every item (a list) |
| `{ "kind": "wrap" }`              | one value lifted into a one-item list  |

Segments apply in order. **A `field` segment needs a typed source**: the step's `outputSchema` must be a shape that declares that field. A step typed as the builtin `object` (or a list) refuses a field path with a type mismatch — give the step a schema entry and bind into it.

A step's `condition` uses a different notation on the same row: its `path` is a plain dot-string.

## 3. Schema references

What `inputSchemas[]` and `outputSchema` hold. On the row API a named shape is `{ "kind": "ref", "entryId": "<id>" }`; inside a document it is `{ "kind": "ref", "ref": "<entry key>" }`. Named shapes match by entry, never by structure: two entries with identical fields are different types, and wiring one where the other is expected is a `NOMINAL_MISMATCH`. Reuse one entry. The other forms wrap one of those:

| Form                                              | Means                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `{ "kind": "list", "element": <ref> }`            | a list — `RecordRead[]` is `list` of `ref RecordRead`                                                                           |
| `{ "kind": "optional", "inner": <ref> }`          | may be absent — an optional flow input arrives this way, and a step reading one must type it so (`records-and-endpoints.md` §8) |
| `{ "kind": "union", "members": [<ref>, <ref>] }`  | one of several — on an input only, never an output                                                                              |
| `{ "kind": "record", "valueType": <ref> }`        | a string-keyed map                                                                                                              |
| `{ "kind": "recordRef", "recordType": "<type>" }` | one stored record's id                                                                                                          |

The built-ins (`string`, `number`, `boolean`, `object`, `file`, …) and the platform's own shapes (`RecordRead`, `RecordPage`, `UserInfo`, `ProjectInfo`, …) are entries like yours: in a document name them by key; on the row API read the id with `GET /v1/schema-entries?project={nodeId}&key=<Key>`. `GET /v1/flows/{id}/scope` lists every slot a step may read, already typed.

## 4. Inputs the platform derives

**A step whose settings or prompt name its inputs gets them from the platform** — `value.transform`, `value.first-non-empty`, `entity.list`, `entity.read`, `text.generate` and the other config- or template-driven handlers.

- Omit `inputStreams` (or send `[]`) and the save stores the names the settings or prompt read, each typed from what feeds it.
- A PATCH that changes the settings or prompt without `inputStreams` re-derives them.
- A list you DO send must be exactly those names (plus any file a prompt step attaches): the save compares the two as sets and refuses a difference with `FREE_FORM_INPUT_STREAMS_MISMATCH`, whose message names what is missing or extra.
- `flow.invoke` and `flow.merge` go further: their inputs are mirrored from config — an invoke's `kind: "slot"` rows, a merge's lane sources — and a list you state is replaced (`patterns.md` §2, §3).

Two things catch people:

- **Provider slots count.** `entity.list` and `entity.read` default `userIdSlot` to `userInfo.userId`, so the save adds `userInfo` to their inputs itself, even on a project-wide type a key calls — leave `inputStreams` out, or include it in a list you send. A prompt reading `{{projectInfo.config.<namespace>.<field>}}` needs `projectInfo` (schema `ProjectInfo`).
- **In JSONata, every bare name that starts a path is read as a slot**, including a field name inside a projection and the word `undefined`. `patterns.md` ("`value.transform`") has the rule, the way round it and the five refused functions.

## 5. When a step runs

- **A step runs while any one of its inputs is present** (`patterns.md` §1). "Present" means non-empty.
- **A run with no signed-in user has no `userInfo` at all** — a key's call, a schedule, a trigger.
  - A step whose only inputs are provider slots still runs: a project-wide read ignores the missing user, and a per-user record type refuses.
  - A step reading `userInfo` beside a real slot (a cursor, an optional query filter) waits for that slot, and is skipped when it never arrives — the optional-filter recipe is in `records-and-endpoints.md` §8.
  - Preview with `principal: "no-end-user"` to see the run a key or a schedule gets (`checking.md`).
- **A condition that fails is a skip, not a failure**, and so is a condition that throws.
- **Which operator tests which kind of value** is `GET /v1/steps/condition-operators` — the table a `condition` is checked against at save and evaluated by at run time.
- **`flow.dispatch` with no `default` silently skips an unmatched input**, and so does every step below the unwritten branch slot whose inputs all trace back to it. A step that also reads another present slot still runs, so guard a branch step on its branch slot with `slotPresent`.
