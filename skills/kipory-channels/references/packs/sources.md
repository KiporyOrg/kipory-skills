<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · version: 7a133b738d59 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# Capability pack — Sources

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

A source is a thing that writes events into your project's event log from outside your own
flows: a Telegram channel the platform watches today; a webhook URL, a Postgres table and an Apify
actor next. It is the other half of a trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`). The source writes `telegram/message`
rows as they happen; a trigger pointing at that source runs a flow for each one, with the same
ledger, the same overlap policy and the same replay every trigger has. **A source never names a
flow.** "One message, three flows" is one source, one event and three triggers — which is what it
always was underneath.

Every source has a **provider** (`telegram`, `webhook`, `postgres`, `apify`) and a **config** in
that provider's own shape, validated by that provider's schema at every write. The first source of
a provider in a project seeds the provider's event vocabulary into the project's
registry (capability pack `events` — `GET /v1/capability-packs/events`): a `telegram` category, durable by default and project-scoped, and its
`message` type. Those rows are permanent once seeded: the delete refuses them outright, whatever
else is true — deleting every source of that provider does not release them, and neither does
never having created one. A category of your own already holding the key is a 409 rather than
adopted.

## When you need it — and when you don't

You need a source when something **outside** your flows should start one: a message in a channel,
a request to a URL, a row in someone's database. You do not need one to react to your own flows'
events — a trigger on a `post/created` your flow emits has no source at all — and you do not need
one for the clock: a schedule (capability pack `schedules` — `GET /v1/capability-packs/schedules`) fires its flow directly.

## The sequence

```
GET    /v1/sources?project={nodeId}[&provider=telegram]      every source, newest first, with health and the listening count
POST   /v1/sources                                           { project, provider, config, key?, name? } → 201
GET    /v1/sources/{id}
PATCH  /v1/sources/{id}                                       { version, name?, config? }   — config REPLACES wholesale
POST   /v1/sources/{id}/enable                                { version }
POST   /v1/sources/{id}/disable                               { version }
DELETE /v1/sources/{id}                                       409 while a trigger listens
GET    /v1/sources/{id}/events?limit=50                       the newest events this source wrote
```

Then a trigger: `POST /v1/triggers` with `sourceId`, `category: "telegram"`, `event: "message"`,
the flow and its inputs. The trigger hears that source's events and no other's — the match is
structural, not a filter clause, so you never write `channel is @x` yourself.

A Telegram source's config carries two fields: `channel`, a public `@handle` or a numeric channel
id, and `strategy`, which names the adapter that reads it. You may omit `strategy` — it defaults to
the platform's own watcher fleet, the only adapter that runs today — but the write stores what it
parsed, so the field comes back on every read whether or not you sent it.

The key is slugified from the channel when you do not supply one (`@alexavni` → `alexavni`), and is
unique per project and provider. That uniqueness is not what keeps a channel from being watched
twice: you may supply a key yourself, and a patch may repoint the config without touching the key.
The channel itself is guarded separately — the database holds one source per channel per project,
and the design layer gets there first with a 409 naming the source that already watches it. Two
sources on one channel would mean two events, two media copies and two admissions for one message,
so a create or a patch that would produce one is refused rather than reconciled.

## What the flow receives

The envelope in the reserved `event` slot. Its payload sits under the envelope's `data` field, and
for a Telegram message that payload carries:

- `channel` — the handle or id the source watches.
- `messageId` — the message's own id in that channel.
- `date`, and `editDate` when the message has been edited.
- `text` — the message body, empty when there is none.
- `media` — one entry per attachment, each carrying its kind, its mime type, and this project's own
  `fileId` for the copy (or null when no copy was made).
- `fileIds` — the flat list of materialised file ids, for a flow that wants them without walking
  the attachments.
- `forwardedFrom` — the origin when the message was forwarded, otherwise null.
- `views` — the view count the watcher last saw.
- `reactions` — the reaction counts the watcher last saw.
- `updateType` — one of "new", "edited" or "deleted".
- `deletedUpstream` — true once the message is gone from the channel. The record is kept and
  flagged, never removed.

An edited message is a second event with a different id; a deleted one a third.

## What the platform refuses

- A provider it has no writer for yet — `webhook`, `postgres`, `apify` are 422 at create until
  they land; the catalogue lists them as coming.
- A config the provider's schema rejects, with 422 naming the field.
- A key already taken for the provider in the project (409).
- A create or a patch that would point a second source at a channel this project already watches
  (409 naming the source that has it).
- A delete while any trigger listens (409, with the count). Delete the triggers first, on purpose.
- A category or type of your own already holding the provider's key (409 at the first create).

## What the platform guarantees

- **One event per message per project**, whatever the watcher redelivers. Two things hold it: one
  channel is one source, refused at the database rather than by convention, and the event id is
  deterministic from the provider, the source and the message's own variant key, with the log's
  primary key as the gate. A new message, an edit and a delete are three variants, so they are
  three events — the guarantee is against redelivery, not against change upstream.
- **Media once per project.** Attachments are copied into the project's own files once, keyed by
  the source, never once per trigger.
- **A blocked payer still gets the event.** When the project cannot be admitted, the event is
  written with `mediaSkipped`
  <!-- field-ok: mediaSkipped — a key the Telegram ingress writes INTO the event payload, not a
       field on any request or response body; it says why the media copy was withheld -->
  set and no file copies; the trigger's ledger records `blocked` with
  the reason. Nothing is silently dropped.
- **Health is stated in words**, merged in a fixed order: the provider's own failure or block
  first, then what the platform knows (for Telegram, whether a watcher shard currently owns the
  channel and when it last reported), then the provider's own word, then `unknown`.

## What will bite you

- **A source nothing listens to still costs its connection** and, for Telegram, a media copy per
  message. The list shows `listening: 0`; the app shows "nothing listens".
- **`enabled: true` with health `unknown` means no watcher shard owns the channel.** The platform's
  own Telegram accounts are what read channels; nothing on your row provisions them.
- **A disabled source writes nothing, and enabling it later does not catch up.** The events that
  arrived in between were never recorded; there is nothing to replay.
- **`version` is required on every write** — patch, enable and disable. A stale one is a 409;
  re-read and retry. A provider's own report (participants, health) never bumps it.
- **The provider cannot change.** A different provider is a new source.
