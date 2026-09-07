---
name: kipory-channels
description: Connect a Kipory project to the outside world's messaging — claim a managed email address a flow can send from, and subscribe a project to Telegram channels whose messages feed a flow. Use when the user wants a flow to send mail from their own address, asks why an email step was refused, wants to ingest a Telegram channel, or asks why a subscription reports enabled but nothing arrives. Not for storing vendor API keys (that is secrets) and not for the outbound step itself (that is a flow).
license: MIT
---

# Email addresses and Telegram channels

Two node-scoped resources that a flow reaches for at run time. A **managed email address** is a sending identity the outbound mail step sends _as_; a **Telegram subscription** is a channel whose messages are fed, one by one, into a flow you bind. The fact most people get wrong: both are checked when the run happens, not when you save — a flow referencing an address nobody minted saves cleanly and refuses at send time with one indistinguishable refusal.

## Before the first call

- Both hubs answer on the api host with your key. Addresses attach to a **node** and are inherited downward; subscriptions attach to a **project**.
- Every write on an address is **ADMIN**; on a subscription, create and edit are EDITOR and delete is ADMIN.
- Read `references/api/managed-email-addresses.md` and `references/api/telegram-subscriptions.md` for the fields.

## The sequence

**An address to send from.**

```
GET    /v1/managed-email-addresses?node={nodeId}        this node's OWN addresses — inherited ones are not listed
POST   /v1/managed-email-addresses                      { node, localPart, domain, grade, displayName?, replyTo? } → 201
PATCH  /v1/managed-email-addresses/{id}                  displayName · replyTo · grade — the address itself never renames
POST   /v1/managed-email-addresses/{id}/disable          stop it sending, keep the claim
POST   /v1/managed-email-addresses/{id}/enable
DELETE /v1/managed-email-addresses/{id}                  release the name — anyone on the platform may claim it next
```

Then, in the flow, an `email.send` step names the address in its **config** (`address`) and takes the recipient, subject and text from **slots**. Who you send _as_ is a design-time decision a reviewer can read off the flow; who you send _to_ is per-run data.

**A channel to ingest.**

```
GET    /v1/telegram-subscriptions?project={nodeId}
POST   /v1/telegram-subscriptions      { project, channel, endpoint, flowId, inputsTemplate, sourceStrategy? } → 201
GET    /v1/telegram-subscriptions/{id}
PATCH  /v1/telegram-subscriptions/{id}                 { version, … }   — inputsTemplate REPLACES wholesale
POST   /v1/telegram-subscriptions/{id}/enable          { version }
POST   /v1/telegram-subscriptions/{id}/disable         { version }
DELETE /v1/telegram-subscriptions/{id}
```

<!-- field-ok: telegramMessage — the flow INPUT SLOT the ingress fills per message; a slot name, not a wire field -->

Each inbound message fires the bound flow once, as an asynchronous invocation, with the message in the flow's `telegramMessage` input slot. Your `inputsTemplate` must cover every _other_ declared input slot, or the save is a 422 naming the uncovered ones.

## What will bite you

- **The address namespace is platform-wide and first-come.** A `POST` on a name someone else holds is a 409 that never says who holds it. Local parts are lowercase letters, digits, dots, hyphens and underscores, start and end alphanumeric, at most 64 characters, and **no `+`**. A reserved list (`admin`, `support`, `noreply`, `postmaster` and others) is refused for everyone; the 422 carries the whole list.
- **Two grades, and the platform records but cannot create one.** `relay` has no account; replies fall to the catch-all. `mailbox` is a real provisioned account with a daily send cap — and it must be created in the delivery service's own console; the API only records the grade. There is no verification state and no DNS step to perform or poll.
- **Which domains are sendable is the deployment's decision**, not yours. A `domain-not-sendable` 422 names the sendable ones.
- **Disable is not off for an inheriting node.** Ownership reaches downward; a disabled address is skipped, not switched off for the tree. A root-owned address serves only the root itself.
- **At send time there is exactly one refusal.** Absent, disabled and out-of-reach all give the same `address-not-available`. Nothing at save time checks the address exists or that this project may use it.
- **The mail step's `true` means queued, not delivered.** Delivery is handed off after the run's writes commit; a step that fails afterwards, a discarded fan-out branch, or a failed precondition means it never goes. And the step is **not** convergent across branches: two fan-out branches reaching it send two messages, and a re-run schedule sends again.
- **One recipient per step.** A list in the recipient slot does not fan out.
- **A subscription that reports `enabled: true` may fetch nothing.** Only the `mtproto` strategy has a watcher, and it depends on a Telegram account the platform's operators provision and keep signed in. Nothing on the subscription row reports that account's absence. The write path admits only strategies with an adapter, which is the only protection.
- **`endpoint` on a subscription is a label**, recorded against every ingested message for attribution. Despite the name it is not checked against your API endpoints.
- **`flowId` is validated when you save and soft afterwards.** Deleting the flow leaves the subscription pointing at nothing rather than deleting it.
- **`version` is required on every subscription write** — patch, enable and disable. A stale one is a 409 naming the captured and current versions; re-read and retry. An address has no version and no lock.
- **`createdByUserId` is always null for a key**, and it is provenance only — the flow never runs as that person.
- **Disabling a subscription stops future ingestion.** It removes nothing already taken in.

## References

| File                                        | What it answers                                            |
| ------------------------------------------- | ---------------------------------------------------------- |
| `references/api/managed-email-addresses.md` | the mint body, grades, refusal codes, the release response |
| `references/api/telegram-subscriptions.md`  | create and patch bodies, strategies, the version lock      |

The sending step is `email.send`; the handlers that read subscriptions are `telegram.stats` and `telegram.resolve-channel`. Their config and examples are under `kipory-build`'s `references/handlers/`.

## Then

`kipory-build` to author the flow that sends the mail or processes the messages. `kipory-secrets` if a handler wanted a vendor credential rather than a sending identity. `kipory-diagnose` when a message should have gone and the run's step log says otherwise.
