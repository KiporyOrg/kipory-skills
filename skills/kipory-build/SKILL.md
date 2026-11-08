---
name: kipory-build
description: Build or edit a Kipory backend as one project document — tables, flows of actions over the function catalog, endpoints, views and schedules — then plan, apply and try it as a person. Use when implementing the processing a plan called for, adding or changing an action, choosing a function, calling a model or LLM with a prompt (summarise, extract, classify, decide yes or no) and choosing which model it runs on, adding a fan-out, merge, loop, branch or sub-flow, when a plan or an action save is refused, health says the flow cannot run, or a model or provider stopped answering. Not for putting a flow on HTTP in depth (kipory-expose), not for reading a past run (kipory-diagnose), and before changing a flow that an endpoint or a table already depends on, read kipory-evolve.
license: MIT
---

# Build a backend

A backend on Kipory is one **project document**: types, tables, flows of **actions** (one function each, with its settings and the slot it writes), endpoints, views and schedules, planned and then applied as a whole. The fact most people get wrong: **a document that plans clean is not proven to work.** Call it as a person before you say it does.

## Start here, in this order

1. **`references/quickstart-document.md`**: one complete project this deployment planned, applied and ran, as one document. It covers per-person data, create and list endpoints, a kept total, a model call, a daily job and mail, with every name and field that refuses a plan. Copy its shapes.
2. **`references/answers.md`**: the questions every build asks. How an endpoint answers 404, 409 or 422, how a flow reads the caller, sharing a record, search, order and paging from query params, running once, calls at once on one record, counters, and rehearsing a job.
3. **The `kipory` command** that `kipory-connect` ships: `plan` and `ship` your document (a `.json` file, or a `.mjs` generator that prints it), `user` and `call` to try it as a person, `preview` to run one flow, `docs <words>` for any other question. Write no plan or apply scripts of your own.
4. **Only then a deeper page**, the one `kipory docs` or the table below names, for the part you need.

## Rules that keep a plan clean

- **The format is 10** (`"kipory": 10`). Plan the document alone, never an export's `{ "version", "document" }` envelope. Everything is addressed by `key`.
- **A partial document is fine, and absence never deletes.** Removal is `delete: true` on a row and needs ADMIN. A flow's `actions` are stated whole: an action you leave out is removed.
- **Gate on each diagnostic's `severity`**, never its `code`. Fix every error a plan lists in one edit, then plan again. `kipory plan` prints one line per error with its document path.
- **On `409 VERSION_CONFLICT`**, read what moved, take your next read, and plan again. Changes to elements your document doesn't touch never refuse it.
- **Function keys**: `references/functions/README.md` lists every function in one line. Open a function's own page only for one you use. A yes/no, a pick from a closed list or a score is `text.decide`, the cheapest model action (`references/models.md`). Which function does which job: `references/which-function.md`.
- **A flow reaches the outside only through a function**: `url.fetch` or `url.send` for any HTTP API (`kipory-gather`).

The plan's lists (`changes`, `moved`, `diagnostics`, `health`, `consequences`), labels, kept plans and the route-by-route loop: `references/document.md`.

## If a vocabulary sent you here

First check you need a flow at all; usually you don't. A vocabulary whose `matching` is `exact` needs no resolver, and a `semantic` one is bound to a platform default unless created with an explicit `null` (`kipory-model`).

## References

| File                                                               | What it answers                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `references/quickstart-document.md`                                | start here: one complete project as a document, and what refuses a plan                   |
| `references/answers.md`                                            | the questions every build asks, each in a few lines                                       |
| `references/document.md`                                           | the document's rules: keys, partial documents, removal, what a plan reports, versions     |
| `references/which-function.md`                                     | one row per function group, and where its judgment is                                     |
| `references/action-fields.md`                                      | every action field and what leaving it out does, paths, schema references, derived inputs |
| `references/patterns.md`                                           | the control shapes (pipeline, sub-flow, loop, branch) and the map of every shape's page   |
| `references/fan-out.md`                                            | fan-out and merge, run state across branches                                              |
| `references/utilities.md`                                          | the small utility functions and `value.transform`'s JSONata habits                        |
| `references/records-and-endpoints.md`                              | a record's processing flow, roll-ups                                                      |
| `references/endpoint-answers.md`                                   | what an endpoint answers: rows, 404, 422, 403, optional filters, natural-key collisions   |
| `references/record-query.md`                                       | `record.query`: a per-user feed, the clause grammar, totals                               |
| `references/views.md`, `references/view-endpoints.md`              | views: a read declared once; `record.view` in a flow and the view endpoint                |
| `references/models.md`                                             | which model function, `text.decide` questions and confidence, task bindings, prices       |
| `references/checking.md`                                           | diagnostics, dry runs, previews and their traces, what needs ADMIN                        |
| `references/first-flow.md` · `references/row-by-row.md`            | one flow built row by row; the single-action routes and their pitfalls                    |
| `references/functions/README.md` · `references/functions/<key>.md` | every function in a line; one function's settings and a worked example                    |
| `references/functions/expressions.md`                              | the functions an expression may call beyond JSONata's own                                 |
| `references/packs/*.md` · `references/api/*.md`                    | the platform's judgment pages and every route's fields                                    |

## Then

`kipory-expose` to put the flow on HTTP in depth. `kipory-prove` to pin what "working" means before you edit it again. `kipory-model` for a table, a type or a vocabulary that doesn't exist yet. `kipory-data` to seed or correct records and reprocess them. `kipory-operate` for schedules, triggers and what a flow spent. `kipory-secrets` if a function reported a missing API key. `kipory-channels` if an action sends mail or reads a Telegram channel. `kipory-gather` for a source outside the project, `kipory-extract` for one that opens a file, `kipory-retrieve` for chunk, embed, search and cite. `kipory-evolve` before changing a flow that something already depends on. `kipory-diagnose` when a run came back wrong.
