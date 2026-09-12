<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: a5065908712202c7c97f0313289f9dec68a495faa83ce329d7da15d7c2d26748 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `telegram.stats` — Read Telegram channel stats

Read a Telegram channel's latest captured member count from this project's source.

- **Group:** Sources · **Phase:** `inline` · **Effect class:** `read`
- **I/O:** `string` → `TelegramChannelStats`
- **Reads:** One channel handle, exactly as this project stored it. A channel another project subscribes to reads as unknown here. _(shape hint: `string`)_
- **Emits:** A `TelegramChannelStats` — the handle, the member count, and when it was captured. Empty when nothing has been captured for this channel in this project.
- **Suggested input streams:** `channel`

## Config

_No operator-tunable config._

## Worked example

Reads the member count last captured for a Telegram channel this project subscribes to.

Reads: look up channel. Emits: channel stats.

#### stats-swept channel

The mtproto watcher has pushed a participant count for this channel — the handler reads the freshest stamp.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@durov
```

Output:

```
{
  "channel":      "@durov",
  "participants": 743211,
  "capturedAt":   "2026-07-21T20:00:00.000Z"
}
```

#### not yet swept

Subscribed, but nothing has been captured yet — or this project does not subscribe at all.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@brand-new-channel
```

Output:

```
{}
```
