<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Flows & skills

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> the handler keys and configs a skill can use → live `GET /v1/handlers`. **Always** confirm a
> handler key against the live catalog, never against this pack. This pack carries judgment.

## What they are

A **flow** is the unit of doing work: a typed signature (input slots and output slots), an
**output binding** that projects internal results onto that signature, and an ordered set of
**skills**.

A **skill** is one node in it — a handler key, its config, the upstream slots it reads, and the
one slot it writes.

Everything else in a project is a trigger or a binding on top of a flow. An endpoint exposes one
over HTTP, a schedule fires one on a clock, a record type processes records through one, and a
facet resolver _is_ one. Build the flow first; bind it after.

## When you need it — and when you don't

Reach for a flow whenever something has to _happen_. You do **not** need a new flow to change what
triggers existing work — that is a binding on the trigger, not a new pipeline.

Author skills incrementally rather than all at once. One node at a time is the normal mode; a
coordinated set for a batch; a full atomic swap when you are replacing the whole pipeline (which
is also what restoring a checkpoint does).

## The sequence

```
POST /v1/flows                     create the flow with its signature
POST /v1/skills                    add nodes — or /v1/skills/batch, or /v1/skills/replace
PATCH /v1/flows/{id}               bind output slots so the flow can actually produce output
POST /v1/flows/{id}/preview        run it against real inputs and read the transcript
```

Flows are scoped by `project`; skills are scoped by their `flow`. Individual items are addressed
by their own id.

⚠️ **There is no activation step, and no flow lifecycle state.** A flow has no active/inactive flag,
and nothing publishes one — a flow becomes reachable by being _bound_ to something (an endpoint, a
schedule, a record type, a facet resolver), and unreachable by not being. If you went looking for an
activate call, that is why you did not find one. What "activation is stricter than authoring" means
here is the bind and the run, not a state change.

<!-- absent: flows-have-no-activation-state -->

## The one thing to get right: a save succeeding is not a promise it will run

Incremental authoring means a skill save **returns 200 even when the wiring is unresolved**. Only
a problem attributable to a single skill refuses the write. Everything else — problems with the
edges between skills, problems with the flow as a whole, and _all_ warnings — comes back in the
`outstandingIssues` array with a severity, on a successful response.

Runtime is stricter than authoring. So:

- **A 200 does not mean the flow runs.** Read `outstandingIssues` on every **skill** save — ⚠️ the
  flow writes in the sequence above (`POST /v1/flows`, `PATCH /v1/flows/{id}`) carry no diagnostics
  at all, so there is nothing to read there. Ask `GET /v1/flows/{id}/health` for the whole-flow
  verdict.
- The clearest case is `OUTPUT_SLOT_UNBOUND` — a declared output slot with nothing bound to it. It
  is a _warning_, so the flow saves cleanly — and then ⛔ **the run usually SUCCEEDS with a lie in
  it.** At invoke time a required unbound slot is filled with its type's empty value (list → `[]`,
  record or builtin object → `{}`, optional → `null`, string → `""`, number → `0`, boolean →
  `false`), so the caller gets a well-formed empty answer and no error at all. Only a slot typed as
  a union, a record reference, a file, or a library/operator object type has no safe empty value and
  fails with `INVOKE_REQUIRED_OUTPUT_MISSING`. Preview is the surface that still tells the truth: it
  does not fill anything in.
- `INPUT_STREAM_DANGLING_SLOT` is the one to expect while authoring incrementally, and the one that
  bites hardest if you ignore it. A step reads a slot nothing supplies — no skill writes it, and it
  is not a declared flow input or a provider slot. Wiring a consumer before its producer exists is
  normal and the save is meant to succeed; what is NOT normal is shipping it, because at run time
  that step receives nothing and is **skipped**, and a skip cascades silently to every step below
  it. `details.availableSlots` lists every name that would have resolved, so a typo is one edit to
  fix. The usual cause is renaming a producer's output slot without rewriting its readers — the
  platform does not link those two edits for you.

The cheapest way to close this gap is a preview, below, which tells you directly.

### Asking the same question about a whole project

`GET /v1/flows/{id}/health` answers it for one flow: every diagnostic, classified, plus
`isActivatable` — which already accounts for both severity and what each diagnostic is about, so
read it rather than deriving a verdict from the counts yourself.

Each diagnostic carries its words in two halves and two forms:

| field            | what it says                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `message`        | what is wrong, in one line                                                                              |
| `remedy`         | what to do about it — `null` is a real answer, for a finding with nothing a person can act on from here |
| `segments`       | the sentence in pieces, so you can draw the objects it names as links                                   |
| `remedySegments` | the remedy in pieces; empty exactly when there is no remedy                                             |

A segment is `{ kind: "text" }`, `{ kind: "code" }` — a slot, a path, an expression, which names
something real with nowhere to open — or `{ kind: "ref" }`, which carries the object it names
(`step`, `flow`, `recordType`, `facet`, `handler`, `event`) addressed the way the operator UI
addresses one. Every segment also carries its own `text`, so a consumer with nowhere to link
renders the words and loses only the link.

⚠️ `message` and `segments` are folded from ONE list by the platform, so they cannot disagree about
the words — but they are not the same characters: the sentence quotes what a segment names and
backticks what it spells as configuration, where a segment's `text` is the bare word. Read
`segments` when you want the objects; read `message` when you want a sentence. Do not parse either.

For a list, ask the list:

```
GET /v1/flows?project={node}&expand=health
```

Each row then carries a `health` summary, folded from the same report the per-flow route returns
in full, so the two cannot disagree:

| field             | what it says                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isActivatable`   | ⚠️ a PREDICTION, not a gate: no error-severity diagnostic about the graph or its edges. Nothing consults it at run time, so a flow reading `false` still runs              |
| `errors`          | how many diagnostics are errors; not all of them block                                                                                                                     |
| `warnings`        | how many are warnings                                                                                                                                                      |
| `blockingCode`    | the first diagnostic preventing activation, or `null` when nothing does                                                                                                    |
| `blockingMessage` | that diagnostic's message — a sentence naming the skill or slot at fault. ⚠️ the SUMMARY carries the sentence only; the per-flow route carries its segments and its remedy |

Show `blockingMessage`, not `blockingCode`. The code is one machine name out of roughly a hundred
and fifty, and reads as one; the message is the sentence the validator wrote, and it names the particulars a per-code
phrase never could — which skill, which handler key. Both are the head of one array, so they are
`null` together and can never describe different diagnostics. The message embeds operator-authored
names, so render it as text and never as markup.

Two things to know before you reach for it:

- **It is affordable, not free.** Validity is a whole-graph answer, so the platform runs the
  validator once per flow. The project-scoped work — the flow library, the model catalog, the
  registry snapshot — is shared across the batch rather than repeated, which is what makes the
  expansion possible at all; the per-flow work is not. Ask for it on a surface that shows
  validity, not on a picker that needs names.
- **A missing `health` is not a clean bill of health.** A flow the platform could not measure is
  returned WITHOUT the field rather than with a passing one. Treat absence as "not measured" and
  say so; defaulting it to `isActivatable: true` reports a flow nobody managed to check as healthy.

### What the skill list already tells you about the order

`GET /v1/skills?flow={id}` answers three questions about each skill that only make sense with the
rest of the flow in hand, so you never have to walk the graph yourself:

| field       | what it says                                                                                                                                                                                                                                                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `level`     | how many producer-to-consumer steps stand between the skill and the flow's inputs — skills on one level have no edge between them. A condition's slots count as reads. `null` on every skill of a flow whose skills wait on each other in a circle                                                                                      |
| `canFire`   | `false` when the wiring alone keeps the skill from ever running: its condition cannot hold, none of its inputs can arrive, an input it reads a field of never arrives and the skill cannot go without it, or it sits inside a fan-out that can never run — because the slots involved are never written by anything that can itself run |
| `blockedBy` | when `canFire` is `false`, the slot whose absence decides it — for a skill inside a fan-out that can never run, the slot that stops the fan-out                                                                                                                                                                                         |

⚠️ **`canFire: true` is not a promise.** A condition over a value that may arrive, or a list that
may be empty, can still skip a skill on a given run. Only `false` is a finding — and it is judged
the way the runner judges: a gate of `not(slotPresent x)` over a slot nothing writes is `true`
(it holds on every run), and a skill reading one dead slot beside a live one runs, because a step
waits for ANY of its inputs, not all of them. Every skill is judged as though enabled.

⚠️ **A slot nothing writes still gets a `level`.** The runner treats it as supplied and runs the
skill at level 0, where it reads nothing and skips — which is what `INPUT_STREAM_DANGLING_SLOT`
above is for. Read the diagnostic for "is this wired", `canFire` for "can this ever run", and
`level` only for "in what order".

## Choosing a handler: two catalog reads, and they answer different questions

`GET /v1/handlers` is the deployment's catalog — every handler, identical for every caller, and the
one to confirm a key against. Its `io` pair — reads and emits — are project-blind TOKENS (`string`, `T[]`, `nothing`).

`GET /v1/projects/{projectId}/handlers` is the same catalog with each handler's declared types
resolved against **your project's** type registry. Reach for it when you are picking a handler for a
step rather than reading about one:

| field                   | what it tells you                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staticOutputSchema`    | what the handler emits in your project before any wiring — null when it mirrors an input, when the handler writes **no output slot at all**, or when its contract is unresolved |
| `inputContract`         | the bound on each input position, so you can tell which upstream slots may feed it                                                                                              |
| `variadicInputContract` | the same for a handler taking any number of same-shaped inputs                                                                                                                  |
| `configDefaults`        | what a step gets if it sends no `handlerConfig` at all                                                                                                                          |
| `configDefaultsValid`   | false when the handler declares a required field with no default — you MUST send config                                                                                         |
| `freeFormInput`         | which config fields carry slot names rather than literals                                                                                                                       |

