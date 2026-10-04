# Classification at run time

The facets pack covers the configuration — what a facet is, which resolver it binds, how a value
reaches a record. This page covers the two handlers that sit inside a resolver flow and the one
that reads the vocabulary back, none of which are part of that configuration.

## Where the thresholds are actually decided

A `semantic` facet resolves a proposed value against terms that already exist. The comparison is a
vector search, and the decision is a gate. Two flows are involved — the processing flow, and the
facet's resolver flow that `facet.resolve` invokes once per value:

```
processing flow:  facet.resolve → term.upsert
                  (a proposal per facet, each dispatched to the resolver; then save)
resolver flow:    text.embed           → the proposed value as a vector
                  vector.search        → candidate terms, best first
                                         (collection: "$project.terms", hitShape: term, filter.facet)
                  term.threshold-gate  → { kind: "resolved", resolution } · { kind: "tiebreak" }
                  text.generate        → the tiebreak, on the tiebreak branch only
```

A `term` search takes only a query vector (`queryVectorSlot`), so the resolver embeds the value
first; `vector.search`'s handler page in `kipory-build` has a worked term search.

`term.threshold-gate` compares the top candidate's score against the facet's two thresholds. Its
output has two kinds: `resolved`, carrying the finished `resolution` whose `outcome` is `match` or
`create-new`, and `tiebreak`, carrying nothing. By score:

| Top candidate's score       | Output                            | Meaning                                             |
| --------------------------- | --------------------------------- | --------------------------------------------------- |
| at or above `highThreshold` | `resolved`, `outcome: match`      | reuse the top candidate's term                      |
| at or below `lowThreshold`  | `resolved`, `outcome: create-new` | the proposal becomes a new term                     |
| between the two             | `tiebreak`                        | too close to call — the tiebreak step decides       |
| no candidates at all        | `resolved`, `outcome: create-new` | nothing to match against, so the proposal is coined |

**Both boundaries are inclusive.** A score exactly equal to either threshold is decisive, not
ambiguous — the middle band is strictly between them.

