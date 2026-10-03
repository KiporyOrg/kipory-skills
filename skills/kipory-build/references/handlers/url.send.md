<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.send` — Send a request

Tell an outside system something, once the run is saved.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own request, so a new run of the same input sends it again.
- **I/O:** `string` → `boolean`
- **Reads:** One URL to send to, over `http` or `https`. The body, and any query or header value, come from the slots the settings name. _(shape hint: `string`)_
- **Emits:** `true` once the request is queued — not a receipt: it leaves only if the run finishes and saves, and the flow never reads the answer.
- **Suggested input streams:** `targetUrl`
- **External dependency:** the receiving system — Whatever the address points at, reached through the SSRF guard. A transient failure is retried with the same idempotency key; any other answer is final.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How the body is sent: `json` (the default), `form` (an object of plain values, URL-encoded) or `text` (a string, as it is). ⚠️ Under `json` a string is sent quoted, as a JSON string. To send text you built yourself, use `text` and set `contentType`. |
| `bodySlot` | string | no | — | The slot holding the request body, built by an earlier step. ⚠️ On a schedule set to re-run every step, this sends every tick. The step has no memory of having sent before, and nothing un-sends a request. |
| `contentType` | string | no | — | The content type of a `text` body. |
| `headerSlots` | object | no | — | Request headers whose value is read from a slot. An empty slot leaves the header out. |
| `headers` | object | no | — | Request headers with fixed values. A credential does not go here: store it and name it in `secret`. |
| `idempotencyKeySlot` | string | no | — | The slot holding a key the receiving system can use to recognise a repeat, sent as the `Idempotency-Key` header. ⚠️ Left out, each run's request gets a key of its own, so a new run of the same input sends a request the receiving system cannot tell from a first one. |
| `method` | `POST` \| `PUT` \| `PATCH` \| `DELETE` | no | `"POST"` | The request method. |
| `query` | object | no | — | Query parameters with fixed values, appended to the address. One the address already carries is kept, not replaced. |
| `querySlots` | object | no | — | Query parameters whose value is read from a slot. An empty slot leaves the parameter out. |
| `secret` | string | no | — | The name of a stored request credential. Its stored row says where in the request it goes and which hosts may receive it. ⚠️ Sent only over `https` on the default port. Saving warns if none is stored; the host list is checked when the request goes, and a failure then is not reported to the run. |
| `timeoutMs` | integer | no | `15000` | How long one delivery attempt waits for an answer. |

## Worked example

Sends one request that earlier steps put together. It goes out after the run saves everything else, so a flow that fails later sends nothing.

Reads: build request. Emits: queued.

#### Run succeeds

`true` means the run now owes this request. It leaves once the run finishes and its changes are saved.

Reads `string` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "method": "POST",
  "bodySlot": "notice",
  "secret": "harbour-office",
  "idempotencyKeySlot": "notice.id",
  "timeoutMs": 15000
}
```

Input:

```
https://hooks.harbour.example/notices
```

Output:

```
true
```

#### Run fails later

The step succeeded and nothing is sent. A failed run discards what it staged, and this was staged.

Reads `string` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "method": "POST",
  "bodySlot": "notice",
  "timeoutMs": 15000
}
```

Input:

```
https://hooks.harbour.example/notices
```

Output:

```
true
```

#### In a preview

The step fails, on purpose. A preview shows what a flow would do; sending would make showing and doing one.

Reads `string` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "method": "POST",
  "bodySlot": "notice",
  "timeoutMs": 15000
}
```

Input:

```
https://hooks.harbour.example/notices
```

Output:

```
"flow preview does not send requests"
```
