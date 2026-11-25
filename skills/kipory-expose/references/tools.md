# Tools — a flow an AI app calls

<!-- field-ok: structuredContent — a Model Context Protocol result field, not a Kipory request field -->
<!-- field-ok: isError — a Model Context Protocol result field -->
<!-- field-ok: inputSchema — a Model Context Protocol listing field -->
<!-- field-ok: outputSchema — a Model Context Protocol listing field -->
<!-- field-ok: readOnlyHint — a Model Context Protocol annotation -->
<!-- field-ok: ttlMs — a Model Context Protocol list field -->
<!-- field-ok: bookId — the example's own input -->
<!-- field-ok: reservationId — the example's own output -->

An endpoint puts a flow on HTTP for a client that already knows its contract. A **tool** offers a flow to an AI app — Claude, ChatGPT, a coding agent — which asks the project what tools exist, reads each one's name, description and schema, and decides by itself when to call one. The protocol is the Model Context Protocol, served at one address per project: `POST <project host>/mcp`. A tool is its own row beside the endpoints, not a line on one: it needs no route, a flow can be a tool, an endpoint, both or neither, and nothing of HTTP (path, query, headers) reaches a tool.

## The `tools` section

Each key is the tool's name to AI apps: a lowercase letter, then up to 63 lowercase letters, digits, `-` and `_`. A key left bare is the flow of the same key. A row may state:

| Field         | What it does                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `flow`        | the key of the flow it runs; left out, the flow whose key is the tool's key                                                               |
| `title`       | a short name an app may show, up to 80 characters                                                                                         |
| `description` | what the tool does, as the app reads it to decide when to call it, up to 1,024 characters; left out, the flow's own description is listed |
| `auth`        | `required` (the default): a key or a signed-in person; `none`: anyone, with no credential (below)                                         |
| `publicRpm`   | only with `auth: none`: calls a minute the tool accepts from all callers together                                                         |

A tool binds no inputs: the app sends the flow's own inputs by name, so there is nothing to map. A complete document that offers a small library's flows to AI apps — one public search, one signed-in reservation:

```yaml
kipory: 13
types:
  Book:
    type: object
    required: [title, author]
    properties:
      title: { type: string, minLength: 1, maxLength: 200 }
      author: { type: string, minLength: 1, maxLength: 200 }
  Reservation:
    type: object
    required: [bookId]
    properties:
      bookId: { type: string, maxLength: 64 }
tables:
  book:
    owner: project
    type: Book
    uses:
      filter: [author]
  reservation:
    owner: user
    type: Reservation
flows:
  find-books:
    label: Find books
    description: Find books in the catalogue by their author's full name.
    inputs:
      author:
        {
          type: string,
          description: "The author's full name, as printed on the cover.",
        }
    outputs: { books: object }
    steps:
      - key: found
        function: record.query
        with:
          table: book
          clauses: [{ kind: field, field: author, op: eq, value: author }]
          limit: 20
          pages: { max: 1, onMore: stop }
      - key: done
        return: { books: found }
  reserve-book:
    label: Reserve a book
    description: Hold a book for the signed-in reader and answer the reservation's id.
    caller: user
    inputs:
      bookId:
        {
          type: string,
          description: "The id of the book to hold, as find-books answers it.",
        }
    outputs: { reservationId: string }
    serialize: { key: [bookId] }
    steps:
      - key: book
        function: record.read
        with: { table: book, ids: { expr: "[bookId]" }, failIfEmpty: true }
      - key: save
        function: record.create
        with: { table: reservation, fields: { bookId: bookId } }
      - key: done
        return: { reservationId: save.recordId }
endpoints:
  find-books: { GET: /v1/library/books, flow: find-books }
tools:
  find-books:
  reserve-book:
    title: Reserve a book
  catalogue:
    flow: find-books
    description: Search the library's catalogue by author. Anyone may call it.
    auth: none
    publicRpm: 30
```

Plan it as an admin of the project: `catalogue` makes a flow public that runs `record.query`, a paid read, and that needs ADMIN (below); an editor's plan carries `PUBLIC_TOOL_NEEDS_ADMIN`. The plan refuses a tool whose flow does not exist (`TOOL_FLOW_UNKNOWN`, at `tools.<key>.flow`), whose flow has a required `internal` input no app could send (`TOOL_FLOW_NOT_CALLABLE` — a later change to the flow that gives it one is refused with the same code while a tool runs it), a tool keyed `prune` (under `tools`, `prune: true` removes every tool the document does not name), `publicRpm` without `auth: none` (`TOOL_CONFIG_INVALID`), and more tools than the project's limit (50 by default, `TOOL_LIMIT_REACHED`). It warns `TOOL_NOT_DESCRIBED` when neither the row nor its flow has a description. A flow a tool names cannot be deleted while the tool stands: the tool counts among its dependents. Row by row, the same rows are `GET /v1/mcp-tools?project=`, `POST /v1/mcp-tools`, `GET /v1/mcp-tools/{id}`, `PATCH /v1/mcp-tools/{id}` (with `version`) and `DELETE /v1/mcp-tools/{id}`; each read carries `invokeUrl`, the project's `/mcp` address, and `access`: whether its flow needs a signed-in person, is public, spends, and changes data. The row routes also carry `lastUsedAt`, when a run last started from the tool: it is `null` until such a run is among the project's newest 5,000 tool runs, and `lastUsedMeasured: false` means the read ran out of time, not that the tool was never used.

