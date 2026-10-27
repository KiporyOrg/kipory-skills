<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `source.unwatch` — Stop watching a source

Let go of a channel's watch for one holder; the last one switches it off.

Removes one record's watch. The last one switches the source off, never deletes it; deleting the record does the same.

- **Group:** sources · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `channel and holder` → `SourceUnwatch`
- **Also found as:** unfollow channel, unsubscribe, stop watching, release watch
- **Reads:** The channel, from `channel`, and the holder, from `holder` — the same holder `source.watch` was given. _(shape hint: `channel and holder`)_
- **Emits:** A `SourceUnwatch` — the watch as this action left it. A flow preview changes nothing and says what it would have done.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `channel` | union | yes | — | The channel to let go, e.g. the path `outlet.channel`. ⚠️ Starts within a minute and costs one triggered run per message, until the last holder lets go. |
| `holder` | union | yes | — | The id of the record `source.watch` was given. |
| `provider` | `telegram` | yes | — | What kind of source the channel is. |
| `userId` | union | no | — | The person whose record held the watch. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; a person's own run cannot name another. |

### `channel` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `holder` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

### `userId` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | object | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

A person unfollows an outlet. Its channel stays watched while anyone else follows it.

#### Others still follow

One hold is gone; the channel stays watched.

Reads `object` → emits `SourceUnwatch` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "provider": "telegram",
  "channel": "follow.channel",
  "holder": "follow.recordId"
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
  "channel": "follow.channel",
  "holder": "follow.recordId"
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
