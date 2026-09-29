---
name: kipory-expose
description: Put a Kipory flow on HTTP as one of the project's own endpoints — synchronous, asynchronous or streaming — decide who may call it, and get the product's end users signed in. Use when a flow works and the outside world needs to reach it, when the user asks for an API for their product, when an endpoint returns 404, 403, 422 or 502 and the cause is not obvious, or when a coded route group needs turning on or off. Not for building the flow itself (that is build) and not for the design API's own authentication (that is connect).
license: MIT
---

# Expose a flow over HTTP

A **dynamic endpoint** is a `/v1/…` route you author for your product, served on the project's own host and backed by a flow. The fact most people get wrong: **you author on the api host with your key, and your users call the project's host** — different hosts, different credentials, different rules. Reaching for one from inside the other is a 404 that reads `Not found.` and looks like a typo.

## Before the first call

- Fetch `references/packs/api-endpoints-anatomy.md`: the request lifecycle end to end, the contract and action model, the error table. Most failures here are indistinguishable by status code alone.
- Bind the flow's output first (`kipory-build`). An unbound required output is refused `422 FLOW_OUTPUT_MISSING` on every live call and writes nothing; preview names the slot first.
- Check the path is free: `GET /v1/coded-routes` (with your key — anonymous is a 401) lists every path the platform itself occupies on every host. A coded route always wins, and its **first path word is reserved whole**: an endpoint under a word any row starts with — `/v1/docs/add`, `/v1/records/mine` — is refused at the save as `ENDPOINT_PATH_RESERVED_WORD`, naming the word and its group — enabled or not, because the host sends a request by its first word to that group. Start your paths with a word no row uses.

## The sequence

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — provider slot name -->
<!-- field-ok: runInfo — provider slot name -->
<!-- field-ok: recordTypeInfo — provider slot name -->
<!-- field-ok: instancePath — a key inside a request-schema refusal's `details.issues[]`, produced by the validator rather than a wire contract -->

```
POST  /v1/api-endpoints   { project, key, contractConfig, actionConfig }        → 201
GET   /v1/api-endpoints/{id}?expand=shadowed                                    shadowedBy is a verdict: null means nothing shadows you; partiallyShadowedBy lists coded literals under your parameters
PATCH /v1/api-endpoints/{id}   { version, contractConfig, actionConfig }        replaces both configs; version required
DELETE /v1/api-endpoints/{id}                                                    the only off switch — there is no disable
```

**`contractConfig`** — `method` (GET, POST, PATCH or DELETE; no PUT), `path` (starts `/v1/`, literal segments or one `{param}` per segment, no `_` first segment), `params` (each `in: path | query`, `type: string`, `required`), `successStatus` (default 200; **async needs 202**). There is no read-only flag — see below.

**`actionConfig.kind`** — one of three, and the method is decided by it:

| Kind               | Method        | Body                                                                                          | What the caller gets                                                                 |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `flow.invoke`      | any           | `flow: {id}`, `inputs`, `execution: sync \| async` (**required**), `syncTimeoutMs?` (1–120 s) | sync: the bound output with `successStatus`; async: `202 { id, status, statusPath }` |
| `flow.stream`      | **POST only** | `flow`, `inputs`, `deltaSlot` (**required, may be null**), `retry?`, `surfaceEvents?`         | server-sent events `stage`, `delta`, `result`                                        |
| `events.subscribe` | **GET only**  | `source: { categoryKey, scope: record \| user \| project, eventKeys?, id? }`                  | one `event` frame per emitted event                                                  |

**`inputs`** maps each flow input slot to `{ from: "body" }`, `{ from: "path.<name>" }` or `{ from: "query.<name>" }`. `body` means **the request-body field named after the slot** — there is no rename. Every required non-provider slot must be bound; provider slots (`userInfo`, `projectInfo`, `runInfo`, `recordTypeInfo`) cannot be. A GET or DELETE cannot bind `body`.

