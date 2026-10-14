---
name: kipory-channels
description: Send email from a Kipory flow and subscribe a project to a Telegram channel — claim the managed address an `email.send` action sends from, and create the source whose messages a trigger turns into flow runs. Email and push notifications are the built-in outbound channels (no SMS or chat function; a service with an HTTP API is reached with `url.send`, kipory-gather) and Telegram the only source provider today. Use when the user wants a flow to send mail (a notification, a digest, a welcome message), asks why an email action was refused or a message never arrived, wants every new message in a Telegram channel to start a flow, or asks why a source reads enabled but nothing arrives. Not for searching Telegram or reading a channel once inside a flow (kipory-gather), not for the trigger's own settings (kipory-operate), not for vendor API keys (kipory-secrets).
license: MIT
---

# Email addresses and sources

Two resources at the edge of a project. A **managed email address** is a sending identity the outbound mail action sends _as_; a **source** is something outside your flows that writes events into the project's log — a Telegram channel the platform watches today, a webhook, a Postgres table and an Apify actor next. A source never runs a flow: a **trigger** pointing at it does (`kipory-operate`). Email and push notifications (`push.send`, below) are the built-in ways a flow reaches a person: there is no SMS or chat-send function — a service that sends those through an HTTP API is reached with `url.send` (`kipory-gather`) — and a Telegram source only reads (`kipory-connect`'s `references/packs/limits.md`, What a flow can reach). <!-- absent-function: sms.* --> <!-- absent-function: chat.* --> The fact most people get wrong about addresses: they are checked when the run happens, not when you save — a flow referencing an address nobody minted saves cleanly and its mail action fails on every run with one indistinguishable refusal.

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

## Push notifications

A flow notifies people on their phones with `push.send`. Three pieces, in this order:

<!-- key-unreachable-ok: POST /v1/devices — the person's own app calls it with their session; named so you build that call into the app, never for your key to make -->

