# Glossary — the words that collide

Kipory reuses several ordinary words with a specific meaning, and a few of them mean the opposite of what a reader expects. When this file and a longer document disagree, the API's own field names win.

**Agent skill vs. step.** These files are _agent skills_ — instructions for a coding agent. Nothing in the API knows about them.

**Step vs. action.** A **step** is one part of a flow: a `key` and exactly one kind — an action, `if`, `each`, `repeat`, `parallel`, `try`, `return` or `fail`. An **action** is the kind of step that runs a function: `{key, function, with}`. A step's key (camelCase, unique in the flow) is also the name of its value: a later step reads `charge` or `charge.body.status`. A block (`if`, `each`, …) holds steps of its own, and only its declared `out` leaves it.

**Function vs. action.** A **function** is platform code from a registry (`GET /v1/functions`): `url.scrape`, `text.generate`, `record.create`. An action is your configured _use_ of one inside a flow, its settings in `with`. Functions have a catalog; steps have a flow.

**Flow.** A named list of steps with its own typed signature — `inputs` and `outputs`, maps by name. Steps run in the order written; a step can read only what a step above it gave, and the flow's outputs come only from a `return` step. `PUT /v1/flows/{id}/steps` writes the whole list; `POST /v1/flows/{id}/steps/edit` changes steps by key.

**Nothing vs. empty.** `null` and a missing value are _nothing_; `[]`, `""` and `{}` are values. A required read of a value that may be nothing is refused at save; at run, a step whose required input is missing fails with a typed error — nothing is skipped silently.

**Project vs. node.** A **project** is your product's container. It lives at a **node** in the ownership tree under an **organisation** node, and the node's id is the project's id — the one `POST /v1/projects` answers and every route takes (a bare cuid such as `cmukzzjhc0001hlq36d38bun1`; ids are opaque, so never tell them apart by prefix).

**Grant.** What an API key carries: one node and one role. Reach is descent from that node. A key never has a user, so it never has a `me`.

**Record vs. table.** A **table** is a kind of record — its type, owner scope, vocabularies, natural key, processing flow (`/v1/tables`). A **record** is one stored instance. Records are normally written by flows; the design API also writes one at a time (`POST /v1/records` and the item routes beside it) for an operator correcting what a flow produced.

**Type.** A named, reusable set of fields a table or a flow's input or output refers to. Builtin and library types are synthesized on read and have no rows.

**Search model.** What a table's search is indexed with: the embedding model and its vector space, whether keywords are indexed too, and the default chunking. It is the operator UI's word; the API spells it **embedding profile** — `/v1/embedding-profiles`, `vectors.profiles` in a project document, and `uses.search.profile` on a table, whose search indexes with the profile's live generation.

**Wallet.** The credit balance one payer holds: an organisation or a project, or — where a project turns member wallets on — one member in that project (`/v1/wallets`). A charge is a debit on the wallet that pays; grants, expiries and returns move credits between a project and its members.

**Member.** A person with a membership — a seat — on an organisation or a project (`/v1/nodes/{nodeId}/members`): a role there, and in a project with member wallets on, a wallet of their own. An API key is never a member.

**Each.** A block step that runs its steps once per element of a list, up to its own `maxItems` and the system ceiling. Its value is the list of each run's `out`, read as `<key>[].<name>`.

**Owner scope.** Whether a table's records belong to one end user each (per-user) or to the project's shared pool. A key's runs are project-owned and cannot write per-user records.

**Vocabulary vs. term.** A **vocabulary** is a classification kind — a namespace of terms. A **term** is one value in it. Terms are created through the vocabulary (`POST /v1/vocabularies/{id}/terms`, one or many) and renamed, archived, merged or deleted at `/v1/terms/{id}`.

**Relation vs. pairing vs. link.** A **relation** is the declared definition of a typed link between records; a **pairing** is one (tableA, tableB) pair the relation admits; a **link** is an actual instance joining two records. The link read walks one hop at a time; a record read can bring its linked records with it, two levels deep (`linked`).

**Event.** In the design API, an **event type** is a declared, emittable signal in a **category**, with a scope of `run`, `record`, `user` or `project`. It is unrelated to the charges statement's "credit events", to the run timeline's events, and to server-sent events on a stream.

**Dynamic endpoint vs. coded route.** A **coded route** is a `/v1/...` path the platform itself serves (`GET /v1/coded-routes`, with a key, lists them). A **dynamic endpoint** is one you author for your product, served on the project's host and backed by a flow. A coded route always wins a path collision, and its first path word is reserved whole: an endpoint under it is served only as far as that route group is (`kipory-expose`).

**Plane.** The design plane is where you author (api host). The dynamic, or project, plane is where your product's users are served (project host). The credit balance is a project-plane read. Each project's address on that plane is its `baseUrl` (`references/conventions.md`).

**Preview.** Of a flow: a full, billed run whose record writes apply unless `apply: false`. Of one step: `POST /v1/flows/{id}/steps/{key}/preview` — one billed model call against the step's prompt, not a flow run (`…/interpolate` renders the prompt for free).

**Checkpoint vs. snapshot.** A **checkpoint** is a named, manual or automatic copy of a flow's steps and signature that you can restore. A **flow snapshot** is the frozen graph a particular run executed, readable per run, never restorable.

**Run vs. trace vs. timeline.** A **run** is one execution, with one id whatever started it — an endpoint invocation, a record-processing attempt, a bare request. Its **timeline** is never sampled. Its **trace** holds what each step's value held, is sampled per project (a record or asynchronous run in which a step failed is always kept, unless the rate is 0), and expires.

**Contract suite vs. scorer.** A flow's stored checks are **eval suites**. A suite with no scorer flows is a **contract suite** and asks "does this still work" — stored inputs and pass/fail assertions, and every run says whether its `contract` held. **Scorer flows** on a suite ask "is this any good" — each case scored by a flow, a billed model call. There is no separate test-case resource.

**Secret.** A credential in the node-scoped vault, resolved nearest-wins up the ancestor chain, never read back: a vendor key a function reads, a request credential (`http_credential`) that a `url.fetch`, `url.fetch-as-file` or `url.send` step names in `secret`, or a sign-in client. Generation, embedding and transcription never use it; reranking (`text.rerank`) and `text.decide` do (`kipory-secrets`).

**Managed email address.** A sending identity attached to a node that the outbound mail step sends _as_. Not a mailbox the platform creates.

**Version.** Usually the optimistic-lock counter a PATCH must echo. On an embedding profile it is the lock too — the geometry number is `generation`. On a record it is the lock `PATCH /v1/records/{id}` presents; a run's write moves it too. On a document apply it is the project's. On the bootstrap it is a decimal string to compare as a big integer. On the function catalog and the capability packs it is a content hash.
