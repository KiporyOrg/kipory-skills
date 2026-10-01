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
resolver flow:    vector.search        → candidate terms, best first   (hitShape: term)
                  term.threshold-gate  → { kind: "resolved", resolution } · { kind: "tiebreak" }
                  text.generate        → the tiebreak, on the tiebreak branch only
```

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
The gate refuses to guess and hands the decision to a `text.generate` tiebreak step instead. That
step is skipped on a decisive score **only because you gate it**: give it `condition: slotEquals`
on `<gateOut>.kind` = `tiebreak`, and give the step that carries the decisive resolution the same
condition on `resolved`. A flow missing either branch carries the error
`TERMS_THRESHOLD_GATE_BRANCH_MISSING` — and with both, the model call is paid for only by the values
that genuinely needed arbitrating.

The thresholds come from the facet's own `resolutionParams`, fed to the gate through the resolver
flow's `params` input rather than configured on the step. A facet with no explicit resolver is bound
to a platform default at creation and carries `lowThreshold: 0.72`, `highThreshold: 0.92`: at or
above the high one the match is reused, below the low one the value is new (`mint` decides what that
means), between them the model decides. Short values score low against the terms they mean; the
`facets` pack has the tuning.

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

This is what a browse or filter surface is built on: it is cheap, it needs no record reads, and it
is already scoped correctly.

## What will bite you

- **`facet.resolve` runs inline and writes nothing.** Its resolutions have to reach exactly one
  persistence sink, and that is normally a `term.upsert`.
- **`term.upsert` writes nothing on a preview.** A preview run resolves and shows you the outcome
  without saving it, so a term you saw proposed may not exist afterwards.
- **The gate does not check that the facet exists.** It stamps the facet onto its decision; whether
  that facet is real is checked when the terms are saved. A typo surfaces one step later than you
  would expect.
- **A `tiebreak` that nothing handles is a value that never lands.** The branch rule is a
  whole-flow check: it never refuses the step write that creates the gate (the branch steps cannot
  exist yet), so read `GET /v1/flows/{id}/health` after wiring both branches.
- **Changing a facet's thresholds does not re-resolve anything.** Existing assignments stay as they
  were decided under the old numbers.
