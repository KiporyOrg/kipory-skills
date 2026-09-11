<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 116a24886bfa · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Planning protocol

> **Source of truth for facts:** this pack is a protocol, not a reference. Every capability it
> names belongs to another pack, and every fact belongs to the live system. Do not restate
> capability detail here — link to it.

## What it is

The walk from a product idea to a **build sheet**: a complete, reviewable statement of everything
that will exist in a Kipory project, with each line marked buildable-as-configuration or
needs-software-written.

Every other pack is indexed by capability, which assumes you already know which capability you
want. This one runs the other direction — from an idea to the primitives it decomposes into.

## When you need it

At the start, once, before authoring anything. Skip it and the usual failure is not a wrong
decision but an invisible one: a step nobody decided, discovered after three other things were
built on top of it.

---

## Rule 0 — judgment from memory, facts from the live system

You may carry the **shape** of Kipory without looking anything up: what composes with what, what
the invariants are, what is expensive. You may **not** produce a fact from memory.

Before naming a handler in a build sheet, confirm it against `GET /v1/handlers`. Before naming a
route or an error code, confirm it against `GET /v1/openapi.json`. Both answer for the deployment
you are actually building on, which is the entire point — a pack can only tell you how to think,
never what currently exists.

This is not caution for its own sake. A snapshot of the handler catalog once went on naming a key
after the running deployment had already merged it into `value.first-non-empty`; the plan built on
it burned real calls before anyone noticed. **A remembered handler key is not admissible in a
build sheet.**

**Read the whole catalog, never a keyword filter.** The first real run of this protocol searched
the catalog for the words it expected — "twitter", "rss" — reported the filtered view as
confirmed, and missed `url.scrape` entirely. A filter encodes what you already believe; the
catalog's job is to show you what you did not think to ask for. Read the full key list first, then
the entries that matter.

## Rule 1 — the build sheet is for a human to reject

It is a conversational artifact. There is no schema for it, no validator, no machine-readable
form, and **nothing anywhere that executes it**.

Executing a plan is ordinary design-API use — the same calls a person would make by hand. There is
no privileged path and no plan runner. Everything the walk produces, you build with the endpoints
the other packs document.

## Rule 2 — ask only what changes the build

The walk has eight steps and most ideas leave several empty. Ask the questions whose answers
change what gets built; infer the rest, and show the inferences in the sheet, where they are cheap
to correct. A question whose every answer produces the same build sheet is a question you already
answered.

## Rule 3 — an empty step is a decision

A step with nothing in it is recorded as **"none, because…"**, never omitted. An omitted step and
a forgotten one are indistinguishable to the reader, and the reader is the person you need to
catch your mistake.

---

## The walk

### 1 — Project

Does the project exist? If not, that is turn zero. If it does, resolve and record its **`OrgNode`
id**: the design plane addresses projects by node, and the project id is not what it wants.

→ Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`)

### 2 — Records

What _things_ exist here? Each becomes a **record type**: a shape plus a descriptor. For each,
decide what fields it carries, whether records are authored by people or produced by the system,
and whether it has a processing flow or is born ready.

This step usually dominates the sheet, and every later step inherits its mistakes.

→ Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`)

### 3 — Processing

What happens to those records? Each pipeline becomes a **flow** of **skills** over existing
**handlers**.

The decisive question is whether every step maps to a handler that already exists — confirmed
live, per Rule 0. A step with no handler is not automatically impossible, but it is the moment to
read Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) before going further.

→ Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`) · Limits (capability pack `limits` — `GET /v1/capability-packs/limits`)

### 4 — Exposure

What can the outside world call? Each answer becomes a **dynamic endpoint** over a flow — sync,
async or streaming — plus the auth that reaches it.

→ Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)

### 5 — Classification and linking

Do records need classifying against a vocabulary (**facets**, resolved to terms), or linking to
each other with typed edges (**relation kinds** and their pairings)? Both are frequently "none" —
say so explicitly.

→ Facets (capability pack `facets` — `GET /v1/capability-packs/facets`) · Relations (capability pack `relations` — `GET /v1/capability-packs/relations`)

### 6 — Time

Does anything run on a clock? Each becomes a **schedule** bound to a flow.

→ Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`)

### 7 — Signals

Does anything need to report progress or fan-out, to a UI, a subscriber, or an operator? Each
becomes a registered **event**.

→ Events (capability pack `events` — `GET /v1/capability-packs/events`)

### 8 — Correctness

What does "working" mean for each flow? Each answer becomes a **flow test case** — a stored input
plus assertions, replayed after every edit. Where the answer is a matter of degree rather than
pass/fail, it becomes an **eval suite** instead.

Do not skip this because the project is small. It is what makes the plan checkable rather than
merely written, and the assertions are the only part that survives a later rewrite.

→ Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`) · Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)

---

## The build sheet

One row per object to be built:

| Step | Primitive | Name | Disposition | Notes |
| ---- | --------- | ---- | ----------- | ----- |

- **Step** — which of the eight produced it.
- **Primitive** — record type, schema entry, embedding profile, flow, skill, endpoint, schedule,
  facet, relation kind, event, project-config namespace, secret, test case, eval suite.
  ⚠️ The last four of those are easy to leave out of a sheet and expensive to discover later: a
  record type declared searchable needs an **embedding profile** to name, a flow calling a paid
  web vendor may need a **secret**, and a threshold you will want to tune belongs in a
  **project-config namespace** rather than baked into a flow.
- **Name** — what it will be called.
- **Disposition** — **`seed`** (design-API configuration, you can build it now) or **`code`**
  (software has to be written: either a platform capability Kipory does not have, or a service of
  your own that Kipory calls).
- **Notes** — for a `seed` row, the handler keys or shape that matter. For a `code` row, what
  would have to exist, and why no existing primitive covers it.

Follow the table with:

1. **Empty steps**, each with its "none, because…".
2. **Open questions** the walk could not close.
3. **The `code` total.** This is the number that makes the plan real. Most of a Kipory project is
   configuration; the `code` rows are where the engineering risk actually lives, and surfacing
   them is the point of the exercise.

## After the build sheet

Stop. The walk ends here.

The sheet is the deliverable and it is delivered in the conversation. Nothing on the platform
stores a plan, so nothing is left behind when one is rejected — which is what makes rejecting a
plan cheap, and why it is worth writing one before building.

## Related

- README (capability pack `readme` — `GET /v1/capability-packs/readme`) — the capability index, for when you already know what you need.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — read before committing to any step-3 decomposition.
