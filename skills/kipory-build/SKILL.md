---
name: kipory-build
description: Build or edit a Kipory backend as one project document — tables, flows written as steps over the function catalog (`if`, `each`, `repeat`, `parallel`, `try`, `return`, `fail`), endpoints, views and schedules — then plan, apply and try it as a person. Use when implementing the processing a plan called for, adding or changing a step, choosing a function, calling a model or LLM with a prompt (summarise, extract, classify, decide yes or no) and choosing its model, looping over a list, branching, calling a sub-flow, when a plan or a step save is refused, health says the flow cannot run, or a model or provider stopped answering. Not for putting a flow on HTTP in depth (kipory-expose), not for reading a past run (kipory-diagnose), and before changing a flow that an endpoint or a table already depends on, read kipory-evolve.
license: MIT
---

# Build a backend

A backend on Kipory is one **project document**: types, tables, flows of **steps** (written in the order they run — a function, or `if`, `each`, `repeat`, `parallel`, `try`, `return`, `fail`), endpoints, views and schedules, planned and then applied as a whole. The fact most people get wrong: **a document that plans clean is not proven to work.** Call it as a person before you say it does.

## Start here, in this order

1. **`references/quickstart-document.md`**: one complete project this deployment planned, applied and ran, as one document. It covers per-person data, create and list endpoints, a kept total, a model call, a daily job and mail, with every name and field that refuses a plan. Copy its shapes.
2. **`references/answers.md`**: the questions every build asks. How an endpoint answers 404, 409 or 422, how a flow reads the caller, sharing a record, search, order and paging from query params, running once, calls at once on one record, counters, and rehearsing a job.
3. **The `kipory` command** that `kipory-connect` ships: `plan` and `ship` your document (a `.json` file, or a `.mjs` generator that prints it), `user` and `call` to try it as a person, `preview` to run one flow, `docs <words>` for any other question. Write no plan or apply scripts of your own.
4. **Only then a deeper page**, the one `kipory docs` or the table below names.

## Rules that keep a plan clean

- **The format is 11** (`"kipory": 11`); an older document is refused at plan with `DOCUMENT_VERSION_UNSUPPORTED`. Plan the document alone, never an export's `{ "version", "document" }` envelope. Everything is addressed by `key`.
- **A partial document is fine, and absence never deletes.** Removal is `delete: true` on a row and needs ADMIN. A flow's `steps` are stated whole: a step you leave out is removed.
- **Written order is run order**: a step reading a value only a step below it gives is refused (`STEP_READS_LATER`).
- **Gate on each diagnostic's `severity`**, never its `code`. Fix every error a plan lists in one edit, then plan again. `kipory plan` prints one line per error with its document path.
- **On `409 VERSION_CONFLICT`**, read what moved, take your next read, and plan again. Changes to elements your document doesn't touch never refuse it.
- **Function keys**: `references/functions/README.md` lists every function in one line. Open a function's own page only for one you use. The live catalog, not this bundle, lists every function (`references/which-function.md`). A yes/no, a pick from a closed list or a score is `text.decide`, the cheapest model step (`references/models.md`). Which function does which job: `references/which-function.md`.
- **A flow reaches the outside only through a function**: `url.fetch` or `url.send` for any HTTP API (`kipory-gather`).

The plan's lists (`changes`, `moved`, `diagnostics`, `health`, `consequences`), labels, kept plans and the route-by-route loop: `references/document.md`.

## If a vocabulary sent you here

First check you need a flow at all; usually you don't. A vocabulary whose `matching` is `exact` needs no resolver, and a `semantic` one is bound to a platform default unless created with an explicit `null`. Author a resolver only to replace that default, then patch `resolverFlowId` onto the vocabulary (`kipory-model`).

## References

| File                                                               | What it answers                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `references/quickstart-document.md`                                | start here: one complete project as a document, and what refuses a plan       |
| `references/answers.md`                                            | the questions every build asks, each in a few lines                           |
| `references/document.md`                                           | the document's rules: keys, removal, what a plan reports, the loop            |
| `references/which-function.md`                                     | one row per function group, and where its judgment is                         |
| `references/action-fields.md`                                      | a function step's fields: `function`, `with`, arguments, run settings         |
| `references/action-inputs.md`                                      | types, what a step reads, when a step runs, what a setting takes              |
| `references/patterns.md`                                           | the shapes (pipeline, sub-flow, `repeat`, branch, `try`) and the map of pages |
| `references/fan-out.md`                                            | the `each` and `parallel` blocks, run state across elements                   |
| `references/utilities.md`                                          | the small utility functions and `value.transform`'s JSONata habits            |
| `references/records-and-endpoints.md`                              | a record's processing flow, roll-ups                                          |
| `references/endpoint-answers.md`                                   | what an endpoint answers: rows, 404, 422, 403, natural-key collisions         |
| `references/record-query.md`                                       | `record.query`: a per-user feed, the clause grammar, totals                   |
| `references/views.md`, `references/view-endpoints.md`              | views; `record.view` in a flow and the view endpoint                          |
| `references/models.md`                                             | which model function, `text.decide` questions, task bindings, prices          |
| `references/checking.md`                                           | the save-time proof and its fixes, dry runs, previews, what needs ADMIN       |
| `references/first-flow.md` · `references/row-by-row.md`            | one flow built step by step; the step kinds and the step routes               |
| `references/functions/README.md` · `references/functions/<key>.md` | every function in a line; one function's settings and a worked example        |
| `references/functions/expressions.md`                              | the functions an expression may call beyond JSONata's own                     |
| `references/packs/*.md` · `references/api/*.md`                    | the platform's judgment pages and every route's fields                        |

## Then

`kipory-expose` puts the flow on HTTP; `kipory-prove` pins what "working" means; `kipory-model` adds a missing table, type or vocabulary; `kipory-data` seeds and reprocesses records; `kipory-operate` runs it on a schedule or trigger; `kipory-secrets` stores a missing API key; `kipory-channels` if a step sends mail; `kipory-gather`, `kipory-extract` and `kipory-retrieve` for outside sources, files and search; `kipory-evolve` comes before changing a flow something depends on; `kipory-diagnose` reads a run that came back wrong.
