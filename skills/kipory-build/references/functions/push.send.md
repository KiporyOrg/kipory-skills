<!-- generated: kipory-skills references · source: the deployment's function catalog · regenerated on every publish, so an edit here is overwritten; the versions it was generated from are in kipory-connect/references/versions.md — the deployment you are building on may serve newer ones; compare and prefer the live one -->

# `push.send` — Send a push notification

Notify people on their phones.

Reaches every device the people registered, once the run saves; a failed run notifies nobody. Each device delivery costs credits.

- **Group:** outbound · **Phase:** `inline` · **Effect class:** `idempotent-side-effect`
- **Re-run:** a retry inside the run `converges` · a new run of the same input `may-repeat` — Each run stages its own push, so a new run of the same input notifies again.
- **I/O:** `people and text` → `PushSendResult`
- **Also found as:** push notification, notify, alert phone, send to phone, mobile notification
- **Reads:** The people, from `recipient`, and the title, body and data, each from its setting. A payload over the services' size limit fails the action. _(shape hint: `people and text`)_
- **Emits:** A `PushSendResult` — how many people and devices the push addressed. A preview sends nothing and says what it would have.
- **External dependency:** Apple and Google push — Delivered through Apple's and Google's push services, with the push keys the project stores for its apps.

## Config

| Field | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `badge` | integer, at least 0 | no | — | The number to show on the app's icon. |
| `body` | union | no | — | The body text; required for an alert. |
| `collapseKey` | string | no | — | Same-key pushes replace each other on the device; at most 64 bytes. |
| `data` | union | no | — | An object of strings the app receives. |
| `expiresIn` | integer, 0 to 2419200 | no | `86400` | Seconds to keep trying an offline device; 0 tries once. |
| `kind` | `alert` \| `background` | no | `"alert"` | `alert` shows title and body; `background` silently wakes the app, data only. |
| `recipient` | union | no | `{"kind":"self"}` | Whom to notify; the run's own person unless you name others. ⚠️ A device gets pushes only once its app registered it, through a push key the project stored for that app. |
| `sound` | `default` \| `none` | no | `"default"` | Whether an alert plays the device's sound. |
| `threadId` | string | no | — | Groups the alert with others of the same thread on the device. |
| `title` | union | no | — | The title; required for an alert. |
| `urgency` | `normal` \| `high` | no | `"normal"` | `high` delivers at once even when the device saves power. ⚠️ Use `high` sparingly. |

### `body` — one of

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

### `data` — one of

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

### `recipient` — one of

**`kind: self`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `self` | yes | — | The person this run acts for; not in a run for nobody. |

**`kind: person`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `person` | yes | — | One person an earlier action names. |
| `userId` | string | yes | — | The person's id. |

**`kind: people`**

| Member | Type | Required | Default | Meaning |
| --- | --- | --- | --- | --- |
| `kind` | `people` | yes | — | A list of people an earlier action names. |
| `userIds` | string | yes | — | A list of person ids; ids outside the project are skipped. |

### `title` — one of

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

When a new item lands in a feed a person follows, their phone shows it.

#### The run's own person

One person, three devices — two phones and a tablet.

Reads `object` → emits `PushSendResult` · 1 in → 1 out

Action settings (`functionConfig`):

```json
{
  "recipient": {
    "kind": "self"
  },
  "kind": "alert",
  "title": "item.feed",
  "body": "item.title",
  "sound": "default",
  "urgency": "normal",
  "expiresIn": 86400
}
```

Input:

```
{
  "title": "High water at 06:12",
  "feed": "Harbour daily"
}
```

Output:

```
{
  "people": 1,
  "skipped": 0,
  "devices": 3
}
```
