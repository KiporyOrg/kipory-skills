<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Flows & skills

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`;
> the handler keys and configs a step can use → live `GET /v1/handlers`. **Always** confirm a
> handler key against the live catalog, never against this pack. This pack carries judgment.

## If you read one screen

Three facts change a plan more than the rest of this pack, and each sits deep in it:

- **Preview writes unless you say otherwise.** `apply` defaults to `true`; `apply: false` is the
  dry run. → _Preview — run it for real, in a sandbox_
- **A schedule resolves nobody.** `userInfo` is absent. A step reading only provider slots still
  runs (a project-wide read ignores the missing user, a per-user read fails); a step reading
  `userInfo` beside a slot that never arrives is skipped. Preview as `principal: "no-end-user"` to
  see it. → the same section
- **A step can replace its handler's cache.** `reuseResultsForMinutes: 0` runs fresh every time,
  which is what polling a source needs. → _How a step runs_

Building a product, you can skip the three "Asking…" sections on a first read: they describe
`validateOnly` and `derived` in depth.

## What they are

A **flow** is the unit of doing work: a typed signature (input slots and output slots), an
**output binding** that projects internal results onto that signature, and an ordered set of
**steps**.

A **step** is one node in it — a handler key, its config, the upstream slots it reads, and the
one slot it writes. The routes say `/v1/steps`; the fields that name a step say `skill` — `skillId`,
a write's `skill`, a document's `skills` map. They are one thing, and this pack says "step".

Everything else in a project is a trigger or a binding on top of a flow. An endpoint exposes one
over HTTP, a schedule fires one on a clock, a table processes records through one, and a
vocabulary resolver _is_ one. Build the flow first; bind it after.

## When you need it — and when you don't

Reach for a flow whenever something has to _happen_. You do **not** need a new flow to change what
triggers existing work — that is a binding on the trigger, not a new pipeline.

Author steps incrementally rather than all at once. One node at a time is the normal mode; a
coordinated set for a batch; and to replace a flow's whole step set, state the flow's `skills` map
in a project document (restoring a checkpoint swaps the whole set too).

## The sequence

```
POST /v1/flows                     create the flow with its signature
POST /v1/steps                    add nodes — or /v1/steps/batch, or a project document
PATCH /v1/flows/{id}               bind output slots so the flow can actually produce output (send its `version`)
POST /v1/flows/{id}/preview        run it against real inputs and read the transcript
```

Flows are scoped by `project`; steps are scoped by their flow (`flowId`). Individual items are
addressed by their own id. A flow's `key` is lower-case kebab and permanent — a key outside that
form is refused, never lower-cased for you — and its display text is `label`, editable at any time.
A flow's `scope` reads `project` for one of yours and `system` for a platform flow.

⛔ **A flow PATCH requires the flow's `version`** — the one on its row (`GET /v1/flows/{id}`, or the
bootstrap's flows section). Every write that changes the flow's label, description, signature or
binding bumps it — a PATCH, a checkpoint restore, a project document's apply — and a stale one
answers 409 `VERSION_CONFLICT`. Re-read the flow and reapply your change; do not blind-retry.
A step's `key` follows the step-name grammar (below) and is renameable.

⚠️ **There is no activation step, and no flow lifecycle state.** A flow has no active/inactive flag,
and nothing publishes one — a flow becomes reachable by being _bound_ to something (an endpoint, a
schedule, a table, a vocabulary resolver), and unreachable by not being. If you went looking for an
activate call, that is why you did not find one.

⚠️ **Nothing refuses to run a flow because its health has errors.** Preview, endpoints, triggers,
schedules, record processing and sub-flow calls all run a flow whatever `GET /v1/flows/{id}/health`
says. An error there tells you what the flow will get wrong — a step reading a slot nothing writes
reads nothing — not that it is stopped. Fix errors before you bind a flow; a bound flow with errors
runs and produces wrong results.

<!-- absent: flows-have-no-activation-state -->

## The one thing to get right: a save succeeding is not a promise it will run

Incremental authoring means a step save **succeeds — 201 on a create, 200 on an update — even
when the wiring is unresolved**. Only
a problem attributable to a single step refuses the write. Everything else — problems with the
edges between steps, problems with the flow as a whole, and _all_ warnings — comes back in the
`outstandingIssues` array with a severity, on a successful response.

Runtime is stricter than authoring. So:

- **A successful save does not mean the flow runs.** Read `outstandingIssues` on every **step** save — ⚠️ the
  flow writes in the sequence above (`POST /v1/flows`, `PATCH /v1/flows/{id}`) carry no diagnostics
  at all, so there is nothing to read there. Ask `GET /v1/flows/{id}/health` for the whole-flow
  verdict.
- The clearest case is `OUTPUT_SLOT_UNBOUND` — a declared output slot with nothing bound to it. It
  is a _warning_, so the flow saves cleanly — and then ⛔ **every run of it is refused.** A
  required output no step produced answers `422 FLOW_OUTPUT_MISSING`, whatever its type, and the
  run's writes are discarded. Nothing is filled in. Preview names the slot in
  `missingRequiredOutput` before a live call does.
- `INPUT_STREAM_DANGLING_SLOT` is the one to expect while authoring incrementally, and the one that
  bites hardest if you ignore it. A step reads a slot nothing supplies — no step writes it, and it
  is not a declared flow input or a provider slot. Wiring a consumer before its producer exists is
  normal and the save is meant to succeed; what is NOT normal is shipping it, because at run time
  that step receives nothing and is **skipped**, and a skip cascades silently to every step below
  it. `details.availableSlots` lists every name that would have resolved, so a typo is one edit to
  fix. The usual cause is renaming a producer's output slot without rewriting its readers — the
  platform does not link those two edits for you.

The cheapest way to close this gap is a preview, below, which tells you directly.

### Asking the same question about a whole project

`GET /v1/flows/{id}/health` answers it for one flow: every diagnostic, classified, and
how many are `errors` in `counts` — 0 means the flow is sound. An error does not stop the flow from running.
Each diagnostic carries a `message` (what is wrong, in one line) and a `remedy` (what to do about
it; `null` is a real answer, for a finding with nothing to act on from here).

For a list, ask the list:

```
GET /v1/flows?project={node}&expand=health
```

Each row then carries a `health` summary, folded from the same report the per-flow route returns
in full, so the two cannot disagree:

| field               | what it says                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `errors`            | how many diagnostics are errors; 0 means the flow is sound. ⚠️ an error does not stop the flow from running                                                          |
| `warnings`          | how many are warnings                                                                                                                                                |
| `firstErrorCode`    | the first error's code, or `null` when there is none                                                                                                                 |
| `firstErrorMessage` | that error's message — a sentence naming the step or slot at fault. ⚠️ the SUMMARY carries the sentence only; the per-flow route carries its segments and its remedy |

Two things to know before you reach for it:

- **It is affordable, not free.** Validity is a whole-graph answer, so the platform runs the
  validator once per flow. The project-scoped work — the flow library, the model catalog, the
  registry snapshot — is shared across the batch rather than repeated, which is what makes the
  expansion possible at all; the per-flow work is not. Ask for it when you need validity, not
  when you only need names.
- **A missing `health` is not a clean bill of health.** A flow the platform could not measure is
  returned WITHOUT the field rather than with a passing one. Treat absence as "not measured" and
  say so; defaulting it to `errors: 0` reports a flow nobody managed to check as healthy.

### What the step list already tells you about the order

`GET /v1/steps?flowId={id}` answers three questions about each step that only make sense with the
rest of the flow in hand, so you never have to walk the graph yourself:

| field       | what it says                                                                                                                                                                                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `level`     | how many producer-to-consumer steps stand between the step and the flow's inputs — steps on one level have no edge between them. A condition's slots count as reads. `null` on every step of a flow whose steps wait on each other in a circle                                                                                        |
| `canFire`   | `false` when the wiring alone keeps the step from ever running: its condition cannot hold, none of its inputs can arrive, an input it reads a field of never arrives and the step cannot go without it, or it sits inside a fan-out that can never run — because the slots involved are never written by anything that can itself run |
| `blockedBy` | when `canFire` is `false`, the slot whose absence decides it — for a step inside a fan-out that can never run, the slot that stops the fan-out                                                                                                                                                                                        |

⚠️ **`canFire: true` is not a promise.** A condition over a value that may arrive, or a list that
may be empty, can still skip a step on a given run. Only `false` is a finding — and it is judged
the way the runner judges: a gate of `not(slotPresent x)` over a slot nothing writes is `true`
(it holds on every run), and a step reading one dead slot beside a live one runs, because a step
waits for ANY of its inputs, not all of them. Every step is judged as though enabled.

⚠️ **A slot nothing writes still gets a `level`.** The runner treats it as supplied and runs the
step at level 0, where it reads nothing and skips — which is what `INPUT_STREAM_DANGLING_SLOT`
above is for. Read the diagnostic for "is this wired", `canFire` for "can this ever run", and
`level` only for "in what order".

## Choosing a handler: two catalog reads, and they answer different questions

`GET /v1/handlers` is the deployment's catalog — every handler, identical for every caller, and the
one to confirm a key against. Its `io` pair — reads and emits — are project-blind TOKENS (`string`, `T[]`, `nothing`).

`GET /v1/handlers?project=<project id>` is the same catalog with each handler's declared types
resolved against **your project's** type registry — the same route, with these fields added. Reach
for it when you are picking a handler for a step rather than reading about one:

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
a type changes the resolved types underneath an unchanged `version`, so it is not a
sufficient cache key for this read.

## Output binding — what makes a flow produce anything

The binding maps internal slots onto the flow's declared outputs. Without it a flow computes
correctly and returns nothing.

Every flow is declared: on every read `inputSlots` and `outputSlots` are lists (`[]` declares no
slot) and `outputBinding` is an object (`{}` binds no output). Neither is ever null, so there is no
"undeclared" flow to handle.

⚠️ **The binding is all any caller gets — a calling flow included.** A `flow.invoke` step receives
the outputs the sub-flow BINDS and nothing else: what the sub-flow's steps wrote to their own slots
never crosses the boundary. An output the sub-flow declares but does not bind returns nothing to the
flow that invoked it; the sub-flow's `OUTPUT_SLOT_UNBOUND` warning is where that shows.

Every output slot is an ordinary output: there is no kind of output that is emitted beside the
result. A flow that must persist terms does it with a `term.upsert` step, never through a slot.

Each entry is `{ fromSlot, path? }`. `path` omitted or `null` returns the step's whole value; to
return part of it, `path` is an object — `{ "segments": [{ "kind": "field", "name": "recordId" }] }`
— never a dotted string. The segments are the ones `inputPaths` uses: `field` (one property),
`first` (a list's first element), `last` (its last), `index` (the element at a position), `pluck`
(one property of every element) and `wrap` (a value as a one-element list). ⚠️ **A `field` segment
is checked against the step's declared output shape**, so it needs a step whose `outputSchema` is a
shape declaring that field. A step typed as the open builtin `object` refuses it as a type mismatch;
give the step a type.

- **On create** it is optional, and only its shape is checked: every key must name a declared
  output slot. There are no steps yet, so nothing else _can_ be checked.
- **Changing the binding alone** re-checks the keys against the persisted output slots, then
  validates the whole graph in one transaction.
- **Changing the signature** may send one side: `inputTypeNames` alone keeps the outputs as
  stored, and `outputTypeNames` alone keeps the inputs. If you send an explicit binding with it,
  that binding replaces the old one. If you send the signature _only_, the existing binding is
  silently pruned to the slots that survived — the one quiet path in the whole resource, and
  worth knowing before you use it.

**A signature change is refused with `FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS` while anything live
still holds a snapshot of the old one.** Two things do: a dynamic API endpoint, and a flow-backed
table. Each captured the shape when it bound and keeps validating against it, so changing the
flow underneath would not break them loudly; it would leave them serving a contract the flow no
longer satisfies. The refusal names them, not just their count, so you can see which routes you are
about to re-publish.

Send `adoptSnapshots: true` to re-snapshot them in the same transaction as the change. It is off by
default on purpose — adopting rewrites the published request/response contract of a live route, and
that is your decision to make explicitly — but taking it is one call, where unbinding and rebinding
by hand leaves the route bound to nothing in between.

Other things bind a flow without capturing its shape: a schedule, a trigger, a
vocabulary resolver. None of them blocks a signature change, because none froze a copy
to go stale. What a schedule needs is that its stored inputs still cover the flow's declared input
slots, and that is reported live on the schedule itself (`uncoveredInputSlots`) and re-checked when
it fires. A signature change does not refuse on a schedule or trigger it leaves uncovered or
mistyped, but the PATCH's `validateOnly` names each one in `leavesBehind`, and so does a document
plan.

Renaming, or rewriting only the binding, never touches a captured shape and is always allowed —
**including when you send the type arrays back unchanged**, which a client that PATCHes the whole
flow will do. The refusal is on the signature actually moving, not on the request mentioning it.

⚠️ This does not catch the _other_ way a binding goes stale. A snapshot resolves each type
reference to that shape's definition, so **editing a shape re-forms every binding that references
it without anyone touching a flow.**

## Preview — run it for real, in a sandbox

`POST /v1/flows/{id}/preview` runs the persisted steps against your values on the same machinery a
live call uses. Only enabled steps run. The body names WHERE the inputs come from, as a
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

The step log carries no slot values; a `step-failed` row does carry its `phase` and a `message` cut
to 500 characters — the step's own error text, which can quote what it was processing. A queued preview of a project's own flow also writes its **trace
live** — `GET /v1/runs/{runId}/trace` answers the flow's inputs, each step's output by slot
(`slotOutputs`, `stepOutputs`) and a failed step's words (`stepOutputs.steps[].kind: "failed"`,
`error`) while the run is still going; re-read it as the step stream moves, and treat it as final
once the run has ended. A platform flow or a preview run as another project writes none (404).

`apply: false` is what turns preview into a genuine dry run:

```json
{ "input": { "kind": "slots", "inputs": { "query": "…" } }, "apply": false }
```

The flow runs in FULL — every step, every model call, every precondition — and the writes it
would have made are recorded and then thrown away. Read them back at
`GET /v1/runs/{runId}/change-set`, which lists each write by kind and target. Nothing reaches
your records. A bus event the flow emits is not in that list: a preview withholds every bus
event, applied or not, so it is never staged.

⚠️ **It defaults to `true`.** Omitting it is not a dry run.

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
Neither of those owns your end users' records, so a `vector.search` over a user-scoped table comes
back **empty** — not an error, just nothing. Every step downstream then behaves as though the corpus
were empty, and the flow looks broken when it is fine. Judge such a flow on the steps _above_ the
search, or give the run a real end user to act as. Two settings do that:

<!-- field-ok: record-owner — a VALUE of the preview body's `principal` enum, not a field name -->

`principal: "record-owner"`
on the preview body itself, which runs as the record's own user and is how you preview a link flow
the way it will really run, and an eval suite's `runAsUserId`, which names an arbitrary user.
⚠️ `record-owner` is an impersonation capability — it needs EDITOR on the record's project as well as
on the flow, and refuses a record with no owner.

⚠️ **A record preview takes a record of a table BOUND to the flow — any such table, and only such.**
The record's inputs are built the way a real record run builds them: each declared input slot reads
the same-named field of the record's submission, with the record's id, creation time and submitted
files available by those slot names. A record of a table this flow does not process is refused with
422, and the refusal names the tables that are bound. `GET /v1/flows/{id}/recent-records` lists the
records the flow ran on lately — the ones most worth previewing.

⛔ **The same seam bites the OTHER way, and this one is why a broken schedule can preview green.**
Preview always resolves _somebody_ — you, by default. A **schedule resolves nobody** (and so does a
key's call and a trigger), and the engine then omits `userInfo` entirely rather than handing down
an empty one. What that does to a step depends on what else it reads:

- **A step whose inputs are all provider slots still runs.** It has nothing upstream to wait for.
  A project-wide read ignores the missing user; a read of a per-user table fails, because
  there is nobody whose records to read.
- **A step reading `userInfo` beside a real slot waits for that slot.** When the slot never
  arrives the step is skipped, the skip cascades, the terminal step never writes the slot your
  output binding names, and the run fails with `FLOW_OUTPUT_MISSING` — while preview, with a
  principal, sails through. Guard such a step with `slotPresent` on the real slot rather than
  adding inputs to it.

Preview a scheduled flow the way it will really run:

```json
{ "input": { "kind": "slots", "principal": "no-end-user", "inputs": {} } }
```

`principal` defaults to `"operator"`, which is the request-shaped run. Billing names you either way.

The response is built for diagnosis: `flowOutput` (the declared projection, nothing filled in),
`missingRequiredOutput` (non-null means a live call would be refused `FLOW_OUTPUT_MISSING` and
write nothing, so the preview discards its writes too, even with `apply`, and adds a run-level
`__runner__` error with phase `output-missing`), a per-step
`transcript` with
outcome, timing and error, plus errors, warnings, branches and token and latency totals.

**Read the status code carefully, because a failing flow is still a 200.** Request-shaped faults
are thrown: unknown or missing input slots are refused before running, a suspended payer is
refused before running, an unaddressable flow is a 404, and a run that exceeds the time limit
fails as a timeout. But a flow that _breaks_ comes back 200 with the wreckage in the body — a
runner crash appears as an error entry attributed to the runner, and individual step failures
ride in the transcript. Checking only the status code will tell you a broken flow is fine.

Use it to prove a binding: break the binding and preview reports `missingRequiredOutput`; bind it
and `flowOutput` fills in.

Preview proves one run. Which steps real runs have exercised since the flow last changed is
`GET /v1/flows/{id}/coverage`; it names the tables the covered flows touch by key, under
`tableKeys`.

## When a write is refused with a 409

Three different things return 409 from a step write, and they call for OPPOSITE remedies. Read
`details.conflict`, never the message:

| `details.conflict`          | what happened                                                 | what to do                                                                               |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `stale-version`             | someone changed the step since you read it                    | re-read and retry, or resubmit with `overwriteConcurrentEdit`                            |
| `concurrent-consumer-write` | a downstream step this edit re-typed was changed concurrently | re-read and retry                                                                        |
| `unique-collision`          | the key or the output slot is already taken in this flow      | change the value `details.field` names — **`overwriteConcurrentEdit` will not clear it** |

⛔ **`overwriteConcurrentEdit` skips the version pre-check and nothing else.** Forcing a `unique-collision` returns
the same 409 forever, because the database index is still there. That is why the kind is on the
envelope rather than left to be inferred: the two lock conflicts and the collision are all 409s, and
guessing between them by reading the message breaks the moment a step is legitimately named
`modified`.

On a `unique-collision` the envelope also carries `conflictingSkillId` / `conflictingSkillKey` — who
holds the value — and usually a `suggestion`, a free alternative this API's own write will accept. A
`raced: true` means the value was free again by the time the server looked: another session changed
the flow between your write and the explanation, so retry rather than renaming. `suggestion` is absent
when the handler derives its output slot from its config, because the slot field is not the editable
one there.

## Copying a flow — through the project document

```
GET   /v1/projects/{id}/document          the source project's configuration, flows included
POST  /v1/projects/{id}/document/plan     what applying it to the target would do
POST  /v1/projects/{id}/document          apply it to the target
```

A flow is copied the way any configuration is: read the source project's document, keep the flow
(and whatever it names that the target lacks), and apply that to the target. Everything inside a
document is addressed by **key** — a step by its key, a type by `{ "kind": "ref", "ref": "<name>" }`
— so nothing in it is a source-project id, and the steps, the signature and the output binding travel
together. A document step may leave out what `POST /v1/steps` lets it — `description`,
`condition`, `enabled` and `outputSchema` among them, a new step taking the create's defaults and
its handler's own output type, a held one keeping its own. See the `project-document` pack.

There is no per-flow export: the project document IS the portable form, and the one that writes
back — keyed, planned and versioned.

⚠️ **A type the target lacks is seeded if it is a library type; one the source project defined is not.**
That is the target project's own configuration, so the plan names it and the apply refuses rather
than binding a reference to nothing. State the type in the same document to copy it too.

⚠️ **An unrecognised `modelId` is refused at the write.** A graph copied from a deployment with a
model the target does not have fails there rather than silently falling back.

⚠️ **The run settings travel with the step** — `timeoutMs`, `tries`, `tryDelayMs`, `onFailure` and
`reuseResultsForMinutes`, in the document. Checkpoints and run
flow-snapshots record them only for anything captured since each was added, so there an absent value
means "this record does not say", NOT "the run had none". Do not read an older snapshot as evidence
about a deadline, and expect restoring an older checkpoint to clear one. The restore preview shows the
pair so the loss is visible before you commit to it; see the `flow-checkpoints` pack.

## How a step runs — on/off, time limit, tries, failure, reuse

These settings govern how a step runs rather than what it does. All are optional on a write, and a
step that sets none behaves as it always has.

- **`enabled`** — a switched-off step stays in the flow and never runs. Any step whose every input
  traces back to it skips too, because a step runs while any one input is present. ⚠️ The save does
  not check this: switching a producer off saves cleanly and its readers skip at run time. Ask
  first: `PATCH /v1/steps/{id}` with `{ "enabled": false, "version": …, "validateOnly": true }`
  writes nothing and answers `derived.switchOff.stops` — the steps that would stop with it, worked
  out through the run's own gates (condition, inputs, fan-out body), as `[{ id, key }]`, or `null`
  when it cannot be worked out.
- **`timeoutMs`** — at most 120,000 (two minutes); a larger value is refused at the save. What it
  bounds depends on the handler, and the handler catalog says which:
  `run.timeLimit` is `ai-call` (each AI call), `queue-wait` (the wait on the queued job, covering
  every try — the job may still finish), `in-flow` (how long the run waits for a step that runs in
  the flow itself, whose work may still finish) or `ignored` (control steps). Do not work out what an
  unset limit falls back to — it can be the step's task limit, the deployment's generation default
  or the handler's own wait, and which one depends on the handler. Read `effectiveTimeLimit` on
  `GET /v1/steps?flowId=` instead: the limit a run applies, the layer that decided it, and
  `whenUnset`, what clearing the step's own falls back to. Holding a flow's steps already — off
  the bootstrap, which carries every row — ask `GET /v1/flows/{id}?expand=timeLimits` for the
  same figure keyed by step id, without the rows. Neither is on the bootstrap: the deployment's limits move it without a design write.
  `run.budgetMs` is a limit the handler
  keeps whatever you set — 5 s for `value.transform` — so only a shorter limit changes anything
  there.
- **`tries`, `tryDelayMs`** — the number of tries including the first (1–5), and a fixed wait between
  them. They REPLACE the handler's own queue attempts rather than adding to them, and apply to steps
  that run as queued jobs — the handlers whose catalog `phase` is `ingest`: fetches, file
  readers, model calls (`text.generate`, `text.decide`, `text.embed`) and `term.upsert`. A step
  that runs in the flow itself is tried once. Only a failure a second try can
  fix is tried again — never a missing API key, a blocked web address, bad input or a used-up quota.
  ⚠️ A step that sets `tries` has every try's model or vendor call charged; on the handler's own
  tries — a step that sets only `tryDelayMs` included — those calls are charged once however many
  tries ran. Compute is charged for the time the job ran, summed over its tries, either way. If the
  same fetch is already running for another step, that run's settings apply.
- **`onFailure`** — `fail-run` (the default): the run fails and keeps nothing it wrote, while steps
  that do not depend on this one still run. `continue`: the run carries on without this step's
  output and reports the failure as a warning. Refused on a control step, on a step that may write
  or reach a sub-flow, and on a step writing a slot a required flow output is bound to.
- **`failureSlot`** — a slot the platform writes the step's failure to, as a `StepFailure`:
  a stable `code`, the platform's sentence for it, whether a second try could answer differently,
  the failure phase, and the HTTP status when a site or vendor answered with one.
  It is written when the step failed and the run carried on, or when its handler softened a
  failure into a warning; a step that succeeded, was skipped or ran and found nothing writes none,
  so "output absent, failure absent" still means it found nothing. A later step reads it as any
  optional slot. Refused at save on a step that can never write it — one that does not continue
  and whose handler softens no failure (`FAILURE_SLOT_NEVER_WRITTEN`) — when it names the step's
  own output (`FAILURE_SLOT_IS_OWN_OUTPUT`), and as the source of a required flow output
  (`FAILURE_SLOT_FEEDS_REQUIRED_OUTPUT`). `null` clears it. The codes a handler softens are on its
  catalog entry, `run.softFailureCodes`.
- **`reuseResultsForMinutes`** — how long a result the step saved stays reusable: null is the
  handler's own period, `0` always runs fresh and saves nothing. It is checked when a result is
  READ, so a result another step with identical settings saved counts only within this step's own
  period. ⚠️ A period only ever LENGTHENS what is kept: steps whose fetch is identical share one
  saved result, and it lives for the longest period any of them asked for, so a step with a short
  period cannot cut a step with a long one short.

## Asking about a step you have not saved

27 <!-- count: editor-inputs-from-config --> handlers do not take their inputs
from the step row: they name them INSIDE their own configuration. `value.transform` — the most-used handler there is — names them
inside a JSONata expression, so writing the expression IS writing the step's input list, and there
is nothing to pick from a list.

```
POST  /v1/steps        { …, "validateOnly": true }   a step you are adding
PATCH /v1/steps/{id}   { …, "validateOnly": true }   a step you are changing
```

Both dry runs answer `derived.draft`: what the platform makes of the step's CONFIGURATION — its
`diagnostics`, the `derivedInputStreams` it names and the `derivedInputSchemas` it would type them
as. Nothing is persisted and nothing is executed. On the PATCH it describes the stored step with your
patch applied, so send only what changes.

⚠️ **If the draft changes the wiring, send `inputStreams`, `inputPaths` and `inputProjectionNames`
together.** They are positionally aligned, exactly as on the step row. The save resolves a projection
alias back to the stream it came from before pinning the input list, and it needs those columns to
do it — without them a step whose config reads `userInfo__userId` gets back that alias where the
save would pin `userInfo`. Omitting them is correct and free for a step you are creating.

`derivedInputStreams` is the slot list this configuration NAMES, sorted — the **same list the save
pins onto the step**, because the dry run runs the platform's own derivation rather than a second one.
Send `order.total + shipping` and it answers `["order", "shipping"]`.

⭐ **A prompt-shaped step names its inputs in its placeholders, so send the template too.** For a
handler whose inputs come from its template — `derivedFrom: "template"` — send `promptTemplate`, and
`systemPrompt` when the handler reads one. The answer is the slot list those placeholders name, on
the same terms as the config case: the save's own derivation. A placeholder written in the
system prompt wires a slot exactly as one in the prompt does, but only where the handler declares it
reads a system prompt at all — `text.generate` does, `text.interpolate` does not.

⛔ **On the create, send `inputSchemas` with a wired FILE, or it is dropped from the answer.** A
multimodal handler attaches a file input that no placeholder mentions, and the save counts that slot;
without the refs the derivation cannot recognise one and answers a list without it. The PATCH reads
the stored shapes when you send none.

`derivedInputSchemas` sits beside it, one entry per slot, and is the shape the save types a wire on
that slot from — the step that writes it, else the flow input, else the platform's own type. When
the derived list differs from the step's wiring, send it as `inputSchemas` for every position you do
not already hold a stored shape for. An entry is `null` when nothing declares that slot's shape:
there is no neutral shape to send, so do not save that list until the slot is typed.

⭐⭐ **Send the run settings and it answers the save's own rules about how the step runs.** The five
that exist are in the section above: tries on a step that runs in the flow rather than on a queue, a
wait beside `tries: 1`, a time limit a control step never reads, a time limit above the handler's
own `run.budgetMs`, and a reuse period on a step that saves nothing. Each comes back as a `RUN_*`
code with the field it is about.

```json
{ "timeoutMs": 6000, "tries": 1, "tryDelayMs": 5000, "validateOnly": true }
```

⚠️ **A run setting you do not send is judged as it is stored** on the PATCH, and not at all on the
create, and a `null` is a real value: it means the setting was cleared, which is never a violation.

⚠️ **A value outside a field's bounds is a 422 against the body**, not a `RUN_*` finding — the
dry run parses the write's own body, so it cannot accept a number the save refuses. The bound is the
shape of the field; the five `RUN_*` rules are about a well-formed number being wrong for THIS
handler.

⭐ **A finding in `derived.draft` names the setting under `run`**, e.g. `fields: ["run.tryDelayMs"]`.
The verdict's own `diagnostics` carry the save's findings on the body's field names, and they include
the one rule `derived.draft` cannot ask: an `onFailure: continue` on a step writing a slot the flow
must RETURN is a fact about the flow's declaration, and `derived.draft` judges the configuration
alone.

⭐ **Send `outputSchema` too and `derived.draft` will also tell you when the result cannot fit it.**
Optional, and the only thing omitting it costs is that one check — every other diagnostic is
unaffected. Pass the `SchemaRef` the DRAFT declares, not the one on the saved row: when you are
re-pointing a step at a different type, ask about the type you chose.

What comes back is a WARNING, `JSONATA_OUTPUT_SHAPE_MISMATCH`, and it is deliberately partial.
JSONata is dynamically typed, so nothing can decide most expressions without running them — and a
dry run runs nothing. It speaks only where the SOURCE settles the question: a literal object, array or
scalar at the top level (or at the end of a `( … ; … )` block) whose kind, or whose complete set of
literal keys, no value of the declared type could have. `$map(…)`, a path, a function call and a
conditional all answer with silence.

⛔ **So its silence is not a verdict.** A clean answer means "nothing provable is wrong here", never
"this will fit". The authority is the run: `value.transform` compiles the same `SchemaRef` and parses
its real result, and a mismatch FAILS the run. This is that question asked early, cheaply, and
without certainty — which is why it warns rather than blocks, and why you should not gate a save on
it.

⚠️ **One computed key silences the key check.** `{ ($prefix & "id"): … }` is legal, and its key is
not knowable without evaluating — so the check can still tell you the result is an object, and
cannot tell you which keys it will have. A declared LIST is not checked at all: JSONata's sequence
semantics make a singleton and a one-element array hard to tell apart, and a guess there would be a
warning on correct work.

⛔ **An empty `derived.draft.diagnostics` list means the configuration is well-formed. It does NOT
mean the step will save.** Dangling slots, cycles and output collisions are questions about the
GRAPH, and `derived.draft` never looks at one. The verdict beside it does — its `ok` and
`diagnostics` are the save's whole rule set — and `GET /v1/flows/{id}/health` owns the flow's.

⚠️ **`derivedInputStreams: null` is not an empty list, and there are two reasons for it.** Read
`derivedFrom` to tell them apart: `row` means the handler takes inputs from the step row so there was
nothing to derive; and a null with `derivedFrom: "handler-config"` or `"template"` means a check
failed, so any list would have been read off a configuration that does not parse. An empty ARRAY
means the config or the template was read and names no slots.

⛔ **So `derivedFrom: "handler-config"` is not a promise that the list is there.** Check `diagnostics`
first, or check the list for null — the half-typed expression this check exists to answer for is
exactly the case that returns both.

Diagnostic codes are the platform's own save-time codes, so one you recognise here is the same one
you would meet in a 422 from the save. Treat the vocabulary as open and show a code you do not know:
it grows with the handler catalog. Every diagnostic carries `severity` — ⚠️ do not assume everything
in the list blocks the save — and `details`, the structured facts behind the sentence, so you never
have to parse the message. `details` is an OPEN map whose keys depend on the code: a
too-complex expression carries `nodeCount` and `maxNodeCount`, a too-deep one `depth` and `maxDepth`,
a forbidden built-in `functionName`. A JSONata failure additionally carries `position` and `token`,
which locate the offending character in the expression.

<!-- field-ok: nodeCount — a key INSIDE the open `details` map, not a declared wire field; the map is
     `z.record(z.unknown())` on purpose because its vocabulary grows with the checks -->
<!-- field-ok: maxNodeCount — same open `details` map -->
<!-- field-ok: maxDepth — same open `details` map -->
<!-- field-ok: functionName — same open `details` map -->

## Asking a step's settings first — `validateOnly` on the patch

`PATCH /v1/steps/{id}` takes **`validateOnly: true`**. It runs every rule the
save runs — the normalization, the consumer re-typing cascade, the slot-rename
plan and the whole flow-graph gate — writes nothing, and answers 200 with a
verdict. A finding carries the severity the save would give it, the rehearsed write's
leftovers come back in `leavesBehind`, and `ok` is `false` when the change would leave an error
behind in the flow, the same verdict a document plan of the change gives.

⭐⭐ **It is how you ask the run-settings rules without saving.** Every refusal
in the section above is a save-time rule: tries on a step that runs in the flow,
a wait between tries beside `tries: 1`, a time limit on a control step or one
above the handler's own `run.budgetMs`, a reuse period on a step that saves
nothing. Each comes back with its own `code` and the `field` it is about.

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

⭐ **A patch that changes `outputSlot` also answers `derived.rename`** — whether
the new name is legal and free, and which steps and sites read the old one —
before you decide to confirm the rename. See "Renaming a slot" below.

⚠️ **Warnings ride `diagnostics` and leave `ok` true.** A save returns the same
set beside the saved row precisely because they block nothing. Gate on
`severity`, never on the list being empty.

⛔ **A stale `version` still answers 409, not a verdict.** The draft
would be judged against a row that has moved, so every finding below it would
describe a state you cannot see. Re-read, then ask again.

⛔ **One status, two bodies.** A patch has no second success code to spend, so
the `200` is either the write result or a verdict. Narrow on `ok`, which only
the verdict declares.

## Asking before you add a step — `validateOnly` on the create

`POST /v1/steps` takes **`validateOnly: true`** as well. It runs every rule
the create runs — the normalization, the flow-graph gate, whether the name or
the output slot is already held in the flow, whether a pinned model is in the
catalog — writes nothing, and answers **200** with a verdict. The create itself
answers **201**, so the status alone tells the two apart.

⚠️ **`derived.draft` beside the verdict is a narrower question.** It judges the
configuration — what it reads, whether it parses — and a clean one does not mean
the step will save. A key another step holds, an input count the handler
refuses, an empty prompt a prompt-driven handler needs: those are the verdict's
`ok` and `diagnostics`, not `derived.draft`'s.

⭐ **A taken key is a verdict on `key` (or `outputSlot`)**, carrying the free
value the create's 409 would have suggested — not a 409.

⚠️ **`taskKey` is optional on this body alone.** Omit it and the step starts on
`extraction`; change it with a PATCH. It decides the model only for a handler
whose model follows its task — but every step bills under its task, and a
handler whose catalog entry says `run.timeLimitFromTask` takes its task's time
limit when the step sets no `timeoutMs`.

### Seeing what a prompt becomes — and what it costs to ask

`derived.draft` answers what a configuration READS. A prompt-shaped step has a second question
that nothing above answers: with the slots filled in, what text does the model actually receive?

```
POST /v1/steps/preview           ask the model, and bill for it
POST /v1/steps/interpolate       render the prompt, and stop
```

Both take `flowId` — the authorization anchor — plus `handlerKey`, `promptTemplate`, your
`slotValues`, and optionally `systemPrompt`. `/preview` additionally takes `taskKey` and
`modelIdOverride`, because only it picks a model. Nothing is persisted either way: no row is
written and no slot is touched.

⚠️ **`/preview` makes one real model call on `text.generate` and bills the project.** It is the
only `/v1/steps` route that spends money, and it is floored at ADMIN for that reason. Every other
step type returns its interpolated text without calling anything, because what those handlers DO
depends on slot I/O the caller has not supplied.

⭐ **`/interpolate` cannot bill, and is floored at EDITOR** — the bar for SAVING the step it stands
in for. It calls no model, resolves no project
and names no payer. Its reply is the interpolated prompt and the elapsed time; there is no
`response` and there are no token counts, because there is no call to report.

⛔ **It is a route of its own, not a flag on `/preview`, and the reason is the role floor.** A
route either spends or it does not, and each one says which in its own name: `/preview` spends and
sits at ADMIN, `/interpolate` never does.

⛔ **Both still take `handlerKey`, and you should not lie about it.** That field decides TWO things,
not one: whether a model is called AND whether `{{#slot}}` sections ITERATE. Claiming to be
`text.interpolate` to get a cheap render returns arrays rendered keep/drop where the real run
loops. `/interpolate` takes the step's real `handlerKey` for the iteration half alone, so the text
is what the model would have received.

⭐ **A platform flow's step can use `/interpolate` and cannot use `/preview` without a project.**
A platform flow belongs to no project, so there is nobody to bill and no binding to resolve;
`/preview` therefore requires `project` (the project's node id) there and refuses without it, while `/interpolate` asks
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
against the `project` you name — the same one it bills and picks a model from.

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

## Which slots a step may read

Ask the flow which slots a step may name — in its `inputStreams`, its settings or its prompt:

`picker` says where the step's inputs are chosen: `row` (on the step), `config` (its settings name them) or `prompt` (its placeholders name its text inputs). `attaches` says what a step takes beside those: `files` on a prompt step that builds file inputs into what the model is sent, and `positional` on a `config` step that still reads its first inputs by position — `url.fetch` reads the address as input 0 — with `count` saying how many. Send those first in `inputStreams`, then the slots the settings name. Whether a slot holds a file is decided by the platform against the project's builtin `file` type, not by resemblance: take the verdict from this read.

```
GET /v1/flows/{id}/scope?stepId={stepId}    every slot a saved step may read, typed
GET /v1/flows/{id}/scope                  the same, for a step you are about to add
```

It lists the flow's inputs, the platform's own slots, and every slot written by a step that does not
wait on this one — by an input **or by its condition**, which is the save's cycle rule. Each slot
carries the shape the save types a wire on it from.
Without `stepId`, nothing can wait on the step yet, so every slot the flow's steps write is listed.
⚠️ Except one kind of step: a saved step that already reads the slot your new step will write starts
waiting on it once the new step is saved. The stepless form does not know that slot, so such a step's
outputs stay listed — naming one closes a cycle, which the create reports as a warning, not a refusal.

### When the step's settings or prompt name its inputs

For a handler whose settings or prompt name its inputs, the inputs are not chosen on the step
row: they are whatever the settings or the prompt name. Leave `inputStreams` out (or send `[]`) and every step write — single, batch,
document — stores exactly those root slots, each typed from what feeds it; a PATCH that changes the
settings or prompt without `inputStreams` re-derives them. A list you send must name exactly those
roots — no more, no fewer, in any order (a prompt step's attached files aside) — or it is refused
with `FREE_FORM_INPUT_STREAMS_MISMATCH`, whose message names the missing and the extra.
`inputSchemas` is optional on every write: an input you give no type is typed from what feeds it,
and a type you give is kept for that input wherever the platform places it.

<!-- field-ok: projectInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

- **Provider slots are roots like any other.** `record.list` and `record.read` default `userIdSlot`
  to `userInfo.userId`, so `userInfo` is an input even on a project-wide table; a prompt reading
  `{{projectInfo.config.<namespace>.<field>}}` needs `projectInfo`. Their shapes are the
  platform's types `UserInfo`, `ProjectInfo`, `RunInfo` and `TableInfo` — by key in a
  document, by id on the row API (`GET /v1/types?project={nodeId}&key=UserInfo`), and
  typed in `/scope` above.
- **A run with no signed-in user has no `userInfo` at all** — a key's call, a schedule, a trigger.
  A step whose inputs are all provider slots still runs: a project-wide read ignores the missing
  user, a per-user one refuses. A step reading `userInfo` beside a real slot waits for that slot
  only when there is no signed-in user: a present provider counts like any other input, and
  `projectInfo` and `runInfo` are always present, so a step reading one beside a real slot runs at
  once. Guard such a step with `slotPresent` on the real slot.
- **In JSONata, a bare name at the start of any path is a slot** — inside a projection too, so
  `docs.{"id": id}` reads a slot called `id`. Reach into items through a bound variable:
  `$map(docs, function($d){ {"id": $d.id} })`. The same rule makes `undefined` a slot, since
  JSONata has no such literal: to emit nothing, write a conditional with no else
  (`$count(text) > 0 ? {"text": text}`). The step then stores no slot: a `slotPresent` guard reads
  it as absent and another expression sees the name unbound. `$now`, `$millis`, `$random`, `$shuffle` and `$eval` are refused with
  `JSONATA_FORBIDDEN_FUNCTION`.

### What a step's output type follows

Leave `outputSchema` out of a create and the step takes the type its handler emits. A stored type
then follows the handler on every write that sends no `outputSchema` for the step —
`PATCH /v1/steps/{id}`, a `POST /v1/steps/batch` update, and a project document entry for a step the
flow already holds:

- **A `handlerKey` change stores the new handler's type** — also when the patch names the handler
  alone. So does a settings change on a handler whose type depends on a setting. A change that
  leaves the handler's type where it was leaves the stored one alone, a type you refined included.
- **A swap to a handler with no type of its own clears it.** `text.generate` and `text.decide` emit
  what you tell them to, so the step is left as a create leaves it: `outputSchema: null`, no
  constraint until you state one. The old handler's type is not kept as the shape to fill, and
  neither is a type refined on the old step. Between two such handlers the type you stated stays.
- **An `outputSchema` you send wins**, on any of these.

⭐ **The readers move with it.** Every step reading a slot whose type moved has its `inputSchemas`
re-derived through its own path, and its `version` goes up by one — on a single PATCH, on a batch
whether or not it names the reader, and in a document for a reader whose entry states no
`inputSchemas`. Read a reader's `version` again before you write it.
A reader whose own batch item sends `inputSchemas` is judged on what it sent. On a PATCH or a batch,
a read the new type cannot satisfy refuses the whole save with a 422 that names the reader; in a
document that reader is not retyped — it keeps the type it had, and the apply's own validation
judges the read.

⚠️ **A cleared type gives its readers nothing to be typed from.** On a PATCH or a batch they keep
the type they had; in a document a reader whose entry states no `inputSchemas` is typed again as the
builtin `object`, as any reader of a step with no declared type is. Either way the save goes through
carrying `PRODUCER_OUTPUT_UNTYPED` as a warning — nothing checks what the reader takes from the
value. State the step's type, or re-point the reader.

A type travels back the way a read showed it: send `outputSchema` and `inputSchemas` with the ids
the step read answered. They are stored as the project's own.

## Which condition operator fits which value

```
GET /v1/steps/condition-operators    per operator: fits / inert / mismatch, whole slot and field
```

A condition leaf reads one value. For each operator the table gives a verdict on text, a number,
true/false, a list and an object — separately for a whole slot and for a field inside one. `inert`
is a test no value of that kind can change, and validation warns `CONDITION_LEAF_INERT`. Mostly it
gives the same answer on every run (a number held as a whole slot is never read, so `slotEquals` on
one never matches). `listEmpty` on a number, true/false or an object is the exception: missing is
empty and anything present is not, so it asks only whether a value is there — write `slotPresent`,
negated, to say so. `mismatch` compares the wrong type (`slotGt` on text):
`CONDITION_VALUE_TYPE_MISMATCH`, an error on the flow, not the step — the step still saves with the
finding beside it, and the flow's health reports it as an error. It is the table both
validation and the run decide by, so offer only what `fits`.

A field that `$ref`s the `probability` builtin has its own column. It reads as a number to every
operator except `slotIsTruthy` / `slotIsFalsy`, which are a `mismatch` on a field: a chance of 0.03
would read as true, so the save refuses that leaf outright (`CONDITION_PROBABILITY_TRUTHINESS`).
Compare with a threshold instead, such as `slotGte` with `0.5`.

## Renaming a slot — look before you commit

Slots connect steps by NAME, and the name appears in five places: a step's
`outputSlot`, its `inputStreams`, its condition, its prompt template, and slot-carrying fields
inside its `handlerConfig`. Renaming one therefore has a blast radius, and nothing links the edits
for you.

```
PATCH /v1/steps/{id}   { "version": …, "outputSlot": "<new>", "validateOnly": true }   what it would touch
PATCH /v1/steps/{id}   { …, "confirmedOutputSlotRenames": [ … ] }                      commit it
```

The dry run answers `derived.rename` whenever the patch changes `outputSlot` from one non-empty name
to another. It reports `skillsAffected`, `sitesAffected`, and a per-step `reports` array naming every
site. It uses the **same scanner** the write's rewrite plan uses, so a site it names is a site the
rewrite touches.

⛔ **An illegal rename comes back as a 200 with `refusals`, not an error.** You asked what would
happen; "it would be refused, because another step already writes that name" is the answer. Read
`legal`. The refusals are the new name colliding with another step's output, either name being a
flow input, provider or engine slot, and **no step in the flow producing the old name at all**. A
name outside the slot grammar never gets that far: the body refuses it with a 422 naming
`outputSlot`, as the save would.

⚠️ **`reports` is filled in even when the rename is refused** — what the OLD name is wired to stays
useful when the NEW name is unavailable. Rendering it only on `legal: true` throws away the half you
asked for.

⚠️ **`skillsAffected` is not necessarily the `rewrite.rewrittenCount` the write returns.** The write
also re-derives consumers' declared input types, a separate cascade the preview does not model, so
its figure can be larger.

⛔ **Renaming without confirming does not fail loudly.** The rename lands and every reader keeps
naming a slot nothing produces. `INPUT_STREAM_DANGLING_SLOT` reports that, but it is an edge-target
diagnostic — it rides in `outstandingIssues` on a 200, and the flow runs with the dangling read. Preview,
confirm, and read what came back.

## What travels between steps

A **slot bag** maps slot names to values, and the value union is closed and untagged: string,
boolean, number, list of strings, list of numbers, list of booleans, a file reference, a list of
file references, an object, or a list of objects. A file reference is exactly a key, a name and a MIME type. A list of numbers
is the dense-vector shape. The declared _schema_ of a slot lives on the step, not inside the
value.

- **Single versus multiple is the union, not a flag.** List variants are the multiple ones, and
  fanning out requires a list-shaped slot.
- **One writer per slot**, enforced by the database. Two steps cannot write the same slot.
- **A step can write more slots than `outputSlot` names.** A dispatch writes one per branch, an
  invoke one per mapped return, a merge one per lane, a loop opener every carry slot its
  `seedFrom` / `seedLiteral` seeds, a loop-end its escaped slots, and any handler its declared
  secondary outputs. Every step read carries `producedSlots.slots` — the full list, as the
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
only after a save has begun. A refusal that is a `409` on the save
(`FLOW_SIGNATURE_LOCKED_BY_DEPENDENTS`) is a verdict here — `ok: false` with that
code; a flow that does not exist, or a role below the floor, is still a thrown status.

⭐⭐ **A PATCH's `validateOnly` rehearses the save.** It makes the write and rolls it
back, then judges what it leaves: `leavesBehind` lists health's findings on this
flow and on every flow invoking it, and on the schedules, triggers and endpoints
that start them — each with `introduced` (`false` means it was already there).
`consequences` says what the change does to stored data. Neither decides `ok`,
which stays whether the PATCH itself would save; a create does not rehearse and
carries neither. A platform flow's PATCH is rehearsed too, with both empty:
they judge one project's flows, and a platform flow belongs to none.

⛔ **A PATCH answers one status with two bodies**: the saved flow, or a verdict
about one that was not saved. Narrow on `ok`, which only the verdict declares,
or on `id`, which only the flow does. A create spends `201` on the resource and
leaves `200` to the verdict alone.

⚠️ **`ok: true` is a snapshot on a create.** The key is unique per project — and
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
- **`skillId` says which row a refusal is about**, and on a batch write or a document apply the blocking
  diagnostics can belong to several different steps. Do not assume a refusal is about the one
  you think you were editing.

`code` is deliberately an open string: a newer platform can refuse with a rule your client was
never built against. Treat an unrecognised code as a generic refusal and fall back to showing
`message` — do not fail the response over it.

- **A step's `key` must be a step name** on every write that states one — a single create, a batch, a
  project document's step alike — lower-case kebab, `analyze-text` is a complete key. A dot
  may group segments (`custom.my-skill`), but grouping is yours to choose: nothing dispatches on
  the segment before the dot, and no group has to exist before a key does. What is refused is
  anything outside the grammar: uppercase, underscores, spaces, a leading digit, an empty
  segment. Slots use a different, plainer identifier grammar. The rule is a write rule: a
  captured step (a checkpoint, a run's flow snapshot) is returned with its key as stored.
- **Declared input schemas, when you send them, must line up one-for-one with the input streams
  you send beside them**, and any paths or projection names alongside them too. This is refused
  before any database work happens. Leave them out and the platform types the inputs.
- **`FREE_FORM_INPUT_STREAMS_MISMATCH`** — input streams you declare must exactly equal the set
  of slots the handler's free-form config actually references, whether through dotted paths,
  expressions, or template placeholders. The refusal names the streams you are missing, so this
  is a loop worth leaning on rather than avoiding. ⛔ **A prompt edit is a wiring edit.** The set
  is what the template names PLUS every file-shaped wire the step attaches plus any slot named by
  a non-prompt config field the handler declares (`text.generate`'s `modelSlot` is one). A PATCH
  sending `promptTemplate` alone — or `handlerConfig` alone — re-derives the set for you (keeping
  the step's wired files); a PATCH that also sends `inputStreams` is judged on the list it sends.
- **`CONFIG_SLOT_PATH_CROSSES_LIST`** — a config slot path takes a bare FIELD step off a LIST,
  which reads nothing: a list has no fields, so the value resolves to `undefined` on every run and
  the step behaves as though nothing were wired. `hits.chunks.text` is refused where
  `hits` holds a list. ⭐ **Say which item instead** — a config path carries the same steps
  a wire does: `hits[0].id` for one item, `hits[first]` / `hits[last]`, and `hits[].id` for that
  field taken from every item. Naming the list itself passes the whole list. ⚠️ **A WIRE's printed
  path is not always a config path.** An input projection is sometimes printed with the suffix `.first`,
  `.last` or `.asList`; typed into a config slot those read as FIELDS of those names, so spell an
  item with brackets. `.asList` has no config spelling at all — lifting a value into a one-element
  list is a wire projection — and a path carrying it resolves to nothing without being refused.
- **A step condition may nest at most 16 levels** — each `not`, all-of and any-of is one level,
  and a lone leaf is none. A deeper one is `INVALID_CONDITION`, whose message says how deep it is
  and what the bound is; flatten it (an all-of inside an all-of is one all-of). The same bound
  holds wherever a condition is stored, under that write's own code: a trigger's `filter` is a
  422 `VALIDATION_FAILED` on `filter`, and a loop-end's `until` is `INVALID_HANDLER_CONFIG` at
  `until`. A condition already stored deeper still runs, and flow health does not report it —
  only a write is refused. ⚠️ **A write that judges the whole flow meets it too:** a
  checkpoint restore and a project-document apply that changes the flow validate every step, so
  a step stored that deep must be flattened before any of them lands.
- **Editing a step requires the version you last read.** A stale one is refused unless you
  explicitly force the save. Re-read and reconcile; do not blind-retry. Batch updates lock each
  item the same way.
- **A flow cannot be deleted while another flow invokes it, or while anything live points at it**
  — one 409 `FLOW_HAS_DEPENDENTS` naming every kind that holds it, the calling flows included
  (⚠️ a **wider** set than the signature guard's, not the same one: to the endpoint and
  table bindings that freeze a shape it adds schedules, triggers, vocabulary resolvers and — for a
  platform flow — the platform jobs it does. Those bind a flow by
  id, or a job by the flow fitting it, and capture nothing, so they cannot go stale on a signature
  edit — but they very much break on a delete). Only a platform job's stored default is a
  database-level foreign key; every other holder is a loose id, so this check is the only thing
  standing between the delete and a dangling reference. Ask before you press:
  `DELETE /v1/flows/{id}?validateOnly=true` deletes nothing and answers the delete's own verdict —
  `ok: false` with that 409 as its diagnostic, in the delete's words — and `derived.dependents`, the
  counts it decided on (`kinds[{kind, count, label, refuses}]`, `total`; `kind` is kebab-case:
  `api-endpoints`, `schedules`, `triggers`, `tables`, `vocabulary-resolvers`, `platform-jobs`,
  `invoking-flows`). Delete where `ok` is true; do not decide from `total`.
- **A flow's contract suite goes with it.** The delete also deletes the eval suite keyed
  `<flowKey>-contract` over that flow, with its cases and runs, and answers
  `deletedContractSuiteCount`. For a platform flow, this includes the contract suites over it in
  every project. The dry run lists them as `contract-suites` with `refuses: false`, outside
  `total`. Other suites over the flow stay, and their runs fail until they name another flow.
  Re-point a suite whose cases you want to keep before deleting the flow. A document that deletes
  the flow reports the suite as `DOCUMENT_DELETE_CASCADED`.
- **A step cannot be deleted while another step in its flow reads a slot it writes** — as an
  input or in its condition — a 409 `SKILL_HAS_DEPENDENTS` naming the slot and the readers. Every
  entry of `GET /v1/steps?flowId=`, and every step on the bootstrap, carries that refusal as
  `deleteRefusal` (or null), from the function the delete throws from.
- **A flow whose project is off the design surface is a 404**, indistinguishable from one that
  never existed.

⚠️ The flag is the delete's only query parameter, the same one every design delete takes except a
vocabulary's (which also carries `confirm` and `assignedTerms`); anything else in the query is
refused.

## What will bite you

- **A checkpoint restore writes its steps as captured**, remapping only type references; it
  validates the resulting _graph_, not each entry, so an entry that survives a restore may be one
  a single create would have rejected. A document's steps are completed the way a single save
  completes them.
- **The silent prune.** Sending a signature change with no binding quietly drops bindings for
  slots that no longer exist. Every _explicit_ binding with an unknown key is refused loudly. If
  you want to know what happened to a binding, send it explicitly.
- **Naming a model is pinning one.** What a step declares is its _task kind_ — extraction,
  reasoning, summarisation, embedding, tiebreak — and that is what selects the model, through a
  binding set once for the whole project. The model itself is optional on every
  write, and leaving it out is how a step keeps following that binding. Name one and you have
  pinned that step: the project's next model change moves every other step and silently steps
  around yours. Pin deliberately, for a step that genuinely needs a particular model, not as a
  field you felt obliged to fill in. An unrecognised model is refused at the write either way.

  **`GET /v1/nodes/{nodeId}/task-models`, at the project's id, is how you see the binding you
  would be stepping around.** It reports, per task kind, the model that resolves for this project
  and — the field worth reading — `source`: which layer decided. `boundHere` says whether the
  project itself chose it or inherits it. `callable` says whether a call on it would be served
  here; `inherited`, on a task the project bound, is what that binding overrides.

  | `source`       | what it means                                                                                                                                   |
  | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
  | `node`         | a binding on the ownership tree — this project or an ancestor; `decidedAt` names the node, and its `kind` tells a project's from the platform's |
  | `environment`  | a deployment environment variable                                                                                                               |
  | `code-default` | nobody has bound this task anywhere — the platform's built-in                                                                                   |

  A bare model id cannot tell `node` from `code-default`, and those are opposite situations:
  one is a decision, the other is its absence. It is the same walk the runtime performs, so what it
  reports is what a step will actually run on.

  ⚠️ A step's `taskKey` may name only a task carrying `assignableToStep`. The taxonomy is wider
  than what a step may name, and a step naming an unassignable task is refused at the write:
  `transcription` and `rerank` are resolved by their handlers directly, and `substrate-embedding`
  is the platform's. Read the field rather than trusting that list.

- **A provider out of quota is a binding problem, not a flow problem.** The step fails with
  `… provider account exhausted (quota/billing)` in preview's `errors[]` and the run's step log.
  Move the task: bind it to an enabled model from another creator at the project node,
  `PUT /v1/nodes/{nodeId}/task-models/{task} { modelId }` (ADMIN), and every step following that
  task moves with it. A routing policy's `failover: "on-exhaustion"` retries the same model through
  the next account listed in `providerOrder`, and only those — it never picks a different model and
  never tries an account you did not list. Naming an account that does not offer the model is
  refused (`PROVIDER_HAS_NO_OFFER`); a one-account order is accepted and has nothing to fail over to.

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

  ⚠️ **Ask the model that will RESOLVE, not the one the step names.** A step with no `modelId`
  follows its task binding, so the capability that matters belongs to whatever
  `GET /v1/nodes/{nodeId}/task-models` reports at the project for its task kind — and it changes
  under the step when the task is rebound.

## What a diagnostic carries, and which slots fit an input

Each diagnostic `GET /v1/flows/{id}/health` answers carries its words in two halves and two forms:

| field            | what it says                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `message`        | what is wrong, in one line                                                                              |
| `remedy`         | what to do about it — `null` is a real answer, for a finding with nothing a person can act on from here |
| `segments`       | the sentence in pieces, each naming what it is about                                                    |
| `remedySegments` | the remedy in pieces; empty exactly when there is no remedy                                             |

A segment is `{ kind: "text" }`, `{ kind: "code" }` — a slot, a path, an expression — or
`{ kind: "ref" }`, whose `ref` carries `of`, naming the object (`step`, `flow`, `table`,
`vocabulary`, `handler`, `event`). Every segment also carries its own `text`. Read `segments` when
you want the objects and `message` when you want a sentence; do not parse either. A health summary's
`firstErrorCode` and `firstErrorMessage` come off one diagnostic, so they are `null` together.

**A `derived.draft` diagnostic names `fields`, a list.** One entry is the field at fault. Several
mean the rule is about the relationship between them: `dataEqualsPath` and `dataEqualsSlot` on
`record.list` must be set together or not at all, and a `flow.dispatch` step needs its `rules`
list, or else a `default` branch. An empty list is a problem with the configuration as a whole.

**`derivedFrom` says where the dry run read the step's inputs from, not whether the step's inputs
are chosen on its row.** `editor.inputStreams` on the handler's catalog entry says that: `flow.merge`
takes no inputs on the row while deriving nothing here, and `record.count` takes them on the row
while naming slots in its config.

### Which slots fit a step's inputs

Whether a slot fits an input is decided against the project's type registry. To ask before wiring
a step whose inputs are chosen on its row:

```
GET /v1/steps/input-options    every slot this step could read, each checked
```

Send `flowId` and `handlerKey`, and `stepId` when the step is saved. Nothing is persisted.

- **`picker`** is `row` (the step's own inputs are chosen on the row), `config` (its settings name
  them) or `prompt` (the prompt's placeholders name its text inputs).
- **`attaches`** says what the step takes beside the inputs its prompt or settings name, or null
  for nothing. It is `files` on a prompt step whose handler sends files to the model (a prompt
  handler that refuses files is null; the handler says the same as `attachesFiles` on its
  `GET /v1/handlers` entry), and `positional` on a `config` step that reads its first `count`
  inputs by position — `url.fetch` reads the address as input 0. Those slots lead `inputStreams`,
  ahead of the ones the settings name.
- **`count`** is how many inputs the step takes, or null for any number; for `positional`, how
  many are chosen for the step itself.
- **`bounds`** says what each input must hold: with a `count`, one entry per position; without
  one, a single entry every position shares. Its `rule` is `contract` (the handler declares the
  shape, in `wants`), `list` (a fan-out's one input), `file` (something the step attaches), `none`
  or `unresolved`. `bounds` and `candidates` are filled for `row` and for any step whose `attaches`
  is set, and empty for a `config` step with `attaches` null.

Each candidate carries `verdicts`, aligned with `bounds`:

- `fits` — the slot fits as it is. It may carry `parts`: places inside it that also fit, so a
  list of files can still be wired as exactly one of them.
- `adapter` — it fits with one step: `first` takes a list's first item, `wrap` turns one value into
  a one-item list.
- `reach-in` — something inside the value fits, though the slot does not; `paths` lists every such
  part, at most three levels deep, shallower first. A part is a field, or — where the value is a
  list — its first item, its last, or one field taken from every item.
- `no` — nothing in it fits, with the save's `code` and `message`.
- `unchecked` — nothing was checked.

What the answer means for the write:

- **Store what it hands you, verbatim.** `schema` goes into `inputSchemas` at that position,
  `path` into `inputPaths`, and `label` into `inputProjectionNames`. A label you compose yourself
  exposes the input under a name nothing reads.
- **Fitting is by type identity, not by resemblance.** A named type fits only an input that wants
  that same type, so an object never fits a text input directly — the case `reach-in` covers.
- **Whether a slot holds a file is nominal.** An object of your own carrying a key, a name and a
  MIME type is not a file, and neither is a type whose definition points at the builtin `file`;
  the save refuses a wire chosen by comparing shapes.
- **A fan-out needs a list that is always there.** A slot declared as a list that may be missing
  comes back `no`.
- **`unresolved` is a platform defect, not freedom.** The handler declares a shape that could not
  be read: a slot with a shape comes back `unchecked`, one with none is still `no`, and a save of
  the step is refused with `INPUT_CONTRACT_RESOLVER_FAILED`.
- **Nothing is filtered out.** A slot that does not fit or cannot be reached is listed with its
  reason. `unreachable` carries the platform's code and sentence when wiring the slot would make
  steps wait for each other in a circle, or would mix a fan-out's or loop's values with values
  from outside it. It is judged as if the slot were the step's only input, and it is not a
  refusal: the save keeps such wiring, reports it as an outstanding issue, and health reports an
  error until it is resolved.
- **`scopedTo`** names the step whose repetition a slot exists inside, with its `kind` (`fan-out`
  or `loop`); `stepScopedTo` says the same of the step as it is saved.

## Related

- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — exposing a flow over HTTP.
- Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`) — snapshot before a risky edit.
- Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`) — make "it works" a stored, replayable claim with a contract suite.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — read before assuming a step exists.
- Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`) — producers before consumers, and how two flows that
  invoke each other are created.

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire
     field a caller sends. It is deliberately absent from every request contract: binding a
     provider slot from HTTP is what would let a caller claim to be someone else. -->
