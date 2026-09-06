---
name: kipory.diagnose
description: Work out why a Kipory flow behaved the way it did — read its recent runs, open one, and see what each output slot actually holds. Use when a flow returns the wrong thing, an endpoint 502s, or output changed and nobody knows which step moved.
---

# Diagnose a Kipory flow

Every flow run can leave a **trace**: what it received, what it produced, and a
snapshot of what each **output slot** held. That last part is the whole value —
it separates a step that ran and emitted something from one that ran and emitted
nothing, which is otherwise indistinguishable from outside.

⚠️ It is keyed by slot, not by step, and the difference decides how you read an
absence. A slot that is **present and empty** (`[]`, `""`) is the real "ran and
emitted nothing" signal. A slot that is **absent** tells you nothing at all: the
step may have been skipped, or may declare no output slot in the first place —
a branch-selecting step is exactly such a node and contributes nothing here.

## The sequence

```
GET /v1/flows/{id}/traces?source=production&limit=20   recent runs, newest first
GET /v1/flows/{id}/traces/{traceId}                    one run, with its writes
```

Narrow with `source` (`production` · `eval` · `manual`) and `recordId`. The list
carries no payloads on purpose — it is for choosing which run to open.

## ⛔ Read this before you conclude anything

**An empty list is not evidence that the flow did not run.** Three things stand
between a run and a trace you can read, and all of them are silent:

- **Sampling.** Tracing is sampled per project. The listing returns the rates in
  force — read them. At `0.05` a flow that ran two hundred times leaves about ten
  traces, and at `0` it leaves none while working perfectly. ⚠️ The rates bind
  `source=production` only: `eval` and `manual` traces are always captured. And
  there is a rate per path — read the one governing the path you care about,
  request-driven runs or record processing.
- **Expiry.** Traces are dropped on a TTL, seven days by default. A `404` on a
  trace id you saw yesterday is the reaper, not a broken reference.
- **The row budget.** A run whose captured values do not fit the trace row —
  even after per-slot truncation — is dropped **whole**, as is one holding a
  value that will not serialize. This is the quietest of the three: the run
  succeeds, nothing surfaces the reason, and the result is indistinguishable
  from not being sampled.

⚠️ **`null` and `0` in the sampling rates mean opposite things.** Null is "inherit
the deployment default" — tracing is probably on. Zero is "record nothing". A
diagnosis that reads them alike will confidently call a working flow broken.

**So: check the rates before you interpret the count.** "No traces" answers
nothing until you know whether any were being written.

## How to actually read one

1. **Start from `output`.** If it is missing a slot the caller declared, you have
   your failure — that is also the usual cause of a 502 through an endpoint.
2. **Then read `slotOutputs`.** ⛔ It is keyed by **output slot**, one level —
   NOT by skill, and not nested. A slot that emitted nothing, or emitted a shape
   the next step could not use, is where the run went wrong.
3. **Read `stepOutputs` beside it** when you need to know WHICH step wrote a
   slot. Within one flow a slot name already names a skill, so this usually only
   confirms what you can see; it earns its place in the two cases where a slot
   name is not an identity — a **sub-flow** invoked by this one, and a
   **fan-out branch**, where two steps write the same slot name and
   `slotOutputs` keeps only the last. Every `superseded` entry is a write that
   is not in `slotOutputs` at all.
4. **Compare a good run to a bad one.** This is the fastest way to find a step
   whose behaviour changed, and it needs no instrumentation. ⚠️ Check `truncated`
   on the listing first: true means older runs exist beyond this window and
   **there is no cursor to reach them** — `limit` is a ceiling, not a page size.
   Raise it (100 is the maximum) or narrow with `recordId`. An absent good run
   may simply be outside the window.
5. **Check `durationMs`** if the complaint is slowness — but ⚠️ null means the
   writer did not time itself, **not** that the run was instant.

Values in both are **truncated at write time** — embeddings reduced to a head
marker, long hit lists capped, and anything that would not fit the row's byte
budget replaced by a `dropped-oversized` marker naming the size it stood in for.
You are reading evidence, not a replay.

## What a trace is not

- **`stepOutputs: null` is not "nothing was written".** It means that trace's
  writer did not record steps at all. An empty `steps` array is the different
  answer that it recorded and there were none. And a non-zero `droppedWrites`
  says the run made more overwritten writes than the row kept, so `steps` is not
  the whole record. (In practice a null is rare to the point of theoretical:
  every current writer records steps, and the TTL is short enough that traces
  predating step recording have long since expired.)
- **There is no status field.** A trace records what happened, not a verdict on
  it. Failure shows up as a missing or wrong `output`, not as a flag.
- **It is not a replay.** You cannot re-run a trace. To reproduce, take its
  `inputs` and run a preview — ⛔ but a preview is not a safe rehearsal: it costs
  money **and applies the writes it stages** unless you pass `apply: false`.
  Reproducing a bad run against a live project without that flag writes real
  records a second time.
- **It is not an audit log.** Traces expire. If you need something kept, store it.

## When the trace layer cannot answer

- **A scheduled run that never fired** is a schedule question — read the
  schedule's own run history (`kipory.operate`), which is separate and not TTL'd
  the same way.
- **"Is this any good" rather than "what happened"** is `kipory.prove`: eval runs
  score across cases and keep their traces attached for drill-down.
- **A flow that will not save** never ran, so there is nothing to trace. That is
  a validation problem — `kipory.build`. ⚠️ **A flow that saved _with_ blocking
  issues is the opposite case: it still runs**, because nothing re-checks the
  graph at run time. It leaves a trace, and that trace is usually the fastest way
  to see what the diagnostic was predicting.
- **A `402` is not a flow problem** and leaves no run to read. **Three**
  independent gates produce it: the payer's wallet, an acting end user's own
  spend ceiling, and the project's design-time ceiling — which is the one a
  preview hits, since the per-user cap is deliberately excluded from that path.
  Branch on the error `code`, never on the status: the three remedies are top up,
  raise that person's cap, and raise the design ceiling, and none of them
  substitutes for another. `kipory.operate` has the reads — and note the ledger
  read there needs a signed-in user, so an API key cannot use it.

## Related

`GET /v1/capability-packs/flows-and-skills` for what a skill is allowed to emit,
and `GET /v1/capability-packs/api-endpoints-anatomy` for the error table if the
symptom arrived over HTTP.
