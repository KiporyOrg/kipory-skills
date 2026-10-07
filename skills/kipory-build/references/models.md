# Models: which handler asks, which model answers

Everything about a step that calls a model: which handler fits the question, how a `text.decide` question is written, which model a step runs on and how to change it, what a model costs, and what to do when a provider stops answering. Field names are the handlers' own config keys — `handlers/<key>.md` has each table.

## 1. Which model handler asks the question

Three <!-- count: rows-of-next-table --> handlers put a question to a model. **`text.decide` costs a small fraction of the other two — reach for it first, and use the others only for what it cannot answer.**

| The question                                                                         | Handler         | What you write                                                                                  | What it costs                                                                                                                                   |
| ------------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Yes or no, pick one of a closed list, or a score on named levels                     | `text.decide`   | no prompt: the step's output type IS the questions, one field each (section 2)                  | the least by far: a very cheap model that returns values, never text                                                                            |
| Which term of a facet does this belong to, in a vocabulary that is searched or grows | `facet.resolve` | the facet's own settings; it proposes with a model, then matches and mints by the facet's rules | the most: a chat-model proposal plus matching, for each facet not fed by `deterministicSlots` or `extractedFacetsSlots` (those run no proposal) |
| Anything that needs written words back — a summary, a title, an extraction           | `text.generate` | a prompt and a typed output                                                                     | a chat model, charged on what it reads and what it writes                                                                                       |

**Why `text.decide` is the cheap one.** It runs on a decision model, not a chat model, and a decision model is a very cheap model: it does not generate text at all. It answers each question with a value — a chance of yes, the chosen option, a score — so there is nothing written to pay for, and what it reads is priced far below a chat model. One call also answers every field of the output type, so ten questions are one call, not ten. On one deployment a two-question call measured about 30–40 credits, 10 of them the step's compute second; the same closed pick asked through `facet.resolve` measured about 600, and a `text.generate` step 120–220. `GET /v1/nodes/{nodeId}/model-prices` quotes this deployment's prices, and section 4 says how to measure your own flow.

So: put every yes/no, closed pick and score a flow needs into `text.decide`, several to a step where they read the same input, and keep `text.generate` for the steps that must write words.

