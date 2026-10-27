<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `source.watch` — Watch a source

Keep a channel watched for this project, held by a record.

Holds one channel for a record, usually the follow, making or switching on its source. Deleting the record lets go.

- **Group:** sources · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `converges`
- **I/O:** `channel and holder` → `SourceWatch`
- **Also found as:** follow channel, subscribe to channel, start watching, listen to channel
- **Reads:** The channel, from `channel`, and the holder record, from `holder`. A malformed channel, or a holder this run may not write, fails the action. _(shape hint: `channel and holder`)_
- **Emits:** A `SourceWatch` — the watch as this action left it. A flow preview watches nothing and says what it would have done.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `channel` | union | yes | — | The channel, e.g. the path `outlet.channel`. ⚠️ Starts within a minute and costs one triggered run per message, until the last holder lets go. |
| `holder` | union | yes | — | The id of the holding record, e.g. the path `follow.recordId`. ⚠️ Use the record whose life the watch should share, like the follow; only it releases the watch. |
| `provider` | `telegram` | yes | — | Which kind of source to watch. |
| `userId` | union | no | — | The person whose own record holds the watch. ⚠️ Only in a run that acts for nobody, like a schedule or trigger; the watch ends with their account. |

### `channel` — one of

- `string`
- `number`
- `boolean`

**An object with `literal`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `literal` | any | yes | — |  |

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
| `literal` | any | yes | — |  |

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
| `literal` | any | yes | — |  |

**An object with `expr`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `expr` | string | yes | — |  |

## Worked example

A person follows an outlet, and the outlet's channel is watched from then on — once, however many people follow it.

#### The first follower

Nobody watched the channel yet, so this hold makes the source.

Reads `object` → emits `SourceWatch` · 1 in → 1 out

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
  "created": false,
  "enabled": true,
  "holders": 2
}
```
