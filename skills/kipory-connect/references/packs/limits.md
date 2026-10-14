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
resolves to a private network is refused. In a preview or an eval run a `url.send` action checks
the request and answers `true` with a `PREVIEWED_NOT_SENT` warning, sending nothing.

<!-- absent: email-and-push-are-the-only-outbound-senders -->

**Email and push are the built-in channels.** `email.send` delivers a message to a person's inbox
and `push.send` a notification to the devices their app registered, with the project's own Apple
and Google keys. There is no SMS or chat function; a service that sends those through an HTTP API
is reached with `url.send` and a stored key. A client that must be told something subscribes to the
project's events through an endpoint, or polls one.

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

<!-- limits-catalog:start:run-carries -->

| Limit                                                                 | Value                                                                                     | At the limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Key                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| One slot                                                              | 500,000 characters per action (unless Kipory set another)                                 | Sizes are counted in characters, a list or an object by the length of its JSON. A text keeps its head and ends in `[TRUNCATED]`, cut wherever the count falls; a cut text warns `slot-truncated` and the run still succeeds. A list fails its action, unless the action says `onOversize: "cut"`, when it loses elements from its tail and warns. An action with `onOversize: "fail"` fails on a text too, and one that says `"cut"` and names a `failureSlot` gets `value-cut` there when it was cut. An object or a file cannot be cut, so its action fails — a `flow.invoke` call whose flow returns one included — with both sizes in the timeline; return less, or return a list and set `onOversize: "cut"`. From half the limit such a value warns `slot-near-limit`, and saving an action, or reading a flow's health, warns `READ_PAGE_MAY_EXCEED_SLOT` when a page of the table's large records would pass it. | `runs.slot-characters`                |
| All inputs of one `value.transform` together                          | 1,000,000 characters per action                                                           | The action fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `runs.transform-input-characters`     |
| One `value.transform` expression                                      | 1,000 parts per action                                                                    | Refused at save.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `runs.transform-expression-parts`     |
| A page from `record.list` or `record.query`                           | 100 rows per action                                                                       | The page carries `nextCursor` when more rows exist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `runs.record-page-rows`               |
| `record.read`, `record.delete`                                        | 200 ids per action                                                                        | The action fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `runs.record-ids-per-action`          |
| Items one `flow.fan-out` may hand on                                  | 100 items per action (unless Kipory set another) — `maxItems`, 20 unless set              | The items after the limit are not processed; the run warns `fan-out-capped` and still succeeds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `runs.fan-out-items`                  |
| The timeline of one run                                               | 10,000 events per run (unless Kipory set another)                                         | Later rows are not recorded; the log reads `truncated: true`. Warnings have 200 rows of their own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `runs.action-events`                  |
| Changes one run may stage                                             | 10,000 changes per run (unless Kipory set another)                                        | The action that stages past it fails, naming the limit, and nothing the run staged is written; a run whose changes pass it when applied fails `CHANGE_SET_BOUND_EXCEEDED`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `runs.change-set-effects`             |
| Size of the changes one run may stage                                 | 32 MB per run (unless Kipory set another)                                                 | The action that stages past it fails, naming the limit, and nothing the run staged is written.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `runs.change-set-bytes`               |
| Actions run in a flow that has a loop                                 | 5,000 executions per run (unless Kipory set another)                                      | The run fails. A flow with no loop has no such count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `runs.action-executions-per-item`     |
| Flows calling flows                                                   | 5 levels per run (unless Kipory set another)                                              | Refused at save, naming the depth; at run time the calling action fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `runs.flow-invoke-depth`              |
| Iterations one `flow.loop` may run                                    | 50 iterations per action (unless Kipory set another)                                      | A loop's `maxIterations` above it is refused at save; at run time the loop stops there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `runs.loop-iterations`                |
| Time one run waits for function rate limits, all its actions together | 30 seconds per run (unless Kipory set another)                                            | Past it the waiting action fails as rate limited.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `runs.rate-limit-wait-ms`             |
| Files given to one model call                                         | 24 files per action                                                                       | The action fails, naming the count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `functions.files-per-model-call`      |
| Files given to one model call, together                               | 100 MB per action                                                                         | The action fails, naming the size.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `functions.file-bytes-per-model-call` |
| A value rendered as JSON into a prompt                                | 64 KB per action                                                                          | The action fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `runs.json-in-prompt-bytes`           |
| A request `url.fetch` or `url.send` sends                             | 1 MB per action — the body; 32 headers and 32 query values, each at most 4,096 characters | The action fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `functions.request-body-bytes`        |
| Text of one field indexed for search                                  | 200 parts per action — at the field's part size                                           | The rest is kept on the record but not searchable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `functions.indexed-parts-per-field`   |
| A warning's or a failure's message                                    | 500 characters per action                                                                 | Cut.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `runs.message-characters`             |
| One event's payload                                                   | 256 KB per action                                                                         | The action fails `EVENT_PAYLOAD_TOO_LARGE`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `runs.event-payload-bytes`            |

