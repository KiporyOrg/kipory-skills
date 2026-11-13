---
name: kipory-expose
description: Put a Kipory flow on HTTP as one of the project's own endpoints — synchronous, asynchronous or streaming — decide who may call it, and get the product's end users signed in (auth, login with Google or Apple, sign-out). Use when a flow works and the outside world needs to reach it, when the user asks for an API for their product, when an endpoint returns 404, 403, 422 or 502 and the cause is not obvious, when setting up sign-in for a web or native app, or when a coded route group needs turning on or off. An endpoint answers JSON, text such as CSV, or server-sent events, never HTML. Not for building the flow itself (kipory-build), not for the design API's own authentication (kipory-connect), not for reading a run that already failed (kipory-diagnose).
license: MIT
---

# Expose a flow over HTTP

A **dynamic endpoint** is a `/v1/…` route you author for your product, served on the project's own host and backed by a flow. The fact most people get wrong: **you author on the api host with your key, and your users call the project's host** — different hosts, different credentials, different rules. Reaching for one from inside the other is a 404. The api host answers any `/v1/…` path it does not serve with `No project matched this request's host` — a product endpoint called there and a mistyped design route read the same. The project's host is `baseUrl` on `GET /v1/projects/{nodeId}` and on each project in `GET /v1/grant`; every `invokeUrl` is that origin plus the endpoint's path (`kipory-connect`'s `references/conventions.md` owns the two-hosts rule).

## Before the first call

- Fetch `references/packs/api-endpoints-anatomy.md`: the request lifecycle end to end, the contract and target model, the error table. Most failures here are indistinguishable by status code alone.
- Give the flow's outputs with a `return` first (`kipory-build`). The save refuses a path that ends with no `return` (`FLOW_PATH_HAS_NO_END`) and a required output that may be nothing (`FLOW_OUTPUT_MAY_BE_NOTHING`), each with the fix.
- Check the path is free: `GET /v1/coded-routes` (with your key — anonymous is a 401) lists every path the platform itself occupies on every host. A coded route always wins, and its **first path word is reserved whole**: an endpoint under a word any row starts with is refused at the save, in one of two ways, checked in this order. A method and path a coded route itself serves (a GET on `/v1/records/mine`, which `GET /v1/records/{id}` serves) is `409 CONFLICT`, its message ending `(ENDPOINT_PATH_CONFLICT)`; any other path under the word (`/v1/docs/add`) is a `422` issue `ENDPOINT_PATH_RESERVED_WORD`, naming the word and its group — enabled or not, because the host sends a request by its first word to that group. Start your paths with a word no row uses.

## The sequence

<!-- field-ok: userInfo — an ambient value the platform fills, not a request field -->
<!-- field-ok: projectInfo — an ambient value's name -->
<!-- field-ok: runInfo — an ambient value's name -->
<!-- field-ok: tableInfo — an ambient value's name -->

```
POST  /v1/api-endpoints   { project, key, contractConfig, targetConfig }        → 201
GET   /v1/api-endpoints/{id}?expand=shadowed                                    shadowedBy is a verdict: null means nothing shadows you; partiallyShadowedBy lists coded literals under your parameters
PATCH /v1/api-endpoints/{id}   { version, contractConfig, targetConfig }        replaces both configs; version required
DELETE /v1/api-endpoints/{id}[?validateOnly=true]                               the only off switch — there is no disable; nothing refuses it
```

**`contractConfig`** — `method` (GET, POST, PATCH or DELETE; no PUT), `path` (starts `/v1/`, literal segments or one `{param}` per segment, no `_` first segment), `params` (a map keyed by parameter name, each `{ in: path | query, type: string, required }` — `{}` when there are none; a path parameter is `required: true`), `successStatus` (default 200; **async needs 202**), `responseBody` (optional: the name of one required flow output to send as the whole body — a synchronous `flow.invoke` only; absent, the body is an object of every output keyed by name), `responseType` (`text/csv`…). Type a record output by its table, not `object`, for `null`s. There is no read-only flag — see below.

**`targetConfig.kind`** — one of three, and the method is decided by it:

| Kind               | Method        | Body                                                                                                                    | What the caller gets                                                                     |
| ------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `flow.invoke`      | any           | `flow: {id}`, `inputs`, `execution: sync \| async` (**required**), `syncTimeoutMs?` (1–120 s), `serialize?` (sync only) | sync: the returned outputs with `successStatus`; async: `202 { id, status, statusPath }` |
| `flow.stream`      | **POST only** | `flow`, `inputs`, `deltaOutput` (**required, may be null**), `retry?`, `surfaceEvents?`                                 | server-sent events `stage`, `delta`, `result`                                            |
| `events.subscribe` | **GET only**  | `source: { categoryKey, scope: record \| user \| project, eventKeys?, id? }`                                            | one `event` frame per emitted event                                                      |

A response is JSON or `responseType` text (`flow.invoke`), or server-sent events; a synchronous `flow.invoke` may instead redirect (`contractConfig.redirect`), answer 204, pick its status per call (`statusOutput`) or set headers from outputs (`headers`). A flow refuses with the status it means through `request.refuse` (403, 404, 410, 429…) or a `fail` step (any 4xx; one with no code of its own, such as 400 or 418, answers `REQUEST_REFUSED`, the step's `code` as `details.reason`), and checks a signed webhook with `request.verify-signature` over inputs bound `from: "rawBody"` and `from: "header.<name>"` (a JSON or form-encoded body; `format: "timestamped"` for a `t=…,v1=…` header; the secret stored as a `signing_secret` and named in `storedSecret`; `url.send` signs with the same settings); `references/packs/api-endpoints-anatomy.md` has the grammar. An endpoint cannot answer HTML or a binary file; hand a file out as a link from a `file.download-url` step. A file the endpoint's own run produced (a screenshot, a resized image) is removed when the run ends unless that step made a link to it, and a linked one is kept for at least 7 days and then removed — `kipory-extract` has the rule.

**`inputs`** maps each flow input to `{ from: "body" }`, `{ from: "path.<name>" }`, `{ from: "query.<name>" }` or `{ from: "patch" }`. `body` means **the request-body field named after the input** — there is no rename. `patch`: ONE object input of the fields sent, `null` kept. Every required input must be bound; the ambient values (`userInfo`, `projectInfo`, `runInfo`, `tableInfo`) are not inputs and cannot be. A GET or DELETE cannot bind `body` or `patch`. Every path and query parameter is declared in `params` (a binding to an undeclared one is refused `ENDPOINT_INPUT_UNSATISFIED`); a param's `type` is always `string`, and the value takes the type of the input it feeds (`string`, `number` or `boolean`; a value that does not read as it is refused 422). A required input needs a required parameter: a GET endpoint at `/v1/notes/{id}?lang=` is `"params": { "id": { "in": "path", "type": "string", "required": true }, "lang": { "in": "query", "type": "string", "required": false } }` with `"inputs": { "noteId": { "from": "path.id" }, "lang": { "from": "query.lang" } }`.

**One call at a time per key.** When calls that carry the same value must not overlap — every booking of one slot, every transfer from one account — give a synchronous `flow.invoke` `"serialize": { "key": ["path.slotId"] }`. Each part is `path.<name>` or `query.<name>` that an input reads, or `body.<input>` (an input bound `from: "body"`, optionally followed by fields inside it: `body.order.accountId`); 1–4 parts. Calls whose values are all equal run one after another in order of arrival, each reading what the one before wrote, and run their flow once; calls with other values run in parallel. Endpoints that must take turns with each other name the same `line` (`"line": "slot"` on both book and cancel). A call whose turn does not come within `maxWaitMs` (0–120000; absent, its own wait) answers 409 `SERIALIZE_KEY_BUSY` with `Retry-After` and runs nothing; `0` answers at once when the key is busy. A call missing a key value, or carrying a list or an object there, is not held back. Without a key, a synchronous call refused because a record it read changed already waits its turn and runs again (up to 4 runs): declare a key when the first run should already wait — the flow has a paid step, or the race is on something the save cannot see. The order holds among the calls one api process serves (a deployment runs one). Not on async endpoints, streams or view endpoints.

The endpoint read returns `invokeUrl`, the project-host URL with its `{param}` placeholders kept. Use it; never hardcode a host or infer one from the URL you call. It is `null` only on a deployment with no derivable public host (an api configured on a bare `localhost`); `references/consumer.md` says what to call then, and `kipory-connect`'s `references/conventions.md` owns the rule.

**Who calls it.** A caller presents one of two things on the project host:

- **A signed-in user's session** — the cookie in a browser, or the opaque `session` token a native app or an app on your own domain sends as a Bearer. The flow sees the person as the ambient value `userInfo`: `userId`, plus `profile` once a profile schema is connected (`references/sign-in.md`, The end-user profile).
- **An API key** whose grant reaches the project. A key has no `userInfo` at all, and what that does depends on the step: anything that needs a person fails closed — a per-user table refuses, and an endpoint whose flow reads or writes person-owned records answers 403 before the flow runs (`access.requiresUser` says so beforehand) — while a step that reads a project-wide table runs and ignores the missing user. So `userInfo` is optional: a step that reads `userInfo.userId` as required is refused at save (`STEP_INPUT_MAY_BE_ABSENT`) until it sits inside an `if` that tests `{has: userInfo}` or reads it `optional` or with a `default`. "Cannot be bound" above means only that no request field can fill it.

Minting a key is a signed-in person's act on the api host, and a key is VIEWER unless a role was asked for (`kipory-connect`). `references/consumer.md` has the order the credentials are resolved in and what a VIEWER may call.

**Signing users in.** Two providers exist, Google and Apple, and no others. `references/sign-in.md` owns the subject; the short form:

- **Which providers a project offers** is `PUT /v1/projects/{nodeId}/auth-config { authConfig, version }` on the api host (ADMIN). The document replaces the whole stored one, so an omitted provider is disabled; Apple needs `bundleId`. `GET /v1/projects/{nodeId}/auth-config` says what is in force — with nothing stored, the platform default: Google on — and its `version`, which the PUT requires: a save made since answers 409 `VERSION_CONFLICT`; re-read and apply your change again.
- **A web app on the platform's host** sends the browser to `GET /v1/auth/signin/google` on the project host and holds the session cookie afterwards.
- **A web app on your own domain** cannot receive the cookie. It proves the domain, starts the same sign-in with `callbackUrl` and `state`, and its server exchanges a one-time code at `POST /v1/auth/handoff/exchange` for a `session` it sends as a Bearer.
- **A native app** posts Apple's result to `POST /v1/auth/native/apple`, or runs the Google web flow with the deep link `kipory://auth/callback` and a PKCE `codeChallenge`, then exchanges the returned `code` with its `codeVerifier` at `POST /v1/auth/mobile/exchange`, and holds a `session` either way. Apple has no web flow.
- **Signing out** is `GET /v1/auth/signout` on the project host. Its redirect goes to the project's configured landing, or to a `callbackUrl` that sign-in would accept (`references/sign-in.md`). The person's own account routes are under `/v1/me`.
- **A builder holding only an API key makes test users instead of signing people in.** `POST /v1/test-users` answers a test user and its `session`; it is left out of members, wallets and mail (`references/sign-in.md`, "Test users"). Inside an eval suite, `runAsUserId` acts as a user, a test user included (`kipory-prove`).

A provider that is off for the project has no routes: its paths answer 404 and are **left out of that project's `GET /v1/openapi.json`**, which is why Apple's route is missing there until `auth-config` enables it. `GET /v1/coded-routes` lists the path either way.

## What will bite you

**Endpoint traps** — refused saves, `successStatus` and async, key and path naming, derived access and public endpoints, view endpoints, shadowing, route enablement, streams, timeouts and VIEWER keys, each with its remedy: `references/pitfalls.md`.

## References

| File                                        | What it answers                                                                                                      |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `references/consumer.md`                    | the runtime plane from the caller's side: credentials, sync/async/stream, headers, rate limits                       |
| `references/errors.md`                      | the error envelope and the error table a caller meets                                                                |
| `references/pitfalls.md`                    | what will bite you when exposing a flow, each trap with its remedy                                                   |
| `references/sign-in.md`                     | end-user sign-in per kind of client, the `authConfig` document, own-domain handoff, the end-user profile, test users |
| `references/account.md`                     | signing out, the `/v1/me` account routes, account deletion, push devices                                             |
| `references/packs/api-endpoints-anatomy.md` | the judgment: lifecycle, contract and target, snapshots, refusals                                                    |
| `references/api/api-endpoints.md`           | every field of the create, patch and read                                                                            |
| `references/api/route-enablement.md`        | the group toggle and the coded-route manifest                                                                        |
| `references/api/end-users.md`               | auth config, profile schema, the users roster, members' standing and credits                                         |

## Then

`kipory-prove` to pin the behaviour before you change the flow again. `kipory-evolve` before changing the inputs or outputs of a flow an endpoint already serves. `kipory-operate` to run it on a clock or emit signals from it. `kipory-diagnose` when a call came back wrong: the `x-request-id` header on a sync response **is the run id**, and an async ack's `id` is too once the run has started. An invocation refused before its first step has no run, so `/v1/runs/{id}` answers 404 for it; read its `statusPath`, whose `error` says why.
