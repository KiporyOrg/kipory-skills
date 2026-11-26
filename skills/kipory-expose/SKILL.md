---
name: kipory-expose
description: Put a Kipory flow on HTTP as one of the project's own endpoints — synchronous, asynchronous or streaming — or offer it as a tool AI apps (Claude, ChatGPT, coding agents) call at the project's `/mcp` address, decide who may call it, and get the product's end users signed in (auth, login with Google or Apple, sign-out). Use when a flow works and the outside world needs to reach it, when the user asks for an API for their product, when an endpoint returns 404, 403, 422 or 502 and the cause is not obvious, when an AI app should call the project's flows (MCP tools), when setting up sign-in for a web or native app, or when a coded route group needs turning on or off. An endpoint answers JSON, text such as CSV, or server-sent events, never HTML. Not for building the flow itself (kipory-build), not for the design API's own authentication (kipory-connect), not for reading a run that already failed (kipory-diagnose).
license: MIT
---

# Expose a flow over HTTP or to AI apps

A **dynamic endpoint** is a `/v1/…` route you author for your product, served on the project's own host and backed by a flow. The fact most people get wrong: **you author on the api host with your key, and your users call the project's host** — different hosts, different credentials, different rules. Reaching for one from inside the other is a 404. The api host answers any `/v1/…` path it does not serve with `No project matched this request's host` — a product endpoint called there and a mistyped design route read the same. The project's host is `baseUrl` on `GET /v1/projects/{nodeId}` and on each project in `GET /v1/grant`; every `invokeUrl` is that origin plus the endpoint's path (`kipory-connect`'s `references/conventions.md` owns the two-hosts rule).

## Before the first call

- Fetch `references/packs/api-endpoints-anatomy.md`: the request lifecycle end to end, the contract and target model, the error table. Most failures here are indistinguishable by status code alone.
- Give the flow's outputs with a `return` first (`kipory-build`). The save refuses a path that ends with no `return` (`FLOW_PATH_HAS_NO_END`) and a required output that may be nothing (`FLOW_OUTPUT_MAY_BE_NOTHING`), each with the fix.
- Check the path is free: `GET /v1/coded-routes` (with your key — anonymous is a 401) lists every path the platform itself occupies on every host. A coded route always wins, and its **first path word is reserved whole**: an endpoint under a word any row starts with is refused at the save, in one of two ways, checked in this order. A method and path a coded route itself serves (a GET on `/v1/records/mine`, which `GET /v1/records/{id}` serves) is `409 CONFLICT`, its message ending `(ENDPOINT_PATH_CONFLICT)`; any other path under the word (`/v1/docs/add`) is a `422` issue `ENDPOINT_PATH_RESERVED_WORD`, naming the word and its group, enabled or not. Start your paths with a word no row uses.

## The sequence

<!-- field-ok: userInfo — an ambient value the platform fills, not a request field -->
<!-- field-ok: projectInfo — an ambient value's name -->
<!-- field-ok: runInfo — an ambient value's name -->
<!-- field-ok: tableInfo — an ambient value's name -->

```yaml
endpoints:
  join: { POST: /v1/club/members, status: 201, flow: join }
  chat: { POST: /v1/club/chat, stream: answer, delta: reply }
  feed: { GET: /v1/club/feed, subscribe: { categoryKey: club, scope: project } }
```

```
POST  /v1/api-endpoints   { project, key, <the endpoint's fields> }             → 201
GET   /v1/api-endpoints/{id}?expand=shadowed                                    shadowedBy is a verdict: null means nothing shadows you; partiallyShadowedBy lists coded literals under your parameters
PATCH /v1/api-endpoints/{id}   { version, <the endpoint's fields> }             replaces the endpoint whole; version required
DELETE /v1/api-endpoints/{id}[?validateOnly=true]                               the only off switch (no disable); ADMIN only (403 requiredRole)
```

**The row API takes the document's flat row**; its old nested body is a 422 (unknown keys). For a row-API caller:

- `flow` / `stream` is the flow's **id**, not its key (`expand=flowLabel` names it).
- `status`, `async: true`, `timeoutMs`, `delta`, `events` and `subscribe` sit beside the method key, as below.
- Findings and `unreadable[].issues` name flat paths: `POST`, `status`, `inputs.x`, `subscribe.scope`, `events.0`. `acceptBreaks.endpoints` and `contractChanges[].key` name an endpoint by key.

**The endpoint** — one method key (`GET`, `POST`, `PATCH` or `DELETE`; no PUT) holding the path (starts `/v1/`, literal segments or one `{param}` per segment, no `_` first segment), `params` (each `{ in: path | query }`, as below), `status` (default 200; **async needs 202**), `responseBody` (optional: the name of one required flow output to send as the whole body — a synchronous `flow` only; absent, the body is an object of every output keyed by name), `responseType` (`text/csv`…). There is no read-only flag — see below.

**What it runs** — exactly one of three, and the method is decided by it:

| Key             | Method        | Beside it                                                                                  | What the caller gets                                                              |
| --------------- | ------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `flow: <key>`   | any           | `inputs`, `async: true` (left out: synchronous), `timeoutMs?` (1–120 s)                    | sync: the returned outputs with `status`; async: `202 { id, status, statusPath }` |
| `stream: <key>` | **POST only** | `inputs`, `delta?` (the output sent as it grows), `retry?`, `events?` (`["category/key"]`) | server-sent events `stage`, `delta`, `result`                                     |
| `subscribe`     | **GET only**  | `{ categoryKey, scope: record \| user \| project, eventKeys?, id? }`                       | one `event` frame per emitted event                                               |

A response is JSON or `responseType` text (`flow`), or server-sent events; a synchronous `flow` may instead redirect (`redirect`), answer 204, pick its status per call (`statusOutput`) or set headers from outputs (`headers`). A flow refuses with the status it means through a `fail` step (any 4xx but 405, 408, 426; `refuse: true` when no `try` may catch it; a status with no code of its own answers `REQUEST_REFUSED`, its `code` as `details.reason`), and checks a signed webhook with `request.verify-signature` over inputs bound `from: "rawBody"` and `from: "header.<name>"` (a JSON or form-encoded body; `format: "timestamped"` for a `t=…,v1=…` header; the secret stored as a `signing_secret` and named in `storedSecret`; `url.send` signs with the same settings); `references/packs/api-endpoints-anatomy.md` has the grammar. An endpoint cannot answer HTML or a binary file; hand a file out as a link from a `file.download-url` step. A file the run produced is removed when the run ends unless a step linked it; a linked one is kept at least 7 days (`kipory-extract`).

**`inputs`** left out binds each flow input by its name: from a `{part}` of the path, else the query on GET and DELETE, the body on POST and PATCH. It follows the flow's inputs (a read shows `inputsByName: true`); a plan warns `ENDPOINT_ACCEPTS_NEW_INPUT` when it starts accepting one. An `internal: true` input (optional, set only by flows, schedules, triggers) is never bound; binding it is refused. An object or list never comes from the query. State `inputs` for another name or source: `{ from: "body" }` (the body field of its name), `{ from: "path.<name>" }`, `{ from: "query.<name>" }` (declared in `params`) or `{ from: "patch" }` (ONE object input of the fields sent, `null` kept). Stated, an unlisted input, or one gained later, is not bound; `inputsByName: true` with no `inputs` goes back. A row API PATCH is whole: one leaving `inputs` out binds by name. Every required input must be bound; ambient values are not inputs. A GET or DELETE cannot bind `body` or `patch`. A parameter is `{ "in": "path" }` or `{ "in": "query" }`: `type` is `string`; required in the path or when a required input reads it; the value takes the type of the input it feeds (`string`, `number` or `boolean`; else 422).

**One call at a time per key.** When calls that carry the same value must not overlap — every booking of one slot, every transfer from one account — the FLOW states it: `flows.<flow>.serialize: { key: [slotId] }`. Each part is an input of the flow, or a field inside one (`order.accountId`); 1–4 parts. Every call that waits for the flow — a synchronous endpoint's and a tool's — with equal values runs in turn, in order of arrival, each reading what the one before wrote; other values run in parallel. Flows that must take turns with each other name the same `line` (`"line": "slot"` on both book and cancel). A call whose turn does not come within `maxWaitMs` (0–120000; absent, its own wait) answers 409 `SERIALIZE_KEY_BUSY` with `Retry-After` and runs nothing; `0` answers at once when the key is busy. Without a key, a synchronous call refused because a record it read changed already waits its turn and runs again (up to 4 runs): declare a key when the first run should already wait — the flow has a paid step, or the race is on something the save cannot see. Async endpoints, streams, schedules and triggers are not held back. `serialize` on an endpoint is refused: write it on the flow.

The endpoint read returns `invokeUrl`, the project-host URL with its `{param}` placeholders kept. Use it; never hardcode a host or infer one from the URL you call. It is `null` only on a deployment with no derivable public host (an api configured on a bare `localhost`); `references/consumer.md` says what to call then, and `kipory-connect`'s `references/conventions.md` owns the rule.

**Who calls it.** A caller presents one of two things on the project host:

- **A signed-in user's session** — the cookie in a browser, or the opaque `session` token a native app or an app on your own domain sends as a Bearer. The flow sees the person as the ambient value `userInfo`: `userId`, plus `profile` once a profile schema is connected (`references/sign-in.md`, The end-user profile).
- **An API key** whose grant reaches the project. A key has no `userInfo` at all, and what that does depends on the step: anything that needs a person fails closed — a per-user table refuses, and an endpoint whose flow reads or writes person-owned records answers 403 before the flow runs (`access.requiresUser` says so beforehand) — while a step that reads a project-wide table runs and ignores the missing user. So `userInfo` is optional: a step that reads `userInfo.userId` as required is refused at save (`STEP_INPUT_MAY_BE_ABSENT`) until it sits inside an `if` that tests `{has: userInfo}` or reads it `optional` or with a `default`.

Minting a key is a signed-in person's act on the api host, and a key is VIEWER unless a role was asked for (`kipory-connect`). `references/consumer.md`: the order credentials resolve in, and what a VIEWER may call.

**Signing users in.** Google and Apple are the only providers; which a project offers is `project.identity.providers` (ADMIN), or `PUT /v1/projects/{nodeId}/auth-config { authConfig, version }` (`GET` reads it). A web app on the platform's host sends the browser to `GET /v1/auth/signin/google` on the project host; one on your own domain exchanges a one-time code at `POST /v1/auth/handoff/exchange` for a `session`; a native app posts Apple's result to `POST /v1/auth/native/apple`, or runs the Google web flow with PKCE and exchanges at `POST /v1/auth/mobile/exchange`. Signing out is `GET /v1/auth/signout`; a person's own routes are `/v1/me`. **A builder holding only an API key makes test users instead**: `POST /v1/test-users` answers one and its `session` (`references/sign-in.md` owns all of this).

A provider that is off has no routes: its paths answer 404 and are **left out of that project's `GET /v1/openapi.json`** (Apple's, until turned on). `GET /v1/coded-routes` lists them either way.

