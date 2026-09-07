<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 1e228431bd0e · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

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

For a list, ask the list:

```
GET /v1/flows?project={node}&expand=health
```

Each row then carries a `health` summary, folded from the same report the per-flow route returns
in full, so the two cannot disagree:

| field             | what it says                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isActivatable`   | ⚠️ a PREDICTION, not a gate: no error-severity diagnostic about the graph or its edges. Nothing consults it at run time, so a flow reading `false` still runs |
| `errors`          | how many diagnostics are errors; not all of them block                                                                                                        |
| `warnings`        | how many are warnings                                                                                                                                         |
| `blockingCode`    | the first diagnostic preventing activation, or `null` when nothing does                                                                                       |
| `blockingMessage` | that diagnostic's message — a sentence naming the skill or slot at fault                                                                                      |

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

Other things bind a flow without capturing its shape: a schedule, a Telegram subscription, a
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

⛔ **The CHECKPOINT format is a different format and does not carry it.** Run flow-snapshots and
checkpoint payloads are serialized by the checkpoint entry shape, which has no `timeoutMs` — so
`timeoutMs: null` on a snapshot means "this record does not say", NOT "the run had no deadline". Do
not read a snapshot as evidence about a deadline, and expect a checkpoint restore to clear one. The
restore preview shows the pair so the loss is visible before you commit to it; see
`capability-packs/flow-checkpoints.md`.

⚠️ **There is no `schemaVersion` on the export, deliberately.** The format is the replace entry
shape, whose evolution is already governed; a version integer beside it would be a second, weaker
mechanism for the same thing — and the weaker one is the one nobody bumps. A stored export re-imported
later is validated by `replace` on the way in, so a shape that moved fails naming the field.

## Asking about a step you have not saved

25 <!-- count: editor-inputs-from-config --> of the sixty-nine handlers do not take their inputs
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

⚠️ **`derivedInputStreams: null` is not an empty list, and there are three reasons for it.** Read
`derivedFrom` to tell them apart: `row` means the handler takes inputs from the step row so there was
nothing to derive; `template` means they come from the prompt, which this route does not yet answer
for; and a null with `derivedFrom: "handler-config"` means a check failed, so any list would have
been read off an expression that does not parse. An empty ARRAY means the config was read and names
no slots.

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
- **Provider slots are seeded by the engine** — the user, the project and the run. They cannot be
  supplied from an incoming request, which is what stops a caller claiming to be someone else.

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
  is a loop worth leaning on rather than avoiding.
- **Editing a skill requires the version you last read.** A stale one is refused unless you
  explicitly force the save. Re-read and reconcile; do not blind-retry. Batch updates lock each
  item the same way.
- **A flow cannot be deleted while another flow invokes it, or while anything live points at it**
  (`FLOW_HAS_DEPENDENTS` — ⚠️ a **wider** set than the signature guard's, not the same one: five
  kinds, adding schedules, Telegram subscriptions and facet resolvers to the endpoint and
  record-type bindings that freeze a shape. Those three bind a flow by id and capture nothing, so
  they cannot go stale on a signature edit — but they very much break on a delete). None of those is a
  database-level foreign key, so this check is the only thing standing between the delete and a
  dangling reference. A skill cannot be deleted while a sibling reads its slot.
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

## Related

- Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`) — exposing a flow over HTTP.
- Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`) — snapshot before a risky edit.
- Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) — make "it works" a stored, replayable claim.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — read before assuming a step exists.

<!-- field-ok: userInfo — a run-ambient PROVIDER slot seeded by the engine, not a wire
     field a caller sends. It is deliberately absent from every request contract: binding a
     provider slot from HTTP is what would let a caller claim to be someone else. -->
