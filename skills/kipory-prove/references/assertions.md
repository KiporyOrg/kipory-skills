# The assertion vocabulary

One closed set of six kinds, carried by eval cases. Each is an object with `kind` and the fields below; unknown fields are refused. A case carries up to fifty. It may carry none and be graded by scorer flows alone — but in a suite with no scorer flows (a contract suite) such a case can never fail, and planning the run warns with `EVAL_CASE_CANNOT_FAIL`.

| `kind`                       | Fields                                      | Passes when                                                                                                                                                    |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no-missing-required-output` | —                                           | every output slot the flow declares required was produced. The highest-value check: its failure means a live invocation would be refused `FLOW_OUTPUT_MISSING` |
| `output-present`             | `slot`                                      | the named output slot was produced with a non-empty value                                                                                                      |
| `output-matches-schema`      | `slot`, `dataTypeId?`                       | the slot's value conforms to the slot's declared type — or, with `dataTypeId`, to that type instead                                                            |
| `action-outcome`             | `actionKey`, `outcome`                      | the named action ended as `applied`, `skipped`, `no-op` or `failed` — whichever you assert                                                                     |
| `no-errors`                  | —                                           | the run reported no per-action errors                                                                                                                          |
| `jsonata`                    | `expression` (1–4000 chars), `description?` | the expression, evaluated over the run result, returns `true`. A non-boolean result **fails** rather than coercing. Validated at save time as well as run time |

## What a `jsonata` expression reads

The expression is evaluated over one object:

| Key                                | Holds                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `output`                           | the flow's bound outputs, keyed by output slot — what an endpoint would return |
| `inputs`                           | the case's own input bag, as the flow was invoked with it                      |
| `expected`                         | the case's `expected` value, or null when it has none                          |
| `missingRequiredOutput`            | the first required output slot the run did not produce, as a name, or null     |
| `transcript`                       | the per-action transcript                                                      |
| `errors`                           | the per-action errors, each with `actionId`, `branchId`, `phase`, `message`    |
| `warnings`                         | the run's warnings                                                             |
| `totalTokensIn` · `totalTokensOut` | the run's token totals                                                         |
| `latencyMs`                        | the run's wall time                                                            |

⚠️ The root is `output`, not `flowOutput` — the preview response's name for the same value. `flowOutput.x = true` reads nothing and fails, its reason ending `— got {"left":"(nothing)","right":true}`. A failed comparison's reason ends with the two values it compared, `left` and `right`; through `and` they are those of the first part that was false. An expression that compares nothing (a bare function call) gives no values. Examples: `output.urgent = true`, `$count(output.items) >= 3`, `output.category in ["billing", "bug"]`, `$count(errors) = 0`, `output.category = expected.category`.

## What is deliberately absent

There is no content-equality kind. Assertions constrain **shape and structure**; `jsonata` is the escape hatch for anything more specific, and it inherits the sandbox every expression in the platform runs in: `$now`, `$millis`, `$random` and `$shuffle` are refused, because an assertion that reads the clock is one that passes on Tuesday.

## Reading a result

A run checks each case's assertions and, when the suite has them, grades it through its scorer flows; an assertion contributes a score with `source: assertion`, a scorer flow one with `source: scorer-flow`. The run's `contract` says whether the cases held: `verdict` (`held`, `broken`, `incomplete` — nothing broke but the deadline cut a case before it was checked — or `none`), `casesBroken`, `assertionsFailed`, `casesNotRun`, `brokenCases` — each broken case's key with its reasons, a failed assertion's reading `<message> — got <value>` (the value JSON-encoded, capped at 2,000 characters; there is no separate `actual` field) — and `flipped`, the cases that held in their baseline (the newest earlier run that judged them) and are broken now, which regress the run.

A case's outcome is `scored`, `errored`, `invalid` or `not-run`. `invalid` is the case whose stored inputs no longer fit the flow's declared slots — the flow's signature moved under a case written for the old one, which is a regression to read, not a fixture to repair silently. It breaks the contract, as `errored` does. The run's `delta` against the previous `success` or `partial` run says which cases were comparable and which scorer metrics moved.

## Choosing

- Pin the **contract** with `no-missing-required-output` and `output-matches-schema` on every case. These are the two an endpoint's caller depends on.
- Pin a **decision** with `action-outcome`: that a dispatch took the branch you meant, that a conditional action was `skipped` on this input.
- Pin a **property** with `jsonata`: a list has at least three items, a field is one of a closed set, a number is within range.
- Leave **quality** — is the summary good — to a scorer flow on the suite.