⚠️ **A null `inputContract` means the handler declares no bound. It does NOT mean the bound could
not be computed** — `contractUnresolved` says that, separately, and it is a platform defect rather
than something to design around. Do not collapse the two: filtering on "null means unconstrained"
silently stops filtering at the moment the check broke.

⚠️ **`version` is the DEPLOYMENT catalog's hash and does not move when your registry does.** Editing
a schema entry changes the resolved types underneath an unchanged `version`, so it is not a
sufficient cache key for this read.

⚠️ It takes the project's **own id**, not its node id.

## Output binding — what makes a flow produce anything

The binding maps internal slots onto the flow's declared outputs. Without it a flow computes
correctly and returns nothing.

- **On create** it is optional, and only its shape is checked: every key must name a declared
  output slot. There are no skills yet, so nothing else _can_ be checked.
- **Changing the binding alone** re-checks the keys against the persisted output slots, then
  validates the whole graph in one transaction.
- **Changing the signature** requires sending _both_ the input and output type arrays; sending one
  is refused. If you send an explicit binding with it, that binding replaces the old one. If you
  send the signature _only_, the existing binding is silently pruned to the slots that survived —
  the one quiet path in the whole resource, and worth knowing before you use it.

**A signature change is refused with `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` while anything live
still holds a snapshot of the old one.** Two things do: a dynamic API endpoint, and a flow-backed
record type. Each captured the shape when it bound and keeps validating against it, so changing the
flow underneath would not break them loudly; it would leave them serving a contract the flow no
longer satisfies. The refusal names them, not just their count, so you can see which routes you are
about to re-publish.

Send `adoptSnapshots: true` to re-snapshot them in the same transaction as the change. It is off by
default on purpose — adopting rewrites the published request/response contract of a live route, and
that is your decision to make explicitly — but taking it is one call, where unbinding and rebinding
by hand leaves the route bound to nothing in between.

Other things bind a flow without capturing its shape: a schedule, a trigger, a
facet resolver. None of them blocks a signature change, because none froze a copy
to go stale. What a schedule needs is that its stored inputs still cover the flow's declared input
slots, and that is reported live on the schedule itself (`uncoveredInputSlots`) and re-checked when
it fires.

Renaming, or rewriting only the binding, never touches a captured shape and is always allowed —
**including when you send the type arrays back unchanged**, which a client that PATCHes the whole
flow will do. The refusal is on the signature actually moving, not on the request mentioning it.

⚠️ This does not catch the _other_ way a binding goes stale. A snapshot resolves each type
reference to that shape's definition, so **editing a shape re-forms every binding that references
it without anyone touching a flow.**

## Preview — run it for real, in a sandbox

`POST /v1/flows/{id}/preview` runs the persisted skills against your values on the same machinery a
live call uses. Only enabled skills run. The body names WHERE the inputs come from, as a
discriminated union — supplying them here, or seeding from a record:

```json
{ "input": { "kind": "slots", "inputs": { "query": "…" } } }
```

⚠️ **It is `input`, not `inputs`, and the `kind` is not optional.** A body of `{"inputs": {…}}` is
a 422 naming a key you did send and a key you did not.

⚠️ **Preview costs money.** It resolves the project's payer, refuses a suspended or over-cap one
before running anything, and charges provider work exactly as a real run would. What preview avoids
is a specific, listed set of effects — not spend, and ⛔ **not record writes**. Do not treat it as
free or as read-only.

What it does isolate: model calls are tagged as preview so you can filter them out later; files
written by handlers land in a sandbox prefix with no record attached; vector writes are no-ops,
because there is no record for them to attach to.

⚠️ **RECORD writes are not on that list, and never were.** A preview that creates or updates a
record really does, and the row is still there afterwards. The isolation above covers files,
vectors and spend tagging — not your project's data.

⭐ **A preview can also be a queued RUN.** `POST /v1/flows/{id}/preview-runs` takes the same body
and answers `202 { "runId" }` instead of the result: a worker runs the preview under that id, and
the run is read back like any other — `GET /v1/runs/{runId}`, `/steps`, `/steps/stream`, `/spend`,
`/change-set` — with `source.kind: "preview"`. ⚠️ The 202 promises the id, not the run: those
routes answer 404 until the worker writes the opening frame, so poll the run, then follow its step
stream. Same spend, same authorization; nothing cancels it once queued, and it is bounded by the
same wall clock and fan-out cap as the synchronous preview.

The step log carries no values. A queued preview of a project's own flow also writes its **trace
live** — `GET /v1/runs/{runId}/trace` answers the flow's inputs, each step's output by slot
(`slotOutputs`, `stepOutputs`) and a failed step's words (`stepOutputs.steps[].kind: "failed"`,
`error`) while the run is still going; re-read it as the step stream moves, and treat it as final
once the run has ended. A platform flow or a preview run as another project writes none (404).

`apply: false` is what turns preview into a genuine dry run:

```json
{ "input": { "kind": "slots", "inputs": { "query": "…" } }, "apply": false }
```

The flow runs in FULL — every skill, every model call, every precondition — and the writes it
would have made are recorded and then thrown away. Read them back at
`GET /v1/runs/{runId}/change-set`, which lists each write by kind and target. Nothing reaches
your records.

⚠️ **It defaults to `true`, matching what preview has always done.** Omitting it is not a dry
run. This is deliberate: flipping the default would silently change every preview anyone has
already wired up.

⚠️ **It gates the APPLY and nothing else.** A dry run is not a cheaper run — it costs exactly what
an applying one costs, because it does exactly the same work. That is the point: a mode that
skipped steps to avoid the write would be previewing a different flow than the one you asked
about, which is the failure the whole change-set machinery exists to remove.

⛔ **The switch is preview-only, and there is no equivalent on your project's live endpoints.** A
dry run is a question you ask about a flow you are BUILDING. On the production path the same flag
would make "my writes stopped saving" a one-character mistake in a caller's payload,
indistinguishable from success — so to rehearse a flow safely, preview it.

