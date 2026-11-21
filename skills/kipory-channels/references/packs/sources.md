<!-- generated: kipory-skills references · source: the deployment's capability packs (`GET /v1/capability-packs`) · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# Capability pack — Sources

> **Source of truth for facts:** endpoint paths & request shapes → live `GET /v1/openapi.json`.
> This pack carries judgment.

## What it is

A source is a thing that writes events into your project's event log from outside your own
flows: a Telegram channel the platform watches today; a webhook URL, a Postgres table and an Apify
actor next. It is the other half of a trigger (capability pack `triggers` — `GET /v1/capability-packs/triggers`). The source writes `telegram/message`
rows as they happen; a trigger runs a flow for each one, with the same decision log, the same
overlap policy and the same replay every trigger has. **Nobody writes a source.** A trigger states
what it watches, and the platform keeps one source row for as long as a trigger or a record holds
it. "One message, three flows" is one source, one event and three triggers — which is what it
always was underneath.

Every source has a **provider** (`telegram`, `webhook`, `postgres`, `apify`) and the settings a
watch states in that provider's own shape, validated by that provider's schema at every write. The
first watch of a provider in a project seeds the provider's event vocabulary into the project's
registry (capability pack `events` — `GET /v1/capability-packs/events`): its `message` type in the `telegram` namespace, durable and
project-scoped. The namespace is the provider's alone — an event type you create there is a 409.
Those rows are permanent once seeded: the delete refuses them outright, whatever
else is true — letting go of every watch of that provider does not release them, and neither does
never having made one. A type of your own already holding one of the provider's keys is a 409
rather than adopted.

## When you need it — and when you don't

You need a source when something **outside** your flows should start one: a message in a channel,
a request to a URL, a row in someone's database. You do not need one to react to your own flows'
events — a trigger on a `post/created` your flow emits watches nothing — and you do not need
one for the clock: a schedule (capability pack `schedules` — `GET /v1/capability-packs/schedules`) fires its flow directly.

**A source only reads.** Nothing here sends a message into a channel. The one built-in way a flow
reaches a person is email; a service with an HTTP API is reached with a `url.send` step — see
limits (capability pack `limits` — `GET /v1/capability-packs/limits`). And a source is for a standing subscription — to look a
channel up once inside a flow, use the `telegram.resolve-channel` or `telegram.search-channels`
function instead.

## The sequence

A trigger states what it watches, in the document or on its own row:

```yaml
triggers:
  harbour-news:
    event: telegram/message
    watch: [{ channel: "@harbourdaily" }]
    flow: file-message
```

The trigger HOLDS each channel in its `watch`: the platform makes the project's source for a
channel the first time anything holds it, and the trigger hears the events of what it watches.
The match is structural, not a filter clause, so you never write `channel is @x` yourself. `watch`
may be edited; a disabled trigger, or one the platform paused, keeps its hold. A trigger on a
provider's event with no `watch` hears every source of that provider the project watches.

The sources themselves are read, never written:

```
GET    /v1/sources/providers                                 the provider registry: concerns, specs (each naming its `categoryKey`), availability, announced names
GET    /v1/sources?project={nodeId}[&provider=telegram]      every source, newest first, with health, the listening count and its holders
GET    /v1/sources/{id}
GET    /v1/project-events?project={nodeId}&sourceId={id}      the events this source wrote, newest first, cursor-paged
```

A Telegram watch carries `channel`, a public `@handle` or a numeric channel id. A source's read
also states `strategy`, the adapter that reads it — the platform's own watcher fleet, the only
adapter that runs today.

Read the registry rather than remembering it. Each provider names the setting that says what
a source watches (`naturalKeyField` — `channel` for Telegram), and every source comes back with
that value already read out as `naturalKey`, so a client never needs to know which field it was.
Each also declares `overlapDefault` — what a new trigger on it does when an event arrives while the
previous run is still going. A trigger that omits `overlapPolicy` takes it: `allow` for
Telegram, where skipping would drop that message for good, and `skip` for the rest. Start a form
from it rather than from a rule of your own.

