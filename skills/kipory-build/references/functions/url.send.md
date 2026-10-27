<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.send` — Send a request

Tell an outside system something, once the run is saved.

Sends after the run is saved, so a failed run sends nothing. Previews never send.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own request, so a new run of the same input sends it again.
- **I/O:** `string` → `boolean`
- **Also found as:** webhook, http post, post to a url, call an api, notify a system, send data
- **Reads:** One URL to send to, over `http` or `https`. The body, and any query or header value, come from the settings: each a slot, a fixed value or an expression. _(shape hint: `string`)_
- **Emits:** `true` once the request is queued — not a receipt: it leaves only if the run finishes and saves, and the flow never reads the answer.
- **Suggested input streams:** `targetUrl`
- **External dependency:** the receiving system — Whatever the address points at, reached through the SSRF guard. A transient failure is retried with the same idempotency key; any other answer is final. Deliveries spend the allowance `url.fetch` and `url.fetch-as-file` spend: 60 a minute per project and host.
- **Action credential:** an action may name a stored secret of type `http_credential` in `secret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `body` | union | no | — | The request body, usually built by an earlier action. ⚠️ A schedule that re-runs every action sends every tick; nothing un-sends a request. |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How to send the body: `json` (default), `form` or `text`. ⚠️ Under `json` a string is sent quoted; for your own text use `text` and `contentType`. |
| `contentType` | string, at most 128 characters | no | — | The content type of a `text` body. |
| `headers` | object | no | — | Headers by name; an empty value omits one; credentials go in `secret`. |
| `idempotencyKey` | union | no | — | A repeat key, sent as the `Idempotency-Key` header. ⚠️ Left empty, a new run sends a request the receiver cannot tell from the first. |
| `method` | `POST` \| `PUT` \| `PATCH` \| `DELETE` | no | `"POST"` | The request method. |
| `query` | object | no | — | Query parameters for the address by name; an empty value omits one. |
| `secret` | string, at most 128 characters | no | — | The name of a stored request credential to send. ⚠️ Sent only over `https`; a host the credential does not allow fails unreported. |
| `timeoutMs` | integer, more than 0, at most 60000 | no | `15000` | How long one delivery attempt waits for an answer. ⚠️ This limits one delivery attempt, not the action's own `timeoutMs` run setting. |

### `body` — one of

- `string`, at most 4096 characters
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `idempotencyKey` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Sends one request that earlier actions put together. It goes out after the run saves everything else, so a flow that fails later sends nothing.

#### Run succeeds

`true` means the run now owes this request. It leaves once the run finishes and its changes are saved.

Reads `string` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "method": "POST",
  "body": "notice",
  "secret": "harbour-office",
  "idempotencyKey": "notice.id",
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

The action succeeded and nothing is sent. A failed run discards what it staged, and this was staged.

Reads `string` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "method": "POST",
  "body": "notice",
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

It succeeds and sends nothing. The delivery's checks still run; a warning names the method and host.

Reads `string` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "method": "POST",
  "body": "notice",
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
