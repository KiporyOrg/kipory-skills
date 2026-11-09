# Models: which function asks, which model answers

Everything about a step that calls a model: which function fits the question, how the step is written, how a `text.decide` question is written, which model the step runs on and how to change it, what it costs, and what to do when a provider stops answering. An AI step is an action step like any other — `key`, `function`, `with` — so [action-fields.md](action-fields.md) has the step fields and `functions/<key>.md` each function's settings.

## 1. Which model function asks the question

Three <!-- count: rows-of-next-table --> functions put a question to a model. **`text.decide` costs a small fraction of the other two — reach for it first, and use the others only for what it cannot answer.**

| The question                                                                              | Function             | What you write                                                                                            | What it costs                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Yes or no, pick one of a closed list, or a score on named levels                          | `text.decide`        | no prompt: `with.message` and `with.outputSchema`, a type whose fields ARE the questions (section 3)      | the least by far: a very cheap model that returns values, never text                                                                             |
| Which term of a vocabulary does this belong to, in a vocabulary that is searched or grows | `vocabulary.resolve` | the vocabulary's own settings; it proposes with a model, then matches and mints by the vocabulary's rules | the most: a chat-model proposal plus matching, for each vocabulary not fed by `deterministic` or `extractedVocabularies` (those run no proposal) |
| Anything that needs written words back — a summary, a title, an extraction                | `text.generate`      | `with.prompt`, and `with.outputSchema` for a typed answer                                                 | a chat model, charged on what it reads and what it writes                                                                                        |

**Why `text.decide` is the cheap one.** It runs on a decision model, not a chat model: it does not generate text at all. It answers each question with a value — a chance of yes, the chosen option, a score — so there is nothing written to pay for, and what it reads is priced far below a chat model. One call answers every field of its type, so ten questions are one call. On one deployment a two-question call measured about 30–40 credits, 10 of them the step's compute second; the same closed pick through `vocabulary.resolve` about 600, and a `text.generate` step 120–220. `GET /v1/nodes/{nodeId}/model-prices` quotes this deployment's prices, and section 5 says how to measure your own flow.

So: put every yes/no, closed pick and score a flow needs into `text.decide`, several to a step where they read the same value, and keep `text.generate` for the steps that must write words.