One channel is one source per project, whoever holds it: two triggers and a record watching
`@harbourdaily` are three holds on one source. Two sources on one channel would mean two events,
two media copies and two admissions for one message, so the database holds one source per channel
per project.

A Telegram handle is stored in one spelling, lower-case: `@HarbourDaily` is written and read
back as `@harbourdaily`, and is the same channel as `@harbourdaily`. A numeric id is kept as sent.

## Watching on demand, from a flow

When **what is watched is decided by your users** — a person follows a creator, and through it a
channel — do not write a trigger per follow. A flow holds the watch with two steps:

- `source.watch` holds a watch on one channel for one **holder**: a record the run may write (its
  own, or a shared one), usually the record that stands for the follow. Any other value is refused
  (`HOLDER_NOT_WRITABLE`). The first holder makes the project's source for the channel; a later one
  adds a hold.
- `source.unwatch` lets that holder go. The channel stays watched while anyone else holds it — a
  record or a trigger; when the last hold goes, the platform stops reading it. It answers `{ sourceId, enabled, holders }`,
  `enabled` always present.
- **Letting go of a hold that was never placed is harmless.** A holder that never watched the
  channel, or whose hold is already gone, changes nothing: the step succeeds and answers the
  channel as it stands — `sourceId: null`, `enabled: false`, `holders: 0` when the project watches
  nothing for it. So an unfollow may always unwatch, without first asking whether the follow held
  a watch.
- **Deleting the holder record lets its watch go**, in the same transaction, by any path: a run's
  `record.delete`, `DELETE /v1/records/{id}`, or the person's account being erased. You do not
  write an unwatch for the delete.
- **From a schedule or a trigger, name the person.** Such a run acts for nobody, so on its own it
  may hold only with a shared record, which no account deletion removes. Set `userId` to the
  follow's owner and `holder` to the follow: the watch is then held by that person's own record
  and ends when their account is deleted. In a run that acts for a person, `userId` may name
  only that person; a name the run may not use answers `HOLDER_NOT_WRITABLE`, and an unwatch with
  it lets nothing go.

The routing stays yours, at design time: state **one** trigger on `event: telegram/message` with
**no `watch`**. Such a trigger hears every source of its provider in the project, so every channel a
flow watches runs that one flow, and no flow's data can point messages anywhere else. You may state
that trigger before the project watches any channel. Saving a flow with `source.watch` and no such trigger warns you.

What holds:

- **It lands with the run.** The watch is written with the run's other writes; a run that fails
  watches nothing.
