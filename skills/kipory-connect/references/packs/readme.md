<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability packs

Judgment for building on Kipory, the platform for a product's backend. A **project** on Kipory — its
flows (the processes), tables (the data), endpoints, triggers and schedules (the entry points),
vocabularies and events — is configuration you author by calling the design API. These packs are
what you need _beyond_ the schemas: when to reach for each capability, which calls drive it in what
order, the invariants no JSON Schema expresses, and the mistakes that have already been made.

## How to use them

Fetch the set with `GET /v1/capability-packs` and one pack with `GET /v1/capability-packs/{id}`.
Both responses carry a `version` — a content hash of the whole served set. Cache against it and
refetch when it moves; a `version` you have not seen means this deployment's judgment layer
changed under you.

Read one or two packs per step, not all of them. The index below is built for that.

The same set is indexed for agents that look for it at `/llms.txt` on the api host, with each
pack as a markdown page at `/llms/{id}.md` — the JSON routes above and those pages are computed
from one compiled-in module and carry the same `version`.

## Facts come from the live system, never from a pack

| Fact                                                | Where it actually lives                        |
| --------------------------------------------------- | ---------------------------------------------- |
| Endpoint paths, request and response shapes         | `GET /v1/openapi.json`                         |
| Which functions exist, their config and their I/O   | `GET /v1/functions`                            |
| Contract, target and input-mapping grammars         | `GET /v1/openapi.json`                         |
| Which paths the platform itself occupies            | `GET /v1/coded-routes` — before you pick one   |
| Whether a coded route shadows an endpoint you SAVED | `expand=shadowed` on the api-endpoints read    |
| These packs, and whether your copy is current       | `GET /v1/capability-packs` — compare `version` |

Every one of those is a call against the same deployment you are building on. That split is
deliberate: **judgment travels between deployments, facts do not.** A pack stays true about how to
think long after it would have gone stale about what exists.

If a pack and a live source disagree, the live source wins. The packs are checked against it
continuously, but a deployment can always move first — so report the disagreement rather than
quietly working around it.

> **Confirm every function key against `GET /v1/functions`, never against a pack.** A snapshot of
> the catalog once kept naming a key after the running deployment had merged it into
> `value.first-non-empty`. See Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`), Rule 0.

## "I want to…"

| I want to…                                                                 | Pack                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Turn an idea into a plan and see everything that will be built**         | Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`)                          |
| Read, plan or apply a whole project as one document                        | The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`)                        |
| Know what must exist before what, when authoring row by row                | Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`)                              |
| Start a project from a shipped template                                    | Project templates (capability pack `templates` — `GET /v1/capability-packs/templates`)                                  |
| Know what Kipory **cannot** do before committing to a design               | Limits (capability pack `limits` — `GET /v1/capability-packs/limits`)                                                |
| Create a project, or find its id and its address                           | Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`)                    |
| Understand how a request to a project's own host is served, end to end     | Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)          |
| Expose a flow over HTTP — sync, async or streaming                         | Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)          |
| Mint a token that can call a project's API                                 | Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)          |
| Build or edit a flow; add, change or reorder actions                       | Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`)                            |
| Make a flow actually return its declared output                            | Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`)                            |
| Run a flow against real inputs — and the flag that stops it writing        | Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`)                            |
| Define a reusable data shape                                               | Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)                              |
| Define a kind of record people create or the system processes              | Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)                              |
| Classify records against a vocabulary that resolves to terms               | Vocabularies (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`)                                    |
| Link records to each other with typed links                                | Relations & links (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`)                        |
| Read a record's links, or state one by hand                                | Relations & links (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`)                        |
| Run a flow on a clock                                                      | Schedules (capability pack `schedules` — `GET /v1/capability-packs/schedules`)                                          |
| Run a flow when an event is recorded                                       | Triggers (capability pack `triggers` — `GET /v1/capability-packs/triggers`)                                            |
| Start a flow from something outside it — today a watched Telegram channel  | Sources (capability pack `sources` — `GET /v1/capability-packs/sources`)                                              |
| Emit progress or fan-out signals from a flow, or subscribe to them         | Events (capability pack `events` — `GET /v1/capability-packs/events`)                                                |
| Snapshot a flow before a risky change, and roll back                       | Flow checkpoints (capability pack `flow-checkpoints` — `GET /v1/capability-packs/flow-checkpoints`)                            |
| Store what "working" means and re-check it after every edit                | Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`) — a contract suite                         |
| Judge whether a change made a flow **better**, not just still passing      | Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`) — scorer flows                             |
| Give a project tunable runtime settings — thresholds, cadences, weights    | Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`)                                |
| Make a table searchable                                                    | Embedding profiles (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`)                        |
| See what you have spent, or why a call was refused with `402`              | Credits and spend (capability pack `credits` — `GET /v1/capability-packs/credits`)                                    |
| Use your own vendor API key, so the vendor bills you and not us            | Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`)                                              |
| Store any credential a flow needs, without it being readable back          | Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`)                                              |
| Call an outside API with a stored key, or tell an outside system something | Limits (capability pack `limits` — `GET /v1/capability-packs/limits`) — what a flow can reach; Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`) |

## The packs

- **Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`)** — start here for anything new. The eight-step walk
  from idea to build sheet, and the rule that facts are confirmed live, never recalled.
