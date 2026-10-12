<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `telegram.resolve-channel` — Fetch a Telegram channel

Look up a public Telegram channel: its name, members, description, and picture.

A recent answer is reused; otherwise it waits for a fresh one. A failed lookup returns the reason.

- **Group:** sources · **Phase:** `ingest` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `string` → `TelegramChannelResolution`
- **Also found as:** telegram group, channel info, telegram profile
- **Reads:** One handle — `@name`, `name`, or a `t.me` link. An invite link is not a handle and cannot be resolved. _(shape hint: `string`)_
- **Emits:** A `TelegramChannelResolution`. The channel is present exactly when the lookup succeeded, so gate on it; otherwise the reason comes back in its place.
- **Suggested input streams:** `handle`
- **Queue:** 2 attempts, fixed from 2 s; waits up to 30 s; cache 6 hours — the function's default; an action replaces it with `reuseResultsForMinutes` (`0` always fetches fresh)

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `freshnessMinutes` | number | no | `360` | Minutes a saved answer stays fresh enough to reuse. |
| `maxWaitMs` | number | no | `25000` | Milliseconds to wait for a fresh answer before giving up. |
| `pollIntervalMs` | number | no | `1000` | How often to check whether the answer has arrived. |

## Worked example

Resolves a public Telegram channel from its handle, or says why it could not.

#### A public channel

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
  "thumbnailUrl": "https://api.example.com/v1/files/raw/eyJr…",
  "status":       "ready"
}
```

#### Not a channel

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

#### An invite link

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