The endpoint read returns `invokeUrl`, the project-host URL with its `{param}` placeholders kept, or `null` on a deployment with no derivable public host. Use it; never hardcode a host. **When it is `null`** — a local stack, for one — call the api's own base URL with the endpoint's path and the header `x-kipory-project-slug: <project slug>`; without the header that host answers 404 naming it.

**Who calls it.** Your users present a session (cookie, or the opaque session token a native app — or an app on your own domain — receives) or an API key. An app served from your own domain rather than the platform's cannot receive the cookie: prove the domain first (`PUT /v1/projects/{nodeId}/app-domain`, publish the TXT record it names, `POST /v1/projects/{nodeId}/app-domain/verify`), and start sign-in by sending the browser to `GET /v1/auth/signin/google?callbackUrl=<a URL on your domain>&state=<random>` on the project host — `state` is 16–512 characters your app keeps (in its own cookie, say) and is required for your own domain; without it the browser comes back with `?error=state_required`. Sign-in then returns to `callbackUrl` with a one-time `?code=` (the state is never echoed) that your app's server exchanges within about a minute at `POST /v1/auth/handoff/exchange { code, state }` on the project host, getting `{ session, expiresAt }`; it sends `session` as a Bearer — to the project host only; it works nowhere else. A 401 `HANDOFF_CODE_INVALID` means sign in again, never retry. Sign-in providers are per project: `PUT /v1/projects/{nodeId}/auth-config { authConfig }` (ADMIN; the document goes inside `authConfig` and replaces the whole stored one — an omitted provider is disabled, `authConfig: null` goes back to the platform default; Apple needs `bundleId`). A signed-in user reaches a flow as the `userInfo` provider slot — `userId`, plus `profile` once a profile schema is connected. A machine key has no `userInfo` at all, and what that does depends on the step: anything that needs a person fails closed — a per-user record type refuses, and an endpoint whose flow writes person-owned records answers 403 — while a step that reads a project-wide type runs and ignores the missing user. That is why `entity.list` and `entity.read` still wire `userInfo` as an input on a project-wide type (`kipory-build`); "cannot be bound" above means only that no request field can fill it. For a key: only a signed-in person mints one, on the api host, naming the node, the role (VIEWER unless asked) and an expiry that may be `null` — never expires — or at most a year out; the plaintext is shown once.

## What will bite you

