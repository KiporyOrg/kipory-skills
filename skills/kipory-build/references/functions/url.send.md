<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `url.send` — Send a request

Tell an outside system something, once the run is saved.

Sends after the run is saved; previews never send. The flow never sees the answer, so cannot branch on it.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own request, so a new run of the same input sends it again.
- **I/O:** `string` → `boolean`
- **Also found as:** webhook, http post, post to a url, call an api, notify a system, send data, sign a webhook, signed request, hmac, signature header
- **Reads:** One URL to send to, over `http` or `https`. The body, and any query or header value, come from the settings: each a slot, a fixed value or an expression. _(shape hint: `string`)_
- **Emits:** `true` once queued, not a receipt; it leaves after the run saves. No flow reads the answer: to act on one, the receiver calls an endpoint back.
- **Inputs (`with`):** `url`
- **External dependency:** the receiving system — Whatever the address points at, reached through the SSRF guard. A transient failure is retried with the same idempotency key; any other answer is final. Deliveries spend the allowance `url.fetch` and `url.fetch-as-file` spend: 60 a minute per project and host.
- **Step credential:** a step may name a stored secret of type `http_credential` in `secret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.
- **Step credential:** a step may name a stored secret of type `signing_secret` in `sign.storedSecret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `body` | union | no | — | The request body, usually built by an earlier step. ⚠️ A schedule that re-runs every step sends every tick; nothing un-sends a request. |
| `bodyAs` | `json` \| `form` \| `text` | no | — | How to send the body: `json` (default), `form` or `text`. ⚠️ Under `json` a string is sent quoted; for your own text use `text` and `contentType`. |
| `contentType` | string, at most 128 characters | no | — | The content type of a `text` body. |
| `headers` | object | no | — | Headers by name; an empty value omits one; credentials go in `secret`. |
| `idempotencyKey` | union | no | — | A repeat key, sent as the `Idempotency-Key` header. ⚠️ Left empty, a new run sends a request the receiver cannot tell from the first. |
| `method` | `POST` \| `PUT` \| `PATCH` \| `DELETE` | no | `"POST"` | The request method. |
| `query` | object | no | — | Query parameters for the address by name; an empty value omits one. |
| `secret` | string, at most 128 characters | no | — | The name of a stored request credential to send. ⚠️ Sent only over `https`; a host the credential does not allow fails unreported. |
| `sign` | object | no | — | Sign the body sent with a shared secret. ⚠️ Signed once when the step runs: retries keep that time, so a 5-minute receiver refuses late ones. |
| `timeoutMs` | integer, more than 0, at most 60000 | no | `15000` | How long one delivery attempt waits for an answer. ⚠️ This limits one delivery attempt, not the step's own `timeoutMs` run setting. |

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

### `sign`

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `header` | string, at most 128 characters | no | — | The header the signature goes in; not for `standard`. |
| `secret` | union | no | — | The shared secret, such as a field of a record. |
| `storedSecret` | string, at most 128 characters | no | — | Or the name of a signing secret stored on the Secrets page. |
| `algorithm` | `sha256` \| `sha1` \| `sha512` | no | — | The hash: sha256 (the default), sha1 or sha512. |
| `encoding` | `hex` \| `base64` | no | — | How the signature is written: hex (the default) or base64. |
| `prefix` | string | no | — | Text before the signature, such as `sha256=`. |
| `format` | `plain` \| `timestamped` \| `standard` | no | — | `plain` (default), `timestamped` (`t=…,v1=…`) or `standard` (Standard Webhooks). |

`secret` — one of:

- `string`, at most 4096 characters
- `number`
- `boolean`
- an object with `literal` — the table below
- an object with `expr` — the table below

**`secret` › an object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

**`secret` › an object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

Sends one request that earlier steps put together. It goes out after the run saves everything else, so a flow that fails later sends nothing.

#### Run succeeds

`true` means the run now owes this request. It leaves once the run finishes and its changes are saved.

Reads `string` → emits `boolean` · 1 in → 1 out

Step settings (`with`):

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

The step succeeded and nothing is sent. A failed run discards what it staged, and this was staged.

Reads `string` → emits `boolean` · 1 in → 1 out

Step settings (`with`):

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

#### Signed

The request leaves with `X-Signature`: the HMAC-SHA256 of the exact body sent, keyed with the office's secret, in hex.

Reads `string` → emits `boolean` · 1 in → 1 out

Step settings (`with`):

```json
{
  "method": "POST",
  "body": "notice",
  "idempotencyKey": "notice.id",
  "timeoutMs": 15000,
  "sign": {
    "header": "X-Signature",
    "secret": "office.hookSecret"
  }
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

Step settings (`with`):

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
