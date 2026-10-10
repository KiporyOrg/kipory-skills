<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Limits

> **Source of truth for facts:** the function catalog (`GET /v1/functions`) and the live
> `GET /v1/openapi.json`. This pack states what is absent from them.

## What it is

The negative space. Every other pack tells you what you can build; this one tells you what you
cannot, so a plan routes around it early instead of discovering it halfway through the build.

## When you need it

At two moments, both during planning:

- **Deciding how a pipeline decomposes.** Before assuming a function exists for each part, check that its shape is
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
an object, generate text, stream an object, embed, transcribe, rerank, and decide (a typed pick
or a probability) — and none of them accepts a tool set.

**Why this is structural rather than a gap nobody filled.** Every model call in the platform goes
through a single chokepoint that no project code can reach around. A tool loop therefore cannot
be added _around_ the platform by any project; it could only ever be added as a new capability of
the platform itself.

**What this means for your design.** Every branch in a flow is authored by you, in advance. A flow
cannot decide its own next action at runtime. When an idea's shape is "the AI works out what to do",
it decomposes one of two ways:

1. **A fixed pipeline** — the actions were always knowable, and the AI's judgment is needed inside a
   action rather than between actions.
2. **A classification action feeding a pre-authored branch** — the model chooses a _label_ (a
   `text.decide` action is built for this), and your flow chooses what to run for that label. The model's judgment is real; the control flow is
   still yours.

Almost every "agentic" idea is the second shape once it is written down, and the second shape is
also the one you can test.

### Wiring cannot read the clock or roll a die

<!-- absent: jsonata-is-deterministic -->

**What is absent.** The expression sandbox that wires one action's output into the next blocks
`$now`, `$millis`, `$random` and `$shuffle` — the complete set of ways an expression could return
a different answer for identical input. (`$eval` is blocked too, as a sandbox escape.)

<!-- field-ok: runInfo — a provider SLOT name the platform fills, not a request field -->

