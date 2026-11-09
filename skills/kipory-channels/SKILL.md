---
name: kipory-channels
description: Send email from a Kipory flow and subscribe a project to a Telegram channel — claim the managed address an `email.send` step sends from, and create the source whose messages a trigger turns into flow runs. Email and push notifications are the built-in outbound channels (no SMS or chat function; a service with an HTTP API is reached with `url.send`, kipory-gather) and Telegram the only source provider today. Use when the user wants a flow to send mail (a notification, a digest, a welcome message), asks why an email step was refused or a message never arrived, wants every new message in a Telegram channel to start a flow, or asks why a source reads enabled but nothing arrives. Not for searching Telegram or reading a channel once inside a flow (kipory-gather), not for the trigger's own settings (kipory-operate), not for vendor API keys (kipory-secrets).
license: MIT
---

# Email addresses and sources

Two resources at the edge of a project. A **managed email address** is a sending identity the outbound mail step sends _as_; a **source** is something outside your flows that writes events into the project's log — a Telegram channel the platform watches today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow: a **trigger** pointing at it does (`kipory-operate`). Email and push notifications (`push.send`, below) are the built-in ways a flow reaches a person: there is no SMS or chat-send function — a service that sends those through an HTTP API is reached with `url.send` (`kipory-gather`) — and a Telegram source only reads (`kipory-connect`'s `references/packs/limits.md`, What a flow can reach). <!-- absent-function: sms.* --> <!-- absent-function: chat.* --> The fact most people get wrong about addresses: they are checked when the run happens, not when you save — a flow referencing an address nobody minted saves cleanly and its mail step fails on every run with one indistinguishable refusal.

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

Then, in the flow, an `email.send` step names the address as a fixed value in `with.address` and reads `to`, `subject` and `text` as arguments — `to: member.email`, `subject: { literal: "Your box ships Friday" }`. Who you send _as_ is a design-time decision a reviewer can read off the flow; who you send _to_ is per-run data.

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

The first Telegram source in a project seeds its `message` event type, in the `telegram` namespace, into the project's registry — a namespace only the source writes. Then bind a flow with a trigger: `POST /v1/triggers` with `sourceId`, `categoryKey: "telegram"`, `eventKey: "message"`, the flow and its inputs (`kipory-operate` has the rest). Each message is one `telegram/message` event in the project's log, and the trigger runs the flow with the envelope in the reserved `event` value: the text, channel and message id under `event.data`, the attachments' file ids under `event.data.fileIds`.

A channel the project does not watch yet is one write, not two: `POST /v1/triggers` with `newSource` (the body a source create takes — `provider`, `config`, optionally `key` and `label`) in place of `sourceId` creates the source and the trigger in one transaction, so a trigger the platform refuses leaves no source behind. Sending both is a 422.

## Push notifications

A flow notifies people on their phones with `push.send`. Three pieces, in this order:

<!-- key-unreachable-ok: POST /v1/devices — the person's own app calls it with their session; named so you build that call into the app, never for your key to make -->

1. **The app's key, in the project's vault** — your own; Kipory holds none. An iOS app stores an `apns_key` secret (Team ID, Key ID, the `.p8` file) and an Android app an `fcm_service_account` secret (the service-account JSON), each with the app's bundle id or package name as its `purpose`; an APNs key used for one environment only takes `<appId>:sandbox` or `<appId>:production` (`kipory-secrets`). Saving one asks Apple or Google once and answers `check` — a refusal never blocks the save.
2. **The device, registered by the app** — the person's app calls `POST /v1/devices` on the project's host with the person's own session (`pushService`, `token`, `appId`, `environment` for iOS) every time it gets a token. A key cannot register a device. A device goes when that session signs out, when the person leaves the project, when Apple or Google say the token is dead, and after 90 days unseen.
3. **The step** — `push.send` with `recipient` (the run's own person by default, one named person, or a list), a title and body for an `alert` or data only for a `background` push. It stages one push that leaves after the run saves, to every device the people hold then. It answers a `PushSendResult` — counts, never who.

Each device delivery costs credits, charged once Apple or Google answer. A project has a daily delivery allowance and a person an hourly one for alerts. A preview sends nothing and answers the counts with `preview: true`. Whether a push arrived: `GET /v1/pushes?project={nodeId}` lists each push of the last 30 days with its people and devices and, per device, `sent`, `removedDead`, `credentialMissing` (no key for that app), `credentialFailing` (Apple or Google refused the key) or a limit — never a title, body or token.

## What will bite you

Each of these is a trap with its explanation and remedy in [references/pitfalls.md](references/pitfalls.md). Read the entry before you build on the thing it names:

- Working around a problem in silence.
- The address namespace is platform-wide and first-come.
- Two grades, and the platform records but cannot create one.
- Which domains are sendable is the deployment's decision
- Disable is off for the whole tree.
- An address that cannot send fails the step, not the save.
- Mail goes to any address, under the project's own daily cap.
- The mail step answers the message's id, a string, and the id means queued, not delivered
- A recipient that is not an email address fails the step.
- One recipient per step; a list fails the step.
- A test user receives no mail.
- The platform mails nobody when a run fails.
- A message that did not arrive is an event you can listen for.
- A source that reports `enabled: true` with health `unknown` is not being read.
- A paused trigger drops the source's events for good.
- A source nothing listens to still costs its connection
- A blocked payer still gets the event.
- `version` is required on every source write
- `createdByUserId` is always null for a key
- Disabling a source stops future events.
- Only `telegram` can be created today.

## References

| File                                        | What it answers                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `references/packs/sources.md`               | the judgment: providers, health, what a source writes and guarantees, when nothing listens |
| `references/api/managed-email-addresses.md` | the mint body, grades, refusal codes, the release response                                 |
| `references/api/sources.md`                 | the provider configs, health, the listening count, the version lock                        |
| `references/pitfalls.md`                    | each trap of sending mail and watching a source, with what happens and what to do          |

The sending step is `email.send`. Three <!-- count: functions-in-family-telegram --> functions read Telegram inside a flow, without a source:

- `telegram.stats` — the member count last captured for a channel this project already watches; it makes no outside call and is empty for a channel the project has no source for.
- `telegram.resolve-channel` — one public channel by handle or `t.me` link: name, members, description, picture (`kipory-gather`).
- `telegram.search-channels` — public channels matching search terms (`kipory-gather`).

Their config and examples are under `kipory-build`'s `references/functions/`.

## Then

`kipory-operate` to bind a trigger to the source. `kipory-gather` to find or look up a Telegram channel inside a flow rather than subscribe to it. `kipory-build` to author the flow that sends the mail or processes the messages. `kipory-secrets` if a function wanted a vendor credential rather than a sending identity. `kipory-diagnose` when a message should have gone and the run's timeline says otherwise.