⚠️ **Whose corpus a preview reads is the seam that wastes an afternoon.** A preview from a signed-in
session runs as **you**; a preview from an API key or an internal token runs as a stable sentinel.
Neither of those owns your end users' records, so a `vector.search` over a user-scoped type comes
back **empty** — not an error, just nothing. Every step downstream then behaves as though the corpus
were empty, and the flow looks broken when it is fine. Judge such a flow on the steps _above_ the
search, or give the run a real end user to act as. Two settings do that:

<!-- field-ok: recordOwner — a VALUE of the preview body's `principal` enum, not a field name -->

`principal: "recordOwner"`
on the preview body itself, which runs as the record's own user and is how you preview a link flow
the way it will really run, and an eval suite's `runAsUserId`, which names an arbitrary user.
⚠️ `recordOwner` is an impersonation capability — it needs EDITOR on the record's project as well as
on the flow, and refuses a record with no owner.

⛔ **The same seam bites the OTHER way, and this one is why a broken schedule can preview green.**
Preview always resolves _somebody_ — you, by default. A **schedule resolves nobody**, and the
engine then omits `userInfo` entirely rather than handing down an empty one. An absent input makes
the pipeline **skip** the skill that reads it, and the skip cascades: the terminal step never
writes the slot your output binding names, and the run fails with
`INVOKE_REQUIRED_OUTPUT_MISSING` — while preview, with a principal, sails through.

**A skill whose only input is `userInfo` therefore runs under a request and is skipped under a
schedule.** Give it a second input the trigger always supplies, and preview a scheduled flow the
way it will really run:

```json
{ "input": { "kind": "slots", "principal": "noEndUser", "inputs": {} } }
```

`principal` defaults to `"operator"`, which is the request-shaped run. Billing names you either way.

The response is built for diagnosis: `flowOutput` (the declared projection, with no coalescing),
`missingRequiredOutput` (the slot a live call would have had to invent — non-null means the flow is
not really producing it, though whether a live call FAILS depends on the slot's type, since invoke
fills in every type that has a safe empty value), a per-skill `transcript` with
outcome, timing and error, plus errors, warnings, branches and token and latency totals.

**Read the status code carefully, because a failing flow is still a 200.** Request-shaped faults
are thrown: unknown or missing input slots are refused before running, a suspended payer is
refused before running, an unaddressable flow is a 404, and a run that exceeds the time limit
fails as a timeout. But a flow that _breaks_ comes back 200 with the wreckage in the body — a
runner crash appears as an error entry attributed to the runner, and individual skill failures
ride in the transcript. Checking only the status code will tell you a broken flow is fine.

Use it to prove a binding: break the binding and preview reports `missingRequiredOutput`; bind it
and `flowOutput` fills in.

## When a write is refused with a 409

Three different things return 409 from a skill write, and they call for OPPOSITE remedies. Read
`details.conflict`, never the message:

| `details.conflict`          | what happened                                                 | what to do                                                                               |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `stale-version`             | someone changed the step since you read it                    | re-read and retry, or resubmit with `overwriteConcurrentEdit`                            |
| `concurrent-consumer-write` | a downstream step this edit re-typed was changed concurrently | re-read and retry                                                                        |
| `unique-collision`          | the name or the output slot is already taken in this flow     | change the value `details.field` names — **`overwriteConcurrentEdit` will not clear it** |

⛔ **`overwriteConcurrentEdit` skips the version pre-check and nothing else.** Forcing a `unique-collision` returns
the same 409 forever, because the database index is still there. That is why the kind is on the
envelope rather than left to be inferred: the two lock conflicts and the collision are all 409s, and
guessing between them by reading the message breaks the moment a step is legitimately named
`modified`.

On a `unique-collision` the envelope also carries `conflictingSkillId` / `conflictingSkillName` — who
holds the value — and usually a `suggestion`, a free alternative this API's own write will accept. A
`raced: true` means the value was free again by the time the server looked: another session changed
the flow between your write and the explanation, so retry rather than renaming. `suggestion` is absent
when the handler derives its output slot from its config, because the slot field is not the editable
one there.

## Copying a flow — export, then replace

```
GET   /v1/flows/{id}/export        the graph, in portable form
POST  /v1/skills/replace           the steps, into the target flow
PATCH /v1/flows/{id}               the output binding, and the signature by TYPE NAME
```

There is **no import endpoint, and none is missing**: the `skills` array the export returns IS what
`/v1/skills/replace` accepts. Copying a flow is those calls, not a format conversion.

⚠️ **Three calls, not two.** `replace` writes STEPS. The export's `flow` block carries the declared
input/output slots and the output binding because a graph cannot be reconstructed without them — send
only the steps and you get a flow that computes correctly and returns nothing, which is the
`OUTPUT_SLOT_UNBOUND` trap in a new costume.

⛔ **The `flow` block is not itself a PATCH body, and this page used to imply it was.**
`outputBinding` transfers verbatim. The two slot lists do NOT: the export emits the persisted shape
(`inputSlots: [{ slot, type: { kind: "ref", entryId } }]`) while `PATCH /v1/flows/{id}` takes
`inputTypeNames` / `outputTypeNames` as `{ slot, typeName, isList, required }` — a different field
name and a different shape, and the body is strict, so sending the export's form is refused on an
unknown key. `entryId` is a SOURCE-project registry id and means nothing in the target. Read the type
NAMES for those entry ids from the source project (`GET /v1/schema-entries`) and send those.

⚠️ **Type references are rebound to the target project on the way in**, matched by
`(provenance, name)`. A library type the target lacks is seeded. An operator-defined type it lacks
cannot be — that is the target project's own configuration — so the reference stays unmatched and the
replace refuses with `SCHEMA_REF_DANGLING`, rolling the whole thing back. Loud, not silently
mis-bound, which is what makes cross-project copying safe to offer.

⚠️ **An unrecognised `modelId` is refused at the write.** A graph exported from a deployment with a
model the target does not have fails there rather than silently falling back.

⚠️ **`timeoutMs` travels with the step through THIS export, and did not always.** A step's per-call
deadline is a persisted, operator-set column, and the replace entry had no field for it — so a copied
flow landed with every deadline reset to the per-task default, silently, with nothing in the payload
to notice was missing. `GET /v1/flows/{id}/export` carries it now, and `POST /v1/skills/replace`
persists it; a payload that omits it still parses and means "no per-step deadline", which is what an
older stored export honestly says.

⚠️ **Checkpoints and run flow-snapshots carry it too — but only the ones captured since.** Both are
serialized by the checkpoint entry shape, which records `timeoutMs` now. An older checkpoint or
snapshot lacks the key, and there an absent `timeoutMs` means "this record does not say", NOT "the
run had no deadline". Do not read an older snapshot as evidence about a deadline, and expect restoring
an older checkpoint to clear one. The restore preview shows the pair so the loss is visible before
you commit to it; see `capability-packs/flow-checkpoints.md`.

The four run settings — `tries`, `tryDelayMs`, `onFailure`, `reuseResultsForMinutes` — travel the
same way `timeoutMs` does: the export carries them, `replace` persists them, and the checkpoint
format records them for anything captured since — so their absence on an older snapshot or checkpoint
means "not recorded".

⚠️ **There is no `schemaVersion` on the export, deliberately.** The format is the replace entry
shape, whose evolution is already governed; a version integer beside it would be a second, weaker
mechanism for the same thing — and the weaker one is the one nobody bumps. A stored export re-imported
later is validated by `replace` on the way in, so a shape that moved fails naming the field.

## How a step runs — on/off, time limit, tries, failure, reuse

These settings govern how a step runs rather than what it does. All are optional on a write, and a
step that sets none behaves as it always has.

- **`enabled`** — a switched-off step stays in the flow and never runs. Any step whose every input
  traces back to it skips too, because a step runs while any one input is present. ⚠️ The save does
  not check this: switching a producer off saves cleanly and its readers skip at run time.
