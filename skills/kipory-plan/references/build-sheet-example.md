# Build sheet — a worked example

<!-- field-ok: pageText — one project's slot name in this example -->

The idea, as the human put it: _"A link library. I paste a URL, it saves the page, summarises it, tags it by topic, and I can search my links. Nothing fancy."_ Names below are this product's, not the platform's; handler keys were confirmed against `GET /v1/handlers` on the deployment in question.

## The walk, step by step

**1 — Project.** Exists. Node id resolved through `GET /v1/projects/by-project-id/{projectId}` and recorded.

**2 — Records.** One thing exists: a saved link. Its shape is a URL, the page text once fetched, a summary, a title. It is searchable by meaning, so it needs an embedding profile to name. Owner scope: the project's shared pool — the human said "my links" but is the only user and will call it with a key; a per-user type would refuse every key-driven write.

**3 — Processing.** One flow, `summarise-link`: scrape the URL, generate a summary, write both back to the record. The catalog has `url.scrape`, `text.generate`, `entity.update`; nothing needs writing.

**4 — Exposure.** Two endpoints: `/v1/links` taking a POST to save a URL (synchronous, returns the record id), and `/v1/links/search` taking a GET to search. Search is `vector.search` over the type's collection, so it is a second flow.

**5 — Classification and linking.** One facet, `topic`, semantic, on the platform default resolver — no custom flow. No relations: links do not point at each other.

**6 — Time.** A nightly schedule that re-summarises links whose summary is empty — the scrape can return nothing on a bad day.

**7 — Signals.** None, because nothing listens: one user, one product, no client that would subscribe.

**8 — Correctness.** Two test cases and no eval suite: whether a known page yields a non-empty summary is pass/fail; whether the summary is _good_ is not a question this product asks yet.

## The sheet

| Step | Primitive         | Name                 | Disposition | Notes                                                                                                                                           |
| ---- | ----------------- | -------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 2    | embedding profile | `links-default`      | `seed`      | create, mint a version, activate — activation is the expensive move                                                                             |
| 2    | schema entry      | `link-shape`         | `seed`      | url (string), title, pageText, summary (string, nullable)                                                                                       |
| 2    | record type       | `link`               | `seed`      | shape `link-shape`, owner scope project, searchable against `links-default`, processing flow `summarise-link`, natural key `url`                |
| 3    | flow              | `summarise-link`     | `seed`      | input `link` record; steps below                                                                                                                |
| 3    | skill             | `scrape`             | `seed`      | `url.scrape`, reads the record's `url`, emits `pageText`; `excludeTags` for consent widgets                                                     |
| 3    | skill             | `summarise`          | `seed`      | `text.generate`, prompt over `{{pageText}}`, condition `slotPresent` on `pageText`; inherit the model through `taskKey: summarization`          |
| 3    | skill             | `write`              | `seed`      | `entity.update` back onto the record with `summary` and `title`                                                                                 |
| 3    | flow              | `search-links`       | `seed`      | input `query` string; `vector.search` over the type's collection; output the hit list                                                           |
| 4    | endpoint          | `save-link`          | `seed`      | POST on `/v1/links`, `flow.invoke` sync into a small `create-link` flow: `entity.create` with `recordType: link`, then `entity.enqueue-process` |
| 4    | endpoint          | `search-links`       | `seed`      | GET on `/v1/links/search?q=`, `flow.invoke` sync, `q` bound to the `query` slot                                                                 |
| 5    | facet             | `topic`              | `seed`      | semantic, platform default resolver, attached to `link`                                                                                         |
| 6    | schedule          | `resummarise-empty`  | `seed`      | nightly, fires `summarise-link` for links with an empty summary; `overlapPolicy: skip`                                                          |
| 8    | test case         | `summary-present`    | `seed`      | inputs: a known stable page; assertions `no-missing-required-output`, `output-present` on `summary`                                             |
| 8    | test case         | `search-finds-saved` | `seed`      | inputs: a query matching a saved link; assertion `jsonata` — the hit list contains its id                                                       |

**Empty steps.** 7 — none, because nothing listens to this product. 5 (relations) — none, because links do not reference each other; revisit if "related links" becomes a feature.

**Open questions.** Should `save-link` be asynchronous? The scrape can take seconds; a 202 with a status path would return faster but complicates the client. Left synchronous with `syncTimeoutMs` at 60 s; flagged.

**The `code` total: 0.** Everything is configuration. The engineering risk is in two places the sheet names rather than hides: the scrape's behaviour on sites that fight extraction (a config knob, not code), and the choice of embedding model, which is expensive to change after records exist.

## What made this sheet cheap to reject

- The reader can see the _whole_ product in fourteen rows and disagree with any one of them before a single call is made.
- Each `seed` row names the handler or shape that matters, so a reviewer who knows the catalog can spot a wrong handler at a glance.
- The two easy-to-forget primitives — the embedding profile and the natural key — are rows, not afterthoughts.
- Nothing has been stored. Rejecting it costs nothing.
