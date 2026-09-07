# The runtime plane, from the caller's side

<!-- field-ok: userInfo — a provider SLOT name the platform fills, not a request field -->
<!-- field-ok: windowMs — a key inside the rate limiter's error `details`, declared in the middleware rather than a wire contract -->

How a request to `https://<project-host>/v1/<your-path>` is served. This is what your product's client — or your own agent calling the product — needs to know. The design API on the api host is `kipory-connect`'s subject, not this file's.

## Matching

- One catch-all serves every method under `/v1/`. A **coded route always wins** over it; among your endpoints, fewer path params wins, then more literal characters, then the endpoint name.
- Method is matched, not leaked: the right path with the wrong method is the same 404 as no path. A path over 2048 characters is a 404. Any `/v1/_…` path other than the built-in invocation status is a 404.
- The write gate runs **after** matching, so an unknown path 404s rather than revealing itself as a 403.

## Credentials

Three, resolved in this order from one hook:

1. `Authorization: Bearer <api-key>` — a machine key. Its grant must **reach** the project, else 403 `FORBIDDEN` (`Token is not valid for this API`). A key never has a user: its runs are project-owned, it gets no `userInfo`, and it is refused by any flow that writes person-owned records.
2. `Authorization: Bearer <session-token>` — the opaque token a native app receives on sign-in, presented verbatim.
3. The session cookie — a browser user.

An `Authorization` header present but not `Bearer …` is an immediate 401 with no fall-through to the cookie. A session's user must still be active and a member of the project on every request; a key has no such third party.

A VIEWER principal — session or key — is refused on any non-GET endpoint not marked `readOnly`: 403 `Your role is read-only for this organization`. A key is VIEWER unless a role was asked for at mint.

## Three shapes of answer

**Synchronous `flow.invoke`.** Body validated against the flow's body-bound input slots (`additionalProperties: false` — an unknown body field is a 422), query against the declared query params (an **undeclared query key is a 422**), path params by the matcher. The flow runs inline under `syncTimeoutMs` (default 30 s, ceiling 120 s); the bound output is validated against the response contract and sent with the endpoint's `successStatus`. On timeout: **504, and the work is abandoned, not cancelled** — it keeps running and may still write.

**Asynchronous `flow.invoke`.** `202 { id, status, statusPath }`. `statusPath` is **relative** to the project host: `/v1/_invocations/{id}`, which answers `{ id, status, output?, error? }` with status `PENDING`, `PROCESSING`, `READY` or `FAILED`. `output` appears only on READY and is re-validated against the endpoint's current response contract — an edited contract turns the read into a 502. The read is owner-scoped: an unknown, foreign or another project's id is the same 404 `No such invocation.`

**Streaming `flow.stream` and `events.subscribe`.** The response is `text/event-stream`; see below.

## Server-sent events

- Frame: `event: <name>` then `data: <JSON>`. An opening `:open` comment, then `:keep-alive` every 15 seconds.
- **`flow.stream` emits `stage`, `delta`, `result`** — plus `event` when the endpoint declares `surfaceEvents`. `stage` is `{ skill, phase: start | complete }`. `delta` is `{ slot, chunk }` where `chunk` is a **monotonic growing suffix**: concatenate to reproduce the value. `result` is the bound output object.
- **`events.subscribe` emits exactly one frame name, `event`**, carrying the emitted event's envelope verbatim, and never ends on its own.
- **`error`, `close` and `done` are always permitted**, and `error` or `close` is always followed by `done`. `error` is the transport failing or a flow failure surfaced in-band — its `code` is the only signal, because the HTTP status is already 200. `close` is `{ reason }` with reason `lifetime`, `transport-unavailable`, `revoked`, `terminal` or `too-slow`; treat an unknown reason as `lifetime`.
- Every stream ends after ten to twelve minutes with `close { lifetime }` whatever the activity. Reconnect, with jitter. A subscriber that fell behind by 200 frames gets `close { too-slow }`.
- In a browser `EventSource`, a server `error` frame and a dropped socket both fire the handler named `error`; tell them apart by payload.
- Refusals **before** the hijack are ordinary JSON: an ownership 404 on a `record`-scoped subscription, a 503 `STREAM_CAPACITY_EXHAUSTED` with `Retry-After`, a 503 when the message bus is unreachable.
- A key on a `user`- or `record`-scoped subscription is a 403 naming the scope.

## The error envelope

`{ code, message, details?, requestId }`. **Branch on `code`**; the message may change at any time. `requestId` is also the `x-request-id` response header — and on a synchronous invocation it **is the run id** for `GET /v1/runs/{runId}` on the api host.

| Status | `code`                                          | When                                                                                                                                             |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 401    | `UNAUTHORIZED`                                  | no, malformed or unknown credential; dead session                                                                                                |
| 402    | `BALANCE_BELOW_SOFT_CAP`                        | the wallet is below its soft cap (non-GET only)                                                                                                  |
| 402    | `USER_SPEND_CAP_EXCEEDED`                       | the acting person hit their own ceiling on a healthy wallet                                                                                      |
| 403    | `FORBIDDEN`                                     | grant does not reach the project; VIEWER on a write; not a member; key on a person-scoped action                                                 |
| 404    | `NOT_FOUND`                                     | unknown host; no match or wrong method; the route's group is disabled (`This API is not enabled for this project.`); the endpoint's flow is gone |
| 409    | `CONFLICT` / `CHANGE_SET_PRECONDITION_CONFLICT` | a run precondition was unmet; a record changed mid-run and nothing was written                                                                   |
| 422    | `VALIDATION_FAILED`                             | body or query failed the contract, including an undeclared query key; the only flow-failure phase whose message reaches the caller               |
| 429    | `RATE_LIMITED`                                  | the per-minute limiter (`details` carries `limit`, `windowMs`, `retryAfterSeconds` and a `retry-after` header) or a vendor quota                 |
| 502    | `INTERNAL`                                      | a step failed; the flow produced no declared output; the output failed the response contract                                                     |
| 503    | `STREAM_CAPACITY_EXHAUSTED` / `INTERNAL`        | this process is at its stream limit; the credit check was unavailable                                                                            |
| 504    | `GATEWAY_TIMEOUT`                               | a synchronous flow exceeded its timeout                                                                                                          |

The two 402 codes have **opposite remedies** — top up the wallet, or raise that person's cap. The credit gate skips GET, so an over-cap project degrades to read-only rather than dark.

## Headers worth knowing

- `Idempotency-Key` — read on the way in and threaded into the run and the credit scope. Ignored, not truncated, over 255 characters. Under a streaming retry the attempt index is folded in so attempt two cannot cache-hit attempt one.
- `X-Credits-Charged` — on every billable response, 2xx, 4xx and 5xx alike.
- `x-request-id` — the run id for a synchronous invocation. A client-supplied value is ignored.
- Rate limits are per minute, keyed per API key (with a per-key override) or per user; the limiter **fails open** if its store is unreachable and suppresses the limit header on a 429, so a client cannot pre-empt from headers alone.

## What a signed-in user is to a flow

The `userInfo` provider slot: `{ userId }`, plus `profile` — typed by the project's connected profile schema — when one is connected. The caller cannot set or spoof it. Its own profile is `/v1/me/profile` on the project host (values), and `/v1/me` is identity only. A key request carries no `userInfo` at all.
