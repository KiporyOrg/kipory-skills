---
name: kipory-channels
description: Send email from a Kipory flow and subscribe a project to a Telegram channel — claim the managed address an `email.send` action sends from, and create the source whose messages a trigger turns into flow runs. Email is the only built-in outbound channel (no SMS, push or chat function; a service with an HTTP API is reached with `url.send`, kipory-gather) and Telegram the only source provider today. Use when the user wants a flow to send mail (a notification, a digest, a welcome message), asks why an email action was refused or a message never arrived, wants every new message in a Telegram channel to start a flow, or asks why a source reads enabled but nothing arrives. Not for searching Telegram or reading a channel once inside a flow (kipory-gather), not for the trigger's own settings (kipory-operate), not for vendor API keys (kipory-secrets).
license: MIT
---

# Email addresses and sources

Two resources at the edge of a project. A **managed email address** is a sending identity the outbound mail action sends _as_; a **source** is something outside your flows that writes events into the project's log — a Telegram channel the platform watches today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow: a **trigger** pointing at it does (`kipory-operate`). Email is the only built-in way a flow reaches a person: there is no SMS, push or chat-send function — a service that sends those through an HTTP API is reached with `url.send` (`kipory-gather`) — and a Telegram source only reads (`kipory-connect`'s `references/packs/limits.md`, What a flow can reach). <!-- absent-function: sms.* --> <!-- absent-function: push.* --> <!-- absent-function: chat.* --> The fact most people get wrong about addresses: they are checked when the run happens, not when you save — a flow referencing an address nobody minted saves cleanly and its mail action fails on every run with one indistinguishable refusal.

## Before the first call

- Both hubs answer on the api host with your key. Addresses attach to a **node** and are inherited downward; sources attach to a **project**.
- Every write on an address is **ADMIN**; on a source, create and edit are EDITOR and delete is ADMIN.
- Read `references/api/managed-email-addresses.md` and `references/api/sources.md` for the fields.
- Fetch `references/packs/sources.md` before creating a source: the providers, what a source writes, what the platform guarantees about it, and what `validateOnly` answers.

## The sequence

**An address to send from.**

```
GET    /v1/managed-email-addresses?node={nodeId}        this node's OWN addresses — inherited ones are not listed
POST   /v1/managed-email-addresses                      { node, localPart, domain, grade, displayName?, replyTo? } → 201
PATCH  /v1/managed-email-addresses/{id}                  displayName · replyTo · grade — the address itself never renames
                                                          enabled: false stops it sending and keeps the claim; true resumes
DELETE /v1/managed-email-addresses/{id}                  release the name — anyone on the platform may claim it next
```

Then, in the flow, an `email.send` action names the address in its **config** (`address`) and takes the recipient, subject and text from **slots**. Who you send _as_ is a design-time decision a reviewer can read off the flow; who you send _to_ is per-run data.

**A channel to watch.**

```
GET    /v1/sources/providers                                the provider registry — availability says which can be created today
GET    /v1/sources?project={nodeId}[&provider=telegram]     every source, with health, how many triggers listen and deleteRefusal
POST   /v1/sources                { project, provider: "telegram", config: { channel }, key?, label? } → 201
GET    /v1/sources/{id}
PATCH  /v1/sources/{id}           { version, label?, config? }  — config REPLACES wholesale; the provider cannot change
PATCH  /v1/sources/{id}          { version, enabled } — switch it off or on
DELETE /v1/sources/{id}           409 SOURCE_HAS_LISTENERS while a trigger listens — the read's deleteRefusal says so first; ?validateOnly=true asks without deleting
GET    /v1/project-events?project={nodeId}&sourceId={id}   the events this source wrote, newest first, cursor-paged
```

The first Telegram source in a project seeds its `message` event type, in the `telegram` namespace, into the project's registry — a namespace only the source writes. Then bind a flow with a trigger: `POST /v1/triggers` with `sourceId`, `categoryKey: "telegram"`, `eventKey: "message"`, the flow and its inputs (`kipory-operate` has the rest). Each message is one `telegram/message` event in the project's log, and the trigger runs the flow with the envelope in the reserved `event` slot: the text, channel and message id under `event.data`, the attachments' file ids under `event.data.fileIds`.

A channel the project does not watch yet is one write, not two: `POST /v1/triggers` with `newSource` (the body a source create takes — `provider`, `config`, optionally `key` and `label`) in place of `sourceId` creates the source and the trigger in one transaction, so a trigger the platform refuses leaves no source behind. Sending both is a 422.

## What will bite you

