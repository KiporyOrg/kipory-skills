<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

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

What Kipory builds is the **backend** of the idea: the processes it runs (flows), the data it
keeps (tables), and the entry points the outside uses (endpoints, triggers, schedules). The
frontends people use are clients of what the project exposes and are not on the build sheet. The
walk below is in dependency order — records before processing, because a flow reads and writes
typed records — not in order of importance; the processes are the idea.

## When you need it

At the start, once, before authoring anything. Skip it and the usual failure is not a wrong
decision but an invisible one: a step nobody decided, discovered after three other things were
built on top of it.

---

## Rule 0 — judgment from memory, facts from the live system

You may carry the **shape** of Kipory without looking anything up: what composes with what, what
the invariants are, what is expensive. You may **not** produce a fact from memory.

Before naming a function in a build sheet, confirm it against `GET /v1/functions`. Before naming a
route or an error code, confirm it against `GET /v1/openapi.json`. Both answer for the deployment
you are actually building on, which is the entire point — a pack can only tell you how to think,
never what currently exists.

This is not caution for its own sake. A snapshot of the function catalog once went on naming a key
after the running deployment had already merged it into `value.first-non-empty`; the plan built on
it burned real calls before anyone noticed. **A remembered function key is not admissible in a
build sheet.**

**Read the whole catalog, never a keyword filter.** The first real run of this protocol searched
the catalog for the words it expected — "twitter", "rss" — reported the filtered view as
confirmed, and missed `url.scrape` entirely. A filter encodes what you already believe; the
catalog's job is to show you what you did not think to ask for. Read the full key list first, then
the entries that matter.

## Rule 1 — the build sheet is for a human to reject

The build sheet is a conversational artifact: prose for a person to read and say no to. It has no
schema and no validator, and it is not what the platform runs.

What the platform runs is a project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) — the same project, stated
as one key-addressed file. When the sheet is accepted, write the document it describes and
**plan it** (`POST /v1/projects/{nodeId}/document/plan`). The plan response is the second moment a
person can say no, and a better-informed one: it lists every row that would be created, changed
and removed, every refusal on the path that caused it, and what the change does to stored data.
Nothing has been written when they read it.

What makes that safe: **there is no privileged path.** Applying a document is ordinary design semantics — every row goes through the same write a
person makes by hand, with the same refusals — composed into one transaction. Nothing a document
can do is something the row API cannot, and nothing runs a plan that a person has not seen.

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

Does the project exist? If not, that is turn zero. If it does, record its **id** — the `id` the
create answered. An API key reads it from `GET /v1/grant`: the `id` of `node` when the key was granted at
the project, otherwise one of `projects`. Every route takes that one id.

→ Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`)

### 2 — Records

What _things_ exist here? Each becomes a **table**: a shape plus a descriptor. For each,
decide what fields it carries, whether records are authored by people or produced by the system,
and whether it has a processing flow or is born ready.

This step usually dominates the sheet, and every later step inherits its mistakes.

→ Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)

### 3 — Processing

What happens to those records? Each pipeline becomes a **flow** of **actions** over existing
**functions**.

The decisive question is whether every action maps to a function that already exists — confirmed
live, per Rule 0. An action with no function is not automatically impossible, but it is the moment to
read Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) before going further.

Calling an outside service that has no function of its own is still configuration when it has an
HTTP API and a static key: a `url.fetch` action reads from it, a `url.send` action tells it something
(staged once per run, delivered after the run has saved, its answer never seen by the flow), and
the key is a **secret** row of type `http_credential` that the action names. A request the platform
would have to sign, or a write whose answer the flow needs, is a `code` row.

→ Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`) · Limits (capability pack `limits` — `GET /v1/capability-packs/limits`)

### 4 — Exposure

What can the outside world call? Each answer becomes a **dynamic endpoint** over a flow — sync,
async or streaming — plus the auth that reaches it.

→ Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)

### 5 — Classification and linking