- **`timeoutMs`** — what it bounds depends on the handler, and the handler catalog says which:
  `run.timeLimit` is `ai-call` (each AI call), `queue-wait` (the wait on the queued job, covering
  every try — the job may still finish), `in-flow` (how long the run waits for a step that runs in
  the flow itself, whose work may still finish) or `ignored` (control steps). Do not work out what an
  unset limit falls back to — it can be the step's task limit, the deployment's generation default
  or the handler's own wait, and which one depends on the handler. Read `effectiveTimeLimit` on
  `GET /v1/skills?flow=` instead: the limit a run applies, the layer that decided it, and
  `whenUnset`, what clearing the step's own falls back to. Holding a flow's steps already — off
  the bootstrap, which carries every row — ask `GET /v1/flows/{id}?expand=timeLimits` for the
  same figure keyed by skill id, without the rows; it rides beside `expand=dependents` on one
  read. Neither is on the bootstrap: the deployment's limits move it without a design write.
  `run.budgetMs` is a limit the handler
  keeps whatever you set — 5 s for `value.transform` — so only a shorter limit changes anything
  there.
- **`tries`, `tryDelayMs`** — the number of tries including the first (1–5), and a fixed wait between
  them. They REPLACE the handler's own queue attempts rather than adding to them, and apply to fetch
  and file steps only; a step that runs in the flow is tried once. Only a failure a second try can
  fix is tried again — never a missing API key, a blocked web address, bad input or a used-up quota.
  ⚠️ Each try is charged when the step sets its own tries; the handler's built-in tries are billed
  once. If the same fetch is already running for another step, that run's settings apply.
- **`onFailure`** — `FAIL_RUN` (the default): the run fails and keeps nothing it wrote, while steps
  that do not depend on this one still run. `CONTINUE`: the run carries on without this step's
  output and reports the failure as a warning. Refused on a control step, on a step that may write
  or reach a sub-flow, and on a step that feeds a required flow output.
- **`reuseResultsForMinutes`** — how long a result the step saved stays reusable: null is the
  handler's own period, `0` always runs fresh and saves nothing. It is checked when a result is
  READ, so a result another step with identical settings saved counts only within this step's own
  period. ⚠️ A period only ever LENGTHENS what is kept: steps whose fetch is identical share one
  saved result, and it lives for the longest period any of them asked for, so a step with a short
  period cannot cut a step with a long one short.

## Asking about a step you have not saved

26 <!-- count: editor-inputs-from-config --> of the seventy handlers do not take their inputs
from the step row: they name them INSIDE their own configuration. `value.transform` — the most-used handler there is — names them
inside a JSONata expression, so writing the expression IS writing the step's input list, and there
is nothing to pick from a list.

```
POST /v1/skills/validate-draft    what is wrong with this config, and what does it read
```

Send `flowId`, `handlerKey` and the draft's `handlerConfig`. Nothing is persisted and nothing is
executed. You get back `diagnostics` and `derivedInputStreams`.

⚠️ **If the step already has wiring, send `inputStreams`, `inputPaths` and `inputProjectionNames`
too.** They are positionally aligned, exactly as on the skill row. The save resolves a projection
alias back to the stream it came from before pinning the input list, and it needs those columns to
do it — without them a step whose config reads `userInfo__userId` gets back that alias where the
save would pin `userInfo`. Omitting them is correct and free for a step you are creating.

`derivedInputStreams` is the slot list this configuration NAMES, sorted — the **same list the save
pins onto the step**, because the route runs the platform's own derivation rather than a second one.
Send `order.total + shipping` and it answers `["order", "shipping"]`.

⭐ **A prompt-shaped step names its inputs in its placeholders, so send the template too.** For a
handler whose inputs come from its template — `derivedFrom: "template"` — send `promptTemplate`, and
`systemPrompt` when the handler reads one. The answer is the slot list those placeholders name, on
the same terms as the config case: the save's own derivation, so an editor can show what the step
reads while it is being typed rather than only after it is saved. A placeholder written in the
system prompt wires a slot exactly as one in the prompt does, but only where the handler declares it
reads a system prompt at all — `text.generate` does, `text.interpolate` does not.

⛔ **Send `inputSchemas` with it, or a wired FILE is dropped from the answer.** A multimodal handler
attaches a file input that no placeholder mentions, and the save counts that slot; without the refs
this route cannot recognise one and answers a list without it. Saving that list would unwire the
file. This route takes no step id — the step may not exist yet — so it cannot look the shapes up.

`derivedInputSchemas` sits beside it, one entry per slot, and is the shape the save types a wire on
that slot from — the step that writes it, else the flow input, else the platform's own type. When
the derived list differs from the step's wiring, send it as `inputSchemas` for every position you do
not already hold a stored shape for. An entry is `null` when nothing declares that slot's shape:
there is no neutral shape to send, so do not save that list until the slot is typed.

⭐⭐ **Send `run` and it answers the save's own rules about how the step runs.** The five that
exist are in the section above: tries on a step that runs in the flow rather than on a queue, a
wait beside `tries: 1`, a time limit a control step never reads, a time limit above the handler's
own `run.budgetMs`, and a reuse period on a step that saves nothing. Each comes back as a `RUN_*`
code with the field it is about, so a form marks the box rather than showing a sentence.

```json
{ "run": { "timeoutMs": 6000, "tries": 1, "tryDelayMs": 5000 } }
```

⚠️ **Omitting `run` runs no rule about it**, and a `null` inside it is a real value: absent means
the draft does not set that field, `null` means it was cleared, and neither is a violation.

⛔⛔ **The four numbers carry the SAVE's own bounds here** — `timeoutMs` 1–120000, `tries` 1–5,
`tryDelayMs` 0–60000, `reuseResultsForMinutes` 0–86400 — because a dry run that accepts a number the
save refuses is the one thing this route exists to prevent. They were bare integers until 2026-09-20,
so `tries: 99` came back as a clean verdict and `PATCH /v1/skills/{id}` then refused the identical
body at its own schema. A value outside a bound is a **400 against the body**, not a `RUN_*` finding:
the bound is the shape of the field, and the five `RUN_*` rules are about a well-formed number being
wrong for THIS handler.

⭐ **Send `name` beside it.** Every run-settings sentence opens by naming the step — that is the
save's own wording, reused rather than restated — so a draft the route cannot name is described as
`"this step"`. Nothing validates the name; it only changes the words.

⚠️ **`run.onFailure` takes the same two values the step row does** (`FAIL_RUN`, `CONTINUE`) and
nothing else. It was a free-form string for one revision, which meant `"continue"` was accepted,
matched no rule, and came back clean from a draft the save refuses.

⭐ **A finding names the box under `run`**, e.g. `fields: ["run.tryDelayMs"]` — the body nests the
settings, so the bare column name would address a field this request does not carry.

⛔ **One of the five cannot be asked here.** An `onFailure: CONTINUE` on a step writing a slot the
flow must RETURN is a fact about the flow's declaration, not about this draft, and this route is
deliberately graph-free. The save runs it, and `PATCH /v1/skills/{id}` with `validateOnly: true`
walks the graph if you want it first.

⭐ **Send `outputSchema` too and the route will also tell you when the result cannot fit it.**
Optional, and the only thing omitting it costs is that one check — every other diagnostic is
unaffected. Pass the `SchemaRef` the DRAFT declares, not the one on the saved row: an editor that
lets somebody re-point a step at a different type must ask about the type they just chose.

What comes back is a WARNING, `JSONATA_OUTPUT_SHAPE_MISMATCH`, and it is deliberately partial.
JSONata is dynamically typed, so nothing can decide most expressions without running them — and this
route runs nothing. It speaks only where the SOURCE settles the question: a literal object, array or
scalar at the top level (or at the end of a `( … ; … )` block) whose kind, or whose complete set of
literal keys, no value of the declared type could have. `$map(…)`, a path, a function call and a
conditional all answer with silence.

⛔ **So its silence is not a verdict.** A clean answer means "nothing provable is wrong here", never
"this will fit". The authority is the run: `value.transform` compiles the same `SchemaRef` and parses
its real result, and a mismatch FAILS the run. This is that question asked early, cheaply, and
without certainty — which is why it warns rather than blocks, and why you should not gate a save on
it.

