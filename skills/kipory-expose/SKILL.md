---
name: kipory-expose
description: Put a Kipory flow on HTTP as one of the project's own endpoints — synchronous, asynchronous or streaming — decide who may call it, and get the product's end users signed in. Use when a flow works and the outside world needs to reach it, when the user asks for an API for their product, when an endpoint returns 404, 403, 422 or 502 and the cause is not obvious, or when a coded route group needs turning on or off. Not for building the flow itself (that is build) and not for the design API's own authentication (that is connect).
license: MIT
---

# Expose a flow over HTTP

A **dynamic endpoint** is a `/v1/…` route you author for your product, served on the project's own host and backed by a flow. The fact most people get wrong: **you author on the api host with your key, and your users call the project's host** — different hosts, different credentials, different rules. Reaching for one from inside the other is a 404 that reads `Not found.` and looks like a typo.

## Before the first call

- Fetch `references/packs/api-endpoints-anatomy.md`: the request lifecycle end to end, the contract and action model, the error table. Most failures here are indistinguishable by status code alone.
- Bind the flow's output first (`kipory-build`). An unbound required output either 502s or returns 200 with an empty value on a live call, and only preview names the slot.
- Check the path is free: `GET /v1/coded-routes` lists every path the platform itself occupies on every host. A coded route always wins.

## The sequence

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: projectInfo — provider slot name -->
<!-- field-ok: runInfo — provider slot name -->
<!-- field-ok: recordTypeInfo — provider slot name -->

```
POST  /v1/api-endpoints   { project, endpoint, contractConfig, actionConfig }   → 201
GET   /v1/api-endpoints/{id}?expand=shadowed                                    shadowedBy is a verdict: null means nothing shadows you
PATCH /v1/api-endpoints/{id}   { version, contractConfig, actionConfig }        replaces both configs; version required
DELETE /v1/api-endpoints/{id}                                                    the only off switch — there is no disable
```

**`contractConfig`** — `method` (GET, POST, PATCH or DELETE; no PUT), `path` (starts `/v1/`, literal segments or one `{param}` per segment, no `_` first segment), `params` (each `in: path | query`, `type: string`, `required`), `successStatus` (default 200; **async needs 202**). There is no read-only flag — see below.

**`actionConfig.kind`** — one of three, and the method is decided by it:

| Kind               | Method        | Body                                                                                          | What the caller gets                                                                 |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `flow.invoke`      | any           | `flow: {id}`, `inputs`, `execution: sync \| async` (**required**), `syncTimeoutMs?` (1–120 s) | sync: the bound output with `successStatus`; async: `202 { id, status, statusPath }` |
| `flow.stream`      | **POST only** | `flow`, `inputs`, `deltaSlot` (**required, may be null**), `retry?`, `surfaceEvents?`         | server-sent events `stage`, `delta`, `result`                                        |
| `events.subscribe` | **GET only**  | `source: { category, scope: record \| user \| project, events?, id? }`                        | one `event` frame per emitted event                                                  |

**`inputs`** maps each flow input slot to `{ from: "body" }`, `{ from: "path.<name>" }` or `{ from: "query.<name>" }`. `body` means **the request-body field named after the slot** — there is no rename. Every required non-provider slot must be bound; provider slots (`userInfo`, `projectInfo`, `runInfo`, `recordTypeInfo`) cannot be. A GET or DELETE cannot bind `body`.

The endpoint read returns `invokeUrl`, the project-host URL with its `{param}` placeholders kept, or `null` on a deployment with no derivable public host. Use it; never hardcode a host.

**Who calls it.** Your users present a session (cookie, or the opaque session token a native app receives) or an API key. Sign-in providers are per project: `PUT /v1/projects/{nodeId}/auth-config` (ADMIN, replaces the whole document; an omitted provider is disabled; Apple needs `bundleId`). A signed-in user reaches a flow as the `userInfo` provider slot — `userId`, plus `profile` once a profile schema is connected. A machine key has no `userInfo` at all, so a flow reading it fails closed. For a key: only a signed-in person mints one, on the api host, naming the node, the role (VIEWER unless asked) and an expiry that may be `null` — never expires — or at most a year out; the plaintext is shown once.

