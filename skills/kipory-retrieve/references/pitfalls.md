# What will bite you when searching the project's own data

Read this before building or debugging a search over the project's records.

## What will bite you

- **Working around a problem in silence.** When something on Kipory stops you — an unexpected error, a doc that said something untrue, a capability you need that is missing — file a report: `kipory-connect`, "When something stops you".
- **A `semantic` clause embeds the phrase for you**, with the model the type's records were indexed with. That is a model call inside a step you may have been reading as a pure lookup, billed like any other; a query by record makes none and still pays the step's compute fee. `kipory-operate` breaks a run's spend down.
- **Embedding a phrase has one rate limit for the project** (300 per minute), shared by every step of the project that embeds one: a `record.query` whose `semantic` clause names a phrase, and every `term.search`. A search by record (`likeRecordId`) embeds nothing and spends none, and neither does a query with no `semantic` clause. An `each` that searches by phrase for every element spends it quickly; a step that finds it spent waits for it, up to 10 s, and an endpoint whose step is still refused answers `429 RATE_LIMITED` with `Retry-After`.
- **One query can rank several tables.** Name `tableKeys` (2 to 8 tables) in place of `tableKey`: the answer is one ranking across them, and each entry of `scores` carries the `tableKey` of its record. The tables must use the same embedding profile, every clause must be answerable by each table, and the query must hold a `semantic` clause; it is ordered by meaning and has no cursor. Tables on different embedding profiles still take one `record.query` each, merged in a `value.transform`.
- **`scores` is not on every answer.** It is there when the query's own `semantic` clause ranked. A query with no such clause, or one whose phrase sits on a link's peer, has none — and `minScore` and `passage` are refused on a peer.
- **A search that returns nothing is usually not the query.** Records that were never indexed stay `ready` and say nothing — `kipory-model` has the read that shows why (`GET /v1/ai-calls?project={nodeId}&origins=projection`). A `minScore` set too high empties the answer and `emptiedBy` says so.
- **Changing the embedding model or provider means re-embedding everything.** It is a new profile generation plus activate (`kipory-model`), and searches return less while the index refills.