- **A cap.** A project may keep at most 200 Telegram sources held (the platform can raise it for
  you); every held source counts, whether a record or a trigger holds it. A trigger save or a run
  that would watch past it is refused 409 `SOURCE_WATCH_CAP` and writes nothing (its `details` say how
  many are held, the cap and how many it would add; a document's finding sits on `triggers.<key>.watch`); holds on channels already
  watched never count.
- **About a minute** before the platform starts reading a newly watched channel.
- **What it costs** is the runs your trigger starts, one per message. Letting the last holder go
  stops them; the platform's own reader stays in the channel, which costs you nothing.
- **A preview or a suite case watches nothing**, `applyWrites: true` included. It answers what the
  step would have done — the same fields, `enabled` among them — plus `preview: true`. To make a watch for an existing record, run the flow
  for real as the record's owner.
- `GET /v1/sources` says who holds each source (`holders`: the triggers by key, the records as a count per table) and which triggers hear it (`heardBy`).

## What the flow receives

The envelope, as the reserved `event` value the flow reads (`event.data.…`). Its payload sits under the envelope's `data` field, and
for a Telegram message that payload carries:

<!-- field-ok: editDate — a field of the connector's event payload (the watcher writes it; no request carries it) -->
<!-- field-ok: forwardedFrom — a field of the connector's event payload (the watcher writes it; no request carries it) -->
<!-- field-ok: updateType — a field of the connector's event payload (the watcher writes it; no request carries it) -->
<!-- field-ok: deletedUpstream — a field of the connector's event payload (the watcher writes it; no request carries it) -->
<!-- field-ok: links — a field of the connector's event payload (the watcher writes it; no request carries it) -->
<!-- field-ok: thumbnailFileId — a field of the connector's event payload (the inbox drain writes it; no request carries it) -->

- `channel` — the handle or id the source watches.
- `messageId` — the message's own id in that channel.
- `date`, and `editDate` when the message has been edited.
- `text` — the message body as plain text, empty when there is none.
- `links` — every web link in the message, in order and once each, as `{ url, text }`: a link behind
  words gives its address and the words, a bare address gives it as `url` (with `https://` added
  when the message left it out) and as written in `text`. Only web (`http`/`https`) links are listed. `text` above
  keeps the words but not the address behind them.
- `media` — one entry per attachment, each carrying its kind, its mime type, and this project's own
  `fileId` for the copy (or null when no copy was made). A copy is made for a new message only,
  never for an edit, and only for an attachment of 50 MB or less. A video also carries
  `durationSec`, `width` and `height` where Telegram gave them, and `thumbnailFileId`: this
  project's copy of the video's own still (or null when there is none, as on an edit). The still is
  copied also when the video is too large to be.
- `fileIds` — the flat list of materialised file ids, for a flow that wants them without walking
  the attachments. A video's still is not among them.
- `forwardedFrom` — the origin when the message was forwarded, otherwise null.
- `views` — the view count the watcher last saw.
- `reactions` — the reaction counts the watcher last saw.
- `updateType` — one of "new", "edited" or "deleted".
- `deletedUpstream` — true once the message is gone from the channel. The record is kept and
  flagged, never removed.

An edited message is a second event with a different id; a deleted one a third.

**A copy is kept only once something claims it.** Attach it to a record (`fileIds` on
`record.create`, or `POST /v1/files/{id}/attach`) and it lives with the record. A copy nothing
claims is deleted after at least 7 days — a video's still too, so attach its `thumbnailFileId` when
you want to keep it.

## What the platform refuses

A watch is judged where it is written — on the trigger's save, in a plan, or in a `source.watch`
step — and refused before anything is written:

- A provider it has no writer for yet — 422. `GET /v1/sources/providers` says which:
  a provider whose `availability` is `soon` is refused, and that field is read from the same spec
  the write checks, so offer a watch exactly where it says `available`.
- Watch settings the provider's schema rejects, with 422 naming the field.
- A watch past the cap (409 `SOURCE_WATCH_CAP`).
- A type of your own already holding one of the provider's keys (409 at the first watch).

A provider's webhook secret, when a provider takes one, is stored in the vault, never in a watch.

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
  set and no file copies; the trigger's decision log records `blocked` with
  the reason. Nothing is silently dropped.
- **Health is stated in words**, merged in a fixed order: the provider's own failure or block
  first, then what the platform knows (for Telegram, whether a watcher shard currently owns the
  channel and when it last reported), then the provider's own word, then `unknown`.

## What will bite you

- **A source a record holds while no trigger listens still costs its connection** and, for
  Telegram, a media copy per message. The list shows `listening: 0`.
- **Health `unknown` on a held source means no platform reader has picked the channel up yet**, and
  the health's `detail` says so. A new source reads `unknown` for a short while before its first
  `live`. The platform's own Telegram accounts are what read channels; nothing on your row provisions
  them, and no call of yours changes it. If it lasts more than a few minutes, tell the human the
  deployment's operator has to look.
- **A channel nothing holds writes nothing, and holding it again later does not catch up.** The
  events that arrived in between were never recorded; there is nothing to replay.
- **A watch names its provider's settings, not a source.** Moving a watch to another channel is an
  edit of the trigger's `watch`; the old channel is let go when nothing else holds it.