**What this means for your design.** "Stamp the current time" and "pick one at random" are not
wiring concerns. They have to enter a flow as an action's output or as a flow input, where they are
visible values rather than hidden ones. The time already does: `runInfo.now` is the run's own
clock, an ISO 8601 timestamp taken when the run starts and replayed unchanged on a retry. Read it
as an input (`runInfo` in an action's inputs) and compute with it in the expression.

**This is usually the feature, not the obstacle.** It is exactly what makes a stored eval case
meaningful: run the same input twice and the wiring contributes the same answer both times, so any
difference you see came from the part you were actually testing.

### What a flow can reach

A flow reaches the outside world only through functions, and the catalog is the whole list. Check
these before a plan promises an integration.

**A vendor with its own function, or any service with an HTTP API.** The catalog
(`GET /v1/functions`) has a function for the vendors the platform reads on your behalf. A service
without one is reached by a keyed request: `url.fetch` and `url.fetch-as-file` read, and
`url.send` writes — each takes query parameters, headers, a body and a stored credential named in
the action's `secret`: the key is stored as an `http_credential` secret and the action names its
purpose. So "call our CRM" or "post to a chat tool" is configuration when the service has an HTTP
API and a key you can store.

**What a keyed request cannot do.** A read may be sent more than once and is answered from a
cache, so a POST through `url.fetch` must change nothing. `url.send` is staged once per run and
delivered after the run has saved everything else. A transient failure (no answer, a 5xx, a 429)
is retried for about ten minutes with the same `Idempotency-Key` header, so the receiving system
may see a request twice; a 3xx or 4xx is final. The flow never sees the answer and no read
reports whether the delivery happened — so a write whose result the flow needs is out of reach.
So is a request the platform would have to sign, or exchange a token for. An address that
resolves to a private network is refused. In a preview or an eval run a `url.send` action fails
rather than sending.

<!-- absent: email-is-the-only-outbound-handler -->

**Email is the only built-in channel.** `email.send` is the one function that delivers a message to
a person. There is no SMS, push-notification or chat function; a service that sends those through
an HTTP API is reached with `url.send` and a stored key. A client that must be told something
subscribes to the project's events through an endpoint, or polls one.

**An endpoint answers JSON or server-sent events — never a page.** A flow cannot serve HTML, an
image or a file at a URL of the project. A file a flow produced is handed out as a signed
download link that the caller then fetches: `file.download-url` in a flow (its link does not
expire unless the action sets `neverExpires: false`; it then lasts `ttlSeconds`, 5 minutes by
default and 7 days at most), or
`GET /v1/files/{id}/download-url` over the API (15 minutes for a project's file read with a key).
Anything a browser should render is the client's to build from the JSON.

<!-- absent: no-feed-handler -->

**There is no feed reader.** No function parses RSS or Atom. The route is two actions: `url.fetch`
returns the feed as text, and a `text.extract` action pulls the items out with a regular expression
(a `value.transform` expression with `$match` does the same). Identify each item by its link
rather than by the feed's own item id, which is not always stable between fetches. A `key` use on
the link field does not make a re-poll update the item: an item whose data changed under a held
key is refused `RECORD_NATURAL_KEY_TAKEN` and the whole run writes nothing. There is no upsert
function — look the link up first, then create or update.

### How much a run carries, and what happens at the edge

Sizes are counted in characters, not bytes: a text by its length, a list or an object by the
length of its JSON. Most of these do not fail the run — they cut, warn, and close `succeeded` —
so design for them rather than waiting to meet them.

| Limit                                        | Value                                                  | At the limit                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One slot                                     | 500,000 characters (unless the deployment set another) | A text keeps its head and ends in `[TRUNCATED]`, cut wherever the count falls. A list loses elements from its tail. A cut text or list warns `slot-truncated` and the run still succeeds. An object or a file cannot be cut, so its action **fails**, with both sizes in the timeline; return less, or a list |
| All inputs of one `value.transform` together | 1,000,000 characters of JSON                           | The action fails. JSON escapes quotes and line breaks, so two slots near the slot cap — or a page beside its own chunks — pass it                                                                                                                                                                             |
| One `value.transform` expression             | 1,000 parts                                            | Refused at save                                                                                                                                                                                                                                                                                               |
| A page from `record.list` or `record.query`  | 100 rows                                               | The page carries `nextCursor` when more rows exist; an absent `nextCursor` is the only statement that the list is complete                                                                                                                                                                                    |
| `record.read`, `record.delete`               | 200 ids                                                | The action fails. Below it, an id that does not resolve is left out of the list silently                                                                                                                                                                                                                      |
| `flow.fan-out`                               | `maxItems`, 20 unless set, 100 at most                 | The items after the limit are not processed. The run warns `fan-out-capped` with how many were handed and how many ran, and still succeeds                                                                                                                                                                    |
| The timeline of one run                      | 10,000 rows, and 200 warnings beside them              | `truncated: true` on the log; later rows were never recorded                                                                                                                                                                                                                                                  |
| A warning's or a failure's message           | 500 characters                                         | Cut                                                                                                                                                                                                                                                                                                           |

A run that hit one of the cutting limits reads `succeeded`. Its warnings are `action-warned` rows
in `GET /v1/runs/{runId}/timeline`, counted by kind under `warnings` in the run's `closing`; a flow cannot read a
warning — an action downstream sees only what was stored. Where a cut would be wrong for the
product, cut deliberately first: bound the text in a transform and mark the record, page the
list, or fan out in batches.

---

## What is NOT a limit

Things believed absent that are present.

<!-- present: keyed-outbound-request-exists -->

- **Reaching a vendor that has no function.** A keyed request does it — `url.fetch`,
  `url.fetch-as-file` or `url.send` with a stored credential: see What a flow can reach, above.

<!-- present: facet-delete-has-an-affordance -->

- **Deleting a vocabulary.** `DELETE /v1/vocabularies/{id}` exists; ask it with `?validateOnly=true`
  first for what the delete would take with it.

## Related

- Planning protocol (capability pack `planning-protocol` — `GET /v1/capability-packs/planning-protocol`) — where in the walk to read this pack.
