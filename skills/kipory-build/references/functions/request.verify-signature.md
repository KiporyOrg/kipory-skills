<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `request.verify-signature` — Check a call's signature

Check a call was signed with your shared secret; refuse it with 401 if not.

Computes the HMAC of the text that was signed and compares it with the signature sent, in constant time.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `signed text` → `boolean`
- **Also found as:** webhook signature, hmac, verify webhook, signed request, shared secret, standard webhooks
- **Reads:** Reads the configured `payload`, `signature` and `secret`, or the stored secret `storedSecret` names; a missing signature is a mismatch. _(shape hint: `signed text`)_
- **Emits:** A `boolean`: `true` when the signature matches. A wrong or missing one answers 401 `SIGNATURE_INVALID` and stops the run (the default), or gives `false` with `onMismatch: output`.
- **Step credential:** a step may name a stored secret of type `signing_secret` in `storedSecret`, by its purpose; resolved from the project's node and the organisations above it, with no platform fallback.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `algorithm` | `sha256` \| `sha1` \| `sha512` | no | — | The hash: sha256 (the default), sha1 or sha512. |
| `encoding` | `hex` \| `base64` | no | — | How the signature is written: hex (the default) or base64. |
| `format` | `plain` \| `timestamped` \| `standard` | no | — | `plain` (the default), `timestamped` for `t=…,v1=…` signatures, or `standard` for Standard Webhooks. |
| `messageId` | union | no | — | Standard Webhooks only: the `webhook-id` header the caller sent. |
| `onMismatch` | `refuse` \| `output` | no | — | `refuse` (the default) answers 401; `output` gives the flow true or false. |
| `payload` | union | yes | — | The text that was signed, usually the call's raw body. |
| `prefix` | string, at most 32 characters | no | — | Text before the signature to remove, such as `sha256=`. |
| `secret` | union | no | — | The shared secret, such as a field of the call's record. |
| `signature` | union | yes | — | The signature the caller sent, usually from a header. |
| `storedSecret` | string, at most 128 characters | no | — | Or the name of a signing secret stored on the Secrets page. |
| `timestamp` | union | no | — | Standard Webhooks only: the `webhook-timestamp` header the caller sent. |
| `toleranceSeconds` | integer, 1 to 86400 | no | — | How old a timed signature may be, in seconds; 300 unless set. |

### `messageId` — one of

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

### `payload` — one of

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

### `secret` — one of

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

### `signature` — one of

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

### `timestamp` — one of

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

Checks a payment webhook's X-Signature over its raw body, with the shop's own secret.

#### Signed webhook

A matching signature lets the flow go on; a wrong or missing one answers 401 and nothing is written.

Reads `object` → emits `boolean` · 1 in → 1 out

Step settings (`with`):

```json
{
  "payload": "raw",
  "signature": "sig",
  "secret": "shop.record.data.paymentSecret"
}
```

Input:

```
{
  "raw": "{\"orderId\":\"o_1\"}",
  "sig": "5d41402abc4b2a76b9719d911017c592"
}
```

Output:

```
true
```