- **The project document (capability pack `project-document` — `GET /v1/capability-packs/project-document`)** — a whole project as one key-addressed file:
  export, plan, apply. Read it before authoring anything larger than one row.
- **Authoring order (capability pack `authoring-order` — `GET /v1/capability-packs/authoring-order`)** — what must exist before what, and the two cycles the
  row-by-row API cannot express in one call.
- **Project templates (capability pack `templates` — `GET /v1/capability-packs/templates`)** — shipped documents a project can start from, by naming
  one in the create call.
- **Limits (capability pack `limits` — `GET /v1/capability-packs/limits`)** — the negative space. Verified backwards, so a lifted limit forces a
  rewrite instead of quietly becoming a lie.
- **Project provisioning (capability pack `project-provisioning` — `GET /v1/capability-packs/project-provisioning`)** — turn zero: creating a project, what the one
  call actually does (and what it does not seed), that the `id` it answers is the project's one
  id everywhere, and that a key reads that id and the project's `baseUrl` from `GET /v1/grant`.
- **Anatomy of a dynamic endpoint (capability pack `api-endpoints-anatomy` — `GET /v1/capability-packs/api-endpoints-anatomy`)** — read early. The full request
  lifecycle, and the resource that defines it.
- **Flows & actions (capability pack `flows-and-actions` — `GET /v1/capability-packs/flows-and-actions`)** — the main build target. Output binding, preview (which
  costs money **and writes records unless you pass `apply: false`**), what travels between actions,
  and the rule that a save succeeding is not a promise it will run.
- **Tables & types (capability pack `tables-and-types` — `GET /v1/capability-packs/tables-and-types`)** — shapes versus tables, the reserved names, and what a
  schema edit cascades into.
- **Vocabularies (capability pack `vocabularies` — `GET /v1/capability-packs/vocabularies`)** — classification against a resolvable vocabulary, and the path
  from resolving to committing terms.
- **Relations & links (capability pack `relations-and-links` — `GET /v1/capability-packs/relations-and-links`)** — typed record-to-record links: relations,
  pairings, the declaration that rides on the table, the surfaces links arrive on, and the multi-hop
  walk that does not exist.
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
- **Eval suites (capability pack `evals` — `GET /v1/capability-packs/evals`)** — the one place a flow's stored checks live: cases with assertions, a
  subject, and optional scorers, kept so runs compare. A suite with no scorers is a contract suite
  and asks "does this still work?"; scorer flows ask "is this any good?"
- **Project config (capability pack `project-config` — `GET /v1/capability-packs/project-config`)** — namespaced runtime tunables typed by a bound shape,
  readable by flows.
- **Embedding profiles (capability pack `embedding-profiles` — `GET /v1/capability-packs/embedding-profiles`)** — the one place a project's vector space is
  defined.
- **Credits and spend (capability pack `credits` — `GET /v1/capability-packs/credits`)** — the balance and the statement of charges, and the second gate a client
  that renders only `status` never sees.
- **Secrets (capability pack `secrets` — `GET /v1/capability-packs/secrets`)** — the node-scoped credential vault. Which tier's key pays the vendor,
  why disabling a secret defers upward instead of switching it off, why nothing reads a value
  back, and the request credential a `url.fetch` or `url.send` action names to call an outside API.

## True of every design resource

- **Address by node, or by the parent that owns you.** Most resources create and list by the
  project's **id**, and individual items are addressed by their own id — but a resource
  with a parent design object scopes by THAT instead: actions by their flow, checkpoints by their
  flow. Check the resource's own pack rather than assuming the node.
- **Two planes, two audiences.** The design plane is where a project is _authored_, on the api
  host. The dynamic plane is where a project's own users are _served_, on the project's own host —
  its `baseUrl`, read from `GET /v1/grant` or `GET /v1/projects/{nodeId}`. Do not reach for one
  from inside the other.
- **Optimistic locking.** A PATCH carries the `version` you last read, and a stale one is refused
  with a 409. It is REQUIRED wherever a resource's PATCH body accepts one — an omitted lock is not a
  lighter check, it is no check. ⚠️ Two caveats the flat rule hides: a resource that publishes a
  `version` on the read does not necessarily accept one on the write (sending it there is a 422,
  because bodies are closed), and a write to one row can move ANOTHER row's `version` — its answer
  names each such row, with the version it holds now, in `touched`. On a refusal,
  re-read and reconcile — or, where a resource offers an explicit force, use that deliberately
  rather than blind-retrying.
- **A 2xx is not a promise it will run correctly.** Saves return success even when wiring is still
  unresolved; only a resource's _blocking_ problems refuse the write. Nothing is stricter later:
  there is no activation step, and a flow with unresolved wiring still runs — wrongly. ⚠️ `outstandingIssues` is the flow
  plane's channel and does not appear on every save; elsewhere, re-read the resource asking for
  readiness.
- **Seeded rows cannot be DELETED.** Anything the platform seeded refuses a delete — but a PATCH is
  generally accepted, so "seeded" is not the same as read-only.
