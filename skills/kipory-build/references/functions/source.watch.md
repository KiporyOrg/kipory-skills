<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `source.watch` — Watch a source

Keep a channel watched for this project, held by a name you choose.

Holds a watch on one channel for the holder you name, usually the follow's record. The first holder makes the source; a source switched off comes back on. Your trigger on the source kind's events picks the flow. A failed run watches nothing.

- **Group:** sources · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `channel and holder` → `SourceWatch`
- **Reads:** The channel, from the slot `channelSlot` names, and the holder, from `holderSlot`. A channel not in the source kind's form, or a holder over 200 characters, fails the action. _(shape hint: `channel and holder`)_
- **Emits:** A `SourceWatch` — the watch as this action left it. A flow preview watches nothing and says what it would have done.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `channelSlot` | string | yes | — | Slot PATH (e.g. `outlet.channel`) that resolves to the channel to watch, in the form the source kind takes. ⚠️ Reading a newly watched channel starts within about a minute. It costs the runs its triggers start, one per message. Letting the last holder go stops those runs; the platform's reader stays in the channel. |
| `holderSlot` | string | yes | — | Slot PATH (e.g. `follow.recordId`) that resolves to who holds the watch — 1 to 200 characters. The same holder releases it with `source.unwatch`. ⚠️ Use a value that stays the same for as long as the watch should — the id of the follow, not of the run. Only the same holder releases it. |
| `provider` | `telegram` | yes | — | What kind of source to watch. Only kinds a run may watch on demand are offered. |

## Worked example

A person follows an outlet, and the outlet's channel is watched from then on — once, however many people follow it.

#### The first follower

Nobody watched the channel yet, so this hold makes the source.

Reads `object` → emits `SourceWatch` · 1 in → 1 out

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
  "created": true,
  "enabled": true,
  "holders": 1
}
```

#### A second follower

The channel is already watched; this follow adds a hold.

Reads `object` → emits `SourceWatch` · 1 in → 1 out

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
  "created": false,
  "enabled": true,
  "holders": 2
}
```
