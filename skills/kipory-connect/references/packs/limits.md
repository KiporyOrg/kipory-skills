<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 116a24886bfa · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Limits

> **Source of truth for facts:** every other pack asserts that something exists, and the live
> system can confirm it. This pack asserts that something does **not** exist, which nothing can
> confirm by fetching. So each limit below is **inverse-checked** against the platform: the check
> fails the day a limit stops holding, which forces this pack to be rewritten rather than left to
> quietly become false. Limits that no mechanical check can express are marked `unprobed` with a
> review date, so the unguarded set is visible instead of assumed empty.

## What it is

The negative space. Every other pack tells you what you can build; this one tells you what you
cannot, so a plan routes around it early instead of discovering it three steps in.

Absence is the one claim that rots without a symptom. When a capability is added, the pack
describing it changes and its facts get checked. When a capability is **missing**, nothing anywhere
fails on the day someone builds it — the sentence just becomes a lie, and every plan written
against it inherits a constraint that no longer exists. That asymmetry is why this pack is
verified backwards.

## When you need it

At two moments, both during planning:

- **Deciding how a pipeline decomposes.** Before assuming a step exists, check that its shape is
  not listed here.
- **Deciding what to expose.** Before promising a caller a behaviour, check it is reachable.

When something you want is listed here, you have three honest moves — use the stated alternative,
change the design, or mark the item as needing software written rather than configuration
authored. What you cannot do is plan as though the capability exists. Every entry below cost
someone that assumption first.

---

## The limits

### The model cannot choose what runs next

<!-- absent: no-tool-calling-verb -->

**What is absent.** There is no tool-calling or agentic-loop capability. Nothing hands a model a
set of tools and lets it call them until it decides to stop. The platform's model verbs generate
an object, generate text, stream an object, embed, transcribe, and rerank — and none of them
accepts a tool set.

**Why this is structural rather than a gap nobody filled.** Every model call in the platform goes
through a single chokepoint, enforced three separate ways. A tool loop therefore cannot be added
_around_ the platform by any project; it could only ever be added _inside_ that chokepoint, as a
new capability of the platform itself.

**What this means for your design.** Every branch in a flow is authored by you, in advance. A flow
cannot decide its own next step at runtime. When an idea's shape is "the AI works out what to do",
it decomposes one of two ways:

1. **A fixed pipeline** — the steps were always knowable, and the AI's judgment is needed inside a
   step rather than between steps.
2. **A classification step feeding a pre-authored branch** — the model chooses a _label_, and your
   flow chooses what to run for that label. The model's judgment is real; the control flow is
   still yours.

Almost every "agentic" idea is the second shape once it is written down, and the second shape is
also the one you can test.

### Wiring cannot read the clock or roll a die

<!-- absent: jsonata-is-deterministic -->

**What is absent.** The expression sandbox that wires one step's output into the next blocks
`$now`, `$millis`, `$random` and `$shuffle` — the complete set of ways an expression could return
a different answer for identical input. (`$eval` is blocked too, as a sandbox escape.)

**What this means for your design.** "Stamp the current time" and "pick one at random" are not
wiring concerns. They have to enter a flow as a step's output or as a flow input, where they are
visible values rather than hidden ones.

**This is usually the feature, not the obstacle.** It is exactly what makes a stored test case
meaningful: run the same input twice and the wiring contributes the same answer both times, so any
difference you see came from the part you were actually testing.

---

## Unprobed limits

Limits that are real but that no mechanical check expresses. They carry review dates and are
counted on every clean run, so this section cannot quietly grow.

_None currently._

---

## What is NOT a limit

Things believed absent that are present. Each is kept because it was acted on at least once
before anyone checked.

<!-- present: facet-delete-has-an-affordance -->

- **Deleting a facet.** `DELETE /v1/facets/{id}` exists, and so does the operator UI for it — a
  preflight-driven delete dialog. This entry once said the button was missing; that was true when
  it was written and stopped being true without anything failing, which is the whole hazard this
  section is about. It is now checked in the other direction: if the affordance is ever removed,
  the check fails and this entry has to move up into the limits above.

## Related

- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — where in the walk to read this pack.