**To judge every item of a list, fan out and decide per item.** A `text.decide` step reads one input and answers its questions once, so "which of these search hits are about this business" is not one call over the list. It is `flow.fan-out` over the list, a `text.decide` in the branch that asks the questions of one element, and a `flow.merge` that gathers the answers (`patterns.md` §2; set the fan-out's `maxItems` to the longest list you expect, default 20). Handing the whole list to one `text.generate` step and asking for a list of verdicts back is the expensive way to do the same thing: a chat model is paid for every line it reads and every verdict it writes, and the step waits while it writes them.

Both shapes were measured on one deployment, on the same stored input:

| Shape                                                                     | Model spend                                 | Time             |
| ------------------------------------------------------------------------- | ------------------------------------------- | ---------------- |
| fan-out → `text.decide`, three questions per item, 16 items → merge       | 755 credits for all 16, about 47 per branch | about 4 seconds  |
| one `text.generate` reading the 16 to 20 items and writing a verdict each | about 3,200 to 3,900 credits for the call   | about 52 seconds |

The two made the same accept and reject decisions. These are one deployment's measurements on one model binding, not a price list: a `text.generate` call costs what it reads and writes, so the 120–220 above is a short prompt with a short answer and the figures here are a long one. Measure your own flow as section 4 says.

- A closed pick written as a `text.generate` prompt, or as a `facet.resolve` over a facet that never grows, pays a chat model for a question a decision model answers. When the list is fixed and you only need the key, ask it with `text.decide` and assign the term from the answer.
- "Is this the same thing as that?" is a probability, not prose: one `text.decide` field, compared against a threshold where you branch.
- `text.decide` runs on a decision model, not a chat model, named in `handlerConfig.model` (default `typesafe/jev-latest`). A step save refuses it (`HANDLER_MODEL_UNUSABLE`) when the catalog does not hold that model or it is not a decision model. Read `GET /v1/ai-models?type=decision` and name one it lists; an empty list means the step cannot run on this deployment.

The other model handlers answer no question of yours: `text.embed` turns text into a vector and `text.rerank` orders a list by relevance (`kipory-retrieve`), `audio.transcribe` reads speech (`kipory-extract`).

## 2. Writing a `text.decide` question

A `text.decide` step has no prompt. Its `outputSchema` names a schema entry, and **every field of that entry is one question**, asked in the entry's field order against the step's one input. The field's `description` is the question's wording, and it is required on every field. The input is text, or a JSON object or list. A file fails the step: extract its text first. There are exactly three forms:

| Form   | The field's definition                                                                                                                                                                 | What comes back                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Yes/no | a `$ref` to the builtin `probability` entry, plus `description`; optionally `x-criteria: { "true": "…", "false": "…" }` saying what each side looks like (either side may be left out) | the chance of yes, a number from 0 to 1                                          |
| Choice | `enum` of text, 2 to 255 options — or, to word each option, `oneOf` of `{ "const": "<option>", "description": "<what it covers>" }`                                                    | one option's text                                                                |
| Score  | `"type": "number"` with `x-levels` (2 to 10 worded levels, lowest first), `"minimum": 0` and `"maximum"` equal to the number of levels minus one                                       | a number in that range; it is a weighted mean, so it can fall between two levels |

```json
"TicketTriage": {
  "definition": {
    "type": "object",
    "properties": {
      "team": {
        "enum": ["billing", "tech", "sales"],
        "description": "Which team should answer this message?"
      },
      "refund": {
        "$ref": "#/$defs/<probability entry id>",
        "description": "Is the customer asking for money back?",
        "x-criteria": {
          "true": "They ask for a refund or to reverse a charge.",
          "false": "They ask about anything else."
        }
      },
      "urgency": {
        "type": "number",
        "minimum": 0,
        "maximum": 2,
        "x-levels": ["can wait", "today", "now"],
        "description": "How urgent is it?"
      }
    }
  }
}
```

- **The `probability` reference is by id**, on the row API and in a document alike: `{ "$ref": "#/$defs/<entryId>" }`, the id read from `GET /v1/schema-entries?project={nodeId}&key=probability` (`kipory-model` has the rule for a `$ref` inside a definition). The id is the project's own, so read it after the project exists.
- **What the save refuses**, each as `DECISION_QUESTIONS_INVALID` naming the field in `details.field`:
  - a `boolean` field — a yes/no is a probability, compared where you branch;
  - a field with no `description`;
  - a number with no `x-levels`, an `integer` score, a score that may be null, a score whose `minimum` is not 0 or whose `maximum` is not the last level's index, and a score carrying `multipleOf`, `exclusiveMinimum` or `exclusiveMaximum`;
  - a level or an `x-criteria` side with no words;
  - a choice with one option, more than 255, or an option that is not text;
  - an output type that is not an object with at least one field.
- **A probability is not a truth value.** A condition on a probability field compares it with a threshold (`slotGte` with `0.5`); `slotIsTruthy` on one is refused, because a chance of 0.03 would read as true.

### Catching a guess: the confidence output

**A choice always answers; an `unknown` option is not an abstention.** The model picks one option for every question, whatever the input, so junk text still comes back with a language and a category, and an `unknown` member is one more option it may or may not pick. To get "unsure" instead of a guess, declare the confidence slot in the step's `handlerConfig`:

```json
"outputs": [{ "slot": "sureness", "schema": { "kind": "ref", "ref": "DecisionConfidence" } }]
```

That is the document form; on the row API the reference is `{ "kind": "ref", "entryId": "<id>" }` with the id of the platform's `DecisionConfidence` entry. A step takes at most one such output, typed `DecisionConfidence`, on a slot other than its `outputSlot`; anything else is `DECISION_OUTPUTS_INVALID`.

The slot holds:

| Field                     | Holds                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lowest`                  | the confidence of the least sure answer, 0 to 1                                                                                                         |
| `answers[]`               | one row per question, in the output type's field order                                                                                                  |
| `answers[].question`      | the field the answer was written to                                                                                                                     |
| `answers[].type`          | `choice`, `noul` (a yes/no) or `score`                                                                                                                  |
| `answers[].confidence`    | how sure the model was, 0 to 1. For a yes/no it is the larger of the chance of yes and the chance of no, so it is never below 0.5                       |
| `answers[].probabilities` | the chance of every possible answer: keyed by option for a choice, by level index (`"0"`, `"1"`, …) for a score, by `"true"` and `"false"` for a yes/no |

- **Gate on `lowest`.** The step that uses the answers carries `"condition": { "op": "slotGte", "slot": "sureness", "path": "lowest", "value": 0.7 }`; the step that handles the unsure case (write `unknown`, send it to a person) carries the same clause with `"op": "slotLt"`. A failed condition is a skip, not a failure. An empty input writes no answers and no confidence, so both gated steps skip; guard that case on the input with `slotPresent`.
- **To gate one question rather than all**, compute it in a `value.transform` from `sureness.answers`, matching on `question`.
- **Pick the threshold from previews of real inputs**, good and junk. A yes/no never reports below 0.5, so a threshold at or under 0.5 never catches one.

## 3. Which model a step runs on

A task-driven step's model resolves in this order: `text.generate`'s `modelSlot` at run time → the step's `modelId` → the binding for the step's `taskKey` on the nearest node that has one (the project, or an ancestor) → the environment → the code default. Omitting `modelId` inherits, and inheriting is a real answer.

- **`taskKey` is one of five on a step**: `embedding`, `extraction`, `reasoning`, `summarization`, `tiebreak`. Omitted, a new step starts on `extraction`.
- **Some handlers name their model in `handlerConfig`, not through the step's task.** `text.decide` and `text.rerank` carry `model` with a fixed default. `text.embed`, `audio.transcribe` and `facet.resolve` carry an optional `model`; left empty they take the project's embedding, transcription and extraction model.
- **Pinning `modelId` opts a step out of the project's next model change, silently.** Omit it to inherit through `taskKey`. An unrecognised `modelId` is refused at the write.
- **A `text.generate` step's `modelSlot` naming an unknown or disabled model fails the run** with no fallback.
- **Changing `text.embed`'s model invalidates every stored vector** and needs an index rebuild. `model` is a catalog id (`creator/slug`); the account that serves it is not part of the config.

Three reads say what is there:

| Read                                  | Answers                                                                                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/ai-models` (`?type=chat`, …) | every model the deployment serves; a disabled one is absent, not flagged. A non-null `deprecatedAt` means still runnable, retiring on that date                                                                             |
| `GET /v1/nodes/{nodeId}/task-models`  | at the project's id: each task's current model, the layer that decided it (`source`), whether the project itself bound it (`boundHere`), whether a step may name the task (`assignableToStep`) and whether it is `callable` |
| `GET /v1/nodes/{nodeId}/model-prices` | `prices[]`: one row per model and billable operation, in credits per `unit` (`null` where no single figure applies); `tiers[]`: each rated model's `tier`, 1 (cheapest) to 3                                                |

- **`source`** is `node` (a binding on this project or an ancestor; `decidedAt` names which), `environment` or `code-default`. `source: node` alone does not say the project bound it — a binding on the organization reads the same; `boundHere: true` does.
- **`callable: false` on a task you inherit** means the binding above names a model this deployment holds no account for: every step on that task fails until you bind the task at your project.
- **`inherited`**, on a task you did bind, shows what your binding overrides, so you can see the default without clearing yours.

Bind a task with `PUT /v1/nodes/{nodeId}/task-models/{task} { "modelId": "<creator/slug>" }` (**ADMIN**; a key may do it for its own project). Every step on that `taskKey` follows. The write moves the project's version, so present the version a fresh read or plan gives you on the next document apply.

## 4. What a model costs

`GET /v1/nodes/{nodeId}/model-prices` quotes each model you can bind. A price there is per unit; what a design costs is measured. Queue the preview — `POST /v1/flows/{id}/preview-runs` with `apply: false` — and read `GET /v1/runs/{runId}/spend`; an inline `POST /v1/flows/{id}/preview` leaves no run to read. `kipory-operate`'s `references/spend.md` owns the rest of billing: what a step's compute fee is, what waiting, a cache hit, a preview and a reprocess cost, and who pays.

## 5. When the provider fails, or the call is slow

**A model call can fail on the provider, not on you.** Preview's `errors[].message` (or a run's step log) reads `… provider account exhausted (quota/billing)`. Model calls run on the platform's own provider accounts, so this is the platform's account out of credit: a fault of the deployment, which only whoever runs it can top up — tell them. `GET /v1/nodes/{nodeId}/task-models` goes on reading `callable: true` meanwhile; that field says an account is configured, not that it has credit. The step fails with `detail.phase: "platform-fault"` and is not charged — no compute, and no model charge for a call the provider refused — and an endpoint over the flow answers `503 PLATFORM_DEPENDENCY_UNAVAILABLE` with `Retry-After`. (`text.decide` on a TypeSafe key you stored is the exception: that account is yours, and the step fails `quota-exhausted`.) To keep working until the account is topped up, move the task, not the step:

