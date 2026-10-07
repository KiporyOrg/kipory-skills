# Build sheet — a worked example

<!-- field-ok: pageText — one project's slot name in this example -->

The idea, as the human put it: _"A link library. I paste a URL, it saves the page, summarises it, tags it by topic, and I can search my links. Nothing fancy."_ Names below are this product's, not the platform's; handler keys were confirmed against `GET /v1/handlers` on the deployment in question.

## The walk, step by step

**1 — Project.** Exists. Its id (the `id` the create answered) recorded.

**2 — Records.** One thing exists: a saved link. Its shape is a URL, the page text once fetched, a summary, a title. It is searchable by meaning, so it needs an embedding profile to name. Owner scope: the project's shared pool — the human said "my links" but is the only user and will call it with a key; a per-user type would refuse every write from a flow a key runs.

**3 — Processing.** One flow, `summarise-link`: scrape the URL, generate a summary, write both back to the record. The catalog has `url.scrape`, `text.generate`, `entity.update`; nothing needs writing. The summary step inherits its model through the `summarization` task, so `GET /v1/nodes/{nodeId}/task-models` was read: the task is `callable` here, and the binding row below records what to do where it is not.

**4 — Exposure.** Two endpoints: `/v1/links` taking a POST to save a URL (synchronous, returns the record id), and `/v1/links/search` taking a GET to search. Each runs a flow of its own: `create-link` looks the URL up and creates the record only when it is new, and `search-links` is an `entity.query` over the type, ranked by meaning.

**5 — Classification and linking.** One facet, `topic`, semantic, on the platform default resolver — no custom flow. No relations: links do not point at each other.

**6 — Time and reaction.** No trigger and no source: nothing is recorded or arrives from outside that should start a flow. A nightly schedule that re-summarises links whose summary is empty — the scrape can return nothing on a bad day. A schedule runs one flow with fixed inputs and cannot select records, so it fires a small sweep flow that lists the links with an empty summary, sets each back to pending and queues it for processing.

**7 — Signals.** None, because nothing listens: one user, one product, no client that would subscribe.

**8 — Correctness.** Two contract suites (eval suites with no scorer flows), one case each: whether a known page yields a non-empty summary is pass/fail; whether the summary is _good_ is not a question this product asks yet, so no scorer flow.

## The sheet