1. **The app's key, in the project's vault** — your own; Kipory holds none. An iOS app stores an `apns_key` secret (Team ID, Key ID, the `.p8` file) and an Android app an `fcm_service_account` secret (the service-account JSON), each with the app's bundle id or package name as its `purpose`; an APNs key used for one environment only takes `<appId>:sandbox` or `<appId>:production` (`kipory-secrets`). Saving one asks Apple or Google once and answers `check` — a refusal never blocks the save.
2. **The device, registered by the app** — the person's app calls `POST /v1/devices` on the project's host with the person's own session (`pushService`, `token`, `appId`, `environment` for iOS) every time it gets a token. A key cannot register a device. A device goes when that session signs out, when the person leaves the project, when Apple or Google say the token is dead, and after 90 days unseen.
3. **The action** — `push.send` with `recipient` (the run's own person by default, one named person, or a list), a title and body for an `alert` or data only for a `background` push. It stages one push that leaves after the run saves, to every device the people hold then. It answers a `PushSendResult` — counts, never who.

Each device delivery costs credits, charged once Apple or Google answer. A project has a daily delivery allowance and a person an hourly one for alerts. A preview sends nothing and answers the counts with `preview: true`. Whether a push arrived: `GET /v1/pushes?project={nodeId}` lists each push of the last 30 days with its people and devices and, per device, `sent`, `removedDead`, `credentialMissing` (no key for that app), `credentialFailing` (Apple or Google refused the key) or a limit — never a title, body or token.

## What will bite you

- **The address namespace is platform-wide and first-come.** A `POST` on a name someone else holds is a 409 that never says who holds it. Local parts are lowercase letters, digits, dots, hyphens and underscores, start and end alphanumeric, at most 64 characters, and **no `+`**. A reserved list (`admin`, `support`, `noreply`, `postmaster`, names that read as the platform's money, sign-in or staff such as `payments`, `invoices`, `login`, `team`, `legal`, `alerts`, and others) is refused for everyone, and so is any name containing `kipory`; the 422 carries the whole list. An address minted before a name joined the list keeps working. Every message the mail action sends carries a `List-Unsubscribe` aimed at its reply-to address, else at the sending address: a request to stop arrives there as mail, and nothing acts on it for you.
- **Two grades, and the platform records but cannot create one.** `relay` has no account; replies fall to the catch-all. `mailbox` is a real provisioned account with a daily send cap — and it must be created in the delivery service's own console; the API only records the grade. There is no verification state and no DNS work to perform or poll.
- **Which domains are sendable is the deployment's decision**, not yours. Where the deployment restricts them, `GET /v1/managed-email-addresses?node=` answers them as `sendableDomains`, so read it before claiming; a claim on another domain is refused 422 (`VALIDATION_FAILED`) with them in `details.sendableDomains`. `null` means the deployment restricts nothing (a local stack, typically): every well-formed domain then claims with 201, which proves nothing about whether mail from it can be delivered.
- **Disable is off for the whole tree.** A send names one exact address, and a disabled one is refused for every node — there is no fallback to another address. Ownership reaches downward, so an organisation's address serves its projects and a project's does not serve its organisation; a root-owned address serves only the root itself.
- **An address that cannot send fails the action, not the save.** When the mail action runs it checks the sender before queueing anything: absent, disabled and out-of-reach all give the same `address-not-available`; an active address on a domain this deployment does not send from gives `domain-not-sendable`. The action fails with that reason in the run's timeline, no message is queued, and a synchronous caller's `502` carries it as `details.reason`. Nothing at save time checks any of it, so run the flow once against a mailbox you can read before relying on it. The delivery job asks again when it sends; an address disabled between the run and the send is refused there, after the action answered, and the message's record shows it: `status: "refused"` with the reason on `GET /v1/mail-messages/{id}` (`kipory-diagnose`).
- **Mail goes to any address, under the project's own daily cap.** The recipient need not be a member of the project, and a project with no members can send. Each project may send a fixed number of messages per UTC day (200 by default, set by the deployment); past it the mail action fails with `project-mail-cap-reached` (a synchronous caller's `502` carries it as `details.reason`; an async run names it in `statusError` and in its run's `failure.reason`), and other projects are unaffected. The cap is counted when the action queues a message, so a message a later failure discards still counts.
- **The mail action answers the message's id, a string, and the id means queued, not delivered** — not even accepted. Delivery is handed off after the run's writes commit; an action that fails afterwards, a discarded fan-out branch, or a failed precondition means it never goes, and the id it answered then names no message (`GET /v1/mail-messages/{id}` is a 404). Write the id to a record field when the flow must find the message later: `GET /v1/mail-messages/{id}` reads what happened to it, and `sent` there means the relay accepted it, never that it reached an inbox. A later action that took this output as a boolean now receives a string: read the id as a string or drop the read. The flow's health (`GET /v1/flows/{id}/health`) reports each such reader, in a flow saved before the change as in a new one: an action input typed boolean, a condition comparing the output with `true`, a flow output typed boolean. A save of the reading action answers the same finding in `outstandingIssues`. It is reported, not refused, and the flow still runs — with an id where it expected yes or no — so read the health of every flow that sends mail. And the action is **not** convergent across branches: two fan-out branches reaching it send two messages, and a re-run schedule sends again.
- **A recipient that is not an email address fails the action.** The recipient slot must hold an address: a bare one (`ada@example.com`) or a name with the address in angle brackets (`Ada <ada@example.com>`). Text with no address in it — a name alone, a sentence — fails the mail action with `recipient-not-an-address`, and so does text no mail server could be handed as one address: longer than 998 characters, an address with a second `@` in it (`a@b@c`), or two addresses joined by a slash or a bar (`ada@example.com/ben@example.com`). It fails in the run's timeline before anything is queued: no message, no record, nothing counted against the daily cap, and a synchronous caller's `502` carries it as `details.reason`. The failure never repeats what the slot held. A preview fails the same way. A message that still reaches delivery with no address the mail server could be given reads `status: "refused"`, `reason: "recipient-not-an-address"`, `fault: "sender"` on its record, after one try.
- **One recipient per action; a list fails the action.** A message goes to one address. More than one in the recipient slot — `ada@example.com, ben@example.com`, the same with a semicolon, a group, or one address written twice — fails the mail action with `more-than-one-recipient` in the run's timeline before anything is queued: no message to anyone, no record, nothing counted against the daily cap, and a synchronous caller's `502` carries it as `details.reason`. The failure never repeats the addresses. A preview fails the same way. To reach several people, run the action once for each of them, one address each time; each message then has its own id and its own record. Two different addresses with no comma between them are a list too — a space or a line break between them (`ada@example.com ben@example.com`), or one address written as the other's name (`ben@example.com <ada@example.com>`). A comma inside a quoted name is not a list: `"Lovelace, Ada" <ada@example.com>` is one recipient, and so is an address written as its own name (`ada@example.com <ada@example.com>`). A message already queued with a list reads `status: "refused"`, `reason: "more-than-one-recipient"`, `fault: "sender"` on its record, after one try, and is sent to nobody.
- **The platform mails nobody when a run fails.** No message is sent about a failed run, or about a schedule or trigger that is failing, quiet, about to be paused or paused. Mail about a failure is a flow of yours: a trigger on the `platform` event `run.failed` (and `run.failures`, the summaries) bound to a flow with an `email.send` action, which reads the subject and the failure from `event.data`. Prove it with `POST /v1/platform-events/test` before something fails (`kipory-operate`'s `references/when-a-run-fails.md`). That flow's own failure is reported to nobody — a run a platform event started causes no platform event — so check its mail action once against a mailbox you can read; a failure there shows in the trigger's own run history and as `failureTrigger: true` on `GET /v1/projects/{nodeId}/alerts`.
- **A message that did not arrive is an event you can listen for.** The first time a message rests on `refused`, `failed` or `bounced`, the platform records one `platform` event `mail.failed` in the project. Its `data` names the message (`messageId`), the run and action that sent it, the `recipient`, the `status`, a `reason`, whose failure it is (`fault`: `platform`, `sender` or `recipient`), the platform's sentence for the reason, and `messagePath`, the address of the message's record. It never holds the subject or the body. A trigger on it bound to a flow is how a project marks an address as bad or tells a person; nothing is recorded for a try that will be repeated or for a message the relay accepted. A message sent by a flow that a `platform` event started records no event when it fails, so read that one from `GET /v1/mail-messages` (`kipory-diagnose`). Prove the trigger with `POST /v1/platform-events/test` and `type: "mail.failed"`: the `subject` is still required and is not used (`kipory-operate`'s `references/when-a-run-fails.md`).
- **A source that reports `enabled: true` with health `unknown` is not being read.** The platform's own Telegram accounts are what watch channels. `health.health` reads `live` (a watcher owns the channel and reported recently) or `stale` (it owns it and has gone quiet) only when a watcher is assigned; `failed` (the last attempt to read the channel failed) and `blocked` (the project could not be admitted) come first, with a line in `health.detail`; `unknown` means no watcher has the channel. No call of yours assigns one: tell the human the deployment's operator has to assign the channel to a watcher.
- **A paused trigger drops the source's events for good.** A trigger whose runs kept failing can be paused by the platform (`pausedAt` on its read — only in a project that listens for `platform` / `health.pause-warned`). While it is paused no event is decided for it and nothing is recorded for those messages, so they are not in its decision log to replay; they stay in `GET /v1/project-events`. `POST /v1/triggers/{id}/resume` resumes it from then on; `failurePolicy: "keep-running"` on the trigger exempts it (`kipory-operate`).
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
