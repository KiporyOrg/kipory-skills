<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `email.send` — Send an email

Send one email to one person.

Recipient, subject and body come from the run or are fixed. It sends after the run saves; previews never send.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own message, so a new run of the same input sends it again.
- **I/O:** `recipient, subject, body` → `string`
- **Also found as:** mail, notify by email, email someone, send message, newsletter
- **Reads:** The recipient (any address, project member or not), subject and body, each a slot path, fixed value or expression. The sending address is fixed. _(shape hint: `recipient, subject, body`)_
- **Emits:** The message's id — not a receipt: it leaves only if the run finishes and saves. Past the project's daily mail cap the action fails (`project-mail-cap-reached`).
- **External dependency:** Kipory mail — Delivered by Kipory's own mail service from the sending address; no key of the project's own.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `address` | string | yes | — | The address the message comes from. ⚠️ An unusable sending address only warns on save; the message is refused when sent. |
| `html` | union | no | — | Optional HTML version of the message. ⚠️ The plain-text body is still required; an HTML-only message reads blank in text clients. |
| `replyTo` | string | no | — | Optional address replies go to, instead of the sending address. ⚠️ Left empty, replies go to the catch-all mailbox, which a person must sort by hand. |
| `subject` | union | yes | — | The subject line. |
| `text` | union | yes | — | The plain-text body, required even with HTML. ⚠️ On a schedule that re-runs every action, this sends again every tick. |
| `to` | union | yes | — | The address to send to. ⚠️ One recipient per action; a list here is refused, not fanned out. |

### `html` — one of

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

### `subject` — one of

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

### `text` — one of

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

### `to` — one of

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

Sends one message earlier actions put together and answers its id. It leaves after the run saves; a flow that fails later sends nothing.

#### Run succeeds

The run now owes this message. It leaves once the run saves; the id reads what happened to it.

Reads `{ to, subject, body }` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "address": "digest@example.com",
  "to": "draft.to",
  "subject": "draft.subject",
  "text": "draft.body"
}
```

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
"7c1f0c9e-3b52-4a5e-9d0a-2f6b8e41a7d3"
```

#### Run fails later

The action succeeded and nothing is sent: a failed run discards what it staged. The id names no message.

Reads `{ to, subject, body }` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "address": "digest@example.com",
  "to": "draft.to",
  "subject": "draft.subject",
  "text": "draft.body"
}
```

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
"7c1f0c9e-3b52-4a5e-9d0a-2f6b8e41a7d3"
```

#### In a preview

It succeeds and sends nothing. Every real check still runs; a warning says one message would have gone.

Reads `{ to, subject, body }` → emits `string` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "address": "digest@example.com",
  "to": "draft.to",
  "subject": "draft.subject",
  "text": "draft.body"
}
```

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
"preview-not-sent"
```