| Step | Primitive          | Name                 | Disposition | Notes                                                                                                                                                                                                                                                                                                                       |
| ---- | ------------------ | -------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | embedding profile  | `links-default`      | `seed`      | create; `link` naming its first generation in `uses.search` is what makes it live — no activate (that switches generations later, and is the expensive move)                                                                                                                                                                |
| 2    | schema entry       | `link-shape`         | `seed`      | url (string), title, pageText, summary (string, nullable)                                                                                                                                                                                                                                                                   |
| 2    | record type        | `link`               | `seed`      | shape `link-shape`, owner scope project, searchable against `links-default`, processing flow `summarise-link`, facets `[topic]`, natural key `url` (`uses` `["key", "filter"]` on it, so the save flow can look it up)                                                                                                      |
| 3    | flow               | `summarise-link`     | `seed`      | input `link` record; steps below                                                                                                                                                                                                                                                                                            |
| 3    | skill              | `scrape`             | `seed`      | `url.scrape`, reads the record's `url`, emits `pageText`; `excludeTags` for consent widgets                                                                                                                                                                                                                                 |
| 3    | skill              | `summarise`          | `seed`      | `text.generate`, prompt over `{{pageText}}`, condition `slotPresent` on `pageText`; inherit the model through `taskKey: summarization`                                                                                                                                                                                      |
| 3    | skill              | `write`              | `seed`      | `entity.update` back onto the record with `summary` and `title`                                                                                                                                                                                                                                                             |
| 3    | task-model binding | `summarization`      | `seed`      | only where `GET /v1/nodes/{nodeId}/task-models` reads `callable: false` for the task: bind it at the project to a model this deployment serves (`kipory-build`)                                                                                                                                                             |
| 3    | flow               | `search-links`       | `seed`      | input `query` string; `entity.query` on `link` with one `semantic` clause, `textSlot: query`; output the records and their `scores`                                                                                                                                                                                         |
| 4    | flow               | `create-link`        | `seed`      | input `url` string; output the link's id; steps below                                                                                                                                                                                                                                                                       |
| 4    | skill              | `find`               | `seed`      | `entity.list` of `link` filtered on `url` (which carries `key` and `filter` uses); a known URL answers the found id                                                                                                                                                                                                         |
| 4    | skill              | `create`             | `seed`      | `entity.create` with `recordType: link`, only when `find` found nothing — a second save of a known URL with different data is otherwise a `409 RECORD_NATURAL_KEY_TAKEN`                                                                                                                                                    |
| 4    | skill              | `enqueue`            | `seed`      | `entity.enqueue-process` on the new record, which starts `summarise-link`                                                                                                                                                                                                                                                   |
| 4    | endpoint           | `save-link`          | `seed`      | POST on `/v1/links`, `flow.invoke` sync into `create-link`, the body's `url` bound to the `url` slot                                                                                                                                                                                                                        |
| 4    | endpoint           | `search-links`       | `seed`      | GET on `/v1/links/search?q=`, `flow.invoke` sync, `q` bound to the `query` slot                                                                                                                                                                                                                                             |
| 5    | facet              | `topic`              | `seed`      | semantic, platform default resolver, attached to `link`                                                                                                                                                                                                                                                                     |
| 6    | flow               | `sweep-empty`        | `seed`      | `entity.list` of `link` with a `dataNullChecks` null check on `summary` → `flow.fan-out` over the records' ids → per record `entity.update` (`setStatus: PENDING`), then `entity.enqueue-process` (`replay: clean`), which re-runs `summarise-link` — the enqueue alone changes nothing, only a pending record is processed |
| 6    | schedule           | `resummarise-empty`  | `seed`      | nightly, fires `sweep-empty` with no inputs; `overlapPolicy: skip`                                                                                                                                                                                                                                                          |
| 8    | eval suite         | `summarise-contract` | `seed`      | subject `summarise-link`, no scorer flows; run with `wait: true` and read `contract`                                                                                                                                                                                                                                        |
| 8    | eval case          | `summary-present`    | `seed`      | in `summarise-contract`; inputs: a known stable page; assertions `no-missing-required-output`, `output-present` on `summary`                                                                                                                                                                                                |
| 8    | eval suite         | `search-contract`    | `seed`      | subject `search-links`, no scorer flows                                                                                                                                                                                                                                                                                     |
| 8    | eval case          | `search-finds-saved` | `seed`      | in `search-contract`; inputs: a query matching a saved link; assertion `jsonata` over `output` (the bound outputs — not `flowOutput`): the hit list contains its id                                                                                                                                                         |

**Empty steps.** 7 — none, because nothing listens to this product. 6 (triggers and sources) — none, because nothing is recorded or arrives from outside that should start a flow. 5 (relations) — none, because links do not reference each other; revisit if "related links" becomes a feature.

**Open questions.** Should `save-link` be asynchronous? The scrape can take seconds; a 202 with a status path would return faster but complicates the client. Left synchronous with `syncTimeoutMs` at 60 s; flagged.

**The `code` total: 0.** Everything is configuration. The engineering risk is in two places the sheet names rather than hides: the scrape's behaviour on sites that fight extraction (a config knob, not code), and the choice of embedding model, which is expensive to change after records exist.

**From sheet to document.** The sheet is the plan; the rows it names become one project document
(`kipory-build`). It deliberately does not spell out the parts that are easiest to get wrong when
writing that document — a record-processing flow's input slots, a searchable type's `uses`, a flow
that receives files. Take those from `kipory-build`'s `references/records-and-endpoints.md` §7
and the handler pages, then plan the document before applying it.

## What made this sheet cheap to reject

- The reader can see the _whole_ product in one table and disagree with any row of it before a single call is made.
- Each `seed` row names the handler or shape that matters, so a reviewer who knows the catalog can spot a wrong handler at a glance.
- The easy-to-forget primitives — the embedding profile, the task-model binding and the natural key on `link` — are written down, not afterthoughts.
- Nothing has been stored. Rejecting it costs nothing.