Do records need classifying against a vocabulary (**vocabularies**, resolved to terms), or linking
to each other with typed links (**relations** and their pairings)? Both are frequently "none" —
say so explicitly.

→ Vocabularies (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`) · Relations & links (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`)

### 6 — Time and reaction

What starts a flow when nobody calls it? Three answers, and each is a row:

- on a clock — a **schedule** bound to a flow;
- when an event is recorded in the project — a **trigger** on that event;
- when something arrives from outside — a **source**, which writes events, and a trigger on them.
  `GET /v1/sources/providers` says which providers this deployment accepts
  (`availability: available`); today that is a watched Telegram channel. An inbound webhook is not
  a source yet: receive it on an endpoint (step 4), which works only if the sender can send
  `Authorization: Bearer <a project key>` and a body of exactly the fields the flow declares. A
  sender that signs its requests instead, or posts fields you cannot declare, needs a `code` row:
  a small relay of your own.

→ Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`) · Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`) · Sources (capability pack `sources` — `GET /v1/capability-packs/sources`)

### 7 — Signals

Does anything need to report progress or fan-out, to a UI, a subscriber, or an operator? Each
becomes a registered **event**.

→ Events (capability pack `events` — `GET /v1/capability-packs/events`)

### 8 — Correctness

What does "working" mean for each flow? Each answer becomes a case in the flow's **contract
suite** — an eval suite with no scorer flows: a stored input plus assertions, re-run after every
edit. Where the answer is a matter of degree rather than pass/fail, the suite gains a **scorer
flow** instead.

Do not skip this because the project is small. It is what makes the plan checkable rather than
merely written, and the assertions are the only part that survives a later rewrite.

→ Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)

---

## The build sheet

One row per object to be built:

| Step | Primitive | Name | Disposition | Notes |
| ---- | --------- | ---- | ----------- | ----- |

- **Step** — which of the eight produced it.
- **Primitive** — table, type, embedding profile, flow, action, endpoint, schedule,
  trigger, source, vocabulary, relation, event, project-config namespace, secret, task-model
  binding, eval suite, eval case.
  ⚠️ Four of those are easy to leave out of a sheet and expensive to discover later: a
  table declared searchable needs an **embedding profile** to name, a flow calling a paid
  web vendor, or any outside API through `url.fetch` or `url.send`, may need a **secret**, a
  threshold you will want to tune belongs in a **project-config namespace** rather than baked into a
  flow, and the **eval cases** of step 8 are the only part of a plan that survives a later rewrite.
  A fifth is a fact to read rather than a row to invent: a model action inherits its model through a
  task, and `GET /v1/nodes/{nodeId}/task-models` says, per task, whether that model is `callable` on
  this deployment — a task that is not needs a **task-model binding** row.
- **Name** — what it will be called.
- **Disposition** — **`seed`** (design-API configuration, you can build it now) or **`code`**
  (software has to be written: either a platform capability Kipory does not have, or a service of
  your own that Kipory calls).
- **Notes** — for a `seed` row, the function keys or shape that matter. For a `code` row, what
  would have to exist, and why no existing primitive covers it.

Follow the table with:

1. **Empty steps**, each with its "none, because…".
2. **Open questions** the walk could not close.
3. **The `code` total.** This is the number that makes the plan real. Most of a Kipory project is
   configuration; the `code` rows are where the engineering risk actually lives, and surfacing
   them is the point of the exercise.

## After the build sheet

The sheet is delivered in the conversation. Nothing on the platform stores a plan, so nothing is
left behind when one is rejected — which is what makes rejecting a plan cheap, and why it is worth
writing one before building.

Once it is accepted, the next artifact is the project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`) it
describes, planned before it is applied. A plan writes nothing either, so it is as cheap to reject
as the sheet was.

## Related

- README (capability pack `readme` — `GET /v1/capability-packs/readme`) — the capability index, for when you already know what you need.
- Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — read before committing to any step-3 decomposition.