<!-- limits-catalog:end:run-carries -->

A run that hit one of the cutting limits reads `succeeded`. Its warnings are `action-warned` rows
in `GET /v1/runs/{runId}/timeline`, counted by kind under `warnings` in the run's `closing`; a flow cannot read a
warning — an action downstream sees only what was stored. Where a cut would be wrong for the
product, cut deliberately first: bound the text in a transform and mark the record, page the
list, or fan out in batches.

### How often a credential may call the API

Calls are counted per minute, per credential, apart from what a run spends. A key Kipory
set its own number for counts at that number.

<!-- limits-catalog:start:credentials -->

| Limit                                                             | Value                                                                 | At the limit                                                                                                          | Key                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Calls one API key makes                                           | 1,200 requests a minute per key (unless Kipory set another)           | Past it a call answers 429 `RATE_LIMITED`; Kipory may set another number for one key.                                 | `api.key-requests-per-minute`                      |
| Calls one signed-in person makes                                  | 1,200 requests a minute per person (unless Kipory set another)        | Past it a call answers 429 `RATE_LIMITED`.                                                                            | `api.session-requests-per-minute`                  |
| Reads of your own account (`/v1/me*`, `/v1/credits*`)             | 1,200 requests a minute per person (unless Kipory set another)        | Past it a call answers 429 `RATE_LIMITED`.                                                                            | `api.account-reads-per-minute`                     |
| Calls to the sign-in routes (`/v1/auth/*`)                        | 20 requests a minute per network address (unless Kipory set another)  | Counted per network address; past it a call answers 429 `RATE_LIMITED`.                                               | `api.sign-in-requests-per-minute`                  |
| Reads of a stored file's link (`/v1/files/raw/*`)                 | 600 requests a minute per network address (unless Kipory set another) | Counted per network address; past it a call answers 429 `RATE_LIMITED`.                                               | `api.file-link-requests-per-minute`                |
| Calls one network address makes to the project's public endpoints | 20 requests a minute per network address (unless Kipory set another)  | Past it a call answers 429 `RATE_LIMITED` with `details.scope: "caller"`; an endpoint's own `publicRpm` may be lower. | `endpoints.public-requests-per-minute-per-address` |

<!-- limits-catalog:end:credentials -->

Every answer says where the caller stands in its `x-ratelimit-*` headers: the limit, how many
calls remain, and the seconds until the count resets. Read them and slow down before the ceiling,
not after it.

Past the ceiling a call answers 429 `RATE_LIMITED`. Its `details` carry `limitKey` (the limit's
key), `limit`, `windowMs` (what
is left of the minute) and `retryAfterSeconds`, and the response headers say the same: when to retry, how many calls remain
and when the count resets. Nothing was run and nothing is charged: wait the
seconds it names and send the call again. Two scripts sharing one key share one count, so a backfill
that reads a record a call meets it first: read a page with `GET /v1/records`, or write many with
`POST /v1/records/bulk`.

