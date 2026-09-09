<!-- generated: kipory-skills references · source: the deployment's handler catalog · version: d072dbbaba4c884693c307f89e8caf652dda27202fb703e86af59b78f690b003 · regenerated on every publish, so an edit here is overwritten; the deployment you are building on may serve a newer version — compare and prefer the live one -->

# `telegram.resolve-channel` — Resolve a Telegram channel

Resolve a public Telegram channel by handle (members, name, description, avatar).

- **Group:** Sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **I/O:** `string` → `TelegramChannelResolution`
- **Reads:** One handle — `@name`, `name`, or a `t.me` link. An invite link is not a handle and cannot be resolved. _(shape hint: `string`)_
- **Emits:** A `TelegramChannelResolution`. The channel is present exactly when the lookup succeeded, so gate on it; otherwise the reason comes back in its place.
- **Suggested input streams:** `handle`
- **Queue:** 2 attempts, fixed from 2000ms; waits up to 30000ms; cache 21600000ms (custom-derive-source)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `freshnessMinutes` | number | no | `360` | How fresh a cached answer has to be to be reused. Older than this and the step asks again. |
| `maxWaitMs` | number | no | `25000` | How long to wait for a fresh answer before giving up. Waiting longer costs the run, not the channel. |
| `pollIntervalMs` | number | no | `1000` | How often to check whether the answer has arrived. |

## Worked example

Resolves a public Telegram channel from its handle, or says why it could not.

Reads: resolve handle. Emits: resolved channel.

#### resolvable channel

A recent answer is reused; otherwise the lookup runs and returns the members, name, description and avatar.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@durov
```

Output:

```
{
  "channel":      "durov",
  "participants": 743211,
  "title":        "Du rove",
  "about":        "Founder of Telegram",
  "thumbnailUrl": "https://.../telegram-avatars/durov/avatar.jpg",
  "status":       "ready"
}
```

#### not a channel

A real username, but a person, not a channel. The reason comes through, so a caller can reject it.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
@netanyahu
```

Output:

```
{
  "status": "failed",
  "error":  "not_channel"
}
```

#### nothing to resolve (invite link)

An invite link is not a public handle, so there is nothing to look up. The result is empty.

Reads `string` → emits `string` · 1 in → 1 out

Input:

```
t.me/+AbCdEf
```

Output:

```
{}
```