## What will bite you

- **Every semantic refusal on save is one 422 with a joined message.** The per-rule codes never reach the wire; do not branch on them. A path collision or duplicate key is a 409 `CONFLICT`, distinguished only by the suffix in the message.
- **`successStatus` defaults to 200 and async demands 202.** Omitting it on an async endpoint is a 422 naming the number, not the field. `execution` has no default. `deltaSlot` must be sent, even as `null`.
- **A path parameter name is letters and digits only** — `{userId}` yes, `{user_id}` no — even though the endpoint key may carry dots and hyphens.
- **There is no read-only flag to set; who may call is derived.** An async invoke or a DELETE is a write; any other GET is a read; anything else is a write when its bound flow reaches a step that changes data — a handler that writes, an event emitted beyond the run (it can start triggers), or a facet resolution. An async invoke cannot be saved on GET. Every endpoint read carries `access`, which says which — and a contract that still carries the old read-only key is a 422.
- **`shadowedBy: null` is a verdict, not unknown**, and per-project route enablement does not affect it: a disabled coded group 404s by hook but its route stays registered and still wins the match.
- **A coded route shipped later kills your endpoint with no error anywhere.** The save-time check is half the guarantee; re-read with `expand=shadowed` after a deployment moves.
- **Route enablement toggles coded route groups, not endpoints.** `POST /v1/route-enablement { project, group, enabled }`. Only `auth`, `account`, `usage`, `files` and `docs` are toggleable; the group owns its whole top-level segment, so disabling `account` also kills any endpoint you authored under `/v1/me/…`, and disabling `usage` takes the credit balance your product reads. The last group cannot be turned off; a change takes up to 30 seconds and is not a security boundary.
- **An `events.subscribe` endpoint refuses a key on `user` and `record` scope** with 403; only `project` scope is expressible for a machine caller. A `record` scope needs `id: { from: "path.<name>" }`.
- **A `flow.stream` failure is HTTP 200 with an `error` frame.** Once hijacked the status is fixed; the frame `code` is the only signal. `error` and `close` are always followed by `done`.
- **A sync timeout (504) abandons the work — it keeps running and may still write.** Retrying without an `Idempotency-Key` can double-apply.
- **The 202's `statusPath` is relative.** Join it against the project host, not the api host.
- **A malformed stored auth config re-enables Google sign-in.** The read reports `malformed: true` and nothing else does; treat it as urgent.
- **A VIEWER key making a call that counts as a write is a 403** indistinguishable from a VIEWER session's — and a default key is VIEWER. Read the endpoint's `access` before handing a VIEWER key to a caller.
- **`GET /v1/api-endpoints/{id}` on a row whose config no longer parses is a 500**, not a partial body; only the list degrades into `unreadable`.

## References

| File                                        | What it answers                                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `references/consumer.md`                    | the runtime plane from the caller's side: credentials, sync/async/stream, the error table, headers, rate limits |
| `references/packs/api-endpoints-anatomy.md` | the judgment: lifecycle, contract and action, snapshots, coalescing                                             |
| `references/api/api-endpoints.md`           | every field of the create, patch and read                                                                       |
| `references/api/route-enablement.md`        | the group toggle and the coded-route manifest                                                                   |
| `references/api/end-users.md`               | auth config, profile schema, the users roster, members' standing and credits                                    |

## Then

`kipory-prove` to pin the behaviour before you change the flow again. `kipory-operate` to run it on a clock or emit signals from it. `kipory-diagnose` when a call came back wrong: the `x-request-id` header on a sync response **is the run id**, and an async ack's `id` is too.
