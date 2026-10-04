<!-- generated: kipory-skills references · source: the deployment's handler catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `email.send` — Send an email

Send one email to one person.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own message, so a new run of the same input sends it again.
- **I/O:** `recipient, subject, body` → `boolean`
- **Reads:** The recipient — any address, project member or not — plus subject and body, each from the slot its setting names. The sending address is a setting, not a slot. _(shape hint: `recipient, subject, body`)_
- **Emits:** `true` once the message is queued — not a receipt: it leaves only if the run finishes and saves. Past the project's daily mail cap the step fails (`project-mail-cap-reached`).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `address` | string | yes | — | The address the message comes from. ⚠️ Checked when the message goes, not when you save. Never created, switched off, or somebody else's all give the same refusal. |
| `htmlSlot` | string | no | — | Optional. The slot holding an HTML version of the same message. ⚠️ The plain-text body is still required. A message with only an HTML part reads as blank in a text-only client. |
| `replyTo` | string | no | — | Optional. Where replies go, if not the sending address. Leaving it empty is a decision, not a default — see the caution. ⚠️ Left empty, replies go to whoever reads the catch-all mailbox, which makes a person into a manual router. That is fine for a message nobody should answer and wrong for one somebody will. |
| `subjectSlot` | string | yes | — | The slot holding the subject line. |
| `textSlot` | string | yes | — | The slot holding the plain-text body. Required even when you send HTML. ⚠️ On a schedule set to re-run every step, this sends every tick. The step has no memory of having sent before, and there is nothing to un-send. |
| `toSlot` | string | yes | — | The slot holding the address to send to. ⚠️ One recipient per step. A list here does not fan out — it produces one malformed address and one refusal. |

## Worked example

Sends one message that earlier steps put together. It goes out after the run saves everything else, so a flow that fails later sends nothing.

#### Run succeeds

`true` means the run now owes this message. It leaves once the run finishes and its changes are saved.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "address": "digest@example.com",
  "toSlot": "draft.to",
  "subjectSlot": "draft.subject",
  "textSlot": "draft.body"
}
```

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
true
```

#### Run fails later

The step succeeded and nothing is sent. A failed run discards what it staged, and this was staged.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "address": "digest@example.com",
  "toSlot": "draft.to",
  "subjectSlot": "draft.subject",
  "textSlot": "draft.body"
}
```

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
true
```

#### In a preview

The step fails, on purpose. A preview shows what a flow would do; sending would make showing and doing one.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Step settings (`handlerConfig`):

```json
{
  "address": "digest@example.com",
  "toSlot": "draft.to",
  "subjectSlot": "draft.subject",
  "textSlot": "draft.body"
}
```

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
"flow preview does not send mail"
```