### How much one project's endpoints take, all callers together

The ceilings above are per credential. These bound a project's own endpoints as a whole, however
many keys and people call them.

<!-- limits-catalog:start:endpoints -->

| Limit                                                         | Value                                                           | At the limit                                                                                                                                                     | Key                                    |
| ------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Calls to the project's endpoints, all callers together        | 3,000 requests a minute per project (unless Kipory set another) | Past it a call answers 429 `RATE_LIMITED` with `details.scope: "project"`.                                                                                       | `endpoints.requests-per-minute`        |
| Calls to the project's endpoints running at once              | 32 requests on each api process (unless Kipory set another)     | Counted on each api process. Past it a call answers 429 `PROJECT_CONCURRENCY_EXCEEDED`, `retryAfterSeconds: 1`; a synchronous run holds its place until it ends. | `endpoints.requests-at-once`           |
| Calls to the project's public endpoints, all callers together | 600 requests a minute per project (unless Kipory set another)   | Past it a call answers 429 `RATE_LIMITED` with `details.scope: "project"`.                                                                                       | `endpoints.public-requests-per-minute` |
| Public calls running at once                                  | 10 requests on each api process (unless Kipory set another)     | Counted on each api process; one network address may hold a third of them. Past it a call answers 429 `PROJECT_CONCURRENCY_EXCEEDED`.                            | `endpoints.public-requests-at-once`    |
| Streams open at once on the project                           | 1,000 streams on each api process (unless Kipory set another)   | Counted on each api process. Past it a stream answers 429 `PROJECT_CONCURRENCY_EXCEEDED`.                                                                        | `endpoints.streams-at-once`            |
| Any request body                                              | 5 MB per endpoint                                               | Past it a call answers 413 `PAYLOAD_TOO_LARGE`.                                                                                                                  | `api.request-body-bytes`               |
| A public endpoint's request body                              | 256 KB per endpoint (unless Kipory set another)                 | Past it a call answers 413 `PAYLOAD_TOO_LARGE`.                                                                                                                  | `endpoints.public-body-bytes`          |

<!-- limits-catalog:end:endpoints -->

### How fast a function may call its vendor

A function that calls a vendor declares a rate limit, on its page and as `rateLimit` on
`GET /v1/functions`: `max` calls per window, in a named `bucket` that several functions may share.

- **Each project has its own count.** Another project's calls never spend yours.
- **`max` is the platform's number in force**, and `defaultMax` the one the function declares.
  Kipory may set another for the platform, your organization or your project; your project's own
  is the `functions.<bucket>.calls-per-window` entry of `GET /v1/projects/{nodeId}/limits`.
- **A call past the limit waits, it does not fail at once.** A queued action is delayed and tried
  again for as long as its function waits (the `Queue` line on its page). An action that runs in
  place waits up to `runs.rate-limit-wait-per-action-ms`, and one run waits up to
  `runs.rate-limit-wait-ms` in all across its actions (both in the table above); past either the
  action fails as rate limited.
- **Embeddings made while your records are indexed are not counted** against any of these.

### How long things are kept, and what is counted per project

<!-- limits-catalog:start:kept-for -->