- **The address namespace is platform-wide and first-come.** A `POST` on a name someone else holds is a 409 that never says who holds it. Local parts are lowercase letters, digits, dots, hyphens and underscores, start and end alphanumeric, at most 64 characters, and **no `+`**. A reserved list (`admin`, `support`, `noreply`, `postmaster` and others) is refused for everyone; the 422 carries the whole list.
- **Two grades, and the platform records but cannot create one.** `relay` has no account; replies fall to the catch-all. `mailbox` is a real provisioned account with a daily send cap — and it must be created in the delivery service's own console; the API only records the grade. There is no verification state and no DNS step to perform or poll.
- **Which domains are sendable is the deployment's decision**, not yours. Where the deployment restricts them, claiming an address on another domain is a `domain-not-sendable` 422 whose `details.sendableDomains` names the allowed ones — that 422 is the only read of the list. Where it restricts nothing (a local stack, typically) every well-formed domain claims with 201, which proves nothing about whether mail from it can be delivered.
- **Disable is off for the whole tree.** A send names one exact address, and a disabled one is refused for every node — there is no fallback to another address. Ownership reaches downward, so an organisation's address serves its projects and a project's does not serve its organisation; a root-owned address serves only the root itself.
- **An address that cannot send fails the action, not the save.** When the mail action runs it checks the sender before queueing anything: absent, disabled and out-of-reach all give the same `address-not-available`; an active address on a domain this deployment does not send from gives `domain-not-sendable`. The action fails with that reason in the run's timeline, no message is queued, and a synchronous caller's `502` carries it as `details.reason`. Nothing at save time checks any of it, so run the flow once against a mailbox you can read before relying on it. The delivery job asks again when it sends; an address disabled between the run and the send is refused there, after the action answered `true`, and only the timeline and the delivery job's result show that.
- **Mail goes to any address, under the project's own daily cap.** The recipient need not be a member of the project, and a project with no members can send. Each project may send a fixed number of messages per UTC day (200 by default, set by the deployment); past it the mail action fails with `project-mail-cap-reached` (a synchronous caller's `502` carries it as `details.reason`; an async run names it in `statusError` and in its run's `failure.reason`), and other projects are unaffected. The cap is counted when the action queues a message, so a message a later failure discards still counts.
- **The mail action's `true` means queued, not delivered** — not even accepted. Delivery is handed off after the run's writes commit; an action that fails afterwards, a discarded fan-out branch, or a failed precondition means it never goes. And the action is **not** convergent across branches: two fan-out branches reaching it send two messages, and a re-run schedule sends again.
- **One recipient per action.** A list in the recipient slot does not fan out.
- **A source that reports `enabled: true` with health `unknown` is not being read.** The platform's own Telegram accounts are what watch channels. `health.health` reads `live` (a watcher owns the channel and reported recently) or `stale` (it owns it and has gone quiet) only when a watcher is assigned; `failed` (the last attempt to read the channel failed) and `blocked` (the project could not be admitted) come first, with a line in `health.detail`; `unknown` means no watcher has the channel. No call of yours assigns one: tell the human the deployment's operator has to assign the channel to a watcher.
- **A source nothing listens to still costs its connection** and a media copy per message. `listening: 0` is the tell.
- **A blocked payer still gets the event.** The event is written with `mediaSkipped`
  <!-- field-ok: mediaSkipped — a key the Telegram ingress writes INTO the event payload, not a
       field on any request or response body; it says why the media copy was withheld -->
  set and no files; the trigger's decision log records `blocked` with the reason. Enable the payer and replay that decision.
- **`version` is required on every source write** — every patch, switching `enabled` included. A stale one is a 409; re-read and retry. A provider's own report (member counts, health) never bumps it. An address has no version and no lock.
- **`createdByUserId` is always null for a key**, and it is provenance only — the flow never runs as that person.
- **Disabling a source stops future events.** It removes nothing already recorded, and enabling it later does not catch up.
- **Only `telegram` can be created today.** `webhook`, `postgres` and `apify` are in the provider registry and refused at create with 422 until their writers land. Do not remember the list: `GET /v1/sources/providers` returns each provider's `availability` — `available` can be created, `soon` is refused — from the same rule the create applies.

## References

| File                                        | What it answers                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `references/packs/sources.md`               | the judgment: providers, health, what a source writes and guarantees, when nothing listens |
| `references/api/managed-email-addresses.md` | the mint body, grades, refusal codes, the release response                                 |
| `references/api/sources.md`                 | the provider configs, health, the listening count, the version lock                        |

The sending action is `email.send`. Three <!-- count: functions-in-family-telegram --> functions read Telegram inside a flow, without a source:

- `telegram.stats` — the member count last captured for a channel this project already watches; it makes no outside call and is empty for a channel the project has no source for.
- `telegram.resolve-channel` — one public channel by handle or `t.me` link: name, members, description, picture (`kipory-gather`).
- `telegram.search-channels` — public channels matching search terms (`kipory-gather`).

Their config and examples are under `kipory-build`'s `references/functions/`.

## Then

`kipory-operate` to bind a trigger to the source. `kipory-gather` to find or look up a Telegram channel inside a flow rather than subscribe to it. `kipory-build` to author the flow that sends the mail or processes the messages. `kipory-secrets` if a function wanted a vendor credential rather than a sending identity. `kipory-diagnose` when a message should have gone and the run's timeline says otherwise.