- **A refused save is one 422 `VALIDATION_FAILED` with `details.issues[]`, in two shapes.** A body the request schema refuses — an unknown key, a wrong type, a path the pattern refuses such as `{user_id}` — gives issues of `{ message, keyword, instancePath, params }` with no `code`; `instancePath` is where, and `message` may be as short as `Invalid`. A config rule — a binding to an undeclared parameter, an unbound required slot, async without 202 — gives `{ code, message, field? }`; `field` (in body terms) is there only when one field caused it, and several binding rules carry none. Branch on `code` where there is one, never on `message`. A path collision or duplicate key on a real save is a 409 `CONFLICT` with no `details`, told apart only by the suffix in the message; the `validateOnly` verdict reports the same two as findings on `contractConfig.path` and `endpoint`.
- **`successStatus` defaults to 200 and async demands 202.** Omitting it on an async endpoint is a 422 naming the number, not the field. `execution` has no default. `deltaSlot` must be sent, even as `null`.
- **A path parameter name is letters and digits only** — `{userId}` yes, `{user_id}` no — even though the endpoint key may carry dots and hyphens.
- **There is no read-only flag to set; who may call is derived.** An async invoke or a DELETE is a write; any other GET is a read; anything else is a write when its bound flow reaches a step that changes data — a handler that writes, an event emitted beyond the run (it can start triggers), or a facet resolution. An async invoke cannot be saved on GET. Every endpoint read carries `access`, which says which — and a contract that still carries the old read-only key is a 422.
- **`shadowedBy: null` is a verdict, not unknown**, and per-project route enablement does not affect it: a disabled coded group 404s by hook but its route stays registered and still wins the match. A coded **literal** route that takes one value of a parameter is not a shadow and sits in `partiallyShadowedBy` instead. You meet it on a path whose first segment is a parameter (`/v1/{kind}/stats` saves; coded routes answer some `kind`s first), or on an endpoint stored before the reserved-word rule.
- **A coded route shipped later kills your endpoint with no error anywhere.** The save-time check is half the guarantee; re-read with `expand=shadowed` after a deployment moves.
- **Route enablement toggles coded route groups, not endpoints.** `POST /v1/route-enablement { project, group, enabled }`. Only `auth`, `account`, `usage`, `files` and `docs` are toggleable; the group owns its whole top-level segment (which is why the save refuses an endpoint under it), and disabling `usage` takes the credit balance your product reads. The last group cannot be turned off; a change takes up to 30 seconds and is not a security boundary.
- **An `events.subscribe` endpoint refuses a key on `user` and `record` scope** with 403; only `project` scope is expressible for a machine caller. A `record` scope needs `id: { from: "path.<name>" }`.
- **`flow.stream` `retry.onDiscard` is `suppress`.** Under `suppress`, `stage` frames stream live for every attempt but `delta` frames are held and sent only for the winning attempt, so a retrying endpoint streams no text until an attempt wins.
- **`delta` frames come from `text.generate` steps with structured output.** While a run goes, the stream takes text from the string field named `deltaSlot` in **any** `text.generate` step's output as the model writes it — it does not check which step feeds the flow output, so an unbound step with a field of that name streams too. One stream per attempt: text that does not extend what was already sent is dropped, so a loop, or two such steps, streams only the first draft, and later drafts arrive only in `result`. Stream from one step that runs once, with a field name no other generate step uses. A step returning plain text, and every other handler, streams no deltas: the client gets `stage` frames, then the whole value in `result`. Write the client to cope with zero deltas. The save refuses a `deltaSlot` that is not a flow output (`ENDPOINT_INPUT_UNSATISFIED`) and one no step can stream — not a string field of any structured `text.generate` step's output (`ENDPOINT_DELTA_SLOT_NOT_STREAMABLE`) — in `validateOnly` and a document plan alike.
- **A `flow.stream` failure is HTTP 200 with an `error` frame.** Once hijacked the status is fixed; the frame `code` is the only signal. `error` and `close` are always followed by `done`.
- **A sync timeout (504) stops the run at its next step and discards its staged writes, but not its bill** — paid calls already made stay charged, and unstaged writes (vector points, files, minted terms) stand. A timeout that lands after the last step, while the writes are being committed, lets them land anyway, so retrying without an `Idempotency-Key` can double-apply. A `flow.stream` that ends early (client gone, deadline, revoked session) discards its staged writes the same way.
- **The 202's `statusPath` is relative.** Join it against the project host, not the api host.
- **A malformed stored auth config re-enables Google sign-in.** The read reports `malformed: true` and nothing else does; treat it as urgent.
- **A VIEWER key making a call that counts as a write is a 403** indistinguishable from a VIEWER session's — and a default key is VIEWER. Read the endpoint's `access` before handing a VIEWER key to a caller.
- **`GET /v1/api-endpoints/{id}` on a row whose config no longer parses is a 500**, not a partial body; only the list degrades into `unreadable`.

## References

| File                                        | What it answers                                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `references/consumer.md`                    | the runtime plane from the caller's side: credentials, sync/async/stream, the error table, headers, rate limits |
| `references/packs/api-endpoints-anatomy.md` | the judgment: lifecycle, contract and action, snapshots, refusals                                               |
| `references/api/api-endpoints.md`           | every field of the create, patch and read                                                                       |
| `references/api/route-enablement.md`        | the group toggle and the coded-route manifest                                                                   |
| `references/api/end-users.md`               | auth config, profile schema, the users roster, members' standing and credits                                    |

## Then

`kipory-prove` to pin the behaviour before you change the flow again. `kipory-operate` to run it on a clock or emit signals from it. `kipory-diagnose` when a call came back wrong: the `x-request-id` header on a sync response **is the run id**, and an async ack's `id` is too once the run has started. An invocation refused before its first step has no run, so `/v1/runs/{id}` answers 403 for it; read its `statusPath`, whose `error` says why.
