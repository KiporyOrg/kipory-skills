<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: a5020e2fbc4b · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability packs

Judgment for building on Kipory. A **project** on Kipory — its record types, flows, endpoints,
facets, schedules and events — is configuration you author by calling the design API. These packs
are what you need _beyond_ the schemas: when to reach for each capability, which calls drive it in
what order, the invariants no JSON Schema expresses, and the mistakes that have already been made.

## How to use them

Fetch the set with `GET /v1/capability-packs` and one pack with `GET /v1/capability-packs/{id}`.
Both responses carry a `version` — a content hash of the whole served set. Cache against it and
refetch when it moves; a `version` you have not seen means this deployment's judgment layer
changed under you.

Read one or two packs per step, not all of them. The index below is built for that.

## Facts come from the live system, never from a pack

| Fact                                                | Where it actually lives                        |
| --------------------------------------------------- | ---------------------------------------------- |
| Endpoint paths, request and response shapes         | `GET /v1/openapi.json`                         |
| Which handlers exist, their config and their I/O    | `GET /v1/handlers`                             |
| Contract, action and input-mapping grammars         | `GET /v1/openapi.json`                         |
| Which paths the platform itself occupies            | `GET /v1/coded-routes` — before you pick one   |
| Whether a coded route shadows an endpoint you SAVED | `expand=shadowed` on the api-endpoints read    |
| These packs, and whether your copy is current       | `GET /v1/capability-packs` — compare `version` |

Every one of those is a call against the same deployment you are building on. That split is
deliberate: **judgment travels between deployments, facts do not.** A pack stays true about how to
think long after it would have gone stale about what exists.

If a pack and a live source disagree, the live source wins. The packs are checked against it
continuously, but a deployment can always move first — so report the disagreement rather than
quietly working around it.

> **Confirm every handler key against `GET /v1/handlers`, never against a pack.** A snapshot of
> the catalog once kept naming a key after the running deployment had merged it into
> `value.first-non-empty`. See Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`), Rule 0.

## "I want to…"

| I want to…                                                              | Pack                                                                |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Turn an idea into a plan and see everything that will be built**      | Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`)                           |
| Know what Kipory **cannot** do before committing to a design            | Limits (capability pack `limits` — `GET /v1/capability-packs/limits`)                                                 |
| Create a project, or find its `OrgNode` id                              | Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`)                     |
| Understand how a request to a project's own host is served, end to end  | Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)           |
| Expose a flow over HTTP — sync, async or streaming                      | Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)           |
| Mint a token that can call a project's API                              | Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)           |
| Build or edit a flow; add, replace or reorder skills                    | Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`)                               |
| Make a flow actually return its declared output                         | Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`)                               |
| Run a flow against real inputs — and the flag that stops it writing     | Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`)                               |
| Define a reusable data shape                                            | Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) |
| Define a kind of record people create or the system processes           | Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`) |
| Classify records against a vocabulary that resolves to terms            | Facets (capability pack `facets` — `GET /v1/capability-packs/facets`)                                                 |
| Link records to each other with typed edges                             | Relations (capability pack `relations` — `GET /v1/capability-packs/relations`)                                           |
| Read a record's edges, or state one by hand                             | Relations (capability pack `relations` — `GET /v1/capability-packs/relations`)                                           |
| Run a flow on a clock                                                   | Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`)                                           |
| Run a flow when an event is recorded                                    | Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`)                                             |
| Start a flow from something outside it — a channel, a webhook, a table  | Sources (capability pack `sources` — `GET /v1/capability-packs/sources`)                                               |
| Emit progress or fan-out signals from a flow, or subscribe to them      | Events (capability pack `events` — `GET /v1/capability-packs/events`)                                                 |
| Snapshot a flow before a risky change, and roll back                    | Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`)                             |
| Store what "working" means and re-check it after every edit             | Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`)                               |
| Judge whether a change made a flow **better**, not just still passing   | Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)                                             |
| Give a project tunable runtime settings — thresholds, cadences, weights | Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`)                                 |
| Make a record type searchable                                           | Embedding profiles (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`)                         |
| See what you have spent, or why a call was refused with `402`           | Credits and spend (capability pack `credits` — `GET /v1/capability-packs/credits`)                                     |
| Use your own vendor API key, so the vendor bills you and not us         | Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`)                                               |
| Store any credential a flow needs, without it being readable back       | Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`)                                               |

## The packs

- **Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`)** — start here for anything new. The eight-step walk
  from idea to build sheet, and the rule that facts are confirmed live, never recalled.
