<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `source.unwatch` — Stop watching a source

Let go of a channel's watch for one holder; the last one switches it off.

Removes one holder's watch on a channel. Others' holds keep it watched; the last one switches the source off, never deleting it. A holder that held nothing changes nothing, and a failed run changes nothing.

- **Group:** sources · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `channel and holder` → `SourceUnwatch`
- **Reads:** The channel, from the slot `channelSlot` names, and the holder, from `holderSlot` — the same holder `source.watch` was given. _(shape hint: `channel and holder`)_
- **Emits:** A `SourceUnwatch` — the watch as this action left it. A flow preview changes nothing and says what it would have done.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `channelSlot` | string | yes | — | Slot PATH (e.g. `outlet.channel`) that resolves to the channel to let go of. ⚠️ Reading a newly watched channel starts within about a minute. It costs the runs its triggers start, one per message. Letting the last holder go stops those runs; the platform's reader stays in the channel. |
| `holderSlot` | string | yes | — | Slot PATH (e.g. `follow.recordId`) that resolves to the holder `source.watch` was given. |
| `provider` | `telegram` | yes | — | What kind of source the channel is. |

## Worked example

A person unfollows an outlet. Its channel stays watched while anyone else follows it.

#### Others still follow

One hold is gone; the channel stays watched.

Reads `object` → emits `SourceUnwatch` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "provider": "telegram",
  "channelSlot": "follow.channel",
  "holderSlot": "follow.recordId"
}
```

Input:

```
{
  "recordId": "c4f1a9e0b2d3",
  "channel": "@harbourdaily"
}
```

Output:

```
{
  "sourceId": "s9b2e4f0c1a7d3e5b6c8a0f1",
  "enabled": true,
  "holders": 1
}
```

#### The last follower leaves

Nobody holds the channel any more, so its source is switched off.

Reads `object` → emits `SourceUnwatch` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "provider": "telegram",
  "channelSlot": "follow.channel",
  "holderSlot": "follow.recordId"
}
```

Input:

```
{
  "recordId": "c7d2b8a1e4f5",
  "channel": "@harbourdaily"
}
```

Output:

```
{
  "sourceId": "s9b2e4f0c1a7d3e5b6c8a0f1",
  "enabled": false,
  "holders": 0
}
```
