---
name: kipory-channels
description: Connect a Kipory project to the outside world — claim a managed email address a flow can send from, and watch a Telegram channel as a source whose messages a trigger turns into flow runs. Use when the user wants a flow to send mail from their own address, asks why an email step was refused, wants to ingest a Telegram channel, or asks why a source reports enabled but nothing arrives. Not for storing vendor API keys (that is secrets), not for the trigger itself (that is kipory-operate) and not for the outbound step (that is a flow).
license: MIT
---

# Email addresses and sources

Two resources at the edge of a project. A **managed email address** is a sending identity the outbound mail step sends _as_; a **source** is something outside your flows that writes events into the project's log — a Telegram channel the platform watches today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow: a **trigger** pointing at it does (`kipory-operate`). The fact most people get wrong about addresses: they are checked when the run happens, not when you save — a flow referencing an address nobody minted saves cleanly and its mail step fails on every run with one indistinguishable refusal.

## Before the first call

- Both hubs answer on the api host with your key. Addresses attach to a **node** and are inherited downward; sources attach to a **project**.
- Every write on an address is **ADMIN**; on a source, create and edit are EDITOR and delete is ADMIN.
- Read `references/api/managed-email-addresses.md` and `references/api/sources.md` for the fields.

## The sequence

**An address to send from.**

```
GET    /v1/managed-email-addresses?node={nodeId}        this node's OWN addresses — inherited ones are not listed
POST   /v1/managed-email-addresses                      { node, localPart, domain, grade, displayName?, replyTo? } → 201
PATCH  /v1/managed-email-addresses/{id}                  displayName · replyTo · grade — the address itself never renames
                                                          enabled: false stops it sending and keeps the claim; true resumes
DELETE /v1/managed-email-addresses/{id}                  release the name — anyone on the platform may claim it next
```

Then, in the flow, an `email.send` step names the address in its **config** (`address`) and takes the recipient, subject and text from **slots**. Who you send _as_ is a design-time decision a reviewer can read off the flow; who you send _to_ is per-run data.

**A channel to watch.**

```
GET    /v1/sources?project={nodeId}[&provider=telegram]     every source, with health, how many triggers listen and deleteRefusal
POST   /v1/sources                { project, provider: "telegram", config: { channel }, key?, label? } → 201
GET    /v1/sources/{id}
PATCH  /v1/sources/{id}           { version, label?, config? }  — config REPLACES wholesale; the provider cannot change
PATCH  /v1/sources/{id}          { version, enabled } — switch it off or on
DELETE /v1/sources/{id}           409 SOURCE_HAS_LISTENERS while a trigger listens — the read's deleteRefusal says so first; ?validateOnly=true asks without deleting
GET    /v1/project-events?project={nodeId}&sourceId={id}   the events this source wrote, newest first, cursor-paged
```

The first Telegram source in a project seeds a `telegram` event category and its `message` type into the project's registry. Then bind a flow with a trigger: `POST /v1/triggers` with `sourceId`, `categoryKey: "telegram"`, `eventKey: "message"`, the flow and its inputs (`kipory-operate` has the rest). Each message is one `telegram/message` event in the project's log, and the trigger runs the flow with the envelope in the reserved `event` slot: the text, channel and message id under `event.data`, the attachments' file ids under `event.data.fileIds`.

A channel the project does not watch yet is one write, not two: `POST /v1/triggers` with `newSource` (the body a source create takes — `provider`, `config`, optionally `key` and `label`) in place of `sourceId` creates the source and the trigger in one transaction, so a trigger the platform refuses leaves no source behind. Sending both is a 422.

## What will bite you

- **The address namespace is platform-wide and first-come.** A `POST` on a name someone else holds is a 409 that never says who holds it. Local parts are lowercase letters, digits, dots, hyphens and underscores, start and end alphanumeric, at most 64 characters, and **no `+`**. A reserved list (`admin`, `support`, `noreply`, `postmaster` and others) is refused for everyone; the 422 carries the whole list.
- **Two grades, and the platform records but cannot create one.** `relay` has no account; replies fall to the catch-all. `mailbox` is a real provisioned account with a daily send cap — and it must be created in the delivery service's own console; the API only records the grade. There is no verification state and no DNS step to perform or poll.
- **Which domains are sendable is the deployment's decision**, not yours. Where the deployment restricts them, claiming an address on another domain is a `domain-not-sendable` 422 whose `details.sendableDomains` names the allowed ones — that 422 is the only read of the list. Where it restricts nothing (a local stack, typically) every well-formed domain claims with 201, which proves nothing about whether mail from it can be delivered.
- **Disable is off for the whole tree.** A send names one exact address, and a disabled one is refused for every node — there is no fallback to another address. Ownership reaches downward, so an organisation's address serves its projects and a project's does not serve its organisation; a root-owned address serves only the root itself.
- **An address that cannot send fails the step, not the save.** When the mail step runs it checks the sender and the recipient before queueing anything: absent, disabled and out-of-reach all give the same `address-not-available`; an active address on a domain this deployment does not send from gives `domain-not-sendable`; a recipient who is not a member of the project gives `recipient-not-a-member`. The step fails with that reason in the run's step log, and no message is queued. Nothing at save time checks any of it, so run the flow once against a mailbox you can read before relying on it. The delivery job asks again when it sends; an address disabled between the run and the send is refused there, after the step answered `true`, and only an operator sees that.
- **The mail step's `true` means queued, not delivered** — not even accepted. Delivery is handed off after the run's writes commit; a step that fails afterwards, a discarded fan-out branch, or a failed precondition means it never goes. And the step is **not** convergent across branches: two fan-out branches reaching it send two messages, and a re-run schedule sends again.
- **One recipient per step.** A list in the recipient slot does not fan out.
- **A source that reports `enabled: true` with health `unknown` is not being read.** The platform's own Telegram accounts are what watch channels; `health.health` is `live` or `stale` only when a watcher shard owns the channel. Nothing on your row provisions those accounts.
- **A source nothing listens to still costs its connection** and a media copy per message. `listening: 0` is the tell.
- **A blocked payer still gets the event.** The event is written with `mediaSkipped`
  <!-- field-ok: mediaSkipped — a key the Telegram ingress writes INTO the event payload, not a
       field on any request or response body; it says why the media copy was withheld -->
  set and no files; the trigger's decision log records `blocked` with the reason. Enable the payer and replay that decision.
- **`version` is required on every source write** — every patch, switching `enabled` included. A stale one is a 409; re-read and retry. A provider's own report (member counts, health) never bumps it. An address has no version and no lock.
- **`createdByUserId` is always null for a key**, and it is provenance only — the flow never runs as that person.
- **Disabling a source stops future events.** It removes nothing already recorded, and enabling it later does not catch up.
- **Only `telegram` can be created today.** `webhook`, `postgres` and `apify` are in the provider registry and refused at create with 422 until their writers land.

## References

| File                                        | What it answers                                                     |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `references/api/managed-email-addresses.md` | the mint body, grades, refusal codes, the release response          |
| `references/api/sources.md`                 | the provider configs, health, the listening count, the version lock |

The sending step is `email.send`; the handlers that read Telegram channels are `telegram.stats`, `telegram.resolve-channel` and `telegram.search-channels`. Their config and examples are under `kipory-build`'s `references/handlers/`.

## Then

`kipory-operate` to bind a trigger to the source. `kipory-build` to author the flow that sends the mail or processes the messages. `kipory-secrets` if a handler wanted a vendor credential rather than a sending identity. `kipory-diagnose` when a message should have gone and the run's step log says otherwise.