| Limit                                                        | Value                                                               | At the limit                                                                                                                              | Key                             |
| ------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| A run's history                                              | 90 days (unless Kipory set another)                                 | Its timeline, what it changed, the failed-runs list, its mail records and a finished call's stored input and output are deleted after it. | `kept-for.run-history-days`     |
| A trace                                                      | 7 days (unless Kipory set another)                                  | What each action's output held; deleted after it.                                                                                         | `kept-for.trace-days`           |
| Record runs a trace is recorded for                          | 10% of them per project (unless Kipory set another)                 | Kipory may set another rate for one project; previews and evals are always traced.                                                        | `kept-for.record-runs-traced`   |
| Endpoint runs a trace is recorded for                        | 50% of them per project (unless Kipory set another)                 | Kipory may set another rate for one project; previews and evals are always traced.                                                        | `kept-for.request-runs-traced`  |
| A saved function result nobody reads                         | 14 days (unless Kipory set another)                                 | Dropped after it; the next call computes it again and is charged again.                                                                   | `kept-for.saved-results-days`   |
| Model calls Kipory spends writing the project's descriptions | 1,500 calls in any 24 hours per project (unless Kipory set another) | Counted over the last 24 hours; past it descriptions wait.                                                                                | `design.descriptions-per-day`   |
| Sources the project watches, per provider                    | 200 sources per project (unless Kipory set another)                 | A run that would watch one more is refused `SOURCE_WATCH_CAP` and writes nothing.                                                         | `sources.watched-per-provider`  |
| A retired project                                            | 30 days                                                             | Deleted for good after it.                                                                                                                | `kept-for.retired-project-days` |

<!-- limits-catalog:end:kept-for -->

### Mail, pushes and runs started per person

`email.send` stages a message to a person's inbox, `push.send` notifies people on the devices
their app registered, and `flow.start-per-person` runs a flow once for each person, as that
person, on the project's bill.

<!-- limits-catalog:start:mail-and-push -->

| Limit                                     | Value                                                                                                              | At the limit                                                                                                                                       | Key                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Messages the project stages a UTC day     | 200 messages a UTC day per project (unless Kipory set another)                                                     | Past it `email.send` fails with reason `project-mail-cap-reached`.                                                                                 | `mail.messages-per-day`           |
| People one `push.send` names              | 1,000 people per action (unless Kipory set another)                                                                | The action fails `PUSH_RECIPIENTS_TOO_MANY`, in a preview too.                                                                                     | `push.recipients-per-send`        |
| Device deliveries per project per UTC day | 50,000 pushes a UTC day per project (unless Kipory set another)                                                    | Checked when the action runs; past it the action fails with reason `project-push-cap-reached`, and a device past it is logged `projectCapReached`. | `push.deliveries-per-day`         |
| Alert pushes one person receives an hour  | 10 pushes an hour per person (unless Kipory set another)                                                           | The excess is dropped and logged `personRateLimited`; background pushes do not count.                                                              | `push.alerts-per-person-per-hour` |
| Devices one person registers per project  | 10 devices per person (unless Kipory set another)                                                                  | The least recently seen is removed.                                                                                                                | `push.devices-per-person`         |
| One rendered push                         | 4 KB per action                                                                                                    | The action fails, naming the size and the limit, in a preview too.                                                                                 | `push.rendered-bytes`             |
| People one `flow.start-per-person` starts | 10,000 people per action (unless Kipory set another)                                                               | The action fails `PEOPLE_SET_TOO_LARGE` and starts nobody.                                                                                         | `runs.people-per-start`           |
| Runs started per person running at once   | the project's queued runs at once (half the worker's job slots unless set) per project (unless Kipory set another) | The rest wait their turn; they never take the slots of the project's other runs.                                                                   | `runs.started-at-once`            |

<!-- limits-catalog:end:mail-and-push -->

What each push did, per device, is `GET /v1/pushes?project={nodeId}`, kept 30 days. A started run
whose person has left the project by the time it runs ends `NOT_A_MEMBER` and is not charged.

### Every limit of your project, in one read

`GET /v1/projects/{nodeId}/limits` answers every limit the project meets: `applied` is the number
in force for this project, `default` the standard before Kipory sets another (`defaultDerived` says how, when the platform computes it), `setAt` says where Kipory set another, and
where the platform counts it, `used` is how much is used now and `resetsAt` when the count starts
again. A limit nothing counts has no `used` at all, never 0. Each limit has a stable `key`, and a
refusal at it names that key as `details.limitKey` — on the error of a refused call and on the
`closing` of a run that failed at it — so a caller can look the limit up instead of guessing.

Only Kipory changes a limit's number, for the whole platform, an organization or one project. To
ask for more, name the `key` and say why.

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