## What an AI app is shown — and why the words now matter

`tools/list` answers, per tool: its name, its `title`, a description (the row's, else the flow's), an `inputSchema` built from the flow's inputs a caller may set (never an `internal` one), an `outputSchema` from its outputs, and a mark — read-only, or may change data — derived from the flow as an endpoint's write check derives it. Each input and output carries its own `description`; a value with none carries its type's (a bare `string` reads "Builtin scalar — any string.").

The model never sees your steps. It picks a tool by the description and fills each input by that input's description, so these words ARE the tool's interface: say what the flow does, when to use it and what it answers, and give every input a description that says what to send and in what form ("YYYY-MM-DD", "as find-books answers it"). Rewording a description is safe at any time: it is never part of the contract callers are checked against. The list holds only the tools the caller may call, sorted by name, with `ttlMs`, how long an app may keep it. `./kipory tools` prints it as an app sees it.

## How an AI app connects

The address is the project host plus `/mcp` (`invokeUrl` on the tool's read). The server speaks the protocol's revision 2026-07-28 and the one before it (2025-11-25, with its opening handshake) on the same address, answers JSON only, and keeps no session.

- **With a project API key** — coding agents and tools that take a header, and the model providers' API connectors. The key goes in `Authorization: Bearer`, with the reach and role it has on `/v1`. A key has no person: a tool whose flow needs a signed-in person (`caller: user`, or reads or writes people's records) is not listed for a key, and a VIEWER key is listed no tool whose flow changes data. In the example, a key sees `find-books` and `catalogue`, never `reserve-book`.
- **As a signed-in person** — claude.ai and ChatGPT, which take no key. The person adds the address in the app. When the project has no public tool, the app's first request — its handshake or its `tools/list` — gets `401` naming the project's sign-in documents (`/.well-known/oauth-protected-resource/mcp`), and the app starts sign-in; the project host is its own sign-in server. When the project has a public tool, a caller with no credential is answered `200` and listed the public tools, and the `401` comes only on a call of another tool: an app that never makes that call never starts sign-in, so connect it by its own "sign in" control. The person signs in in a browser with a provider the project offers there — Google today; Apple has no browser sign-in (`references/sign-in.md`), so a project that offers Apple only cannot connect an app as a person — and approves on one Kipory page that names the project, the app's host and where the app returns to — a web host, or a desktop app's own scheme such as `cursor://`, which the page warns about, as any program on the computer can claim it; the app is named by its address, and there is no registering an app by hand. The app then holds a token that acts as that person in that project and nowhere else — not at another project's `/mcp`, not on `/v1`. It is listed what the person's role allows, the person-only tools included; each run is the person's, as their endpoint call would be. People see and remove their apps in their account; `GET /v1/projects/{nodeId}/connected-apps` says how many are connected to a project. `GET /v1/projects/{nodeId}/connected-apps/decisions` lists who approved, declined or removed an app, and each request the sign-in server refused, newest first; walk it with `after`.
- **With nothing** — only the tools stated `auth: none`. A project with none answers such a caller's handshake and list `401`, never an empty list. A public tool whose flow came to need a signed-in person (it now reads people's records, say) is listed for no one, a signed-in person included: a public tool always runs with no user, so every call would be refused. Change the flow, or set the tool to `auth: required`.

A test user's session is not accepted at `/mcp`: try a person-only flow through its endpoint with `kipory call <user>`, or `kipory preview <flow> --as <user>`.

## A public tool, and what it costs

`auth: none` makes a tool callable by anyone who has the address, with no credential. It carries everything a public endpoint carries (`references/pitfalls.md`, "An endpoint is public only when you say so"): its flow may not need a signed-in person (`PUBLIC_TOOL_NEEDS_USER`); the plan warns what a stranger can do through it (`PUBLIC_TOOL_SPENDS`, `PUBLIC_TOOL_WRITES`, `PUBLIC_TOOL_NAMES_PERSON`, `PUBLIC_TOOL_READS_PEOPLE`, `PUBLIC_TOOL_ACTS_FOR_PROJECT`); making one public whose flow reaches a paid step — a model, a metered vendor, a record query — needs ADMIN (`PUBLIC_TOOL_NEEDS_ADMIN`), and so does a later change to its flow that would make it start to spend, exactly as for a public endpoint; its flow cannot gain `caller: user` while the tool is public; the run has no user and the project pays for it; and calls are bounded by `publicRpm` and the project's daily public spend cap, `project.credits.publicEndpointsLimit: { credits, per: day }` — shared with the public endpoints, unlimited until you set it.

⚠️ An AI app calls tools on its own judgment, many times in one conversation, and any app that learns the address can call a public tool. Set the daily cap before publishing one that spends.

## A call, its answer and its refusals