## Offer it to AI apps as a tool

```yaml
tools:
  find-books: # bare: the flow of this key
  catalogue:
    {
      flow: find-books,
      description: Search the catalogue by author.,
      auth: none,
      publicRpm: 30,
    }
```

A tool is its own row beside the endpoints (`GET`/`POST /v1/mcp-tools`, `GET`/`PATCH`/`DELETE /v1/mcp-tools/{id}`), served at `<project host>/mcp` over the Model Context Protocol. An app picks it by its description (else the flow's), inputs by their `description`: write them. It connects with a key (a person-only tool is not listed) or as a person who approves it on a Kipory page (claude.ai, ChatGPT: `GET /v1/projects/{nodeId}/connected-apps` counts). A public tool spends the project's credits. `./kipory tools` shows what an app sees; all of it: `references/tools.md`.

## What will bite you

**Endpoint traps** — refused saves, `status` and async, key and path naming, derived access and public endpoints, query endpoints, shadowing, route enablement, streams, timeouts and VIEWER keys, each with its remedy: `references/pitfalls.md`.

## References

| File                                        | What it answers                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `references/tools.md`                       | tools for AI apps: the section, what an app sees, connecting, public tools, tool errors                              |
| `references/consumer.md`                    | the runtime plane from the caller's side: credentials, sync/async/stream, headers, rate limits                       |
| `references/errors.md`                      | the error envelope and the error table a caller meets                                                                |
| `references/pitfalls.md`                    | what will bite you when exposing a flow, each trap with its remedy                                                   |
| `references/sign-in.md`                     | end-user sign-in per kind of client, the `authConfig` document, own-domain handoff, the end-user profile, test users |
| `references/account.md`                     | signing out, the `/v1/me` account routes, account deletion, push devices                                             |
| `references/packs/api-endpoints-anatomy.md` | the judgment: lifecycle, contract and target, the live contract, its history, refusals                               |
| `references/api/api-endpoints.md`           | every field of the create, patch and read                                                                            |
| `references/api/route-enablement.md`        | the group toggle and the coded-route manifest                                                                        |
| `references/api/end-users.md`               | auth config, profile schema, the users roster, members' standing and credits                                         |

## Then

`kipory-prove` to pin the behaviour before you change the flow again. `kipory-evolve` before changing the inputs or outputs of a flow an endpoint already serves. `kipory-operate` to run it on a clock or emit signals from it. `kipory-diagnose` when a call came back wrong: the `x-request-id` header on a sync response **is the run id**, and an async ack's `id` is too once the run has started. An invocation refused before its first step has no run, so `/v1/runs/{id}` answers 404 for it; read its `statusPath`, whose `error` says why.