**To judge every item of a list, decide per item inside an `each`.** A `text.decide` step reads one value and answers its questions once, so "which of these search hits are about this business" is an `each` over the list with a `text.decide` inside asking about one item, the answers handed out through `out` ([fan-out.md](fan-out.md) §2; leave `maxItems` out, so a list up to the project's limit, 1,000, runs whole and a longer one fails rather than being cut). Handing the whole list to one `text.generate` and asking for a list of verdicts is the expensive way: a chat model is paid for every line it reads and every verdict it writes, and the step waits while it writes them.

Both shapes were measured on one deployment, on the same stored input:

| Shape                                                                     | Model spend                               | Time             |
| ------------------------------------------------------------------------- | ----------------------------------------- | ---------------- |
| `each` → `text.decide`, three questions per item, 16 items                | 755 credits for all 16, about 47 per item | about 4 seconds  |
| one `text.generate` reading the 16 to 20 items and writing a verdict each | about 3,200 to 3,900 credits for the call | about 52 seconds |

The two made the same accept and reject decisions. These are one deployment's measurements on one model binding, not a price list.

- A closed pick written as a `text.generate` prompt, or as a `vocabulary.resolve` over a vocabulary that never grows, pays a chat model for a question a decision model answers. When the list is fixed and you only need the key, ask it with `text.decide` as an `enum` field; keep a vocabulary only for what terms alone give — a list that grows, nesting, filtering or counting by term (`kipory-model`'s `references/packs/vocabularies.md`).
- "Is this the same thing as that?" is a probability, not prose: one `text.decide` field, compared against a threshold where you branch.

The other model functions answer no question of yours: `text.rerank` orders a list by relevance (`kipory-retrieve`), `audio.transcribe` reads speech (`kipory-extract`). Embedding is not a step: a `semantic` clause of `record.query` and `term.search` embed their own phrase, and the platform embeds records from a table's `search` use.

## 2. Writing an AI step

```yaml
- key: summary
  function: text.generate
  reuseResultsForMinutes: 1440
  with:
    prompt: "Summarise this member's feedback in one sentence:\n\n{{feedback.text}}"
    system: "You write for the club's newsletter."
    temperature: 0.3
- key: triage
  function: text.decide
  with:
    message: feedback.text
    outputSchema: { kind: ref, ref: TicketTriage }
```

- **`text.generate`'s prompt is `with.prompt`**, a template: `{{name}}` reads a value the flow has (a flow input, an earlier step's key, an `each`'s `as`), `{{name.field}}` a field of it; sections and filters as in [patterns.md](patterns.md). `with.system` is the optional system prompt. A value the prompt names that may be nothing is a save finding, as for any read: put the step in `if has`, or give it a default. A prompt that reads a value which may be empty is `STEP_INPUT_MAY_BE_EMPTY` (a model asked about `""` is never meant): guard with `filled`.
- **`text.decide` has no prompt.** `with.message` is the value it judges — text, or a JSON object or list (a file fails the step: extract its text first) — and an empty one fails the step, so feed it a value proven `filled`.
- **`with.outputSchema`** names the answer's type by its key, `{kind: "ref", ref: "TicketTriage"}`, or `{kind: "list", element: {kind: "ref", ref: "TicketTriage"}}`; an unknown key is refused at save, with a fix per near key. Only these two functions take it. Left out on `text.generate`, the answer is text. The save types the step's value by it, so `triage.refund` is a typed read — and only with it: without `outputSchema`, a required read of a field of the answer is not proved and needs a guard, and the run checks the answer against it at the step: an answer that does not fit fails the step `OUTPUT_TYPE_MISMATCH`.
- **One value per step.** Everything the function answers is a field of that one value: `text.decide`'s confidence field, `text.generate`'s `vocabularyFields` (an answer field resolved into terms of a vocabulary).
- **`text.decide` may answer nothing** (an empty message answers nothing): read its value under `if has triage`, or `optional`/`default`.
- **Run settings sit on the step**, beside `function`: `modelId`, `timeoutMs`, `tries`, `tryDelayMs`, `reuseResultsForMinutes` (`0` always asks fresh), `onOversize`. `text.generate`'s `temperature` and `reasoningEffort` are part of its cache key: changing either discards every cached answer for the same prompt.

### Try one step without running the flow

- `POST /v1/flows/{id}/steps/{key}/interpolate` with `values` (keyed by the names the step reads) answers `interpolatedPrompt` — exactly what the model would receive. Free, at EDITOR.
- `POST /v1/flows/{id}/steps/{key}/preview` renders the prompt and calls the model: `interpolatedPrompt`, `response`, `tokensIn`, `tokensOut`, `latencyMs`. Billed, at ADMIN. `modelId` tries another model; `attachments` gives files the step reads, by name, as file ids this project holds.
- Both take `step`, the step as you are writing it, to try a draft before you save it; its `key` must be the key in the path.

## 3. Writing a `text.decide` question

**Every field of the `outputSchema` type is one question** (except one typed `DecisionConfidence`, below), asked in the type's field order against `with.message`. The field's `description` is the question's wording, and it is required on every field. There are exactly three forms:

| Form   | The field's definition                                                                                                                                                                | What comes back                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Yes/no | a `$ref` to the builtin `probability` type, plus `description`; optionally `x-criteria: { "true": "…", "false": "…" }` saying what each side looks like (either side may be left out) | the chance of yes, a number from 0 to 1                                          |
| Choice | `enum` of text, 2 to 255 options — or, to word each option, `oneOf` of `{ "const": "<option>", "description": "<what it covers>" }`                                                   | one option's text                                                                |
| Score  | `"type": "number"` with `x-levels` (2 to 10 worded levels, lowest first), `"minimum": 0` and `"maximum"` equal to the number of levels minus one                                      | a number in that range; it is a weighted mean, so it can fall between two levels |

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

- **The `probability` reference is by id**, on the row API and in a document alike: `{ "$ref": "#/$defs/<dataTypeId>" }`, the id read from `GET /v1/types?project={nodeId}&key=probability` (`kipory-model` has the rule for a `$ref` inside a definition). The id is the project's own, so read it after the project exists.
- **What the save refuses**, each as `DECISION_QUESTIONS_INVALID` naming the field in `details.field`:
  - a `boolean` field — a yes/no is a probability, compared where you branch;
  - a field with no `description`;
  - a number with no `x-levels`, an `integer` score, a score that may be null, a score whose `minimum` is not 0 or whose `maximum` is not the last level's index, and a score carrying `multipleOf`, `exclusiveMinimum` or `exclusiveMaximum`;
  - a level or an `x-criteria` side with no words;
  - a choice with one option, more than 255, or an option that is not text;
  - a type that is not an object with at least one field;
  - a second field typed `DecisionConfidence`.
- **A probability is not a truth value.** Branch on it by comparing with a threshold: `{gte: [triage.refund, 0.5]}`.

### Catching a guess: the confidence field

**A choice always answers; an `unknown` option is not an abstention.** The model picks one option for every question, whatever the input, so junk text still comes back with a language and a category. To get "unsure" instead of a guess, give the type one more field typed `DecisionConfidence`:

```json
"sureness": { "$ref": "#/$defs/<id of the platform's DecisionConfidence type>" }
```

That field is no question: the step writes how sure the model was into it, beside the answers, in its one value (`triage.sureness`). It holds:

| Field                     | Holds                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lowest`                  | the confidence of the least sure answer, 0 to 1                                                                                                         |
| `answers[]`               | one row per question, in the type's field order                                                                                                         |
| `answers[].question`      | the field the answer was written to                                                                                                                     |
| `answers[].type`          | `choice`, `noul` (a yes/no) or `score`                                                                                                                  |
| `answers[].confidence`    | how sure the model was, 0 to 1. For a yes/no it is the larger of the chance of yes and the chance of no, so it is never below 0.5                       |
| `answers[].probabilities` | the chance of every possible answer: keyed by option for a choice, by level index (`"0"`, `"1"`, …) for a score, by `"true"` and `"false"` for a yes/no |

- **Gate on `lowest`** with an `if`: the steps that use the answers in the sure branch, the unsure case (write `unknown`, send it to a person) in `else`.

  ```yaml
  - key: route
    if:
      - test: { gte: [triage.sureness.lowest, 0.7] }
        steps:
          - key: file
            function: record.update
            with: { recordId: ticket.id, fields: { team: triage.team } }
    else:
      steps:
        - key: askPerson
          function: record.update
          with: { recordId: ticket.id, fields: { team: { literal: unknown } } }
  ```

  `triage` itself may be nothing (an empty message answers nothing): when the message is not proven `filled`, put this under `if has triage` too.

- **To gate one question rather than all**, compute it in a `value.transform` from `triage.sureness.answers`, matching on `question`.
- **Pick the threshold from previews of real inputs**, good and junk. A yes/no never reports below 0.5, so a threshold at or under 0.5 never catches one.

## 4. Which model a step runs on

An AI step's model resolves in this order: `text.generate`'s `with.model` at run time → the step's `modelId` → the binding for the step's task on the nearest node that has one (the project, or an ancestor) → the environment → the code default. A `text.generate` step names its AI task in `with.task` — the task routing picks that task's model; it never pins one — and with no `with.task` it runs as the function's default task, `extraction` (its `llm.defaultTask`). A task the project's routing has none of is refused at save, with a fix to the nearest task. Leaving `modelId` out inherits, and inheriting is a real answer.

- **`text.decide` and `text.rerank` name their model in `with.model`**, with a fixed default (`typesafe/jev-latest` for `text.decide`). `text.decide` runs only on a decision model: the save refuses another (`FUNCTION_MODEL_UNUSABLE`). Read `GET /v1/ai-models?type=decision` and name one it lists; an empty list means the step cannot run on this deployment. `audio.transcribe` and `vocabulary.resolve` carry an optional `model`; left empty they take the project's transcription and extraction model.
- **Pinning `modelId` opts the step out of the project's next model change, silently.** An unrecognised `modelId` is refused at the save.
- **A model that cannot read images is refused for a step that hands it files** (`LLM_MODEL_LACKS_VISION`): a step of any function that hands its model files, whose own model (`modelId` or a fixed `with.model`) the catalog marks without vision, and whose prompt, system prompt or inputs read a value typed a file or a list of files. `details.visionModelIds` lists the models that can; pick one, or stop handing it the files. A model the catalog does not know, or a step that follows the project's binding, is not judged at save.
- **A `text.generate` step's `with.model` naming an unknown or disabled model fails the run** with no fallback.
- **The model records are searched with is not a step setting.** It belongs to the table's embedding profile, and changing it re-embeds every record (`kipory-model`).

Three reads say what is there:

| Read                                  | Answers                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/ai-models` (`?type=chat`, …) | every model the deployment serves; a disabled one is absent, not flagged. A non-null `deprecatedAt` means still runnable, retiring on that date                              |
| `GET /v1/nodes/{nodeId}/task-models`  | at the project's id: each task's current model, the layer that decided it (`source`), whether the project itself bound it (`boundHere`) and whether it is `callable`         |
| `GET /v1/nodes/{nodeId}/model-prices` | `prices[]`: one row per model and billable operation, in credits per `unit` (`null` where no single figure applies); `tiers[]`: each rated model's `tier`, 1 (cheapest) to 3 |

- **`source`** is `node` (a binding on this project or an ancestor; `decidedAt` names which), `environment` or `code-default`. `boundHere: true` says the project itself bound it.
- **`callable: false` on a task you inherit** means the binding above names a model this deployment holds no account for: every step on that task fails until you bind the task at your project.
- **`inherited`**, on a task you did bind, shows what your binding overrides.

Bind a task with `PUT /v1/nodes/{nodeId}/task-models/{task} { "modelId": "<creator/slug>" }` (**ADMIN**; a key may do it for its own project). Every AI step without a model of its own follows. The write moves the project's version but changes no element a document states.

## 5. What a model costs

`GET /v1/nodes/{nodeId}/model-prices` quotes each model you can bind. What a design costs is measured: queue a preview — `POST /v1/flows/{id}/preview-runs` with `apply: false` — and read `GET /v1/runs/{runId}/spend`; an inline `POST /v1/flows/{id}/preview` leaves no run to read. `kipory-operate`'s `references/spend.md` owns the rest of billing.

## 6. When the provider fails, or the call is slow

**A model call can fail on the platform's account, not on you.** A preview's `errors[].message` (or a run's timeline) reads `… provider account exhausted (quota/billing)`. Model calls run on the platform's own provider accounts, so this is a fault of the deployment, which only whoever runs it can top up — tell them. `serving` on `GET /v1/nodes/{nodeId}/task-models` is the live state: `{ state: "refusing", since }` while the account that serves the task's model is out of credit, `ok` when nothing is known to be refusing, `unknown` when the platform's checks have not run lately, `null` when no account serves the model. Every account at once is `GET /v1/platform-status`. The step fails with `detail.phase: "platform-fault"` and code `vendor-out-of-credit`, is not charged, and an endpoint over the flow answers `503 PLATFORM_DEPENDENCY_UNAVAILABLE` with `Retry-After`. (`text.decide` on a TypeSafe key you stored is the exception: that account is yours, and the step fails `quota-exhausted`.)

**A provider can also fail on its own side** — `HTTP 503`, `model_unavailable`, `upstream connect error`, `fetch failed`. `serving` reads `{ state: "degraded", since }` once at least five of that provider's calls in the last 30 minutes failed this way and they are over half of its calls, and `ok` again about 10 minutes after calls are answered. A `429` or a call past the step's time limit does not count. Wait and run again, or move the task:

1. Read `GET /v1/nodes/{nodeId}/task-models` (at the project's id) for the task's current model and `source`.
2. Pick a chat model from another creator in `GET /v1/ai-models?type=chat`: prefer `status: "active"`, a `modelId` prefix (the creator) that differs, and an `offers[].provider` other than the failing account.
3. Bind it at the project node with the `PUT` above, then preview again.

- Pinning `modelId` on one step does the same for that step only, and stops it following the next change.
- An exhausted account refuses the same call the same way, so the step fails at the first refusal and is not tried again. `tries` does not help until the task is moved or the account is topped up.
- **Routing is not an alternative model.** `PUT /v1/nodes/{nodeId}/routing/{modelId} { providerOrder, failover: "on-exhaustion" }` (ADMIN) retries the SAME model through the next account in `providerOrder`. Naming an account that does not offer the model is refused with `PROVIDER_HAS_NO_OFFER`.
- **This recipe moves chat tasks only.** Term writes and a semantic vocabulary's resolution embed on the platform's shared term model, which a project cannot rebind (`kipory-model`).

**A sync endpoint over `text.generate` can 504 while the model is fast.** `text.generate` and the other ingest-phase functions queue on the platform's worker, and the wait counts against the endpoint's `syncTimeoutMs` (default 30 s). Raise it (up to 120 000) for a flow with a model step, or make the endpoint `async`. The timeline's `durationMs` includes the wait; `GET /v1/ai-calls?project={nodeId}` `latencyMs` is the model's own time, so the difference is queue.

**A setting the resolved model does not take is discarded without an error** — `supportsTemperature` and `reasoningEfforts` on `GET /v1/ai-models` say what it takes. `reasoningEffort` takes `none`, `low`, `medium` or `high`; the catalog's `reasoningEfforts` are the vendor's own words and may list levels a step cannot set.