⚠️ **One computed key silences the key check.** `{ ($prefix & "id"): … }` is legal, and its key is
not knowable without evaluating — so the route can still tell you the result is an object, and
cannot tell you which keys it will have. A declared LIST is not checked at all: JSONata's sequence
semantics make a singleton and a one-element array hard to tell apart, and a guess there would be a
warning on correct work.

⛔ **An empty `diagnostics` list means the configuration is well-formed. It does NOT mean the step
will save.** Dangling slots, cycles and output collisions are questions about the GRAPH, and this
route never looks at one. `GET /v1/flows/{id}/health` owns those, and a client that presents a clean
draft check as "ready to save" will be wrong for every one of them.

⛔ **A diagnostic names `fields`, a LIST, and its length is the thing to branch on.** One entry is
the ordinary case and that field owns the message: draw it under that control. **Several means the
rule is ABOUT THE RELATIONSHIP between them**, and then no single field owns it — `dataEqualsPath`
and `dataEqualsSlot` on `entity.list` must be set together or not at all, and a `flow.dispatch`
step needs its `rules` list, or else a `default` branch. Drawn under each field it names, an operator reads the same refusal twice and
neither copy is about the control it sits under; so show the message ONCE for the configuration and
mark each field named. An EMPTY list is a problem with the configuration as a whole.

⚠️ **It replaced a single nullable `field`, which could only ever point at one of a pair.** Ten
config fields across the catalog state a cross-field rule in their own prose — "Set both or neither",
"Mutually exclusive with …", "Ignored when … is set" — and a locator that held one path could not
carry any of them, so those sentences stayed prose that nothing enforced and no editor could place.
`position` and `token` are unchanged and remain meaningful only for a single-field diagnostic: a
character offset into "two fields" is not a thing.

⚠️ **`derivedInputStreams: null` is not an empty list, and there are two reasons for it.** Read
`derivedFrom` to tell them apart: `row` means the handler takes inputs from the step row so there was
nothing to derive; and a null with `derivedFrom: "handler-config"` or `"template"` means a check
failed, so any list would have been read off a configuration that does not parse. An empty ARRAY
means the config or the template was read and names no slots.

⛔ **So `derivedFrom: "handler-config"` is not a promise that the list is there.** Check `diagnostics`
first, or check the list for null — the half-typed expression this route exists to answer for is
exactly the case that returns both.

⛔ **`derivedFrom` is not the field that decides whether to show an input picker.** That is
`editor.inputStreams` on the handler catalog, and the two answer different questions — they disagree
for seven handlers. `flow.merge` hides the row picker while deriving nothing here; `entity.count`
shows it while naming slots in its config. Branch your UI on the catalog field.

Diagnostic codes are the platform's own save-time codes, so one you recognise here is the same one
you would meet in a 422 from the save. Treat the vocabulary as open and show a code you do not know:
it grows with the handler catalog. Every diagnostic carries `severity` — ⚠️ do not assume everything
in the list blocks the save — and `details`, the structured facts behind the sentence, so you never
have to parse the message. `details` is an OPEN map whose keys depend on the code: a
too-complex expression carries `nodeCount` and `maxNodeCount`, a too-deep one `depth` and `maxDepth`,
a forbidden built-in `functionName`. A JSONata failure additionally carries `position` and `token`,
so an editor can underline the offending character rather than pointing at the field.

<!-- field-ok: nodeCount — a key INSIDE the open `details` map, not a declared wire field; the map is
     `z.record(z.unknown())` on purpose because its vocabulary grows with the checks -->
<!-- field-ok: maxNodeCount — same open `details` map -->
<!-- field-ok: maxDepth — same open `details` map -->
<!-- field-ok: functionName — same open `details` map -->

## Asking a step's settings first — `validateOnly` on the patch

`PATCH /v1/skills/{id}` takes **`validateOnly: true`**. It runs every rule the
save runs — the normalization, the consumer re-typing cascade, the slot-rename
plan and the whole flow-graph gate — writes nothing, and answers 200 with a
verdict.

⭐⭐ **It is how you ask the run-settings rules without saving.** Every refusal
in the section above is a save-time rule: tries on a step that runs in the flow,
a wait between tries beside `tries: 1`, a time limit on a control step or one
above the handler's own `run.budgetMs`, a reuse period on a step that saves
nothing. Each comes back with its own `code` and the `field` it is about, so a
form marks the box rather than showing a sentence.

⭐ **A confirmed slot rename answers what it would rewrite**, before it does:

```json
{
  "ok": true,
  "complete": true,
  "diagnostics": [],
  "derived": {
    "rewrite": { "rewrittenCount": 4, "rewrittenSkillIds": ["skl_…"] }
  }
}
```

⚠️ **That count is a snapshot** — a sibling edited between this answer and the
save moves it.

⚠️ **Warnings ride `diagnostics` and leave `ok` true.** A save returns the same
set beside the saved row precisely because they block nothing. Gate on
`severity`, never on the list being empty.

⛔ **A stale `capturedVersion` still answers 409, not a verdict.** The draft
would be judged against a row that has moved, so every finding below it would
describe a state you cannot see. Re-read, then ask again.

⛔ **One status, two bodies.** A patch has no second success code to spend, so
the `200` is either the write result or a verdict. Narrow on `ok`, which only
the verdict declares.

## Asking before you add a step — `validateOnly` on the create

`POST /v1/skills` takes **`validateOnly: true`** as well. It runs every rule
the create runs — the normalization, the flow-graph gate, whether the name or
the output slot is already held in the flow, whether a pinned model is in the
catalog — writes nothing, and answers **200** with a verdict. The create itself
answers **201**, so the status alone tells the two apart.

⚠️ **`validate-draft` is not this question.** It judges a configuration — what
it reads, whether it parses — and says a clean answer does not mean the step
will save. A name another step holds, an input count the handler refuses, an
empty prompt a prompt-driven handler needs: those are answered here, not there.

⭐ **A taken name is a verdict on `name` (or `outputSlot`)**, carrying the free
value the create's 409 would have suggested — not a 409.

⚠️ **`taskKey` is optional on this body alone.** Omit it and the step starts on
`extraction`; change it with a PATCH. It decides the model only for a handler
whose model follows its task — but every step bills under its task, and a
handler whose catalog entry says `run.timeLimitFromTask` takes its task's time
limit when the step sets no `timeoutMs`.

### Seeing what a prompt becomes — and what it costs to ask

`validate-draft` answers what a configuration READS. A prompt-shaped step has a second question
that nothing above answers: with the slots filled in, what text does the model actually receive?

```
POST /v1/skills/preview           ask the model, and bill for it
POST /v1/skills/interpolate       render the prompt, and stop
```

Both take `flowId` — the authorization anchor — plus `handlerKey`, `promptTemplate`, your
`slotValues`, and optionally `systemPrompt`. `/preview` additionally takes `taskKey` and
`modelIdOverride`, because only it picks a model. Nothing is persisted either way: no row is
written and no slot is touched.

⚠️ **`/preview` makes one real model call on `text.generate` and bills the project.** It is the
only `/v1/skills` route that spends money, and it is floored at ADMIN for that reason. Every other
step type returns its interpolated text without calling anything, because what those handlers DO
depends on slot I/O the caller has not supplied.

⭐ **`/interpolate` cannot bill, and is floored at EDITOR** — the bar for SAVING the step it stands
in for, which is the same floor `validate-draft` carries. It calls no model, resolves no project
and names no payer. Its reply is the interpolated prompt and the elapsed time; there is no
`response` and there are no token counts, because there is no call to report.

<!-- field-ok: interpolateOnly — REMOVED, and named here on purpose: this paragraph is the
     migration note telling a caller that still sends it where the request goes now. The guard is
     right that no wire contract declares it; that is the fact being reported. -->

⛔ **It was a flag on `/preview` and is now a route, and the reason is the role floor.**
`interpolateOnly: true` made a SPENDING route not spend — which meant the floor had to depend on
the request BODY, and a floor that does that cannot be graded by the gate whose whole job is to
prove that a spending route sits at ADMIN. A route either spends or it does not, and now each one
says which in its own name. **If you were sending `interpolateOnly`, send the request to
`/v1/skills/interpolate` instead; the field is gone.**

