# Glossary — the words that collide

Kipory reuses several ordinary words with a specific meaning, and a few of them mean the opposite of what a reader expects. When this file and a longer document disagree, the API's own field names win.

**Agent skill vs. skill.** These files are _agent skills_ — instructions for a coding agent. In the API, a **skill** is one step of a flow: a row bound to a handler key with its config, the slots it reads and the slot it writes (`/v1/skills`). Nothing in the API knows about agent skills.

**Handler vs. skill.** A **handler** is platform code from a registry of about seventy entries (`GET /v1/handlers`): `url.scrape`, `text.generate`, `entity.create`. A **skill** is your configured _use_ of one inside a flow. Handlers have a catalog; skills have a flow.

**Flow.** A named group of skills with its own typed signature — input slots, output slots, and a binding that says which skill's output feeds each output slot. Execution order is derived from slot edges; there is no position field.

**Slot.** A named value in a run. A skill reads its `inputStreams` (slot names) and writes its `outputSlot`. Slot names are letters and digits only, starting with a letter — no underscores.

**Project vs. node.** A **project** is your product's container. It has a project id (`proj_…`) and lives at a **node** (`orgnode_…`) in the ownership tree under an **organisation** node. The design API scopes by node id; two sub-resources and the bridge route scope by project id. `GET /v1/projects/by-project-id/{projectId}` converts one to the other.

**Grant.** What an API key carries: one node and one role. Reach is descent from that node. A key never has a user, so it never has a `me`.

**Record vs. record type.** A **record type** is a kind of record — its shape, owner scope, facets, natural key, processing flow (`/v1/record-types`). A **record** is one stored instance. Records are written by flows, never by a coded route.

**Schema entry.** A reusable typed shape a record type or flow output refers to. Builtin and library shapes are synthesized on read and have no rows.

**Owner scope.** Whether a record type's records belong to one end user each (per-user) or to the project's shared pool. A key's runs are project-owned and cannot write per-user records.

**Facet vs. term.** A **facet** is a classification kind — a vocabulary namespace. A **term** is one value in it. Terms are written through the facet (`POST /v1/facets/{id}/terms`) or directly (`/v1/terms`).

**Relation kind vs. pairing vs. edge.** A **relation kind** is the vocabulary entry for a typed link between records; a **pairing** is one (typeA, typeB) pair the kind admits; an **edge** is an actual link between two records. Edges are read one hop at a time.

**Event.** In the design API, an **event type** is a declared, emittable signal in a **category**, with a scope of `run`, `record`, `user` or `project`. It is unrelated to the spend ledger's "credit events", to the run step log's events, and to server-sent events on a stream.

**Dynamic endpoint vs. coded route.** A **coded route** is a `/v1/...` path the platform itself serves (`GET /v1/coded-routes` lists them). A **dynamic endpoint** is one you author for your product, served on the project's host and backed by a flow. A coded route always wins a path collision.

**Plane.** The design plane is where you author (api host). The dynamic, or project, plane is where your product's users are served (project host). The credit balance is a project-plane read.

**Preview.** Of a flow: a full, billed run whose record writes apply unless `apply: false`. Also the name of four unrelated read-only calls: `contract-preview` and `write-preview` on a record type, `restore-preview` on a checkpoint, `deletion-preview` on a project or member, `rename-preview` on a skill slot, and `POST /v1/skills/preview` — one model call against a prompt template, not a flow run.

**Checkpoint vs. snapshot.** A **checkpoint** is a named, manual or automatic copy of a flow's skills, signature and binding that you can restore. A **flow snapshot** is the frozen graph a particular run executed, readable per run, never restorable.

**Run vs. trace vs. step log.** A **run** is one execution, with one id whatever started it — an endpoint invocation, a record-processing attempt, a bare request. Its **step log** is never sampled. Its **trace** holds what each output slot held, is sampled per project, and expires.

**Test case vs. eval.** A **flow test case** asks "does this still work" — stored inputs and pass/fail assertions. An **eval suite** asks "is this any good" — cases scored by scorer flows, which are billed model calls. The assertion vocabulary is shared.

**Secret.** A vendor credential in the node-scoped vault, resolved nearest-wins up the ancestor chain, never read back. Model calls do not use it.

**Managed email address.** A sending identity attached to a node that the outbound mail step sends _as_. Not a mailbox the platform creates.

**Version.** Usually the optimistic-lock counter a PATCH must echo. On an embedding profile it is the geometry generation. On a record it is a database-owned counter with no PATCH. On the bootstrap it is a decimal string to compare as a big integer. On the handler catalog and the capability packs it is a content hash.
