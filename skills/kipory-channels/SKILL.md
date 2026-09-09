---
name: kipory-channels
description: Connect a Kipory project to the outside world — claim a managed email address a flow can send from, and watch a Telegram channel as a source whose messages a trigger turns into flow runs. Use when the user wants a flow to send mail from their own address, asks why an email step was refused, wants to ingest a Telegram channel, or asks why a source reports enabled but nothing arrives. Not for storing vendor API keys (that is secrets), not for the trigger itself (that is kipory-operate) and not for the outbound step (that is a flow).
license: MIT
---

# Email addresses and sources

Two resources at the edge of a project. A **managed email address** is a sending identity the outbound mail step sends _as_; a **source** is something outside your flows that writes events into the project's log — a Telegram channel the platform watches today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow: a **trigger** pointing at it does (`kipory-operate`). The fact most people get wrong about addresses: they are checked when the run happens, not when you save — a flow referencing an address nobody minted saves cleanly and refuses at send time with one indistinguishable refusal.

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
POST   /v1/managed-email-addresses/{id}/disable          stop it sending, keep the claim
POST   /v1/managed-email-addresses/{id}/enable
DELETE /v1/managed-email-addresses/{id}                  release the name — anyone on the platform may claim it next
```

Then, in the flow, an `email.send` step names the address in its **config** (`address`) and takes the recipient, subject and text from **slots**. Who you send _as_ is a design-time decision a reviewer can read off the flow; who you send _to_ is per-run data.

**A channel to watch.**

```
GET    /v1/sources?project={nodeId}[&provider=telegram]     every source, with health and how many triggers listen
POST   /v1/sources                { project, provider: "telegram", config: { channel }, key?, name? } → 201
GET    /v1/sources/{id}
PATCH  /v1/sources/{id}           { version, name?, config? }   — config REPLACES wholesale; the provider cannot change
POST   /v1/sources/{id}/enable    { version }
POST   /v1/sources/{id}/disable   { version }
DELETE /v1/sources/{id}           409 while a trigger listens
GET    /v1/sources/{id}/events    the newest events this source wrote
```

The first Telegram source in a project seeds a `telegram` event category and its `message` type into the project's registry. Then bind a flow with a trigger: `POST /v1/triggers` with `sourceId`, `category: "telegram"`, `event: "message"`, the flow and its inputs (`kipory-operate` has the rest). Each message is one `telegram/message` event in the project's log, and the trigger runs the flow with the envelope in the reserved `event` slot: the text, channel and message id under `event.data`, the attachments' file ids under `event.data.fileIds`.

## What will bite you

- **The address namespace is platform-wide and first-come.** A `POST` on a name someone else holds is a 409 that never says who holds it. Local parts are lowercase letters, digits, dots, hyphens and underscores, start and end alphanumeric, at most 64 characters, and **no `+`**. A reserved list (`admin`, `support`, `noreply`, `postmaster` and others) is refused for everyone; the 422 carries the whole list.
- **Two grades, and the platform records but cannot create one.** `relay` has no account; replies fall to the catch-all. `mailbox` is a real provisioned account with a daily send cap — and it must be created in the delivery service's own console; the API only records the grade. There is no verification state and no DNS step to perform or poll.
- **Which domains are sendable is the deployment's decision**, not yours. A `domain-not-sendable` 422 names the sendable ones.
- **Disable is not off for an inheriting node.** Ownership reaches downward; a disabled address is skipped, not switched off for the tree. A root-owned address serves only the root itself.
- **At send time there is exactly one refusal.** Absent, disabled and out-of-reach all give the same `address-not-available`. Nothing at save time checks the address exists or that this project may use it.
- **The mail step's `true` means queued, not delivered.** Delivery is handed off after the run's writes commit; a step that fails afterwards, a discarded fan-out branch, or a failed precondition means it never goes. And the step is **not** convergent across branches: two fan-out branches reaching it send two messages, and a re-run schedule sends again.
- **One recipient per step.** A list in the recipient slot does not fan out.
- **A source that reports `enabled: true` with health `unknown` is not being read.** The platform's own Telegram accounts are what watch channels; `health.health` is `live` or `stale` only when a watcher shard owns the channel. Nothing on your row provisions those accounts.
- **A source nothing listens to still costs its connection** and a media copy per message. `listening: 0` is the tell.
- **A blocked payer still gets the event.** The event is written with `mediaSkipped`
  <!-- field-ok: mediaSkipped — a key the Telegram ingress writes INTO the event payload, not a
       field on any request or response body; it says why the media copy was withheld -->
  set and no files; the trigger's ledger records `blocked` with the reason. Enable the payer and replay from the ledger.
- **`version` is required on every source write** — patch, enable and disable. A stale one is a 409; re-read and retry. A provider's own report (member counts, health) never bumps it. An address has no version and no lock.
- **`createdByUserId` is always null for a key**, and it is provenance only — the flow never runs as that person.
- **Disabling a source stops future events.** It removes nothing already recorded, and enabling it later does not catch up.
- **Only `telegram` can be created today.** `webhook`, `postgres` and `apify` are in the provider registry and refused at create with 422 until their writers land.

## References

| File                                        | What it answers                                                     |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `references/api/managed-email-addresses.md` | the mint body, grades, refusal codes, the release response          |
| `references/api/sources.md`                 | the provider configs, health, the listening count, the version lock |

The sending step is `email.send`; the handlers that read Telegram channels are `telegram.stats` and `telegram.resolve-channel`. Their config and examples are under `kipory-build`'s `references/handlers/`.

## Then

`kipory-operate` to bind a trigger to the source. `kipory-build` to author the flow that sends the mail or processes the messages. `kipory-secrets` if a handler wanted a vendor credential rather than a sending identity. `kipory-diagnose` when a message should have gone and the run's step log says otherwise.