⛔ **Both still take `handlerKey`, and you should not lie about it.** That field decides TWO things,
not one: whether a model is called AND whether `{{#slot}}` sections ITERATE. Before the free render
existed, the only way to get one was to claim to be `text.interpolate` — so the cheap render came
back with arrays rendered keep/drop where the real run loops, which is a preview that lies about
precisely the thing being previewed. `/interpolate` takes `handlerKey` for the iteration half
alone, so the text is what the model would have received.

⭐ **A platform flow's step can use `/interpolate` and cannot use `/preview` without a project.**
A platform flow belongs to no project, so there is nobody to bill and no binding to resolve;
`/preview` therefore requires `projectId` there and refuses without it, while `/interpolate` asks
neither question.

⚠️ **A template fault is a 422, not a 500.** `PREVIEW_TEMPLATE_ERROR` carries the interpolation
error verbatim — it is your input, and the route says so rather than swallowing it.

⭐ **`/preview` can attach files, and it names them by ID rather than by key.** A step whose model
reads an image or a PDF is answered on the prompt alone unless you say which files to send, so
`/preview` takes `attachments`: an object keyed by the slot the files stand in for, whose values
are LISTS of ids of files the project holds — a record's files and the project's own library
alike. The platform resolves each id against the project the preview runs in, confirms the upload
finished and the bytes are still in storage, and builds the reference itself.

⚠️ **A list per slot, because a slot can carry more than one file.** A step attaches a file per
WIRE, and two wires may read different paths out of one slot — so a run hands the model every one
of them under that single slot. Send `{"post": ["file_a", "file_b"]}` to preview the same thing.
A single id on its own is refused: the shape is always a list, even for one file.

⚠️ **Which project that is follows the flow, except on a platform flow.** A project flow's step
resolves its attachments against that flow's project. A platform flow has none, so it resolves
against the `projectId` you name — the same one it bills and picks a model from.

⚠️ **The order you send them in is the order the model sees, both ways.** A JSON object's key
order is preserved and each slot's list is taken as written, so the file parts follow the prompt in
that order — send the slots, and the files within a slot, in the step's own input order if the
prompt refers to "the first image".

⛔ **A storage key is not accepted, and that is deliberate.** A key is an address; an id is a name
the platform has to look up and can refuse. An id this project does not hold answers 404 — the
same answer a file that does not exist gets, because telling those apart would make the route an
existence oracle for other projects. A file whose bytes are gone answers 422 and names it. Both
happen before any model call, so a wrong id costs nothing.

⚠️ **At most twelve FILES, counted across every slot and not deduplicated.** Each one is
downloaded in full before the call, so a dozen names pointing at one large PDF is a dozen
downloads — whether they sit on a dozen slots or on one. `/interpolate` takes no attachments at
all: it calls no model, so there is nothing to attach one to.

## Choosing what a step reads

For a handler that takes its inputs from the step row, something has to choose them — and the
choice is judged by rules no client can reproduce: whether a slot fits an input is decided against
the project's type registry, and what a path into a value yields is a projection over the same
registry.

```
GET /v1/skills/input-options    every slot this step could read, each checked
```

Send `flowId` and `handlerKey`, and `stepId` when the step is saved. Omit `stepId` for a step you
are creating. Nothing is persisted.

Read `picker` and `attaches` together. `row` means the step's own inputs are chosen here. `config`
means the step's settings name its inputs. `prompt` means the prompt's placeholders name its TEXT
inputs — not all of them.

⭐ **`attaches` is what a prompt step takes beside the inputs its placeholders name.** A multimodal
handler builds a file-shaped input into what the model is sent, and no placeholder mentions it; on
such a step `attaches` is `files`, and `bounds` and `candidates` are filled exactly as they are for
`row` — every slot in scope, judged as an attachment. It is null everywhere else, including on a
prompt handler that refuses file inputs outright, so `picker === "prompt"` is not the test for
"may this step take a file": `attaches` is. A step's handler says the same thing ahead of this
read, as `attachesFiles` on its `GET /v1/handlers` entry.

`bounds` and `candidates` are filled for `row` and for a step that attaches; they are empty for
`config`, whose settings are where its slots are named.