`tools/call` with `{ name, arguments }`: the arguments are checked against the input schema and become the flow's inputs. A call **always waits** for its run, up to 30 seconds — there is no background tool call — and passes the same checks an endpoint call passes: the role against whether the flow writes, the signed-in person, the project's rate and admission limits, credits and suspension. It takes the flow's one-at-a-time line like any waiting call (below).

It answers the flow's own outputs as `structuredContent` — never an endpoint's declared answer, so an endpoint and a tool on one flow can answer in different shapes — with the run's id and the credits charged in `_meta` (`com.kipory/runId`, `com.kipory/creditsCharged`; a public call shows no charge). The run is listed in the project's runs as started by the tool, naming it. A call with a key or as a person honours an `Idempotency-Key` header as an endpoint call does (`references/consumer.md`, Headers worth knowing): a retry under the same key charges and writes once, whatever JSON-RPC `id` it is sent under; the same key with other arguments is refused `IDEMPOTENCY_KEY_REUSED`. A public tool's call ignores it, as a public endpoint does.

A refusal is a **tool error**: `isError: true` and one text block the model reads, `CODE: message` (and, when the refusal has details, a second line holding them as JSON). The code, message and details are the ones the endpoint's error body would carry for the same refusal, so a client branches on one code whichever door it used; they are in `_meta` as `com.kipory/error: { code, message, details? }`, beside the run's id and the charge (`com.kipory/creditsCharged: 0` when the call was refused before anything could be charged). A tool error carries no `structuredContent`: that field holds only the flow's outputs, in the shape the tool's `outputSchema` lists.

| What happened                                      | `code`                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| arguments that fail the input schema               | `VALIDATION_FAILED`, the failing paths in `details.issues`                                                |
| the flow's `fail` step                             | the word of its status (`NOT_FOUND`, `CONFLICT`, …), the step's code as `details.reason`                  |
| the wait ran out                                   | `GATEWAY_TIMEOUT`; the run stops at its next step, as a timed-out endpoint call does                      |
| another call holds the flow's one-at-a-time line   | `SERIALIZE_KEY_BUSY`                                                                                      |
| a VIEWER key, a flow that writes                   | `FORBIDDEN`                                                                                               |
| a key, a flow that needs a person                  | `END_USER_REQUIRED`                                                                                       |
| a public tool past its rate, or past the daily cap | `RATE_LIMITED`, or `PUBLIC_ENDPOINT_UNAVAILABLE` with no details: "This tool is not available right now." |
| out of credits, suspended, a platform failure      | the endpoint's own code; `FLOW_FAILED` with the run's id for a platform failure                           |

These answers are not tool errors:

- **HTTP `401`** with a `WWW-Authenticate: Bearer` challenge: a missing or dead credential on a tool that is not public — for a name the project has no tool by too, so a caller with no credential learns nothing of what exists; a dead credential on any request; and no credential on the handshake or the list when the project has no public tool.
- **The protocol's error `-32602`**: a name the project has no tool by, to a caller with a live credential.
- **HTTP `429 RATE_LIMITED`**: a caller with no credential past 120 requests a minute from one address, counted before the tool's own `publicRpm` is asked — so a public tool's call can get it too; and a key past its own rate on `tools/list`.
- **HTTP `413 PAYLOAD_TOO_LARGE`**: a body with no credential over the public body limit (256 KB).
- **HTTP `400`** with a JSON-RPC error: a revision the server does not speak, a request of the newer revision with no version in its `_meta`, a header that disagrees with the body, or malformed JSON-RPC.

The `429` and the `413` are Kipory's ordinary error body (`{ code, message, details }`), not JSON-RPC.

A refused call is on the project's log of rejected requests, `GET /v1/rejected-requests?project={nodeId}`, beside the endpoint calls that answered 4xx: a tool error whose code is a 4xx on an endpoint, and the `401` on a call. Its `endpointKey` is `tool:<key>` (filter with `endpointKey=tool:reserve-book`), its `path` is `/mcp`, and its `status` is the one an endpoint would answer, though the HTTP answer was `200`. A `401` names no tool. For a public tool refused with `PUBLIC_ENDPOINT_UNAVAILABLE`, `gate` says which money gate refused. A list, a handshake and a malformed protocol request are not logged.

## Changing a flow a tool runs

A tool's callers meet its flow's inputs and outputs, so a change to them is judged as an endpoint's contract is (`kipory-evolve`): the plan or the write lists it in `contractChanges` with `kind: tool`, applies a safe change unasked, and refuses a breaking one (`CONTRACT_BREAK_NOT_ACCEPTED`) until an admin names the tool in `acceptBreaks.tools`. A description, as above, is never a break.

## Calls that must take turns

The one-at-a-time rule is the flow's, written on the flow: `serialize: { key: [bookId] }`, each part an input of the flow or a field inside one (`order.accountId`), with an optional shared `line` and `maxWaitMs`. Every call that waits for the flow — a tool's and an endpoint's alike — with equal key values runs one after another; in the example two apps reserving one book run in turn. `serialize` on an endpoint is refused, naming the flow as its place. The rule's details and traps: `SKILL.md`, "One call at a time per key", and `references/pitfalls.md`.