- **Limits (capability pack `limits` — `GET /v1/capability-packs/limits`)** — the negative space. Verified backwards, so a lifted limit forces a
  rewrite instead of quietly becoming a lie.
- **Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`)** — turn zero: creating a project, what the one
  call actually does (and what it does not seed), and why the design plane wants a node id rather
  than a project id.
- **Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)** — read early. The full request
  lifecycle, and the resource that defines it.
- **Flows & skills (capability pack `flows-and-skills` — `GET /v1/capability-packs/flows-and-skills`)** — the main build target. Output binding, preview (which
  costs money **and writes records unless you pass `apply: false`**), what travels between skills,
  and the rule that a save succeeding is not a promise it will run.
- **Record types & schema entries (capability pack `record-types-and-schema-entries` — `GET /v1/capability-packs/record-types-and-schema-entries`)** — shapes versus record
  types, the reserved names, and what a schema edit cascades into.
- **Facets (capability pack `facets` — `GET /v1/capability-packs/facets`)** — classification against a resolvable vocabulary, and the path from
  resolving to committing terms.
- **Relations (capability pack `relations` — `GET /v1/capability-packs/relations`)** — typed record-to-record edges: kinds, pairings, the declaration
  that rides on the record type, the surfaces edges arrive on, and the multi-hop walk that does not
  exist.
- **Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`)** — time-triggered flow runs, run history, and why the next-run time
  you are given is one you can hold the platform to.
- **Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`)** — event-triggered flow runs: the durable event log, the selector and
  filter, the two reserved slots, replay, and why a trigger never catches up.
- **Sources (capability pack `sources` — `GET /v1/capability-packs/sources`)** — what writes events into your log from outside your flows: the
  provider registry, the config each one takes, the vocabulary a first source seeds, and why a
  source never names a flow.
- **Events (capability pack `events` — `GET /v1/capability-packs/events`)** — the registry, emitting from a flow, and the difference between a signal
  scoped to one run and one on the bus.
- **Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`)** — atomic snapshot and restore; the safety net to take
  before a risky edit.
- **Flow test cases (capability pack `flow-test-cases` — `GET /v1/capability-packs/flow-test-cases`)** — stored inputs and assertions replayed through the
  preview engine. Asks "does this still work?"
- **Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)** — cases, a subject and scorers, graded and kept so runs compare. Asks
  "is this any good?" Reach for it when the answer is a matter of degree.
- **Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`)** — namespaced runtime tunables typed by a bound shape,
  readable by flows.
- **Embedding profiles (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`)** — the one place a project's vector space is
  defined.
- **Credits and spend (capability pack `credits` — `GET /v1/capability-packs/credits`)** — the balance and the ledger, and the second gate a client
  that renders only `status` never sees.
- **Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`)** — the node-scoped credential vault. Which tier's key pays the vendor,
  why disabling a secret defers upward instead of switching it off, and why nothing reads a value
  back.

## True of every design resource

- **Address by node, or by the parent that owns you.** Most resources create and list by the
  project's **`OrgNode` id**, and individual items are addressed by their own id — but a resource
  with a parent design object scopes by THAT instead: skills by their flow, checkpoints by their
  flow, event types by their category. Check the resource's own pack rather than assuming the node.
- **Two planes, two audiences.** The design plane is where a project is _authored_. The dynamic
  plane is where a project's own users are _served_. Do not reach for one from inside the other.
- **Optimistic locking.** A PATCH carries the `version` you last read, and a stale one is refused
  with a 409. It is REQUIRED wherever a resource's PATCH body accepts one — an omitted lock is not a
  lighter check, it is no check. ⚠️ Two caveats the flat rule hides: a resource that publishes a
  `version` on the read does not necessarily accept one on the write (sending it there is a 422,
  because bodies are closed), and the flow PATCH carries no version field at all. On a refusal,
  re-read and reconcile — or, where a resource offers an explicit force, use that deliberately
  rather than blind-retrying.
- **A 2xx is not a promise it will run.** Saves return success even when wiring is still
  unresolved; only a resource's _blocking_ problems refuse the write. **Runtime is stricter than
  authoring** — there is no activation step to be stricter than. ⚠️ `outstandingIssues` is the flow
  plane's channel and does not appear on every save; elsewhere, re-read the resource asking for
  readiness.
- **Seeded rows cannot be DELETED.** Anything the platform seeded refuses a delete — but a PATCH is
  generally accepted, so "seeded" is not the same as read-only.
