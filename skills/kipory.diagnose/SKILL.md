---
name: kipory.diagnose
description: Work out why a Kipory flow behaved the way it did — read its recent runs, open one, and see what each skill actually emitted. Use when a flow returns the wrong thing, an endpoint 502s, or output changed and nobody knows which step moved.
---

# Diagnose a Kipory flow

Every flow run can leave a **trace**: what it received, what it produced, and a
per-skill snapshot of what each step wrote. That last part is the whole value —
it separates a skill that ran and emitted something from one that ran and
emitted nothing, which is otherwise indistinguishable from outside.

## The sequence

```
GET /v1/flows/{id}/traces?source=production&limit=20   recent runs, newest first
GET /v1/flows/{id}/traces/{traceId}                    one run, with slotOutputs
```

Narrow with `source` (`production` · `eval` · `manual`) and `recordId`. The list
carries no payloads on purpose — it is for choosing which run to open.

## ⛔ Read this before you conclude anything

**An empty list is not evidence that the flow did not run.** Two things stand
between a run and a trace you can read, and both are silent:

- **Sampling.** Tracing is sampled per project. The listing returns the rates in
  force — read them. At `0.05` a flow that ran two hundred times leaves about ten
  traces, and at `0` it leaves none while working perfectly.
- **Expiry.** Traces are dropped on a TTL, seven days by default. A `404` on a
  trace id you saw yesterday is the reaper, not a broken reference.

⚠️ **`null` and `0` in the sampling rates mean opposite things.** Null is "inherit
the deployment default" — tracing is probably on. Zero is "record nothing". A
diagnosis that reads them alike will confidently call a working flow broken.

**So: check the rates before you interpret the count.** "No traces" answers
nothing until you know whether any were being written.

## How to actually read one

1. **Start from `output`.** If it is missing a slot the caller declared, you have
   your failure — that is also the usual cause of a 502 through an endpoint.
2. **Then walk `slotOutputs` in order.** It is keyed by skill; each value is what
   that skill wrote. The first skill that emitted nothing, or emitted a shape the
   next one could not use, is where the run went wrong.
3. **Compare a good run to a bad one.** Both are in the same list. This is the
   fastest way to find a step whose behaviour changed, and it needs no
   instrumentation.
4. **Check `durationMs`** if the complaint is slowness — but ⚠️ null means the
   writer did not time itself, **not** that the run was instant.

Values in `slotOutputs` are **truncated at write time** — embeddings reduced to a
head marker, long hit lists capped. You are reading evidence, not a replay.

## What a trace is not

- **There is no status field.** A trace records what happened, not a verdict on
  it. Failure shows up as a missing or wrong `output`, not as a flag.
- **It is not a replay.** You cannot re-run a trace. To reproduce, take its
  `inputs` and run a preview — which costs money, since preview avoids side
  effects and not spend.
- **It is not an audit log.** Traces expire. If you need something kept, store it.

## When the trace layer cannot answer

- **A scheduled run that never fired** is a schedule question — read the
  schedule's own run history (`kipory.operate`), which is separate and not TTL'd
  the same way.
- **"Is this any good" rather than "what happened"** is `kipory.prove`: eval runs
  score across cases and keep their traces attached for drill-down.
- **A flow that will not save or activate** never ran, so there is nothing to
  trace. That is a validation problem — `kipory.build`.
- **A `402` is not a flow problem** and leaves no run to read. Two independent
  gates produce it — the payer's wallet and the caller's own spend ceiling — and
  a healthy `status` rules out only the first. `kipory.operate` has the reads,
  both of which keep working while you are refused everywhere else.

## Related

`GET /v1/capability-packs/flows-and-skills` for what a skill is allowed to emit,
and `GET /v1/capability-packs/api-endpoints-anatomy` for the error table if the
symptom arrived over HTTP.
