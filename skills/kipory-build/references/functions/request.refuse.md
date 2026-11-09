<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `request.refuse` — Refuse the call

Answer the caller with a status you choose, such as 403, and stop the run.

Give it a condition: it refuses only when the condition holds. Nothing the run would have written is kept.

- **Group:** flow · **Phase:** `inline` · **Effect class:** `read`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `refusal message` → `nothing`
- **Also found as:** forbidden, deny access, reject request, error status, not allowed, rate limit
- **Reads:** Reads the configured `message`; when it gives nothing the caller is told the request was refused. _(shape hint: `refusal message`)_
- **Emits:** Nothing — the run stops and the caller is answered with the status. The step gives no value for a later step to read.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `code` | string | yes | — | Your word for the refusal, in capitals, such as `LINK_EXPIRED`. |
| `message` | union | no | — | What the caller is told, up to 500 characters. |
| `retryAfterSeconds` | integer, 1 to 86400 | no | — | Seconds the caller should wait before trying again. |
| `status` | integer | yes | — | The status the caller gets, such as 403, 410 or 429. |

### `message` — one of

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

Refuses a caller who does not own the link with 403. Give the step a condition so it runs only then.

#### Not the owner

The caller gets 403 with `details.reason: "NOT_OWNER"` and the message. The run writes nothing.

Reads `object` → emits `nothing` · 1 in → (empty)

Step settings (`with`):

```json
{
  "status": 403,
  "code": "NOT_OWNER",
  "message": "reason"
}
```

Input:

```
{
  "reason": "Only the owner can delete this link."
}
```

Output:

```

```
