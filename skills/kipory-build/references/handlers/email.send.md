<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `email.send` — Send an email

Send one email to one person.

- **Group:** Outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **I/O:** `recipient, subject, body` → `boolean`
- **Reads:** The recipient, the subject and the body, each from the slot its setting names. The address it comes from is a setting, not a slot. _(shape hint: `recipient, subject, body`)_
- **Emits:** `true`, once the message is queued to go. It is not a receipt — the message leaves only if the rest of the run finishes and saves.

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

Reads: read message. Emits: queued.

#### a message the flow just wrote

`true` means the run now owes this message. It leaves once the run finishes and its changes are saved.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
true
```

#### the flow fails two steps later

The step succeeded and nothing is sent. A failed run discards what it staged, and this was staged.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
true
```

#### run from a preview

The step fails, on purpose. A preview shows what a flow would do; sending would make showing and doing one.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Input:

```
{ "to": "sam@example.com", "subject": "Your weekly digest", "body": "Three new items…" }
```

Output:

```
"flow preview does not send mail"
```