`count` is how many inputs the step takes, or null for any number — and null for an attachment,
which takes any number and requires none. `bounds` says what each must hold: with a `count`, one
entry per position in order; without one, a single entry every position shares. Its `rule` is
`contract` (the handler declares the shape, in `wants`), `list` (a fan-out's one input), `file`
(something the step attaches: a slot holding a file or a list of files, or a field inside one that
does), `none` (the handler declares nothing) or `unresolved`. `words` says what the input must hold
when no declared shape says it — `a list that is always there` for a fan-out, `a file, or a list of
files` for an attachment — and is null otherwise. A variadic contract is enforced at every
position, exactly as a fixed one is.

⛔ **Whether a slot holds a file is nominal, so do not decide it yourself.** The check resolves the
project's builtin `file` entry and asks assignability against it: an object of your own that
carries a key, a name and a MIME type is not a file, and neither is an entry whose definition
points at the builtin. A wire you choose by comparing printed shapes will be refused by the save
and will look right in every test you build from a real file. Take the verdict from this read, and
store an attachment exactly as it is offered — a `reach-in` path keeps its `path` and its `label`,
because the leaf is the file and the slot's root is not.

Each candidate carries `verdicts`, aligned with `bounds`:

- `fits` — the slot fits as it is. ⭐ **It may carry `parts` as well**: places
  INSIDE it that also fit, in the same shape `reach-in` uses. A slot that fits
  is not an atom — a list of files offered to a handler that takes files can
  still be wired as exactly one of them — so read `parts` if you want to offer
  that, and ignore it to keep offering the slot whole.
- `adapter` — it fits with one step: `first` takes a list's first item, `wrap` turns one value into
  a one-item list.
- `reach-in` — something inside the value fits, though the slot does not; `paths` lists every such
  part, at most three levels deep — shallower first — leaving out any field whose name a path
  cannot carry. ⭐ **A part is a field, or — where the value is a LIST — its first item, its last,
  or one field taken from every item.** The stored `path` says which; a list has no fields of its
  own, so a path never walks a bare field off one.
- `no` — nothing in it fits, with the save's `code` and `message`.
- `unchecked` — nothing was checked.

⭐ **Store what the answer hands you, verbatim.** `schema` goes into `inputSchemas` at that position,
`path` into `inputPaths`, and `label` into `inputProjectionNames`. The label is minted by the
platform; composing your own is how an input ends up exposed under a name nothing reads.

⛔ **Fitting is by type identity, not by resemblance.** A named type fits only an input that wants
that same type, so an object never fits a text input directly, however text-like its fields — which
is exactly the case `reach-in` exists for.

⛔ **`unresolved` is not freedom.** The handler declares a shape for its inputs and it could not be
read — a platform defect. A slot with a shape comes back `unchecked`, a slot with no shape is still
`no`, and a save of the step is refused with `INPUT_CONTRACT_RESOLVER_FAILED`.

⚠️ **Nothing is filtered out.** A slot that does not fit, or cannot be reached, is listed with its
reason. `unreachable` carries the platform's own code and sentence when wiring the slot would make
steps wait for each other in a circle, or would mix a fan-out's or loop's values with values from
outside it. For such a slot only the slot itself is judged: its fields are not walked, so its
verdicts never say `reach-in`.

⚠️ **`unreachable` is not a refusal.** The save keeps such wiring and reports it as an outstanding
issue, and the flow will not activate or run until it is resolved — the picker is telling you before
you make it.

`scopedTo` names the step whose repetition a slot exists inside, with its `kind`: a `fan-out`
delivers a list's items one at a time, and a `loop` re-runs its body over a carried value, one
round at a time. `stepScopedTo` says the same of the step as it is saved.

⚠️ **`unreachable` is judged as if the slot were the step's only input.** For a step that reads
several slots, a mix of two chosen slots from different fan-outs is not caught here — the save
reports it as an outstanding issue once both are saved.

⚠️ **A fan-out needs a list that is always there.** A slot declared as a list that may be missing
comes back `no`, because the save checks the input's shape exactly as stored.

For a step whose inputs are named in its configuration, ask what it may name instead:

```
GET /v1/flows/{id}/scope?step={stepId}    every slot a saved step may read, typed
GET /v1/flows/{id}/scope                  the same, for a step you are about to add
```

It lists the flow's inputs, the platform's own slots, and every slot written by a step that does not
wait on this one — by an input **or by its condition**, which is the save's cycle rule. Each slot
carries the shape the save types a wire on it from, the same resolution as the candidates above.
Without `step`, nothing can wait on the step yet, so every slot the flow's steps write is listed.
⚠️ Except one kind of step: a saved step that already reads the slot your new step will write starts
waiting on it once the new step is saved. The stepless form does not know that slot, so such a step's
outputs stay listed — naming one closes a cycle, which the create reports as a warning, not a refusal.

## Which condition operator fits which value

```
GET /v1/skills/condition-operators    per operator: fits / inert / mismatch, whole slot and field
```

A condition leaf reads one value. For each operator the table gives a verdict on text, a number,
true/false, a list and an object — separately for a whole slot and for a field inside one. `inert`
is a test no value of that kind can change, and validation warns `CONDITION_LEAF_INERT`. Mostly it
gives the same answer on every run (a number held as a whole slot is never read, so `slotEquals` on
one never matches). `listEmpty` on a number, true/false or an object is the exception: missing is
empty and anything present is not, so it asks only whether a value is there — write `slotPresent`,
negated, to say so. `mismatch` compares the wrong type (`slotGt` on text):
`CONDITION_VALUE_TYPE_MISMATCH`, an error on the flow, not the step — the step still saves with the
finding beside it, and the flow's health marks it `blocksActivation`. It is the table both
validation and the run decide by, so offer only what `fits`.

## Renaming a slot — look before you commit

Slots connect steps by NAME, and the name appears in five places: a step's
`outputSlot`, its `inputStreams`, its condition, its prompt template, and slot-carrying fields
inside its `handlerConfig`. Renaming one therefore has a blast radius, and nothing links the edits
for you.

```
GET   /v1/skills/rename-preview    what it would touch
PATCH /v1/skills/{id}              commit, with `confirmedOutputSlotRenames`
```

The preview takes `flowId`, `oldSlotName`, `newSlotName` and an optional
`excludeSkillId` as query parameters — pass the step doing the renaming as
`excludeSkillId`, or it collides with its own output.

The preview reports `skillsAffected`, `sitesAffected`, and a per-step `reports` array naming every
site. It uses the **same scanner** the write's rewrite plan uses, so a site it names is a site the
rewrite touches.

⛔ **An illegal rename comes back as a 200 with `refusals`, not an error.** You asked what would
happen; "it would be refused, because another step already writes that name" is the answer. Read
`legal`. There are **five** refusals: the new name colliding with another step's output; either
name being a flow input, provider or engine slot; the new name breaking the persisted slot grammar;
and **no step in the flow producing the old name at all**. ⚠️ The grammar one catches people,
because the two are not the same regex: the query string admits `_`, the persisted column does not,
so `summary_v2` passes the preview's parameter check and is refused by the write.

⚠️ **`reports` is filled in even when the rename is refused** — what the OLD name is wired to stays
useful when the NEW name is unavailable. Rendering it only on `legal: true` throws away the half you
asked for.

⚠️ **`skillsAffected` is not necessarily the `rewrite.rewrittenCount` the write returns.** The write
also re-derives consumers' declared input types, a separate cascade the preview does not model, so
its figure can be larger.

⛔ **Renaming without confirming does not fail loudly.** The rename lands and every reader keeps
naming a slot nothing produces. `INPUT_STREAM_DANGLING_SLOT` reports that, but it is an edge-target
diagnostic — it rides in `outstandingIssues` on a 200 and blocks activation, not the write. Preview,
confirm, and read what came back.

## What travels between skills

A **slot bag** maps slot names to values, and the value union is closed and untagged: string,
boolean, **number**, list of strings, list of numbers, a file reference, a list of file references,
an object, or a list of objects. ⚠️ The bare `number` arm is easy to forget and its absence has
already cost a production 502: a flow declared a number output, the bag could not carry it, the
runtime shape fell through to "object", and a count reached a response contract as an object. A file reference is exactly a key, a name and a MIME type. A list of numbers
is the dense-vector shape. The declared _schema_ of a slot lives on the skill, not inside the
value.

- **Single versus multiple is the union, not a flag.** List variants are the multiple ones, and
  fanning out requires a list-shaped slot.
- **One writer per slot**, enforced by the database. Two skills cannot write the same slot.
- **A skill can write more slots than `outputSlot` names.** A dispatch writes one per branch, an
  invoke one per mapped return, a merge one per lane, a loop opener every carry slot its
  `seedFrom` / `seedLiteral` seeds, a loop-end its escaped slots, and any handler its declared
  secondary outputs. Every skill read carries `producedSlots.slots` — the full list, as the
  validator reads it — and `producedSlots.unknowable` when the config did not parse and the list
  may be missing some. Read that rather than `outputSlot` when you ask "does anything write this?".
- **Provider slots are seeded by the engine** — the user, the project and the run. They cannot be
  supplied from an incoming request, which is what stops a caller claiming to be someone else.

## Asking before you write — `validateOnly`

`POST /v1/flows` and `PATCH /v1/flows/{id}` take **`validateOnly: true`**. Each
runs every rule its write runs, writes nothing, and answers 200 with a verdict
and the slot names the signature would be stored with:

```json
{
  "ok": true,
  "complete": true,
  "diagnostics": [],
  "derived": { "inputSlots": ["article"], "outputSlots": ["summary"] }
}
```

⭐ **`derived` is the effective slot names.** You may name a slot or leave it to
the platform, which derives one from the type name — so "what will this actually
be called" is a question you can now ask instead of reimplementing.

⭐ **On a PATCH it is what the row would HOLD, not what you sent.** A patch that
mentions the signature without changing it keeps the stored names, and so does a
binding-only rewrite.

⭐⭐ **It runs the graph blockers too**, so a signature change the graph refuses
is visible before you commit to it — the refusal that is otherwise discovered
only after a save has begun.

⛔ **A PATCH answers one status with two bodies**: the saved flow, or a verdict
about one that was not saved. Narrow on `ok`, which only the verdict declares,
or on `id`, which only the flow does. A create spends `201` on the resource and
leaves `200` to the verdict alone.

⚠️ **`ok: true` is a snapshot on a create.** The slug is unique per project — and
separately per platform scope — as a database constraint the write learns about
by attempting it. A collision found here is certain; its absence is not.

⚠️ **An invalid draft is not a failed request**, and `complete: false` means
checking stopped early. Gate on `severity`, never on `code`.

## What the platform refuses

**Read the refusal, not the sentence.** A blocked save is a 422 whose envelope `code` is always
`VALIDATION_FAILED` — that tells you nothing about which rule fired. The rule is in
`details.diagnostics`: one entry per blocking rule, each carrying its own `code`, a `message`
safe to show a person, and — where the rule computed one — its own `details`. Branch on the
per-diagnostic `code`. Never parse the message; its wording is free to change.

Three things worth knowing about that array:

- **A save can break several rules at once**, and they are kept separate rather than merged,
  because the detail shapes are per-rule and do not compose.
- **`details` is where the actionable part lives.** `VECTOR_SEARCH_FILTER_SLOT_UNDECLARED` does
  not merely say a slot is undeclared — it carries the full set of roots the flow _does_ offer,
  so you can correct the config in one step instead of guessing.
- **`skillId` says which row a refusal is about**, and on a batch or replace write the blocking
  diagnostics can belong to several different skills. Do not assume a refusal is about the one
  you think you were editing.

`code` is deliberately an open string: a newer platform can refuse with a rule your client was
never built against. Treat an unrecognised code as a generic refusal and fall back to showing
`message` — do not fail the response over it.

- **A skill name must be slug-cased** — `analyze-text` is a complete name. A dot may group
  segments (`custom.my-skill`), but grouping is yours to choose: nothing dispatches on the
  segment before the dot, and no group has to exist before a name does. What is refused is
  anything outside the grammar: uppercase, underscores, spaces, a leading digit, an empty
  segment. Slots use a different, plainer identifier grammar.
- **Declared input schemas must line up one-for-one with declared input streams**, and any paths
  or projection names alongside them too. This is refused before any database work happens.
- **`FREE_FORM_INPUT_STREAMS_MISMATCH`** — your declared input streams must exactly equal the set
  of slots the handler's free-form config actually references, whether through dotted paths,
  expressions, or template placeholders. The refusal names the streams you are missing, so this
  is a loop worth leaning on rather than avoiding. ⛔ **A prompt edit is a wiring edit.** The set
  is what the template names PLUS every file-shaped wire the step attaches plus any slot named by
  a non-prompt config field the handler declares (`text.generate`'s `modelSlot` is one), so
  sending `promptTemplate` alone — or `handlerConfig` alone — is refused whenever the set moved.
  Ask `POST /v1/skills/validate-draft` for the list and send it with the text.
- **`CONFIG_SLOT_PATH_CROSSES_LIST`** — a config slot path takes a bare FIELD step off a LIST,
  which reads nothing: a list has no fields, so the value resolves to `undefined` on every run and
  the step behaves as though nothing were wired. `hits.chunks.text` is refused where
  `hits` holds a list. ⭐ **Say which item instead** — a config path carries the same steps
  a wire does: `hits[0].id` for one item, `hits[first]` / `hits[last]`, and `hits[].id` for that
  field taken from every item. Naming the list itself passes the whole list. ⚠️ **A WIRE's printed
  path is not always a config path.** A wire chip may render an item step as the suffix `.first`,
  `.last` or `.asList`; typed into a config slot those read as FIELDS of those names, so spell an
  item with brackets. `.asList` has no config spelling at all — lifting a value into a one-element
  list is a wire projection — and a path carrying it resolves to nothing without being refused.
- **Editing a skill requires the version you last read.** A stale one is refused unless you
  explicitly force the save. Re-read and reconcile; do not blind-retry. Batch updates lock each
  item the same way.
- **A flow cannot be deleted while another flow invokes it, or while anything live points at it**
  — one 409 `FLOW_HAS_DEPENDENTS` naming every kind that holds it, the calling flows included
  (⚠️ a **wider** set than the signature guard's, not the same one: to the endpoint and
  record-type bindings that freeze a shape it adds schedules, triggers, facet resolvers, record
  types' derive stages and — for a platform flow — the platform jobs it does. Those bind a flow by
  id, or a job by the flow fitting it, and capture nothing, so they cannot go stale on a signature
  edit — but they very much break on a delete). Only a platform job's stored default is a
  database-level foreign key; every other holder is a loose id, so this check is the only thing
  standing between the delete and a dangling reference. Ask before you press: `GET /v1/flows/{id}?expand=dependents` carries the
  counts and `deleteRefusal` — that 409 in the delete's own words, or null — from the function the
  delete throws from. Offer Delete where it is null; do not decide from `total`.
- **A skill cannot be deleted while another skill in its flow reads a slot it writes** — as an
  input or in its condition — a 409 `SKILL_HAS_DEPENDENTS` naming the slot and the readers. Every
  entry of `GET /v1/skills?flow=`, and every skill on the bootstrap, carries that refusal as
  `deleteRefusal` (or null), from the function the delete throws from.
- **A flow whose project is off the design surface is a 404**, indistinguishable from one that
  never existed.

## What will bite you

- **Replace and checkpoint-restore write entries verbatim**, remapping only type references into
  the target project. They validate the resulting _graph_, not the incoming format. Creating or
  updating a single skill runs the full normalisation pipeline instead — so the two paths do not
  agree on what they will accept, and an entry that survives a restore may be one a single create
  would have rejected.
- **The silent prune.** Sending a signature change with no binding quietly drops bindings for
  slots that no longer exist. Every _explicit_ binding with an unknown key is refused loudly. If
  you want to know what happened to a binding, send it explicitly.
- **Naming a model is pinning one.** What a skill declares is its _task kind_ — extraction,
  reasoning, summarisation, embedding, tiebreak — and that is what selects the model, through a
  binding the operator sets once for the whole project. The model itself is optional on every
  write, and leaving it out is how a skill keeps following that binding. Name one and you have
  pinned that skill: the operator's next model change moves every other skill and silently steps
  around yours. Pin deliberately, for a skill that genuinely needs a particular model, not as a
  field you felt obliged to fill in. An unrecognised model is refused at the write either way.

  **`GET /v1/projects/{projectId}/task-models` is how you see the binding you would be stepping
  around.** It reports, per task kind, the model that resolves for this project and — the field
  worth reading — `source`: which layer decided.

  | `source`         | what it means                                                      |
  | ---------------- | ------------------------------------------------------------------ |
  | `project`        | this project chose it, at /platform/models                         |
  | `system-default` | the deployment chose it; every project without its own follows     |
  | `environment`    | a deployment environment variable                                  |
  | `code-default`   | nobody has configured this task anywhere — the platform's built-in |

  A bare model id cannot tell `project` from `code-default`, and those are opposite situations:
  one is a decision, the other is its absence. It is the same walk the runtime performs, so what it
  reports is what a step will actually run on.

  ⚠️ Offer only tasks carrying `assignableToStep` in a `taskKey` picker. The taxonomy is wider than
  what a step may name, and a step naming an unassignable task is refused at the write. Four of the
  nine are unassignable today — `transcription` and `rerank`, resolved by their handlers directly,
  plus `substrate-embedding` and `chunk-context`. Filter on the field, not on that list: it is a
  measurement of two constants and it has already been wrong once here.

  ⚠️ `source: "environment"` is worth a second look rather than a shrug: that layer carries only a
  model id and forces the provider to OpenAI, so a non-OpenAI model set that way mis-routes.

- **A `temperature` or a `reasoningEffort` the model does not take is DISCARDED, not refused.**
  Both are `text.generate` config fields and both save cleanly on any model. What happens next
  depends on the model, and nothing reports it: the platform strips a temperature before the call
  for a model whose provider rejects one, and an effort sent to a model with no effort dial is
  ignored upstream. There is no error, no warning in the run, and the stored config goes on saying
  what you set.

  **`GET /v1/ai-models` answers both before you write.** `supportsTemperature` is false for a model
  that will have the parameter removed. `reasoningEfforts` is the levels that model actually
  accepts, in the vendor's own words — **empty means no dial**, which includes models that reason
  at a fixed depth, and is much the commoner case than it looks: on one deployment's catalog, 12 of
  16 chat models expose no dial while all but one accept a temperature.

  ⚠️ **`canReason` and a non-empty `reasoningEfforts` are different questions.** A model can reason
  and still take no instruction about how hard — so `canReason: true` is not permission to send an
  effort, and reading it as one is how a config ends up carrying a setting that has never once been
  applied. Ask for the dial, not for the capability.

  ⚠️ **Ask the model that will RESOLVE, not the one the skill names.** A skill with no `modelId`
  follows its task binding, so the capability that matters belongs to whatever
  `GET /v1/projects/{projectId}/task-models` reports for its task kind — and it changes under the
  skill when the operator rebinds.

## Related

- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — exposing a flow over HTTP.
- Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`) — snapshot before a risky edit.
- Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) — make "it works" a stored, replayable claim.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — read before assuming a step exists.
- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — producers before consumers, and how two flows that
  invoke each other are created.

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire
     field a caller sends. It is deliberately absent from every request contract: binding a
     provider slot from HTTP is what would let a caller claim to be someone else. -->