**The middle band is the point of the gate.** A single threshold forces every borderline value into
one of two wrong answers: a near-duplicate term, or a wrong match that quietly merges two things.
The gate refuses to guess and hands the decision to a `text.generate` tiebreak step instead
(where the deployment offers a decision model, the same yes/no is one `text.decide` probability
field — `kipory-build`'s `references/models.md`). That
step is skipped on a decisive score **only because you gate it**. Give the model step the first
condition and the step that carries the decisive resolution the second, where `<gateOut>` is the
gate step's output slot:

```
{ "op": "slotEquals", "slot": "<gateOut>", "path": "kind", "value": "tiebreak" }
{ "op": "slotEquals", "slot": "<gateOut>", "path": "kind", "value": "resolved" }
```

A flow missing either branch carries the error `TERMS_THRESHOLD_GATE_BRANCH_MISSING` — and with
both, the model call is paid for only by the values that genuinely needed arbitrating.

The thresholds come from the facet's own `resolutionParams`, fed to the gate through the resolver
flow's `params` input rather than configured on the step. A facet with no explicit resolver is bound
to a platform default at creation and carries `lowThreshold: 0.3`, `highThreshold: 0.8`: at or
above the high one the match is reused, at or below the low one the value is new (`mint` decides
what that means), between them the model decides. The band is wide because the score finds
candidates and does not decide; the `facets` pack has the tuning.

`parentTermIdSlot` carries the resolved parent for a hierarchical facet, so a term created in the
create-new case lands in the right place in the tree rather than at the root.

## Reading the vocabulary back

`taxonomy.aggregate` answers "what does this user have?" without reading any of their records. It
groups a user's terms per facet and counts them.

- `shape: aggregate` gives a flat catalog per facet. `shape: tree` gives a nested browse tree, and
  under `tree` the `facets` list stops being a filter and becomes the **ordered list of levels**,
  outermost first — category, then a category's types, then a type's subtypes.
- `maxEntriesPerFacet` caps at 200 by default. Entries sort by count first, so when a group runs
  past the cap the highest-count terms survive.
- **Every count is scoped to one user**, from `userIdSlot` (default `userInfo.userId`, the run's
  signed-in end user). An empty user id fails the step rather than counting across users — so a
  run driven by an API key, which carries no end user, fails it unless you point `userIdSlot` at a
  slot that holds one. The failure is deliberate: the alternative is one user's browse tree quietly
  showing another's data.
- **It counts only records that user owns.** Records of a project-scoped type are in nobody's
  count, so on a shared catalog it answers empty even with a real user. Count those per term with
  `GET /v1/terms?project={nodeId}&expand=usage`, or inside a flow with `entity.count` and a
  `facetFilter` per term.

For a per-user type this is what a browse or filter surface is built on: it makes no model call,
needs no record reads, and is already scoped correctly.

## What will bite you

- **`facet.resolve` runs inline and writes nothing.** Its resolutions have to reach exactly one
  persistence sink, and that is normally a `term.upsert`.
- **`term.upsert` writes nothing on a preview.** A preview run resolves and shows you the outcome
  without saving it, so a term you saw proposed may not exist afterwards.
- **`term.upsert` adds; it never replaces.** A run that resolves a `one` facet to a different term
  than the record already carries fails when its writes apply, and every write of the run is
  dropped. The symptom misleads: the record goes `failed` while the step log shows every step
  applied, and only `GET /v1/runs/{runId}/change-set` says why — `rejected`, with
  `rejection.cause.kind: "unique-violation"`. A `many` facet keeps the old terms beside the new.
  Resolving to the term the record already carries is fine. So:
  - re-classify only on a clean run — `POST /v1/records/{id}/reprocess`, or
    `entity.enqueue-process` with `replay: clean`, both of which strip the record's terms first
    (`kipory-data`);
  - or gate the classify steps so they are skipped when the record already carries a term;
  - or replace one facet's terms by hand with `PUT /v1/records/{id}/facets/{facetKey}`.
- **The gate does not check that the facet exists.** It stamps the facet onto its decision; whether
  that facet is real is checked when the terms are saved. A typo surfaces one step later than you
  would expect.
- **A `tiebreak` that nothing handles is a value that never lands.** The branch rule is a
  whole-flow check: it never refuses the step write that creates the gate (the branch steps cannot
  exist yet), so read `GET /v1/flows/{id}/health` after wiring both branches.
- **`mint: candidate` reuses its candidates, as well as the match allows.** A `candidate` facet
  searches its active terms and its own candidates, so a second record proposing the same thing
  lands on the candidate the first one coined and the candidate's record count grows. The
  identical key always matches; a near-synonym (`ai`, `artificial-intelligence`) matches only
  when its score clears the facet's thresholds, so twins still appear and merging them is part
  of reviewing candidates. Nothing activates a candidate on its own. A resolver flow of your own
  must leave `status` unset on its `vector.search` step: one that states `active` reuses nothing.
- **A record's `terms` say which are candidates.** Each entry of `terms` on a record read carries
  `status` — `active`, `candidate` or `archived` — so a client can leave an unadmitted term out
  without a second read of the vocabulary.
- **A term filter matches active terms only.** A `term=` condition on the records list and a
  query's `term` clause do not find a record filed under a candidate until the term is admitted
  (`PATCH /v1/terms/{id}`) — so on a `mint: candidate` facet a term can show on the record and
  still filter to nothing.
- **A proposal of `null`, `none` or `n/a` is never coined.** A model asked for a required value
  answers with one of those words when nothing fits. It still matches a term your vocabulary
  really holds under that key; it is never minted, and the step reports it as unresolved. Set the
  facet's `proposal.allowEmpty` so the model can leave the value out instead.
- **Two records classified in separate runs can disagree.** Each record's processing run resolves
  its own values with its own model call, so a record and the parent record it is linked to can
  land on different terms of one facet; nothing reconciles them. Where they must agree, classify
  one of the two and file the same term on the other
  (`PUT /v1/records/{id}/facets/{facetKey}` by hand).
- **Changing a facet's thresholds does not re-resolve anything.** Existing assignments stay as they
  were decided under the old numbers.

## When a term write is refused by the embedding provider

`POST /v1/facets/{id}/terms` and a relabelling `PATCH /v1/terms/{id}` embed the term's text
synchronously before they save, whatever the facet's `matching`, on the platform's shared term
model (the `substrate-embedding` task).

- **The model is platform-wide, not per project.** Binding `substrate-embedding` on your project
  node is a 422 (`details.reason: "TASK_READ_AT_ROOT_ONLY"`), and binding `embedding` there moves
  record search, not terms. There is no project-side escape; retry later.
- **When its provider refuses (quota, outage), the write fails** — `502 UPSTREAM_FAILED` when the
  provider answers no usable vector, or the provider's own status (a 429 for an exhausted
  account) — and nothing is saved, even on an `exact` facet.
- **A `429 RATE_LIMITED` whose message says the provider account is exhausted and "non-retryable"**
  is the provider's quota, not your own rate limit: do not retry it in a loop.
- **A `validateOnly` seed does not embed**, so it can answer `ok` for a seed the real call refuses.
- **`qdrantUpsertFailures` and `reembedWarning` are a different, later failure**: the term row
  saved but its vector store write did not.