1. Read `GET /v1/nodes/{nodeId}/task-models` (at the project's id) for the task's current model and `source`.
2. Pick a chat model from another creator in `GET /v1/ai-models?type=chat`: prefer `status: "active"` over `deprecated`, a `modelId` prefix (the creator) that differs, and an `offers[].provider` other than the exhausted account.
3. Bind it at the project node with the `PUT` above, then preview again.

- Pinning `modelId` on one step does the same for that step only, and stops it following the next change.
- The call is made once: an exhausted account refuses the same call the same way, so the step fails at the first refusal and is not tried again. Running it again does not help until the task is moved or the account is topped up.
- **Routing is not an alternative model.** `PUT /v1/nodes/{nodeId}/routing/{modelId} { providerOrder, failover: "on-exhaustion" }` (ADMIN) retries the SAME model through the next account listed in `providerOrder`, and only those. Naming an account that does not offer the model is refused with `PROVIDER_HAS_NO_OFFER`, and a one-account order is accepted but cannot fail over.
- **This recipe moves chat tasks only.** Term writes and a semantic facet's resolution embed on the platform's shared term model, which a project cannot rebind (`kipory-model`).

**A sync endpoint over `text.generate` can 504 while the model is fast.** `text.generate` and the other ingest-phase handlers queue on the platform's worker, and the wait counts against the endpoint's `syncTimeoutMs` (default 30 s). Raise it on the endpoint (up to 120 000) for a flow with a model step, or make the endpoint `async`. The step log's `durationMs` includes the wait; `GET /v1/ai-calls?project={nodeId}` `latencyMs` is the model's own time, so the difference is queue.

**`temperature` and `reasoningEffort` are part of `text.generate`'s cache key**: changing either discards every cached answer for the same prompt. A value the resolved model does not take is discarded without an error — `supportsTemperature` and `reasoningEfforts` on `GET /v1/ai-models` say what it takes (`packs/flows-and-skills.md`). `reasoningEffort` on a step takes only `low`, `medium` or `high`; the catalog's `reasoningEfforts` are the vendor's own words and may list levels a step cannot set.
