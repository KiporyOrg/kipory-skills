<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `email.send` — Send an email

Send one email to one person.

Recipient, subject and body come from slots. It sends only after the run saves, and previews never send.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own message, so a new run of the same input sends it again.
- **I/O:** `recipient, subject, body` → `boolean`
- **Also found as:** mail, notify by email, email someone, send message, newsletter
- **Reads:** The recipient — any address, project member or not — plus subject and body, each from the slot its setting names. The sending address is a setting, not a slot. _(shape hint: `recipient, subject, body`)_
- **Emits:** `true` once the message is queued — not a receipt: it leaves only if the run finishes and saves. Past the project's daily mail cap the action fails (`project-mail-cap-reached`).

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `address` | string | yes | — | The address the message comes from. ⚠️ An unusable sending address only warns on save; the message is refused when sent. |
| `htmlSlot` | string | no | — | Optional slot holding an HTML version of the message. ⚠️ The plain-text body is still required; an HTML-only message reads blank in text clients. |
| `replyTo` | string | no | — | Optional address replies go to, instead of the sending address. ⚠️ Left empty, replies go to the catch-all mailbox, which a person must sort by hand. |
| `subjectSlot` | string | yes | — | The slot holding the subject line. |
| `textSlot` | string | yes | — | The slot holding the plain-text body, required even with HTML. ⚠️ On a schedule that re-runs every action, this sends again every tick. |
| `toSlot` | string | yes | — | The slot holding the address to send to. ⚠️ One recipient per action; a list here is refused, not fanned out. |

## Worked example

Sends one message that earlier actions put together. It goes out after the run saves everything else, so a flow that fails later sends nothing.

#### Run succeeds

`true` means the run now owes this message. It leaves once the run finishes and its changes are saved.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

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

The action succeeded and nothing is sent. A failed run discards what it staged, and this was staged.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

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

It succeeds and sends nothing. Every real check still runs; a warning says one message would have gone.

Reads `{ to, subject, body }` → emits `boolean` · 1 in → 1 out

Action settings (`functionConfig`):

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
