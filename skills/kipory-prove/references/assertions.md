# The assertion vocabulary

One closed set of six kinds, shared verbatim by flow test cases and eval cases. Each is an object with `kind` and the fields below; unknown fields are refused. A flow test case needs between one and fifty; an eval case may carry none and be graded by scorer flows alone.

| `kind`                       | Fields                                      | Passes when                                                                                                                                                    |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-missing-required-output` | —                                           | every output slot the flow declares required was produced. The highest-value check: its failure means a live invocation would fail or return an empty value    |
| `output-present`             | `slot`                                      | the named output slot was produced with a non-empty value                                                                                                      |
| `output-matches-schema`      | `slot`, `entryId?`                          | the slot's value conforms to the slot's declared type — or, with `entryId`, to that schema entry instead                                                       |
| `skill-outcome`              | `skillName`, `outcome`                      | the named step ended as `applied`, `skipped`, `no-op` or `failed` — whichever you assert                                                                       |
| `no-errors`                  | —                                           | the run reported no per-skill errors                                                                                                                           |
| `jsonata`                    | `expression` (1–4000 chars), `description?` | the expression, evaluated over the run result, returns `true`. A non-boolean result **fails** rather than coercing. Validated at save time as well as run time |

## What is deliberately absent

There is no content-equality kind. Assertions constrain **shape and structure**; `jsonata` is the escape hatch for anything more specific, and it inherits the sandbox every expression in the platform runs in: `$now`, `$millis`, `$random` and `$shuffle` are refused, because an assertion that reads the clock is one that passes on Tuesday.

## Reading a result

A test run returns, per case: `outcome` (`passed`, `failed`, `invalid`, `not-run`), the list of assertions each with `passed`, `message` and `actual`, the `missingRequiredOutput` the preview engine saw, and the step transcript. `invalid` is the case whose stored inputs no longer fit the flow's declared slots — the flow's signature moved under a test that was written for the old one, which is a regression to read, not a fixture to repair silently.

An eval run scores each case through the suite's scorer flows and the case's own assertions; an assertion contributes a score with `source: ASSERTION`, a scorer flow one with `source: SCORER_FLOW`. The run's `delta` against the previous settled run says which cases were comparable and which metrics moved.

## Choosing

- Pin the **contract** with `no-missing-required-output` and `output-matches-schema` on every case. These are the two an endpoint's caller depends on.
- Pin a **decision** with `skill-outcome`: that a dispatch took the branch you meant, that a conditional step was `skipped` on this input.
- Pin a **property** with `jsonata`: a list has at least three items, a field is one of a closed set, a number is within range.
- Leave **quality** — is the summary good — to an eval suite with a scorer flow.
